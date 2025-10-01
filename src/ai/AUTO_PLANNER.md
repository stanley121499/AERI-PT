# 🤖 Auto Planner - Automatic Workout Scheduling

The Auto Planner is a background service that automatically generates and saves workout plans when gaps are detected in your schedule.

## How It Works

### 1. Automatic Detection
When you log in, the system:
- ✅ Checks your schedule for the next 7 days
- ✅ Detects gaps (missing workouts)
- ✅ Counts existing vs. missing days

### 2. Smart Triggering
Auto-planning triggers when:
- **3+ days are missing** workouts in the next 7 days
- OR when you first log in with an empty schedule
- OR periodically (every hour) if gaps appear

### 3. Intelligent Planning
The system:
- 🧠 Uses the same AI planner as the manual tool
- 📅 Considers your events (runs, games, etc.)
- 📊 Analyzes recent workout history
- 🎯 Respects your profile (equipment, frequency, goals)
- 🚫 Skips seasoning for faster generation

### 4. Database Insertion
Automatically:
- 💾 Creates workout records
- 📝 Inserts all exercises with sets/reps
- ⚠️ Skips duplicates (won't overwrite existing workouts)
- 📌 Marks workouts as "planned" and "auto_generated"

### 5. User Notification
Shows a friendly notification when workouts are generated:
```
🤖 AI Planner Active
Auto-generated 4 workouts for your upcoming week!
```

## Configuration

Located in `src/components/AutoPlannerService.tsx`:

```typescript
useAutoPlanner({
  enabled: true,              // Enable/disable auto-planning
  horizonDays: 7,            // How many days ahead to plan
  minGapDays: 3,             // Minimum gap to trigger planning
  checkIntervalMs: 3600000,  // Check every hour (in ms)
});
```

### Adjusting Settings

**More aggressive planning:**
```typescript
horizonDays: 14,    // Plan 2 weeks ahead
minGapDays: 2,      // Trigger with only 2 missing days
```

**Less aggressive planning:**
```typescript
horizonDays: 5,     // Only plan 5 days ahead
minGapDays: 5,      // Only trigger with 5+ missing days
```

**Different check frequency:**
```typescript
checkIntervalMs: 24 * 60 * 60 * 1000,  // Check once per day
checkIntervalMs: 30 * 60 * 1000,        // Check every 30 minutes
```

## Features

### ✅ Smart Gap Detection
- Counts only training/recovery days
- Ignores rest days
- Considers user's target frequency

### ✅ Duplicate Prevention
- Always checks if workout exists before creating
- Won't overwrite manually created workouts
- Safe to run multiple times

### ✅ Event Awareness
- Fetches upcoming user events
- Tapers training around high-intensity events
- Respects event days in the schedule

### ✅ History Consideration
- Fetches last 7 days of workouts
- Uses history to inform planning decisions
- Considers recent soreness/fatigue (when available)

### ✅ Silent Operation
- Runs in the background
- No UI blocking
- Only shows notification on success

### ✅ Error Handling
- Graceful failure (continues on errors)
- Logs errors to console
- Doesn't crash the app

## Workflow

```
User Logs In
     ↓
Auto Planner Checks Schedule
     ↓
Gaps Detected? → NO → Wait 1 hour → Repeat
     ↓ YES
Generate AI Plan
     ↓
Save to Database
     ↓
Show Notification
     ↓
Wait 1 hour → Repeat
```

## Console Logs

The auto-planner logs everything to the browser console:

```javascript
[Auto Planner] Running initial check...
[Auto Planner] Checking for gaps from 2025-10-01 to 2025-10-08
[Auto Planner] Found 2 existing workouts, 5 gaps
[Auto Planner] Detected 5 gap days - triggering auto-planning
[Auto Planner] Starting automatic plan generation...
[Auto Planner] Generating plan with AI...
[Auto Planner] Generated 7 days
[Auto Planner] Skipping 2025-10-01 - already exists
[Auto Planner] Saved workout for 2025-10-02
[Auto Planner] Saved workout for 2025-10-03
[Auto Planner] Skipping 2025-10-04 - already exists
[Auto Planner] Saved workout for 2025-10-05
[Auto Planner] ✅ Auto-generated and saved 3 workouts
[Auto Planner] Running periodic check...
[Auto Planner] No gaps detected - schedule looks good!
```

## Disabling Auto-Planner

### Temporarily (for testing)
In `src/components/AutoPlannerService.tsx`:
```typescript
useAutoPlanner({
  enabled: false,  // Disable
});
```

### Permanently
Remove from `src/App.tsx`:
```typescript
// Comment out or remove this line:
<AutoPlannerService />
```

## Integration Points

### 1. Hook: `useAutoPlanner`
Location: `src/hooks/useAutoPlanner.ts`
- Core logic
- Gap detection
- Plan generation
- Database insertion

### 2. Service Component: `AutoPlannerService`
Location: `src/components/AutoPlannerService.tsx`
- UI integration
- Notification display
- Configuration

### 3. Main App
Location: `src/App.tsx`
- Service activation
- Runs within auth context

## Manual Testing

### Test 1: Empty Schedule
1. Clear all workouts from database
2. Refresh the app
3. Should auto-generate 4-7 workouts
4. Should show notification

### Test 2: Partial Schedule
1. Create 2 workouts manually
2. Refresh the app
3. Should fill remaining gaps
4. Should skip existing workouts

### Test 3: Full Schedule
1. Create workouts for next 7 days
2. Refresh the app
3. Should NOT generate new workouts
4. Console should show "No gaps detected"

### Test 4: With Events
1. Add a "Park Run" event in 3 days
2. Clear workouts
3. Refresh the app
4. Generated plan should taper around the event

## Troubleshooting

### Auto-planner not running
- Check browser console for errors
- Verify user is logged in
- Verify user info is loaded
- Check `enabled: true` in config

### Workouts not appearing
- Check Supabase `workouts` table
- Look for `plan_meta: { auto_generated: true }`
- Check console for errors

### Too many/few workouts generated
- Adjust `minGapDays` setting
- Adjust `horizonDays` setting
- Check user's `expected_frequency_per_week`

### Notification not showing
- Check browser console for React errors
- Verify `status.gapsFilled > 0`
- Check z-index conflicts

## Performance

- **First check**: Runs immediately on login (~2-5 seconds)
- **Subsequent checks**: Every hour (configurable)
- **API calls**: 0-2 OpenAI calls per generation (if using AI)
- **Database queries**: 3-5 per check, more during generation
- **Memory**: Minimal (single hook with small state)

## Future Enhancements

Possible improvements:
- [ ] Smart scheduling based on time of day preferences
- [ ] Progressive overload tracking
- [ ] Injury/limitation handling
- [ ] A/B testing different planning strategies
- [ ] User preferences for auto-planning frequency
- [ ] Push notifications (when implemented)
- [ ] Email summaries of auto-generated plans

## Security

- ✅ Only generates for logged-in users
- ✅ Only accesses user's own data (filtered by user_id)
- ✅ No external API calls except OpenAI (optional)
- ✅ No sensitive data in logs

## Summary

The Auto Planner ensures users **always have a plan** without manual intervention. It:
- Runs automatically in the background
- Fills gaps intelligently
- Respects user preferences
- Shows friendly notifications
- Requires zero user interaction

**Result**: Users wake up to a full week of workouts, perfectly tailored to their goals! 🎉

