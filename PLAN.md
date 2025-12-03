# Plan de l'application Newsletter

Backend : **FastAPI** (Python)  
Frontend : **React** (Vite)

---

## 1. Objectif & rôles

- Centraliser la création de newsletters d’équipe (ex. Service IA).
- Permettre à des **contributeurs** (Jeremy, Antoine…) d’envoyer leurs success/fail stories du mois.
- Offrir à un **admin** une interface pour gérer les groupes, valider les contributions et publier les newsletters.

Rôles principaux :
- **Admin** : gère les groupes, les utilisateurs, les campagnes/newsletters, valide et publie.
- **Contributeur** : se connecte, remplit ses contributions pour une newsletter donnée.

---

## 2. Modèle de données (backend FastAPI)

À implémenter avec SQLAlchemy + PostgreSQL (ou SQLite au début).

- `User`
  - `id`, `email`, `password_hash`, `name`
  - `global_role` : `ADMIN` / `USER`
- `Group`
  - `id`, `name`, `description`
- `GroupMembership`
  - `id`, `user_id`, `group_id`
  - `role_in_group` (ex. manager, contributor)
- `Newsletter`
  - `id`, `title`, `group_id`
  - `period` (mois/année ou dates)
  - `status` : `DRAFT`, `COLLECTING`, `REVIEW`, `APPROVED`, `PUBLISHED`
  - `created_by`, `created_at`, `updated_at`
  - `layout_config` (JSON – configuration des sections)
  - `rendered_html` (HTML final optionnel)
- `Contribution`
  - `id`, `newsletter_id`, `user_id`
  - `type` : `SUCCESS`, `FAIL`, `INFO`, …
  - `title`, `content`
  - `status` : `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`
  - `created_at`, `updated_at`
- (Optionnel) `Template`
  - `id`, `name`, `layout_config` (structure par défaut)

---

## 3. API REST (FastAPI)

L’API intégrera un appel à un endpoint OpenAI pour générer automatiquement un **brouillon de newsletter** à partir des contributions approuvées (par groupe/service). L’admin pourra ensuite éditer ce brouillon dans une interface type “canvas”.

### 3.1 Authentification

- `POST /auth/login`  
  - Entrée : email, mot de passe  
  - Sortie : token JWT
- `GET /auth/me`  
  - Infos utilisateur + groupes + rôle

### 3.2 Gestion des utilisateurs & groupes (admin)

- `GET /users` (admin), `GET /users/{id}`
- `POST /users` (création d’utilisateurs par l’admin)
- `GET /groups`, `POST /groups`, `PUT /groups/{id}`, `DELETE /groups/{id}`
- `POST /groups/{id}/members` (ajoute un user à un groupe)

### 3.3 Newsletters

- `GET /newsletters`  
  - Filtres : groupe, statut, période, utilisateur.
- `POST /newsletters` (admin)  
  - Crée une nouvelle campagne/newsletter.
- `GET /newsletters/{id}`
- `PUT /newsletters/{id}`  
  - Mise à jour titre, période, statut.
- `POST /newsletters/{id/publish}`  
  - Passe la newsletter en `PUBLISHED`.

### 3.4 Contributions

- `GET /newsletters/{id}/contributions` (admin)  
  - Toutes les contributions pour cette newsletter.
- `GET /newsletters/{id}/my-contributions` (contributeur)  
  - Contributions de l’utilisateur connecté pour cette newsletter.
- `POST /newsletters/{id}/contributions`  
  - Création d’une contribution (ou update si déjà existante pour ce type).
- `PUT /contributions/{id}`  
  - Édition d’une contribution.
- `POST /contributions/{id}/status` (admin)  
  - Changement de statut (approve/reject).

### 3.5 Layout, prévisualisation & rendu

- `PUT /newsletters/{id}/layout`  
  - Sauvegarde de la configuration de layout (`layout_config`).
- `POST /newsletters/{id}/render`  
  - Génération de `rendered_html` à partir du layout + contributions approuvées.
- `POST /newsletters/{id}/ai-draft`  
  - Appelle un service interne qui :
    - récupère toutes les contributions (filtrées par groupe/service et statut `APPROVED`),
    - envoie un prompt structuré à l’API OpenAI (endpoint de génération),
    - reçoit un texte structuré (sections, titres, paragraphes),
    - l’enregistre dans `layout_config` ou dans un champ dédié (brouillon IA) que l’admin pourra modifier.

