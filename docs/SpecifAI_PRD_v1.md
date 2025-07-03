# Product Requirements Document – SpecifAI

**Version 1.0 — July 2025**

## Vision

Business stakeholders speak requirements; SpecifAI turns them into GitHub Issues in under 60 s. Developers reply in‑thread, closing the loop in minutes.

## Personas

| Persona | Pain              | Value                 |
| ------- | ----------------- | --------------------- |
| PO      | Jira overhead     | Speak instead of type |
| Dev     | Unclear specs     | Structured Issues     |
| PM      | Scattered context | Single thread         |

## MVP KPIs

- Time‑to‑Issue ≤ 60 s
- Clarification rate −30 %
- Retention ≥ 40 %

## Functional Scope

1. GitHub OAuth via Supabase Auth
2. Voice capture ≤ 2 min → Whisper v4 STT
3. GPT‑4o clarify loop → Issue draft
4. MCP server creates Issue, streams updates
5. pgvector search, 30‑day audio retention

## Tech Stack

React 18 PWA · shadcn/ui · Supabase · Whisper v4 · GPT‑4o · Supabase Edge Functions

## Risks

Whisper cost spikes · PWA background limits · GitHub rate limits
