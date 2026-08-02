export const stops = [
  { id: "it-park", name: "IT Park Cebu", type: "business" },
  { id: "sm-city", name: "SM City Cebu", type: "mall" },
  { id: "colon", name: "Colon Street", type: "landmark" },
  { id: "ayala", name: "Ayala Center Cebu", type: "mall" },
  { id: "basilica", name: "Basilica del Santo Niño", type: "landmark" },
  { id: "airport", name: "Mactan-Cebu Airport", type: "airport" },
  { id: "chonghua", name: "Chong Hua Hospital", type: "hospital" },
  { id: "fuente", name: "Fuente Osmena Circle", type: "landmark" },
  { id: "sm-seaside", name: "SM Seaside City", type: "mall" },
  { id: "usc", name: "University of San Carlos", type: "school" },
  { id: "capitol", name: "Cebu Provincial Capitol", type: "landmark" },
  { id: "carbon", name: "Carbon Market", type: "landmark" },
  { id: "lahug", name: "Gaisano Country Mall", type: "mall" },
  { id: "banilad", name: "Banilad Town Center", type: "mall" },
  { id: "guadalupe", name: "Guadalupe", type: "landmark" },
  { id: "usjr", name: "USJ-R Basak Campus", type: "school" },
  { id: "mandaue", name: "Parkmall Mandaue", type: "mall" },
  { id: "talisay", name: "Talisay City Plaza", type: "landmark" },
];

