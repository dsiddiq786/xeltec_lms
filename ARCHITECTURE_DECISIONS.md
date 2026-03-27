# Architecture Decisions

> Phase 0 deliverable — final architecture decisions for the unified LMS.
> Generated: 2026-03-17

---

## 1. Frontend Architecture

### Decision: Unified React SPA in `lms-frontend/`

**Rationale:** `lms-frontend/` is the canonical frontend. It has the correct design language (brickSkill theme: teal #004D40, lime #CBFF00, dark #1a1f25), modern stack (React 19, Vite 7, Tailwind 4, React Query 5), and the most complete page coverage.

**What happens to `ui/`:**
- `ui/` is NOT deleted but is treated as **reference-only**
- All useful business logic (AI course editor, generation form, job polling, preview player) is extracted and migrated into `lms-frontend/` under `/admin/ai-course-generator/*`
- The visual design of migrated components adopts the brickSkill design language
- After migration is verified complete, `ui/` can be archived

### Final Frontend Structure

```
lms-frontend/src/
├── app/
│   ├── App.tsx                    # Root component, providers, router
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles
├── features/
│   ├── auth/
│   │   ├── components/            # LoginForm, RegisterForm, ForgotPasswordForm
│   │   ├── pages/                 # LoginPage, RegisterPage, AdminLoginPage
│   │   ├── hooks/                 # useAuth
│   │   └── api/                   # auth API calls
│   ├── public/
│   │   ├── pages/                 # HomePage, CoursesPage, CourseDetailPage
│   │   └── components/            # Hero, CourseCard, FAQ, etc.
│   ├── learner/
│   │   ├── pages/                 # LearnerDashboard, CertificatesPage, ProfilePage
│   │   └── components/            # EnrollmentCard, ProgressBar
│   ├── player/
│   │   ├── pages/                 # CoursePlayer
│   │   └── components/            # SlideViewer, ExerciseSlide, VideoSlide, AssessmentView, ContentSidebar, SpeedControl
│   ├── business/
│   │   ├── pages/                 # BusinessDashboard, ExploreCourses, ManageCourses, ManageSeats, SubscriptionManagement
│   │   ├── components/            # EmployeeTable, SeatManager, ProgressModal
│   │   └── api/
│   ├── admin/
│   │   ├── pages/                 # AdminDashboard, CourseManagement, UserManagement, BusinessManagement, TransactionList, etc.
│   │   └── components/
│   ├── ai-generator/
│   │   ├── pages/                 # GeneratorPage, DraftEditorPage, DraftListPage
│   │   ├── components/            # GeneratorForm, JobProgress, CourseTreeEditor, SlideEditor, PreviewPlayer
│   │   ├── hooks/                 # useCourseEditor, useJobPolling
│   │   └── api/                   # AI generator API calls
│   ├── payments/
│   │   ├── pages/                 # CheckoutSuccessPage, CheckoutCancelPage
│   │   └── api/
│   ├── certificates/
│   │   ├── pages/                 # VerifyCertificatePage
│   │   └── components/
│   └── kyc/
│       ├── pages/                 # BusinessRegistrationPage (multi-step)
│       └── components/            # KYCSteps, DocumentUpload
├── shared/
│   ├── components/
│   │   ├── ui/                    # Button, Input, Card, Modal, Table, Badge, Toast, Skeleton, etc.
│   │   ├── layout/                # PublicLayout, LearnerLayout, BusinessLayout, AdminLayout, ProtectedRoute
│   │   └── common/                # ErrorBoundary, LoadingSpinner, EmptyState
│   ├── lib/
│   │   ├── api.ts                 # Axios client with interceptors
│   │   ├── auth.ts                # Token/cookie management
│   │   └── utils.ts               # Formatters, helpers
│   ├── types/
│   │   └── index.ts               # All shared TypeScript types
│   ├── hooks/
│   │   └── useDebounce.ts, etc.
│   └── config/
│       └── env.ts                 # Typed env access
```

### Routing Strategy

```
/                          → PublicLayout > HomePage
/courses                   → PublicLayout > CoursesPage
/courses/:courseId          → PublicLayout > CourseDetailPage
/login                     → LoginPage (individual/employee)
/register                  → RegisterPage (account type selection → individual or business)
/register/business         → BusinessRegistrationPage (KYC multi-step)
/forgot-password           → ForgotPasswordPage
/reset-password/:token     → ResetPasswordPage
/invite/:token             → InviteAcceptPage (employee)

/dashboard                 → LearnerLayout > LearnerDashboard (INDIVIDUAL, EMPLOYEE)
/certificates              → LearnerLayout > CertificatesPage
/profile                   → LearnerLayout > ProfilePage
/learn/:enrollmentId       → CoursePlayer (full screen, no layout chrome)

/business                  → BusinessLayout > BusinessDashboard (BUSINESS_ADMIN)
/business/courses          → BusinessLayout > ExploreCourses
/business/manage-courses   → BusinessLayout > ManageCourses
/business/manage-courses/:courseId → BusinessLayout > CourseSeats (employee assignments)
/business/subscription     → BusinessLayout > SubscriptionManagement

/admin/login               → AdminLoginPage
/admin                     → AdminLayout > AdminDashboard (ADMIN)
/admin/courses             → AdminLayout > CourseManagement
/admin/courses/:id/edit    → AdminLayout > CourseEditor
/admin/users               → AdminLayout > UserManagement
/admin/businesses          → AdminLayout > BusinessManagement
/admin/employees           → AdminLayout > EmployeeManagement
/admin/kyc-review          → AdminLayout > KYCReview
/admin/transactions        → AdminLayout > TransactionList
/admin/certificates        → AdminLayout > CertificateOversight
/admin/reports             → AdminLayout > ReportingDashboard
/admin/settings            → AdminLayout > SettingsPage
/admin/ai-generator        → AdminLayout > DraftListPage
/admin/ai-generator/new    → AdminLayout > GeneratorPage
/admin/ai-generator/:draftId → AdminLayout > DraftEditorPage

/verify/:certificateNumber → VerifyCertificatePage (public)
/checkout/success          → CheckoutSuccessPage
/checkout/cancel           → CheckoutCancelPage
```

### Tech Stack (Final)

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Routing | React Router v7 |
| State | React Query v5 (server) + React Context (auth) |
| Styling | Tailwind CSS v4 |
| Forms | React Hook Form + Zod validation |
| HTTP | Axios with typed interceptors |
| Animations | Framer Motion (lazy loaded) |
| Icons | Lucide React |
| Toasts | react-hot-toast |
| Code splitting | React.lazy + Suspense per route |

---

## 2. Backend Architecture

### Decision: NestJS as primary LMS backend, Python as AI generation microservice

**NestJS (lms-backend):**
- All LMS business logic: auth, users, courses, enrollment, payments, certificates, business, admin
- PostgreSQL via Prisma ORM
- Redis for caching, token revocation, throttling
- Versioned API at `/api/v1/`
- Swagger documentation via `@nestjs/swagger`

**Python FastAPI (AI service):**
- Course generation, editing, preview
- MongoDB for draft storage
- Redis for job queue
- Exposes `/api/course-generator/*`
- NestJS proxies or nginx routes directly to Python service

### API Versioning

All NestJS routes will be prefixed with `/api/v1/`:
```
/api/v1/auth/*
/api/v1/users/*
/api/v1/courses/*
/api/v1/enrollments/*
/api/v1/learning/*
/api/v1/payments/*
/api/v1/certificates/*
/api/v1/businesses/*
/api/v1/admin/*
/api/v1/feature-flags/*
```

Python AI routes remain at `/api/course-generator/*` (routed via nginx).

### Env/Config Strategy

**Backend config validation:**
- Use `@nestjs/config` with Joi schema validation
- All env vars validated at startup; app refuses to start if required vars missing
- No hardcoded secret fallbacks

**Frontend env typing:**
- Typed `env.ts` module that reads `import.meta.env`
- All env vars documented in `.env.example`

---

## 3. Authentication Strategy

### Decision: JWT in httpOnly cookies

**Why change from localStorage:**
- Eliminates XSS token theft risk
- Browser handles cookie sending automatically
- Refresh token rotation is cleaner

**Implementation:**
- Access token: httpOnly, secure, SameSite=Lax cookie (15-minute TTL)
- Refresh token: httpOnly, secure, SameSite=Strict cookie (7-day TTL)
- CSRF protection: Double-submit cookie pattern or SameSite attribute
- Token refresh: automatic via response interceptor
- Logout: server clears cookies + revokes refresh token in Redis

**Admin session:**
- Same JWT mechanism but admin role check at route level
- Dedicated `/admin/login` page for admin users
- Admin routes require ADMIN role in both frontend (ProtectedRoute) and backend (PermissionGuard)

---

## 4. AI Course Generator Integration Strategy

### Decision: NoSQL drafts → Postgres production promotion

**Draft stage (MongoDB):**
- AI generation jobs stored in `generation_jobs` collection
- Generated course drafts stored in `courses` / `course_drafts` collections
- Admin can edit drafts (text, prompts, images, audio) in the AI generator UI
- Drafts are experimental, AI-native, and freely editable

**Production stage (PostgreSQL):**
- When admin clicks "Publish to LMS":
  1. Validate draft completeness (all slides have content, assessment has questions)
  2. Transform MongoDB document structure → Postgres LMS schema
  3. Create `Course` record with metadata
  4. Create `CourseVersion` with `content_snapshot` JSON
  5. Store source reference: `source_type = 'ai_generated'`, `source_draft_id`, `generator_job_id`
  6. Mark draft as published in MongoDB (store `published_course_id`, `published_at`)
  7. Course becomes visible in admin course management
  8. Course can be set to `is_published = true` for enrollment

**After publish:**
- PostgreSQL is the source of truth for production course editing
- MongoDB remains the source of truth for generation history/drafts
- One-way promotion: NoSQL draft → Postgres production
- No bi-directional sync (too complex, not needed)
- Admin edits published courses through normal admin course management

### Schema additions for Course model

```prisma
model Course {
  // ... existing fields ...
  source_type        String?   // 'ai_generated' | 'manual' | null
  source_draft_id    String?   // MongoDB ObjectId of source draft
  generator_job_id   String?   // MongoDB ObjectId of generation job
}
```

### NestJS ↔ Python Integration

**Option chosen: nginx direct routing + NestJS proxy service for publish workflow**

- Nginx routes `/api/course-generator/*` directly to Python service (fast, no double-hop)
- NestJS has a `CourseGeneratorService` that calls Python API internally for the publish workflow
- Publish endpoint: `POST /api/v1/admin/courses/publish-draft/:draftId` (NestJS)
  - Fetches draft from Python API
  - Validates completeness
  - Creates Postgres records
  - Notifies Python API to mark as published

---

## 5. File/Media/Storage Strategy

### Decision: S3-compatible storage with local fallback for development

**Production:**
- AWS S3 (or S3-compatible like MinIO)
- Course assets (images, audio, video) uploaded to S3
- KYC documents uploaded to S3 with restricted access
- Signed URLs for protected content (course media for enrolled users)
- Certificate PDFs stored in S3

**Development:**
- Local filesystem storage (current `Generated_Courses/` pattern)
- Abstracted behind a `StorageService` interface

**Implementation:**
```
StorageService (interface)
├── S3StorageService (production)
└── LocalStorageService (development)
```

Config driven: `STORAGE_DRIVER=s3|local`

---

## 6. Email/Notification Strategy

### Decision: SendGrid with template system

**Why SendGrid:** Easy setup, good deliverability, template support, free tier sufficient for MVP.

**Implementation:**
- `NotificationService` in NestJS backend
- Template-based emails using Handlebars or similar
- Templates for: verification, password reset, employee invite, purchase confirmation, certificate notification
- Env-driven: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`

---

## 7. Database Schema Evolution Plan

### New models needed

```prisma
// Email verification
model EmailVerificationToken {
  id         String   @id @default(uuid())
  user_id    String
  token      String   @unique
  expires_at DateTime
  used_at    DateTime?
  created_at DateTime @default(now())
  user       User     @relation(fields: [user_id], references: [id])
  @@index([user_id])
  @@index([token])
}

// Password reset
model PasswordResetToken {
  id         String   @id @default(uuid())
  user_id    String
  token      String   @unique
  expires_at DateTime
  used_at    DateTime?
  created_at DateTime @default(now())
  user       User     @relation(fields: [user_id], references: [id])
  @@index([user_id])
  @@index([token])
}

// Employee invite
model InviteToken {
  id          String   @id @default(uuid())
  email       String
  business_id String
  token       String   @unique
  expires_at  DateTime
  used_at     DateTime?
  created_at  DateTime @default(now())
  business    Business @relation(fields: [business_id], references: [id])
  @@index([token])
  @@index([business_id])
}

// Business KYC
model BusinessKyc {
  id                    String   @id @default(uuid())
  business_id           String   @unique
  company_name          String
  business_email        String
  phone_number          String?
  address_line1         String?
  address_line2         String?
  city                  String?
  postcode              String?
  country               String?
  tax_id                String?
  registration_number   String?
  contact_person_name   String?
  contact_person_email  String?
  status                KycStatus @default(PENDING)
  rejection_reason      String?
  reviewed_by           String?
  reviewed_at           DateTime?
  submitted_at          DateTime @default(now())
  updated_at            DateTime @updatedAt
  documents             KycDocument[]
  business              Business @relation(fields: [business_id], references: [id])
  @@index([business_id])
  @@index([status])
}

enum KycStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
  NEEDS_INFO
}

