const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

class UUBIBlockchain {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.contract = null;
        this.contractAddress = null;
        this.abi = null;
    }

    /**
     * Initialize blockchain connection
     */
    async initialize() {
        try {
            // Load contract ABI
            this.abi = this.loadContractABI();
            
            // Check if we're in development mode or have placeholder private key
            const isDevelopment = process.env.NODE_ENV === 'development' || 
                                 !process.env.PRIVATE_KEY || 
                                 process.env.PRIVATE_KEY === 'your_private_key_here';
            
            if (isDevelopment) {
                // Skip blockchain initialization in development mode
                console.log('⚠️  Development mode: Skipping blockchain initialization');
                this.contractAddress = '0x1234567890123456789012345678901234567890';
                this.wallet = { address: '0x' + Math.random().toString(16).substr(2, 40) };
                console.log('✓ Blockchain simulation ready');
                console.log(`  Wallet: ${this.wallet.address}`);
                console.log(`  Contract: ${this.contractAddress}`);
                return;
            }
            
            // Initialize provider based on environment
            const infuraUrl = `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
            this.provider = new ethers.providers.JsonRpcProvider(infuraUrl);
            
            // Initialize wallet
            if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== 'your_private_key_here') {
                this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            } else {
                // Generate a new wallet for development
                this.wallet = ethers.Wallet.createRandom().connect(this.provider);
                console.log('⚠️  Using generated wallet for development:', this.wallet.address);
            }
            
            // Deploy or connect to contract
            await this.deployOrConnectContract();
            
            console.log('✓ Blockchain connection initialized');
            console.log(`  Wallet: ${this.wallet.address}`);
            console.log(`  Contract: ${this.contractAddress}`);
            
        } catch (error) {
            console.error('Failed to initialize blockchain:', error);
            throw error;
        }
    }

    /**
     * Load contract ABI from build directory
     */
    loadContractABI() {
        try {
            const abiPath = path.join(__dirname, '../build/contracts/UUBIToken.json');
            const contractData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
            return contractData.abi;
        } catch (error) {
            console.warn('Contract ABI not found, using fallback ABI');
            return this.getFallbackABI();
        }
    }

    /**
     * Get fallback ABI for development
     */
    getFallbackABI() {
        return [
            {
                "inputs": [
                    {"internalType": "bytes32", "name": "biometricHash", "type": "bytes32"},
                    {"internalType": "bytes32", "name": "documentHash", "type": "bytes32"},
                    {"internalType": "bytes", "name": "signature", "type": "bytes"}
                ],
                "name": "registerIdentity",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "claimUUBI",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "getIdentity",
                "outputs": [
                    {
                        "components": [
                            {"internalType": "bytes32", "name": "biometricHash", "type": "bytes32"},
                            {"internalType": "bytes32", "name": "documentHash", "type": "bytes32"},
                            {"internalType": "uint256", "name": "verificationTimestamp", "type": "uint256"},
                            {"internalType": "bool", "name": "isVerified", "type": "bool"},
                            {"internalType": "bool", "name": "isActive", "type": "bool"}
                        ],
                        "internalType": "struct UUBIToken.IdentityRecord",
                        "name": "",
                        "type": "tuple"
                    }
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "canUserClaimUUBI",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "getTimeUntilNextClaim",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "dateOfBirth", "type": "uint256"}],
                "name": "claimBackdatedUUBI",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
                "name": "canUserClaimBackdatedUUBI",
                "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"internalType": "uint256", "name": "dateOfBirth", "type": "uint256"}],
                "name": "calculateBackdatedUUBI",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "name",
                "outputs": [{"internalType": "string", "name": "", "type": "string"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "symbol",
                "outputs": [{"internalType": "string", "name": "", "type": "string"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "totalSupply",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
    }

    /**
     * Deploy or connect to UUBI token contract
     */
    async deployOrConnectContract() {
        try {
            // Check if contract is already deployed
            if (process.env.CONTRACT_ADDRESS) {
                this.contractAddress = process.env.CONTRACT_ADDRESS;
                this.contract = new ethers.Contract(this.contractAddress, this.abi, this.wallet);
                console.log(`✓ Connected to existing contract at ${this.contractAddress}`);
                return;
            }

            // For development, we'll simulate contract deployment
            if (process.env.NODE_ENV === 'development') {
                console.log('⚠️  Development mode: Simulating contract deployment');
                this.contractAddress = '0x1234567890123456789012345678901234567890';
                this.contract = new ethers.Contract(this.contractAddress, this.abi, this.wallet);
                return;
            }

            // In production, deploy the actual contract
            throw new Error('Contract deployment not implemented for production yet');

        } catch (error) {
            console.error('Failed to deploy or connect to contract:', error);
            throw error;
        }
    }

    /**
     * Register user identity on blockchain
     * @param {string} biometricHash - Hash of biometric data
     * @param {string} documentHash - Hash of document data
     * @param {string} identityHash - Unique identity hash
     * @returns {Object} Registration result
     */
    async registerIdentity(biometricHash, documentHash, identityHash) {
        try {
            // Convert hashes to bytes32
            const biometricBytes32 = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(biometricHash));
            const documentBytes32 = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(documentHash));
            
            // Create signature (in production, this would be a real signature)
            const signature = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('verified'));
            
            // Handle development mode
            if (process.env.NODE_ENV === 'development' || !this.contract) {
                console.log('Development mode: Simulating blockchain registration');
                return {
                    success: true,
                    walletAddress: this.wallet.address,
                    transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
                    biometricHash: biometricBytes32,
                    documentHash: documentBytes32,
                    message: 'Identity registered successfully (simulated)'
                };
            }
            
            // Call contract method (production mode)
            const tx = await this.contract.registerIdentity(
                biometricBytes32,
                documentBytes32,
                signature
            );
            
            const receipt = await tx.wait();
            
            return {
                success: true,
                walletAddress: this.wallet.address,
                transactionHash: receipt.hash,
                gasUsed: receipt.gasUsed.toString()
            };

        } catch (error) {
            console.error('Identity registration failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Claim UUBI tokens
     * @param {string} walletAddress - User's wallet address
     * @param {string} signature - User's signature
     * @returns {Object} Claim result
     */
    async claimUUBI(walletAddress, signature) {
        try {
            // Verify signature (in production, this would verify the actual signature)
            if (!signature || signature.length < 10) {
                throw new Error('Invalid signature');
            }

            // Check if user can claim UUBI
            const canClaim = await this.contract.canUserClaimUUBI(walletAddress);
            if (!canClaim) {
                throw new Error('User cannot claim UUBI at this time');
            }

            // Simulate UUBI claim (in development mode)
            if (process.env.NODE_ENV === 'development') {
                const amount = ethers.utils.parseEther('1000'); // 1000 UUBI tokens
                const nextClaimTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
                
                return {
                    success: true,
                    amount: amount.toString(),
                    transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
                    nextClaimTime: nextClaimTime
                };
            }

            // In production, call the actual contract
            const tx = await this.contract.claimUUBI();
            const receipt = await tx.wait();

            return {
                success: true,
                amount: '1000000000000000000000', // 1000 UUBI tokens
                transactionHash: receipt.hash,
                nextClaimTime: Math.floor(Date.now() / 1000) + 86400
            };

        } catch (error) {
            console.error('UUBI claim failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Claim backdated UUBI tokens based on user's age
     * @param {string} walletAddress - User's wallet address
     * @param {string} dateOfBirth - User's date of birth (ISO string or timestamp)
     * @param {string} signature - User's signature
     * @returns {Object} Claim result
     */
    async claimBackdatedUUBI(walletAddress, dateOfBirth, signature) {
        try {
            // Verify signature (in production, this would verify the actual signature)
            // In development mode, be more lenient with signature validation
            const isDevelopmentMode = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
            if (!signature || (!isDevelopmentMode && signature.length < 10)) {
                if (isDevelopmentMode) {
                    console.log('Development mode: Using lenient signature validation');
                } else {
                    throw new Error('Invalid signature');
                }
            }

            // Convert date of birth to timestamp
            let birthTimestamp;
            if (typeof dateOfBirth === 'string') {
                birthTimestamp = Math.floor(new Date(dateOfBirth).getTime() / 1000);
            } else {
                birthTimestamp = dateOfBirth;
            }

            if (!birthTimestamp || birthTimestamp >= Math.floor(Date.now() / 1000)) {
                throw new Error('Invalid date of birth');
            }

            // Check if user can claim backdated UUBI (skip in development mode)
            if (process.env.NODE_ENV !== 'development') {
                const canClaim = await this.contract.canUserClaimBackdatedUUBI(walletAddress);
                if (!canClaim) {
                    throw new Error('User cannot claim backdated UUBI');
                }
            }

            // Calculate age in days and backdated UUBI amount
            const ageInDays = Math.floor((Date.now() / 1000 - birthTimestamp) / 86400);
            const backdatedAmount = ageInDays * 1000; // 1000 UUBI tokens per day

            // Simulate backdated UUBI claim (in development mode)
            if (process.env.NODE_ENV === 'development') {
                const amount = ethers.utils.parseEther(backdatedAmount.toString());
                
                return {
                    success: true,
                    amount: amount.toString(),
                    ageInDays: ageInDays,
                    transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
                    message: `Successfully claimed ${ageInDays} days of backdated UUBI`
                };
            }

            // In production, call the actual contract
            const tx = await this.contract.claimBackdatedUUBI(birthTimestamp);
            const receipt = await tx.wait();

            return {
                success: true,
                amount: ethers.utils.parseEther(backdatedAmount.toString()).toString(),
                ageInDays: ageInDays,
                transactionHash: receipt.hash,
                message: `Successfully claimed ${ageInDays} days of backdated UUBI`
            };

        } catch (error) {
            console.error('Backdated UUBI claim failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get user identity status
     * @param {string} walletAddress - User's wallet address
     * @returns {Object} Identity status
     */
    async getIdentityStatus(walletAddress) {
        try {
            // Skip in development mode if contract is not available
            if (process.env.NODE_ENV === 'development' || !this.contract) {
                return {
                    isVerified: false,
                    isActive: false,
                    verificationTimestamp: '0',
                    biometricHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    documentHash: '0x0000000000000000000000000000000000000000000000000000000000000000'
                };
            }

            const identity = await this.contract.getIdentity(walletAddress);
            
            return {
                isVerified: identity.isVerified,
                isActive: identity.isActive,
                verificationTimestamp: identity.verificationTimestamp.toString(),
                biometricHash: identity.biometricHash,
                documentHash: identity.documentHash
            };

        } catch (error) {
            console.error('Failed to get identity status:', error);
            return {
                isVerified: false,
                isActive: false,
                verificationTimestamp: '0',
                biometricHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
                documentHash: '0x0000000000000000000000000000000000000000000000000000000000000000'
            };
        }
    }

    /**
     * Get UUBI claim status for user
     * @param {string} walletAddress - User's wallet address
     * @returns {Object} UUBI status
     */
    async getUUBIStatus(walletAddress) {
        try {
            // Skip in development mode if contract is not available
            if (process.env.NODE_ENV === 'development' || !this.contract) {
                return {
                    canClaim: false,
                    timeUntilNextClaim: '0',
                    balance: '0',
                    nextClaimTime: 0
                };
            }

            const canClaim = await this.contract.canUserClaimUUBI(walletAddress);
            const timeUntilNextClaim = await this.contract.getTimeUntilNextClaim(walletAddress);
            const balance = await this.contract.balanceOf(walletAddress);
            
            return {
                canClaim,
                timeUntilNextClaim: timeUntilNextClaim.toString(),
                balance: balance.toString(),
                nextClaimTime: canClaim ? 0 : Math.floor(Date.now() / 1000) + parseInt(timeUntilNextClaim.toString())
            };

        } catch (error) {
            console.error('Failed to get UUBI status:', error);
            return {
                canClaim: false,
                timeUntilNextClaim: '0',
                balance: '0',
                nextClaimTime: 0
            };
        }
    }

    /**
     * Get system statistics
     * @returns {Object} System stats
     */
    async getSystemStats() {
        try {
            const totalSupply = await this.contract.totalSupply();
            const name = await this.contract.name();
            const symbol = await this.contract.symbol();
            
            return {
                totalSupply: totalSupply.toString(),
                name,
                symbol,
                contractAddress: this.contractAddress,
                network: process.env.NODE_ENV === 'development' ? 'development' : 'mainnet'
            };

        } catch (error) {
            console.error('Failed to get system stats:', error);
            return {
                totalSupply: '0',
                name: 'Universal Basic Income',
                symbol: 'UUBI',
                contractAddress: this.contractAddress || 'Not deployed',
                network: 'unknown'
            };
        }
    }

    /**
     * Get wallet address
     * @returns {string} Wallet address
     */
    getWalletAddress() {
        return this.wallet ? this.wallet.address : null;
    }

    /**
     * Get contract address
     * @returns {string} Contract address
     */
    getContractAddress() {
        return this.contractAddress;
    }
}

module.exports = UUBIBlockchain;
