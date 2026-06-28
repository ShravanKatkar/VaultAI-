# 🎨 VaultAI Frontend - Premium Glassmorphism UI Dashboard

The frontend of VaultAI is a premium, high-fidelity, and fully responsive dashboard built using React, Vite, and custom CSS styling. It features modern glassmorphism UI elements, SVG-based real-time telemetry, canvas particles, and 3D interactions.

---

## ✨ Features & Visual Interactions

*   **🌌 Dynamic Particle Canvas**: An animated, low-overhead JavaScript particle network running on a 2D HTML5 Canvas, drawing links between proximity nodes to simulate a neural document network.
*   **🔮 3D Vault Orb**: A rotating 3D Three.js wireframe sphere representing your secure document vault. It dynamically tilts in response to your mouse hover movement.
*   **⚡ Real-Time Streaming Telemetry**: Telemetry readouts for chatbot responses, displaying:
    *   **Time-to-First-Token (TTFT)** in seconds.
    *   **Token generation speed** (tokens/sec).
    *   **Throughput History Sparkline**: An inline SVG path computing a smooth Bezier representation of token delivery speed over time.
*   **📊 Semicircle Gauge Charts**: Custom CSS and SVG-driven semicircle gauges that visualize Hit@3 and ROUGE-L scores with neon glow filters.
*   **🎉 Interactive Confetti Celebration**: Triggers a physics-based canvas confetti explosion from the "Run Evaluation" button upon successful pipeline benchmark completion.

---

## 📁 Project Structure

All files have been converted from TypeScript to standard JavaScript and React JSX to ensure clean, readable code:

```text
src/
├── components/
│   ├── 3D/
│   │   ├── Aurora.jsx        # Drifting multi-colored ambient background blobs
│   │   ├── RAGFlow.jsx        # Interactive SVG pipeline workflow diagram
│   │   └── VaultOrb.jsx       # Three.js 3D wireframe mesh orb visualizer
│   ├── Chat/
│   │   └── ChatPanel.jsx      # Core chat panel, custom parser, code copy block
│   ├── Sidebar/
│   │   └── Sidebar.jsx        # Ingestion drag-and-drop zone and settings panel
│   └── Upload/
│       └── UploadModal.jsx    # Draggable overlay modal showing parsing stages
├── hooks/
│   ├── use3DTilt.js          # Computes custom 3D card tilt based on mouse coordinates
│   ├── useTheme.js           # Theme provider toggle
│   └── useUpload.js          # Handles multipart file uploader requests
├── pages/
│   ├── EvalDashboard.jsx      # Recharts latency and metrics dashboard
│   └── Landing.jsx            # Animated home screen & tech stack marquee
├── App.jsx                    # Routing and layout assembly
├── config.js                  # Dynamic API base URL resolver (127.0.0.1 loopback)
├── index.css                  # UI theme tokens, glassmorphism layouts, CSS variables
└── main.jsx                   # React root mount
```

---

## 🛠️ Design System & Theme Tokens

All styles are defined natively inside [index.css](file:///c:/Users/shara/OneDrive/Desktop/VaultAI/frontend/src/index.css) using custom CSS variables (design tokens):

```css
:root {
  --bg-dark: #0A0A0F;
  --bg-surface: rgba(20, 20, 30, 0.45);
  
  /* Primary Accent Colors */
  --accent-purple: #7C3AED;
  --accent-teal: #0D9488;
  
  /* Borders and Panels */
  --border-subtle: rgba(255, 255, 255, 0.04);
  --border-default: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.15);
  
  /* Shadows and Glows */
  --shadow-glow-purple: 0 0 20px rgba(124, 58, 237, 0.15);
}
```

---

## 🚀 Setup & Execution

### Prerequisites
*   **Node.js** (v18+)
*   **NPM** (v9+)

### Installation
Install dependencies:
```bash
npm install
```

### Run Developer Server
Starts the hot-reloading development server at `http://localhost:3000`:
```bash
npm run dev
```

### Production Build
Builds the static application files to the `dist/` directory, optimized and minified:
```bash
npm run build
```
*(FastAPI automatically serves this `dist/` directory when the backend is run in unified mode).*
