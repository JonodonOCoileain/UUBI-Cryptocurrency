const express = require('express');
const cors = require('cors');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
require('dotenv').config();

// IP Deployment configuration
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

// Get IP addresses
const getPublicIP = () => {
    try {
        const { execSync } = require('child_process');
        return execSync('curl -s ipv4.icanhazip.com', { encoding: 'utf8' }).trim();
    } catch (error) {
        return 'localhost';
    }
};

const getLocalIP = () => {
    try {
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address;
                }
            }
        }
        return 'localhost';
    } catch (error) {
        return 'localhost';
    }
};

const PUBLIC_IP = getPublicIP();
const LOCAL_IP = getLocalIP();

console.log(`🌐 Public IP: ${PUBLIC_IP}`);
console.log(`🏠 Local IP: ${LOCAL_IP}`);

// Import modules
const BiometricScanner = require('./src/biometricScanner');
const DocumentVerifier = require('./src/documentVerifier');
const IdentityMatcher = require('./src/identityMatcher');
const UUBIBlockchain = require('./src/blockchain');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));

// CORS configuration for IP deployment
const corsOptions = {
    origin: [
        `http://${PUBLIC_IP}:${PORT}`,
        `http://${LOCAL_IP}:${PORT}`,
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // More lenient for IP deployment
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif|mp4|mov|avi/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and videos are allowed.'));
        }
    }
});

// Initialize services
let biometricScanner, documentVerifier, identityMatcher, blockchain;

// Data storage
const users = new Map();
const tokens = new Map();
const resetTokens = new Map();
const extractedBirthdays = new Map();

// Mining data
let miningData = {
    totalMined: 0,
    ubiPool: 0,
    activeMiners: new Set(),
    userBalances: new Map(),
    miningHistory: []
};

// Load persistent data
function loadPersistentData() {
    try {
        const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Load users
        const usersFile = path.join(dataDir, 'users.json');
        if (fs.existsSync(usersFile)) {
            const usersData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
            Object.entries(usersData).forEach(([key, value]) => {
                users.set(key, value);
            });
            console.log(`✅ Loaded ${users.size} users from persistent storage`);
        }

        // Load tokens
        const tokensFile = path.join(dataDir, 'tokens.json');
        if (fs.existsSync(tokensFile)) {
            const tokensData = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
            Object.entries(tokensData).forEach(([key, value]) => {
                tokens.set(key, value);
            });
            console.log(`✅ Loaded ${tokens.size} user tokens from persistent storage`);
        }

        // Load reset tokens
        const resetTokensFile = path.join(dataDir, 'reset_tokens.json');
        if (fs.existsSync(resetTokensFile)) {
            const resetTokensData = JSON.parse(fs.readFileSync(resetTokensFile, 'utf8'));
            Object.entries(resetTokensData).forEach(([key, value]) => {
                resetTokens.set(key, value);
            });
            console.log(`✅ Loaded ${resetTokens.size} password reset tokens from persistent storage`);
        }

        // Load mining data
        const miningFile = path.join(dataDir, 'mining.json');
        if (fs.existsSync(miningFile)) {
            const miningDataFromFile = JSON.parse(fs.readFileSync(miningFile, 'utf8'));
            miningData = {
                ...miningDataFromFile,
                activeMiners: new Set(miningDataFromFile.activeMiners || []),
                userBalances: new Map(Object.entries(miningDataFromFile.userBalances || {}))
            };
            console.log(`✅ Loaded mining data: UBI Pool: ${miningData.ubiPool}, Total Mined: ${miningData.totalMined}, User Balances: ${miningData.userBalances.size}`);
        }

        // Load extracted birthdays
        const birthdaysFile = path.join(dataDir, 'extracted_birthdays.json');
        if (fs.existsSync(birthdaysFile)) {
            const birthdaysData = JSON.parse(fs.readFileSync(birthdaysFile, 'utf8'));
            Object.entries(birthdaysData).forEach(([key, value]) => {
                extractedBirthdays.set(key, value);
            });
            console.log(`✅ Loaded ${extractedBirthdays.size} extracted birthdays from persistent storage`);
        }

    } catch (error) {
        console.error('❌ Error loading persistent data:', error);
    }
}

