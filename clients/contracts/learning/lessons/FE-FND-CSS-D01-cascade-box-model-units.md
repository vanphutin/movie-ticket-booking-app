# CSS foundations: cascade, box model and resilient units

## Goal

Predict the computed result before writing CSS, then apply a small explainable base style without changing the semantic meaning of the authentication shell.

## 1. Cascade, inheritance and specificity

When declarations compete, first identify whether a property is inherited, then compare cascade origin and importance, selector specificity, and finally source order. Prefer a low-specificity class-based rule that is easy to override. An ID selector can win today but raises the cost of later component states; `!important` is reserved for a documented cascade layer or exceptional override, not routine conflict repair.

Selected direction: use element rules for broad defaults and single-class selectors for components. Rejected direction: escalating selectors such as `main form.auth-form input` merely to beat an earlier rule. Trade-off: low specificity requires intentional source organization, but keeps overrides predictable.

Counterexample: `color` normally inherits, while `margin`, `padding`, `border`, and `width` normally do not. Styling a parent therefore does not make every box-model property appear on its children.

## 2. Box model and sizing

The rendered box contains content, padding, border, and margin. With the default `content-box`, a declared width excludes padding and border. With `box-sizing: border-box`, the declared width includes content, padding, and border, making `width: 100%` form controls easier to reason about.

Selected direction: apply `box-sizing: border-box` consistently and let normal document flow determine vertical placement. Rejected direction: fixed positioning for ordinary form layout. Limitation: `border-box` does not prevent overflow caused by long unbreakable content, large minimum sizes, or a child wider than its container.

## 3. Resilient units

Use `rem` for typography or spacing that should follow the root font size, `em` when a value should scale with the component's own font size, percentages for container-relative sizing, and `px` for deliberately device-independent CSS-pixel details such as a thin border. Avoid locking readable text or form controls to fixed heights.

Change condition: a fixed unit is acceptable when the design requires a stable thin stroke; switch to a relative or bounded value when user font scaling, translation, or container width should affect the result. A practical bounded width can combine `width: 100%` with `max-width` rather than assuming one viewport.

## Application boundary

The exercise may style the already reviewed static authentication shell. It must preserve visible labels and focus indicators, must not introduce JavaScript or API behavior, and must not claim that a styled form authenticates a user.

## References

- [CSS cascade](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascade/Introduction)
- [Introduction to the CSS box model](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Box_model/Introduction)
- [CSS values and units](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Values_and_units)
