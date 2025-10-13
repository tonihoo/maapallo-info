import { Box, IconButton, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectCesiumComponent,
  selectCesiumPreloaded,
  selectIs3DMode,
} from "../../store/selectors";
import {
  setCesiumComponent,
  setCesiumPreloaded,
  toggleMapMode,
} from "../../store/slices/mapSlice";
import { analytics } from "../../utils/analytics";

interface MapModeToggleProps {
  isMobile: boolean;
}

export function MapModeToggle({ isMobile }: MapModeToggleProps) {
  const dispatch = useAppDispatch();
  const is3DMode = useAppSelector(selectIs3DMode);
  const cesiumPreloaded = useAppSelector(selectCesiumPreloaded);
  const CesiumMapComponent = useAppSelector(selectCesiumComponent);

  const toggleMapModeHandler = useCallback(async () => {
    const previousMode = is3DMode ? "3d" : "2d";
    const newMode = is3DMode ? "2d" : "3d";

    // If switching to 3D mode and Cesium isn't loaded yet, load it now
    if (!cesiumPreloaded && !CesiumMapComponent) {
      try {
        const cesiumModule = await import("../../components/3d/CesiumMap");
        dispatch(setCesiumComponent(cesiumModule.CesiumMap));
        dispatch(setCesiumPreloaded(true));
      } catch (error) {
        console.error("❌ Failed to load Cesium:", error);
        return; // Don't switch to 3D mode if loading failed
      }
    }

    dispatch(toggleMapMode());

    // Track map mode toggle
    analytics.trackMapModeToggle(newMode, previousMode);
  }, [cesiumPreloaded, CesiumMapComponent, dispatch, is3DMode]);

  return (
    <Tooltip
      title={
        is3DMode
          ? "Vaihda 2D-karttanäkymään"
          : cesiumPreloaded
            ? "Vaihda 3D-karttanäkymään"
            : "3D-kartta latautuu..."
      }
      PopperProps={{
        disablePortal: true,
      }}
    >
      <Box component="span" sx={{ display: "inline-block" }}>
        <IconButton
          onClick={toggleMapModeHandler}
          disabled={!cesiumPreloaded}
          size="small"
          sx={{
            position: "absolute",
            top: isMobile ? "2px" : "70px",
            right: isMobile ? "20px" : "10px",
            zIndex: 1001,
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            color: is3DMode ? "#ffb34c" : "#4caf50",
            fontSize: isMobile ? "18px" : "24px",
            fontWeight: "bold",
            width: isMobile ? "38px" : "64px",
            height: isMobile ? "38px" : "64px",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 1)",
              color: is3DMode ? "#e89d2b" : "#388e3c",
            },
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {is3DMode ? "2D" : "3D"}
        </IconButton>
      </Box>
    </Tooltip>
  );
}
