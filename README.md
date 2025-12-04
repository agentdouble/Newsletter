# Anjanews MVP

Application MVP pour collecter des success stories / fail stories et générer des newsletters prêtes à être publiées.

## Stack

- Backend : Python (à réintroduire plus tard, non présent dans ce MVP)
- Frontend : React + Vite (`frontend/`), `react-router-dom` pour les routes frontend.

## Fonctionnalités du MVP (frontend uniquement)

- **Fil** : fil de newsletters écrites comme des articles (quelques exemples mockés + newsletters générées automatiquement), présenté dans un design noir & blanc minimaliste sans cadre autour des newsletters (titre, service et contenu uniquement).
- **Collect** : formulaire pour que les utilisateurs envoient leurs success/fail stories.
- **Générateur** : vue admin qui consomme les contributions et génère un texte complet de newsletter, immédiatement poussé dans le fil.
- **Admin** : gestion simple en mémoire des utilisateurs, rôles (user, admin, super admin) et groupes/équipes, avec attribution d’un ou plusieurs groupes existants aux utilisateurs.
- Sélecteur de rôle en haut de l’interface pour simuler les permissions.

> Remarque : aucune donnée n’est encore persistée ni connectée à un backend.

## Installation du frontend

Dans un premier temps, seul le frontend est disponible.

```bash
cd frontend
npm install
npm run dev
```

L’interface est servie par Vite (par défaut sur le port `5173`).

## Lancement via `start.sh`

Pour rester aligné avec la structure cible (backend + frontend), utilisez toujours le script de lancement :

```bash
./start.sh
```

- Dans ce MVP, le script démarre **uniquement le frontend**.
- Quand le backend Python sera réintroduit, il sera branché dans ce même script (en utilisant `uv` pour la gestion des dépendances Python).

## Notes d’architecture

- Code orienté composants React simples, avec un minimum de dépendances.
- Pas de state global complexe : tout est géré dans le composant racine pour ce MVP.
- Header compact et sticky (toujours visible) avec navigation par onglets synchronisée avec les routes (`/newsletter/fil`, `/newsletter/collect`, `/newsletter/generateur`, `/newsletter/admin`).
- Les logs (`console.info`) sont ajoutés uniquement sur les actions clés (changement de rôle, création de contribution, génération d’une newsletter).
