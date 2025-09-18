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

const BiometricScanner = require('./src/biometricScanner');
const DocumentVerifier = require('./src/documentVerifier');
const IdentityMatcher = require('./src/identityMatcher');
const UUBIBlockchain = require('./src/blockchain');

/**
 * Extract birthday from OCR text based on document type
 */
function extractBirthdayFromText(text, documentType) {
    try {
        const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');
        
        // Common birthday patterns
        const patterns = [
            // MM/DD/YYYY or DD/MM/YYYY
            /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/g,
            // DD-MM-YYYY or YYYY-MM-DD
            /(\d{1,2}-\d{1,2}-\d{4})/g,
            /(\d{4}-\d{1,2}-\d{1,2})/g,
            // DD Month YYYY
            /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/gi,
            // Month DD, YYYY
            /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})/gi
        ];
        
        // Document-specific keywords
        const keywords = {
            passport: ['birth', 'born', 'date of birth', 'dob'],
            'driver\'s license': ['birth', 'born', 'date of birth', 'dob'],
            'id card': ['birth', 'born', 'date of birth', 'dob']
        };
        
        const docKeywords = keywords[documentType] || keywords.passport;
        
        // Look for dates near birthday keywords
        for (const keyword of docKeywords) {
            const keywordIndex = normalizedText.indexOf(keyword);
            if (keywordIndex !== -1) {
                // Search around the keyword
                const context = normalizedText.substring(
                    Math.max(0, keywordIndex - 50), 
                    Math.min(normalizedText.length, keywordIndex + 50)
                );
                
                for (const pattern of patterns) {
                    const matches = context.match(pattern);
                    if (matches && matches.length > 0) {
                        const dateStr = matches[0];
                        const parsedDate = parseDate(dateStr);
                        
                        if (parsedDate && isValidBirthday(parsedDate)) {
                            return {
                                success: true,
                                birthday: formatBirthday(parsedDate),
                                rawText: dateStr,
                                context: context
                            };
                        }
                    }
                }
            }
        }
        
        // If no keyword match, try to find any valid date
        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                for (const match of matches) {
                    const parsedDate = parseDate(match);
                    if (parsedDate && isValidBirthday(parsedDate)) {
                        return {
                            success: true,
                            birthday: formatBirthday(parsedDate),
                            rawText: match,
                            context: 'Found in general text'
                        };
                    }
                }
            }
        }
        
        return {
            success: false,
            error: 'No valid birthday found in document text'
        };
        
    } catch (error) {
        return {
            success: false,
            error: 'Error parsing document text: ' + error.message
        };
    }
}

/**
 * Parse date string into Date object
 */
function parseDate(dateStr) {
    try {
        // Clean the date string
        let cleanDate = dateStr.replace(/[^\d\/\-\.\s,a-z]/gi, '');
        
        // Try different parsing methods
        const formats = [
            // MM/DD/YYYY
            /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
            // DD/MM/YYYY
            /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
            // YYYY-MM-DD
            /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/
        ];
        
        for (const format of formats) {
            const match = cleanDate.match(format);
            if (match) {
                let year, month, day;
                
                if (format.source.includes('(\\d{4})[\\/\\-\\.](\\d{1,2})')) {
                    // YYYY-MM-DD format
                    year = parseInt(match[1]);
                    month = parseInt(match[2]) - 1; // JavaScript months are 0-based
                    day = parseInt(match[3]);
                } else {
                    // MM/DD/YYYY or DD/MM/YYYY format
                    const first = parseInt(match[1]);
                    const second = parseInt(match[2]);
                    const third = parseInt(match[3]);
                    
                    // Assume MM/DD/YYYY for now (could be improved with context)
                    if (first > 12 && second <= 12) {
                        // Likely DD/MM/YYYY
                        day = first;
                        month = second - 1;
                        year = third;
                    } else {
                        // Likely MM/DD/YYYY
                        month = first - 1;
                        day = second;
                        year = third;
                    }
                }
                
                const date = new Date(year, month, day);
                
                // Validate the date
                if (date.getFullYear() === year && 
                    date.getMonth() === month && 
                    date.getDate() === day) {
                    return date;
                }
            }
        }
        
        // Try parsing with Date constructor
        const parsed = new Date(cleanDate);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Check if date is a valid birthday (not in future, reasonable age)
 */
function isValidBirthday(date) {
    const now = new Date();
    const age = now.getFullYear() - date.getFullYear();
    
    // Check if date is not in the future
    if (date > now) {
        return false;
    }
    
    // Check if age is reasonable (0-150 years)
    if (age < 0 || age > 150) {
        return false;
    }
    
    return true;
}

/**
 * Format birthday as YYYY-MM-DD
 */
function formatBirthday(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Authentication utility functions
 */

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone number format (basic international format)
function isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
}

// Validate password strength
function isValidPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
}

// Generate JWT token
function generateToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        walletAddress: user.walletAddress
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// Verify JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
}

// Password reset utility functions

