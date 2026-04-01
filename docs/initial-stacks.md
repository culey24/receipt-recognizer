# Initial stack for receipt recognizer project
- For frontend: Use REACT (Vite + Tailwind CSS) for vibe coding term of use
- For backend: With OCR/NLP reqs, Python is a must-have, together with FastAPI to create backend APIs.
## Frontend (Typescript)
- React + Vite + TailwindCSS: Vibe code
## Backend (Python)
- For database: Uses MongoDB
- Architecture: Microservices + Event-driven (async)
- Design patterns: (List, not categorized yet for different modules)
	- Publisher-Subscriber for Event-driven based
	- Saga Pattern
	- Strategy pattern: Changes OCR strategies
	- Adapter pattern: Changes different JSON files into unified JSON for database/API calls (open router api)
	- Producer-Consumer pattern: creates a queue for workers
	- Batch processing.
- Tools/Frameworks:
	- FastAPI: for API calling.
	- Pydantic: this bro have schema validating real good shit.
	- Logging: Dont forget this.
	- Tracing: Use sentry to get runtime error and notifies sysadmin (IDK wat this is).
	- Docker/Docker-compose for deployment.
	- Rate Limiting module.
	- Authenticating module (JWT).


