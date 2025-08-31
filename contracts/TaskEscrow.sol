// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Rewarder.sol";

/**
 * @title TaskEscrow
 * @dev Manages escrowed funds for micro-task rewards platform
 * Allows creators to fund tasks and integrates with Rewarder for payouts
 * Handles platform fees and refunds
 */
contract TaskEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Rewarder contract instance
    Rewarder public immutable rewarder;

    // Platform fee percentage (basis points: 100 = 1%)
    uint256 public platformFeeBps;
    
    // Platform fee recipient
    address public platformFeeRecipient;
    
    // Global minimum payout amount (0.01 AVAX) to avoid network fee issues
    uint256 public constant GLOBAL_MIN_PAYOUT = 0.01 ether;

    // Struct to store escrow information
    struct EscrowInfo {
        address creator;
        address fundingToken; // USDC address or address(0) for AVAX
        uint256 totalFunded;
        uint256 totalPaidOut;
        uint256 platformFeesCollected;
        bool isActive;
        uint256 deadline;
        uint256 minPayoutAmount;
    }

    // Mapping to store escrow details
    // taskId => EscrowInfo
    mapping(bytes32 => EscrowInfo) public escrows;

    // Events
    event TaskFunded(
        bytes32 indexed taskId,
        address indexed creator,
        address fundingToken,
        uint256 amount,
        uint256 platformFee
    );
    event PayoutProcessed(
        bytes32 indexed taskId,
        address indexed user,
        uint256 amount,
        address rewardToken,
        uint256 platformFee
    );
    event RefundProcessed(
        bytes32 indexed taskId,
        address indexed creator,
        uint256 amount,
        address token
    );
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event PlatformFeeRecipientUpdated(address oldRecipient, address newRecipient);

    // Custom errors
    error EscrowNotFound();
    error EscrowNotActive();
    error EscrowExpired();
    error InsufficientFunds();
    error InvalidAmount();
    error InvalidToken();
    error TransferFailed();
    error UnauthorizedCreator();

    /**
     * @dev Constructor
     * @param _owner The initial owner of the contract
     * @param _rewarder Address of the Rewarder contract
     * @param _platformFeeBps Platform fee in basis points (100 = 1%)
     * @param _platformFeeRecipient Address to receive platform fees
     */
    constructor(
        address _owner,
        address _rewarder,
        uint256 _platformFeeBps,
        address _platformFeeRecipient
    ) Ownable() {
        require(_rewarder != address(0), "Invalid rewarder address");
        require(_platformFeeRecipient != address(0), "Invalid fee recipient");
        require(_platformFeeBps <= 1000, "Fee cannot exceed 10%");

        rewarder = Rewarder(payable(_rewarder));
        platformFeeBps = _platformFeeBps;
        platformFeeRecipient = _platformFeeRecipient;
        _transferOwnership(_owner);
    }

    /**
     * @dev Fund a task with USDC or AVAX
     * @param taskId Unique identifier for the task
     * @param fundingToken Address of the funding token (address(0) for AVAX)
     * @param amount Amount to fund
     * @param deadline Deadline for the task
     * @param minPayoutAmount Minimum payout amount per claim
     */
    function fundTask(
        bytes32 taskId,
        address fundingToken,
        uint256 amount,
        uint256 deadline,
        uint256 minPayoutAmount
    ) external payable nonReentrant {
        require(deadline > block.timestamp, "Deadline must be in the future");
        require(amount > 0, "Amount must be greater than 0");
        require(minPayoutAmount > 0, "Min payout amount must be greater than 0");
        
        // Enforce minimum payout based on token type
        if (fundingToken == address(0)) {
            // For AVAX, enforce 0.01 AVAX minimum
            require(minPayoutAmount >= GLOBAL_MIN_PAYOUT, "Min payout amount must be at least 0.01 AVAX");
        } else {
            // For ERC20 tokens like USDC (6 decimals), allow smaller minimum amounts
            // The minimum is context-dependent for different tokens
        }

        uint256 actualAmount;
        uint256 platformFee;

        if (fundingToken == address(0)) {
            // AVAX funding
            require(msg.value == amount, "Incorrect AVAX amount");
            actualAmount = msg.value;
        } else {
            // ERC20 funding
            require(msg.value == 0, "No AVAX should be sent with ERC20 funding");
            IERC20(fundingToken).safeTransferFrom(msg.sender, address(this), amount);
            actualAmount = amount;
        }

        // Calculate platform fee
        platformFee = (actualAmount * platformFeeBps) / 10000;

        // Create or update escrow
        escrows[taskId] = EscrowInfo({
            creator: msg.sender,
            fundingToken: fundingToken,
            totalFunded: actualAmount,
            totalPaidOut: 0,
            platformFeesCollected: platformFee,
            isActive: true,
            deadline: deadline,
            minPayoutAmount: minPayoutAmount
        });

        // Transfer platform fee
        if (platformFee > 0) {
            if (fundingToken == address(0)) {
                (bool success, ) = platformFeeRecipient.call{value: platformFee}("");
                require(success, "Platform fee transfer failed");
            } else {
                IERC20(fundingToken).safeTransfer(platformFeeRecipient, platformFee);
            }
        }

        emit TaskFunded(taskId, msg.sender, fundingToken, actualAmount, platformFee);
    }

    /**
     * @dev Process payout for a task (only called by Rewarder)
     * @param taskId Unique identifier for the task
     * @param user Address of the user receiving the payout
     * @param amount Amount to payout
     * @param rewardToken Address of the reward token
     */
    function processPayout(
        bytes32 taskId,
        address user,
        uint256 amount,
        address rewardToken
    ) external nonReentrant {
        require(msg.sender == address(rewarder) || msg.sender == owner(), "Only rewarder or owner can call this");
        
        EscrowInfo storage escrow = escrows[taskId];
        if (escrow.creator == address(0)) revert EscrowNotFound();
        if (!escrow.isActive) revert EscrowNotActive();
        if (block.timestamp > escrow.deadline) revert EscrowExpired();
        if (amount < escrow.minPayoutAmount) revert InvalidAmount();
        
        // Enforce global minimum for AVAX payouts only
        if (rewardToken == address(0) && amount < GLOBAL_MIN_PAYOUT) revert InvalidAmount();
        
        // Check available funds
        uint256 totalUsed = escrow.platformFeesCollected + escrow.totalPaidOut;
        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 netPayout = amount - platformFee;
        
        // Ensure we have enough funds to cover both the net payout and platform fee
        if (escrow.totalFunded < totalUsed + netPayout + platformFee) revert InsufficientFunds();

        // Update escrow state (we track net payouts, not gross)
        escrow.totalPaidOut += netPayout;

        // Transfer payout to user
        if (rewardToken == address(0)) {
            // AVAX payout
            (bool success, ) = user.call{value: netPayout}("");
            require(success, "AVAX payout failed");
        } else {
            // ERC20 payout
            IERC20(rewardToken).safeTransfer(user, netPayout);
        }

        // Transfer platform fee
        if (platformFee > 0) {
            if (rewardToken == address(0)) {
                (bool success, ) = platformFeeRecipient.call{value: platformFee}("");
                require(success, "Platform fee transfer failed");
            } else {
                IERC20(rewardToken).safeTransfer(platformFeeRecipient, platformFee);
            }
            escrow.platformFeesCollected += platformFee;
        }

        emit PayoutProcessed(taskId, user, amount, rewardToken, platformFee);
    }

    /**
     * @dev Allow creator to refund remaining funds after task deadline
     * @param taskId Unique identifier for the task
     */
    function refundRemainingFunds(bytes32 taskId) external nonReentrant {
        EscrowInfo storage escrow = escrows[taskId];
        
        if (escrow.creator == address(0)) revert EscrowNotFound();
        if (msg.sender != escrow.creator) revert UnauthorizedCreator();
        if (block.timestamp <= escrow.deadline) revert EscrowNotActive();

        // Calculate remaining amount
        uint256 totalUsed = escrow.platformFeesCollected + escrow.totalPaidOut;
        require(escrow.totalFunded > totalUsed, "No funds to refund");
        uint256 remainingAmount = escrow.totalFunded - totalUsed;

        // Mark escrow as inactive
        escrow.isActive = false;

        // Transfer remaining funds to creator
        if (escrow.fundingToken == address(0)) {
            // AVAX refund
            (bool success, ) = escrow.creator.call{value: remainingAmount}("");
            require(success, "AVAX refund failed");
        } else {
            // ERC20 refund
            IERC20(escrow.fundingToken).safeTransfer(escrow.creator, remainingAmount);
        }

        emit RefundProcessed(taskId, escrow.creator, remainingAmount, escrow.fundingToken);
    }

    /**
     * @dev Update platform fee (only owner)
     * @param newFeeBps New platform fee in basis points
     */
    function updatePlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee cannot exceed 10%");
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @dev Update platform fee recipient (only owner)
     * @param newRecipient New platform fee recipient address
     */
    function updatePlatformFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient address");
        address oldRecipient = platformFeeRecipient;
        platformFeeRecipient = newRecipient;
        emit PlatformFeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /**
     * @dev Get escrow information
     * @param taskId Unique identifier for the task
     * @return Escrow information
     */
    function getEscrowInfo(bytes32 taskId) external view returns (EscrowInfo memory) {
        return escrows[taskId];
    }

    /**
     * @dev Calculate remaining funds for a task
     * @param taskId Unique identifier for the task
     * @return Remaining funds amount
     */
    function getRemainingFunds(bytes32 taskId) external view returns (uint256) {
        EscrowInfo storage escrow = escrows[taskId];
        if (escrow.creator == address(0)) return 0;
        uint256 totalUsed = escrow.platformFeesCollected + escrow.totalPaidOut;
        if (escrow.totalFunded <= totalUsed) return 0;
        return escrow.totalFunded - totalUsed;
    }

    /**
     * @dev Check if a task can be funded
     * @param taskId Unique identifier for the task
     * @return True if task can be funded, false otherwise
     */
    function canFundTask(bytes32 taskId) external view returns (bool) {
        EscrowInfo storage escrow = escrows[taskId];
        return escrow.creator == address(0) || !escrow.isActive;
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
