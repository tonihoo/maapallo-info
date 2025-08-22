import { useCallback } from "react";
import { Map as OlMap } from "ol";
import { toLonLat } from "ol/proj";
import type { MapBrowserEvent } from "ol";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { setMouseCoordinates } from "../../store/slices/mapSlice";

interface UseMouseCoordinatesProps {
  olMap: OlMap;
  onFeatureHover?: (featureId: number | null) => void;
}

export function useMouseCoordinates({
  olMap,
  onFeatureHover,
}: UseMouseCoordinatesProps) {
  // Redux state and dispatch
  const mouseCoordinates = useAppSelector(
    (state) => state.map.mouseCoordinates
  );
  const dispatch = useAppDispatch();

  // Handle pointer move events and coordinate tracking
  const handlePointerMove = useCallback(
    (event: MapBrowserEvent<UIEvent>) => {
      try {
        if (!event.coordinate) return;

        const feature = olMap.forEachFeatureAtPixel(
          event.pixel,
          (feature) => feature
        );

        const coordinates = toLonLat(event.coordinate);
        dispatch(
          setMouseCoordinates({
            lon: Number(coordinates[0].toFixed(4)),
            lat: Number(coordinates[1].toFixed(4)),
          })
        );

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
    },
    [olMap, onFeatureHover, dispatch]
  );

  return {
    mouseCoordinates,
    handlePointerMove,
  };
}
