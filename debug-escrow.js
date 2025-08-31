const { ethers } = require("hardhat");

async function main() {
    const [owner, platform, creator, user1] = await ethers.getSigners();
    
    const FUNDING_AMOUNT = ethers.parseEther("1");
    const PLATFORM_FEE_BPS = 250; // 2.5%

    // Deploy contracts
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();

    const Rewarder = await ethers.getContractFactory("Rewarder");
    const rewarder = await Rewarder.deploy(owner.address);

    const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
    const taskEscrow = await TaskEscrow.deploy(
        owner.address,
        rewarder.target,
        PLATFORM_FEE_BPS,
        platform.address
    );

    const taskId = ethers.keccak256(ethers.toUtf8Bytes("test-task-1"));
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    // Fund task
    await taskEscrow.connect(creator).fundTask(
        taskId,
        ethers.ZeroAddress,
        FUNDING_AMOUNT,
        deadline,
        ethers.parseEther("0.01"),
        { value: FUNDING_AMOUNT }
    );

    console.log("After funding:");
    console.log("Total funded:", ethers.formatEther(FUNDING_AMOUNT));
    
    const initialPlatformFee = (FUNDING_AMOUNT * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
    console.log("Initial platform fee:", ethers.formatEther(initialPlatformFee));
    
    const expectedAfterFee = FUNDING_AMOUNT - initialPlatformFee;
    console.log("Expected after fee:", ethers.formatEther(expectedAfterFee));
    
    const actualRemaining = await taskEscrow.getRemainingFunds(taskId);
    console.log("Actual remaining:", ethers.formatEther(actualRemaining));
    
    // Test payout
    const payoutGross = ethers.parseEther("0.1");
    const payoutPlatformFee = (payoutGross * BigInt(PLATFORM_FEE_BPS)) / BigInt(10000);
    const payoutNet = payoutGross - payoutPlatformFee;
    
    console.log("\nPayout calculations:");
    console.log("Payout gross:", ethers.formatEther(payoutGross));
    console.log("Payout platform fee:", ethers.formatEther(payoutPlatformFee));
    console.log("Payout net:", ethers.formatEther(payoutNet));
    
    await taskEscrow.connect(owner).processPayout(
        taskId,
        user1.address,
        payoutGross,
        ethers.ZeroAddress
    );
    
    const finalRemaining = await taskEscrow.getRemainingFunds(taskId);
    console.log("\nAfter payout:");
    console.log("Final remaining:", ethers.formatEther(finalRemaining));
    console.log("Expected:", ethers.formatEther(expectedAfterFee - payoutNet));
    
    const escrowInfo = await taskEscrow.getEscrowInfo(taskId);
    console.log("Total paid out (tracked):", ethers.formatEther(escrowInfo.totalPaidOut));
    console.log("Platform fees collected:", ethers.formatEther(escrowInfo.platformFeesCollected));
}

main().catch(console.error);
