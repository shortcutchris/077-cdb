# Replit Setup Guide

## Quick Fix für "Blocked request" Error

Wenn du den Fehler "Blocked request. This host is not allowed" bekommst:

1. Die `vite.config.ts` wurde bereits angepasst mit `allowedHosts`
2. Stelle sicher, dass du die neueste Version vom GitHub Repository hast
3. Führe `npm install` erneut aus

## Environment Variables Setup

In Replit musst du die folgenden Secrets hinzufügen:

1. Klicke auf das 🔒 "Secrets" Icon in der linken Sidebar
2. Füge folgende Secrets hinzu:

### Required Secrets:

```
VITE_SUPABASE_URL = https://uecvnenvpgvytgkzfyrh.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlY3ZuZW52cGd2eXRna3pmeXJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1Mjg5OTMsImV4cCI6MjA2NzEwNDk5M30.9_iumlV25O_uIl-FjlL-REH9vlApeqvdKj9Z9N00iqI
VITE_OPENAI_API_KEY = [Dein OpenAI API Key]
```

### Optional (wenn du einen eigenen Key hast):

```
VITE_OPENAI_API_KEY = sk-...
```

## Supabase Dashboard Setup

1. Gehe zu [Supabase Dashboard](https://app.supabase.com)
2. Wähle dein Projekt (uecvnenvpgvytgkzfyrh)
3. Gehe zu **Authentication** > **URL Configuration**
4. Füge deine Replit-URL zu den erlaubten URLs hinzu:

### Site URL:

```
https://[dein-replit-name].repl.co
```

### Redirect URLs:

```
https://[dein-replit-name].repl.co/*
https://*.replit.dev/*
https://*.replit.app/*
```

## GitHub OAuth Setup

1. Gehe zu GitHub > Settings > Developer settings > OAuth Apps
2. Update die Callback URL:

```
https://[dein-replit-name].repl.co/auth/callback
```

## Troubleshooting

### "Blocked request" Error

- Pull die neuesten Änderungen von GitHub
- Die `vite.config.ts` muss `allowedHosts` enthalten

### CORS Errors

- Stelle sicher, dass deine Replit-URL in Supabase erlaubt ist
- Check die Browser-Konsole für spezifische CORS-Fehler

### Build läuft nicht

- Führe `npm install` aus
- Check die Logs im Shell-Tab

### App startet nicht

- Stelle sicher, dass Port 3000 in der .replit Datei konfiguriert ist
- Check ob alle Environment Variables gesetzt sind
