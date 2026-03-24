#!/bin/bash

# Stellar Lending Protocol Deployment Script
# Deploys all contracts to Stellar testnet

set -e

echo "🚀 Starting Stellar Lending Protocol deployment to testnet..."

# Configuration
NETWORK="testnet"
CONTRACTS_DIR="contracts"
ADDRESSES_FILE="deployed-addresses.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if soroban CLI is installed
if ! command -v soroban &> /dev/null; then
    print_error "Soroban CLI not found. Please install it first."
    exit 1
fi

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    print_error "Cargo not found. Please install Rust first."
    exit 1
fi

# Create addresses file if it doesn't exist
if [ ! -f "$ADDRESSES_FILE" ]; then
    echo '{}' > "$ADDRESSES_FILE"
    print_info "Created addresses file: $ADDRESSES_FILE"
fi

# Function to deploy contract
deploy_contract() {
    local contract_name=$1
    local contract_path="$CONTRACTS_DIR/$contract_name"
    
    print_info "Building $contract_name contract..."
    
    # Build contract
    cd "$contract_path"
    cargo build --target wasm32-unknown-unknown --release
    
    if [ $? -ne 0 ]; then
        print_error "Failed to build $contract_name"
        exit 1
    fi
    
    print_success "Built $contract_name successfully"
    
    # Deploy contract
    print_info "Deploying $contract_name to $NETWORK..."
    
    local wasm_file="target/wasm32-unknown-unknown/release/$contract_name.wasm"
    
    if [ ! -f "$wasm_file" ]; then
        print_error "WASM file not found: $wasm_file"
        exit 1
    fi
    
    local deploy_result=$(soroban contract deploy --wasm "$wasm_file" --network $NETWORK)
    local contract_id=$(echo "$deploy_result" | grep -o '[a-f0-9]\{64\}')
    
    if [ -z "$contract_id" ]; then
        print_error "Failed to deploy $contract_name"
        echo "Deploy result: $deploy_result"
        exit 1
    fi
    
    print_success "Deployed $contract_name: $contract_id"
    
    # Return to root directory
    cd - > /dev/null
    
    echo "$contract_id"
}

