/**
 * UUBI Mining Web Worker
 * Handles mining operations in the background even when browser tab is hidden
 */

// Mining state
let miningState = {
    isMining: false,
    miningStartTime: null,
    currentHashes: 0,
    blocksMined: 0,
    totalHashes: 0,
    minerAddress: 'miner-' + Date.now(),
    userBalance: 0,
    ubiPool: 0
};

// Mining interval
let miningInterval = null;

// Listen for messages from main thread
self.addEventListener('message', function(e) {
    const { action, data } = e.data;
    
    switch (action) {
        case 'startMining':
            startMining(data);
            break;
        case 'stopMining':
            stopMining();
            break;
        case 'updateMinerAddress':
            updateMinerAddress(data);
            break;
        case 'getStats':
            sendStats();
            break;
        default:
            console.log('Unknown action:', action);
    }
});

function startMining(data) {
    if (miningState.isMining) return;
    
    miningState.isMining = true;
    miningState.miningStartTime = Date.now();
    miningState.currentHashes = 0;
    miningState.blocksMined = 0;
    miningState.totalHashes = 0;
    
    if (data && data.minerAddress) {
        miningState.minerAddress = data.minerAddress;
    }
    
    console.log('⛏️  Starting background mining...');
    
    // Start mining simulation
    simulateMining();
    
    // Start periodic stats updates
    startStatsTimer();
    
    // Send status update
    self.postMessage({
        type: 'miningStarted',
        data: {
            minerAddress: miningState.minerAddress,
            timestamp: new Date().toISOString()
        }
    });
}

function startStatsTimer() {
    // Send stats every 2 seconds
    setInterval(() => {
        if (miningState.isMining) {
            sendStats();
        }
    }, 2000);
}

function stopMining() {
    if (!miningState.isMining) return;
    
    miningState.isMining = false;
    
    if (miningInterval) {
        clearInterval(miningInterval);
        miningInterval = null;
    }
    
    console.log('🛑 Background mining stopped');
    
    // Send status update
    self.postMessage({
        type: 'miningStopped',
        data: {
            blocksMined: miningState.blocksMined,
            totalHashes: miningState.totalHashes,
            userBalance: miningState.userBalance,
            ubiPool: miningState.ubiPool,
            timestamp: new Date().toISOString()
        }
    });
}

function updateMinerAddress(data) {
    if (data && data.minerAddress) {
        miningState.minerAddress = data.minerAddress;
        console.log('👤 Miner address updated:', miningState.minerAddress);
    }
}

function sendStats() {
    self.postMessage({
        type: 'statsUpdate',
        data: {
            isMining: miningState.isMining,
            blocksMined: miningState.blocksMined,
            totalHashes: miningState.totalHashes,
            userBalance: miningState.userBalance,
            ubiPool: miningState.ubiPool,
            currentHashes: miningState.currentHashes,
            hashrate: miningState.miningStartTime ? 
                Math.floor(miningState.totalHashes / ((Date.now() - miningState.miningStartTime) / 1000)) : 0,
            timestamp: new Date().toISOString()
        }
    });
}

function simulateMining() {
    // More predictable timing: 20-40 seconds per block
    // At 3k hashes per 100ms = 30k hashes per second = 600k-1.2M hashes in 20-40 seconds
    const targetHashes = 600000 + Math.random() * 600000; // 600k-1.2M hashes
    let currentHashes = 0;
    let blockCount = 0;
    
    miningInterval = setInterval(() => {
        if (!miningState.isMining) return;
        
        // Simulate hash computation - more consistent rate
        const hashIncrement = 2500 + Math.random() * 1000; // 2.5k-3.5k hashes per interval
        currentHashes += hashIncrement;
        miningState.currentHashes = currentHashes;
        miningState.totalHashes += hashIncrement;
        
        // Check if block mined (continuous mining)
        if (currentHashes >= targetHashes) {
            blockCount++;
            miningState.blocksMined++;
            
            // Complete mining block
            completeMiningBlock(blockCount, currentHashes);
            
            // Reset for next block
            currentHashes = 0;
            const newTargetHashes = 600000 + Math.random() * 600000;
            targetHashes = newTargetHashes;
            
            console.log(`⛏️  Block #${blockCount} mined in background!`);
        }
        
        // Send periodic updates (every 5 seconds)
        if (miningState.totalHashes % 50000 === 0) {
            sendStats();
        }
        
        // Send stats update every 2 seconds during mining
        if (miningState.totalHashes % 20000 === 0) {
            sendStats();
        }
        
    }, 100); // Update every 100ms
}

function completeMiningBlock(blockNumber, blockHashes) {
    const blockMiningTime = (Date.now() - miningState.miningStartTime) / 1000;
    const hashrate = Math.floor(blockHashes / blockMiningTime);
    
    // Generate block data
    const blockHash = generateFakeHash();
    const nonce = Math.floor(blockHashes / 1000);
    const difficulty = 4;
    const totalReward = 50;
    const minerReward = 17; // 1/3
    const ubiReward = 33; // 2/3
    
    // Update mining state
    miningState.userBalance += minerReward;
    miningState.ubiPool += ubiReward;
    
    // Send block completion message
    self.postMessage({
        type: 'blockMined',
        data: {
            blockNumber: blockNumber,
            blockHash: blockHash,
            nonce: nonce,
            miningTime: blockMiningTime,
            hashrate: hashrate,
            difficulty: difficulty,
            totalReward: totalReward,
            minerReward: minerReward,
            ubiReward: ubiReward,
            userBalance: miningState.userBalance,
            ubiPool: miningState.ubiPool,
            timestamp: new Date().toISOString()
        }
    });
    
    // Notify server about the mined block to update persistent storage
    notifyServerBlockMined(blockNumber, totalReward, minerReward, ubiReward);
}

async function notifyServerBlockMined(blockNumber, totalReward, minerReward, ubiReward) {
    try {
        const blockMiningTime = (Date.now() - miningState.miningStartTime) / 1000;
        const hashrate = Math.floor(miningState.currentHashes / blockMiningTime);
        
        const response = await fetch('/api/mining/real-block', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                minerAddress: miningState.minerAddress,
                block: {
                    miningTime: blockMiningTime,
                    hashrate: hashrate,
                    hash: generateFakeHash(),
                    blockNumber: blockNumber
                },
                rewards: {
                    miner: minerReward,
                    ubi: ubiReward,
                    total: totalReward
                },
                timestamp: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            console.log('✅ Block mined notification sent to server');
        } else {
            console.error('❌ Failed to notify server about mined block');
        }
    } catch (error) {
        console.error('❌ Error notifying server about mined block:', error);
    }
}

function generateFakeHash() {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
}

// Send initial stats
sendStats();
