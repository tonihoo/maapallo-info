import { Box, Paper, Typography, useMediaQuery, useTheme } from "@mui/material";
import { AppHeader } from "./components/common/AppHeader";
import { BaseMapAttribution } from "./components/common/BaseMapAttribution";
import { CookieConsent } from "./components/common/CookieConsent";
import { FeatureInfo } from "./components/common/FeatureInfo";
import { MapContainer } from "./components/common/MapContainer";
import { MapModeToggle } from "./components/common/MapModeToggle";
import { useAppInitialization } from "./hooks/useAppInitialization";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import {
  selectHeaderFooterColor,
  selectRefreshTrigger,
  selectSelectedFeatureId,
} from "./store/selectors";
import { clearSelectedFeature } from "./store/slices/mapSlice";

export function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dispatch = useAppDispatch();

  // Redux state
  const refreshTrigger = useAppSelector(selectRefreshTrigger);
  const headerFooterColor = useAppSelector(selectHeaderFooterColor);
  const selectedFeatureId = useAppSelector(selectSelectedFeatureId);

  // Initialize app (authentication, Cesium preloading, analytics)
  useAppInitialization(refreshTrigger);

  const handleFeatureInfoClose = () => {
    dispatch(clearSelectedFeature());
  };

  const headerStyle = {
    backgroundColor: headerFooterColor,
    color: "black",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: "45px",
    display: "flex",
    alignItems: "center",
    justifyContent: isMobile ? "center" : "space-between",
    paddingX: "16px",
  };

  const footerStyle = {
    backgroundColor: headerFooterColor,
    color: "black",
    textAlign: "center" as const,
    boxShadow: "0 -2px 4px rgba(0,0,0,0.1)",
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const panelStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(8px)",
    zIndex: 100,
  };

  return (
    <>
      <Box sx={headerStyle}>
        {!isMobile && <Box sx={{ width: "40px" }} />}
        <Typography variant="overline" component="h1">
          Maapallo.info
        </Typography>
        {!isMobile && <Box sx={{ width: "40px" }} />}
      </Box>

      <MapModeToggle isMobile={isMobile} />

      <Box
        sx={{
          position: "relative",
          height: "100vh",
          overflow: "hidden",
          marginTop: "-45px",
          paddingTop: "45px",
        }}
      >
        <MapContainer />

        <AppHeader />

        {selectedFeatureId && (
          <Paper
            elevation={8}
            sx={{
              position: "absolute",
              top: isMobile ? 80 : 140,
              right: isMobile ? 16 : 100,
              left: isMobile ? 16 : "auto",
              width: isMobile ? "auto" : 600,
              maxHeight: isMobile ? "60vh" : 500,
              ...panelStyle,
            }}
          >
            <FeatureInfo onClose={handleFeatureInfoClose} />
          </Paper>
        )}
      </Box>

      <Box sx={footerStyle}>
        <BaseMapAttribution />
      </Box>

      <CookieConsent />
    </>
  );
}
