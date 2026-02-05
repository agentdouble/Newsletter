# Anjanews MVP

Application MVP pour collecter des success stories / fail stories et générer des newsletters prêtes à être publiées.

## Stack

- Backend : Python (FastAPI + SQLAlchemy + Alembic)
- Base de données : PostgreSQL
- Frontend : React + Vite (`frontend/`), `react-router-dom` pour les routes frontend, `chart.js` pour la visualisation du taux de participation, Tailwind CSS + structure shadcn (`frontend/src/components/ui`) et support TypeScript (tsconfig).
  - Thème visuel : design moderne inspiré shadcn (palette neutre, surfaces en cards, gradients subtils), typographies `Space Grotesk` (UI) et `Newsreader` (lecture) chargées via Google Fonts, coins arrondis et ombres douces, avec mode sombre.

## Fonctionnalités du MVP

- **Authentification** : page de connexion reliée au backend, sessions, mots de passe temporaires fournis par l’admin, changement obligatoire à la première connexion et reset possible côté admin.
- **Fil** : fil de newsletters écrites comme des articles (quelques exemples mockés + newsletters générées automatiquement), présenté en cards modernes (colonne centrale, typographie serif pour le contenu, vignette à droite dans le fil et image plus large en haut de l’article ouvert, recadrée avec coins arrondis) et repère couleur par newsletter. Chaque newsletter du fil est cliquable et dispose d’une URL dédiée (`/newsletter/fil/:id`) pour faciliter le partage ; lorsqu’une newsletter est ouverte, seule cette newsletter est affichée en lecture seule (non cliquable) avec un bouton « Retour au fil complet ».
- **Réactions & commentaires** : chaque newsletter peut recevoir des réactions rapides (pictos pouce) et des commentaires publiés sous le nom du compte connecté, directement depuis la vue détaillée, avec un compteur sobre. La barre d’engagement est placée sous chaque newsletter.
- **Collect** : formulaire compact avec un seul bloc de saisie des faits marquants sur une seule vue, avec exemples contextualisés aux services d’assurance ; choix de la newsletter (groupe) quand un membre appartient à plusieurs équipes, et signature automatique via le compte connecté.
- **Contributions** : vue de suivi `/newsletter/contribution` affichant les contributions de l’édition en cours par newsletter (groupe), le taux de participation (unique) des membres via un donut Chart.js, et la liste nominative des apports.
- **Générateur** : vue admin qui consomme toutes les contributions (faits marquants / success / fail) de l’édition et génère un article de newsletter via IA (OpenAI GPT), immédiatement poussé dans le fil, avec une surface d’édition sobre (typographie identique à la lecture) et un prompt IA modifiable depuis l’onglet Admin > Prompt IA (laisser vide pour utiliser le prompt par défaut, avec un socle fixe non modifiable qui impose le HTML h1/h2). Les actions « Générer un draft » et « Publier dans le fil » sont positionnées sous la zone d’édition pour ne pas masquer le contenu, et les contributions à intégrer sont listées dans la colonne dédiée.
- **Admin** : gestion des utilisateurs, rôles (user, admin, super admin) et groupes/équipes, avec création/suppression de groupes, attribution d’un ou plusieurs groupes existants aux utilisateurs et sélection d’admins newsletter, plus un récap des newsletters créées (incluant la couleur choisie) avec les contributeurs rattachés et les admins autorisés à publier, via des onglets « Newsletters & équipes », « Utilisateurs & rôles », « Groupes & droits ». Gestion des comptes : trigrammes (ex : GJV), mot de passe temporaire à la création et reset de mot de passe par utilisateur.
- Onglets Admin : bandeau d’onglets en pills, indicateur stable (pas de décalage en changeant d’onglet) et alignement resserré entre en-têtes, onglets et formulaires/boutons d’action pour limiter le blanc inutile.

> Remarque : les données sont persistées dans PostgreSQL via le backend.

## Prérequis

- Python 3.11+
- `uv` pour la gestion des dépendances Python
- PostgreSQL en local (sans Docker)

## Configuration

Copiez `.env.example` (ou `.env.exemple`) vers `.env` et ajustez les valeurs si besoin :

- `DATABASE_URL` (connexion PostgreSQL ; `postgres://` et `postgresql://` sont normalisés vers `postgresql+psycopg://`)
- `BACKEND_PORT` / `FRONTEND_PORT` (ces ports pilotent le backend + le frontend, et les CORS s’alignent sur `FRONTEND_PORT`)
- `VITE_API_URL` (optionnel si vous lancez le frontend séparément)
- `ENV` et `LOG_LEVEL`
- `SESSION_TTL_HOURS` (durée de validité d’une session, en heures)
- `PASSWORD_MIN_LENGTH` (longueur minimale des mots de passe)
- `OPENAI_API_KEY` (clé API OpenAI pour la génération IA)
- `OPENAI_BASE_URL` (optionnel : URL compatible OpenAI, ex `http://localhost:8001/v1` pour vLLM local)
- `OPENAI_MODEL` (modèle GPT utilisé, par défaut `gpt-4o-mini`)

Assurez-vous que la base PostgreSQL existe (exemple) :

```bash
createdb anjanews
```

## vLLM local (mode OpenAI-compatible)

- Démarrez vLLM avec un endpoint OpenAI-compatible (ex: `http://localhost:8001/v1`).
- Renseignez `OPENAI_BASE_URL` + `OPENAI_MODEL` selon le modèle servi.
- `OPENAI_API_KEY` peut rester vide en local si vLLM n'en demande pas.

## Lancement via `start.sh`

Utilisez toujours le script de lancement :

```bash
./start.sh
```

- Le script installe les dépendances, applique les migrations et démarre backend + frontend.
- Alembic et Uvicorn passent par `python -m ...` pour eviter les soucis de CLI manquant.
- Les ports configurés dans `.env` sont libérés si déjà utilisés, pour éviter un démarrage sur un port inattendu.
- L’interface est servie par Vite (port `FRONTEND_PORT`).
- Les migrations et Uvicorn sont lancés via `uv run -m` pour garantir l’exécution même si les entrypoints ne sont pas détectés.

## Première connexion

- Si aucun utilisateur n’existe, utilisez l’écran de connexion pour créer le premier super admin via le lien « Créer le super admin initial ».
- L’admin crée ensuite les comptes utilisateurs avec un mot de passe temporaire, changé lors de la première connexion.

## Notes d’architecture

- Backend FastAPI, schéma SQLAlchemy, migrations Alembic, API exposée sous `/api`.
- Backend modulaire : `backend/app/main.py` pour le wiring, `backend/app/api/*.py` pour les routes, `backend/app/security.py` pour auth/sessions, `backend/app/schemas.py` + `backend/app/serializers.py` pour les I/O, `backend/app/newsletter_prompt.py` pour le prompt IA.
- Code orienté composants React simples, avec un minimum de dépendances.
- Pas de state global complexe : tout est géré dans le composant racine pour ce MVP.
- Authentification par session (token côté frontend dans `sessionStorage`), mots de passe hashés côté backend et obligation de reset après un mot de passe temporaire.
- Navigation déplacée dans un bandeau latéral collé à gauche (onglets synchronisés avec les routes), logo « Anjanews » en haut de la sidebar, carte profil cliquable dans la sidebar (nom + déconnexion) avec un panneau qui s’ouvre au-dessus de l’avatar, et toggle dark mode placé à côté (classe `dark` persistée en localStorage).
- Les logs (`console.info`) sont ajoutés uniquement sur les actions clés (connexion, création de contribution, génération et publication d’une newsletter, ouverture d’une newsletter depuis le fil, réactions ou commentaires).
