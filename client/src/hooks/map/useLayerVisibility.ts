import { useCallback } from "react";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { setLayerVisibility } from "../../store/slices/mapSlice";
import { useAdultLiteracyLayer } from "../useAdultLiteracyLayer";

interface UseLayerVisibilityProps {
  worldBoundariesLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
  oceanCurrentsLayerRef: React.RefObject<VectorLayer<VectorSource> | null>;
}

export function useLayerVisibility({
  worldBoundariesLayerRef,
  oceanCurrentsLayerRef,
}: UseLayerVisibilityProps) {
  // Redux state and dispatch
  const layerVisibility = useAppSelector((state) => state.map.layerVisibility);
  const dispatch = useAppDispatch();

  // Adult literacy layer hook
  const adultLiteracyLayer = useAdultLiteracyLayer({
    visible: layerVisibility.adultLiteracy,
  });

  const handleLayerVisibilityChange = useCallback(
    (layerId: string, visible: boolean) => {
      // Update Redux state
      dispatch(setLayerVisibility({ layerId: layerId as keyof typeof layerVisibility, visible }));

      // Update actual OpenLayers layer visibility
      if (layerId === "worldBoundaries" && worldBoundariesLayerRef.current) {
        worldBoundariesLayerRef.current.setVisible(visible);
      } else if (layerId === "oceanCurrents" && oceanCurrentsLayerRef.current) {
        oceanCurrentsLayerRef.current.setVisible(visible);
      } else if (layerId === "adultLiteracy") {
        adultLiteracyLayer.setVisible(visible);
      }
    },
    [dispatch, worldBoundariesLayerRef, oceanCurrentsLayerRef, adultLiteracyLayer]
  );

  return {
    layerVisibility,
    handleLayerVisibilityChange,
    adultLiteracyLayer,
  };
}
