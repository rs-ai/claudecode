// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Bloom 2026 - Weekly Check-in Contract
/// @notice A simple contract for users to check in each week of 2026
/// @dev No fees collected, only emits events. Owner can pause if needed.

contract Bloom2026 {

    // ============ State Variables ============

    address public owner;
    bool public paused;

    // Tracks if a user has checked in for a specific week
    // user address => week number => checked in
    mapping(address => mapping(uint256 => bool)) public hasCheckedIn;

    // ============ Events ============

    event CheckIn(address indexed user, uint256 indexed week, uint256 timestamp);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    // ============ Errors ============

    error NotOwner();
    error ContractPaused();
    error InvalidWeek();
    error AlreadyCheckedIn();
    error NotYet2026();
    error Year2026Ended();

    // ============ Constructor ============

    constructor() {
        owner = msg.sender;
        paused = false;
    }

    // ============ Modifiers ============

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ============ Main Function ============

    /// @notice Check in for the current week of 2026
    /// @dev Validates the week and prevents duplicate check-ins
    function checkIn() external whenNotPaused {
        uint256 currentWeek = getCurrentWeek();

        // Validate week is between 1 and 52
        if (currentWeek < 1 || currentWeek > 52) revert InvalidWeek();

        // Check if user already checked in this week
        if (hasCheckedIn[msg.sender][currentWeek]) revert AlreadyCheckedIn();

        // Record the check-in
        hasCheckedIn[msg.sender][currentWeek] = true;

        // Emit event (this is the on-chain record)
        emit CheckIn(msg.sender, currentWeek, block.timestamp);
    }

    // ============ View Functions ============

    /// @notice Get the current week number of 2026
    /// @return week The current week (1-52) or 0 if not 2026
    function getCurrentWeek() public view returns (uint256) {
        // January 1, 2026 00:00:00 UTC
        uint256 start2026 = 1735689600;

        // December 31, 2026 23:59:59 UTC
        uint256 end2026 = 1767225599;

        // Before 2026
        if (block.timestamp < start2026) revert NotYet2026();

        // After 2026
        if (block.timestamp > end2026) revert Year2026Ended();

        // Calculate week number (1-indexed)
        uint256 secondsIntoYear = block.timestamp - start2026;
        uint256 week = (secondsIntoYear / 1 weeks) + 1;

        // Cap at 52
        if (week > 52) week = 52;

        return week;
    }

    /// @notice Check if a user has checked in for a specific week
    /// @param user The address to check
    /// @param week The week number (1-52)
    /// @return True if checked in, false otherwise
    function getCheckIn(address user, uint256 week) external view returns (bool) {
        return hasCheckedIn[user][week];
    }

    /// @notice Get all check-ins for a user (weeks 1-52)
    /// @param user The address to check
    /// @return checkins Array of 52 booleans representing each week
    function getAllCheckIns(address user) external view returns (bool[52] memory checkins) {
        for (uint256 i = 0; i < 52; i++) {
            checkins[i] = hasCheckedIn[user][i + 1];
        }
        return checkins;
    }

    // ============ Owner Functions ============

    /// @notice Pause the contract (stops all check-ins)
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause the contract (resumes check-ins)
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Transfer ownership to a new address
    /// @param newOwner The address of the new owner
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
