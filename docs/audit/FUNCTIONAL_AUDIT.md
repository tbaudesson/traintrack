# TrainTrack — Audit fonctionnel

> État au 22/11/2026, code de `main` (commit 9ea2c92, déployé). Lecture du code uniquement.
> **V** = vérifié dans le code. **E** = à confirmer à l'exécution (données en base, comportement réel).
> États : ✅ Implémentée · 🟡 Partielle · ❌ Absente · 🔧 À refactoriser.
> Priorité : **MVP** (fondations) · **V2** (analyse avancée) · **V3** (intelligence).

Principe de lecture : beaucoup de fonctions existent déjà ; l'écart principal n'est souvent pas l'absence d'une fonction mais **la façon de la présenter** (trop de champs à la fois, mauvaise découvrabilité) ou **sa généralisation au multisport**.

---

## 3. Journal d'entraînement multisport

### Fonctionnalités communes

| Fonctionnalité | État | Éléments vérifiés | Écart identifié | Priorité |
|---|---|---|---|---|
| Date de la séance | ✅ | `Workout.date` (`src/db/index.ts`), modifiable (`SessionLogger.tsx`, menu ✏️) — V | — | — |
| Heure de la séance | 🟡 | Seulement `createdAt` (horodatage de création) ; `startTime` lu des fichiers FIT/TCX mais seule la date est gardée (`GpxImport.tsx`) — V | Pas d'heure saisie ni affichée | MVP |
| Discipline | 🟡 | `Workout.kind` (strength/cardio/interval/mobility) + `sport` (run/swim/bike/row/hike/vaulting/other) — V | Ensemble fermé ; pas de sports collectifs ni de discipline personnalisée (seulement `other`) | MVP |
| Durée | ✅ | `durationMin` (muscu, calculée), `durationSec` (cardio, HIIT, mobilité) — V | Deux champs selon le type | — |
| Intensité / RPE séance | ✅ | `sessionRpe` 1–10 + `feeling` 1–5 (migration 069), `SessionFeedback.tsx`, dans le bilan — V | — | — |
| RPE par série | ✅ | `WorkoutSet.rpe`, menu de la série — V | — | — |
| Objectif de la séance | 🟡 | Seulement dans le plan (`CardioTarget.purpose`) — V | Pas de champ sur la séance réalisée | MVP |
| Notes personnelles | ✅ | `WorkoutNotes` (par séance/exercice/série, vocales), `WorkoutNotes.tsx` — V | — | — |
| Sensations et fatigue | 🟡 | `feeling` en fin de séance ; check-in de forme quotidien (`ReadinessCheckin`) — V | Fatigue par séance absente ; check-in non relié à une séance | V2 |
| Statut prévu / commencé / terminé / annulé | 🟡 | Prévu & manqué dérivés du planning (`schedule.ts`) ; fait = `doneSessions.ts` ; annulé = `cancelledAt` (069) — V | Pas de statut explicite stocké ; « commencé » implicite | MVP |
| Historique | ✅ | `HistoryView.tsx` : liste par mois + recherche, calendrier fait/prévu/manqué, vue année — V | — | — |
| Dupliquer une séance | 🟡 | `repeatWorkout` (muscu), « Réutiliser cette séance » → programme ou jour (`ReuseSessionDialog.tsx`) — V | Cardio et HIIT non dupliquables tels quels | MVP |
| Modification a posteriori | 🟡 | Muscu et cardio éditables ; HIIT : suppression seulement (`IntervalWorkoutView.tsx`) — V | HIIT/mobilité non éditables | MVP |

### Musculation
| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Exercices, séries, répétitions, charges | ✅ | `WorkoutSet` ; pré-remplissage, « comme la dernière fois » — V | — | — |
| Temps de repos | ✅ | `restSec` + chrono plein écran (`BigTimer.tsx`) — V | — | — |
| Tempo d'exécution | ❌ | Aucun champ — V | À ajouter en option avancée | V2 |
| Échauffement / travail | ✅ | `isWarmup`, exclu du volume et des records — V | — | — |
| Volume | ✅ | `performance.totalVolume` — V | 🔧 calcul dupliqué ailleurs (`gamification.ts` compte les échauffements) | MVP |
| Estimation du 1RM | ✅ | `performance.estimateOneRepMax` (Epley, 1 rép = charge) — V | 🔧 formule dupliquée dans `gamification.ts` | MVP |
| Records personnels | ✅ | `recordHistory`, popup nouveau record — V | — | — |
| Groupes musculaires | 🟡 | Un seul `muscleGroup` (8 valeurs grossières) — V | Pas de muscles secondaires | V2 |

