# Anjanews MVP

Application MVP pour collecter des success stories / fail stories et générer des newsletters prêtes à être publiées.

## Stack

- Backend : Python (à réintroduire plus tard, non présent dans ce MVP)
- Frontend : React + Vite (`frontend/`), `react-router-dom` pour les routes frontend.
  - Thème visuel : noir & blanc inspiré de Medium, avec la police de lecture `charter` chargée depuis `glyph.medium.com` (fallback serif système si la ressource n’est pas disponible).

## Fonctionnalités du MVP (frontend uniquement)

- **Fil** : fil de newsletters écrites comme des articles (quelques exemples mockés + newsletters générées automatiquement), présenté dans un design noir & blanc minimaliste inspiré de Medium (colonne centrale sobre, sans titre de section, typographie serif pour le contenu). Chaque newsletter du fil est cliquable et dispose d’une URL dédiée (`/newsletter/fil/:id`) pour faciliter le partage ; lorsqu’une newsletter est ouverte, seule cette newsletter est affichée en lecture seule (non cliquable) avec un bouton « Retour au fil complet ».
- **Collect** : formulaire minimaliste noir & blanc pour que les utilisateurs envoient leurs success/fail stories.
- **Générateur** : vue admin qui consomme les contributions et génère un texte complet de newsletter, immédiatement poussé dans le fil, avec une surface d’édition simple en noir et blanc (typographie identique à la lecture).
- **Admin** : gestion simple en mémoire des utilisateurs, rôles (user, admin, super admin) et groupes/équipes, avec création/suppression de groupes et attribution d’un ou plusieurs groupes existants aux utilisateurs dans une liste monochrome épurée.
- Sélecteur de rôle en haut de l’interface pour simuler les permissions, présenté comme une simple barre de navigation noir & blanc.

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
- Header compact, aligné sur une grille noir & blanc, sticky (toujours visible) avec navigation par onglets synchronisée avec les routes (`/newsletter/fil`, `/newsletter/collect`, `/newsletter/generateur`, `/newsletter/admin`).
- Les logs (`console.info`) sont ajoutés uniquement sur les actions clés (changement de rôle, création de contribution, génération et publication d’une newsletter, ouverture d’une newsletter depuis le fil).
