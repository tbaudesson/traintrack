# TrainTrack — Recommandations UX / UI

> Principe directeur : **ne pas confondre richesse fonctionnelle et complexité de l'interface.** Des centaines d'exercices, des dizaines de programmes et beaucoup de paramètres peuvent rester simples grâce à la recherche, à des catégories pertinentes, aux favoris et à une présentation progressive. Chaque écran de création propose **l'essentiel d'abord**, avec un accès distinct aux **options avancées**, et c'est encore plus vrai en multisport, où les champs changent selon la discipline.

Le modèle à suivre existe déjà dans l'app : la saisie d'une sortie d'endurance (`CardioLogger.tsx`). Distance et durée sont visibles, et le guide des zones comme la liste avant départ sont repliés.

Effort : S (moins d'un jour), M (quelques jours), L (plus d'une semaine). `[R]` signifie à confirmer sur un appareil.

## 1. Navigation
| Constat | Proposition | Effort |
|---|---|---|
| 4 entrées mènent en haut de Réglages (`navConfig.ts` : import, notifications, mise en page, réglages), et la page n'a pas d'ancres | Ancres `#notifications`, `#apparence`, `#import`, `#blessures`, et une entrée « Réglages » unique avec des sections repliables | S |
| 3 entrées mènent à `/coach` (athlètes, attributions, planning) | Une entrée, avec des onglets dans la page | S |
| « Sports » et « Connexions » mènent à `/more`, une liste générique | « Sports » ouvre les pages du sport favori ; « Connexions » ouvre les imports de fichiers et la ceinture cardio | S |
| Toute destination demande 3 touchers (lanceur, section, entrée) | Garder ce schéma (cohérence), mais ajouter sur l'accueil des raccourcis contextuels par sport (voir 2) | — |
| Certaines fonctions dépendent d'un choix purement visuel : les tuiles d'accès rapide et le rail sur ordinateur n'existent qu'en style Dynamique (`appTheme.ts`) | Le style ne change que l'apparence ; les tuiles et le rail sont proposés dans tous les styles | M |
| `/more` affiche Équipes, Défis et Messages sans vérifier la licence, contrairement au menu | Même contrôle de licence partout | S |

## 2. Tableau de bord (accueil)
Il est déjà bien structuré : une action principale, une seule alerte ouverte et le reste replié sous « À voir aussi ». C'est à garder.

| Manque | Proposition | Effort |
|---|---|---|
| Dernière séance | Ligne compacte sous la séance du jour : « Hier · Push · effort 7/10 » | S |
| Objectifs | Carte de l'objectif prioritaire (barre de progression avec ses chiffres), après le sprint objectifs | M |
| Prochaine compétition | Elle n'apparaît que dans l'export .ics : l'ajouter à la bande de la semaine ou dans une ligne « Dans 12 jours : … » | S |
| Démarrage d'une sortie pour les coureurs, nageurs et cyclistes | Bouton secondaire « Démarrer une sortie » sur la carte principale, qui économise 3 touchers | S |
| Répartition et charge | Une seule tuile « Semaine : 3 séances · charge stable », qui mène à Progrès ; ne pas afficher de chiffre sans explication | S |

## 3. Journal d'entraînement
| Constat | Proposition | Effort |
|---|---|---|
| Les champs propres à chaque sport s'affichent tous dès qu'ils existent (`SportDetails.tsx`) | Essentiel visible (natation : distance et durée ; vélo : distance, durée, puissance), le reste sous « Plus de détails », piloté par le registre de disciplines | M |
| Le bouton ✓ d'une série a un libellé générique (« Marquer fait ») | Ajouter le numéro de série pour les lecteurs d'écran | S |
| L'historique ne propose sa recherche qu'au-delà de 8 séances, et l'entrée « Historique » ouvre la page Entraînement | Recherche toujours visible ; entrée renommée ou qui mène directement à la section historique | S |

