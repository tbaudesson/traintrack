# TrainTrack — Architecture actuelle et cible

> État au 22/11/2026 (`main` 9ea2c92). Recommandation : **faire évoluer, pas réécrire**. L'architecture actuelle est saine ; ses limites sont localisées.

## 1. Architecture actuelle

```
Pages (src/app/[locale], 45 pages, client)            ← interface
  └─ Composants (src/components/domain, ui, navigation)
       └─ Hooks (src/hooks, 42) : requêtes Dexie en direct + écritures (_dirty, schedulePush)
            ├─ Logique pure (src/lib, ~115 modules, 89 fichiers de tests)
            │    calculs : performance, trainingLoad, loadHistory, cardio, sportMetrics, runPaces…
            │    règles  : coach, weekFit, injuries, deload, readinessAdjust, schedule…
            │    IA      : aiService (SDK Anthropic), coachContext
            ├─ Données locales : Dexie / IndexedDB (src/db/index.ts, schéma v1→v8)
            └─ Synchronisation : src/lib/syncEngine.ts ⇄ Supabase (Postgres + RLS)
Références éditables : app_settings (JSON) lues par useAppGuidance (cache localStorage)
Licences : plan_features côté serveur (PLAN_REQUIRED) + useFeatureAccess
```

- **Hors ligne d'abord** : toute écriture va dans IndexedDB, marquée `_dirty`, puis envoyée ; tirage incrémental par `updated_at` ; suppression douce ; vidage sûr à la déconnexion.
- **Synchronisation** : 15 tables ; conversion camelCase ↔ snake_case automatique ; dernier écrit gagne ; temps réel sur le schéma + sondage toutes les 5 min.
- **Références modifiables par l'admin** (fini le « codé en dur ») : `nutrition_guidance`, `injury_guidance`, `swim_techniques`, `outing_checklist`, `mobility_moves`, `timed_sessions`, `program_equipment`. Chacune a un analyseur qui refuse une donnée incohérente, et un onglet d'administration.
- **Tests** : 89 fichiers Vitest (521 tests), 65 parcours e2e sur le build de production (hors ligne), tests SQL des règles RLS (`supabase/tests/rls.sql`).
- **IA** : optionnelle, appelée depuis l'appareil avec la clé de l'utilisateur ; les fonctions de base n'en dépendent jamais.

## 2. Points forts
1. Hors ligne réellement fonctionnel, avec des garde-fous (lignes en attente jamais écrasées, déconnexion sûre).
2. Logique métier pure et testée, séparée de l'interface — conforme au principe « l'IA ne calcule pas ».
3. Références éditables sans déploiement, validées avant enregistrement.
4. Plan figé par séance (`plannedDay`) et historique des programmes (`revisions`) : le prévu et le fait sont séparés.
5. Migrations idempotentes, i18n complète fr/en/de, CSP stricte.

## 3. Limites

| # | Limite | Conséquence | Preuve |
|---|---|---|---|
| L1 | **La discipline n'a pas de définition unique** : `Workout.kind`, `Sport`, `FavoriteSport`, `ProgramCategory`, `Discipline`, `ActivityKind`, listes répétées | Ajouter un sport touche ~11 fichiers ; les champs propres à chaque sport sont codés dans les écrans (`CardioLogger`, `SportDetails`) | `db/index.ts`, `cardio.ts:3`, `programSanitize.ts:3`, `programCategories.ts`, `activityProfile.ts`, `navConfig.ts`, `sportNutrition.ts` |
| L2 | Sport favori stocké sur l'appareil seulement | Expérience différente d'un appareil à l'autre | `appTheme.ts` |
| L3 | **Exercices liés par leur nom anglais** (modèles, règles de blessure, alternatives) ; copies « other » créées silencieusement | Renommer casse les liens ; doublons | `startWorkout.ts`, `programEquipment.ts`, `coach.ts` |
| L4 | Modèles de programmes en 3 sources (code ~2 400 lignes, migrations, table) | Divergences ; modifications d'admin perdues hors ligne | `src/lib/*Templates.ts`, `templateService.ts` |
| L5 | Objectifs limités à la force | Pas de modèle générique d'objectif | `goals.ts` |
| L6 | Pas de provenance sur les séances | Dédoublonnage des imports impossible ; pas de base pour des connecteurs | `db/index.ts` (Workout) |
| L7 | Sync : une requête par ligne, pas de pagination ; `user_id` forcé | Lenteur à grande échelle ; programme d'un coach modifié par le client bloqué | `syncEngine.ts:296,312,382-468` |
| L8 | Pas d'index `userId` dans Dexie | Parcours complets des tables (19 endroits) | `db/index.ts:460-561` |
| L9 | Gros composants (SessionLogger 1 721 l., accueil 903, réglages 895) | Maintenance difficile | — |
| L10 | Duplications : `MUSCLES` ×5, 1RM ×2, plage de reps ×3, volume calculé en ligne | Incohérences (échauffements comptés dans `gamification.ts`) | voir audit |
| L11 | Export RGPD non filtré par utilisateur | Fuite possible des données des clients d'un coach | `exportService.ts:7-19` |

## 4. Architecture cible (évolutive)

Chaîne fonctionnelle : **Utilisateur → Objectifs → Programmes → Séances (prévues / réalisées) → Activités → Mesures → Analyses**, chaque maillon existant déjà en partie.

### 4.1 Registre de disciplines (cœur de l'extensibilité)
Un module unique `src/lib/disciplines.ts` décrit chaque discipline :

