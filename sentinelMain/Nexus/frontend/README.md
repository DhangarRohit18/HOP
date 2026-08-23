# NEXUS React Frontend Foundation

This is the React + TypeScript + Vite frontend application for the **NEXUS Autonomous Disruption Control Platform** (Phase 1).

---

## Technical Stack
- **Framework**: React 18 & Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Vitest

---

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── HealthStatusCard.tsx   # Status card component for services
│   ├── services/
│   │   └── api.ts                 # Health API service fetcher
│   ├── types/
│   │   └── health.ts              # TypeScript interfaces for health payloads
│   ├── App.tsx                    # Minimal NEXUS foundation dashboard
│   ├── App.test.tsx               # Vitest basic service test
│   ├── main.tsx                   # React root entrypoint
│   └── index.css                  # Tailwind CSS styling directives
├── index.html                     # HTML root page
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## Local Setup & Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Access the frontend at `http://localhost:5173`.

3. **Run Unit Tests**:
   ```bash
   npm test
   ```

4. **Build Production Bundle**:
   ```bash
   npm run build
   ```
