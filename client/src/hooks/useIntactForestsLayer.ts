import { useCallback, useRef, useEffect } from "react";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
// import { fetchWithRetry } from "../utils/fetchWithRetry"; // Temporarily disabled
import { useLayerCache } from "./map/useLayerCache";

interface UseIntactForestsLayerProps {
  visible: boolean;
}

export function useIntactForestsLayer({ visible }: UseIntactForestsLayerProps) {
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const { getCachedGeoJson } = useLayerCache();
  const pendingVisibilityRef = useRef<boolean | null>(null);
  const isLoadingRef = useRef<boolean>(false);

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
    if (isLoadingRef.current) {
      // Layer is already being created, wait for completion
      while (isLoadingRef.current) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return layerRef.current;
    }

    try {
      isLoadingRef.current = true;
      console.log("🔄 Creating intact forests layer...");

      // Initialize geoJsonData
      let geoJsonData: unknown = null;

      // TEMPORARY PERFORMANCE FIX: Skip database layer loading
      // This prevents the slow database query that's causing site performance issues
      // TODO: Optimize the database query and re-enable
      /*
      if (shouldLoad) {
        if (shouldTryDb) {
          const listRes = await fetchWithRetry(
            "/api/v1/layers/list",
            { method: "GET" },
            3,
            400,
            15000
          );
          if (listRes.ok) {
            type LayerRow = { name: string; title?: string | null };
            const list = (await listRes.json()) as {
              layers?: LayerRow[];
              note?: string;
            };
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
            const shouldRetryDb = list.note === "db_unavailable";
            if (candidate && candidate.name) {
              const fetchGeo = async () => {
                const res = await fetchWithRetry(
                  `/api/v1/layers/geojson/${encodeURIComponent(candidate.name)}`,
                  { method: "GET" },
                  3,
                  400,
                  30000
                );
                if (res.ok) {
                  return (await res.json()) as unknown;
                }
                return null;
              };
              geoJsonData = await fetchGeo();
              // If DB was unavailable or empty features returned, retry once
              type FC = { type: string; features?: unknown[] };
              const empty = (() => {
                if (
                  geoJsonData &&
                  typeof geoJsonData === "object" &&
                  (geoJsonData as FC).features &&
                  Array.isArray((geoJsonData as FC).features)
                ) {
                  return ((geoJsonData as FC).features as unknown[]).length === 0;
                }
                return false;
              })();
              if (shouldRetryDb || empty) {
                await new Promise((r) => setTimeout(r, 1200));
                geoJsonData = await fetchGeo();
              }
            }
          }
        }
      }
      */

      // Fallback to static file if API not available or returned no data
      if (!geoJsonData) {
        try {
          geoJsonData = await getCachedGeoJson(
            "/data/intact-forest-landscapes-simplified-2020.geojson"
          );
          console.info("✅ IFL: Using static file fallback");
        } catch (error) {
          console.warn("⚠️ IFL: Static file fallback failed:", error);
        }
      }

      // Create layer with initial visibility from current state or pending state
      const initialVisibility = pendingVisibilityRef.current !== null 
        ? pendingVisibilityRef.current 
        : visible;

      // Create layer
      const source = new VectorSource();
      const layer = new VectorLayer({
        source: source,
        style: styleFunction,
        visible: initialVisibility,
        zIndex: 30, // Intact forests - above population density
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
      console.info(`✅ IFL features loaded: ${features.length}`);
      
      // Clear pending visibility state since layer is now created
      pendingVisibilityRef.current = null;
      isLoadingRef.current = false;
      
      layerRef.current = layer;

      console.log("✅ Intact forests layer created with visibility:", layer.getVisible());
      return layer;
    } catch (error) {
      console.error("❌ Failed to create intact forests layer:", error);
      isLoadingRef.current = false;
      return null;
    }
  }, [styleFunction, visible, getCachedGeoJson]);

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
      // Layer exists, apply visibility immediately
      layerRef.current.setVisible(isVisible);
      console.log("✅ Intact forests layer visibility set to:", isVisible);
      // Force layer redraw and clear any cached tiles
      layerRef.current.changed();
      const source = layerRef.current.getSource();
      if (source) {
        source.changed();
      }
      // Clear any pending state since we applied it
      pendingVisibilityRef.current = null;
    } else {
      // Layer doesn't exist yet, store the desired visibility state
      pendingVisibilityRef.current = isVisible;
      console.log("📝 Intact forests layer visibility pending:", isVisible);
      
      // If layer is not currently loading and user wants it visible, trigger loading
      if (isVisible && !isLoadingRef.current) {
        console.log("🚀 Triggering intact forests layer creation due to visibility toggle");
        createLayer();
      }
    }
  }, [createLayer]);

  // Update visibility when the visible prop changes
  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.setVisible(visible);
      // Force layer redraw and clear any cached tiles
      layerRef.current.changed();
      const source = layerRef.current.getSource();
      if (source) {
        source.changed();
      }
    }
  }, [visible]);

  return {
    getLayer,
    setVisible,
    layerRef,
  };
}
