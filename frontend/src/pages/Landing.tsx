import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STATS = [
  { value: '2,448', label: 'Blood Units Tracked' },
  { value: '8',     label: 'Blood Groups' },
  { value: '76',    label: 'Days of Training Data' },
  { value: '12',    label: 'ML Models Deployed' },
]

const FEATURES = [
  {
    icon: 'auto_graph',
    tag: 'Machine Learning',
    title: 'Demand Forecasting',
    desc: 'XGBoost and SES ensemble models predict 7-day demand across all blood groups. Cold-start ready on day one — no historical data required.',
  },
  {
    icon: 'hub',
    tag: 'Allocation Engine',
    title: 'Smart Distribution',
    desc: 'Min-heap priority queue with emergency, urgent, and routine tiers. FIFO allocation with full ABO/Rh compatibility matrix and emergency fallback.',
  },
  {
    icon: 'warning_amber',
    tag: 'Alerts & Monitoring',
    title: 'Real-time Alerts',
    desc: 'Automated expiry scanning, stock threshold monitoring, and ML-generated shortage and surplus alerts with configurable severity levels.',
  },
  {
    icon: 'upload_file',
    tag: 'Data Ingestion',
    title: 'Seamless Import',
    desc: 'Drag-and-drop Excel upload with automatic deduplication, per-row validation preview, and instant ML retraining triggered on every import.',
  },
]

