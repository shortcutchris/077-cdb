import { Circle, Clock, PlayCircle, CheckCircle } from 'lucide-react'
import type { IssueStatus } from '@/components/IssueStatusSelector'

export const ISSUE_STATUSES: IssueStatus[] = [
  {
    value: 'open',
    label: 'Open',
    color: 'green',
    icon: <Circle className="h-4 w-4" />,
  },
  {
    value: 'planned',
    label: 'Planned',
    color: 'blue',
    icon: <Clock className="h-4 w-4" />,
  },
  {
    value: 'in-progress',
    label: 'In Progress',
    color: 'yellow',
    icon: <PlayCircle className="h-4 w-4" />,
  },
  {
    value: 'done',
    label: 'Done',
    color: 'purple',
    icon: <CheckCircle className="h-4 w-4" />,
  },
]