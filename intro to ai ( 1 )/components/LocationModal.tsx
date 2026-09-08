"use client";

import React, { useState } from "react";
import { UserLocation, detectLocation } from "@/lib/location";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: UserLocation | null;
  onSave: (location: UserLocation | null) => void;
}

/**
 * Location Modal — set or detect the user's city.
 * Reuses AuthModal's overlay/content/glassmorphism structure and CSS classes.
 */
export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, location, onSave }) => {
  const [city, setCity] = useState(location?.city || "");
  const [isDetecting, setIsDetecting] = useState(false);

  if (!isOpen) return null;

  const handleDetect = async () => {
    setIsDetecting(true);
    try {
      const detected = await detectLocation();
      if (detected) {
        setCity(detected.city || "");
        onSave(detected);
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSave = () => {
    const trimmed = city.trim();
    onSave(trimmed ? { ...location, city: trimmed } : null);
    onClose();
  };

  return (
    <div className={`modal-overlay ${isOpen ? "open" : ""}`} onClick={onClose}>
      <div className="modal-content glassmorphism" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close-btn"
          onClick={onClose}
          type="button"
          aria-label="Close modal"
        >
          &times;
        </button>

        <div className="auth-modal-header">
          <img src="/assets/genie.svg" alt="Gift Genie" className="auth-genie-icon" />
          <h2 className="auth-title">Where are you shopping from?</h2>
          <p className="auth-subtitle">
            Helps Gift Genie suggest nearby stores and show prices in your currency.
          </p>
        </div>

        <input
          type="text"
          className="location-input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Delhi, Mumbai, Bengaluru"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />

        <button
          type="button"
          className="location-detect-btn"
          onClick={handleDetect}
          disabled={isDetecting}
        >
          {isDetecting ? "Detecting..." : "Detect automatically"}
        </button>

        <button type="button" className="location-save-btn" onClick={handleSave}>
          Save
        </button>

        <p className="auth-footer-text">
          Stored on this device only.
        </p>
      </div>
    </div>
  );
};