## 4. Planification et programmes
| Constat | Proposition | Effort |
|---|---|---|
| « Créer » produit un programme « Sans titre » et ouvre l'éditeur complet (`programs/page.tsx`) | **Création rapide** dans une fenêtre : nom, sport, jours par semaine, modèle ou vide. Création à la confirmation seulement | M |
| L'éditeur affiche 4 champs et une case par exercice, soit environ 120 champs pour 6 exercices × 4 jours (`ProgramDaysEditor.tsx`) | Une ligne par exercice (« 4 × 8-10 · 90 s ») qui s'ouvre au toucher. Repos, %1RM et superset sous « Avancé ». Jour cardio : sport, distance ou durée visibles, intensité, étapes et objectif sous « Plus » | M |
| La carte « Assigner à un client » s'affiche toujours dans l'éditeur | La masquer sans licence coaching | S |
| Le nom d'un jour n'a pas de libellé, et le bouton de suppression d'un jour n'a pas de nom accessible et fait 32 px | Libellés et 44 px | S |
| Une blessure ne se déclare que dans Réglages | Bouton « Déclarer une douleur ou une blessure » dans la carte blessure, sur la page Forme et sur la page Santé | S |

## 5. Visualisations
| Constat | Proposition | Effort |
|---|---|---|
| Couleurs codées en dur sur Progrès (`#4F46E5`…), jetons d'accent ailleurs, palette validée pour les daltoniens seulement sur la charge | Un thème de graphique commun (jetons validés en clair et en sombre, infobulles à thème, nommage commun des métriques) | M |
| Le même graphique par exercice existe deux fois, avec des noms de métriques différents | Un seul composant | S |
| Infobulles par défaut, probablement illisibles en mode sombre `[R]` | Infobulle commune (comme `LoadHistoryCard`) | S |
| Pas de comparaison visuelle entre périodes | Superposition « 4 dernières semaines / 4 précédentes » sur les courbes clés | M |

## 6. Mobile
| Constat | Proposition | Effort |
|---|---|---|
| `viewport` sans `viewportFit: "cover"` (`src/app/layout.tsx:19`), donc les marges `safe-area` valent probablement 0 sur iPhone `[R]` | Ajouter `viewportFit`, une marge haute sur l'en-tête, et une marge basse calculée sur le lanceur | S |
| Boutons `sm` et `icon-sm` de 40 px (plus de 100 usages), puces de 26 à 36 px | 44 px minimum sur écran tactile | S |
| Chaque page compense le lanceur avec `pb-24` ou `pb-28` (37 pages) | Marge basse portée par la mise en page | S |
| Le chrono plein écran de la séance (récent) | À garder comme référence pour les écrans « pendant l'effort » | — |

## 7. Cohérence des thèmes et qualité premium
- 6 couleurs d'accent, 4 styles, modes clair, sombre et système : la base est riche, le travail porte sur la **cohérence**. Une même carte doit avoir le même espacement, le même titre et les mêmes états vides partout.
- Les états vides doivent tous expliquer **quoi faire ensuite**, comme le fait l'assistant (« il faut 3 séances d'un même jour… »).
- Le manifeste porte encore le nom « Bodybuilding Coaching » : à aligner sur le positionnement multisport.

## 8. Les 10 actions dans l'ordre (impact / effort)
1. Supprimer les doublons du menu et ajouter des ancres dans Réglages (S)
2. Créer un programme rapidement (M)
3. Rendre l'éditeur de programme compact, avec les options avancées repliées (M)
4. Rendre la déclaration de blessure accessible (S)
5. Corriger la zone sûre iOS et passer les cibles tactiles à 44 px (S)
6. Ajouter les raccourcis par sport sur l'accueil et la prochaine compétition (S)
7. Mettre en place un thème de graphique commun (M)
8. Séparer l'essentiel et l'avancé par discipline dans la saisie (M, avec le registre)
9. Regrouper Réglages en sections (S)
10. Formulaire d'exercice : l'essentiel d'abord, avec libellés réels et puces de 44 px traduites (S)
