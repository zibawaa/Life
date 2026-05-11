# Life Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved private, local-only, installable Life Dashboard PWA.

**Architecture:** A React + Vite + TypeScript single-page app with an app shell, bottom navigation, IndexedDB persistence, local insight rules, barcode lookup, and static PWA assets. Data flows from Dexie-backed persistence into screen components through a dashboard hook; all personal logs remain on-device.

**Tech Stack:** React, TypeScript, Vite, Dexie, Lucide React, native BarcodeDetector/getUserMedia where supported, Open Food Facts product lookup, manual service worker, Netlify static build.

---

## File Structure

- Create `package.json`, `package-lock.json`: npm project metadata and locked dependencies.
- Create `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`: Vite/TypeScript configuration.
- Create `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg`: installable PWA shell.
- Create `src/main.tsx`: React entrypoint and service worker registration.
- Create `src/App.tsx`: app shell composition, navigation state, and screen routing.
- Create `src/styles.css`: design tokens, responsive layout, and component styling.
- Create `src/types.ts`: app domain types.
- Create `src/types/barcode.d.ts`: native BarcodeDetector type declarations.
- Create `src/data/db.ts`: Dexie database schema, persistence helpers, export/import/reset.
- Create `src/data/defaults.ts`: initial profile and workout split defaults.
- Create `src/data/insights.ts`: deterministic local insight rules.
- Create `src/data/nutrition.ts`: calorie and macro target estimation.
- Create `src/data/openFoodFacts.ts`: barcode product lookup.
- Create `src/hooks/useDashboardData.ts`: app data loading and mutations.
- Create `src/components/AppShell.tsx`: header, bottom nav, and layout frame.
- Create `src/components/Primitives.tsx`: reusable card, tabs, empty state, and form controls.
- Create `src/components/BarcodeScanner.tsx`: camera scanner with manual barcode fallback.
- Create `src/screens/Home.tsx`: timeline, today's summary, quick-add, and insight cards.
- Create `src/screens/Add.tsx`: dynamic entry form for all entry types.
- Create `src/screens/Insights.tsx`: local recommendations and trend cards.
- Create `src/screens/Areas.tsx`: dedicated area tabs and focused tracker views.
- Create `src/screens/Settings.tsx`: profile, food targets, workout split, export/import/reset.

## Task 1: Project Scaffold

- [ ] **Step 1: Create package and config files**

