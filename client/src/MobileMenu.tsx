import { useState } from "react";
import {
  IconButton,
  Drawer,
  useMediaQuery,
  useTheme,
  Box,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import FeatureList from "./FeatureList";

interface Props {
  onSelectFeature: (id: number) => void;
  selectedFeatureId?: number | null;
  refreshTrigger?: number;
  is3DMode?: boolean;
}

export function MobileMenu({
  onSelectFeature,
  selectedFeatureId,
  refreshTrigger,
  is3DMode,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleFeatureSelect = (id: number) => {
    onSelectFeature(id);
    setIsOpen(false); // Close menu after selection
  };

  // Only render on mobile devices
  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Hamburger Menu Button */}
      <IconButton
        onClick={handleToggle}
        sx={{
          position: "fixed",
          top: "8px", // On top of header to match 2D/3D toggle
          left: "16px",
          zIndex: 1200,
          backgroundColor: is3DMode
            ? "rgba(126, 199, 129, 0.9)" // Same green as header in 3D mode
            : "rgba(255, 179, 76, 0.9)", // Same orange as header in 2D mode
          color: "black",
          width: "48px", // Same size as 2D/3D toggle on mobile
          height: "48px", // Same size as 2D/3D toggle on mobile
          "&:hover": {
            backgroundColor: is3DMode
              ? "rgba(126, 199, 129, 1)" // Solid green on hover in 3D mode
              : "rgba(255, 179, 76, 1)", // Solid orange on hover in 2D mode
          },
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* Drawer with Feature List */}
      <Drawer
        anchor="left"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        sx={{
          "& .MuiDrawer-paper": {
            width: "300px",
            maxWidth: "80vw",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
          },
        }}
      >
        <Box sx={{ height: "100%", paddingTop: "16px" }}>
          <FeatureList
            onSelectFeature={handleFeatureSelect}
            selectedFeatureId={selectedFeatureId}
            refreshTrigger={refreshTrigger}
            is3DMode={is3DMode}
          />
        </Box>
      </Drawer>
    </>
  );
}
