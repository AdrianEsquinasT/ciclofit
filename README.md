# CicloFit
PWA (React + TypeScript + Vite). Datos 100% locales (localStorage), sin backend.

    npm install
    npm run dev       # desarrollo
    npm run build     # genera dist/ (desplegable en Netlify/Vercel/GitHub Pages)

iPhone: abrir la URL en Safari > Compartir > "Añadir a pantalla de inicio".
App nativa (futuro): Capacitor (`npm i @capacitor/core @capacitor/ios`, `npx cap add ios`), requiere Mac + Xcode.

Lógica: src/cycle.ts (fases) · src/guidance.ts (porcentajes y recomendaciones, editables).
