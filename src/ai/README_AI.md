# AI Planning Layer

A modular, type-safe AI planning system for generating intelligent training microcycles.

## Architecture

This system uses a **hybrid approach**:

1. **AI Planner Brain** (OpenAI-backed): Decides each day's action and free-form tags over a 7–14 day horizon, considering user profile, events, history, and constraints.

2. **Deterministic Compiler**: Converts planner decisions into concrete exercises (sets/reps/rest/RIR/duration) using safe templates and fallbacks.

3. **Optional AI Seasoning**: Small pass that may swap exercise names (respecting equipment/dislikes) and add coaching cues. Never changes numeric programming.

## Quick Start

### Setup

1. Add your OpenAI API key to `.env`:
```env
REACT_APP_OPENAI_API_KEY=sk-...
```

2. Import and use:
```typescript
import { planAndCompile, userInfoToProfile, dbEventToUserEvent } from './ai';

// Build planning context
const context = {
  today: '2025-10-01',
  horizon_days: 14,
  profile: userInfoToProfile(userInfo),
  events: userEvents.map(dbEventToUserEvent),
  recent_history: recentWorkouts.map(dbWorkoutToHistoryDay),
  existing_plan: null,
};

// Generate plan
const compiledDays = await planAndCompile(context, {
  horizonDays: 14,
  aiSeasoning: true,
});

// Use compiled days
for (const day of compiledDays) {
  console.log(`${day.date}: ${day.action} - ${day.focus}`);
  console.log(`Exercises: ${day.exercises.length}`);
  
  // Insert into database or display to user
}
```

### Without OpenAI

The system automatically falls back to a deterministic planner when no API key is configured:

```typescript
// No API key needed - uses stub planner
const compiledDays = await planAndCompile(context);
```

## Core Types

### PlanningContext

Input to the planner:

```typescript
interface PlanningContext {
  today: string;              // YYYY-MM-DD
  horizon_days: number;       // typically 7 or 14
  profile: UserProfile;
  events: UserEvent[];
  recent_history: HistoryDay[];
  existing_plan?: ExistingPlan | null;
}
```

### CompiledDay

Output from the planner:

```typescript
interface CompiledDay {
  date: string;               // YYYY-MM-DD
  action: DayAction;          // 'train' | 'recovery' | 'rest' | 'event'
  focus: string;              // e.g., 'upper', 'lower', 'conditioning'
  tags: string[];             // free-form tags
  exercises: ExercisePlan[];  // concrete exercises with sets/reps
  meta?: Record<string, unknown>;
}
```

### ExercisePlan

Single exercise (ready for DB insertion):

```typescript
interface ExercisePlan {
  name: string;               // e.g., "Barbell Back Squat - cue: chest up"
  sets?: number | null;
  reps?: number | null;
  rest_sec?: number | null;
  rir?: number | null;        // reps in reserve
  load_kg?: number | null;
  estimated_duration?: number | null; // seconds
  order_index?: number | null;
}
```

## Hard Rules

The planner enforces these constraints (both in AI prompts and in policy guards):

1. **No hard lower-body strength within 24-48h before/after high-intensity events** (e.g., Park Run, Futsal game)
2. **Recovery days at least every 3-4 days**
3. **No additional conditioning on event days** (mobility/yoga is okay)
4. **Weekly frequency is a target**, allowed to flex ±1 when events or fatigue demand
5. **Max 3 consecutive training days**

## Modules

### 1. `types.ts`

Shared types and adapters between database types and planning types.

Key adapters:
- `userInfoToProfile()` - Convert DB user_info → UserProfile
- `dbEventToUserEvent()` - Convert DB user_events → UserEvent
- `dbWorkoutToHistoryDay()` - Convert DB workouts → HistoryDay
- `exercisePlanToDbInsert()` - Convert ExercisePlan → DB insert format

### 2. `policy.ts`

Pure helper functions for planning rules:

```typescript
import { enforceCadence, taperAroundEvents, isHighIntensityEvent } from './ai';

// Check if event is high-intensity
if (isHighIntensityEvent(event)) {
  // Apply taper logic
}

// Enforce max consecutive training days
const correctedPlan = enforceCadence(days, DEFAULT_CONSTRAINTS);

// Avoid hard legs near high-intensity events
const taperedPlan = taperAroundEvents(days, context, DEFAULT_CONSTRAINTS);
```

### 3. `openaiClient.ts`

Thin wrapper around OpenAI SDK:

