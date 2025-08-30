import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';
import { Wallet, CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3002/api';

function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState('');
  const [currentTask, setCurrentTask] = useState(null);
  const [taskAnswer, setTaskAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sample micro-task for demo
  const sampleTasks = [
    {
      id: 'task-1',
      question: 'What is the capital of France?',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 'Paris'
    },
    {
      id: 'task-2', 
      question: 'Which planet is closest to the Sun?',
      options: ['Venus', 'Mercury', 'Earth', 'Mars'],
      correctAnswer: 'Mercury'
    },
    {
      id: 'task-3',
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: '4'
    }
  ];

  // Connect wallet function
  const connectWallet = async () => {
    try {
      setLoading(true);
      
      // Check if MetaMask is installed
      if (!window.ethereum) {
        alert('Please install MetaMask to use this app!');
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const address = accounts[0];
      setWalletAddress(address);
      setIsConnected(true);

      // Generate user ID
      const newUserId = `user_${Date.now()}`;
      setUserId(newUserId);

      // Connect wallet to backend
      await axios.post(`${API_BASE_URL}/connect-wallet`, {
        userId: newUserId,
        walletAddress: address
      });

      console.log('✅ Wallet connected:', address);
      
    } catch (error) {
      console.error('Wallet connection error:', error);
      alert('Failed to connect wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Switch to Avalanche network
  const switchToAvalanche = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0xa869', // Fuji testnet
          chainName: 'Avalanche Fuji Testnet',
          nativeCurrency: {
            name: 'AVAX',
            symbol: 'AVAX',
            decimals: 18
          },
          rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
          blockExplorerUrls: ['https://testnet.snowtrace.io/']
        }]
      });
    } catch (error) {
      console.error('Network switch error:', error);
    }
  };

  // Get random task
  const getRandomTask = () => {
    const randomIndex = Math.floor(Math.random() * sampleTasks.length);
    setCurrentTask(sampleTasks[randomIndex]);
    setTaskAnswer('');
  };

  // Submit task
  const submitTask = async () => {
    if (!taskAnswer || !currentTask) {
      alert('Please select an answer!');
      return;
    }

    try {
      setIsSubmitting(true);

      const taskData = {
        question: currentTask.question,
        options: currentTask.options,
        selectedAnswer: taskAnswer,
        correctAnswer: currentTask.correctAnswer
      };

      // Submit task to backend
      const response = await axios.post(`${API_BASE_URL}/submit-task`, {
        userId,
        taskId: currentTask.id,
        taskData,
        answer: taskAnswer
      });

      const { resultId } = response.data;
      console.log('✅ Task submitted:', resultId);

      // Process payment
      await processPayment(resultId);

    } catch (error) {
      console.error('Task submission error:', error);
      alert('Failed to submit task: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Process payment
  const processPayment = async (resultId) => {
    try {
      console.log('💰 Processing payment for result:', resultId);
      
      const response = await axios.post(`${API_BASE_URL}/payUser`, {
        resultId,
        amount: ethers.parseEther("0.01") // 0.01 AVAX
      });

      const { txHash, snowtraceUrl, amount } = response.data;
      
      console.log('✅ Payment successful!');
      console.log('Transaction:', txHash);
      console.log('Snowtrace:', snowtraceUrl);
      console.log('Amount:', amount, 'AVAX');

      // Add to transactions list
      setTransactions(prev => [{
        txHash,
        snowtraceUrl,
        amount,
        timestamp: Date.now(),
        task: currentTask.question
      }, ...prev]);

      alert(`Payment successful! You earned ${amount} AVAX.\nTransaction: ${txHash}`);

      // Get new task
      getRandomTask();

    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed: ' + error.message);
    }
  };

  // Load user transactions
  const loadTransactions = async () => {
    if (!userId) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/${userId}`);
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Load transactions error:', error);
    }
  };

  // Load transactions on mount
  useEffect(() => {
    if (userId) {
      loadTransactions();
    }
  }, [userId]);

  // Get initial task
  useEffect(() => {
    getRandomTask();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">🚀 Avalanche Micro-Task Platform</h1>
          <p className="text-xl text-gray-300">Complete tasks and earn AVAX rewards</p>
        </div>

        {/* Wallet Connection */}
        {!isConnected ? (
          <div className="max-w-md mx-auto bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center justify-center">
              <Wallet className="mr-2" />
              Connect Your Wallet
            </h2>
            <p className="text-gray-300 mb-6">
              Connect your MetaMask wallet to start earning AVAX for completing micro-tasks.
            </p>
            <button
              onClick={connectWallet}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <Wallet className="mr-2" />
              )}
              {loading ? 'Connecting...' : 'Connect MetaMask'}
            </button>
            <button
              onClick={switchToAvalanche}
              className="w-full mt-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
            >
              Add Avalanche Network
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Wallet Info */}
            <div className="max-w-md mx-auto bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Connected Wallet</h3>
              <p className="text-sm text-gray-300 break-all">{walletAddress}</p>
              <p className="text-xs text-gray-400 mt-1">User ID: {userId}</p>
            </div>

            {/* Current Task */}
            {currentTask && (
              <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Current Task</h3>
                <p className="text-lg mb-6">{currentTask.question}</p>
                
                <div className="space-y-3">
                  {currentTask.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setTaskAnswer(option)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                        taskAnswer === option
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 hover:border-gray-500 bg-white/5'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <button
                  onClick={submitTask}
                  disabled={!taskAnswer || isSubmitting}
                  className="w-full mt-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="mr-2" />
                  )}
                  {isSubmitting ? 'Processing...' : 'Submit Answer & Get Paid'}
                </button>

                <button
                  onClick={getRandomTask}
                  className="w-full mt-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
                >
                  Get New Task
                </button>
              </div>
            )}

            {/* Transaction History */}
            {transactions.length > 0 && (
              <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Transaction History</h3>
                <div className="space-y-3">
                  {transactions.map((tx, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{tx.task || 'Micro-task completion'}</p>
                        <p className="text-sm text-gray-400">
                          {new Date(tx.timestamp).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 break-all">{tx.txHash}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-400">+{tx.amount} AVAX</p>
                        <a
                          href={tx.snowtraceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View on Snowtrace
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
