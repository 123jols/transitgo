// Well-known Cebu City tourist spots reachable from the app's Home-tab jump-off
// points, with practical "what to ride" guidance. These are informational tips,
// not part of the verified jeepney route graph in db.js — habal-habal/tricycle
// legs and hill-climb spots (Busay, Beverly Hills) aren't served by any jeepney
// route, so they can't be modeled as graph edges the way the Home tab's search
// results are. Ride codes and fares are sourced from local jeepney-route guides
// and recent visitor "how to get there" write-ups, not invented.
// Sources: cebudailynews.inquirer.net/728043, shellwanders.com (Temple of Leah,
// Sirao Garden), travelsetu.com (Cebu Taoist Temple), 3d-universal.com (Parian
// heritage cluster).
//
// nearestStopId points at the closest stop in db.js so a tap can pre-fill it
// as the search destination — the same jump-off pattern as a terminal chip.
// Busay/Beverly Hills spots have no stop of their own (they sit past where any
// jeepney goes), so they point at "it-park", the closest real stop to the
// JY Square/Lahug jump-off named in the ride instructions.
export const attractions = [
  {
    id: "magellans-cross",
    name: "Magellan's Cross & Basilica del Santo Niño",
    area: "Colon, Downtown Cebu",
    blurb: "A 1521 landmark cross housed beside the country's oldest church.",
    ride: "Any Colon/Carbon-bound jeepney, alight at Colon Street, then a short walk",
    fare: "₱13 (minimum jeepney fare)",
    icon: "ti-cross",
    nearestStopId: "basilica",
  },
  {
    id: "fort-san-pedro",
    name: "Fort San Pedro",
    area: "Plaza Independencia, Downtown Cebu",
    blurb: "The oldest and smallest Spanish-era fort in the Philippines, right by the pier.",
    ride: "Same Colon-bound jeepneys, then ~10 min walk toward the pier",
    fare: "₱13",
    icon: "ti-building-fortress",
    nearestStopId: "colon",
  },
  {
    id: "parian-heritage",
    name: "Heritage of Cebu Monument, Casa Gorordo & Yap‑Sandiego House",
    area: "Parian, Downtown Cebu",
    blurb: "Three heritage stops within a few minutes' walk of each other — an easy mini walking tour.",
    ride: "Colon/Carbon-bound jeepney, alight at Colon Street, then walk to Mabini St / Parian",
    fare: "₱13",
    icon: "ti-building-monument",
    nearestStopId: "colon",
  },
  {
    id: "temple-of-leah",
    name: "Temple of Leah",
    area: "Busay, Cebu City (uphill)",
    blurb: "A Taj Mahal-inspired hilltop temple with sweeping city views.",
    ride: "Jeepney to JY Square (Lahug), then a Lahug–Busay jeepney (04D/04I/04H) or habal-habal uphill",
    fare: "₱13 jeepney + ₱100–150 habal-habal per person",
    icon: "ti-building-castle",
    nearestStopId: "it-park",
  },
  {
    id: "sirao-garden",
    name: "Sirao Flower Garden",
    area: "Busay, Cebu City (uphill)",
    blurb: "Colorful flower fields nicknamed \"Little Amsterdam\", near Temple of Leah.",
    ride: "Same jump-off as Temple of Leah — JY Square, then a Lahug–Busay jeepney toward the Sirao turnoff, or habal-habal",
    fare: "₱13–25 jeepney + ~₱100 habal-habal per person",
    icon: "ti-flower",
    nearestStopId: "it-park",
  },
  {
    id: "taoist-temple",
    name: "Cebu Taoist Temple",
    area: "Beverly Hills, Lahug",
    blurb: "A hillside Chinese temple with dragon staircases and skyline views.",
    ride: "Jeepney toward Lahug/JY Square (e.g. 04L), alight at the Beverly Hills gate, then a steep 20–30 min walk or short habal-habal/tricycle",
    fare: "₱13 jeepney + ₱50–100 habal-habal/tricycle",
    icon: "ti-building-pavilion",
    nearestStopId: "it-park",
  },
];
