# Navigation — Lot 2 : plan

Branche `codex/navigation-lot-2`. Cadre validé : deux niveaux circulaires au plus, quatre univers (S'entraîner, Performance, Coaching, Profil & Admin), six entrées au plus par univers, liste avec recherche en secours. Droits, licences, mode hors ligne, next-intl et préférences sont conservés. Aucune migration Supabase.

## Fait dans cette branche

### 1. Navigation masquée pendant une séance active

- Nouveau signal `useSessionFocus(active)` dans `src/hooks/useSessionFocus.ts`. Chaque séance active pose une « réservation » ; la roue (`BottomNav`) disparaît tant qu'il en reste une, et revient fermée.
- Où le signal est posé :
  - `SessionLogger` : séance **du jour**, tant que son résumé n'est pas affiché ;
  - `IntervalPlayer` : séances minutées, étirements, échauffement, guide de course (`RunGuide` l'utilise) ;
  - `GuidedSession` : mode guidé de la séance.
- Une séance passée, ouverte depuis l'historique, garde la roue.
- Pendant une séance, on en sort par le bouton retour de l'en-tête ou par « Terminer la séance ».

### 2. Un seul état actif par sous-roue

- Nouvelle fonction `currentItemId(section, pathname)` dans `src/lib/navConfig.ts`. Elle retient l'adresse la plus précise. Si plusieurs entrées partagent cette adresse, l'entrée qui porte le nom de la page l'emporte (Réglages pour `/settings`, Progrès pour `/progress`), sinon la première dans l'ordre de l'univers (Athlètes pour `/coach`).
- `SectionNavigationWheel` s'en sert à la place de `startsWith`. Cela corrige aussi un faux positif : `/programsx` activait « Programmes ».

### Tests ajoutés

- Unitaires (`navConfig.test.ts`) : une seule entrée active pour chaque adresse du catalogue ; règle de départage ; accueil exact.
- E2E (`e2e/run.mjs`) :
  - la roue disparaît pendant une séance minutée et revient après ;
  - elle disparaît sur la séance du jour, reste sur une séance passée, et revient quand on quitte la séance.

## 3. Stratégie de routes pour les destinations sans écran propre

| Univers | Entrée | Aujourd'hui | Proposition |
|---|---|---|---|
| S'entraîner | Sports | `/more` (liste générale) | **B.** `/sports` : sports pratiqués, course, compétitions et chevaux selon la licence |
| S'entraîner | Import | `/settings` | **A.** `/settings#import`, ou **C.** `/programs?import=1`, qui ouvre l'import Excel existant |
| Performance | Objectifs | `/progress` | **A.** `/progress#goals` (la section existe déjà dans Progrès) |
| Coaching | Athlètes | `/coach` | Garder `/coach` : c'est le tableau de suivi des athlètes |
| Coaching | Assignations | `/coach` | **B.** `/coach/assignments` : nouvel écran. En attendant, le retirer de la roue ou le pointer vers `/teams` |
| Coaching | Planning | `/coach` | **B.** `/coach/planning` : nouvel écran (calendrier collectif). Même règle d'attente |
| Coaching | Demandes | `/activity` | À clarifier : `/activity` est un fil d'activité, pas des demandes. Sinon **B.** `/coach/requests` |
| Profil & Admin | Notifications | `/settings` | **A.** `/settings#alerts` (groupe « Alertes » existant) |
| Profil & Admin | Layouts | `/settings` | **A.** `/settings#appearance`, en attendant les quatre layouts de l'audit |
| Profil & Admin | Connexions | `/more` | **A.** `/settings#data` (synchronisation, imports, exports), ou **B.** `/connections` |

Légende :
- **A. Ancre** dans un écran existant : `id` stable sur la section, défilement et mise en avant à l'arrivée. Aucun nouvel écran, compatible hors ligne (même page en cache) et i18n. Les ancres font partie de l'adresse : `currentItemId` devra en tenir compte pour activer la bonne entrée.
- **B. Nouvelle route** légère : un écran propre, à précacher dans le service worker (liste `PAGES` de l'e2e et préchargement), avec un `RequireFeature` si l'entrée dépend d'une licence. Ce sont des hubs : à coder seulement après validation design.
- **C. Paramètre** qui ouvre directement une action d'un écran existant.

Recommandation : A partout où une section existe déjà (Objectifs, Notifications, Layouts, Connexions, Import). B seulement pour Sports, Assignations et Planning. Tant qu'un écran B n'existe pas, mieux vaut retirer l'entrée de la roue que mener à une page qui ne correspond pas à son libellé.

## Fichiers concernés par la suite

- `src/lib/navConfig.ts` : adresses du catalogue et prise en compte des ancres dans `currentItemId`.
- `src/app/[locale]/settings/page.tsx` : `id` stables sur les groupes, défilement vers l'ancre.
- `src/app/[locale]/progress/page.tsx` : ancre `#goals`.
- `src/app/[locale]/programs/page.tsx` : ouverture de l'import par `?import=1` (option C).
- Nouvelles routes B : `src/app/[locale]/sports/`, `src/app/[locale]/coach/assignments/`, `src/app/[locale]/coach/planning/`.
- `public/sw.js` ou la liste de préchargement, et la liste `PAGES` de `e2e/run.mjs`.
- `src/messages/{fr,en,de}.json` : libellés (Layouts, Import).

## Arbitrages UX à trancher

1. **Séance passée** : garder la roue (choix actuel) ou la masquer aussi pendant la modification d'une séance passée ?
2. **Sortie de séance** : le bouton retour suffit-il, ou faut-il une confirmation (« Quitter la séance ? Elle reste enregistrée ») ?
3. **Entrées sans écran** : les retirer de la roue en attendant leur écran, ou les garder vers la page la plus proche ?
4. **Départage d'adresse partagée** : l'entrée nommée comme la page, sinon la première (choix actuel), ou une entrée « canonique » déclarée dans le catalogue ?
5. **« Demandes »** : quel contenu ? Le fil `/activity` ne correspond pas.
6. **Layouts** : nom français et contenu, en attendant Focus, Compact, Coach et Données.
7. **Destinations absentes** (Course, Tests, Rapport, Compétitions, Chevaux) : dans « Sports », ou dans le répertoire « Plus » seulement ?
