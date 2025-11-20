# Tripp's Tricky Tetraverse: an All Four You Kids’ Arcade

In honour of Tripp's Fourth Birthday, I nixed a boring old card and took a stab at developing a kid-friendly arcade of web games with gentle screen-time tools, a parent info overlay, and simple skill snapshots based on how kids play.

---

## 🎮 What’s Inside?

This app is designed for young kids (roughly 3–10) to tap around and have fun while parents stay in control of time and context.

### Games (The “Arcade”)

Each game appears in an animated carousel with:

- A **catchy title**
- A one-line **description**
- The key **skills it builds**
- Difficulty label and skill **category**

Current games:

1. **Match the Pairs (Memory Game)**  
   Flip cards two at a time and try to remember where each picture is hiding.

   - Skills: Memory, focus, pattern spotting
   - Category: Memory

2. **Looking for Long Shorty's Loot (Digging Game)**  
   Tap squares in a little grid to “dig” and find the pirate treasure.

   - Skills: Patience, guessing, pirate luck
   - Category: Problem Solving

3. **Isabelle’s Boots**  
   Isabelle wants matching colorful boots. Kids tap to pick boots that match the target color.

   - Skills: Color matching, attention to detail
   - Category: Attention & Coordination

4. **Airplane Catch**  
   Tap the planes as they “float” across the screen and catch them all.

   - Skills: Hand-eye coordination, reaction time
   - Category: Attention & Coordination

Each game reports a simple score and number of attempts back to the main app.

> **Note:** All scores and “skill” labels are playful and approximate. They are **not** medical, psychological, or educational assessments.

---

## 👦 Player Profiles & Avatars

Kids can create a simple profile:

- **Name** (first name or nickname)
- **Age** (used only for light “compared to kids your age” messages)
- **Avatar:**
  - Choose from a **built-in avatar library** (cute emoji-style options)
  - Or **upload a photo** from this device

Avatar options:

- Built-in: emoji-based avatar pills like `🚀`, `🦕`, `🦄`, `🧑‍✈️`
- Upload: a local image file; a preview appears in the profile card

> **Privacy:** Avatar uploads never leave the browser. There is no backend, no database, and no tracking.

---

## ⏱ Screen Time & Safety

Parents can set a **screen-time limit** in minutes.

- When a limit is set, a countdown starts.
- When time runs out:
  - Games are **locked** automatically.
  - A kid-friendly message suggests taking a break (stretch, snack, book).
- The current remaining time is always visible:
  - Example: `⏱ 5m 32s remaining`

You can update the limit at any time:

- Setting a new limit restarts the timer.
- Setting 0 or leaving it blank effectively turns off the timer.

### Safety Principles

- No ads
- No sign-up
- No external links for kids to tap
- No chat or messaging
- No violence, gore, jumpscares, or adult themes

> This app is not a babysitter or a diagnostic tool. It’s just a small set of gentle games to sprinkle into a kid’s day.

---

## 👨‍👩‍👧 Parent Overlay

There is a **“For Parents”** button in the top-right header.

- Opens a modal (overlay) with:
  - A clear explanation of:
    - Screen-time tools
    - Data/privacy (no remote storage)
    - That the “skill snapshot” is **not** assessment
  - Gentle guidance:
    - Encourage parents to stay nearby
    - Remind that offline activities and real-world connection are more important than screen time

Parents can close the overlay with a single primary button (`Got it – let’s play`).

---

## 📈 “Performance vs Age Group” Snapshot

The app tracks simple high-level statistics:

- **Memory**
- **Problem Solving**
- **Attention & Coordination**

For each game:

- It logs a **score** (0–100-ish) and **attempts**.
- Scores are purely local and based on:
  - Number of attempts
  - How quickly correct actions happen

Then it synthesizes a one-line summary like:

> “Memory: You’re above many kids your age. Attention & Coordination: You’re right around other kids your age.”

Important:

