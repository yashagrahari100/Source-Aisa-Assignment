# Flight Management Web App (PWA) — Technical Assignment Submission

Welcome to the **Flight Management Web App**! This application is built as a highly responsive, production-ready Progressive Web App (PWA) using Next.js 14 (App Router), Supabase (PostgreSQL, Realtime, & Auth), Zustand state management, and Tailwind CSS.

---

## 🚀 Deployed URL & Source Code
* **GitHub Repository**: [yashagrahari100/Source-Aisa-Assignment](https://github.com/yashagrahari100/Source-Aisa-Assignment)
* **Vercel Live URL**: [https://source-aisa-assignment.vercel.app/]
---

## 🔐 Test Credentials (HR & Reviewer Access)

Use the pre-registered credentials below to sign in and test the booking funnel, seat selection, and booking management flows:

| Field | Value |
| :--- | :--- |
| **Test Email** | `tidica7504@marineso.com` |
| **Test Password** | `admin123` |

> [!NOTE]
> You can also create a new account using the built-in SignUp screen. Email verification is automatically handled or bypassed for testing convenience.

---

## ✨ Key Features & Technical Highlights

1. **Flexible & Dynamic Flight Search (JIT Insertion)**
   * Avoids the "no flights found" bottleneck. The search engine dynamically spawns and seeds mock flights for **any** selected route and date combo using standard major international hubs (`JFK`, `LHR`, `CDG`, `HND`, `DXB`, etc.).

2. **Realtime Seat Map & Cabin Classes**
   * High-fidelity, interactive seat grid with three cabin classes: **First Class**, **Business Class**, and **Economy Class**.
   * Instant seat availability checks and live updates synchronized via Supabase PostgreSQL triggers.

3. **Instant Loading (Stale-While-Revalidate Caching)**
   * Avoids annoying UI flashes or blank loaders. The **My Bookings** page is hydrated immediately from the local Zustand offline cache on mount, while updating with fresh data from the Supabase database in the background.

4. **Secure Offline Persistence**
   * Fully persistent user session state using Zustand local store middleware.
   * **Privacy First**: Sensitive data (such as passport numbers or traveler identification) is strictly filtered out and never persisted in standard unencrypted localStorage cache.

5. **Safe Rescheduling & Cancellations**
   * Database-level triggers and Remote Procedure Calls (RPC) ensure data integrity. Cancelling or rescheduling a flight automatically frees/reassigns the seat and reconciles booking states safely.

## 📊 Lighthouse & PWA Audit Results

Below is the Lighthouse performance, PWA, SEO, and Best Practices audit result for the application:

![Lighthouse Audit Result](/public/lighthouse-result.png)

---


## 🛠️ Local Development Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yashagrahari100/Source-Aisa-Assignment.git
   cd Source-Aisa-Assignment
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root folder with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_api_key
   ```

4. **Run the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.
