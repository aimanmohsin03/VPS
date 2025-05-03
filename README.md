# Virtual Proctoring System

A web-based virtual proctoring system that monitors students during online tests using computer vision techniques.

## Features

- User authentication (login/register)
- Real-time webcam monitoring
- Suspicious activity detection
- Test session management
- Dashboard for test history

## Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn

## Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask server:
   ```bash
   python app.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Register a new account or login with existing credentials
3. Start a new test session
4. The system will monitor your webcam feed for suspicious activities
5. End the test when finished

## Security Notes

- The system uses JWT for authentication
- Webcam access requires user permission
- All sensitive data is encrypted
- Regular security updates are recommended

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 