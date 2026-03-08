automation/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Settings/env vars
│   ├── api/
│   │   ├── __init__.py
│   │   ├── file_upload.py      # File processing endpoints
│   │   └── chat.py             # Chat endpoints
│   ├── services/
│   │   ├── file_processor.py   # CSV/PDF/Excel logic
│   │   ├── llm_service.py      # Claude/GPT integration
│   │   ├── text_to_sql.py      # SQL generation
│   │   └── rag_service.py      # Vector store + retrieval
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   └── db/
│       └── database.py         # SQLAlchemy setup
├── requirements.txt
├── Dockerfile
└── docker-compose.yml


requirements.txt
# Core Framework
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.0

# AI/LLM
anthropic==0.18.0
langchain==0.1.0
langchain-community==0.0.10
sentence-transformers==2.3.1

# Vector Stores (choose one or multiple)
chromadb==0.4.22
# pinecone-client==3.0.0
# qdrant-client==1.7.0

# File Processing
pandas==2.2.0
openpyxl==3.1.2
pdfplumber==0.10.3
python-multipart==0.0.6  # for file uploads

# Database
sqlalchemy==2.0.25
psycopg2-binary==2.9.9  # or your DB driver

# HTTP
httpx==0.26.0

# Utilities
python-dotenv==1.0.0
```