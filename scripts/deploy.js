const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy Rewarder contract
    console.log("Deploying Rewarder contract...");
    const Rewarder = await ethers.getContractFactory("Rewarder");
    const rewarder = await Rewarder.deploy(deployer.address);
    await rewarder.waitForDeployment();
    console.log("Rewarder deployed to:", rewarder.target);

    // Deploy TaskEscrow contract
    console.log("Deploying TaskEscrow contract...");
    const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
    const taskEscrow = await TaskEscrow.deploy(
        deployer.address, // owner
        rewarder.target, // rewarder address
        250, // platform fee: 2.5% (250 basis points)
        deployer.address // platform fee recipient (same as owner for testing)
    );
    await taskEscrow.waitForDeployment();
    console.log("TaskEscrow deployed to:", taskEscrow.target);

    // Verify deployment
    console.log("\n=== Deployment Summary ===");
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);
    console.log("Rewarder:", rewarder.target);
    console.log("TaskEscrow:", taskEscrow.target);
    console.log("Platform Fee: 2.5%");
    console.log("Platform Fee Recipient:", deployer.address);

    // Save deployment info
    const deploymentInfo = {
        network: network.name,
        deployer: deployer.address,
        contracts: {
            rewarder: rewarder.target,
            taskEscrow: taskEscrow.target
        },
        platformFee: "2.5%",
        platformFeeRecipient: deployer.address,
        timestamp: new Date().toISOString()
    };

    // Write deployment info to file
    const fs = require("fs");
    fs.writeFileSync(
        `deployment-${network.name}.json`,
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`\nDeployment info saved to: deployment-${network.name}.json`);

    // Verify contracts on explorer (if not on localhost)
    if (network.name !== "localhost" && network.name !== "hardhat") {
        console.log("\n=== Verification Instructions ===");
        console.log("To verify contracts on Snowtrace, run:");
        console.log(`npx hardhat verify --network ${network.name} ${rewarder.target} "${deployer.address}"`);
        console.log(`npx hardhat verify --network ${network.name} ${taskEscrow.target} "${deployer.address}" "${rewarder.target}" "250" "${deployer.address}"`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
