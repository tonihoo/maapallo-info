<?xml version="1.0" encoding="UTF-8"?>
<sld:StyledLayerDescriptor xmlns="http://www.opengis.net/sld" xmlns:sld="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml" version="1.0.0">
  <sld:NamedLayer>
    <sld:Name>maapallo_intact_forests</sld:Name>
    <sld:UserStyle>
      <sld:Name>intact_forests</sld:Name>
      <sld:Title>Intact Forest Landscapes</sld:Title>
      <sld:Abstract>Style for intact forest landscapes</sld:Abstract>
      <sld:FeatureTypeStyle>
        <sld:Rule>
          <sld:Name>forest_area</sld:Name>
          <sld:Title>Intact Forest Area</sld:Title>
          <sld:PolygonSymbolizer>
            <sld:Fill>
              <sld:CssParameter name="fill">#2d5016</sld:CssParameter>
              <sld:CssParameter name="fill-opacity">0.7</sld:CssParameter>
            </sld:Fill>
            <sld:Stroke>
              <sld:CssParameter name="stroke">#1a3009</sld:CssParameter>
              <sld:CssParameter name="stroke-width">0.3</sld:CssParameter>
            </sld:Stroke>
          </sld:PolygonSymbolizer>
        </sld:Rule>
      </sld:FeatureTypeStyle>
    </sld:UserStyle>
  </sld:NamedLayer>
</sld:StyledLayerDescriptor>
