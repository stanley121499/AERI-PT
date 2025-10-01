# AI Planning Layer - Architecture

## Overview

The AI Planning Layer is a modular, type-safe system for generating intelligent training microcycles. It uses a hybrid approach combining AI decision-making with deterministic exercise compilation.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR                              │
│                    (orchestrator.ts)                             │
│                                                                   │
│  High-level function: planAndCompile(context, options)          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌────────────────┐     ┌─────────────────┐
│ PLANNER BRAIN │      │  POLICY ENGINE │     │    COMPILER     │
│plannerBrain.ts│      │   policy.ts    │     │  compiler.ts    │
└───────┬───────┘      └────────┬───────┘     └────────┬────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌────────────────┐     ┌─────────────────┐
│  OpenAI Brain │      │ Hard Rules:    │     │ Exercise        │
│    (AI)       │      │ - Cadence      │     │ Templates       │
│               │      │ - Event Taper  │     │ - Upper/Lower   │
│  Stub Brain   │      │ - Recovery     │     │ - Full Body     │
│ (Deterministic)│      │ - Validation   │     │ - Conditioning  │
└───────┬───────┘      └────────────────┘     │ - Mobility      │
        │                                      └────────┬────────┘
        │                                               │
        ▼                                               ▼
┌───────────────────────────────────┐         ┌─────────────────┐
│      OPENAI CLIENT                │         │   SEASONING     │
│    (openaiClient.ts)              │         │  seasoning.ts   │
│                                   │         │                 │
│ - JSON-only API calls             │         │ Optional AI pass│
│ - Retry logic (2x)                │         │ - Name swaps    │
│ - Parse validation                │         │ - Coaching cues │
│ - Browser-safe wrapper            │         │ - No numeric    │
└───────────────────────────────────┘         │   changes       │
                                              └─────────────────┘
```

## Data Flow

### Input → Output

```
PlanningContext                      AIPlan                      CompiledDay[]
─────────────────                  ──────────                   ─────────────
┌──────────────┐                  ┌──────────┐                ┌────────────┐
│ today        │                  │ plan[]   │                │ date       │
│ horizon_days │  ──Planner──►   │   date   │ ──Compiler──► │ action     │
│ profile      │                  │   action │                │ focus      │
│ events       │                  │   tags   │                │ exercises[]│
│ history      │                  │   reason │                │   name     │
└──────────────┘                  │ notes    │                │   sets     │
                                  └──────────┘                │   reps     │
                                                              │   rest_sec │
                                                              │   rir      │
                                                              │   load_kg  │
                                                              └────────────┘