### Natation
| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Distance totale | ✅ | `distanceM` en mètres — V | — | — |
| Type de nage | ✅ | `swimStroke` (071), lu des FIT — V | — | — |
| Longueur du bassin | ✅ | `poolLengthM` (0 = eau libre) — V | — | — |
| Séries et intervalles | 🟡 | Plan en texte libre (`CardioTarget.steps`) — V | Non structurés, non enregistrés | V2 |
| Temps de repos | 🟡 | Dans le texte du plan seulement | Idem | V2 |
| Allure moyenne / au 100 m | ✅ | `formatPace` (`cardio.ts`) — V | — | — |
| Mouvements, SWOLF | ✅ | `strokesPerLength`, `swolf()` (`sportMetrics.ts`) — V | Par séance, pas par longueur | — |

### Course à pied
| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Distance, durée, allure moyenne | ✅ | — V | — | — |
| Allure instantanée | ❌ | Pas de GPS en direct ; les points des fichiers sont jetés (`gpx.ts`) — V | Courbe d'allure absente | V2 |
| Dénivelé | ✅ | `elevationGainM` (062), fichiers — V | — | — |
| Cadence | ✅ | `avgCadence` (071), doublée depuis les montres — V | — | — |
| Fréquence cardiaque | 🟡 | Moyenne/max (ceinture BLE, fichiers) — V | Pas d'échantillons, pas de temps par zone | V2 |
| Zones d'intensité | 🟡 | Zones d'allure depuis la VMA (`runPaces.ts`) — V | Zones FC non mesurées | V2 |
| Séances fractionnées | ✅ | `runWorkouts.ts`, `RunGuide` guidé — V | Distance estimée, pas mesurée | — |