```typescript
import { callJSON, isOpenAIAvailable } from './ai';

// Check availability
if (isOpenAIAvailable()) {
  // Make JSON-only call with retry logic
  const result = await callJSON(
    'gpt-4o-mini',
    [
      { role: 'system', content: 'You are a helpful assistant...' },
      { role: 'user', content: 'Generate a plan...' }
    ],
    '{ plan: [...] }', // schema description
    { temperature: 0.7, maxTokens: 2000, retries: 2 }
  );
}
```

### 4. `plannerBrain.ts`

The "brain" that decides daily actions:

- **OpenAIPlannerBrain**: Uses OpenAI to generate intelligent plans
- **StubPlannerBrain**: Deterministic fallback (no API key required)

```typescript
import { createPlannerBrain } from './ai';

// Auto-selects based on API key availability
const planner = createPlannerBrain('gpt-4o-mini');
const plan = await planner.plan(context);
```

### 5. `compiler.ts`

Deterministic exercise generation:

```typescript
import { chooseThemeFromTags, compileExercises } from './ai';

// Choose focus from tags
const focus = chooseThemeFromTags(['upper', 'push']); // → 'upper'

// Generate exercises
const exercises = compileExercises({
  focus: 'upper',
  tags: ['push'],
  profile: userProfile,
});
```

**Templates included:**
- Strength: upper, lower, full, push, pull, legs
- Conditioning: cardio, metcon
- Recovery: mobility, yoga, pilates
- Calisthenics

**Equipment filtering**: Automatically swaps exercises based on `accessible_equipment` (e.g., "bodyweight", "minimal", "full gym")

### 6. `seasoning.ts`

Optional AI refinement:

```typescript
import { seasonExercises } from './ai';

// Add coaching cues and swap names if needed
const { exercises, notes } = await seasonExercises(
  'upper',
  ['push'],
  profile,
  rawExercises,
  { model: 'gpt-4o-mini' }
);

// Example output:
// "Barbell Bench Press - cue: drive through your feet"
```

**What it does:**
- May swap exercise names when equipment/dislikes conflict
- Adds short coaching cues (≤70 chars)
- **Never changes** sets, reps, rest, RIR, load, or order

### 7. `orchestrator.ts`

High-level orchestrator:

```typescript
import { planAndCompile, getPlanSummary } from './ai';

// One-line planning
const compiledDays = await planAndCompile(context, {
  horizonDays: 14,
  aiPlannerModel: 'gpt-4o-mini',
  aiSeasoning: true,
  aiSeasoningModel: 'gpt-4o-mini',
});

// Get summary stats
const summary = getPlanSummary(compiledDays);
console.log(summary);
// {
//   totalDays: 14,
//   trainingDays: 8,
//   recoveryDays: 3,
//   restDays: 2,
//   eventDays: 1,
//   totalExercises: 48,
//   estimatedWeeklyHours: 4.2
// }
```

## Options

### `planAndCompile(context, options)`

```typescript
interface PlanAndCompileOptions {
  horizonDays?: number;        // default 14
  aiPlannerModel?: string;     // e.g., 'gpt-4o-mini', 'gpt-4o'
  aiSeasoning?: boolean;       // default true
  aiSeasoningModel?: string;   // override seasoning model
}
```

## Environment Variables

```env
# Required for AI features
REACT_APP_OPENAI_API_KEY=sk-...

# Optional (defaults shown)
REACT_APP_OPENAI_MODEL=gpt-4o-mini
```

## Examples

### Basic Planning

```typescript
import { planAndCompile } from './ai';

const days = await planAndCompile({
  today: '2025-10-01',
  horizon_days: 7,
  profile: {
    goal: 'strength and hypertrophy',
    frequency_per_week: 4,
    accessible_equipment: 'full gym',
    dislikes: 'burpees',
    session_length_min: 60,
  },
  events: [],
  recent_history: [],
});
```

### With Events (e.g., Park Run)

```typescript
const days = await planAndCompile({
  today: '2025-10-01',
  horizon_days: 14,
  profile: { /* ... */ },
  events: [
    {
      date: '2025-10-05',
      label: 'Park Run',
      intensity: 'high',
      tags: ['run', 'race'],
      notes: '5K time trial',
    },
  ],
  recent_history: [],
});

// Result: No heavy leg days on Oct 4-6
// Likely includes mobility/recovery on Oct 4
```

### Minimal Equipment

