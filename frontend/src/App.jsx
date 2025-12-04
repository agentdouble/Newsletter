import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, ArcElement, DoughnutController, Tooltip, Legend } from 'chart.js';
import { useLocation, useNavigate } from 'react-router-dom';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

const ROLES = ['user', 'admin', 'superadmin'];

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

const mockNewsletters = [
  {
    id: 'nl-001',
    title: 'Newsletter Produit · Wins & leçons',
    date: '2026-02-14',
    audience: 'Produit & Growth',
    groupId: 'g-1',
    imageUrl:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    body:
      "Cette édition synthétise les principaux enseignements partagés par les équipes Produit au cours du dernier cycle. " +
      "L’objectif est de donner une vue claire des décisions structurantes, des résultats obtenus et des chantiers encore ouverts, " +
      "afin que chaque équipe puisse se situer dans la trajectoire globale du produit.\n\n" +
      "Sur le volet activation, le nouveau parcours d’onboarding a été progressivement déployé à l’ensemble des comptes. " +
      "Les premiers indicateurs montrent une hausse significative du taux d’activation, portée notamment par une meilleure mise en avant des cas d’usage clés " +
      "et par une simplification des premiers écrans. Les retours utilisateurs confirment que la compréhension de la proposition de valeur est plus rapide.\n\n" +
      "Parallèlement, deux incidents majeurs ont été identifiés puis corrigés, avec un impact limité mais réel sur l’expérience. " +
      "Les équipes ont mis en place des garde-fous supplémentaires et un suivi rapproché des métriques de fiabilité sur les flux concernés. " +
      "Une synthèse détaillée des actions menées sera partagée dans la documentation produit afin de capitaliser sur ces enseignements.\n\n" +
      "Les prochaines semaines seront consacrées à consolider ces avancées : suivi des indicateurs d’activation, affinage des parcours secondaires " +
      "et amélioration du support in-app. L’ambition reste la même : proposer une expérience simple, lisible et cohérente pour l’ensemble des utilisateurs."
  },
  {
    id: 'nl-002',
    title: 'Ops & Platform · Fails utiles',
    date: '2026-02-01',
    audience: 'Tech & Ops',
    groupId: 'g-2',
    imageUrl:
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    body:
      "Cette édition est centrée sur l’analyse des incidents récents et sur les mesures prises pour renforcer la robustesse de la plateforme. " +
      "Elle vise à rendre visibles les arbitrages effectués, les points de vigilance identifiés et les engagements pris vis-à-vis des équipes consommatrices des services.\n\n" +
      "L’incident API du 21 janvier a servi de point d’ancrage à plusieurs échanges structurés : revue détaillée de la chronologie, clarification des responsabilités, " +
      "et mise à jour des procédures d’escalade. Ce travail partagé a permis de réduire les zones d’ambiguïté sur la prise de décision et de rendre les attentes explicites " +
      "en matière de communication en cours d’incident.\n\n" +
      "Un runbook dédié a été rédigé puis diffusé à l’ensemble des personnes d’astreinte. Il documente les signaux faibles à surveiller, " +
      "les premiers gestes à effectuer en cas de dégradation des indicateurs et les canaux à utiliser pour informer les équipes impactées. " +
      "Les prochaines itérations viseront à simplifier encore ce runbook pour le rendre immédiatement actionnable, y compris dans les situations de forte charge.\n\n" +
      "Au-delà de ce cas particulier, l’enjeu principal reste d’ancrer une culture de partage des incidents, non pas comme des échecs individuels, " +
      "mais comme des occasions structurées d’amélioration collective. Les retours des différentes équipes sont intégrés dans la roadmap de fiabilisation " +
      "et serviront de base aux prochains exercices de simulation d’incident."
  }
];

const initialGroups = [
  {
    id: 'g-1',
    name: 'Produit',
    canContribute: true,
    canApprove: false,
    adminIds: []
  },
  {
    id: 'g-2',
    name: 'Tech',
    canContribute: true,
    canApprove: true,
    adminIds: []
  },
  {
    id: 'g-3',
    name: 'Communication',
    canContribute: false,
    canApprove: true,
    adminIds: []
  }
];

