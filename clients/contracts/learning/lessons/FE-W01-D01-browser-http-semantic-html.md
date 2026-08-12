# Browser, HTTP and semantic HTML foundations

## Business problem

A Movie Ticket user opens `/login`, reads a document, enters credentials and eventually submits a
request. Before React can help, the browser must locate resources, construct the document and expose
native interaction semantics. If these foundations are misunderstood, later code tends to confuse
navigation with API calls, protocol state with session state, and visual appearance with meaning.

## Mental model

The browser is a user agent and runtime. An HTTP client sends an independent request describing a
resource/action; a server returns a response with status, headers and an optional body. One HTML
document can cause additional requests for stylesheets, fonts, images and scripts. HTTP is stateless,
but an application can build a session using credentials such as cookies or tokens.

HTML describes content structure and meaning. Semantic elements give the browser, keyboard users,
assistive technology and developers a shared contract. A link navigates to a resource; a button
performs an action; a form groups submission controls. Visual styling does not change a `div` into a
button. A visible `label` associated with an input communicates purpose and enlarges its usable hit
target.

## Options and project direction

- Native semantic elements: selected because they provide meaning, focus and expected interaction.
- Generic elements with click handlers: rejected for ordinary controls because behavior and
  accessibility must be rebuilt and can drift.
- Placeholder-only form naming: rejected because the name disappears after typing and is not a
  reliable accessible label.

Review the decision if a required interaction has no suitable native element; then start from the
closest semantic primitive and add only necessary ARIA/keyboard behavior.

## Failure and counterexample

Counterexample: "HTTP is stateless, therefore login sessions are impossible." HTTP does not remember
previous requests by itself, but applications carry session evidence across requests. Failure case:
a clickable `div` may look like a button but lack keyboard activation, focus behavior and a role/name.

## Movie Ticket application

The first static Auth shell will later use document landmarks, one heading hierarchy, a real form,
visible labels, suitable input types, a submit button and a registration link. CSS, JavaScript,
React, Tailwind and live API calls remain locked in this ticket step.

## References

- [MDN: Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview)
- [MDN: Semantic HTML](https://developer.mozilla.org/en-US/curriculum/core/semantic-html/)
- [MDN: How to structure a web form](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/How_to_structure_a_web_form)
