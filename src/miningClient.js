const RealUBIMiner = require('./realMiner');
const WebSocket = require('ws');

/**
 * Real UUBI Mining Client
 * Connects to mining pool and performs actual proof-of-work
 */

class MiningClient {
    constructor(serverUrl = 'http://localhost:3000') {
        this.serverUrl = serverUrl;
        this.miner = new RealUBIMiner();
        this.isMining = false;
        this.minerAddress = null;
        this.connection = null;
        this.stats = {
            blocksMined: 0,
            totalRewards: 0,
            totalUbiContributed: 0,
            startTime: null
        };
    }

    /**
     * Connect to mining server
     */
    async connect(minerAddress) {
        this.minerAddress = minerAddress;
        console.log(`🔗 Connecting to UUBI mining server...`);
        console.log(`👤 Miner address: ${minerAddress}`);
        
        try {
            // Test connection
            const response = await fetch(`${this.serverUrl}/api/mining/status`);
            if (!response.ok) {
                throw new Error('Server not responding');
            }
            
            console.log(`✅ Connected to UUBI mining server`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to connect: ${error.message}`);
            return false;
        }
    }

    /**
     * Start real mining
     */
    async startMining() {
        if (this.isMining) {
            console.log('⚠️  Already mining!');
            return;
        }

        if (!this.minerAddress) {
            console.error('❌ No miner address set. Call connect() first.');
            return;
        }

        this.isMining = true;
        this.stats.startTime = Date.now();
        
        console.log(`\n🚀 Starting REAL UUBI mining...`);
        console.log(`⛏️  Performing actual proof-of-work computation`);
        console.log(`🎯 Difficulty: ${this.miner.difficulty} leading zeros`);
        console.log(`💰 Block reward: ${this.miner.blockReward} UUBI`);
        console.log(`📊 Your share: ${this.miner.minerShare} UUBI per block`);
        console.log(`🌍 UBI pool share: ${this.miner.ubiShare} UUBI per block\n`);

        // Start mining with progress updates
        this.miner.startMining(
            this.minerAddress,
            this.onBlockFound.bind(this),
            this.onProgress.bind(this)
        );
    }

    /**
     * Handle block found
     */
    async onBlockFound(result) {
        this.stats.blocksMined++;
        this.stats.totalRewards += result.rewards.miner;
        this.stats.totalUbiContributed += result.rewards.ubi;

        console.log(`\n🎉 BLOCK MINED!`);
        console.log(`📊 Block #${result.blockNumber}`);
        console.log(`⏱️  Mining time: ${result.block.miningTime.toFixed(2)}s`);
        console.log(`⚡ Hashrate: ${result.block.hashrate.toLocaleString()} H/s`);
        console.log(`🔢 Nonce: ${result.block.header.nonce}`);
        console.log(`🏆 Hash: ${result.block.hash}`);
        console.log(`💰 Your reward: ${result.rewards.miner} UUBI`);
        console.log(`🌍 UBI contribution: ${result.rewards.ubi} UUBI`);

        // Report to server
        await this.reportBlock(result);

        // Show updated stats
        this.showStats();
    }

    /**
     * Handle mining progress
     */
    onProgress(progress) {
        const elapsed = Math.floor(progress.elapsed);
        const hashrate = progress.hashrate.toLocaleString();
        const hashes = progress.hashes.toLocaleString();
        
        process.stdout.write(`\r⛏️  ${hashes} hashes | ${hashrate} H/s | ${elapsed}s | Nonce: ${progress.nonce}`);
    }

    /**
     * Report mined block to server
     */
    async reportBlock(result) {
        try {
            const response = await fetch(`${this.serverUrl}/api/mining/real-block`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    minerAddress: this.minerAddress,
                    block: result.block,
                    rewards: result.rewards,
                    timestamp: new Date().toISOString()
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log(`✅ Block reported to server`);
            } else {
                console.log(`⚠️  Failed to report block: ${data.error}`);
            }
        } catch (error) {
            console.log(`⚠️  Error reporting block: ${error.message}`);
        }
    }

    /**
     * Show mining statistics
     */
    showStats() {
        const uptime = this.stats.startTime ? (Date.now() - this.stats.startTime) / 1000 : 0;
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        console.log(`\n📊 MINING STATISTICS:`);
        console.log(`⏱️  Uptime: ${hours}h ${minutes}m ${seconds}s`);
        console.log(`⛏️  Blocks mined: ${this.stats.blocksMined}`);
        console.log(`💰 Total rewards: ${this.stats.totalRewards} UUBI`);
        console.log(`🌍 UBI contributed: ${this.stats.totalUbiContributed} UUBI`);
        console.log(`⚡ Current hashrate: ${this.miner.miningStats.hashrate.toLocaleString()} H/s`);
        console.log(`🎯 Current difficulty: ${this.miner.difficulty}`);
    }

    /**
     * Stop mining
     */
    stop() {
        if (!this.isMining) {
            console.log('⚠️  Not currently mining');
            return;
        }

        this.isMining = false;
        console.log(`\n🛑 Stopping miner...`);
        this.showStats();
        console.log(`👋 Mining stopped. Goodbye!`);
    }

    /**
     * Get current mining status
     */
    getStatus() {
        return {
            isMining: this.isMining,
            minerAddress: this.minerAddress,
            stats: this.stats,
            minerStats: this.miner.getStats()
        };
    }
}

// CLI interface
if (require.main === module) {
    const client = new MiningClient();
    
    // Get miner address from command line or use default
    const minerAddress = process.argv[2] || 'miner-' + Date.now();
    
    console.log(`🚀 UUBI Real Mining Client`);
    console.log(`========================`);
    
    // Connect and start mining
    client.connect(minerAddress).then(connected => {
        if (connected) {
            client.startMining();
            
            // Handle graceful shutdown
            process.on('SIGINT', () => {
                client.stop();
                process.exit(0);
            });
        } else {
            console.log('❌ Failed to connect to server');
            process.exit(1);
        }
    });
}

module.exports = MiningClient;
