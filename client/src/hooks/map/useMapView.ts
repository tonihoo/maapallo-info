import { useState, useCallback, useEffect } from "react";
import { View } from "ol";
import { fromLonLat } from "ol/proj";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { setViewState } from "../../store/slices/mapSlice";
import {
  INITIAL_VIEW,
  ZOOM_LIMITS,
  ANIMATION_DURATIONS,
} from "../../constants/mapConstants";

export function useMapView() {
  // Redux state and dispatch
  const viewState = useAppSelector((state) => state.map.viewState);
  const dispatch = useAppDispatch();

  // Create OpenLayers View
  const [olView] = useState(() => {
    return new View({
      center: fromLonLat(viewState.center),
      zoom: viewState.zoom,
      rotation: viewState.rotation,
      projection: "EPSG:3857",
      minZoom: ZOOM_LIMITS.min,
      maxZoom: ZOOM_LIMITS.max,
    });
  });

  // Set up view change listeners after view creation
  useEffect(() => {
    const handleCenterChange = () => {
      const center = olView.getCenter();
      if (center) {
        // Convert back to lon/lat for storage
        dispatch(setViewState({ center: center as [number, number] }));
      }
    };

    const handleZoomChange = () => {
      const zoom = olView.getZoom();
      if (zoom !== undefined) {
        dispatch(setViewState({ zoom }));
      }
    };

    const handleRotationChange = () => {
      const rotation = olView.getRotation();
      dispatch(setViewState({ rotation }));
    };

    // Listen to view changes and update Redux state
    olView.on("change:center", handleCenterChange);
    olView.on("change:zoom", handleZoomChange);
    olView.on("change:rotation", handleRotationChange);

    return () => {
      olView.un("change:center", handleCenterChange);
      olView.un("change:zoom", handleZoomChange);
      olView.un("change:rotation", handleRotationChange);
    };
  }, [olView, dispatch]);

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

  return {
    olView,
    handleZoom,
    handleRotate,
    handleHome,
    handleLocationSelect,
  };
}
