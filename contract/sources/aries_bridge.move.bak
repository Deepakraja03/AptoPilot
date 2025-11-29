module aptopilot::aries_bridge {
    use std::signer;
    use std::vector;

    /// Aries controller module at named address `aries` (set in Move.toml)
    /// Exposes:
    /// - register_user(&signer, profile_name: vector<u8>)
    /// - deposit<Coin0>(&signer, profile_name: vector<u8>, amount: u64, repay_only: bool)
    /// - withdraw<Coin0>(&signer, profile_name: vector<u8>, amount: u64, allow_borrow: bool)
    use aries::controller;

    /// One-time Aries profile setup for a user
    public entry fun register_user(user: &signer, default_profile_name: vector<u8>) {
        controller::register_user(user, default_profile_name);
    }

    /// Supply (lend) `amount` of Coin0 as collateral
    public entry fun supply<Coin0>(user: &signer, profile_name: vector<u8>, amount: u64) {
        // repay_only = false => treat as supply (after auto-repay if any tiny debt exists)
        controller::deposit<Coin0>(user, profile_name, amount, /*repay_only=*/ false);
    }

    /// Repay `amount` of Coin0 debt
    public entry fun repay<Coin0>(user: &signer, profile_name: vector<u8>, amount: u64) {
        // repay_only = true => prioritize debt repayment
        controller::deposit<Coin0>(user, profile_name, amount, /*repay_only=*/ true);
    }

    /// Repay all Coin0 debt (Aries treats u64::max as repay-all sentinel)
    public entry fun repay_all<Coin0>(user: &signer, profile_name: vector<u8>) {
        controller::deposit<Coin0>(user, profile_name, 18446744073709551615, /*repay_only=*/ true);
    }

    /// Withdraw up to `amount` of Coin0 from deposits only (no new borrow)
    public entry fun withdraw<Coin0>(user: &signer, profile_name: vector<u8>, amount: u64) {
        controller::withdraw<Coin0>(user, profile_name, amount, /*allow_borrow=*/ false);
    }

    /// Withdraw all Coin0 deposits (no new borrow)
    public entry fun withdraw_all<Coin0>(user: &signer, profile_name: vector<u8>) {
        controller::withdraw<Coin0>(user, profile_name, 18446744073709551615, /*allow_borrow=*/ false);
    }

    /// Borrow `amount` of Coin0 (or withdraw beyond deposits by allowing borrow)
    public entry fun borrow<Coin0>(user: &signer, profile_name: vector<u8>, amount: u64) {
        controller::withdraw<Coin0>(user, profile_name, amount, /*allow_borrow=*/ true);
    }
}
