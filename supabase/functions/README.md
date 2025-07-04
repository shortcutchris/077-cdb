# Supabase Edge Functions

This directory contains all Edge Functions for the SpecifAI project.

## Functions Overview

### 1. `audio-process`

Processes audio recordings by transcribing with Whisper and generating issues with GPT-4o.

- **Endpoint**: `/functions/v1/audio-process`
- **Method**: POST
- **Auth**: Required
- **Permissions**: User must have permission for the target repository

### 2. `repositories-authorized`

Returns all repositories a user has access to.

- **Endpoint**: `/functions/v1/repositories-authorized`
- **Method**: GET
- **Auth**: Required
- **Returns**: List of authorized repositories

### 3. `github-create-issue`

Creates a GitHub issue in the specified repository.

- **Endpoint**: `/functions/v1/github-create-issue`
- **Method**: POST
- **Auth**: Required
- **Permissions**: User must have permission for the target repository

### 4. `admin-verify`

Verifies if the authenticated user is an admin.

- **Endpoint**: `/functions/v1/admin-verify`
- **Method**: GET
- **Auth**: Required
- **Returns**: Admin status and details

### 5. `admin-permissions`

Manages repository permissions for users.

- **Endpoint**: `/functions/v1/admin-permissions`
- **Methods**: GET, POST, DELETE
- **Auth**: Required (Admin only)

### 6. `admin-store-token`

Stores GitHub Personal Access Tokens.

- **Endpoint**: `/functions/v1/admin-store-token`
- **Method**: POST
- **Auth**: Required (Admin only)

### 7. `admin-sync-repositories`

Syncs repositories from GitHub using stored PATs.

- **Endpoint**: `/functions/v1/admin-sync-repositories`
- **Method**: POST
- **Auth**: Required (Admin only)

## Deployment

To deploy all functions, run:

```bash
# Login to Supabase (if not already logged in)
supabase login

# Deploy individual functions
supabase functions deploy audio-process
supabase functions deploy repositories-authorized
supabase functions deploy github-create-issue
supabase functions deploy admin-verify
supabase functions deploy admin-permissions
supabase functions deploy admin-store-token
supabase functions deploy admin-sync-repositories
```

Or deploy all at once:

```bash
# Deploy all functions
for func in audio-process repositories-authorized github-create-issue admin-verify admin-permissions admin-store-token admin-sync-repositories; do
  supabase functions deploy $func
done
```

## Environment Variables

Make sure these environment variables are set in your Supabase project:

- `OPENAI_API_KEY` - For Whisper and GPT-4o access
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for admin operations)

## Testing

Test functions locally:

```bash
# Start local Supabase
supabase start

# Serve function locally
supabase functions serve audio-process

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/audio-process' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"audioUrl": "...", "repository": "owner/repo"}'
```
