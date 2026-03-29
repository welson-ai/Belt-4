#![allow(dead_code)]
#![allow(clippy::too_many_arguments)]
#![allow(clippy::result_large_err)]
#![allow(unused_variables)]

use soroban_sdk::{
    contract, contractimpl,
    Address, Env, Symbol, Vec, Map
};

// LendingPool client interface
#[contractclient(name = "LendingPoolClient")]
trait LendingPool {
    fn get_position(env: Env, user: Address) -> UserPosition;
    fn get_health_factor(env: Env, user: Address) -> i128;
    fn repay(env: Env, user: Address, amount: i128);
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserPosition {
    pub deposited: i128,
    pub borrowed: i128,
    pub last_update_ledger: u32,
}

#[contract]
pub struct LiquidationEngine;

// Storage keys
const LENDING_POOL: Symbol = Symbol::from_str("LENDING_POOL");
const LIQUIDATION_THRESHOLD: i128 = 120; // 120% health factor threshold
const RISK_THRESHOLD: i128 = 130; // 130% health factor warning zone
const LIQUIDATOR_BONUS: i128 = 5; // 5% bonus for liquidators

// Event symbols
const LIQUIDATION_EVENT: Symbol = Symbol::from_str("liquidation");

#[contractimpl]
impl LiquidationEngine {
    pub fn initialize(env: Env, lending_pool_address: Address) {
        // Store the lending pool contract address
        env.storage().instance().set(&LENDING_POOL, &lending_pool_address);
    }

    pub fn has_liquidatable_position(env: Env, user: Address) -> bool {
        // Get lending pool client
        let lending_pool_address: Address = env.storage().instance().get(&LENDING_POOL).unwrap();
        let lending_pool = LendingPoolClient::new(&env, &lending_pool_address);
        
        // Get health factor from lending pool
        let health_factor = lending_pool.get_health_factor(&user);
        
        // Return true if health factor < 120 (under-collateralized)
        health_factor < LIQUIDATION_THRESHOLD
    }

    pub fn liquidate(env: Env, liquidator: Address, borrower: Address) {
        // Require liquidator authorization
        liquidator.require_auth();
        
        // Get lending pool client
        let lending_pool_address: Address = env.storage().instance().get(&LENDING_POOL).unwrap();
        let lending_pool = LendingPoolClient::new(&env, &lending_pool_address);
        
        // Check if position is liquidatable
        let health_factor = lending_pool.get_health_factor(&borrower);
        if health_factor >= LIQUIDATION_THRESHOLD {
            panic!("NOT_LIQUIDATABLE");
        }
        
        // Get borrower's position
        let position = lending_pool.get_position(&borrower);
        
        // Calculate liquidation bonus (5% of collateral)
        let liquidator_bonus = (position.deposited * LIQUIDATOR_BONUS) / 100;
        
        // Calculate repayment amount (borrowed amount)
        let repayment_amount = position.borrowed;
        
        // Transfer XLM from liquidator to cover the repayment
        let token_client = soroban_sdk::token::Client::new(&env, &env.current_contract_address());
        token_client.transfer(&liquidator, &env.current_contract_address(), &repayment_amount);
        
        // Call lending_pool.repay() on behalf of the liquidator for the full borrowed amount
        lending_pool.repay(&borrower, &repayment_amount);
        
        // Transfer liquidator bonus from contract to liquidator
        token_client.transfer(&env.current_contract_address(), &liquidator, &liquidator_bonus);
        
        // Emit liquidation event
        env.events().publish(
            (LIQUIDATION_EVENT, liquidator, borrower), 
            (repayment_amount, liquidator_bonus)
        );
    }

    pub fn get_at_risk_positions(env: Env, users: Vec<Address>) -> Vec<Address> {
        // Get lending pool client
        let lending_pool_address: Address = env.storage().instance().get(&LENDING_POOL).unwrap();
        let lending_pool = LendingPoolClient::new(&env, &lending_pool_address);
        
        let mut at_risk_users = Vec::new(&env);
        
        // Check each user's health factor
        for user in users.iter() {
            let health_factor = lending_pool.get_health_factor(&user);
            if health_factor < RISK_THRESHOLD {
                at_risk_users.push_back(user);
            }
        }
        
        at_risk_users
    }

    pub fn get_lending_pool_address(env: Env) -> Address {
        env.storage().instance().get(&LENDING_POOL).unwrap()
    }

    pub fn get_liquidation_threshold(_env: Env) -> i128 {
        LIQUIDATION_THRESHOLD
    }

    pub fn get_risk_threshold(_env: Env) -> i128 {
        RISK_THRESHOLD
    }

    pub fn get_liquidator_bonus(_env: Env) -> i128 {
        LIQUIDATOR_BONUS
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, AuthorizedInvocation, Ledger};
    
    // Mock LendingPool contract for testing
    struct MockLendingPool;
    
