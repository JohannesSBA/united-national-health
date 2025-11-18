# Scalability and Low-Connectivity Hardening

## Summary
Strengthen the Global Admin console so it behaves gracefully in low-connectivity environments and scales under heavier administrative traffic. This includes caching, background job processing, connection pooling, expanded rate limiting, and operational workflows for SMTP/migration failures.

## Why
- Users with unreliable networks need more resilient read experiences (cached dashboards, ISR) and clearer offline UX.
- Email delivery and logging currently run inline; moving them to a queue keeps the UI responsive and isolates SMTP outages.
- Database connections will bottleneck when we add more app instances; pooling is required for horizontal scale.
- Sensitive endpoints (actor lookup, email exports) now rate-limit in-app, but we also need proxy-level throttling.
- `EMAIL_DELIVERY_FAILURE` alerts exist but aren’t routed to on-call tooling yet.

## Scope
1. **Caching / ISR**
   - Add Redis/Cloudflare caching for `getGlobalAdminDashboardData` and analytics aggregates.
   - Consider ISR with invalidation hooks (e.g., revalidate dashboard on major updates).
2. **Background jobs**
   - Introduce a queue (BullMQ/Faktory/etc.) + worker process for `sendSystemEmail`.
   - Jobs handle SMTP retries, log EmailLog entries, and emit alerts on failure.
3. **Connection pooling & rate limiting**
   - Deploy PgBouncer (or Prisma Accelerate) and update `DATABASE_URL`.
   - Configure proxy-level throttling (nginx/Cloudflare) for `/api/globaladmin/*`.
   - Continue extending `enforceRateLimit` for other mutation endpoints.
4. **Offline UX**
   - Cache recent activity locally so filters work offline.
   - Add offline banners + retry buttons for failed fetches.
5. **Ops integrations**
   - Pipe `SecurityAlert` (especially `EMAIL_DELIVERY_FAILURE`) into on-call tooling.
   - Ensure deployment scripts always run `prisma migrate deploy` before `next start`.
6. **Template sanitization guardrail**
   - If/when email templates render user-provided snippets, sanitize before logging/rendering to avoid XSS.

## Acceptance Criteria
- Dashboard/analytics read paths continue working for a short period during transient outages.
- Email delivery/logging happens via background jobs; UI no longer blocks on SMTP.
- Database connections are pooled; no connection exhaustion under horizontal scaling.
- Rate limits exist both in-app and at the proxy level for sensitive APIs.
- On-call receives alerts when email delivery fails or migrations are missing.
- Documentation (README) is updated with new infra dependencies and operational steps.
