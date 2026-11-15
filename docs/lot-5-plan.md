# Lot 5 — Performance : de compteurs à une lecture interprétée

Branche `codex/lot-5-performance`, partie de `main` en `ec327dc`. Audit en lecture seule, aucun code modifié. Pas de migration Supabase. Aucun calcul métier existant n'est modifié : le lot les **lit** et les met en mots.

## 1. Performance aujourd'hui (`/progress`, 471 lignes)

Dans l'ordre d'affichage :
1. Selon le sport détecté : `CardioProgress` (endurance), ou la carte « poids du corps » (graphique et meilleures séries).
2. `GoalsSection` : objectifs de force (1RM estimé à atteindre).
3. Saisie du poids de corps.
4. Compétitions de voltige (licence `vaulting`).
5. **Quatre compteurs** : séances, séries, volume total (kg), volume des 7 derniers jours (kg). Ils couvrent **toute l'histoire**, sans comparaison ni sens.
6. Toutes les recommandations du jour (déplacées ici au Lot 3).
7. Bilan de la semaine passée (`WeeklyReportCard`) et lien vers le bilan du mois (licence `reports`).
8. Graphiques : volume par date, progression par exercice (1RM estimé, charge max, répétitions, volume), volume par groupe musculaire, records, poids de corps (une partie sous `advanced_progress`).

Ce qui manque : rien ne répond à « est-ce que je progresse, pourquoi, et que faire ensuite ? ». Les chiffres existent, mais sans période, sans comparaison et sans conclusion.

## 2. Ce qui est déjà calculé (à réutiliser tel quel)

| Source | Ce qu'elle donne |
|---|---|
| `weeklyReport` | jours entraînés vs prévus, volume et sa variation, records battus, RPE moyen, cardio, douleurs |
| `monthlyReport` | même lecture sur un mois, avec le mois précédent |
| `trainingLoad` | ratio charge aiguë / chronique et sa zone (basse, optimale, attention, danger) |
| `deloadAdvice` | semaine de décharge conseillée, et pourquoi (semaines, RPE, forme) |
| `goals` | historique du 1RM estimé et progression vers un objectif |
| `performance` | records, meilleures charges, dernières performances |
| `activityProfile` | sport pratiqué (force, poids du corps, endurance, voltige) |
| `weekSummary` (Lot 3) | volume chargé ou activités, sans jamais mélanger les deux |
| `readiness`, `pain` | forme du jour, douleurs déclarées |

## 3. Proposition : un insight principal, ses preuves, une recommandation

Nouvelle logique pure `src/lib/insights.ts`, testée. Elle reçoit les résultats des calculs ci-dessus sur une période (4 dernières semaines, comparées aux 4 précédentes), et rend une liste d'**insights candidats**, triés par priorité :

| Priorité | Insight (exemple de titre) | Preuves (2 à 3) | Recommandation |
|---|---|---|---|
| 1. Sécurité | « Charge en hausse trop rapide (+129 %) » | ratio de charge, séances des 7 derniers jours, RPE moyen | alléger cette semaine (lien décharge) |
| 1. Sécurité | « Douleur à l'épaule signalée 3 fois » | dates, exercices concernés | adapter ou remplacer (lien blessures) |
| 2. Objectif | « Développé couché : objectif atteint » / « à 85 % » | 1RM estimé, départ, cible | fixer le suivant / garder le rythme |
| 3. Progrès | « 3 records en 4 semaines » | exercices et valeurs | continuer la progression actuelle |
| 3. Progrès | « Volume +34 % en 4 semaines » (force) / « 42 km, +12 % » (endurance) | séances, séries, comparaison période précédente | consolider avant d'augmenter |
| 4. Stagnation | « Squat stable depuis 5 semaines » | 1RM estimé semaine par semaine | changer de plage de répétitions ou faire une décharge |
| 5. Régularité | « 2,5 séances / semaine pour 3 prévues » | semaines tenues, jours manqués | caler un créneau (lien planning) |
| 6. Démarrage | « Encore 2 séances pour une première lecture » | séances faites | lancer une séance (lien hub) |

