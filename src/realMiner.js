const crypto = require('crypto');

/**
 * Real UUBI Mining System
 * Implements actual proof-of-work mining using SHA-256
 */

class RealUBIMiner {
    constructor() {
        this.difficulty = 4; // Number of leading zeros required
        this.blockReward = 50; // UUBI coins per block
        this.ubiShare = Math.floor(this.blockReward * 2 / 3); // 2/3 to UBI pool
        this.minerShare = Math.floor(this.blockReward / 3); // 1/3 to miner
        this.miningStats = {
            totalHashes: 0,
            totalBlocks: 0,
            startTime: Date.now(),
            hashrate: 0
        };
    }

    /**
     * Generate a new block header for mining
     */
    generateBlockHeader(previousHash, minerAddress, timestamp) {
        return {
            version: 1,
            previousHash: previousHash || '0'.repeat(64), // Genesis block
            merkleRoot: this.calculateMerkleRoot([]),
            timestamp: timestamp || Date.now(),
            difficulty: this.difficulty,
            nonce: 0,
            miner: minerAddress
        };
    }

    /**
     * Calculate Merkle root of transactions
     */
    calculateMerkleRoot(transactions) {
        if (transactions.length === 0) {
            return crypto.createHash('sha256').update('empty').digest('hex');
        }
        
        let hashes = transactions.map(tx => 
            crypto.createHash('sha256').update(JSON.stringify(tx)).digest('hex')
        );
        
        while (hashes.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < hashes.length; i += 2) {
                const left = hashes[i];
                const right = hashes[i + 1] || left;
                const combined = left + right;
                nextLevel.push(crypto.createHash('sha256').update(combined).digest('hex'));
            }
            hashes = nextLevel;
        }
        
        return hashes[0];
    }

    /**
     * Serialize block header for hashing
     */
    serializeBlockHeader(header) {
        return [
            header.version,
            header.previousHash,
            header.merkleRoot,
            header.timestamp,
            header.difficulty,
            header.nonce,
            header.miner
        ].join('|');
    }

    /**
     * Check if hash meets difficulty requirement
     */
    isValidHash(hash, difficulty) {
        const target = '0'.repeat(difficulty);
        return hash.startsWith(target);
    }

    /**
     * Mine a single block - REAL COMPUTATIONAL WORK
     */
    async mineBlock(minerAddress, onProgress = null) {
        console.log(`⛏️  Starting real mining for ${minerAddress}...`);
        console.log(`🎯 Target difficulty: ${this.difficulty} leading zeros`);
        
        const startTime = Date.now();
        const blockHeader = this.generateBlockHeader(null, minerAddress);
        let nonce = 0;
        let hashCount = 0;
        const maxNonce = 1000000000; // Prevent infinite loops
        
        while (nonce < maxNonce) {
            blockHeader.nonce = nonce;
            const serialized = this.serializeBlockHeader(blockHeader);
            const hash = crypto.createHash('sha256').update(serialized).digest('hex');
            
            hashCount++;
            this.miningStats.totalHashes++;
            
            // Progress reporting
            if (hashCount % 100000 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                const hashrate = Math.floor(hashCount / elapsed);
                this.miningStats.hashrate = hashrate;
                
                if (onProgress) {
                    onProgress({
                        hashes: hashCount,
                        hashrate: hashrate,
                        elapsed: elapsed,
                        nonce: nonce,
                        currentHash: hash
                    });
                }
                
                console.log(`⛏️  ${hashCount.toLocaleString()} hashes | ${hashrate.toLocaleString()} H/s | Nonce: ${nonce}`);
            }
            
            // Check if we found a valid hash
            if (this.isValidHash(hash, this.difficulty)) {
                const miningTime = (Date.now() - startTime) / 1000;
                const finalHashrate = Math.floor(hashCount / miningTime);
                
                console.log(`🎉 BLOCK MINED!`);
                console.log(`⏱️  Time: ${miningTime.toFixed(2)}s`);
                console.log(`🔢 Nonce: ${nonce}`);
                console.log(`📊 Hashes: ${hashCount.toLocaleString()}`);
                console.log(`⚡ Hashrate: ${finalHashrate.toLocaleString()} H/s`);
                console.log(`🏆 Hash: ${hash}`);
                
                this.miningStats.totalBlocks++;
                this.miningStats.hashrate = finalHashrate;
                
                return {
                    success: true,
                    block: {
                        header: blockHeader,
                        hash: hash,
                        miningTime: miningTime,
                        hashes: hashCount,
                        hashrate: finalHashrate,
                        difficulty: this.difficulty
                    },
                    rewards: {
                        total: this.blockReward,
                        miner: this.minerShare,
                        ubi: this.ubiShare
                    }
                };
            }
            
            nonce++;
        }
        
        return {
            success: false,
            error: 'Mining timeout - difficulty too high',
            hashes: hashCount,
            time: (Date.now() - startTime) / 1000
        };
    }

    /**
     * Start continuous mining
     */
    async startMining(minerAddress, onBlockFound = null, onProgress = null) {
        console.log(`🚀 Starting continuous mining for ${minerAddress}`);
        console.log(`💰 Block reward: ${this.blockReward} UUBI (${this.minerShare} to miner, ${this.ubiShare} to UBI)`);
        
        let blockNumber = 1;
        
        while (true) {
            try {
                const result = await this.mineBlock(minerAddress, onProgress);
                
                if (result.success) {
                    console.log(`\n🎉 Block #${blockNumber} mined!`);
                    console.log(`⏱️  Mining time: ${result.block.miningTime.toFixed(2)}s`);
                    console.log(`⚡ Hashrate: ${result.block.hashrate.toLocaleString()} H/s`);
                    console.log(`💰 Rewards: ${result.rewards.miner} UUBI to miner, ${result.rewards.ubi} UUBI to UBI pool\n`);
                    
                    if (onBlockFound) {
                        onBlockFound({
                            blockNumber: blockNumber,
                            ...result
                        });
                    }
                    
                    blockNumber++;
                    
                    // Adjust difficulty based on mining time
                    this.adjustDifficulty(result.block.miningTime);
                } else {
                    console.log(`❌ Mining failed: ${result.error}`);
                    break;
                }
            } catch (error) {
                console.error(`💥 Mining error:`, error);
                break;
            }
        }
    }

    /**
     * Adjust difficulty based on mining time
     */
    adjustDifficulty(miningTime) {
        const targetTime = 30; // Target 30 seconds per block
        
        if (miningTime < targetTime * 0.8) {
            // Too fast, increase difficulty
            this.difficulty = Math.min(this.difficulty + 1, 8);
            console.log(`📈 Difficulty increased to ${this.difficulty}`);
        } else if (miningTime > targetTime * 1.5) {
            // Too slow, decrease difficulty
            this.difficulty = Math.max(this.difficulty - 1, 1);
            console.log(`📉 Difficulty decreased to ${this.difficulty}`);
        }
    }

    /**
     * Get mining statistics
     */
    getStats() {
        const uptime = (Date.now() - this.miningStats.startTime) / 1000;
        return {
            ...this.miningStats,
            uptime: uptime,
            averageHashrate: this.miningStats.totalHashes / uptime,
            difficulty: this.difficulty,
            blockReward: this.blockReward
        };
    }

    /**
     * Stop mining (for graceful shutdown)
     */
    stop() {
        console.log('🛑 Stopping miner...');
        process.exit(0);
    }
}

module.exports = RealUBIMiner;
