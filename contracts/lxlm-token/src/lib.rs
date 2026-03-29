#![allow(dead_code)]
#![allow(clippy::too_many_arguments)]
#![allow(clippy::result_large_err)]
#![allow(unused_variables)]

use soroban_sdk::{Address, Env, String, Symbol, contract, contractimpl};

#[contract]
pub struct LxlmToken;

// Storage keys
const TOTAL_SUPPLY: Symbol = Symbol::short(&[84, 79, 84, 69, 83, 80, 75, 83]); // "TOTAL_SUPPLY"
const MINTER: Symbol = Symbol::short(&[77, 73, 78, 84, 69, 82]); // "MINTER"

// Event symbols
const MINT_EVENT: Symbol = Symbol::short(&[109, 105, 110, 116]); // "mint"
const BURN_EVENT: Symbol = Symbol::short(&[98, 117, 114, 110]); // "burn"
const TRANSFER_EVENT: Symbol = Symbol::short(&[116, 114, 111, 99, 110, 105, 114]); // "transfer"

#[contractimpl]
impl LxlmToken {
    pub fn initialize(env: Env, minter: Address) {
        // Set the minter address
        env.storage().instance().set(&MINTER, &minter);

        // Initialize total supply to 0
        env.storage().instance().set(&TOTAL_SUPPLY, &0i128);
    }

    pub fn name(_env: Env) -> String {
        String::from_str("Lending XLM")
    }

    pub fn symbol(_env: Env) -> String {
        String::from_str("lXLM")
    }

    pub fn decimals(_env: Env) -> u32 {
        7
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage().instance().get(&TOTAL_SUPPLY).unwrap_or(0i128)
    }

    pub fn balance(env: Env, account: Address) -> i128 {
        let balance_key = Symbol::short(&[66, 65, 76, 95, 95, 65, 83]); // "BAL_{}"
        env.storage().instance().get(&balance_key).unwrap_or(0i128)
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        // Get minter address
        let minter: Address = env.storage().instance().get(&MINTER).unwrap();

        // Require minter authorization
        minter.require_auth();

        // Check amount is positive
        if amount <= 0 {
            panic!("Amount must be positive");
        }

        // Update recipient's balance
        let balance_key = Symbol::short(&[66, 65, 76, 95, 95, 65, 83]); // "BAL_{}"
        let current_balance: i128 = env.storage().instance().get(&balance_key).unwrap_or(0i128);
        let new_balance = current_balance + amount;
        env.storage().instance().set(&balance_key, &new_balance);

        // Update total supply
        let current_supply: i128 = env.storage().instance().get(&TOTAL_SUPPLY).unwrap_or(0i128);
        let new_supply = current_supply + amount;
        env.storage().instance().set(&TOTAL_SUPPLY, &new_supply);

        // Emit mint event
        env.events().publish((MINT_EVENT, to), amount);
    }

    pub fn burn(env: Env, from: Address, amount: i128) {
        // Get minter address
        let minter: Address = env.storage().instance().get(&MINTER).unwrap();

        // Require minter authorization
        minter.require_auth();

        // Check amount is positive
        if amount <= 0 {
            panic!("Amount must be positive");
        }

        // Get current balance
        let balance_key = Symbol::short(&[66, 65, 76, 95, 95, 65, 83]); // "BAL_{}"
        let current_balance: i128 = env.storage().instance().get(&balance_key).unwrap_or(0i128);

        // Check sufficient balance
        if current_balance < amount {
            panic!("Insufficient balance to burn");
        }

        // Update balance
        let new_balance = current_balance - amount;
        env.storage().instance().set(&balance_key, &new_balance);

        // Update total supply
        let current_supply: i128 = env.storage().instance().get(&TOTAL_SUPPLY).unwrap_or(0i128);
        let new_supply = current_supply - amount;
        env.storage().instance().set(&TOTAL_SUPPLY, &new_supply);

        // Emit burn event
        env.events().publish((BURN_EVENT, from), amount);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        // Require sender authorization
        from.require_auth();
        
        // Check amount is positive
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        
        // Get sender's balance
        let from_balance_key = Symbol::from_str(&format!("BAL_{}", from));
        let from_balance: i128 = env
            .storage()
            .instance()
            .get(&from_balance_key)
            .unwrap_or(0i128);

        // Check sufficient balance
        if from_balance < amount {
            panic!("Insufficient balance to transfer");
        }

        // Update sender's balance
        let new_from_balance = from_balance - amount;
        env.storage().instance().set(&from_balance_key, &new_from_balance);

        // Update recipient's balance
        let to_balance_key = Symbol::from_str(&format!("BAL_{}", to));
        let to_balance: i128 = env.storage().instance().get(&to_balance_key).unwrap_or(0i128);
        let new_to_balance = to_balance + amount;
        env.storage().instance().set(&to_balance_key, &new_to_balance);

        // Emit transfer event
        env.events().publish((TRANSFER_EVENT, from, to), amount);
    }

