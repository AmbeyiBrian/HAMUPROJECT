# Hamu Mobile Application

A React Native/Expo mobile application for the Hamu water management system. This mobile app serves as a companion tool for field staff managing water delivery operations.

## Overview

Hamu Mobile provides field staff with the tools they need to handle water deliveries, manage customer interactions, record sales, and track inventory while on the go. The application works offline with data synchronization capabilities to ensure operations can continue even with intermittent connectivity.

## Features

- **User Authentication**: Secure staff login system
- **Customer Management**: View and update customer information
- **Sales Processing**: Record sales transactions in the field
- **Inventory Tracking**: Monitor water bottles and other stock items
- **Expense Recording**: Log business expenses on the go
- **Meter Reading**: Capture and record water meter readings
- **Refill Management**: Process and track water refill operations
- **Credit Handling**: Manage customer credit and payment collection
- **Offline Functionality**: Work without constant internet connectivity
- **Data Synchronization**: Auto-sync when connection is restored

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: JavaScript/TypeScript
- **State Management**: React Context API & AsyncStorage
- **UI Components**: Native Base
- **Maps**: React Native Maps
- **Forms**: Formik with Yup validation

## Setup Instructions

### Prerequisites

- Node.js 14+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator
- Expo Go app on physical devices for testing

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AmbeyiBrian/hamu_mobile.git
   cd hamu_mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file in the project root
   - Add the following variables:
     ```
     API_URL=http://your-api-server.com
     ```

4. Start the development server:
   ```bash
   npx expo start
   ```

5. Use the Expo Go app to scan the QR code, or run on an emulator/simulator with the options provided in the terminal

## Available Scripts

- `npx expo start` - Start the Expo development server
- `npx expo start --android` - Start the app on Android emulator
- `npx expo start --ios` - Start the app on iOS simulator
- `npx expo start --web` - Start the app in a web browser
- `npx expo build:android` - Build Android APK/App Bundle
- `npx expo build:ios` - Build iOS archive

## Deployment

### Expo Build (Recommended)

1. Configure app.json with appropriate settings
2. Build for the target platform:
   ```bash
   npx expo build:android
   # or
   npx expo build:ios
   ```

3. Follow the Expo build prompts

### EAS Build (Advanced)

For more control over the build process, consider using EAS Build:

```bash
npm install -g eas-cli
eas build --platform all
```

## Integration with Backend

This mobile application works in conjunction with the [Hamu Backend](https://github.com/AmbeyiBrian/hamu_backend) API. Ensure the backend server is running and properly configured for full functionality.

## License

This project is proprietary and is not licensed for public use or distribution without explicit permission.
