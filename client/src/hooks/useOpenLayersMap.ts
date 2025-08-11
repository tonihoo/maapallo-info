import { useCallback, useEffect, useRef, useState } from "react";
import { View, Map as OlMap, Feature } from "ol";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle } from "ol/style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import { FeatureLike } from "ol/Feature";
import { toLonLat, fromLonLat } from "ol/proj";
import type { MapBrowserEvent } from "ol";
import { Point, LineString } from "ol/geom";
import { Draw } from "ol/interaction";
import { getLength } from "ol/sphere";
import { unByKey } from "ol/Observable";
import {
  Feature as GeoJSONFeature,
  Geometry,
  GeoJsonProperties,
} from "geojson";
import { BASE_MAPS, BaseMapKey } from "../components/2d/BaseMapSelector";
import {
  INITIAL_VIEW,
  ZOOM_LIMITS,
  ANIMATION_DURATIONS,
} from "../constants/mapConstants";

interface UseOpenLayersMapProps {
  features: GeoJSONFeature<Geometry, GeoJsonProperties>[];
  selectedFeatureId: number | null;
  onMapClick?: (coordinates: number[]) => void;
  onFeatureClick?: (featureId: number) => void;
  onFeatureHover?: (featureId: number | null) => void;
}

interface LayerVisibility {
  worldBoundaries: boolean;
  oceanCurrents: boolean;
  articleLocators: boolean;
}

