# TrainTrack — Feuille de route

> Chaque sprint dure environ 1 à 2 semaines. La complexité est notée S (petit), M (moyen) ou L (grand). « Indispensable » signifie un défaut, un risque ou une fondation sans laquelle la suite ne tient pas. « Facultatif » signifie un plus. Un sprint n'est terminé que si le lint, les types, les tests unitaires et les parcours e2e sont au vert et que la vérification en production est faite. Les migrations sont appliquées à la main avant le déploiement.

Principe transversal : **richesse fonctionnelle ≠ complexité d'interface**. Chaque nouvel écran propose l'essentiel d'abord et les options avancées à part.

---

## Sprint 0 — Fiabilité et conformité · *indispensable* · S
| | |
|---|---|
| Objectifs | Corriger les défauts qui touchent aux données et à la vie privée avant d'ajouter quoi que ce soit |
| Fonctionnalités | (1) Export RGPD filtré par utilisateur, avec les tables manquantes. (2) Programme d'un coach : interdire au client de le modifier, ou gérer la ligne non possédée sans forcer `user_id`, et débloquer les lignes coincées. (3) Consentement explicite avant le premier envoi à l'IA, avec la liste de ce qui part et un retrait possible. (4) Une seule source pour le volume, le 1RM et les plages de répétitions (`performance.ts`), une seule constante `MUSCLES`, une seule liste de sports. (5) Nom du manifeste PWA. |
| Dépendances | Aucune |
| Risques | Sync : un changement touche toutes les tables, d'où les tests coach ↔ client |
| Critères d'acceptation | L'export d'un coach ne contient que ses données ; un client ne peut plus créer de ligne bloquée ; aucun envoi à l'IA sans consentement enregistré ; les échauffements ne comptent plus nulle part dans le volume |
| Tests | Unitaires (export, helpers) ; e2e coach/client ; RLS SQL |
| Livrables | Code et migration éventuelle |

## Sprint 1 — Simplicité de l'interface · *indispensable* · M
| | |
|---|---|
| Objectifs | Appliquer « essentiel d'abord » aux écrans les plus chargés |
| Fonctionnalités | (1) **Création rapide de programme** : nom, sport, jours par semaine, modèle ou vide, puis l'éditeur ; plus de programme « Sans titre » orphelin. (2) **Éditeur compact** : un exercice = une ligne (« 4 × 8-10 · 90 s ») qui s'ouvre pour modifier ; repos, %1RM et superset sous « Avancé ». (3) Menu : supprimer les doublons (`/settings` ×4, `/coach` ×3, `/more` ×2), ancres dans Réglages, Réglages regroupés en sections repliables. (4) Déclarer une blessure depuis la carte blessure, Forme et Santé. (5) Zone sûre iOS (`viewportFit: "cover"`), cibles tactiles de 44 px. (6) Assignation à un client masquée sans licence coaching. |
| Dépendances | Aucune |
| Risques | Parcours e2e existants à adapter |
| Critères d'acceptation | Créer un programme en 3 champs ; l'éditeur d'un programme de 4 jours tient sur 2 écrans ; aucune entrée de menu ne mène à la même page qu'une autre |
| Tests | e2e « créer un programme en 3 champs », « déclarer une blessure depuis l'accueil » |
| Livrables | Code |

## Sprint 2 — Registre de disciplines · *indispensable* (fondation) · M
| | |
|---|---|
| Objectifs | Une seule définition par discipline : métriques, unités, champs essentiels et avancés, validations, visualisations |
| Fonctionnalités | `src/lib/disciplines.ts` ; énumérations existantes dérivées ; saisie « essentiel / Plus de détails » par discipline (modèle de `CardioLogger`) ; sport favori synchronisé sur le profil ; heure de séance et objectif de séance (champs avancés) |
| Dépendances | Sprint 0 (listes de sports unifiées) |
| Risques | Changement transversal : migrer un sport à la fois |
| Critères d'acceptation | Ajouter une discipline fictive = une entrée du registre plus ses textes, sans toucher les pages |
| Tests | Test unitaire du registre (cohérence avec les catégories, la nutrition et la navigation) ; e2e d'une saisie par discipline |
| Livrables | Code, migration (`favorite_sport`) |

