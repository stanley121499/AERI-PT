# Brand Identity System — AI Workout App

> Working title: pick any name route below; we can refine once you’ve chosen a direction.

---

## 1) Brand North Star

**Purpose**
Help people build sustainable fitness habits by adapting workouts to real life—one session at a time.

**Vision**
Everyone has a dynamic training plan that evolves with their energy, schedule, and goals.

**Mission**
Use AI to learn from each rep, set, and session to craft the next best workout for you.

**Values**

* **Adaptive** – meets you where you are, every day.
* **Evidence‑guided** – grounded in sports science and data.
* **Empowering** – celebrates progress over perfection.
* **Respectful** – privacy by default; your data is yours.
* **Simple** – fewer taps, clearer decisions.

**Positioning Statement**
For busy people who want to get stronger without overthinking, *\[Brand]* is the adaptive coach in your pocket that builds your plan as you go—so workouts stay effective, flexible, and fun.

---

## 2) Name Routes (+taglines)

Pick one route; we’ll secure domains/handles later.

1. **FlowForge** — *Build your strength, one session at a time.*
2. **PulsePath** — *Your path to progress, personalized.*
3. **FitFlux** — *Workouts that move with you.*
4. **Setwise** — *Smarter sets, better results.*
5. **Kinetic** — *Make every move count.*
6. **FormLoop** — *Learn your body’s rhythm.*

> My quick pick for broad appeal + tech-forward: **Setwise** or **FlowForge**.

---

## 3) Audience Snapshot

* **Starters** (18–35): want guidance, low friction, visible wins.
* **Returners** (25–45): coming back after a break; value flexibility and gentle accountability.
* **Optimizers** (25–40): track-minded; want progressive overload and data.

**Key Jobs-to-be-Done**

* “Tell me what to do **today** based on how I’m feeling and what I did last time.”
* “Keep me progressing without burning out.”
* “Make the gym less intimidating and more automatic.”

---

## 4) Messaging Pillars

1. **Adaptive Coaching** — Today’s plan, not last week’s template.
2. **Progress Made Simple** — Clear cues, fewer choices, consistent wins.
3. **Proof in the Data** — See how you’re improving and why.
4. **Privacy First** — You own your training data.

**Proof Points**

* Auto‑adjusts sets/reps from RPE, completion, rest, and time.
* Deload & recovery recommendations baked in.
* Personal records & streaks tracked quietly, surfaced meaningfully.
* Export/delete data anytime.

---

## 5) Voice & Tone

* **Voice:** supportive coach + smart lab friend.
* **Tone:** clear, upbeat, never shouty.
* **Style:** short sentences, verbs first, no jargon.

**Do**
✔ “You’ve got 20 minutes? Let’s hit an efficient push day.”
✔ “Last time 8 reps felt heavy. We’ll start at 6 and build.”

**Don’t**
✘ “Crush it.” “No excuses.” “Grind.”

---

## 6) Visual Identity

### Color Palettes

**Primary (Electric Calm)**

* **C1 Electric Indigo** #4F46E5
* **C2 Mint Lift** #34D399
* **C3 Night Graphite** #0F172A
* **C4 Cloud** #F8FAFC
* **C5 Accent Pulse** #F59E0B

**Alt (Energetic Dark)**

* **A1 Neon Blue** #2563EB
* **A2 Lime Pop** #84CC16
* **A3 True Black** #09090B
* **A4 Slate** #1F2937
* **A5 Coral Warm** #FB7185

> Accessibility: keep contrast ratio ≥ 4.5:1 for body text; avoid C2 on C4 for long copy.

### Typography

* **Headlines:** **Outfit** (Google) — geometric, modern.
* **UI/Text:** **Inter** (Google) — highly legible at small sizes.
* **Numbers/Stats:** **IBM Plex Mono** for data moments.

**Type Scale (mobile-first)**

* Display 36/44
* H1 28/36
* H2 22/30
* Body 16/24
* Caption 13/18
* Button 16/16 (semibold)

### Iconography & Illustration

* Rounded corners, 2px stroke, subtle motion lines.
* Illustrations show inclusive bodies and gym settings; avoid hyper‑masculine clichés.

