# CLAUDE.md - SpecifAI Project Context

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Project Overview

SpecifAI ist eine Voice-to-GitHub-Issue Plattform mit Admin-gesteuerten Berechtigungen. Nutzer können in unter 60 Sekunden per Spracheingabe strukturierte GitHub Issues erstellen.

**Current Status**:

- Phase 1-2 abgeschlossen (Setup, Auth, Voice Recording)
- Phase 3 begonnen (Admin Dashboard & Berechtigungen)
- Repository: https://github.com/shortcutchris/077-cdb

## 🏗️ Architecture

The system follows this architecture:

- **Frontend**: React 18 PWA with shadcn/ui, Tailwind CSS v3
- **Backend**: Supabase (Auth, DB, Storage, Edge Functions)
- **AI Pipeline**: Whisper API → GPT-4o → GitHub Issue
- **Database**: PostgreSQL with pgvector for search
- **Integration**: GitHub API (REST & GraphQL)
- **Admin System**: PAT-based repository management

## 📊 Current Implementation Status

### ✅ Completed

- Project setup with pnpm monorepo
- Supabase project initialized
- React PWA with Vite
- GitHub OAuth integration
- Voice recording component (2-min limit)
- Whisper transcription
- GPT-4o issue generation
- Issue preview with editing

### 🚧 In Progress

- Admin dashboard (Issue #6)
- Repository permissions system
- GitHub issue creation

### ⏳ Planned

- Extended Whisper features
- Clarification loop
- Semantic search
- Realtime updates
- Coding agent

## 📝 Issue Management

### WICHTIG: Alle Issues werden NUR auf GitHub verwaltet

- **Single Source of Truth**: https://github.com/shortcutchris/077-cdb/issues
- **Keine lokalen Issue-Dateien mehr**
- **Milestones**: Organisiert in Phasen 3-6
- **Phase Prefixes**: Klare Reihenfolge durch [P3.1], [P4.1], etc.

### Issue Status:

- ✅ Phase 1-2: Foundation & Core Features (abgeschlossen)
- 🚧 Phase 3: Core Features (Whisper, GPT-4o, Edge Functions)
- 🚧 Phase 4: Permission System (Admin Dashboard, GitHub API)
- ⏳ Phase 5: Advanced Features (Search, Realtime, Storage, Agent)
- ⏳ Phase 6: Infrastructure & Quality (CI/CD, Testing, Monitoring)

## 🔑 Key Implementation Details

### Environment

- **Frontend**: `/packages/web`
- **Supabase Project**: `uecvnenvpgvytgkzfyrh`
- **Dev Server**: http://localhost:5174
- **Node Version**: 20+

### Security & Permissions

- Admin lädt Repositories via Personal Access Token
- Admin vergibt Berechtigungen an User
- User sehen nur freigeschaltete Repositories
- Vollständiges Audit-Logging

### Known Issues & Fixes

1. **Audio Duration**: WebM streams report `Infinity`, use recording time as fallback
2. **Tailwind**: Use v3, not v4 (PostCSS compatibility)
3. **Repository**: Currently hardcoded in `VoiceRecorder.tsx:116`
4. **Storage**: No automatic cleanup implemented yet

### API Keys (in .env)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OPENAI_API_KEY`

## 🛠️ Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## 📚 Key Dependencies

- React 18, Vite, TypeScript
- @supabase/supabase-js
- OpenAI SDK
- Tailwind CSS v3
- shadcn/ui components
- Lucide Icons

## 🚀 Next Steps

1. Start with [P4.1] Admin Dashboard & Berechtigungssystem (Issue #18)
2. Create database migration for permission tables
3. Add repository dropdown to Voice Recorder
4. Implement GitHub issue creation with permissions

## 📋 Task Management

Always use TodoRead/TodoWrite tools to track progress. Document everything directly in GitHub issues.

## 🔄 Development Workflow

### GitHub Issues Integration

1. **Planning**: Present implementation plan in chat for approval
2. **Implementation**: Follow approved plan systematically
3. **Testing**: Get user feedback before marking complete
4. **Documentation**: Update GitHub issue comments with results

### MCP Servers Available

- **GitHub**: Issue/PR management
- **Supabase**: Database operations
- **Firecrawl**: Web scraping
- **Context7**: Library docs
- **Puppeteer**: Browser automation

---

Last updated: 2025-07-03
