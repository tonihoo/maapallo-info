import React from "react";
import { Typography } from "@mui/material";
import { BaseMapKey } from "../2d/BaseMapSelector";

interface BaseMapAttributionProps {
  currentBaseMap: BaseMapKey;
}

const getAttributionText = (baseMapKey: BaseMapKey): string => {
  switch (baseMapKey) {
    case "topo":
      return "Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap";
    case "osm":
      return "© OpenStreetMap contributors";
    case "satellite":
      return "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";
    case "cartoLight":
    case "cartoDark":
      return "© OpenStreetMap contributors © CARTO";
    default:
      return "";
  }
};

export function BaseMapAttribution({
  currentBaseMap,
}: BaseMapAttributionProps) {
  const attributionText = getAttributionText(currentBaseMap);

  if (!attributionText) {
    return null;
  }

  return (
    <Typography
      variant="caption"
      sx={{
        fontSize: "10px",
        color: "rgba(0, 0, 0, 0.6)",
        marginLeft: 1,
      }}
    >
      {attributionText}
    </Typography>
  );
}
