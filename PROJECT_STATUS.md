# Relay (SMM Management Application) — Status & Timeline Estimate

*Date: August 20, 2026*

---

## 1. Current Completion Percentage

**~72%** of total scope (including new features)

Without the 3 new features, the core app is **~90% complete**.

---

## 2. Modules / Features Already Completed

| # | Module | Status | Notes |
|---|--------|--------|-------|
| 1 | Auth (JWT login/signup/password reset) | ✅ Done | Tokens stored in browser |
| 2 | Brands (multi-brand CRUD) | ✅ Done | Brand owns all entities |
| 3 | Social Account OAuth (Facebook, Instagram, LinkedIn) | ✅ Done | Encrypted token storage |
| 4 | LinkedIn Company Page Connection | ✅ Done | Workaround for Community Mgmt API restriction |
| 5 | Post Creation & Editing | ✅ Done | Rich editor, media attach, multi-platform targets |
| 6 | Media Upload (S3 + Cloudinary) | ✅ Done | Presigned URLs |
| 7 | Post Scheduling & Auto-Publish | ✅ Done | Cron job every minute picks up due posts |
| 8 | Immediate Publish (Publish Now) | ✅ Done | Per-platform sequential publishing |
| 9 | Dashboard — Recent Posts | ✅ Done | With bulk actions (just fixed: "Publish Draft Posts") |
| 10 | Queue Page — Full Post Management | ✅ Done | Tabs, search, sort, filtering, bulk actions |
| 11 | Comment Syncing (FB, IG, LinkedIn) | ✅ Done | Runs every 30s with overlap guard |
| 12 | Manual Comment Replies | ✅ Done | Optimistic UI — shows instantly |
| 13 | Auto-Reply Rules (Template System) | ✅ Done | Per-platform templates, keyword triggers |
| 14 | AI Comment Replies (DeepSeek/OpenRouter) | ✅ Done | Configurable tone/behaviour per brand |
| 15 | Comments AI Settings Panel | ✅ Done | Toggle, behaviour box, read-only guidelines/niche |
| 16 | Competitor Tracking Module | ✅ Done | Manual + API sources |
| 17 | Analytics Snapshots | ✅ Done | Post-level engagement metrics |
| 18 | Post Templates | ✅ Done | Reusable post templates per brand |
| 19 | Rate Limiting & Guards | ✅ Done | Throttler, BrandMemberGuard |

---

## 3. Remaining Work

### Core App Fixes & Polish

| # | Item | Est. Time | Priority |
|---|------|-----------|----------|
| 1 | Make brand guidelines & niche editable (Comments AI) | 2-3 hrs | Medium |
| 2 | LinkedIn deeper comment support (permissions work) | 3-4 hrs | Low |
| 3 | "Preview reply" button in Comments AI panel | 4-5 hrs | Low |
| 4 | "AI" badge on AI-written replies | 2-3 hrs | Low |
| 5 | Git cleanup (remove tracked .mp4 demo videos) | 15 min | Low |
| 6 | Meta App Review submission guidance (docs, not code) | 1 hr | Low |

### New Feature 1: DM Automation

| # | Item | Est. Time |
|---|------|-----------|
| 1 | Database schema — DM conversations, messages, DM automation config | 3-4 hrs |
| 2 | Backend — DM syncing from Facebook, Instagram, LinkedIn | 1-2 days |
| 3 | Backend — AI Agent response engine (reuse OpenRouter integration) | 1 day |
| 4 | Backend — Fallback to SMM Manager (notification/queue for manual reply) | 6-8 hrs |
| 5 | Frontend — DM inbox page (conversation list + thread view) | 1.5 days |
| 6 | Frontend — DM automation settings panel (enable/disable, AI tone, escalation rules) | 6-8 hrs |
| 7 | Real-time polling or webhook for incoming DMs | 6-8 hrs |
| 8 | Testing & edge cases (message limits, media DMs, group chats) | 1 day |

**Estimated: 6-7 days**

### New Feature 2: Client Management

| # | Item | Est. Time |
|---|------|-----------|
| 1 | Database schema — clients, brand-client associations, roles | 2-3 hrs |
| 2 | Backend — Client CRUD, invitation system, role-based access | 1 day |
| 3 | Backend — Email invitation flow (already has nodemailer) | 4-5 hrs |
| 4 | Frontend — Client list, invite modal, role management UI | 1 day |
| 5 | Frontend — Client permission scoping (which brands they can access) | 6-8 hrs |
| 6 | Testing | 4-5 hrs |

**Estimated: 3-4 days**

### New Feature 3: AI Image Alternatives (Pre-Posting)

| # | Item | Est. Time |
|---|------|-----------|
| 1 | Backend — Integration with image generation API (DALL-E / Stability AI) | 1 day |
| 2 | Backend — Generate 2-3 alternatives from uploaded image + caption context | 6-8 hrs |
| 3 | Backend — Store/cache generated alternatives, S3 upload | 4-5 hrs |
| 4 | Frontend — Image alternative selector in post creation flow | 1 day |
| 5 | Frontend — Preview comparison (original vs alternatives), select/pick | 6-8 hrs |
| 6 | Cost management — usage limits, API key rotation | 3-4 hrs |
| 7 | Testing | 4-5 hrs |

**Estimated: 4-5 days**

### Final QA & Testing

