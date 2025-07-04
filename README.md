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
- **AI**: OpenAI Whisper API + GPT-4o
- **Deployment**: Vercel (Frontend), Supabase (Backend), Replit (Alternative)

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

## 🚀 Deployment on Replit

### Quick Deploy

1. Fork this repository to your GitHub account
2. Import the repository on [Replit](https://replit.com)
3. Set up environment variables in Replit Secrets:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `VITE_OPENAI_API_KEY`: Your OpenAI API key (not `OPENAI_API_KEY`!)
   - `VITE_APP_URL`: Your Replit deployment URL (e.g., `https://your-app.replit.app`)

### OAuth Configuration

For GitHub OAuth to work properly, you need to configure URLs in multiple places:

#### 1. Supabase Dashboard

- Go to [Authentication > URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration)
- Add your Replit URLs to **Redirect URLs**:
  - Development: `https://your-dev-subdomain.riker.replit.dev/login`
  - Production: `https://your-app.replit.app/login`
  - Wildcards: `https://*.replit.dev/**`, `https://*.replit.app/**`, `https://*.repl.co/**`

#### 2. GitHub OAuth App

- Go to GitHub Settings > Developer settings > OAuth Apps
- **Homepage URL**: Your Replit URL (e.g., `https://your-app.replit.app`)
- **Authorization callback URL**: Keep as `https://your-project.supabase.co/auth/v1/callback`
  - ⚠️ This must point to Supabase, NOT your app!

#### 3. Environment Variables

- Set `VITE_APP_URL` in Replit Secrets to match your deployment URL
- This ensures OAuth redirects work correctly

### Deployment Steps

1. **Development Deploy**:

   ```bash
   # Replit will auto-run: npm install && npm run build && npm run preview
   ```

2. **Production Deploy**:
   - Use Replit's deployment feature
   - Update `VITE_APP_URL` to production URL
   - Add production URL to Supabase redirect URLs

### Configuration

The `.replit` file is pre-configured with:

- Node.js 20 environment
- Automatic build process
- Port 3000 exposed for web access
- CORS headers configured for cross-origin requests
- Proper host bindings for Replit domains

### Troubleshooting

- **OAuth Redirect Error**: Check `/debug` page for actual redirect URLs being sent
- **CORS Issues**: Ensure all Replit domains are in allowed hosts in `vite.config.ts`
- **Environment Variables**: All client-side vars must start with `VITE_`
- **Edge Function Calls**: Always use Supabase SDK's `invoke()` method, NOT direct fetch to `/functions/v1/`

### Resource Requirements

- **Free Tier**: 0.5-1 vCPU, 512MB RAM (may experience slower build times)
- **Recommended**: Hacker plan or higher for better performance

## 📋 Key Features

1. **Voice Recording**: 2-minute voice notes with real-time visualization
2. **AI Processing**: Automatic transcription and issue generation
3. **GitHub Integration**: Direct issue creation with labels and assignees
4. **Realtime Updates**: Live status tracking via Supabase
5. **Coding Agent**: Autonomous PR generation for ready-for-dev issues

## 🔧 Edge Functions

SpecifAI uses Supabase Edge Functions for serverless operations:

### Deployed Functions

- `github-create-issue`: Creates GitHub issues from voice recordings

### Important: Function Invocation

Always use the Supabase SDK for Edge Functions:

```javascript
// ✅ Correct - Use Supabase SDK
const { data, error } = await supabase.functions.invoke('function-name', {
  body: {
    /* payload */
  },
})

// ❌ Wrong - Direct fetch will fail
const response = await fetch(`${SUPABASE_URL}/functions/v1/function-name`)
```

The SDK handles authentication and knows the correct internal URL structure.

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