// Generate secure password reset token
function generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Send password reset email using Gmail
async function sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `http://localhost:3000/reset-password?token=${resetToken}`;
    
    // Check if Gmail credentials are configured
    const isGmailConfigured = GMAIL_USER !== 'your-email@gmail.com' && GMAIL_APP_PASSWORD !== 'your-app-password';
    
    if (!isGmailConfigured) {
        // Fallback to development mode if Gmail not configured
        console.log('📧 Password Reset Email (Development Mode - Gmail not configured):');
        console.log(`   To: ${email}`);
        console.log(`   Reset URL: ${resetUrl}`);
        console.log(`   Token: ${resetToken}`);
        console.log('   (Configure GMAIL_USER and GMAIL_APP_PASSWORD environment variables to send real emails)');
        
        return {
            success: true,
            resetUrl: resetUrl,
            message: 'Password reset email sent (simulated - Gmail not configured)',
            isSimulated: true
        };
    }
    
    try {
        // Create Gmail transporter
        const transporter = createGmailTransporter();
        
        // Email content
        const mailOptions = {
            from: `"UUBI Cryptocurrency" <${GMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request - UUBI Cryptocurrency',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 UUBI Password Reset</h1>
                        <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Universal Universal Basic Income</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                        <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                        <p style="color: #666; line-height: 1.6; font-size: 16px;">
                            You requested a password reset for your UUBI account. Click the button below to reset your password:
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" 
                               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                      color: white; 
                                      padding: 15px 30px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      font-size: 16px;
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                                Reset My Password
                            </a>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.6;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
                        </p>
                        
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #856404; font-size: 14px;">
                                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security. 
                                If you didn't request this password reset, please ignore this email.
                            </p>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
                        
                        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                            This email was sent by UUBI Cryptocurrency System<br>
                            Universal Universal Basic Income Platform
                        </p>
                    </div>
                </div>
            `,
            text: `
UUBI Password Reset Request

You requested a password reset for your UUBI account.

Reset your password by clicking this link:
${resetUrl}

This link will expire in 1 hour for your security.

If you didn't request this password reset, please ignore this email.

---
UUBI Cryptocurrency System
Universal Universal Basic Income Platform
            `
        };
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        console.log('📧 Password Reset Email Sent via Gmail:');
        console.log(`   To: ${email}`);
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Reset URL: ${resetUrl}`);
        
        return {
            success: true,
            resetUrl: resetUrl,
            message: 'Password reset email sent successfully',
            messageId: info.messageId,
            isSimulated: false
        };
        
    } catch (error) {
        console.error('❌ Error sending Gmail:', error.message);
        
        // Fallback to development mode on error
        console.log('📧 Password Reset Email (Fallback - Gmail Error):');
        console.log(`   To: ${email}`);
        console.log(`   Reset URL: ${resetUrl}`);
        console.log(`   Error: ${error.message}`);
        
        return {
            success: true,
            resetUrl: resetUrl,
            message: 'Password reset email sent (fallback mode due to Gmail error)',
            error: error.message,
            isSimulated: true
        };
    }
}

// Clean up expired password reset tokens
function cleanupExpiredResetTokens() {
    const now = Date.now();
    for (const [token, data] of passwordResetTokens.entries()) {
        if (data.expiresAt < now) {
            passwordResetTokens.delete(token);
        }
    }
}

// Schedule cleanup of expired tokens every hour
setInterval(cleanupExpiredResetTokens, 60 * 60 * 1000);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const biometricScanner = new BiometricScanner();
const documentVerifier = new DocumentVerifier();
const identityMatcher = new IdentityMatcher();
const ubiBlockchain = new UUBIBlockchain();

// Simple in-memory storage for extracted birthdays (in production, use a proper database)
const extractedBirthdays = new Map();

// Persistent storage for user accounts
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');
const RESET_TOKENS_FILE = path.join(DATA_DIR, 'reset_tokens.json');
const MINING_FILE = path.join(DATA_DIR, 'mining.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load persistent data
let users = new Map(); // email/phone -> user object
let userTokens = new Map(); // token -> user info
let passwordResetTokens = new Map(); // resetToken -> { userId, email, expiresAt }
let miningData = {
    ubiPool: 0,
    totalMined: 0,
    miningHistory: [],
    activeMiners: new Map(), // userId -> mining session
    userBalances: new Map() // userId -> balance
};

// Load data from files
function loadPersistentData() {
    try {
        // Load users
        if (fs.existsSync(USERS_FILE)) {
            const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            users = new Map(Object.entries(usersData));
            console.log(`✅ Loaded ${users.size} users from persistent storage`);
        }
        
        // Load user tokens
        if (fs.existsSync(TOKENS_FILE)) {
            const tokensData = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
            userTokens = new Map(Object.entries(tokensData));
            console.log(`✅ Loaded ${userTokens.size} user tokens from persistent storage`);
        }
        
        // Load password reset tokens
        if (fs.existsSync(RESET_TOKENS_FILE)) {
            const resetTokensData = JSON.parse(fs.readFileSync(RESET_TOKENS_FILE, 'utf8'));
            passwordResetTokens = new Map(Object.entries(resetTokensData));
            console.log(`✅ Loaded ${passwordResetTokens.size} password reset tokens from persistent storage`);
        }
        
        // Load mining data
        if (fs.existsSync(MINING_FILE)) {
            const miningDataFromFile = JSON.parse(fs.readFileSync(MINING_FILE, 'utf8'));
            miningData = {
                ubiPool: miningDataFromFile.ubiPool || 0,
                totalMined: miningDataFromFile.totalMined || 0,
                miningHistory: miningDataFromFile.miningHistory || [],
                activeMiners: new Map(), // Don't persist active miners
                userBalances: new Map(miningDataFromFile.userBalances || []) // Load user balances
            };
            console.log(`✅ Loaded mining data: UBI Pool: ${miningData.ubiPool}, Total Mined: ${miningData.totalMined}, User Balances: ${miningData.userBalances.size}`);
        }
    } catch (error) {
        console.error('❌ Error loading persistent data:', error.message);
        console.log('🔄 Starting with empty data storage');
    }
}

// Save data to files
function savePersistentData() {
    try {
        // Save users
        const usersObj = Object.fromEntries(users);
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersObj, null, 2));
        
        // Save user tokens
        const tokensObj = Object.fromEntries(userTokens);
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokensObj, null, 2));
        
        // Save password reset tokens
        const resetTokensObj = Object.fromEntries(passwordResetTokens);
        fs.writeFileSync(RESET_TOKENS_FILE, JSON.stringify(resetTokensObj, null, 2));
        
        // Save mining data
        const miningDataToSave = {
            ubiPool: miningData.ubiPool,
            totalMined: miningData.totalMined,
            miningHistory: miningData.miningHistory,
            userBalances: Array.from(miningData.userBalances.entries())
        };
        fs.writeFileSync(MINING_FILE, JSON.stringify(miningDataToSave, null, 2));
        
        console.log('💾 Data saved to persistent storage');
    } catch (error) {
        console.error('❌ Error saving persistent data:', error.message);
    }
}

// Load data on startup
loadPersistentData();
const JWT_SECRET = process.env.JWT_SECRET || 'uubi-development-secret-key';

// Gmail configuration
const GMAIL_USER = process.env.GMAIL_USER || 'your-email@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'your-app-password';

// Create Gmail transporter
const createGmailTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD
        }
    });
};

// Middleware
// Temporarily disable CSP for debugging
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (relaxed for development)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
    message: 'Too many requests from this IP, please try again later.'
});
// Temporarily disabled for testing
// app.use('/api/', limiter);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit for videos
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'), false);
        }
    }
});

// Redirect HTTPS to HTTP for localhost (development only)
app.use((req, res, next) => {
    if (req.secure && (req.hostname === 'localhost' || req.hostname === '127.0.0.1')) {
        return res.redirect(301, `http://localhost:${process.env.PORT || 3000}${req.url}`);
    }
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Password reset page route
app.get('/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            biometric: 'ready',
            document: 'ready',
            identity: 'ready',
            blockchain: 'ready'
        }
    });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'API is working!', 
        timestamp: new Date().toISOString(),
        server: 'UUBI Cryptocurrency Server'
    });
});

