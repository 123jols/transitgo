import { stops, routes } from "../data/db";

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
    const from = stops.find((s) => s.id === fromId);
    const to = stops.find((s) => s.id === toId);
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
  if (!routes[key]) routes[key] = [];
  routes[key].push(route);
  localStorage.setItem("transitgo-routes", JSON.stringify(routes));
}

