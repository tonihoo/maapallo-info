import React from "react";

interface LegendItem {
  color: string;
  label: string;
  range: [number, number] | null;
}

interface AdultLiteracyLegendProps {
  visible: boolean;
  legendData: LegendItem[];
}

export const AdultLiteracyLegend: React.FC<AdultLiteracyLegendProps> = ({
  visible,
  legendData,
}) => {
  if (!visible) {
    return null;
  }

  if (!legendData || legendData.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "70px", // Moved down 50px from original 20px
        left: "20px",
        backgroundColor: "white",
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "16px",
        zIndex: 99999,
        maxWidth: "300px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
        fontSize: "14px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h3
        style={{
          margin: "0 0 12px 0",
          fontSize: "16px",
          fontWeight: "bold",
          color: "#333",
        }}
      >
        Lukutaito, aikuiset
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {legendData.map((item, index) => (
          <div
            key={index}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: item.color,
                border: "1px solid #333",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "12px", color: "#333" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: "12px",
          paddingTop: "8px",
          borderTop: "1px solid #ccc",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            color: "#666",
            margin: 0,
          }}
        >
          Data: World Development Indicators (2020-2023)
        </p>
      </div>
    </div>
  );
};
