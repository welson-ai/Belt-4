use soroban_sdk::{
    contract, contractimpl, contracttype, 
    Address, Env, Symbol, token::Client as TokenClient,
    Map, Vec
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserPosition {
    pub deposited: i128,
    pub borrowed: i128,
    pub last_update_ledger: u32,
}

#[contract]
pub struct LendingPool;

// Storage keys
const ADMIN: Symbol = Symbol::from_str("ADMIN");
const TOKEN_ADDR: Symbol = Symbol::from_str("TOKEN_ADDR");
const TOTAL_DEPOSITED: Symbol = Symbol::from_str("TOTAL_DEPOSITED");
const TOTAL_BORROWED: Symbol = Symbol::from_str("TOTAL_BORROWED");

// Constants
const COLLATERAL_RATIO: i128 = 150; // 150% collateralization required
const INTEREST_RATE: i128 = 5; // 5% annual rate (simplified)

// Event symbols
const DEPOSIT_EVENT: Symbol = Symbol::from_str("deposit");
const BORROW_EVENT: Symbol = Symbol::from_str("borrow");
const REPAY_EVENT: Symbol = Symbol::from_str("repay");
const WITHDRAW_EVENT: Symbol = Symbol::from_str("withdraw");

#[contractimpl]
impl LendingPool {
    pub fn initialize(env: Env, admin: Address, token_address: Address) {
        // Set admin
        env.storage().instance().set(&ADMIN, &admin);
        
        // Set token contract address
        env.storage().instance().set(&TOKEN_ADDR, &token_address);
        
        // Initialize totals to 0
        env.storage().instance().set(&TOTAL_DEPOSITED, &0i128);
        env.storage().instance().set(&TOTAL_BORROWED, &0i128);
    }

    pub fn deposit(env: Env, user: Address, amount: i128) {
        // Get admin address for authorization check
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        
        // Require admin authorization for now (in production, user would authorize)
        user.require_auth();
        
        // Transfer XLM from user to contract
        let token_client = TokenClient::new(&env, &env.current_contract_address());
        token_client.transfer(&user, &env.current_contract_address(), &amount);
        
        // Mint lXLM receipt tokens by calling the lxlm-token contract
        let token_addr: Address = env.storage().instance().get(&TOKEN_ADDR).unwrap();
        let lxlm_client = TokenClient::new(&env, &token_addr);
        lxlm_client.mint(&user, &amount);
        
        // Update user position
        let position_key = Symbol::from_str(&format!("POS_{}", user));
        let mut position: UserPosition = env.storage().instance()
            .get(&position_key)
            .unwrap_or(UserPosition {
                deposited: 0,
                borrowed: 0,
                last_update_ledger: env.ledger().sequence(),
            });
        
        position.deposited += amount;
        position.last_update_ledger = env.ledger().sequence();
        env.storage().instance().set(&position_key, &position);
        
        // Update total deposited
        let mut total_deposited: i128 = env.storage().instance().get(&TOTAL_DEPOSITED).unwrap();
        total_deposited += amount;
        env.storage().instance().set(&TOTAL_DEPOSITED, &total_deposited);
        
        // Emit deposit event
        env.events().publish((DEPOSIT_EVENT, user), amount);
    }

    pub fn borrow(env: Env, user: Address, amount: i128) {
        user.require_auth();
        
        // Get user position
        let position_key = Symbol::from_str(&format!("POS_{}", user));
        let position: UserPosition = env.storage().instance()
            .get(&position_key)
            .unwrap_or(UserPosition {
                deposited: 0,
                borrowed: 0,
                last_update_ledger: env.ledger().sequence(),
            });
        
        // Calculate new borrowed amount
        let new_borrowed = position.borrowed + amount;
        
        // Check collateral ratio >= 150%
        if position.deposited > 0 {
            let health_factor = (position.deposited * 100) / new_borrowed;
            if health_factor < COLLATERAL_RATIO {
                panic!("Insufficient collateral");
            }
        } else {
            panic!("No collateral deposited");
        }
        
        // Transfer XLM to user
        let token_client = TokenClient::new(&env, &env.current_contract_address());
        token_client.transfer(&env.current_contract_address(), &user, &amount);
        
        // Update user position
        let mut updated_position = position;
        updated_position.borrowed = new_borrowed;
        updated_position.last_update_ledger = env.ledger().sequence();
        env.storage().instance().set(&position_key, &updated_position);
        
        // Update total borrowed
        let mut total_borrowed: i128 = env.storage().instance().get(&TOTAL_BORROWED).unwrap();
        total_borrowed += amount;
        env.storage().instance().set(&TOTAL_BORROWED, &total_borrowed);
        
        // Emit borrow event
        env.events().publish((BORROW_EVENT, user), amount);
    }

    pub fn repay(env: Env, user: Address, amount: i128) {
        user.require_auth();
        
        // Get user position
        let position_key = Symbol::from_str(&format!("POS_{}", user));
        let position: UserPosition = env.storage().instance()
            .get(&position_key)
            .unwrap_or(UserPosition {
                deposited: 0,
                borrowed: 0,
                last_update_ledger: env.ledger().sequence(),
            });
        
        // Check user has borrowed amount
        if position.borrowed < amount {
            panic!("Repayment amount exceeds borrowed amount");
        }
        
        // Transfer XLM from user back to contract
        let token_client = TokenClient::new(&env, &env.current_contract_address());
        token_client.transfer(&user, &env.current_contract_address(), &amount);
        
        // Update user position
        let mut updated_position = position;
        updated_position.borrowed -= amount;
        updated_position.last_update_ledger = env.ledger().sequence();
        env.storage().instance().set(&position_key, &updated_position);
        
        // Update total borrowed
        let mut total_borrowed: i128 = env.storage().instance().get(&TOTAL_BORROWED).unwrap();
        total_borrowed -= amount;
        env.storage().instance().set(&TOTAL_BORROWED, &total_borrowed);
        
        // Emit repay event
        env.events().publish((REPAY_EVENT, user), amount);
    }

    pub fn withdraw(env: Env, user: Address, amount: i128) {
        user.require_auth();
        
        // Get user position
        let position_key = Symbol::from_str(&format!("POS_{}", user));
        let position: UserPosition = env.storage().instance()
            .get(&position_key)
            .unwrap_or(UserPosition {
                deposited: 0,
                borrowed: 0,
                last_update_ledger: env.ledger().sequence(),
            });
        
        // Check withdrawal amount
        if position.deposited < amount {
            panic!("Withdrawal amount exceeds deposited amount");
        }
        
        // Calculate new position after withdrawal
        let new_deposited = position.deposited - amount;
        
        // Check remaining collateral ratio is safe
        if position.borrowed > 0 {
            let health_factor = (new_deposited * 100) / position.borrowed;
            if health_factor < COLLATERAL_RATIO {
                panic!("Withdrawal would make position undercollateralized");
            }
        }
        
        // Burn lXLM tokens
        let token_addr: Address = env.storage().instance().get(&TOKEN_ADDR).unwrap();
        let lxlm_client = TokenClient::new(&env, &token_addr);
        lxlm_client.burn(&user, &amount);
        
        // Transfer XLM back to user
        let token_client = TokenClient::new(&env, &env.current_contract_address());
        token_client.transfer(&env.current_contract_address(), &user, &amount);
        
        // Update user position
        let mut updated_position = position;
        updated_position.deposited = new_deposited;
        updated_position.last_update_ledger = env.ledger().sequence();
        env.storage().instance().set(&position_key, &updated_position);
        
        // Update total deposited
        let mut total_deposited: i128 = env.storage().instance().get(&TOTAL_DEPOSITED).unwrap();
        total_deposited -= amount;
        env.storage().instance().set(&TOTAL_DEPOSITED, &total_deposited);
        
        // Emit withdraw event
        env.events().publish((WITHDRAW_EVENT, user), amount);
    }

    pub fn get_position(env: Env, user: Address) -> UserPosition {
        let position_key = Symbol::from_str(&format!("POS_{}", user));
        env.storage().instance()
            .get(&position_key)
            .unwrap_or(UserPosition {
                deposited: 0,
                borrowed: 0,
                last_update_ledger: env.ledger().sequence(),
            })
    }

    pub fn get_health_factor(env: Env, user: Address) -> i128 {
        let position = Self::get_position(env, user.clone());
        
        if position.borrowed == 0 {
            return 999; // No debt, return max health factor
        }
        
        (position.deposited * 100) / position.borrowed
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN).unwrap()
    }

    pub fn get_token_address(env: Env) -> Address {
        env.storage().instance().get(&TOKEN_ADDR).unwrap()
    }

    pub fn get_total_deposited(env: Env) -> i128 {
        env.storage().instance().get(&TOTAL_DEPOSITED).unwrap()
    }

    pub fn get_total_borrowed(env: Env) -> i128 {
        env.storage().instance().get(&TOTAL_BORROWED).unwrap()
    }
}
