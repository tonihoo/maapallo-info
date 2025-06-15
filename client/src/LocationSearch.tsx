import { useEffect, useState, useCallback } from "react";

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface Props {
  onLocationSelect: (lat: number, lon: number) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function LocationSearch({
  onLocationSelect,
  placeholder = "Hae sijaintia...",
  style,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Search functionality
  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // Using Nominatim (OpenStreetMap's geocoding service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const results = await response.json();

      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchLocation(searchQuery);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchLocation]);

  const handleSearchResultClick = useCallback(
    (result: SearchResult) => {
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      // Call the callback with the selected location
      onLocationSelect(lat, lon);

      // Clear search
      setSearchQuery("");
      setShowResults(false);
      setSearchResults([]);
    },
    [onLocationSelect]
  );

  const defaultStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "50px", // Adjusted to align with the bottom of the "Rotate right" button
    right: "120px", // Positioned to the left of control buttons (assuming buttons are ~100px wide + margin)
    zIndex: 1000,
    width: "300px",
    ...style,
  };

  return (
    <div style={defaultStyle}>
      {/* Search Results - positioned above the search bar */}
      {showResults && searchResults.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "60px", // Position above the search input (input height + margin)
            left: "0",
            right: "0",
            backgroundColor: "rgba(42, 42, 42, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            maxHeight: "200px",
            overflowY: "auto",
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
          }}
        >
          {searchResults.map((result, index) => (
            <div
              key={index}
              onClick={() => handleSearchResultClick(result)}
              style={{
                padding: "12px 16px",
                color: "white",
                cursor: "pointer",
                borderBottom:
                  index < searchResults.length - 1
                    ? "1px solid rgba(255, 255, 255, 0.1)"
                    : "none",
                fontSize: "14px",
                lineHeight: "1.4",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor =
                  "rgba(255, 255, 255, 0.1)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              <div style={{ fontWeight: "500" }}>
                {result.display_name.split(",")[0]}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  opacity: 0.7,
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {result.display_name}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "8px",
            backgroundColor: "rgba(42, 42, 42, 0.9)",
            color: "white",
            fontSize: "14px",
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        {isSearching && (
          <div
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "white",
              fontSize: "12px",
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            }}
          >
            Searching...
          </div>
        )}
      </div>
    </div>
  );
}
