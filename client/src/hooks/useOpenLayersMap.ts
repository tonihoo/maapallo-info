import { useCallback, useEffect, useRef, useState } from "react";
import { View, Map as OlMap, Feature } from "ol";
import { GeoJSON } from "ol/format";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle } from "ol/style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
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
  const [currentBaseMap, setCurrentBaseMap] = useState<BaseMapKey>("topo");

  // Measurement state
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState<string>("");
  const measureDrawRef = useRef<Draw | null>(null);
  const measureSourceRef = useRef<VectorSource | null>(null);

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

    return new OlMap({
      target: undefined,
      controls: [],
      view: olView,
      keyboardEventTarget: document,
      layers: [
        BASE_MAPS.topo.layer(),
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

  const handleBaseMapChange = useCallback(
    (baseMapKey: BaseMapKey) => {
      const layers = olMap.getLayers();
      const newBaseLayer = BASE_MAPS[baseMapKey].layer();
      layers.setAt(0, newBaseLayer);
      setCurrentBaseMap(baseMapKey);
    },
    [olMap]
  );

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
      if (!layers || layers.length < 2) return;

      const vectorLayer = layers[1] as VectorLayer<VectorSource>;
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
    } catch (error) {
      console.error("Error updating features:", error);
    }
  }, [features, olMap]);

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
    const vectorLayer = layers[1] as VectorLayer<VectorSource>;
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
    // Measurement functionality
    isMeasuring,
    currentMeasurement,
    toggleMeasurement,
    clearMeasurements,
  };
}
