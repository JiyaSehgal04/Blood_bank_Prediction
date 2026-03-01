/* ═══════════════════════════════════════════════════════════════
   GLOBAL STYLES — SRM Blood Bank Management System
   Light Formal Theme
   ═══════════════════════════════════════════════════════════════ */

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background: #F4F6F9;
    color: #111827;
    font-family: 'Inter', 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  ::-webkit-scrollbar-track {
    background: #F1F5F9;
  }
  ::-webkit-scrollbar-thumb {
    background: #CBD5E1;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #94A3B8;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }

  select option {
    background: #FFFFFF;
    color: #111827;
  }

  input::placeholder {
    color: #9CA3AF;
  }

  input:focus, select:focus {
    outline: none;
    border-color: #2563EB !important;
    box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important;
  }

  .nav-item:hover {
    background: rgba(0,0,0,0.04) !important;
  }

  .table-row:hover {
    background: #F8FAFC !important;
  }
`;