## Sprint 3 — Objectifs multisport et tableau de bord · *indispensable* · M
| | |
|---|---|
| Objectifs | Gérer plusieurs objectifs mesurables et les rendre visibles |
| Fonctionnalités | Table `goals` (temps sur distance, distance, régularité, mobilité, poids, force) avec priorité et échéance ; reprise des objectifs de force ; création rapide « type, cible, date » ; progression calculée par les fonctions existantes. **Accueil** : carte objectif prioritaire, dernière séance, prochaine compétition, répartition de la semaine, chacune repliée sauf l'essentiel. Objectifs ajoutés au contexte de l'assistant. |
| Dépendances | Sprint 2 |
| Risques | Surcharge de l'accueil, à éviter avec une seule carte ouverte |
| Critères d'acceptation | « Courir 10 km en moins de 50 min » se crée en 3 champs et se met à jour avec les sorties ; l'accueil montre l'objectif prioritaire |
| Tests | Unitaires de progression par type ; e2e création et suivi |
| Livrables | Code, migration `goals` |

## Sprint 4 — Bibliothèque et limitations · *indispensable* · M
| | |
|---|---|
| Objectifs | Une bibliothèque complète, sans doublons, et des restrictions personnelles |
| Fonctionnalités | Enrichissement des exercices (discipline, catégorie, niveau, muscles secondaires, consignes, erreurs, variantes) dans l'onglet admin ; liens par uuid ; fin des copies silencieuses (« lier ou créer ») ; **restrictions de l'utilisateur** (articulation, muscle, mouvement, exercice, côté, jusqu'à quand) ; au démarrage d'une séance, remplacement proposé d'un exercice à éviter |
| Dépendances | Sprint 2 |
| Risques | Qualité des données : remplissage progressif, couverture affichée dans l'admin |
| Critères d'acceptation | Déclarer « pas de développé au-dessus de la tête » écarte ou signale les exercices concernés partout |
| Tests | Unitaires des restrictions ; e2e démarrage d'une séance avec une restriction |
| Livrables | Code, migrations, contenu |

## Sprint 5 — Récupération et charge · *facultatif (V2)* · M
| | |
|---|---|
| Fonctionnalités | FC de repos et VFC intégrées à la forme (par rapport à la ligne de base de la personne) ; courbes de forme par dimension ; conflits entre séances (même groupe sollicité moins de 48 h avant une séance intense) ; TRIMP quand la FC est disponible ; puissance normalisée lue des FIT ; courbes d'allure et de puissance |
| Critères d'acceptation | Les limites sont explicites à l'écran ; aucune formulation de prédiction médicale |
| Tests | Unitaires des calculs, avec unités |

## Sprint 6 — Performance et provenance · *indispensable avant les intégrations* · M
| | |
|---|---|
| Fonctionnalités | Dexie v9 avec index `userId` et `[userId+date]` ; sync par lots, paginée, comparaison des dates fiable, temps réel filtré ; provenance des séances (`source`, `external_id`, `file_hash`) et dédoublonnage bloquant à l'import |
| Risques | Sync : à déployer derrière un test de charge sur un compte volumineux |
| Critères d'acceptation | Réimporter un même fichier ne crée pas de doublon ; première sync de 5 000 séries en un cycle |

## V3 — À décider (voir le résumé exécutif)
| Évolution | Complexité | Condition |
|---|---|---|
| Strava (OAuth via fonction serveur) | M | Conditions d'usage de l'API vérifiées ; Sprint 6 fait |
| Garmin / Polar API | L | Accès partenaire accordé |
| Apple Santé / Health Connect | L | Décision d'une enveloppe native (Capacitor) |
| Modèles de programmes en base comme source unique | L | Décision de passer les modèles en base |
| Sports collectifs | L | Décision de les inclure dans le périmètre |
| Interactions entre objectifs, planification intelligente | L | Sprint 3 fait |
| Proxy serveur pour l'IA | M | Si l'IA devient une offre payante |
