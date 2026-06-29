# Dokra – Fitness

A premium fitness tracking mobile app for walking, running, cycling, hiking, and more. Track workouts in real-time, view history, and monitor daily progress.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with Expo Router
- State: React Context + AsyncStorage (no backend needed)
- UI: MaterialCommunityIcons, expo-linear-gradient, react-native-svg
- API: Express 5 (api-server artifact, unused by mobile)
- DB: PostgreSQL + Drizzle ORM (unused by mobile currently)

## Where things live

- `artifacts/dokra-fitness/` — Expo mobile app
  - `app/(tabs)/` — Home, Track, History, Profile tabs
  - `app/tracking.tsx` — Live workout tracking (full-screen modal)
  - `app/summary.tsx` — Workout completion summary
  - `context/WorkoutContext.tsx` — Workout history CRUD via AsyncStorage
  - `context/ProfileContext.tsx` — User profile via AsyncStorage
  - `constants/workout.ts` — Workout types, configs (speed, MET, etc.)
  - `components/` — CircularProgress, StatCard, WorkoutCard, ActivityGrid, WeeklyBar
  - `utils/format.ts` — Duration, distance, pace formatters

## Architecture decisions

- Frontend-only mobile app: all data stored in AsyncStorage, no backend calls
- Workout metrics simulated using MET values and configurable speeds per activity type
- Dark-first color theme (both light/dark tokens set to dark palette for fitness aesthetic)
- Circular progress rings built with react-native-svg for smooth, accurate arcs
- Full-screen modal pattern for tracking screen so tabs don't show during workout

## Product

- Home dashboard: daily step/calorie/distance progress with circular rings and weekly bar chart
- Track tab: 6 activity types (walk, run, cycle, hike, trek, skate) with start button
- Live tracking: real-time timer, distance, calories, pace, speed, steps — pause/resume/stop
- Workout summary: post-workout stats with motivational message
- History tab: filterable list of all past workouts with all-time totals
- Profile tab: editable name/bio/weight/step-goal, achievement badges, all-time stats

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- react-native-maps must be pinned to 1.18.0 if added — only version compatible with Expo Go
- Do NOT add react-native-maps to plugins array in app.json — crashes the app
- react-native-maps CANNOT be imported from any file Metro bundles for web (even inside Platform.OS guard or try/catch) — use platform-split files: LiveMap.native.tsx (real map) + LiveMap.tsx (stub)
- Workout simulation uses MET × weight × time formula (weight defaults to profile.weightKg)
- Restart workflow via `restart_workflow` tool — never run `npx expo start` directly

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
