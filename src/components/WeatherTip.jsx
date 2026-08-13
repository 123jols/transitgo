import { useEffect, useState } from "react";

const CEBU_CENTER = { lat: 10.3157, lon: 123.8854 };

// WMO weather codes: https://open-meteo.com/en/docs
function interpretWeather(code, tempC) {
  if ([95, 96, 99].includes(code)) {
    return { icon: "ti-cloud-storm", text: "Thunderstorms nearby — expect delays, allow extra travel time." };
  }
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { icon: "ti-cloud-rain", text: "Rain expected — buses offer more cover than open jeepneys. Bring an umbrella." };
  }
  if ([45, 48].includes(code)) {
    return { icon: "ti-cloud-fog", text: "Foggy conditions — expect slower traffic, allow extra travel time." };
  }
  if (tempC >= 33) {
    return { icon: "ti-sun", text: `It's ${Math.round(tempC)}°C and hot — bring water for your commute.` };
  }
  if ([1, 2, 3].includes(code)) {
    return { icon: "ti-cloud", text: `${Math.round(tempC)}°C and partly cloudy — good conditions for commuting.` };
  }
  return { icon: "ti-sun", text: `${Math.round(tempC)}°C and clear — good conditions for commuting.` };
}

export default function WeatherTip() {
  const [tip, setTip] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather(lat, lon) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Asia%2FManila`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled || !data.current) return;
        setTip(interpretWeather(data.current.weather_code, data.current.temperature_2m));
      } catch {
        // Fail silently — weather tip is a nice-to-have, not core functionality
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadWeather(pos.coords.latitude, pos.coords.longitude),
        () => loadWeather(CEBU_CENTER.lat, CEBU_CENTER.lon),
        { timeout: 5000 }
      );
    } else {
      loadWeather(CEBU_CENTER.lat, CEBU_CENTER.lon);
    }

    return () => { cancelled = true; };
  }, []);

  if (!tip) return null;

  return (
    <div className="tip-card">
      <i className={`ti ${tip.icon}`}></i>
      <p>{tip.text}</p>
    </div>
  );
}
