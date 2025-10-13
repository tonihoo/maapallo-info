import { Typography } from "@mui/material";
import { useAppSelector } from "../../store/hooks";
import { selectCurrentBaseMap, selectIs3DMode } from "../../store/selectors";
import { BaseMapKey } from "../2d/BaseMapSelector";

const getAttributionText = (
  baseMapKey: BaseMapKey,
  is3DMode: boolean = false
): string => {
  if (is3DMode) {
    return "Imagery from NASA GIBS (Blue Marble), courtesy of NASA EOSDIS Worldview";
  }

  switch (baseMapKey) {
    case "topo":
      return "Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap";
    case "osm":
      return "© OpenStreetMap contributors";
    case "satellite":
      return "Imagery courtesy NASA Worldview, part of NASA EOSDIS (GIBS)";
    case "cartoLight":
    case "cartoDark":
      return "© OpenStreetMap contributors © CARTO";
    default:
      return "";
  }
};

export function BaseMapAttribution() {
  const currentBaseMap = useAppSelector(selectCurrentBaseMap);
  const is3DMode = useAppSelector(selectIs3DMode);
  const attributionText = getAttributionText(currentBaseMap, is3DMode);

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
