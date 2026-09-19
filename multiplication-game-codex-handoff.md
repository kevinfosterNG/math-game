# Multiplication Game — Codex Handoff Plan

## Project Goal

Build a kid-friendly, game-first multiplication practice website for a 5th grader who needs stronger multiplication-table recall.

The game should make practicing feel more like a small arcade/adventure game than a worksheet.

Core interaction:

**See multiplication problem → type answer → press Enter → get immediate feedback → next question.**

Initial scope is multiplication facts. Keep the architecture extensible for future math modes, but do not overengineer v1.

---

## Core Game

- 25 questions per round.
- Multiplication facts only.
- No multiple choice.
- Player types the numeric answer.
- Pressing Enter submits the answer.
- Questions should be fast and frictionless.
- Start the round timer when the first question is presented.
- Stop the timer after the 25th answer is submitted.

At the end of the round show:

- Correct / total
- Percentage
- Total elapsed time
- Average time per question
- Personal-best information
- Play Again button

Example:

```text
ROUND COMPLETE!

23 / 25
92%

⏱ 1:17
3.1 sec/question

🏆 NEW PERSONAL BEST!

[ PLAY AGAIN ]
```

---

## Difficulty Modes

There are three independent difficulty modes. Each mode has its own records/high scores.

| Mode | Multiplication Tables |
|---|---|
| Easy | 1s, 2s, 5s, 10s |
| Medium | 3s, 4s, 6s, 7s, 8s, 9s |
| Expert | 3s, 4s, 6s, 7s, 8s, 9s, 11s, 12s |

Easy and Medium pair their selected tables with multipliers 1 through 10. Only Expert includes multipliers 11 and 12. This prevents Easy or Medium rounds from showing facts such as `2 × 12` or `9 × 11`.

### Important

Difficulty is **not cumulative**.

Medium intentionally excludes the 1s, 2s, 5s, and 10s.

Expert includes the harder basic tables plus 11s and 12s.

Do not lock Expert behind a score requirement in v1. The player can select any difficulty at any time.

---

## Fact Symmetry / Commutative Property

The player has already learned the important mathematical insight that:

```text
7 × 8 = 8 × 7
```

The game should reinforce this.

Treat `X × Y` and `Y × X` as the **same underlying fact**.

For example, these are one underlying fact:

```text
7 × 8
8 × 7
```

A canonical representation should be used:

```text
fact_x = MIN(x, y)
fact_y = MAX(x, y)
```

Thus both orientations are stored as:

```text
fact_x = 7
fact_y = 8
```

However, the displayed orientation should also be stored separately.

Example:

```text
fact_x: 7
fact_y: 8

displayed_x: 8
displayed_y: 7
```

When a fact is selected, randomly choose whether to display `X × Y` or `Y × X`.

---

## No Duplicate Facts Within a Round

Questions must be pre-computed before the round starts.

Do **not** generate each question independently with random numbers.

The same underlying fact must never appear twice in the same 25-question round.

Therefore this is prohibited in one round:

```text
7 × 8
8 × 7
```

Those are the same fact.

### Round generation algorithm

1. Build the complete fact pool for the selected difficulty.
2. Canonicalize every fact.
3. Remove duplicate symmetric pairs.
4. Shuffle the unique fact pool.
5. Select 25 unique facts without replacement.
6. For each selected fact, randomly choose its displayed orientation.
7. Shuffle the resulting 25 questions.
8. Start the game.

This guarantees:

- No duplicate underlying facts.
- Both orientations can appear across different rounds.
- Orientation varies naturally.
- The player does not see the same fact twice in one round.

The current difficulty pools all contain enough unique facts for a 25-question round.

---

## Scoring

Track at least:

- Number correct
- Number incorrect
- Percentage
- Total round time
- Average time/question
- Per-question response time
- Canonical underlying fact
- Displayed orientation
- Entered answer
- Correct answer

Example attempt:

```text
Underlying fact:
7 × 8

Displayed question:
8 × 7

Entered answer:
56

Correct:
true

Response time:
1830 ms
```

Incorrect example:

```text
Underlying fact:
6 × 9

Displayed question:
9 × 6

Entered answer:
48

Correct answer:
54

Correct:
false

Response time:
7200 ms
```

---

## Personal Records

Each difficulty has its own records.

Do not compare the player against other users. These are personal records only.

Suggested record categories:

