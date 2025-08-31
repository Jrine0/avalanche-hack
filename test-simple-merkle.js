const { ethers } = require("hardhat");

async function main() {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Create a simple merkle tree manually for testing
    const REWARD_AMOUNT_1 = ethers.parseEther("0.1");
    
    // For a single leaf tree, the root should be the leaf itself
    const leaf = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [user1.address, REWARD_AMOUNT_1]
    ));
    
    console.log("Single leaf:", leaf);
    console.log("User1 address:", user1.address);
    console.log("Reward amount:", REWARD_AMOUNT_1.toString());
    
    // Deploy contract
    const Rewarder = await ethers.getContractFactory("Rewarder");
    const rewarder = await Rewarder.deploy(owner.address);
    
    // Set up task with single leaf as root (empty proof)
    const taskId = ethers.keccak256(ethers.toUtf8Bytes("test-task-1"));
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    
    // Fund contract
    await owner.sendTransaction({
        to: rewarder.target,
        value: ethers.parseEther("1")
    });
    
    // Set Merkle root to the leaf itself
    await rewarder.setMerkleRoot(
        taskId,
        leaf,
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        deadline
    );
    
    console.log("Contract setup complete. Testing claim with empty proof...");
    
    try {
        await rewarder.connect(user1).claimReward(
            taskId,
            user1.address,
            REWARD_AMOUNT_1,
            [] // Empty proof for single leaf
        );
        console.log("✅ Single leaf claim successful!");
    } catch (error) {
        console.log("❌ Single leaf claim failed:", error.message);
    }
}

main().catch(console.error);
