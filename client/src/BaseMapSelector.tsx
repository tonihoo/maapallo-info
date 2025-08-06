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
}

export function BaseMapSelector({
  currentBaseMap,
  onBaseMapChange,
}: BaseMapSelectorProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: "150px",
        right: "20px",
        zIndex: 1000,
      }}
    >
      <select
        value={currentBaseMap}
        onChange={(e) => onBaseMapChange(e.target.value as BaseMapKey)}
        style={{
          padding: "8px 12px",
          backgroundColor: "rgba(42, 42, 42, 0.9)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "4px",
          fontSize: "14px",
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          cursor: "pointer",
          outline: "none",
          minWidth: "140px",
        }}
      >
        {Object.entries(BASE_MAPS).map(([key, config]) => (
          <option
            key={key}
            value={key}
            style={{ backgroundColor: "#2a2a2a", color: "white" }}
          >
            {config.icon} {config.name}
          </option>
        ))}
      </select>
    </div>
  );
}