const initialUsers = [
  { id: 'u-1', name: 'GJV', role: 'user', groupIds: ['g-1'] },
  { id: 'u-2', name: 'XPD', role: 'admin', groupIds: ['g-3'] },
  { id: 'u-3', name: 'QLR', role: 'superadmin', groupIds: ['g-1', 'g-2'] }
];

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
  const [role, setRole] = useState('user');
  const [contributions, setContributions] = useState([]);
  const [newsletters, setNewsletters] = useState(mockNewsletters);
  const [users, setUsers] = useState(initialUsers);
  const [groups, setGroups] = useState(initialGroups);
  const [newsletterDraftHtml, setNewsletterDraftHtml] = useState('');
  const [activeGroupId, setActiveGroupId] = useState('all');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/') {
      navigate(TAB_ROUTES.feed, { replace: true });
    }
  }, [location.pathname, navigate]);

  const currentNewsletterLabel = useMemo(() => {
    const now = new Date();
    const month = now.toLocaleString('fr-FR', { month: 'long' });
    const year = now.getFullYear();
    return `Newsletter mensuelle · ${month} ${year}`;
  }, []);

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

  const selectedNewsletterId = useMemo(() => {
    if (currentTabId !== 'feed') return null;
    const base = TAB_ROUTES.feed;
    if (!location.pathname.startsWith(`${base}/`)) return null;
    const parts = location.pathname.split('/');
    const last = parts[parts.length - 1];
    return last || null;
  }, [location.pathname, currentTabId]);

  const handleRoleChange = (event) => {
    const nextRole = event.target.value;
    console.info('[auth] role_changed', { from: role, to: nextRole });
    setRole(nextRole);
    const allowedTabs = TABS.filter((t) => t.roles.includes(nextRole));
    if (!allowedTabs.find((t) => t.id === currentTabId)) {
      navigate(TAB_ROUTES.feed);
    }
  };

  const handleGroupChange = (event) => {
    const nextGroupId = event.target.value;
    console.info('[context] active_group_changed', {
      from: activeGroupId,
      to: nextGroupId
    });
    setActiveGroupId(nextGroupId);
  };

  const handleCreateContribution = (payload) => {
    const entry = {
      id: `c-${Date.now()}`,
      ...payload,
      groupId: activeGroupId
    };
    console.info('[collect] contribution_created', entry);
    setContributions((prev) => [entry, ...prev]);
  };

  const visibleGeneratorContributions = useMemo(
    () =>
      contributions.filter(
        (c) =>
          c.newsletterLabel === currentNewsletterLabel &&
          (activeGroupId === 'all' || c.groupId === activeGroupId)
      ),
    [contributions, currentNewsletterLabel, activeGroupId]
  );

  const handleGenerateDraft = () => {
    const draft = buildNewsletterDraft(
      visibleGeneratorContributions,
      currentNewsletterLabel
    );
    console.info('[generator] newsletter_draft_generated', {
      contributions: visibleGeneratorContributions.length,
      groupId: activeGroupId
    });
    setNewsletterDraftHtml(draft);
  };

  const handlePublishDraft = (html, imageUrl) => {
    const body = (html || '').trim();
    if (!body) return;
    const targetGroup =
      activeGroupId === 'all'
        ? null
        : groups.find((group) => group.id === activeGroupId) || null;
    const article = {
      id: `nl-${Date.now()}`,
      title: currentNewsletterLabel,
      date: new Date().toISOString(),
      audience: targetGroup ? targetGroup.name : 'Toute l’organisation',
      body,
      groupId: activeGroupId === 'all' ? null : activeGroupId,
      imageUrl: imageUrl || null
    };

    console.info('[generator] newsletter_published_to_feed', {
      id: article.id,
      groupId: article.groupId,
      hasImage: Boolean(article.imageUrl)
    });
    setNewsletters((prev) => [article, ...prev]);
  };

  const handleCreateNewsletter = ({ title, groupId }) => {
    const trimmedTitle = (title || '').trim();
    if (!trimmedTitle) return;
    const targetGroup =
      groupId && groupId !== 'all'
        ? groups.find((g) => g.id === groupId)
        : null;
    const entry = {
      id: `nl-${Date.now()}`,
      title: trimmedTitle,
      date: new Date().toISOString(),
      audience: targetGroup ? targetGroup.name : 'Toute l’organisation',
      body: 'Brouillon à compléter.',
      groupId: targetGroup ? targetGroup.id : null,
      imageUrl: null
    };
    console.info('[admin] newsletter_created', {
      id: entry.id,
      groupId: entry.groupId
    });
    setNewsletters((prev) => [entry, ...prev]);
  };

  const handleAddUser = (user) => {
    const trigram = toTrigram(user.name);
    if (!trigram) return;
    const entry = { id: `u-${Date.now()}`, ...user, name: trigram };
    console.info('[admin] user_added', entry);
    setUsers((prev) => [...prev, entry]);
  };

  const handleResetUserPassword = (userId) => {
    console.info('[admin] user_password_reset', { userId });
  };

  const handleUpdateUserGroups = (userId, groupIds) => {
    console.info('[admin] user_groups_updated', { userId, groupIds });
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, groupIds } : user
      )
    );
  };

  const handleUpdateGroupAdmins = (groupId, adminIds) => {
    console.info('[admin] group_admins_updated', { groupId, adminIds });
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, adminIds } : g))
    );
    setUsers((prev) =>
      prev.map((user) => {
        if (!adminIds.includes(user.id)) return user;
        const ids = user.groupIds || [];
        if (ids.includes(groupId)) return user;
        return { ...user, groupIds: [...ids, groupId] };
      })
    );
  };

  const handleAddGroup = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const entry = {
      id: `g-${Date.now()}`,
      name: trimmed,
      canContribute: true,
      canApprove: false,
      adminIds: []
    };
    console.info('[admin] group_added', entry);
    setGroups((prev) => [...prev, entry]);
  };

  const handleDeleteGroup = (groupId) => {
    console.info('[admin] group_deleted', { groupId });
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setUsers((prev) =>
      prev.map((user) => {
        const ids = user.groupIds || [];
        if (!ids.includes(groupId)) return user;
        return { ...user, groupIds: ids.filter((id) => id !== groupId) };
      })
    );
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-top">
          <div className="app-header-main">
            <div className="logo-pill">
              <span className="logo-dot" />
              <span className="logo-text">Anjanews</span>
            </div>
          </div>
          <div className="header-controls">
            <nav className="tab-nav">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={
                    tab.id === currentTab.id
                      ? 'tab-button tab-button--active'
                      : 'tab-button'
                  }
                  onClick={() => navigate(TAB_ROUTES[tab.id])}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="role-switch">
              <span className="role-label">Rôle</span>
              <select
                className="role-select"
                value={role}
                onChange={handleRoleChange}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {currentTab.id === 'feed' && (
          <FeedTab
            newsletters={newsletters}
            groups={groups}
            activeGroupId={activeGroupId}
            selectedNewsletterId={selectedNewsletterId}
            onOpenNewsletter={handleOpenNewsletter}
            onBackToFeed={handleBackToFeed}
          />
        )}
        {currentTab.id === 'collect' && (
          <CollectTab
            targetLabel={currentNewsletterLabel}
            onCreate={handleCreateContribution}
          />
        )}
        {currentTab.id === 'contributions' && (
          <ContributionTab
            contributions={contributions}
            users={users}
            targetLabel={currentNewsletterLabel}
          />
        )}
        {currentTab.id === 'generator' && (
          <GeneratorTab
            contributions={visibleGeneratorContributions}
            targetLabel={currentNewsletterLabel}
            draftHtml={newsletterDraftHtml}
            onGenerate={handleGenerateDraft}
            onPublish={handlePublishDraft}
          />
        )}
        {currentTab.id === 'admin' && (
          <AdminTab
            newsletters={newsletters}
            users={users}
            groups={groups}
            defaultNewsletterTitle={currentNewsletterLabel}
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
  );
}

function FeedTab({
  newsletters,
  groups,
  activeGroupId,
  selectedNewsletterId,
  onOpenNewsletter,
  onBackToFeed
}) {
  const activeGroupName =
    activeGroupId === 'all'
      ? 'Toutes les équipes'
      : (groups.find((g) => g.id === activeGroupId) || {}).name ||
        'Toutes les équipes';
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
                </div>

                {!isActive && imageNode}
              </article>
            );
          })}
        </div>
      </article>
    </section>
  );
}

