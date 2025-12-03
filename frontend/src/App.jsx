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

const STORY_TYPES = [
  { id: 'success', label: 'Success story' },
  { id: 'fail', label: 'Fail story' }
];

const mockNewsletters = [
  {
    id: 'nl-001',
    title: 'Newsletter Produit · Wins & leçons',
    date: '2026-02-14',
    mood: 'optimiste',
    audience: 'Produit & Growth',
    body:
      "Cette semaine, l’équipe Produit a partagé plusieurs avancées qui changent concrètement la vie des utilisateurs. " +
      "Le nouveau parcours d’onboarding est désormais disponible pour 100 % des comptes, avec un taux d’activation en hausse. " +
      "Côté incident, deux sujets majeurs ont été identifiés puis corrigés, ce qui nous permet de stabiliser davantage la plateforme.\n\n" +
      "Merci à toutes les équipes impliquées dans ces améliorations : l’énergie collective se ressent dans les retours clients et dans les métriques. " +
      "Les prochaines semaines seront dédiées à lisser encore l’expérience et à documenter les bonnes pratiques qui ont émergé."
  },
  {
    id: 'nl-002',
    title: 'Ops & Platform · Fails utiles',
    date: '2026-02-01',
    mood: 'radical honesty',
    audience: 'Tech & Ops',
    body:
      "Du côté de la plateforme, l’incident API du 21 janvier a occupé une grande partie des discussions. " +
      "L’équipe a pris le temps de documenter ce qui s’est passé, ce qui a permis de clarifier la chaîne de décision et de renforcer les alertes. " +
      "Un runbook dédié est désormais partagé avec toutes les personnes d’astreinte.\n\n" +
      "Au-delà de l’incident lui-même, l’enjeu principal reste la capacité à apprendre vite et ensemble. " +
      "Cette newsletter rassemble les retours de chacun et chacune, pour transformer un fail isolé en enseignements utiles pour toute l’organisation."
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

function buildNewsletterDraft(contributions) {
  if (!contributions.length) {
    return "Aucune contribution pour l'instant.\nInvitez vos équipes à partager leurs wins & fails 🎈";
  }

  const successes = contributions.filter((c) => c.type === 'success');
  const fails = contributions.filter((c) => c.type === 'fail');

  const lines = [];
  lines.push('📰  Newsletter – Draft');
  lines.push('');
  lines.push('Bonjour à toutes et tous,');
  lines.push("Voici les temps forts du dernier cycle. N’hésitez pas à enrichir ce draft avant envoi.");
  lines.push('');

  if (successes.length) {
    lines.push('✨ Success stories');
    successes.forEach((c, index) => {
      lines.push(
        `  ${index + 1}. ${c.title} — ${c.team || 'Équipe'} · ${c.impact || 'Impact à préciser.'}`
      );
    });
    lines.push('');
  }

  if (fails.length) {
    lines.push('🧨 Fail stories (apprises)');
    fails.forEach((c, index) => {
      lines.push(
        `  ${index + 1}. ${c.title} — ${c.team || 'Équipe'} · Leçon clé : ${c.lesson || 'à documenter.'}`
      );
    });
    lines.push('');
  }

  lines.push('Merci à toutes les équipes pour leur transparence et leur énergie. 💌');
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
    const draft = buildNewsletterDraft(contributions);
    console.info('[generator] newsletter_draft_generated', {
      contributions: contributions.length
    });
    setNewsletterDraft(draft);

    const article = {
      id: `nl-${Date.now()}`,
      title: `Newsletter d’équipe – ${new Date().toLocaleDateString('fr-FR')}`,
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
        {currentTab.id === 'feed' && (
          <FeedTab newsletters={newsletters} contributions={contributions} />
        )}
        {currentTab.id === 'collect' && (
          <CollectTab onCreate={handleCreateContribution} />
        )}
        {currentTab.id === 'generator' && (
          <GeneratorTab
            contributions={contributions}
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

function FeedTab({ newsletters, contributions }) {
  return (
    <section className="panel-grid">
      <article className="panel-card">
        <header className="panel-header">
          <h2>Fil des newsletters</h2>
          <p className="panel-subtitle">
            Vue publique des newsletters déjà envoyées.
          </p>
        </header>
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

      <article className="panel-card panel-card--accent">
        <header className="panel-header">
          <h2>Pulse des contributions</h2>
          <p className="panel-subtitle">
            Combien de stories sont prêtes à être racontées ?
          </p>
        </header>
        <div className="panel-body">
          <div className="metric-row">
            <MetricBubble
              label="Contributions totales"
              value={contributions.length}
            />
            <MetricBubble
              label="Success"
              value={contributions.filter((c) => c.type === 'success').length}
              tone="success"
            />
            <MetricBubble
              label="Fails"
              value={contributions.filter((c) => c.type === 'fail').length}
              tone="fail"
            />
          </div>
          <p className="metric-footnote">
            Astuce : animez une petite “Fail Night” mensuelle pour nourrir ce
            flux en continu.
          </p>
        </div>
      </article>
    </section>
  );
}

function CollectTab({ onCreate }) {
  const [form, setForm] = useState({
    title: '',
    type: 'success',
    team: '',
    impact: '',
    lesson: '',
    mood: ''
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    onCreate(form);
    setForm({
      title: '',
      type: form.type,
      team: '',
      impact: '',
      lesson: '',
      mood: ''
    });
  };

  return (
    <section className="panel-card panel-card--wide">
      <header className="panel-header">
        <h2>Partager une story</h2>
        <p className="panel-subtitle">
          Success ou fail, l’important c’est l’apprentissage. Le ton reste
          bienveillant, concret et actionnable.
        </p>
      </header>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Titre</span>
          <input
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
            placeholder="Ex. On a doublé le taux d’activation mobile"
          />
        </label>

        <label className="field">
          <span className="field-label">Type</span>
          <div className="pill-switch">
            {STORY_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={
                  form.type === t.id
                    ? 'pill-switch-item pill-switch-item--active'
                    : 'pill-switch-item'
                }
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    type: t.id
                  }))
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </label>

        <label className="field">
          <span className="field-label">Équipe / Service</span>
          <input
            name="team"
            type="text"
            value={form.team}
            onChange={handleChange}
            placeholder="Produit, Tech, Sales, People…"
          />
        </label>

        <label className="field field--full">
          <span className="field-label">Impact</span>
          <textarea
            name="impact"
            rows={3}
            value={form.impact}
            onChange={handleChange}
            placeholder="Quel effet mesurable a eu cette story ? (chiffres, expérience client, équipe…)"
          />
        </label>

        <label className="field field--full">
          <span className="field-label">Leçon clé (optionnel)</span>
          <textarea
            name="lesson"
            rows={3}
            value={form.lesson}
            onChange={handleChange}
            placeholder="Ce qu’on referait / ne referait pas, les bonnes pratiques qui en sortent…"
          />
        </label>

        <label className="field field--full">
          <span className="field-label">Mood (optionnel)</span>
          <input
            name="mood"
            type="text"
            value={form.mood}
            onChange={handleChange}
            placeholder="Ex. radical honesty, celebratory, calm shipping…"
          />
        </label>

        <div className="form-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={!form.title.trim()}
          >
            Envoyer la story
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

function GeneratorTab({ contributions, draft, onGenerate }) {
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
            Vue condensée des stories envoyées par les équipes.
          </p>
        </header>
        <div className="panel-body panel-body--list">
          {hasContributions ? (
            contributions.map((c) => (
              <div key={c.id} className="contribution-pill">
                <div className="contribution-pill-header">
                  <span
                    className={
                      c.type === 'success'
                        ? 'tag tag--success'
                        : 'tag tag--fail'
                    }
                  >
                    {c.type === 'success' ? 'Success' : 'Fail'}
                  </span>
                  <span className="contribution-team">
                    {c.team || 'Équipe à préciser'}
                  </span>
                </div>
                <h3>{c.title}</h3>
                {c.impact && (
                  <p className="contribution-impact">{c.impact}</p>
                )}
                {c.lesson && (
                  <p className="contribution-lesson">
                    Leçon : <span>{c.lesson}</span>
                  </p>
                )}
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
            Généré automatiquement à partir des contributions reçues. À
            retravailler avant envoi.
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

function MetricBubble({ label, value, tone }) {
  const toneClass =
    tone === 'success'
      ? 'metric-bubble metric-bubble--success'
      : tone === 'fail'
      ? 'metric-bubble metric-bubble--fail'
      : 'metric-bubble';

  return (
    <div className={toneClass}>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

export default App;