Create a Vite React project with scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install react react-dom dexie lucide-react
npm install -D @vitejs/plugin-react vite typescript @types/react @types/react-dom
```

Expected: npm creates `package-lock.json` with no install errors.

- [ ] **Step 3: Add PWA public assets**

Add `manifest.webmanifest`, `sw.js`, and `icon.svg`. The manifest must set `display` to `standalone`, use a cream background, and include an SVG icon.

- [ ] **Step 4: Verify scaffold**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build complete with exit code 0.

## Task 2: Domain Model And Persistence

- [ ] **Step 1: Define domain types**

Create entry unions for mood, health, gym, food, finance, goal, and bucket list records. Include `id`, `type`, `date`, `createdAt`, and `updatedAt` on every entry.

- [ ] **Step 2: Implement IndexedDB schema**

Create Dexie tables for:

```ts
entries: 'id, type, date, createdAt'
settings: 'key'
localFoods: 'id, barcode, name'
```

- [ ] **Step 3: Implement persistence helpers**

Add helpers for creating, updating, deleting, listing, exporting, importing, and resetting local data.

- [ ] **Step 4: Verify persistence types**

Run:

```bash
npm run build
```

Expected: no TypeScript errors.

## Task 3: Local Calculations

- [ ] **Step 1: Add profile defaults**

Create defaults for metric units, profile, food target inputs, and seven split days.

- [ ] **Step 2: Add nutrition target calculation**

Use Mifflin-St Jeor style BMR estimation with activity multipliers and goal adjustment. Output calorie, protein, carbs, and fat targets.

- [ ] **Step 3: Add workout split helper**

Calculate the active split day from `splitStartDate` and a 7-day cycle. Rest days must be valid split days.

- [ ] **Step 4: Add insight rules**

Create local rules for mood trend, gym consistency, calorie status, finance spend, health severity, and inactive goals.

- [ ] **Step 5: Verify calculations**

Run:

```bash
npm run build
```

Expected: no TypeScript errors.

## Task 4: App Shell And Visual System

- [ ] **Step 1: Build the design tokens**

Implement cream/oat background, beige surfaces, olive controls, dark charcoal text, coral accents, small cat/paw motifs, 8-18px radii, and mobile-safe spacing.

- [ ] **Step 2: Build app shell**

Implement bottom navigation with `Home`, `Add`, `Insights`, `Areas`, and `Settings`.

- [ ] **Step 3: Build reusable primitives**

Add cards, tabs, form controls, empty states, and icon buttons.

- [ ] **Step 4: Verify shell responsiveness**

Run the app and inspect mobile and desktop layouts in the browser.

## Task 5: Screens And Forms

- [ ] **Step 1: Implement Home**

Show today's summary, insight cards, recent timeline entries, and a quick-add action.

- [ ] **Step 2: Implement Add**

Build a dynamic form for every entry type. Saving must persist entries and return to `Home`.

- [ ] **Step 3: Implement Areas**

Build dedicated tabs for Mood, Health, Gym, Food, Finances, Goals, and Bucket List. Each tab must show focused summaries and recent entries.

- [ ] **Step 4: Implement Insights**

Show local recommendation cards and empty states when there is not enough data.

- [ ] **Step 5: Implement Settings**

Add profile fields, food target fields, workout split editor, export/import/reset, and install guidance.

- [ ] **Step 6: Verify screen routing**

Click each bottom nav item and area tab in the browser.

## Task 6: Gym Split And Food/Barcode Features

- [ ] **Step 1: Add gym split editor**

Allow Day 1 through Day 7 to be configured as workout days or rest days, with exercises and targets.

- [ ] **Step 2: Add automatic workout categorization**

When adding a gym entry, prefill the active split day and planned exercises from settings.

- [ ] **Step 3: Add food target setup**

Use kg, cm, activity level, and goal to calculate calorie and macro recommendations.

- [ ] **Step 4: Add barcode scanning and lookup**

Use native `BarcodeDetector` where available, camera permission where possible, and manual barcode input fallback. Fetch product data from Open Food Facts API v2 by barcode and save selected calories/macros locally.

- [ ] **Step 5: Verify barcode fallback**

Use manual barcode entry in the browser to confirm lookup/failure handling works even if camera scanning is unavailable.

## Task 7: PWA And Netlify Readiness

- [ ] **Step 1: Register service worker**

Register `public/sw.js` only in production or preview-safe contexts.

- [ ] **Step 2: Verify build output**

Run:

```bash
npm run build
```

Expected: `dist/` is produced and contains the static app assets.

- [ ] **Step 3: Run local preview**

Run:

```bash
npm run preview -- --port 4173
```

Expected: app loads from `http://127.0.0.1:4173`.

## Task 8: Browser QA And Visual Fidelity

- [ ] **Step 1: Open app in browser**

Use the in-app/browser tooling to inspect desktop and mobile viewports.

- [ ] **Step 2: Exercise core workflow**

Add entries for mood, health, gym, food, finance, goal, and bucket list. Verify entries appear in Home timeline and area tabs.

- [ ] **Step 3: Exercise settings workflow**

Edit profile, calculate targets, edit workout split, export data, and test import path with exported JSON.

- [ ] **Step 4: Compare visual concept**

Open `docs/superpowers/assets/life-dashboard-accepted-concept.png` and the latest app screenshot with `view_image`. Compare palette, typography, spacing, container model, cat motif, navigation, and mobile fit.

- [ ] **Step 5: Final verification**

Run:

```bash
npm run build
```

Expected: exit code 0. Report any remaining browser, camera, or external API limitations.

