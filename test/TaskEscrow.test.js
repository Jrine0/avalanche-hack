const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TaskEscrow", function () {
    let taskEscrow, rewarder, mockUSDC;
    let owner, platform, creator, user1, user2;
    let taskId;
    let deadline;

    // Test data
    const FUNDING_AMOUNT = ethers.parseEther("1");
    const MIN_PAYOUT_AMOUNT = ethers.parseEther("0.01");
    const PLATFORM_FEE_BPS = 250; // 2.5%

    beforeEach(async function () {
        [owner, platform, creator, user1, user2] = await ethers.getSigners();

        // Deploy mock USDC token
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        mockUSDC = await MockUSDC.deploy();

        // Deploy Rewarder contract
        const Rewarder = await ethers.getContractFactory("Rewarder");
        rewarder = await Rewarder.deploy(owner.address);

        // Deploy TaskEscrow contract
        const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
        taskEscrow = await TaskEscrow.deploy(
            owner.address,
            rewarder.target,
            PLATFORM_FEE_BPS,
            platform.address
        );

        // Set up test data
        taskId = ethers.keccak256(ethers.toUtf8Bytes("test-task-1"));
        deadline = (await time.latest()) + 86400; // 24 hours from now
    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await taskEscrow.owner()).to.equal(owner.address);
        });

        it("Should set the correct rewarder address", async function () {
            expect(await taskEscrow.rewarder()).to.equal(rewarder.target);
        });

        it("Should set the correct platform fee", async function () {
            expect(await taskEscrow.platformFeeBps()).to.equal(PLATFORM_FEE_BPS);
        });

        it("Should set the correct platform fee recipient", async function () {
            expect(await taskEscrow.platformFeeRecipient()).to.equal(platform.address);
        });

        it("Should allow receiving AVAX", async function () {
            const amount = ethers.parseEther("1");
            await owner.sendTransaction({
                to: taskEscrow.target,
                value: amount
            });
            expect(await ethers.provider.getBalance(taskEscrow.target)).to.equal(amount);
        });
    });

    describe("fundTask", function () {
        it("Should fund task with AVAX", async function () {
            const initialBalance = await ethers.provider.getBalance(creator.address);
            const platformInitialBalance = await ethers.provider.getBalance(platform.address);

            await taskEscrow.connect(creator).fundTask(
                taskId,
                ethers.ZeroAddress,
                FUNDING_AMOUNT,
                deadline,
                MIN_PAYOUT_AMOUNT,
                { value: FUNDING_AMOUNT }
            );

            const escrowInfo = await taskEscrow.getEscrowInfo(taskId);
            expect(escrowInfo.creator).to.equal(creator.address);
            expect(escrowInfo.fundingToken).to.equal(ethers.ZeroAddress);
            expect(escrowInfo.totalFunded).to.equal(FUNDING_AMOUNT);
            expect(escrowInfo.isActive).to.be.true;
            expect(escrowInfo.deadline).to.equal(deadline);
            expect(escrowInfo.minPayoutAmount).to.equal(MIN_PAYOUT_AMOUNT);

            // Check platform fee was deducted
            const platformFee = (FUNDING_AMOUNT * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
            const finalBalance = await ethers.provider.getBalance(creator.address);
            const platformFinalBalance = await ethers.provider.getBalance(platform.address);
            
            expect(initialBalance - finalBalance).to.be.gt(FUNDING_AMOUNT);
            expect(platformFinalBalance - platformInitialBalance).to.equal(platformFee);
        });

        it("Should fund task with USDC", async function () {
            // Mint USDC to creator
            await mockUSDC.mint(creator.address, ethers.parseUnits("1000", 6));
            await mockUSDC.connect(creator).approve(taskEscrow.target, ethers.parseUnits("1000", 6));

            const initialBalance = await mockUSDC.balanceOf(creator.address);
            const platformInitialBalance = await mockUSDC.balanceOf(platform.address);

            await taskEscrow.connect(creator).fundTask(
                taskId,
                mockUSDC.target,
                ethers.parseUnits("100", 6),
                deadline,
                ethers.parseUnits("1", 6)
            );

            const escrowInfo = await taskEscrow.getEscrowInfo(taskId);
            expect(escrowInfo.creator).to.equal(creator.address);
            expect(escrowInfo.fundingToken).to.equal(mockUSDC.target);
            expect(escrowInfo.totalFunded).to.equal(ethers.parseUnits("100", 6));

            // Check platform fee was deducted
            const fundingAmount = ethers.parseUnits("100", 6);
            const platformFee = (fundingAmount * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
            const finalBalance = await mockUSDC.balanceOf(creator.address);
            const platformFinalBalance = await mockUSDC.balanceOf(platform.address);
            
            expect(initialBalance - finalBalance).to.equal(fundingAmount);
            expect(platformFinalBalance - platformInitialBalance).to.equal(platformFee);
        });

        it("Should emit TaskFunded event", async function () {
            const platformFee = (FUNDING_AMOUNT * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);

            await expect(taskEscrow.connect(creator).fundTask(
                taskId,
                ethers.ZeroAddress,
                FUNDING_AMOUNT,
                deadline,
                MIN_PAYOUT_AMOUNT,
                { value: FUNDING_AMOUNT }
            )).to.emit(taskEscrow, "TaskFunded")
                .withArgs(taskId, creator.address, ethers.ZeroAddress, FUNDING_AMOUNT, platformFee);
        });

        it("Should revert if deadline is in the past", async function () {
            const pastDeadline = (await time.latest()) - 3600; // 1 hour ago

            await expect(
                taskEscrow.connect(creator).fundTask(
                    taskId,
                    ethers.ZeroAddress,
                    FUNDING_AMOUNT,
                    pastDeadline,
                    MIN_PAYOUT_AMOUNT,
                    { value: FUNDING_AMOUNT }
                )
            ).to.be.revertedWith("Deadline must be in the future");
        });

        it("Should revert if amount is zero", async function () {
            await expect(
                taskEscrow.connect(creator).fundTask(
                    taskId,
                    ethers.ZeroAddress,
                    0,
                    deadline,
                    MIN_PAYOUT_AMOUNT,
                    { value: 0 }
                )
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        it("Should revert if min payout amount is zero", async function () {
            await expect(
                taskEscrow.connect(creator).fundTask(
                    taskId,
                    ethers.ZeroAddress,
                    FUNDING_AMOUNT,
                    deadline,
                    0,
                    { value: FUNDING_AMOUNT }
                )
            ).to.be.revertedWith("Min payout amount must be greater than 0");
        });

        it("Should revert if AVAX amount doesn't match", async function () {
            await expect(
                taskEscrow.connect(creator).fundTask(
                    taskId,
                    ethers.ZeroAddress,
                    FUNDING_AMOUNT,
                    deadline,
                    MIN_PAYOUT_AMOUNT,
                    { value: FUNDING_AMOUNT - ethers.parseEther("0.1") }
                )
            ).to.be.revertedWith("Incorrect AVAX amount");
        });

        it("Should revert if AVAX is sent with ERC20 funding", async function () {
            await mockUSDC.mint(creator.address, ethers.parseUnits("1000", 6));
            await mockUSDC.connect(creator).approve(taskEscrow.target, ethers.parseUnits("1000", 6));

            await expect(
                taskEscrow.connect(creator).fundTask(
                    taskId,
                    mockUSDC.target,
                    ethers.parseUnits("100", 6),
                    deadline,
                    ethers.parseUnits("1", 6),
                    { value: ethers.parseEther("0.1") }
                )
            ).to.be.revertedWith("No AVAX should be sent with ERC20 funding");
        });
    });

    describe("processPayout", function () {
        beforeEach(async function () {
            // Fund the escrow
            await taskEscrow.connect(creator).fundTask(
                taskId,
                ethers.ZeroAddress,
                FUNDING_AMOUNT,
                deadline,
                MIN_PAYOUT_AMOUNT,
                { value: FUNDING_AMOUNT }
            );
        });

        it("Should process AVAX payout", async function () {
            const payoutAmount = ethers.parseEther("0.1");
            const initialBalance = await ethers.provider.getBalance(user1.address);
            const platformInitialBalance = await ethers.provider.getBalance(platform.address);

            await taskEscrow.connect(owner).processPayout(
                taskId,
                user1.address,
                payoutAmount,
                ethers.ZeroAddress
            );

            const finalBalance = await ethers.provider.getBalance(user1.address);
            const platformFinalBalance = await ethers.provider.getBalance(platform.address);
            
            expect(finalBalance).to.be.gt(initialBalance);
            
            // Check platform fee
            const platformFee = (payoutAmount * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
            expect(platformFinalBalance - platformInitialBalance).to.equal(platformFee);

            // Check escrow state (we now track net payouts)
            const escrowInfo = await taskEscrow.getEscrowInfo(taskId);
            const netPayout = payoutAmount - platformFee;
            expect(escrowInfo.totalPaidOut).to.equal(netPayout);
        });

        it("Should process USDC payout", async function () {
            // Fund escrow with USDC
            await mockUSDC.mint(creator.address, ethers.parseUnits("1000", 6));
            await mockUSDC.connect(creator).approve(taskEscrow.target, ethers.parseUnits("1000", 6));
            
            await taskEscrow.connect(creator).fundTask(
                taskId,
                mockUSDC.target,
                ethers.parseUnits("100", 6),
                deadline,
                ethers.parseUnits("1", 6)
            );

            const payoutAmount = ethers.parseUnits("10", 6);
            const initialBalance = await mockUSDC.balanceOf(user1.address);
            const platformInitialBalance = await mockUSDC.balanceOf(platform.address);

            await taskEscrow.connect(owner).processPayout(
                taskId,
                user1.address,
                payoutAmount,
                mockUSDC.target
            );

            const finalBalance = await mockUSDC.balanceOf(user1.address);
            const platformFinalBalance = await mockUSDC.balanceOf(platform.address);
            
            expect(finalBalance).to.be.gt(initialBalance);
            
            // Check platform fee
            const platformFee = (payoutAmount * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
            expect(platformFinalBalance - platformInitialBalance).to.equal(platformFee);
        });

        it("Should emit PayoutProcessed event", async function () {
            const payoutAmount = ethers.parseEther("0.1");
            const platformFee = (payoutAmount * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);

            await expect(taskEscrow.connect(owner).processPayout(
                taskId,
                user1.address,
                payoutAmount,
                ethers.ZeroAddress
            )).to.emit(taskEscrow, "PayoutProcessed")
                .withArgs(taskId, user1.address, payoutAmount, ethers.ZeroAddress, platformFee);
        });

        it("Should revert if not called by rewarder", async function () {
            await expect(
                taskEscrow.connect(user1).processPayout(
                    taskId,
                    user1.address,
                    ethers.parseEther("0.1"),
                    ethers.ZeroAddress
                )
            ).to.be.revertedWith("Only rewarder or owner can call this");
        });

        it("Should revert if escrow not found", async function () {
            const invalidTaskId = ethers.keccak256(ethers.toUtf8Bytes("invalid-task"));

            await expect(
                taskEscrow.connect(owner).processPayout(
                    invalidTaskId,
                    user1.address,
                    ethers.parseEther("0.1"),
                    ethers.ZeroAddress
                )
            ).to.be.revertedWithCustomError(taskEscrow, "EscrowNotFound");
        });

        it("Should revert if escrow not active", async function () {
            // Move past deadline first, then refund to make escrow inactive
            await time.increase(86401);
            await taskEscrow.connect(creator).refundRemainingFunds(taskId);

            await expect(
                taskEscrow.connect(owner).processPayout(
                    taskId,
                    user1.address,
                    ethers.parseEther("0.1"),
                    ethers.ZeroAddress
                )
            ).to.be.revertedWithCustomError(taskEscrow, "EscrowNotActive");
        });

        it("Should revert if escrow expired", async function () {
            await time.increase(86401); // Move past deadline

            await expect(
                taskEscrow.connect(owner).processPayout(
                    taskId,
                    user1.address,
                    ethers.parseEther("0.1"),
                    ethers.ZeroAddress
                )
            ).to.be.revertedWithCustomError(taskEscrow, "EscrowExpired");
        });

        it("Should revert if amount is less than min payout", async function () {
            await expect(
                taskEscrow.connect(owner).processPayout(
                    taskId,
                    user1.address,
                    ethers.parseEther("0.005"), // Less than MIN_PAYOUT_AMOUNT
                    ethers.ZeroAddress
                )
            ).to.be.revertedWithCustomError(taskEscrow, "InvalidAmount");
        });

        it("Should revert if insufficient funds", async function () {
            await expect(
                taskEscrow.connect(owner).processPayout(
                    taskId,
                    user1.address,
                    ethers.parseEther("2"), // More than funded amount
                    ethers.ZeroAddress
                )
            ).to.be.revertedWithCustomError(taskEscrow, "InsufficientFunds");
        });
    });

    describe("refundRemainingFunds", function () {
        beforeEach(async function () {
            await taskEscrow.connect(creator).fundTask(
                taskId,
                ethers.ZeroAddress,
                FUNDING_AMOUNT,
                deadline,
                MIN_PAYOUT_AMOUNT,
                { value: FUNDING_AMOUNT }
            );
        });

        it("Should refund remaining AVAX funds", async function () {
            await time.increase(86401); // Move past deadline

            const initialBalance = await ethers.provider.getBalance(creator.address);
            const escrowBalance = await ethers.provider.getBalance(taskEscrow.target);

            await taskEscrow.connect(creator).refundRemainingFunds(taskId);

            const finalBalance = await ethers.provider.getBalance(creator.address);
            expect(finalBalance).to.be.gt(initialBalance);

            const escrowInfo = await taskEscrow.getEscrowInfo(taskId);
            expect(escrowInfo.isActive).to.be.false;
        });

        it("Should refund remaining USDC funds", async function () {
            // Fund escrow with USDC
            await mockUSDC.mint(creator.address, ethers.parseUnits("1000", 6));
            await mockUSDC.connect(creator).approve(taskEscrow.target, ethers.parseUnits("1000", 6));
            
            await taskEscrow.connect(creator).fundTask(
                taskId,
                mockUSDC.target,
                ethers.parseUnits("100", 6),
                deadline,
                ethers.parseUnits("1", 6)
            );

            await time.increase(86401); // Move past deadline

            const initialBalance = await mockUSDC.balanceOf(creator.address);
            await taskEscrow.connect(creator).refundRemainingFunds(taskId);
            const finalBalance = await mockUSDC.balanceOf(creator.address);

            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("Should emit RefundProcessed event", async function () {
            await time.increase(86401); // Move past deadline

            // Calculate expected refund amount (after platform fee)
            const expectedRefund = FUNDING_AMOUNT - (FUNDING_AMOUNT * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);

            await expect(taskEscrow.connect(creator).refundRemainingFunds(taskId))
                .to.emit(taskEscrow, "RefundProcessed")
                .withArgs(taskId, creator.address, expectedRefund, ethers.ZeroAddress);
        });

        it("Should revert if not creator", async function () {
            await time.increase(86401); // Move past deadline

            await expect(
                taskEscrow.connect(user1).refundRemainingFunds(taskId)
            ).to.be.revertedWithCustomError(taskEscrow, "UnauthorizedCreator");
        });

        it("Should revert if escrow not found", async function () {
            const invalidTaskId = ethers.keccak256(ethers.toUtf8Bytes("invalid-task"));

            await expect(
                taskEscrow.connect(creator).refundRemainingFunds(invalidTaskId)
            ).to.be.revertedWithCustomError(taskEscrow, "EscrowNotFound");
        });

        it("Should revert if deadline not passed", async function () {
            await expect(
                taskEscrow.connect(creator).refundRemainingFunds(taskId)
            ).to.be.revertedWithCustomError(taskEscrow, "EscrowNotActive");
        });

        it("Should revert if no funds to refund", async function () {
            // Process a payout to use all available funds
            // Available funds = total - initial platform fee
            const availableFunds = FUNDING_AMOUNT - (FUNDING_AMOUNT * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
            
            // We'll pay out slightly less than the max to ensure we can cover the platform fee
            const payoutGross = availableFunds; // This should work since we track net payouts now
            
            await taskEscrow.connect(owner).processPayout(
                taskId,
                user1.address,
                payoutGross,
                ethers.ZeroAddress
            );

            await time.increase(86401); // Move past deadline

            await expect(
                taskEscrow.connect(creator).refundRemainingFunds(taskId)
            ).to.be.revertedWith("No funds to refund");
        });
    });

    describe("Platform fee management", function () {
        it("Should update platform fee", async function () {
            const newFee = 500; // 5%
            const oldFee = await taskEscrow.platformFeeBps();

            await expect(taskEscrow.updatePlatformFee(newFee))
                .to.emit(taskEscrow, "PlatformFeeUpdated")
                .withArgs(oldFee, newFee);

            expect(await taskEscrow.platformFeeBps()).to.equal(newFee);
        });

        it("Should update platform fee recipient", async function () {
            const newRecipient = user1.address;
            const oldRecipient = await taskEscrow.platformFeeRecipient();

            await expect(taskEscrow.updatePlatformFeeRecipient(newRecipient))
                .to.emit(taskEscrow, "PlatformFeeRecipientUpdated")
                .withArgs(oldRecipient, newRecipient);

            expect(await taskEscrow.platformFeeRecipient()).to.equal(newRecipient);
        });

        it("Should revert if fee exceeds 10%", async function () {
            await expect(
                taskEscrow.updatePlatformFee(1100) // 11%
            ).to.be.revertedWith("Fee cannot exceed 10%");
        });

        it("Should revert if new recipient is zero address", async function () {
            await expect(
                taskEscrow.updatePlatformFeeRecipient(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid recipient address");
        });

        it("Should revert if not owner", async function () {
            await expect(
                taskEscrow.connect(user1).updatePlatformFee(500)
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await expect(
                taskEscrow.connect(user1).updatePlatformFeeRecipient(user1.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("View functions", function () {
        beforeEach(async function () {
            await taskEscrow.connect(creator).fundTask(
                taskId,
                ethers.ZeroAddress,
                FUNDING_AMOUNT,
                deadline,
                MIN_PAYOUT_AMOUNT,
                { value: FUNDING_AMOUNT }
            );
        });

        it("Should return correct escrow info", async function () {
            const escrowInfo = await taskEscrow.getEscrowInfo(taskId);
            expect(escrowInfo.creator).to.equal(creator.address);
            expect(escrowInfo.fundingToken).to.equal(ethers.ZeroAddress);
            expect(escrowInfo.totalFunded).to.equal(FUNDING_AMOUNT);
            expect(escrowInfo.totalPaidOut).to.equal(0);
            expect(escrowInfo.isActive).to.be.true;
            expect(escrowInfo.deadline).to.equal(deadline);
            expect(escrowInfo.minPayoutAmount).to.equal(MIN_PAYOUT_AMOUNT);
        });

        it("Should return correct remaining funds", async function () {
            // Should return amount after platform fee deduction
            const expectedAfterFee = FUNDING_AMOUNT - (FUNDING_AMOUNT * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
            expect(await taskEscrow.getRemainingFunds(taskId)).to.equal(expectedAfterFee);

            // After a payout (we now track net payouts)
            const payoutGross = ethers.parseEther("0.1");
            const payoutPlatformFee = (payoutGross * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
            const payoutNet = payoutGross - payoutPlatformFee;

            await taskEscrow.connect(owner).processPayout(
                taskId,
                user1.address,
                payoutGross,
                ethers.ZeroAddress
            );

            expect(await taskEscrow.getRemainingFunds(taskId)).to.equal(
                FUNDING_AMOUNT - (FUNDING_AMOUNT * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000) - payoutNet - payoutPlatformFee
            );
        });

        it("Should return true for fundable task", async function () {
            expect(await taskEscrow.canFundTask(taskId)).to.be.false; // Already funded

            const newTaskId = ethers.keccak256(ethers.toUtf8Bytes("new-task"));
            expect(await taskEscrow.canFundTask(newTaskId)).to.be.true;
        });

        it("Should return false for non-fundable task", async function () {
            expect(await taskEscrow.canFundTask(taskId)).to.be.false;
        });
    });

    describe("Emergency functions", function () {
        it("Should allow owner to withdraw stuck tokens", async function () {
            const amount = ethers.parseEther("1");
            await owner.sendTransaction({
                to: taskEscrow.target,
                value: amount
            });

            const initialBalance = await ethers.provider.getBalance(owner.address);
            await taskEscrow.emergencyWithdraw(ethers.ZeroAddress, amount);
            const finalBalance = await ethers.provider.getBalance(owner.address);

            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("Should revert emergency withdraw if not owner", async function () {
            await expect(
                taskEscrow.connect(user1).emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("1"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});
