# UUBI Cryptocurrency

A Universal Universal Basic Income (UUBI) cryptocurrency system that ensures user uniqueness through biometric verification and identity document matching.

## Features

- 🔐 **Biometric Security**: Face recognition technology for identity verification
- 💓 **Liveness Detection**: Multi-method anti-spoofing to prevent photo/video attacks
- 📄 **Document Verification**: OCR-based passport and driver's license verification
- 🆔 **Unique Identity**: Prevents duplicate registrations through identity matching
- 💰 **UUBI Distribution**: Automated daily UUBI token distribution with backdated claims
- 🌐 **Web Interface**: User-friendly interface for registration and claiming
- ⛓️ **Blockchain Integration**: Ethereum smart contracts for secure token management

## Architecture

### Components

1. **Smart Contract** (`contracts/UUBIToken.sol`)
   - ERC-20 token with identity verification requirements
   - Prevents duplicate registrations
   - Manages UUBI distribution

2. **Biometric Scanner** (`src/biometricScanner.js`)
   - Face detection and recognition using face-api.js
   - Multi-method liveness detection (texture, depth, motion, reflection, color analysis)
   - Anti-spoofing protection against photos, videos, and masks
   - Generates biometric hashes for identity verification
   - Quality validation for biometric data

3. **Document Verifier** (`src/documentVerifier.js`)
   - OCR text extraction using Tesseract.js
   - Document type recognition (passport, driver's license, ID card)
   - Data validation and parsing

4. **Identity Matcher** (`src/identityMatcher.js`)
   - Links biometric data with document data
   - Prevents duplicate identity registrations
   - Confidence scoring for identity verification

5. **Blockchain Integration** (`src/blockchain.js`)
   - Web3.js integration for Ethereum interaction
   - Smart contract deployment and interaction
   - Transaction management

6. **Web Interface** (`public/`)
   - React-like vanilla JavaScript interface
   - File upload for biometric and document images
   - Real-time status updates

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd UUUBI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Ethereum Configuration
   MNEMONIC=your_wallet_mnemonic_phrase_here
   INFURA_PROJECT_ID=your_infura_project_id_here
   PRIVATE_KEY=your_private_key_here
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # JWT Secret
   JWT_SECRET=your_jwt_secret_key_here
   ```

4. **Download face detection models**
   ```bash
   mkdir -p models
   # Download face-api.js models to the models directory
   # You can find them at: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
   ```

5. **Compile smart contracts** (optional for development)
   ```bash
   npm run compile
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   - Open http://localhost:3000 in your browser
   - The API is available at http://localhost:3000/api

## Usage

### 1. Identity Registration

1. **Connect Wallet**: Click "Connect Wallet" to connect your Ethereum wallet
2. **Upload Biometric Photo**: Take a clear photo of your face
3. **Upload Identity Document**: Upload a photo of your passport, driver's license, or ID card
4. **Select Document Type**: Choose the type of document you're uploading
5. **Submit**: Click "Register Identity" to complete the process

### 2. UUBI Claiming

1. **Verify Identity**: Ensure your identity is verified (green status)
2. **Check Eligibility**: The system will show if you can claim UUBI
3. **Claim UUBI**: Click "Claim UUBI" to receive your daily allocation
4. **Wait for Next Claim**: You can claim once every 24 hours

### 3. API Endpoints

- `POST /api/register` - Register user identity with liveness detection
- `POST /api/claim-ubi` - Claim daily UUBI tokens
- `POST /api/claim-backdated-ubi` - Claim backdated UUBI based on age
- `GET /api/identity/:walletAddress` - Get identity status
- `GET /api/ubi-status/:walletAddress` - Get UUBI status
- `GET /api/stats` - Get system statistics
- `POST /api/verify-biometric` - Test biometric verification with liveness
- `POST /api/test-liveness` - Test liveness detection only
- `POST /api/test-video-liveness` - Test enhanced video-based liveness detection
- `POST /api/verify-document` - Test document verification

## Security Features

### Biometric Security
- Face detection and recognition using advanced ML models
- Quality validation to ensure clear biometric data
- Hash-based storage for privacy protection

### Enhanced Video Liveness Detection
- **Facial Movement Analysis**: Detects natural facial movements and expressions
- **Eye Blinking Patterns**: Analyzes natural blink frequency and duration
- **Mouth Movement Detection**: Tracks natural lip movements and speech patterns
- **Head Movement Tracking**: Monitors 3D head rotations and tilts
- **Micro-expression Analysis**: Detects subtle facial expression changes
- **Temporal Consistency**: Ensures smooth, natural movement across video frames
- **Enhanced Security**: Higher confidence threshold (85% vs 75%) for video-based detection

### Document Verification
- OCR text extraction and validation
- Document type recognition and parsing
- Expiry date validation
- Format validation for ID numbers

### Identity Matching
- Cross-validation between biometric and document data
- Duplicate detection using identity hashes
- Confidence scoring for verification quality

### Blockchain Security
- Smart contract-based identity management
- Cryptographic hash verification
- Immutable identity records
- Secure UUBI distribution

## Development

### Project Structure

```
UUUBI/
├── contracts/           # Smart contracts
│   └── UUBIToken.sol
├── src/                # Source code
│   ├── biometricScanner.js
│   ├── documentVerifier.js
│   ├── identityMatcher.js
│   └── blockchain.js
├── public/             # Web interface
│   ├── index.html
│   └── app.js
├── models/             # ML models (download separately)
├── build/              # Compiled contracts
├── server.js           # Main server
├── package.json
└── README.md
```

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run compile` - Compile smart contracts
- `npm run deploy` - Deploy contracts to network
- `npm test` - Run tests

### Testing

```bash
# Test biometric verification
curl -X POST -F "image=@test_face.jpg" http://localhost:3000/api/verify-biometric

# Test document verification
curl -X POST -F "image=@test_passport.jpg" -F "documentType=passport" http://localhost:3000/api/verify-document
```

## Deployment

### Production Setup

1. **Set up production environment variables**
2. **Deploy smart contracts to mainnet**
3. **Set up proper database for identity storage**
4. **Configure reverse proxy (nginx)**
5. **Set up SSL certificates**
6. **Configure monitoring and logging**

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This is a proof-of-concept implementation for educational purposes. For production use, additional security measures, legal compliance, and thorough testing would be required.

## Support

For questions or issues, please open an issue on GitHub or contact the development team.

---

**Note**: This system requires careful consideration of privacy laws and regulations regarding biometric data collection and storage. Ensure compliance with applicable laws in your jurisdiction before deployment.
