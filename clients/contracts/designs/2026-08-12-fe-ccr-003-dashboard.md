# FE-CCR-003 dashboard design

The dashboard is a full-file generated projection. A dedicated builder parses canonical
BE/FE state and roadmap contracts into a normalized view model, then emits one standalone
HTML file with embedded CSS, view-only JavaScript and JSON. It opens through `file://`
without a server or external asset.

The page contains an executive summary, backend-first delivery rail, two workstream
panels, 79-ticket matrix, FE foundation chain, 22-capability matrix, W4–W10 coverage,
lifecycle/evidence and the routed next action. Status colors are semantic: green only for
verified, blue for active, amber for candidate, gray for planned/locked and red for
blockers.

Security and integrity boundaries:

- HTML never becomes authority and never writes repository state;
- embedded values are escaped before HTML/JSON insertion;
- no forms, contenteditable, local/session storage or mutating HTTP calls;
- ordering, line endings and snapshot metadata are deterministic;
- validator recomputes the expected HTML and checks counts, canonical values and
  forbidden interaction surfaces.

Verdict: `APPROVED` by the user's explicit `1a 2b 3c 4a` selection and instruction to proceed.
