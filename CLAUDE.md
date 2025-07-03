# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the SpecifAI project repository - a voice-to-GitHub-Issue system that allows business stakeholders to speak requirements that are automatically converted into structured GitHub Issues.

**Current Status**: Documentation-only repository. No code implementation exists yet.

## Architecture (From Documentation)

The system will follow this architecture:

- **Frontend**: React 18 PWA with shadcn/ui for voice recording
- **Backend**: Supabase Edge Functions for processing
- **AI Pipeline**: Whisper v4 (STT) → GPT-4o (clarification loop) → GitHub Issue creation
- **Database**: Supabase with pgvector for search, 30-day audio retention
- **Integration**: GitHub GraphQL API via MCP server

## Key Components (Planned)

### Core Flow

1. Voice capture (≤ 2 min) → Whisper v4 transcription
2. GPT-4o clarification loop → structured Issue draft
3. MCP server creates GitHub Issue with real-time updates
4. Supabase handles auth, data, and real-time channels

### Backend Agent (Separate System)

- Autonomous coding agent that polls for `ready-for-dev` Issues
- Generates code, opens PRs, manages CI/CD pipeline
- State management: queued → in-progress → in-review → done
- Supabase integration for status tracking and email notifications

## Development Setup

**Note**: No build commands exist yet as this is a documentation-only repository.

When implementation begins, expect:

- React 18 PWA setup with standard npm/yarn commands
- Supabase CLI for Edge Functions development
- GitHub GraphQL integration setup
- Audio processing pipeline with Whisper API

## Key Performance Targets

- Time-to-Issue: ≤ 60 seconds
- Agent issue detection: ≤ 60 seconds
- PR CI pass rate: ≥ 80% first run
- Supabase status latency: ≤ 3 seconds

## Documentation Structure

- `docs/SpecifAI_CodingAgent_PRD.md` - Backend coding agent requirements
- `docs/SpecifAI_OnePager.md` - Project overview and value proposition
- `docs/SpecifAI_PRD_v1.md` - Main product requirements document

## Development Workflow

### GitHub Issues Integration

All development tasks are tracked as GitHub Issues (#1-#17) with the following workflow:

1. Pick an issue from the backlog (start with high-priority phase-1 issues)
2. Mark the corresponding todo as "in_progress"
3. Implement the solution
4. Test the implementation
5. Mark the todo as "completed"
6. Comment on the GitHub issue with implementation details
7. Close the issue when fully complete

### Task Priority Order

1. **Phase 1 (Foundation)**: Issues #1-3 - Project setup, Supabase, React PWA
2. **Phase 2 (Core Features)**: Issues #4-7 - Auth, Voice Recording, AI Integration
3. **Phase 3 (Integration)**: Issues #8-9 - GitHub API, Edge Functions
4. **Phase 4 (Advanced)**: Issues #10-12 - Search, Realtime, Storage
5. **Phase 5 (Agent & CI/CD)**: Issues #13-14 - Coding Agent, Pipeline
6. **Phase 6 (Production)**: Issues #15-17 - Monitoring, Testing, Deployment

### MCP Servers Available

- **GitHub**: Issue creation, PR management, repository operations
- **Supabase**: Project management, database operations, edge functions
- **Firecrawl**: Web scraping and research capabilities
- **Context7**: Library documentation lookup
- **Puppeteer**: Browser automation for testing

### Development Commands (To be added as project develops)

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build

# Deploy to Supabase
pnpm deploy:functions
```