// Save persistent data
function savePersistentData() {
    try {
        const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Save users
        const usersObj = Object.fromEntries(users);
        fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(usersObj, null, 2));

        // Save tokens
        const tokensObj = Object.fromEntries(tokens);
        fs.writeFileSync(path.join(dataDir, 'tokens.json'), JSON.stringify(tokensObj, null, 2));

        // Save reset tokens
        const resetTokensObj = Object.fromEntries(resetTokens);
        fs.writeFileSync(path.join(dataDir, 'reset_tokens.json'), JSON.stringify(resetTokensObj, null, 2));

        // Save mining data
        const miningDataToSave = {
            ...miningData,
            activeMiners: Array.from(miningData.activeMiners),
            userBalances: Object.fromEntries(miningData.userBalances)
        };
        fs.writeFileSync(path.join(dataDir, 'mining.json'), JSON.stringify(miningDataToSave, null, 2));

        // Save extracted birthdays
        const birthdaysObj = Object.fromEntries(extractedBirthdays);
        fs.writeFileSync(path.join(dataDir, 'extracted_birthdays.json'), JSON.stringify(birthdaysObj, null, 2));

        console.log('💾 Data saved to persistent storage');
    } catch (error) {
        console.error('❌ Error saving persistent data:', error);
    }
}

// Initialize services
async function initializeServices() {
    try {
        console.log('Initializing UUBI Cryptocurrency services...');
        
        // Initialize biometric scanner
        biometricScanner = new BiometricScanner();
        await biometricScanner.initialize();
        console.log('✓ Biometric scanner ready');
        
        // Initialize document verifier
        documentVerifier = new DocumentVerifier();
        console.log('✓ Document verifier ready');
        
        // Initialize identity matcher
        identityMatcher = new IdentityMatcher();
        console.log('✓ Identity matcher ready');
        
        // Initialize blockchain
        blockchain = new UUBIBlockchain();
        await blockchain.initialize();
        console.log('✓ Blockchain connection ready');
        
        console.log('🚀 UUBI Cryptocurrency server ready for IP deployment!');
        console.log(`📱 Local access: http://localhost:${PORT}`);
        console.log(`🏠 Network access: http://${LOCAL_IP}:${PORT}`);
        console.log(`🌐 Public access: http://${PUBLIC_IP}:${PORT}`);
        
    } catch (error) {
        console.error('❌ Error initializing services:', error);
        process.exit(1);
    }
}

// Load data and initialize
loadPersistentData();
initializeServices();

// Save data periodically
setInterval(savePersistentData, 30000); // Save every 30 seconds

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        ip: {
            public: PUBLIC_IP,
            local: LOCAL_IP,
            client: req.ip
        }
    });
});

// System stats endpoint
app.get('/api/stats', async (req, res) => {
    try {
        const biometricVerifiedUsers = extractedBirthdays.size;
        const emailPasswordUsers = users.size;
        const verifiedUsers = biometricVerifiedUsers + emailPasswordUsers;
        
        const stats = {
            totalSupply: miningData.totalMined || 0,
            verifiedUsers: verifiedUsers,
            activeMiners: miningData.activeMiners.size,
            totalUserBalances: Array.from(miningData.userBalances.values()).reduce((sum, balance) => sum + balance, 0),
            ubiPool: miningData.ubiPool || 0,
            timestamp: new Date().toISOString(),
            server: {
                ip: PUBLIC_IP,
                port: PORT
            }
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Failed to get system stats:', error);
        res.status(500).json({ error: 'Failed to get system stats' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve password reset page
app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 UUBI Cryptocurrency server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📱 Local access: http://localhost:${PORT}`);
    console.log(`🏠 Network access: http://${LOCAL_IP}:${PORT}`);
    console.log(`🌐 Public access: http://${PUBLIC_IP}:${PORT}`);
    console.log('');
    console.log('⚠️  For public access, ensure:');
    console.log('   1. Port 3000 is forwarded on your router');
    console.log('   2. Your firewall allows incoming connections on port 3000');
    console.log('   3. Your ISP allows incoming connections');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    savePersistentData();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    savePersistentData();
    process.exit(0);
});

module.exports = app;
