module aptopilot::lending {
    use std::error;
    use std::option::{Self, Option};
    use std::signer;
    use std::string;
    use std::vector;

    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_std::table::{Self as table, Table};

    /// Errors
    const E_NOT_ADMIN: u64 = 1;
    const E_MARKET_EXISTS: u64 = 2;
    const E_MARKET_NOT_FOUND: u64 = 3;
    const E_INSUFFICIENT_LIQUIDITY: u64 = 4;
    const E_UNDERCOLLATERALIZED: u64 = 5;
    const E_NOT_ENOUGH_SUPPLY: u64 = 6;
    const E_NOT_ENOUGH_DEBT: u64 = 7;

    /// Collateral parameters (Aave-inspired, simplified)
    /// LTV = 75% (in bps)
    const LTV_BPS: u64 = 7500;
    /// Liquidation threshold = 80% (bps)
    const LIQ_THRESHOLD_BPS: u64 = 8000;
    /// Basis points denominator
    const BPS_DENOM: u64 = 10000;
    /// Seconds in a year for interest accrual
    const SECONDS_PER_YEAR: u64 = 31_536_000; // 365 days

    /// Admin for the protocol
    struct Config has key {
        admin: address,
    }

    /// Vault to custody liquidity per asset
    struct Vault<phantom T> has key {
        coins: coin::Coin<T>,
    }

    /// Reserve per asset (Aave-inspired, simplified)
    struct Reserve<phantom T> has key {
        /// Total supplied liquidity (coins in vault)
        total_supplied: u128,
        /// Total borrowed principal (without accrued interest)
        total_borrowed: u128,
        /// Annual interest rate in bps applied to borrows (e.g. 500 = 5%)
        borrow_rate_bps: u64,
        /// Last timestamp we accrued interest
        last_accrue_ts: u64,
        /// User positions table
        positions: Table<address, UserPosition>,
    }

    /// User position (single asset, simplified)
    struct UserPosition has store, drop, copy {
        supplied: u128,
        borrowed: u128,
        /// Whether user enables this asset as collateral
        collateral_enabled: bool,
    }

    /// Initialize protocol config; callable once by deployer
    /// Must be called by the publisher (@aptopilot). Stores Config under @aptopilot
    public fun init_config(admin: &signer) {
        let publisher = signer::address_of(admin);
        assert!(publisher == @aptopilot, E_NOT_ADMIN);
        assert!(!exists<Config>(@aptopilot), E_MARKET_EXISTS);
        move_to(admin, Config { admin: publisher });
    }

    /// Create a market for an asset T with a fixed borrow rate (bps)
    /// Only admin can create.
    public fun init_market<T>(admin: &signer, borrow_rate_bps: u64) {
        let cfg = borrow_global<Config>(@aptopilot);
        assert!(signer::address_of(admin) == cfg.admin, E_NOT_ADMIN);
        assert!(!exists<Reserve<T>>(cfg.admin), E_MARKET_EXISTS);
        let positions: Table<address, UserPosition> = table::new<address, UserPosition>();
        move_to(admin, Reserve<T> {
            total_supplied: 0,
            total_borrowed: 0,
            borrow_rate_bps,
            last_accrue_ts: timestamp::now_seconds(),
            positions,
        });
        if (!exists<Vault<T>>(cfg.admin)) {
            move_to(admin, Vault<T> { coins: coin::zero<T>() });
        }
    }

    /// Enable or disable collateral for the caller for asset T
    public entry fun set_collateral<T>(user: &signer, enabled: bool) acquires Reserve {
        let admin_addr = get_admin();
        let reserve = borrow_global_mut<Reserve<T>>(admin_addr);
        accrue_internal<T>(reserve);
        let addr = signer::address_of(user);
        let mut pos = read_or_default(&reserve.positions, addr);
        pos.collateral_enabled = enabled;
        table::upsert(&mut reserve.positions, addr, pos);
    }

    /// Supply coins to the market
    public entry fun supply<T>(user: &signer, mut coins: coin::Coin<T>) acquires Reserve, Vault {
        let admin_addr = get_admin();
        let reserve = borrow_global_mut<Reserve<T>>(admin_addr);
        accrue_internal<T>(reserve);
        let vault = borrow_global_mut<Vault<T>>(admin_addr);

        let amount = coin::value(&coins) as u128;
        // move user coins into vault
        coin::merge(&mut vault.coins, coins);

        // record position
        let addr = signer::address_of(user);
        let mut pos = read_or_default(&reserve.positions, addr);
        pos.supplied = pos.supplied + amount;
        table::upsert(&mut reserve.positions, addr, pos);

        reserve.total_supplied = reserve.total_supplied + amount;
    }

