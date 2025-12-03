1. **No artifacts** - Éviter la création d'artefacts inutiles.
2. **Less code is better than more code** 
4. **Rewrite existing components over adding new ones** - Réécrire les composants existants plutôt que d'en ajouter de nouveaux.
5. **Flag obsolete files to keep the codebase lightweight** - Signaler les fichiers obsolètes pour maintenir une base de code légère.
6. **Avoid race conditions at all costs** - Éviter les conditions de concurrence à tout prix.
7. **Comment only si necessaire**
8. **Coder de façon modulaire pour favoriser la collaboration entre agents** - IMPORTANT : L'ajout de features ne doit pas casser le reste du système.
10. **Always add meaningful logs** — but only where it brings value - Toujours ajouter des logs significatifs, mais seulement là où cela apporte de la valeur.
11. **Toujours penser production** le code doit toujours etre prêt pour la production. Pas de code inutiles. 
12. **Toujours mettre à jour le README.md** : Permet de documenter les changements.  


Utilise toujours uv pour gestion de package python
A chaque fois que tu fais une modif, commit les changements
Toujours lancer l'application avec start.sh qui lance le backend et le frontend (dynamiquement pour les CORS, on defini les ports dans le .env)
Backend en python, front en react