function CollectTab({ onCreate, targetLabel }) {
  const [text, setText] = useState('');
  const [successStory, setSuccessStory] = useState('');
  const [failStory, setFailStory] = useState('');
  const [authorName, setAuthorName] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const main = text.trim();
    const success = successStory.trim();
    const fail = failStory.trim();
    if (!main && !success && !fail) return;
    const author = authorName.trim() || 'Anonyme';
    onCreate({
      newsletterLabel: targetLabel,
      text: main,
      successStory: success,
      failStory: fail,
      author
    });
    setText('');
    setSuccessStory('');
    setFailStory('');
    setAuthorName('');
  };

  const isSubmitDisabled =
    !text.trim() && !successStory.trim() && !failStory.trim();

  return (
    <section className="panel-card panel-card--wide">
      <header className="panel-header">
        <h2>Partager les nouveautés du mois</h2>
        <p className="panel-subtitle">
          Trois blocs pour consigner les faits marquants, une success story et
          une fail story utiles aux autres équipes.
        </p>
      </header>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Nom du contributeur</span>
          <input
            type="text"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="Nom ou équipe"
          />
        </label>

        <label className="field field--full">
          <span className="field-label">Newsletter ciblée</span>
          <div className="tag tag--soft">{targetLabel}</div>
        </label>

        <label className="field field--full">
          <span className="field-label">Nouveautés du mois</span>
          <textarea
            className="notepad-textarea"
            rows={4}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Résumez les faits marquants côté assurance : lancement d’un parcours indemnisation, nouvelle offre auto/habitation, amélioration service clients, etc."
          />
        </label>

        <label className="field field--full">
          <span className="field-label">Success story</span>
          <textarea
            className="notepad-textarea"
            rows={3}
            value={successStory}
            onChange={(event) => setSuccessStory(event.target.value)}
            placeholder="Exemple : réduction du délai de prise en charge sinistre, hausse du NPS après refonte espace assuré, automatisation d’une étape de souscription."
          />
        </label>

        <label className="field field--full">
          <span className="field-label">Fail story</span>
          <textarea
            className="notepad-textarea"
            rows={3}
            value={failStory}
            onChange={(event) => setFailStory(event.target.value)}
            placeholder="Exemple : incident sur la déclaration de sinistre en ligne, campagne emailing mal ciblée, expérimentation de tarification non concluante."
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

function ContributionTab({ contributions, users, targetLabel }) {
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

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Contributeurs', 'Autres membres'],
        datasets: [
          {
            data,
            backgroundColor: ['#000000', '#e0e0e0'],
            borderWidth: 0
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            display: false
          }
        },
        cutout: '70%',
        animation: false
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [contributorCount, remaining]);

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
  onPublish
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
            Faits marquants saisis pour l’édition en cours.
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
            {targetLabel}. À relire avant envoi.
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
              disabled={!hasContributions}
            >
              Générer un draft
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handlePublishClick}
              disabled={!draftHtml}
            >
              Publier dans le fil
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}

function AdminTab({
  newsletters,
  users,
  groups,
  defaultNewsletterTitle,
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
    groupIds: []
  });
  const [newGroupName, setNewGroupName] = useState('');
  const [newNewsletter, setNewNewsletter] = useState({
    title: defaultNewsletterTitle,
    groupId: 'all'
  });
  const adminTabs = [
    { id: 'newsletters', label: 'Newsletters & équipes' },
    { id: 'users', label: 'Utilisateurs & rôles' },
    { id: 'groups', label: 'Groupes & droits' }
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
    if (!form.name.trim()) return;
    onAddUser({
      name: form.name,
      role: form.role,
      groupIds: form.groupIds
    });
    setForm({
      name: '',
      role: 'user',
      groupIds: []
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
              Gestion simple, en mémoire, des rôles principaux.
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
                disabled={!form.name.trim()}
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
    </section>
  );
}

export default App;
