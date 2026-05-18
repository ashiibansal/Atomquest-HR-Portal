# Architecture Diagram

```mermaid
flowchart LR
  U[Employee / Manager / Admin] --> UI[Next.js Web Portal]
  UI --> SA[Server Actions]
  UI --> RH[Route Handlers]
  SA --> RULES[Business Rule Layer]
  RH --> RULES
  RULES --> PRISMA[Prisma ORM]
  PRISMA --> DB[(SQLite Local Demo)]

  RULES --> AUDIT[Audit Log]
  RULES --> SCORE[Progress Scoring Engine]
  RULES --> REPORT[CSV Report Export]

  subgraph Role Portals
    EMP[Employee Goal Sheet]
    MGR[Manager Approval + Check-in]
    ADM[Admin Dashboard]
  end

  UI --> EMP
  UI --> MGR
  UI --> ADM
```

## Cost optimisation

- SQLite keeps local demo cost at zero.
- Next.js Server Actions avoid a separate backend service for the MVP.
- Prisma gives typed database access without manual SQL boilerplate.
- CSV export is generated server-side without paid reporting tools.
- PostgreSQL can be introduced only at deployment time.
