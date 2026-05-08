# P3 Scene Play Publish QA - Script Evidence

**Date:** 2026-05-08 16:34:55
**Script timestamp:** 20260508-163452
**API Base URL:** http://localhost:3000/v1
**Game Key:** p3_scene_play_deve_cuce_20260508-163452

## Result

**P3 Publish: PASS**

## Published Game

- **id:** game_bedbb159-f21e-48f5-95db-e90e29692e1c
- **gameKey:** p3_scene_play_deve_cuce_20260508-163452
- **title:** P3 Deve Cuce Remote QA
- **template:** SCENE_PLAY
- **category:** 
- **status:** PUBLISHED
- **version:** 1
- **publishedAt:** 2026-05-08T13:34:55.019Z

## Validation

- Pre-publish validation: CLEAN (no errors)

## Active Endpoint Check

- Game appears in active endpoint
- Status confirmed as PUBLISHED
- Active definitions count: 5

## Scene Objects

- cuce_prompt: SQUAT, 10 points, 2400ms life
- deve_prompt: JUMPING_JACK, 12 points, 2400ms life

## Program Step

- p3_scene_play_step: PLAY_GAME, 45s

## Payload

- Full published definition: artifacts\verification\p3-published-game-payload-20260508-163452.json

## Commands

    powershell -ExecutionPolicy Bypass -File scripts/p3-publish-scene-play.ps1
