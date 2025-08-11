import React, { useState } from "react";

interface LayerConfig {
  id: string;
  name: string;
  description?: string;
  visible: boolean;
}

interface LayerSwitcherProps {
  layers: LayerConfig[];
  onLayerToggle: (layerId: string, visible: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function LayerSwitcher({
  layers,
  onLayerToggle,
  className,
  style,
}: LayerSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLayerToggle = (layerId: string, currentVisible: boolean) => {
    onLayerToggle(layerId, !currentVisible);
  };

  const activeLayersCount = layers.filter((layer) => layer.visible).length;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        ...style,
      }}
    >
      {/* Main button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "40px",
          height: "40px",
          backgroundColor: "rgba(42, 42, 42, 0.8)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          outline: "none",
          position: "relative",
        }}
        title={`Layers (${activeLayersCount} active)`}
      >
        🗂️
        {activeLayersCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              backgroundColor: "#ff6b35",
              color: "white",
              borderRadius: "50%",
              width: "16px",
              height: "16px",
              fontSize: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            {activeLayersCount}
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "48px",
            right: "0",
            backgroundColor: "rgba(42, 42, 42, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "4px",
            padding: "4px",
            minWidth: "200px",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                color: "white",
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                fontSize: "12px",
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              KARTTATASOT
            </div>
          </div>

          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => handleLayerToggle(layer.id, layer.visible)}
              style={{
                width: "100%",
                padding: "8px 12px",
                backgroundColor: "transparent",
                color: "white",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
                fontSize: "14px",
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ fontWeight: layer.visible ? "bold" : "normal" }}>
                  {layer.name}
                </div>
                {layer.description && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "rgba(255, 255, 255, 0.7)",
                      marginTop: "2px",
                    }}
                  >
                    {layer.description}
                  </div>
                )}
              </div>

              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "2px",
                  border: "1px solid rgba(255, 255, 255, 0.5)",
                  backgroundColor: layer.visible ? "#4caf50" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "white",
                }}
              >
                {layer.visible ? "✓" : ""}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LayerSwitcher;
