# E-Learning Platform

## Overview
This project is an e-learning platform that provides an interactive and user-friendly way to access educational content. It integrates the YouTube API to fetch and display video courses while utilizing MongoDB as the backend for data storage.

## Features
- **User Authentication**: Secure login and registration system.
- **Video Courses**: Fetch and display educational videos using the YouTube API.
- **User Dashboard**: Personalized dashboard for users to track their learning progress.
- **Community Forum**: Users can discuss topics and share insights.
- **Responsive UI**: Designed with Bootstrap for a seamless experience across devices.

## Live Demo
The platform is live and accessible at:  
👉 [https://e-learning-platform-jtmk.onrender.com](https://e-learning-platform-jtmk.onrender.com)

## Tech Stack
- **Frontend**: HTML, CSS (Bootstrap), JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **API Integration**: YouTube API

## Installation

### Prerequisites
Ensure you have the following installed:
- Node.js
- MongoDB

### Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/natekark/e-learning-platform.git
   cd e-learning-platform
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file in the root directory.
   - Add the following:
     ```env
     MONGO_URI=your_mongodb_connection_string
     YOUTUBE_API_KEY=your_youtube_api_key
     SESSION_SECRET=your_session_secret_key
     PORT=3000
     ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage
- Sign Up/Login to access the platform.
- Browse through available courses.
- Watch video lessons and track progress.
- Participate in discussions within the community forum.

## Screenshots
### Homepage
![Homepage](screenshots/homepage.png)  
*Homepage of the E-Learning Platform*

## Roadmap
- Add quizzes and assessments for courses.
- Implement a payment gateway for premium courses.
- Enhance the community forum with upvoting and tagging features.

## Contribution
Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit changes and push:
   ```bash
   git commit -m "Add new feature"
   git push origin feature-name
   ```
4. Open a Pull Request.

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

## Acknowledgments
- YouTube API for providing video content.
- Bootstrap for the responsive UI design.
- Render for hosting the platform.

## Contact
For any queries or suggestions, feel free to reach out via GitHub Issues.
