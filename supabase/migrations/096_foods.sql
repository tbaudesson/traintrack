-- 096_foods.sql
-- The foods and the meal ideas, kept by an admin rather than fixed in the
-- code (Admin > Foods, Admin > Meal ideas):
--   - app_settings.foods: what a food can hold that a diet or an athlete
--     leaves out (tags; those offered as "without" are excludable), the
--     diets as the tags they leave out, and the foods, each named in French,
--     English and German, with its values per 100 g, its usual portion, the
--     weight of a piece, its tags, and whether it keeps its portion when a
--     meal is scaled (the vegetables). One list for the food search (in the
--     three languages now) and the meal ideas: the search's foods and the
--     meal ideas' ingredients are merged.
--   - app_settings.meal_ideas: the meal ideas, each named in the three
--     languages, for breakfast, a main meal or a snack, as foods and grams.
-- A diet or a food left out already chosen (athlete_profiles.meal_prefs)
-- keeps its id.
-- Apply this file first, then the code.
-- Plain quotes only; safe to run again (an existing value is kept).

BEGIN;

INSERT INTO app_settings (key, value) VALUES ('foods', '{
  "tags": [
    {
      "id": "meat",
      "fr": "Viande",
      "en": "Meat",
      "de": "Fleisch"
    },
    {
      "id": "lactose",
      "fr": "Lactose",
      "en": "Lactose",
      "de": "Laktose",
      "excludable": true
    },
    {
      "id": "gluten",
      "fr": "Gluten",
      "en": "Gluten",
      "de": "Gluten",
      "excludable": true
    },
    {
      "id": "pork",
      "fr": "Porc",
      "en": "Pork",
      "de": "Schwein",
      "excludable": true
    },
    {
      "id": "fish",
      "fr": "Poisson",
      "en": "Fish",
      "de": "Fisch",
      "excludable": true
    },
    {
      "id": "nuts",
      "fr": "Fruits à coque",
      "en": "Nuts",
      "de": "Nüsse",
      "excludable": true
    },
    {
      "id": "egg",
      "fr": "Œufs",
      "en": "Eggs",
      "de": "Eier",
      "excludable": true
    },
    {
      "id": "soy",
      "fr": "Soja",
      "en": "Soy",
      "de": "Soja",
      "excludable": true
    },
    {
      "id": "honey",
      "fr": "Miel",
      "en": "Honey",
      "de": "Honig"
    }
  ],
  "diets": [
    {
      "id": "omnivore",
      "fr": "Tout",
      "en": "Everything",
      "de": "Alles",
      "bans": []
    },
    {
      "id": "pescetarian",
      "fr": "Pescétarien",
      "en": "Pescetarian",
      "de": "Pescetarisch",
      "bans": [
        "meat"
      ]
    },
    {
      "id": "vegetarian",
      "fr": "Végétarien",
      "en": "Vegetarian",
      "de": "Vegetarisch",
      "bans": [
        "meat",
        "fish"
      ]
    },
    {
      "id": "vegan",
      "fr": "Vegan",
      "en": "Vegan",
      "de": "Vegan",
      "bans": [
        "meat",
        "fish",
        "egg",
        "lactose",
        "honey"
      ]
    }
  ],
  "foods": [
    {
      "id": "oats",
      "fr": "Flocons d’avoine",
      "en": "Oats",
      "de": "Haferflocken",
      "kcal": 389,
      "protein": 17,
      "carbs": 66,
      "fat": 7,
      "serving": 50,
      "tags": [
        "gluten"
      ]
    },
    {
      "id": "milk",
      "fr": "Lait demi-écrémé",
      "en": "Semi-skimmed milk",
      "de": "Fettarme Milch",
      "kcal": 47,
      "protein": 3.4,
      "carbs": 4.9,
      "fat": 1.6,
      "serving": 250,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "soy-drink",
      "fr": "Boisson de soja",
      "en": "Soy drink",
      "de": "Sojadrink",
      "kcal": 33,
      "protein": 3.3,
      "carbs": 0.6,
      "fat": 1.8,
      "serving": 250,
      "tags": [
        "soy"
      ]
    },
    {
      "id": "greek-yogurt",
      "fr": "Yaourt grec 0 %",
      "en": "0% Greek yogurt",
      "de": "Griechischer Joghurt 0 %",
      "kcal": 59,
      "protein": 10,
      "carbs": 3.6,
      "fat": 0.4,
      "serving": 170,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "skyr",
      "fr": "Skyr",
      "en": "Skyr",
      "de": "Skyr",
      "kcal": 63,
      "protein": 11,
      "carbs": 4,
      "fat": 0.2,
      "serving": 150,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "cottage",
      "fr": "Cottage cheese",
      "en": "Cottage cheese",
      "de": "Hüttenkäse",
      "kcal": 98,
      "protein": 11,
      "carbs": 3.4,
      "fat": 4.3,
      "serving": 150,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "egg",
      "fr": "Œufs",
      "en": "Eggs",
      "de": "Eier",
      "kcal": 155,
      "protein": 13,
      "carbs": 1.1,
      "fat": 11,
      "serving": 50,
      "unitG": 55,
      "tags": [
        "egg"
      ]
    },
    {
      "id": "bread",
      "fr": "Pain complet",
      "en": "Wholemeal bread",
      "de": "Vollkornbrot",
      "kcal": 247,
      "protein": 13,
      "carbs": 41,
      "fat": 3.4,
      "serving": 40,
      "tags": [
        "gluten"
      ]
    },
    {
      "id": "wrap",
      "fr": "Galettes de blé",
      "en": "Wheat wraps",
      "de": "Weizen-Wraps",
      "kcal": 310,
      "protein": 8,
      "carbs": 52,
      "fat": 7.5,
      "serving": 60,
      "unitG": 60,
      "tags": [
        "gluten"
      ]
    },
    {
      "id": "rice-cakes",
      "fr": "Galettes de riz",
      "en": "Rice cakes",
      "de": "Reiswaffeln",
      "kcal": 387,
      "protein": 8,
      "carbs": 81,
      "fat": 3,
      "serving": 27,
      "unitG": 9,
      "tags": []
    },
    {
      "id": "banana",
      "fr": "Banane",
      "en": "Banana",
      "de": "Banane",
      "kcal": 89,
      "protein": 1.1,
      "carbs": 23,
      "fat": 0.3,
      "serving": 120,
      "unitG": 120,
      "tags": []
    },
    {
      "id": "berries",
      "fr": "Fruits rouges",
      "en": "Berries",
      "de": "Beeren",
      "kcal": 57,
      "protein": 0.7,
      "carbs": 14,
      "fat": 0.3,
      "serving": 100,
      "tags": []
    },
    {
      "id": "apple",
      "fr": "Pomme",
      "en": "Apple",
      "de": "Apfel",
      "kcal": 52,
      "protein": 0.3,
      "carbs": 14,
      "fat": 0.2,
      "serving": 150,
      "unitG": 150,
      "tags": []
    },
    {
      "id": "dates",
      "fr": "Dattes",
      "en": "Dates",
      "de": "Datteln",
      "kcal": 282,
      "protein": 2.5,
      "carbs": 75,
      "fat": 0.4,
      "serving": 40,
      "unitG": 8,
      "tags": []
    },
    {
      "id": "honey",
      "fr": "Miel",
      "en": "Honey",
      "de": "Honig",
      "kcal": 304,
      "protein": 0.3,
      "carbs": 82,
      "fat": 0,
      "serving": 21,
      "tags": [
        "honey"
      ]
    },
    {
      "id": "peanut-butter",
      "fr": "Beurre de cacahuète",
      "en": "Peanut butter",
      "de": "Erdnussbutter",
      "kcal": 588,
      "protein": 25,
      "carbs": 20,
      "fat": 50,
      "serving": 32,
      "tags": [
        "nuts"
      ]
    },
    {
      "id": "almonds",
      "fr": "Amandes",
      "en": "Almonds",
      "de": "Mandeln",
      "kcal": 579,
      "protein": 21,
      "carbs": 22,
      "fat": 50,
      "serving": 30,
      "tags": [
        "nuts"
      ]
    },
    {
      "id": "walnuts",
      "fr": "Noix",
      "en": "Walnuts",
      "de": "Walnüsse",
      "kcal": 654,
      "protein": 15,
      "carbs": 14,
      "fat": 65,
      "serving": 30,
      "tags": [
        "nuts"
      ]
    },
    {
      "id": "chicken",
      "fr": "Blanc de poulet cuit",
      "en": "Cooked chicken breast",
      "de": "Gegarte Hähnchenbrust",
      "kcal": 165,
      "protein": 31,
      "carbs": 0,
      "fat": 3.6,
      "serving": 150,
      "tags": [
        "meat"
      ]
    },
    {
      "id": "turkey",
      "fr": "Blanc de dinde cuit",
      "en": "Cooked turkey breast",
      "de": "Gegarte Putenbrust",
      "kcal": 135,
      "protein": 29,
      "carbs": 0,
      "fat": 1.7,
      "serving": 150,
      "tags": [
        "meat"
      ]
    },
    {
      "id": "beef",
      "fr": "Bœuf haché 5 % cuit",
      "en": "Cooked lean beef mince",
      "de": "Gegartes mageres Rinderhack",
      "kcal": 215,
      "protein": 26,
      "carbs": 0,
      "fat": 12,
      "serving": 150,
      "tags": [
        "meat"
      ]
    },
    {
      "id": "pork",
      "fr": "Filet mignon de porc cuit",
      "en": "Cooked pork tenderloin",
      "de": "Gegartes Schweinefilet",
      "kcal": 143,
      "protein": 26,
      "carbs": 0,
      "fat": 3.5,
      "serving": 150,
      "tags": [
        "meat",
        "pork"
      ]
    },
    {
      "id": "ham",
      "fr": "Jambon blanc",
      "en": "Cooked ham",
      "de": "Kochschinken",
      "kcal": 107,
      "protein": 18,
      "carbs": 1,
      "fat": 3.5,
      "serving": 50,
      "tags": [
        "meat",
        "pork"
      ]
    },
    {
      "id": "salmon",
      "fr": "Saumon cuit",
      "en": "Cooked salmon",
      "de": "Gegarter Lachs",
      "kcal": 208,
      "protein": 20,
      "carbs": 0,
      "fat": 13,
      "serving": 150,
      "tags": [
        "fish"
      ]
    },
    {
      "id": "tuna",
      "fr": "Thon au naturel",
      "en": "Tuna in water",
      "de": "Thunfisch im eigenen Saft",
      "kcal": 116,
      "protein": 26,
      "carbs": 0,
      "fat": 1,
      "serving": 100,
      "tags": [
        "fish"
      ]
    },
    {
      "id": "white-fish",
      "fr": "Cabillaud cuit",
      "en": "Cooked cod",
      "de": "Gegarter Kabeljau",
      "kcal": 82,
      "protein": 18,
      "carbs": 0,
      "fat": 0.7,
      "serving": 150,
      "tags": [
        "fish"
      ]
    },
    {
      "id": "shrimp",
      "fr": "Crevettes cuites",
      "en": "Cooked shrimp",
      "de": "Gegarte Garnelen",
      "kcal": 99,
      "protein": 24,
      "carbs": 0.2,
      "fat": 0.3,
      "serving": 120,
      "tags": [
        "fish"
      ]
    },
    {
      "id": "tofu",
      "fr": "Tofu ferme",
      "en": "Firm tofu",
      "de": "Fester Tofu",
      "kcal": 144,
      "protein": 17,
      "carbs": 3,
      "fat": 9,
      "serving": 150,
      "tags": [
        "soy"
      ]
    },
    {
      "id": "tempeh",
      "fr": "Tempeh",
      "en": "Tempeh",
      "de": "Tempeh",
      "kcal": 192,
      "protein": 20,
      "carbs": 8,
      "fat": 11,
      "serving": 100,
      "tags": [
        "soy"
      ]
    },
    {
      "id": "lentils",
      "fr": "Lentilles cuites",
      "en": "Cooked lentils",
      "de": "Gekochte Linsen",
      "kcal": 116,
      "protein": 9,
      "carbs": 20,
      "fat": 0.4,
      "serving": 150,
      "tags": []
    },
    {
      "id": "chickpeas",
      "fr": "Pois chiches cuits",
      "en": "Cooked chickpeas",
      "de": "Gekochte Kichererbsen",
      "kcal": 164,
      "protein": 8.9,
      "carbs": 27,
      "fat": 2.6,
      "serving": 150,
      "tags": []
    },
    {
      "id": "black-beans",
      "fr": "Haricots noirs cuits",
      "en": "Cooked black beans",
      "de": "Gekochte schwarze Bohnen",
      "kcal": 132,
      "protein": 8.9,
      "carbs": 24,
      "fat": 0.5,
      "serving": 150,
      "tags": []
    },
    {
      "id": "rice",
      "fr": "Riz cuit",
      "en": "Cooked rice",
      "de": "Gekochter Reis",
      "kcal": 130,
      "protein": 2.7,
      "carbs": 28,
      "fat": 0.3,
      "serving": 200,
      "tags": []
    },
    {
      "id": "pasta",
      "fr": "Pâtes cuites",
      "en": "Cooked pasta",
      "de": "Gekochte Nudeln",
      "kcal": 158,
      "protein": 6,
      "carbs": 31,
      "fat": 0.9,
      "serving": 200,
      "tags": [
        "gluten"
      ]
    },
    {
      "id": "couscous",
      "fr": "Semoule cuite",
      "en": "Cooked couscous",
      "de": "Gekochter Couscous",
      "kcal": 112,
      "protein": 3.8,
      "carbs": 23,
      "fat": 0.2,
      "serving": 200,
      "tags": [
        "gluten"
      ]
    },
    {
      "id": "potato",
      "fr": "Pommes de terre cuites",
      "en": "Boiled potatoes",
      "de": "Gekochte Kartoffeln",
      "kcal": 87,
      "protein": 1.9,
      "carbs": 20,
      "fat": 0.1,
      "serving": 200,
      "tags": []
    },
    {
      "id": "sweet-potato",
      "fr": "Patate douce cuite",
      "en": "Cooked sweet potato",
      "de": "Gegarte Süßkartoffel",
      "kcal": 90,
      "protein": 2,
      "carbs": 21,
      "fat": 0.2,
      "serving": 200,
      "tags": []
    },
    {
      "id": "quinoa",
      "fr": "Quinoa cuit",
      "en": "Cooked quinoa",
      "de": "Gekochte Quinoa",
      "kcal": 120,
      "protein": 4.4,
      "carbs": 21,
      "fat": 1.9,
      "serving": 185,
      "tags": []
    },
    {
      "id": "broccoli",
      "fr": "Brocolis",
      "en": "Broccoli",
      "de": "Brokkoli",
      "kcal": 35,
      "protein": 2.4,
      "carbs": 7,
      "fat": 0.4,
      "serving": 150,
      "tags": [],
      "keepsPortion": true
    },
    {
      "id": "green-beans",
      "fr": "Haricots verts",
      "en": "Green beans",
      "de": "Grüne Bohnen",
      "kcal": 31,
      "protein": 1.8,
      "carbs": 7,
      "fat": 0.1,
      "serving": 150,
      "tags": [],
      "keepsPortion": true
    },
    {
      "id": "spinach",
      "fr": "Épinards",
      "en": "Spinach",
      "de": "Spinat",
      "kcal": 23,
      "protein": 2.9,
      "carbs": 3.6,
      "fat": 0.4,
      "serving": 100,
      "tags": [],
      "keepsPortion": true
    },
    {
      "id": "salad",
      "fr": "Salade verte",
      "en": "Green salad",
      "de": "Grüner Salat",
      "kcal": 17,
      "protein": 1.2,
      "carbs": 3.3,
      "fat": 0.2,
      "serving": 100,
      "tags": [],
      "keepsPortion": true
    },
    {
      "id": "tomato",
      "fr": "Tomates",
      "en": "Tomatoes",
      "de": "Tomaten",
      "kcal": 18,
      "protein": 0.9,
      "carbs": 3.9,
      "fat": 0.2,
      "serving": 100,
      "tags": [],
      "keepsPortion": true
    },
    {
      "id": "mixed-veg",
      "fr": "Poêlée de légumes",
      "en": "Mixed vegetables",
      "de": "Gemüsepfanne",
      "kcal": 40,
      "protein": 1.5,
      "carbs": 7,
      "fat": 0.5,
      "serving": 150,
      "tags": [],
      "keepsPortion": true
    },
    {
      "id": "olive-oil",
      "fr": "Huile d’olive",
      "en": "Olive oil",
      "de": "Olivenöl",
      "kcal": 884,
      "protein": 0,
      "carbs": 0,
      "fat": 100,
      "serving": 14,
      "tags": []
    },
    {
      "id": "avocado",
      "fr": "Avocat",
      "en": "Avocado",
      "de": "Avocado",
      "kcal": 160,
      "protein": 2,
      "carbs": 9,
      "fat": 15,
      "serving": 100,
      "tags": []
    },
    {
      "id": "feta",
      "fr": "Feta",
      "en": "Feta",
      "de": "Feta",
      "kcal": 264,
      "protein": 14,
      "carbs": 4,
      "fat": 21,
      "serving": 30,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "mozzarella",
      "fr": "Mozzarella",
      "en": "Mozzarella",
      "de": "Mozzarella",
      "kcal": 250,
      "protein": 18,
      "carbs": 2,
      "fat": 19,
      "serving": 30,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "parmesan",
      "fr": "Parmesan",
      "en": "Parmesan",
      "de": "Parmesan",
      "kcal": 431,
      "protein": 38,
      "carbs": 4,
      "fat": 29,
      "serving": 15,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "hummus",
      "fr": "Houmous",
      "en": "Hummus",
      "de": "Hummus",
      "kcal": 166,
      "protein": 8,
      "carbs": 14,
      "fat": 10,
      "serving": 50,
      "tags": []
    },
    {
      "id": "whey",
      "fr": "Protéine en poudre (whey)",
      "en": "Whey protein powder",
      "de": "Whey-Proteinpulver",
      "kcal": 400,
      "protein": 80,
      "carbs": 8,
      "fat": 6,
      "serving": 30,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "vegan-protein",
      "fr": "Protéine végétale en poudre",
      "en": "Plant protein powder",
      "de": "Pflanzliches Proteinpulver",
      "kcal": 380,
      "protein": 75,
      "carbs": 8,
      "fat": 6,
      "serving": 30,
      "tags": [
        "soy"
      ]
    },
    {
      "id": "chicken-thigh",
      "fr": "Cuisse de poulet cuite",
      "en": "Cooked chicken thigh",
      "de": "Hähnchenschenkel, gegart",
      "kcal": 209,
      "protein": 26,
      "carbs": 0,
      "fat": 11,
      "serving": 150,
      "tags": [
        "meat"
      ]
    },
    {
      "id": "egg-white",
      "fr": "Blanc d’œuf",
      "en": "Egg white",
      "de": "Eiweiß",
      "kcal": 52,
      "protein": 11,
      "carbs": 0.7,
      "fat": 0.2,
      "serving": 33,
      "tags": [
        "egg"
      ]
    },
    {
      "id": "brown-rice",
      "fr": "Riz complet cuit",
      "en": "Cooked brown rice",
      "de": "Naturreis, gekocht",
      "kcal": 123,
      "protein": 2.7,
      "carbs": 26,
      "fat": 1,
      "serving": 200,
      "tags": []
    },
    {
      "id": "white-bread",
      "fr": "Pain blanc",
      "en": "White bread",
      "de": "Weißbrot",
      "kcal": 265,
      "protein": 9,
      "carbs": 49,
      "fat": 3.2,
      "serving": 40,
      "tags": [
        "gluten"
      ]
    },
    {
      "id": "cornflakes",
      "fr": "Corn-flakes",
      "en": "Cornflakes",
      "de": "Cornflakes",
      "kcal": 357,
      "protein": 7,
      "carbs": 84,
      "fat": 0.4,
      "serving": 40,
      "tags": []
    },
    {
      "id": "greek-yogurt-full",
      "fr": "Yaourt grec entier",
      "en": "Full-fat Greek yogurt",
      "de": "Griechischer Joghurt, vollfett",
      "kcal": 97,
      "protein": 9,
      "carbs": 4,
      "fat": 5,
      "serving": 170,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "whole-milk",
      "fr": "Lait entier",
      "en": "Whole milk",
      "de": "Vollmilch",
      "kcal": 61,
      "protein": 3.2,
      "carbs": 4.8,
      "fat": 3.3,
      "serving": 250,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "skimmed-milk",
      "fr": "Lait écrémé",
      "en": "Skimmed milk",
      "de": "Magermilch",
      "kcal": 34,
      "protein": 3.4,
      "carbs": 5,
      "fat": 0.1,
      "serving": 250,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "cheddar",
      "fr": "Cheddar",
      "en": "Cheddar",
      "de": "Cheddar",
      "kcal": 402,
      "protein": 25,
      "carbs": 1.3,
      "fat": 33,
      "serving": 30,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "carrot",
      "fr": "Carotte",
      "en": "Carrot",
      "de": "Karotte",
      "kcal": 41,
      "protein": 0.9,
      "carbs": 10,
      "fat": 0.2,
      "serving": 80,
      "tags": []
    },
    {
      "id": "orange",
      "fr": "Orange",
      "en": "Orange",
      "de": "Orange",
      "kcal": 47,
      "protein": 0.9,
      "carbs": 12,
      "fat": 0.1,
      "serving": 130,
      "tags": []
    },
    {
      "id": "strawberries",
      "fr": "Fraises",
      "en": "Strawberries",
      "de": "Erdbeeren",
      "kcal": 32,
      "protein": 0.7,
      "carbs": 7.7,
      "fat": 0.3,
      "serving": 100,
      "tags": []
    },
    {
      "id": "dark-chocolate",
      "fr": "Chocolat noir 70 %",
      "en": "Dark chocolate (70%)",
      "de": "Zartbitterschokolade (70 %)",
      "kcal": 598,
      "protein": 7.8,
      "carbs": 46,
      "fat": 43,
      "serving": 25,
      "tags": [
        "lactose"
      ]
    },
    {
      "id": "protein-bar",
      "fr": "Barre protéinée",
      "en": "Protein bar",
      "de": "Proteinriegel",
      "kcal": 350,
      "protein": 30,
      "carbs": 35,
      "fat": 9,
      "serving": 60,
      "tags": [
        "lactose"
      ]
    }
  ]
}') ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value) VALUES ('meal_ideas', '[
  {
    "id": "porridge",
    "fr": "Porridge banane et miel",
    "en": "Banana and honey porridge",
    "de": "Porridge mit Banane und Honig",
    "slot": "breakfast",
    "items": [
      [
        "oats",
        60
      ],
      [
        "milk",
        250
      ],
      [
        "banana",
        100
      ],
      [
        "honey",
        10
      ]
    ]
  },
  {
    "id": "porridge-vegan",
    "fr": "Porridge végétal aux fruits rouges",
    "en": "Plant-based berry porridge",
    "de": "Pflanzlicher Beeren-Porridge",
    "slot": "breakfast",
    "items": [
      [
        "oats",
        60
      ],
      [
        "soy-drink",
        250
      ],
      [
        "berries",
        100
      ],
      [
        "almonds",
        15
      ]
    ]
  },
  {
    "id": "skyr-bowl",
    "fr": "Bol de skyr, flocons et fruits rouges",
    "en": "Skyr bowl with oats and berries",
    "de": "Skyr-Bowl mit Haferflocken und Beeren",
    "slot": "breakfast",
    "items": [
      [
        "skyr",
        200
      ],
      [
        "berries",
        100
      ],
      [
        "oats",
        40
      ],
      [
        "honey",
        10
      ]
    ]
  },
  {
    "id": "eggs-toast",
    "fr": "Œufs brouillés sur pain complet",
    "en": "Scrambled eggs on wholemeal toast",
    "de": "Rührei auf Vollkornbrot",
    "slot": "breakfast",
    "items": [
      [
        "egg",
        110
      ],
      [
        "bread",
        70
      ],
      [
        "tomato",
        100
      ],
      [
        "olive-oil",
        5
      ]
    ]
  },
  {
    "id": "pb-toast",
    "fr": "Tartines beurre de cacahuète et banane",
    "en": "Peanut butter and banana toast",
    "de": "Erdnussbutter-Bananen-Brot",
    "slot": "breakfast",
    "items": [
      [
        "bread",
        80
      ],
      [
        "peanut-butter",
        25
      ],
      [
        "banana",
        120
      ]
    ]
  },
  {
    "id": "tofu-scramble",
    "fr": "Brouillade de tofu aux épinards",
    "en": "Tofu scramble with spinach",
    "de": "Tofu-Rührei mit Spinat",
    "slot": "breakfast",
    "items": [
      [
        "tofu",
        150
      ],
      [
        "bread",
        60
      ],
      [
        "spinach",
        60
      ],
      [
        "olive-oil",
        5
      ]
    ]
  },
  {
    "id": "yogurt-nuts",
    "fr": "Yaourt grec, pomme et noix",
    "en": "Greek yogurt, apple and walnuts",
    "de": "Griechischer Joghurt mit Apfel und Walnüssen",
    "slot": "breakfast",
    "items": [
      [
        "greek-yogurt",
        250
      ],
      [
        "apple",
        150
      ],
      [
        "walnuts",
        20
      ],
      [
        "oats",
        30
      ]
    ]
  },
  {
    "id": "eggs-avocado",
    "fr": "Œufs, avocat et galettes de riz",
    "en": "Eggs, avocado and rice cakes",
    "de": "Eier, Avocado und Reiswaffeln",
    "slot": "breakfast",
    "items": [
      [
        "egg",
        165
      ],
      [
        "avocado",
        70
      ],
      [
        "tomato",
        100
      ],
      [
        "rice-cakes",
        27
      ]
    ]
  },
  {
    "id": "smoothie",
    "fr": "Smoothie protéiné banane",
    "en": "Banana protein smoothie",
    "de": "Bananen-Protein-Smoothie",
    "slot": "breakfast",
    "items": [
      [
        "milk",
        250
      ],
      [
        "banana",
        120
      ],
      [
        "whey",
        30
      ],
      [
        "oats",
        30
      ]
    ]
  },
  {
    "id": "vegan-smoothie",
    "fr": "Smoothie végétal aux fruits rouges",
    "en": "Plant-based berry smoothie",
    "de": "Pflanzlicher Beeren-Smoothie",
    "slot": "breakfast",
    "items": [
      [
        "soy-drink",
        300
      ],
      [
        "banana",
        120
      ],
      [
        "vegan-protein",
        25
      ],
      [
        "berries",
        100
      ]
    ]
  },
  {
    "id": "rice-cakes-pb",
    "fr": "Galettes de riz, cacahuète et banane",
    "en": "Rice cakes, peanut butter and banana",
    "de": "Reiswaffeln mit Erdnussbutter und Banane",
    "slot": "breakfast",
    "items": [
      [
        "rice-cakes",
        36
      ],
      [
        "peanut-butter",
        25
      ],
      [
        "banana",
        120
      ],
      [
        "soy-drink",
        200
      ]
    ]
  },
  {
    "id": "chicken-rice",
    "fr": "Poulet, riz et brocolis",
    "en": "Chicken, rice and broccoli",
    "de": "Hähnchen mit Reis und Brokkoli",
    "slot": "main",
    "items": [
      [
        "chicken",
        150
      ],
      [
        "rice",
        200
      ],
      [
        "broccoli",
        150
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "salmon-potatoes",
    "fr": "Saumon, pommes de terre et haricots verts",
    "en": "Salmon, potatoes and green beans",
    "de": "Lachs mit Kartoffeln und grünen Bohnen",
    "slot": "main",
    "items": [
      [
        "salmon",
        150
      ],
      [
        "potato",
        250
      ],
      [
        "green-beans",
        150
      ],
      [
        "olive-oil",
        5
      ]
    ]
  },
  {
    "id": "bolognese",
    "fr": "Pâtes bolognaise",
    "en": "Pasta bolognese",
    "de": "Spaghetti Bolognese",
    "slot": "main",
    "items": [
      [
        "beef",
        120
      ],
      [
        "pasta",
        220
      ],
      [
        "tomato",
        150
      ],
      [
        "parmesan",
        10
      ],
      [
        "olive-oil",
        5
      ]
    ]
  },
  {
    "id": "tuna-pasta",
    "fr": "Salade de pâtes au thon",
    "en": "Tuna pasta salad",
    "de": "Nudelsalat mit Thunfisch",
    "slot": "main",
    "items": [
      [
        "tuna",
        120
      ],
      [
        "pasta",
        200
      ],
      [
        "tomato",
        100
      ],
      [
        "salad",
        50
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "lentil-curry",
    "fr": "Curry de lentilles et riz",
    "en": "Lentil curry with rice",
    "de": "Linsencurry mit Reis",
    "slot": "main",
    "items": [
      [
        "lentils",
        250
      ],
      [
        "rice",
        150
      ],
      [
        "spinach",
        100
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "buddha-bowl",
    "fr": "Buddha bowl pois chiches et quinoa",
    "en": "Chickpea and quinoa buddha bowl",
    "de": "Buddha-Bowl mit Kichererbsen und Quinoa",
    "slot": "main",
    "items": [
      [
        "chickpeas",
        200
      ],
      [
        "quinoa",
        150
      ],
      [
        "avocado",
        50
      ],
      [
        "salad",
        50
      ],
      [
        "tomato",
        100
      ],
      [
        "olive-oil",
        5
      ]
    ]
  },
  {
    "id": "tofu-stir-fry",
    "fr": "Wok de tofu, riz et légumes",
    "en": "Tofu stir-fry with rice and vegetables",
    "de": "Tofu-Wok mit Reis und Gemüse",
    "slot": "main",
    "items": [
      [
        "tofu",
        200
      ],
      [
        "rice",
        200
      ],
      [
        "mixed-veg",
        200
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "turkey-wrap",
    "fr": "Wraps à la dinde et houmous",
    "en": "Turkey and hummus wraps",
    "de": "Wraps mit Pute und Hummus",
    "slot": "main",
    "items": [
      [
        "turkey",
        120
      ],
      [
        "wrap",
        120
      ],
      [
        "salad",
        50
      ],
      [
        "tomato",
        80
      ],
      [
        "hummus",
        30
      ]
    ]
  },
  {
    "id": "cod-sweet-potato",
    "fr": "Cabillaud, patate douce et brocolis",
    "en": "Cod, sweet potato and broccoli",
    "de": "Kabeljau mit Süßkartoffel und Brokkoli",
    "slot": "main",
    "items": [
      [
        "white-fish",
        180
      ],
      [
        "sweet-potato",
        250
      ],
      [
        "broccoli",
        150
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "pork-potatoes",
    "fr": "Filet mignon, pommes de terre et légumes",
    "en": "Pork tenderloin, potatoes and vegetables",
    "de": "Schweinefilet mit Kartoffeln und Gemüse",
    "slot": "main",
    "items": [
      [
        "pork",
        150
      ],
      [
        "potato",
        250
      ],
      [
        "mixed-veg",
        200
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "shrimp-quinoa",
    "fr": "Crevettes sautées et quinoa",
    "en": "Shrimp and quinoa stir-fry",
    "de": "Garnelen mit Quinoa und Gemüse",
    "slot": "main",
    "items": [
      [
        "shrimp",
        150
      ],
      [
        "quinoa",
        180
      ],
      [
        "mixed-veg",
        150
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "omelette-potatoes",
    "fr": "Omelette, pommes de terre et salade",
    "en": "Omelette, potatoes and salad",
    "de": "Omelett mit Kartoffeln und Salat",
    "slot": "main",
    "items": [
      [
        "egg",
        165
      ],
      [
        "potato",
        200
      ],
      [
        "salad",
        80
      ],
      [
        "olive-oil",
        5
      ]
    ]
  },
  {
    "id": "chili-sin-carne",
    "fr": "Chili sin carne",
    "en": "Chilli sin carne",
    "de": "Chili sin Carne",
    "slot": "main",
    "items": [
      [
        "black-beans",
        200
      ],
      [
        "rice",
        150
      ],
      [
        "tomato",
        150
      ],
      [
        "avocado",
        40
      ]
    ]
  },
  {
    "id": "chicken-couscous",
    "fr": "Couscous au poulet et légumes",
    "en": "Chicken and vegetable couscous",
    "de": "Couscous mit Hähnchen und Gemüse",
    "slot": "main",
    "items": [
      [
        "chicken",
        140
      ],
      [
        "couscous",
        200
      ],
      [
        "mixed-veg",
        200
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "greek-salad",
    "fr": "Salade grecque, pois chiches et pain",
    "en": "Greek salad with chickpeas and bread",
    "de": "Griechischer Salat mit Kichererbsen und Brot",
    "slot": "main",
    "items": [
      [
        "feta",
        80
      ],
      [
        "chickpeas",
        120
      ],
      [
        "tomato",
        150
      ],
      [
        "salad",
        80
      ],
      [
        "bread",
        60
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "beef-potato-salad",
    "fr": "Bœuf haché, pommes de terre et salade",
    "en": "Beef, potatoes and salad",
    "de": "Rinderhack mit Kartoffeln und Salat",
    "slot": "main",
    "items": [
      [
        "beef",
        140
      ],
      [
        "potato",
        250
      ],
      [
        "salad",
        80
      ],
      [
        "olive-oil",
        5
      ]
    ]
  },
  {
    "id": "salmon-bowl",
    "fr": "Bowl saumon, riz et avocat",
    "en": "Salmon, rice and avocado bowl",
    "de": "Bowl mit Lachs, Reis und Avocado",
    "slot": "main",
    "items": [
      [
        "salmon",
        140
      ],
      [
        "rice",
        200
      ],
      [
        "avocado",
        40
      ],
      [
        "spinach",
        60
      ]
    ]
  },
  {
    "id": "tempeh-bowl",
    "fr": "Bowl tempeh, quinoa et brocolis",
    "en": "Tempeh, quinoa and broccoli bowl",
    "de": "Bowl mit Tempeh, Quinoa und Brokkoli",
    "slot": "main",
    "items": [
      [
        "tempeh",
        150
      ],
      [
        "quinoa",
        180
      ],
      [
        "broccoli",
        150
      ],
      [
        "olive-oil",
        5
      ]
    ]
  },
  {
    "id": "pesto-chicken",
    "fr": "Pâtes au poulet, épinards et parmesan",
    "en": "Chicken pasta with spinach and parmesan",
    "de": "Nudeln mit Hähnchen, Spinat und Parmesan",
    "slot": "main",
    "items": [
      [
        "chicken",
        120
      ],
      [
        "pasta",
        200
      ],
      [
        "spinach",
        80
      ],
      [
        "parmesan",
        15
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "caprese",
    "fr": "Pâtes tomate-mozzarella",
    "en": "Tomato and mozzarella pasta",
    "de": "Nudeln mit Tomate und Mozzarella",
    "slot": "main",
    "items": [
      [
        "mozzarella",
        125
      ],
      [
        "pasta",
        200
      ],
      [
        "tomato",
        150
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "ham-potatoes",
    "fr": "Jambon, pommes de terre et haricots verts",
    "en": "Ham, potatoes and green beans",
    "de": "Schinken mit Kartoffeln und grünen Bohnen",
    "slot": "main",
    "items": [
      [
        "ham",
        100
      ],
      [
        "potato",
        250
      ],
      [
        "green-beans",
        150
      ],
      [
        "olive-oil",
        5
      ]
    ]
  },
  {
    "id": "lentil-salad",
    "fr": "Salade de lentilles à l’œuf",
    "en": "Lentil salad with egg",
    "de": "Linsensalat mit Ei",
    "slot": "main",
    "items": [
      [
        "lentils",
        200
      ],
      [
        "egg",
        110
      ],
      [
        "tomato",
        100
      ],
      [
        "salad",
        50
      ],
      [
        "olive-oil",
        10
      ]
    ]
  },
  {
    "id": "yogurt-honey",
    "fr": "Yaourt grec au miel",
    "en": "Greek yogurt with honey",
    "de": "Griechischer Joghurt mit Honig",
    "slot": "snack",
    "items": [
      [
        "greek-yogurt",
        200
      ],
      [
        "honey",
        15
      ]
    ]
  },
  {
    "id": "banana-pb",
    "fr": "Banane et beurre de cacahuète",
    "en": "Banana and peanut butter",
    "de": "Banane mit Erdnussbutter",
    "slot": "snack",
    "items": [
      [
        "banana",
        120
      ],
      [
        "peanut-butter",
        20
      ]
    ]
  },
  {
    "id": "rice-cakes-hummus",
    "fr": "Galettes de riz et houmous",
    "en": "Rice cakes and hummus",
    "de": "Reiswaffeln mit Hummus",
    "slot": "snack",
    "items": [
      [
        "rice-cakes",
        27
      ],
      [
        "hummus",
        60
      ]
    ]
  },
  {
    "id": "shake",
    "fr": "Shake protéiné au lait",
    "en": "Protein shake with milk",
    "de": "Proteinshake mit Milch",
    "slot": "snack",
    "items": [
      [
        "whey",
        30
      ],
      [
        "milk",
        250
      ]
    ]
  },
  {
    "id": "cottage-berries",
    "fr": "Cottage cheese et fruits rouges",
    "en": "Cottage cheese and berries",
    "de": "Hüttenkäse mit Beeren",
    "slot": "snack",
    "items": [
      [
        "cottage",
        150
      ],
      [
        "berries",
        100
      ]
    ]
  },
  {
    "id": "apple-almonds",
    "fr": "Pomme et amandes",
    "en": "Apple and almonds",
    "de": "Apfel und Mandeln",
    "slot": "snack",
    "items": [
      [
        "apple",
        150
      ],
      [
        "almonds",
        25
      ]
    ]
  },
  {
    "id": "dates-soy",
    "fr": "Dattes et boisson de soja",
    "en": "Dates and soy drink",
    "de": "Datteln und Sojadrink",
    "slot": "snack",
    "items": [
      [
        "dates",
        40
      ],
      [
        "soy-drink",
        250
      ]
    ]
  },
  {
    "id": "vegan-shake",
    "fr": "Shake végétal à la banane",
    "en": "Plant-based banana shake",
    "de": "Pflanzlicher Bananenshake",
    "slot": "snack",
    "items": [
      [
        "vegan-protein",
        30
      ],
      [
        "soy-drink",
        250
      ],
      [
        "banana",
        100
      ]
    ]
  },
  {
    "id": "eggs-bread",
    "fr": "Œufs durs et pain",
    "en": "Boiled eggs and bread",
    "de": "Gekochte Eier und Brot",
    "slot": "snack",
    "items": [
      [
        "egg",
        110
      ],
      [
        "bread",
        40
      ]
    ]
  }
]') ON CONFLICT (key) DO NOTHING;

COMMIT;