const BLOOD_DIST = [
  { g: 'O+',  pct: 34.7 },
  { g: 'B+',  pct: 28.8 },
  { g: 'A+',  pct: 21.3 },
  { g: 'AB+', pct: 6.6  },
  { g: 'O−',  pct: 4.1  },
  { g: 'A−',  pct: 2.3  },
  { g: 'B−',  pct: 1.5  },
  { g: 'AB−', pct: 0.6  },
]

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const handleEnter = () => navigate(isAuthenticated ? '/dashboard' : '/login')

  return (
    <div className="min-h-screen bg-[#fbfaee] overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center px-8 py-4 bg-[#fbfaee]/90 backdrop-blur-md border-b border-[#becabc]/20">
        {/* Left pills */}
        <div className="flex items-center gap-2">
          {['Features', 'ML Engine', 'Documentation'].map((l) => (
            <button key={l} className="px-4 py-2 rounded-full text-[13px] font-medium text-[#3f493f] hover:bg-[#e9e9dd] transition-colors">
              {l}
            </button>
          ))}
        </div>

        {/* Center brand tab — drops from top */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bg-[#1b1c15] rounded-b-2xl px-7 pt-3 pb-4 flex flex-col items-center gap-1 shadow-lg">
          <span className="material-symbols-outlined text-[#79db8d] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            water_drop
          </span>
          <span className="text-white font-bold text-[13px] tracking-tight leading-none">SRM Global</span>
          <span className="text-white/40 text-[9px] font-mono uppercase tracking-widest">Blood Bank</span>
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#e9e9dd] text-[12px] font-mono text-[#3f493f]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006d30] animate-pulse" />
            System Online
          </div>
          <button
            onClick={handleEnter}
            className="flex items-center gap-2 bg-[#1b1c15] text-white px-5 py-2.5 rounded-full text-[13px] font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#1b1c15" strokeWidth="3">
                <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
              </svg>
            </span>
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-8 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: 'linear-gradient(#1b1c15 1px, transparent 1px), linear-gradient(90deg, #1b1c15 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* ── Left floating card: blood distribution ── */}
        <div className="absolute left-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-0 soft-green-panel border border-[#becabc]/30 rounded-2xl p-5 w-52 shadow-sm">
          <p className="text-[9px] font-mono uppercase tracking-widest text-[#6f7a6e] mb-3">Population Distribution</p>
          {BLOOD_DIST.map(({ g, pct }) => (
            <div key={g} className="flex items-center gap-2 mb-1.5">
              <span className="mono-data text-xs font-bold text-[#1b1c15] w-8">{g}</span>
              <div className="flex-1 h-1 bg-[#e9e9dd] rounded-full overflow-hidden">
                <div className="h-full bg-[#006d30] rounded-full" style={{ width: `${(pct / 35) * 100}%` }} />
              </div>
              <span className="text-[9px] font-mono text-[#6f7a6e] w-8 text-right">{pct}%</span>
            </div>
          ))}
        </div>

        {/* ── Right floating card: model status ── */}
        <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-3 bg-[#1b1c15] rounded-2xl p-5 w-48 shadow-lg">
          <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">ML Engine Status</p>
          {[
            { label: 'XGBoost', status: 'Active', ok: true },
            { label: 'SES Forecaster', status: 'Active', ok: true },
            { label: 'Isolation Forest', status: 'Active', ok: true },
            { label: 'Random Forest', status: 'Standby', ok: false },
          ].map(({ label, status, ok }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[11px] text-white/70">{label}</span>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${ok ? 'bg-[#006d30]/30 text-[#79db8d]' : 'bg-white/10 text-white/40'}`}>
                {status}
              </span>
            </div>
          ))}
          <div className="border-t border-white/10 pt-3 mt-1">
            <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Last retrain</p>
            <p className="text-[11px] font-mono text-white/60 mt-0.5">On upload trigger</p>
          </div>
        </div>

        {/* ── Center content ── */}
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#e9e9dd] border border-[#becabc]/40 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006d30]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#3f493f]">
              SRM Global Hospitals · Blood Bank v4.2
            </span>
          </div>

          <h1 style={{ fontFamily: "'Instrument Serif', serif" }}
            className="text-[clamp(42px,6vw,80px)] leading-[1.05] tracking-[-0.02em] text-[#1b1c15] mb-6">
            Precision Blood Management<br />
            <span className="italic text-[#006d30]">for Clinical Excellence</span>
          </h1>

          <p className="text-[#6f7a6e] text-base leading-relaxed max-w-xl mx-auto mb-10">
            Real-time inventory tracking, AI-powered demand forecasting, and intelligent
            allocation — purpose-built for hospital blood bank operations.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={handleEnter}
              className="flex items-center gap-3 bg-[#1b1c15] text-white px-8 py-4 rounded-full text-[15px] font-semibold hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200"
            >
              {isAuthenticated ? 'Open Dashboard' : 'Enter System'}
              <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1b1c15" strokeWidth="2.5">
                  <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
                </svg>
              </span>
            </button>
            {!isAuthenticated && (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 border border-[#becabc] text-[#3f493f] px-8 py-4 rounded-full text-[15px] font-medium hover:border-[#006d30] hover:text-[#006d30] transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Bottom scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#6f7a6e]">Scroll</span>
          <div className="w-px h-8 bg-[#becabc]" />
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="bg-[#1b1c15] py-14 px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="flex flex-col gap-1 border-l border-white/10 pl-6">
              <span className="mono-data text-4xl font-bold text-white">{value}</span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-white/40">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="green-stroke-bg relative py-24 px-8 bg-[#fbfaee] overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#006d30] mb-3">Capabilities</p>
            <h2 style={{ fontFamily: "'Instrument Serif', serif" }}
              className="text-[clamp(32px,4vw,52px)] leading-tight text-[#1b1c15] tracking-tight max-w-lg">
              Everything your blood bank needs, in one system.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map(({ icon, tag, title, desc }) => (
              <div key={title}
                className="group soft-green-panel border border-[#becabc]/30 rounded-2xl p-7 hover:border-[#006d30]/40 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-5">
                  <span className="w-10 h-10 rounded-xl bg-[#f5f4e8] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#006d30] text-[20px]">{icon}</span>
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-[#6f7a6e] bg-[#f5f4e8] px-3 py-1 rounded-full">
                    {tag}
                  </span>
                </div>
                <h3 className="font-headline text-lg font-bold text-[#1b1c15] mb-2">{title}</h3>
                <p className="text-[13px] text-[#6f7a6e] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPONENTS STRIP ── */}
      <section className="bg-[#f5f4e8] border-y border-[#becabc]/30 py-10 px-8 overflow-hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-8 flex-wrap">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#6f7a6e]">Blood Components Managed</p>
          {[
            { code: 'WB/PRC', name: 'Whole Blood / Packed Red Cells', shelf: '42 days' },
            { code: 'FFP',    name: 'Fresh Frozen Plasma',            shelf: '365 days' },
            { code: 'PLT',    name: 'Platelets',                      shelf: '5 days' },
          ].map(({ code, name, shelf }) => (
            <div key={code} className="flex items-center gap-4 soft-green-panel border border-[#becabc]/30 rounded-xl px-5 py-3 flex-1 min-w-[200px]">
              <span className="mono-data text-lg font-bold text-[#006d30]">{code}</span>
              <div>
                <p className="text-[12px] font-medium text-[#1b1c15]">{name}</p>
                <p className="text-[10px] font-mono text-[#6f7a6e]">Shelf life: {shelf}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="bg-[#1b1c15] py-28 px-8 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-[#006d30]/15 blur-[100px] pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#79db8d] mb-4">Get Started</p>
          <h2 style={{ fontFamily: "'Instrument Serif', serif" }}
            className="text-[clamp(32px,4vw,56px)] leading-tight text-white mb-6 tracking-tight">
            Your blood bank.<br />
            <span className="italic text-[#79db8d]">Fully in control.</span>
          </h2>
          <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-md mx-auto">
            Upload your data, run predictions, track inventory, and make faster clinical decisions — all from one secure dashboard.
          </p>
          <button
            onClick={handleEnter}
            className="inline-flex items-center gap-3 bg-[#006d30] text-white px-10 py-4 rounded-full text-[15px] font-semibold hover:bg-[#005323] hover:-translate-y-0.5 hover:shadow-2xl transition-all duration-200"
          >
            {isAuthenticated ? 'Open Dashboard' : 'Access the System'}
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>
              </svg>
            </span>
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#1b1c15] border-t border-white/5 px-8 py-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#79db8d] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
          <span className="text-white/60 text-xs font-mono uppercase tracking-widest">SRM Global Hospitals · Blood Bank v4.2.0</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-white/20 text-[11px] font-mono">Restricted Clinical System · Authorised Access Only</span>
          <button onClick={handleEnter} className="text-[#79db8d] text-[12px] font-mono hover:underline">
            {isAuthenticated ? 'Dashboard →' : 'Sign In →'}
          </button>
        </div>
      </footer>

    </div>
  )
}
