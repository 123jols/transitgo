// Terminal/transport-hub registry for the Terminals page.
// stopId links a terminal to a stop in db.js when the two are the same real
// place — that's what lets "View Routes" hand off to the actual jeepney
// route search. Terminals without a stopId (Parkmall, the two provincial bus
// terminals) aren't part of the verified jeepney route graph, so "View
// Routes" for those just opens the Home tab rather than pretending a search
// result exists; their `routes` list is shown directly on the card instead.
// lat/lon are approximate landmark coordinates (same caveat as db.js stops),
// used only for the optional "nearby terminals" distance sort.
// Sources: en.wikipedia.org/wiki/Cebu_South_Bus_Terminal, en.wikipedia.org/
// wiki/Cebu_North_Bus_Terminal, phbus.com/cebu-south-bus-terminal, sugbo.ph
// (Parkmall jeepney routes), db.js jeepneyRoutes (for IT Park/SM City/Ayala).
export const terminals = [
  {
    id: "it-park-terminal",
    name: "IT Park Terminal",
    location: "Cebu IT Park, Lahug, Cebu City",
    routes: ["04L", "17B", "MyBus (city bus)"],
    stopId: "it-park",
    lat: 10.3298,
    lon: 123.9057,
  },
  {
    id: "sm-city-terminal",
    name: "SM City Cebu Terminal",
    location: "North Reclamation Area, Cebu City",
    routes: ["04L", "MyBus (city bus)"],
    stopId: "sm-city",
    lat: 10.3111,
    lon: 123.9186,
  },
  {
    id: "parkmall-terminal",
    name: "Parkmall Terminal",
    location: "Ouano Ave, Mandaue Reclamation Area, Mandaue City",
    routes: ["25 (Liloan)", "24 (Consolacion)", "01K (Urgello)", "20A (Ayala–Mandaue)"],
    stopId: null,
    lat: 10.332,
    lon: 123.943,
  },
  {
    id: "ayala-terminal",
    name: "Ayala Center Cebu",
    location: "Cebu Business Park, Cebu City",
    routes: ["04L", "14D", "13C"],
    stopId: "ayala",
    lat: 10.3181,
    lon: 123.9056,
  },
  {
    id: "south-bus-terminal",
    name: "Cebu South Bus Terminal",
    location: "N. Bacalso Ave, Cebu City",
    routes: ["Bato via Barili (Moalboal, Badian/Kawasan Falls)", "Bato via Oslob (Oslob, Santander)"],
    stopId: null,
    lat: 10.286,
    lon: 123.887,
  },
  {
    id: "north-bus-terminal",
    name: "Cebu North Bus Terminal",
    location: "North Reclamation Area, Cebu City (beside SM City Cebu)",
    routes: ["Maya, Daanbantayan (for Malapascua Island)", "Hagnaya, San Remigio (for Bantayan Island)"],
    stopId: null,
    lat: 10.3125,
    lon: 123.9175,
  },
];