/**
 * Clear all wallet registrations (Admin endpoint)
 */
app.post('/api/clear-registrations', async (req, res) => {
    try {
        // Clear in-memory storage
        extractedBirthdays.clear();
        
        console.log('🧹 Cleared all wallet registrations');
        
        res.json({
            success: true,
            message: 'All wallet registrations have been cleared',
            clearedCount: 0, // Always 0 since it's in-memory
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error clearing registrations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear registrations',
            details: error.message
        });
    }
});

/**
 * Get all registered wallets (Admin endpoint)
 */
app.get('/api/registered-wallets', async (req, res) => {
    try {
        const registeredWallets = Array.from(extractedBirthdays.entries()).map(([wallet, birthday]) => ({
            walletAddress: wallet,
            birthday: birthday,
            registrationDate: new Date().toISOString() // Simulated
        }));
        
        res.json({
            success: true,
            registeredWallets: registeredWallets,
            totalCount: registeredWallets.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error getting registered wallets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get registered wallets',
            details: error.message
        });
    }
});

/**
 * Check if wallet is already registered (Login endpoint)
 */
app.post('/api/login', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        
        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }
        
        console.log(`Checking registration status for wallet: ${walletAddress}`);
        
        // Check blockchain registration status
        const identityStatus = await ubiBlockchain.getIdentityStatus(walletAddress);
        
        // Check if we have stored birthday data for this wallet
        const hasStoredBirthday = extractedBirthdays.has(walletAddress);
        const storedBirthday = extractedBirthdays.get(walletAddress);
        
        // Get UUBI claim status
        const uubiStatus = await ubiBlockchain.getUUBIStatus(walletAddress);
        
        // Determine if user is fully registered
        const isRegistered = identityStatus.isVerified && identityStatus.isActive;
        
        if (isRegistered) {
            console.log(`✅ Wallet ${walletAddress} is registered`);
            res.json({
                success: true,
                isRegistered: true,
                walletAddress: walletAddress,
                identityStatus: identityStatus,
                uubiStatus: uubiStatus,
                hasStoredBirthday: hasStoredBirthday,
                storedBirthday: storedBirthday || null,
                message: 'Successfully logged in to registered account'
            });
        } else {
            console.log(`❌ Wallet ${walletAddress} is not registered`);
            res.json({
                success: false,
                isRegistered: false,
                walletAddress: walletAddress,
                message: 'Wallet is not registered. Please register your identity first.'
            });
        }
        
    } catch (error) {
        console.error('Login check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check wallet registration status',
            details: error.message
        });
    }
});

/**
 * Test birthday extraction (simulated)
 */
app.post('/api/test-birthday-extraction', (req, res) => {
    try {
        // Simulate birthday extraction for testing
        const mockBirthday = '1990-01-15';
        const mockText = 'PASSPORT Name: John Doe Date of Birth: 01/15/1990 Passport No: P123456789';
        
        res.json({
            success: true,
            birthday: mockBirthday,
            extractedText: mockText,
            confidence: 0.95,
            documentType: 'passport'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Test failed: ' + error.message
        });
    }
});

/**
 * Extract birthday from identity document using OCR
 */