### Best Score

Highest percentage achieved.

### Best Perfect Time

Fastest 25-question round with 100% accuracy.

### Best Qualified Time

Fastest round with at least 90% accuracy.

This prevents a very fast round with lots of wrong answers from being considered the best performance.

Example:

```text
🏆 PERSONAL RECORDS

EASY
Best Score:       100%
Perfect Time:     0:58
90%+ Time:        0:58

MEDIUM
Best Score:       96%
Perfect Time:     1:11
90%+ Time:        1:08

EXPERT
Best Score:       92%
Perfect Time:     --
90%+ Time:        1:32
```

---

# UX / Visual Direction

The UX needs to be **kid-friendly, energetic, colorful, and game-first**.

The goal is to make it feel like a little arcade/adventure game rather than an online worksheet.

## Visual inspiration

Use the general *feel* of games such as Minecraft and Fortnite:

- Chunky/blocky geometry
- Bright colors
- Adventure/arena feeling
- Game-like HUD
- Large buttons
- Progress bars
- Streak indicators
- XP-style feedback
- Particle effects
- Confetti
- Strong visual hierarchy

Do **not** directly copy copyrighted/proprietary game assets, characters, logos, textures, fonts, or recognizable UI elements.

The goal is:

> **Minecraft/Fortnite energy with an original visual identity.**

Avoid making it look like a school worksheet with a game-themed background.

---

## Home Screen

The home screen should immediately communicate:

```text
MATH QUEST

MULTIPLICATION ARENA

┌─────────────┐
│    EASY     │
│             │
│  1 • 2 • 5  │
│    • 10     │
└─────────────┘

┌─────────────┐
│   MEDIUM    │
│             │
│ 3 • 4 • 6   │
│ 7 • 8 • 9   │
└─────────────┘

┌─────────────┐
│   EXPERT    │
│             │
│ 3–9 + 11/12 │
└─────────────┘

      🏆 YOUR RECORDS
```

Difficulty cards should clearly show which multiplication tables are included.

The player should be able to start a game with one obvious click/tap.

---

## Game Screen

The question itself should be the dominant visual element.

Suggested structure:

```text
QUESTION 8 / 25                    ⏱ 00:21


                 7 × 8


                 [ 56 ]


                [ ENTER ]


█████████████░░░░░░░░░
```

Requirements:

- Large multiplication expression.
- Large answer field.
- Enter submits.
- Keyboard works naturally.
- Input receives focus automatically.
- Minimal mouse interaction required.
- Responsive on desktop, tablet, and phone.
- Touch-friendly.
- Large readable typography.
- Clear progress indicator.
- Timer is visible but not stressful.

---

## Input Behavior

Primary flow:

```text
See question
↓
Type answer
↓
Press Enter
↓
Feedback
↓
Next question
```

No unnecessary clicking.

On mobile/touch devices, use an appropriate numeric input so the numeric keyboard appears.

The player should not have to manually click the input field for every question.

---

## Correct Answer Feedback

Correct answers should feel satisfying without slowing down gameplay.

Possible feedback:

```text
YES! 56
```

or:

```text
NICE!
```

Possible effects:

- Small bounce
- Particle burst
- XP-style animation
- Brief positive sound

Feedback should be brief and the game should quickly advance.

---

## Incorrect Answer Feedback

Do not shame the player.

Show the correct answer clearly.

Example:

```text
NOT QUITE!

7 × 8 = 56
```

Then continue to the next question after a brief pause.

The goal is practice, not punishment.

---

## Streaks

A small streak indicator would be appropriate.

Example:

```text
🔥 5 IN A ROW!
```

Streaks should be informational and motivating, not a major scoring mechanic.

A wrong answer resets the streak.

Do not let streak mechanics complicate the underlying score.

---

## Sound

Sound is optional.

If implemented:

- Correct-answer sound
- Incorrect-answer sound
- Round-completion sound
- Optional background music

Provide an obvious mute/sound toggle.

Sound should never be required for gameplay.

---

## Results Screen

The end of a round should feel like completing a game.

Display:

- Score
- Percentage
- Total time
- Average time/question
- Personal-record information
- Play Again
- Return to difficulty selection

Potential messages:

```text
ROUND COMPLETE!
```

```text
NEW PERSONAL BEST!
```

```text
PERFECT ROUND!
```

```text
SO CLOSE!
```

Use judgment based on the actual result.

