# P13 Beta Pilot Scope

**Date:** 2026-05-09
**Previous:** P12 Secure Beta Pilot = GO
**Goal:** Controlled beta pilot with limited testers, real usage data collection, issue triage

## In Scope

- Install APK on physical devices
- Onboarding flow
- Demo Oyunlar catalog
- NeonGamePrepScreen
- Fruit Slash (Meyve Kesme)
- Dodge Run (Engelden Kacis)
- Fit Challenge (Spor Mucadelesi)
- Result screen
- Session sync to Supabase
- Back navigation (Android back button)
- Bottom navigation
- Crash log collection
- Admin publish/refresh stability

## Out of Scope

- Leaderboard
- Store
- Friends
- Events
- Production auth (RLS hardening)
- Payments
- Play Store release
- New game templates
- Major UI redesign
- Subscription/payment
- Large DB schema changes

## Testers

| Tester | Device | Android Version | Status |
|---|---|---|---|
| T1 | — | — | Pending |
| T2 | — | — | Pending |
| T3 | — | — | Pending |

## Exit Criteria

- At least 3 physical devices tested
- Each tester completed full flow (onboarding → 3 games → result → sync)
- No P0/P1 issues
- Session sync verified in Supabase
- Admin publish/refresh stable
- Crash log collected or "no crash" confirmed
- Final pilot report produced
- P14 priority list defined

## Decision Matrix

| Outcome | Criteria |
|---|---|
| PASS | 3+ devices, no P0/P1, sync verified, full verification PASS |
| CONDITIONAL PASS | Minor P2/P3 issues, no hotfix needed, pilot can continue |
| FAIL | P0 crash, P1 blocker, sync broken, security issue, data loss |
