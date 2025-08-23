import { useState } from "react";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM.js";
import XYZ from "ol/source/XYZ";

export const BASE_MAPS = {
  topo: {
    name: "Topographic",
    icon: "🏔️",
    layer: () =>
      new TileLayer({
        source: new XYZ({
          url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
          attributions:
            'Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a>',
        }),
        properties: { name: "topo" },
      }),
  },
  osm: {
    name: "OpenStreetMap",
    icon: "🗺️",
    layer: () =>
      new TileLayer({
        source: new OSM(),
        properties: { name: "osm" },
      }),
  },
  satellite: {
    name: "Satellite",
    icon: "🌍",
    layer: () =>
      new TileLayer({
        source: new XYZ({
          url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
          attributions: "© Google",
          maxZoom: 20,
        }),
        properties: { name: "satellite" },
      }),
  },
  humanitarian: {
    name: "Humanitarian",
    icon: "🏥",
    layer: () =>
      new TileLayer({
        source: new XYZ({
          url: "https://tile-{a-c}.openstreetmap.fr/hot/{z}/{x}/{y}.png",
          attributions:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a>',
        }),
        properties: { name: "humanitarian" },
      }),
  },
  cartoLight: {
    name: "Light",
    icon: "🌕",
    layer: () =>
      new TileLayer({
        source: new XYZ({
          url: "https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
          attributions:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        }),
        properties: { name: "carto-light" },
      }),
  },
  cartoDark: {
    name: "Dark",
    icon: "🌑",
    layer: () =>
      new TileLayer({
        source: new XYZ({
          url: "https://{a-d}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          attributions:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        }),
        properties: { name: "carto-dark" },
      }),
  },
} as const;

export type BaseMapKey = keyof typeof BASE_MAPS;

interface BaseMapSelectorProps {
  currentBaseMap: BaseMapKey;
  onBaseMapChange: (baseMapKey: BaseMapKey) => void;
  onHome: () => void;
}

export function BaseMapSelector({
  currentBaseMap,
  onBaseMapChange,
  onHome,
}: BaseMapSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        top: "150px",
        right: "20px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {/* Home button */}
      <button
        onClick={onHome}
        style={{
          width: "40px",
          height: "40px",
          backgroundColor: "rgba(42, 42, 42, 0.8)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "normal",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          outline: "none",
        }}
        title="View Home"
      >
        🏠
      </button>

      {/* Main button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "40px",
          height: "40px",
          backgroundColor: "rgba(42, 42, 42, 0.8)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          outline: "none",
        }}
        title={`Base Map: ${BASE_MAPS[currentBaseMap].name}`}
      >
        🗺️
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "93px", // Adjusted for home button + base selector + gap
            right: "0",
            backgroundColor: "rgba(42, 42, 42, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "4px",
            padding: "4px",
            minWidth: "160px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
          }}
        >
          {Object.entries(BASE_MAPS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => {
                onBaseMapChange(key as BaseMapKey);
                setIsOpen(false);
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                backgroundColor:
                  currentBaseMap === key
                    ? "rgba(255, 255, 255, 0.2)"
                    : "transparent",
                color: "white",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
                fontSize: "14px",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (currentBaseMap !== key) {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.1)";
                }
              }}
              onMouseLeave={(e) => {
                if (currentBaseMap !== key) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span style={{ fontSize: "16px" }}>{config.icon}</span>
              <span>{config.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