| # | Item | Est. Time |
|---|------|-----------|
| 1 | End-to-end testing (all flows: auth → brand → connect → post → comment → reply) | 1.5 days |
| 2 | Cross-platform browser testing | 0.5 day |
| 3 | Mobile responsiveness QA | 0.5 day |
| 4 | Edge case testing (token expiry, failed publishes, rate limits) | 0.5 day |
| 5 | Bug fixes from QA | 1 day |

**Estimated: 3-4 days**

---

## 4. Current Blockers / Dependencies

| Blocker | Impact | Mitigation |
|---------|--------|------------|
| **Meta App Review** (Page Public Content Access) | Facebook comment author names show as "Facebook user" | Non-blocking — app works, just generic names. Can submit in parallel. |
| **LinkedIn API permissions** | Comment fetching returns empty on 401/403 | Low impact — silently skips. Full support needs deeper permission scope. |
| **AI Image API selection** | Need to decide provider (DALL-E 3, Stability AI, etc.) + API keys + budget | Needs decision before Feature 3 starts. |
| **DM API permissions** | Facebook/Instagram DM access requires specific app permissions (pages_messaging) | May need Meta App Review for DM scope too. |

---

## 5. Timeline (All estimates in PKT, working 6-8 hrs/day)

| Milestone | Target Date | Target Time (PKT) |
|-----------|-------------|-------------------|
| **Core app polish + fixes** | Tue, Aug 26, 2026 | 6:00 PM PKT |
| **Development Complete (all features)** | Fri, Sep 5, 2026 | 6:00 PM PKT |
| **QA / Testing Complete** | Wed, Sep 10, 2026 | 6:00 PM PKT |
| **Final Delivery** | Thu, Sep 11, 2026 | 12:00 PM PKT |

---

## 6. Summary Breakdown

| Phase | Dates | Duration |
|-------|-------|----------|
| Core polish + remaining fixes | Aug 20 – Aug 26 | ~4 days |
| DM Automation | Aug 27 – Sep 4 | ~6-7 days |
| Client Management | Sep 1 – Sep 3 (parallel) | ~3-4 days |
| AI Image Alternatives | Sep 3 – Sep 5 | ~4-5 days |
| QA & Testing | Sep 6 – Sep 10 | ~3-4 days |
| Buffer / Bug Fixes | Sep 10 – Sep 11 | 1 day |

*Note: DM Automation and Client Management can overlap since they touch different modules.*

---

## 7. Resources / Support Needed

- **AI Image API**: Decision on provider + budget allocation (DALL-E 3 ~$0.04/image, Stability AI ~$0.002/image)
- **Meta App Review**: Submit for `pages_messaging` (DM Automation) and `pages_show_list` (author names)
- **LinkedIn API access level**: Confirm if we need `w_member_social` for DMs or if current scope suffices
- **Design assets**: Any new UI mockups needed for DM inbox and image selector? Or dev-driven?
- **QA device access**: Mobile devices for responsiveness testing (iOS + Android)

---

## 8. Key Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Meta App Review delays (could take 1-2 weeks) | Medium | High for DM Automation | Start DM backend now, submit review immediately, mock the API for dev |
| Image generation API cost overrun | Low | Medium | Set hard usage limits per brand, cache results |
| LinkedIn DM API not available on current plan | Medium | Medium | Launch DM for FB/IG first, LinkedIn later |
| Scope creep on AI image feature | Medium | Medium | Lock scope: 2-3 alternatives only, no editing/fine-tuning in v1 |
| Single developer bandwidth | High | High | Prioritize features; DM Automation is the most complex — start it first |

---

---

# Draft Reply Email

*Copy, edit, and send this as your response:*

---

**Subject:** Re: Relay (SMM Management Application) — Status & Timeline Estimate

Hi [Name],

Thank you for the detailed status update. Please find my responses below:

**1. Current completion percentage:**
Noted at ~72% overall and ~90% on core features. This aligns with my understanding of the project's current state.

**2. Completed modules:**
Looks solid. The core loop — connect accounts, schedule posts, sync comments, auto/AI reply — is fully functional. The recent fixes (bulk publish actions, comment sync improvements) have tightened things up well.

**3. Remaining work:**
The breakdown is clear. A few notes:
- **DM Automation** is the most complex new feature — agreed on starting it first.
- **Client Management** and **AI Image Alternatives** can run in parallel where possible.
- Please ensure the AI image feature has hard cost limits from day one.

**4. Blockers:**
- Meta App Review should be submitted ASAP — even if it takes 1-2 weeks, we can develop against mocked APIs and swap in production once approved.
- For the AI image provider, I'd like to go with **[DALL-E 3 / Stability AI / TBD]**. Please confirm pricing and whether it fits our use case.
- No blockers on the LinkedIn front for now — we can revisit deeper comment support later.

**5. Timeline:**
The proposed timeline is acceptable:
- Core polish by Aug 26
- All development complete by Sep 5
- QA complete by Sep 10
- Final delivery by Sep 11

Please flag any slippage immediately so we can adjust scope if needed.

**6. Resources:**
- I'll handle the Meta App Review submission on our end.
- For design assets — let's go with dev-driven UI for the DM inbox and image selector. If anything needs formal design, we'll circle back.
- Budget approval for the AI image API — please share the cost estimate so I can get it approved.

**7. Risks:**
Understood. The biggest risk is the Meta App Review timeline. Let's mitigate by developing DM features with mocked APIs and testing against real APIs once approved. If the review is delayed beyond Sep 1, we may need to deprioritize LinkedIn DM support and launch with Facebook/Instagram only.

Please proceed with the updated schedule. I'll circulate this internally with the production team.

Best regards,
[Your Name]
[Your Title]
[Date]
