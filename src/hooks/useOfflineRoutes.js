import { useEffect, useState } from "react";
import { routes, stops } from "../data/db";

const CACHE_KEY = "transitgo-offline-routes";

export default function useOfflineRoutes() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline()  { setIsOnline(true);  }
    function handleOffline() { setIsOnline(false); }
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      const existing = localStorage.getItem(CACHE_KEY);
      if (!existing) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          cachedAt: new Date().toISOString(),
          routes,
          stops,
        }));
      }
    } catch (err) {
      console.warn("Could not cache routes", err);
    }
  }, []);

  return { isOnline };
}