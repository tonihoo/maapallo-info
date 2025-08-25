import React from "react";
import { Box } from "@mui/material";
import { HeaderMenu } from "./HeaderMenu";
import { UserMenu } from "../auth/UserMenu";

interface AppHeaderProps {
  onSelectFeature: (id: number) => void;
  selectedFeatureId?: number | null;
  refreshTrigger?: number;
  is3DMode?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onSelectFeature,
  selectedFeatureId,
  refreshTrigger,
  is3DMode,
}) => {
  return (
    <>
      {/* Left side - Hamburger menu */}
      <HeaderMenu
        onSelectFeature={onSelectFeature}
        selectedFeatureId={selectedFeatureId}
        refreshTrigger={refreshTrigger}
        is3DMode={is3DMode}
      />

      {/* Right side - User menu */}
      <Box
        sx={{
          position: "fixed",
          top: "2px",
          right: "16px",
          zIndex: 1200,
          backgroundColor: is3DMode
            ? "rgba(126, 199, 129, 0.9)" // Same green as header in 3D mode
            : "rgba(255, 179, 76, 0.9)", // Same orange as header in 2D mode
          borderRadius: "4px",
          "&:hover": {
            backgroundColor: is3DMode
              ? "rgba(126, 199, 129, 1)" // Solid green on hover in 3D mode
              : "rgba(255, 179, 76, 1)", // Solid orange on hover in 2D mode
          },
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <UserMenu />
      </Box>
    </>
  );
};
