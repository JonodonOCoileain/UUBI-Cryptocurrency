// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title UUBIToken
 * @dev Universal Universal Basic Income token with biometric identity verification
 * @notice This contract ensures only verified unique individuals can receive UUBI
 */
contract UUBIToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    // UUUBI distribution configuration
    uint256 public constant UUUBI_AMOUNT = 1000 * 10**18; // 1000 UUBI tokens per distribution
    uint256 public constant DISTRIBUTION_INTERVAL = 1 days; // Daily distribution
    uint256 public lastDistributionTime;
    
    // Identity verification system
    struct IdentityRecord {
        bytes32 biometricHash; // Hash of biometric data
        bytes32 documentHash;  // Hash of identity document
        uint256 verificationTimestamp;
        bool isVerified;
        bool isActive;
    }
    
    // User identity mapping
    mapping(address => IdentityRecord) public identities;
    mapping(bytes32 => address) public biometricToAddress;
    mapping(bytes32 => address) public documentToAddress;
    
    // UUBI distribution tracking
    mapping(address => uint256) public lastUUBIClaim;
    mapping(address => uint256) public totalUUBIClaimed;
    mapping(address => bool) public hasClaimedBackdatedUUBI;
    
    // Events
    event IdentityVerified(address indexed user, bytes32 biometricHash, bytes32 documentHash);
    event IdentityRevoked(address indexed user);
    event UUBIClaimed(address indexed user, uint256 amount);
    event BackdatedUUBIClaimed(address indexed user, uint256 amount, uint256 ageInDays);
    event UUBIUpdated(uint256 newAmount, uint256 newInterval);
    
    // Modifiers
    modifier onlyVerifiedUser() {
        require(identities[msg.sender].isVerified && identities[msg.sender].isActive, "User not verified");
        _;
    }
    
    modifier canClaimUUBI() {
        require(identities[msg.sender].isVerified && identities[msg.sender].isActive, "User not verified");
        require(block.timestamp >= lastUUBIClaim[msg.sender] + DISTRIBUTION_INTERVAL, "UBI claim too soon");
        _;
    }
    
    constructor() ERC20("Universal Universal Basic Income", "UUBI") {
        lastDistributionTime = block.timestamp;
    }
    
    /**
     * @dev Register and verify user identity with biometric and document data
     * @param biometricHash Hash of user's biometric data (face scan, etc.)
     * @param documentHash Hash of user's identity document (passport, driver's license)
     * @param signature Signature proving the hashes are valid
     */
    function registerIdentity(
        bytes32 biometricHash,
        bytes32 documentHash,
        bytes calldata signature
    ) external whenNotPaused {
        require(biometricHash != bytes32(0), "Invalid biometric hash");
        require(documentHash != bytes32(0), "Invalid document hash");
        require(biometricToAddress[biometricHash] == address(0), "Biometric already registered");
        require(documentToAddress[documentHash] == address(0), "Document already registered");
        require(!identities[msg.sender].isVerified, "User already verified");
        
        // Verify signature (in production, this would verify against a trusted authority)
        require(verifyIdentitySignature(biometricHash, documentHash, signature), "Invalid signature");
        
        // Create identity record
        identities[msg.sender] = IdentityRecord({
            biometricHash: biometricHash,
            documentHash: documentHash,
            verificationTimestamp: block.timestamp,
            isVerified: true,
            isActive: true
        });
        
        // Map hashes to address
        biometricToAddress[biometricHash] = msg.sender;
        documentToAddress[documentHash] = msg.sender;
        
        emit IdentityVerified(msg.sender, biometricHash, documentHash);
    }
    
    /**
     * @dev Claim UUBI tokens (can only be called once per distribution interval)
     */
    function claimUUBI() external onlyVerifiedUser canClaimUUBI nonReentrant {
        uint256 claimAmount = UUUBI_AMOUNT;
        
        // Update claim tracking
        lastUUBIClaim[msg.sender] = block.timestamp;
        totalUUBIClaimed[msg.sender] += claimAmount;
        
        // Mint UBI tokens to user
        _mint(msg.sender, claimAmount);
        
        emit UUBIClaimed(msg.sender, claimAmount);
    }
    
    /**
     * @dev Claim backdated UUBI tokens based on user's age
     * @param dateOfBirth User's date of birth (timestamp)
     */
    function claimBackdatedUUBI(uint256 dateOfBirth) external onlyVerifiedUser nonReentrant {
        require(dateOfBirth > 0, "Invalid date of birth");
        require(dateOfBirth < block.timestamp, "Date of birth must be in the past");
        
        // Calculate user's age in days
        uint256 ageInDays = (block.timestamp - dateOfBirth) / 1 days;
        require(ageInDays > 0, "User must be at least 1 day old");
        
        // Calculate total backdated UUBI (one day's worth for each day of life)
        uint256 totalBackdatedUUBI = ageInDays * UUUBI_AMOUNT;
        
        // Check if user has already claimed backdated UBI
        require(!hasClaimedBackdatedUUBI[msg.sender], "Backdated UBI already claimed");
        
        // Mark as claimed
        hasClaimedBackdatedUUBI[msg.sender] = true;
        
        // Update total claimed
        totalUUBIClaimed[msg.sender] += totalBackdatedUUBI;

        // Mint backdated UUBI tokens
        _mint(msg.sender, totalBackdatedUUBI);
        
        emit BackdatedUUBIClaimed(msg.sender, totalBackdatedUUBI, ageInDays);
    }
    
    /**
     * @dev Revoke user identity (admin only)
     * @param user Address of user to revoke
     */
    function revokeIdentity(address user) external onlyOwner {
        require(identities[user].isVerified, "User not verified");
        
        IdentityRecord storage identity = identities[user];
        
        // Remove hash mappings
        delete biometricToAddress[identity.biometricHash];
        delete documentToAddress[identity.documentHash];
        
        // Deactivate identity
        identity.isActive = false;
        identity.isVerified = false;
        
        emit IdentityRevoked(user);
    }
    
    /**
     * @dev Update UUBI distribution parameters (admin only)
     * @param newAmount New UBI amount per distribution
     * @param newInterval New distribution interval
     */
    function updateUUBIParameters(uint256 newAmount, uint256 newInterval) external onlyOwner {
        require(newAmount > 0, "Invalid UBI amount");
        require(newInterval > 0, "Invalid interval");
        
        UUUBI_AMOUNT = newAmount;
        DISTRIBUTION_INTERVAL = newInterval;
        
        emit UUBIUpdated(newAmount, newInterval);
    }
    
    /**
     * @dev Pause the contract (admin only)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract (admin only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Verify identity signature (placeholder - in production, this would verify against trusted authority)
     * @param biometricHash Hash of biometric data
     * @param documentHash Hash of document data
     * @param signature Signature to verify
     * @return True if signature is valid
     */
    function verifyIdentitySignature(
        bytes32 biometricHash,
        bytes32 documentHash,
        bytes calldata signature
    ) internal pure returns (bool) {
        // In production, this would verify the signature against a trusted authority
        // For now, we'll accept any non-empty signature as valid
        return signature.length > 0;
    }
    
    /**
     * @dev Get user's identity information
     * @param user Address of user
     * @return IdentityRecord User's identity information
     */
    function getIdentity(address user) external view returns (IdentityRecord memory) {
        return identities[user];
    }
    
    /**
     * @dev Check if user can claim UBI
     * @param user Address of user
     * @return True if user can claim UBI
     */
    function canUserClaimUUBI(address user) external view returns (bool) {
        return identities[user].isVerified && 
               identities[user].isActive && 
               block.timestamp >= lastUUBIClaim[user] + DISTRIBUTION_INTERVAL;
    }
    
    /**
     * @dev Get time until next UBI claim
     * @param user Address of user
     * @return Seconds until next claim
     */
    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        if (lastUUBIClaim[user] == 0) {
            return 0; // Can claim immediately
        }
        
        uint256 nextClaimTime = lastUUBIClaim[user] + DISTRIBUTION_INTERVAL;
        if (block.timestamp >= nextClaimTime) {
            return 0; // Can claim now
        }
        
        return nextClaimTime - block.timestamp;
    }
    
    /**
     * @dev Check if user can claim backdated UBI
     * @param user Address of user
     * @return True if user can claim backdated UBI
     */
    function canUserClaimBackdatedUUBI(address user) external view returns (bool) {
        return identities[user].isVerified && 
               identities[user].isActive && 
               !hasClaimedBackdatedUUBI[user];
    }
    
    /**
     * @dev Calculate backdated UBI amount for a given date of birth
     * @param dateOfBirth User's date of birth (timestamp)
     * @return Amount of backdated UBI tokens
     */
    function calculateBackdatedUUBI(uint256 dateOfBirth) external view returns (uint256) {
        if (dateOfBirth == 0 || dateOfBirth >= block.timestamp) {
            return 0;
        }
        
        uint256 ageInDays = (block.timestamp - dateOfBirth) / 1 days;
        return ageInDays * UUUBI_AMOUNT;
    }
}
