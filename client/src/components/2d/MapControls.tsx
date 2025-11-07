import { useMediaQuery, useTheme } from "@mui/material";

interface MapControlsProps {
  onZoom: (zoomIn: boolean) => void;
  onRotate: (direction: "left" | "right") => void;
  onHome?: () => void;
}

export function MapControls({ onZoom, onRotate, onHome }: MapControlsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const buttonStyle = {
    width: "40px",
    height: "40px",
    backgroundColor: "rgba(42, 42, 42, 0.8)",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "20px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;

  const smallButtonStyle = {
    ...buttonStyle,
    fontSize: "16px",
    fontWeight: "normal",
  } as const;

  return (
    <div
      style={{
        position: "absolute",
        bottom: isMobile ? "95px" : "45px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 1000,
      }}
    >
      <button
        onClick={onHome}
        style={smallButtonStyle}
        title="Palaa aloitusnäkymään"
      >
        🏠
      </button>
      <button onClick={() => onZoom(true)} style={buttonStyle} title="Lähennä">
        +
      </button>
      <button
        onClick={() => onZoom(false)}
        style={buttonStyle}
        title="Loitonna"
      >
        −
      </button>
      <button
        onClick={() => onRotate("left")}
        style={smallButtonStyle}
        title="Käännä vasemmalle"
      >
        ↶
      </button>
      <button
        onClick={() => onRotate("right")}
        style={smallButtonStyle}
        title="Käännä oikealle"
      >
        ↷
      </button>
    </div>
  );
}