    pub fn get_minter(env: Env) -> Address {
        env.storage().instance().get(&MINTER).unwrap()
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let allowance_key = Symbol::short(&[65, 76, 76, 79, 87, 78, 69, 83]); // "ALLOW_{}{}"
        env.storage().instance().get(&allowance_key).unwrap_or(0i128)
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128) {
        // Require owner authorization
        from.require_auth();

        // Set allowance
        let allowance_key = Symbol::short(&[65, 76, 76, 79, 87, 78, 69, 83]); // "ALLOW_{}{}"
        env.storage().instance().set(&allowance_key, &amount);

        // Emit approval event
        let approval_event = Symbol::from_str("approve");
        env.events().publish((approval_event, from, spender), amount);
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        // Require spender authorization
        spender.require_auth();

        // Check amount is positive
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        
        // Get allowance
        let allowance_key = Symbol::from_str(&format!("ALLOW_{}_{}", from, spender));
        let current_allowance: i128 = env.storage().instance().get(&allowance_key).unwrap_or(0i128);

        // Check sufficient allowance
        if current_allowance < amount {
            panic!("Insufficient allowance");
        }

        // Get sender's balance
        let from_balance_key = Symbol::short(&[66, 65, 76, 95, 95, 65, 83]); // "BAL_{}"
        let from_balance: i128 = env.storage().instance().get(&from_balance_key).unwrap_or(0i128);

        // Check sufficient balance
        if from_balance < amount {
            panic!("Insufficient balance to transfer");
        }

        // Update allowance
        let new_allowance = current_allowance - amount;
        env.storage().instance().set(&allowance_key, &new_allowance);

        // Update sender's balance
        let new_from_balance = from_balance - amount;
        env.storage().instance().set(&from_balance_key, &new_from_balance);

        // Update recipient's balance
        let to_balance_key = Symbol::from_str(&format!("BAL_{}", to));
        let to_balance: i128 = env.storage().instance().get(&to_balance_key).unwrap_or(0i128);
        let new_to_balance = to_balance + amount;
        env.storage().instance().set(&to_balance_key, &new_to_balance);
        env.storage()
            .instance()
            .set(&to_balance_key, &new_to_balance);

        // Emit transfer event
        env.events().publish((TRANSFER_EVENT, from, to), amount);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{Address, Env, testutils::Address as _};

    #[test]
    fn test_mint_and_balance() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, LxlmToken);
        let client = LxlmTokenClient::new(&env, &contract_id);

        let minter = Address::generate(&env);
        let user = Address::generate(&env);

        client.initialize(&minter);
        client.mint(&minter, &user, &1000i128);

        assert_eq!(client.balance(&user), 1000i128);
    }

    #[test]
    fn test_burn() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, LxlmToken);
        let client = LxlmTokenClient::new(&env, &contract_id);

        let minter = Address::generate(&env);
        let user = Address::generate(&env);

        client.initialize(&minter);
        client.mint(&minter, &user, &1000i128);
        client.burn(&minter, &user, &400i128);

        assert_eq!(client.balance(&user), 600i128);
    }
}
