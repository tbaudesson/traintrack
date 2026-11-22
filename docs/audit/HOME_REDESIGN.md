# Accueil — analyse et proposition de refonte

> 22/11/2026. Proposition validée, puis réalisée (branche `feat/home-redesign`). Aucune logique métier ne change : seuls l'agencement et la présentation de l'accueil évoluent.
>
> Décisions prises :
> - **Mouvements doux :** gardés sur l'écran détaillé, avec la mention « à valider avec un professionnel de santé ».
> - **Tuiles d'accès rapide :** retirées.
> - **Écran détaillé des blessures :** une section « Blessures et restrictions » dans la page Santé.

## Le principe

L'accueil et l'espace Performance ont deux rôles distincts.

- **Accueil** : il répond à trois questions. *Que vais-je faire ?* *Où en suis-je ?* *Y a-t-il quelque chose d'important à savoir ?*
- **Performance** : il porte les graphiques, les historiques, l'analyse de la charge, les comparaisons et les statistiques détaillées.

Sur l'accueil, on ne garde que l'essentiel. Chaque détail reste accessible en un toucher.

## 1. Inventaire de l'accueil actuel (`src/app/[locale]/page.tsx`, 931 lignes)

| # | Bloc | Composant / source | Constat |
|---|---|---|---|
| A | En-tête de marque (logo, « Bonjour… », cloche, réglages) | inline | Haut : cartouche de marque et image de fond |
| B | Carte séance (athlète 3D, intitulé, programme, semaine du plan, anneau, choix entre séances du jour, Démarrer, Détails, Version express, Changer de séance) | inline + `ProgressRing` | Très haute : 2 boutons pleine largeur en plus du bouton principal |
| C | Tuiles d'accès rapide (semaine, charge, forme, calories, équipes, défis) | `QuickAccessTiles`, style Dynamique seulement | Recoupent D, E et G |
| D | Premiers pas (30 jours) | `FirstSteps` | Reste affiché 30 jours, même une fois tout fait |
| E | Semaine (7 jours, flèches, série, export .ics, déplacer un jour) | `WeekStrip` | Utile, mais haut |
| F | Objectif de la semaine (séances faites / prévues) | inline | Redondant avec E |
| G | Objectif principal, dernière séance, prochaine compétition | `HomeAtAGlance` | Ligne d'objectif affichée même sans objectif |
| H | Vue d'ensemble (volume ou activités de la semaine) | inline, lien vers Progrès | Redondant avec F et C |
| I | Prise en charge d'une blessure (alerte douleur persistante, mouvements doux avec vidéos, bouton Déclarer) | `InjuryCareCard` | Toujours ouverte et longue, avec des exercices de rééducation proposés |
| J | Notes : la première ouverte, les autres sous « À voir aussi (n) » | 17 sources possibles | La charge y est une carte complète avec ses barres et son explication, et le bilan de la semaine une carte complète |

Les 17 notes possibles sont : charge (prudence ou danger), forme basse, douleur, commentaire du coach, invitation d'équipe, semaine de décharge, programme terminé, bilan de la semaine, tests à refaire, tendance de progression, bilan de forme du jour, séances trop rapprochées, sport détecté, recommandation, régularité, et bilan de forme déjà rempli.

**Redondances :**
- **Semaine :** E, F, H et la tuile « semaine » de C disent la même chose.
- **Progression :** G (objectif), H, C (charge) et J (tendance, bilan) aussi.
- **Charge :** J (carte complète) et C (pourcentage).

## 2. Nouvelle hiérarchie

L'accueil s'organise en quatre zones, dans cet ordre, sous un en-tête compact.

```
┌───────────────────────────────────────────┐
│ ◉ TrainTrack · Bonjour Thomas      🔔  ⚙  │  En-tête compact, environ 56 px
├───────────────────────────────────────────┤
│ 1 · PROCHAINE SÉANCE                      │
│ AUJOURD'HUI                    ╭──╮  🧍   │  Athlète 3D conservé
│ Push A                         │40│       │  Titre réduit (2xl)
│ Force 4 j · 6 ex. · 55 min     ╰──╯       │
│ [ Démarrer → ]  [Détails]  [⋯]            │  ⋯ = changer de séance,
│                                           │      version express
├───────────────────────────────────────────┤
│ 2 · À SAVOIR (seulement s'il y a lieu)    │
│ ⚠ Genou · blessure en cours · 3 ex.       │  Une ligne par alerte,
│   signalés                         Voir › │  deux au plus,
│ + 2 autres                                │  le reste replié
├───────────────────────────────────────────┤
│ 3 · MA SEMAINE                    2 / 4   │
│  L   M   M   J   V   S   D                │  Une rangée de pastilles :
│  ●   ○   ●   ·   ◌   ·   ·                │  fait / prévu / manqué
│                     Planning complet ›    │  Toucher un jour = déplacer
├───────────────────────────────────────────┤
│ 4 · PROGRESSION                           │
│ ★ 10 km < 50:00 ▓▓▓▓▓▓░░  52:30           │  Objectif principal
│ Semaine 3 séances · +12 %   Charge stable │  Deux indicateurs synthétiques
│                          Performance ›    │
├───────────────────────────────────────────┤
│ ▸ À voir aussi (3)                        │  Notes secondaires, repliées
└───────────────────────────────────────────┘
```

