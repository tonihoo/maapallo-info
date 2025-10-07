import { useMediaQuery, useTheme } from "@mui/material";
import { useCallback } from "react";
import { BaseMapKey } from "./components/2d/BaseMapSelector";
import { AppLayout } from "./components/common/AppLayout";
import { useAppInitialization } from "./hooks/useAppInitialization";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import {
  selectCurrentBaseMap,
  selectHeaderFooterColor,
  selectIs3DMode,
  selectRefreshTrigger,
  selectSelectedFeatureId,
} from "./store/selectors";
import {
  clearSelectedFeature,
  setCurrentBaseMap,
  setLayerVisibility,
  setSelectedFeatureId,
} from "./store/slices/mapSlice";
import { analytics } from "./utils/analytics";

export function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Redux state
  const dispatch = useAppDispatch();
  const selectedFeatureId = useAppSelector(selectSelectedFeatureId);
  const is3DMode = useAppSelector(selectIs3DMode);
  const refreshTrigger = useAppSelector(selectRefreshTrigger);
  const headerFooterColor = useAppSelector(selectHeaderFooterColor);
  const currentBaseMap = useAppSelector(selectCurrentBaseMap);

  // Initialize app (authentication, Cesium preloading, analytics)
  useAppInitialization(refreshTrigger);

  // Event handlers
  const handleBaseMapChange = useCallback(
    (baseMapKey: BaseMapKey) => {
      dispatch(setCurrentBaseMap(baseMapKey));
    },
    [dispatch]
  );

  const handleMapClick = useCallback(() => {
    dispatch(clearSelectedFeature());
  }, [dispatch]);

  const handleFeatureSelect = useCallback(
    (id: number) => {
      dispatch(setSelectedFeatureId(id));

      // Ensure article locators layer is visible when a feature is selected from the menu
      dispatch(
        setLayerVisibility({ layerId: "articleLocators", visible: true })
      );

      // Track feature selection analytics
      analytics.trackFeatureSelection(id, is3DMode ? "3d" : "2d", "map_click");
    },
    [dispatch, is3DMode]
  );

  const handleFeatureInfoClose = useCallback(() => {
    dispatch(clearSelectedFeature());
  }, [dispatch]);

  return (
    <AppLayout
      isMobile={isMobile}
      headerFooterColor={headerFooterColor}
      currentBaseMap={currentBaseMap}
      is3DMode={is3DMode}
      selectedFeatureId={selectedFeatureId}
      refreshTrigger={refreshTrigger}
      onMapClick={handleMapClick}
      onFeatureClick={handleFeatureSelect}
      onFeatureInfoClose={handleFeatureInfoClose}
      onBaseMapChange={handleBaseMapChange}
    />
  );
}