```typescript
const days = await planAndCompile({
  today: '2025-10-01',
  horizon_days: 7,
  profile: {
    goal: 'general fitness',
    frequency_per_week: 3,
    accessible_equipment: 'bodyweight',
    session_length_min: 30,
  },
  events: [],
  recent_history: [],
});

// Result: Only bodyweight exercises (push-ups, squats, planks, etc.)
```

### With Recent History

```typescript
const days = await planAndCompile({
  today: '2025-10-01',
  horizon_days: 14,
  profile: { /* ... */ },
  events: [],
  recent_history: [
    { date: '2025-09-30', focus: 'lower', completed: true, soreness: 7, rpe: 8 },
    { date: '2025-09-28', focus: 'upper', completed: true, soreness: 4, rpe: 7 },
  ],
});

// Planner considers recent soreness and adjusts intensity/recovery
```

## Integration with Database

### Inserting Compiled Days

```typescript
import { planAndCompile, exercisePlanToDbInsert } from './ai';

const compiledDays = await planAndCompile(context);

for (const day of compiledDays) {
  if (day.action === 'rest' || day.action === 'event') {
    // Optionally create a workout record with no exercises
    continue;
  }

  // Create workout record
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      date: day.date,
      action: day.action,
      focus: day.focus,
      tags: day.tags,
      state: 'planned',
      plan_meta: day.meta,
    })
    .select()
    .single();

  if (workoutError || !workout) {
    console.error('Failed to create workout:', workoutError);
    continue;
  }

  // Insert exercises
  const exerciseInserts = day.exercises.map((ex) =>
    exercisePlanToDbInsert(ex, workout.id)
  );

  const { error: exerciseError } = await supabase
    .from('exercise')
    .insert(exerciseInserts);

  if (exerciseError) {
    console.error('Failed to insert exercises:', exerciseError);
  }
}
```

## Advanced Usage

### Custom Planner Brain

Implement your own planning logic:

```typescript
import { PlannerBrain, AIPlan, PlanningContext } from './ai';

class CustomPlannerBrain implements PlannerBrain {
  async plan(context: PlanningContext): Promise<AIPlan> {
    // Your custom logic here
    return {
      plan: [/* ... */],
      notes: 'Custom plan',
    };
  }
}
```

### Custom Exercise Templates

Extend the compiler with custom templates:

```typescript
import { compileExercises } from './ai/compiler';

// Or create a custom compiler function
function myCustomCompiler(focus: string, profile: UserProfile): ExercisePlan[] {
  // Your custom exercise generation
  return [/* ... */];
}
```

## Troubleshooting

### "OpenAI not available"

- Check that `REACT_APP_OPENAI_API_KEY` is set in `.env`
- Restart your dev server after changing `.env`
- Verify the API key is valid at https://platform.openai.com/api-keys

### "Failed to get valid JSON response"

- The AI returned malformed JSON after 2 retries
- Try reducing `horizonDays` (less data = simpler JSON)
- Try a more capable model (e.g., `gpt-4o` instead of `gpt-4o-mini`)

### "No exercises available after filtering"

- Your equipment/dislikes filters are too restrictive
- The system will use alternatives, but they may be limited
- Consider broadening `accessible_equipment` or reducing `dislikes`

### Rate Limits

- OpenAI has rate limits based on your account tier
- For production, implement request queuing or caching
- Consider generating plans less frequently (e.g., weekly, not daily)

## Performance Tips

1. **Cache plans**: Store generated plans in `planner_runs` table to avoid regenerating
2. **Batch operations**: Generate 14-day plans instead of daily 7-day plans
3. **Disable seasoning for faster results**: `{ aiSeasoning: false }`
4. **Use stub planner for testing**: Unset API key temporarily

## Testing

```typescript
import { planAndCompile } from './ai';

// Test with stub planner (no API key)
process.env.REACT_APP_OPENAI_API_KEY = '';

const days = await planAndCompile({
  today: '2025-10-01',
  horizon_days: 7,
  profile: { frequency_per_week: 3 },
  events: [],
  recent_history: [],
});

expect(days).toHaveLength(7);
expect(days.filter(d => d.action === 'train')).toHaveLength(3);
```

## Production Recommendations

⚠️ **Security Warning**: This implementation uses `dangerouslyAllowBrowser: true` for demo purposes. In production:

1. **Move OpenAI calls to your backend** to protect API keys
2. **Implement rate limiting** to prevent abuse
3. **Cache generated plans** to reduce API costs
4. **Add user authentication** to plan generation endpoints
5. **Monitor API usage** and set budget alerts

## License

Part of the AERI-PT fitness application.

