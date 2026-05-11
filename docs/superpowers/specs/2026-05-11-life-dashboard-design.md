# Life Dashboard Design

## Goal

Build a private, local-only, mobile-ready life dashboard PWA that can be deployed to Netlify and added to a phone home screen. The app tracks long-term patterns across mood, health, gym, food/calories/macros, finances, goals, and bucket list items.

## Approved Direction

The approved product direction is a hybrid timeline with dedicated area tabs.

Primary navigation:
- `Home`: long-term timeline, today's summary, and pattern cards.
- `Add`: fast entry point for any log type.
- `Insights`: rule-based observations and recommendations computed from local data.
- `Areas`: dedicated tabs for `Mood`, `Health`, `Gym`, `Food`, `Finances`, `Goals`, and `Bucket List`.
- `Settings`: profile, app preferences, local data export/import, reset, and PWA/deployment information.

The app uses a bottom navigation shell on mobile. `Areas` contains the dedicated tracker tabs so the bottom navigation remains usable on small screens.

## Visual Direction

Use the approved concept image at `docs/superpowers/assets/life-dashboard-accepted-concept.png` as the visual target.

The visual style is adapted from the user's reference screenshot:
- Warm cream/oat app background.
- Warm beige panels.
- Muted olive green headings, primary controls, selected states, and accents.
- Dark charcoal text.
- Sparse coral/orange accents for warning, food, or finance highlights.
- Rounded soft UI panels with a friendly but practical mobile app feel.
- Small cat silhouettes and paw-print motifs used sparingly as decorative personality.
- Friendly rounded display headings paired with readable UI text.
- No purple or blue gradients.
- No marketing hero page.
- No nested cards inside cards.
- Mobile-first layout with stable dimensions, readable text, and no cramped bottom navigation.

## Data And Privacy

The first version is private and local-only for personal data.

Storage:
- Use IndexedDB for app data.
- Store profile settings, logs, workout split, goals, bucket list items, saved local foods, and preferences on the user's device.
- Provide JSON export and import in `Settings` so data can be backed up or moved manually.

External calls:
- Barcode lookup may call an external public nutrition database.
- The default public database should be Open Food Facts unless implementation research finds a clearly better no-key option.
- Personal logs remain local. Only the scanned barcode/product lookup request goes to the public database.

No login, backend, or account sync is part of the first version.

## Entry Types

All entries are dated and can appear in the timeline. Each entry also belongs to its dedicated area tab.

`Mood` entries:
- Mood score.
- Tags.
- Notes.

`Health` entries:
- Symptom or problem title.
- Severity.
- Notes.
- Meds, treatments, or actions.
- Possible triggers.
- Questions for doctor.

`Gym` entries:
- Split day label.
- Workout category.
- Exercises.
- Sets.
- Reps.
- Weight in kg.
- Duration.
- Effort.
- Notes.

`Food` entries:
- Meal name or product.
- Calories.
- Protein.
- Carbs.
- Fat.
- Water where useful.
- Barcode source when scanned.

`Finance` entries:
- Income or expense.
- Amount.
- Category.
- Notes.
- Date.

`Goal` entries:
- Goal title.
- Area.
- Milestone.
- Progress percentage.
- Deadline.
- Notes.

`Bucket List` entries:
- Item title.
- Status.
- Priority.
- Notes.

## Gym Split

The app supports a saved workout split.

The user can define `Day 1` through `Day 7`, including rest days. Each split day can include:
- Workout category.
- Exercise list.
- Target sets.
- Target reps.
- Target weight in kg.
- Notes.

When logging a workout, the app should:
- Determine the active split day from a configured split start date and 7-day cycle.
- Label the workout automatically.
- Show the planned exercises for that split day.
- Allow actual sets, reps, and kg weight to be logged.
- Allow edits when the user does a different workout than planned.

Rest days are represented as split days and should appear as rest days rather than missing data.

## Food, Calories, And Macros

