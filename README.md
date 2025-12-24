# Anjanews MVP

Application MVP pour collecter des success stories / fail stories et générer des newsletters prêtes à être publiées.

## Stack

- Backend : Python (FastAPI + SQLAlchemy + Alembic)
- Base de données : PostgreSQL
- Frontend : React + Vite (`frontend/`), `react-router-dom` pour les routes frontend, `chart.js` pour la visualisation du taux de participation.
  - Thème visuel : noir & blanc inspiré de Medium, avec la police de lecture `charter` chargée depuis `glyph.medium.com` (fallback serif système si la ressource n’est pas disponible), et des éléments légèrement arrondis (boutons, champs, cartes, header, onglets et panneaux) pour adoucir l’interface ; tous les blocs carrés utilisent désormais des coins arrondis pour éviter les angles vifs.

## Fonctionnalités du MVP

- **Authentification** : page de connexion reliée au backend, sessions, mots de passe temporaires fournis par l’admin, changement obligatoire à la première connexion et reset possible côté admin.
- **Fil** : fil de newsletters écrites comme des articles (quelques exemples mockés + newsletters générées automatiquement), présenté dans un design noir & blanc minimaliste inspiré de Medium (colonne centrale sobre, sans titre de section, typographie serif pour le contenu, vignettes à droite dans le fil et image plus large en haut de l’article ouvert, recadrée dans une hauteur limitée avec coins arrondis). Chaque newsletter du fil est cliquable et dispose d’une URL dédiée (`/newsletter/fil/:id`) pour faciliter le partage ; lorsqu’une newsletter est ouverte, seule cette newsletter est affichée en lecture seule (non cliquable) avec un bouton « Retour au fil complet ».
- **Réactions & commentaires** : chaque newsletter peut recevoir des réactions rapides noir & blanc (pictos pouce contour) et des commentaires publiés sous le nom du compte connecté, directement depuis la vue détaillée, avec un compteur sobre. La barre d’engagement est placée sous chaque newsletter.
- **Collect** : formulaire noir & blanc compact pour saisir trois blocs courts (faits marquants, success story, fail story) sur une seule vue, avec exemples contextualisés aux services d’assurance ; le compte connecté signe automatiquement la contribution (plus de champ nom à renseigner).
- **Contributions** : vue de suivi `/newsletter/contribution` affichant les contributions de l’édition en cours, le taux de participation (unique) des membres via un donut Chart.js, et la liste nominative des apports.
- **Générateur** : vue admin qui consomme les contributions (faits marquants / success / fail) et génère un texte complet de newsletter, immédiatement poussé dans le fil, avec une surface d’édition simple en noir et blanc (typographie identique à la lecture). Les actions « Générer un draft » et « Publier dans le fil » sont positionnées sous la zone d’édition pour ne pas masquer le contenu, et les contributions à intégrer sont listées dans la colonne dédiée.
- **Admin** : gestion des utilisateurs, rôles (user, admin, super admin) et groupes/équipes, avec création/suppression de groupes, attribution d’un ou plusieurs groupes existants aux utilisateurs et sélection d’admins newsletter, plus un récap des newsletters créées avec les contributeurs rattachés et les admins autorisés à publier, via des onglets « Newsletters & équipes », « Utilisateurs & rôles », « Groupes & droits ». Gestion des comptes : trigrammes (ex : GJV), mot de passe temporaire à la création et reset de mot de passe par utilisateur.
- Onglets Admin : espacement resserré (y compris avec le header) et indicateur stable (pas de décalage en changeant d’onglet) pour garder une navigation compacte, avec un alignement plus serré entre le header de section, les onglets et les formulaires/boutons d’action pour limiter le blanc inutile.

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

Assurez-vous que la base PostgreSQL existe (exemple) :

```bash
createdb anjanews
```

## Lancement via `start.sh`

Utilisez toujours le script de lancement :

```bash
./start.sh
```

- Le script installe les dépendances, applique les migrations et démarre backend + frontend.
- Les ports configurés dans `.env` sont libérés si déjà utilisés, pour éviter un démarrage sur un port inattendu.
- L’interface est servie par Vite (port `FRONTEND_PORT`).

## Première connexion

- Si aucun utilisateur n’existe, utilisez l’écran de connexion pour créer le premier super admin via le lien « Créer le super admin initial ».
- L’admin crée ensuite les comptes utilisateurs avec un mot de passe temporaire, changé lors de la première connexion.

## Notes d’architecture

- Backend FastAPI, schéma SQLAlchemy, migrations Alembic, API exposée sous `/api`.
- Code orienté composants React simples, avec un minimum de dépendances.
- Pas de state global complexe : tout est géré dans le composant racine pour ce MVP.
- Authentification par session (token côté frontend dans `sessionStorage`), mots de passe hashés côté backend et obligation de reset après un mot de passe temporaire.
- Header compact, aligné sur une grille noir & blanc, sticky (toujours visible) avec navigation par onglets synchronisée avec les routes (`/newsletter/fil`, `/newsletter/collect`, `/newsletter/generateur`, `/newsletter/admin`), intégrée dans la même barre que le logo « Anjanews », avec l’utilisateur connecté et un bouton de déconnexion à droite.
- Les logs (`console.info`) sont ajoutés uniquement sur les actions clés (connexion, création de contribution, génération et publication d’une newsletter, ouverture d’une newsletter depuis le fil, réactions ou commentaires).
