import { useEffect } from "react";
import { Map } from "ol";
import { View } from "ol";
import { toLonLat } from "ol/proj";
import type { MapBrowserEvent } from "ol";
import { Point } from "ol/geom";

interface UseMapEventsProps {
  olMap: Map;
  olView: View;
  mapRef: React.RefObject<HTMLDivElement>;
  onMapClick?: (coordinates: number[]) => void;
  onFeatureClick?: (featureId: number) => void;
  onFeatureHover?: (featureId: number | null) => void;
  handlePointerMove: (event: MapBrowserEvent<PointerEvent>) => void;
}

export function useMapEvents({
  olMap,
  olView,
  mapRef,
  onMapClick,
  onFeatureClick,
  onFeatureHover,
  handlePointerMove,
}: UseMapEventsProps) {
  // Initialize map and handle events
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

    olMap.on("click", clickHandler);
    olMap.on("pointermove", handlePointerMove);

    return () => {
      olMap.un("click", clickHandler);
      olMap.un("pointermove", handlePointerMove);
    };
  }, [
    olMap,
    mapRef,
    onMapClick,
    onFeatureClick,
    onFeatureHover,
    olView,
    handlePointerMove,
  ]);
}
