export type NewsletterStatus = 'DRAFT' | 'COLLECTING' | 'REVIEW' | 'APPROVED' | 'PUBLISHED'
export type ContributionType = 'SUCCESS' | 'FAIL' | 'INFO' | 'OTHER'
export type ContributionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
export type GlobalRole = 'ADMIN' | 'SUPER_ADMIN' | 'USER'

export interface Group {
  id: number
  name: string
  description?: string | null
}

export interface GroupMembership {
  group: Group
  roleInGroup: string
}

export interface User {
  id: number
  name: string
  email: string
  trigram: string
  globalRole: GlobalRole
  mustChangePassword?: boolean
  memberships?: GroupMembership[]
}

export interface Newsletter {
  id: number
  title: string
  period?: string | null
  status: NewsletterStatus
  groupId: number
  layoutConfig?: any
  renderedHtml?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Contribution {
  id: number
  newsletterId: number
  userId: number
  type: ContributionType
  title: string
  content: string
  status: ContributionStatus
  createdAt?: string
  updatedAt?: string
}

export interface Template {
  id: number
  name: string
  description?: string | null
  layoutConfig?: any
}

export interface LayoutBlock {
  id: string
  heading: string
  body: string
  tone?: string
}
