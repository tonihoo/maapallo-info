import { GlobalStyles, useMediaQuery, useTheme } from "@mui/material";
import { View, Map as OlMap, Feature } from "ol";
import { GeoJSON } from "ol/format";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector";
import { Circle } from "ol/style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { FeatureLike } from "ol/Feature";
import { toLonLat, fromLonLat } from "ol/proj";
import {
  Feature as GeoJSONFeature,
  Geometry,
  GeoJsonProperties,
} from "geojson";
import { CoordinatesDisplay } from "./CoordinatesDisplay";
import { LocationSearch } from "./LocationSearch";

interface Props {
  children?: ReactNode;
  features?: GeoJSONFeature<Geometry, GeoJsonProperties>[];
  onMapClick?: (coordinates: number[]) => void;
  onFeatureClick?: (featureId: number) => void;
  onFeatureHover?: (featureId: number | null) => void;
  selectedFeatureId?: number | null;
}

// Constants for 2D map controls
const INITIAL_VIEW = {
  center: [-13, 18], // Horn of Africa in lon/lat
  zoom: 3,
};

const ZOOM_LIMITS = {
  min: 1,
  max: 18,
};

const ANIMATION_DURATIONS = {
  zoom: 500,
  rotate: 300,
  home: 1500,
};

export function Map({
  children,
  onMapClick,
  onFeatureClick,
  onFeatureHover,
  features = [],
  selectedFeatureId,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mouseCoordinates, setMouseCoordinates] = useState<{
    lon: number;
    lat: number;
  } | null>(null);

  // Add mobile detection
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const styleFunction = (feature: FeatureLike) => {
    const featureType = feature.get("featureType");
    const isSelected = feature.get("id") === selectedFeatureId;

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
        // Completely remove any text rendering
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
  };

  /**
   * OpenLayers View: @see https://openlayers.org/en/latest/apidoc/module-ol_View-View.html
   */
  const [olView] = useState(() => {
    return new View({
      center: fromLonLat(INITIAL_VIEW.center), // Center on Horn of Africa in lon/lat
      zoom: INITIAL_VIEW.zoom,
      projection: "EPSG:3857", // Web Mercator for global view
      minZoom: ZOOM_LIMITS.min,
      maxZoom: ZOOM_LIMITS.max,
    });
  });

  /**
   * OpenLayers Map: @see https://openlayers.org/en/latest/apidoc/module-ol_Map-Map.html
   */
  const [olMap] = useState(() => {
    return new OlMap({
      target: "",
      controls: [],
      view: olView,
      keyboardEventTarget: document,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: new VectorSource(),
          style: styleFunction,
        }),
      ],
    });
  });

  // Handle location search selection
  const handleLocationSelect = useCallback(
    (lat: number, lon: number) => {
      // Zoom to the selected location
      olView.animate({
        center: fromLonLat([lon, lat]),
        zoom: 12,
        duration: 1000,
      });
    },
    [olView]
  );

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

  /** olMap -object's initialization on startup  */
  useEffect(() => {
    if (!mapRef.current) return;

    olMap.setTarget(mapRef.current as HTMLElement);

    // Handle click events
    const clickHandler = (event: any) => {
      try {
        // Check if a feature was clicked
        const feature = olMap.forEachFeatureAtPixel(
          event.pixel,
          (feature) => feature
        );

        if (feature && feature.get("featureType") === "feature") {
          // Feature clicked
          const featureId = feature.get("id");
          if (featureId && onFeatureClick) {
            onFeatureClick(featureId);

            // Zoom to feature
            const geometry = feature.getGeometry();
            if (geometry) {
              olView.animate({
                center: (geometry as any).getCoordinates(),
                zoom: 8,
                duration: 1000,
              });
            }
          }
        } else if (onMapClick && event.coordinate) {
          // Empty space clicked - convert coordinates to lon/lat
          const coordinates = toLonLat(event.coordinate);
          onMapClick(coordinates);
        }
      } catch (error) {
        console.error("Error in click handler:", error);
      }
    };

    // Handle hover events and coordinate tracking
    const pointerMoveHandler = (event: any) => {
      try {
        if (!event.coordinate) return;

        const feature = olMap.forEachFeatureAtPixel(
          event.pixel,
          (feature) => feature
        );

        // Update mouse coordinates
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
          // Change cursor to pointer when hovering over features
          const viewport = olMap.getViewport();
          if (viewport) {
            viewport.style.cursor = "pointer";
          }
        } else {
          if (onFeatureHover) {
            onFeatureHover(null);
          }
          // Reset cursor when not hovering over features
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

    // Clean up event listeners on unmount
    return () => {
      olMap.un("click", clickHandler);
      olMap.un("pointermove", pointerMoveHandler);
    };
  }, [olMap, onMapClick, onFeatureClick, onFeatureHover, olView]);

  /** Listen for changes in the 'features' property */
  useEffect(() => {
    try {
      const layers = olMap.getLayers().getArray();
      if (!layers || layers.length < 2) return;

      const vectorLayer = layers[1] as VectorLayer<VectorSource>;
      const source = vectorLayer.getSource();
      if (!source) return;

      // Clear existing features
      source.clear();

      // Skip adding new features if none provided
      if (!features || !features.length) return;

      // Add new features
      const olFeatures = features.map((geoJsonFeature) => {
        const olFeature = new Feature({
          geometry: new GeoJSON().readGeometry(geoJsonFeature.geometry, {
            dataProjection: "EPSG:4326",
            featureProjection: "EPSG:3857",
          }),
        });

        // Copy properties to the OpenLayers feature
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

  const buttonStyle = {
    width: "40px",
    height: "40px",
    backgroundColor: "rgba(42, 42, 42, 0.8)",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "20px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  const smallButtonStyle = {
    ...buttonStyle,
    fontSize: "16px",
    fontWeight: "normal",
  } as const;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Styles for the OpenLayers controls */}
      <GlobalStyles
        styles={{
          ".ol-viewport": {
            cursor: "default",
          },
          ".ol-zoom": {
            position: "absolute",
            top: "65px",
            left: "8px",
            background: "rgba(255,255,255,0.4)",
            borderRadius: "4px",
            padding: "2px",
            display: "flex",
            flexDirection: "column",
          },
        }}
      />
      <div
        style={{ width: "100%", height: "100%", position: "relative" }}
        ref={mapRef}
      >
        {children}
      </div>

      {/* Location Search */}
      <LocationSearch onLocationSelect={handleLocationSelect} />

      {/* Control Panel */}
      <div
        style={{
          position: "absolute",
          bottom: isMobile ? "100px" : "50px", // Much higher on mobile to avoid search bar overlap
          right: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 1000,
        }}
      >
        <button onClick={handleHome} style={smallButtonStyle} title="View Home">
          🏠
        </button>
        <button
          onClick={() => handleZoom(true)}
          style={buttonStyle}
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => handleZoom(false)}
          style={buttonStyle}
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={() => handleRotate("left")}
          style={smallButtonStyle}
          title="Rotate Left"
        >
          ↶
        </button>
        <button
          onClick={() => handleRotate("right")}
          style={smallButtonStyle}
          title="Rotate Right"
        >
          ↷
        </button>
      </div>

      <CoordinatesDisplay coordinates={mouseCoordinates} />
    </div>
  );
}
