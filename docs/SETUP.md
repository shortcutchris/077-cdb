# SpecifAI Setup Guide

## Prerequisites

1. **Node.js 20+** and **pnpm 8+**
2. **Docker Desktop** - Required for Supabase local development
3. **GitHub OAuth App** - Create at https://github.com/settings/applications/new
4. **OpenAI API Key** - Get from https://platform.openai.com

## Initial Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

- GitHub OAuth credentials
- OpenAI API key
- SendGrid API key (optional)

### 3. Start Supabase

```bash
# Make sure Docker Desktop is running first!
supabase start
```

This will start:

- Postgres database (port 54322)
- Supabase Studio (http://localhost:54323)
- API Gateway (http://localhost:54321)
- Email testing (http://localhost:54324)

### 4. Apply Database Migrations

```bash
supabase db push
```

### 5. Verify Setup

1. Open Supabase Studio: http://localhost:54323
2. Check that all tables are created
3. Test user should be available (test@example.com / password123)

## GitHub OAuth Setup

1. Go to https://github.com/settings/applications/new
2. Set Application name: `SpecifAI Local`
3. Homepage URL: `http://localhost:5173`
4. Authorization callback URL: `http://localhost:54321/auth/v1/callback`
5. Copy Client ID and Secret to `.env.local`

## Troubleshooting

### Docker not running

```bash
# macOS
open -a Docker

# Wait for Docker to start, then:
supabase start
```

### Reset database

```bash
supabase db reset
```

### View logs

```bash
supabase status
docker logs supabase_db_specifai
```

## Next Steps

After setup is complete:

1. Run `pnpm dev` to start the frontend (Issue #3)
2. Test GitHub OAuth login (Issue #4)
3. Begin implementing voice recording (Issue #5)
