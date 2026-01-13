import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chart, ArcElement, DoughnutController, Tooltip, Legend } from 'chart.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger
} from '@/components/ui/sidebar';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ROLES = ['user', 'admin', 'superadmin'];

const REACTIONS = [
  { id: 'up', label: 'Pouce haut' },
  { id: 'down', label: 'Pouce bas' }
];

const REACTION_BASELINE = {
  up: 0,
  down: 0
};

const TABS = [
  { id: 'feed', label: 'Fil', roles: ROLES },
  { id: 'collect', label: 'Collect', roles: ROLES },
  { id: 'contributions', label: 'Contributions', roles: ROLES },
  { id: 'generator', label: 'Générateur', roles: ['admin', 'superadmin'] },
  { id: 'admin', label: 'Admin', roles: ['superadmin'] }
];

const TAB_ROUTES = {
  feed: '/newsletter/fil',
  collect: '/newsletter/collect',
  contributions: '/newsletter/contribution',
  generator: '/newsletter/generateur',
  admin: '/newsletter/admin'
};

const ROLE_LABELS = {
  user: 'Utilisateur',
  admin: 'Admin',
  superadmin: 'Super admin'
};

const AUTH_STORAGE_KEY = 'anjanews.session';
const PASSWORD_MIN_LENGTH = 10;
const DEFAULT_SYSTEM_PROMPT =
  'Tu es un redacteur de newsletter interne. Ecris un article fluide et narratif, pas une liste de faits. Evite les listes a puces sauf si strictement necessaire. Ecris en francais, style clair et professionnel. Ne fabrique aucune information, synthese uniquement a partir des contributions.';

function loadStoredSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[auth] failed_to_load_session', error);
    return null;
  }
}

function saveStoredSession(session) {
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('[auth] failed_to_save_session', error);
  }
}

function clearStoredSession() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

