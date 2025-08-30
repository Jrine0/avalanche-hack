const { StandardMerkleTree } = require('@openzeppelin/merkle-tree');
const fs = require('fs');

/**
 * Generate Merkle tree for reward distribution
 * @param {Array} rewards - Array of [address, amount] pairs
 * @returns {Object} - Merkle tree data
 */
function generateMerkleTree(rewards) {
    console.log("Generating Merkle tree for rewards...");
    console.log("Rewards:", rewards);

    // Create Merkle tree
    const tree = StandardMerkleTree.of(rewards, ["address", "uint256"]);
    
    console.log("Merkle Root:", tree.root);
    console.log("Number of leaves:", tree.leafCount);

    // Generate proofs for each reward
    const proofs = {};
    for (let i = 0; i < rewards.length; i++) {
        const [address, amount] = rewards[i];
        const proof = tree.getProof(i);
        proofs[address] = {
            amount: amount.toString(),
            proof: proof
        };
    }

    return {
        root: tree.root,
        leafCount: tree.leafCount,
        proofs: proofs,
        tree: tree
    };
}

/**
 * Save Merkle tree data to file
 * @param {Object} merkleData - Merkle tree data
 * @param {string} filename - Output filename
 */
function saveMerkleData(merkleData, filename) {
    const data = {
        root: merkleData.root,
        leafCount: merkleData.leafCount,
        proofs: merkleData.proofs,
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Merkle data saved to: ${filename}`);
}

/**
 * Example usage
 */
function main() {
    // Example rewards data
    const rewards = [
        ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "100000000000000000"], // 0.1 AVAX
        ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "50000000000000000"],  // 0.05 AVAX
        ["0x90F79bf6EB2c4f870365E785982E1f101E93b906", "75000000000000000"],  // 0.075 AVAX
    ];

    // Generate Merkle tree
    const merkleData = generateMerkleTree(rewards);

    // Save to file
    saveMerkleData(merkleData, "merkle-data.json");

    // Print example proof
    console.log("\nExample proof for first address:");
    console.log("Address:", rewards[0][0]);
    console.log("Amount:", rewards[0][1]);
    console.log("Proof:", merkleData.proofs[rewards[0][0]].proof);

    console.log("\nTo use this in your contracts:");
    console.log("1. Use the merkle root in setMerkleRoot()");
    console.log("2. Use the proof in claimReward()");
    console.log("3. Verify the proof matches the root");
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    generateMerkleTree,
    saveMerkleData
};
