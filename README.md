#  Hifzi: The Intelligent Quran Companion

> "How can technology help people stay connected with the Quran consistently, not only during Ramadan?"

**Hifzi** is a premium, data-driven mobile application designed to transform the Quran journey from a seasonal effort into a lifelong habit. By combining behavioral science, adaptive learning algorithms, and the Quran Foundation API ecosystem, Hifzi provides a seamless, high-fidelity experience for students of the Quran.

---

##  Table of Contents
- [Introduction](#-introduction)
- [Key Features](#-key-features)
- [API Integration](#-api-integration)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Setup & Installation](#-setup--installation)
- [Judging Criteria Alignment](#-judging-criteria-alignment)
- [License](#-license)

---

##  Introduction

For many, reconnecting with the Quran during Ramadan is a spiritual peak, but for serious **Hifz and Muraja students**, the challenge is daily and lifelong. Every student knows the "fading memory" anxiety—the fear that a page mastered months ago is slowly becoming "blurred" or forgotten. Without a structured, data-driven revision system, even the most dedicated struggle to maintain their progress.

**Hifzi** solves this by acting as an intelligent digital companion for the student of the Quran. It introduces the **"Heart Heatmap"**—a specialized visualization engine that tracks the "quality" of your memorization. It identifies exactly which pages are fading and intelligently prompts you to revise before they become "cold." Hifzi doesn't just show you text; it mentors you through the complex lifecycle of a Hafiz, using AI for deep contextual understanding and habit-stacking to ensure your connection with the Quran is both consistent and eternal.

---

##  Key Features

### Adaptive Planning & Mastery
- **Hifz & Muraja Tracks**: Separate workflows for new memorization and revision, ensuring both are handled with equal priority.
- **Heart Heatmap**: A stunning visualization of your progress. Pages change color (Green to Red) based on your performance and time passed, alerting you to "cold" spots that need attention.
- **Weekly Evaluations**: AI-driven weekly summaries that analyze your performance and suggest adaptations to your plan.

###  Intelligent Engagement
- **AI Quran Mentor**: An integrated chat system that allows users to ask questions about Tafsir, context, or memorization tips, powered by Quran Foundation content.
- **Interactive Mushaf**: High-fidelity Mushaf reader with instant access to translations, tafsirs, and audio recitations.

###  Behavioral Engineering
- **Habit Stacking**: Seamlessly integrate Quran reading into your daily routine with smart notifications and triggers.
- **Frictionless Action**: Direct "Jump to Mushaf" cards on the dashboard ensure you are only one tap away from your next ayah.
- **Gamification**: Earn XP, level up, and unlock unique badges as you reach milestones.

---

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

##  Technology Stack

- **Frontend**: [Expo](https://expo.dev/) / React Native (TypeScript)
- **Styling**: NativeWind (Tailwind CSS for Native)
- **Animations**: Reanimated 3 for smooth, premium transitions.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) for lightweight, high-performance global state.
- **Database**: [SQLite](https://www.sqlite.org/index.html) with [Drizzle ORM](https://orm.drizzle.team/) for a robust, offline-first local experience.
- **Backend**: [Supabase](https://supabase.com/) for Auth, Edge Functions, and Remote Data Sync.

---

##  Database Architecture (Local-First)

Hifzi uses an offline-first architecture with **SQLite** and **Drizzle ORM**, ensuring that students can track their progress even without an internet connection.

### Core Entities:
- **Plans (`hifz_plans`, `muraja_plans`)**: Stores personalized memorization and revision goals, directions, and adaptive schedules.
- **Logs (`hifz_logs`, `muraja_logs`)**: Daily performance records including pages completed, quality scores, and mistake/hesitation counts.
- **Mastery Tracking (`page_performance`)**: Fine-grained tracking of individual page mastery used to drive the **Heart Heatmap**.
- **Gamification (`user_stats`, `badges`)**: Persistent storage for XP, levels, and earned achievements.
- **Notifications & Sync**: Local queues for smart reminders and Supabase sync status.

---

##  Project Structure

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

##  Setup & Installation

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

##  Judging Criteria Alignment

- **Impact on Quran Engagement (30 pts)**: Hifzi directly addresses the retention challenges of Hifz and Muraja students with adaptive revision schedules and neurological "Heatmap" tracking, ensuring a lifelong, consistent bond with the Quran.
- **Product Quality & UX (20 pts)**: Features a premium, high-fidelity aesthetic, modern typography (Rosemary/Uthman), and smooth micro-animations.
- **Technical Execution (20 pts)**: Uses a local-first architecture with SQLite/Drizzle for near-instant load times and offline reliability.
- **Innovation (15 pts)**: The "Heart Heatmap" is a fresh take on progress visualization, moving beyond simple bars to a more intuitive "mastery" view.
- **Effective Use of APIs (15 pts)**: Full-spectrum use of QF Content and User APIs, unified through a performant proxy layer.

---

##  License

Copyright (C) 2026. Built with ❤️ for the Quran Foundation Hackathon.
Licensed under the MIT License.
