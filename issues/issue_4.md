# Issue #4: GitHub OAuth Integration über Supabase Auth

## Übersicht

Vervollständigung der GitHub OAuth Integration mit erweiterten Features für Auth Management, Protected Routes und GitHub Token Handling.

## Aktueller Stand

- ✅ Basic GitHub OAuth funktioniert bereits
- ✅ Login/Logout grundlegend implementiert
- ✅ Session Persistence vorhanden
- ❌ Kein zentrales Auth State Management
- ❌ Keine Protected Routes
- ❌ GitHub Profildaten nicht synchronisiert
- ❌ GitHub API Token nicht verfügbar

## Implementierungsplan

### Phase 1: Auth Context & Hook erstellen

1. **AuthContext.tsx erstellen**
   - Zentraler Auth State (user, loading, error)
   - Session Management
   - Login/Logout Funktionen
2. **useAuth Hook**
   - Einfacher Zugriff auf Auth State
   - TypeScript Types für User

### Phase 2: User Profile Synchronisation

1. **Profile Update bei Login**
   - GitHub Username speichern
   - Avatar URL synchronisieren
   - Full Name aus GitHub
2. **Supabase Trigger erweitern**
   - Automatische Profile-Updates
   - Metadata von GitHub OAuth

### Phase 3: GitHub Token Management

1. **Token Storage**
   - Sicheres Speichern des GitHub Access Tokens
   - Token in Supabase Auth Metadata
2. **Token Access**
   - Helper Funktion für API Calls
   - Token Refresh Handling

### Phase 4: Protected Routes

1. **Route Guards**
   - ProtectedRoute Component
   - Redirect zu Login wenn nicht authentifiziert
2. **Layout Updates**
   - App Layout mit Auth Check
   - Loading States während Auth

### Phase 5: UI/UX Verbesserungen

1. **User Menu**
   - Avatar anzeigen
   - Dropdown mit Logout
   - Link zu GitHub Profil
2. **Loading & Error States**
   - Skeleton während Auth Check
   - Error Messages bei Login-Fehlern

## Technische Details

### Neue Dateien

- `src/contexts/AuthContext.tsx`
- `src/hooks/useAuth.ts`
- `src/components/ProtectedRoute.tsx`
- `src/components/UserMenu.tsx`
- `src/lib/github.ts`

### Supabase Anpassungen

- Profile Tabelle erweitern für GitHub Daten
- RLS Policies prüfen
- Auth Hooks für Token Storage

### Environment Variables

- Keine neuen erforderlich

## Testing Plan

1. Login/Logout Flow testen
2. Session Persistence über Browser Reload
3. Protected Routes Zugriff testen
4. GitHub Token für API Calls verifizieren
5. Profile Sync überprüfen

## Erfolgsmetriken

- [ ] Auth Context funktioniert global
- [ ] Protected Routes leiten korrekt um
- [ ] GitHub Profildaten in DB gespeichert
- [ ] GitHub Token für API verfügbar
- [ ] User Menu zeigt Avatar und Name
- [ ] Loading States während Auth Check

## Abhängigkeiten

- Supabase Auth bereits konfiguriert
- GitHub OAuth App existiert
- React App Grundstruktur vorhanden

## Geschätzte Zeit

- 2-3 Stunden für vollständige Implementierung
