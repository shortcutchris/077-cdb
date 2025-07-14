import { ProjectsPageContent } from '@/components/ProjectsPageContent'

/**
 * Projects page for administrators
 * Shows all issues across repositories with full management capabilities
 */
export function ProjectsPage() {
  return <ProjectsPageContent isReadOnly={false} userView={false} />
}
