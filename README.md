# Hifzi: The Intelligent Quran Companion

> "How can technology help people stay connected with the Quran consistently, not only during Ramadan?"

**Hifzi** is a premium, data-driven mobile application designed to transform the Quran journey from a seasonal effort into a lifelong habit. By combining behavioral science, adaptive learning algorithms, and the Quran Foundation API ecosystem, Hifzi provides a seamless, high-fidelity experience for students of the Quran.





<table align="center">
  <tr>
    <td width="25%" align="center" style="padding: 5px; vertical-align: top;">
      <img src="https://github.com/user-attachments/assets/e37b6629-08a4-4451-9a4d-4de7931a3e67" width="100%" alt="prof1" />
    </td>
    <td width="25%" align="center" style="padding: 5px; vertical-align: top;">
      <img src="https://github.com/user-attachments/assets/1423d1d0-2adc-4806-a98e-59e7b2dcc9f8" width="100%" alt="prof2" />
    </td>
    <td width="25%" align="center" style="padding: 5px; vertical-align: top;">
      <img src="https://github.com/user-attachments/assets/d8351f26-5a1c-4cf9-a8e9-0ba4be319549" width="100%" alt="prof3" />
    </td>
    <td width="25%" align="center" style="padding: 5px; vertical-align: top;">
      <img src="https://github.com/user-attachments/assets/b26b9aee-cadd-4340-b909-f11ff5b469c0" width="100%" alt="prof4" />
    </td>
  </tr>
  <tr>
    <td width="25%" align="center" style="padding: 5px; vertical-align: top;">
      <img src="https://github.com/user-attachments/assets/d4696d43-af23-42fd-a58c-d0cadddfb424" width="100%" alt="prof5" />
    </td>
    <td width="25%" align="center" style="padding: 5px; vertical-align: top;">
      <img src="https://github.com/user-attachments/assets/53b60375-b387-452b-b6b4-ec45a4d9c82a" width="100%" alt="prof6" />
    </td>
    <td width="25%" align="center" style="padding: 5px; vertical-align: top;">
      <img src="https://github.com/user-attachments/assets/f6cf5ba0-a805-4b3a-86cc-f872baffaf3d" width="100%" alt="prof7" />
    </td>
    <td width="25%" align="center" style="padding: 5px; vertical-align: top;">
      <img src="https://github.com/user-attachments/assets/d8264da4-74bb-481e-9c35-63662cba4d13" width="100%" alt="prof8" />
    </td>
  </tr>
</table>

---