Sécurité & config :
- La clé OpenAI sera gérée via des variables d’environnement (ex. `OPENAI_API_KEY`).
- Une couche de service (ex. `services/ai_generator.py`) encapsulera la logique d’appel à l’API externe.

---

## 4. Pages frontend (React + Vite)

Ligne directrice design :
- Interface **noir et blanc**, épurée, très contrastée.
- Style minimaliste, typographie soignée, inspiré des standards UI/UX “entreprise” 2026 (cards sobres, beaucoup d’espace blanc, responsive).
- **Design 1 – Cute-alism** : monochrome mais chaleureux (bords arrondis, petits détails “cute” mais subtils), pour rendre l’outil sérieux mais agréable à utiliser.
- Possibilité d’ajouter plus tard un thème alternatif, mais la V1 reste volontairement monochrome pour laisser la place au contenu.

Arborescence (routes principales) :

- `/login` – Page de connexion
- `/newsletters` – Dashboard : liste des newsletters accessibles
- `/newsletters/:id/collect` – Page de recueil des contributions pour l’utilisateur
- `/admin/groups` – Gestion des groupes et des membres
- `/admin/newsletters` – Vue admin des newsletters (liste + création)
- `/newsletters/:id/admin` – Gestion détaillée de la newsletter (validation contributions, statut)
- `/newsletters/:id/edit` – Prévisualisation + édition de la mise en page (canvas)
- `/newsletters/archive` – Page centralisée listant toutes les newsletters publiées (tous groupes), avec filtres (groupe, période) et accessible à tous les collaborateurs authentifiés

Composants clés :
- `LoginForm`
- `NewsletterList`
- `ContributionForm` (success/fail story)
- `AdminGroupManager`
- `AdminNewsletterManager`
- `LayoutEditor` (drag & drop simple ou ordre de sections)
- `NewsletterPreview`
- `AiDraftControls` (bouton “Générer avec l’IA”, affichage des états de génération)
- `CanvasEditor` (édition fine : modification de phrases, suppression de blocs, réorganisation)

---

## 5. Flux utilisateur

### 5.1 Admin

1. Crée un groupe (ex. « Service IA ») et ajoute Jeremy + Antoine.
2. Crée une newsletter (ex. « Service IA – Avril 2025 ») liée à ce groupe.
3. Passe la newsletter en mode collecte (`COLLECTING`).
4. Consulte les contributions reçues, les approuve/rejette/édite.
5. Lance la génération IA de la newsletter (`/newsletters/{id}/ai-draft`).
6. Modifie le brouillon dans la page “canvas” (`/newsletters/:id/edit`) : texte, ordre des blocs, mise en page.
7. Configure le layout final et prévisualise.
8. Publie la newsletter (`PUBLISHED`) → visible dans les archives.

### 5.2 Contributeur

1. Se connecte (`/login`).
2. Accède à `/newsletters` pour voir les campagnes où il doit contribuer.
3. Ouvre `/newsletters/:id/collect`.
4. Remplit ses success/fail stories et les soumet.
5. Peut les modifier tant qu’elles ne sont pas verrouillées / approuvées.

---

## 6. Roadmap de développement

### Phase 1 – Setup & fondations

- Backend : initialiser FastAPI, config DB, modèles `User`, `Group`, `GroupMembership`.
- Authentification JWT, gestion basique des rôles.
- Frontend : créer projet Vite + React, routing de base (`/login`, `/newsletters`).

### Phase 2 – Newsletters & contributions

- Implémenter les modèles `Newsletter` et `Contribution` + endpoints REST associés.
- Côté React :
  - Dashboard des newsletters.
  - Page de recueil des contributions (formulaires success/fail).

### Phase 3 – Admin & workflow

- Endpoints d’admin (gestion groupes, statuts des newsletters, validation contributions).
- Pages React d’administration (`/admin/groups`, `/admin/newsletters`, `/newsletters/:id/admin`).

### Phase 4 – Layout & prévisualisation

- Modèle `layout_config` et API de mise à jour.
- Intégration de l’endpoint `POST /newsletters/{id}/ai-draft` (service OpenAI).
- Composants `LayoutEditor`, `CanvasEditor`, `AiDraftControls` et page de prévisualisation.
- Génération de `rendered_html`.

### Phase 5 – Archives & finition

- Page d’archives `/newsletters/archive`.
- Polissage UX, gestion des erreurs, petites améliorations (emails, notifications, etc.).

---

Ce document pourra être affiné au fur et à mesure (par ex. préciser les schémas JSON des endpoints, les règles de validation, les maquettes UI).***
