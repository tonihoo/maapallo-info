import { Box, Paper, Typography } from "@mui/material";
import { BaseMapKey } from "../2d/BaseMapSelector";
import { AppHeader } from "./AppHeader";
import { BaseMapAttribution } from "./BaseMapAttribution";
import { CookieConsent } from "./CookieConsent";
import { FeatureInfo } from "./FeatureInfo";
import { MapContainer } from "./MapContainer";
import { MapModeToggle } from "./MapModeToggle";

interface AppLayoutProps {
  isMobile: boolean;
  headerFooterColor: string;
  currentBaseMap: BaseMapKey;
  is3DMode: boolean;
  selectedFeatureId: number | null;
  refreshTrigger: number;
  onMapClick: () => void;
  onFeatureClick: (id: number) => void;
  onFeatureInfoClose: () => void;
  onBaseMapChange: (baseMapKey: BaseMapKey) => void;
}

export function AppLayout({
  isMobile,
  headerFooterColor,
  currentBaseMap,
  is3DMode,
  selectedFeatureId,
  refreshTrigger,
  onMapClick,
  onFeatureClick,
  onFeatureInfoClose,
  onBaseMapChange,
}: AppLayoutProps) {
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

      <Box sx={{ position: "relative", height: "100vh", overflow: "hidden" }}>
        <MapContainer
          onMapClick={onMapClick}
          onFeatureClick={onFeatureClick}
          onBaseMapChange={onBaseMapChange}
        />

        <AppHeader
          onSelectFeature={onFeatureClick}
          selectedFeatureId={selectedFeatureId}
          refreshTrigger={refreshTrigger}
          is3DMode={is3DMode}
        />

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
            <FeatureInfo
              featureId={selectedFeatureId}
              onClose={onFeatureInfoClose}
            />
          </Paper>
        )}
      </Box>

      <Box sx={footerStyle}>
        <BaseMapAttribution
          currentBaseMap={currentBaseMap}
          is3DMode={is3DMode}
        />
      </Box>

      <CookieConsent />
    </>
  );
}
