import React, { useMemo, useState } from 'react';

const ROLES = ['user', 'admin', 'superadmin'];

const TABS = [
  { id: 'feed', label: 'Fil', roles: ROLES },
  { id: 'collect', label: 'Collect', roles: ROLES },
  { id: 'generator', label: 'Générateur', roles: ['admin', 'superadmin'] },
  { id: 'admin', label: 'Admin', roles: ['superadmin'] }
];

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
    mood: 'optimiste',
    audience: 'Produit & Growth',
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
    mood: 'radical honesty',
    audience: 'Tech & Ops',
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

const initialUsers = [
  { id: 'u-1', name: 'Lina', role: 'user', group: 'Produit' },
  { id: 'u-2', name: 'Noah', role: 'admin', group: 'Communication' },
  { id: 'u-3', name: 'Sacha', role: 'superadmin', group: 'People Ops' }
];

const initialGroups = [
  { id: 'g-1', name: 'Produit', canContribute: true, canApprove: false },
  { id: 'g-2', name: 'Tech', canContribute: true, canApprove: true },
  { id: 'g-3', name: 'Communication', canContribute: false, canApprove: true }
];

function buildNewsletterDraft(contributions, label) {
  if (!contributions.length) {
    return "Aucune contribution pour l'instant.\nInvitez vos équipes à partager leurs wins & fails 🎈";
  }

  const lines = [];
  lines.push('📰  Newsletter – Draft');
  lines.push('');
  if (label) {
    lines.push(`Édition : ${label}`);
    lines.push('');
  }
  lines.push('Bonjour à toutes et tous,');
  lines.push(
    "Cette version rassemble les principaux faits marquants du mois, à partir des contributions envoyées par les équipes."
  );
  lines.push('');

  contributions.forEach((c, index) => {
    const snippet =
      c.text && c.text.length > 260
        ? `${c.text.slice(0, 260).trim()}…`
        : c.text;
    lines.push(`${index + 1}. ${snippet}`);
    lines.push('');
  });

  lines.push(
    'Merci à toutes les équipes pour le temps consacré à documenter ces éléments et pour la qualité des retours partagés.'
  );
  return lines.join('\n');
}

function App() {
  const [role, setRole] = useState('user');
  const [activeTab, setActiveTab] = useState('feed');
  const [contributions, setContributions] = useState([]);
  const [newsletters, setNewsletters] = useState(mockNewsletters);
  const [users, setUsers] = useState(initialUsers);
  const [groups, setGroups] = useState(initialGroups);
  const [newsletterDraft, setNewsletterDraft] = useState('');

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

  const handleRoleChange = (event) => {
    const nextRole = event.target.value;
    console.info('[auth] role_changed', { from: role, to: nextRole });
    setRole(nextRole);
    if (!TABS.find((t) => t.id === activeTab && t.roles.includes(nextRole))) {
      setActiveTab('feed');
    }
  };

  const handleCreateContribution = (payload) => {
    const entry = {
      id: `c-${Date.now()}`,
      ...payload
    };
    console.info('[collect] contribution_created', entry);
    setContributions((prev) => [entry, ...prev]);
  };

  const handleGenerateDraft = () => {
    const relevantContributions = contributions.filter(
      (c) => c.newsletterLabel === currentNewsletterLabel
    );
    const draft = buildNewsletterDraft(relevantContributions, currentNewsletterLabel);
    console.info('[generator] newsletter_draft_generated', {
      contributions: relevantContributions.length
    });
    setNewsletterDraft(draft);

    const article = {
      id: `nl-${Date.now()}`,
      title: currentNewsletterLabel,
      date: new Date().toISOString(),
      mood: 'générée automatiquement',
      audience: 'Toute l’organisation',
      body: draft
    };

    console.info('[generator] newsletter_published_to_feed', {
      id: article.id
    });
    setNewsletters((prev) => [article, ...prev]);
  };

  const handleAddUser = (user) => {
    const entry = { id: `u-${Date.now()}`, ...user };
    console.info('[admin] user_added', entry);
    setUsers((prev) => [...prev, entry]);
  };

  const handleToggleGroupPermission = (groupId, key) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, [key]: !g[key] } : g
      )
    );
  };

  const currentTab = visibleTabs.find((tab) => tab.id === activeTab) || visibleTabs[0];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-main">
          <div className="logo-pill">
            <span className="logo-dot" />
            <span className="logo-text">Newsletter Studio</span>
          </div>
          <span className="header-tagline">Cute-alism · 2026 Edition</span>
        </div>
        <div className="header-controls">
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
      </header>

      <nav className="tab-nav">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              tab.id === currentTab.id ? 'tab-button tab-button--active' : 'tab-button'
            }
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {currentTab.id === 'feed' && <FeedTab newsletters={newsletters} />}
        {currentTab.id === 'collect' && (
          <CollectTab
            targetLabel={currentNewsletterLabel}
            onCreate={handleCreateContribution}
          />
        )}
        {currentTab.id === 'generator' && (
          <GeneratorTab
            contributions={contributions.filter(
              (c) => c.newsletterLabel === currentNewsletterLabel
            )}
            targetLabel={currentNewsletterLabel}
            draft={newsletterDraft}
            onGenerate={handleGenerateDraft}
          />
        )}
        {currentTab.id === 'admin' && (
          <AdminTab
            users={users}
            groups={groups}
            onAddUser={handleAddUser}
            onToggleGroupPermission={handleToggleGroupPermission}
          />
        )}
      </main>
    </div>
  );
}

