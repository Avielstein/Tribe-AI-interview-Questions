# HANDOFF

<!-- 300–600 words. Your own structure: convey the problem, the architecture, and the boundaries as you understand them. -->

## The problem

LatticeHQ (mid-market B2B SaaS, ~1,200 customer orgs, SOC 2) runs a support copilot for support agents and self-serve customers. Support volume is up 35% QoQ and the backlog is growing. The pilot goal is to raise ticket deflection from 8% to 18% in 6 weeks, but trust is fragile: a few hallucinations have already caused escalations, and enterprise customers are sensitive to tenant data leakage.

What's going wrong:

- **Tenant isolation:** a response cited another tenant's KB article.
- **Quality:** answers are plausible but not grounded; citations are often irrelevant.
- **Latency and cost:** p95 spikes to 3–5s in bursts; token usage is higher than expected.
- **Observability:** logs exist but don't connect an answer to why it was given.
- **Feedback loop:** thumbs-down is captured but never used.

## The architecture

A question comes in with a `tenant_id` and hits `copilot-api`. Auth + Tenant Resolver resolves the tenant, then hands off to the RAG Orchestrator. From there, everything is handed to the Retriever, which pulls from the Vector Index, the Doc Store, and the Ticket Summary Store. The LLM Gateway generates an answer with citations, which goes back to the user. The user can leave thumbs up/down feedback, which is stored in the Feedback DB and goes nowhere after that.

## Boundaries

- **Pilot constraints:** 6 weeks; 2 engineers and 1 PM; no new vendor procurement; something measurable must ship in week 2.
- **Isolation:** SOC 2 with strict tenant isolation; no cross-tenant access, even in embeddings or the index; regulated tenants get redaction mode with no ticket snippets.
- **Safety:** safe refusal is preferred over a confident wrong answer.
- **Unknown:** the root cause of the leakage near-miss.
