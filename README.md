# sign_2of2

A TypeScript implementation of a 2-of-2 multisignature smart contract for the CKB blockchain.

## Overview

This project implements a secure 2-of-2 multisignature contract using the CKB JavaScript VM (ckb-js-vm). The contract requires both signatures to be valid for a transaction to succeed, providing enhanced security for digital asset management.

### Key Features

- **2-of-2 Multisig Security**: Requires signatures from both parties to authorize transactions
- **Comprehensive Validation**: Input validation for script args, witness data, and cryptographic parameters
- **Error Handling**: Detailed error codes for different failure scenarios
- **Extensive Testing**: Both mock and devnet integration tests
- **TypeScript Development**: Type-safe smart contract development

## Project Structure

```
sign_2of2/
├── contracts/              # Smart contract source code
│   └── 2of2/
│       └── src/
│           └── index.ts    # 2-of-2 multisig contract implementation
├── tests/                  # Contract tests
│   ├── 2of2.mock.test.ts   # Unit tests with mock CKB environment
│   ├── 2of2.devnet.test.ts # Integration tests on local devnet
│   └── helper.ts           # Test utility functions
├── scripts/                # Build and utility scripts
│   ├── build-all.js        # Build all contracts
│   ├── build-contract.js   # Build specific contract
│   ├── add-contract.js     # Add new contract template
│   └── deploy.js           # Deploy contracts to CKB networks
├── deployment/             # Deployment artifacts
│   ├── scripts.json        # Deployed contract information
│   ├── system-scripts.json # System script configurations
│   └── devnet/             # Network-specific deployment data
├── dist/                   # Compiled output (generated)
│   ├── 2of2.js            # Bundled JavaScript
│   └── 2of2.bc            # Compiled bytecode
├── package.json
├── tsconfig.json           # TypeScript configuration
├── tsconfig.base.json      # Base TypeScript settings
├── jest.config.cjs         # Jest testing configuration
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- pnpm package manager

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

### Building Contracts

Build all contracts:
```bash
pnpm run build
```

Build the 2of2 contract specifically:
```bash
pnpm run build:contract 2of2
```

### Running Tests

Run all tests (including both mock and devnet tests):
```bash
pnpm test
```

Run only mock tests:
```bash
pnpm test -- 2of2.mock.test.ts
```

Run devnet integration tests (requires local CKB devnet):
```bash
pnpm test -- 2of2.devnet.test.ts
```

### Adding New Contracts

Create a new contract:
```bash
pnpm run add-contract my-new-contract
```

This will:
- Create a new contract directory under `contracts/`
- Generate a basic contract template
- Create a corresponding test file

## 2-of-2 Multisig Contract

### Contract Overview

The 2-of-2 multisig contract implements a secure multi-party signature verification system where:

- **Two signatures required**: Both parties must sign for transaction validation
- **Public key validation**: Signatures are verified against predefined public key hashes
- **Comprehensive error handling**: Detailed error codes for different failure scenarios
- **Input validation**: Thorough validation of script args and witness data

### Contract Structure

#### Script Args (42 bytes total)
- Byte 0: Threshold (2)
- Byte 1: Public key count (2) 
- Bytes 2-21: First public key blake160 hash (20 bytes)
- Bytes 22-41: Second public key blake160 hash (20 bytes)

#### Witness Data (132 bytes total)
```
┌─────────────────┬─────────────────┬──────────────┬──────────────┐
│   Signature 1   │   Signature 2   │ Pubkey Index │ Pubkey Index │
│    (65 bytes)   │    (65 bytes)   │      1       │      2       │
│                 │                 │   (1 byte)   │   (1 byte)   │
└─────────────────┴─────────────────┴──────────────┴──────────────┘
Offset:    0              65             130           131
```

#### Error Codes
- `0`: Success
- `1`: Invalid signature
- `2`: Invalid script args length
- `3`: Invalid witness data length
- `4`: Invalid pubkey index
- `5`: Signature recovery failed

## Development

### Contract Development

1. Edit the 2of2 contract in `contracts/2of2/src/index.ts`
2. Build the contract: `pnpm run build:contract 2of2`
3. Run tests: `pnpm test`

### Build Output

All contracts are built to the global `dist/` directory:
- `dist/2of2.js` - Bundled JavaScript code
- `dist/2of2.bc` - Compiled bytecode for CKB execution

### Testing

The project includes two types of tests:

#### Mock Tests (`2of2.mock.test.ts`)
- Use `ckb-testtool` framework to simulate CKB blockchain execution
- Fast execution with comprehensive edge case testing
- 8 test cases covering success and failure scenarios
- Includes boundary condition validation

#### Devnet Integration Tests (`2of2.devnet.test.ts`) 
- Connect to actual local CKB devnet
- Test real transaction execution
- Two-transaction pattern: create locked UTXO, then unlock with signatures
- Validates end-to-end contract functionality

## Available Scripts

- `build` - Build all contracts
- `build:contract <name>` - Build a specific contract
- `test` - Run all tests (mock + devnet)
- `add-contract <name>` - Add a new contract template
- `deploy` - Deploy contracts to CKB network
- `clean` - Remove all build outputs
- `format` - Format code with Prettier

## Deployment

Deploy your contracts to CKB networks using the built-in deploy script:

### Basic Usage

```bash
# Deploy to devnet (default)
pnpm run deploy

# Deploy to testnet
pnpm run deploy -- --network testnet

# Deploy to mainnet
pnpm run deploy -- --network mainnet
```

### Advanced Options

```bash
# Deploy with upgradable type ID
pnpm run deploy -- --network testnet --type-id

# Deploy with custom private key
pnpm run deploy -- --network testnet --privkey 0x...

# Combine multiple options
pnpm run deploy -- --network testnet --type-id --privkey 0x...
```

### Available Options

- `--network <network>` - Target network: `devnet`, `testnet`, or `mainnet` (default: `devnet`)
- `--privkey <privkey>` - Private key for deployment (default: uses offckb's deployer account)
- `--type-id` - Enable upgradable type ID for contract updates

### Deployment Artifacts

After successful deployment, artifacts are saved to the `deployment/` directory:
- `deployment/scripts.json` - Contract script information
- `deployment/<network>/<contract>/deployment.toml` - Deployment configuration
- `deployment/<network>/<contract>/migrations/` - Migration history

## Dependencies

### Core Dependencies
- `@ckb-js-std/bindings` - CKB JavaScript VM bindings
- `@ckb-js-std/core` - Core CKB JavaScript utilities
- `dotenv` - Environment variable management
- `@noble/curves` - Cryptographic curve operations for secp256k1

### Development Dependencies
- `@ckb-ccc/core` - CKB Client SDK for devnet testing
- `ckb-testtool` - Testing framework for CKB contracts
- `esbuild` - Fast JavaScript bundler
- `jest` - JavaScript testing framework
- `typescript` - TypeScript compiler
- `ts-jest` - TypeScript support for Jest
- `prettier` - Code formatter
- `rimraf` - Cross-platform file removal

## Resources

- [CKB JavaScript VM Documentation](https://github.com/nervosnetwork/ckb-js-vm)
- [CKB Developer Documentation](https://docs.nervos.org/docs/script/js/js-quick-start)
- [The Little Book of ckb-js-vm ](https://nervosnetwork.github.io/ckb-js-vm/)

## License

MIT
