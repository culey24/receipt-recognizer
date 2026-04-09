# Backend
```sh
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```
or run with DOCKER:
```sh
cd backend
docker compose up -d --build
```

# Frontend
```sh
cd frontend
npm install
cp .env.example .env
npm run dev
```

# Deployment
- Frontend: Deploy with VERCEL