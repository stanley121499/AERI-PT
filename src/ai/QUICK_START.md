# 🚀 Quick Start - AI Planner in Your App

The AI Planning Layer is now integrated into your app! Here's how to use it.

## 🎯 Access the Demo Page

1. **Log in to your app** at http://localhost:3000
2. **Navigate to AI Planner** - Click "🤖 AI Planner" in the sidebar
3. **Click "Generate 7-Day Plan"** - Watch the logs in real-time!

## 📊 What You'll See

### Console Logs Panel (Black Terminal)
Real-time logging showing:
- ✅ OpenAI connection status
- 📋 Planning context details (goal, frequency, equipment)
- 🧠 Plan generation progress
- 📊 Summary statistics
- ⏱️ Performance metrics (time taken)

### Generated Plan Cards
Each day shows:
- **Date** and **Day number**
- **Action type** (train/recovery/rest/event)
- **Focus** (upper/lower/conditioning/mobility)
- **Tags** from the planner
- **Exercise list** with sets, reps, rest, RIR
- **Estimated duration** per exercise and total

## 🔑 Enable AI Features (Optional)

The planner works out of the box with a deterministic fallback. To enable AI-powered planning:

### 1. Get an OpenAI API Key
- Go to https://platform.openai.com/api-keys
- Create a new API key
- Copy it

### 2. Add to .env
```env
REACT_APP_OPENAI_API_KEY=sk-your-key-here
```

### 3. Restart Your Dev Server
```bash
# Stop current server (Ctrl+C)
npm start
```

### 4. Refresh the App
You should now see: "✅ Connected (AI-powered planning)"

## 🧪 Test Different Scenarios

### Scenario 1: Basic Planning
- Default settings
- No events
- 7 days
- Result: Balanced training schedule

### Scenario 2: Update Your Profile
1. Go to **Profile** page
2. Update your:
   - **Goal** (e.g., "strength and hypertrophy")
   - **Frequency** (e.g., 4 days/week)
   - **Equipment** (e.g., "bodyweight" to see equipment filtering)
   - **Session Length** (e.g., 30 min for shorter workouts)
3. Go back to **AI Planner**
4. Generate a new plan
5. Notice how exercises adapt to your settings!

### Scenario 3: Equipment Filtering
Set **accessible_equipment** to:
- `"bodyweight"` → Only push-ups, squats, planks, etc.
- `"minimal"` → Bodyweight + pull-up bar
- `"full gym"` → All exercises

### Scenario 4: Test Stub Planner
1. Remove or comment out `REACT_APP_OPENAI_API_KEY` from `.env`
2. Restart dev server
3. Generate plan
4. You'll see deterministic Mon/Wed/Fri pattern

## 📝 Understanding the Logs

### Startup Logs
```
🚀 Starting AI planning process...
OpenAI Available: ✅ Yes / ❌ No (using stub planner)
📋 Building planning context...
  - Today: 2025-10-01
  - Goal: strength and hypertrophy
  - Frequency: 4 days/week
  - Equipment: full gym
  - Session length: 60 minutes
```

### Planning Logs
```
🧠 Generating plan with AI planner brain...
✅ Plan generated in 2.34s
📊 Generated 7 days
  Day 1 (2025-10-01): train - upper (4 exercises, ~45min)
  Day 2 (2025-10-02): train - lower (4 exercises, ~48min)
  Day 3 (2025-10-03): recovery - mobility (4 exercises, ~20min)
  Day 4 (2025-10-04): rest - rest (0 exercises, ~0min)
  Day 5 (2025-10-05): train - upper (4 exercises, ~45min)
  Day 6 (2025-10-06): train - conditioning (3 exercises, ~30min)
  Day 7 (2025-10-07): recovery - yoga (3 exercises, ~25min)
```

### Summary Logs
```
📈 Plan Summary:
  - Training days: 4
  - Recovery days: 2
  - Rest days: 1
  - Total exercises: 22
  - Estimated weekly hours: 3.5
🎉 AI planning complete!
```

## 🔍 Verify Everything Works

### Check #1: OpenAI Status
- Look for "OpenAI Status" in the demo page
- ✅ Green = AI-powered
- ⚠️ Yellow = Fallback (still works!)

### Check #2: Logs Show Progress
- Black console should fill with green text
- Watch for errors (red ❌ symbols)

### Check #3: Plan is Generated
- 7 cards appear below
- Training days have exercises
- Rest days are empty (expected)

### Check #4: Exercises Make Sense
- Upper days: Bench, Rows, Overhead Press, Pull-ups
- Lower days: Squats, RDLs, Split Squats, Leg Curls
- Recovery: Stretches, Mobility, Yoga poses
- Equipment respects your profile settings

## 🐛 Troubleshooting

### No plan appears
- Check console for red error messages
- Verify user is logged in
- Verify user profile exists

### "OpenAI not available" but I added the key
- Did you restart the dev server?
- Check `.env` file has `REACT_APP_OPENAI_API_KEY=sk-...`
- No quotes needed around the key
- File must be named `.env` (not `.env.sample`)

### Plan is always Mon/Wed/Fri pattern
- This means stub planner is active (no AI key)
- This is normal and expected without API key
- Add API key to enable intelligent planning

### Exercises don't respect equipment
- Clear browser cache
- Restart dev server
- Check profile page has correct equipment value

## 🎓 Next Steps

### 1. Test the Full Pipeline
- Generate a plan
- Verify it looks good
- Check logs for any warnings

### 2. Integrate with Database
- See `src/ai/example-usage.ts` → `example4_fullIntegration()`
- This shows how to insert generated plans into Supabase

### 3. Add Events
Currently, the demo doesn't fetch events from the database. To add this:

```typescript
// In AIPlannerDemo.tsx, replace:
events: [], // For now, no events

// With:
const { data: events } = await supabase
  .from('user_events')
  .select('*')
  .eq('user_id', user.id)
  .gte('date', today)
  .order('date', { ascending: true });

events: (events || []).map(dbEventToUserEvent),
```

### 4. Add Workout History
Similarly, add recent workout history:

```typescript
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 7);
const pastDateStr = pastDate.toISOString().split('T')[0];

const { data: workouts } = await supabase
  .from('workouts')
  .select('*')
  .eq('user_id', user.id)
  .gte('date', pastDateStr)
  .order('date', { ascending: false });

recent_history: (workouts || []).map(dbWorkoutToHistoryDay),
```

### 5. Save Plans to Database
Use `exercisePlanToDbInsert()` to save generated plans:
- See `src/ai/example-usage.ts` → `insertCompiledDay()`
- This inserts workouts + exercises into your Supabase database

## 📞 Need Help?

- **Architecture details**: See `src/ai/ARCHITECTURE.md`
- **Full documentation**: See `src/ai/README_AI.md`
- **Code examples**: See `src/ai/example-usage.ts`
- **This guide**: `src/ai/QUICK_START.md` (you are here!)

## 🎉 Success!

If you see:
- ✅ Logs filling the console
- ✅ 7 day cards appearing
- ✅ Exercises matching your profile
- ✅ No red errors

**Congratulations! The AI Planning Layer is working perfectly! 🎊**

