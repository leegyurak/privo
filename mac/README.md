# Privo - Secure Messaging Desktop App

A beautiful, Telegram-inspired secure messaging desktop app built with Electron and React for macOS.

## 🚀 Features

- **Stunning Splash Screen**: Lock animation with smooth transitions
- **Modern UI/UX**: Telegram-inspired design with beautiful gradients
- **Secure Messaging**: End-to-end encryption with AES-GCM
- **Real-time Chat**: WebSocket-based instant messaging
- **User Authentication**: JWT-based secure login/registration
- **Animated Components**: Smooth animations throughout the app
- **Native macOS App**: Built with Electron for native desktop experience
- **macOS Integration**: Window controls, vibrancy effects, and native menus

## 📱 Screenshots

### Splash Screen
- Animated lock icon with "click" effect
- Smooth gradient background
- Loading animation with dots

### Login Screen
- Modern gradient design
- Animated form elements
- Password visibility toggle
- Smooth transitions between login/register

### Chat List
- Real-time typing indicators
- Online status indicators
- Unread message counts
- Search functionality
- Pull-to-refresh

### Chat Screen
- Telegram-style message bubbles
- Read/delivery status indicators
- Typing indicator animations
- Message encryption/decryption
- Media attachment support (planned)

## 🛠️ Tech Stack

- **Desktop Framework**: Electron 25
- **Frontend**: React 18 with React Router
- **Styling**: Styled Components
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Storage**: LocalStorage (with future secure storage planned)
- **Encryption**: CryptoJS with AES-GCM
- **Backend Integration**: REST API + WebSocket
- **Build System**: React Scripts + Electron Builder

## 📋 Requirements

- Node.js 16+
- macOS 10.12+ (for development and running the app)
- Privo Backend Server running on localhost:8081

## 🚀 Installation & Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development mode**:
   ```bash
   npm run electron-dev
   ```
   This will start both the React dev server and Electron app.

   **⚠️ Note:**
   - Running `npm run electron` alone starts Electron without the React dev server, leading to `ERR_CONNECTION_REFUSED` at `http://localhost:3000/`.
   - During development, always use `npm run electron-dev` (or build first via `npm run build` before `npm run electron`).

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Package as macOS app**:
   ```bash
   npm run electron-pack
   ```
   This creates `.dmg` and `.zip` files for both Intel and Apple Silicon Macs in the `dist/` folder.

## 🔧 Configuration

### Backend Connection
The app connects to your Privo backend server at `localhost:8081`. Make sure the backend is running before using the app.

### Environment Setup
Create a `.env` file (optional) to customize settings:
```
API_BASE_URL=http://localhost:8081
WS_BASE_URL=ws://localhost:8081/ws/chat
```

## 🎨 Design System

### Colors
- **Primary**: #667eea → #764ba2 (gradient)
- **Background**: #f0f2f5
- **Surface**: #ffffff
- **Text Primary**: #333333
- **Text Secondary**: #666666
- **Success**: #4ade80
- **Online**: #10b981

### Typography
- **Font Family**: Inter (Regular, Medium, SemiBold, Bold)
- **Primary Text**: 16px
- **Secondary Text**: 14px
- **Caption**: 12px

### Animations
- **Duration**: 300ms (standard), 600ms (entrance)
- **Easing**: Expo.out, Spring physics
- **Gestures**: Pan, Swipe, Pinch (planned)

## 🔒 Security Features

### Encryption
- **Algorithm**: AES-GCM 256-bit
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Perfect Forward Secrecy**: Planned
- **Message Integrity**: Built-in authentication

### Authentication
- **JWT Tokens**: Secure session management
- **Token Storage**: Encrypted AsyncStorage
- **Auto-refresh**: Planned
- **Biometric Auth**: Planned

## 📡 Backend Integration

### REST API Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `GET /api/chat/rooms` - Get chat rooms
- `POST /api/chat/rooms` - Create chat room
- `GET /api/chat/rooms/{id}/messages` - Get messages
- `POST /api/chat/rooms/{id}/messages` - Send message
- `POST /api/chat/direct-messages` - Send direct message

### WebSocket Events
- `subscribe` - Subscribe to chat room updates
- `unsubscribe` - Unsubscribe from chat room
- `message` - New message received
- `typing` - Typing indicator
- `user_status` - Online/offline status

## 🧪 Testing

```bash
# Run tests (when available)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🚢 Deployment

### Build for Production
```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android

# Build for Web
expo build:web
```

### App Store Deployment
1. Configure app.json with proper bundle identifiers
2. Set up signing certificates
3. Build and submit through Expo or EAS Build

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by Telegram's beautiful UI/UX
- Built with love using React Native and Expo
- Icons by Expo Vector Icons
- Animations powered by React Native Reanimated

---

Made with ❤️ by the Privo Team
