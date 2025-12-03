import type { ContributionStatus, NewsletterStatus } from '../types'

type StatusKind = 'newsletter' | 'contribution'

const newsletterLabels: Record<NewsletterStatus, string> = {
  DRAFT: 'Brouillon',
  COLLECTING: 'Collecte',
  REVIEW: 'Revue',
  APPROVED: 'Validée',
  PUBLISHED: 'Publiée',
}

const contributionLabels: Record<ContributionStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
}

const strongStatuses: string[] = ['PUBLISHED', 'APPROVED']

export function StatusBadge({
  status,
  kind,
}: {
  status: NewsletterStatus | ContributionStatus
  kind: StatusKind
}) {
  const text = kind === 'newsletter' ? newsletterLabels[status as NewsletterStatus] : contributionLabels[status as ContributionStatus]
  const emphasise = strongStatuses.includes(status)
  return <span className={`pill ${emphasise ? 'dark' : ''}`}>{text}</span>
}
