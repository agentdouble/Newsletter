# Newsletter

Stack alignée avec le plan :
- **Backend** : FastAPI + SQLAlchemy (SQLite par défaut, PostgreSQL via `DATABASE_URL`).
- **Frontend** : React + Vite (TypeScript), UI monochrome/contrastée.

## Pré-requis
- `uv` pour la partie Python (`pip install uv`)
- Node 18+ / `npm`

## Lancer l’app (backend + frontend)
```bash
./start.sh
```
- Backend : `uv run uvicorn app.main:app --reload --port ${API_PORT:-8000}`
- Frontend : `npm run dev -- --host --port ${WEB_PORT:-5173}`

Avant le premier lancement :
```bash
uv pip install -r backend/requirements.txt
cd frontend && npm install
```

## Front connecté à l’API
- Le frontend n’utilise plus de données fictives : toutes les pages consomment l’API FastAPI exposée par `VITE_API_BASE_URL`.
- Auth : la page `/login` appelle `/auth/login`, stocke le token en localStorage, puis récupère l’utilisateur via `/auth/me`.
- Données :
  - `/newsletters` pour les listes/archives.
  - `/newsletters/{id}` + `/newsletters/{id}/my-contributions` pour la collecte.
  - `/newsletters/{id}/contributions` + `/contributions/{id}/status` pour l’admin.
  - `/newsletters/{id}/ai-draft`, `/newsletters/{id}/layout`, `/newsletters/{id}/render` pour l’éditeur de layout.
  - `/newsletters/{id}/admins` (GET/POST/DELETE) pour nommer les admins d’une newsletter (super admin).
- Admin : les pages groupes/newsletters utilisent les endpoints `/groups` et `/newsletters` (droits SUPER_ADMIN requis pour les groupes).

### Créer un super admin
Au premier démarrage, appelez l’endpoint de bootstrap :
```bash
curl -X POST http://localhost:8000/auth/bootstrap-admin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "trigram": "ADM", "name": "Admin", "password": "changeme"}'
```
Connectez-vous ensuite sur `/login` avec ces identifiants (pensez à ajouter l’email dans `SUPER_ADMIN_EMAILS` si besoin).

## API FastAPI (raccourcis)
Endpoints clés : `/auth/login`, `/auth/me`, `/users`, `/groups`, `/newsletters`, `/newsletters/{id}/contributions`, `/newsletters/{id}/admins`, `/newsletters/{id}/ai-draft` (brouillon IA), `/newsletters/{id}/render`. Créez un admin via `POST /auth/bootstrap-admin` au premier lancement.

Rôles :
- `SUPER_ADMIN` (global) : gère les utilisateurs/groupes, reset mot de passe, nomme les admins de groupe (emails dans `SUPER_ADMIN_EMAILS` ou rôle DB).
- Admin de groupe : via `GroupMembership.role_in_group = "admin"`, peut créer/publier/valider les newsletters de son groupe.
- Utilisateur : contribue à ses newsletters.

Variables d’environnement (exemples fournis) :
- Backend : `backend/.env.example` (copie vers `backend/.env`)
  - `DATABASE_URL` (`sqlite:///./newsletter.db` par défaut) — exemple PostgreSQL : `postgresql://user:pwd@localhost:5432/newsletter`
  - `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`
  - `OPENAI_API_KEY` (pour `/newsletters/{id}/ai-draft`)
  - `SUPER_ADMIN_EMAILS` (liste séparée par des virgules) pour forcer des super admins côté conf
  - `API_PORT` : port d'écoute de l'API (lu par `start.sh` et par FastAPI).
- Frontend : `frontend/.env.example` (copie vers `frontend/.env`)
  - `VITE_API_BASE_URL` (URL de l’API FastAPI)
  - `WEB_PORT` : port du serveur Vite (lu par `start.sh` et utilisé pour paramétrer les CORS côté backend).

## Frontend
Routes principales : `/login`, `/newsletter` (fil + collaboration), `/newsletters/:id/collect`, `/newsletters/:id/admin`, `/newsletters/:id/edit`, `/newsletters/archive`, `/admin/newsletters`, `/admin/groups`, `/admin/super`.

Le hub `/newsletter` regroupe le fil et l’onglet collaboration (newsletters ouvertes), et la console `/admin/super` rassemble création d’utilisateurs, groupes et attribution d’admins par newsletter.
