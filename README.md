# Anjanews MVP

Application MVP pour collecter des success stories / fail stories et générer des newsletters prêtes à être publiées.

## Stack

- Backend : Python (à réintroduire plus tard, non présent dans ce MVP)
- Frontend : React + Vite (`frontend/`), `react-router-dom` pour les routes frontend, `chart.js` pour la visualisation du taux de participation.
  - Thème visuel : noir & blanc inspiré de Medium, avec la police de lecture `charter` chargée depuis `glyph.medium.com` (fallback serif système si la ressource n’est pas disponible), et des éléments légèrement arrondis (boutons, champs, cartes, header, onglets et panneaux) pour adoucir l’interface ; tous les blocs carrés utilisent désormais des coins arrondis pour éviter les angles vifs.

## Fonctionnalités du MVP (frontend uniquement)

- **Fil** : fil de newsletters écrites comme des articles (quelques exemples mockés + newsletters générées automatiquement), présenté dans un design noir & blanc minimaliste inspiré de Medium (colonne centrale sobre, sans titre de section, typographie serif pour le contenu, vignettes à droite dans le fil et image plus large en haut de l’article ouvert, recadrée dans une hauteur limitée avec coins arrondis). Chaque newsletter du fil est cliquable et dispose d’une URL dédiée (`/newsletter/fil/:id`) pour faciliter le partage ; lorsqu’une newsletter est ouverte, seule cette newsletter est affichée en lecture seule (non cliquable) avec un bouton « Retour au fil complet ».
- **Réactions & commentaires** : chaque newsletter peut recevoir des réactions rapides noir & blanc (pictos pouce contour) et des commentaires publiés sous le nom du rôle courant, directement depuis la vue détaillée, avec un compteur sobre. La barre d’engagement est placée sous chaque newsletter.
- **Collect** : formulaire noir & blanc compact pour saisir trois blocs courts (faits marquants, success story, fail story) sur une seule vue, avec exemples contextualisés aux services d’assurance ; le compte connecté signe automatiquement la contribution (plus de champ nom à renseigner).
- **Contributions** : vue de suivi `/newsletter/contribution` affichant les contributions de l’édition en cours, le taux de participation (unique) des membres via un donut Chart.js, et la liste nominative des apports.
- **Générateur** : vue admin qui consomme les contributions (faits marquants / success / fail) et génère un texte complet de newsletter, immédiatement poussé dans le fil, avec une surface d’édition simple en noir et blanc (typographie identique à la lecture). Les actions « Générer un draft » et « Publier dans le fil » sont positionnées sous la zone d’édition pour ne pas masquer le contenu, et les contributions à intégrer sont listées dans la colonne dédiée.
- **Admin** : gestion simple en mémoire des utilisateurs, rôles (user, admin, super admin) et groupes/équipes, avec création/suppression de groupes, attribution d’un ou plusieurs groupes existants aux utilisateurs et sélection d’admins newsletter, plus un récap des newsletters créées avec les contributeurs rattachés et les admins autorisés à publier, via des onglets « Newsletters & équipes », « Utilisateurs & rôles », « Groupes & droits ». Gestion des comptes : trigrammes (ex : GJV) et bouton de reset de mot de passe par utilisateur.
- Onglets Admin : espacement resserré (y compris avec le header) et indicateur stable (pas de décalage en changeant d’onglet) pour garder une navigation compacte, avec un alignement plus serré entre le header de section, les onglets et les formulaires/boutons d’action pour limiter le blanc inutile.
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
- Header compact, aligné sur une grille noir & blanc, sticky (toujours visible) avec navigation par onglets synchronisée avec les routes (`/newsletter/fil`, `/newsletter/collect`, `/newsletter/generateur`, `/newsletter/admin`), intégrée dans la même barre que le logo « Anjanews » et alignée à droite avec un espacement suffisant pour garder une bonne lisibilité.
- Les logs (`console.info`) sont ajoutés uniquement sur les actions clés (changement de rôle, création de contribution, génération et publication d’une newsletter, ouverture d’une newsletter depuis le fil, réactions ou commentaires).