- These comparisons are **fake baselines** (simple thresholds built into the app).
- They are meant to be **encouraging**, not evaluative.
- The app does **not** compare children to any real population or dataset.

---

## 🧱 Tech Stack

- **Frontend:** React + TypeScript (e.g. Vite React + TS template)
- **Styles:** Global CSS defined in `index.html`:
  - Dark, arcade-like, green-accent theme
  - Responsive layout for phones, tablets, and desktops
- **Accessibility:**
  - Semantic headings and regions
  - ARIA labels for grids, cards, buttons, and dialog
  - Focus outlines for inputs and interactive elements
  - Color contrast tuned for dark background
- **Sounds:**
  - Uses `<audio>` via `new Audio(...)` for:
    - Button clicks
    - Successful actions
    - Failed attempts

You provide the actual sound files as `.mp3`s in `public/sounds`.

Recommended filenames (to match the existing code):

- `public/sounds/click.mp3`
- `public/sounds/success.mp3`
- `public/sounds/fail.mp3`

You can use any short sounds you like!

---

## 🗂 Project Structure (Minimal Example)

If you scaffold with Vite (React + TypeScript), a typical shape is:

```text
all-four-you-arcade/
├─ index.html          
├─ package.json
├─ public/
│  └─ sounds/
│     ├─ click.mp3
│     ├─ success.mp3
│     └─ fail.mp3
└─ src/
   ├─ main.tsx
   └─ App.tsx          
____


## Music attributions

Background music tracks used (place matching `mp3` files in `public/sounds/`):

- **Tides & Smiles** — Moavii
  - Source: https://freetouse.com/music
  - Attribution: Music track: Tides & Smiles by Moavii — Copyright Free Background Music

- **Happy Day** — Aylex
  - Source: https://freetouse.com/music
  - Attribution: Music track: Happy Day by Aylex — No Copyright Vlog Music for Videos

- **Playful** — Chill Pulse
  - Source: https://freetouse.com/music
  - Attribution: Music track: Playful by Chill Pulse — Copyright Free Music for Video

- **Chill Pulse** (track) — Chill Pulse
  - Source: https://freetouse.com/music
  - Attribution: Music track provided via Free to Use music collections

- **Love in Japan** — Milky Wayvers
  - Source: https://freetouse.com/music
  - Attribution: Music track: Love in Japan by Milky Wayvers — Free To Use Music for Video

When publishing, ensure licensing and attribution requirements from each source are followed.

````

## 🚀 Planned & Future Features (notes for parents & contributors)

- **Emotion tracking (future):** We plan to explore an optional, local (on-device) emotion-tracking pipeline that can detect stress or frustration signals while a child plays. Any such feature will be opt-in, privacy-first, and described in detail before use.

- **AI-driven suggestions (future):** Based on observed patterns (e.g., repeated difficulty with a particular skill), the app will be able to suggest real-world activities parents can do with their child to support growth in that area.

- **Exportable reports & infographics (future):** Parents will be able to export time-filtered reports (weekly/monthly), including simple infographics, accomplishments, and suggested next steps for play-based learning.

- **Points & Prize Shop:** A built-in point economy will let kids earn points from games and either save them or cash them in via a simulated prize shop. This is a playful mechanism to bridge in-app success with real-life rewards.

- **Per-player learning profiles:** The app tracks which pedagogical goals and multiple-intelligences are practiced during play. These are stored locally and shown in a lightweight parental report; no data is sent anywhere by default.

If you want help implementing any of the above or running experiments with anonymized, opt-in telemetry for research, open an issue or reach out.

## Contact & Contributing

If you'd like direct help, open an issue on the repo above or send a short note!

- **GitHub:** [https://github.com/ashleyer](https://github.com/ashleyer)
- **Email:** [ashleye.romano@gmail.com](mailto:ashleye.romano@gmail.com)

---

## Built with ❤️ in Boston by AER