# Function to invoke contract
invoke_contract() {
    local contract_id=$1
    local function_name=$2
    local args=$3
    
    print_info "Invoking $function_name on contract $contract_id..."
    
    local invoke_result=$(soroban contract invoke \
        --id "$contract_id" \
        --network $NETWORK \
        --function "$function_name" \
        $args 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        print_error "Failed to invoke $function_name"
        echo "Invoke result: $invoke_result"
        exit 1
    fi
    
    print_success "Invoked $function_name successfully"
    echo "$invoke_result"
}

# Function to update addresses JSON
update_addresses() {
    local contract_name=$1
    local contract_id=$2
    
    # Create temporary file
    local temp_file=$(mktemp)
    
    # Update JSON using jq (or fallback to sed)
    if command -v jq &> /dev/null; then
        jq --arg contract_name "$contract_name" --arg contract_id "$contract_id" \
            '. + {($contract_name): $contract_id}' "$ADDRESSES_FILE" > "$temp_file"
        mv "$temp_file" "$ADDRESSES_FILE"
    else
        # Fallback to sed if jq is not available
        sed "s/}/,\"$contract_name\":\"$contract_id\"}/" "$ADDRESSES_FILE" > "$temp_file"
        mv "$temp_file" "$ADDRESSES_FILE"
    fi
}

# Main deployment process
echo "📋 Deployment started at $(date)"

# Step 1: Deploy lXLM Token contract
print_info "Step 1: Deploying lXLM Token contract..."
LXLM_TOKEN_ID=$(deploy_contract "lxlm-token")
update_addresses "lxlm_token" "$LXLM_TOKEN_ID"
echo "Transaction hash: $(soroban contract deploy --wasm $CONTRACTS_DIR/lxlm-token/target/wasm32-unknown-unknown/release/lxlm-token.wasm --network $NETWORK | grep -o '[a-f0-9]\{64\}' | head -1)"

# Step 2: Deploy Lending Pool contract
print_info "Step 2: Deploying Lending Pool contract..."
LENDING_POOL_ID=$(deploy_contract "lending-pool")
update_addresses "lending_pool" "$LENDING_POOL_ID"
echo "Transaction hash: $(soroban contract deploy --wasm $CONTRACTS_DIR/lending-pool/target/wasm32-unknown-unknown/release/lending-pool.wasm --network $NETWORK | grep -o '[a-f0-9]\{64\}' | head -1)"

# Step 3: Deploy Liquidation contract
print_info "Step 3: Deploying Liquidation contract..."
LIQUIDATION_ID=$(deploy_contract "liquidation")
update_addresses "liquidation" "$LIQUIDATION_ID"
echo "Transaction hash: $(soroban contract deploy --wasm $CONTRACTS_DIR/liquidation/target/wasm32-unknown-unknown/release/liquidation.wasm --network $NETWORK | grep -o '[a-f0-9]\{64\}' | head -1)"

# Step 4: Initialize contracts
print_info "Step 4: Initializing contracts..."

# Initialize lXLM Token (set minter to lending pool)
print_info "Initializing lXLM Token contract..."
invoke_contract "$LXLM_TOKEN_ID" "initialize" "--id $LENDING_POOL_ID"

# Initialize Lending Pool (set admin and token address)
print_info "Initializing Lending Pool contract..."
# Note: You'll need to provide your admin address here
ADMIN_ADDRESS="GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" # Replace with actual admin address
invoke_contract "$LENDING_POOL_ID" "initialize" "--id $ADMIN_ADDRESS --id $LXLM_TOKEN_ID"

# Initialize Liquidation (set lending pool address)
print_info "Initializing Liquidation contract..."
invoke_contract "$LIQUIDATION_ID" "initialize" "--id $LENDING_POOL_ID"

# Step 5: Save deployment summary
print_info "Step 5: Saving deployment summary..."

cat > "deployment-summary.md" << EOF
# Stellar Lending Protocol Deployment Summary

**Network:** $NETWORK  
**Date:** $(date)  
**Commit:** $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")

## Deployed Contracts

| Contract | Address | Transaction Hash |
|----------|----------|------------------|
| lXLM Token | \`$LXLM_TOKEN_ID\` | \`$(soroban contract deploy --wasm $CONTRACTS_DIR/lxlm-token/target/wasm32-unknown-unknown/release/lxlm-token.wasm --network $NETWORK | grep -o '[a-f0-9]\{64\}' | head -1)\` |
| Lending Pool | \`$LENDING_POOL_ID\` | \`$(soroban contract deploy --wasm $CONTRACTS_DIR/lending-pool/target/wasm32-unknown-unknown/release/lending-pool.wasm --network $NETWORK | grep -o '[a-f0-9]\{64\}' | head -1)\` |
| Liquidation | \`$LIQUIDATION_ID\` | \`$(soroban contract deploy --wasm $CONTRACTS_DIR/liquidation/target/wasm32-unknown-unknown/release/liquidation.wasm --network $NETWORK | grep -o '[a-f0-9]\{64\}' | head -1)\` |

## Initialization Status

- ✅ lXLM Token initialized with minter: Lending Pool
- ✅ Lending Pool initialized with admin: $ADMIN_ADDRESS
- ✅ Liquidation initialized with Lending Pool address

## Next Steps

1. Update the admin address in the deployment script
2. Test the contracts using the deployed addresses
3. Configure frontend to use these contract addresses
4. Set up monitoring and alerting

## Contract Addresses JSON

\`\`\`json
$(cat "$ADDRESSES_FILE")
\`\`\`
EOF

# Display final summary
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
print_success "Contract Addresses:"
echo "  lXLM Token:     $LXLM_TOKEN_ID"
echo "  Lending Pool:   $LENDING_POOL_ID"
echo "  Liquidation:    $LIQUIDATION_ID"
echo ""
print_success "Files created:"
echo "  - $ADDRESSES_FILE (contract addresses)"
echo "  - deployment-summary.md (deployment details)"
echo ""
print_warning "Important:"
echo "  - Update the admin address in the deployment script"
echo "  - Save these addresses for frontend configuration"
echo "  - Test all contract functions before production use"
echo ""
print_info "Deployment completed at $(date)"

# Make the addresses file more readable
if command -v jq &> /dev/null; then
    jq . "$ADDRESSES_FILE" > /tmp/addresses_formatted.json
    mv /tmp/addresses_formatted.json "$ADDRESSES_FILE"
fi

print_success "Deployment script finished! 🚀"
