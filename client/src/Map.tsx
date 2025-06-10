import { GlobalStyles } from "@mui/material";
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
import { FeatureLike } from 'ol/Feature';
import { Zoom } from 'ol/control';
import { toLonLat, fromLonLat } from 'ol/proj';
import { Feature as GeoJSONFeature, Geometry, GeoJsonProperties } from 'geojson';
import { CoordinatesDisplay } from "./CoordinatesDisplay";

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
  center: [25, 20], // Horn of Africa in lon/lat
  zoom: 3
};

const ZOOM_LIMITS = {
  min: 1,
  max: 18
};

const ANIMATION_DURATIONS = {
  zoom: 500,
  rotate: 300,
  home: 1500
};

export function Map({ children, onMapClick, onFeatureClick, onFeatureHover, features = [], selectedFeatureId }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mouseCoordinates, setMouseCoordinates] = useState<{ lon: number; lat: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const styleFunction = (feature: FeatureLike) => {
    const featureType = feature.get('featureType');
    const isSelected = feature.get('id') === selectedFeatureId;

    if (featureType === 'feature') {
      return new Style({
        image: new Circle({
          radius: isSelected ? 12 : 8,
          fill: new Fill({ color: isSelected ? "#ff0000" : "#ff8c00" }),
          stroke: new Stroke({
            color: isSelected ? "#ffffff" : "#000080",
            width: isSelected ? 3 : 2
          }),
        }),
        // Completely remove any text rendering
      });
    } else if (featureType === 'clickLocation') {
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
      projection: 'EPSG:3857', // Web Mercator for global view
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
      controls: [
        new Zoom({
          className: 'ol-zoom'
        })
      ],
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

  // Search functionality
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // Using Nominatim (OpenStreetMap's geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const results = await response.json();

      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchLocation]);

  const handleSearchResultClick = useCallback((result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    // Zoom to the selected location
    olView.animate({
      center: fromLonLat([lon, lat]),
      zoom: 12,
      duration: 1000
    });

    // Clear search
    setSearchQuery("");
    setShowResults(false);
    setSearchResults([]);
  }, [olView]);

  // Control functions
  const handleZoom = useCallback((zoomIn: boolean) => {
    const currentZoom = olView.getZoom() || INITIAL_VIEW.zoom;
    const newZoom = zoomIn
      ? Math.min(currentZoom + 1, ZOOM_LIMITS.max)
      : Math.max(currentZoom - 1, ZOOM_LIMITS.min);

    olView.animate({
      zoom: newZoom,
      duration: ANIMATION_DURATIONS.zoom
    });
  }, [olView]);

  const handleRotate = useCallback((direction: 'left' | 'right') => {
    const currentRotation = olView.getRotation();
    const rotationIncrement = Math.PI / 12; // 15 degrees in radians
    const newRotation = direction === 'left'
      ? currentRotation - rotationIncrement
      : currentRotation + rotationIncrement;

    olView.animate({
      rotation: newRotation,
      duration: ANIMATION_DURATIONS.rotate
    });
  }, [olView]);

  const handleHome = useCallback(() => {
    olView.animate({
      center: fromLonLat(INITIAL_VIEW.center),
      zoom: INITIAL_VIEW.zoom,
      rotation: 0,
      duration: ANIMATION_DURATIONS.home
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
        const feature = olMap.forEachFeatureAtPixel(event.pixel, (feature) => feature);

        if (feature && feature.get('featureType') === 'feature') {
          // Feature clicked
          const featureId = feature.get('id');
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
        console.error('Error in click handler:', error);
      }
    };

    // Handle hover events and coordinate tracking
    const pointerMoveHandler = (event: any) => {
      try {
        if (!event.coordinate) return;

        const feature = olMap.forEachFeatureAtPixel(event.pixel, (feature) => feature);

        // Update mouse coordinates
        const coordinates = toLonLat(event.coordinate);
        setMouseCoordinates({
          lon: Number(coordinates[0].toFixed(4)),
          lat: Number(coordinates[1].toFixed(4))
        });

        if (feature && feature.get('featureType') === 'feature') {
          const featureId = feature.get('id');
          if (onFeatureHover) {
            onFeatureHover(featureId);
          }
          // Change cursor to pointer when hovering over features
          const viewport = olMap.getViewport();
          if (viewport) {
            viewport.style.cursor = 'pointer';
          }
        } else {
          if (onFeatureHover) {
            onFeatureHover(null);
          }
          // Reset cursor when not hovering over features
          const viewport = olMap.getViewport();
          if (viewport) {
            viewport.style.cursor = '';
          }
        }
      } catch (error) {
        console.error('Error in pointer move handler:', error);
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
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
          }),
        });

        // Copy properties to the OpenLayers feature
        if (geoJsonFeature.properties) {
          Object.keys(geoJsonFeature.properties).forEach(key => {
            olFeature.set(key, geoJsonFeature.properties?.[key]);
          });
        }

        return olFeature;
      });

      source.addFeatures(olFeatures);
    } catch (error) {
      console.error('Error updating features:', error);
    }
  }, [features, olMap]);

  // Zoom to selected feature
  useEffect(() => {
    try {
      if (!selectedFeatureId) return;

      const selectedFeature = features.find(feature =>
        feature.properties?.id === selectedFeatureId
      );

      if (selectedFeature?.geometry?.type === 'Point') {
        const [lon, lat] = selectedFeature.geometry.coordinates;
        olView.animate({
          center: fromLonLat([lon, lat]),
          zoom: 6,
          duration: 1500,
        });
      }
    } catch (error) {
      console.error('Error zooming to feature:', error);
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
    justifyContent: "center"
  } as const;

  const smallButtonStyle = {
    ...buttonStyle,
    fontSize: "16px",
    fontWeight: "normal"
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

      {/* Search Panel */}
      <div style={{
        position: "absolute",
        top: "80px",
        right: "20px",
        zIndex: 1000,
        width: "300px"
      }}>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Hae paikkaa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              backgroundColor: "rgba(42, 42, 42, 0.9)",
              color: "white",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
          {isSearching && (
            <div style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "white",
              fontSize: "12px"
            }}>
              Searching...
            </div>
          )}
        </div>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <div style={{
            marginTop: "4px",
            backgroundColor: "rgba(42, 42, 42, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            maxHeight: "200px",
            overflowY: "auto"
          }}>
            {searchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => handleSearchResultClick(result)}
                style={{
                  padding: "12px 16px",
                  color: "white",
                  cursor: "pointer",
                  borderBottom: index < searchResults.length - 1 ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
                  fontSize: "14px",
                  lineHeight: "1.4"
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <div style={{ fontWeight: "500" }}>
                  {result.display_name.split(',')[0]}
                </div>
                <div style={{
                  fontSize: "12px",
                  opacity: 0.7,
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {result.display_name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div style={{
        position: "absolute",
        bottom: "50px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 1000
      }}>
        <button onClick={handleHome} style={smallButtonStyle} title="View Home">🏠</button>
        <button onClick={() => handleZoom(true)} style={buttonStyle} title="Zoom In">+</button>
        <button onClick={() => handleZoom(false)} style={buttonStyle} title="Zoom Out">−</button>
        <button onClick={() => handleRotate('left')} style={smallButtonStyle} title="Rotate Left">↶</button>
        <button onClick={() => handleRotate('right')} style={smallButtonStyle} title="Rotate Right">↷</button>
      </div>

      <CoordinatesDisplay coordinates={mouseCoordinates} />
    </div>
  );
}
