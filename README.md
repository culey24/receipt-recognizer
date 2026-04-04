# Backend
cd /Users/hieu/Desktop/CBAM/receipt-recognizer-main/backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000


# Frontend
cd /Users/hieu/Desktop/CBAM/receipt-recognizer-main/frontend
npm install
cp .env.example .env
# make sure .env contains:
# VITE_API_BASE_URL=http://localhost:8000
npm run dev