export function useOpenLayersMap({
  features,
  selectedFeatureId,
  onMapClick,
  onFeatureClick,
  onFeatureHover,
}: UseOpenLayersMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mouseCoordinates, setMouseCoordinates] = useState<{
    lon: number;
    lat: number;
  } | null>(null);
  const [currentBaseMap, setCurrentBaseMap] = useState<BaseMapKey>("topo"); // Back to default

  // Layer visibility state
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    worldBoundaries: false,
    oceanCurrents: false,
    articleLocators: true, // Default to true since features are shown by default
  });

  // Measurement state
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState<string>("");
  const measureDrawRef = useRef<Draw | null>(null);
  const measureSourceRef = useRef<VectorSource | null>(null);

  // World boundaries layer reference
  const worldBoundariesLayerRef = useRef<VectorLayer<VectorSource> | null>(
    null
  );

  // Ocean currents layer reference
  const oceanCurrentsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // Article locators layer reference
  const articleLocatorsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  // Store selectedFeatureId in a ref so it's always current
  const selectedFeatureIdRef = useRef<number | null>(selectedFeatureId);

  // Update the ref whenever selectedFeatureId changes
  useEffect(() => {
    selectedFeatureIdRef.current = selectedFeatureId;
  }, [selectedFeatureId]);

  // Create a styleFunction that uses the ref for the current value
  const styleFunction = useCallback((feature: FeatureLike) => {
    const featureType = feature.get("featureType");
    const featureId = feature.get("id");
    const currentSelectedId = selectedFeatureIdRef.current;
    const isSelected = featureId === currentSelectedId;

    if (featureType === "feature") {
      return new Style({
        image: new Circle({
          radius: isSelected ? 12 : 8,
          fill: new Fill({ color: isSelected ? "#ff0000" : "#ff8c00" }),
          stroke: new Stroke({
            color: isSelected ? "#ffffff" : "#000080",
            width: isSelected ? 3 : 2,
          }),
        }),
      });
    } else if (featureType === "clickLocation") {
      return new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color: "#FF6B35" }),
          stroke: new Stroke({ color: "#E55100", width: 3 }),
        }),
      });
    } else {
      return new Style({
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: "#ffb34c" }),
          stroke: new Stroke({ color: "darkblue", width: 3 }),
        }),
      });
    }
  }, []);

  // OpenLayers View
  const [olView] = useState(() => {
    return new View({
      center: fromLonLat(INITIAL_VIEW.center),
      zoom: INITIAL_VIEW.zoom,
      projection: "EPSG:3857",
      minZoom: ZOOM_LIMITS.min,
      maxZoom: ZOOM_LIMITS.max,
    });
  });

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
    });

    // Store reference to ocean currents layer
    oceanCurrentsLayerRef.current = oceanCurrentsLayer;

    // Create article locators layer
    const articleLocatorsSource = new VectorSource();
    const articleLocatorsLayer = new VectorLayer({
      source: articleLocatorsSource,
      style: (feature: FeatureLike) => {
        const isHighlighted = feature.get("highlighted");

        return new Style({
          image: new Circle({
            radius: isHighlighted ? 10 : 7,
            fill: new Fill({
              color: isHighlighted ? "#ff4444" : "#1976d2"
            }),
            stroke: new Stroke({
              color: "#ffffff",
              width: isHighlighted ? 3 : 2
            }),
          }),
        });
      },
      visible: false, // Initially hidden
    });

    // Store reference to article locators layer
    articleLocatorsLayerRef.current = articleLocatorsLayer;

    return new OlMap({
      target: undefined,
      controls: [],
      view: olView,
      keyboardEventTarget: document,
      layers: [
        BASE_MAPS.topo.layer(), // This should be dynamic based on currentBaseMap
        worldBoundariesLayer,
        oceanCurrentsLayer, // Ocean currents layer
        articleLocatorsLayer, // Article locators layer
        new VectorLayer({
          source: new VectorSource(),
          style: styleFunction,
        }),
        measureLayer, // Add measurement layer on top
      ],
    });
  });

  // Control functions
  const handleZoom = useCallback(
    (zoomIn: boolean) => {
      const currentZoom = olView.getZoom() || INITIAL_VIEW.zoom;
      const newZoom = zoomIn
        ? Math.min(currentZoom + 1, ZOOM_LIMITS.max)
        : Math.max(currentZoom - 1, ZOOM_LIMITS.min);

      olView.animate({
        zoom: newZoom,
        duration: ANIMATION_DURATIONS.zoom,
      });
    },
    [olView]
  );

  const handleRotate = useCallback(
    (direction: "left" | "right") => {
      const currentRotation = olView.getRotation();
      const rotationIncrement = Math.PI / 12; // 15 degrees in radians
      const newRotation =
        direction === "left"
          ? currentRotation - rotationIncrement
          : currentRotation + rotationIncrement;

      olView.animate({
        rotation: newRotation,
        duration: ANIMATION_DURATIONS.rotate,
      });
    },
    [olView]
  );

  const handleHome = useCallback(() => {
    olView.animate({
      center: fromLonLat(INITIAL_VIEW.center),
      zoom: INITIAL_VIEW.zoom,
      rotation: 0,
      duration: ANIMATION_DURATIONS.home,
    });
  }, [olView]);

  const handleLocationSelect = useCallback(
    (lat: number, lon: number) => {
      olView.animate({
        center: fromLonLat([lon, lat]),
        zoom: 12,
        duration: 1000,
      });
    },
    [olView]
  );

  // Measurement functions
  const formatLength = useCallback((length: number) => {
    if (length > 100) {
      return Math.round((length / 1000) * 100) / 100 + " km";
    } else {
      return Math.round(length * 100) / 100 + " m";
    }
  }, []);

  const toggleMeasurement = useCallback(() => {
    if (isMeasuring) {
      // Stop measuring
      if (measureDrawRef.current) {
        olMap.removeInteraction(measureDrawRef.current);
        measureDrawRef.current = null;
      }
      setIsMeasuring(false);
    } else {
      // Start measuring - clear previous measurements
      if (measureSourceRef.current) {
        measureSourceRef.current.clear();
      }
      setCurrentMeasurement("");

      const draw = new Draw({
        source: measureSourceRef.current || new VectorSource(),
        type: "LineString",
        style: new Style({
          stroke: new Stroke({
            color: "#ffcc33",
            width: 3,
            lineDash: [10, 10],
          }),
          image: new Circle({
            radius: 5,
            fill: new Fill({ color: "#ffcc33" }),
            stroke: new Stroke({ color: "#ff9900", width: 2 }),
          }),
        }),
      });

      measureDrawRef.current = draw;
      olMap.addInteraction(draw);

      let listener: ReturnType<typeof unByKey> | null = null;
      draw.on("drawstart", (evt) => {
        const sketch = evt.feature;
        const geometry = sketch.getGeometry();
        if (geometry) {
          listener = geometry.on("change", (evt) => {
            const geom = evt.target as LineString;
            const length = getLength(geom);
            setCurrentMeasurement(formatLength(length));
          });
        }
      });

      draw.on("drawend", () => {
        if (listener) {
          unByKey(listener);
        }
        // Keep the measurement active but remove the draw interaction
        olMap.removeInteraction(draw);
        measureDrawRef.current = null;
        setIsMeasuring(false);
      });

      setIsMeasuring(true);
    }
  }, [isMeasuring, olMap, formatLength]);

  // Function to clear measurements
  const clearMeasurements = useCallback(() => {
    if (measureSourceRef.current) {
      measureSourceRef.current.clear();
    }
    setCurrentMeasurement("");
    if (measureDrawRef.current) {
      olMap.removeInteraction(measureDrawRef.current);
      measureDrawRef.current = null;
    }
    setIsMeasuring(false);
  }, [olMap]);

  // Layer visibility control
  const handleLayerVisibilityChange = useCallback(
    (layerId: string, visible: boolean) => {
      setLayerVisibility((prev) => ({
        ...prev,
        [layerId]: visible,
      }));

      // Update the actual layer visibility
      if (layerId === "worldBoundaries" && worldBoundariesLayerRef.current) {
        worldBoundariesLayerRef.current.setVisible(visible);
      } else if (layerId === "oceanCurrents" && oceanCurrentsLayerRef.current) {
        oceanCurrentsLayerRef.current.setVisible(visible);
      } else if (layerId === "articleLocators" && articleLocatorsLayerRef.current) {
        articleLocatorsLayerRef.current.setVisible(visible);
      }
    },
    []
  );

  const handleBaseMapChange = useCallback(
    (baseMapKey: BaseMapKey) => {
      const layers = olMap.getLayers();
      const newBaseLayer = BASE_MAPS[baseMapKey].layer();
      layers.setAt(0, newBaseLayer);
      setCurrentBaseMap(baseMapKey);
    },
    [olMap]
  );

  // Load world boundaries
  const loadWorldBoundaries = useCallback(async () => {
    try {
      const response = await fetch("/data/world.geojson");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const geojsonData = await response.json();

      if (worldBoundariesLayerRef.current) {
        const source = worldBoundariesLayerRef.current.getSource();

        if (source) {
          source.clear();

          const format = new GeoJSON();
          const features = format.readFeatures(geojsonData, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          });

          source.addFeatures(features);

          // Force redraw
          worldBoundariesLayerRef.current.changed();
        }
      } else {
        console.error("❌ World boundaries layer reference is null!");
      }
    } catch (error) {
      console.warn("❌ Failed to load world boundaries:", error);
    }
  }, []);

  // Load ocean currents
  const loadOceanCurrents = useCallback(async () => {
    try {
      const response = await fetch("/data/ocean-currents.geojson");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const geojsonData = await response.json();

      if (oceanCurrentsLayerRef.current) {
        const source = oceanCurrentsLayerRef.current.getSource();

        if (source) {
          source.clear();

          const format = new GeoJSON();
          const features = format.readFeatures(geojsonData, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          });

          source.addFeatures(features);

          // Force redraw
          oceanCurrentsLayerRef.current.changed();
        }
      } else {
        console.error("❌ Ocean currents layer reference is null!");
      }
    } catch (error) {
      console.warn("❌ Failed to load ocean currents:", error);
    }
  }, []);

  // Load article locators
  const loadArticleLocators = useCallback(async () => {
    try {
      const response = await fetch("/data/article-locators.geojson");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const geojsonData = await response.json();

      if (articleLocatorsLayerRef.current) {
        const source = articleLocatorsLayerRef.current.getSource();

        if (source) {
          source.clear();

          const format = new GeoJSON();
          const features = format.readFeatures(geojsonData, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          });

          source.addFeatures(features);

          // Force redraw
          articleLocatorsLayerRef.current.changed();
        }
      } else {
        console.error("❌ Article locators layer reference is null!");
      }
    } catch (error) {
      console.warn("❌ Failed to load article locators:", error);
    }
  }, []);

  // Load world boundaries when map is ready
  useEffect(() => {
    if (olMap && worldBoundariesLayerRef.current) {
      // Debug layer structure
      const layers = olMap.getLayers().getArray();

      // Small delay to ensure map is fully initialized
      const timer = setTimeout(() => {
        loadWorldBoundaries();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [olMap, loadWorldBoundaries]);

  // Load ocean currents when map is ready
  useEffect(() => {
    if (olMap && oceanCurrentsLayerRef.current) {
      // Small delay to ensure map is fully initialized
      const timer = setTimeout(() => {
        loadOceanCurrents();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [olMap, loadOceanCurrents]);

  // Load article locators when map is ready
  useEffect(() => {
    if (olMap && articleLocatorsLayerRef.current) {
      // Small delay to ensure map is fully initialized
      const timer = setTimeout(() => {
        loadArticleLocators();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [olMap, loadArticleLocators]);

  // Update layer visibility when state changes
  useEffect(() => {
    if (worldBoundariesLayerRef.current) {
      worldBoundariesLayerRef.current.setVisible(
        layerVisibility.worldBoundaries
      );
    }
  }, [layerVisibility.worldBoundaries]);

  useEffect(() => {
    if (oceanCurrentsLayerRef.current) {
      oceanCurrentsLayerRef.current.setVisible(layerVisibility.oceanCurrents);

      // Force a redraw to ensure the layer updates
      if (layerVisibility.oceanCurrents) {
        oceanCurrentsLayerRef.current.changed();
      }
    }
  }, [layerVisibility.oceanCurrents]);

  // Update article locators layer visibility when state changes
  useEffect(() => {
    // Update the main features layer visibility (the orange locators)
    const layers = olMap.getLayers().getArray();
    if (layers.length >= 5) {
      const vectorLayer = layers[4] as VectorLayer<VectorSource>; // Features layer
      if (vectorLayer) {
        vectorLayer.setVisible(layerVisibility.articleLocators);
      }
    }

    // Also update the dedicated article locators layer if it exists
    if (articleLocatorsLayerRef.current) {
      articleLocatorsLayerRef.current.setVisible(layerVisibility.articleLocators);

      // Force a redraw to ensure the layer updates
      if (layerVisibility.articleLocators) {
        articleLocatorsLayerRef.current.changed();
      }
    }
  }, [layerVisibility.articleLocators, olMap]);

  // Update world boundaries style when zoom changes (for labels)
  useEffect(() => {
    const handleZoomChange = () => {
      if (worldBoundariesLayerRef.current) {
        // Force style update by changing the layer
        worldBoundariesLayerRef.current.changed();
      }
    };

    olView.on("change:resolution", handleZoomChange);

    return () => {
      olView.un("change:resolution", handleZoomChange);
    };
  }, [olView]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    olMap.setTarget(mapRef.current as HTMLElement);

    // Handle click events
    const clickHandler = (event: MapBrowserEvent<UIEvent>) => {
      try {
        const feature = olMap.forEachFeatureAtPixel(
          event.pixel,
          (feature) => feature
        );

        if (feature && feature.get("featureType") === "feature") {
          const featureId = feature.get("id");
          if (featureId && onFeatureClick) {
            onFeatureClick(featureId);

            const geometry = feature.getGeometry();
            if (geometry && geometry instanceof Point) {
              olView.animate({
                center: geometry.getCoordinates(),
                zoom: 8,
                duration: 1000,
              });
            }
          }
        } else if (onMapClick && event.coordinate) {
          const coordinates = toLonLat(event.coordinate);
          onMapClick(coordinates);
        }
      } catch (error) {
        console.error("Error in click handler:", error);
      }
    };

    // Handle hover events and coordinate tracking
    const pointerMoveHandler = (event: MapBrowserEvent<UIEvent>) => {
      try {
        if (!event.coordinate) return;

        const feature = olMap.forEachFeatureAtPixel(
          event.pixel,
          (feature) => feature
        );

        const coordinates = toLonLat(event.coordinate);
        setMouseCoordinates({
          lon: Number(coordinates[0].toFixed(4)),
          lat: Number(coordinates[1].toFixed(4)),
        });

        if (feature && feature.get("featureType") === "feature") {
          const featureId = feature.get("id");
          if (onFeatureHover) {
            onFeatureHover(featureId);
          }
          const viewport = olMap.getViewport();
          if (viewport) {
            viewport.style.cursor = "pointer";
          }
        } else {
          if (onFeatureHover) {
            onFeatureHover(null);
          }
          const viewport = olMap.getViewport();
          if (viewport) {
            viewport.style.cursor = "";
          }
        }
      } catch (error) {
        console.error("Error in pointer move handler:", error);
      }
    };

    olMap.on("click", clickHandler);
    olMap.on("pointermove", pointerMoveHandler);

    return () => {
      olMap.un("click", clickHandler);
      olMap.un("pointermove", pointerMoveHandler);
    };
  }, [olMap, onMapClick, onFeatureClick, onFeatureHover, olView]);

  // Update features
  useEffect(() => {
    try {
      const layers = olMap.getLayers().getArray();
      if (!layers || layers.length < 5) return;

      const vectorLayer = layers[4] as VectorLayer<VectorSource>; // Updated index for features layer
      const source = vectorLayer.getSource();
      if (!source) return;

      source.clear();

      if (!features || !features.length) return;

      const olFeatures = features.map((geoJsonFeature) => {
        const olFeature = new Feature({
          geometry: new GeoJSON().readGeometry(geoJsonFeature.geometry, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          }),
        });

        if (geoJsonFeature.properties) {
          Object.keys(geoJsonFeature.properties).forEach((key) => {
            olFeature.set(key, geoJsonFeature.properties?.[key]);
          });
        }

        return olFeature;
      });

      source.addFeatures(olFeatures);

      // Update the layer visibility based on articleLocators setting
      vectorLayer.setVisible(layerVisibility.articleLocators);
    } catch (error) {
      console.error("Error updating features:", error);
    }
  }, [features, olMap, layerVisibility.articleLocators]);

  // Zoom to selected feature
  useEffect(() => {
    try {
      if (!selectedFeatureId) return;

      const selectedFeature = features.find(
        (feature) => feature.properties?.id === selectedFeatureId
      );

      if (selectedFeature?.geometry?.type === "Point") {
        const [lon, lat] = selectedFeature.geometry.coordinates;
        olView.animate({
          center: fromLonLat([lon, lat]),
          zoom: 6,
          duration: 1500,
        });
      }
    } catch (error) {
      console.error("Error zooming to feature:", error);
    }
  }, [selectedFeatureId, features, olView]);

  // Force re-render of feature styles when selection changes
  useEffect(() => {
    const layers = olMap.getLayers().getArray();
    const vectorLayer = layers[4] as VectorLayer<VectorSource>; // Updated index for features layer
    if (vectorLayer) {
      vectorLayer.setStyle(styleFunction);
    }
  }, [selectedFeatureId, styleFunction, olMap]);

  return {
    mapRef,
    mouseCoordinates,
    currentBaseMap,
    handleZoom,
    handleRotate,
    handleHome,
    handleLocationSelect,
    handleBaseMapChange,
    isMeasuring,
    currentMeasurement,
    toggleMeasurement,
    clearMeasurements,
    layerVisibility,
    handleLayerVisibilityChange,
  };
}
