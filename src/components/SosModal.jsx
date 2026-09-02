import { useEffect, useState } from "react";
import Modal from "./Modal";
import { reverseGeocode, shortenAddress } from "../utils/geo";
import { buildLocationMessage, callEmergencyHotline, openEmergencySms } from "../utils/sos";

const CONTACT_STORAGE_KEY = "transitgo-emergency-contact";

export default function SosModal({ onClose }) {
  const [contact, setContact] = useState(() => localStorage.getItem(CONTACT_STORAGE_KEY) || "");
  const [locStatus, setLocStatus] = useState("locating"); // locating | ok | denied
  const [location, setLocation] = useState(null); // { lat, lon, address }

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let address = "";
        try {
          address = shortenAddress(await reverseGeocode(lat, lon));
        } catch {
          // Best-effort only — an SOS text still goes out with just the map link.
        }
        setLocation({ lat, lon, address });
        setLocStatus("ok");
      },
      () => setLocStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const saveContact = (value) => {
    setContact(value);
    if (value.trim()) {
      localStorage.setItem(CONTACT_STORAGE_KEY, value.trim());
    } else {
      localStorage.removeItem(CONTACT_STORAGE_KEY);
    }
  };

  const canSendLocation = contact.trim().length >= 7;

  const handleSendLocation = () => {
    if (!canSendLocation) return;
    const message = buildLocationMessage(location?.address, location?.lat, location?.lon);
    openEmergencySms(contact.trim(), message);
  };

  return (
    <Modal title="Emergency SOS" onClose={onClose}>
      <div className="sos-body">
        <button type="button" className="sos-call-button" onClick={callEmergencyHotline}>
          <i className="ti ti-phone-call"></i>
          Call 911
        </button>
        <p className="sos-hint">Connects to the Philippines' nationwide emergency hotline.</p>

        <div className="sos-divider">
          <span>or send your location</span>
        </div>

        <label className="expense-field">
          <span className="expense-field-label">Emergency contact number</span>
          <input
            type="tel"
            value={contact}
            onChange={(e) => saveContact(e.target.value)}
            placeholder="e.g. 09171234567"
            autoComplete="tel"
          />
        </label>

        <p className="sos-location-status">
          {locStatus === "locating" && (
            <><i className="ti ti-locate"></i> Getting your location…</>
          )}
          {locStatus === "ok" && (
            <><i className="ti ti-map-pin"></i> Ready to share {location?.address || "your coordinates"}</>
          )}
          {locStatus === "denied" && (
            <><i className="ti ti-map-pin-off"></i> Location unavailable — you can still send an SOS text.</>
          )}
        </p>

        <button
          type="button"
          className="sos-sms-button"
          onClick={handleSendLocation}
          disabled={!canSendLocation}
        >
          <i className="ti ti-message-2"></i>
          Send My Location via SMS
        </button>
        {!canSendLocation && (
          <p className="sos-hint">Add a contact number above to enable this.</p>
        )}
      </div>
    </Modal>
  );
}
