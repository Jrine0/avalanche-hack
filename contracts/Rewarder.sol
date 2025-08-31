// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Rewarder
 * @dev Implements Merkle distributor pattern for gas-efficient reward claims
 * Allows users to claim micro-payments by submitting valid Merkle proofs
 * Prevents double-claims and supports AVAX/USDC payouts
 */
contract Rewarder is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Global minimum payout amount (0.01 AVAX to avoid network fee issues)
    uint256 public constant GLOBAL_MIN_PAYOUT = 0.01 ether;

    // Struct to represent a reward claim
    struct RewardClaim {
        address user;
        uint256 amount;
        bytes32[] merkleProof;
    }

    // Mapping to track claimed addresses per task
    // taskId => user => claimed
    mapping(bytes32 => mapping(address => bool)) public claimed;

    // Mapping to store Merkle roots for each task
    // taskId => merkleRoot
    mapping(bytes32 => bytes32) public merkleRoots;

    // Mapping to store task details
    // taskId => TaskInfo
    mapping(bytes32 => TaskInfo) public tasks;

    // Struct to store task information
    struct TaskInfo {
        address rewardToken; // USDC address or address(0) for AVAX
        uint256 totalRewards;
        uint256 claimedRewards;
        bool isActive;
        uint256 deadline;
    }

    // Events
    event MerkleRootSet(bytes32 indexed taskId, bytes32 merkleRoot, address rewardToken, uint256 totalRewards);
    event RewardClaimed(bytes32 indexed taskId, address indexed user, uint256 amount, address rewardToken);
    event TaskDeactivated(bytes32 indexed taskId);

    // Custom errors
    error InvalidMerkleProof();
    error AlreadyClaimed();
    error TaskNotActive();
    error TaskExpired();
    error InvalidAmount();
    error TransferFailed();

    /**
     * @dev Constructor
     * @param _owner The initial owner of the contract
     */
    constructor(address _owner) Ownable() {
        _transferOwnership(_owner);
    }

    /**
     * @dev Set Merkle root for a task (only owner)
     * @param taskId Unique identifier for the task
     * @param merkleRoot Merkle root for the reward distribution
     * @param rewardToken Address of the reward token (address(0) for AVAX)
     * @param totalRewards Total amount of rewards for this task
     * @param deadline Deadline for claiming rewards
     */
    function setMerkleRoot(
        bytes32 taskId,
        bytes32 merkleRoot,
        address rewardToken,
        uint256 totalRewards,
        uint256 deadline
    ) external onlyOwner {
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(totalRewards > 0, "Total rewards must be greater than 0");

        merkleRoots[taskId] = merkleRoot;
        tasks[taskId] = TaskInfo({
            rewardToken: rewardToken,
            totalRewards: totalRewards,
            claimedRewards: 0,
            isActive: true,
            deadline: deadline
        });

        emit MerkleRootSet(taskId, merkleRoot, rewardToken, totalRewards);
    }

    /**
     * @dev Claim reward using Merkle proof
     * @param taskId Unique identifier for the task
     * @param user Address of the user claiming the reward
     * @param amount Amount to claim
     * @param merkleProof Merkle proof for the claim
     */
    function claimReward(
        bytes32 taskId,
        address user,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        TaskInfo storage task = tasks[taskId];
        
        if (!task.isActive) revert TaskNotActive();
        if (block.timestamp > task.deadline) revert TaskExpired();
        if (claimed[taskId][user]) revert AlreadyClaimed();
        if (amount == 0) revert InvalidAmount();
        
        // Enforce global minimum for AVAX rewards only
        if (task.rewardToken == address(0) && amount < GLOBAL_MIN_PAYOUT) revert InvalidAmount();

        // Verify Merkle proof
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(user, amount))));
        if (!_verifyMerkleProof(merkleProof, merkleRoots[taskId], leaf)) {
            revert InvalidMerkleProof();
        }

        // Mark as claimed
        claimed[taskId][user] = true;
        task.claimedRewards += amount;

        // Transfer reward
        if (task.rewardToken == address(0)) {
            // AVAX transfer
            (bool success, ) = user.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // ERC20 transfer
            IERC20(task.rewardToken).safeTransfer(user, amount);
        }

        emit RewardClaimed(taskId, user, amount, task.rewardToken);
    }

    /**
     * @dev Batch claim rewards for multiple users
     * @param taskId Unique identifier for the task
     * @param claims Array of reward claims
     */
    function batchClaimRewards(
        bytes32 taskId,
        RewardClaim[] calldata claims
    ) external nonReentrant {
        TaskInfo storage task = tasks[taskId];
        
        if (!task.isActive) revert TaskNotActive();
        if (block.timestamp > task.deadline) revert TaskExpired();

        for (uint256 i = 0; i < claims.length; i++) {
            RewardClaim calldata claim = claims[i];
            
            if (claimed[taskId][claim.user]) continue; // Skip if already claimed
            if (claim.amount == 0) continue; // Skip if amount is 0

            // Verify Merkle proof
            bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(claim.user, claim.amount))));
            if (!_verifyMerkleProof(claim.merkleProof, merkleRoots[taskId], leaf)) {
                continue; // Skip invalid proof
            }

            // Mark as claimed
            claimed[taskId][claim.user] = true;
            task.claimedRewards += claim.amount;

            // Transfer reward
            if (task.rewardToken == address(0)) {
                // AVAX transfer
                (bool success, ) = claim.user.call{value: claim.amount}("");
                if (success) {
                    emit RewardClaimed(taskId, claim.user, claim.amount, task.rewardToken);
                }
            } else {
                // ERC20 transfer
                IERC20(task.rewardToken).safeTransfer(claim.user, claim.amount);
                emit RewardClaimed(taskId, claim.user, claim.amount, task.rewardToken);
            }
        }
    }

    /**
     * @dev Deactivate a task (only owner)
     * @param taskId Unique identifier for the task
     */
    function deactivateTask(bytes32 taskId) external onlyOwner {
        TaskInfo storage task = tasks[taskId];
        task.isActive = false;
        emit TaskDeactivated(taskId);
    }

    /**
     * @dev Check if a user has claimed for a specific task
     * @param taskId Unique identifier for the task
     * @param user Address of the user
     * @return True if user has claimed, false otherwise
     */
    function hasClaimed(bytes32 taskId, address user) external view returns (bool) {
        return claimed[taskId][user];
    }

    /**
     * @dev Get task information
     * @param taskId Unique identifier for the task
     * @return Task information
     */
    function getTaskInfo(bytes32 taskId) external view returns (TaskInfo memory) {
        return tasks[taskId];
    }

    /**
     * @dev Verify Merkle proof
     * @param proof Merkle proof
     * @param root Merkle root
     * @param leaf Leaf to verify
     * @return True if proof is valid, false otherwise
     */
    function _verifyMerkleProof(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == root;
    }

    /**
     * @dev Emergency function to withdraw stuck tokens (only owner)
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = owner().call{value: amount}("");
            require(success, "AVAX transfer failed");
        } else {
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    // Allow contract to receive AVAX
    receive() external payable {}
}
