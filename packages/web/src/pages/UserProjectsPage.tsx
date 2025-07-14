import { ProjectsPageContent } from '@/components/ProjectsPageContent'

/**
 * Projects page for regular users
 * Shows only their assigned issues in a read-only view
 */
export function UserProjectsPage() {
  return <ProjectsPageContent isReadOnly={true} userView={true} />
}