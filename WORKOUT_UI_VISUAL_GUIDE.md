# Interactive Workout UI - Visual Guide

## Screen States

### 1. Loading State
```
┌─────────────────────────────────────┐
│  ← | Workout Session               │
│      0% complete                    │
├─────────────────────────────────────┤
│                                     │
│         [Loading Spinner]           │
│      Loading workout...             │
│                                     │
└─────────────────────────────────────┘
```

### 2. Empty State (No Workouts)
```
┌─────────────────────────────────────┐
│  ← | Workout Session               │
│      0% complete                    │
├─────────────────────────────────────┤
│                                     │
│           [+ Icon]                  │
│      No Active Workout              │
│                                     │
│  You don't have any workouts        │
│  scheduled. Create a workout plan   │
│  to get started.                    │
│                                     │
│     [Go to Calendar]                │
│                                     │
└─────────────────────────────────────┘
```

### 3. Pre-Workout Overview
```
┌─────────────────────────────────────┐
│  ← | Push Day                       │
│      0% complete                    │
├─────────────────────────────────────┤
│                                     │
│   Ready to start your workout?      │
│                                     │
│   6 exercises • Estimated 45 min    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │    Today's Exercises            │ │
│ │                                 │ │
│ │  1. Push-ups           3×8-12   │ │
│ │  2. Bench Press        3×6-8    │ │
│ │  3. Overhead Press     3×8-10   │ │
│ │  4. Tricep Dips        3×10-12  │ │
│ │  5. Lateral Raises     3×12-15  │ │
│ │  6. Cable Flyes        3×10-12  │ │
│ └─────────────────────────────────┘ │
│                                     │
│       [Start Workout]               │
│                                     │
└─────────────────────────────────────┘
```

### 4. Active Workout - Exercise in Progress
```
┌─────────────────────────────────────┐
│  ← | Push Day           End Workout │
│      12 min • 33% complete          │
├─────────────────────────────────────┤
│  ████████░░░░░░░░░░░░░ 33%          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [✓] 1  Push-ups                 │ │ ← Completed
│ │      3×10 reps • 60s rest       │ │
│ │      ✓ Complete                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [•] 2  Bench Press  ← CURRENT   │ │ ← Current
│ │      🔄 3×6-8 reps • 90s rest   │ │
│ │      ⚖️ 70 kg • RIR 2           │ │
│ │      💡 Control the weight      │ │
│ │      [Show details ▼]           │ │
│ │                                 │ │
│ │                           [○]   │ │ ← Tap to complete
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [ ] 3  Overhead Press           │ │ ← Pending
│ │      3×8-10 reps • 90s rest     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [ ] 4  Tricep Dips              │ │
│ │      3×10-12 reps • 60s rest    │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

### 5. Rest Timer Overlay
```
┌─────────────────────────────────────┐
│ [Background dimmed with overlay]    │
│                                     │
│     ┌─────────────────────────┐     │
│     │                         │     │
│     │      Rest Time          │     │
│     │                         │     │
│     │        1:30             │     │ ← Countdown
│     │                         │     │
│     │  Take a break before    │     │
│     │  your next exercise     │     │
│     │                         │     │
│     │  [Skip Rest]  [+30s]    │     │
│     │                         │     │
│     └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### 6. All Exercises Completed
```
┌─────────────────────────────────────┐
│  ← | Push Day           End Workout │
│      45 min • 100% complete         │
├─────────────────────────────────────┤
│  ██████████████████████ 100%        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [✓] 1  Push-ups                 │ │
│ │      ✓ Complete                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ [✓] 2  Bench Press              │ │
│ │      ✓ Complete                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ... (all other exercises)           │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  [Complete Workout]           │  │ ← Green button
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### 7. Completion Modal
```
┌─────────────────────────────────────┐
│ [Background dimmed with overlay]    │
│                                     │
│     ┌─────────────────────────┐     │
│     │                         │     │
│     │       [✓ Icon]          │     │
│     │                         │     │
│     │  Workout Complete!      │     │
│     │                         │     │
│     │  Great job! You         │     │
│     │  completed all 6        │     │
│     │  exercises.             │     │
│     │                         │     │
│     │  [View Progress]        │     │ ← Dark button
│     │  [Back to Dashboard]    │     │ ← Light button
│     │                         │     │
│     └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

