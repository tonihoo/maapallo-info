import { useTheme, useMediaQuery } from "@mui/material";

interface CoordinatesDisplayProps {
  coordinates: { lon: number; lat: number } | null;
}

export function CoordinatesDisplay({ coordinates }: CoordinatesDisplayProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <div
      style={{
        position: "absolute",
        bottom: isMobile ? "100px" : "50px",
        width: "auto",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "rgba(128, 128, 128, 0.9)",
        color: "white",
        padding: "4px 12px",
        borderRadius: "4px",
        fontSize: "12px",
        fontFamily: "monospace",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        zIndex: 1000,
        pointerEvents: "none",
        visibility: coordinates ? "visible" : "hidden",
      }}
    >
      {coordinates ? (
        <>
          {coordinates.lat > 0 ? "N" : "S"}{" "}
          {Math.abs(coordinates.lat).toFixed(3)}°,{" "}
          {coordinates.lon > 0 ? "E" : "W"}{" "}
          {Math.abs(coordinates.lon).toFixed(3)}°
        </>
      ) : (
        "\u00A0" // Non-breaking space to maintain layout
      )}
    </div>
  );
}
