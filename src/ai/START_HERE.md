# 🚀 AI Planning Layer - Start Here

Welcome to the AI Planning Layer! This guide will help you get started quickly.

## 📖 Documentation Map

### 🎯 **I want to use the AI planner**
→ Read **[README_AI.md](README_AI.md)**
- Quick start guide
- Usage examples
- Configuration
- Troubleshooting

### 💻 **I want to integrate with my app**
→ See **[example-usage.ts](example-usage.ts)**
- 5 complete examples
- Database integration
- Real-world scenarios

### 🏗️ **I want to understand the architecture**
→ Read **[ARCHITECTURE.md](ARCHITECTURE.md)**
- System design
- Module responsibilities
- Data flow
- Extension points

### 📊 **I want to know what was built**
→ Read **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)**
- Complete feature list
- Statistics
- Success criteria

## ⚡ Quick Start (30 seconds)

### 1. Set up your API key

```bash
# Add to .env
REACT_APP_OPENAI_API_KEY=sk-your-key-here
```

### 2. Use in your code

```typescript
import { planAndCompile, userInfoToProfile } from './ai';

// Generate a 14-day training plan
const compiledDays = await planAndCompile({
  today: '2025-10-01',
  horizon_days: 14,
  profile: userInfoToProfile(userInfo),
  events: userEvents.map(dbEventToUserEvent),
  recent_history: [],
});

// Use the compiled days
for (const day of compiledDays) {
  console.log(`${day.date}: ${day.action} - ${day.focus}`);
  console.log(`Exercises: ${day.exercises.length}`);
}
```

### 3. Done! 🎉

The system will:
- ✅ Generate intelligent daily actions for 14 days
- ✅ Respect events (e.g., "Park Run")
- ✅ Avoid hard legs before/after runs
- ✅ Include recovery days
- ✅ Compile concrete exercises with sets/reps
- ✅ Add coaching cues (optional)

## 📁 File Guide

| File | When to Read |
|------|--------------|
| **README_AI.md** | First time using the system |
| **example-usage.ts** | Need working code examples |
| **ARCHITECTURE.md** | Want to understand design |
| **IMPLEMENTATION_SUMMARY.md** | Want complete feature list |
| **START_HERE.md** | You are here! 👋 |

## 🎓 Learning Path

### Beginner
1. Read Quick Start (above)
2. Copy Example 1 from `example-usage.ts`
3. Run it with your data
4. Check `README_AI.md` if stuck

### Intermediate
1. Read full `README_AI.md`
2. Try all 5 examples
3. Integrate with your database
4. Customize exercise templates

### Advanced
1. Read `ARCHITECTURE.md`
2. Understand each module
3. Create custom planner brain
4. Add your own templates
5. Extend policy rules

## 🔑 Key Concepts

### PlanningContext (Input)
```typescript
{
  today: "2025-10-01",
  horizon_days: 14,
  profile: { goal, frequency, equipment, dislikes, session_length },
  events: [{ date, label, intensity, tags }],
  recent_history: [{ date, focus, completed, soreness, rpe }]
}
```

### CompiledDay (Output)
```typescript
{
  date: "2025-10-01",
  action: "train" | "recovery" | "rest" | "event",
  focus: "upper" | "lower" | "full" | "conditioning" | "mobility" | ...,
  tags: ["upper", "push"],
  exercises: [
    { name, sets, reps, rest_sec, rir, load_kg, estimated_duration, order_index }
  ],
  meta: { seasoning_notes }
}
```

## 🎯 Common Tasks

### Generate a 7-day plan
```typescript
const days = await planAndCompile(context, { horizonDays: 7 });
```

### Disable AI seasoning (faster)
```typescript
const days = await planAndCompile(context, { aiSeasoning: false });
```

### Use without OpenAI (stub planner)
```typescript
// Just unset the API key - system auto-falls back
process.env.REACT_APP_OPENAI_API_KEY = '';
const days = await planAndCompile(context);
```

### Get plan statistics
```typescript
import { getPlanSummary } from './ai';
const summary = getPlanSummary(compiledDays);
console.log(summary);
// { totalDays, trainingDays, recoveryDays, restDays, eventDays, totalExercises, estimatedWeeklyHours }
```

### Insert into database
```typescript
// See example-usage.ts, example4_fullIntegration()
for (const day of compiledDays) {
  // Create workout
  const workout = await supabase.from('workouts').insert({...}).single();
  
  // Insert exercises
  const exercises = day.exercises.map(ex => 
    exercisePlanToDbInsert(ex, workout.id)
  );
  await supabase.from('exercise').insert(exercises);
}
```

## ❓ FAQ

### Q: Do I need an OpenAI API key?
**A:** No! The system falls back to a deterministic planner. But with an API key, you get much smarter plans.

### Q: How much does it cost?
**A:** ~$0.01-0.05 per 14-day plan with `gpt-4o-mini`. Very cheap!

### Q: Can I customize the exercises?
**A:** Yes! Edit templates in `compiler.ts` or create your own compiler function.

### Q: What if I have unique equipment?
**A:** Set `accessible_equipment` in the profile. The compiler will filter exercises accordingly.

### Q: How do I handle injuries?
**A:** Add the exercise/movement to `dislikes` in the profile. It will be filtered out.

### Q: Can I preview before inserting into DB?
**A:** Yes! `planAndCompile()` returns data with no side effects. Preview first, then insert.

## 🛟 Troubleshooting

### "OpenAI not available"
- Check `.env` has `REACT_APP_OPENAI_API_KEY=sk-...`
- Restart your dev server after changing `.env`

### "Failed to get valid JSON response"
- Try a more capable model: `{ aiPlannerModel: 'gpt-4o' }`
- Or reduce horizon: `{ horizonDays: 7 }`

### "No exercises available after filtering"
- Your equipment/dislikes are too restrictive
- The system uses alternatives automatically
- Check compiler.ts for available templates

### Rate limit errors
- OpenAI has rate limits based on your tier
- Generate plans less frequently (e.g., weekly not daily)
- Consider caching in `planner_runs` table

## 🚢 Ready for Production?

Before deploying:
1. ✅ Move OpenAI calls to backend (see README security section)
2. ✅ Add authentication/authorization
3. ✅ Implement rate limiting
4. ✅ Set up monitoring & alerts
5. ✅ Cache plans to reduce API calls

See `README_AI.md` → "Production Recommendations" for details.

## 📞 Need Help?

1. **Check README_AI.md** - Most questions answered there
2. **See example-usage.ts** - Working code for common scenarios
3. **Read inline comments** - All modules are well-documented
4. **Check ARCHITECTURE.md** - Deep technical details

## 🎉 You're Ready!

Pick your next step:
- 👉 Want to get started? → **README_AI.md**
- 👉 Want working examples? → **example-usage.ts**
- 👉 Want technical details? → **ARCHITECTURE.md**

Happy planning! 🏋️‍♂️

