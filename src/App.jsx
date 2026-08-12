import "./App.css";
<<<<<<< HEAD
import HomePage from "./pages/HomePage";
import AiChat from "./components/AiChat";

export default function App() {
  return (
    <>
      <HomePage />
=======
import { useState } from "react";
import HomePage from "./pages/HomePage";
import RouteDetailsPage from "./pages/RouteDetailsPage";
import useOfflineRoutes from "./hooks/useOfflineRoutes";
import OfflineBanner from "./components/OfflineBanner";
import AiChat from "./components/AiChat";

export default function App() {
  const { isOnline } = useOfflineRoutes();
  const [page, setPage] = useState("home");
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeContext, setRouteContext] = useState(null);

  function handleViewRoute(route, from, to, userType, discountRate, userLabel) {
    setSelectedRoute(route);
    setRouteContext({ from, to, userType, discountRate, userLabel });
    setPage("details");
  }

  return (
    <>
      <OfflineBanner isOnline={isOnline} />
      {page === "home" && (
        <HomePage onViewRoute={handleViewRoute} />
      )}
      {page === "details" && selectedRoute && (
        <RouteDetailsPage
          route={selectedRoute}
          from={routeContext.from}
          to={routeContext.to}
          userType={routeContext.userType}
          discountRate={routeContext.discountRate}
          userLabel={routeContext.userLabel}
          onBack={() => setPage("home")}
        />
      )}
>>>>>>> 40cfb5236f5a4bb25bc734eb83de7cfd23046d05
      <AiChat />
    </>
  );
}