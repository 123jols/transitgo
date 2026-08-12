<<<<<<< HEAD
﻿import { stops, routes } from "../data/db";
=======
import { stops, routes } from "../data/db";
>>>>>>> 40cfb5236f5a4bb25bc734eb83de7cfd23046d05

export function searchStops(query) {
  return stops.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );
}

export function findRoutes(fromId, toId) {
  return routes[`${fromId}:${toId}`] || [];
}

export function getStops() {
  return stops;
}

export function getPopularRoutes() {
  return Object.entries(routes).map(([key, routeList]) => {
    const [fromId, toId] = key.split(":");
<<<<<<< HEAD
    const from = stops.find((stop) => stop.id === fromId);
    const to = stops.find((stop) => stop.id === toId);

=======
    const from = stops.find((s) => s.id === fromId);
    const to = stops.find((s) => s.id === toId);
>>>>>>> 40cfb5236f5a4bb25bc734eb83de7cfd23046d05
    return {
      from,
      to,
      label: `${from?.name || fromId} → ${to?.name || toId}`,
      route: routeList[0],
    };
  });
}

export function addRoute(route) {
  const key = `${route.fromId}:${route.toId}`;
<<<<<<< HEAD
  if (!routes[key]) {
    routes[key] = [];
  }
  routes[key].push(route);
}
=======
  if (!routes[key]) routes[key] = [];
  routes[key].push(route);
  localStorage.setItem("transitgo-routes", JSON.stringify(routes));
}

>>>>>>> 40cfb5236f5a4bb25bc734eb83de7cfd23046d05
