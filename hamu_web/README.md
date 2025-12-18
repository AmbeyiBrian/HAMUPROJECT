# Hamu Web Application

A React-based web application for the Hamu water management system. This web portal provides a comprehensive administrative interface for managing water delivery business operations.

## Overview

Hamu Web provides a user-friendly interface for administrators, shop managers, and staff to manage all aspects of water delivery business operations. The application communicates with the Hamu Backend API to provide real-time data visualization, customer management, sales tracking, and inventory management.

## Features

- **Dashboard**: Real-time overview of business metrics and KPIs
- **Customer Management**: Manage customer accounts and view transaction history
- **Sales Management**: Process and track sales transactions
- **Inventory Control**: Track water bottles and other stock items
- **Reports & Analytics**: Generate detailed business reports and visualizations
- **User Management**: Administration of system users and permissions
- **Refill Tracking**: Manage water refill operations and scheduling
- **Credit System**: Track customer credits and payment information
- **Expense Management**: Record and categorize business expenses
- **Multi-shop Support**: Centralized management of multiple shop locations

## Tech Stack

- **Framework**: React with TypeScript
- **UI Library**: Material-UI
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Forms**: Formik with Yup validation

## Setup Instructions

### Prerequisites

- Node.js 14+ and npm
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AmbeyiBrian/hamu_web.git
   cd hamu_web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Create a `.env.local` file in the project root
   - Add the following variables:
     ```
     REACT_APP_API_URL=http://localhost:8000
     ```

4. Start the development server:
   ```bash
   npm start
   ```

5. The application will be available at http://localhost:3000

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Runs tests
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the contents of the `build` directory to your web server or hosting platform of choice.

## Integration with Backend

This web application works in conjunction with the [Hamu Backend](https://github.com/AmbeyiBrian/hamu_backend) API. Ensure the backend server is running and properly configured for full functionality.

## License

This project is proprietary and is not licensed for public use or distribution without explicit permission.