```ts
interface DisciplineDef {
  id: "strength" | "run" | "swim" | "bike" | "hike" | "row" | "hiit" | "mobility" | "yoga" | "vaulting" | …;
  kind: "strength" | "cardio" | "interval" | "mobility";      // forme de la séance (existant)
  metrics: MetricDef[];        // distance, durée, allure, cadence, puissance, nage, bassin…
  essential: MetricId[];       // saisie rapide (2-3 champs)
  advanced: MetricId[];        // derrière « Plus de détails »
  units: { distance: "km" | "m"; pace: "/km" | "/100m" | "km/h" };
  validate(w): string[];       // bornes, cohérence
  visualisations: ChartId[];   // ce que la page Progrès montre pour elle
  programCategory: ProgramCategory; favorite?: FavoriteSport; nutritionFamily: …;
}
```

- Les énumérations actuelles deviennent **dérivées** du registre (aucun renommage de données stockées).
- `CardioLogger` / `SportDetails` affichent `essential` puis `advanced` repliés : c'est le principe « création rapide + options avancées à part » appliqué par discipline.
- Garder des champs typés sur `workouts` (pas de table clé-valeur générique) : validations et requêtes restent simples. Une nouvelle discipline = une entrée du registre + éventuellement quelques colonnes additives.
- Sport favori déplacé sur `athlete_profiles` (synchronisé).

### 4.2 Objectifs génériques
Table `goals` : `type` (force, temps sur distance, distance, régularité, mobilité, poids…), `metric`, `unit`, `startValue`, `targetValue`, `deadline`, `priority`, `discipline`, `exerciseUuid?`, `programIds?`. Les objectifs de force actuels (`profile.strengthGoals`) migrent sans perte. La progression est calculée par les fonctions existantes (1RM, `cardioBests`, `mobilityStats`).

### 4.3 Bibliothèque enrichie
Colonnes additives sur `exercises` : `discipline`, `category`, `level`, `secondary_muscles`, `steps` (JSON fr/en/de), `mistakes`, `variant_of`. Liens par **uuid** partout (modèles, règles, alternatives), avec repli sur le nom pour l'existant. Plus de copie silencieuse : proposer « créer » ou « lier » à l'exercice de la bibliothèque.

### 4.4 Restrictions utilisateur
Table `restrictions` (ou champ du profil) : `{ scope: "joint" | "muscle" | "movement" | "exercise", value, side?, until?, level: "avoid" | "caution" }`. Elle s'ajoute aux règles de l'admin dans `injuryWarning`. Au démarrage d'une séance, un exercice à éviter est **proposé** en remplacement ; il n'est jamais retiré en silence.

### 4.5 Provenance et intégrations
Colonnes `workouts.source` (`manual` | `file` | `strava` | `garmin` | `health`), `external_id`, `started_at`, `file_hash` ; dédoublonnage bloquant à l'import. Les connecteurs OAuth passent par des **fonctions serveur Supabase** (secrets hors de l'appareil). HealthKit et Health Connect exigent une enveloppe native (Capacitor), qui est une décision à prendre (voir le résumé).

### 4.6 Données de forme dans les calculs
`readinessScore` intègre la FC de repos et la VFC lorsqu'elles existent, par rapport à la moyenne de la personne : un écart de la VFC à sa ligne de base sur 7 jours, en **signal d'appoint et jamais en verdict**.

### 4.7 Interfaces entre modules
| Module | Entrée | Sortie | Règle |
|---|---|---|---|
| Registre de disciplines | — | définitions | aucune dépendance |
| Calculs (`lib`) | données brutes | mesures | purs, testés, pas d'IA |
| Règles / recommandations | mesures + références | propositions `{constat, changement}` | déterministes, reproductibles |
| IA (option) | résumé textuel | conseil en langage naturel | ne calcule rien, ne modifie rien |
| Interface | propositions | actions de l'utilisateur | rien sans accord explicite |

## 5. Migrations nécessaires (toutes additives et idempotentes)
1. `workouts` : `source`, `external_id`, `started_at`, `file_hash` (+ index unique partiel sur `(user_id, external_id)`).
2. `goals` (nouvelle table + RLS propriétaire/coach) ; reprise de `strength_goals`.
3. `exercises` : colonnes d'enrichissement ; remplissage progressif via l'admin.
4. `athlete_profiles` : `favorite_sport`, `restrictions` (JSON) ou table dédiée.
5. Dexie v9 : index `userId`, `[userId+date]`, `kind` (sans perte : Dexie migre en place).
6. (Si validé) `program_templates` comme source unique ; les fichiers `*Templates.ts` ne servent plus qu'à générer le SQL de départ.

## 6. Risques techniques
| Risque | Atténuation |
|---|---|
| Sync : changer le push touche toutes les tables | Corriger d'abord le cas des lignes non possédées ; tests e2e coach ↔ client |
| Liens d'exercices par nom | Passage progressif à l'uuid avec repli sur le nom ; tests de cohérence migration ↔ code (comme aujourd'hui) |
| Registre de disciplines : changement transversal | Introduire le registre en dérivant les énumérations existantes ; un sport migré à la fois |
| Données existantes | Colonnes additives, valeurs par défaut, aucune suppression |
| Intégrations natives | Prototype Capacitor isolé avant tout engagement |
| Clé IA en localStorage | Option d'un proxy serveur (fonction Supabase) si l'IA devient une offre payante |
