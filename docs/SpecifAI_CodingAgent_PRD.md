# PRD – SpecifAI Coding‑Agent (Backend)

**Version 0.3 — July 2025**

## Purpose

Autonomous agent that:

1. Polls / listens for `ready-for-dev` Issues
2. Clarifies missing info via comment
3. Generates code, opens PR, labels progress
4. Pushes status to Supabase & email

## Objectives

- Detect ready Issue ≤ 60 s
- ≥ 80 % PRs pass CI first run
- Supabase status latency ≤ 3 s

## Architecture

Cron (10 min) + GitHub webhooks → Supabase Edge Function → Code‑gen LLM → PR → CI  
Supabase `agent_queue`, realtime channel, SendGrid email.

## States

queued → in‑progress → in‑review → done (or needs‑info / blocked)

## Roadmap

A0 poll+queue | A1 clarify | A2 code‑gen PR | A3 realtime/email | A4 observability
