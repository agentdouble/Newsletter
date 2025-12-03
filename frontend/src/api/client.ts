import type {
  Contribution,
  ContributionStatus,
  ContributionType,
  Group,
  Newsletter,
  NewsletterStatus,
  User,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text()
  const data = raw ? (JSON.parse(raw) as unknown) : null

  if (!response.ok) {
    const detail = (data as { detail?: string })?.detail || response.statusText
    throw new Error(detail || `Requête échouée (${response.status})`)
  }

  return data as T
}

function withAuth(headers: HeadersInit = {}, token?: string): HeadersInit {
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers
}

function mapGroup(payload: any): Group {
  return {
    id: payload.id,
    name: payload.name,
    description: payload.description,
  }
}

function mapUser(payload: any): User {
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    trigram: payload.trigram,
    globalRole: payload.global_role,
    mustChangePassword: payload.must_change_password,
    memberships: payload.memberships?.map((m: any) => ({
      group: mapGroup(m.group),
      roleInGroup: m.role_in_group,
    })),
  }
}

function mapNewsletter(payload: any): Newsletter {
  return {
    id: payload.id,
    title: payload.title,
    period: payload.period,
    status: payload.status,
    groupId: payload.group_id,
    layoutConfig: payload.layout_config,
    renderedHtml: payload.rendered_html,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  }
}

function mapContribution(payload: any): Contribution {
  return {
    id: payload.id,
    newsletterId: payload.newsletter_id,
    userId: payload.user_id,
    type: payload.type,
    title: payload.title,
    content: payload.content,
    status: payload.status,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
  }
}

export async function login(email: string, password: string): Promise<{ token: string; mustChangePassword: boolean }>
{
  const body = new URLSearchParams({ username: email, password })
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = await parseResponse<{ access_token: string; must_change_password?: boolean }>(response)
  return { token: data.access_token, mustChangePassword: Boolean(data.must_change_password) }
}

export async function fetchMe(token: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: withAuth({}, token),
  })
  const data = await parseResponse<any>(response)
  return mapUser(data)
}

export async function fetchGroups(token: string): Promise<Group[]> {
  const response = await fetch(`${API_BASE_URL}/groups`, {
    headers: withAuth({}, token),
  })
  const data = await parseResponse<any[]>(response)
  return data.map(mapGroup)
}

export async function createGroup(payload: { name: string; description?: string }, token: string): Promise<Group> {
  const response = await fetch(`${API_BASE_URL}/groups`, {
    method: 'POST',
    headers: withAuth({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify(payload),
  })
  const data = await parseResponse<any>(response)
  return mapGroup(data)
}

export async function fetchNewsletters(
  token: string,
  params?: { status?: NewsletterStatus; groupId?: number; userId?: number; period?: string },
): Promise<Newsletter[]> {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.groupId) query.set('group_id', String(params.groupId))
  if (params?.userId) query.set('user_id', String(params.userId))
  if (params?.period) query.set('period', params.period)

  const response = await fetch(`${API_BASE_URL}/newsletters${query.toString() ? `?${query}` : ''}`, {
    headers: withAuth({}, token),
  })
  const data = await parseResponse<any[]>(response)
  return data.map(mapNewsletter)
}

export async function fetchNewsletter(id: number, token: string): Promise<Newsletter> {
  const response = await fetch(`${API_BASE_URL}/newsletters/${id}`, {
    headers: withAuth({}, token),
  })
  const data = await parseResponse<any>(response)
  return mapNewsletter(data)
}

export async function createNewsletter(
  payload: { title: string; period?: string; status?: NewsletterStatus; groupId: number },
  token: string,
): Promise<Newsletter> {
  const response = await fetch(`${API_BASE_URL}/newsletters`, {
    method: 'POST',
    headers: withAuth({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({
      title: payload.title,
      period: payload.period,
      status: payload.status,
      group_id: payload.groupId,
    }),
  })
  const data = await parseResponse<any>(response)
  return mapNewsletter(data)
}

export async function fetchMyContributions(newsletterId: number, token: string): Promise<Contribution[]> {
  const response = await fetch(`${API_BASE_URL}/newsletters/${newsletterId}/my-contributions`, {
    headers: withAuth({}, token),
  })
  const data = await parseResponse<any[]>(response)
  return data.map(mapContribution)
}

export async function fetchContributions(newsletterId: number, token: string): Promise<Contribution[]> {
  const response = await fetch(`${API_BASE_URL}/newsletters/${newsletterId}/contributions`, {
    headers: withAuth({}, token),
  })
  const data = await parseResponse<any[]>(response)
  return data.map(mapContribution)
}

export async function submitContribution(
  newsletterId: number,
  payload: { type: ContributionType; title: string; content: string; status?: ContributionStatus },
  token: string,
): Promise<Contribution> {
  const response = await fetch(`${API_BASE_URL}/newsletters/${newsletterId}/contributions`, {
    method: 'POST',
    headers: withAuth({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({
      type: payload.type,
      title: payload.title,
      content: payload.content,
      status: payload.status,
    }),
  })
  const data = await parseResponse<any>(response)
  return mapContribution(data)
}

export async function updateContributionStatus(
  contributionId: number,
  status: ContributionStatus,
  token: string,
): Promise<Contribution> {
  const response = await fetch(`${API_BASE_URL}/contributions/${contributionId}/status`, {
    method: 'POST',
    headers: withAuth({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify({ status }),
  })
  const data = await parseResponse<any>(response)
  return mapContribution(data)
}

export async function updateNewsletterLayout(
  newsletterId: number,
  layout: Record<string, unknown>,
  token: string,
): Promise<Newsletter> {
  const response = await fetch(`${API_BASE_URL}/newsletters/${newsletterId}/layout`, {
    method: 'PUT',
    headers: withAuth({ 'Content-Type': 'application/json' }, token),
    body: JSON.stringify(layout),
  })
  const data = await parseResponse<any>(response)
  return mapNewsletter(data)
}

export async function generateAiDraft(newsletterId: number, token: string): Promise<Newsletter> {
  const response = await fetch(`${API_BASE_URL}/newsletters/${newsletterId}/ai-draft`, {
    method: 'POST',
    headers: withAuth({}, token),
  })
  const data = await parseResponse<any>(response)
  return mapNewsletter(data)
}

export async function renderNewsletter(newsletterId: number, token: string): Promise<Newsletter> {
  const response = await fetch(`${API_BASE_URL}/newsletters/${newsletterId}/render`, {
    method: 'POST',
    headers: withAuth({}, token),
  })
  const data = await parseResponse<any>(response)
  return mapNewsletter(data)
}
