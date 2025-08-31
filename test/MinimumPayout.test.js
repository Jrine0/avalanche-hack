const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Minimum Payout Validation", function () {
    let taskEscrow, rewarder, mockUSDC;
    let owner, creator, user, platform;

    beforeEach(async function () {
        [owner, creator, user, platform] = await ethers.getSigners();

        // Deploy MockUSDC
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy();

        // Deploy Rewarder
        const Rewarder = await ethers.getContractFactory("Rewarder");
        rewarder = await Rewarder.deploy(owner.address);

        // Deploy TaskEscrow
        const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
        taskEscrow = await TaskEscrow.deploy(
            owner.address,
            rewarder.target,
            500, // 5% platform fee
            platform.address
        );
    });

    describe("AVAX minimum payout enforcement", function () {
        it("Should enforce 0.01 AVAX minimum for AVAX tasks", async function () {
            const taskId = ethers.id("test-task-avax-min");
            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const amount = ethers.parseEther("1"); // 1 AVAX
            const minPayoutTooLow = ethers.parseEther("0.005"); // 0.005 AVAX (below minimum)

            // Should revert when trying to set minimum below 0.01 AVAX
            await expect(
                taskEscrow.connect(creator).fundTask(
                    taskId,
                    ethers.ZeroAddress, // AVAX
                    amount,
                    deadline,
                    minPayoutTooLow,
                    { value: amount }
                )
            ).to.be.revertedWith("Min payout amount must be at least 0.01 AVAX");
        });

        it("Should allow 0.01 AVAX minimum for AVAX tasks", async function () {
            const taskId = ethers.id("test-task-avax-valid");
            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const amount = ethers.parseEther("1"); // 1 AVAX
            const minPayoutValid = ethers.parseEther("0.01"); // 0.01 AVAX (exactly minimum)

            // Should succeed with exact minimum
            await expect(
                taskEscrow.connect(creator).fundTask(
                    taskId,
                    ethers.ZeroAddress, // AVAX
                    amount,
                    deadline,
                    minPayoutValid,
                    { value: amount }
                )
            ).to.not.be.reverted;
        });

        it("Should allow higher minimum for AVAX tasks", async function () {
            const taskId = ethers.id("test-task-avax-higher");
            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const amount = ethers.parseEther("1"); // 1 AVAX
            const minPayoutHigher = ethers.parseEther("0.05"); // 0.05 AVAX (above minimum)

            // Should succeed with higher minimum
            await expect(
                taskEscrow.connect(creator).fundTask(
                    taskId,
                    ethers.ZeroAddress, // AVAX
                    amount,
                    deadline,
                    minPayoutHigher,
                    { value: amount }
                )
            ).to.not.be.reverted;
        });
    });

    describe("ERC20 minimum payout flexibility", function () {
        it("Should allow small minimums for USDC tasks", async function () {
            const taskId = ethers.id("test-task-usdc-small");
            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            const amount = ethers.parseUnits("100", 6); // 100 USDC
            const minPayoutSmall = ethers.parseUnits("0.1", 6); // 0.1 USDC

            // Mint and approve USDC
            await mockUSDC.mint(creator.address, amount);
            await mockUSDC.connect(creator).approve(taskEscrow.target, amount);

            // Should succeed with small minimum for USDC
            await expect(
                taskEscrow.connect(creator).fundTask(
                    taskId,
                    mockUSDC.target,
                    amount,
                    deadline,
                    minPayoutSmall
                )
            ).to.not.be.reverted;
        });
    });

    describe("Rewarder minimum payout enforcement", function () {
        it("Should enforce 0.01 AVAX minimum in Rewarder for AVAX rewards", async function () {
            const taskId = ethers.id("test-rewarder-avax-min");
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const totalRewards = ethers.parseEther("1");

            // Set up task in rewarder
            await rewarder.setMerkleRoot(
                taskId,
                ethers.ZeroHash, // dummy merkle root
                ethers.ZeroAddress, // AVAX
                totalRewards,
                deadline
            );

            // Fund rewarder with AVAX
            await owner.sendTransaction({
                to: rewarder.target,
                value: totalRewards
            });

            const smallAmount = ethers.parseEther("0.005"); // Below minimum
            const validAmount = ethers.parseEther("0.01"); // At minimum

            // Create dummy merkle proof (won't pass verification anyway)
            const dummyProof = [ethers.ZeroHash];

            // Should revert for amount below minimum
            await expect(
                rewarder.connect(user).claimReward(taskId, user.address, smallAmount, dummyProof)
            ).to.be.revertedWithCustomError(rewarder, "InvalidAmount");

            // This would still fail due to invalid proof, but not due to amount
            await expect(
                rewarder.connect(user).claimReward(taskId, user.address, validAmount, dummyProof)
            ).to.be.revertedWithCustomError(rewarder, "InvalidMerkleProof");
        });

        it("Should allow small amounts in Rewarder for USDC rewards", async function () {
            const taskId = ethers.id("test-rewarder-usdc-small");
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            const totalRewards = ethers.parseUnits("100", 6);

            // Set up task in rewarder for USDC
            await rewarder.setMerkleRoot(
                taskId,
                ethers.ZeroHash, // dummy merkle root
                mockUSDC.target, // USDC
                totalRewards,
                deadline
            );

            const smallAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC

            // Create dummy merkle proof
            const dummyProof = [ethers.ZeroHash];

            // Should not revert due to amount (will fail due to invalid proof)
            await expect(
                rewarder.connect(user).claimReward(taskId, user.address, smallAmount, dummyProof)
            ).to.be.revertedWithCustomError(rewarder, "InvalidMerkleProof");
        });
    });
});
