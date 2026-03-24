# 🏦 Stellar Lending/Borrowing Protocol

A comprehensive decentralized lending and borrowing protocol built on the Stellar network using Soroban smart contracts.

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
soroban contract deploy ...
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

## Features

- ✅ Decentralized lending and borrowing
- ✅ Collateralized loans with multiple asset support
- ✅ Automated liquidation system
- ✅ Governance token (LXLM)
- ✅ Modern web interface
- ✅ SEP-41 token compliance

## License
MIT
