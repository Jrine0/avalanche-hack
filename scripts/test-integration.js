const axios = require('axios');
const { ethers } = require('ethers');

const API_BASE_URL = 'http://localhost:3002/api';

async function testIntegration() {
    console.log('🧪 Testing Complete Integration Flow\n');

    try {
        // Test 1: Health Check
        console.log('1. Testing Health Check...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ Health Check:', healthResponse.data);
        console.log('');

        // Test 2: Wallet Connection
        console.log('2. Testing Wallet Connection...');
        const testWallet = ethers.Wallet.createRandom();
        const walletResponse = await axios.post(`${API_BASE_URL}/connect-wallet`, {
            userId: 'test_user_123',
            walletAddress: testWallet.address
        });
        console.log('✅ Wallet Connected:', walletResponse.data);
        console.log('');

        // Test 3: Task Submission
        console.log('3. Testing Task Submission...');
        const taskData = {
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            selectedAnswer: '4',
            correctAnswer: '4'
        };

        const taskResponse = await axios.post(`${API_BASE_URL}/submit-task`, {
            userId: 'test_user_123',
            taskId: 'test_task_1',
            taskData,
            answer: '4'
        });
        console.log('✅ Task Submitted:', taskResponse.data);
        console.log('');

        // Test 4: Payment Processing (without actual blockchain)
        console.log('4. Testing Payment Processing...');
        console.log('⚠️  Note: This will fail without deployed contracts, but tests the API flow');
        
        try {
            const paymentResponse = await axios.post(`${API_BASE_URL}/payUser`, {
                resultId: taskResponse.data.resultId,
                amount: "0.01"
            });
            console.log('✅ Payment Processed:', paymentResponse.data);
        } catch (error) {
            console.log('❌ Payment Failed (expected without contracts):', error.response?.data?.error || error.message);
        }
        console.log('');

        // Test 5: Get Task Status
        console.log('5. Testing Task Status...');
        const statusResponse = await axios.get(`${API_BASE_URL}/task-status/${taskResponse.data.resultId}`);
        console.log('✅ Task Status:', statusResponse.data);
        console.log('');

        // Test 6: Get Transactions
        console.log('6. Testing Transaction History...');
        const transactionsResponse = await axios.get(`${API_BASE_URL}/transactions/test_user_123`);
        console.log('✅ Transactions:', transactionsResponse.data);
        console.log('');

        console.log('🎉 All API Tests Completed Successfully!');
        console.log('');
        console.log('📋 Next Steps:');
        console.log('1. Deploy contracts to Fuji testnet');
        console.log('2. Update .env with contract addresses');
        console.log('3. Start frontend: cd frontend && npm run dev');
        console.log('4. Test complete flow with MetaMask');

    } catch (error) {
        console.error('❌ Integration Test Failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

// Run the test
testIntegration();
