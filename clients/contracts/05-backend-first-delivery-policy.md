# Backend-first alternating delivery policy

The delivery sequence is:

`BE-WNN VERIFIED → FE-WNN eligible → FE-WNN VERIFIED → BE-W(N+1) eligible`.

A frontend product ticket is eligible only when all declared learning prerequisites, its predecessor frontend ticket, and the matching backend public capability gate are verified. A weekly frontend gate requires every core ticket in that frontend week to be verified with no blocking finding.

Frontend public integration authority is limited to the API Gateway contracts named by `integration/backend-capability-map.yml`. Mocks must trace to the same request, response, error and security behavior. They cannot invent a successful backend capability.

Foundation learning may proceed without a backend endpoint, but it cannot silently become product implementation. Visual UX remains gated by functional UI evidence under `FE-CCR-001`.

The router owns the alternation verdict. Frontend state never changes backend review status, and backend state never changes frontend review status.
