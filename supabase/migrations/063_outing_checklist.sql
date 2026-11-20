-- 063_outing_checklist.sql
-- The pre-departure checklist for outings on foot, and what a night out on
-- one's own adds (shelter, water to make safe, spare food…), in French,
-- English and German: a preparation list, not a survival course. Kept as
-- data an admin can change (app_settings.outing_checklist, Admin > Hiking).
--
-- Deploy: apply this file, in any order with the code. Until it is applied,
-- the checklist says it has not been loaded.
--
-- Safe to re-run: an admin's changes are kept.

INSERT INTO app_settings (key, value) VALUES ('outing_checklist', '
[
  {
    "key": "plan",
    "title": {
      "fr": "Prévoir",
      "en": "Plan",
      "de": "Planen"
    },
    "items": [
      {
        "key": "route",
        "text": {
          "fr": "Itinéraire et heure de retour prévue laissés à un proche",
          "en": "Route and expected return time left with someone",
          "de": "Route und geplante Rückkehrzeit bei jemandem hinterlassen"
        }
      },
      {
        "key": "weather",
        "text": {
          "fr": "Météo et, en montagne, bulletin d''avalanche ou d''orages vérifiés",
          "en": "Weather checked, and in the mountains the avalanche or storm bulletin",
          "de": "Wetter geprüft, in den Bergen auch Lawinen- oder Gewitterbericht"
        }
      },
      {
        "key": "turnaround",
        "text": {
          "fr": "Heure de demi-tour fixée : on rentre à cette heure, quoi qu''il arrive",
          "en": "Turnaround time set: you head back at that time, whatever happens",
          "de": "Umkehrzeit festgelegt: zu dieser Zeit wird umgekehrt, egal was passiert"
        }
      },
      {
        "key": "map",
        "text": {
          "fr": "Carte hors ligne sur le téléphone, et carte papier avec boussole",
          "en": "Offline map on the phone, and a paper map with a compass",
          "de": "Offline-Karte auf dem Handy und Papierkarte mit Kompass"
        }
      },
      {
        "key": "emergency",
        "text": {
          "fr": "Numéro d''urgence noté : 112 en Europe",
          "en": "Emergency number noted: 112 in Europe",
          "de": "Notrufnummer notiert: 112 in Europa"
        }
      },
      {
        "key": "bivouac-rules",
        "text": {
          "fr": "Lieux de bivouac repérés, et règles locales vérifiées (bivouac autorisé, feux interdits…)",
          "en": "Bivouac spots found, and local rules checked (camping allowed, fires banned…)",
          "de": "Biwakplätze ausgesucht und lokale Regeln geprüft (Biwak erlaubt, Feuer verboten …)"
        },
        "autonomy": true
      }
    ]
  },
  {
    "key": "water-food",
    "title": {
      "fr": "Eau et nourriture",
      "en": "Water and food",
      "de": "Wasser und Essen"
    },
    "items": [
      {
        "key": "water",
        "text": {
          "fr": "Assez d''eau pour la journée (au moins 0,5 l par heure de marche)",
          "en": "Enough water for the day (at least 0.5 l per hour of walking)",
          "de": "Genug Wasser für den Tag (mindestens 0,5 l pro Gehstunde)"
        }
      },
      {
        "key": "food",
        "text": {
          "fr": "De quoi manger toutes les heures, plus une réserve",
          "en": "Something to eat every hour, plus a spare",
          "de": "Etwas zu essen für jede Stunde, plus eine Reserve"
        }
      },
      {
        "key": "purify",
        "text": {
          "fr": "Un moyen de rendre l''eau potable (filtre ou pastilles)",
          "en": "A way to make water safe (filter or tablets)",
          "de": "Eine Möglichkeit, Wasser trinkbar zu machen (Filter oder Tabletten)"
        },
        "autonomy": true
      },
      {
        "key": "spare-day",
        "text": {
          "fr": "Une journée de nourriture en plus de ce qui est prévu",
          "en": "One day of food beyond what is planned",
          "de": "Ein Tag Essen mehr als geplant"
        },
        "autonomy": true
      }
    ]
  },
  {
    "key": "gear",
    "title": {
      "fr": "Équipement",
      "en": "Gear",
      "de": "Ausrüstung"
    },
    "items": [
      {
        "key": "layers",
        "text": {
          "fr": "Une couche chaude et une veste imperméable, même par beau temps",
          "en": "A warm layer and a waterproof jacket, even in good weather",
          "de": "Eine warme Schicht und eine Regenjacke, auch bei schönem Wetter"
        }
      },
      {
        "key": "headlamp",
        "text": {
          "fr": "Une lampe frontale avec piles ou batterie chargées",
          "en": "A head torch with charged batteries",
          "de": "Eine Stirnlampe mit geladenen Batterien"
        }
      },
      {
        "key": "first-aid",
        "text": {
          "fr": "Une trousse de secours, et ce qu''il faut pour les ampoules",
          "en": "A first-aid kit, with what you need for blisters",
          "de": "Ein Erste-Hilfe-Set, auch für Blasen"
        }
      },
      {
        "key": "phone",
        "text": {
          "fr": "Téléphone chargé et une batterie de secours",
          "en": "Phone charged, and a power bank",
          "de": "Geladenes Handy und eine Powerbank"
        }
      },
      {
        "key": "blanket",
        "text": {
          "fr": "Une couverture de survie et un sifflet",
          "en": "A survival blanket and a whistle",
          "de": "Eine Rettungsdecke und eine Pfeife"
        }
      },
      {
        "key": "sun",
        "text": {
          "fr": "Protection solaire : lunettes, crème, casquette",
          "en": "Sun protection: glasses, cream, cap",
          "de": "Sonnenschutz: Brille, Creme, Mütze"
        }
      },
      {
        "key": "shelter",
        "text": {
          "fr": "Un abri pour la nuit (tente, tarp ou bivy) et un sac de couchage adapté aux températures",
          "en": "A shelter for the night (tent, tarp or bivy) and a sleeping bag for the temperatures",
          "de": "Ein Unterschlupf für die Nacht (Zelt, Tarp oder Biwaksack) und ein passender Schlafsack"
        },
        "autonomy": true
      },
      {
        "key": "fire",
        "text": {
          "fr": "Briquet et allumettes au sec, là où le feu est permis",
          "en": "A lighter and dry matches, where fires are allowed",
          "de": "Feuerzeug und trockene Streichhölzer, wo Feuer erlaubt ist"
        },
        "autonomy": true
      },
      {
        "key": "knife",
        "text": {
          "fr": "Un couteau et de quoi réparer (cordelette, ruban adhésif)",
          "en": "A knife and something to mend with (cord, tape)",
          "de": "Ein Messer und etwas zum Reparieren (Schnur, Klebeband)"
        },
        "autonomy": true
      }
    ]
  },
  {
    "key": "body",
    "title": {
      "fr": "Le corps",
      "en": "Your body",
      "de": "Der Körper"
    },
    "items": [
      {
        "key": "shoes",
        "text": {
          "fr": "Chaussures déjà portées, pas neuves, et chaussettes de rechange",
          "en": "Shoes already worn in, not new, and spare socks",
          "de": "Eingelaufene, keine neuen Schuhe, und Ersatzsocken"
        }
      },
      {
        "key": "health",
        "text": {
          "fr": "En forme ce jour-là : pas de blessure, de fièvre ni de grosse fatigue",
          "en": "Fit on the day: no injury, fever or great tiredness",
          "de": "Am Tag fit: keine Verletzung, kein Fieber, keine große Müdigkeit"
        }
      },
      {
        "key": "pace",
        "text": {
          "fr": "Une allure qui permet de parler, et des pauses prévues",
          "en": "A pace that lets you talk, and planned breaks",
          "de": "Ein Tempo, bei dem man sprechen kann, und eingeplante Pausen"
        }
      }
    ]
  }
]
')
ON CONFLICT (key) DO NOTHING;