## Table of Contents
- [Introduction](#introduction)
- [Key Features](#key-features)
- [API Integration](#api-integration)
- [Technology Stack](#technology-stack)
- [Database Architecture](#database-architecture)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup-installation)
- [Judging Criteria Alignment](#judging-criteria)
- [License](#license)

---

<a name="introduction"></a>
## Introduction

For many, reconnecting with the Quran during Ramadan is a spiritual peak, but for serious **Hifz and Muraja students**, the challenge is daily and lifelong. Every student knows the "fading memory" anxiety—the fear that a page mastered months ago is slowly becoming "blurred" or forgotten. Without a structured, data-driven revision system, even the most dedicated struggle to maintain their progress.

**Hifzi** solves this by acting as an intelligent digital companion for the student of the Quran. It introduces the **"Heart Heatmap"**—a specialized visualization engine that tracks the "quality" of your memorization. It identifies exactly which pages are fading and intelligently prompts you to revise before they become "cold." Hifzi doesn't just show you text; it mentors you through the complex lifecycle of a Hafiz, using AI for deep contextual understanding and habit-stacking to ensure your connection with the Quran is both consistent and eternal.

---

<a name="key-features"></a>
## Key Features

### Adaptive Planning & Mastery
- **Hifz & Muraja Tracks**: Separate workflows for new memorization and revision, ensuring both are handled with equal priority.
- **Heart Heatmap**: A stunning visualization of your progress. Pages change color (Green to Red) based on your performance and time passed, alerting you to "cold" spots that need attention.
- **Weekly Evaluations**: AI-driven weekly summaries that analyze your performance and suggest adaptations to your plan.

### Intelligent Engagement
- **AI Quran Mentor**: An integrated chat system that allows users to ask questions about Tafsir, context, or memorization tips, powered by Quran Foundation content.
- **Interactive Mushaf**: High-fidelity Mushaf reader with instant access to translations, tafsirs, and audio recitations.

### Behavioral Engineering
- **Habit Stacking**: Seamlessly integrate Quran reading into your daily routine with smart notifications and triggers.
- **Frictionless Action**: Direct "Jump to Mushaf" cards on the dashboard ensure you are only one tap away from your next ayah.
- **Gamification**: Earn XP, level up, and unlock unique badges as you reach milestones.

---

<a name="api-integration"></a>
## 🛠 API Integration

Hifzi demonstrates deep integration with the **Quran Foundation API ecosystem**, meeting and exceeding all technical requirements.

### 1. Content API (The "Understanding" Layer)
- **Quran APIs (Uthmani)**: Dynamically fetches Uthmani typography for an authentic Mushaf experience.
- **Audio APIs**: High-quality recitations for auditory learning and reinforcement.
- **Translation APIs**: Multi-translator support (e.g., Saheeh International, Clear Quran) with side-by-side comparison.
- **Proxy Architecture**: Implemented a custom Supabase Edge Function (`qf-proxy`) to handle secure, performant API requests with offline-first caching.

### 2. User API (The "Personalization" Layer)
- **Bookmarks**: Seamlessly sync favorite verses and progress across the Quran Foundation ecosystem, ensuring a unified experience.

---

<a name="technology-stack"></a>
## Technology Stack

- **Frontend**: [Expo](https://expo.dev/) / React Native (TypeScript)
- **Styling**: NativeWind (Tailwind CSS for Native)
- **Animations**: Reanimated 3 for smooth, premium transitions.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) for lightweight, high-performance global state.
- **Database**: [SQLite](https://www.sqlite.org/index.html) with [Drizzle ORM](https://orm.drizzle.team/) for a robust, offline-first local experience.
- **Backend**: [Supabase](https://supabase.com/) for Auth, Edge Functions, and Remote Data Sync.

---

<a name="database-architecture"></a>
## Database Architecture (Local-First)

Hifzi uses an offline-first architecture with **SQLite** and **Drizzle ORM**, ensuring that students can track their progress even without an internet connection.

### Core Entities:
- **Plans (`hifz_plans`, `muraja_plans`)**: Stores personalized memorization and revision goals, directions, and adaptive schedules.
- **Logs (`hifz_logs`, `muraja_logs`)**: Daily performance records including pages completed, quality scores, and mistake/hesitation counts.
- **Mastery Tracking (`page_performance`)**: Fine-grained tracking of individual page mastery used to drive the **Heart Heatmap**.
- **Gamification (`user_stats`, `badges`)**: Persistent storage for XP, levels, and earned achievements.
- **Notifications & Sync**: Local queues for smart reminders and Supabase sync status.

---

<a name="project-structure"></a>
## Project Structure

```bash
hifzi/
├── app/                   # Expo Router (File-based navigation)
│   ├── (app)/             # Authenticated routes (Dashboard, Reader, AI Chat)
│   ├── (auth)/            # Authentication screens
│   └── _layout.tsx        # Global providers & setup
├── src/
│   ├── features/          # Domain-driven feature modules
│   │   ├── quran/         # Mushaf, Reader, Services
│   │   ├── hifz/          # Memorization planning & logic
│   │   ├── muraja/        # Revision systems & Heatmap
│   │   └── ai/            # AI Mentorship & Chat services
│   ├── components/        # Reusable UI primitives (atomic design)
│   ├── services/          # Core business logic (Gamification, Mastery, Performance)
│   ├── database/          # SQLite schema & Drizzle migrations
│   └── hooks/             # Custom React hooks
├── supabase/              # Edge Functions & Backend config
├── assets/                # Typography (Uthman font) & Images
└── package.json           # Dependencies & scripts
```

---

<a name="setup-installation"></a>
## Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/devhan-abdu/hifzi
   cd hifzi
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment**:
   Create a `.env` file with your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

4. **Start the development server**:
   ```bash
   npx expo start
   ```

---

<a name="judging-criteria"></a>
## Judging Criteria Alignment

- **Impact on Quran Engagement (30 pts)**: Hifzi directly addresses the retention challenges of Hifz and Muraja students with adaptive revision schedules and neurological "Heatmap" tracking, ensuring a lifelong, consistent bond with the Quran.
- **Product Quality & UX (20 pts)**: Features a premium, high-fidelity aesthetic, modern typography (Rosemary/Uthman), and smooth micro-animations.
- **Technical Execution (20 pts)**: Uses a local-first architecture with SQLite/Drizzle for near-instant load times and offline reliability.
- **Innovation (15 pts)**: The "Heart Heatmap" is a fresh take on progress visualization, moving beyond simple bars to a more intuitive "mastery" view.
- **Effective Use of APIs (15 pts)**: Full-spectrum use of QF Content and User APIs, unified through a performant proxy layer, along with deep integration of the Quran Foundation's Quran-trained AI via Model Context Protocol (MCP) for our interactive chat system.

---

<a name="license"></a>
## License

Copyright (C) 2026. Built with ❤️ for the Quran Foundation Hackathon.
Licensed under the MIT License.
