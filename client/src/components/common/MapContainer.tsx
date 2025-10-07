import { Box } from "@mui/material";
import React from "react";
import { useAppSelector } from "../../store/hooks";
import {
  selectCesiumComponent,
  selectIs3DMode,
  selectMapFeatures,
  selectSelectedFeatureId,
} from "../../store/selectors";
import { BaseMapKey } from "../2d/BaseMapSelector";
import { Map } from "../2d/Map";

interface MapContainerProps {
  onMapClick: () => void;
  onFeatureClick: (id: number) => void;
  onBaseMapChange: (baseMapKey: BaseMapKey) => void;
}

export function MapContainer({
  onMapClick,
  onFeatureClick,
  onBaseMapChange,
}: MapContainerProps) {
  const is3DMode = useAppSelector(selectIs3DMode);
  const CesiumMapComponent = useAppSelector(selectCesiumComponent);
  const mapFeatures = useAppSelector(selectMapFeatures);
  const selectedFeatureId = useAppSelector(selectSelectedFeatureId);
  const articleLocatorsVisible = useAppSelector(
    (state) => state.map.layerVisibility.articleLocators
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
            features: mapFeatures,
            selectedFeatureId: selectedFeatureId,
            onMapClick: onMapClick,
            onFeatureClick: onFeatureClick,
            articleLocatorsVisible: articleLocatorsVisible,
          })
        ) : (
          <div style={{ padding: "20px", textAlign: "center" }}>
            Ladataan 3D-karttaa...
          </div>
        )
      ) : (
        <Map
          features={mapFeatures}
          onMapClick={onMapClick}
          onFeatureClick={onFeatureClick}
          onFeatureHover={() => {
            /* No hover action needed */
          }}
          selectedFeatureId={selectedFeatureId}
          onBaseMapChange={onBaseMapChange}
        />
      )}
    </Box>
  );
}
