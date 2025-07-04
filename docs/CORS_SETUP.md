# CORS Setup für Replit Deployment

## Übersicht

Cross-Origin Resource Sharing (CORS) ist wichtig, wenn die App auf Replit läuft, da sie von einer anderen Domain (\*.repl.co) auf die Supabase APIs zugreift.

## 1. Vite Konfiguration

Die `vite.config.ts` ist bereits konfiguriert mit:

```typescript
server: {
  cors: {
    origin: true,      // Erlaubt alle Origins in Development
    credentials: true, // Erlaubt Cookies/Auth
  }
},
preview: {
  cors: {
    origin: true,      // Erlaubt alle Origins für Preview
    credentials: true,
  }
}
```

## 2. Supabase Dashboard Konfiguration

**WICHTIG**: Du musst die Replit-URLs in deinem Supabase-Projekt erlauben:

1. Gehe zu [Supabase Dashboard](https://app.supabase.com)
2. Wähle dein Projekt
3. Navigiere zu **Authentication** > **URL Configuration**
4. Füge folgende URLs hinzu:

### Site URL

```
https://your-app-name.your-username.repl.co
```

### Redirect URLs

```
https://your-app-name.your-username.repl.co/*
https://*.repl.co/*
https://*.replit.dev/*
https://*.replit.app/*
http://localhost:5174/*
http://localhost:3000/*
```

## 3. Edge Functions CORS

Alle Edge Functions nutzen die gemeinsame CORS-Konfiguration aus `supabase/functions/_shared/cors.ts`:

```typescript
// Für Development (erlaubt alle Origins)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Für Production (prüft erlaubte Origins)
export const getCorsHeaders = (origin: string | null) => {
  // Prüft ob Origin erlaubt ist
  // Gibt spezifische Headers zurück
}
```

### Edge Function Beispiel:

```typescript
serve(async (req) => {
  const origin = req.headers.get('Origin')
  const headers = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  // ... Rest der Function
})
```

## 4. GitHub OAuth Konfiguration

Für GitHub OAuth musst du auch die Replit-URL als Callback URL hinzufügen:

1. Gehe zu GitHub > Settings > Developer settings > OAuth Apps
2. Wähle deine App
3. Füge zu "Authorization callback URL" hinzu:
   ```
   https://your-app-name.your-username.repl.co/auth/callback
   ```

## 5. Troubleshooting

### CORS Error: "No 'Access-Control-Allow-Origin' header"

1. **Prüfe Supabase Dashboard**: Sind alle Replit-URLs in der Whitelist?
2. **Edge Functions**: Behandeln sie OPTIONS-Requests korrekt?
3. **Browser Console**: Welche Origin wird gesendet?

### Authentication Redirects funktionieren nicht

1. Stelle sicher, dass die Redirect URL genau mit der in Supabase konfigurierten übereinstimmt
2. Verwende `flowType: 'pkce'` für bessere Sicherheit

### Cookies werden nicht gesetzt

1. Prüfe ob `credentials: 'include'` in fetch-Requests gesetzt ist
2. Stelle sicher, dass die Supabase-Session-Cookies für die Domain erlaubt sind

## 6. Security Best Practices

### Für Production:

1. **Niemals `*` als Origin verwenden** - immer spezifische Domains
2. **Environment Variables nutzen** für erlaubte Origins
3. **Rate Limiting** implementieren
4. **API Keys rotieren** regelmäßig

### Empfohlene Production CORS Headers:

```typescript
const productionCorsHeaders = {
  'Access-Control-Allow-Origin': 'https://specifai.repl.co',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 Stunden Cache
}
```

## 7. Testing

### Lokaler Test:

```bash
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     https://your-supabase-url.supabase.co/rest/v1/
```

### Replit Test:

Nach dem Deployment, teste in der Browser-Konsole:

```javascript
fetch('https://your-supabase-url.supabase.co/rest/v1/your_table', {
  credentials: 'include',
  headers: {
    apikey: 'your-anon-key',
    'Content-Type': 'application/json',
  },
}).then((r) => console.log(r.headers))
```

## Resources

- [Supabase CORS Docs](https://supabase.com/docs/guides/functions/cors)
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Replit Deployment Guide](https://docs.replit.com/hosting/deployments)
