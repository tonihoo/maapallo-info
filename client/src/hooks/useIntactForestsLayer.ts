import { useCallback, useRef, useEffect } from "react";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";

interface UseIntactForestsLayerProps {
  visible: boolean;
}

export function useIntactForestsLayer({ visible }: UseIntactForestsLayerProps) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // Style function for the intact forests layer - green color scheme
  const styleFunction = useCallback(() => {
    // Use green color for intact forest areas
    const fillColor = "rgba(34, 139, 34, 0.6)"; // Forest green with transparency
    const strokeColor = "rgba(0, 100, 0, 0.8)"; // Darker green for borders
    const strokeWidth = 0.5;

    return new Style({
      fill: new Fill({
        color: fillColor,
      }),
      stroke: new Stroke({
        color: strokeColor,
        width: strokeWidth,
      }),
    });
  }, []);

  // Create and load the layer
  const createLayer = useCallback(async () => {
    try {
      // Try backend API by resolving the actual layer name from list first
      let geoJsonData: unknown | null = null;
      try {
        const listRes = await fetch("/api/v1/layers/list");
        if (listRes.ok) {
          type LayerRow = { name: string; title?: string | null };
          const list = (await listRes.json()) as { layers?: LayerRow[] };
          const norm = (s: string) =>
            s.toLowerCase().replace(/[^a-z0-9]+/g, "_");
          const layers = Array.isArray(list.layers) ? list.layers : [];
          // Best-effort match by name/title
          const candidate =
            layers.find((l) => {
              const n = norm(l.name);
              const t = l.title ? norm(l.title) : "";
              return (
                n.includes("intact") ||
                t.includes("intact") ||
                n === "ifl" ||
                t === "ifl"
              );
            }) || layers[0];
          if (candidate && candidate.name) {
            const apiRes = await fetch(
              `/api/v1/layers/geojson/${encodeURIComponent(candidate.name)}`
            );
            if (apiRes.ok) {
              geoJsonData = (await apiRes.json()) as unknown;
            }
          }
        }
      } catch (e) {
        // ignore and render empty layer below
      }

      // No static fallback: if API not available, render empty collection

      // Create layer
      const source = new VectorSource();
      const layer = new VectorLayer({
        source: source,
        style: styleFunction,
        visible: visible,
        zIndex: 2, // Above other layers but below world boundaries
      });

      // Add features from the intact forests GeoJSON
      const format = new GeoJSON();
      const hasFeaturesArray = (() => {
        const v = geoJsonData as unknown;
        if (v && typeof v === "object") {
          const f = (v as { features?: unknown }).features;
          return Array.isArray(f);
        }
        return false;
      })();
      const features = format.readFeatures(
        hasFeaturesArray && geoJsonData
          ? (geoJsonData as object)
          : { type: "FeatureCollection", features: [] },
        {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        }
      );

      source.addFeatures(features);
      layerRef.current = layer;

      return layer;
    } catch (error) {
      console.error("❌ Failed to create intact forests layer:", error);
      return null;
    }
  }, [styleFunction, visible]);

  // Get layer instance
  const getLayer = useCallback(async () => {
    if (!layerRef.current) {
      return await createLayer();
    }
    return layerRef.current;
  }, [createLayer]);

  // Update visibility
  const setVisible = useCallback((isVisible: boolean) => {
    if (layerRef.current) {
      layerRef.current.setVisible(isVisible);
      // Force redraw to ensure the change is rendered
      layerRef.current.changed();
    }
  }, []);

  // Update visibility when the visible prop changes
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(visible);
      // Force redraw to ensure the change is rendered, especially in production
      layerRef.current.changed();
    }
  }, [visible]);

  return {
    getLayer,
    setVisible,
    layerRef,
  };
}