Règles :
- Un insight ne parle que de données suffisantes : nombre de séances et de semaines minimal, sinon on bascule sur « Démarrage ».
- Jamais de kilos pour la course, la mobilité ou le poids du corps (même règle qu'au Lot 3).
- Un chiffre est toujours accompagné de sa comparaison et de sa période.
- Les recommandations reprennent les conseils existants (décharge, progression, recommandations du jour) : aucune règle d'entraînement nouvelle.

## 4. Structure de page proposée

1. **Insight principal** : titre, une phrase d'explication, période (« 4 dernières semaines »).
2. **Preuves** : 2 à 3 chiffres avec leur comparaison, chacun menant au graphique correspondant.
3. **Recommandation** : une action, avec un lien vers l'écran concerné.
4. **Autres lectures** : les insights suivants, repliés (« À voir aussi »).
5. **Sections** : Charge et régularité, Records, Objectifs (`GoalsSection`), Rapport (bilans hebdomadaire et mensuel).
6. **Détails** : les graphiques actuels, inchangés, regroupés et repliés par défaut sur mobile.

Les 4 compteurs « tout l'historique » disparaissent : leurs chiffres utiles passent dans les preuves, avec une période et une comparaison. Saisie du poids de corps, compétitions, `CardioProgress` et carte poids du corps restent, à leur place dans les sections.

Responsive : une colonne sur mobile ; à partir de 768 px, l'insight et ses preuves à gauche, la recommandation et les autres lectures à droite.

## 5. Risques

1. **Conclusions abusives** sur peu de données : seuils minimaux et un insight « Démarrage » explicite.
2. **Contradictions** avec l'accueil (`weekSummary`, objectif) et avec les bilans : les insights réutilisent les mêmes fonctions.
3. **Licences** : `advanced_progress` (graphiques avancés), `reports` (bilans), `readiness`, `vaulting` restent appliquées ; un insight qui dépend d'une donnée sous licence ne s'affiche pas sans elle.
4. **Sports multiples** : force, poids du corps, endurance, voltige ont chacun leurs preuves.
5. **Performance** de calcul sur un long historique : tout reste mémoïsé ; la logique pure est testée sur des historiques réalistes.
6. **i18n** : titres avec pluriels et nombres formatés, en fr (« vous »), en et de (« du »).
7. **e2e existants** qui lisent `/progress` (bilan du mois, objectifs) : à garder verts.

## 6. Fichiers concernés

- Nouveaux : `src/lib/insights.ts` et `src/lib/insights.test.ts`, `src/components/domain/InsightCard.tsx`, `src/components/domain/InsightEvidence.tsx`.
- `src/app/[locale]/progress/page.tsx` (recomposition ; graphiques déplacés tels quels dans une section « Détails »).
- `src/messages/{fr,en,de}.json` (espace `insights`).
- `e2e/run.mjs` (insight selon des données seedées : charge en hausse, sans données, endurance).
- Lus seulement : `weeklyReport`, `monthlyReport`, `trainingLoad`, `deload`, `goals`, `performance`, `activityProfile`, `weekSummary`, `readiness`, `pain`.

## 7. Découpage en commits

1. `insights.ts` : calcul des candidats et tri, avec tests (force, poids du corps, endurance, peu de données, charge en danger, record, stagnation, régularité).
2. Carte d'insight principal et preuves, en haut de `/progress`, sans rien retirer.
3. Recommandation et « À voir aussi ».
4. Recomposition : compteurs retirés, sections, graphiques regroupés sous « Détails ».
5. e2e et Preview.

## 8. À trancher avant de coder

1. Période : 4 semaines glissantes comparées aux 4 précédentes (proposé), ou mois civil ?
2. Faut-il un sélecteur de période (4 / 12 semaines) dès ce lot ?
3. Les graphiques : repliés par défaut sur mobile seulement (proposé), ou partout ?
4. Stagnation : le seuil (5 semaines sans hausse du 1RM estimé) et le conseil proposé vous conviennent-ils ?
5. L'insight principal doit-il aussi remplacer la recommandation prioritaire de l'accueil, pour que les deux disent la même chose ?
