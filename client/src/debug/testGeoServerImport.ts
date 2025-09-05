// Debug script to test GeoServerService import
export async function testGeoServerImport() {
  try {
    console.log("Testing GeoServer import...");

    // Test the dynamic import
    const geoServerModule = await import("../services/geoServerService");
    console.log("Module imported:", geoServerModule);
    const { GeoServerService } = geoServerModule;
    console.log("GeoServerService extracted:", GeoServerService);
    console.log("GeoServerService type:", typeof GeoServerService);
    console.log(
      "GeoServerService.getLayerData:",
      typeof GeoServerService?.getLayerData
    );

    if (
      GeoServerService &&
      typeof GeoServerService.getLayerData === "function"
    ) {
      console.log("✅ GeoServerService import successful");

      // Test a simple call
      const testData = await GeoServerService.getLayerData(
        "/data/adult_literacy.geojson"
      );
      console.log(
        "✅ Test call successful, features:",
        testData.features.length
      );
    } else {
      console.error("❌ GeoServerService not properly imported");
    }
  } catch (error) {
    console.error("❌ Import test failed:", error);
  }
}
