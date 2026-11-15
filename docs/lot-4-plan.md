# Lot 4 — Séance active : audit et plan

Branche `codex/lot-4-active-workout`, partie de `main` en `eb5a618`. Audit en lecture seule, aucun code modifié. Pas de migration Supabase, aucun calcul métier modifié.

## 1. Les séances actives aujourd'hui

| Séance | Où | Composant | Quand c'est enregistré |
|---|---|---|---|
| Classique (jour de programme) | `/log/session?id=` (et `/log/[id]`) | `SessionLogger` (1 273 lignes) | La séance est créée au démarrage, avec ses séries prévues ; chaque valeur l'est à la sortie du champ |
| Libre | idem | `SessionLogger`, sans séries au départ | Créée au démarrage, vide |
| Mode guidé | par-dessus la séance | `GuidedSession` (plein écran) | Chaque série validée, tout de suite |
| Endurance (saisie) | `/log/session` d'une séance `cardio` | `CardioLogger` dans `SessionLogger` | Créée au démarrage ; distance et durée à la saisie |
| Séance minutée | `/intervals` | `IntervalPlayer` (plein écran) | **Seulement à la fin**, et seulement si au moins un exercice est fait |
| Fractionné de course guidé | `/running` | `RunGuide` → `IntervalPlayer` | À la fin |
| Échauffement / étirements | `/mobility` | `IntervalPlayer` | **Jamais** : rien n'est enregistré, un écran de fin s'affiche |
| Tests de niveau | `/tests` | lecteur et saisie propres | À la saisie du résultat |

## 2. Partagé et divergent

**Partagé** : `IntervalPlayer` sert aux séances minutées, à la course guidée et à la mobilité. Il gère la mise en veille empêchée (`wakeLock`), les bips, la voix, la pause et le passage d'un exercice. `useSessionFocus` (Lot 2) masque la roue dans `SessionLogger`, `IntervalPlayer` et `GuidedSession`.

**Divergent** :
- Deux façons de saisir une série musculation :
  - la liste de `SessionLogger` : petits champs de 44 px, avec Fait et Supprimer côte à côte ;
  - le mode guidé : grands boutons ± de 64 px et un bouton de validation de 64 px.
- Deux minuteurs de repos : celui de `SessionLogger` (barre en bas, +30 s, notification par le service worker) et celui du mode guidé (même état, affichage différent).
- La reprise d'une séance n'est possible que dans `SessionLogger`. Les lecteurs (`IntervalPlayer`) perdent tout à la fermeture.

## 3. Parcours à une main (séance classique)

- Les champs poids, répétitions et RPE font 44 px de haut. Ils sont alignés en grille avec « Fait » (40 px) et « Supprimer » (40 px) **juste à côté** : il est facile de supprimer une série en voulant la valider.
- Il faut taper dans le champ, puis le clavier numérique s'ouvre et masque une partie de l'écran. La valeur n'est enregistrée qu'à la sortie du champ (`onBlur`).
- Les actions de séance (Terminer, Modifier, mode guidé) sont en haut de l'écran, hors de portée du pouce.
- Le mode guidé a déjà le bon modèle : grands boutons ±, validation en bas.

## 4. Reprise après fermeture ou perte de réseau

- Les données sont dans IndexedDB (Dexie) et synchronisées ensuite : **la perte de réseau ne perd rien**. Une séance ouverte se rouvre par « Continuer » depuis l'accueil ou le hub.
- **Une valeur tapée puis l'application fermée sans quitter le champ est perdue**, puisqu'elle n'est enregistrée qu'à la sortie du champ.
- Le **minuteur de repos** n'existe qu'en mémoire : après un rechargement, il disparaît. La notification programmée dans le service worker, elle, reste.
- Le **mode guidé** se rouvre fermé ; l'endroit où on en était se retrouve à partir des séries validées.
- **Séances minutées, course guidée, mobilité** : fermer ou recharger perd toute la progression, rien n'est enregistré.

## 5. Valider, modifier, supprimer une série

- **Valider** (`toggleDone`) : complète poids et répétitions à partir de la suggestion si les champs sont vides (`valuesForTick`), lance le repos (sauf en superset, où on enchaîne), vibre, et détecte un record. Retaper sur « Fait » annule la validation.
- **État validé** : seul le bouton passe au vert ; la ligne elle-même ne change pas. Rien n'indique la série en cours.
- **Modifier** : directement dans les champs, enregistré à la sortie du champ.
- **Supprimer une série** : immédiat, **sans confirmation ni annulation**.
- **Supprimer la séance** (menu Modifier) : immédiat, **sans confirmation**.

## 6. Minuteur de repos

- Il est calculé sur l'heure de fin, et non en comptant les secondes : un téléphone verrouillé ne le fausse pas. Il bipe les 3 dernières secondes, puis sonne et vibre selon les réglages. Il propose +30 s et Passer.
- La barre du repos et celle de l'effort chronométré sont posées en bas, au-dessus de la zone de la roue (`bottom-24`). L'exercice suivant n'est pas montré pendant le repos, sauf en mode guidé.

## 7. Séances vides ou abandonnées

- Toute séance (classique, libre, endurance) est **créée dès le démarrage**. Ouverte puis quittée, elle reste dans l'historique, vide.
- « Terminer » sans série faite ramène à `/log` sans résumé ; la séance reste enregistrée telle quelle.
- Le Lot 3 ne compte déjà plus ces séances dans l'objectif ni dans la ligne de la semaine.
- **Consigne : on ne change pas leur enregistrement dans ce lot.**