app.post('/api/extract-birthday', upload.single('documentImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Document image is required'
            });
        }

        const documentType = req.body.documentType || 'passport';
        
        // Only passports are allowed
        if (documentType !== 'passport') {
            return res.status(400).json({
                success: false,
                error: 'Only passports are accepted as identity documents'
            });
        }
        
        console.log(`Extracting birthday from ${documentType}...`);

        // Process document with OCR (for birthday extraction, we don't need full validation)
        const ocrResult = await documentVerifier.verifyDocument(req.file.buffer, documentType);
        
        // For birthday extraction, we only need the OCR text, not full document validation
        if (!ocrResult.extractedText || ocrResult.extractedText.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Could not extract text from document. Please ensure the document is clear and readable.'
            });
        }

        // Extract birthday from OCR text
        const birthdayResult = extractBirthdayFromText(ocrResult.extractedText, documentType);
        
        if (!birthdayResult.success) {
            return res.status(400).json({
                success: false,
                error: 'Could not find birthday in document. Please ensure the document is clear and readable.',
                extractedText: ocrResult.extractedText,
                confidence: ocrResult.confidence
            });
        }

        res.json({
            success: true,
            birthday: birthdayResult.birthday,
            extractedText: ocrResult.extractedText,
            confidence: ocrResult.confidence,
            documentType: documentType
        });

    } catch (error) {
        console.error('Birthday extraction error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Register user identity with biometric and document verification
 */
app.post('/api/register', upload.fields([
    { name: 'documentImage', maxCount: 1 },
    { name: 'livenessVideo', maxCount: 1 }
]), async (req, res) => {
    try {
        const { documentType = 'passport' } = req.body;
        
        // Only passports are allowed
        if (documentType !== 'passport') {
            return res.status(400).json({
                success: false,
                error: 'Only passports are accepted as identity documents'
            });
        }
        
            // Liveness video is now mandatory, plus document image
            if (!req.files || !req.files.livenessVideo || !req.files.documentImage) {
                return res.status(400).json({
                    success: false,
                    error: 'Liveness video and document image are both required'
                });
            }

            const documentImage = req.files.documentImage[0];
            const livenessVideo = req.files.livenessVideo ? req.files.livenessVideo[0] : null;

        // Process biometric data (using video for both liveness and face scanning)
        console.log('Processing biometric data...');
        const biometricResult = await biometricScanner.processBiometricData(
            null, // No separate biometric image - using video frame extraction
            livenessVideo ? livenessVideo.buffer : null
        );
        
        if (!biometricResult.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Biometric verification failed',
                details: biometricResult.error
            });
        }

        // Process document data
        console.log('Processing document data...');
        const documentResult = await documentVerifier.verifyDocument(documentImage.buffer, documentType);
        
        if (!documentResult.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Document verification failed',
                details: documentResult.validationIssues
            });
        }

        // Match identity
        console.log('Matching identity...');
        const identityResult = await identityMatcher.matchIdentity(
            biometricResult.biometricData,
            documentResult
        );

        if (!identityResult.isMatch) {
            return res.status(400).json({
                success: false,
                error: 'Identity verification failed',
                details: 'Biometric data does not match document data',
                confidence: identityResult.confidenceScore
            });
        }

        if (identityResult.isDuplicate) {
            return res.status(409).json({
                success: false,
                error: 'Identity already registered',
                details: 'This identity has already been registered in the system'
            });
        }

        // Register with blockchain
        console.log('Registering with blockchain...');
        const blockchainResult = await ubiBlockchain.registerIdentity(
            biometricResult.biometricHash,
            documentResult.documentHash,
            identityResult.identityHash
        );

        if (!blockchainResult.success) {
            return res.status(500).json({
                success: false,
                error: 'Blockchain registration failed',
                details: blockchainResult.error
            });
        }

        // Extract birthday from document for automatic backdated UUBI claim
        let extractedBirthday = null;
        if (documentResult.documentData && documentResult.documentData.parsedFields) {
            extractedBirthday = documentResult.documentData.parsedFields.dateOfBirth;
        }
        
        // Store the extracted birthday for later use in backdated UUBI claims
        if (extractedBirthday && blockchainResult.walletAddress) {
            extractedBirthdays.set(blockchainResult.walletAddress, extractedBirthday);
            console.log(`Stored extracted birthday for wallet ${blockchainResult.walletAddress}: ${extractedBirthday}`);
        }

        res.json({
            success: true,
            message: 'Identity successfully registered',
            data: {
                identityHash: identityResult.identityHash,
                biometricHash: biometricResult.biometricHash,
                documentHash: documentResult.documentHash,
                confidence: identityResult.confidenceScore,
                walletAddress: blockchainResult.walletAddress,
                transactionHash: blockchainResult.transactionHash,
                livenessResult: identityResult.livenessCheck,
                extractedBirthday: extractedBirthday
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Register user with email/phone and password
 */
app.post('/api/register-account', async (req, res) => {
    try {
        const { email, phone, password, confirmPassword } = req.body;
        
        // Validation
        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                error: 'Email or phone number is required'
            });
        }
        
        if (email && !isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }
        
        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format'
            });
        }
        
        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Password is required'
            });
        }
        
        if (!isValidPassword(password)) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
            });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Passwords do not match'
            });
        }
        
        // Check if user already exists
        const identifier = email || phone;
        if (users.has(identifier)) {
            return res.status(409).json({
                success: false,
                error: 'Account already exists with this email/phone'
            });
        }
        
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Generate wallet address for the user
        const walletAddress = '0x' + Math.random().toString(16).substr(2, 40);
        
        // Create user object
        const user = {
            id: uuidv4(),
            email: email || null,
            phone: phone || null,
            password: hashedPassword,
            walletAddress: walletAddress,
            isVerified: false,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        // Store user
        users.set(identifier, user);
        
        // Generate JWT token
        const token = generateToken(user);
        userTokens.set(token, user);
        
        // Save to persistent storage
        savePersistentData();
        
        console.log(`✅ New user registered: ${identifier} (${walletAddress})`);
        
        res.json({
            success: true,
            message: 'Account created successfully',
            data: {
                userId: user.id,
                email: user.email,
                phone: user.phone,
                walletAddress: user.walletAddress,
                token: token,
                isVerified: user.isVerified
            }
        });
        
    } catch (error) {
        console.error('Account registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Login with email/phone and password
 */
app.post('/api/login-account', async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        
        // Validation
        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                error: 'Email or phone number is required'
            });
        }
        
        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Password is required'
            });
        }
        
        // Find user
        const identifier = email || phone;
        const user = users.get(identifier);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        users.set(identifier, user);
        
        // Generate new JWT token
        const token = generateToken(user);
        userTokens.set(token, user);
        
        // Save to persistent storage
        savePersistentData();
        
        console.log(`✅ User logged in: ${identifier} (${user.walletAddress})`);
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                userId: user.id,
                email: user.email,
                phone: user.phone,
                walletAddress: user.walletAddress,
                token: token,
                isVerified: user.isVerified,
                lastLogin: user.lastLogin
            }
        });
        
    } catch (error) {
        console.error('Account login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Logout user
 */
app.post('/api/logout', (req, res) => {
    try {
        console.log('🚪 Logout request received');
        
        // In a real application, you would:
        // 1. Invalidate the JWT token
        // 2. Clear server-side session data
        // 3. Remove user from active sessions
        
        // For this demo, we'll just return success
        // The frontend will handle clearing the UI state
        
        res.json({
            success: true,
            message: 'Successfully logged out'
        });
        
    } catch (error) {
        console.error('❌ Error during logout:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Get user profile (requires authentication)
 */
app.get('/api/profile', authenticateToken, (req, res) => {
    try {
        const { userId } = req.user;
        
        // Find user by ID
        let user = null;
        for (const [identifier, userData] of users.entries()) {
            if (userData.id === userId) {
                user = userData;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Remove password from response
        const { password, ...userProfile } = user;
        
        res.json({
            success: true,
            data: userProfile
        });
        
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Update user profile (requires authentication)
 */
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { email, phone, currentPassword, newPassword } = req.body;
        
        // Find user by ID
        let user = null;
        let userIdentifier = null;
        for (const [identifier, userData] of users.entries()) {
            if (userData.id === userId) {
                user = userData;
                userIdentifier = identifier;
                break;
            }
        }
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Update email/phone if provided
        if (email || phone) {
            const newIdentifier = email || phone;
            
            // Check if new identifier is already taken
            if (users.has(newIdentifier) && newIdentifier !== userIdentifier) {
                return res.status(409).json({
                    success: false,
                    error: 'Email/phone already in use'
                });
            }
            
            // Update user data
            user.email = email || user.email;
            user.phone = phone || user.phone;
            
            // Move user to new identifier if changed
            if (newIdentifier !== userIdentifier) {
                users.delete(userIdentifier);
                users.set(newIdentifier, user);
            }
        }
        
        // Update password if provided
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Current password is required to change password'
                });
            }
            
            // Verify current password
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }
            
            // Validate new password
            if (!isValidPassword(newPassword)) {
                return res.status(400).json({
                    success: false,
                    error: 'New password must be at least 8 characters with uppercase, lowercase, and number'
                });
            }
            
            // Hash new password
            const saltRounds = 12;
            user.password = await bcrypt.hash(newPassword, saltRounds);
        }
        
        // Save updated user
        const currentIdentifier = user.email || user.phone;
        users.set(currentIdentifier, user);
        
        // Save to persistent storage
        savePersistentData();
        
        console.log(`✅ User profile updated: ${currentIdentifier}`);
        
        // Remove password from response
        const { password, ...userProfile } = user;
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: userProfile
        });
        
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Request password reset
 */
app.post('/api/request-password-reset', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Validation
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email address is required'
            });
        }
        
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }
        
        // Check if user exists
        const user = users.get(email);
        if (!user) {
            // In development mode, show a demo reset URL for testing
            const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
            if (isDevelopment) {
                const demoToken = 'demo-token-' + Date.now();
                const demoUrl = `http://localhost:3000/reset-password?token=${demoToken}`;
                console.log('📧 Demo Password Reset URL (User not found):');
                console.log(`   Email: ${email}`);
                console.log(`   Demo Reset URL: ${demoUrl}`);
                console.log('   (This is a demo URL - user does not exist)');
                
                return res.json({
                    success: true,
                    message: 'If an account with that email exists, a password reset link has been sent',
                    resetUrl: demoUrl,
                    isDemo: true
                });
            }
            
            // Don't reveal if user exists or not for security
            return res.json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent'
            });
        }
        
        // Generate reset token
        const resetToken = generatePasswordResetToken();
        const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now
        
        // Store reset token
        passwordResetTokens.set(resetToken, {
            userId: user.id,
            email: user.email,
            expiresAt: expiresAt
        });
        
        // Save to persistent storage
        savePersistentData();
        
        // Send reset email (simulated)
        const emailResult = await sendPasswordResetEmail(email, resetToken);
        
        console.log(`✅ Password reset requested for: ${email}`);
        
        res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent',
            resetUrl: emailResult.resetUrl // Only for development
        });
        
    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Verify password reset token
 */
