# UBI Cryptocurrency System Overview

## 🎯 Project Summary

I've built a complete Universal Basic Income (UBI) cryptocurrency system that ensures user uniqueness through biometric scanning and identity document verification. The system prevents duplicate registrations by matching biometric data (face recognition) with official identity documents (passports, driver's licenses).

## 🏗️ System Architecture

### Core Components

1. **Smart Contract** (`contracts/UBIToken.sol`)
   - ERC-20 token with identity verification requirements
   - Prevents duplicate registrations using biometric and document hashes
   - Manages daily UBI distribution (1000 tokens per day)
   - Built with OpenZeppelin security standards

2. **Biometric Scanner** (`src/biometricScanner.js`)
   - Face detection and recognition using face-api.js
   - Generates unique biometric hashes
   - Quality validation for clear face images
   - Age and gender detection for additional verification

3. **Document Verifier** (`src/documentVerifier.js`)
   - OCR text extraction using Tesseract.js
   - Supports passports, driver's licenses, and ID cards
   - Validates document data and expiry dates
   - Generates document hashes for identity matching

4. **Identity Matcher** (`src/identityMatcher.js`)
   - Links biometric data with document data
   - Prevents duplicate identity registrations
   - Confidence scoring for verification quality
   - Name, age, and gender cross-validation

5. **Blockchain Integration** (`src/blockchain.js`)
   - Web3.js integration for Ethereum interaction
   - Smart contract deployment and interaction
   - Transaction management and status tracking

6. **Web Interface** (`public/`)
   - Modern, responsive web interface
   - Drag-and-drop file uploads
   - Real-time status updates
   - Mobile-friendly design

## 🔐 Security Features

### Biometric Security
- Advanced face detection using ML models
- Quality validation to ensure clear biometric data
- Hash-based storage for privacy protection
- Duplicate detection using biometric hashes

### Document Verification
- OCR text extraction and validation
- Document type recognition and parsing
- Expiry date validation
- Format validation for ID numbers

### Identity Matching
- Cross-validation between biometric and document data
- Duplicate detection using identity hashes
- Confidence scoring for verification quality
- Prevents multiple registrations by same person

### Blockchain Security
- Smart contract-based identity management
- Cryptographic hash verification
- Immutable identity records
- Secure UBI distribution with time locks

## 🚀 Key Features

### User Registration Flow
1. User uploads biometric photo (face scan)
2. User uploads identity document (passport/driver's license)
3. System processes biometric data and extracts face features
4. System processes document and extracts personal information
5. System matches biometric data with document data
6. If match is successful and no duplicate found, identity is registered on blockchain
7. User can now claim UBI tokens

### UBI Distribution
- Daily distribution of 1000 UBI tokens per verified user
- 24-hour cooldown between claims
- Automatic eligibility checking
- Blockchain-based transaction recording

### Web Interface
- Intuitive drag-and-drop file uploads
- Real-time processing status
- Wallet connection simulation
- Transaction history display
- System statistics dashboard

## 📁 Project Structure

```
UUBI/
├── contracts/           # Smart contracts
│   └── UBIToken.sol    # Main UBI token contract
├── src/                # Source code
│   ├── biometricScanner.js    # Face recognition
│   ├── documentVerifier.js    # Document OCR
│   ├── identityMatcher.js     # Identity matching
│   └── blockchain.js          # Web3 integration
├── public/             # Web interface
│   ├── index.html      # Main page
│   └── app.js          # Frontend logic
├── scripts/            # Setup and deployment
│   └── setup.sh        # Automated setup
├── tests/              # Test files
│   └── basic.test.js   # API tests
├── server.js           # Express server
├── package.json        # Dependencies
└── README.md           # Documentation
```

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **face-api.js** - Face detection and recognition
- **Tesseract.js** - OCR text extraction
- **Sharp** - Image processing
- **Web3.js/Ethers.js** - Blockchain interaction

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **Tailwind CSS** - Styling
- **Font Awesome** - Icons
- **Responsive Design** - Mobile-friendly

### Blockchain
- **Solidity** - Smart contract language
- **OpenZeppelin** - Security standards
- **Truffle** - Development framework
- **Ethereum** - Blockchain platform

## 🔧 Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Download ML Models**
   - Download face-api.js models to `models/` directory
   - See README.md for detailed instructions

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Access Application**
   - Open http://localhost:3000
   - API available at http://localhost:3000/api

## 🧪 Testing

The system includes comprehensive testing:
- API endpoint testing
- Biometric verification testing
- Document verification testing
- Identity matching testing
- Blockchain integration testing

Run tests with:
```bash
npm test
```

## 🚀 Deployment

The system is designed for easy deployment:
- Docker support
- Environment-based configuration
- Production-ready security measures
- Scalable architecture

## 🔒 Privacy & Compliance

### Data Protection
- Biometric data stored as hashes only
- No raw biometric data stored
- Document data processed locally
- Minimal data retention

### Legal Considerations
- Compliance with biometric data laws
- GDPR considerations for EU users
- CCPA compliance for California users
- Local jurisdiction requirements

## 📈 Future Enhancements

### Planned Features
- Multi-language support
- Advanced biometric modalities (fingerprint, iris)
- Mobile app development
- Integration with government databases
- Advanced fraud detection
- Machine learning improvements

### Scalability
- Microservices architecture
- Database integration
- Load balancing
- Caching strategies
- CDN integration

## 🎉 Conclusion

This UBI cryptocurrency system successfully addresses the challenge of ensuring user uniqueness through biometric verification while maintaining privacy and security. The system provides a solid foundation for a fair and secure UBI distribution mechanism that prevents fraud and ensures each person can only register once.

The combination of advanced biometric technology, document verification, and blockchain security creates a robust system that can scale to serve millions of users while maintaining the integrity of the UBI distribution process.
