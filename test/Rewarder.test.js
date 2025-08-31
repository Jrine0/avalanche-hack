const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Rewarder", function () {
    let rewarder;
    let mockUSDC;
    let owner, platform, creator, user1, user2, user3;
    let taskId, merkleRoot, merkleTree;
    let deadline;

    // Test data
    const REWARD_AMOUNT_1 = ethers.parseEther("0.1");
    const REWARD_AMOUNT_2 = ethers.parseEther("0.05");
    const REWARD_AMOUNT_3 = ethers.parseEther("0.075");

    beforeEach(async function () {
        [owner, platform, creator, user1, user2, user3] = await ethers.getSigners();

        // Deploy mock USDC token
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy();

        // Deploy Rewarder contract
        const Rewarder = await ethers.getContractFactory("Rewarder");
        rewarder = await Rewarder.deploy(owner.address);

        // Set up test data
        taskId = ethers.keccak256(ethers.toUtf8Bytes("test-task-1"));
        deadline = (await time.latest()) + 86400; // 24 hours from now

        // Create Merkle tree for test rewards
        const rewards = [
            [user1.address, REWARD_AMOUNT_1],
            [user2.address, REWARD_AMOUNT_2],
            [user3.address, REWARD_AMOUNT_3]
        ];

        // Generate proper Merkle tree
        const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
        merkleTree = StandardMerkleTree.of(rewards, ["address", "uint256"]);
        merkleRoot = merkleTree.root;
    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await rewarder.owner()).to.equal(owner.address);
        });

        it("Should allow receiving AVAX", async function () {
            const amount = ethers.parseEther("1");
            await owner.sendTransaction({
                to: rewarder.target,
                value: amount
            });
            expect(await ethers.provider.getBalance(rewarder.target)).to.equal(amount);
        });
    });

    describe("setMerkleRoot", function () {
        it("Should set Merkle root for AVAX rewards", async function () {
            await rewarder.setMerkleRoot(
                taskId,
                merkleRoot,
                ethers.ZeroAddress,
                ethers.parseEther("1"),
                deadline
            );

            const taskInfo = await rewarder.getTaskInfo(taskId);
            expect(taskInfo.rewardToken).to.equal(ethers.ZeroAddress);
            expect(taskInfo.totalRewards).to.equal(ethers.parseEther("1"));
            expect(taskInfo.isActive).to.be.true;
            expect(taskInfo.deadline).to.equal(deadline);
        });

        it("Should set Merkle root for USDC rewards", async function () {
            await rewarder.setMerkleRoot(
                taskId,
                merkleRoot,
                mockUSDC.target,
                ethers.parseUnits("100", 6),
                deadline
            );

            const taskInfo = await rewarder.getTaskInfo(taskId);
            expect(taskInfo.rewardToken).to.equal(mockUSDC.target);
            expect(taskInfo.totalRewards).to.equal(ethers.parseUnits("100", 6));
        });

        it("Should emit MerkleRootSet event", async function () {
            await expect(rewarder.setMerkleRoot(
                taskId,
                merkleRoot,
                ethers.ZeroAddress,
                ethers.parseEther("1"),
                deadline
            )).to.emit(rewarder, "MerkleRootSet")
                .withArgs(taskId, merkleRoot, ethers.ZeroAddress, ethers.parseEther("1"));
        });

        it("Should revert if not owner", async function () {
            await expect(
                rewarder.connect(user1).setMerkleRoot(
                    taskId,
                    merkleRoot,
                    ethers.ZeroAddress,
                    ethers.parseEther("1"),
                    deadline
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should revert if deadline is in the past", async function () {
            const pastDeadline = (await time.latest()) - 3600; // 1 hour ago
            await expect(
                rewarder.setMerkleRoot(
                    taskId,
                    merkleRoot,
                    ethers.ZeroAddress,
                    ethers.parseEther("1"),
                    pastDeadline
                )
            ).to.be.revertedWith("Deadline must be in the future");
        });

        it("Should revert if total rewards is zero", async function () {
            await expect(
                rewarder.setMerkleRoot(
                    taskId,
                    merkleRoot,
                    ethers.ZeroAddress,
                    0,
                    deadline
                )
            ).to.be.revertedWith("Total rewards must be greater than 0");
        });
    });

    describe("claimReward", function () {
        beforeEach(async function () {
            // Fund the contract with AVAX
            await owner.sendTransaction({
                to: rewarder.target,
                value: ethers.parseEther("1")
            });

            // Set Merkle root
            await rewarder.setMerkleRoot(
                taskId,
                merkleRoot,
                ethers.ZeroAddress,
                ethers.parseEther("1"),
                deadline
            );
        });

        it("Should claim AVAX reward with valid proof", async function () {
            const initialBalance = await ethers.provider.getBalance(user1.address);
            
            // Get proof for user1 (first entry in the tree)
            const proof = merkleTree.getProof(0);

            await rewarder.connect(user1).claimReward(
                taskId,
                user1.address,
                REWARD_AMOUNT_1,
                proof
            );

            const finalBalance = await ethers.provider.getBalance(user1.address);
            expect(finalBalance).to.be.gt(initialBalance);
            expect(await rewarder.hasClaimed(taskId, user1.address)).to.be.true;
        });

        it("Should claim USDC reward with valid proof", async function () {
            // Create USDC-specific amounts (using 6 decimals)
            const usdcRewards = [
                [user1.address, ethers.parseUnits("10", 6)], // 10 USDC
                [user2.address, ethers.parseUnits("5", 6)],  // 5 USDC  
                [user3.address, ethers.parseUnits("7.5", 6)] // 7.5 USDC
            ];
            
            const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
            const usdcTree = StandardMerkleTree.of(usdcRewards, ["address", "uint256"]);
            const usdcRoot = usdcTree.root;
            
            // Fund contract with USDC
            await mockUSDC.mint(rewarder.target, ethers.parseUnits("100", 6));

            // Set Merkle root for USDC  
            await rewarder.setMerkleRoot(
                taskId,
                usdcRoot,
                mockUSDC.target,
                ethers.parseUnits("100", 6),
                deadline
            );

            const initialBalance = await mockUSDC.balanceOf(user1.address);
            
            // Get proof for user1 (first entry in the USDC tree)
            const proof = usdcTree.getProof(0);

            await rewarder.connect(user1).claimReward(
                taskId,
                user1.address,
                ethers.parseUnits("10", 6), // 10 USDC
                proof
            );

            const finalBalance = await mockUSDC.balanceOf(user1.address);
            expect(finalBalance).to.be.gt(initialBalance);
            expect(await rewarder.hasClaimed(taskId, user1.address)).to.be.true;
        });

        it("Should emit RewardClaimed event", async function () {
        });

        it("Should emit RewardClaimed event", async function () {
            // Get proof for user1 (first entry in the tree)
            const proof = merkleTree.getProof(0);

            await expect(rewarder.connect(user1).claimReward(
                taskId,
                user1.address,
                REWARD_AMOUNT_1,
                proof
            )).to.emit(rewarder, "RewardClaimed")
                .withArgs(taskId, user1.address, REWARD_AMOUNT_1, ethers.ZeroAddress);
        });

        it("Should revert if already claimed", async function () {
            // Get proof for user1 (first entry in the tree)
            const proof = merkleTree.getProof(0);

            await rewarder.connect(user1).claimReward(
                taskId,
                user1.address,
                REWARD_AMOUNT_1,
                proof
            );

            await expect(
                rewarder.connect(user1).claimReward(
                    taskId,
                    user1.address,
                    REWARD_AMOUNT_1,
                    proof
                )
            ).to.be.revertedWithCustomError(rewarder, "AlreadyClaimed");
        });

        it("Should revert if task is not active", async function () {
            await rewarder.deactivateTask(taskId);

            // Get proof for user1 (first entry in the tree)
            const proof = merkleTree.getProof(0);

            await expect(
                rewarder.connect(user1).claimReward(
                    taskId,
                    user1.address,
                    REWARD_AMOUNT_1,
                    proof
                )
            ).to.be.revertedWithCustomError(rewarder, "TaskNotActive");
        });

        it("Should revert if task is expired", async function () {
            await time.increase(86401); // Move past deadline

            // Get proof for user1 (first entry in the tree)
            const proof = merkleTree.getProof(0);

            await expect(
                rewarder.connect(user1).claimReward(
                    taskId,
                    user1.address,
                    REWARD_AMOUNT_1,
                    proof
                )
            ).to.be.revertedWithCustomError(rewarder, "TaskExpired");
        });

        it("Should revert if amount is zero", async function () {
            // Create a merkle tree with zero amount for testing
            const testRewards = [[user1.address, ethers.parseEther("0")]];
            const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
            const testTree = StandardMerkleTree.of(testRewards, ["address", "uint256"]);
            const testRoot = testTree.root;
            const testProof = testTree.getProof(0);

            // Set merkle root for zero amount test
            const testTaskId = ethers.keccak256(ethers.toUtf8Bytes("test-task-zero"));
            await rewarder.setMerkleRoot(
                testTaskId,
                testRoot,
                ethers.ZeroAddress,
                ethers.parseEther("1"),
                deadline
            );

            await expect(
                rewarder.connect(user1).claimReward(
                    testTaskId,
                    user1.address,
                    0,
                    testProof
                )
            ).to.be.revertedWithCustomError(rewarder, "InvalidAmount");
        });

        it("Should revert with invalid Merkle proof", async function () {
            const invalidProof = [ethers.keccak256(ethers.toUtf8Bytes("invalid"))];

            await expect(
                rewarder.connect(user1).claimReward(
                    taskId,
                    user1.address,
                    REWARD_AMOUNT_1,
                    invalidProof
                )
            ).to.be.revertedWithCustomError(rewarder, "InvalidMerkleProof");
        });
    });

    describe("batchClaimRewards", function () {
        beforeEach(async function () {
            await owner.sendTransaction({
                to: rewarder.target,
                value: ethers.parseEther("1")
            });

            await rewarder.setMerkleRoot(
                taskId,
                merkleRoot,
                ethers.ZeroAddress,
                ethers.parseEther("1"),
                deadline
            );
        });

        it("Should process multiple valid claims", async function () {
            // Generate proper Merkle tree and proofs
            const rewards = [
                [user1.address, REWARD_AMOUNT_1],
                [user2.address, REWARD_AMOUNT_2],
                [user3.address, REWARD_AMOUNT_3]
            ];
            const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
            const tree = StandardMerkleTree.of(rewards, ["address", "uint256"]);
            
            const claims = [
                {
                    user: user1.address,
                    amount: REWARD_AMOUNT_1,
                    merkleProof: tree.getProof(0)
                },
                {
                    user: user2.address,
                    amount: REWARD_AMOUNT_2,
                    merkleProof: tree.getProof(1)
                }
            ];

            await rewarder.batchClaimRewards(taskId, claims);

            expect(await rewarder.hasClaimed(taskId, user1.address)).to.be.true;
            expect(await rewarder.hasClaimed(taskId, user2.address)).to.be.true;
        });

        it("Should skip already claimed rewards", async function () {
            // Get proof for user1 (first entry in the tree)
            const proof = merkleTree.getProof(0);

            // First claim
            await rewarder.connect(user1).claimReward(
                taskId,
                user1.address,
                REWARD_AMOUNT_1,
                proof
            );

            // Batch claim including already claimed
            const claims = [
                {
                    user: user1.address,
                    amount: REWARD_AMOUNT_1,
                    merkleProof: merkleTree.getProof(0)
                },
                {
                    user: user2.address,
                    amount: REWARD_AMOUNT_2,
                    merkleProof: merkleTree.getProof(1)
                }
            ];

            await rewarder.batchClaimRewards(taskId, claims);

            expect(await rewarder.hasClaimed(taskId, user1.address)).to.be.true;
            expect(await rewarder.hasClaimed(taskId, user2.address)).to.be.true;
        });
    });

    describe("deactivateTask", function () {
        beforeEach(async function () {
            await rewarder.setMerkleRoot(
                taskId,
                merkleRoot,
                ethers.ZeroAddress,
                ethers.parseEther("1"),
                deadline
            );
        });

        it("Should deactivate task", async function () {
            await rewarder.deactivateTask(taskId);
            
            const taskInfo = await rewarder.getTaskInfo(taskId);
            expect(taskInfo.isActive).to.be.false;
        });

        it("Should emit TaskDeactivated event", async function () {
            await expect(rewarder.deactivateTask(taskId))
                .to.emit(rewarder, "TaskDeactivated")
                .withArgs(taskId);
        });

        it("Should revert if not owner", async function () {
            await expect(
                rewarder.connect(user1).deactivateTask(taskId)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("View functions", function () {
        beforeEach(async function () {
            // Fund the contract with AVAX
            await owner.sendTransaction({
                to: rewarder.target,
                value: ethers.parseEther("1")
            });

            await rewarder.setMerkleRoot(
                taskId,
                merkleRoot,
                ethers.ZeroAddress,
                ethers.parseEther("1"),
                deadline
            );
        });

        it("Should return correct task info", async function () {
            const taskInfo = await rewarder.getTaskInfo(taskId);
            expect(taskInfo.rewardToken).to.equal(ethers.ZeroAddress);
            expect(taskInfo.totalRewards).to.equal(ethers.parseEther("1"));
            expect(taskInfo.claimedRewards).to.equal(0);
            expect(taskInfo.isActive).to.be.true;
            expect(taskInfo.deadline).to.equal(deadline);
        });

        it("Should return false for unclaimed address", async function () {
            expect(await rewarder.hasClaimed(taskId, user1.address)).to.be.false;
        });

        it("Should return true for claimed address", async function () {
            // Get proof for user1 (first entry in the tree)
            const proof = merkleTree.getProof(0);

            await rewarder.connect(user1).claimReward(
                taskId,
                user1.address,
                REWARD_AMOUNT_1,
                proof
            );

            expect(await rewarder.hasClaimed(taskId, user1.address)).to.be.true;
        });
    });

    describe("Emergency functions", function () {
        it("Should allow owner to withdraw stuck tokens", async function () {
            const amount = ethers.parseEther("1");
            await owner.sendTransaction({
                to: rewarder.target,
                value: amount
            });

            const initialBalance = await ethers.provider.getBalance(owner.address);
            await rewarder.emergencyWithdraw(ethers.ZeroAddress, amount);
            const finalBalance = await ethers.provider.getBalance(owner.address);

            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("Should revert emergency withdraw if not owner", async function () {
            await expect(
                rewarder.connect(user1).emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("1"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});
