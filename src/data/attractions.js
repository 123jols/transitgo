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
//
// Same live-mutation pattern as src/data/terminals.js's replaceTerminals —
// see src/lib/transitSync.js. Supabase's public.destinations table adds
// source/verification tracking (supabase/migrations/004_destinations.sql)
// that this hardcoded fallback array doesn't carry, since nothing client-
// side reads those fields outside the admin dashboard.
export const attractions = [
  {
    id: "magellans-cross",
    name: "Magellan's Cross",
    location: "Colon, Downtown Cebu",
    description: "A 1521 wooden cross marking the arrival of Christianity in the Philippines, sheltered in a chapel beside the Basilica.",
    icon: "ti-cross",
    category: "Historical",
    wikiTitle: "Magellan's Cross",
    nearestStopId: "basilica",
  },
  {
    id: "basilica-santo-nino",
    name: "Basilica del Santo Niño",
    location: "Osmeña Blvd, Downtown Cebu",
    description: "The oldest Roman Catholic church in the Philippines, home to the venerated Santo Niño relic.",
    icon: "ti-building-church",
    category: "Historical",
    wikiTitle: "Basilica del Santo Niño, Cebu",
    nearestStopId: "basilica",
  },
  {
    id: "fort-san-pedro",
    name: "Fort San Pedro",
    location: "Plaza Independencia, Downtown Cebu",
    description: "The oldest and smallest Spanish-era fort in the Philippines, built in 1738 to guard the city.",
    icon: "ti-building-fortress",
    category: "Historical",
    wikiTitle: "Fort San Pedro, Cebu",
    nearestStopId: "colon",
  },
  {
    id: "temple-of-leah",
    name: "Temple of Leah",
    location: "Busay, Cebu City (uphill)",
    description: "A Taj Mahal-inspired hilltop temple built as a monument to eternal love, with sweeping city views.",
    icon: "ti-building-castle",
    category: "Attraction",
    wikiTitle: "Temple of Leah",
    nearestStopId: "it-park",
  },
  {
    id: "taoist-temple",
    name: "Cebu Taoist Temple",
    location: "Beverly Hills, Lahug",
    description: "A colorful hillside Chinese temple with dragon staircases and incense courtyards.",
    icon: "ti-building-pavilion",
    category: "Attraction",
    wikiTitle: "Cebu Taoist Temple",
    nearestStopId: "it-park",
  },
  {
    id: "sirao-garden",
    name: "Sirao Garden",
    location: "Busay, Cebu City (uphill)",
    description: "Colorful hillside flower fields nicknamed \"Little Amsterdam\", popular for photos at golden hour.",
    icon: "ti-flower",
    category: "Nature",
    wikiTitle: "Sirao Flower Garden",
    nearestStopId: "it-park",
  },
  {
    id: "tops",
    name: "Tops Lookout",
    location: "Busay, Cebu City (uphill)",
    description: "A mountaintop viewing deck above Temple of Leah with a panoramic view of Metro Cebu's skyline.",
    icon: "ti-binoculars",
    category: "Nature",
    wikiTitle: "Tops Lookout",
    nearestStopId: "it-park",
  },
  {
    id: "kawasan-falls",
    name: "Kawasan Falls",
    location: "Matutinao, Badian (South Cebu)",
    description: "A turquoise three-tier waterfall in Badian and the Philippines' top canyoneering spot.",
    icon: "ti-droplet",
    category: "Nature",
    wikiTitle: "Kawasan Falls",
    nearestStopId: "carbon",
  },
  {
    id: "moalboal",
    name: "Moalboal",
    location: "Moalboal, South Cebu",
    description: "A laid-back dive town famous for its sardine run and nearby Pescador Island.",
    icon: "ti-fish",
    category: "Beach",
    wikiTitle: "Moalboal",
    nearestStopId: "carbon",
  },
  {
    id: "oslob",
    name: "Oslob",
    location: "Oslob, South Cebu",
    description: "Home to Cebu's famous whale shark watching, in the waters off southern Cebu.",
    icon: "ti-anchor",
    category: "Beach",
    wikiTitle: "Oslob",
    nearestStopId: "carbon",
  },
  {
    id: "mactan-shrine",
    name: "Mactan Shrine",
    location: "Punta Engaño, Lapu-Lapu City, Mactan Island",
    description: "A monument honoring Lapu-Lapu, the chieftain who defeated Ferdinand Magellan here in 1521.",
    icon: "ti-award",
    category: "Historical",
    wikiTitle: "Mactan Shrine",
    nearestStopId: "ayala",
  },
  // Added for student-relevant destinations + a heritage site not yet
  // covered — real, verified locations (see PR/commit notes for sources:
  // cebudailynews.inquirer.net/707255 (EduRank university rankings),
  // en.wikipedia.org articles for each institution, casagorordomuseum.org).
  // nearestStopId picks follow the same "closest reachable jump-off, not
  // the destination itself" pattern as the rest of this file.
  {
    id: "usc-talamban",
    name: "University of San Carlos – Talamban Campus",
    location: "Nasipit, Talamban, Cebu City",
    description: "Cebu's top-ranked university (8th nationally per EduRank), with its main science and engineering campus right in Talamban.",
    icon: "ti-school",
    category: "University",
    wikiTitle: "University of San Carlos",
    nearestStopId: "talamban",
  },
  {
    id: "usjr-main",
    name: "University of San Jose–Recoletos",
    location: "Magallanes & P. Lopez Streets, Cebu City",
    description: "A private Catholic university in the heart of downtown Cebu, run by the Augustinian Recollects.",
    icon: "ti-school",
    category: "University",
    wikiTitle: "University of San Jose–Recoletos",
    nearestStopId: "colon",
  },
  {
    id: "cnu-main",
    name: "Cebu Normal University",
    location: "Osmeña Boulevard, Cebu City",
    description: "A public university right on Osmeña Boulevard, a short walk from Fuente Osmeña Circle.",
    icon: "ti-school",
    category: "University",
    wikiTitle: "Cebu Normal University",
    nearestStopId: "fuente",
  },
  {
    id: "up-cebu",
    name: "University of the Philippines Cebu",
    location: "Gorordo Avenue, Lahug, Cebu City",
    description: "UP's Cebu campus, in the Lahug district near IT Park.",
    icon: "ti-school",
    category: "University",
    wikiTitle: "University of the Philippines Cebu",
    nearestStopId: "it-park",
  },
  {
    id: "casa-gorordo",
    name: "Casa Gorordo Museum",
    location: "35 Eduardo Aboitiz St, Parian, Cebu City",
    description: "A restored 1850s bahay-na-bato mansion in the historic Parian district, a National Historical Landmark since 1991.",
    icon: "ti-home-2",
    category: "Historical",
    wikiTitle: "Casa Gorordo",
    nearestStopId: "colon",
  },
  // Sources: cebudailynews.inquirer.net/602283 + en.wikipedia.org/wiki/SM_J_Mall
  // (SM J Mall — opened 2024-10-25, the former J Centre Mall after SM Prime's
  // acquisition); business.inquirer.net/63033 (SM City Consolacion, opened
  // 2012). Neither is directly on the verified jeepney graph, so both jump
  // off from sm-city, the routable node closest to the Mandaue/Consolacion
  // corridor (the same one route 25's Liloan-bound path already runs through).
  {
    id: "sm-j-mall",
    name: "SM J Mall",
    location: "165 A.S. Fortuna St, Barangay Bakilid, Mandaue City",
    description: "A Japanese-inspired SM mall in Mandaue reopened in 2024 on the site of the former J Centre Mall, with an outdoor izakaya dining strip and a rooftop recreation area.",
    icon: "ti-building-store",
    category: "Mall",
    wikiTitle: "SM J Mall",
    nearestStopId: "sm-city",
  },
  {
    id: "sm-consolacion",
    name: "SM City Consolacion",
    location: "Cebu North Road, Barangay Lamac, Consolacion",
    description: "SM Prime's second mall in Cebu province, opened in 2012 along the Liloan-bound corridor in Consolacion.",
    icon: "ti-building-store",
    category: "Mall",
    wikiTitle: "SM City Consolacion",
    nearestStopId: "sm-city",
  },
];

export function replaceAttractions(newAttractions) {
  attractions.splice(0, attractions.length, ...newAttractions);
}
