# SpecifAI - "Say it. Ship it."

Voice-to-GitHub-Issue Platform that transforms spoken requirements into structured development tasks in under 60 seconds.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Supabase CLI
- GitHub account with OAuth app

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development
pnpm dev
```

## 📁 Project Structure

```
specifai/
├── apps/
│   ├── web/          # React PWA Frontend
│   └── functions/    # Supabase Edge Functions
├── packages/
│   └── shared/       # Shared types and utilities
├── docs/             # Project documentation
└── supabase/         # Database migrations & config
```

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, shadcn/ui, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Edge Functions, Realtime)
- **AI**: OpenAI Whisper v4 + GPT-4o
- **Deployment**: Vercel (Frontend), Supabase (Backend)

## 📝 Development

```bash
# Run all services
pnpm dev

# Run specific app
pnpm --filter web dev
pnpm --filter functions dev

# Linting & formatting
pnpm lint
pnpm format

# Type checking
pnpm typecheck

# Build for production
pnpm build
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# E2E tests
pnpm test:e2e
```

## 📋 Key Features

1. **Voice Recording**: 2-minute voice notes with real-time visualization
2. **AI Processing**: Automatic transcription and issue generation
3. **GitHub Integration**: Direct issue creation with labels and assignees
4. **Realtime Updates**: Live status tracking via Supabase
5. **Coding Agent**: Autonomous PR generation for ready-for-dev issues

## 🔐 Security

- All sensitive data encrypted at rest
- GitHub OAuth for authentication
- Row Level Security (RLS) on all database tables
- 30-day retention policy for audio files

## 📊 Performance Targets

- Time-to-Issue: ≤ 60 seconds
- Clarification Rate: -30%
- CI Pass Rate: ≥ 80%
- User Retention: ≥ 40%

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
