#!/usr/bin/env node

/**
 * UUBI Real Mining Client
 * Command-line interface for actual proof-of-work mining
 */

const RealUBIMiner = require('./src/realMiner');
const readline = require('readline');

class CLIMiner {
    constructor() {
        this.miner = new RealUBIMiner();
        this.isMining = false;
        this.minerAddress = null;
        this.stats = {
            blocksMined: 0,
            totalRewards: 0,
            totalUbiContributed: 0,
            startTime: null
        };
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async start() {
        console.log('🚀 UUBI Real Mining Client');
        console.log('==========================');
        console.log('');
        
        // Get miner address
        this.minerAddress = await this.prompt('Enter your miner address (or press Enter for auto-generated): ');
        if (!this.minerAddress.trim()) {
            this.minerAddress = 'miner-' + Date.now();
        }
        
        console.log(`👤 Miner address: ${this.minerAddress}`);
        console.log('');
        
        // Show mining info
        this.showMiningInfo();
        
        // Start mining
        await this.startMining();
    }

    showMiningInfo() {
        console.log('⛏️  MINING INFORMATION:');
        console.log(`🎯 Difficulty: ${this.miner.difficulty} leading zeros`);
        console.log(`💰 Block reward: ${this.miner.blockReward} UUBI`);
        console.log(`👤 Your share: ${this.miner.minerShare} UUBI per block`);
        console.log(`🌍 UBI pool share: ${this.miner.ubiShare} UUBI per block`);
        console.log(`⚡ This will perform REAL computational work!`);
        console.log('');
    }

    async startMining() {
        this.isMining = true;
        this.stats.startTime = Date.now();
        
        console.log('🚀 Starting REAL mining...');
        console.log('⛏️  Performing actual proof-of-work computation');
        console.log('💡 Press Ctrl+C to stop mining');
        console.log('');

        // Start mining with progress updates
        this.miner.startMining(
            this.minerAddress,
            this.onBlockFound.bind(this),
            this.onProgress.bind(this)
        );
    }

    onBlockFound(result) {
        this.stats.blocksMined++;
        this.stats.totalRewards += result.rewards.miner;
        this.stats.totalUbiContributed += result.rewards.ubi;

        console.log('\n🎉 BLOCK MINED!');
        console.log('================');
        console.log(`📊 Block #${this.stats.blocksMined}`);
        console.log(`⏱️  Mining time: ${result.block.miningTime.toFixed(2)}s`);
        console.log(`⚡ Hashrate: ${result.block.hashrate.toLocaleString()} H/s`);
        console.log(`🔢 Nonce: ${result.block.header.nonce}`);
        console.log(`🏆 Hash: ${result.block.hash}`);
        console.log(`💰 Your reward: ${result.rewards.miner} UUBI`);
        console.log(`🌍 UBI contribution: ${result.rewards.ubi} UUBI`);
        console.log('');

        // Show updated stats
        this.showStats();
    }

    onProgress(progress) {
        const elapsed = Math.floor(progress.elapsed);
        const hashrate = progress.hashrate.toLocaleString();
        const hashes = progress.hashes.toLocaleString();
        
        process.stdout.write(`\r⛏️  ${hashes} hashes | ${hashrate} H/s | ${elapsed}s | Nonce: ${progress.nonce}`);
    }

    showStats() {
        const uptime = this.stats.startTime ? (Date.now() - this.stats.startTime) / 1000 : 0;
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        console.log('📊 MINING STATISTICS:');
        console.log('====================');
        console.log(`⏱️  Uptime: ${hours}h ${minutes}m ${seconds}s`);
        console.log(`⛏️  Blocks mined: ${this.stats.blocksMined}`);
        console.log(`💰 Total rewards: ${this.stats.totalRewards} UUBI`);
        console.log(`🌍 UBI contributed: ${this.stats.totalUbiContributed} UUBI`);
        console.log(`⚡ Current hashrate: ${this.miner.miningStats.hashrate.toLocaleString()} H/s`);
        console.log(`🎯 Current difficulty: ${this.miner.difficulty}`);
        console.log('');
    }

    prompt(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }

    stop() {
        if (!this.isMining) {
            console.log('⚠️  Not currently mining');
            return;
        }

        this.isMining = false;
        console.log('\n🛑 Stopping miner...');
        this.showStats();
        console.log('👋 Mining stopped. Goodbye!');
        this.rl.close();
        process.exit(0);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n');
    process.exit(0);
});

// Start the miner
const miner = new CLIMiner();
miner.start().catch(console.error);