## 8. Comportements métier à ne pas modifier

- Calculs : conseils de charge (`progression`), décharge et séance allégée, reprise après blessure (`loadFactor`), records (`beatsRecord`), complément à la validation (`valuesForTick`), pré-remplissage par niveau, pourcentages du 1RM, échauffement (`warmupSets`), supersets (`restsAfter`), séries chronométrées (répétitions = secondes).
- Enregistrement : moment de création des séances, règle « au moins un exercice fait » des séances minutées, mobilité non enregistrée, synchronisation (`_dirty`), séances abandonnées conservées.
- Repos : valeur par réglage, échauffement plus court, notification par le service worker.

## 9. Plan du Lot 4 — changements progressifs

Chaque étape est un petit commit, avec ses tests ciblés, ESLint, TypeScript, build, e2e et Preview. Aucun calcul n'est touché.

1. **Enregistrer pendant la saisie** (priorités 2 et 6). Un champ enregistre ce qu'on tape au fil de la saisie, avec un court délai, et pas seulement à la sortie du champ. Le minuteur de repos garde son heure de fin dans le stockage local de l'appareil, par séance : il reprend après un rechargement et s'efface à la fin du repos. Tests : un rechargement en plein repos le retrouve ; une valeur tapée puis la page rechargée est conservée.
2. **Série validée claire et série en cours** (priorité 3). Une ligne validée est teintée, avec ses valeurs en gras et une coche, et le lecteur d'écran l'annonce (« Série 2 validée »). La première série non faite de l'exercice en cours est mise en avant.
3. **Grands champs et actions au pouce** (priorité 1).
   - Lignes de 56 px, avec des chiffres plus grands.
   - « Fait » de 48 px à droite.
   - « Supprimer » éloigné de « Fait » : déplacé dans un menu de la ligne, ou remplacé par un geste, avec une annulation de 5 s.
   - Une barre d'actions en bas (Mode guidé, Terminer), au-dessus de la barre de repos.
   - La suppression de la séance demande une confirmation.
4. **Reprise des valeurs précédentes** (priorité 2). Chaque série affiche ce qui avait été fait à la même série la dernière fois (« 60 × 8 »), et un geste « Reprendre » remplit les champs avec. Ce n'est qu'un affichage : la suggestion et le complément à la validation restent ceux d'aujourd'hui.
5. **Repos et suite visibles sans surcharge** (priorité 4). La barre de repos montre le temps restant, puis la série ou l'exercice suivant (« Ensuite : Pompes · série 3 »), et +30 s / Passer, sur une seule ligne compacte.
6. **Navigation globale** (priorité 5). C'est déjà fait au Lot 2. Il reste à vérifier les tests de niveau et la saisie d'endurance, et à ajouter un test e2e pour chaque type de séance.
7. **Lecteurs : reprise après fermeture** (priorité 6, à valider). `IntervalPlayer` garderait sa progression (étape, temps écoulé, exercices faits) dans le stockage local de l'appareil. À la réouverture, il proposerait « Reprendre la séance minutée ? ». Le moment d'enregistrement ne change pas.

## 10. À trancher avant de coder

1. Supprimer une série : un menu sur la ligne, ou un glissement vers la gauche ? Dans les deux cas avec une annulation de 5 s.
2. RPE : le garder dans la ligne, ou le replier pour laisser plus de place au poids et aux répétitions ?
3. Faut-il rapprocher la liste du mode guidé (une série à la fois), ou garder la liste en l'agrandissant (ce qui est proposé) ?
4. Étape 7 : faut-il proposer de reprendre une séance minutée interrompue, et pendant combien de temps (même jour seulement ?) ?
5. La barre d'actions du bas : faut-il y mettre aussi « Ajouter un exercice » ?

## 11. Reprise des séances minutées : état gardé (validé)

Stocké sur l'appareil (`localStorage`, clé `traintrack.timed.intervals`), format version 1 (`src/lib/timedResume.ts`) :

| Champ | Contenu |
|---|---|
| `v` | version du format (1) ; une autre version, ou un état illisible, est effacé |
| `kind` | `intervals` (les séances minutées ; course guidée et mobilité pourront suivre) |
| `context` | ce dont la page reconstruit la séance : le plan avec sa graine, donc les mêmes exercices dans le même ordre |
| `stepCount` | le nombre d'étapes de cette séance, pour vérifier que c'est bien la même |
| `index` | l'étape en cours au moment de la fermeture, rejouée depuis son début |
| `done` | les efforts menés à terme, enregistrés avec la séance (ne garde que ceux avant `index`) |
| `elapsedSec` | le temps réellement passé, pauses et temps fermé exclus |
| `updatedAt` | le moment de la dernière étape atteinte |

Règles :
- Jusqu'à 6 heures après `updatedAt`, la page propose « Reprendre » ou « Recommencer ». Au-delà, seulement « Recommencer » ou « Abandonner ».
- La séance n'avance pas pendant la fermeture : on reprend l'étape en cours depuis son début, avec le temps passé tel qu'il était.
- Si la séance reconstruite n'a plus le même nombre d'étapes (blessures modifiées entre-temps, par exemple), on ne propose que « Recommencer » ou « Abandonner ».
- L'état est effacé à la fin de la séance, enregistrée ou non, et sur « Recommencer » ou « Abandonner ».
- L'enregistrement de la séance ne change pas : à la fin, et seulement si au moins un exercice est fait.

Le minuteur de repos d'une séance classique, lui, continue jusqu'à son heure de fin enregistrée (`traintrack.rest.<id>`).
