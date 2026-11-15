# Navigation — dettes UX laissées pour le Lot 2

État au 15 novembre 2026, branche `navigation-wheel`. La structure à deux niveaux (4 sections, 6 destinations au plus) n'est pas remise en cause ici : chaque point ci-dessous attend une décision design avant d'être corrigé.

## 1. Destinations partagées

Plusieurs entrées de la roue mènent à la même page. Dans la sous-roue, toutes celles qui pointent vers la page ouverte sont mises en valeur en même temps, et l'utilisateur n'arrive pas là où le libellé le promet.

| Section | Entrées | Page commune |
|---|---|---|
| Coaching | Athlètes, Assignations, Planning | `/coach` |
| Profil et administration | Notifications, Layouts, Réglages | `/settings` |
| S'entraîner | Import | `/settings` |
| Performance | Progrès, Objectifs | `/progress` |
| S'entraîner / Profil et administration | Sports, Connexions | `/more` |

À décider : une page ou une ancre propre à chaque entrée (`/settings#notifications`, `/coach?tab=…`), ou la fusion des entrées.

Source : `NAVIGATION_CATALOG` dans `src/lib/navConfig.ts`.

## 2. Navigation pendant une séance

La roue s'affiche sur toutes les pages connectées, y compris la séance en cours (`/log/session`) et les séances minutées. L'audit demande qu'elle disparaisse pendant une séance active pour éviter les erreurs de manipulation.

À décider : masquer la roue, ou la réduire à un bouton discret « quitter la séance ». Comment sortir de la séance (confirmation, sauvegarde). Liste des routes concernées.

Source : `AppShell.tsx` rend `<BottomNav />` sans condition de route.

## 3. Destinations absentes de la roue

Course à pied (`/running`), Tests de niveau (`/tests`), Rapport (`/report`), Compétitions (`/competitions`) et Chevaux (`/horses`) ne sont atteignables que par la page « Plus ». L'entrée « Sports » de la roue mène à `/more`, pas à un écran de sports.

## 4. Libellés

- « Layouts » n'est pas traduit en français. Les traductions allemande et anglaise sont à revoir aussi.
- « Import » est ambigu : l'import Excel de programmes se trouve sur `/programs`, alors que l'entrée mène à `/settings`.

## 5. Bouton central

Le bouton de 64 px, avec une icône de menu générique, reste très dominant. L'audit le juge peu explicite.

## 6. Prévu par l'audit, non fait

- Réorganiser les raccourcis par appui long. Aujourd'hui, l'ordre des sections se règle dans Réglages.
- Badges de notification sur les secteurs de la roue.
- Retour haptique au passage d'un cran.

## Déjà réglé dans cette branche (pour mémoire)

- Toucher ou cliquer une icône ouvre de nouveau la section ou le lien.
- Un glissement n'ouvre jamais l'icône sur laquelle il a commencé.
- La roue se recale sur un cran après `pointerup` et après `pointercancel`.
- Les libellés longs passent à la ligne et restent dans le panneau sur mobile.
- Tests e2e avec la vraie souris et le vrai tactile : section, sous-roue, glissement depuis le vide et depuis une icône, geste levé ou annulé.
