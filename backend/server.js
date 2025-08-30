const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { ethers } = require('ethers');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// In-memory storage for demo (replace with database in production)
const taskResults = new Map();
const userWallets = new Map();
const transactions = new Map();

// Initialize Avalanche provider
const provider = new ethers.JsonRpcProvider(process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc");

// Contract ABIs (simplified for demo)
const REWARDER_ABI = [
    "function claimReward(bytes32 taskId, address user, uint256 amount, bytes32[] calldata merkleProof) external",
    "function batchClaimRewards(bytes32 taskId, tuple(address user, uint256 amount, bytes32[] merkleProof)[] calldata claims) external",
    "function hasClaimed(bytes32 taskId, address user) external view returns (bool)",
    "function getTaskInfo(bytes32 taskId) external view returns (tuple(address rewardToken, uint256 totalRewards, uint256 claimedRewards, bool isActive, uint256 deadline))"
];

const TASK_ESCROW_ABI = [
    "function processPayout(bytes32 taskId, address user, uint256 amount, address rewardToken) external",
    "function getEscrowInfo(bytes32 taskId) external view returns (tuple(address creator, address fundingToken, uint256 totalFunded, uint256 totalPaidOut, uint256 platformFeesCollected, bool isActive, uint256 deadline, uint256 minPayoutAmount))"
];

// Initialize contracts (will be set after deployment)
let rewarderContract;
let taskEscrowContract;
let deployerWallet;

// Initialize contracts with deployed addresses
function initializeContracts() {
    try {
        // Load deployment info
        const fs = require('fs');
        const deploymentFile = `deployment-${process.env.NETWORK || 'fuji'}.json`;
        
        if (fs.existsSync(deploymentFile)) {
            const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
            
            deployerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            rewarderContract = new ethers.Contract(deployment.contracts.rewarder, REWARDER_ABI, deployerWallet);
            taskEscrowContract = new ethers.Contract(deployment.contracts.taskEscrow, TASK_ESCROW_ABI, deployerWallet);
            
            console.log('✅ Contracts initialized successfully');
            console.log('Rewarder:', deployment.contracts.rewarder);
            console.log('TaskEscrow:', deployment.contracts.taskEscrow);
        } else {
            console.log('⚠️  Deployment file not found. Please deploy contracts first.');
        }
    } catch (error) {
        console.error('❌ Error initializing contracts:', error.message);
    }
}

// Turf Agent API integration
async function verifyTaskWithTurf(taskId, taskData) {
    try {
        // Simulate Turf agent verification
        // In production, this would call the actual Turf API
        const turfResponse = await axios.post(process.env.TURF_API_URL || 'https://api.turf.ai/verify', {
            taskId,
            taskData,
            timestamp: Date.now()
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.TURF_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        return turfResponse.data.valid === true;
    } catch (error) {
        console.error('Turf API error:', error.message);
        // For demo purposes, return true if Turf API is not available
        return true;
    }
}

// Generate Merkle proof for reward
function generateMerkleProof(userAddress, amount) {
    // Simplified Merkle proof generation for demo
    // In production, use proper Merkle tree library
    const leaf = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [userAddress, amount]
    ));
    
    return [leaf]; // Simplified proof
}

// API Routes

// 1. Wallet Connect - Store user wallet address
app.post('/api/connect-wallet', async (req, res) => {
    try {
        const { userId, walletAddress } = req.body;
        
        if (!userId || !walletAddress) {
            return res.status(400).json({ error: 'Missing userId or walletAddress' });
        }

        // Validate wallet address
        if (!ethers.isAddress(walletAddress)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        // Store wallet address (in production, save to database)
        userWallets.set(userId, walletAddress);
        
        console.log(`✅ Wallet connected: ${userId} -> ${walletAddress}`);
        
        res.json({ 
            success: true, 
            message: 'Wallet connected successfully',
            walletAddress 
        });
    } catch (error) {
        console.error('Wallet connect error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Submit Task Result
app.post('/api/submit-task', async (req, res) => {
    try {
        const { userId, taskId, taskData, answer } = req.body;
        
        if (!userId || !taskId || !taskData || !answer) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Store task result
        const resultId = uuidv4();
        taskResults.set(resultId, {
            userId,
            taskId,
            taskData,
            answer,
            timestamp: Date.now(),
            status: 'pending'
        });

        console.log(`✅ Task submitted: ${resultId} by ${userId}`);
        
        res.json({ 
            success: true, 
            resultId,
            message: 'Task submitted successfully' 
        });
    } catch (error) {
        console.error('Task submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. PayUser endpoint - Main PRD requirement
app.post('/api/payUser', async (req, res) => {
    try {
        const { resultId, amount = "0.01" } = req.body;
        const amountWei = ethers.parseEther(amount);
        
        if (!resultId) {
            return res.status(400).json({ error: 'Missing resultId' });
        }

        // Get task result
        const taskResult = taskResults.get(resultId);
        if (!taskResult) {
            return res.status(404).json({ error: 'Task result not found' });
        }

        // Get user wallet
        const userWallet = userWallets.get(taskResult.userId);
        if (!userWallet) {
            return res.status(400).json({ error: 'User wallet not connected' });
        }

        // Verify with Turf agent
        console.log(`🔍 Verifying task with Turf: ${resultId}`);
        const isValid = await verifyTaskWithTurf(taskResult.taskId, taskResult.taskData);
        
        if (!isValid) {
            taskResult.status = 'rejected';
            taskResults.set(resultId, taskResult);
            return res.status(400).json({ error: 'Task verification failed' });
        }

        // Check if already paid
        if (taskResult.status === 'paid') {
            return res.status(400).json({ error: 'Task already paid' });
        }

        // Process payment on Avalanche
        console.log(`💰 Processing payment: ${amount} AVAX to ${userWallet}`);
        
        let txHash;
        let snowtraceUrl;

        if (rewarderContract && taskEscrowContract) {
            // Use smart contracts for payment
            const taskId = ethers.keccak256(ethers.toUtf8Bytes(taskResult.taskId));
            const merkleProof = generateMerkleProof(userWallet, amount);
            
            // Process payout through TaskEscrow
            const tx = await taskEscrowContract.processPayout(
                taskId,
                userWallet,
                amountWei,
                ethers.ZeroAddress // AVAX
            );
            
            await tx.wait();
            txHash = tx.hash;
        } else {
            // Fallback: direct AVAX transfer
            const tx = await deployerWallet.sendTransaction({
                to: userWallet,
                value: amountWei
            });
            
            await tx.wait();
            txHash = tx.hash;
        }

        // Generate Snowtrace URL
        const network = process.env.NETWORK || 'fuji';
        snowtraceUrl = `https://testnet.snowtrace.io/tx/${txHash}`;

        // Update task result
        taskResult.status = 'paid';
        taskResult.txHash = txHash;
        taskResult.snowtraceUrl = snowtraceUrl;
        taskResult.paidAt = Date.now();
        taskResults.set(resultId, taskResult);

        // Store transaction record
        const txRecord = {
            resultId,
            userId: taskResult.userId,
            walletAddress: userWallet,
            amount: amount,
            txHash,
            snowtraceUrl,
            timestamp: Date.now()
        };
        transactions.set(txHash, txRecord);

        console.log(`✅ Payment successful: ${txHash}`);
        console.log(`🔗 Snowtrace: ${snowtraceUrl}`);

        res.json({
            success: true,
            message: 'Payment processed successfully',
            txHash,
            snowtraceUrl,
            amount: amount,
            walletAddress: userWallet
        });

    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ 
            error: 'Payment processing failed',
            details: error.message 
        });
    }
});

// 4. Get user transactions
app.get('/api/transactions/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const userTxs = Array.from(transactions.values())
            .filter(tx => tx.userId === userId)
            .sort((a, b) => b.timestamp - a.timestamp);

        res.json({ transactions: userTxs });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 5. Get task status
app.get('/api/task-status/:resultId', (req, res) => {
    try {
        const { resultId } = req.params;
        const taskResult = taskResults.get(resultId);
        
        if (!taskResult) {
            return res.status(404).json({ error: 'Task result not found' });
        }

        res.json({ taskResult });
    } catch (error) {
        console.error('Get task status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 6. Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        contracts: {
            rewarder: rewarderContract?.target || 'not initialized',
            taskEscrow: taskEscrowContract?.target || 'not initialized'
        },
        network: process.env.NETWORK || 'fuji'
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📡 Network: ${process.env.NETWORK || 'fuji'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    
    // Initialize contracts
    initializeContracts();
});

module.exports = app;
