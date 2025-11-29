module aptopilot::strategy_registry {
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};
    use aptos_std::event::{Self, EventHandle};

    // ================================= Errors ================================= //
    const ERR_NOT_INITIALIZED: u64 = 1;
    const ERR_STRATEGY_NOT_FOUND: u64 = 2;
    const ERR_NOT_STRATEGY_OWNER: u64 = 3;
    const ERR_INVALID_STRATEGY_TYPE: u64 = 4;
    const ERR_STRATEGY_NOT_ACTIVE: u64 = 5;
    const ERR_EXECUTION_TOO_SOON: u64 = 6;

    // ================================= Constants ================================= //
    // Strategy Types
    const STRATEGY_TYPE_DCA: u8 = 1;
    const STRATEGY_TYPE_APY_EXIT: u8 = 2;
    const STRATEGY_TYPE_YIELD_OPT: u8 = 3;

    // Strategy Status
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_PAUSED: u8 = 2;
    const STATUS_COMPLETED: u8 = 3;
    const STATUS_CANCELLED: u8 = 4;

    // ================================= Structs ================================= //

    /// Represents a user's automated strategy
    struct Strategy has store, drop {
        // Strategy identification
        id: u64,
        owner: address,
        
        // Strategy configuration
        strategy_type: u8,
        params: vector<u8>, // JSON-encoded parameters
        
        // Status tracking
        status: u8,
        created_at: u64,
        last_executed: u64,
        execution_count: u64,
        
        // Execution settings
        interval_seconds: u64, // For DCA: how often to execute
        max_executions: u64,   // 0 = unlimited
    }

    /// Global registry storing all strategies
    struct StrategyRegistry has key {
        strategies: Table<u64, Strategy>,
        next_id: u64,
        // Events
        strategy_created_events: EventHandle<StrategyCreatedEvent>,
        strategy_executed_events: EventHandle<StrategyExecutedEvent>,
        strategy_status_changed_events: EventHandle<StrategyStatusChangedEvent>,
    }

    /// User's strategy index for quick lookup
    struct UserStrategyIndex has key {
        strategy_ids: vector<u64>,
    }

    // ================================= Events ================================= //

    struct StrategyCreatedEvent has drop, store {
        strategy_id: u64,
        owner: address,
        strategy_type: u8,
        created_at: u64,
    }

    struct StrategyExecutedEvent has drop, store {
        strategy_id: u64,
        execution_count: u64,
        timestamp: u64,
    }

    struct StrategyStatusChangedEvent has drop, store {
        strategy_id: u64,
        old_status: u8,
        new_status: u8,
        timestamp: u64,
    }

    // ================================= Initialization ================================= //

    /// Initialize the strategy registry (called once by deployer)
    public entry fun initialize(deployer: &signer) {
        let deployer_addr = signer::address_of(deployer);
        
        if (!exists<StrategyRegistry>(deployer_addr)) {
            move_to(deployer, StrategyRegistry {
                strategies: table::new(),
                next_id: 1,
                strategy_created_events: account::new_event_handle<StrategyCreatedEvent>(deployer),
                strategy_executed_events: account::new_event_handle<StrategyExecutedEvent>(deployer),
                strategy_status_changed_events: account::new_event_handle<StrategyStatusChangedEvent>(deployer),
            });
        };
    }

    // ================================= Entry Functions ================================= //

    /// Create a new strategy
    public entry fun create_strategy(
        user: &signer,
        strategy_type: u8,
        params: vector<u8>,
        interval_seconds: u64,
        max_executions: u64,
    ) acquires StrategyRegistry, UserStrategyIndex {
        let user_addr = signer::address_of(user);
        let current_time = timestamp::now_seconds();
        
        // Validate strategy type
        assert!(
            strategy_type == STRATEGY_TYPE_DCA || 
            strategy_type == STRATEGY_TYPE_APY_EXIT || 
            strategy_type == STRATEGY_TYPE_YIELD_OPT,
            ERR_INVALID_STRATEGY_TYPE
        );

        // Get registry
        let registry = borrow_global_mut<StrategyRegistry>(@aptopilot);
        let strategy_id = registry.next_id;
        registry.next_id = registry.next_id + 1;

        // Create strategy
        let strategy = Strategy {
            id: strategy_id,
            owner: user_addr,
            strategy_type,
            params,
            status: STATUS_ACTIVE,
            created_at: current_time,
            last_executed: 0,
            execution_count: 0,
            interval_seconds,
            max_executions,
        };

        // Store strategy
        table::add(&mut registry.strategies, strategy_id, strategy);

        // Update user index
        if (!exists<UserStrategyIndex>(user_addr)) {
            move_to(user, UserStrategyIndex {
                strategy_ids: vector::empty(),
            });
        };
        let user_index = borrow_global_mut<UserStrategyIndex>(user_addr);
        vector::push_back(&mut user_index.strategy_ids, strategy_id);

        // Emit event
        event::emit_event(&mut registry.strategy_created_events, StrategyCreatedEvent {
            strategy_id,
            owner: user_addr,
            strategy_type,
            created_at: current_time,
        });
    }

    /// Mark strategy as executed (called by execution agent)
    public entry fun mark_executed(
        executor: &signer,
        strategy_id: u64,
    ) acquires StrategyRegistry {
        let current_time = timestamp::now_seconds();
        let registry = borrow_global_mut<StrategyRegistry>(@aptopilot);
        
        assert!(table::contains(&registry.strategies, strategy_id), ERR_STRATEGY_NOT_FOUND);
        
        let strategy = table::borrow_mut(&mut registry.strategies, strategy_id);
        assert!(strategy.status == STATUS_ACTIVE, ERR_STRATEGY_NOT_ACTIVE);

        // Check if enough time has passed
        if (strategy.last_executed > 0) {
            assert!(
                current_time >= strategy.last_executed + strategy.interval_seconds,
                ERR_EXECUTION_TOO_SOON
            );
        };

        // Update execution tracking
        strategy.last_executed = current_time;
        strategy.execution_count = strategy.execution_count + 1;

        // Check if max executions reached
        if (strategy.max_executions > 0 && strategy.execution_count >= strategy.max_executions) {
            strategy.status = STATUS_COMPLETED;
        };

        // Emit event
        event::emit_event(&mut registry.strategy_executed_events, StrategyExecutedEvent {
            strategy_id,
            execution_count: strategy.execution_count,
            timestamp: current_time,
        });
    }

    /// Pause a strategy
    public entry fun pause_strategy(
        user: &signer,
        strategy_id: u64,
    ) acquires StrategyRegistry {
        let user_addr = signer::address_of(user);
        let registry = borrow_global_mut<StrategyRegistry>(@aptopilot);
        
        assert!(table::contains(&registry.strategies, strategy_id), ERR_STRATEGY_NOT_FOUND);
        
        let strategy = table::borrow_mut(&mut registry.strategies, strategy_id);
        assert!(strategy.owner == user_addr, ERR_NOT_STRATEGY_OWNER);
        
        let old_status = strategy.status;
        strategy.status = STATUS_PAUSED;

        event::emit_event(&mut registry.strategy_status_changed_events, StrategyStatusChangedEvent {
            strategy_id,
            old_status,
            new_status: STATUS_PAUSED,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Resume a paused strategy
    public entry fun resume_strategy(
        user: &signer,
        strategy_id: u64,
    ) acquires StrategyRegistry {
        let user_addr = signer::address_of(user);
        let registry = borrow_global_mut<StrategyRegistry>(@aptopilot);
        
        assert!(table::contains(&registry.strategies, strategy_id), ERR_STRATEGY_NOT_FOUND);
        
        let strategy = table::borrow_mut(&mut registry.strategies, strategy_id);
        assert!(strategy.owner == user_addr, ERR_NOT_STRATEGY_OWNER);
        
        let old_status = strategy.status;
        strategy.status = STATUS_ACTIVE;

        event::emit_event(&mut registry.strategy_status_changed_events, StrategyStatusChangedEvent {
            strategy_id,
            old_status,
            new_status: STATUS_ACTIVE,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Cancel a strategy
    public entry fun cancel_strategy(
        user: &signer,
        strategy_id: u64,
    ) acquires StrategyRegistry {
        let user_addr = signer::address_of(user);
        let registry = borrow_global_mut<StrategyRegistry>(@aptopilot);
        
        assert!(table::contains(&registry.strategies, strategy_id), ERR_STRATEGY_NOT_FOUND);
        
        let strategy = table::borrow_mut(&mut registry.strategies, strategy_id);
        assert!(strategy.owner == user_addr, ERR_NOT_STRATEGY_OWNER);
        
        let old_status = strategy.status;
        strategy.status = STATUS_CANCELLED;

        event::emit_event(&mut registry.strategy_status_changed_events, StrategyStatusChangedEvent {
            strategy_id,
            old_status,
            new_status: STATUS_CANCELLED,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ================================= View Functions ================================= //

    #[view]
    /// Get strategy details
    public fun get_strategy(strategy_id: u64): (
        u64,      // id
        address,  // owner
        u8,       // strategy_type
        vector<u8>, // params
        u8,       // status
        u64,      // created_at
        u64,      // last_executed
        u64,      // execution_count
        u64,      // interval_seconds
        u64,      // max_executions
    ) acquires StrategyRegistry {
        let registry = borrow_global<StrategyRegistry>(@aptopilot);
        assert!(table::contains(&registry.strategies, strategy_id), ERR_STRATEGY_NOT_FOUND);
        
        let strategy = table::borrow(&registry.strategies, strategy_id);
        (
            strategy.id,
            strategy.owner,
            strategy.strategy_type,
            strategy.params,
            strategy.status,
            strategy.created_at,
            strategy.last_executed,
            strategy.execution_count,
            strategy.interval_seconds,
            strategy.max_executions,
        )
    }

    #[view]
    /// Get user's strategy IDs
    public fun get_user_strategies(user_addr: address): vector<u64> acquires UserStrategyIndex {
        if (!exists<UserStrategyIndex>(user_addr)) {
            return vector::empty()
        };
        *&borrow_global<UserStrategyIndex>(user_addr).strategy_ids
    }

    #[view]
    /// Check if strategy can be executed now
    public fun can_execute(strategy_id: u64): bool acquires StrategyRegistry {
        let registry = borrow_global<StrategyRegistry>(@aptopilot);
        if (!table::contains(&registry.strategies, strategy_id)) {
            return false
        };
        
        let strategy = table::borrow(&registry.strategies, strategy_id);
        let current_time = timestamp::now_seconds();
        
        // Check status
        if (strategy.status != STATUS_ACTIVE) {
            return false
        };

        // Check max executions
        if (strategy.max_executions > 0 && strategy.execution_count >= strategy.max_executions) {
            return false
        };

        // Check interval
        if (strategy.last_executed == 0) {
            return true
        };

        current_time >= strategy.last_executed + strategy.interval_seconds
    }

    #[view]
    /// Get total number of strategies
    public fun get_total_strategies(): u64 acquires StrategyRegistry {
        let registry = borrow_global<StrategyRegistry>(@aptopilot);
        registry.next_id - 1
    }
}
