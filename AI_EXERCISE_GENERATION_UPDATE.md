# AI Exercise Generation Update

## Summary

The AI Planning Layer has been updated to use **fully AI-generated exercises** instead of template-based exercise selection. This makes the system more flexible, creative, and personalized.

## What Changed

### ✅ Before (Template-Based)
1. **AI Planner Brain** → Generates daily actions and tags
2. **Deterministic Compiler** → Uses hardcoded templates to select exercises
3. **AI Seasoning** → Swaps names and adds cues

**Problems:**
- Limited exercise variety (only exercises in templates)
- Required manual maintenance of templates
- Equipment filtering was rigid
- Less personalized to user needs

### ✨ After (AI-Powered)
1. **AI Planner Brain** → Generates daily actions and tags
2. **AI Exercise Generator** → Generates custom exercises with sets/reps/weights
3. No seasoning needed (exercises come with cues)

**Benefits:**
- **Unlimited exercise variety** - AI can generate any exercise
- **Smarter equipment filtering** - AI understands "dumbbells up to 50kg"
- **Better personalization** - AI considers user goals and preferences
- **Automatic coaching cues** - Built into exercise names
- **Lower maintenance** - No templates to update

## Key Changes

### 1. New Exercise Generator (`src/ai/exerciseGenerator.ts`)
- Uses OpenAI to dynamically generate exercises
- Considers user equipment, goals, and dislikes
- Provides realistic sets/reps/rest/weights
- Falls back to simple exercises if no API key

### 2. Updated Orchestrator
- Now calls `generateExercisesWithAI()` instead of `compileExercises()`
- Removed seasoning step (no longer needed)
- Added metadata `ai_generated` to track generation method

### 3. RIR Field Changes
- **RIR (Reps in Reserve) is now `null` in generated plans**
- **Users fill this during workouts** (only they know how hard it was)
- This was incorrect before - we shouldn't pre-set RIR

### 4. Simplified Compiler
- `compiler.ts` now only provides fallback exercises
- Templates kept for emergency use only
- Main logic moved to AI generator

## Example Output

### Before (Template)
```json
{
  "name": "Dumbbell Bench Press",
  "sets": 4,
  "reps": 8,
  "rest_sec": 180,
  "rir": 2,  // ❌ Shouldn't be pre-set
  "load_kg": 20
}
```

### After (AI-Generated)
```json
{
  "name": "Dumbbell Bench Press - Keep core tight, full range of motion",
  "sets": 4,
  "reps": 8,
  "rest_sec": 180,
  "rir": null,  // ✅ User fills during workout
  "load_kg": 22.5,
  "notes": "Focus on chest squeeze at top"
}
```

## Files Modified

1. **Created:**
   - `src/ai/exerciseGenerator.ts` - New AI exercise generator

2. **Updated:**
   - `src/ai/orchestrator.ts` - Uses AI generator instead of compiler
   - `src/ai/compiler.ts` - Simplified to fallback only
   - `src/ai/index.ts` - Exports new generator

3. **Documentation:**
   - `AI_EXERCISE_GENERATION_UPDATE.md` - This file

## How to Use

The API remains the same! Just call:

```typescript
import { planAndCompile } from './ai';

const compiledDays = await planAndCompile(context, {
  horizonDays: 14,
  aiPlannerModel: 'gpt-4o-mini',
  aiSeasoning: false, // No longer needed
});
```

## Backwards Compatibility

- API interface unchanged
- Falls back to simple exercises if no OpenAI key
- Old `compileExercises()` still available but deprecated
- Seasoning functions kept but not used

## Benefits for Users

1. **More Variety** - Never do the same workout twice
2. **Smarter Equipment Use** - AI understands what you have
3. **Better Form Cues** - Built-in coaching tips
4. **Realistic Weights** - AI suggests appropriate loads
5. **Accurate RIR** - You track it, not the system

## Next Steps

✅ Exercise generation is now AI-powered
✅ RIR is correctly left null for user input
✅ Equipment filtering is smarter
✅ System falls back gracefully without API key

**Test it:** Just generate a new plan in the AI Planner page and see the improved exercises!

