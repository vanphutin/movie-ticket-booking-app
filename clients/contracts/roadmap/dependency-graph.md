# Frontend dependency graph

```mermaid
flowchart TD
  WEB["Web + semantic HTML"] --> CSS["CSS responsive"] --> JS["JavaScript DOM async"]
  JS --> TS["TypeScript strict"] --> RCT["React mental model"]
  RCT --> A4["FE W4 Auth"]
  BE4["BE W4 VERIFIED"] --> A4
  A4 --> BE5["BE W5"] --> C5["FE W5 Catalog"]
  C5 --> BE6["BE W6"] --> S6["FE W6 Scheduling"]
  S6 --> BE7["BE W7"] --> B7["FE W7 Booking"]
  B7 --> BE8["BE W8"] --> P8["FE W8 Payment + Ticket"]
  P8 --> BE9["BE W9"] --> O9["FE W9 Operability"]
  O9 --> BE10["BE W10"] --> R10["FE W10 Release + Senior scope"]
```

Every solid delivery edge is an AND-gate with the declared frontend capability prerequisites. Backend nodes mean verified public capability evidence, never planned or merely completed code.