    /// Withdraw coins from the market (up to your supply minus any locked collateral)
    public entry fun withdraw<T>(user: &signer, amount: u64) acquires Reserve, Vault {
        let admin_addr = get_admin();
        let reserve = borrow_global_mut<Reserve<T>>(admin_addr);
        accrue_internal<T>(reserve);
        let vault = borrow_global_mut<Vault<T>>(admin_addr);

        let addr = signer::address_of(user);
        let mut pos = read_or_default(&reserve.positions, addr);
        let amount_u128 = amount as u128;
        assert!(pos.supplied >= amount_u128, E_NOT_ENOUGH_SUPPLY);

        // Ensure user remains healthy after withdrawal if borrowing
        pos.supplied = pos.supplied - amount_u128;
        assert!(is_healthy(&pos), E_UNDERCOLLATERALIZED);

        // transfer out from vault
        let (mut out, remainder) = coin::split(&mut vault.coins, amount);
        vault.coins = remainder;
        coin::deposit(user, out);

        table::upsert(&mut reserve.positions, addr, pos);
        reserve.total_supplied = reserve.total_supplied - amount_u128;
    }

    /// Borrow from the market
    public entry fun borrow<T>(user: &signer, amount: u64) acquires Reserve, Vault {
        let admin_addr = get_admin();
        let reserve = borrow_global_mut<Reserve<T>>(admin_addr);
        accrue_internal<T>(reserve);
        let vault = borrow_global_mut<Vault<T>>(admin_addr);

        let available = coin::value(&vault.coins);
        assert!(available >= amount, E_INSUFFICIENT_LIQUIDITY);

        let addr = signer::address_of(user);
        let mut pos = read_or_default(&reserve.positions, addr);

        // Update debt, then check health
        pos.borrowed = pos.borrowed + (amount as u128);
        assert!(is_healthy(&pos), E_UNDERCOLLATERALIZED);

        // transfer out from vault
        let (mut out, remainder) = coin::split(&mut vault.coins, amount);
        vault.coins = remainder;
        coin::deposit(user, out);

        table::upsert(&mut reserve.positions, addr, pos);
        reserve.total_borrowed = reserve.total_borrowed + (amount as u128);
    }

    /// Repay debt to the market
    public entry fun repay<T>(user: &signer, mut coins: coin::Coin<T>) acquires Reserve, Vault {
        let admin_addr = get_admin();
        let reserve = borrow_global_mut<Reserve<T>>(admin_addr);
        accrue_internal<T>(reserve);
        let vault = borrow_global_mut<Vault<T>>(admin_addr);

        let addr = signer::address_of(user);
        let mut pos = read_or_default(&reserve.positions, addr);
        let repay_amount = coin::value(&coins) as u128;
        assert!(pos.borrowed > 0, E_NOT_ENOUGH_DEBT);

        let applied = if (repay_amount >= pos.borrowed) { pos.borrowed } else { repay_amount };
        pos.borrowed = pos.borrowed - applied;

        // move coins into vault
        coin::merge(&mut vault.coins, coins);

        table::upsert(&mut reserve.positions, addr, pos);
        reserve.total_borrowed = reserve.total_borrowed - applied;
    }

    /// Accrue interest on total borrows (simple annual rate prorated by seconds elapsed)
    public entry fun accrue_interest<T>(admin: &signer) acquires Reserve, Vault {
        let cfg = borrow_global<Config>(signer::address_of(admin));
        assert!(signer::address_of(admin) == cfg.admin, E_NOT_ADMIN);
        let reserve = borrow_global_mut<Reserve<T>>(cfg.admin);
        accrue_internal<T>(reserve);
    }

    /// Internal: accrue interest into total_borrowed (no compounding per-user for simplicity)
    fun accrue_internal<T>(reserve: &mut Reserve<T>) {
        let now = timestamp::now_seconds();
        let last = reserve.last_accrue_ts;
        if (now <= last) return;
        let dt = (now - last) as u128;
        let rate_bps = reserve.borrow_rate_bps as u128;
        let interest = reserve.total_borrowed * rate_bps * dt / (BPS_DENOM as u128) / (SECONDS_PER_YEAR as u128);
        reserve.total_borrowed = reserve.total_borrowed + interest;
        reserve.last_accrue_ts = now;
    }

    /// Health check: supplied * LTV >= borrowed
    fun is_healthy(pos: &UserPosition): bool {
        if (!pos.collateral_enabled) {
            // If not collateralized, cannot have debt
            return pos.borrowed == 0;
        };
        let max_borrow = pos.supplied * (LTV_BPS as u128) / (BPS_DENOM as u128);
        max_borrow >= pos.borrowed
    }

    /// Fetch or initialize a user position
    fun read_or_default(positions: &Table<address, UserPosition>, addr: address): UserPosition {
        if (table::contains(positions, addr)) {
            *table::borrow(positions, addr)
        } else {
            UserPosition { supplied: 0, borrowed: 0, collateral_enabled: true }
        }
    }

    /// Helper to read admin address from Config
    fun get_admin(): address { borrow_global<Config>(@aptopilot).admin }
}
