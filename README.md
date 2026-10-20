# ResuMax – AI-Powered ATS Resume Analyzer

## Overview
ResuMax is an AI-powered resume analysis platform designed to help job seekers improve their resumes for Applicant Tracking Systems (ATS). It analyzes resumes against job descriptions, generates an ATS compatibility score, identifies missing keywords, and provides AI-powered recommendations for improvement.

## Features
- **ATS Score Analysis:** Evaluates resume compatibility with a job description.
- **Resume Analysis Report:** Highlights strengths, missing keywords, and areas for improvement.
- **AI-Powered Resume Chatbot:** Provides resume-related guidance and answers user queries.
- **Downloadable Reports:** Allows users to download their resume analysis results.
- **User Authentication:** Supports OTP-based login and Google Sign-In.
- **Resume Improvement:** Provides actionable suggestions to improve resume quality and job relevance.

## Tech Stack
- **Frontend:** EJS, HTML, CSS, JavaScript, Bootstrap
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **AI Integration:** Gemini API
- **Authentication:** Passport.js, OTP-based authentication, Google OAuth
- **File and Media Management:** Cloudinary, if used in your implementation

## How It Works
1. Users sign in using the available authentication methods.
2. Users upload their resume and provide a relevant job description.
3. ResuMax analyzes the resume and calculates an ATS compatibility score.
4. The platform generates a report with missing keywords and improvement suggestions.
5. Users can download the report and use the AI chatbot for further resume guidance.

## Installation and Setup

### 1. Clone the Repository
```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_PROJECT_FOLDER>
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root and configure the variables required by your application, such as:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Add any additional variables required for OTP delivery, session management, and Cloudinary if your application uses them.

### 4. Start the Application
```bash
npm start
```

Use the actual start command defined in your `package.json` if it differs.

## Future Improvements
- Improve ATS scoring with more comprehensive evaluation criteria.
- Support multiple resume formats and job descriptions.
- Add resume version management and comparison.
- Provide more personalized job-specific recommendations.

## Author
**Miral Abhangi**

- GitHub: [miralabhangi13](https://github.com/miralabhangi13)
- LinkedIn: [Miral Abhangi](https://www.linkedin.com/in/miral-abhangi-a17b54391/)
