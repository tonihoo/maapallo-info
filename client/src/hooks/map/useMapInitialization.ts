import { useState, useRef, useCallback, useEffect } from "react";
import { Map as OlMap, View } from "ol";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle } from "ol/style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import { FeatureLike } from "ol/Feature";
import { BASE_MAPS, BaseMapKey } from "../../components/2d/BaseMapSelector";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import {
  setCurrentBaseMap,
  setMapInitialized,
} from "../../store/slices/mapSlice";

interface UseMapInitializationProps {
  olView: View; // OpenLayers View from useMapView
  styleFunction?: (feature: FeatureLike) => Style;
  measureSourceRef: React.RefObject<VectorSource | null>;
  worldBoundariesLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  oceanCurrentsLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
}

export function useMapInitialization({
  olView,
  styleFunction,
  measureSourceRef,
  worldBoundariesLayerRef,
  oceanCurrentsLayerRef,
}: UseMapInitializationProps) {
  // Redux state and dispatch
  const currentBaseMap = useAppSelector((state) => state.map.currentBaseMap);
  const mapConfig = useAppSelector((state) => state.map.mapConfig);
  const dispatch = useAppDispatch();

  const mapRef = useRef<HTMLDivElement>(null);

  // OpenLayers Map
  const [olMap] = useState(() => {
    // Create measurement source and layer
    const measureSource = new VectorSource();
    measureSourceRef.current = measureSource;

    const measureLayer = new VectorLayer({
      source: measureSource,
      style: new Style({
        stroke: new Stroke({
          color: "#ffcc33",
          width: 3,
        }),
        image: new Circle({
          radius: 5,
          fill: new Fill({ color: "#ffcc33" }),
          stroke: new Stroke({ color: "#ff9900", width: 2 }),
        }),
      }),
      zIndex: 50, // Measurement layer always on top
    });

    // Create world boundaries layer with country labels
    const worldBoundariesSource = new VectorSource();

    const worldBoundariesLayer = new VectorLayer({
      source: worldBoundariesSource,
      style: (feature: FeatureLike, resolution: number) => {
        const zoom = olView.getZoomForResolution(resolution);
        const countryName = feature.get("name") || feature.get("name_fi") || "";

        // Show labels only at zoom level 3 and above, below 10.
        const showLabels = zoom >= 4;

        return new Style({
          stroke: new Stroke({
            color: "rgba(255, 255, 255, 0.8)",
            width: 0.5,
          }),
          fill: new Fill({
            color: "rgba(255, 255, 255, 0)",
          }),
          text:
            showLabels && countryName
              ? new Text({
                  text: countryName,
                  font: "12px Calibri,sans-serif",
                  fill: new Fill({
                    color: "rgba(255, 255, 255, 0.9)",
                  }),
                  stroke: new Stroke({
                    color: "rgba(0, 0, 0, 0.7)",
                    width: 2,
                  }),
                  offsetY: 0,
                  placement: "point",
                  overflow: true,
                  maxAngle: 0,
                })
              : undefined,
        });
      },
      visible: true,
      zIndex: 35, // Above all data layers but below article locators
    });

    // Store reference to world boundaries layer
    worldBoundariesLayerRef.current = worldBoundariesLayer;

    // Create ocean currents layer
    const oceanCurrentsSource = new VectorSource();
    const oceanCurrentsLayer = new VectorLayer({
      source: oceanCurrentsSource,
      style: (feature: FeatureLike, resolution: number) => {
        const zoom = olView.getZoomForResolution(resolution);
        const temp = feature.get("TEMP") || "";
        const name = feature.get("NAME") || "";

        // Show ocean currents at zoom level 1 and above for testing
        const showCurrent = zoom >= 1; // Lowered from 3 to 1 for easier testing

        if (!showCurrent) {
          return new Style(); // Empty style when zoomed out
        }

        // Color based on temperature
        const strokeColor =
          temp === "warm"
            ? "rgba(255, 69, 0, 0.7)" // Red-orange for warm currents
            : "rgba(0, 191, 255, 0.7)"; // Deep sky blue for cold currents

        const fillColor =
          temp === "warm"
            ? "rgba(255, 69, 0, 0.2)" // Semi-transparent red-orange
            : "rgba(0, 191, 255, 0.2)"; // Semi-transparent blue

        // Show labels at higher zoom levels
        const showLabels = zoom >= 5 && name.trim();

        return new Style({
          stroke: new Stroke({
            color: strokeColor,
            width: 1.5,
          }),
          fill: new Fill({
            color: fillColor,
          }),
          text: showLabels
            ? new Text({
                text: name,
                font: "10px Arial,sans-serif",
                fill: new Fill({
                  color:
                    temp === "warm"
                      ? "rgba(139, 0, 0, 0.9)"
                      : "rgba(0, 0, 139, 0.9)",
                }),
                stroke: new Stroke({
                  color: "rgba(255, 255, 255, 0.8)",
                  width: 1,
                }),
                offsetY: 0,
                placement: "point",
                overflow: true,
              })
            : undefined,
        });
      },
      visible: true, // Initially visible based on default layer visibility
      zIndex: 32, // Above data layers but below world boundaries
    });

    // Store reference to ocean currents layer
    oceanCurrentsLayerRef.current = oceanCurrentsLayer;

    const map = new OlMap({
      target: undefined,
      controls: [],
      view: olView,
      keyboardEventTarget: document,
      layers: [
        (() => {
          const baseLayer = BASE_MAPS.topo.layer();
          baseLayer.setZIndex(0); // Explicitly set base map z-index
          return baseLayer;
        })(), // Base map with z-index 0
        worldBoundariesLayer, // z-index 10
        oceanCurrentsLayer, // Ocean currents layer
        new VectorLayer({
          source: new VectorSource(),
          style: styleFunction || new Style(), // Use provided style or default
          zIndex: 40, // Article locators layer above all data layers
        }),
        measureLayer, // Add measurement layer on top
      ],
    });

    return map;
  });

  // Set map as initialized after creation
  useEffect(() => {
    dispatch(setMapInitialized(true));
  }, [dispatch]);

  // Base map change handler using Redux
  const handleBaseMapChange = useCallback(
    (baseMapKey: BaseMapKey) => {
      const layers = olMap.getLayers();
      const newBaseLayer = BASE_MAPS[baseMapKey].layer();
      layers.setAt(0, newBaseLayer);
      dispatch(setCurrentBaseMap(baseMapKey));
    },
    [olMap, dispatch]
  );

  return {
    olMap,
    mapRef,
    currentBaseMap,
    handleBaseMapChange,
    mapConfig,
  };
}