Sur ordinateur, les zones 1 et 3 sont à gauche et les zones 2 et 4 à droite.

### Règles d'adaptation au contexte (aucune carte vide)

| Situation | Ce que montre l'accueil |
|---|---|
| Séance prévue aujourd'hui | Zone 1 « Aujourd'hui », avec Démarrer |
| Pas de séance aujourd'hui, une prochaine prévue | Zone 1 « Prochaine séance : jeudi », avec Démarrer quand même ou Séance libre |
| Aucun programme | Zone 1 « Séance libre », avec un lien discret « Choisir un programme » |
| Séance en cours | Zone 1 « Continuer », avec l'anneau de progression |
| Aucune alerte | Zone 2 absente |
| Blessure ou restriction active | Zone 2, une ligne de synthèse avec « Voir » |
| Pas de planning (ni jours ni programme planifié) | Zone 3 réduite à « Choisir mes jours d'entraînement › » |
| Aucun objectif | Zone 4 sans la ligne objectif ; le lien « Fixer un objectif » est dans Performance |
| Moins de 2 séances faites | Zone 4 absente |
| Premiers pas terminés | Masqués automatiquement ; l'aide reste dans Réglages et dans le `?` de l'en-tête |

### Priorité des alertes (zone 2)

1. Blessure ou douleur persistante
2. Forme basse
3. Charge en danger
4. Commentaire du coach, invitation
5. Séances trop rapprochées

Deux lignes au plus sont visibles, le reste se replie dans « + n autres ». Une restriction personnelle n'est pas une alerte : elle est rappelée dans la séance, au moment où elle sert.

### Relief, textures et dégradés

- **Réservés à la zone 1** (athlète 3D, relief, dégradé du thème) et au bouton Démarrer.
- **Zones 2 à 4 :** surfaces plates (`t-panel`), sans image ni ombre portée.
- **En-tête :** plus de cartouche ni d'haltère en fond, seulement le logo et le titre.

## 3. Ce qui quitte l'accueil, et où le retrouver

| Élément retiré ou réduit | Toujours accessible ici |
|---|---|
| Cartouche de marque haute, haltère en fond | Remplacé par l'en-tête compact (logo, salutation, cloche, réglages) |
| « Version express » et « Changer de séance » (pleine largeur) | Menu `⋯` de la carte séance. Mêmes actions, mêmes boîtes de dialogue |
| Tuiles d'accès rapide (style Dynamique), retirées (composant supprimé) | Semaine → zone 3. Charge et forme → zone 4 et Performance. Calories → Nutrition. Équipes et défis → menu circulaire |
| Carte « Objectif de la semaine » | Fusionnée dans le compteur « 2 / 4 » de la zone 3 |
| Ligne « Vue d'ensemble » | Fusionnée dans la zone 4 (indicateur semaine) |
| Flèches semaine précédente / suivante, export .ics, série | **Restent sur l'accueil**, en version compacte (deux flèches, une icône pour l'export, une pastille pour la série). Les flèches sont gardées pour pouvoir remettre une séance déplacée vers une autre semaine |
| Liste « à venir » (les 4 prochaines séances, avec leur programme) | Planning complet (`/log?view=calendar`) : chaque jour ouvre ses séances. Le fichier calendrier (.ics) nomme chaque programme |
| Ligne « Un objectif chiffré ? » sans objectif | Progrès › Mes objectifs › Nouvel objectif |
| Dernière séance, prochaine compétition | « À voir aussi » ; la compétition passe en zone 2 si elle a lieu dans 7 jours ou moins |
| Carte de blessure complète (mouvements doux, vidéos) | Une ligne de synthèse en zone 2 → écran détaillé : page Santé › Blessures et restrictions (déclarer, phase de reprise, exercices signalés). Voir la décision 1 pour les mouvements doux |
| Carte de charge complète (barres et explication) | Un indicateur dans la zone 4 (stable, en hausse, trop rapide). Le graphique et l'explication restent dans Progrès › Charge |
| Bilan de la semaine (carte complète) | Une ligne « Bilan de la semaine prêt › » dans À voir aussi → Rapport |
| Tendances, recommandation, régularité | À voir aussi (une ligne chacune) ; le détail reste dans Progrès › Ce que disent vos 4 semaines |
| Invitation au bilan de forme | À voir aussi ; la forme basse passe en zone 2 |
| Premiers pas | Masqués une fois terminés (comportement déjà en place) ; l'assistant de démarrage reste accessible depuis Réglages › Entraînement |

