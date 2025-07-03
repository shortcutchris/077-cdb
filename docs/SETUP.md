# SpecifAI Setup Guide

## Prerequisites

1. **Node.js 20+** and **pnpm 8+**
2. **Supabase Project** - Already created as `cdb-077`
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

### 3. Configure Supabase Project

The Supabase project `cdb-077` is already set up with:

- Database schema and tables
- Row Level Security policies
- Storage bucket for voice recordings

Access the project at:

- Dashboard: https://supabase.com/dashboard/project/uecvnenvpgvytgkzfyrh
- API URL: https://uecvnenvpgvytgkzfyrh.supabase.co

### 4. Configure GitHub OAuth in Supabase

1. Go to Authentication → Providers in Supabase Dashboard
2. Enable GitHub provider
3. Add your GitHub OAuth App credentials
4. Set redirect URL: https://uecvnenvpgvytgkzfyrh.supabase.co/auth/v1/callback

## GitHub OAuth Setup

1. Go to https://github.com/settings/applications/new
2. Set Application name: `SpecifAI`
3. Homepage URL: `http://localhost:5173`
4. Authorization callback URL: `https://uecvnenvpgvytgkzfyrh.supabase.co/auth/v1/callback`
5. Copy Client ID and Secret to:
   - `.env.local` file
   - Supabase Dashboard → Authentication → Providers → GitHub

## Service Role Key

To get the service role key:

1. Go to Supabase Dashboard → Settings → API
2. Copy the `service_role` key (keep this secret!)
3. Add to `.env.local`

## Troubleshooting

### Check database tables

Go to Supabase Dashboard → Table Editor to verify all tables are created.

### Test connection

```bash
# Install Supabase client globally
npm install -g @supabase/supabase-js

# Test connection (replace with your keys)
node -e "const {createClient} = require('@supabase/supabase-js'); const supabase = createClient('https://uecvnenvpgvytgkzfyrh.supabase.co', 'your-anon-key'); console.log('Connected!');"
```

## Next Steps

After setup is complete:

1. Run `pnpm dev` to start the frontend (Issue #3)
2. Test GitHub OAuth login (Issue #4)
3. Begin implementing voice recording (Issue #5)
