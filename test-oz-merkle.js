const { ethers } = require("hardhat");
const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');

async function main() {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    
    const REWARD_AMOUNT_1 = ethers.parseEther("0.1");
    
    // Single entry tree
    const rewards = [[user1.address, REWARD_AMOUNT_1]];
    const tree = StandardMerkleTree.of(rewards, ["address", "uint256"]);
    
    console.log("Tree root:", tree.root);
    console.log("Tree entries:");
    for (let [i, v] of tree.entries()) {
        console.log(`${i}: [${v[0]}, ${v[1].toString()}]`);
    }
    
    const proof = tree.getProof(0);
    console.log("Proof:", proof);
    
    // Let's see what the leaf hash is according to OpenZeppelin
    const leaf = tree.leafHash([user1.address, REWARD_AMOUNT_1]);
    console.log("OpenZeppelin leaf hash:", leaf);
    
    // Compare with our encoding
    const ourLeaf = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256"],
        [user1.address, REWARD_AMOUNT_1]
    ));
    console.log("Our leaf hash:", ourLeaf);
    
    // Test with contract
    const Rewarder = await ethers.getContractFactory("Rewarder");
    const rewarder = await Rewarder.deploy(owner.address);
    
    const taskId = ethers.keccak256(ethers.toUtf8Bytes("test-task-1"));
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    
    await owner.sendTransaction({
        to: rewarder.target,
        value: ethers.parseEther("1")
    });
    
    await rewarder.setMerkleRoot(
        taskId,
        tree.root,
        ethers.ZeroAddress,
        ethers.parseEther("1"),
        deadline
    );
    
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