Do not make the results screen excessively animated or slow.

---

# Data Architecture

## Phase 1: Local Prototype

The first playable version should preferably require **no backend**.

Use browser `localStorage` for:

- Personal records
- Basic round history
- Current settings

This allows the game to be deployed immediately and tested with the child before introducing backend complexity.

The goal is to validate:

- Is the game fun?
- Is 25 questions the right length?
- Is the timer motivating or stressful?
- Are the difficulty pools correct?
- Does the UX work?
- Does the child want to play again?

---

# Phase 2: Supabase

Once the gameplay is validated, add Supabase for persistent cloud history.

The expected workload is extremely small, so a free/low-cost Supabase configuration should be sufficient unless usage expands significantly.

Suggested conceptual schema:

## rounds

```text
id
created_at
difficulty
total_questions
correct_answers
percentage
total_time_ms
average_time_ms
```

## attempts

```text
id
round_id
fact_x
fact_y
displayed_x
displayed_y
entered_answer
correct_answer
is_correct
response_time_ms
created_at
```

Canonical facts should always use:

```text
fact_x = MIN(x, y)
fact_y = MAX(x, y)
```

The displayed orientation is stored separately.

---

# Security

If Supabase is used:

- Never put Supabase service-role credentials in frontend code.
- Use the public/anon client key as appropriate.
- Configure Row Level Security.
- Only expose data that the application actually needs.
- Do not expose one child's private history to arbitrary users.
- Keep the architecture simple because this is primarily a family-use application.

Do not introduce authentication complexity unless it becomes necessary.

---

# Future Adaptive Practice

Do not make adaptive weighting mandatory for v1.

However, the data model should support it.

Eventually the game can identify weak facts.

Example:

```text
FACTS TO PRACTICE

7 × 8   ❌ ❌ ❌
6 × 9   ❌ ❌
8 × 6   ❌
```

Potential logic:

- Track accuracy by canonical fact.
- Track average response time.
- Increase weighting for frequently missed facts.
- Distinguish slow-but-correct from incorrect.
- Continue randomizing displayed orientation.

The child should still perceive the game as naturally random.

Do not make the adaptive system obvious or punitive.

---

# Hosting / Deployment

The production application should be a static web app.

Preferred hosting:

**Azure Static Web Apps**

Target URL:

```text
math.fostes.org
```

The exact subdomain can be changed during deployment.

DNS should point the selected subdomain to the deployed application.

Git-based CI/CD is preferred.

Alternative free static hosting is acceptable if Azure Static Web Apps introduces unnecessary complexity.

Do not introduce a paid traditional server solely for this application.

---

# Suggested Technical Architecture

Use a simple modern frontend stack.

Priorities:

- Easy deployment
- Fast load time
- Responsive design
- Easy maintenance
- Clear separation between game logic and UI
- Minimal unnecessary dependencies

The exact framework can be chosen based on the repository/project setup.

Suggested logical organization:

```text
src/
  game/
    facts
    difficulty
    round-generation
    scoring
    timer
    question-state

  ui/
    home
    difficulty-selection
    game-screen
    feedback
    results
    records

  data/
    local-storage
    supabase

  styles/
    theme
    components
```

Keep the mathematical/game logic independent of the visual presentation.

---

# Core Game Algorithm

Conceptually:

```text
START

Show difficulty selection

Player selects:
    Easy
    Medium
    Expert

Build fact pool for selected difficulty

Canonicalize every fact:
    (x, y) → (min(x,y), max(x,y))

Remove duplicate symmetric facts

Shuffle the fact pool

Select 25 unique facts

For each selected fact:
    randomly choose displayed orientation

Shuffle the resulting 25 questions

Initialize:
    question_index = 0
    correct_count = 0
    streak = 0
    attempts = []

Focus answer input

Start timer

FOR each question:

    Display question

    Wait for answer submission

    Record response time

    Normalize input

    Compare answer with correct answer

    Record attempt

    Update:
        correct count
        incorrect count
        streak

    Show brief feedback

    Advance to next question

END FOR

Stop timer

Calculate:
    score
    percentage
    total time
    average time/question

Compare results with personal records
for this difficulty

Persist round locally

If Supabase exists:
    persist round and attempts

Show results screen

END
```

---

# Input Validation / Edge Cases

Handle cleanly:

- Blank answer
- Non-numeric input
- Leading/trailing whitespace
- Negative numbers
- Decimal values
- Accidental double-submit
- Extremely fast submission
- Very slow submission
- Browser refresh during a round
- Replaying a round
- Future custom difficulties with fewer than 25 unique facts

For the current three modes, there are enough unique facts for 25 questions.

The player should never get stuck because of malformed input.

---

# Accessibility

Even though the target audience is a child, accessibility matters.

Include:

- Large readable text
- Strong contrast
- Clear keyboard focus
- Keyboard support
- Enter-to-submit
- Touch-friendly controls
- Do not rely exclusively on color for correct/incorrect
- Respect `prefers-reduced-motion` where practical
- Avoid flashing effects
- Keep animations short
- Appropriate numeric input on mobile

---

# Performance

The game should load quickly.

Avoid:

- Large image assets
- Heavy JavaScript libraries
- Unnecessary API calls
- Loading Supabase data before the player can start a local game

The core game should be playable even if the database is unavailable.

If Supabase is temporarily unavailable:

- The game should still work.
- Local records should continue to function.
- Persistence can retry later or fail gracefully.

Do not make a network outage prevent multiplication practice.

---

# Explicitly NOT in v1

Do not allow scope creep into:

- User accounts
- Social login
- Public leaderboards
- Multiplayer
- Ads
- In-game purchases
- Chat
- AI-generated questions
- Complex character/avatar systems
- Inventory systems
- Division
- Addition
- Subtraction
- Teacher dashboards
- Elaborate achievement systems
- Complex reward economies
- Paid backend infrastructure

The core product is:

> **A fun 25-question multiplication game that helps a child build fast, reliable recall.**

---

# Future Possibilities

Potential future additions, only after the core game is validated:

1. Adaptive question weighting.
2. Fact-specific practice mode.
3. Daily challenge.
4. Streak tracking.
5. XP / level progression.
6. Unlockable cosmetic themes.
7. Multiplication/division fact families.
8. Additional math operations.
9. Parent progress/history dashboard.
10. Optional sound/music themes.
11. Custom question counts.
12. Timed challenge mode.
13. Printable practice sheets generated from weak facts.
14. Different visual themes.
15. Seasonal or adventure-themed environments.

These should not interfere with the simple core gameplay.

---

# Definition of Done — v1

A child can:

1. Open the dedicated website.
2. Immediately understand what to do.
3. Choose Easy, Medium, or Expert.
4. Play a 25-question round.
5. Type answers without using multiple choice.
6. Press Enter to submit.
7. Receive immediate, friendly feedback.
8. Never receive the same underlying fact twice in one round.
9. Never see both `7×8` and `8×7` in the same round.
10. See multiplication orientation randomized between rounds.
11. See score and percentage at the end.
12. See total time.
13. See average time/question.
14. See the personal record for the selected difficulty.
15. Start another round immediately.
16. Use the site comfortably on desktop and mobile.

---

# Implementation Priorities

## Phase 1 — Core Game

Build:

- Project scaffold
- Responsive visual shell
- Original game-inspired visual design
- Difficulty selection
- Fact pools
- Canonical fact representation
- Unique 25-question round generation
- Randomized multiplication orientation
- Answer input
- Enter-to-submit
- Correct/incorrect feedback
- Timer
- Progress indicator
- Results screen

This phase should be fully playable.

---

## Phase 2 — Polish

Add:

- Local-storage records
- Personal-best detection
- Streak indicator
- Polished animations
- Particle/confetti effects
- Mobile/touch behavior
- Accessibility improvements
- Sound effects
- Sound mute toggle
- Better result messaging

This phase should make the game feel genuinely fun.

---

## Phase 3 — Persistent Data

Add:

- Supabase
- Round history
- Per-question attempt history
- Per-fact performance history
- Secure database policies
- Graceful offline/database-failure behavior

The game should continue functioning locally if Supabase is unavailable.

---

## Phase 4 — Adaptive Practice

Add:

- Fact-level performance analysis
- Weak-fact identification
- Response-time analysis
- Adaptive question weighting
- Optional "Practice Weak Facts" mode

Only implement after real-world testing has shown that the basic game works well.

---

# Product North Star

The child should finish a round thinking:

> **"I almost beat my record. Let me try again."**

That is more important than adding lots of features.

The finished product should feel like:

**a small arcade game that happens to make multiplication facts stick.**
