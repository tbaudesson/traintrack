/**
 * Demonstration videos for the moves of the timed sessions, the warm-ups and
 * the stretches, keyed by the library's English name or by the move's key.
 * Library exercises also carry theirs in the database (migration 041), which
 * an admin can change; a link set there wins over this list.
 */
export const DEMO_VIDEOS: Record<string, string> = {
  Burpee: "https://www.youtube.com/watch?v=NCqbpkoiyXE",
  "Bodyweight Squat": "https://www.youtube.com/watch?v=P-yaD24bUE8",
  "Jump Squat": "https://www.youtube.com/watch?v=BRfxI2Es2lE",
  "Mountain Climber": "https://www.youtube.com/watch?v=cnyTQDSE884",
  "Jumping Jack": "https://www.youtube.com/watch?v=nGaXj3kkmrU",
  "High Knees": "https://www.youtube.com/watch?v=oDdkytliOqE",
  "Reverse Lunge": "https://www.youtube.com/watch?v=xrPteyQLGAo",
  "Jumping Lunge": "https://www.youtube.com/watch?v=FyxFYIV8wKU",
  "Skater Jump": "https://www.youtube.com/watch?v=9_jLW6VkU8A",
  "Wall Sit": "https://www.youtube.com/watch?v=cWTZ8Am1Ee0",
  Inchworm: "https://www.youtube.com/watch?v=SCJ9qcNPEOQ",
  "Plank Shoulder Tap": "https://www.youtube.com/watch?v=0PrTUpElJ44",
  "Bicycle Crunch": "https://www.youtube.com/watch?v=HWX93vAoLvw",
  "Flutter Kicks": "https://www.youtube.com/watch?v=K5wuM_gNWyw",
  Crunch: "https://www.youtube.com/watch?v=0t4t3IpiEao",
  "Lying Leg Raise": "https://www.youtube.com/watch?v=JB2oyawG9KI",
  "Hollow Hold": "https://www.youtube.com/watch?v=jLxtFNO0r50",
  "Goblet Squat": "https://www.youtube.com/watch?v=gCESNsDsbqk",
  "Dumbbell Thruster": "https://www.youtube.com/watch?v=1KYPZ-Jzo3w",
  "Dumbbell Swing": "https://www.youtube.com/watch?v=-lcFhjRImQk",
  "Renegade Row": "https://www.youtube.com/watch?v=wTqlJ0aoJlM",
  "Dumbbell Romanian Deadlift": "https://www.youtube.com/watch?v=hQgFixeXdZo",
  "Dumbbell Reverse Lunge": "https://www.youtube.com/watch?v=UoQcIFYTN_o",
  "Dumbbell Sumo Squat": "https://www.youtube.com/watch?v=MwNY25e4QEA",
  "Dumbbell Push Press": "https://www.youtube.com/watch?v=4tCaD42ghlc",
  "Dumbbell Woodchop": "https://www.youtube.com/watch?v=Rf-2l8Z40dg",
  // Timed sessions, added with migration 053.
  "Butt Kicks": "https://www.youtube.com/watch?v=oMW59TKZvaI",
  "Fast Feet": "https://www.youtube.com/watch?v=eT5M1goPDhY",
  "Lateral Shuffle": "https://www.youtube.com/watch?v=4z_-ALzJzug",
  "Step Jack": "https://www.youtube.com/watch?v=oyEFuCjlVng",
  "Standing Knee Drive": "https://www.youtube.com/watch?v=pp1Fgo8Axk0",
  "Star Jump": "https://www.youtube.com/watch?v=lkYtECQYrWo",
  "Broad Jump": "https://www.youtube.com/watch?v=uhz-ia-2UcM",
  "Shadow Boxing": "https://www.youtube.com/watch?v=J4j3AOVWuHE",
  "Squat Thrust": "https://www.youtube.com/watch?v=Id-g0YHkuVo",
  "Plank Jack": "https://www.youtube.com/watch?v=ae4vQc80jtE",
  "Bear Crawl": "https://www.youtube.com/watch?v=-9L3rTrYo4Q",
  "Sumo Squat": "https://www.youtube.com/watch?v=ksmxuw3JDbQ",
  "Squat Pulse": "https://www.youtube.com/watch?v=QV0KBKANprw",
  "Lateral Lunge": "https://www.youtube.com/watch?v=apsp_uuXZTU",
  "Curtsy Lunge": "https://www.youtube.com/watch?v=2EyH9MN7hYE",
  "Split Squat": "https://www.youtube.com/watch?v=qtblVwEz2a8",
  "Cossack Squat": "https://www.youtube.com/watch?v=fjx7M_m50Y8",
  "Single-Leg Glute Bridge": "https://www.youtube.com/watch?v=3NXv0Nany-Q",
  "Bodyweight Calf Raise": "https://www.youtube.com/watch?v=Wh8EXjjr6JU",
  "Good Morning": "https://www.youtube.com/watch?v=61zbhuRiwQg",
  "Donkey Kick": "https://www.youtube.com/watch?v=EtSJ8rwm5M8",
  "Fire Hydrant": "https://www.youtube.com/watch?v=W2PNcNCfIF4",
  "Knee Push-up": "https://www.youtube.com/watch?v=fa9hNURBT-c",
  "Incline Push-up": "https://www.youtube.com/watch?v=-9S9gdRwwak",
  "Diamond Push-up": "https://www.youtube.com/watch?v=_4EGPVJuqfA",
  "Pike Push-up": "https://www.youtube.com/watch?v=pHR5yG6xBps",
  "Bench Dip": "https://www.youtube.com/watch?v=AWz_7B1cch0",
  "Heel Taps": "https://www.youtube.com/watch?v=jfXcyLTuKP4",
  "Reverse Crunch": "https://www.youtube.com/watch?v=hQ1QoEOojM0",
  "Scissor Kicks": "https://www.youtube.com/watch?v=BQp3rNsKtpo",
  "V-up": "https://www.youtube.com/watch?v=iP2fjvG0g3w",
  "Sit-up": "https://www.youtube.com/watch?v=fTxaDVXhMnw",
  "Standing Oblique Crunch": "https://www.youtube.com/watch?v=fFHR8bDdS_4",
  "Glute Bridge Hold": "https://www.youtube.com/watch?v=cmkMMjo0fRo",
  "Side Plank Hip Dip": "https://www.youtube.com/watch?v=9AntSHKxHlA",
  "Dumbbell Bent-Over Row": "https://www.youtube.com/watch?v=vhSH7vuOp-M",
  "Dumbbell Floor Press": "https://www.youtube.com/watch?v=T0Y3OBF1bNI",
  "Dumbbell Curl to Press": "https://www.youtube.com/watch?v=HtiY7tWu96s",
  "Dumbbell Lateral Lunge": "https://www.youtube.com/watch?v=tMhFVIiPtQM",
  "Dumbbell Glute Bridge": "https://www.youtube.com/watch?v=K4zsUnHchJ8",
  "Dumbbell Hammer Curl": "https://www.youtube.com/watch?v=zC3nLlEvin4",
  "Bird Dog": "https://www.youtube.com/watch?v=KA0ekfSePrQ",
  // Already curated in the database by migration 020.
  Plank: "https://www.youtube.com/watch?v=A2b2EmIg0dA",
  "Push-up": "https://www.youtube.com/watch?v=WDIpL0pjun0",
  "Side Plank": "https://www.youtube.com/watch?v=N_s9em1xTqU",
  "Dead Bug": "https://www.youtube.com/watch?v=GbSC02oU3To",
  "Glute Bridge": "https://www.youtube.com/watch?v=L9KZfxT654Y",
  "Russian Twist": "https://www.youtube.com/watch?v=IJDOoVyVjhc",
  "Handstand Hold": "https://www.youtube.com/watch?v=mVDE6S-ZvRI",
  "Single-Leg Balance": "https://www.youtube.com/watch?v=Dtgh2_LFkBQ",
  "Arabesque Hold": "https://www.youtube.com/watch?v=YoJ9ycg8Txs",
  "Superman Hold": "https://www.youtube.com/watch?v=J9zXkxUAfUA",
  "Tuck Jump": "https://www.youtube.com/watch?v=-bnJGikRGsM",
  "Bridge Hold": "https://www.youtube.com/watch?v=otoDVplyg9w",
  "Front Split Stretch": "https://www.youtube.com/watch?v=KT17i9TdnDM",
  "Pike Stretch": "https://www.youtube.com/watch?v=hD5NGPhyEGc",
  "arm-circles": "https://www.youtube.com/watch?v=UVMEnIaY8aU",
  "arm-swings": "https://www.youtube.com/watch?v=AsMMF3YWIIM",
  "torso-twists": "https://www.youtube.com/watch?v=h6XyzlM8m24",
  "hip-circles": "https://www.youtube.com/watch?v=qkrJXGVj_OQ",
  "leg-swings": "https://www.youtube.com/watch?v=naW8u72lOzI",
  "knee-hug": "https://www.youtube.com/watch?v=s2emWIC58bI",
  "lunge-rotation": "https://www.youtube.com/watch?v=G65aplILBXs",
  "worlds-greatest": "https://www.youtube.com/watch?v=ftLV1SkpWAA",
  "scapular-pushup": "https://www.youtube.com/watch?v=tu9DyLjSd4Y",
  "cat-cow": "https://www.youtube.com/watch?v=1Y0YjXS9sKI",
  "neck-side": "https://www.youtube.com/watch?v=54y0JAT46vE",
  "chest-doorway": "https://www.youtube.com/watch?v=M850sCj9LHQ",
  "cross-shoulder": "https://www.youtube.com/watch?v=Pg0JvLSfWwM",
  triceps: "https://www.youtube.com/watch?v=MWzR-WE_nhU",
  "biceps-wall": "https://www.youtube.com/watch?v=BzPzDuIn1PA",
  "side-bend": "https://www.youtube.com/watch?v=Vko-SJok-fk",
  quad: "https://www.youtube.com/watch?v=j-KreYRNOCc",
  calf: "https://www.youtube.com/watch?v=_QWfhbIioy8",
  "hip-flexor": "https://www.youtube.com/watch?v=34SlL-PPCWQ",
  hamstring: "https://www.youtube.com/watch?v=u55F2jOzBVI",
  butterfly: "https://www.youtube.com/watch?v=MHwUChXNy-Y",
  pigeon: "https://www.youtube.com/watch?v=lqCqETr7Q0g",
  "spinal-twist": "https://www.youtube.com/watch?v=G28BnPX-tlA",
  cobra: "https://www.youtube.com/watch?v=JDcdhTuycOI",
  "childs-pose": "https://www.youtube.com/watch?v=LZgABs0IggM",
};

/** Warm-up moves that are library exercises share their demo. */
const SAME_AS: Record<string, string> = {
  "jumping-jack": "Jumping Jack",
  "high-knees": "High Knees",
  squat: "Bodyweight Squat",
  inchworm: "Inchworm",
  "glute-bridge": "Glute Bridge",
};

/** The demo of a warm-up move or a stretch, by its key. */
export const mobilityDemo = (key: string): string | null => DEMO_VIDEOS[key] ?? DEMO_VIDEOS[SAME_AS[key]] ?? null;

/** A link that plays inline: a specific YouTube or Vimeo video, not a search page. */
export const isPlayable = (url: string | null | undefined): url is string =>
  !!url && /(youtube\.com\/(watch\?v=|shorts\/|embed\/)|youtu\.be\/|vimeo\.com\/\d)/.test(url);

/** The demo of a move: the database's when it plays inline, else the list's. */
export function demoVideo(key: string, fromDatabase?: string | null): string | null {
  if (isPlayable(fromDatabase)) return fromDatabase;
  return DEMO_VIDEOS[key] ?? null;
}
