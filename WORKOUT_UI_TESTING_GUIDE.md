# Testing the Interactive Workout UI

## Quick Start Testing

### Option 1: Using Existing Workouts
If you already have workouts in your database from the AI planner:

1. Start the development server:
   ```bash
   npm start
   ```

2. Log in to your account

3. Navigate to "Workouts" in the sidebar (or go to `/workouts`)

4. The UI will automatically load today's workout or the most recent one

### Option 2: Create Test Data via AI Planner
1. Go to the AI Planner page (`/ai-planner`)
2. Generate a workout plan
3. Navigate to Workouts page
4. Start your workout!

### Option 3: Manual Test Data (Supabase Console)

#### Step 1: Create a Workout
Go to Supabase console → SQL Editor and run:

```sql
-- Replace 'YOUR_USER_ID' with your actual user ID
INSERT INTO workouts (user_id, date, focus, state, action)
VALUES (
  'YOUR_USER_ID',
  CURRENT_DATE,
  'Push Day - Upper Body',
  'planned',
  'workout'
)
RETURNING id;
```

Note the returned ID for the next step.

#### Step 2: Add Exercises
Replace `WORKOUT_ID_HERE` with the ID from Step 1:

```sql
-- Exercise 1: Push-ups
INSERT INTO exercise (
  workout_id, name, sets, reps, rest_sec, 
  rir, done, order_index, estimated_duration, weight_note
) VALUES (
  'WORKOUT_ID_HERE',
  'Push-ups',
  3,
  10,
  60,
  2,
  false,
  1,
  180,
  'Keep core tight, full range of motion'
);

-- Exercise 2: Dumbbell Bench Press
INSERT INTO exercise (
  workout_id, name, sets, reps, rest_sec, 
  rir, load_kg, done, order_index, estimated_duration, weight_note
) VALUES (
  'WORKOUT_ID_HERE',
  'Dumbbell Bench Press',
  3,
  8,
  90,
  2,
  25,
  false,
  2,
  270,
  'Control the weight, pause at bottom'
);

-- Exercise 3: Overhead Press
INSERT INTO exercise (
  workout_id, name, sets, reps, rest_sec, 
  rir, load_kg, done, order_index, estimated_duration, weight_note
) VALUES (
  'WORKOUT_ID_HERE',
  'Overhead Press',
  3,
  10,
  90,
  3,
  20,
  false,
  3,
  270,
  'Keep core engaged, press straight up'
);

-- Exercise 4: Lateral Raises
INSERT INTO exercise (
  workout_id, name, sets, reps, rest_sec, 
  rir, load_kg, done, order_index, estimated_duration
) VALUES (
  'WORKOUT_ID_HERE',
  'Lateral Raises',
  3,
  12,
  60,
  2,
  7.5,
  false,
  4,
  180
);

-- Exercise 5: Tricep Dips
INSERT INTO exercise (
  workout_id, name, sets, reps, rest_sec, 
  rir, done, order_index, estimated_duration, weight_note
) VALUES (
  'WORKOUT_ID_HERE',
  'Tricep Dips',
  3,
  12,
  60,
  2,
  false,
  5,
  180,
  'Lean forward for more chest activation'
);

-- Exercise 6: Cable Flyes
INSERT INTO exercise (
  workout_id, name, sets, reps, rest_sec, 
  rir, load_kg, done, order_index, estimated_duration
) VALUES (
  'WORKOUT_ID_HERE',
  'Cable Flyes',
  3,
  12,
  60,
  3,
  15,
  false,
  6,
  180
);
```

## Testing Checklist

### Pre-Workout State
- [ ] Navigate to `/workouts`
- [ ] Verify workout loads correctly
- [ ] Check exercise list is visible
- [ ] Verify estimated duration calculation
- [ ] Click "Start Workout" button

### During Workout
- [ ] Verify all exercises are displayed
- [ ] Check current exercise has dark border
- [ ] Tap first exercise checkbox to mark complete
- [ ] Verify exercise turns green with checkmark
- [ ] Check rest timer appears automatically
- [ ] Verify countdown works (shows minutes:seconds)
- [ ] Test "Skip Rest" button
- [ ] Test "+30s" button
- [ ] Verify next exercise auto-focuses
- [ ] Test progress bar updates correctly
- [ ] Check elapsed time counter increases
- [ ] Test "Show details" / "Hide details" toggle
- [ ] Verify weight notes display correctly
- [ ] Test clicking different exercises (should focus them)

