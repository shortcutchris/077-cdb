# SpecifAI Implementierungsplan & Tasks

## 🎯 Projektziel

Entwicklung einer Voice-to-GitHub-Issue Plattform, die Geschäftsanforderungen in unter 60 Sekunden in strukturierte GitHub Issues verwandelt.

## 🏗️ Architektur-Übersicht

### Frontend (React PWA)

- **Tech Stack**: React 18, Vite, TypeScript, shadcn/ui, Tailwind CSS
- **Features**: Voice Recording, OAuth Login, Issue Preview, Realtime Updates
- **Deployment**: Vercel/Netlify

### Backend (Supabase)

- **Services**: Auth, Database, Edge Functions, Realtime, Storage
- **AI Pipeline**: Whisper v4 → GPT-4o → GitHub API
- **Extras**: pgvector für Semantic Search, 30-Tage Audio Retention

### Coding Agent (Autonomous)

- **Funktion**: Polling für `ready-for-dev` Issues
- **Workflow**: Issue → Code Generation → PR → CI/CD
- **Integration**: Supabase Queue, Email Notifications

## 📋 Implementierungs-Tasks

### Phase 1: Foundation (Woche 1-2)

- [ ] **1. Projektstruktur und Basis-Setup erstellen**
  - Monorepo mit pnpm workspaces
  - Frontend (`/apps/web`), Backend (`/apps/functions`), Shared (`/packages`)
  - ESLint, Prettier, Husky für Code-Qualität

- [ ] **2. Supabase Projekt initialisieren**
  - Neues Projekt auf supabase.com
  - Lokale Entwicklungsumgebung mit Supabase CLI
  - Basis-Tabellen: users, voice_recordings, issues, agent_queue

- [ ] **3. React PWA Frontend aufsetzen**
  - Vite + React 18 + TypeScript
  - PWA Manifest und Service Worker
  - shadcn/ui Installation und Theme-Setup
  - Routing mit React Router

### Phase 2: Core Features (Woche 3-4)

- [ ] **4. GitHub OAuth Integration**
  - Supabase Auth Provider konfigurieren
  - Login/Logout Flow
  - Protected Routes
  - GitHub Token Management

- [ ] **5. Voice Recording Component**
  - Web Audio API Integration
  - 2-Minuten Limit
  - Audio Visualizer
  - Upload zu Supabase Storage

- [ ] **6. Whisper v4 Integration**
  - OpenAI API Setup
  - Edge Function für Transcription
  - Error Handling und Retry-Logic
  - Progress Feedback

- [ ] **7. GPT-4o Clarification Loop**
  - Prompt Engineering für Issue-Generierung
  - Iterative Verbesserung
  - Structured Output (JSON)
  - Template System

### Phase 3: GitHub Integration (Woche 5-6)

- [ ] **8. GitHub GraphQL API via MCP**
  - MCP Server Setup
  - Issue Creation Mutation
  - Repository Selection
  - Label und Assignee Management

- [ ] **9. Supabase Edge Functions**
  - Audio Processing Pipeline
  - Issue Creation Workflow
  - Webhook Handler
  - Rate Limiting

### Phase 4: Advanced Features (Woche 7-8)

- [ ] **10. pgvector Semantic Search**
  - Vector Embeddings für Issues
  - Ähnliche Issues finden
  - Duplicate Detection

- [ ] **11. Realtime Updates**
  - Supabase Channels
  - Live Issue Status
  - Progress Notifications

- [ ] **12. Audio Storage Management**
  - 30-Tage Retention Policy
  - Automatische Bereinigung
  - Storage Quotas

### Phase 5: Coding Agent (Woche 9-10)

- [ ] **13. Backend Agent Implementation**
  - Cron Job (10 min Intervall)
  - GitHub Webhook Listener
  - State Machine (queued → in-progress → done)
  - Code Generation mit GPT-4

- [ ] **14. CI/CD Pipeline**
  - GitHub Actions Workflows
  - Automated Testing
  - Preview Deployments
  - Production Releases

### Phase 6: Production Ready (Woche 11-12)

- [ ] **15. Monitoring & Observability**
  - Sentry Integration
  - Performance Tracking
  - User Analytics
  - Error Reporting

- [ ] **16. Testing Suite**
  - Unit Tests (Vitest)
  - Integration Tests
  - E2E Tests (Playwright)
  - API Mocking

- [ ] **17. Deployment Setup**
  - Frontend auf Vercel
  - Environment Variables
  - Domain Setup
  - SSL/Security

## 🚀 Nächste Schritte

1. **Entwicklungsumgebung vorbereiten**
   - Node.js 20+, pnpm, Git
   - Supabase CLI installieren
   - VS Code mit empfohlenen Extensions

2. **Accounts einrichten**
   - Supabase Account
   - OpenAI API Key
   - GitHub App registrieren
   - Vercel/Netlify Account

3. **Mit Phase 1 beginnen**
   - Projektstruktur erstellen
   - Basis-Dependencies installieren
   - Erste Commits

## 📊 KPIs & Erfolgsmetriken

- Time-to-Issue: ≤ 60 Sekunden
- Clarification Rate: -30%
- CI Pass Rate: ≥ 80% beim ersten Versuch
- User Retention: ≥ 40%

## ⚠️ Risiken & Mitigationen

- **Whisper Kosten**: Implementiere Caching und Batch-Processing
- **PWA Limitierungen**: Fallback für nicht-unterstützte Browser
- **GitHub Rate Limits**: Implementiere Queue-System und Exponential Backoff