The food area includes profile-based target estimation.

The app asks for:
- Weight in kg.
- Height in cm.
- Activity level.
- Goal: lose weight, maintain weight, or gain weight.

The app estimates:
- Daily calorie target.
- Macro target ranges for protein, carbs, and fat.

Food logging supports:
- Manual food entry.
- Barcode scanning through the device camera where browser support allows it. On deployed Netlify builds this requires HTTPS and camera permission.
- Product lookup from a public nutrition database.
- Saving scanned or manually entered foods to a local foods list.
- Daily totals for calories, protein, carbs, and fat.
- Manual entry fallback when camera scanning or product lookup fails.

Recommendations must be phrased as general pattern prompts, not medical or nutrition advice.

## Insights And Recommendations

Insights are computed locally from stored entries using deterministic rules and trend checks. The first version does not require AI or an API key.

Examples:
- Mood trend over the last 7 or 30 days.
- Mood comparison on gym days versus non-gym days.
- Gym consistency and split completion.
- Calories/macros compared with the current target.
- Finance spend compared with recent average or budget.
- Health severity changes over time.
- Goals with recent progress or long inactivity.

The app should avoid diagnosis, treatment advice, investment advice, or prescriptive financial guidance. Copy should use language like "pattern noticed", "you logged", "consider reviewing", and "this may be worth tracking".

## Screens

`Home`:
- App header with small cat visual.
- Today's summary.
- Timeline of recent dated entries.
- Pattern cards.
- Quick add action.

`Add`:
- Entry type selector for Mood, Health, Gym, Food, Finance, Goal, and Bucket List.
- Dynamic form fields based on entry type.
- Save action that writes to IndexedDB.

`Insights`:
- Trend cards.
- Recommendation cards.
- Empty states explaining that more logged data is needed for some insights.

`Areas`:
- Dedicated tabs for Mood, Health, Gym, Food, Finances, Goals, and Bucket List.
- Each tab shows focused summaries, recent entries, and relevant setup controls.

`Settings`:
- Profile settings.
- Food target settings.
- Workout split setup.
- Export data.
- Import data.
- Reset local data.
- PWA install guidance.

## PWA And Deployment

The app must be deployable as a static Netlify site.

PWA requirements:
- Web app manifest.
- App icons.
- Mobile viewport support.
- Install-to-home-screen metadata.
- Service worker for app shell caching.
- Responsive layout for phone and desktop.

The first version should be usable after deployment without a backend service.

## Technical Approach

Use React + Vite + TypeScript for the app.

Recommended libraries:
- IndexedDB wrapper such as Dexie for local storage.
- Browser barcode scanning library compatible with camera-based scanning.
- Lightweight icon library such as Lucide React if it matches the visual style.

The code should separate:
- UI shell and navigation.
- Data models and persistence.
- Entry form logic.
- Insight calculation rules.
- Area-specific views.
- PWA/service worker setup.

## Safety And Scope Boundaries

The app is a personal tracking dashboard, not a medical, nutrition, or financial professional.

Out of scope for first version:
- Account login.
- Cloud sync.
- Backend database.
- AI-powered recommendations.
- Push notifications.
- Doctor, trainer, dietitian, or financial-advisor style guidance.
- Bank account integration.
- Payment integration.

The app can still provide useful local observations and prompts from the user's own logs.

## Acceptance Criteria

- The app can be built and deployed as a static Netlify app.
- It works on mobile and desktop.
- It can be added to a phone home screen.
- Personal logs remain on-device.
- Users can add, view, edit, and delete entries.
- Users can configure a 7-day workout split and log sets, reps, and kg weights against it.
- Users can set food targets from profile inputs and goal type.
- Users can manually add food and scan barcodes where supported.
- Users can view dedicated area tabs.
- Users can see a unified timeline and local insight cards.
- Users can export and import local data.
- The implemented UI follows the approved cream/olive/cat-themed visual concept.
