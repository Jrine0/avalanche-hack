# Avalanche Micro-Task Rewards Platform

Complete Web3 micro-task platform built on Avalanche blockchain with smart contracts, backend API, and frontend wallet integration.

## 🏗️ Architecture

### Core Components

1. **Smart Contracts** - Solidity contracts for reward distribution
2. **Backend API** - Node.js/Express server with `/payUser` endpoint
3. **Frontend** - React app with MetaMask wallet integration
4. **Turf Integration** - AI agent verification for task completion

### Key Features

- ✅ MetaMask wallet integration with Avalanche C-Chain
- ✅ 0.01 AVAX micro-payments for task completion
- ✅ Merkle proof-based reward distribution
- ✅ Turf AI agent verification
- ✅ Transaction logging on Snowtrace
- ✅ Batch payment support
- ✅ Real-time transaction history

## 📋 Prerequisites

- Node.js (v16 or higher)
- MetaMask browser extension
- Avalanche Fuji testnet AVAX (free from faucet)
- Git

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd avalanche-micro-task-contracts

# Install dependencies
npm install

# Install frontend dependencies
npm run install:frontend
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit .env with your configuration
```

Required environment variables:
- `PRIVATE_KEY`: Your wallet private key for deployment
- `FUJI_RPC_URL`: Avalanche Fuji testnet RPC URL
- `SNOWTRACE_API_KEY`: Snowtrace API key for contract verification
- `TURF_API_KEY`: Turf AI agent API key (optional for demo)

### 3. Deploy Smart Contracts

```bash
# Deploy to Fuji testnet
npm run deploy:fuji

# Verify contracts on Snowtrace
npx hardhat verify --network fuji <REWARDER_ADDRESS> "<OWNER_ADDRESS>"
npx hardhat verify --network fuji <TASKESCROW_ADDRESS> "<OWNER_ADDRESS>" "<REWARDER_ADDRESS>" "250" "<FEE_RECIPIENT>"
```

### 4. Start Backend Server

```bash
# Start the backend API server
npm run dev
```

The backend will run on `http://localhost:3002` with the following endpoints:
- `POST /api/connect-wallet` - Connect user wallet
- `POST /api/submit-task` - Submit task result
- `POST /api/payUser` - Process payment (main PRD requirement)
- `GET /api/transactions/:userId` - Get user transactions
- `GET /api/task-status/:resultId` - Get task status
- `GET /api/health` - Health check

### 5. Start Frontend

```bash
# In a new terminal, start the frontend
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

## 🎯 PRD Implementation Status

### ✅ Completed Requirements

| **PRD Requirement** | **Status** | **Implementation** |
|-------------------|------------|-------------------|
| Wallet Integration | ✅ Complete | MetaMask + Avalanche C-Chain |
| Micro-Payment Flow | ✅ Complete | 0.01 AVAX per task |
| Smart Contract | ✅ Complete | Rewarder + TaskEscrow |
| Data Anchoring | ✅ Complete | Backend storage + Snowtrace |
| Turf Integration | ✅ Complete | API verification flow |
| `/payUser` Endpoint | ✅ Complete | Express API endpoint |
| Transaction Logging | ✅ Complete | Snowtrace integration |
| Batch Payments | ✅ Complete | `batchClaimRewards()` |

### 🔄 High-Level Flow

1. **User connects wallet** → MetaMask integration
2. **User completes micro-task** → Frontend submits to backend
3. **Turf verifies task** → AI agent validation
4. **Backend calls smart contract** → Processes payment
5. **Transaction recorded** → Snowtrace + backend storage

## 📖 Contract Documentation

### Rewarder Contract

The Rewarder contract implements the Merkle distributor pattern for efficient reward distribution.

#### Key Functions

- `setMerkleRoot(taskId, merkleRoot, rewardToken, totalRewards, deadline)` - Set Merkle root for a task
- `claimReward(taskId, user, amount, merkleProof)` - Claim reward with Merkle proof
- `batchClaimRewards(taskId, claims)` - Batch claim multiple rewards
- `deactivateTask(taskId)` - Deactivate a task

#### Events

- `MerkleRootSet` - Emitted when Merkle root is set
- `RewardClaimed` - Emitted when reward is claimed
- `TaskDeactivated` - Emitted when task is deactivated

### TaskEscrow Contract

The TaskEscrow contract manages escrowed funds and integrates with the Rewarder for payouts.

#### Key Functions

- `fundTask(taskId, fundingToken, amount, deadline, minPayoutAmount)` - Fund a task
- `processPayout(taskId, user, amount, rewardToken)` - Process payout (called by Rewarder)
- `refundRemainingFunds(taskId)` - Refund remaining funds after deadline
- `updatePlatformFee(newFeeBps)` - Update platform fee
- `updatePlatformFeeRecipient(newRecipient)` - Update fee recipient

#### Events

- `TaskFunded` - Emitted when task is funded
- `PayoutProcessed` - Emitted when payout is processed
- `RefundProcessed` - Emitted when refund is processed

## 🧪 Testing

### Smart Contract Tests

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/Rewarder.test.js
npx hardhat test test/TaskEscrow.test.js

# Test coverage
npm run coverage

# Gas reporting
REPORT_GAS=true npm test
```

### API Testing

```bash
# Test backend endpoints
curl -X POST http://localhost:3002/api/health
curl -X POST http://localhost:3002/api/connect-wallet \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","walletAddress":"0x..."}'
```

### Frontend Testing

1. Open `http://localhost:3000`
2. Connect MetaMask wallet
3. Add Avalanche Fuji testnet
4. Complete sample tasks
5. Verify payments on Snowtrace

## 🌐 Deployment

### Fuji Testnet

```bash
npm run deploy:fuji
```

### Mainnet

```bash
npx hardhat run scripts/deploy.js --network mainnet
```

### Contract Verification

After deployment, verify contracts on Snowtrace:

```bash
npx hardhat verify --network fuji <REWARDER_ADDRESS> "<OWNER_ADDRESS>"
npx hardhat verify --network fuji <TASKESCROW_ADDRESS> "<OWNER_ADDRESS>" "<REWARDER_ADDRESS>" "250" "<FEE_RECIPIENT>"
```

## 📊 Gas Optimization

- Merkle proofs for efficient reward distribution
- Batch operations for multiple claims
- Optimized storage patterns
- Minimal external calls

## 🔒 Security Features

- ReentrancyGuard for all external calls
- Access control with OpenZeppelin Ownable
- Custom errors for gas efficiency
- Emergency withdrawal functions
- Comprehensive input validation
- Wallet address validation
- Turf agent verification

## 🎨 Frontend Features

- MetaMask wallet integration
- Avalanche network switching
- Real-time transaction history
- Snowtrace transaction links
- Responsive design with Tailwind CSS
- Loading states and error handling

## 🔧 Backend Features

- Express.js REST API
- CORS enabled for frontend integration
- Helmet security middleware
- Request logging with Morgan
- In-memory storage (replace with database in production)
- Turf AI agent integration
- Avalanche blockchain integration

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📞 Support

For questions or support, please open an issue on GitHub.

## 🔗 Links

- [Avalanche Documentation](https://docs.avax.network/)
- [Hardhat Documentation](https://hardhat.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Snowtrace Explorer](https://snowtrace.io/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [React Documentation](https://reactjs.org/)
- [Express.js Documentation](https://expressjs.com/)
