# MVP Scope: TikTok Multi-Account Operations Platform

**Status**: Draft for CEO review
**Author**: CTO
**Date**: 2026-05-13
**Issue**: TIK-6

---

## 1. Product Vision (One Sentence)

A SaaS dashboard that lets creators and agencies manage multiple TikTok accounts — connect accounts, publish content, and monitor performance — all from one place.

---

## 2. MVP User Stories

### Tier 1 — Core Flow (Must-Have for Launch)

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| US-01 | As a user, I can create an account and sign in | Email/password auth (via Auth.js). Session persists across browser close. |
| US-02 | As a user, I can connect one or more TikTok accounts via OAuth | Initiate OAuth flow from dashboard. TikTok redirects back. Account appears in connected list with avatar, handle, follower count. |
| US-03 | As a user, I can see a unified dashboard of all connected accounts | Dashboard shows card per account: avatar, @handle, follower count, today's video views (polled from TikTok API). |
| US-04 | As a user, I can publish a video to one or more connected accounts | Upload video file, add caption, select target accounts, hit publish. Video goes live on selected accounts. |
| US-05 | As a user, I can schedule a video for future publishing | Same as US-04 but with a "publish at" datetime. Video is uploaded server-side and published at scheduled time. |
| US-06 | As a user, I can view a list of my published and scheduled videos | Table showing video thumbnail, caption, target account(s), status (draft/scheduled/published/failed), publish time. |
| US-07 | As a user, I can view basic aggregate metrics across all accounts | Header cards: total followers, total video views (last 28d), total videos published. Data refreshes on page load. |

### Tier 2 — Quality of Life (Important but Not Blocking Launch)

| ID | Story | Acceptance Criteria |
|----|-------|-------------------|
| US-08 | As a user, I can disconnect a TikTok account | Remove account from platform. Revoke TikTok API token server-side. |
| US-09 | As a user, I can save a draft video | Upload video + caption without publishing. Saved to drafts table. Visible in video list. |
| US-10 | As a user, I can retry a failed publish | "Retry" button on failed videos. Re-attempts the TikTok API publish call. |

---

## 3. Core Flows

### Flow A: Account Connection

```
User clicks "Connect TikTok Account"
  → Redirected to TikTok OAuth consent screen
  → User authorizes
  → TikTok redirects back to our callback URL
  → Server exchanges code for access_token + refresh_token
  → Server fetches user info from TikTok /user/info/
  → Account saved in `tiktok_accounts` table with tokens (encrypted)
  → Dashboard refreshes with new account card
```

### Flow B: Publish Video

```
User clicks "Create Post"
  → Upload video file (client-side validation: ≤500MB, ≤10min, MP4)
  → Write caption (≤2200 chars)
  → Select target account(s) from connected list
  → Set publish time (optional — if omitted, publish now)
  → Submit
  → Server uploads video to TikTok via /video/upload/
  → If scheduled: saved as draft in `videos` table with `scheduled_at`
  → If publish now: upload + post via /video/publish/ immediately
  → Status displayed in video list (publishing / published / failed)
  → On failure: error reason shown in UI with retry option
```

### Flow C: Metrics Dashboard

```
User lands on dashboard
  → Server fetches last-28d stats from TikTok API for each connected account
  → Server aggregates: total followers, total views, total videos
  → Dashboard renders summary cards + per-account mini-cards
  → All data read-only in MVP
```

---

## 4. Data Model Sketch (New Tables)

These tables supplement the existing auth tables (`user`, `session`, `account`, `verification_token`).

```typescript
// TikTok accounts linked by a user
export const tiktokAccounts = pgTable("tiktok_account", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // TikTok-provided identifiers
  tiktokUserId: text("tiktok_user_id").notNull().unique(),
  tiktokHandle: text("tiktok_handle").notNull(),
  tiktokAvatarUrl: text("tiktok_avatar_url"),
  displayName: text("display_name"),
  followerCount: integer("follower_count").default(0).notNull(),
  // OAuth tokens (encrypted at rest)
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { mode: "date" }),
  // Metadata
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// Videos — both drafts and published
export const videos = pgTable("video", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  caption: text("caption"),
  // File storage
  fileUrl: text("file_url").notNull(),          // uploaded to Vercel Blob / R2
  fileSize: integer("file_size"),               // in bytes
  duration: integer("duration"),                // in seconds
  // Status
  status: text("status", { enum: ["draft", "scheduled", "publishing", "published", "failed"] })
    .notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at", { mode: "date" }),
  publishedAt: timestamp("published_at", { mode: "date" }),
  failureReason: text("failure_reason"),
  // TikTok response data
  tiktokVideoId: text("tiktok_video_id"),
  tiktokPublishStatus: text("tiktok_publish_status"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// Join table: which accounts a video is published/scheduled to
export const videoTargets = pgTable("video_target", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  videoId: text("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  tiktokAccountId: text("tiktok_account_id")
    .notNull().references(() => tiktokAccounts.id, { onDelete: "cascade" }),
  // Per-account publish status (for multi-account publishes)
  status: text("status", { enum: ["pending", "published", "failed"] })
    .notNull().default("pending"),
  tiktokVideoId: text("tiktok_video_id"),
  failureReason: text("failure_reason"),
});

// Cached metrics snapshots (avoid hitting TikTok API on every page load)
export const accountMetrics = pgTable("account_metric", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tiktokAccountId: text("tiktok_account_id")
    .notNull().references(() => tiktokAccounts.id, { onDelete: "cascade" }),
  followerCount: integer("follower_count").notNull(),
  videoViewCount: integer("video_view_count").notNull(),       // last 28d
  videoCount: integer("video_count").notNull(),                // total
  snapshotDate: timestamp("snapshot_date", { mode: "date" }).notNull().defaultNow(),
});
```