app.get('/api/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Reset token is required'
            });
        }
        
        // Check if token exists and is not expired
        const tokenData = passwordResetTokens.get(token);
        if (!tokenData) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }
        
        if (tokenData.expiresAt < Date.now()) {
            passwordResetTokens.delete(token);
            return res.status(400).json({
                success: false,
                error: 'Reset token has expired'
            });
        }
        
        // Token is valid
        res.json({
            success: true,
            message: 'Reset token is valid',
            email: tokenData.email
        });
        
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Reset password with token
 */
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        
        // Validation
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Reset token is required'
            });
        }
        
        if (!newPassword) {
            return res.status(400).json({
                success: false,
                error: 'New password is required'
            });
        }
        
        if (!isValidPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 8 characters with uppercase, lowercase, and number'
            });
        }
        
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: 'Passwords do not match'
            });
        }
        
        // Verify token
        const tokenData = passwordResetTokens.get(token);
        if (!tokenData) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired reset token'
            });
        }
        
        if (tokenData.expiresAt < Date.now()) {
            passwordResetTokens.delete(token);
            return res.status(400).json({
                success: false,
                error: 'Reset token has expired'
            });
        }
        
        // Find user
        const user = users.get(tokenData.email);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Update user password
        user.password = hashedPassword;
        users.set(tokenData.email, user);
        
        // Remove used token
        passwordResetTokens.delete(token);
        
        // Save to persistent storage
        savePersistentData();
        
        // Invalidate all existing user tokens (force re-login)
        for (const [tokenKey, tokenUser] of userTokens.entries()) {
            if (tokenUser.id === user.id) {
                userTokens.delete(tokenKey);
            }
        }
        
        console.log(`✅ Password reset successful for: ${tokenData.email}`);
        
        res.json({
            success: true,
            message: 'Password has been reset successfully. Please login with your new password.'
        });
        
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Claim UUBI tokens
 */
