# FinMind AI

Intelligent Personal Finance Chatbot — Hackathon Edition

## Stack

- **Frontend**: React.js + Recharts + React Router
- **Backend**: Node.js + Express + MongoDB
- **AI Layer**: Ollama (Mistral 7B) — runs locally, free, no API key
- **Simulation Engine**: Python + FastAPI

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB Atlas account (free tier)
- Ollama installed with Mistral pulled (`ollama pull mistral`)

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/finmind-ai.git
cd finmind-ai
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your MongoDB URI in .env
npm run dev
```

### 3. Simulation engine setup

```bash
cd simulation
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Frontend setup

```bash
cd frontend
npm install
npm start
```

### 5. Start Ollama

```bash
ollama serve
```

## Ports

| Service             | Port  |
| ------------------- | ----- |
| Frontend            | 3000  |
| Backend (Node)      | 3001  |
| Simulation (Python) | 8000  |
| Ollama              | 11434 |

## Demo Features (Hackathon Build)

- Conversational expense & savings logging
- Dashboard with spending charts
- Goals creation via chatbot
- What-if EMI simulator
- Personalized financial literacy cards
- Persistent chat history