```

### Processing Pipeline

1. **Context Preparation**
   - Validate input dates
   - Convert DB types to planning types
   - Set horizon (7 or 14 days)

2. **Planning Phase** (Planner Brain)
   - OpenAI: Generate AI-driven daily actions/tags
   - Stub: Use deterministic pattern (Mon/Wed/Fri, etc.)
   - Output: AIPlan with free-form tags

3. **Policy Enforcement** (Policy Engine)
   - `enforceCadence()`: Max 3 consecutive training days
   - `taperAroundEvents()`: Avoid hard legs near runs/events
   - `validatePlan()`: Check dates, actions, structure

4. **Exercise Compilation** (Compiler)
   - Map tags → focus (e.g., ["upper", "push"] → "upper")
   - Select exercise templates based on focus
   - Filter by equipment/dislikes
   - Apply alternatives if needed
   - Set order_index, estimated_duration

5. **AI Seasoning** (Optional)
   - Only if OpenAI available and enabled
   - Swap exercise names if equipment conflicts
   - Add coaching cues (≤70 chars)
   - Never change sets/reps/rest/RIR/load

6. **Output**
   - Return CompiledDay[] array
   - Ready for DB insertion (no side effects)

## Module Responsibilities

### `types.ts`
**Purpose**: Shared type definitions and adapters

**Key Types**:
- `PlanningContext` - Input to planner
- `AIPlan` / `AIPlanDay` - Planner output
- `CompiledDay` - Final output with exercises
- `ExercisePlan` - Single exercise specification

**Adapters**:
- `userInfoToProfile()` - DB → Planning
- `dbEventToUserEvent()` - DB → Planning
- `dbWorkoutToHistoryDay()` - DB → Planning
- `exercisePlanToDbInsert()` - Planning → DB

### `policy.ts`
**Purpose**: Pure helper functions for planning rules

**Hard Rules**:
1. Max 3 consecutive training days
2. No hard legs 24-48h around high-intensity events
3. Recovery every 3-4 days
4. Respect event day preferences

**Key Functions**:
- `isHighIntensityEvent()` - Detect intense events
- `enforceCadence()` - Limit training streaks
- `taperAroundEvents()` - Protect event performance
- `mapToSafeFocus()` - Tag → focus mapping
- `validatePlan()` - Plan structure validation

### `openaiClient.ts`
**Purpose**: OpenAI SDK wrapper

**Features**:
- Lazy client initialization
- JSON-only responses (force `response_format: json_object`)
- Retry logic on parse failures (up to 2 retries)
- Browser-safe guards
- Environment-based API key

**Key Functions**:
- `getOpenAI()` - Get or create client
- `isOpenAIAvailable()` - Check if API key is set
- `callJSON()` - JSON-only call with retry
- `callCompletion()` - Text completion

### `plannerBrain.ts`
**Purpose**: Daily action decision-making

**Implementations**:

1. **OpenAIPlannerBrain** (AI-backed)
   - Uses OpenAI to generate intelligent plans
   - Considers profile, events, history, fatigue
   - System prompt encodes hard rules
   - Returns AIPlan with free-form tags

2. **StubPlannerBrain** (Deterministic fallback)
   - No API key required
   - Simple pattern: Mon/Wed/Fri for freq=3
   - Alternates upper/lower
   - Respects events and max consecutive days

**Key Functions**:
- `createPlannerBrain()` - Factory (auto-selects)
- `plan()` - Generate AIPlan from context

### `compiler.ts`
**Purpose**: Deterministic exercise generation

**Features**:
- Safe exercise templates for all focus types
- Equipment filtering (bodyweight, minimal, full gym)
- Dislike filtering
- Alternative exercises
- Session length adaptation

**Templates**:
- Upper: Bench Press, Rows, OHP, Pull-ups
- Lower: Squats, RDLs, Split Squats, Leg Curls
- Full: Goblet Squats, Push-ups, Rows, Planks
- Conditioning: Bike Intervals, Burpees, Swings
- Mobility: Stretches, Cat-Cow, Hip Flexor
- Yoga: Sun Salutations, Downward Dog, Pigeon
- Calisthenics: Pull-ups, Dips, Pistol Squats

**Key Functions**:
- `chooseThemeFromTags()` - Tag → focus
- `compileExercises()` - Generate ExercisePlan[]
- `isRecoveryFocus()` - Detect recovery types

### `seasoning.ts`
**Purpose**: Optional AI exercise refinement

**Features**:
- Swap names if equipment/dislikes conflict
- Add coaching cues (≤70 chars)
- **Never** change numeric programming
- Graceful fallback if OpenAI unavailable

**Output Format**:
```
"Barbell Bench Press - cue: drive through your feet"
```

**Key Functions**:
- `seasonExercises()` - Apply AI seasoning
- `stripCue()` - Extract base name
- `extractCue()` - Get cue text

### `orchestrator.ts`
**Purpose**: High-level orchestration

**Main Function**:
```typescript
planAndCompile(context, options) → CompiledDay[]
```

**Pipeline**:
1. Choose planner (OpenAI or Stub)
2. Generate plan
3. Apply policy guards (defensive)
4. Compile each day:
   - rest/event → empty exercises
   - train/recovery → compile + optional seasoning
5. Return CompiledDay[]

**Helpers**:
- `estimateDayDuration()` - Calculate session minutes
- `getPlanSummary()` - Stats (training days, exercises, hours)

### `index.ts`
**Purpose**: Public API exports

Single entry point for all functionality.

## Configuration

### Environment Variables

```env
# Required for AI features
REACT_APP_OPENAI_API_KEY=sk-...