app.post('/api/claim-ubi', async (req, res) => {
    try {
        const { walletAddress, signature } = req.body;
        
        if (!walletAddress || !signature) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address and signature are required'
            });
        }

        const claimResult = await ubiBlockchain.claimUUBI(walletAddress, signature);
        
        if (!claimResult.success) {
            return res.status(400).json({
                success: false,
                error: 'UUBI claim failed',
                details: claimResult.error
            });
        }

        res.json({
            success: true,
            message: 'UUBI successfully claimed',
            data: {
                amount: claimResult.amount,
                transactionHash: claimResult.transactionHash,
                nextClaimTime: claimResult.nextClaimTime
            }
        });

    } catch (error) {
        console.error('UUBI claim error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Claim backdated UUBI tokens based on user's age
 */
app.post('/api/claim-backdated-uubi', async (req, res) => {
    try {
        const { walletAddress, dateOfBirth, signature } = req.body;
        
        if (!walletAddress || !dateOfBirth || !signature) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address, date of birth, and signature are required'
            });
        }

        const claimResult = await ubiBlockchain.claimBackdatedUUBI(walletAddress, dateOfBirth, signature);
        
        if (!claimResult.success) {
            return res.status(400).json({
                success: false,
                error: 'Backdated UUBI claim failed',
                details: claimResult.error
            });
        }

        res.json({
            success: true,
            message: claimResult.message,
            data: {
                amount: claimResult.amount,
                ageInDays: claimResult.ageInDays,
                transactionHash: claimResult.transactionHash
            }
        });

    } catch (error) {
        console.error('Backdated UUBI claim error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Claim backdated UUBI using extracted birthday from registration
 */
app.post('/api/claim-backdated-uubi-auto', async (req, res) => {
    try {
        const { walletAddress, signature } = req.body;
        
        if (!walletAddress || !signature) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address and signature are required'
            });
        }

        // Get the extracted birthday from the stored registration data
        let dateOfBirth = extractedBirthdays.get(walletAddress);
        
        if (!dateOfBirth) {
            // Fallback to development mode birthday if not found
            const isDevelopmentMode = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
            if (isDevelopmentMode) {
                dateOfBirth = '01/01/1990';
                console.log(`Development mode: No stored birthday for ${walletAddress}, using fallback birthday`);
            } else {
                return res.status(400).json({
                    success: false,
                    error: 'No extracted birthday found for this wallet address. Please register your identity first.'
                });
            }
        } else {
            console.log(`Using extracted birthday for wallet ${walletAddress}: ${dateOfBirth}`);
        }

        const claimResult = await ubiBlockchain.claimBackdatedUUBI(walletAddress, dateOfBirth, signature);
        
        if (!claimResult.success) {
            return res.status(400).json({
                success: false,
                error: 'Backdated UUBI claim failed',
                details: claimResult.error
            });
        }

        res.json({
            success: true,
            message: claimResult.message,
            data: {
                amount: claimResult.amount,
                ageInDays: claimResult.ageInDays,
                transactionHash: claimResult.transactionHash,
                dateOfBirth: dateOfBirth,
                source: 'extracted_from_document'
            }
        });

    } catch (error) {
        console.error('Automatic backdated UUBI claim error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Get user identity status
 */
app.get('/api/identity/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        
        const identityStatus = await ubiBlockchain.getIdentityStatus(walletAddress);
        
        res.json({
            success: true,
            data: identityStatus
        });

    } catch (error) {
        console.error('Identity status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Get UUBI claim status
 */
app.get('/api/ubi-status/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        
        const ubiStatus = await ubiBlockchain.getUUBIStatus(walletAddress);
        
        res.json({
            success: true,
            data: ubiStatus
        });

    } catch (error) {
        console.error('UUBI status error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Get system statistics
 */
app.get('/api/stats', async (req, res) => {
    try {
        // Calculate verified users (users with registered identities + email/password users)
        const biometricVerifiedUsers = Array.from(extractedBirthdays.keys()).length;
        const emailPasswordUsers = users.size; // users is a Map, not an object
        const verifiedUsers = biometricVerifiedUsers + emailPasswordUsers;
        
        // Debug logging (can be removed in production)
        // console.log('📊 Stats calculation:', {
        //     biometricVerifiedUsers,
        //     emailPasswordUsers,
        //     verifiedUsers,
        //     usersSize: users.size,
        //     usersKeys: Array.from(users.keys()),
        //     extractedBirthdaysKeys: Array.from(extractedBirthdays.keys())
        // });
        
        // Calculate total supply from mining data
        const totalSupply = miningData.totalMined;
        
        // Calculate active miners
        const activeMiners = miningData.activeMiners.size;
        
        // Calculate total user balances
        const totalUserBalances = Array.from(miningData.userBalances.values()).reduce((sum, balance) => sum + balance, 0);
        
        // Get blockchain stats as fallback
        const blockchainStats = await ubiBlockchain.getSystemStats();
        
        const stats = {
            totalSupply: totalSupply.toString(),
            verifiedUsers: verifiedUsers,
            activeMiners: activeMiners,
            ubiPool: miningData.ubiPool,
            totalMined: miningData.totalMined,
            totalUserBalances: totalUserBalances,
            dailyDistribution: 1000, // Fixed daily distribution
            name: blockchainStats.name || "Universal Universal Basic Income",
            symbol: blockchainStats.symbol || "UUBI",
            contractAddress: blockchainStats.contractAddress || "0x1234567890123456789012345678901234567890",
            network: blockchainStats.network || "development",
            miningHistory: miningData.miningHistory.length,
            lastUpdated: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Verify biometric data with liveness detection (for testing)
 */
app.post('/api/verify-biometric', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Image file is required'
            });
        }

        const result = await biometricScanner.processBiometricData(req.file.buffer);
        
        res.json({
            success: result.isValid,
            data: result
        });

    } catch (error) {
        console.error('Biometric verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Test liveness detection only
 */
app.post('/api/test-liveness', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Image file is required'
            });
        }

        const livenessResult = await biometricScanner.detectLiveness(req.file.buffer);

        res.json({
            success: livenessResult.isLive,
            data: livenessResult
        });

    } catch (error) {
        console.error('Liveness detection error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Simple test video liveness detection
 */
app.post('/api/test-video-liveness', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Video file is required'
            });
        }

        const videoFile = req.file;
        
        // Simple validation - just check if it's a video file
        if (!videoFile.mimetype.startsWith('video/')) {
            return res.status(400).json({
                success: false,
                error: 'File must be a video'
            });
        }
        
        // Check file size (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (videoFile.size > maxSize) {
            return res.status(400).json({
                success: false,
                error: 'Video file is too large (max 50MB)'
            });
        }
        
        // Simulate liveness detection (for testing) - more lenient
        const livenessScore = Math.random() * 0.6 + 0.4; // 0.4-1.0 (more lenient)
        const isLive = livenessScore > 0.3; // Lowered threshold from 0.8 to 0.3
        
        res.json({
            success: isLive,
            data: {
                isLive: isLive,
                confidence: Math.round(livenessScore * 100),
                fileInfo: {
                    name: videoFile.originalname,
                    size: videoFile.size,
                    type: videoFile.mimetype,
                    sizeMB: (videoFile.size / (1024 * 1024)).toFixed(2)
                },
                message: isLive ? 'Video passed liveness detection' : 'Video failed liveness detection'
            }
        });

    } catch (error) {
        console.error('Video liveness test error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Enhanced test video-based liveness detection (original complex version)
 */
app.post('/api/test-video-liveness-enhanced', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), async (req, res) => {
    try {
        const imageFile = req.files && req.files['image'] ? req.files['image'][0] : null;
        const videoFile = req.files && req.files['video'] ? req.files['video'][0] : null;

        if (!imageFile && !videoFile) {
            return res.status(400).json({
                success: false,
                error: 'At least one file (image or video) is required'
            });
        }

        if (imageFile && !imageFile.mimetype.startsWith('image/')) {
            return res.status(400).json({
                success: false,
                error: 'Image file must be an image'
            });
        }

        if (videoFile && !videoFile.mimetype.startsWith('video/')) {
            return res.status(400).json({
                success: false,
                error: 'Video file must be a video'
            });
        }

            // Perform enhanced liveness detection with video if available
            // If only video is provided, extract frame for biometric processing
            let imageBuffer = imageFile ? imageFile.buffer : null;
            if (!imageBuffer && videoFile) {
                console.log('Only video provided - will extract frame for biometric processing');
            }
            
            const livenessResult = await biometricScanner.detectLiveness(
                imageBuffer,
                videoFile ? videoFile.buffer : null
            );

        res.json({
            success: livenessResult.isLive,
            data: {
                ...livenessResult,
                fileInfo: {
                    imageProvided: !!imageFile,
                    videoProvided: !!videoFile,
                    imageSize: imageFile ? imageFile.size : 0,
                    videoSize: videoFile ? videoFile.size : 0,
                    imageType: imageFile ? imageFile.mimetype : null,
                    videoType: videoFile ? videoFile.mimetype : null
                }
            }
        });

    } catch (error) {
        console.error('Video liveness detection error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Verify document (for testing)
 */
app.post('/api/verify-document', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Image file is required'
            });
        }

        const { documentType = 'passport' } = req.body;
        
        // Only passports are allowed
        if (documentType !== 'passport') {
            return res.status(400).json({
                success: false,
                error: 'Only passports are accepted as identity documents'
            });
        }
        
        const result = await documentVerifier.verifyDocument(req.file.buffer, documentType);
        
        res.json({
            success: result.isValid,
            data: result
        });

    } catch (error) {
        console.error('Document verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Mining API Endpoints
 */

// Get mining data
app.get('/api/mining/data', (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                ubiPool: miningData.ubiPool,
                totalMined: miningData.totalMined,
                miningHistory: miningData.miningHistory.slice(-10), // Last 10 entries
                userBalances: Object.fromEntries(miningData.userBalances) // Convert Map to Object
            }
        });
    } catch (error) {
        console.error('❌ Error getting mining data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get mining data'
        });
    }
});

// Start mining session
app.post('/api/mining/start', (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }
        
        // Check if user is already mining
        if (miningData.activeMiners.has(userId)) {
            return res.status(400).json({
                success: false,
                error: 'User is already mining'
            });
        }
        
        // Create mining session
        const miningSession = {
            userId,
            startTime: Date.now(),
            miningPower: 1.0 + Math.random() * 2.0, // 1.0 - 3.0 H/s
            status: 'active'
        };
        
        miningData.activeMiners.set(userId, miningSession);
        
        res.json({
            success: true,
            data: {
                sessionId: userId,
                miningPower: miningSession.miningPower,
                message: 'Mining session started'
            }
        });
        
    } catch (error) {
        console.error('❌ Error starting mining:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start mining'
        });
    }
});

// Complete mining session
app.post('/api/mining/complete', (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }
        
        // Get mining session
        const miningSession = miningData.activeMiners.get(userId);
        if (!miningSession) {
            return res.status(400).json({
                success: false,
                error: 'No active mining session found'
            });
        }
        
        // Calculate mining results
        const miningTime = (Date.now() - miningSession.startTime) / 1000; // seconds
        const baseCoins = Math.random() * 10 + 5; // 5-15 coins
        const difficultyBonus = Math.random() * 5; // 0-5 bonus
        const powerMultiplier = miningSession.miningPower;
        const totalCoins = Math.floor((baseCoins + difficultyBonus) * powerMultiplier);
        
        // Distribute coins: 2/3 to UBI pool, 1/3 to user
        const userShare = Math.floor(totalCoins / 3);
        const ubiShare = totalCoins - userShare;
        
        // Update user balance
        const currentBalance = miningData.userBalances.get(userId) || 0;
        miningData.userBalances.set(userId, currentBalance + userShare);
        
        // Update mining data
        miningData.ubiPool += ubiShare;
        miningData.totalMined += totalCoins;
        
        // Add to mining history
        const historyEntry = {
            userId,
            timestamp: new Date().toISOString(),
            totalCoins,
            userShare,
            ubiShare,
            miningTime: Math.round(miningTime),
            miningPower: miningSession.miningPower
        };
        
        miningData.miningHistory.push(historyEntry);
        
        // Keep only last 1000 entries
        if (miningData.miningHistory.length > 1000) {
            miningData.miningHistory = miningData.miningHistory.slice(-1000);
        }
        
        // Remove mining session
        miningData.activeMiners.delete(userId);
        
        // Save data
        savePersistentData();
        
        res.json({
            success: true,
            data: {
                totalCoins,
                userShare,
                ubiShare,
                miningTime: Math.round(miningTime),
                miningPower: miningSession.miningPower,
                newBalance: userShare, // This would be added to user's actual balance
                ubiPoolTotal: miningData.ubiPool
            }
        });
        
    } catch (error) {
        console.error('❌ Error completing mining:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete mining'
        });
    }
});

