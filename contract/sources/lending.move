module aptopilot::lending {
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use std::signer;
    use std::table::{Self, Table};
    
    fun reserve_address<T>(): address {
        @aptopilot
    }
    
    // Constants
    const BPS_DENOM: u64 = 10000;  // Basis points denominator (100% = 10000 bps)
    const SECONDS_PER_YEAR: u64 = 365 * 24 * 60 * 60;  // Seconds in a year
    const LTV_BPS: u64 = 8000;  // 80% Loan-to-Value ratio in basis points
    const LIQ_THRESHOLD_BPS: u64 = 8000;  // 80% Liquidation threshold
    
    /// Internal function to accrue interest
    fun accrue_internal<T>(reserve: &mut Reserve<T>) {
        let now = timestamp::now_seconds();
        let last = reserve.last_accrued_ts;
        if (now <= last) return;
        
        let time_elapsed = (now - last) as u128;
        if (time_elapsed == 0) return;
        
        // Calculate interest (simple interest: principal * rate * time)
        if (reserve.total_borrowed > 0) {
            let interest = (reserve.total_borrowed * (reserve.borrow_rate_bps as u128) * time_elapsed) / ((BPS_DENOM as u128) * (SECONDS_PER_YEAR as u128));
            reserve.total_borrowed = reserve.total_borrowed + interest;
        };
        
        // Update the timestamp
        reserve.last_accrued_ts = now;
    }
    
    /// Errors
    const E_NOT_ADMIN: u64 = 1;
    const E_MARKET_EXISTS: u64 = 2;
    const E_MARKET_NOT_FOUND: u64 = 3;
    const E_INSUFFICIENT_LIQUIDITY: u64 = 4;
    const E_UNDERCOLLATERALIZED: u64 = 5;
    const E_NOT_ENOUGH_SUPPLY: u64 = 6;
    const E_NOT_ENOUGH_DEBT: u64 = 7;

    /// Collateral parameters (Aave-inspired, simplified)

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
        last_accrued_ts: u64,
        /// User positions table
        positions: table::Table<address, UserPosition>,
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
        let positions = table::new<address, UserPosition>();
        move_to(admin, Reserve<T> {
            total_supplied: 0,
            total_borrowed: 0,
            borrow_rate_bps,
            last_accrued_ts: timestamp::now_seconds(),
            positions,
        });
        if (!exists<Vault<T>>(cfg.admin)) {
            move_to(admin, Vault<T> { coins: coin::zero<T>() });
        }
    }

    /// Enable or disable collateral for the caller for asset T
    public entry fun set_collateral<T>(user: &signer, enabled: bool) acquires Reserve, Config {
        let user_addr = signer::address_of(user);
        let admin_addr = get_admin();
        let reserve = borrow_global_mut<Reserve<T>>(admin_addr);
        accrue_internal<T>(reserve);
        let pos = read_or_default(&reserve.positions, user_addr);
        pos.collateral_enabled = enabled;
        table::upsert(&mut reserve.positions, user_addr, pos);
    }

    /// Supply coins to the market
    public entry fun supply<T>(user: &signer, amount: u64) acquires Reserve, Vault, Config {
        let user_addr = signer::address_of(user);
        let admin_addr = get_admin();
        let reserve = borrow_global_mut<Reserve<T>>(admin_addr);
        
        // Update interest before any state changes
        accrue_internal<T>(reserve);
        
        // Withdraw coins from user
        let coins = coin::withdraw<T>(user, amount);
        
        // Add to user's supply position
        let pos = read_or_default(&reserve.positions, user_addr);
        pos.supplied = pos.supplied + (amount as u128);
        table::upsert(&mut reserve.positions, user_addr, pos);
        
        // Update total supply
        reserve.total_supplied = reserve.total_supplied + (amount as u128);
        
        // deposit into vault
        let vault = borrow_global_mut<Vault<T>>(admin_addr);
        coin::merge(&mut vault.coins, coins);
    }

    /// Withdraw coins from the market (up to your supply minus any locked collateral)
    public entry fun withdraw<T>(user: &signer, amount: u64) acquires Reserve, Vault, Config {
        let admin_addr = get_admin();
        let reserve = borrow_global_mut<Reserve<T>>(admin_addr);
        accrue_internal<T>(reserve);
        
        let addr = signer::address_of(user);
        let pos = read_or_default(&reserve.positions, addr);
        let amount_u128 = amount as u128;
        
        // Check if user has enough supply
        assert!(pos.supplied >= amount_u128, E_NOT_ENOUGH_SUPPLY);

        // Ensure user remains healthy after withdrawal if borrowing
        let new_supplied = pos.supplied - amount_u128;
        let new_pos = UserPosition {
            supplied: new_supplied,
            borrowed: pos.borrowed,
            collateral_enabled: pos.collateral_enabled,
        };
        
        // Check if user remains healthy after withdrawal
        assert!(is_healthy(&new_pos), E_UNDERCOLLATERALIZED);

        // Update user position
        table::upsert(&mut reserve.positions, addr, new_pos);
        
        // Update total supply
        reserve.total_supplied = reserve.total_supplied - amount_u128;
        
        // Transfer from vault to user
        let vault = borrow_global_mut<Vault<T>>(admin_addr);
        let out = coin::extract(&mut vault.coins, amount);
        coin::deposit(addr, out);
    }

    /// Borrow from the market
    public entry fun borrow<T>(user: &signer, amount: u64) acquires Reserve, Vault, Config {
        let admin_addr = get_admin();
        let reserve = borrow_global_mut<Reserve<T>>(admin_addr);
        accrue_internal<T>(reserve);
        let vault = borrow_global_mut<Vault<T>>(admin_addr);

        let available = coin::value(&vault.coins);
        assert!(available >= amount, E_INSUFFICIENT_LIQUIDITY);

        let addr = signer::address_of(user);
        let pos = read_or_default(&reserve.positions, addr);

        // Update debt, then check health
        pos.borrowed = pos.borrowed + (amount as u128);
        assert!(is_healthy(&pos), E_UNDERCOLLATERALIZED);

        // Update user position
        table::upsert(&mut reserve.positions, addr, pos);

        // transfer out from vault
        let out = coin::extract(&mut vault.coins, amount);
        coin::deposit(signer::address_of(user), out);
        reserve.total_borrowed = reserve.total_borrowed + (amount as u128);
    }

    /// Repay borrowed assets to the market
    public entry fun repay<T>(user: &signer, amount: u64) acquires Reserve, Vault, Config {
        let admin_addr = get_admin();
        let reserve = borrow_global_mut<Reserve<T>>(admin_addr);
        accrue_internal<T>(reserve);
        let vault = borrow_global_mut<Vault<T>>(admin_addr);

        let addr = signer::address_of(user);
        let pos = read_or_default(&reserve.positions, addr);
        
        // Convert amount to u128 for comparison
        let amount_u128 = (amount as u128);
        
        // Calculate how much to repay (can't repay more than borrowed)
        let repay_amount = if (amount_u128 > pos.borrowed) { pos.borrowed } else { amount_u128 };
        
        // Convert back to u64 for the withdraw function
        let repay_amount_u64 = (repay_amount as u64);
        
        // Withdraw coins from user
        let coins = coin::withdraw<T>(user, repay_amount_u64);
        
        // Update user's borrowed amount
        pos.borrowed = pos.borrowed - repay_amount;
        
        // Update total borrowed amount in reserve
        reserve.total_borrowed = reserve.total_borrowed - repay_amount;
        
        // Deposit coins into vault
        coin::merge(&mut vault.coins, coins);
        
        // Update user's position
        table::upsert(&mut reserve.positions, addr, pos);
    }

    /// Manually trigger interest accrual (mostly for testing)
    public entry fun accrue_interest<T>(_admin: &signer) acquires Reserve, Config {
        let _cfg = borrow_global<Config>(@aptopilot);
        let reserve = borrow_global_mut<Reserve<T>>(reserve_address<T>());
        accrue_internal(reserve);
    }
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