    impl soroban_sdk::contractclient::Contract for MockLendingPool {
        const ID: &'static str = "MockLendingPool";
    }
    
    #[contractclient(name = "MockLendingPoolClient")]
    trait MockLendingPoolTrait {
        fn get_position(env: Env, user: Address) -> UserPosition;
        fn get_health_factor(env: Env, user: Address) -> i128;
        fn repay(env: Env, user: Address, amount: i128);
    }
    
    struct MockLendingPoolContract;
    
    #[contractimpl]
    impl MockLendingPoolTrait for MockLendingPoolContract {
        fn get_position(env: Env, user: Address) -> UserPosition {
            // Mock position for testing
            UserPosition {
                deposited: 1000i128,
                borrowed: 900i128,
                last_update_ledger: env.ledger().sequence(),
            }
        }
        
        fn get_health_factor(_env: Env, user: Address) -> i128 {
            // Mock health factor for testing
            // Return 111 (under-collateralized, below 120 threshold)
            111
        }
        
        fn repay(_env: Env, _user: Address, amount: i128) {
            // Mock repay - just emit event for testing
            // In real implementation, this would update balances
        }
    }
    
    #[test]
    fn test_liquidation_triggered() {
        let env = Env::default();
        env.mock_all_auths();
        
        let liquidator = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lending_pool_address = Address::generate(&env);
        
        // Register mock lending pool contract
        let pool_id = env.register_contract(None, MockLendingPoolContract);
        
        // Initialize liquidation contract
        LiquidationEngine::initialize(env.clone(), lending_pool_address.clone());
        
        // Verify position is liquidatable (health factor 111 < 120)
        let is_liquidatable = LiquidationEngine::has_liquidatable_position(env.clone(), borrower.clone());
        assert!(is_liquidatable);
        
        // Perform liquidation
        LiquidationEngine::liquidate(env.clone(), liquidator.clone(), borrower.clone());
        
        // Verify liquidation event was emitted (in real testing, you'd check events)
        // For this test, we just verify the function doesn't panic
    }
    
    #[test]
    #[should_panic(expected = "NOT_LIQUIDATABLE")]
    fn test_liquidation_blocked() {
        let env = Env::default();
        env.mock_all_auths();
        
        let liquidator = Address::generate(&env);
        let borrower = Address::generate(&env);
        let lending_pool_address = Address::generate(&env);
        
        // Register mock lending pool contract with healthy position
        struct HealthyLendingPoolContract;
        
        #[contractimpl]
        impl MockLendingPoolTrait for HealthyLendingPoolContract {
            fn get_position(env: Env, user: Address) -> UserPosition {
                UserPosition {
                    deposited: 1500i128,
                    borrowed: 1000i128,
                    last_update_ledger: env.ledger().sequence(),
                }
            }
            
            fn get_health_factor(_env: Env, user: Address) -> i128 {
                // Return 150 (healthy, above 120 threshold)
                150
            }
            
            fn repay(_env: Env, _user: Address, amount: i128) {
                // Mock repay
            }
        }
        
        env.register_contract(&lending_pool_address, HealthyLendingPoolContract);
        
        // Initialize liquidation contract
        LiquidationEngine::initialize(env.clone(), lending_pool_address.clone());
        
        // Verify position is not liquidatable (health factor 150 >= 120)
        let is_liquidatable = LiquidationEngine::has_liquidatable_position(env.clone(), borrower.clone());
        assert!(!is_liquidatable);
        
        // Attempt liquidation - should panic
        LiquidationEngine::liquidate(env.clone(), liquidator.clone(), borrower.clone());
    }
    
    #[test]
    fn test_get_at_risk_positions() {
        let env = Env::default();
        env.mock_all_auths();
        
        let lending_pool_address = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let user3 = Address::generate(&env);
        
        // Register mock lending pool contract
        let pool_id = env.register_contract(None, MockLendingPoolContract);
        
        // Initialize liquidation contract
        LiquidationEngine::initialize(env.clone(), lending_pool_address.clone());
        
        // Create list of users to check
        let mut users = Vec::new(&env);
        users.push_back(user1.clone());
        users.push_back(user2.clone());
        users.push_back(user3.clone());
        
        // Get at-risk positions
        let at_risk_users = LiquidationEngine::get_at_risk_positions(env.clone(), users);
        
        // All users should be at risk since mock returns health factor 111 < 130
        assert_eq!(at_risk_users.len(), 3);
    }
    
    #[test]
    fn test_constants() {
        let env = Env::default();
        
        // Test constant values
        assert_eq!(LiquidationEngine::get_liquidation_threshold(env.clone()), 120);
        assert_eq!(LiquidationEngine::get_risk_threshold(env.clone()), 130);
        assert_eq!(LiquidationEngine::get_liquidator_bonus(env.clone()), 5);
    }
}
