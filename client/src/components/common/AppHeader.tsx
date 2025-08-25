import React from "react";
import { Box } from "@mui/material";
import { HeaderMenu } from "./HeaderMenu";

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
    </>
  );
};
