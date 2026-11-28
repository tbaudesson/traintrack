-- 097_run_workouts.sql
-- The run sessions, kept by an admin rather than fixed in the code
-- (Admin > Running): app_settings.run_workouts holds what the sessions work
-- (VMA, threshold, endurance, test) and the sessions, each named and
-- described in French, English and German, with what it works and its
-- blocks at each level (beginner, intermediate, advanced). A block is a
-- kind (warm-up, effort, recovery, cool-down), a pace zone and a time or a
-- distance; a repeat is blocks done n times with a block between two of
-- them. The test whose distance gives one's VMA is marked so. The sessions
-- are those the app had, block for block.
-- Apply this file first, then the code.
-- Plain quotes only; safe to run again (an existing value is kept).

BEGIN;

INSERT INTO app_settings (key, value) VALUES ('run_workouts', '{
  "focuses": [
    {
      "id": "vma",
      "fr": "VMA",
      "en": "MAS",
      "de": "MAG"
    },
    {
      "id": "threshold",
      "fr": "Seuil",
      "en": "Threshold",
      "de": "Schwelle"
    },
    {
      "id": "endurance",
      "fr": "Endurance",
      "en": "Endurance",
      "de": "Ausdauer"
    },
    {
      "id": "test",
      "fr": "Test",
      "en": "Test",
      "de": "Test"
    }
  ],
  "workouts": [
    {
      "id": "30-30",
      "fr": "30/30",
      "en": "30/30",
      "de": "30/30",
      "description": {
        "fr": "30 s vite, 30 s en trottinant : le classique pour développer la VMA.",
        "en": "30 s fast, 30 s jogging: the classic to build MAS.",
        "de": "30 s schnell, 30 s traben: der Klassiker für die MAG."
      },
      "focus": "vma",
      "levels": {
        "beginner": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 720
          },
          {
            "repeat": 2,
            "of": [
              {
                "repeat": 8,
                "of": [
                  {
                    "kind": "work",
                    "zone": "vma",
                    "sec": 30
                  }
                ],
                "between": {
                  "kind": "recovery",
                  "zone": "recovery",
                  "sec": 30
                }
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 180
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "intermediate": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 900
          },
          {
            "repeat": 2,
            "of": [
              {
                "repeat": 10,
                "of": [
                  {
                    "kind": "work",
                    "zone": "vma",
                    "sec": 30
                  }
                ],
                "between": {
                  "kind": "recovery",
                  "zone": "recovery",
                  "sec": 30
                }
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 180
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "advanced": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 1200
          },
          {
            "repeat": 3,
            "of": [
              {
                "repeat": 10,
                "of": [
                  {
                    "kind": "work",
                    "zone": "vma",
                    "sec": 30
                  }
                ],
                "between": {
                  "kind": "recovery",
                  "zone": "recovery",
                  "sec": 30
                }
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 180
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ]
      }
    },
    {
      "id": "400",
      "fr": "Séries de 400 m",
      "en": "400 m repeats",
      "de": "400-m-Intervalle",
      "description": {
        "fr": "Des 400 m à VMA, récupération 1 min 30 en trottinant.",
        "en": "400 m at MAS, 1 min 30 jogging in between.",
        "de": "400 m im MAG-Tempo, 1:30 Min. Trabpause."
      },
      "focus": "vma",
      "levels": {
        "beginner": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 720
          },
          {
            "repeat": 6,
            "of": [
              {
                "kind": "work",
                "zone": "vma",
                "meters": 400
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 90
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "intermediate": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 900
          },
          {
            "repeat": 8,
            "of": [
              {
                "kind": "work",
                "zone": "vma",
                "meters": 400
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 90
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "advanced": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 1200
          },
          {
            "repeat": 10,
            "of": [
              {
                "kind": "work",
                "zone": "vma",
                "meters": 400
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 90
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ]
      }
    },
    {
      "id": "800",
      "fr": "Séries de 800 m",
      "en": "800 m repeats",
      "de": "800-m-Intervalle",
      "description": {
        "fr": "Des 800 m à VMA : plus long, plus exigeant.",
        "en": "800 m at MAS: longer, tougher.",
        "de": "800 m im MAG-Tempo: länger, härter."
      },
      "focus": "vma",
      "levels": {
        "beginner": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 720
          },
          {
            "repeat": 4,
            "of": [
              {
                "kind": "work",
                "zone": "vma",
                "meters": 800
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 120
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "intermediate": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 900
          },
          {
            "repeat": 5,
            "of": [
              {
                "kind": "work",
                "zone": "vma",
                "meters": 800
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 120
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "advanced": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 1200
          },
          {
            "repeat": 6,
            "of": [
              {
                "kind": "work",
                "zone": "vma",
                "meters": 800
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 120
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ]
      }
    },
    {
      "id": "1000",
      "fr": "Séries de 1000 m",
      "en": "1000 m repeats",
      "de": "1000-m-Intervalle",
      "description": {
        "fr": "Des 1000 m à allure 5 km, pour tenir la vitesse plus longtemps.",
        "en": "1000 m at 5 km pace, to hold speed longer.",
        "de": "1000 m im 5-km-Tempo, um das Tempo länger zu halten."
      },
      "focus": "vma",
      "levels": {
        "beginner": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 720
          },
          {
            "repeat": 3,
            "of": [
              {
                "kind": "work",
                "zone": "5k",
                "meters": 1000
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 120
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "intermediate": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 900
          },
          {
            "repeat": 5,
            "of": [
              {
                "kind": "work",
                "zone": "5k",
                "meters": 1000
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 120
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "advanced": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 1200
          },
          {
            "repeat": 6,
            "of": [
              {
                "kind": "work",
                "zone": "5k",
                "meters": 1000
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 120
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ]
      }
    },
    {
      "id": "pyramid",
      "fr": "Pyramide",
      "en": "Pyramid",
      "de": "Pyramide",
      "description": {
        "fr": "200 m, 400 m, 600 m… puis on redescend. Varié et motivant.",
        "en": "200 m, 400 m, 600 m… then back down. Varied and motivating.",
        "de": "200 m, 400 m, 600 m… und wieder zurück. Abwechslungsreich und motivierend."
      },
      "focus": "vma",
      "levels": {
        "beginner": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 720
          },
          {
            "kind": "work",
            "zone": "short",
            "meters": 200
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 45
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 400
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 45
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 600
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 68
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 400
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 45
          },
          {
            "kind": "work",
            "zone": "short",
            "meters": 200
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "intermediate": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 900
          },
          {
            "kind": "work",
            "zone": "short",
            "meters": 200
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 45
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 400
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 45
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 600
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 68
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 800
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 90
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 600
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 68
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 400
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 45
          },
          {
            "kind": "work",
            "zone": "short",
            "meters": 200
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "advanced": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 1200
          },
          {
            "kind": "work",
            "zone": "short",
            "meters": 200
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 45
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 400
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 45
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 600
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 68
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 800
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 90
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 1000
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 113
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 800
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 90
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 600
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 68
          },
          {
            "kind": "work",
            "zone": "vma",
            "meters": 400
          },
          {
            "kind": "recovery",
            "zone": "recovery",
            "sec": 45
          },
          {
            "kind": "work",
            "zone": "short",
            "meters": 200
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ]
      }
    },
    {
      "id": "threshold",
      "fr": "Seuil",
      "en": "Threshold",
      "de": "Schwelle",
      "description": {
        "fr": "Des blocs de 8 à 12 min au seuil : l’allure qui fait reculer la fatigue.",
        "en": "Blocks of 8 to 12 min at threshold: the pace that pushes fatigue back.",
        "de": "Blöcke von 8 bis 12 Min. an der Schwelle: das Tempo, das die Müdigkeit hinausschiebt."
      },
      "focus": "threshold",
      "levels": {
        "beginner": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 720
          },
          {
            "repeat": 2,
            "of": [
              {
                "kind": "work",
                "zone": "threshold",
                "sec": 480
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 120
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "intermediate": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 900
          },
          {
            "repeat": 3,
            "of": [
              {
                "kind": "work",
                "zone": "threshold",
                "sec": 600
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 120
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "advanced": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 1200
          },
          {
            "repeat": 3,
            "of": [
              {
                "kind": "work",
                "zone": "threshold",
                "sec": 720
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 120
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ]
      }
    },
    {
      "id": "tempo",
      "fr": "Tempo",
      "en": "Tempo",
      "de": "Tempolauf",
      "description": {
        "fr": "Un bloc continu à allure semi : apprendre à tenir.",
        "en": "One steady block at half-marathon pace: learning to hold on.",
        "de": "Ein durchgehender Block im Halbmarathontempo: lernen durchzuhalten."
      },
      "focus": "threshold",
      "levels": {
        "beginner": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 720
          },
          {
            "kind": "work",
            "zone": "half",
            "sec": 900
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "intermediate": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 900
          },
          {
            "kind": "work",
            "zone": "half",
            "sec": 1200
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "advanced": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 1200
          },
          {
            "kind": "work",
            "zone": "half",
            "sec": 1800
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ]
      }
    },
    {
      "id": "hills",
      "fr": "Côtes",
      "en": "Hills",
      "de": "Bergläufe",
      "description": {
        "fr": "45 s en montée, fort, puis redescente en trottinant. Force et foulée.",
        "en": "45 s hard uphill, then jog back down. Strength and stride.",
        "de": "45 s hart bergauf, dann locker zurück. Kraft und Laufschritt."
      },
      "focus": "vma",
      "levels": {
        "beginner": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 720
          },
          {
            "repeat": 6,
            "of": [
              {
                "kind": "work",
                "zone": "5k",
                "sec": 45
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 90
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "intermediate": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 900
          },
          {
            "repeat": 8,
            "of": [
              {
                "kind": "work",
                "zone": "5k",
                "sec": 45
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 90
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "advanced": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 1200
          },
          {
            "repeat": 10,
            "of": [
              {
                "kind": "work",
                "zone": "5k",
                "sec": 45
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "recovery",
              "sec": 90
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ]
      }
    },
    {
      "id": "fartlek",
      "fr": "Fartlek",
      "en": "Fartlek",
      "de": "Fahrtspiel",
      "description": {
        "fr": "1 min à allure 10 km, 1 min facile : du rythme sans se mettre dans le rouge.",
        "en": "1 min at 10 km pace, 1 min easy: rhythm without going into the red.",
        "de": "1 Min. im 10-km-Tempo, 1 Min. locker: Rhythmus, ohne zu überziehen."
      },
      "focus": "endurance",
      "levels": {
        "beginner": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 720
          },
          {
            "repeat": 6,
            "of": [
              {
                "kind": "work",
                "zone": "10k",
                "sec": 60
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "easy",
              "sec": 60
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "intermediate": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 900
          },
          {
            "repeat": 8,
            "of": [
              {
                "kind": "work",
                "zone": "10k",
                "sec": 60
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "easy",
              "sec": 60
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "advanced": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 1200
          },
          {
            "repeat": 10,
            "of": [
              {
                "kind": "work",
                "zone": "10k",
                "sec": 60
              }
            ],
            "between": {
              "kind": "recovery",
              "zone": "easy",
              "sec": 60
            }
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ]
      }
    },
    {
      "id": "progressive",
      "fr": "Progressif",
      "en": "Progression run",
      "de": "Steigerungslauf",
      "description": {
        "fr": "Trois blocs de plus en plus rapides : endurance, marathon, seuil.",
        "en": "Three blocks, each faster: easy, marathon, threshold.",
        "de": "Drei Blöcke, jeder schneller: Grundlage, Marathon, Schwelle."
      },
      "focus": "endurance",
      "levels": {
        "beginner": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 720
          },
          {
            "kind": "work",
            "zone": "easy",
            "sec": 480
          },
          {
            "kind": "work",
            "zone": "marathon",
            "sec": 480
          },
          {
            "kind": "work",
            "zone": "threshold",
            "sec": 480
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "intermediate": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 900
          },
          {
            "kind": "work",
            "zone": "easy",
            "sec": 600
          },
          {
            "kind": "work",
            "zone": "marathon",
            "sec": 600
          },
          {
            "kind": "work",
            "zone": "threshold",
            "sec": 600
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "advanced": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 1200
          },
          {
            "kind": "work",
            "zone": "easy",
            "sec": 720
          },
          {
            "kind": "work",
            "zone": "marathon",
            "sec": 720
          },
          {
            "kind": "work",
            "zone": "threshold",
            "sec": 720
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ]
      }
    },
    {
      "id": "half-cooper",
      "fr": "Test VMA (demi-Cooper)",
      "en": "MAS test (half-Cooper)",
      "de": "MAG-Test (halber Cooper)",
      "description": {
        "fr": "6 minutes le plus loin possible, puis notez la distance : votre VMA et vos allures sont mises à jour.",
        "en": "6 minutes as far as you can, then enter the distance: your MAS and paces are updated.",
        "de": "6 Minuten so weit wie möglich, dann die Strecke eintragen: deine MAG und Tempos werden aktualisiert."
      },
      "focus": "test",
      "levels": {
        "beginner": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 720
          },
          {
            "kind": "work",
            "zone": "vma",
            "sec": 360
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "intermediate": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 900
          },
          {
            "kind": "work",
            "zone": "vma",
            "sec": 360
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ],
        "advanced": [
          {
            "kind": "warmup",
            "zone": "easy",
            "sec": 1200
          },
          {
            "kind": "work",
            "zone": "vma",
            "sec": 360
          },
          {
            "kind": "cooldown",
            "zone": "recovery",
            "sec": 600
          }
        ]
      },
      "vmaTest": true
    }
  ]
}') ON CONFLICT (key) DO NOTHING;

COMMIT;