function FeedTab({ newsletters }) {
  return (
    <section className="panel-grid panel-grid--single">
      <article className="panel-card">
        <div className="panel-body panel-body--list">
          {newsletters.map((nl) => (
            <article key={nl.id} className="newsletter-article">
              <header className="newsletter-article-header">
                <div>
                  <h3>{nl.title}</h3>
                  <p className="newsletter-chip-audience">{nl.audience}</p>
                </div>
                <div className="newsletter-meta-column">
                  <span className="tag tag--soft">
                    {new Date(nl.date).toLocaleDateString('fr-FR')}
                  </span>
                  {nl.mood && <span className="mood-pill">{nl.mood}</span>}
                </div>
              </header>
              <div className="newsletter-body">
                {nl.body
                  .split('\n\n')
                  .filter((block) => block.trim().length > 0)
                  .map((block, index) => (
                    <p key={index}>{block}</p>
                  ))}
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}

function CollectTab({ onCreate, targetLabel }) {
  const [text, setText] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    onCreate({
      newsletterLabel: targetLabel,
      text
    });
    setText('');
  };

  return (
    <section className="panel-card panel-card--wide">
      <header className="panel-header">
        <h2>Partager les nouveautés du mois</h2>
        <p className="panel-subtitle">
          Un seul champ pour consigner les faits marquants, décisions, incidents
          et apprentissages du mois.
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
            rows={14}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Résumez les faits marquants, décisions importantes, incidents et apprentissages à partager dans la newsletter."
          />
        </label>

        <div className="form-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={!text.trim()}
          >
            Envoyer les nouveautés
          </button>
          <p className="helper-text">
            Les contributions sont visibles par l’équipe communication / admin
            avant diffusion.
          </p>
        </div>
      </form>
    </section>
  );
}

function GeneratorTab({ contributions, targetLabel, draft, onGenerate }) {
  const hasContributions = contributions.length > 0;

  const handleCopy = () => {
    if (!draft) return;
    navigator.clipboard
      .writeText(draft)
      .then(() => {
        console.info('[generator] draft_copied_to_clipboard');
      })
      .catch(() => {
        console.info('[generator] draft_copy_failed');
      });
  };

  return (
    <section className="panel-grid">
      <article className="panel-card">
        <header className="panel-header">
          <h2>Contributions à intégrer</h2>
          <p className="panel-subtitle">
            Faits marquants saisis pour l’édition en cours.
          </p>
        </header>
        <div className="panel-body panel-body--list">
          {hasContributions ? (
            contributions.map((c) => (
              <div key={c.id} className="contribution-pill">
                <p className="contribution-team">
                  {c.newsletterLabel || targetLabel}
                </p>
                <p className="contribution-impact">
                  {(c.text && c.text.length > 220
                    ? `${c.text.slice(0, 220).trim()}…`
                    : c.text) || ''}
                </p>
              </div>
            ))
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
              className="secondary-button"
              onClick={handleCopy}
              disabled={!draft}
            >
              Copier le texte
            </button>
          </div>
          <textarea
            className="draft-area"
            rows={16}
            value={draft}
            onChange={() => {}}
            readOnly
            placeholder="Le draft généré apparaîtra ici…"
          />
        </div>
      </article>
    </section>
  );
}

function AdminTab({ users, groups, onAddUser, onToggleGroupPermission }) {
  const [form, setForm] = useState({
    name: '',
    role: 'user',
    group: ''
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    onAddUser(form);
    setForm({
      name: '',
      role: 'user',
      group: ''
    });
  };

  return (
    <section className="panel-grid">
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
                    {user.group || 'Groupe non renseigné'}
                  </p>
                </div>
              </div>
              <span className="tag tag--soft">{ROLE_LABELS[user.role]}</span>
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
              placeholder="Nouvel utilisateur…"
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
            <span className="field-label">Groupe</span>
            <input
              name="group"
              type="text"
              value={form.group}
              onChange={handleChange}
              placeholder="Produit, Tech, Sales…"
            />
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

      <article className="panel-card panel-card--accent">
        <header className="panel-header">
          <h2>Groupes & droits</h2>
          <p className="panel-subtitle">
            Préfiguration simple des permissions par équipe.
          </p>
        </header>
        <div className="panel-body panel-body--list">
          {groups.map((group) => (
            <div key={group.id} className="group-row">
              <div>
                <p className="group-name">{group.name}</p>
                <p className="group-meta">
                  Collecte : {group.canContribute ? 'autorisée' : 'bloquée'} ·
                  Validation : {group.canApprove ? 'autorisée' : 'bloquée'}
                </p>
              </div>
              <div className="group-toggle-row">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={group.canContribute}
                    onChange={() =>
                      onToggleGroupPermission(group.id, 'canContribute')
                    }
                  />
                  <span className="toggle-label">Collect</span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={group.canApprove}
                    onChange={() =>
                      onToggleGroupPermission(group.id, 'canApprove')
                    }
                  />
                  <span className="toggle-label">Valider</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export default App;
