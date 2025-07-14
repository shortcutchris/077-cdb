# User Projects Implementation

## Übersicht
Eine neue "Projects" Ansicht wurde für normale User implementiert, die eine read-only Version der Admin Projects Seite darstellt.

## Implementierte Funktionen

### 1. Navigation erweitert
- **UserMenu.tsx**: Neuer "Projects" Link für normale User (nicht-Admin)
- Link wird nur angezeigt wenn `isAdmin === false`

### 2. Neue Route hinzugefügt
- **App.tsx**: Route `/projects` für normale User hinzugefügt
- Verwendet `UserProjectsPage` Komponente

### 3. UserProjectsPage Komponente
- **Datei**: `packages/web/src/pages/UserProjectsPage.tsx`
- **Basiert auf**: Admin Projects Komponente
- **Unterschiede**:
  - Read-only: Kein Drag & Drop, kein Status-Ändern
  - Lädt nur Issues aus zugewiesenen Repositories
  - Verwendet `repository_permissions` Tabelle

## Funktionsweise

### Datenbankabfrage
```typescript
// Benutzer-zugewiesene Repositories abrufen
const { data: permissions } = await supabase
  .from('repository_permissions')
  .select('repository_full_name')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .is('revoked_at', null)
```

### Issue-Laden
- Lädt Issues nur aus zugewiesenen Repositories
- Verwendet Admin-Token für GitHub API calls
- Gruppiert Issues nach Status (open, planned, in-progress, done)

### UI-Komponenten
- **ReadOnlyColumn**: Spalten ohne Drag & Drop Funktionalität
- **ReadOnlyIssueCard**: Issue-Karten mit "View" Link
- Repository-Filter: Dropdown zur Auswahl einzelner Repositories

## Berechtigungen
- Nur authentifizierte User können auf `/projects` zugreifen
- User sehen nur Issues aus ihren zugewiesenen Repositories
- Vollständig read-only - keine Änderungen möglich

## Status-Mapping
- `open` → Grün
- `planned` → Blau  
- `in-progress` → Gelb
- `done` → Lila

## Nächste Schritte
Die read-only Implementierung ist vollständig. Für zukünftige Erweiterungen:
- Drag & Drop für User aktivieren (falls gewünscht)
- Status-Änderungen mit Berechtigungsprüfung
- Detailansicht für Issues erweitern