### Motion

* Use micro‑interactions: set complete → gentle haptic + 200ms ease‑in pulse.
* Progress rings animate clockwise with spring 200/20.

### Grids & Spacing

* 8px baseline grid.
* Cards 16px padding; screens 24px gutters.
* Corner radius: 16px (cards), 28px (FAB), 8px (inputs).

---

## 7) Logo Concepts (starter)

> Simple, scalable, 1‑color friendly. Here are three directions you can hand to a designer or we can refine.

1. **Adaptive “S” Mark (for Setwise)**

   * Two interlocking curves forming an S → suggests feedback loops.
   * Negative space creates a check‑mark at the center.

2. **Flow Forge Monogram (FF)**

   * Stylized F’s forming a forward arrow → momentum.

3. **PulsePath Glyph**

   * Minimal heart‑beat segment that morphs into a path/arrow.

**SVG Starter (Mark + Wordmark)**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="560" height="160" viewBox="0 0 560 160">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#34D399"/>
    </linearGradient>
  </defs>
  <!-- Mark: interlocking adaptive S -->
  <g transform="translate(20,20)">
    <path d="M60 0 C30 0 30 40 60 40 C90 40 90 80 60 80" fill="none" stroke="url(#g)" stroke-width="16" stroke-linecap="round"/>
    <path d="M60 80 C30 80 30 120 60 120 C90 120 90 160 60 160" fill="none" stroke="url(#g)" stroke-width="16" stroke-linecap="round"/>
    <!-- central check hint -->
    <path d="M46 76 L58 90 L82 60" fill="none" stroke="#34D399" stroke-width="8" stroke-linecap="round"/>
  </g>
  <!-- Wordmark -->
  <g transform="translate(220,92)">
    <text font-family="Outfit, Inter, Arial" font-weight="700" font-size="56" fill="#0F172A">Set</text>
    <text x="140" font-family="Outfit, Inter, Arial" font-weight="300" font-size="56" fill="#0F172A">wise</text>
  </g>
</svg>
```

---

## 8) Product UX Principles

1. **Start Anywhere** — 3‑tap quick start: time available → target muscle → suggested plan.
2. **1 Screen = 1 Job** — plan, perform, review are distinct.
3. **Just‑in‑Time Coaching** — cues appear right before a set; never walls of text.
4. **Deload by Design** — auto suggests lighter weeks based on fatigue markers.
5. **Offline‑safe** — log sets without network; sync later.

---

## 9) Copy Kit

**Taglines**

* *Workouts that move with you.*
* *Smarter sets, better results.*
* *Today’s best next set.*
* *Progress, not guesswork.*

**App Store Short Description**
*AI that builds your workout as you go. Adaptive sets, smart progressions, and simple tracking.*

**Onboarding Microcopy**

* “How much time do you have today?”
* “Pick a focus: full body • push • pull • legs • core.”
* “We’ll adjust sets based on how each one felt.”

**Push/Notifications (respectful cadence)**

* “You trained push on Tue. 15 min free now? Quick pull finisher is ready.”
* “New best 5‑rep set on rows. Nice. Want a 10‑min cooldown?”
* “Travel day detected—bodyweight plan queued.”

**Empty States**

* “No equipment? No problem. We’ll design a bodyweight circuit that still progresses.”

---

## 10) Brand Applications

* **App Icon:** gradient S‑mark on dark background.
* **Social:** bold glyph + short verbs: “Lift. Learn. Repeat.”
* **Email:** plain‑text, short, action‑first.
* **Merch:** minimal wordmark; keep typography clean.

---

## 11) Launch Checklist (Brand)

* Choose name route & check trademarks/handles.
* Finalize color/typography and export tokens (iOS/Android/Web).
* Produce logo suite (SVG, PDF, PNG) + clear-space & min-size rules.
* Create app store assets (icon, screenshots, 15–30s video).
* Build landing page (waitlist + explanation of adaptive engine).
* Draft 3 launch emails + 5 social posts.

---

## 12) Next Steps

1. Tell me your favorite **name** & **palette** above.
2. I’ll refine the logo, write a mini style guide (Do/Don’t), and generate a landing page hero + screenshot storyboard.