export const routes = {
  "it-park:sm-city": [
    { id:"r1", type:"jeepney", label:"Jeepney 13C", fare:15, duration:25, transfers:0, stops:["IT Park Cebu","SM City Cebu"] },
  ],
  "sm-city:it-park": [
    { id:"r2", type:"jeepney", label:"Jeepney 13C", fare:16, duration:27, transfers:0, stops:["SM City Cebu","IT Park Cebu"] },
  ],
  "it-park:ayala": [
    { id:"r3", type:"bus", label:"BRT Route 1", fare:18, duration:22, transfers:0, stops:["IT Park Cebu","Ayala Center Cebu"] },
  ],
  "ayala:colon": [
    { id:"r4", type:"jeepney", label:"Jeepney 04A", fare:12, duration:18, transfers:1, stops:["Ayala Center Cebu","Colon Street"] },
  ],
  "colon:basilica": [
    { id:"r5", type:"walk", label:"Walking route", fare:0, duration:12, transfers:0, stops:["Colon Street","Basilica del Santo Niño"] },
  ],
  "sm-city:basilica": [
    { id:"r6", type:"bus", label:"Bus 02B", fare:25, duration:30, transfers:0, stops:["SM City Cebu","Basilica del Santo Niño"] },
  ],
  "sm-city:ayala": [
    { id:"r7", type:"jeepney", label:"Jeepney 03Q", fare:13, duration:25, transfers:0, stops:["SM City Cebu","Ayala Center Cebu"] },
  ],
  "ayala:sm-city": [
    { id:"r8", type:"jeepney", label:"Jeepney 03Q", fare:13, duration:25, transfers:0, stops:["Ayala Center Cebu","SM City Cebu"] },
  ],
  "sm-city:airport": [
    { id:"r9", type:"bus", label:"MyBus MCIA", fare:50, duration:50, transfers:0, stops:["SM City Cebu","Mactan-Cebu Airport"] },
  ],

  "fuente:sm-city": [
    { id:"r10", type:"jeepney", label:"Jeepney 17C", fare:13, duration:20, transfers:0, stops:["Fuente Osmena Circle","SM City Cebu"] },
  ],
  "sm-city:fuente": [
    { id:"r11", type:"jeepney", label:"Jeepney 17C", fare:13, duration:20, transfers:0, stops:["SM City Cebu","Fuente Osmena Circle"] },
  ],
  "fuente:ayala": [
    { id:"r12", type:"jeepney", label:"Jeepney 12D", fare:11, duration:12, transfers:0, stops:["Fuente Osmena Circle","Ayala Center Cebu"] },
  ],
  "ayala:fuente": [
    { id:"r13", type:"jeepney", label:"Jeepney 12D", fare:11, duration:12, transfers:0, stops:["Ayala Center Cebu","Fuente Osmena Circle"] },
  ],
  "fuente:it-park": [
    { id:"r14", type:"jeepney", label:"Jeepney 17C", fare:13, duration:18, transfers:0, stops:["Fuente Osmena Circle","IT Park Cebu"] },
  ],
  "it-park:fuente": [
    { id:"r15", type:"jeepney", label:"Jeepney 17C", fare:13, duration:18, transfers:0, stops:["IT Park Cebu","Fuente Osmena Circle"] },
  ],
  "fuente:colon": [
    { id:"r16", type:"jeepney", label:"Jeepney 01L", fare:10, duration:10, transfers:0, stops:["Fuente Osmena Circle","Colon Street"] },
  ],
  "colon:fuente": [
    { id:"r17", type:"jeepney", label:"Jeepney 01L", fare:10, duration:10, transfers:0, stops:["Colon Street","Fuente Osmena Circle"] },
  ],

  "basilica:carbon": [
    { id:"r18", type:"walk", label:"Walking route", fare:0, duration:8, transfers:0, stops:["Basilica del Santo Niño","Carbon Market"] },
  ],
  "carbon:basilica": [
    { id:"r19", type:"walk", label:"Walking route", fare:0, duration:8, transfers:0, stops:["Carbon Market","Basilica del Santo Niño"] },
  ],
  "basilica:fuente": [
    { id:"r20", type:"jeepney", label:"Jeepney 04H", fare:12, duration:15, transfers:0, stops:["Basilica del Santo Niño","Fuente Osmena Circle"] },
  ],
  "fuente:basilica": [
    { id:"r21", type:"jeepney", label:"Jeepney 04H", fare:12, duration:15, transfers:0, stops:["Fuente Osmena Circle","Basilica del Santo Niño"] },
  ],

  "carbon:colon": [
    { id:"r22", type:"walk", label:"Walking route", fare:0, duration:6, transfers:0, stops:["Carbon Market","Colon Street"] },
  ],
  "colon:carbon": [
    { id:"r23", type:"walk", label:"Walking route", fare:0, duration:6, transfers:0, stops:["Colon Street","Carbon Market"] },
  ],
  "carbon:sm-city": [
    { id:"r24", type:"jeepney", label:"Jeepney 06L", fare:13, duration:20, transfers:0, stops:["Carbon Market","SM City Cebu"] },
  ],
  "sm-city:carbon": [
    { id:"r25", type:"jeepney", label:"Jeepney 06L", fare:13, duration:20, transfers:0, stops:["SM City Cebu","Carbon Market"] },
  ],

  "airport:ayala": [
    { id:"r26", type:"bus", label:"MyBus MCIA", fare:50, duration:55, transfers:0, stops:["Mactan-Cebu Airport","Ayala Center Cebu"] },
  ],
  "ayala:airport": [
    { id:"r27", type:"bus", label:"MyBus MCIA", fare:50, duration:55, transfers:0, stops:["Ayala Center Cebu","Mactan-Cebu Airport"] },
  ],
  "airport:it-park": [
    { id:"r28", type:"bus", label:"MyBus MCIA", fare:45, duration:40, transfers:0, stops:["Mactan-Cebu Airport","IT Park Cebu"] },
  ],
  "it-park:airport": [
    { id:"r29", type:"bus", label:"MyBus MCIA", fare:45, duration:40, transfers:0, stops:["IT Park Cebu","Mactan-Cebu Airport"] },
  ],

  "chonghua:fuente": [
    { id:"r30", type:"jeepney", label:"Jeepney 62B", fare:11, duration:10, transfers:0, stops:["Chong Hua Hospital","Fuente Osmena Circle"] },
  ],
  "fuente:chonghua": [
    { id:"r31", type:"jeepney", label:"Jeepney 62B", fare:11, duration:10, transfers:0, stops:["Fuente Osmena Circle","Chong Hua Hospital"] },
  ],
  "chonghua:sm-city": [
    { id:"r32", type:"jeepney", label:"Jeepney 62B", fare:14, duration:22, transfers:0, stops:["Chong Hua Hospital","SM City Cebu"] },
  ],
  "sm-city:chonghua": [
    { id:"r33", type:"jeepney", label:"Jeepney 62B", fare:14, duration:22, transfers:0, stops:["SM City Cebu","Chong Hua Hospital"] },
  ],
  "chonghua:ayala": [
    { id:"r34", type:"jeepney", label:"Jeepney 62C", fare:13, duration:18, transfers:0, stops:["Chong Hua Hospital","Ayala Center Cebu"] },
  ],
  "ayala:chonghua": [
    { id:"r35", type:"jeepney", label:"Jeepney 62C", fare:13, duration:18, transfers:0, stops:["Ayala Center Cebu","Chong Hua Hospital"] },
  ],

  "usc:colon": [
    { id:"r36", type:"walk", label:"Walking route", fare:0, duration:10, transfers:0, stops:["University of San Carlos","Colon Street"] },
  ],
  "colon:usc": [
    { id:"r37", type:"walk", label:"Walking route", fare:0, duration:10, transfers:0, stops:["Colon Street","University of San Carlos"] },
  ],
  "usc:sm-city": [
    { id:"r38", type:"jeepney", label:"Jeepney 13B", fare:13, duration:22, transfers:0, stops:["University of San Carlos","SM City Cebu"] },
  ],
  "sm-city:usc": [
    { id:"r39", type:"jeepney", label:"Jeepney 13B", fare:13, duration:22, transfers:0, stops:["SM City Cebu","University of San Carlos"] },
  ],
  "usc:fuente": [
    { id:"r40", type:"jeepney", label:"Jeepney 04C", fare:11, duration:14, transfers:0, stops:["University of San Carlos","Fuente Osmena Circle"] },
  ],
  "fuente:usc": [
    { id:"r41", type:"jeepney", label:"Jeepney 04C", fare:11, duration:14, transfers:0, stops:["Fuente Osmena Circle","University of San Carlos"] },
  ],

  "sm-seaside:sm-city": [
    { id:"r42", type:"bus", label:"Bus 17A", fare:15, duration:35, transfers:0, stops:["SM Seaside City","SM City Cebu"] },
  ],
  "sm-city:sm-seaside": [
    { id:"r43", type:"bus", label:"Bus 17A", fare:15, duration:35, transfers:0, stops:["SM City Cebu","SM Seaside City"] },
  ],
  "sm-seaside:ayala": [
    { id:"r44", type:"bus", label:"Bus 17A", fare:17, duration:40, transfers:0, stops:["SM Seaside City","Ayala Center Cebu"] },
  ],
  "ayala:sm-seaside": [
    { id:"r45", type:"bus", label:"Bus 17A", fare:17, duration:40, transfers:0, stops:["Ayala Center Cebu","SM Seaside City"] },
  ],

  "capitol:fuente": [
    { id:"r46", type:"walk", label:"Walking route", fare:0, duration:10, transfers:0, stops:["Cebu Provincial Capitol","Fuente Osmena Circle"] },
  ],
  "fuente:capitol": [
    { id:"r47", type:"walk", label:"Walking route", fare:0, duration:10, transfers:0, stops:["Fuente Osmena Circle","Cebu Provincial Capitol"] },
  ],
  "capitol:ayala": [
    { id:"r48", type:"jeepney", label:"Jeepney 12D", fare:11, duration:15, transfers:0, stops:["Cebu Provincial Capitol","Ayala Center Cebu"] },
  ],
  "ayala:capitol": [
    { id:"r49", type:"jeepney", label:"Jeepney 12D", fare:11, duration:15, transfers:0, stops:["Ayala Center Cebu","Cebu Provincial Capitol"] },
  ],
  "capitol:it-park": [
    { id:"r50", type:"jeepney", label:"Jeepney 17B", fare:12, duration:18, transfers:0, stops:["Cebu Provincial Capitol","IT Park Cebu"] },
  ],
  "it-park:capitol": [
    { id:"r51", type:"jeepney", label:"Jeepney 17B", fare:12, duration:18, transfers:0, stops:["IT Park Cebu","Cebu Provincial Capitol"] },
  ],

  "lahug:it-park": [
    { id:"r52", type:"jeepney", label:"Jeepney 17B", fare:11, duration:10, transfers:0, stops:["Gaisano Country Mall","IT Park Cebu"] },
  ],
  "it-park:lahug": [
    { id:"r53", type:"jeepney", label:"Jeepney 17B", fare:11, duration:10, transfers:0, stops:["IT Park Cebu","Gaisano Country Mall"] },
  ],
  "lahug:ayala": [
    { id:"r54", type:"jeepney", label:"Jeepney 04L", fare:12, duration:15, transfers:0, stops:["Gaisano Country Mall","Ayala Center Cebu"] },
  ],
  "ayala:lahug": [
    { id:"r55", type:"jeepney", label:"Jeepney 04L", fare:12, duration:15, transfers:0, stops:["Ayala Center Cebu","Gaisano Country Mall"] },
  ],
  "lahug:fuente": [
    { id:"r56", type:"jeepney", label:"Jeepney 17B", fare:11, duration:12, transfers:0, stops:["Gaisano Country Mall","Fuente Osmena Circle"] },
  ],
  "fuente:lahug": [
    { id:"r57", type:"jeepney", label:"Jeepney 17B", fare:11, duration:12, transfers:0, stops:["Fuente Osmena Circle","Gaisano Country Mall"] },
  ],

  "banilad:it-park": [
    { id:"r58", type:"jeepney", label:"Jeepney 23C", fare:13, duration:15, transfers:0, stops:["Banilad Town Center","IT Park Cebu"] },
  ],
  "it-park:banilad": [
    { id:"r59", type:"jeepney", label:"Jeepney 23C", fare:13, duration:15, transfers:0, stops:["IT Park Cebu","Banilad Town Center"] },
  ],
  "banilad:ayala": [
    { id:"r60", type:"jeepney", label:"Jeepney 23C", fare:14, duration:20, transfers:0, stops:["Banilad Town Center","Ayala Center Cebu"] },
  ],
  "ayala:banilad": [
    { id:"r61", type:"jeepney", label:"Jeepney 23C", fare:14, duration:20, transfers:0, stops:["Ayala Center Cebu","Banilad Town Center"] },
  ],
  "banilad:sm-city": [
    { id:"r62", type:"jeepney", label:"Jeepney 23C", fare:16, duration:28, transfers:0, stops:["Banilad Town Center","SM City Cebu"] },
  ],
  "sm-city:banilad": [
    { id:"r63", type:"jeepney", label:"Jeepney 23C", fare:16, duration:28, transfers:0, stops:["SM City Cebu","Banilad Town Center"] },
  ],

  "guadalupe:colon": [
    { id:"r64", type:"jeepney", label:"Jeepney 06B", fare:12, duration:18, transfers:0, stops:["Guadalupe","Colon Street"] },
  ],
  "colon:guadalupe": [
    { id:"r65", type:"jeepney", label:"Jeepney 06B", fare:12, duration:18, transfers:0, stops:["Colon Street","Guadalupe"] },
  ],
  "guadalupe:fuente": [
    { id:"r66", type:"jeepney", label:"Jeepney 06B", fare:11, duration:14, transfers:0, stops:["Guadalupe","Fuente Osmena Circle"] },
  ],
  "fuente:guadalupe": [
    { id:"r67", type:"jeepney", label:"Jeepney 06B", fare:11, duration:14, transfers:0, stops:["Fuente Osmena Circle","Guadalupe"] },
  ],
  "guadalupe:ayala": [
    { id:"r68", type:"jeepney", label:"Jeepney 06C", fare:13, duration:20, transfers:0, stops:["Guadalupe","Ayala Center Cebu"] },
  ],
  "ayala:guadalupe": [
    { id:"r69", type:"jeepney", label:"Jeepney 06C", fare:13, duration:20, transfers:0, stops:["Ayala Center Cebu","Guadalupe"] },
  ],

  "usjr:colon": [
    { id:"r70", type:"walk", label:"Walking route", fare:0, duration:12, transfers:0, stops:["USJ-R Basak Campus","Colon Street"] },
  ],
  "colon:usjr": [
    { id:"r71", type:"walk", label:"Walking route", fare:0, duration:12, transfers:0, stops:["Colon Street","USJ-R Basak Campus"] },
  ],
  "usjr:carbon": [
    { id:"r72", type:"walk", label:"Walking route", fare:0, duration:8, transfers:0, stops:["USJ-R Basak Campus","Carbon Market"] },
  ],
  "carbon:usjr": [
    { id:"r73", type:"walk", label:"Walking route", fare:0, duration:8, transfers:0, stops:["Carbon Market","USJ-R Basak Campus"] },
  ],
  "usjr:sm-city": [
    { id:"r74", type:"jeepney", label:"Jeepney 13B", fare:13, duration:24, transfers:0, stops:["USJ-R Basak Campus","SM City Cebu"] },
  ],
  "sm-city:usjr": [
    { id:"r75", type:"jeepney", label:"Jeepney 13B", fare:13, duration:24, transfers:0, stops:["SM City Cebu","USJ-R Basak Campus"] },
  ],

  "mandaue:sm-city": [
    { id:"r76", type:"bus", label:"Bus 01B", fare:15, duration:30, transfers:0, stops:["Parkmall Mandaue","SM City Cebu"] },
  ],
  "sm-city:mandaue": [
    { id:"r77", type:"bus", label:"Bus 01B", fare:15, duration:30, transfers:0, stops:["SM City Cebu","Parkmall Mandaue"] },
  ],
  "mandaue:it-park": [
    { id:"r78", type:"bus", label:"Bus 01B", fare:14, duration:25, transfers:0, stops:["Parkmall Mandaue","IT Park Cebu"] },
  ],
  "it-park:mandaue": [
    { id:"r79", type:"bus", label:"Bus 01B", fare:14, duration:25, transfers:0, stops:["IT Park Cebu","Parkmall Mandaue"] },
  ],
  "mandaue:ayala": [
    { id:"r80", type:"bus", label:"Bus 01B", fare:16, duration:32, transfers:0, stops:["Parkmall Mandaue","Ayala Center Cebu"] },
  ],
  "ayala:mandaue": [
    { id:"r81", type:"bus", label:"Bus 01B", fare:16, duration:32, transfers:0, stops:["Ayala Center Cebu","Parkmall Mandaue"] },
  ],

  "talisay:sm-city": [
    { id:"r82", type:"bus", label:"Bus 62B", fare:18, duration:40, transfers:0, stops:["Talisay City Plaza","SM City Cebu"] },
  ],
  "sm-city:talisay": [
    { id:"r83", type:"bus", label:"Bus 62B", fare:18, duration:40, transfers:0, stops:["SM City Cebu","Talisay City Plaza"] },
  ],
  "talisay:colon": [
    { id:"r84", type:"bus", label:"Bus 62B", fare:17, duration:38, transfers:0, stops:["Talisay City Plaza","Colon Street"] },
  ],
  "colon:talisay": [
    { id:"r85", type:"bus", label:"Bus 62B", fare:17, duration:38, transfers:0, stops:["Colon Street","Talisay City Plaza"] },
  ],
};
