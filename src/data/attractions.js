// Famous Cebu tourist destinations shown on the Explore page.
// wikiTitle is looked up at runtime against Wikipedia's public summary API
// (see hooks/useWikiThumbnail.js) to show a real photo — not a hardcoded/
// guessed image URL. If a title has no article or thumbnail, the card falls
// back to an icon placeholder.
//
// nearestStopId points at the closest stop in db.js so "View Route" can
// pre-fill it as the search destination — the same jump-off pattern as a
// terminal chip. Several of these destinations (Busay/Beverly Hills hilltop
// spots, and the southern-Cebu towns) sit past where any jeepney in the
// verified route graph goes, so nearestStopId is the closest *reachable*
// jump-off, not the destination itself — the ride from there onward
// (habal-habal, or a South Bus Terminal coach) isn't part of the jeepney
// graph. See TerminalsPage for the Cebu South Bus Terminal serving the
// southern-Cebu destinations.
// Sources: cebudailynews.inquirer.net/728043, shellwanders.com (Temple of
// Leah, Sirao Garden), travelsetu.com (Cebu Taoist Temple), whycebu.com
// (Moalboal), phbus.com (Oslob/Kawasan via South Bus Terminal), various
// "how to get to Mactan Shrine" guides (Punta Engaño jeepneys).
export const attractions = [
  {
    id: "magellans-cross",
    name: "Magellan's Cross",
    location: "Colon, Downtown Cebu",
    description: "A 1521 wooden cross marking the arrival of Christianity in the Philippines, sheltered in a chapel beside the Basilica.",
    icon: "ti-cross",
    wikiTitle: "Magellan's Cross",
    nearestStopId: "basilica",
  },
  {
    id: "basilica-santo-nino",
    name: "Basilica del Santo Niño",
    location: "Osmeña Blvd, Downtown Cebu",
    description: "The oldest Roman Catholic church in the Philippines, home to the venerated Santo Niño relic.",
    icon: "ti-building-church",
    wikiTitle: "Basilica del Santo Niño, Cebu",
    nearestStopId: "basilica",
  },
  {
    id: "fort-san-pedro",
    name: "Fort San Pedro",
    location: "Plaza Independencia, Downtown Cebu",
    description: "The oldest and smallest Spanish-era fort in the Philippines, built in 1738 to guard the city.",
    icon: "ti-building-fortress",
    wikiTitle: "Fort San Pedro, Cebu",
    nearestStopId: "colon",
  },
  {
    id: "temple-of-leah",
    name: "Temple of Leah",
    location: "Busay, Cebu City (uphill)",
    description: "A Taj Mahal-inspired hilltop temple built as a monument to eternal love, with sweeping city views.",
    icon: "ti-building-castle",
    wikiTitle: "Temple of Leah",
    nearestStopId: "it-park",
  },
  {
    id: "taoist-temple",
    name: "Cebu Taoist Temple",
    location: "Beverly Hills, Lahug",
    description: "A colorful hillside Chinese temple with dragon staircases and incense courtyards.",
    icon: "ti-building-pavilion",
    wikiTitle: "Cebu Taoist Temple",
    nearestStopId: "it-park",
  },
  {
    id: "sirao-garden",
    name: "Sirao Garden",
    location: "Busay, Cebu City (uphill)",
    description: "Colorful hillside flower fields nicknamed \"Little Amsterdam\", popular for photos at golden hour.",
    icon: "ti-flower",
    wikiTitle: "Sirao Flower Garden",
    nearestStopId: "it-park",
  },
  {
    id: "tops",
    name: "Tops Lookout",
    location: "Busay, Cebu City (uphill)",
    description: "A mountaintop viewing deck above Temple of Leah with a panoramic view of Metro Cebu's skyline.",
    icon: "ti-binoculars",
    wikiTitle: "Tops Lookout",
    nearestStopId: "it-park",
  },
  {
    id: "kawasan-falls",
    name: "Kawasan Falls",
    location: "Matutinao, Badian (South Cebu)",
    description: "A turquoise three-tier waterfall in Badian and the Philippines' top canyoneering spot.",
    icon: "ti-droplet",
    wikiTitle: "Kawasan Falls",
    nearestStopId: "carbon",
  },
  {
    id: "moalboal",
    name: "Moalboal",
    location: "Moalboal, South Cebu",
    description: "A laid-back dive town famous for its sardine run and nearby Pescador Island.",
    icon: "ti-fish",
    wikiTitle: "Moalboal",
    nearestStopId: "carbon",
  },
  {
    id: "oslob",
    name: "Oslob",
    location: "Oslob, South Cebu",
    description: "Home to Cebu's famous whale shark watching, in the waters off southern Cebu.",
    icon: "ti-anchor",
    wikiTitle: "Oslob",
    nearestStopId: "carbon",
  },
  {
    id: "mactan-shrine",
    name: "Mactan Shrine",
    location: "Punta Engaño, Lapu-Lapu City, Mactan Island",
    description: "A monument honoring Lapu-Lapu, the chieftain who defeated Ferdinand Magellan here in 1521.",
    icon: "ti-award",
    wikiTitle: "Mactan Shrine",
    nearestStopId: "ayala",
  },
];
