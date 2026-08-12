export const stops = [
  { id: "it-park", name: "IT Park Cebu", type: "business" },
  { id: "sm-city", name: "SM City Cebu", type: "mall" },
  { id: "colon", name: "Colon Street", type: "landmark" },
  { id: "ayala", name: "Ayala Center Cebu", type: "mall" },
  { id: "basilica", name: "Basilica del Santo Niño", type: "landmark" },
];

export const routes = {
  "it-park:sm-city": [
    {
      id: "r1",
      type: "jeepney",
      label: "Jeepney 13C",
      fare: 15,
      duration: 25,
      transfers: 0,
      stops: ["IT Park Cebu", "SM City Cebu"],
    },
  ],
  "sm-city:it-park": [
    {
      id: "r2",
      type: "jeepney",
      label: "Jeepney 13C",
      fare: 16,
      duration: 27,
      transfers: 0,
      stops: ["SM City Cebu", "IT Park Cebu"],
    },
  ],
  "it-park:ayala": [
    {
      id: "r3",
      type: "bus",
      label: "BRT Route 1",
      fare: 18,
      duration: 22,
      transfers: 0,
      stops: ["IT Park Cebu", "Ayala Center Cebu"],
    },
  ],
  "ayala:colon": [
    {
      id: "r4",
      type: "jeepney",
      label: "Jeepney 04A",
      fare: 12,
      duration: 18,
      transfers: 1,
      stops: ["Ayala Center Cebu", "Colon Street"],
    },
  ],
  "colon:basilica": [
    {
      id: "r5",
      type: "walk",
      label: "Walking route",
      fare: 0,
      duration: 12,
      transfers: 0,
      stops: ["Colon Street", "Basilica del Santo Niño"],
    },
  ],
  "sm-city:basilica": [
    {
      id: "r6",
      type: "bus",
      label: "Bus 02B",
      fare: 25,
      duration: 30,
      transfers: 0,
      stops: ["SM City Cebu", "Basilica del Santo Niño"],
    },
  ],
};
