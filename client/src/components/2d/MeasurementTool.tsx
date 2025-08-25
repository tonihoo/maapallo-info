interface MeasurementToolProps {
  isActive: boolean;
  onToggle: () => void;
  onClear?: () => void;
  currentMeasurement?: string;
}

export function MeasurementTool({
  isActive,
  onToggle,
  onClear,
  currentMeasurement,
}: MeasurementToolProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: "280px", // Below the base map selector and home button
        right: "20px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {/* Measurement toggle button */}
      <button
        onClick={onToggle}
        style={{
          width: "40px",
          height: "40px",
          backgroundColor: isActive
            ? "rgba(76, 175, 80, 0.8)"
            : "rgba(42, 42, 42, 0.8)",
          color: "white",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "4px",
          marginTop: "13px",
          cursor: "pointer",
          fontSize: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          outline: "none",
        }}
        title={isActive ? "Lopeta mittaus" : "Mittaa etäisyys"}
      >
        📏
      </button>

      {/* Measurement display */}
      {currentMeasurement && (
        <div
          style={{
            backgroundColor: "rgba(42, 42, 42, 0.95)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "14px",
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            border: "1px solid rgba(255, 255, 255, 0.3)",
            minWidth: "120px",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span>{currentMeasurement}</span>
          {onClear && (
            <button
              onClick={onClear}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "12px",
                padding: "2px",
                outline: "none",
              }}
              title="Lopeta mittaus"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
