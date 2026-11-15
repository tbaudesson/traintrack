# TrainTrack — système visuel premium

## Intention

TrainTrack est un produit sportif de performance, pas un tableau de bord SaaS générique. Son identité associe graphite et carbone, violet électrique pour l’action, et lime uniquement pour un résultat positif, une validation ou une performance.

## Principes

- Le contenu métier et la lisibilité priment toujours sur l’effet visuel.
- Les surfaces ont un relief tactile discret : bord supérieur éclairé, ombre de contact et trame technique légère.
- Le violet identifie une action, un focus, une sélection ou la navigation.
- Le lime ne sert jamais de décoration. Il signifie succès, validation ou performance positive.
- Les titres importants utilisent `t-display` : gras, condensé visuellement, italique et en capitales.
- Les métriques utilisent `t-metric` pour conserver des chiffres stables et alignés.
- Les sections utilisent `t-section-heading` et les libellés techniques `t-kicker`.

## Surfaces réutilisables

- `t-surface` : carte ou ligne standard.
- `t-panel` : panneau structurant.
- `t-hero` : contenu prioritaire sur fond graphite.
- `t-well` et `t-sunken` : commande tactile ou champ en retrait.
- `t-performance` : valeur positive uniquement.

Les composants `Card`, `Button`, `DetailRow`, `PageHeader` et `SectionHeading` doivent être préférés à une nouvelle implémentation locale.

## Navigation

La navigation circulaire comporte exactement deux niveaux : quatre univers globaux, puis six destinations maximum par univers. Le centre revient au niveau supérieur. Une liste accessible reste toujours disponible. Aucun troisième niveau circulaire ne doit être ajouté.

## Responsive et accessibilité

- Mobile : une colonne, commandes principales à portée du pouce et zones tactiles d’au moins 44 px.
- Bureau : exploiter la largeur avec deux colonnes ou un rail, sans étirer les champs de saisie.
- Toutes les interactions doivent fonctionner au clavier avec un focus visible.
- Les dialogues modaux enferment le focus, se ferment avec Échap et restaurent le focus.
- `prefers-reduced-motion` désactive les transitions non indispensables.
- Le texte blanc sur violet utilise au minimum `accent-600` afin de conserver un contraste de 4,5:1.

## Compatibilité

Les quatre styles `classic`, `dynamic`, `soft` et `contrast`, les modes clair et sombre, le hors-ligne, les licences, les rôles et `next-intl` restent obligatoires. Aucun libellé visible ne doit être codé en dur.
