# Environment Variables

> All environment variables across all services.
> Generated: 2026-03-17 | Updated: 2026-03-17 (Phase 11)

---

## 1. LMS Backend (NestJS)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`) |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `REDIS_URL` | **Yes** | — | Redis connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (min 16 chars) |
| `JWT_ACCESS_TTL` | No | `900` | Access token TTL in seconds |
| `JWT_REFRESH_TTL` | No | `604800` | Refresh token TTL in seconds (7 days) |
| `STRIPE_SECRET_KEY` | **Yes** | — | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | — | Stripe webhook signing secret |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `FRONTEND_URL` | No | `http://localhost:5173` | Frontend URL (for email links, cookie domain) |
| `EMAIL_PROVIDER` | No | `console` | Email provider (`console` or `sendgrid`) |
| `EMAIL_FROM` | No | `noreply@brickskill.com` | Sender email address |
| `SENDGRID_API_KEY` | If sendgrid | — | SendGrid API key |
| `STORAGE_PROVIDER` | No | `local` | Storage backend (`local` or `s3`) |
| `STORAGE_LOCAL_DIR` | No | `./uploads` | Local upload directory |
| `S3_BUCKET` | If s3 | — | S3 bucket name |
| `S3_REGION` | No | `eu-west-1` | S3 region |
| `AI_SERVICE_URL` | No | `http://localhost:8000` | Python AI service URL |

All variables are validated at startup via Joi. The app will fail to start if required variables are missing.

---

## 2. AI Course Generator (Python FastAPI)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | **Yes** | — | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4-turbo` | GPT model |
| `DALLE_MODEL` | No | `dall-e-3` | DALL-E model |
| `DALLE_SIZE` | No | `1024x1024` | Image size |
| `DALLE_QUALITY` | No | `standard` | Image quality |
| `TTS_MODEL` | No | `tts-1` | Text-to-speech model |
| `TTS_VOICE` | No | `alloy` | TTS voice |
| `TTS_RESPONSE_FORMAT` | No | `mp3` | Audio format |
| `MONGODB_URI` | No | `mongodb://localhost:27017` | MongoDB connection URI |
| `MONGODB_DATABASE` | No | `ai_course_generator` | MongoDB database name |
| `MONGODB_COLLECTION` | No | `courses` | Course collection name |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis URL |
| `GENERATED_COURSES_DIR` | No | `./Generated_Courses` | Generated content output directory |
| `LOG_LEVEL` | No | `INFO` | Log level |
| `WORKER_CONCURRENT_JOBS` | No | `3` | Max concurrent worker jobs |
| `WORKER_MAX_MEMORY_MB` | No | `1024` | Worker memory limit |
| `MEDIA_THREAD_POOL_SIZE` | No | `6` | Thread pool for media generation |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins |
| `ENVIRONMENT` | No | `development` | Environment mode |

---

## 3. Frontend (React/Vite)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `/` (prod) | API base URL |

In development, `vite.config.ts` proxies `/api` to the backend and `/api/course-generator` to the Python service.

---

## 4. Infrastructure (Docker Compose)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_DB` | No | `lms_db` | PostgreSQL database name |
| `POSTGRES_USER` | No | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | **Yes** (prod) | `postgres` | PostgreSQL password |
| `JWT_SECRET` | **Yes** | — | Shared JWT secret for backend |
| `STRIPE_SECRET_KEY` | **Yes** | — | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | — | Stripe webhook secret |
| `FRONTEND_URL` | No | `https://lms.xeltecdev.com` | Frontend URL |
| `CORS_ORIGIN` | No | `https://lms.xeltecdev.com` | CORS origins |

---

## 5. Environment Files

| File | Purpose |
|------|---------|
| `.env` (root) | Shared by Docker Compose and Python AI service |
| `lms-backend/.env` | NestJS backend (used in local dev) |
| `.env.example` (root) | Template — copy to `.env` |
| `lms-backend/.env.example` | Template — copy to `lms-backend/.env` |

Both `.env.example` files are committed to the repository. Actual `.env` files are gitignored.