### Exercise Card Elements
- [ ] Exercise number badge displays
- [ ] Exercise name is readable
- [ ] Sets × Reps shows correctly
- [ ] Rest time displays with icon
- [ ] Weight/load shows (if present)
- [ ] RIR value shows (if present)
- [ ] Weight notes show in blue box
- [ ] Expandable details work

### Completion Flow
- [ ] Mark all exercises complete
- [ ] Verify "Complete Workout" button appears
- [ ] Button should be green and prominent
- [ ] Click "Complete Workout"
- [ ] Verify completion modal appears
- [ ] Check success icon and message
- [ ] Test "View Progress" button
- [ ] Test "Back to Dashboard" button

### Navigation & Controls
- [ ] Test back arrow button
- [ ] Verify confirmation dialog appears
- [ ] Test "End Workout" button
- [ ] Check progress is saved when ending early
- [ ] Verify workout state updates in database

### Edge Cases
- [ ] Test with no workouts (empty state)
- [ ] Test with 1 exercise only
- [ ] Test with 10+ exercises (scrolling)
- [ ] Test exercises without weights
- [ ] Test exercises without rest times
- [ ] Test exercises without notes
- [ ] Test on mobile screen size
- [ ] Test on tablet size
- [ ] Test on desktop with sidebar

### Database Verification
After testing, check in Supabase:

```sql
-- Check workout state updated
SELECT id, focus, state, date 
FROM workouts 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY date DESC 
LIMIT 5;

-- Check exercises marked as done
SELECT name, done, sets, reps, load_kg 
FROM exercise 
WHERE workout_id = 'WORKOUT_ID_HERE'
ORDER BY order_index;
```

## Common Issues & Solutions

### Issue: "No Active Workout" shown
**Solution**: Make sure you have a workout with `state = 'planned'` or `'in_progress'` and a valid date.

### Issue: Exercises not loading
**Solution**: Check that exercises have the correct `workout_id` foreign key.

### Issue: Rest timer not starting
**Solution**: Ensure exercises have `rest_sec` value set in database.

### Issue: Exercises in wrong order
**Solution**: Set `order_index` field (1, 2, 3, etc.) for proper ordering.

### Issue: Progress bar not updating
**Solution**: Make sure `done` field is being updated in database (check browser console for errors).

## Performance Testing

### Load Time
- Initial page load should be < 2 seconds
- Workout data should load < 500ms
- Exercise list render should be instant

### Interactions
- Checkbox toggle should feel instant
- Rest timer should countdown smoothly
- Progress bar animation should be smooth
- Modal open/close should be fluid

### Database Updates
- Exercise completion should save < 300ms
- Workout state update should save < 300ms
- Real-time updates should reflect < 1 second

## Mobile Testing Tips

1. Use Chrome DevTools Device Mode
2. Test on actual iOS/Android device
3. Check touch target sizes (minimum 44×44px)
4. Verify scrolling behavior
5. Test with slow network (3G throttling)
6. Check landscape orientation

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Sample Test Workout Data

For variety, here are different workout types to test:

### Leg Day
```sql
INSERT INTO workouts (user_id, date, focus, state, action)
VALUES ('YOUR_USER_ID', CURRENT_DATE, 'Leg Day', 'planned', 'workout')
RETURNING id;

-- Then add exercises: Squats, Lunges, Leg Press, Hamstring Curls, Calf Raises
```

### Pull Day
```sql
INSERT INTO workouts (user_id, date, focus, state, action)
VALUES ('YOUR_USER_ID', CURRENT_DATE, 'Pull Day - Back & Biceps', 'planned', 'workout')
RETURNING id;

-- Then add: Pull-ups, Rows, Lat Pulldown, Bicep Curls, Face Pulls
```

### Full Body
```sql
INSERT INTO workouts (user_id, date, focus, state, action)
VALUES ('YOUR_USER_ID', CURRENT_DATE, 'Full Body Strength', 'planned', 'workout')
RETURNING id;

-- Then add: Deadlifts, Bench Press, Squats, Rows, Overhead Press
```

## Automated Testing (Future)

Consider adding:
```typescript
// Example test structure
describe('WorkoutPage', () => {
  it('should load workout data', async () => {
    // Test implementation
  });
  
  it('should mark exercise as complete', async () => {
    // Test implementation
  });
  
  it('should start rest timer', async () => {
    // Test implementation
  });
  
  it('should show completion modal', async () => {
    // Test implementation
  });
});
```

---

**Ready to test?** Start with Option 1 or 2 above and go through the testing checklist!

