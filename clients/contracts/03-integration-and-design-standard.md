# Integration and design standard

Frontend calls only the API Gateway through verified public interfaces. Mock handlers must trace to
the same public behavior and may not invent successful production capability.

A screen is accepted against product-flow behavior, UI-state matrix, interaction, accessibility,
approved `DESIGN.md` tokens/reference, engineering quality and observed tests. Stitch receives a
sanitized FE design brief rather than the backend repository. Its output is a proposal, never API,
security, accessibility or functional authority.

A screen design separates functional acceptance from visual/UX acceptance. The functional section
defines behavior, states, semantic structure, validation, integration and the evidence that unlocks
visual work. The visual/UX section defines approved layout, responsive viewports, tokens, variants,
motion and visual evidence. A reviewed design must identify both sections before readiness; passing
functional evidence is the transition gate into visual implementation.