### Cyclisme
| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Distance, durée, vitesse, dénivelé | ✅ | — V | — | — |
| Cadence | ✅ | `avgCadence` — V | — | — |
| Puissance, FTP, zones | ✅ | `avgPowerW`, `maxPowerW`, `ftpW` sur le profil, 7 zones Coggan, IF et TSS estimé (`sportMetrics.ts`) — V | TSS estimé depuis la puissance **moyenne** (la puissance normalisée des FIT n'est pas lue) | V2 |
| Intervalles | 🟡 | Spinning guidé (`SpinBlock`) — V | Seul le temps est enregistré | V2 |

### HIIT et cardio
| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Circuits, exercices, effort/repos | ✅ | « HIIT · séance minutée » (`intervals.ts`, référence `timed_sessions`) — V | — | — |
| Nombre de tours | ✅ | `roundsDone` (072) — V | — | — |
| Fréquence cardiaque | 🟡 | Ceinture BLE avant le départ (`useHeartRateMonitor.ts`) — V | Indisponible sur iPhone (pas de Web Bluetooth dans Safari) — E | — |

### Mobilité et yoga
| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Exercices et positions | ✅ | 30 mouvements + 17 postures de yoga (référence `mobility_moves`, 065/072) — V | — | — |
| Durées | ✅ | Tenue, par côté, transition, par mode — V | — | — |
| Zones corporelles | 🟡 | `muscles` par mouvement, cibles complet/haut/bas — V | — | — |
| Évaluation subjective | ✅ | Souplesse ressentie 1–5 (`MobilityRating.tsx`) — V | — | — |
| Progression | ✅ | « Votre suivi » (`mobilityLog.ts`) — V | Pas d'objectif de mobilité | V2 |

### Extensibilité des disciplines
| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Ajouter une discipline sans toucher le noyau | 🔧 | Discipline répartie en 4 à 6 énumérations (`Sport`, `FavoriteSport`, `ProgramCategory`, `Discipline`, `ActivityKind`) et ~11 fichiers (`cardio.ts`, `programSanitize.ts`, `programCategories.ts`, `activityProfile.ts`, `navConfig.ts`, `sportNutrition.ts`…) — V | Registre de disciplines unique à créer | MVP |
| Sports collectifs | ❌ | « Équipes » = groupes de coaching, pas de sport collectif — V | — | V3 |

---

## 4. Planification et programmes

| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Calendrier jour | 🟡 | Séance du jour sur l'accueil — V | Pas de vue jour navigable | V2 |
| Calendrier semaine | ✅ | `WeekStrip.tsx` (fait/prévu/manqué, semaines suivantes) — V | — | — |
| Calendrier mois / année | ✅ | `PlanCalendar.tsx` (3 mois à l'avance), `YearView` — V | — | — |
| Création de programmes | 🟡 | Éditeur complet (`ProgramDaysEditor.tsx`), IA optionnelle, import Excel — V | **Création = « Sans titre » + éditeur complet** ; pas de création rapide ; ~120 champs visibles sur un programme moyen | MVP |
| Bibliothèque de programmes | ✅ | Rayons par sport, filtres, recherche (`ProgramCatalog.tsx`, `SessionPickerDialog.tsx`) — V | 🔧 3 sources de vérité (code, migrations, table) | V2 |
| Séances récurrentes | ✅ | `Program.weekdays` — V | — | — |
| Déplacement, report | ✅ | `MoveSessionDialog`, `withMove` ; assistant « Cette semaine » (`weekFit.ts`) — V | Fenêtre de 7 jours | — |
| Séances manquées | ✅ | Calendrier et année (`scheduleSessions`) — V | Plans terminés non comptés dans les mois passés | V2 |
| Programmes multisports | 🟡 | Jours muscu et cardio mélangeables ; plusieurs programmes planifiés ensemble — V | Pas de triathlon complet ; pas de contrôle des conflits | V2 |
| Objectifs court/moyen/long terme | 🟡 | Voir §9 | — | MVP |
| Cycles de progression | 🟡 | Semaines de plan, % du 1RM, phases internes à la voltige — V | Phases jamais affichées ; pas de macrocycle | V2 |
| Semaines de récupération | ✅ | `deloadAdvice`, semaine allégée, allègement du jour — V | — | — |
| Historique des modifications | ✅ | `Program.revisions` (068), « Revenir avant » (`ProgramHistory.tsx`) — V | Les changements de jours planifiés n'y figurent pas | — |
| Planifié ≠ réalisé | ✅ | `Workout.plannedDay` figé au démarrage + carte « Prévu / fait » (`PlanVsDone.tsx`) — V | Séances antérieures à 068 sans copie | — |

---

## 5. Analyse des performances

| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Nombre de séances, régularité | ✅ | Rapports semaine/mois, séries de semaines (`weekStreak.ts`) — V | — | — |
| Durée totale | 🟡 | Rapports, vue année — V | — | — |
| Fréquence | ✅ | `insights.ts` (régularité) — V | — | — |
| Répartition par discipline | ✅ | `LoadHistoryCard.tsx` (charge), rapports par sport — V | — | — |
| Évolution semaine/mois/année | ✅ | Rapports + vue année — V | — | — |
| Progression vers les objectifs | 🟡 | Force seulement (`goals.ts`) — V | Voir §9 | MVP |
| Charges et volumes (muscu) | ✅ | Courbes `progress/page.tsx`, page exercice — V | 🔧 graphique par exercice en double | V2 |
| Allures course/natation dans le temps | 🟡 | `speedTrend` (un %) — V | Pas de courbe | V2 |
| Puissance vélo dans le temps | ❌ | — | — | V2 |
| Records | ✅ | Muscu et cardio — V | — | — |
| Comparer parcours/distances comparables | ❌ | Points GPS non conservés — V | — | V2 |
| Graphiques, comparaison de périodes, tendances | 🟡 | Recharts (5 graphiques), insights 4 sem./4 sem. — V | Pas de comparaison visuelle ; styles de graphiques incohérents | V2 |
| Calculs documentés, testés, unités | ✅ | JSDoc + 89 fichiers de tests unitaires — V | kg et km seulement (pas de lb/mi) | V3 |

---

## 6. Charge d'entraînement

| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Charge interne durée × RPE | ✅ | `sessionLoad` : RPE séance → RPE séries → valeur habituelle (`trainingLoad.ts`) — V | Estimée sans RPE (signalé à l'écran) | — |
| Charge spécifique par discipline | 🟡 | TSS estimé (vélo), volume (muscu), séparés de la charge sRPE — V | Pas de TRIMP (FC) | V2 |
| Évolution dans le temps | ✅ | 12/26 semaines (`loadHistory.ts`) — V | — | — |
| Répartition entre disciplines | ✅ | `loadSplit` — V | — | — |
| Hausses rapides | ✅ | Ratio 7 j / 28 j, formulé sans prédiction de blessure — V | — | — |
| Récupération entre séances | 🟡 | Check-in de forme → allègement — V | Pas d'heures depuis la dernière séance | V2 |
| Conflits entre entraînements | ❌ | — V | Ex. jambes lourdes la veille d'un fractionné | V2 |
| Pas de métriques incompatibles additionnées | ✅ | kg et km jamais additionnés ; distances séparées par sport — V | — | — |
| Pas de prédiction médicale | ✅ | Textes revus (`load.*`, `trainingLoad.ts`) — V | — | — |

---

## 7. Récupération, fatigue et limitations

| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Fatigue subjective | 🟡 | Énergie/humeur du check-in — V | Pas de champ « fatigue » | V2 |
| Sommeil | ✅ | Check-in + `sleepHours` (santé) — V | — | — |
| Courbatures | 🟡 | Une valeur globale — V | Pas par muscle | V2 |
| FC de repos, VFC | 🟡 | Saisie/CSV (`health/page.tsx`) — V | **Stockées mais utilisées nulle part** | V2 |
| Perception de récupération | 🟡 | Score de forme 0–100 (`useReadiness.ts`) — V | — | — |
| Historique des sensations | 🟡 | Liste (`readiness/page.tsx`) — V | Pas de courbe par dimension | V2 |
| Restrictions temporaires | 🟡 | Blessure par zone (9 articulations), retour progressif — V | Pas de date de fin prévue | V2 |
| Mouvements déconseillés/exclus | 🟡 | Règles « éviter/prudence » par exercice et par zone (admin, 059) — V ; contenu — E | L'utilisateur ne peut pas exclure un exercice, un muscle, un mouvement ni un côté | MVP |
| Exercices alternatifs | 🟡 | `substitutes.ts` (même groupe musculaire), alternatives matériel (066), assistant — V | Correspondance trop grossière (pas de schéma de mouvement) | V2 |
| Adaptation aux limitations | 🟡 | Avertissements, charge réduite (`loadFactor`), séances minutées filtrées — V | Pas de retrait/remplacement automatique au démarrage | MVP |
| Prudence, renvoi vers un professionnel | ✅ | Douleur récurrente → « consultez » (`InjuryCareCard.tsx`) — V | — | — |

---

## 8. Bibliothèque d'exercices

| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Nom et description (fr/en/de) | 🟡 | 141 exercices (migrations 006…055), traductions (064) — V ; couverture réelle — E | ~40 sans description FR ; exercices persos non traduits | MVP |
| Discipline, catégorie | ❌ | — V | — | MVP |
| Groupes musculaires | 🔧 | Un seul groupe, 8 valeurs — V | Primaire/secondaire | V2 |
| Matériel | 🟡 | Une valeur ; besoins réels via `program_equipment` — V | — | — |
| Niveau de difficulté | ❌ | — V | — | V2 |
| Instructions, erreurs fréquentes | 🟡 | Description seulement — V | Consignes structurées, erreurs (existent pour la natation) | V2 |
| Variantes | ❌ | — V | — | V2 |
| Alternatives | 🟡 | Calculées, non stockées — V | — | V2 |
| Vidéos | 🟡 | `videoUrl`, ~42 sans vidéo jouable — E | Pas d'images | V2 |
| Exercices personnalisés | 🟡 | `createCustomExercise` — V | Muscle/matériel non modifiables ensuite | MVP |
| Pas de doublons | 🔧 | Copies « other » créées silencieusement au démarrage (`startWorkout.ts`, `intervals/page.tsx`) ; liens par **nom anglais** (modèles, règles, alternatives) — V | Lier par uuid, fusionner les doublons | MVP |
| Recherche | ✅ | Toutes langues, sans accents (`search.ts`, `ExercisePicker.tsx`) — V | — | — |

---

## 9. Objectifs sportifs

| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Plusieurs objectifs | 🟡 | Plusieurs objectifs de force (`GoalsSection.tsx`) ; objectif de profil unique en pratique (`goals[0]`) — V | — | MVP |
| Indicateur, valeur initiale/cible, échéance | 🟡 | Force : 1RM, départ, cible, date, projection, « en avance/en retard » (`goals.ts`) — V | Endurance (10 km < 50 min), natation (1 500 m), mobilité, poids : absents | MVP |
| Priorité | ❌ | — V | — | MVP |
| Historique de progression | 🟡 | Recalculé depuis les séries — V | — | V2 |
| Activités associées | 🟡 | Lien à un exercice — V | Pas de lien programmes ni coach | V2 |
| Préparer une échéance | 🟡 | `SeasonTarget` cale un plan sur une compétition — V | Date seulement, pas de résultat visé | V2 |
| Interactions entre objectifs | ❌ | — V | — | V3 |

---

## 10. Intégrations externes

| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Fichiers de montre GPX/TCX/FIT | ✅ | `gpx.ts`, `fit.ts` (SDK Garmin officiel) — V | Doublons signalés, non bloqués | — |
| Capteur cardio | ✅ | Web Bluetooth (`bleHeartRate.ts`) — V | Pas sur iPhone — E | — |
| Données santé | 🟡 | Saisie + CSV (export Apple Santé / Google Fit) — V | Pas de synchronisation | V2 |
| Apple Health / HealthKit | ❌ | — V | Impossible depuis une PWA : il faut une enveloppe native (Capacitor) | V3 |
| Google Health Connect | ❌ | — V | Idem (Android natif) | V3 |
| Strava | ❌ | — V | API OAuth ; nécessite une fonction serveur (secret client) ; conditions d'usage à vérifier | V3 |
| Garmin Connect | ❌ | — V | API partenaire sur demande ; l'import FIT couvre l'essentiel | V3 |
| Polar | ❌ | — V | AccessLink (OAuth) | V3 |
| Provenance des données | 🔧 | `HealthMetric.source` seulement — V | Séances sans `source` / `externalId` / empreinte : dédoublonnage impossible | V2 |
| Modèle indépendant des fournisseurs | ✅ | Les imports écrivent les mêmes champs que la saisie — V | — | — |

---

## 11. Coach sportif intelligent

| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Séparation données / calculs / règles / recommandations / IA | ✅ | Données (`db`), calculs (`performance`, `trainingLoad`, `loadHistory`…), règles (`coach.ts`, `weekFit.ts`), IA (`aiService.ts`, `coachContext.ts`) — V | — | — |
| Analyse des séances passées, tendances | ✅ | `insights.ts`, assistant — V | — | — |
| Objectifs compris | 🟡 | Objectif de profil seulement dans le contexte IA — V | Objectifs de force absents du contexte | V2 |
| Disponibilités | ✅ | « Cette semaine, je peux m'entraîner… » (073) — V | — | — |
| Fatigue déclarée | ✅ | Forme, RPE, douleurs — V | VFC non utilisée | V2 |
| Ajustements, alternatives, explication | ✅ | Propositions avec « Constat » et « Proposition », Appliquer/Ignorer — V | — | — |
| Adaptation des programmes | ✅ | Remplacer, retirer, +1 série, alléger, déplacer un jour — V | — | — |
| Contrôle utilisateur | ✅ | Rien sans « Appliquer » ; historique des programmes — V | — | — |
| Reproductible, sans IA obligatoire | ✅ | Règles pures testées ; IA optionnelle (clé personnelle) — V | — | — |
| Consentement explicite pour l'IA | 🟡 | Texte d'information + « Voir ce qui est envoyé » — V | Pas de case de consentement avant d'envoyer blessures/douleurs | MVP |

---

## 12. Tableau de bord

| Fonctionnalité | État | Éléments vérifiés | Écart | Priorité |
|---|---|---|---|---|
| Entraînements du jour | ✅ | Carte principale (`page.tsx`) — V | — | — |
| Dernières séances | 🟡 | ✓ dans la bande de la semaine — V | Pas de carte « dernière séance » | MVP |
| Progression vers les objectifs | 🟡 | Objectif hebdomadaire — V | Objectifs absents de l'accueil | MVP |
| Répartition | ❌ | Seulement sur Progrès — V | — | V2 |
| Charge récente | 🟡 | Seulement en cas d'alerte (ou tuile en style Dynamique) — V | — | V2 |
| Récupération | ✅ | Forme, semaine allégée — V | — | — |
| Prochaines échéances | 🟡 | Séances à venir ; **compétitions seulement dans l'export .ics** — V | — | MVP |
| Pas de surcharge | ✅ | Une seule alerte ouverte, le reste replié (« À voir aussi ») — V | — | — |

---

## Points techniques transverses relevés pendant l'audit

| Sujet | État | Élément | Priorité |
|---|---|---|---|
| Export RGPD (JSON) | 🔧 | Non filtré par utilisateur (`exportService.ts:7-19`) : sur l'appareil d'un coach, inclut les clients ; tables manquantes (santé, hydratation, messages, compétitions, chevaux) — V | **MVP, urgent** |
| Programme d'un coach modifié par le client | 🔧 | Le push force `user_id` à l'utilisateur courant (`syncEngine.ts:296,312`) ; le client voit favori/archiver (`programs/[id]/page.tsx`) → ligne probablement refusée par la RLS et bloquée « à envoyer » — V (cause) / E (effet) | **MVP, urgent** |
| Sync | 🔧 | Une requête par ligne, pas de pagination, comparaison de dates en texte — V / E | V2 |
| Index Dexie | 🔧 | Pas d'index `userId` → parcours complets — V | V2 |
| Manifeste PWA | 🔧 | Nom « TrainTrack — Bodybuilding Coaching » (`public/manifest.json`) — V | MVP |
| Sport favori | 🔧 | Stocké sur l'appareil seulement (`appTheme.ts`) — V | MVP |
