# Issue Modal Button Fix

## Problem
Nach der Erstellung eines Issues öffnete der "View Issue" Button im Success-Modal die GitHub-Seite direkt anstatt die Issue-Detailseite in der eigenen Anwendung zu zeigen.

## Solution
Der Button wurde so geändert, dass er zur internen Issue-Detailseite navigiert.

## Changes Made

### 1. Added Navigation Hook
- Importiert `useNavigate` von `react-router-dom`
- Hinzugefügt in der `VoiceRecorder` Komponente

### 2. Modified Button Behavior
**Before:**
```javascript
onClick={() => {
  window.open(createdIssueData.url, '_blank')
}}
```

**After:**
```javascript
onClick={() => {
  // Parse repository to get owner and repo
  const [owner, repo] = createdIssueData.repository.split('/')
  if (owner && repo) {
    // Navigate to internal issue detail page
    navigate(`/issue/${owner}/${repo}/${createdIssueData.number}`)
  }
}}
```

### 3. Updated Icon
- Changed from `ExternalLink` to `Eye` icon
- More appropriate since we're not opening an external link anymore

## Route Structure
The internal route follows this pattern:
```
/issue/:owner/:repo/:issueNumber
```

Example: `/issue/shortcutchris/077-cdb/123`

## Benefits
✅ Keeps user within the application
✅ Maintains application state and context
✅ Consistent user experience
✅ No external redirect to GitHub

## Testing
- Create a new issue via voice recording
- Wait for the success modal to appear
- Click "View Issue" button
- Should navigate to the internal issue detail page instead of opening GitHub