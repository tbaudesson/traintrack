# Lot 3 — Accueil et hub « S'entraîner » : audit et plan

Branche `codex/lot-3-home-train`, partie de `main` en `741590d`. Audit en lecture seule, aucun code modifié. Pas de migration Supabase. Le moteur de navigation (roue à deux niveaux, `navConfig`, `useSessionFocus`) ne change pas.

## 1. État actuel

### Accueil (`src/app/[locale]/page.tsx`, 1 056 lignes, un seul composant)

Les blocs, dans l'ordre d'affichage :

1. En-tête : salutation, lien Profil (trophée), cloche (commentaires du coach ou invitation d'équipe), lien Réglages.
2. Bienvenue (`needsOnboarding`), qui remplace tout le reste tant que le profil n'est pas créé.
3. **Carte « Séance du jour »** : programme, semaine du programme, anneau de progression, choix entre plusieurs séances du jour, Commencer / Continuer, Voir les détails, Version express (licence `planning`), « Changer de séance ou de programme ».
4. `FirstSteps` : 5 étapes, affiché pendant 30 jours tant qu'il reste des étapes, avec « Masquer ».
5. **Notes** : la plus urgente est affichée, les autres sont repliées sous « À regarder ». Il y en a sept : charge d'entraînement, forme basse, décharge, bilan de fin de programme, bilan hebdomadaire, tests de niveau dus, suggestion de sport.
6. `WeekStrip` : semaine, série de semaines réussies, export vers l'agenda, déplacement d'une séance.
7. `MyPrograms` : programmes en cours.
8. Dialogue « Choisir une séance » : jours de mes programmes, refaire la dernière séance, séance libre, séance minutée, fractionné de course, mobilité, endurance, import GPX, créer un programme, gérer les programmes, programmes prêts à l'emploi.
9. **Aperçu** : 3 tuiles (volume ou distance, calories ou séances, progression).
10. **Objectif de la semaine** : barre `séances / objectif`.
11. Cartes commentaires du coach, invitation d'équipe, état de forme.
12. `Recommendations`.

### D'où vient « 11 / 3 »

- La cible `goal` = `weeklyGoal(session.program, session.day)` : le nombre de séances prévues **dans la semaine du programme en cours** (3).
- La valeur `overview.sessions` = **toutes** les séances de la semaine civile (`weekOverview`) : tous programmes confondus, plus la course, les séances minutées, la mobilité, et même les séances ouvertes puis abandonnées.
- La barre est limitée à 100 %, mais le chiffre affiche 11 / 3 sans rien expliquer.

### Toutes les façons de démarrer une séance

| Où | Action | Fonction |
|---|---|---|
| Accueil, carte du jour | Commencer / Continuer, Version express | `start`, `startDay` → `startWorkoutFromDay` |
| Accueil, dialogue « Choisir une séance » | jour d'un programme, refaire la dernière, libre, minutée, course, mobilité, endurance, GPX, prêt à l'emploi | `startDay`, `repeatWorkout`, `startFree`, `startCardio`, `GpxImport`, `addTemplate` |
| Accueil, `MyPrograms` | Continuer un programme | `startDay` / `sessionHref` |
| Accueil, `FirstSteps` | « Faire votre première séance » | `start` |
| `/log` (Journal) | Nouvelle séance, refaire la dernière, endurance, GPX, séance minutée, jours de programme, historique | `createWorkout`, `repeatWorkout`, `SportPicker`, `startFromProgramDay` |
| `/programs/[id]` | lancer un jour | `startWorkoutFromDay` |
| `/intervals`, `/running`, `/mobility`, `/tests` | séances guidées | leurs propres lecteurs |
| `ProgramCatalog`, `CardioLogger` | depuis le catalogue, saisie d'endurance | `createWorkout` |

## 2. Inventaire réutilisable

**Composants** (déjà autonomes) : `WeekStrip`, `MyPrograms`, `FirstSteps`, `TrainingLoadCard`, `ReadinessBanner`, `DeloadCard`, `WeeklyReportCard`, `Recommendations`, `ExpressDialog`, `MoveSessionDialog`, `SportPicker`, `GpxImport`, `DetailRow`, `ProgramCatalog`.

**Données et logique** (hooks et `lib`, rien à changer côté base) :
- `useWorkouts`, `useAllWorkoutSets`, `useTrainablePrograms`, `useAthleteProfile`, `useReadiness` / `useTodayReadiness`, `useLighterToday`, `usePainReports`, `useNutritionForDate`, `useUnreadComments`, `useTeams`, `useFeatureAccess`, `useAppPrefs` ;
- `startWorkout` (`startWorkoutFromDay`, `repeatWorkout`, `lastRepeatable`, `nextDayIndex`, `daysToOffer`), `weekPlan`, `schedule`, `weekStreak`, `trainingLoad`, `deload`, `levelTests`, `activityProfile` (`weekOverview`, `detectSport`), `cardio` (`weeklyGoal`), `express`.

**À extraire de `page.tsx`, sans changer de comportement** :
- `useSessionOfTheDay()` : `session`, `percent`, `start`, `startDay`, `canExpress`, choix entre séances du même jour ;
- `useHomeNotes()` : la liste des notes, déjà triée par urgence ;
- `useStartActions()` : `startFree`, `startCardio`, `repeatLast`, `freeRows`, `templateGroups`, `addTemplate`, `buildProgram`. Partagé par l'accueil, le dialogue et le futur hub.
- `SessionPickerDialog` : le dialogue « Choisir une séance », tel quel.

## 3. Structure proposée

### Phase 1 — Accueil en trois zones

1. **Prochaine action** : la carte « Séance du jour » actuelle, inchangée dans ses fonctions (Commencer / Continuer, express, choix entre séances du jour, changer de séance). La bienvenue la remplace tant que l'onboarding n'est pas fait.
2. **Semaine compacte** : `WeekStrip`, plus une ligne d'objectif corrigée (voir ci-dessous).
3. **Signal adaptatif** : **une seule** carte, la plus urgente des notes. Si la forme du jour n'est pas renseignée, on invite à la noter. Les autres notes restent accessibles par « À regarder (n) ».

Déplacé, rien n'est supprimé :

| Contenu | Nouvelle place |
|---|---|
| `MyPrograms` | hub S'entraîner (et `/programs`) |
| Aperçu (3 tuiles) | Performance → `/progress` ; un lien « Voir mes progrès » reste sur l'accueil |
| Carte état de forme | devient le signal adaptatif quand rien de plus urgent |
| Commentaires du coach, invitation d'équipe | restent dans la cloche de l'en-tête, qui existe déjà ; les cartes en double disparaissent |
| `Recommendations` | sous « À regarder », ou dans `/progress` (à trancher) |
| `FirstSteps` non terminé | **une ligne** : « Premiers pas 3/5 » + Continuer + Masquer ; dépliable pour voir les étapes |

**Objectif de la semaine corrigé** : on compte les séances **du programme** faites cette semaine (même règle que `findWorkoutProgramDay`), sans les séances vides. Les autres séances apparaissent à part (« + 8 autres activités »). Si l'objectif est dépassé, on l'écrit (« Objectif atteint, + 2 séances »). Logique pure dans `src/lib/weekGoal.ts`, testée.

### Phase 2 — Hub « S'entraîner »

- **Proposition de route : `/log`, recomposée en hub.** L'adresse est déjà en cache hors ligne, déjà dans la roue (« Historique ») et dans l'e2e, et elle ne demande pas de nouvel écran à précacher. Une nouvelle route `/train` est l'alternative (à trancher).
- **Trois actions dominantes** :
  1. **Séance planifiée** : celle du jour (même logique que la carte d'accueil), ou le choix des jours de mes programmes ;
  2. **Séance libre** : vide, ou refaire la dernière ;
  3. **Endurance** : sortie (`SportPicker`), fractionné de course (licence `running`), import GPX.
- **Accès secondaires** (liste compacte) : Programmes, Exercices, Historique (dans le hub, sous les actions), Imports (Excel → `/programs`, GPX), séances minutées et mobilité.
- **Rien n'est retiré** pendant la transition : le dialogue de l'accueil, `MyPrograms`, `/programs/[id]`, `/intervals`, `/running`, `/mobility` et `/tests` gardent leurs boutons de démarrage. On pourra les retirer une fois le hub validé.

### Responsive

- **Mobile (< 768 px)** : une colonne, dans l'ordre des zones. La carte du jour est en haut et son bouton principal reste atteignable au pouce, au-dessus de la roue (marge basse `pb-28` conservée).
- **Tablette et grand écran (≥ 768 px)** : deux colonnes. Prochaine action et semaine à gauche (2/3), signal adaptatif à droite (1/3). Contenu limité à `max-w-5xl` et centré.
- **Hub** : les trois actions en cartes empilées sur mobile, en grille de trois sur grand écran. Les accès secondaires en liste dessous.
- Tailles minimales des zones tactiles conservées (44 px).

## 4. Risques

1. **Parcours e2e attachés à l'accueil** : programme prêt à l'emploi ajouté depuis l'accueil, export agenda, alerte de charge, version express, première séance, mode guidé, déplacement d'une séance, sport suivi, `FirstSteps`. Chaque déplacement doit garder un chemin équivalent, et les tests seront ajustés en même temps.
2. **Changement de compteur** de l'objectif : les utilisateurs verront moins de séances comptées. Le libellé doit l'expliquer.
3. **Licences** : chaque élément déplacé garde sa condition (`planning`, `reports`, `level_tests`, `running`, `readiness`, `nutrition`).
4. **Hors ligne** : si une nouvelle route `/train` est choisie, il faut l'ajouter au préchargement du service worker et à la liste `PAGES` de l'e2e.
5. **Taille du fichier d'accueil** : l'extraction des hooks doit se faire à comportement identique, en commits séparés, avant tout déplacement visuel.
6. **i18n** : nouveaux textes en fr (« vous »), en (« you ») et de (« du »).
7. **Notes masquées** : les cartes que l'utilisateur a fermées (`closedCards`, `flags`, `reportClosed`) doivent rester fermées.

## 5. Fichiers concernés

Phase 1 :
- `src/app/[locale]/page.tsx` (recomposition)
- nouveaux : `src/hooks/useSessionOfTheDay.ts`, `src/hooks/useHomeNotes.tsx`, `src/hooks/useStartActions.tsx`, `src/components/domain/SessionPickerDialog.tsx`, `src/components/domain/HomeSignal.tsx`, `src/lib/weekGoal.ts` et `src/lib/weekGoal.test.ts`
- `src/components/domain/FirstSteps.tsx` (mode une ligne)
- `src/app/[locale]/progress/page.tsx` (accueillir l'aperçu, si validé)
- `src/messages/{fr,en,de}.json`
- `e2e/run.mjs`

Phase 2 :
- `src/app/[locale]/log/page.tsx` (hub), ou nouveau `src/app/[locale]/train/page.tsx`
- `src/hooks/useStartActions.tsx` (partagé)
- `src/lib/navConfig.ts` : seulement l'adresse des entrées si la route change ; le moteur, lui, ne change pas
- `src/messages/{fr,en,de}.json`, `e2e/run.mjs`, et `public/sw.js` si nouvelle route

## 6. Découpage en commits

1. Extraire les hooks et le dialogue, sans changement visible (e2e inchangé, doit passer tel quel).
2. `weekGoal` et sa correction, avec tests unitaires.
3. `FirstSteps` en une ligne.
4. Accueil en trois zones (+ e2e ajustés).
5. Hub « S'entraîner » (+ e2e).

Chaque commit passe les tests ciblés, ESLint, TypeScript, le build et l'e2e. Une Preview seulement.

## 7. À trancher avant de coder

1. Hub sur `/log` (recommandé) ou nouvelle route `/train` ?
2. Aperçu des 3 tuiles : vers `/progress`, ou une ligne résumée sur l'accueil ?
3. `Recommendations` : sous « À regarder », ou dans Performance ?
4. Objectif de la semaine : ne compter que le programme en cours (recommandé), ou tous les programmes planifiés ?
5. Cartes commentaires du coach et invitation : seulement la cloche, ou garder une carte quand c'est nouveau ?
