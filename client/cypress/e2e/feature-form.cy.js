describe("Feature Form", () => {
  it("fill in the feature form and display", () => {
    cy.visit("/");

    cy.get("#name").should("exist");
    cy.get("#age").should("exist");
    cy.get('input[name="gender"]').should("exist");

    // Fill in the form
    const featureName = "Testi Sijainti";
    const featureGender = "male";
    const featureAge = "3";
    cy.get("#name").type(featureName);
    cy.get("#age").type(featureAge);
    cy.get(`input[name="gender"][value="${featureGender}"]`).click();

    // Make sure the map is loaded
    cy.get(".ol-layer canvas")
      .should("be.visible")
      .and("have.attr", "width")
      .should("not.eq", "0");

    // Click on the OpenLayers map container
    // Using a force: true option since OpenLayers intercepts mouse events
    cy.get(".ol-layer")
      .parent() // Target the container of the layer
      .click(300, 300, { force: true })
      .wait(500); // Wait for the map click to register in OpenLayers

    // Verify that coordinates are shown
    cy.contains("p", "Sijaintin koordinaatit (ETRS-TM35FIN):").should(
      "be.visible"
    );
    // Check that coordinate values are displayed with a regex pattern
    cy.contains("p.MuiTypography-body1", /E \d+, N \d+/).should("be.visible");
  });
});