## Exercise Card States

### Completed Exercise
```
┌─────────────────────────────────────┐
│ [✓] 1  Push-ups               [✓]   │ ← Green border & bg
│      3×10 reps • 60s rest           │
│      ✓ Complete                     │
└─────────────────────────────────────┘
```

### Current Exercise (In Progress)
```
┌═════════════════════════════════════┐ ← Dark border & shadow
│ [•] 2  Bench Press    Current  [○]  │
│      🔄 3×6-8 reps • 90s rest       │
│      ⚖️ 70 kg • ⚡ RIR 2            │
│      💡 Note: Control the weight    │
│      [Show details ▼]               │
└═════════════════════════════════════┘
```

### Pending Exercise
```
┌─────────────────────────────────────┐ ← Light border
│ [ ] 3  Overhead Press          [○]  │
│      3×8-10 reps • 90s rest         │
│      [Show details ▼]               │
└─────────────────────────────────────┘
```

### Expanded Exercise (with details)
```
┌─────────────────────────────────────┐
│ [ ] 3  Overhead Press          [○]  │
│      3×8-10 reps • 90s rest         │
│      ⚖️ 50 kg • ⚡ RIR 3            │
│      [Hide details ▲]               │
│      ─────────────────────────────  │
│      Estimated Duration: 8 min      │
│      Added: Oct 1, 2025             │
└─────────────────────────────────────┘
```

## Color Scheme

### States
- **Completed**: `border-green-500 bg-green-50`
- **Current**: `border-gray-900 bg-gray-50 shadow-lg`
- **Pending**: `border-gray-200 bg-white`
- **Progress Bar**: `bg-gray-900` (filled), `bg-gray-100` (unfilled)

### Buttons
- **Primary Action**: `bg-gray-900 text-white` (Start, Complete)
- **Secondary Action**: `bg-gray-100 text-gray-700` (Skip, Back)
- **Success Action**: `bg-green-600 text-white` (Complete Workout)

### Icons
- ✓ Checkmark (completed)
- ○ Circle (incomplete)
- 🔄 Sets indicator
- ⚖️ Weight indicator
- ⏱️ Time indicator
- ⚡ RIR indicator
- 💡 Note indicator

## Interaction Flow Diagram

```
Start
  │
  ├─ No workouts? → Empty State → [Go to Calendar]
  │
  ├─ Has workout? → Pre-Workout Overview
  │                      │
  │                      ├─ [Start Workout]
  │                      │
  │                      ↓
  │                 Active Workout
  │                      │
  │                      ├─ Tap exercise checkbox
  │                      │        ↓
  │                      │   Mark as complete
  │                      │        ↓
  │                      │   Rest Timer starts
  │                      │        ↓
  │                      │   Auto-focus next exercise
  │                      │        ↓
  │                      │   Repeat for all exercises
  │                      │
  │                      ├─ All done? → [Complete Workout]
  │                      │                     ↓
  │                      │              Completion Modal
  │                      │                     ↓
  │                      │              [View Progress] or [Dashboard]
  │                      │
  │                      └─ [End Workout] → Confirm → Dashboard
  │
  └─ [Back button] → Confirm → Dashboard
```

## Responsive Behavior

### Mobile (< 1024px)
- Full width layout
- Sidebar hidden (hamburger menu)
- Touch-optimized buttons
- Single column cards

### Desktop (≥ 1024px)
- Fixed sidebar (ml-64)
- More spacious layout
- Hover states active
- Max-width content container

## Accessibility Features

- ✅ Keyboard navigable
- ✅ Proper ARIA labels
- ✅ High contrast text
- ✅ Large touch targets (48px minimum)
- ✅ Clear focus indicators
- ✅ Semantic HTML

---

This visual guide shows all possible states and screens in the new interactive workout UI.