---

## 5. What Is Explicitly Out of Scope for MVP

| Area | Reasoning | When to Revisit |
|------|-----------|-----------------|
| Comment management (inbox, replies) | Read-only comments don't drive publishing value. High API complexity. | Post-MVP if users request it. |
| AI-generated content / captions | Adds ML pipeline complexity. Not needed to validate core value. | Post-MVP or integrate OpenAI API if demand is strong. |
| Rich analytics & reporting (charts, export) | Aggregated counters cover the initial need. Full analytics is a separate feature. | Post-MVP (Phase 2). |
| Team collaboration / multi-user per org | Building org-level auth and permission system before proving single-user value is premature. | Post-MVP (Phase 2). |
| Content calendar (drag-drop, weekly view) | Nice-to-have UX that adds engineering surface area without proving core publish flow. | Post-MVP (Phase 2). |
| Asset library / template management | Users bring their own videos. Library is a convenience feature, not a need. | Post-MVP (Phase 3). |
| Mobile app (iOS/Android) | Responsive web serves mobile use for MVP. Native apps add 2x maintenance cost. | Post-MVP if mobile web engagement is high. |
| Generic social network support (Instagram, YouTube) | TikTok-only focus lets us nail one platform. Multi-platform adds exponential complexity. | Post-MVP only if expansion is validated. |

---

## 6. Success Metrics

### Primary Metric (North Star)

> **A user can connect ≥1 TikTok account, publish a video, and see it go live on TikTok within 5 minutes of first sign-up.**

This validates the entire core flow: auth → OAuth → upload → publish → feedback.

### Measurable Targets

| Metric | Target | How Measured |
|--------|--------|-------------|
| Account connection success rate | ≥90% | OAuth completion / OAuth initiation |
| Video publish success rate | ≥95% | Published / attempted |
| End-to-end publish latency (from button click to TikTok confirmation) | <30s median | Server-side timing of upload → API call → response |
| Dashboard page load time | <2s (p95) | PostHog performance tracking |
| First-week retention | ≥40% | Users who publish ≥2 videos within 7 days of signup |

### What "Done" Looks Like for MVP

1. A new user can sign up, connect a TikTok account, upload and publish a video
2. The video appears on their TikTok account within 30 seconds
3. The dashboard shows their follower count and recent view data
4. All of this works reliably enough that we can put 50 beta testers on it

---

## 7. Technical Considerations

### TikTok API Requirements
- Need TikTok Developer account and app registration
- API scopes: `user.info.basic`, `video.upload`, `video.publish`, `video.list`
- OAuth 2.0 with refresh tokens (tokens expire after 24h for standard access; longer for offline access)
- Video upload endpoint: `POST /video/upload/` — upload to TikTok CDN, returns `upload_id`
- Video publish endpoint: `POST /video/publish/` — takes `upload_id` + caption

### File Storage
- Use **Vercel Blob** (managed uploads with CDN) for video file storage
- No need for S3/R2 in MVP — Vercel Blob integrates natively and handles multipart uploads
- Fallback: switch to R2 if Vercel Blob costs exceed $50/mo

### Background Jobs
- Scheduled video publishing: use a simple `setTimeout` / DB polling in a Vercel cron job (or `waitUntil`)
- Token refresh: refresh on use (lazy); add a cron to proactively refresh if needed
- No Redis/BullMQ for MVP — DB-backed polling is sufficient at this scale

### Security
- TikTok OAuth tokens encrypted at rest using `AES-256-GCM` (via a server-only lib)
- Video uploads scanned for size/type on client; server-side validation too
- Rate-limit video publish API per-user (max 10/hour) to prevent abuse

---

## 8. Implementation Phasing (Within MVP)

| Phase | Stories | Effort | Depends On |
|-------|---------|--------|------------|
| **Phase 1: Auth + Account Linking** | US-01, US-02, US-08 | 3 days | TikTok Developer account |
| **Phase 2: Video Publishing** | US-04, US-05, US-06, US-10 | 5 days | Phase 1 |
| **Phase 3: Dashboard & Metrics** | US-03, US-07 | 3 days | Phase 1 |
| **Phase 4: Drafts & Polish** | US-09 | 1 day | Phase 2 |
| **Beta Launch** | — | — | All phases complete |

**Total MVP effort estimate**: ~12 engineering days (excludes CEO time for TikTok Developer registration and beta tester recruitment).
