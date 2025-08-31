const { ethers } = require("hardhat");
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');

async function main() {
    const [owner, platform, creator, user1, user2, user3] = await ethers.getSigners();
    
    const REWARD_AMOUNT_1 = ethers.parseEther("0.1");
    const REWARD_AMOUNT_2 = ethers.parseEther("0.05");
    const REWARD_AMOUNT_3 = ethers.parseEther("0.075");
    
    // Create Merkle tree for test rewards
    const rewards = [
        [user1.address, REWARD_AMOUNT_1],
        [user2.address, REWARD_AMOUNT_2],
        [user3.address, REWARD_AMOUNT_3]
    ];
    
    console.log("Rewards data:");
    rewards.forEach((reward, index) => {
        console.log(`${index}: [${reward[0]}, ${reward[1].toString()}]`);
    });
    
    // Generate proper Merkle tree
    const merkleTree = StandardMerkleTree.of(rewards, ["address", "uint256"]);
    const merkleRoot = merkleTree.root;
    
    console.log("\nMerkle Root:", merkleRoot);
    
    // Get proof for user1
    const proof = merkleTree.getProof(0);
    console.log("\nProof for user1:", proof);
    console.log("Proof type:", typeof proof);
    console.log("Proof is array:", Array.isArray(proof));
    
    // Check what the tree actually produces
    for (let [i, v] of merkleTree.entries()) {
        console.log(`Entry ${i}:`, v);
        if (i === 0) {
            console.log(`Proof for entry ${i}:`, merkleTree.getProof(i));
            console.log(`Leaf for entry ${i}:`, merkleTree.leafLookup(v));
        }
    }
    
    // Verify proof manually
    const leaf = merkleTree.leafHash([user1.address, REWARD_AMOUNT_1]);
    console.log("\nLeaf for user1:", leaf);
    
    try {
        const isValid = merkleTree.verify(0, user1.address, REWARD_AMOUNT_1, proof);
        console.log("Is proof valid:", isValid);
    } catch (error) {
        console.log("Verification error:", error.message);
    }
    
    // Deploy contract and test
    const Rewarder = await ethers.getContractFactory("Rewarder");
    const rewarder = await Rewarder.deploy(owner.address);
    
    // Set up task
    const taskId = ethers.keccak256(ethers.toUtf8Bytes("test-task-1"));
    const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
    
    // Fund contract
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
    
    console.log("\nContract setup complete. Testing claim...");
    
    try {
        await rewarder.connect(user1).claimReward(
            taskId,
            user1.address,
            REWARD_AMOUNT_1,
            proof
        );
        console.log("✅ Claim successful!");
    } catch (error) {
        console.log("❌ Claim failed:", error.message);
    }
}

main().catch(console.error);
