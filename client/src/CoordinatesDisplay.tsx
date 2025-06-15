interface CoordinatesDisplayProps {
  coordinates: { lon: number; lat: number } | null;
}

export function CoordinatesDisplay({ coordinates }: CoordinatesDisplayProps) {
  if (!coordinates) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "50px", // 30px footer + 10px gap
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
      }}
    >
      {coordinates.lat > 0 ? "N" : "S"} {Math.abs(coordinates.lat).toFixed(4)}°,{" "}
      {coordinates.lon > 0 ? "E" : "W"} {Math.abs(coordinates.lon).toFixed(4)}°
    </div>
  );
}