**Rien n'est supprimé** : chaque composant existant reste utilisé, sur l'accueil sous une forme réduite, ou sur son écran dédié.

## 4. Composants concernés

| Composant | Changement |
|---|---|
| `page.tsx` (accueil) | Réagencé en 4 zones ; calculs inchangés |
| `WeekStrip` | Variante compacte (une rangée, compteur, lien « Planning complet ») ; la version complète va sur `/log` |
| `InjuryCareCard` | Variante « synthèse » (une ligne) ; la version complète va sur la page Santé |
| `TrainingLoadCard` | Inchangé, utilisé seulement dans Performance ; l'accueil affiche un indicateur |
| `HomeAtAGlance` | Remplacé par la zone 4 (`HomeProgress`) |
| `QuickAccessTiles` | Retiré de l'accueil (voir la décision 2) |
| `FirstSteps` | Masqué automatiquement une fois toutes les étapes faites |
| Nouveaux | `HomeAlerts` (zone 2), `HomeProgress` (zone 4), `SessionMenu` (menu `⋯`) |

## 5. Décisions à valider

1. **Mouvements doux en cas de blessure.** Ils viennent des références éditées par l'admin (`injury_guidance.gentle`), donc ce ne sont pas des recommandations générées automatiquement. Deux options : les garder sur l'écran détaillé, avec un rappel « à valider avec un professionnel de santé » ; ou les retirer jusqu'à leur validation par un professionnel.
2. **Tuiles d'accès rapide du style Dynamique.** Deux options : les retirer de l'accueil, puisque leur contenu passe dans les zones 3 et 4 ; ou les garder comme variante visuelle de la zone 4 en style Dynamique.
3. **Écran détaillé des blessures.** Deux options : une section de la page Santé, ce qui est recommandé car l'écran existe déjà ; ou une nouvelle page « Blessures et restrictions » dans Performance.

## 6. Vérification prévue

- Les parcours e2e existants passent. Ceux qui ciblent l'accueil seront adaptés aux nouveaux emplacements, sans retirer ce qu'ils vérifient.
- Nouveaux parcours :
  - **Accueil sans alerte :** pas de zone 2.
  - **Avec une blessure :** une ligne de synthèse, puis l'écran détaillé.
  - **Sans objectif :** pas de ligne objectif.
  - **Menu `⋯` :** Changer de séance et Version express fonctionnent.
- Captures en mobile (375 px) et sur ordinateur, avant et après, dans les 4 styles et en mode clair et sombre.

## 7. Réalisation

- **Accueil (`page.tsx`) :**
  - En-tête compact.
  - Carte séance plus basse : titre en 2xl, anneau seulement pendant une séance en cours, menu `⋯`.
  - Zone 2 « À savoir » : deux lignes au plus, puis « + n autres ».
  - Zone 3 : `WeekStrip` en mode `compact`, avec le compteur de l'objectif de la semaine.
  - Zone 4 : `HomeProgress`.
  - « À voir aussi » replié.
  - Sur ordinateur, la séance et la semaine sont à gauche, le reste à droite.
- **Nouveaux composants :**
  - `HomeZones.tsx` : `AlertLine`, `HomeAlerts`, `useInjurySummary`, `HomeProgress`, `SessionMenu` (se ferme avec Échap).
  - `InjuriesSection.tsx` : la section de la page Santé.
- **Supprimés :** `QuickAccessTiles.tsx` et `HomeAtAGlance.tsx`, dont le contenu est repris par les zones.
- **Lien « Planning complet » :** `/log?view=calendar` ouvre directement le calendrier.
- **Tests :**
  - 80 parcours e2e passent.
  - Un nouveau parcours vérifie la structure de l'accueil (zones, menu `⋯`, pas de débordement horizontal sur téléphone, planning complet).
  - Captures dans les 4 styles, en clair et en sombre, sur téléphone et sur ordinateur (`E2E_SHOTS=1`).
