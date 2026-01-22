# PassX - Zero-Knowledge Password Manager

<div align="center">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</div>

<br />

**PassX** is a mobile-first, zero-knowledge password manager that ensures your sensitive data never leaves your device unencrypted. Built with modern technologies, PassX provides a secure, intuitive, and feature-rich experience for managing passwords, credit cards, and secure notes.

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Security Features](#-security-features)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)

## 🎯 Problem Statement

In today's digital age, managing multiple passwords across various platforms is challenging. Users face several critical issues:

1. **Security Risks**: Reusing passwords across platforms creates vulnerability
2. **Trust Issues**: Existing password managers require trusting a third party with plaintext passwords
3. **Privacy Concerns**: Many solutions store unencrypted data on their servers
4. **Usability**: Complex interfaces make password management cumbersome
5. **Accessibility**: Need for cross-platform access without compromising security

### The Core Challenge

**How can we create a password manager that is both highly secure AND user-friendly, where even the service provider cannot access user data?**

## 💡 Solution

PassX implements a **true zero-knowledge architecture** where:

- ✅ All encryption/decryption happens on the client device
- ✅ Master password NEVER leaves your device
- ✅ Server only stores encrypted blobs of data
- ✅ Even PassX cannot decrypt your passwords
- ✅ Modern, intuitive UI built with React Native
- ✅ Fast, responsive, and works offline (with local caching)

### Zero-Knowledge Guarantee

```
┌─────────────┐                    ┌──────────────┐
│   Client    │                    │    Server    │
│   Device    │                    │              │
├─────────────┤                    ├──────────────┤
│             │                    │              │
│  Plaintext  │                    │  Encrypted   │
│  Password   │──── Encrypted ───▶│   Blob       │
│             │       Data         │              │
│  Master Key │                    │  Cannot      │
│  (Local)    │                    │  Decrypt     │
└─────────────┘                    └──────────────┘
```

## 🛠 Tech Stack

### Frontend (Mobile App)
- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind v4 (Tailwind CSS for React Native)
- **State Management**: React Context API
- **Encryption**: 
  - Argon2 (password derivation)
- **Storage**: Expo SecureStore (for JWT tokens)
- **HTTP Client**: Axios
- **Icons**: @expo/vector-icons (Ionicons)

### Backend (API Server)
- **Framework**: NestJS (TypeScript)
- **Database**: MongoDB Atlas
- **Authentication**: JWT + bcrypt
- **Validation**: class-validator
- **Runtime**: Node.js v20+

### DevOps & Tools
- **Version Control**: Git
- **Package Manager**: npm/pnpm
- **Code Quality**: ESLint, Prettier
- **Build**: EAS Build (Expo Application Services)

## ✨ Features

### 🔐 Security Features
- **Zero-Knowledge Architecture**: End-to-end encryption
- **Argon2 Key Derivation**: Memory-hard password hashing
- **Secure Storage**: Device-level encryption for tokens
- **Auto-lock**: Session timeout protection
- **Master Password Validation**: 8-64 character limits with strength requirements

### 📱 Vault Management
- **Multiple Item Types**: Logins, Credit Cards, Secure Notes
- **Favorites System**: Star important items for quick access
- **Type Filtering**: Filter by Logins, Cards, or Notes
- **Search Functionality**: Real-time search across all vault items
- **Clone Items**: Duplicate entries with one tap
- **Trash System**: Soft delete with permanent deletion option

### 🌐 Login Items
- **Credential Storage**: Username, password, URL, notes
- **Favicon Fetching**: Automatic website icons from Google/DuckDuckGo
- **Password Generator**: (Planned feature)
- **Auto-fill Support**: (Planned feature)

### 💳 Credit Card Items
- **Card Management**: Number, holder name, expiry, CVV
- **Card Brand Detection**: Visa, Mastercard, Amex, etc.
- **Masked Display**: Secure display of sensitive data
- **Quick Copy**: One-tap copy to clipboard

### 📝 Secure Notes
- **Rich Text Storage**: Store sensitive text information
- **Markdown Support**: (Planned feature)
- **Attachments**: (Planned feature)

### 🎨 User Experience
- **Dark Mode**: Consistent dark theme throughout
- **Smooth Animations**: Platform-native transitions
- **Responsive Design**: Optimized for all screen sizes
- **Compact UI**: Efficient use of screen space
- **Custom Alerts**: Beautiful styled confirmation dialogs
- **Copy Feedback**: Visual confirmation on clipboard operations

### 🔄 Data Management
- **Real-time Sync**: Instant updates across devices
- **Offline Support**: View cached vault items offline
- **Favorites Section**: Separate section for starred items
- **Sort Options**: By name, date created, date modified
- **Batch Operations**: (Planned feature)

## 🏗 Architecture

### Zero-Knowledge Encryption Flow

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User enters Master Password                                │
│     ↓                                                          │
│  2. Argon2 Key Derivation (memory=64MB, iterations=3)         │
│     ↓                                                          │
│  3. Generate Encryption Key (256-bit)                          │
│     ↓                                                          │
│  4. Encrypt vault data with derived key                        │
│     ↓                                                          │
│  5. Send encrypted blob to server                             │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│                        SERVER SIDE                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  6. Receive encrypted data                                     │
│     ↓                                                          │
│  7. Store in MongoDB (no decryption possible)                  │
│     ↓                                                          │
│  8. Return encrypted blob to client                            │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                              │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  9. Decrypt with locally stored key                            │
│     ↓                                                          │
│  10. Display plaintext data to user                            │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Tech Stack Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App (Expo)                     │
├─────────────────────────────────────────────────────────┤
│  React Native + NativeWind + Expo Router                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Vault   │  │  Login   │  │  Detail  │             │
│  │  Screen  │  │  Screen  │  │  Screen  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │         Context Providers                  │         │
│  │  - AuthContext (JWT, user state)          │         │
│  │  - VaultContext (encrypted data)           │         │
│  │  - AlertContext (UI notifications)         │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │         Crypto Layer                       │         │
│  │  - Argon2 (key derivation)                │         │
│  │  - XOR encryption (demo)                   │         │
│  └────────────────────────────────────────────┘         │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTPS + JWT
                   │
┌──────────────────▼──────────────────────────────────────┐
│                   Backend API (NestJS)                   │
├─────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │   Auth     │  │   Vault    │  │   User     │        │
│  │  Module    │  │  Module    │  │  Module    │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│                                                          │
│  ┌────────────────────────────────────────────┐         │
│  │         Guards & Strategies                │         │
│  │  - JWT Strategy                            │         │
│  │  - JWT Auth Guard                          │         │
│  └────────────────────────────────────────────┘         │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│                   MongoDB Atlas                          │
├─────────────────────────────────────────────────────────┤
│  Collections:                                            │
│  - users (email, passwordHash)                    │
│  - vaults (userId, encryptedData)                       │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
PassX/
├── mobile-app/                   # Mobile Application
│   ├── app/                      # Expo Router (file-based routing)
│   │   ├── _layout.tsx          # Root layout with providers
│   │   ├── index.tsx            # Splash/redirect screen
│   │   ├── login.tsx            # Login screen
│   │   ├── signup.tsx           # Signup screen
│   │   └── vault/               # Vault screens
│   │       ├── index.tsx        # Main vault list
│   │       ├── add.tsx          # Add new item
│   │       ├── [id].tsx         # Item details
│   │       └── trash.tsx        # Trash/deleted items
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── VaultItemCard.tsx
│   │   │   └── CustomAlert.tsx
│   │   ├── context/             # Global state management
│   │   │   ├── AuthContext.tsx
│   │   │   ├── VaultContext.tsx
│   │   │   └── AlertContext.tsx
│   │   ├── crypto/              # Encryption utilities
│   │   │   ├── argon2.ts
│   │   │   ├── encryption.ts
│   │   │   └── vault.ts
│   │   ├── api/                 # API client
│   │   │   ├── auth.ts
│   │   │   ├── vault.ts
│   │   │   └── client.ts
│   │   ├── screens/             # Screen components
│   │   ├── types/               # TypeScript types
│   │   ├── utils/               # Utility functions
│   │   └── config/              # Configuration
│   ├── assets/                  # Images, fonts
│   ├── .env                     # Environment variables
│   ├── .env.example             # Environment template
│   ├── app.json                 # Expo configuration
│   ├── eas.json                 # EAS Build configuration
│   ├── tailwind.config.js       # Tailwind CSS config
│   └── package.json
│
├── backend/                      # NestJS Backend API
│   ├── src/
│   │   ├── auth/                # Authentication module
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── dto/
│   │   │   └── strategies/
│   │   ├── user/                # User module
│   │   │   ├── user.service.ts
│   │   │   └── schema/
│   │   ├── vault/               # Vault module
│   │   │   ├── vault.controller.ts
│   │   │   ├── vault.service.ts
│   │   │   ├── dto/
│   │   │   └── schema/
│   │   ├── common/              # Shared code
│   │   │   ├── decorators/
│   │   │   └── guards/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env                     # Environment variables
│   ├── .env.example             # Environment template
│   ├── nest-cli.json
│   ├── tsconfig.json
│   └── package.json
│
└── README.md                     # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20.19.4 or higher
- **npm** or **pnpm**: Latest version
- **MongoDB Atlas**: Free tier account
- **Expo Go** (for mobile testing): Install from [App Store](https://apps.apple.com/app/expo-go/id982107779) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **Android Studio** (optional, for APK builds): For local Android builds
- **EAS CLI** (optional): For cloud builds with `npm install -g eas-cli`

### Installation & Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/Souvik-Cyclic/PassX.git
cd PassX
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
# or
pnpm install

# Create environment file
cp .env.example .env
```

**Configure `.env` file:**

```env
PORT=3000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net
MONGO_DB_NAME=passx
JWT_SECRET=<generate-secure-random-string>
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Set up MongoDB Atlas:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create database user with password
4. Whitelist your IP (or 0.0.0.0/0 for development)
5. Get connection string and update `MONGO_URI`

**Start the backend:**
```bash
npm run start:dev
# or
pnpm start:dev
```

Backend should now be running on `http://localhost:3000`

#### 3. Frontend Setup

Open a new terminal:

```bash
# Navigate to app directory
cd mobile-app

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

**Configure `.env` file:**

For local development:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

For testing on physical device, use ngrok or your computer's IP:
```bash
# Install ngrok
npm install -g ngrok

# In a new terminal, tunnel to your backend
ngrok http 3000

# Copy the https URL and update .env
EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.app
```

**Start the app:**
```bash
npm start
# or
npx expo start
```

#### 4. Running on Device/Emulator

**Option A: Expo Go (Recommended for testing)**
1. Install Expo Go on your phone
2. Scan the QR code from the terminal
3. App will load on your device

**Option B: Android Emulator**
```bash
# Press 'a' in the Expo terminal
# or
npm run android
```

**Option C: iOS Simulator (Mac only)**
```bash
# Press 'i' in the Expo terminal
# or
npm run ios
```

**Option D: Build APK (for distribution)**
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Build APK
eas build --platform android --profile preview

# Download APK from provided link after build completes
```

### Quick Start Summary

```bash
# Terminal 1: Backend
cd backend
npm install
cp .env.example .env
# Configure .env with MongoDB URI and JWT secret
npm run start:dev

# Terminal 2: Frontend
cd mobile-app
npm install
cp .env.example .env
# Configure .env with API URL
npm start

# Terminal 3 (optional): ngrok for device testing
ngrok http 3000
```

## 📚 API Documentation

For complete API documentation with interactive testing, visit:

**[https://passx-0ekh.onrender.com/docs](https://passx-0ekh.onrender.com/docs)**

The documentation includes:
- All authentication endpoints (signup, login)
- Vault CRUD operations
- Request/response schemas
- Try-it-out functionality
- Error response codes

## 🔒 Security Features

### Encryption Implementation

**Client-Side Encryption Process:**

1. **Master Password → Encryption Key**
   ```typescript
   const key = await argon2.hash(masterPassword, {
     memory: 64 * 1024, // 64 MB
     iterations: 3,
     parallelism: 1,
     hashLength: 32
   });
   ```

2. **Data Encryption**
   ```typescript
   const encryptedData = encryptVaultData(plaintextData, key);
   ```

3. **Server Storage**
   - Only encrypted blob is transmitted
   - JWT token for authentication (separate from encryption)
   - No plaintext data on server

### Security Best Practices Implemented

- ✅ **Password Requirements**: 8-64 characters with validation
- ✅ **JWT Expiration**: 10-day token lifetime
- ✅ **Secure Storage**: Device-level encryption for tokens
- ✅ **HTTPS Only**: All production traffic encrypted in transit
- ✅ **No Password Logging**: Sensitive data never logged
- ✅ **Memory-Hard KDF**: Argon2 prevents brute-force attacks

### Known Limitations

⚠️ **No biometric authentication yet**
- Planned: Touch ID / Face ID support
- Planned: PIN fallback option

⚠️ **No password sharing**
- Planned: Secure sharing via public key cryptography

## 🖼 Screenshots

### 📹 Demo Video

<div align="center">
  <a href="https://youtu.be/TP1vjZ0ZI7g">
    <img src="https://img.youtube.com/vi/TP1vjZ0ZI7g/maxresdefault.jpg" alt="PassX Demo Video" width="600"/>
  </a>
  <p><a href="https://youtu.be/TP1vjZ0ZI7g">▶️ Watch Demo on YouTube</a></p>
</div>

### Authentication Screens

<div align="center">
  <img src="mobile-app/assets/screenshots/passx-login-screen.jpeg" alt="Login Screen" width="250"/>
  <img src="mobile-app/assets/screenshots/passx-signup-screen.jpeg" alt="Signup Screen" width="250"/>
</div>

### Vault Management

<div align="center">
  <img src="mobile-app/assets/screenshots/passx-main-screen.jpeg" alt="Main Vault Screen" width="250"/>
  <img src="mobile-app/assets/screenshots/passx-login.jpeg" alt="Login Item Details" width="250"/>
  <img src="mobile-app/assets/screenshots/passx-note.jpeg" alt="Secure Note" width="250"/>
</div>

### Add New Items

<div align="center">
  <img src="mobile-app/assets/screenshots/passx-add-item.jpeg" alt="Add Item Menu" width="250"/>
  <img src="mobile-app/assets/screenshots/passx-add-login.jpeg" alt="Add Login Form" width="250"/>
  <img src="mobile-app/assets/screenshots/passx-add-card.jpeg" alt="Add Card Form" width="250"/>
</div>

### Trash & Alerts

<div align="center">
  <img src="mobile-app/assets/screenshots/passx-trash.jpeg" alt="Trash Screen" width="250"/>
  <img src="mobile-app/assets/screenshots/passx-alert.jpeg" alt="Custom Alert" width="250"/>
</div>

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Write TypeScript types for all functions
- Update documentation for new features
- Keep zero-knowledge architecture intact

## 📝 Future Roadmap

### Security Enhancements
- [ ] AES-GCM encryption implementation
- [ ] Biometric authentication (Touch ID/Face ID)
- [ ] Two-factor authentication (2FA)
- [ ] Security audit mode

### Features
- [ ] Password generator with customization
- [ ] Password strength meter
- [ ] Breach detection integration
- [ ] Auto-fill support for mobile browsers
- [ ] Import/export functionality
- [ ] Secure password sharing
- [ ] Multi-device sync improvements
- [ ] Offline mode enhancements

### User Experience
- [ ] Light mode theme
- [ ] Custom categories/tags
- [ ] Advanced search filters
- [ ] Batch operations
- [ ] Backup & restore
- [ ] Browser extension

### Platform Expansion
- [ ] Web application
- [ ] Desktop applications (Windows, macOS, Linux)
- [ ] Browser extensions (Chrome, Firefox, Safari)

## 🐛 Known Issues

- Large vault items (>100 items) may have slower initial load
- XOR encryption is for demonstration only and will be replaced with AES-GC

## 👨‍💻 Author

**Souvik Kumar**  
GitHub: [https://github.com/Souvik-Cyclic/PassX](https://github.com/Souvik-Cyclic/PassX)

## 🙏 Acknowledgments

- Expo team for amazing mobile development platform
- NestJS team for excellent backend framework
- React Native community for components and libraries
- MongoDB Atlas for database hosting

---

<div align="center">
  <p>Built with ❤️ for security and privacy</p>
  <p>⭐ Star this repo if you find it useful!</p>
</div>