# Optional
REACT_APP_OPENAI_MODEL=gpt-4o-mini  # default model
```

### Default Models

- **Planner**: `gpt-4o-mini` (fast, cost-effective)
- **Seasoning**: `gpt-4o-mini` (fast, cost-effective)

For higher quality, use `gpt-4o` or `gpt-4-turbo-preview`.

## Error Handling

### OpenAI Unavailable
- System falls back to `StubPlannerBrain`
- Seasoning is skipped
- No crashes, graceful degradation

### JSON Parse Failures
- Retry up to 2 times with corrective prompt
- Throw descriptive error if all retries fail
- Includes original error message

### Validation Errors
- Logged as warnings (not blocking)
- Plan proceeds with corrections
- User sees diagnostic output

## Testing Strategy

### Unit Tests (Recommended)

```typescript
// Policy tests
test('enforceCadence limits consecutive training days', () => {
  const days = [
    { action: 'train', ... },
    { action: 'train', ... },
    { action: 'train', ... },
    { action: 'train', ... }, // 4th day
  ];
  const result = enforceCadence(days);
  expect(result[3].action).toBe('recovery');
});

// Compiler tests
test('compileExercises respects bodyweight filter', () => {
  const exercises = compileExercises({
    focus: 'upper',
    tags: [],
    profile: { accessible_equipment: 'bodyweight' },
  });
  expect(exercises.every(ex => 
    !ex.name.includes('Barbell')
  )).toBe(true);
});
```

### Integration Tests

```typescript
// Test full pipeline
test('planAndCompile generates valid plan', async () => {
  const context = {
    today: '2025-10-01',
    horizon_days: 7,
    profile: { frequency_per_week: 3 },
    events: [],
    recent_history: [],
  };
  
  const days = await planAndCompile(context);
  
  expect(days).toHaveLength(7);
  expect(days.filter(d => d.action === 'train')).toHaveLength(3);
});
```

## Performance Considerations

### API Call Optimization

1. **Batching**: Generate 14-day plans instead of daily 7-day plans
2. **Caching**: Store plans in `planner_runs` table
3. **Disable seasoning**: Skip for faster results (`aiSeasoning: false`)
4. **Use stub planner**: For testing/dev environments

### Rate Limits

- OpenAI has rate limits based on account tier
- Implement request queuing for high-traffic apps
- Consider backend-only API calls for production

## Security Considerations

⚠️ **Current Implementation**:
- Uses `dangerouslyAllowBrowser: true` for client-side demo
- Exposes API key in browser (not production-safe)

✅ **Production Recommendations**:
1. Move OpenAI calls to backend API
2. Implement authentication/authorization
3. Add rate limiting per user
4. Set up budget alerts
5. Monitor API usage

## Extension Points

### Custom Planner Brain

Implement your own planning logic:

```typescript
class MyCustomBrain implements PlannerBrain {
  async plan(context: PlanningContext): Promise<AIPlan> {
    // Your logic here
  }
}
```

### Custom Exercise Templates

Extend the compiler:

```typescript
const MY_TEMPLATES = [...];

function myCompiler(focus: string, profile: UserProfile) {
  // Your template logic
}
```

### Custom Policy Rules

Add your own constraints:

```typescript
function myCustomRule(days: AIPlanDay[]): AIPlanDay[] {
  // Your rule logic
}
```

## File Structure

```
src/ai/
├── types.ts              # Shared types and adapters
├── policy.ts             # Pure helper rules
├── openaiClient.ts       # OpenAI SDK wrapper
├── plannerBrain.ts       # AI + stub planners
├── compiler.ts           # Deterministic exercise generation
├── seasoning.ts          # Optional AI refinement
├── orchestrator.ts       # High-level orchestration
├── index.ts              # Public API exports
├── example-usage.ts      # Usage examples
├── README_AI.md          # User documentation
└── ARCHITECTURE.md       # This file
```

## Dependencies

- **openai**: ^4.28.0 (already installed)
- **@supabase/supabase-js**: ^2.57.4 (already installed)
- TypeScript 4.9+
- React 19+

## Maintenance

### When to Update

1. **Add new focus types**: Update `compiler.ts` templates
2. **Change hard rules**: Update `policy.ts` and planner prompts
3. **New OpenAI models**: Update `openaiClient.ts` defaults
4. **Schema changes**: Update `types.ts` adapters

### Version Compatibility

- OpenAI SDK v4+: Uses `response_format: { type: "json_object" }`
- React 19+: Uses modern hooks
- TypeScript 4.9+: Uses `satisfies` operator