model KycDocument {
  id           String   @id @default(uuid())
  kyc_id       String
  file_name    String
  file_url     String
  file_type    String
  uploaded_at  DateTime @default(now())
  kyc          BusinessKyc @relation(fields: [kyc_id], references: [id])
  @@index([kyc_id])
}

// Course-Employee Assignment (for business seat management)
model CourseAssignment {
  id                String   @id @default(uuid())
  business_id       String
  employee_id       String
  course_id         String
  enrollment_id     String?
  assigned_at       DateTime @default(now())
  assigned_by       String
  deleted_at        DateTime?
  business          Business @relation(fields: [business_id], references: [id])
  employee          Employee @relation(fields: [employee_id], references: [id])
  course            Course   @relation(fields: [course_id], references: [id])
  enrollment        Enrollment? @relation(fields: [enrollment_id], references: [id])
  @@unique([employee_id, course_id])
  @@index([business_id])
  @@index([employee_id])
  @@index([course_id])
}
```

### Modifications to existing models

**User:**
- Add `first_name`, `last_name`, `phone`
- Add `email_verified`, `email_verified_at`
- Add `updated_at`
- Relations: `email_verification_tokens`, `password_reset_tokens`

**Business:**
- Add `owner_id` (FK → User)
- Add `stripe_customer_id`, `stripe_subscription_id`
- Add `updated_at`
- Change `subscription_status` to enum
- Relations: `invite_tokens`, `kyc`, `course_assignments`

**Course:**
- Add `source_type`, `source_draft_id`, `generator_job_id`
- Add `thumbnail_url`, `category`, `difficulty_level`
- Add `updated_at`
- Relations: `course_assignments`

**Employee:**
- Relations: `course_assignments`

**Enrollment:**
- Add `@@unique([user_id, course_version_id])` to prevent duplicates
- Relations: `course_assignment`

**AssessmentAttempt:**
- Add `answers` (Json) to store per-question answers for audit trail
- Add `cooldown_expires_at` for enforcement

---

## 8. Deployment Strategy

### Decision: Docker Compose with nginx reverse proxy (current), GitHub Actions CI/CD

**Current state:** Manual SCP-based deployment to Vultr.

**Target state:**
- GitHub Actions: lint → test → build → deploy
- Docker Compose production config
- nginx handles routing for all services
- Let's Encrypt via certbot (already configured)

### Nginx Routing (Fixed)

```
/ → lms-frontend (React SPA)
/api/v1/* → lms-backend (NestJS)
/api/course-generator/* → api (Python FastAPI)
/static/* → api (Generated course assets)
```

---

## 9. Design System

### Decision: brickSkill design language from lms-frontend

**Colors:**
- Primary: Teal `#004D40`
- Accent: Lime `#CBFF00`
- Dark: `#1a1f25`
- Background: `#f5f5f0` (warm off-white)
- Cards: `#ffffff`
- Text: `#212121`

**Components:**
- `.btn-lime` — primary action buttons (lime green, dark text)
- `.btn-dark` — secondary dark buttons
- `.btn-outline` — outline/ghost buttons
- `.bs-card` — card containers
- `.bs-input` — form inputs
- `.badge-*` — status badges

**Typography:**
- Font: Inter (Google Fonts)
- Headings: serif font for major headings (per design)

**Layout:**
- Sidebar navigation for authenticated portals (learner, business, admin)
- Public layout with top navigation + full footer
- Course player: full-screen, no layout chrome, with optional Content sidebar

---

## 10. Summary of Key Decisions

| Area | Decision |
|------|----------|
| Frontend | Unified SPA in `lms-frontend/`, feature-based structure |
| Backend | NestJS (primary) + Python FastAPI (AI only) |
| Database | PostgreSQL (production LMS) + MongoDB (AI drafts) |
| Auth | JWT in httpOnly cookies, RBAC via permissions |
| AI Integration | NoSQL draft → Postgres promotion workflow |
| Storage | S3-compatible with local fallback |
| Email | SendGrid with templates |
| Deployment | Docker Compose + GitHub Actions CI/CD |
| Design | brickSkill theme (teal/lime/dark) |
| API | Versioned at `/api/v1/` |
