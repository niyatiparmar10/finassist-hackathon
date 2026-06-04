# FinAssist AI

### Intelligent Personal Finance Assistant using AI and Financial Simulation

🏆 Winner – Crescendo'26 Hackathon

FinAssist AI is a full-stack personal finance platform that helps users track expenses, manage savings, plan goals, analyze spending behavior, and simulate financial decisions using natural language.

The system combines a React frontend, Node.js backend, MongoDB database, Python FastAPI simulation engine, and a locally hosted Mistral LLM through Ollama. Users can interact conversationally with the platform while receiving reliable financial insights backed by deterministic calculations rather than AI-generated arithmetic.

A key design principle of the project is the separation of AI and financial computation. All calculations such as EMI affordability, SIP projections, investment growth, and financial health analysis are performed by a dedicated Python simulation engine, while the LLM is used only for generating explanations and conversational responses.

---

# Screenshots

## Dashboard Overview

![Dashboard](screenshots/dashboard1.png)
![Dashboard](screenshots/dashboard2.png)

---

## Conversational Expense Logging

![Chatbot](screenshots/chat1.png)
![Chatbot](screenshots/chat2.png)

---

## Expense Analytics

![Expenses](screenshots/expenses1.png)
![Expenses](screenshots/expenses2.png)

---

## Savings Tracking

![Goals](screenshots/savings.png)

---

## Goal Tracking

![Goals](screenshots/goals.png)

---

## Investment Simulation

![Investments](screenshots/investments.png)

---

## Personalized Financial Cards

![Insights](screenshots/cards.png)
![Insights](screenshots/cards1.png)

---

# System Architecture

```mermaid
graph TD
    User([User])
    User --> FE[React Frontend]

    FE --> BE[Node.js + Express Backend]

    BE --> DB[(MongoDB)]

    BE --> SIM[Python FastAPI Simulation Engine]

    BE --> LLM[Ollama + Mistral LLM]
```

### Request Flow

1. User sends a message through the chat interface.
2. Backend detects intent using a rule-based parser.
3. Structured information such as amount, category, and action is extracted.
4. Relevant data is stored in MongoDB.
5. If calculations are required, the backend calls the Python simulation engine.
6. Financial profile is updated using expenses, savings, goals, and income.
7. Results are passed to the local LLM for natural language explanation.
8. Response is returned to the frontend and visualizations update automatically.

---

# Core Features

### Conversational Finance Tracking

- Natural language expense logging
- Savings tracking
- Goal creation through chat
- Context-aware conversation history

### Financial Simulations

- EMI affordability analysis
- SIP return projections
- Fixed Deposit calculations
- Expense reduction impact analysis

### Financial Planning

- Goal feasibility analysis
- Savings progress tracking
- Personalized recommendations
- Financial health scoring

### Intelligent Insights

- Spending behavior analysis
- Category-wise breakdowns
- Monthly trends
- AI-generated educational finance cards

### Productivity Tools

- Financial to-do list
- Payment reminders
- Collection reminders
- Money management tasks

### Security

- JWT authentication
- Password hashing using bcrypt
- Rate limiting
- NoSQL injection protection
- XSS protection
- Secure token refresh mechanism

---

# Tech Stack

### Frontend

- React.js
- React Router
- Axios
- Recharts
- CSS

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose

### AI Layer

- Ollama
- Mistral 7B

### Simulation Layer

- Python
- FastAPI
- Pydantic

### Security

- JWT
- bcrypt
- Helmet
- express-mongo-sanitize
- xss-clean

---

# Environment Variables

Before running the project, create a `.env` file inside the `backend` directory.

A sample configuration is already provided in `.env.example`.

Copy the example file and replace the placeholder values with your own credentials:

```bash
cp .env.example .env
```

Update the variables as follows:

```env
PORT=3001
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/finmind
JWT_SECRET=replace_this_with_any_long_random_string
OLLAMA_URL=http://localhost:11434
SIMULATION_URL=http://localhost:8000
```

### Variable Description

| Variable         | Purpose                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `PORT`           | Port on which the Node.js backend will run                                                   |
| `MONGODB_URI`    | MongoDB Atlas connection string used for storing user, expense, savings, goal, and chat data |
| `JWT_SECRET`     | Secret key used for signing and verifying JWT authentication tokens                          |
| `OLLAMA_URL`     | URL of the locally running Ollama server hosting the Mistral model                           |
| `SIMULATION_URL` | URL of the FastAPI simulation engine responsible for financial calculations                  |

### Required Services

To run the project successfully, you will need:

- A MongoDB Atlas account (or local MongoDB instance)
- Ollama installed locally with the Mistral model downloaded
- Python FastAPI simulation engine running on port `8000`
- Node.js (v18+)

Example:

```bash
ollama serve
ollama pull mistral
```

Once these services are running and the environment variables are configured, you can start the backend, simulation engine, and frontend.

# Installation

## Clone Repository

```bash
git clone <your-repository-url>
cd FinAssist
```

## Backend

```bash
cd backend
npm install
npm run dev
```

## Simulation Engine

```bash
cd simulation

python -m venv venv

# Windows
venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload
```

## Frontend

```bash
cd frontend
npm install
npm start
```

---

# Future Improvements

- Bank account integration
- Automated transaction categorization
- Advanced investment recommendations
- Mobile application
- Multi-language support
- Personalized budgeting plans

---

# Project Highlights

✅ Conversational Finance Assistant

✅ Hybrid AI + Deterministic Simulation Architecture

✅ Local LLM Integration using Ollama

✅ Financial Goal Planning and Tracking

✅ Real-Time Analytics Dashboard

✅ Secure Authentication and Data Handling

✅ Winner – Crescendo'26 Hackathon
