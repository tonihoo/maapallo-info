import { Box } from "@mui/material";
import React, { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectCesiumComponent, selectIs3DMode } from "../../store/selectors";
import {
  clearSelectedFeature,
  setLayerVisibility,
  setSelectedFeatureId,
} from "../../store/slices/mapSlice";
import { analytics } from "../../utils/analytics";
import { Map } from "../2d/Map";

export function MapContainer() {
  const dispatch = useAppDispatch();
  const is3DMode = useAppSelector(selectIs3DMode);
  const CesiumMapComponent = useAppSelector(selectCesiumComponent);

  const handleMapClick = useCallback(() => {
    dispatch(clearSelectedFeature());
  }, [dispatch]);

  const handleFeatureClick = useCallback(
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

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
      }}
    >
      {is3DMode ? (
        CesiumMapComponent ? (
          React.createElement(CesiumMapComponent, {
            onMapClick: handleMapClick,
            onFeatureClick: handleFeatureClick,
          })
        ) : (
          <div style={{ padding: "20px", textAlign: "center" }}>
            Ladataan 3D-karttaa...
          </div>
        )
      ) : (
        <Map
          onMapClick={handleMapClick}
          onFeatureClick={handleFeatureClick}
          onFeatureHover={() => {
            /* No hover action needed */
          }}
        />
      )}
    </Box>
  );
}
