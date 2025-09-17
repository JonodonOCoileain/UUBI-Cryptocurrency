#!/usr/bin/env node

/**
 * Test Real UUBI Mining
 * Quick test to verify the mining algorithm works
 */

const RealUBIMiner = require('./src/realMiner');

async function testMining() {
    console.log('🧪 Testing Real UUBI Mining Algorithm');
    console.log('=====================================');
    console.log('');
    
    const miner = new RealUBIMiner();
    const testAddress = 'test-miner-12345';
    
    console.log('⛏️  Starting test mining session...');
    console.log(`🎯 Difficulty: ${miner.difficulty} leading zeros`);
    console.log(`💰 Block reward: ${miner.blockReward} UUBI`);
    console.log('');
    
    const startTime = Date.now();
    
    try {
        const result = await miner.mineBlock(testAddress, (progress) => {
            const elapsed = Math.floor(progress.elapsed);
            const hashrate = progress.hashrate.toLocaleString();
            const hashes = progress.hashes.toLocaleString();
            
            process.stdout.write(`\r⛏️  ${hashes} hashes | ${hashrate} H/s | ${elapsed}s | Nonce: ${progress.nonce}`);
        });
        
        const totalTime = (Date.now() - startTime) / 1000;
        
        console.log('\n');
        console.log('🎉 TEST COMPLETE!');
        console.log('=================');
        
        if (result.success) {
            console.log(`✅ Block successfully mined!`);
            console.log(`⏱️  Total time: ${totalTime.toFixed(2)}s`);
            console.log(`🔢 Final nonce: ${result.block.header.nonce}`);
            console.log(`🏆 Final hash: ${result.block.hash}`);
            console.log(`⚡ Average hashrate: ${result.block.hashrate.toLocaleString()} H/s`);
            console.log(`💰 Rewards: ${result.rewards.miner} UUBI to miner, ${result.rewards.ubi} UUBI to UBI`);
            console.log('');
            console.log('✅ Real mining algorithm is working correctly!');
        } else {
            console.log(`❌ Mining failed: ${result.error}`);
            console.log(`⏱️  Time spent: ${totalTime.toFixed(2)}s`);
            console.log(`🔢 Hashes computed: ${result.hashes.toLocaleString()}`);
        }
        
    } catch (error) {
        console.log(`\n💥 Error during mining: ${error.message}`);
    }
    
    console.log('');
    console.log('📊 Final Statistics:');
    const stats = miner.getStats();
    console.log(`⛏️  Total hashes: ${stats.totalHashes.toLocaleString()}`);
    console.log(`⏱️  Uptime: ${(stats.uptime / 1000).toFixed(2)}s`);
    console.log(`⚡ Average hashrate: ${Math.floor(stats.averageHashrate).toLocaleString()} H/s`);
    console.log(`🎯 Final difficulty: ${stats.difficulty}`);
}

// Run the test
testMining().catch(console.error);
