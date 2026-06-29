---
name: react-native-maps web bundling
description: How to use react-native-maps in an Expo project that also bundles for web, without crashing Metro
---

# react-native-maps Web Bundling Fix

## The Rule
Never import `react-native-maps` (directly or via `require()`) from a file that Metro bundles for web. Use platform-split files instead.

**Why:** react-native-maps imports `react-native/Libraries/Utilities/codegenNativeCommands` which is a native-only internal. Metro throws a fatal error when it encounters this on the web platform, even inside a `try/catch` or `Platform.OS !== "web"` guard — Metro resolves imports statically before runtime.

## How to Apply
Create two files:
- `components/LiveMap.native.tsx` — real MapView + Polyline import
- `components/LiveMap.tsx` — web stub (no react-native-maps import)

Then import `LiveMap` normally in your screen; Metro picks the right variant per platform.

**Also:** pin react-native-maps to 1.18.0 for Expo Go compatibility (do NOT add to app.json plugins array — crashes app).