async function apiRequest(path, options = {}) {
  const { token, ...fetchOptions } = options;
  const headers = { ...(fetchOptions.headers || {}) };
  if (fetchOptions.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers
  });
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;
  if (!response.ok) {
    const detail =
      payload?.detail || (await response.text().catch(() => ''));
    const message = detail || `Erreur API (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  if (response.status === 204) return null;
  if (isJson) return payload;
  return response.text();
}

function withEngagement(newsletter) {
  return {
    ...newsletter,
    reactions: { ...REACTION_BASELINE, ...(newsletter.reactions || {}) },
    comments: newsletter.comments || []
  };
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toTrigram(value) {
  const cleaned = (value || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3);
  return cleaned.toUpperCase();
}

function normalizeUserName(value) {
  return (value || '').trim().toUpperCase().slice(0, 16);
}

function formatAuthError(error) {
  const detail = error?.detail || error?.message;
  if (detail === 'INVALID_CREDENTIALS') {
    return 'Identifiants invalides.';
  }
  if (detail === 'PASSWORD_TOO_SHORT') {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (detail === 'BOOTSTRAP_ALREADY_COMPLETED') {
    return 'Un compte existe déjà. Connectez-vous.';
  }
  if (detail === 'AUTH_REQUIRED') {
    return 'Session expirée. Merci de vous reconnecter.';
  }
  return error?.message || 'Action impossible pour le moment.';
}

function makeSnippet(value, limit = 220) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  return trimmed.length > limit
    ? `${trimmed.slice(0, limit).trim()}…`
    : trimmed;
}

function buildNewsletterDraft(contributions, label) {
  if (!contributions.length) {
    return (
      '<p>Aucune contribution pour l’instant.</p>' +
      '<p>Invitez vos équipes à partager les faits marquants du mois dans l’onglet Collect.</p>'
    );
  }

  const parts = [];
  const safeLabel = label ? escapeHtml(label) : 'Newsletter interne';

  parts.push(`<h1>${safeLabel}</h1>`);
  parts.push(
    '<p class="nl-intro">Bonjour à toutes et tous, cette édition rassemble les principaux faits marquants du mois, à partir des contributions envoyées par les équipes.</p>'
  );

  const mainItems = contributions
    .map((c) => makeSnippet(c.text, 260))
    .filter(Boolean)
    .map((snippet) => `<li>${escapeHtml(snippet)}</li>`);
  const successItems = contributions
    .map((c) => makeSnippet(c.successStory))
    .filter(Boolean)
    .map((snippet) => `<li>${escapeHtml(snippet)}</li>`);
  const failItems = contributions
    .map((c) => makeSnippet(c.failStory))
    .filter(Boolean)
    .map((snippet) => `<li>${escapeHtml(snippet)}</li>`);

  if (mainItems.length) {
    parts.push('<h2>Faits marquants du mois</h2>');
    parts.push(`<ul>${mainItems.join('')}</ul>`);
  }

  if (successItems.length) {
    parts.push('<h2>Success stories</h2>');
    parts.push(`<ul>${successItems.join('')}</ul>`);
  }

  if (failItems.length) {
    parts.push('<h2>Fail stories utiles</h2>');
    parts.push(`<ul>${failItems.join('')}</ul>`);
  }

  if (!mainItems.length && !successItems.length && !failItems.length) {
    parts.push(
      '<p>Aucune contribution détaillée pour cette édition. Invitez vos équipes à enrichir les blocs du formulaire Collect.</p>'
    );
  }

  parts.push('<h2>À retenir pour les équipes</h2>');
  parts.push(
    '<p>Merci à toutes les équipes pour le temps consacré à documenter ces éléments et pour la qualité des retours partagés. N’hésitez pas à répondre à cette newsletter pour proposer des compléments ou poser des questions.</p>'
  );

  return parts.join('');
}

function App() {
  const storedSession = useMemo(() => loadStoredSession(), []);
  const [authToken, setAuthToken] = useState(storedSession?.token || null);
  const [currentUser, setCurrentUser] = useState(storedSession?.user || null);
  const [authStatus, setAuthStatus] = useState(
    authToken ? 'checking' : 'unauthenticated'
  );
  const [authError, setAuthError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [loginForm, setLoginForm] = useState({ name: '', password: '' });
  const [bootstrapForm, setBootstrapForm] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  });
  const [resetForm, setResetForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [contributions, setContributions] = useState([]);
  const [newsletters, setNewsletters] = useState([]);
  const [users, setUsers] = useState([]);
  const [resetPasswords, setResetPasswords] = useState({});
  const [groups, setGroups] = useState([]);
  const [currentEdition, setCurrentEdition] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [newsletterDraftHtml, setNewsletterDraftHtml] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [generatorError, setGeneratorError] = useState('');
  const [generatorSystemPrompt, setGeneratorSystemPrompt] = useState(
    DEFAULT_SYSTEM_PROMPT
  );
  const [activeGroupId] = useState('all');
  const location = useLocation();
  const navigate = useNavigate();
  const role = currentUser?.role || 'user';
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem('anjanews.theme');
      if (stored) return stored === 'dark';
    } catch (error) {
      // Ignore storage errors and fall back to system preference.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('anjanews.theme', isDarkMode ? 'dark' : 'light');
    } catch (error) {
      // Ignore storage errors.
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (location.pathname === '/') {
      navigate(TAB_ROUTES.feed, { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleLogout = useCallback(
    async ({ silent } = {}) => {
      if (authToken) {
        try {
          await apiRequest('/api/auth/logout', {
            method: 'POST',
            token: authToken
          });
        } catch (error) {
          if (!silent) {
            console.warn('[auth] logout_failed', error);
          }
        }
      }
      clearStoredSession();
      setAuthToken(null);
      setCurrentUser(null);
      setAuthStatus('unauthenticated');
      setAuthError('');
      setAuthMode('login');
      setContributions([]);
      setNewsletters([]);
      setUsers([]);
      setGroups([]);
      setCurrentEdition(null);
      setResetPasswords({});
      setNewsletterDraftHtml('');
      setIsGeneratingDraft(false);
      setGeneratorError('');
    },
    [authToken]
  );

  const request = useCallback(
    async (path, options = {}) => {
      try {
        return await apiRequest(path, { ...options, token: authToken });
      } catch (error) {
        if (error.status === 401) {
          await handleLogout({ silent: true });
        } else if (
          error.status === 403 &&
          error.detail === 'PASSWORD_RESET_REQUIRED'
        ) {
          setAuthStatus('must-reset');
        }
        throw error;
      }
    },
    [authToken, handleLogout]
  );

  const handleLogin = useCallback(
    async ({ name, password }) => {
      setIsProcessingAuth(true);
      setAuthError('');
      try {
        const data = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ name, password })
        });
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setAuthStatus(data.mustReset ? 'must-reset' : 'authenticated');
        saveStoredSession({ token: data.token, user: data.user });
        console.info('[auth] login_success', { userId: data.user?.id });
      } catch (error) {
        setAuthError(formatAuthError(error));
        console.error('[auth] login_failed', error);
      } finally {
        setIsProcessingAuth(false);
      }
    },
    []
  );

  const handleBootstrap = useCallback(
    async ({ name, password }) => {
      setIsProcessingAuth(true);
      setAuthError('');
      try {
        const data = await apiRequest('/api/auth/bootstrap', {
          method: 'POST',
          body: JSON.stringify({ name, password })
        });
        setAuthToken(data.token);
        setCurrentUser(data.user);
        setAuthStatus('authenticated');
        saveStoredSession({ token: data.token, user: data.user });
        console.info('[auth] bootstrap_success', { userId: data.user?.id });
      } catch (error) {
        setAuthError(formatAuthError(error));
        console.error('[auth] bootstrap_failed', error);
      } finally {
        setIsProcessingAuth(false);
      }
    },
    []
  );

  const handlePasswordChange = useCallback(
    async ({ currentPassword, newPassword }) => {
      setIsProcessingAuth(true);
      setAuthError('');
      try {
        const data = await request('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword })
        });
        setCurrentUser(data.user);
        setAuthStatus('authenticated');
        saveStoredSession({ token: authToken, user: data.user });
        console.info('[auth] password_changed', { userId: data.user?.id });
      } catch (error) {
        setAuthError(formatAuthError(error));
        console.error('[auth] password_change_failed', error);
      } finally {
        setIsProcessingAuth(false);
      }
    },
    [authToken, request]
  );

  useEffect(() => {
    if (!authToken) {
      setAuthStatus('unauthenticated');
      setCurrentUser(null);
      return;
    }
    if (authStatus === 'authenticated' || authStatus === 'must-reset') {
      return;
    }
    const controller = new AbortController();
    const loadSession = async () => {
      try {
        const data = await apiRequest('/api/auth/me', {
          token: authToken,
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        setCurrentUser(data.user);
        setAuthStatus(data.mustReset ? 'must-reset' : 'authenticated');
        setAuthError('');
        saveStoredSession({ token: authToken, user: data.user });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('[auth] session_failed', error);
        }
        handleLogout({ silent: true });
      }
    };

    loadSession();

    return () => controller.abort();
  }, [authStatus, authToken, handleLogout]);

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      setIsBootstrapping(false);
      return;
    }
    const controller = new AbortController();
    setIsBootstrapping(true);

    const loadBootstrap = async () => {
      try {
        const data = await request('/api/bootstrap', {
          signal: controller.signal
        });
        if (controller.signal.aborted) return;
        setCurrentEdition(data.currentEdition || null);
        setUsers(data.users || []);
        setGroups(data.groups || []);
        setNewsletters((data.newsletters || []).map(withEngagement));
        setContributions(data.contributions || []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('[bootstrap] failed', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsBootstrapping(false);
        }
      }
    };

    loadBootstrap();

    return () => controller.abort();
  }, [authStatus, request]);

  const currentNewsletterLabel = useMemo(() => {
    if (currentEdition?.label) return currentEdition.label;
    const now = new Date();
    const month = now.toLocaleString('fr-FR', { month: 'long' });
    const year = now.getFullYear();
    return `Newsletter mensuelle · ${month} ${year}`;
  }, [currentEdition]);

  const currentEditionId = currentEdition?.id || null;

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => tab.roles.includes(role)),
    [role]
  );

  const currentTabId = useMemo(() => {
    const match = Object.entries(TAB_ROUTES).find(([, path]) =>
      location.pathname.startsWith(path)
    );
    return match ? match[0] : 'feed';
  }, [location.pathname]);

  const activeGroup = useMemo(
    () =>
      activeGroupId === 'all'
        ? null
        : groups.find((group) => group.id === activeGroupId) || null,
    [activeGroupId, groups]
  );

  const commentAuthor = activeGroup
    ? `${currentUser?.name || ROLE_LABELS[role]} · ${activeGroup.name}`
    : currentUser?.name || ROLE_LABELS[role];

  const selectedNewsletterId = useMemo(() => {
    if (currentTabId !== 'feed') return null;
    const base = TAB_ROUTES.feed;
    if (!location.pathname.startsWith(`${base}/`)) return null;
    const parts = location.pathname.split('/');
    const last = parts[parts.length - 1];
    return last || null;
  }, [location.pathname, currentTabId]);

  const handleCreateContribution = async (payload) => {
    if (!currentEditionId) return;
    const requestBody = {
      editionId: currentEditionId,
      groupId: activeGroupId === 'all' ? null : activeGroupId,
      text: payload.text || '',
      successStory: payload.successStory || '',
      failStory: payload.failStory || ''
    };
    try {
      const entry = await request('/api/contributions', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      console.info('[collect] contribution_created', entry);
      setContributions((prev) => [entry, ...prev]);
    } catch (error) {
      console.error('[collect] contribution_failed', error);
    }
  };

  const generatorContributions = contributions;

  const handleGenerateDraft = async () => {
    if (isGeneratingDraft || !generatorContributions.length) return;
    setIsGeneratingDraft(true);
    setGeneratorError('');

    if (!currentEditionId) {
      const draft = buildNewsletterDraft(
        generatorContributions,
        currentNewsletterLabel
      );
      setNewsletterDraftHtml(draft);
      console.info('[generator] newsletter_draft_generated', {
        contributions: generatorContributions.length,
        source: 'fallback'
      });
      setIsGeneratingDraft(false);
      return;
    }

    try {
      const systemPrompt = (generatorSystemPrompt || '').trim();
      const defaultPrompt = DEFAULT_SYSTEM_PROMPT.trim();
      const payload = { editionId: currentEditionId };
      if (systemPrompt && systemPrompt !== defaultPrompt) {
        payload.systemPrompt = systemPrompt;
      }
      const data = await request('/api/newsletters/generate', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const html = (data?.html || '').trim();
      if (!html) {
        throw new Error('EMPTY_DRAFT');
      }
      setNewsletterDraftHtml(html);
      console.info('[generator] newsletter_draft_generated', {
        contributions: generatorContributions.length,
        source: 'ai'
      });
    } catch (error) {
      console.error('[generator] ai_generate_failed', error);
      const draft = buildNewsletterDraft(
        generatorContributions,
        currentNewsletterLabel
      );
      setNewsletterDraftHtml(draft);
      setGeneratorError(
        'Génération IA indisponible. Brouillon automatique appliqué.'
      );
      console.info('[generator] newsletter_draft_generated', {
        contributions: generatorContributions.length,
        source: 'fallback'
      });
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handlePublishDraft = async (html, imageUrl) => {
    const body = (html || '').trim();
    if (!body) return;
    const payload = {
      title: currentNewsletterLabel,
      body,
      imageUrl: imageUrl || null,
      groupId: activeGroupId === 'all' ? null : activeGroupId,
      editionId: currentEditionId
    };

    try {
      const article = await request('/api/newsletters', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      console.info('[generator] newsletter_published_to_feed', {
        id: article.id,
        groupId: article.groupId,
        hasImage: Boolean(article.imageUrl)
      });
      setNewsletters((prev) => [withEngagement(article), ...prev]);
    } catch (error) {
      console.error('[generator] publish_failed', error);
    }
  };

  const handleReactToNewsletter = async (newsletterId, reactionId) => {
    if (!Object.prototype.hasOwnProperty.call(REACTION_BASELINE, reactionId)) {
      return;
    }
    try {
      const data = await request(`/api/newsletters/${newsletterId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ reactionId })
      });
      setNewsletters((prev) =>
        prev.map((nl) =>
          nl.id === newsletterId
            ? { ...nl, reactions: { ...REACTION_BASELINE, ...data.reactions } }
            : nl
        )
      );
      console.info('[feed] reaction_recorded', {
        id: newsletterId,
        reaction: reactionId
      });
    } catch (error) {
      console.error('[feed] reaction_failed', error);
    }
  };

  const handleAddComment = async (newsletterId, body) => {
    const trimmed = (body || '').trim();
    if (!trimmed) return;
    try {
      const entry = await request(`/api/newsletters/${newsletterId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: trimmed })
      });
      console.info('[feed] comment_added', {
        id: newsletterId,
        author: commentAuthor
      });
      setNewsletters((prev) =>
        prev.map((nl) =>
          nl.id === newsletterId
            ? { ...nl, comments: [entry, ...(nl.comments || [])] }
            : nl
        )
      );
    } catch (error) {
      console.error('[feed] comment_failed', error);
    }
  };

  const handleCreateNewsletter = async ({ title, groupId }) => {
    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) return;
    const payload = {
      title: trimmedTitle,
      body: 'Brouillon à compléter.',
      groupId: groupId && groupId !== 'all' ? groupId : null,
      editionId: currentEditionId
    };
    try {
      const entry = await request('/api/newsletters', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      console.info('[admin] newsletter_created', {
        id: entry.id,
        groupId: entry.groupId
      });
      setNewsletters((prev) => [withEngagement(entry), ...prev]);
    } catch (error) {
      console.error('[admin] newsletter_failed', error);
    }
  };

  const handleAddUser = async (user) => {
    const trigram = toTrigram(user.name);
    if (!trigram || !user.temporaryPassword) return;
    try {
      const entry = await request('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: trigram,
          role: user.role,
          groupIds: user.groupIds || [],
          temporaryPassword: user.temporaryPassword
        })
      });
      console.info('[admin] user_added', entry);
      setUsers((prev) => [...prev, entry]);
    } catch (error) {
      console.error('[admin] user_add_failed', error);
    }
  };

  const handleResetUserPassword = async (userId) => {
    try {
      const data = await request(`/api/users/${userId}/reset-password`, {
        method: 'POST'
      });
      console.info('[admin] user_password_reset', { userId });
      setResetPasswords((prev) => ({
        ...prev,
        [userId]: data.temporaryPassword
      }));
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, mustReset: data.mustReset } : user
        )
      );
    } catch (error) {
      console.error('[admin] user_password_reset_failed', error);
    }
  };

  const handleUpdateUserGroups = async (userId, groupIds) => {
    try {
      const entry = await request(`/api/users/${userId}/groups`, {
        method: 'PUT',
        body: JSON.stringify({ groupIds })
      });
      console.info('[admin] user_groups_updated', { userId, groupIds });
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? entry : user))
      );
    } catch (error) {
      console.error('[admin] user_groups_failed', error);
    }
  };

  const handleUpdateGroupAdmins = async (groupId, adminIds) => {
    try {
      const entry = await request(`/api/groups/${groupId}/admins`, {
        method: 'PUT',
        body: JSON.stringify({ adminIds })
      });
      console.info('[admin] group_admins_updated', { groupId, adminIds });
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? entry : g))
      );
      setUsers((prev) =>
        prev.map((user) => {
          if (!adminIds.includes(user.id)) return user;
          const ids = user.groupIds || [];
          if (ids.includes(groupId)) return user;
          return { ...user, groupIds: [...ids, groupId] };
        })
      );
    } catch (error) {
      console.error('[admin] group_admins_failed', error);
    }
  };

  const handleAddGroup = async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    try {
      const entry = await request('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed })
      });
      console.info('[admin] group_added', entry);
      setGroups((prev) => [...prev, entry]);
    } catch (error) {
      console.error('[admin] group_add_failed', error);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await request(`/api/groups/${groupId}`, { method: 'DELETE' });
      console.info('[admin] group_deleted', { groupId });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setUsers((prev) =>
        prev.map((user) => {
          const ids = user.groupIds || [];
          if (!ids.includes(groupId)) return user;
          return { ...user, groupIds: ids.filter((id) => id !== groupId) };
        })
      );
    } catch (error) {
      console.error('[admin] group_delete_failed', error);
    }
  };

  const handleOpenNewsletter = (newsletterId) => {
    if (!newsletterId) return;
    console.info('[feed] newsletter_opened', { id: newsletterId });
    navigate(`${TAB_ROUTES.feed}/${newsletterId}`);
  };

  const handleBackToFeed = () => {
    console.info('[feed] back_to_feed');
    navigate(TAB_ROUTES.feed);
  };

  const currentTab =
    visibleTabs.find((tab) => tab.id === currentTabId) || visibleTabs[0];
  const userInitials = useMemo(
    () => toTrigram(currentUser?.name || ROLE_LABELS[role]),
    [currentUser?.name, role]
  );

  const loginDisabled =
    isProcessingAuth ||
    !loginForm.name.trim() ||
    !loginForm.password.trim();
  const bootstrapMismatch =
    bootstrapForm.password &&
    bootstrapForm.confirmPassword &&
    bootstrapForm.password !== bootstrapForm.confirmPassword;
  const bootstrapDisabled =
    isProcessingAuth ||
    !bootstrapForm.name.trim() ||
    bootstrapForm.password.length < PASSWORD_MIN_LENGTH ||
    bootstrapMismatch;
  const resetMismatch =
    resetForm.newPassword &&
    resetForm.confirmPassword &&
    resetForm.newPassword !== resetForm.confirmPassword;
  const resetDisabled =
    isProcessingAuth ||
    !resetForm.currentPassword ||
    resetForm.newPassword.length < PASSWORD_MIN_LENGTH ||
    resetMismatch;

  if (authStatus !== 'authenticated') {
    const isChecking = authStatus === 'checking';
    const isReset = authStatus === 'must-reset';
    const isBootstrap = authMode === 'bootstrap';
    const title = isReset
      ? 'Changer le mot de passe'
      : isBootstrap
        ? 'Créer le super admin'
        : 'Connexion';
    const subtitle = isReset
      ? 'Votre mot de passe temporaire doit être remplacé dès la première connexion.'
      : isBootstrap
        ? 'Initialisez le premier compte super admin avant de continuer.'
        : 'Connectez-vous avec les identifiants fournis par l’administrateur.';

    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="logo-pill">
            <span className="logo-dot" />
            <span className="logo-text">Anjanews</span>
          </div>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {authError && <p className="auth-error">{authError}</p>}
          {isChecking ? (
            <p className="auth-loading">Vérification de la session…</p>
          ) : isReset ? (
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                if (resetDisabled) return;
                if (resetMismatch) {
                  setAuthError('Les mots de passe ne correspondent pas.');
                  return;
                }
                handlePasswordChange({
                  currentPassword: resetForm.currentPassword,
                  newPassword: resetForm.newPassword
                });
                setResetForm({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                });
              }}
            >
              <label className="field field--full">
                <span className="field-label">Mot de passe temporaire</span>
                <input
                  type="password"
                  value={resetForm.currentPassword}
                  onChange={(event) =>
                    setResetForm((prev) => ({
                      ...prev,
                      currentPassword: event.target.value
                    }))
                  }
                  autoComplete="current-password"
                />
              </label>
              <label className="field field--full">
                <span className="field-label">
                  Nouveau mot de passe (min. {PASSWORD_MIN_LENGTH} caractères)
                </span>
                <input
                  type="password"
                  value={resetForm.newPassword}
                  onChange={(event) =>
                    setResetForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value
                    }))
                  }
                  autoComplete="new-password"
                />
              </label>
              <label className="field field--full">
                <span className="field-label">Confirmer le nouveau mot de passe</span>
                <input
                  type="password"
                  value={resetForm.confirmPassword}
                  onChange={(event) =>
                    setResetForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value
                    }))
                  }
                  autoComplete="new-password"
                />
              </label>
              {resetMismatch && (
                <p className="auth-helper">Les mots de passe ne correspondent pas.</p>
              )}
              <div className="form-actions form-actions--right">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={resetDisabled}
                >
                  Mettre à jour
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleLogout({})}
                >
                  Se déconnecter
                </button>
              </div>
            </form>
          ) : (
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                if (isBootstrap) {
                  if (bootstrapDisabled) return;
                  if (bootstrapMismatch) {
                    setAuthError('Les mots de passe ne correspondent pas.');
                    return;
                  }
                  handleBootstrap({
                    name: bootstrapForm.name,
                    password: bootstrapForm.password
                  });
                  setBootstrapForm({
                    name: '',
                    password: '',
                    confirmPassword: ''
                  });
                } else {
                  if (loginDisabled) return;
                  handleLogin({
                    name: loginForm.name,
                    password: loginForm.password
                  });
                  setLoginForm((prev) => ({ ...prev, password: '' }));
                }
              }}
            >
              <label className="field field--full">
                <span className="field-label">
                  {isBootstrap ? 'Nom du super admin' : 'Identifiant'}
                </span>
                <input
                  type="text"
                  value={isBootstrap ? bootstrapForm.name : loginForm.name}
                  onChange={(event) => {
                    const nextValue = normalizeUserName(event.target.value);
                    if (isBootstrap) {
                      setBootstrapForm((prev) => ({ ...prev, name: nextValue }));
                    } else {
                      setLoginForm((prev) => ({ ...prev, name: nextValue }));
                    }
                  }}
                  autoComplete="username"
                  placeholder="Trigramme ou nom court"
                />
              </label>
              <label className="field field--full">
                <span className="field-label">
                  Mot de passe
                  {isBootstrap ? ` (min. ${PASSWORD_MIN_LENGTH} caractères)` : ''}
                </span>
                <input
                  type="password"
                  value={isBootstrap ? bootstrapForm.password : loginForm.password}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    if (isBootstrap) {
                      setBootstrapForm((prev) => ({
                        ...prev,
                        password: nextValue
                      }));
                    } else {
                      setLoginForm((prev) => ({
                        ...prev,
                        password: nextValue
                      }));
                    }
                  }}
                  autoComplete={isBootstrap ? 'new-password' : 'current-password'}
                />
              </label>
              {isBootstrap && (
                <>
                  <label className="field field--full">
                    <span className="field-label">Confirmer le mot de passe</span>
                    <input
                      type="password"
                      value={bootstrapForm.confirmPassword}
                      onChange={(event) =>
                        setBootstrapForm((prev) => ({
                          ...prev,
                          confirmPassword: event.target.value
                        }))
                      }
                      autoComplete="new-password"
                    />
                  </label>
                  {bootstrapMismatch && (
                    <p className="auth-helper">
                      Les mots de passe ne correspondent pas.
                    </p>
                  )}
                </>
              )}
              <div className="form-actions form-actions--right">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isBootstrap ? bootstrapDisabled : loginDisabled}
                >
                  {isBootstrap ? 'Créer le compte' : 'Se connecter'}
                </button>
              </div>
            </form>
          )}
          {!isReset && !isChecking && (
            <div className="auth-footer">
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setAuthMode(isBootstrap ? 'login' : 'bootstrap');
                  setAuthError('');
                }}
              >
                {isBootstrap
                  ? 'Retour à la connexion'
                  : 'Créer le super admin initial'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-sidebar-border">
        <SidebarHeader className="px-4 pb-3 pt-4">
          <div className="flex items-center gap-2">
            <span className="logo-dot" />
            <span className="logo-text">Anjanews</span>
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="px-2 py-3">
          <SidebarMenu>
            {visibleTabs.map((tab) => (
              <SidebarMenuItem key={tab.id}>
                <SidebarMenuButton
                  type="button"
                  isActive={tab.id === currentTab.id}
                  tooltip={tab.label}
                  onClick={() => navigate(TAB_ROUTES[tab.id])}
                >
                  <span>{tab.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="px-4 pb-4 pt-3">
          <div className="relative w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={
                  isUserMenuOpen
                    ? 'flex h-12 w-12 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent text-xs font-semibold uppercase text-sidebar-accent-foreground shadow-sm transition'
                    : 'flex h-12 w-12 items-center justify-center rounded-full border border-sidebar-border bg-sidebar-accent/70 text-xs font-semibold uppercase text-sidebar-accent-foreground shadow-sm transition hover:bg-sidebar-accent'
                }
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                aria-expanded={isUserMenuOpen}
                aria-label="Profil utilisateur"
              >
                {userInitials}
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full border border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => setIsDarkMode((prev) => !prev)}
                aria-label={
                  isDarkMode
                    ? 'Activer le mode clair'
                    : 'Activer le mode sombre'
                }
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>
            {isUserMenuOpen && (
              <div className="absolute bottom-full left-0 z-20 mb-3 w-full rounded-xl border border-sidebar-border bg-sidebar p-3 text-sidebar-foreground shadow-sm">
                <div className="text-sm font-semibold">
                  {currentUser?.name || 'Utilisateur connecté'}
                </div>
                <div className="text-xs text-sidebar-foreground/70">
                  {ROLE_LABELS[role]}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full justify-center text-xs"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    handleLogout({});
                  }}
                >
                  Déconnexion
                </Button>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="app-inset">
        <div className="app-shell">
          <div className="flex items-center md:hidden">
            <SidebarTrigger />
          </div>

          <main className="app-main">
            {currentTab.id === 'feed' && (
              <FeedTab
                newsletters={newsletters}
                groups={groups}
                activeGroupId={activeGroupId}
                selectedNewsletterId={selectedNewsletterId}
                onOpenNewsletter={handleOpenNewsletter}
                onBackToFeed={handleBackToFeed}
                onReact={handleReactToNewsletter}
                onAddComment={handleAddComment}
                viewerLabel={commentAuthor}
              />
            )}
            {currentTab.id === 'collect' && (
              <CollectTab
                targetLabel={currentNewsletterLabel}
                onCreate={handleCreateContribution}
                isReady={!isBootstrapping && Boolean(currentEditionId)}
                authorLabel={currentUser?.name || 'Utilisateur connecté'}
              />
            )}
            {currentTab.id === 'contributions' && (
              <ContributionTab
                contributions={contributions}
                users={users}
                targetLabel={currentNewsletterLabel}
                isDarkMode={isDarkMode}
              />
            )}
            {currentTab.id === 'generator' && (
              <GeneratorTab
                contributions={generatorContributions}
                targetLabel={currentNewsletterLabel}
                draftHtml={newsletterDraftHtml}
                onGenerate={handleGenerateDraft}
                onPublish={handlePublishDraft}
                isGenerating={isGeneratingDraft}
                generatorError={generatorError}
              />
            )}
            {currentTab.id === 'admin' && (
              <AdminTab
                newsletters={newsletters}
                users={users}
                groups={groups}
                resetPasswords={resetPasswords}
                passwordMinLength={PASSWORD_MIN_LENGTH}
                defaultNewsletterTitle={currentNewsletterLabel}
                systemPrompt={generatorSystemPrompt}
                defaultSystemPrompt={DEFAULT_SYSTEM_PROMPT}
                onPromptChange={setGeneratorSystemPrompt}
                onAddUser={handleAddUser}
                onResetUserPassword={handleResetUserPassword}
                onAddGroup={handleAddGroup}
                onUpdateGroupAdmins={handleUpdateGroupAdmins}
                onUpdateUserGroups={handleUpdateUserGroups}
                onDeleteGroup={handleDeleteGroup}
                onCreateNewsletter={handleCreateNewsletter}
              />
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function FeedTab({
  newsletters,
  groups,
  activeGroupId,
  selectedNewsletterId,
  onOpenNewsletter,
  onBackToFeed,
  onReact,
  onAddComment,
  viewerLabel
}) {
  const [commentDrafts, setCommentDrafts] = useState({});

  const visibleNewsletters =
    activeGroupId === 'all'
      ? newsletters
      : newsletters.filter((nl) => nl.groupId === activeGroupId);
  const selectedNewsletter =
    selectedNewsletterId &&
    visibleNewsletters.find((nl) => nl.id === selectedNewsletterId);
  const listNewsletters = selectedNewsletter
    ? [selectedNewsletter]
    : visibleNewsletters;
  const isDetailView = Boolean(selectedNewsletter);

  const handleReactionClick = (event, newsletterId, reactionId) => {
    event.stopPropagation();
    if (onReact) {
      onReact(newsletterId, reactionId);
    }
  };

  const handleCommentSubmit = (event, newsletterId) => {
    event.preventDefault();
    const text = (commentDrafts[newsletterId] || '').trim();
    if (!text || !onAddComment) return;
    onAddComment(newsletterId, text);
    setCommentDrafts((prev) => ({ ...prev, [newsletterId]: '' }));
  };

  return (
    <section className="panel-grid panel-grid--single">
      <article className="panel-card panel-card--feed">
        <header className="panel-header panel-header--feed">
          {selectedNewsletter && (
            <button
              type="button"
              className="secondary-button feed-back-button"
              onClick={onBackToFeed}
            >
              Retour au fil complet
            </button>
          )}
        </header>
        <div className="panel-body panel-body--list newsletter-list">
          {listNewsletters.map((nl) => {
            const isActive = nl.id === selectedNewsletterId;
            const hasHtml =
              nl.body && /<\/?[a-z][\s\S]*>/i.test(nl.body || '');
            const plainText = hasHtml
              ? (nl.body || '').replace(/<[^>]+>/g, '')
              : nl.body || '';
            const snippet =
              plainText.length > 260
                ? `${plainText.slice(0, 260).trim()}…`
                : plainText;
            const reactions = {
              ...REACTION_BASELINE,
              ...(nl.reactions || {})
            };
            const comments = nl.comments || [];

            const imageNode =
              nl.imageUrl && (
                <div className="newsletter-image-wrapper">
                  <img
                    src={nl.imageUrl}
                    alt={nl.title}
                    className="newsletter-image"
                    loading="lazy"
                  />
                </div>
              );

            return (
              <article
                key={nl.id}
                className={
                  isActive
                    ? 'newsletter-article newsletter-article--active'
                    : 'newsletter-article newsletter-article--clickable'
                }
                onClick={
                  isDetailView || !onOpenNewsletter
                    ? undefined
                    : () => onOpenNewsletter(nl.id)
                }
              >
                {isActive && imageNode}
                <div className="newsletter-main">
                  <header className="newsletter-article-header">
                    <div>
                      <h3>{nl.title}</h3>
                      <p className="newsletter-chip-audience">{nl.audience}</p>
                    </div>
                    <div className="newsletter-meta-column">
                      <span className="tag tag--soft">
                        {new Date(nl.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </header>
                  <div className="newsletter-body">
                    {isActive ? (
                      hasHtml ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: nl.body
                          }}
                        />
                      ) : (
                        nl.body
                          .split('\n\n')
                          .filter((block) => block.trim().length > 0)
                          .map((block, index) => <p key={index}>{block}</p>)
                      )
                    ) : (
                      <p className="newsletter-snippet">{snippet}</p>
                    )}
                  </div>
                  <div className="newsletter-footer">
                    <div
                      className="newsletter-engagement"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="reaction-row">
                        {REACTIONS.map((reaction) => {
                          const reactionClass =
                            reaction.id === 'down'
                              ? 'reaction-button reaction-button--down'
                              : 'reaction-button';
                          return (
                            <button
                              key={reaction.id}
                              type="button"
                              className={reactionClass}
                              onClick={(event) =>
                                handleReactionClick(event, nl.id, reaction.id)
                              }
                              aria-label={`${reaction.label} (${reactions[reaction.id] || 0})`}
                            >
                              <span className="reaction-icon" aria-hidden="true">
                                <svg
                                  viewBox="0 0 16 16"
                                  focusable="false"
                                  role="presentation"
                                >
                                  <path
                                    d="M7 2 5.5 6.5H3a1 1 0 0 0-1 1v2.5A1 1 0 0 0 3 11h2v3.5A1.5 1.5 0 0 0 6.5 16h5a1.5 1.5 0 0 0 1.43-1.05l1.5-5A1.5 1.5 0 0 0 13.98 8H10V3.5A1.5 1.5 0 0 0 8.5 2Z"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </span>
                              <span className="reaction-count">
                                {reactions[reaction.id] || 0}
                              </span>
                            </button>
                          );
                        })}
                        <span
                          className="comment-count"
                          aria-label={`Commentaires ${comments.length}`}
                        >
                          <span className="comment-icon" aria-hidden="true">
                            <svg
                              viewBox="0 0 20 20"
                              focusable="false"
                              role="presentation"
                            >
                              <path
                                d="M4.5 4.5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-5.5L7 15.5v-3H4.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                          {comments.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {!isActive && imageNode}

                {isActive && (
                  <div className="comment-stack">
                    <div className="comment-head">
                      <h4>Commentaires</h4>
                      <span className="comment-count">{comments.length}</span>
                    </div>
                    {comments.length ? (
                      <div className="comment-list">
                        {comments.map((comment) => (
                          <div key={comment.id} className="comment-item">
                            <div className="comment-meta">
                              <span>{comment.author || 'Lecteur'}</span>
                              <span>
                                {new Date(comment.createdAt).toLocaleString(
                                  'fr-FR',
                                  {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }
                                )}
                              </span>
                            </div>
                            <p className="comment-body">{comment.body}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-state">
                        Aucun commentaire pour le moment.
                      </p>
                    )}
                    <form
                      className="comment-form"
                      onSubmit={(event) => handleCommentSubmit(event, nl.id)}
                    >
                      <label className="field field--full">
                        <span className="field-label">
                          Réagir en tant que {viewerLabel}
                        </span>
                        <textarea
                          className="notepad-textarea"
                          rows={2}
                          value={commentDrafts[nl.id] || ''}
                          onChange={(event) =>
                            setCommentDrafts((prev) => ({
                              ...prev,
                              [nl.id]: event.target.value
                            }))
                          }
                          placeholder="Réagissez ou posez une question…"
                        />
                      </label>
                      <div className="form-actions form-actions--right">
                        <button
                          type="submit"
                          className="primary-button"
                          disabled={
                            !(commentDrafts[nl.id] || '').trim().length
                          }
                        >
                          Publier
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </article>
    </section>
  );
}

function CollectTab({ onCreate, targetLabel, isReady, authorLabel }) {
  const [text, setText] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isReady) return;
    const main = text.trim();
    if (!main) return;
    onCreate({ newsletterLabel: targetLabel, text: main });
    setText('');
  };

  const isSubmitDisabled = !isReady || !text.trim();

  return (
    <section className="panel-card panel-card--wide">
      <header className="panel-header">
        <h2>Partager les nouveautés du mois</h2>
        <p className="panel-subtitle">
          Un seul bloc pour consigner les faits marquants utiles aux autres
          équipes. Votre compte connecté ({authorLabel || 'utilisateur'}) signe
          automatiquement la contribution.
        </p>
      </header>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field field--full">
          <span className="field-label">Newsletter ciblée</span>
          <div className="tag tag--soft">{targetLabel}</div>
        </label>

        <label className="field field--full">
          <span className="field-label">Nouveautés du mois</span>
          <textarea
            className="notepad-textarea"
            rows={5}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Résumez les faits marquants côté assurance : lancement d’un parcours indemnisation, nouvelle offre auto/habitation, amélioration service clients, etc."
          />
        </label>

        <div className="form-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={isSubmitDisabled}
          >
            Envoyer les nouveautés
          </button>
        </div>
      </form>
    </section>
  );
}

function ContributionTab({ contributions, users, targetLabel, isDarkMode }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const scopedContributions = useMemo(
    () =>
      contributions.filter(
        (c) => (c.newsletterLabel || '') === (targetLabel || '')
      ),
    [contributions, targetLabel]
  );

  const uniqueContributors = useMemo(() => {
    const names = scopedContributions
      .map((c) => (c.author || 'Anonyme').trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [scopedContributions]);

  const contributorCount = uniqueContributors.length;
  const totalUsers = users.length;
  const participationRate = totalUsers
    ? Math.round((contributorCount / totalUsers) * 100)
    : 0;
  const remaining = Math.max(totalUsers - contributorCount, 0);

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return undefined;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const data = [contributorCount, remaining];
    const ctx = node.getContext('2d');
    if (!ctx) return undefined;

    const rootStyles = getComputedStyle(document.documentElement);
    const primaryColor =
      rootStyles.getPropertyValue('--accent').trim() || '#000000';
    const secondaryColor =
      rootStyles.getPropertyValue('--text-soft').trim() || '#e0e0e0';

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Contributeurs', 'Autres membres'],
        datasets: [
          {
            data,
            backgroundColor: [primaryColor, secondaryColor],
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 6
        },
        plugins: {
          legend: {
            display: false
          }
        },
        cutout: '70%',
        radius: '88%',
        animation: false
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [contributorCount, remaining, isDarkMode]);

  useEffect(() => {
    console.info('[contributions] tab_opened', {
      contributors: contributorCount,
      totalUsers,
      participationRate
    });
  }, [contributorCount, participationRate, totalUsers]);

  return (
    <section className="panel-grid panel-grid--single">
      <article className="panel-card">
        <header className="panel-header">
          <h2>Contributions en cours</h2>
          <p className="panel-subtitle">
            Vue d’ensemble des contributions pour {targetLabel} et taux de
            participation.
          </p>
        </header>

        <div className="contribution-stats">
          <div className="chart-box">
            <canvas ref={chartRef} width="140" height="140" />
          </div>
          <div className="stats-metrics">
            <p className="stats-metric">{participationRate}%</p>
            <p className="stats-helper">taux de participation unique</p>
            <p className="stats-detail">
              {contributorCount} contributeur(s) / {totalUsers} membre(s)
            </p>
          </div>
        </div>

        <div className="panel-body panel-body--list">
          {scopedContributions.length ? (
            scopedContributions.map((c) => {
              const mainSnippet = makeSnippet(c.text, 240);
              const successSnippet = makeSnippet(c.successStory, 200);
              const failSnippet = makeSnippet(c.failStory, 200);
              const hasContent =
                Boolean(mainSnippet) ||
                Boolean(successSnippet) ||
                Boolean(failSnippet);

              return (
                <div key={c.id} className="contribution-pill">
                  <p className="contribution-team">
                    {(c.author || '').trim() || 'Anonyme'} ·{' '}
                    {c.newsletterLabel || targetLabel || 'Newsletter'}
                  </p>
                  {hasContent ? (
                    <>
                      {mainSnippet && (
                        <p className="contribution-impact">{mainSnippet}</p>
                      )}
                      {successSnippet && (
                        <p className="contribution-impact">
                          <strong>Success&nbsp;:</strong> {successSnippet}
                        </p>
                      )}
                      {failSnippet && (
                        <p className="contribution-impact">
                          <strong>Fail&nbsp;:</strong> {failSnippet}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="contribution-impact">
                      Aucune note détaillée fournie.
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="empty-state">
              Aucune contribution enregistrée pour cette édition.
            </p>
          )}
        </div>
      </article>
    </section>
  );
}

function GeneratorTab({
  contributions,
  targetLabel,
  draftHtml,
  onGenerate,
  onPublish,
  isGenerating,
  generatorError
}) {
  const hasContributions = contributions.length > 0;
  const editorRef = useRef(null);
  const [imageUrl, setImageUrl] = useState('');

  const handlePublishClick = () => {
    const node = editorRef.current;
    if (!node) return;
    const html = node.innerHTML || '';
    onPublish(html, imageUrl || null);
    setImageUrl('');
  };

  return (
    <section className="panel-grid panel-grid--generator">
      <article className="panel-card">
        <header className="panel-header">
          <h2>Contributions à intégrer</h2>
          <p className="panel-subtitle">
            Faits marquants saisis pour l’édition en cours, toutes équipes
            confondues.
          </p>
        </header>
        <div className="panel-body panel-body--list">
          {hasContributions ? (
            contributions.map((c) => {
              const mainSnippet = makeSnippet(c.text, 220);
              const successSnippet = makeSnippet(c.successStory);
              const failSnippet = makeSnippet(c.failStory);

              return (
                <div key={c.id} className="contribution-pill">
                  <p className="contribution-team">
                    {c.newsletterLabel || targetLabel}
                  </p>
                  {mainSnippet && (
                    <p className="contribution-impact">
                      <strong>Faits marquants&nbsp;:</strong>{' '}
                      {mainSnippet}
                    </p>
                  )}
                  {successSnippet && (
                    <p className="contribution-impact">
                      <strong>Success story&nbsp;:</strong>{' '}
                      {successSnippet}
                    </p>
                  )}
                  {failSnippet && (
                    <p className="contribution-impact">
                      <strong>Fail story&nbsp;:</strong>{' '}
                      {failSnippet}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="empty-state">
              Aucune contribution pour l’instant. Invitez vos équipes à
              utiliser l’onglet <strong>Collect</strong>.
            </p>
          )}
        </div>
      </article>

      <article className="panel-card panel-card--accent">
        <header className="panel-header">
          <h2>Draft de newsletter</h2>
          <p className="panel-subtitle">
            Généré automatiquement à partir des contributions reçues pour{' '}
            {targetLabel}. À relire avant envoi. Prompt IA dans l'onglet Admin{' '}
            {'>'} Prompt IA.
          </p>
        </header>
        <div className="panel-body">
          <div className="form-grid form-grid--compact">
            <label className="field field--full">
              <span className="field-label">Image (URL optionnelle)</span>
              <input
                type="url"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="https://…"
              />
            </label>
          </div>
          <div
            ref={editorRef}
            className="draft-canvas"
            contentEditable
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: draftHtml || '' }}
          />
          <div className="generator-actions">
            <button
              type="button"
              className="primary-button"
              onClick={onGenerate}
              disabled={!hasContributions || isGenerating}
            >
              {isGenerating ? 'Génération…' : 'Générer un draft'}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handlePublishClick}
              disabled={!draftHtml || isGenerating}
            >
              Publier dans le fil
            </button>
          </div>
          {generatorError ? (
            <p className="panel-subtitle">{generatorError}</p>
          ) : null}
        </div>
      </article>
    </section>
  );
}

function AdminTab({
  newsletters,
  users,
  groups,
  resetPasswords,
  passwordMinLength,
  defaultNewsletterTitle,
  systemPrompt,
  defaultSystemPrompt,
  onPromptChange,
  onAddUser,
  onResetUserPassword,
  onAddGroup,
  onUpdateGroupAdmins,
  onUpdateUserGroups,
  onDeleteGroup,
  onCreateNewsletter
}) {
  const [form, setForm] = useState({
    name: '',
    role: 'user',
    groupIds: [],
    temporaryPassword: ''
  });
  const [newGroupName, setNewGroupName] = useState('');
  const [newNewsletter, setNewNewsletter] = useState({
    title: defaultNewsletterTitle,
    groupId: 'all'
  });
  const adminTabs = [
    { id: 'newsletters', label: 'Newsletters & équipes' },
    { id: 'users', label: 'Utilisateurs & rôles' },
    { id: 'groups', label: 'Groupes & droits' },
    { id: 'prompt', label: 'Prompt IA' }
  ];
  const [activeAdminTab, setActiveAdminTab] = useState(adminTabs[0].id);

  useEffect(() => {
    setNewNewsletter((prev) => ({ ...prev, title: defaultNewsletterTitle }));
  }, [defaultNewsletterTitle]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === 'name' ? toTrigram(value) : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleGroupIdsChange = (event) => {
    const options = Array.from(event.target.selectedOptions || []);
    const nextGroupIds = options.map((option) => option.value);
    setForm((prev) => ({ ...prev, groupIds: nextGroupIds }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (
      !form.name.trim() ||
      form.temporaryPassword.length < passwordMinLength
    ) {
      return;
    }
    onAddUser({
      name: form.name,
      role: form.role,
      groupIds: form.groupIds,
      temporaryPassword: form.temporaryPassword
    });
    setForm({
      name: '',
      role: 'user',
      groupIds: [],
      temporaryPassword: ''
    });
  };

  const handleNewGroupSubmit = (event) => {
    event.preventDefault();
    if (!newGroupName.trim()) return;
    onAddGroup(newGroupName);
    setNewGroupName('');
  };

  const handleNewsletterSubmit = (event) => {
    event.preventDefault();
    if (!newNewsletter.title.trim()) return;
    onCreateNewsletter(newNewsletter);
    setNewNewsletter((prev) => ({ ...prev, title: defaultNewsletterTitle }));
  };

  return (
    <section className="panel-grid panel-grid--single">
      <div className="admin-tab-nav">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              activeAdminTab === tab.id
                ? 'tab-button tab-button--active'
                : 'tab-button'
            }
            onClick={() => setActiveAdminTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeAdminTab === 'newsletters' && (
        <article className="panel-card panel-card--full">
          <header className="panel-header">
            <h2>Newsletters & équipes</h2>
            <p className="panel-subtitle">
              Vue rapide des newsletters créées, des contributeurs rattachés et
              des admins autorisés à publier.
            </p>
          </header>
          <form
            className="form-grid form-grid--compact admin-newsletter-form"
            onSubmit={handleNewsletterSubmit}
          >
            <label className="field">
              <span className="field-label">Titre</span>
              <input
                type="text"
                value={newNewsletter.title}
                onChange={(event) =>
                  setNewNewsletter((prev) => ({
                    ...prev,
                    title: event.target.value
                  }))
                }
                placeholder="Newsletter mensuelle…"
              />
            </label>
            <label className="field">
              <span className="field-label">Service ciblé</span>
              <select
                value={newNewsletter.groupId}
                onChange={(event) =>
                  setNewNewsletter((prev) => ({
                    ...prev,
                    groupId: event.target.value
                  }))
                }
              >
                <option value="all">Toutes les équipes</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions form-actions--right">
              <button
                type="submit"
                className="primary-button"
                disabled={!newNewsletter.title.trim()}
              >
                Créer la newsletter
              </button>
            </div>
          </form>
          <div className="panel-body panel-body--list">
            {newsletters.length ? (
              newsletters.map((nl) => {
                const group = nl.groupId
                  ? groups.find((g) => g.id === nl.groupId)
                  : null;
                const relatedUsers = nl.groupId
                  ? users.filter((user) =>
                      (user.groupIds || []).includes(nl.groupId)
                    )
                  : users;
                const contributorUsers = relatedUsers;
                const adminUsersFromGroup = (group?.adminIds || [])
                  .map((id) => users.find((u) => u.id === id))
                  .filter(Boolean);
                const adminPublishers = adminUsersFromGroup.length
                  ? adminUsersFromGroup
                  : relatedUsers.filter(
                      (u) => u.role === 'admin' || u.role === 'superadmin'
                    );
                return (
                  <div key={nl.id} className="admin-newsletter-row">
                    <div className="admin-newsletter-header">
                      <div>
                        <p className="admin-newsletter-title">{nl.title}</p>
                        <p className="admin-newsletter-meta">
                          Audience : {group ? group.name : nl.audience || 'Tous'}
                        </p>
                      </div>
                      <span className="tag tag--soft">
                        {new Date(nl.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <div className="admin-newsletter-line">
                      <span className="admin-line-label">Contributeurs</span>
                      <div className="admin-chip-row">
                        {contributorUsers.length ? (
                          contributorUsers.map((user) => (
                            <span key={user.id} className="tag tag--soft">
                              {user.name}
                            </span>
                          ))
                        ) : (
                          <span className="helper-text">
                            Aucun contributeur rattaché
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="admin-newsletter-line">
                      <span className="admin-line-label">Admins</span>
                      <div className="admin-chip-row">
                        {adminPublishers.length ? (
                          adminPublishers.map((user) => (
                            <span key={user.id} className="tag tag--soft">
                              {user.name} · Admin newsletter
                            </span>
                          ))
                        ) : (
                          <span className="helper-text">
                            Aucun admin rattaché
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="empty-state">
                Aucune newsletter publiée pour l’instant.
              </p>
            )}
          </div>
        </article>
      )}

      {activeAdminTab === 'users' && (
        <article className="panel-card">
          <header className="panel-header">
            <h2>Utilisateurs & rôles</h2>
            <p className="panel-subtitle">
              Gestion des comptes, rôles et mots de passe temporaires.
            </p>
          </header>
          <div className="panel-body panel-body--list">
            {users.map((user) => (
              <div key={user.id} className="user-row">
                <div className="user-main">
                  <span className="user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="user-name">{user.name}</p>
                    <p className="user-meta">
                      {ROLE_LABELS[user.role]} ·{' '}
                      {(() => {
                        const ids = user.groupIds || [];
                        const names = ids
                          .map((id) => {
                            const group = groups.find((g) => g.id === id);
                            return group ? group.name : null;
                          })
                          .filter(Boolean);
                        if (names.length) return names.join(', ');
                        return user.group || 'Aucun groupe';
                      })()}
                    </p>
                    {user.mustReset && (
                      <span className="tag tag--soft">Mdp à changer</span>
                    )}
                  </div>
                </div>
                <div className="user-side">
                  <button
                    type="button"
                    className="secondary-button user-reset-button"
                    onClick={() => onResetUserPassword(user.id)}
                  >
                    Reset mdp
                  </button>
                  {resetPasswords?.[user.id] && (
                    <div className="user-reset-note">
                      <span className="tag tag--soft">Mdp temporaire</span>
                      <span className="user-reset-value">
                        {resetPasswords[user.id]}
                      </span>
                    </div>
                  )}
                  <details className="user-groups-dropdown">
                    <summary>Groupes</summary>
                    <div className="user-groups-list">
                      {groups.map((group) => {
                        const currentIds = user.groupIds || [];
                        const checked = currentIds.includes(group.id);
                        return (
                          <label key={group.id} className="toggle">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const nextIds = checked
                                  ? currentIds.filter((id) => id !== group.id)
                                  : [...currentIds, group.id];
                                onUpdateUserGroups(user.id, nextIds);
                              }}
                            />
                            <span className="toggle-label">{group.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>

          <form className="form-grid form-grid--compact" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">Nom</span>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="Trigramme (ex: GJV)"
              />
            </label>
            <label className="field">
              <span className="field-label">Rôle</span>
              <select name="role" value={form.role} onChange={handleChange}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">
                Mot de passe temporaire (min. {passwordMinLength})
              </span>
              <input
                name="temporaryPassword"
                type="password"
                value={form.temporaryPassword}
                onChange={handleChange}
                placeholder="Mot de passe initial"
              />
            </label>
            <label className="field">
              <span className="field-label">Groupes</span>
              <select
                name="groupIds"
                multiple
                value={form.groupIds}
                onChange={handleGroupIdsChange}
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions form-actions--right">
              <button
                type="submit"
                className="primary-button"
                disabled={
                  !form.name.trim() ||
                  form.temporaryPassword.length < passwordMinLength
                }
              >
                Ajouter
              </button>
            </div>
          </form>
        </article>
      )}

      {activeAdminTab === 'groups' && (
        <article className="panel-card panel-card--accent">
          <header className="panel-header">
            <h2>Groupes & droits</h2>
            <p className="panel-subtitle">
              Choisissez les admins pour chaque groupe à partir des membres.
            </p>
          </header>
          <div className="panel-body panel-body--list">
            {groups.map((group) => (
              <div key={group.id} className="group-row">
                <div>
                  <p className="group-name">{group.name}</p>
                  <p className="group-meta">
                    {(() => {
                      const members = users.filter((user) =>
                        (user.groupIds || []).includes(group.id)
                      );
                      if (!members.length) return 'Aucun membre dans ce groupe';
                      return members.map((m) => m.name).join(', ');
                    })()}
                  </p>
                </div>
                <div className="group-toggle-row">
                  <button
                    type="button"
                    className="secondary-button group-delete-button"
                    onClick={() => onDeleteGroup(group.id)}
                  >
                    Supprimer
                  </button>
                  <div className="group-admin-list">
                    {(() => {
                      const members = users.filter((user) =>
                        (user.groupIds || []).includes(group.id)
                      );
                      const adminIds = group.adminIds || [];
                      const extras = (adminIds || [])
                        .map((id) => users.find((u) => u.id === id))
                        .filter((u) => u && !members.includes(u));
                      const candidates = [...members, ...extras];
                      if (!candidates.length) {
                        return (
                          <span className="helper-text">
                            Ajoutez d’abord des membres à ce groupe
                          </span>
                        );
                      }
                      return candidates.map((user) => {
                        const checked = adminIds.includes(user.id);
                        return (
                          <label key={user.id} className="toggle">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? adminIds.filter((id) => id !== user.id)
                                  : [...adminIds, user.id];
                                onUpdateGroupAdmins(group.id, next);
                              }}
                            />
                            <span className="toggle-label">
                              {user.name} · {checked ? 'Admin newsletter' : 'Utilisateur'}
                            </span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form
            className="form-grid form-grid--compact"
            onSubmit={handleNewGroupSubmit}
          >
            <label className="field field--full">
              <span className="field-label">Nouveau groupe</span>
              <input
                type="text"
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="Nom du groupe…"
              />
            </label>
            <div className="form-actions form-actions--right">
              <button
                type="submit"
                className="secondary-button"
                disabled={!newGroupName.trim()}
              >
                Créer
              </button>
            </div>
          </form>
        </article>
      )}

      {activeAdminTab === 'prompt' && (
        <article className="panel-card">
          <header className="panel-header">
            <h2>Prompt IA</h2>
            <p className="panel-subtitle">
              Instructions transmises au modele pour generer la newsletter.
            </p>
          </header>
          <div className="panel-body">
            <div className="form-grid form-grid--compact">
              <label className="field field--full">
                <span className="field-label">Instructions additionnelles</span>
                <textarea
                  value={systemPrompt}
                  onChange={(event) => onPromptChange(event.target.value)}
                  rows={8}
                  placeholder="Instructions pour la generation IA"
                />
                <span className="helper-text">
                  Laisse vide pour utiliser le prompt par defaut. Le format HTML
                  est impose automatiquement.
                </span>
              </label>
            </div>
            <div className="form-actions form-actions--right">
              <button
                type="button"
                className="secondary-button"
                onClick={() => onPromptChange(defaultSystemPrompt)}
              >
                Reinitialiser le prompt
              </button>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}

export default App;
