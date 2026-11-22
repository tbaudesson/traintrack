# TrainTrack — Synthèse

> 22/11/2026. Détails : `FUNCTIONAL_AUDIT.md`, `TARGET_ARCHITECTURE.md`, `IMPLEMENTATION_ROADMAP.md`, `UX_UI_RECOMMENDATIONS.md`.

## 1. État actuel
TrainTrack est déjà une application multisport avancée et fiable. Elle couvre la musculation, la course, la natation, le vélo, la randonnée, le HIIT, la mobilité et le yoga, ainsi que la voltige.

- **Journal :** les spécificités de chaque discipline sont gérées (charges, 1RM et records ; nage, bassin et SWOLF ; cadence, puissance, FTP et zones ; tours de HIIT ; souplesse ressentie).
- **Saisie :** import des fichiers de montre (GPX, TCX, FIT) et ceinture cardio.
- **Planification :** semaine, mois et année ; séances déplacées, manquées ou annulées ; plan figé par séance avec comparaison prévu / fait ; historique des modifications.
- **Charge d'entraînement :** durée × effort ressenti, par discipline sur 6 mois, sans additionner de métriques incompatibles et sans prédiction médicale.
- **Assistant explicable :** il propose des ajustements de programme et de semaine, et l'utilisateur décide. L'IA est optionnelle, avec la clé de l'utilisateur.

Sur le plan technique, l'app fonctionne hors ligne. Elle repose sur 521 tests unitaires, 65 parcours e2e et des références modifiables depuis l'admin.

## 2. Principales lacunes
- **Interface :** la richesse est réelle mais pas toujours simple. Créer un programme ouvre un éditeur complet, le menu contient des doublons, Réglages n'a pas de sections, la déclaration de blessure est cachée, et les champs ne sont pas séparés entre essentiel et avancé selon la discipline.
- **Objectifs :** seuls les objectifs de force existent. Il manque le temps sur une distance, la distance, la mobilité, la priorité et l'affichage sur l'accueil.
- **Bibliothèque :** pas de discipline, de catégorie ni de niveau, un seul groupe musculaire, et des exercices liés par leur nom anglais, ce qui crée des doublons.
- **Limitations :** on ne peut déclarer qu'une articulation. Impossible d'exclure un muscle, un mouvement ou un exercice.
- **Données de forme :** la VFC et la FC de repos sont enregistrées mais ne servent à aucun calcul.
- **Intégrations :** aucune API (Strava, Garmin, Apple Santé, Health Connect), et les séances n'ont pas de provenance permettant de les dédoublonner.
- **Défauts à corriger en priorité :**
  - l'export RGPD n'est pas filtré par utilisateur, donc il inclut les données des clients sur l'appareil d'un coach ;
  - un programme de coach modifié par son client reste bloqué à la synchronisation (cause vérifiée dans le code, effet à confirmer).

## 3. Opportunités de différenciation
1. **Vrai multisport et charge transversale :** une seule unité (minutes × effort ressenti) pour comparer natation, vélo et musculation, en restant honnête sur les limites.
2. **Coach explicable sans IA obligatoire :** chaque proposition affiche son constat et son changement exact, puis l'utilisateur applique ou ignore, avec un historique réversible.
3. **Simplicité malgré la richesse :** saisie rapide par discipline, options avancées repliées, recherche partout.
4. **Respect des limitations physiques :** restrictions personnelles, gestes doux, retour progressif après blessure et renvoi vers un professionnel.

## 4. Les cinq évolutions les plus importantes
1. **Fiabilité et conformité :** export RGPD, programmes de coach, consentement IA, calculs unifiés.
2. **Simplicité :** création rapide de programme, éditeur compact, menu et Réglages réorganisés.
3. **Registre de disciplines :** une définition par sport, avec saisie essentielle et saisie avancée.
4. **Objectifs multisport visibles sur l'accueil.**
5. **Bibliothèque enrichie et restrictions personnelles**, avec adaptation proposée au démarrage d'une séance.

## 5. Risques architecturaux
- **Synchronisation :** une requête par ligne, pas de pagination, `user_id` forcé. C'est à revoir avant les intégrations.
- **Disciplines dispersées :** les sports sont décrits dans 4 à 6 listes séparées. Tant qu'il n'y a pas de registre unique, chaque nouveau sport coûte cher.
- **Liens par nom :** les exercices, les modèles et les règles de blessure sont reliés par leur nom anglais. Il faut passer progressivement aux identifiants (uuid).
- **Modèles de programmes :** ils existent dans trois sources (code, migrations, table).
- **Intégrations santé :** Apple Santé et Health Connect sont impossibles sans application native.

## 6. Feuille de route recommandée
| Étape | Contenu | Taille |
|---|---|---|
| Sprint 0 | Fiabilité et conformité | S |
| Sprint 1 | Simplicité de l'interface | M |
| Sprint 2 | Registre de disciplines | M |
| Sprint 3 | Objectifs multisport et tableau de bord | M |
| Sprint 4 | Bibliothèque enrichie et restrictions | M |
| Sprint 5 | Récupération (VFC, FC de repos), conflits entre séances, courbes (facultatif) | M |
| Sprint 6 | Performance, sync et provenance (avant toute intégration) | M |
| V3 | Strava, natif (Apple Santé, Health Connect), modèles en base, sports collectifs | L |

## 7. Décisions à valider
1. **Application native :** l'envelopper dans une application native (Capacitor) pour Apple Santé et Health Connect, ou rester une PWA avec l'import de fichiers ?
2. **Ordre des sprints :** valider l'ordre 0 → 1 → 2 → 3, ou faire passer les objectifs (3) avant le registre (2) ?
3. **Modèles de programmes :** en faire une source unique en base (chantier L, à risque), ou garder le code comme catalogue ?
4. **Sports collectifs :** les inclure dans le périmètre (V3), ou rester sur les sports individuels ?
5. **IA :** passer par un proxy serveur (l'IA devient une offre gérée par TrainTrack), ou garder la clé personnelle sur l'appareil ?
6. **Licences :** quelles fonctions dans quelles formules ? Ces décisions sont toujours en attente.
