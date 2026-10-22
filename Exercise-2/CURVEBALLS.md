# CURVEBALLS

<!-- Respond to both; choose which to handle deeply first. -->

## A — Trust and enterprise

<!-- A large enterprise prospect will proceed only if you can credibly guarantee no cross-tenant leakage and provide auditability of sources used per answer, within the pilot. -->

### What changes in my plan

The plan already addresses this:

- **No cross-tenant leakage:** data is separated per user, with the resolved scope carried from Auth + Tenant Resolver through to the Retriever, so there is no cross-contamination between tenants.
- **Auditable sources per answer:** the Answer Justification Log at the Retriever ties each answer to the sources behind it.

### What I explicitly do not do now

- Leave the system as it was, with cross-contamination possible.

### How I'd prove it

- Leakage was observed, so we separated the data. That is the simplest, most direct fix.

## B — Cost

<!-- The CFO demands a 30% reduction in inference cost within 2 weeks without materially harming deflection. -->

### What changes in my plan

The plan already addresses this:

- **Swappable models at the LLM Gateway:** route to locally hosted models to reduce cost as needed, and reserve bigger models for requests that need heavier reasoning.

### What I explicitly do not do now

- Worry about infra cost. In infra, quality is cost; if infra cost is the main worry, something else is the real problem.

### How I'd prove it

- People don't want something fast but bad. They will wait for an answer if it gives them a good result.