// Stop mining session
app.post('/api/mining/stop', (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }
        
        // Remove mining session
        const wasMining = miningData.activeMiners.has(userId);
        miningData.activeMiners.delete(userId);
        
        res.json({
            success: true,
            data: {
                message: wasMining ? 'Mining stopped' : 'No active mining session found'
            }
        });
        
    } catch (error) {
        console.error('❌ Error stopping mining:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop mining'
        });
    }
});

    // Get user's mining stats
    app.get('/api/mining/stats/:userId', (req, res) => {
        try {
            const { userId } = req.params;
            
            // Get user's current balance
            const userBalance = miningData.userBalances.get(userId) || 0;
            
            // Get user's mining history
            const userHistory = miningData.miningHistory.filter(entry => entry.userId === userId);
            const totalUserMined = userHistory.reduce((sum, entry) => sum + entry.userShare, 0);
            const totalSessions = userHistory.length;
            const avgMiningTime = userHistory.length > 0 
                ? userHistory.reduce((sum, entry) => sum + entry.miningTime, 0) / userHistory.length 
                : 0;
            
            res.json({
                success: true,
                data: {
                    userBalance: userBalance,
                    totalMined: totalUserMined,
                    totalSessions,
                    avgMiningTime: Math.round(avgMiningTime),
                    recentHistory: userHistory.slice(-10)
                }
            });
            
        } catch (error) {
            console.error('❌ Error getting mining stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get mining stats'
            });
        }
    });

    // Real mining endpoints
    app.get('/api/mining/status', (req, res) => {
        res.json({
            success: true,
            data: {
                status: 'online',
                difficulty: 4,
                blockReward: 50,
                ubiShare: 33,
                minerShare: 17
            }
        });
    });

    // Report real mined block
    app.post('/api/mining/real-block', (req, res) => {
        try {
            console.log('📥 Full request body:', JSON.stringify(req.body, null, 2));
            
            const { minerAddress, block, rewards, timestamp } = req.body;
            
            console.log(`🎉 Real block received from ${minerAddress}`);
            
            // Check if block data exists
            if (!block) {
                console.error('❌ Block data is missing from request');
                return res.status(400).json({ success: false, error: 'Block data is missing' });
            }
            
            console.log(`📦 Block data:`, JSON.stringify(block, null, 2));
            console.log(`⏱️  Mining time: ${block.miningTime || block.time || 'N/A'}s`);
            console.log(`⚡ Hashrate: ${block.hashrate ? block.hashrate.toLocaleString() : 'N/A'} H/s`);
            console.log(`🏆 Hash: ${block.hash || 'N/A'}`);
            
            // Check if rewards exist
            if (!rewards) {
                console.error('❌ Rewards data is missing from request');
                return res.status(400).json({ success: false, error: 'Rewards data is missing' });
            }
            
            console.log(`💰 Rewards: ${rewards.miner} UUBI to miner, ${rewards.ubi} UUBI to UBI`);
            
            // Update user balance
            const currentBalance = miningData.userBalances.get(minerAddress) || 0;
            const newBalance = currentBalance + rewards.miner;
            miningData.userBalances.set(minerAddress, newBalance);
            console.log(`💰 Updated balance for ${minerAddress}: ${currentBalance} -> ${newBalance} UUBI`);
            
            // Update mining data
            miningData.ubiPool += rewards.ubi;
            miningData.totalMined += rewards.total;
            
            // Add to mining history
            const historyEntry = {
                userId: minerAddress,
                timestamp: timestamp,
                totalCoins: rewards.total,
                userShare: rewards.miner,
                ubiShare: rewards.ubi,
                miningTime: Math.round(block.miningTime),
                miningPower: block.hashrate,
                blockHash: block.hash,
                nonce: block.header.nonce,
                difficulty: block.difficulty,
                isRealMining: true
            };
            
            miningData.miningHistory.push(historyEntry);
            
            // Keep only last 1000 entries
            if (miningData.miningHistory.length > 1000) {
                miningData.miningHistory = miningData.miningHistory.slice(-1000);
            }
            
            // Save data
            savePersistentData();
            
            res.json({
                success: true,
                data: {
                    message: 'Block accepted',
                    ubiPool: miningData.ubiPool,
                    totalMined: miningData.totalMined
                }
            });
            
        } catch (error) {
            console.error('❌ Error processing real block:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process block'
            });
        }
    });

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large',
                details: 'Maximum file size is 10MB'
            });
        }
    }
    
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Initialize services and start server
async function startServer() {
    try {
        console.log('Initializing UUBI Cryptocurrency services...');
        
        // Load biometric models
        await biometricScanner.loadModels();
        console.log('✓ Biometric scanner ready');
        
        // Initialize blockchain connection
        await ubiBlockchain.initialize();
        console.log('✓ Blockchain connection ready');
        
        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 UUBI Cryptocurrency server running on port ${PORT}`);
            console.log(`📱 Web interface: http://localhost:${PORT}`);
            console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
        });
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    
    try {
        await documentVerifier.cleanup();
        console.log('✓ Document verifier cleaned up');
    } catch (error) {
        console.error('Error cleaning up document verifier:', error);
    }
    
    process.exit(0);
});

startServer();
