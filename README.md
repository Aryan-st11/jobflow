# 🚀 JobFlow — Smart Job Application Tracker

Full-stack job tracker with Gmail auto-sync, AI email parsing, and automated status detection.

## Project Structure
```
jobflow/
├── backend/         ← Node.js + Express API
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── middleware/
└── frontend/        ← Plain HTML/CSS/JS
    ├── index.html
    └── js/api.js
```

## Local Setup
```bash
cd backend
npm install
cp .env.example .env   # fill in your keys
npm run dev
# Open frontend/index.html with Live Server
```

## Deploy
- Backend → Railway (set root dir to /backend)
- Frontend → Netlify (drag & drop frontend folder)

## Environment Variables
- MONGODB_URI
- SESSION_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- OPENAI_API_KEY
- FRONTEND_URL
