# SpecifAI Implementierungsplan & Tasks

## 🎯 Projektziel

Entwicklung einer Voice-to-GitHub-Issue Plattform mit Admin-gesteuerten Berechtigungen, die Geschäftsanforderungen in unter 60 Sekunden in strukturierte GitHub Issues verwandelt.

## 🏗️ Architektur-Übersicht

### Frontend (React PWA)

- **Tech Stack**: React 18, Vite, TypeScript, shadcn/ui, Tailwind CSS
- **Features**: Voice Recording, OAuth Login, Issue Preview, Realtime Updates, Admin Dashboard
- **Deployment**: Vercel/Netlify

### Backend (Supabase)

- **Services**: Auth, Database, Edge Functions, Realtime, Storage
- **AI Pipeline**: Whisper v4 → GPT-4o → GitHub API
- **Extras**: pgvector für Semantic Search, 30-Tage Audio Retention
- **Admin**: Berechtigungssystem, PAT-Verwaltung, Repository-Sync

### Coding Agent (Autonomous)

- **Funktion**: Polling für `ready-for-dev` Issues
- **Workflow**: Issue → Code Generation → PR → CI/CD
- **Integration**: Supabase Queue, Email Notifications

## 📋 Implementierungs-Tasks

### Phase 1: Foundation (Woche 1-2) ✅

- [x] **1. Projektstruktur und Basis-Setup erstellen**
  - Monorepo mit pnpm workspaces
  - Frontend (`/packages/web`), Supabase config
  - ESLint, Prettier für Code-Qualität

- [x] **2. Supabase Projekt initialisieren**
  - Projekt auf supabase.com erstellt
  - Basis-Tabellen: voice_recordings
  - Storage Bucket konfiguriert

- [x] **3. React PWA Frontend aufsetzen**
  - Vite + React 18 + TypeScript
  - PWA Manifest und Service Worker
  - shadcn/ui Installation und Theme-Setup

### Phase 2: Core Features (Woche 3-4) ✅

- [x] **4. GitHub OAuth Integration**
  - Supabase Auth Provider konfiguriert
  - Login/Logout Flow implementiert
  - Protected Routes eingerichtet
  - AuthContext für State Management

- [x] **5. Voice Recording Component**
  - Web Audio API Integration
  - 2-Minuten Limit mit Auto-Stop
  - Audio Visualizer
  - Upload zu Supabase Storage
  - Whisper & GPT-4o Integration

### Phase 3: Admin & Permissions (Woche 5) 🚧

- [ ] **6. Admin Dashboard & Berechtigungssystem** _(NEU)_
  - Admin-UI für User-Verwaltung
  - PAT-Integration für Repository-Sync
  - Repository-Berechtigungen pro User
  - Audit-Log für Admin-Aktionen

- [ ] **7. Whisper v4 Integration (Erweitert)**
  - Chunk-basiertes Processing
  - Multi-Language Support
  - Retry-Logic und Caching
  - Progress Tracking

### Phase 4: GitHub Integration (Woche 6) 🔄

- [ ] **8. GitHub GraphQL API mit Berechtigungen**
  - Repository-Auswahl UI
  - Permission-basierte Filterung
  - Issue Creation mit Validation
  - Label und Milestone Management

- [ ] **9. GPT-4o Clarification Loop**
  - Interaktive Nachfrage-UI
  - Context-aware Questions
  - Iterative Issue-Verbesserung
  - Skip-Option für Power Users

### Phase 5: Backend Infrastructure (Woche 7-8)

- [ ] **10. Supabase Edge Functions**
  - Admin-Endpoints implementieren
  - Audio Processing Pipeline
  - Permission Validation
  - Rate Limiting & Security

- [ ] **11. pgvector Semantic Search**
  - Embedding-Generation
  - Duplikat-Erkennung
  - Ähnliche Issues finden
  - Smart Suggestions

- [ ] **12. Realtime Updates**
  - Processing Status Live
  - Admin Activity Feed
  - Collaborative Features
  - System Notifications

### Phase 6: Advanced Features (Woche 9-10)

- [ ] **13. Audio Storage Management**
  - 30-Tage Retention Policy
  - Automatische Bereinigung
  - Archive-Optionen
  - Storage Analytics

- [ ] **14. Backend Coding Agent**
  - Issue-to-Code Pipeline
  - GitHub PR Creation
  - Test Generation
  - Human Review Loop

### Phase 7: Production Ready (Woche 11-12)

- [ ] **15. CI/CD Pipeline**
  - GitHub Actions Setup
  - Preview Deployments
  - Staging & Production
  - Infrastructure as Code

- [ ] **16. Monitoring & Observability**
  - Sentry Integration
  - Custom Dashboards
  - Alert Rules
  - Performance Tracking

- [ ] **17. Comprehensive Testing**
  - Unit Tests (90% Coverage)
  - Integration Tests
  - E2E Tests (Playwright)
  - Visual Regression Tests

## 🔐 Sicherheits-Features

### Admin-Berechtigungen

- Super Admin: Vollzugriff auf alle Funktionen
- Repo Admin: Repository-spezifische Verwaltung
- 2FA-Pflicht für Admin-Accounts
- IP-Whitelisting Option

### User-Berechtigungen

- Nur freigeschaltete Repositories
- Request-System für neue Repos
- Automatische Berechtigung bei Repo-Ownership
- Zeitbasierte Berechtigungen möglich

## 🚀 Nächste Schritte

1. **Admin Dashboard UI implementieren**
   - Layout und Navigation
   - PAT-Verwaltung
   - User-Tabelle mit Permissions

2. **Datenbank-Schema erweitern**
   - Admin-Tabellen erstellen
   - RLS Policies definieren
   - Migration ausführen

3. **Repository-Integration**
   - Dropdown in Voice Recorder
   - Permission Checks
   - Error Handling

## 📊 KPIs & Erfolgsmetriken

- Time-to-Issue: ≤ 60 Sekunden
- Permission Grant Time: ≤ 5 Minuten
- Admin Response Time: ≤ 2 Stunden
- System Uptime: 99.9%
- User Satisfaction: ≥ 4.5/5

## ⚠️ Risiken & Mitigationen

- **PAT-Sicherheit**: Verschlüsselung mit Supabase Vault
- **Permission Sprawl**: Regelmäßige Audits und Cleanup
- **API Rate Limits**: Caching und Queue-System
- **Skalierung**: Horizontal scaling für Edge Functions
