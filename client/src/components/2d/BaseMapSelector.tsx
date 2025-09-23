import { useState } from "react";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM.js";
import XYZ from "ol/source/XYZ";
import WMTS from "ol/source/WMTS";
import WMTSTileGrid from "ol/tilegrid/WMTS";
import { get as getProjection } from "ol/proj";
import { getTopLeft, getWidth } from "ol/extent";

export const BASE_MAPS = {
  satellite: {
    name: "Satelliitti",
    icon: "🌍",
    layer: () => {
      const projection = getProjection("EPSG:3857");
      if (!projection) {
        return new TileLayer({
          source: new OSM(),
          properties: { name: "osm" },
        });
      }
      const extent = projection.getExtent();
      const size = getWidth(extent) / 256;
      // Blue Marble typically published at GoogleMapsCompatible_Level8
      const maxZoom = 8;
      const resolutions = new Array(maxZoom + 1);
      const matrixIds = new Array(maxZoom + 1);
      for (let z = 0; z <= maxZoom; z++) {
        resolutions[z] = size / Math.pow(2, z);
        matrixIds[z] = z.toString();
      }

      const source = new WMTS({
        url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi",
        // Use a seamless static mosaic to avoid visible swath seams
        layer: "BlueMarble_ShadedRelief",
        matrixSet: "GoogleMapsCompatible_Level8",
        format: "image/jpeg",
        projection,
        tileGrid: new WMTSTileGrid({
          origin: getTopLeft(extent),
          resolutions,
          matrixIds,
        }),
        style: "default",
        wrapX: true,
        attributions:
          'Imagery courtesy NASA Worldview, part of NASA EOSDIS | <a href="https://earthdata.nasa.gov/gibs">GIBS</a>',
        // Disable fade-in transition between tile updates
        transition: 0,
        crossOrigin: "anonymous",
      });

      return new TileLayer({
        source,
        properties: { name: "satellite" },
        maxZoom,
        // Keep lower-res tiles visible while higher-res are loading
        preload: 8,
        // Disable fade-in to reduce perceived white flashes
        className: "no-fade",
      });
    },
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
  topo: {
    name: "Topografinen",
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

  cartoLight: {
    name: "Vaalea",
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
    name: "Tumma",
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
}

export function BaseMapSelector({
  currentBaseMap,
  onBaseMapChange,
}: BaseMapSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        top: "200px",
        right: "20px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
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
        title={`Pohjakartta: ${BASE_MAPS[currentBaseMap].name}`}
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
