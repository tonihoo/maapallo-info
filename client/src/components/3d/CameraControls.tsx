import { useMediaQuery, useTheme } from "@mui/material";

interface CameraControlsProps {
  onZoom: (zoomIn: boolean) => void;
  onTiltAdjust: (direction: "up" | "down") => void;
  onRotate: (direction: "left" | "right") => void;
  onHome: () => void;
  disabled: boolean;
}

export function CameraControls({
  onZoom,
  onTiltAdjust,
  onRotate,
  onHome,
  disabled,
}: CameraControlsProps) {
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
        bottom: isMobile ? "100px" : "50px",
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
        title="View Home"
        disabled={disabled}
      >
        🏠
      </button>
      <button
        onClick={() => onZoom(true)}
        style={buttonStyle}
        title="Zoom In"
        disabled={disabled}
      >
        +
      </button>
      <button
        onClick={() => onZoom(false)}
        style={buttonStyle}
        title="Zoom Out"
        disabled={disabled}
      >
        −
      </button>
      <button
        onClick={() => onTiltAdjust("up")}
        style={smallButtonStyle}
        title="Tilt Up"
        disabled={disabled}
      >
        ↑
      </button>
      <button
        onClick={() => onTiltAdjust("down")}
        style={smallButtonStyle}
        title="Tilt Down"
        disabled={disabled}
      >
        ↓
      </button>
      <button
        onClick={() => onRotate("left")}
        style={smallButtonStyle}
        title="Rotate Left"
        disabled={disabled}
      >
        ↶
      </button>
      <button
        onClick={() => onRotate("right")}
        style={smallButtonStyle}
        title="Rotate Right"
        disabled={disabled}
      >
        ↷
      </button>
    </div>
  );
}
