# Stellar Lending/Borrowing Protocol

![CI Status](https://github.com/welson-ai/Belt-4/workflows/CI%2FCD%20Pipeline/badge.svg)
![Rust](https://img.shields.io/badge/rust-stable-orange.svg)
![Stellar](https://img.shields.io/badge/stellar-soroban-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

A comprehensive decentralized lending and borrowing protocol built on the Stellar network using Soroban smart contracts.

## Submission Requirements

### live link

https://belt-4.vercel.app/

### mobile view screenshot

![My Image](https://raw.githubusercontent.com/welson-ai/Belt-4/master/frontend/public/image.png)

### CI/CD pipeline running 

![My Image](https://raw.githubusercontent.com/welson-ai/Belt-4/master/frontend/public/image2.png)

## Architecture Overview

### Smart Contracts
- **Lending Pool** (`contracts/lending-pool`): Core lending and borrowing functionality
- **LXLM Token** (`contracts/lxlm-token`): Custom governance token (SEP-41 compliant)
- **Liquidation Engine** (`contracts/liquidation`): Automated liquidation system

### Frontend
- **Web App** (`frontend/`): Next.js 14 + TypeScript + Tailwind CSS interface

## Project Structure

```
stellar-lend/
├── contracts/
│   ├── lending-pool/     # Soroban lending pool contract
│   ├── lxlm-token/       # SEP-41 custom token contract  
│   └── liquidation/      # Liquidation engine contract
├── frontend/             # Next.js web application
├── .github/workflows/    # CI/CD pipelines
├── Cargo.toml            # Rust workspace configuration
└── README.md
```

## Development Setup

### Prerequisites
- Rust with Soroban SDK
- Node.js 18+
- Stellar CLI tools

### Smart Contract Development
```bash
# Build all contracts
cargo build --workspace

# Run tests
cargo test --workspace

# Deploy to testnet
./scripts/deploy.sh
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

## Testing

### Contract Tests
```bash
# Test all contracts
cargo test --workspace

# Test individual contracts
cargo test -p lending-pool
cargo test -p lxlm-token
cargo test -p liquidation
```

### Frontend Tests
```bash
cd frontend
npm test
```

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **Test**: Runs unit tests for all contracts and frontend
- **Build**: Compiles WASM contracts for deployment
- **Deploy Preview**: Deploys to testnet on PRs with contract addresses
- **Vercel Deploy**: Automatically deploys frontend to production
- **Security Scan**: Runs cargo audit and npm audit
- **Code Quality**: Checks formatting and linting

## Deployment

### Automated Deployment
Use the provided deployment script:

```bash
./scripts/deploy.sh
```

This will:
1. Build all contracts
2. Deploy to Stellar testnet
3. Initialize contracts with proper addresses
4. Save contract addresses to `deployed-addresses.json`
5. Generate deployment summary

### Manual Deployment
```bash
# Build contracts
cargo build --workspace --target wasm32-unknown-unknown --release

# Deploy individual contracts
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/lxlm-token.wasm --network testnet
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/lending-pool.wasm --network testnet
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/liquidation.wasm --network testnet
```

## Features

- Decentralized lending and borrowing
- Collateralized loans with multiple asset support
- Automated liquidation system
- Governance token (LXLM)
- Modern web interface
- SEP-41 token compliance

## License
MIT
