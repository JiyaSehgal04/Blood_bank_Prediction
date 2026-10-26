import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import logo from '../assets/srm-logo.png'

const HELPLINE = '96444 96444'
const HELPLINE_TEL = 'tel:+919644496444'
const EMAIL = 'info@srmglobalhospitals.com'

const STATS = [
  { value: '24×7', label: 'Blood bank monitoring' },
  { value: '8',    label: 'Blood groups tracked' },
  { value: '3',    label: 'Components managed' },
  { value: '7-day', label: 'Demand forecasting' },
]

const HELP = [
  { icon: 'bloodtype',       title: 'Find blood',        desc: 'Check which blood groups and components are in stock for a patient.', href: '#availability' },
  { icon: 'volunteer_activism', title: 'Become a donor', desc: 'Donate blood and help us keep every group stocked for emergencies.',  href: '#donate' },
  { icon: 'emergency',       title: 'Emergency request', desc: 'Need blood urgently? Call our helpline and we will respond at once.', href: HELPLINE_TEL },
  { icon: 'support_agent',   title: 'Contact blood bank', desc: 'Questions about donation, compatibility or availability.',           href: `mailto:${EMAIL}` },
]

const COMPONENTS = [
  { code: 'WB / PRC', name: 'Whole Blood / Packed Red Cells', shelf: '42 days' },
  { code: 'FFP',      name: 'Fresh Frozen Plasma',            shelf: '365 days' },
  { code: 'PLT',      name: 'Platelets',                      shelf: '5 days' },
]

const GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O−', 'A−', 'B−', 'AB−']

const DEPARTMENTS = [
  { icon: 'bloodtype',    name: 'Blood Bank' },
  { icon: 'emergency',    name: 'Emergency & Trauma' },
  { icon: 'cardiology',   name: 'Cardiology' },
  { icon: 'oncology',     name: 'Oncology' },
  { icon: 'pregnant_woman', name: 'Maternity' },
  { icon: 'neurology',    name: 'Neurosciences' },
  { icon: 'nephrology',   name: 'Nephrology' },
  { icon: 'orthopedics',  name: 'Orthopaedics' },
]

const STORIES = [
  { tag: 'Donation', title: 'Every donation can save up to three lives', desc: 'Whole blood is separated into red cells, plasma and platelets so one donor can help several patients.' },
  { tag: 'Safety',   title: 'Matched, tracked and checked before it reaches a patient', desc: 'ABO/Rh compatibility, expiry tracking and first-expiring-first-out allocation protect every transfusion.' },
  { tag: 'Planning', title: 'Forecasting demand so the shelves are never empty', desc: 'Machine-learning forecasts flag likely shortages and surplus days ahead of time.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const handleAdmin = () => navigate(isAuthenticated ? '/dashboard' : '/login')

  return (
    <div className="min-h-screen bg-white text-[#2e2157] overflow-x-hidden">

      {/* ── EMERGENCY STRIP ── */}
      <div className="bg-[#492880] text-white text-[12px]">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between gap-4 flex-wrap">
          <a href={HELPLINE_TEL} className="flex items-center gap-2 font-semibold hover:underline">
            <span className="material-symbols-outlined text-[16px]">call</span>
            Helpline {HELPLINE}
          </a>
          <div className="flex items-center gap-5 text-white/80">
            <a href={`mailto:${EMAIL}`} className="hover:text-white">{EMAIL}</a>
            <a href="#availability" className="hover:text-white">Blood availability</a>
          </div>
        </div>
      </div>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#d9d0ea]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-8">
          <img src={logo} alt="SRM Global Hospitals" className="h-10 w-auto" />
          <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[#4a4466]">
            <a href="#help" className="hover:text-[#6B4A98]">How can we help</a>
            <a href="#availability" className="hover:text-[#6B4A98]">Blood Bank</a>
            <a href="#departments" className="hover:text-[#6B4A98]">Departments</a>
            <a href="#stories" className="hover:text-[#6B4A98]">Stories</a>
            <a href="#contact" className="hover:text-[#6B4A98]">Contact</a>
          </nav>
          <button
            onClick={handleAdmin}
            className="ml-auto flex items-center gap-2 bg-[#6B4A98] hover:bg-[#492880] text-white px-5 py-2.5 rounded-md text-[14px] font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
            {isAuthenticated ? 'Go to Dashboard' : 'Admin Login'}
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-br from-[#492880] via-[#6B4A98] to-[#294C98] text-white overflow-hidden">
        <div className="absolute -right-24 -top-24 w-[420px] h-[420px] rounded-full bg-white/5" />
        <div className="absolute right-24 bottom-[-120px] w-[320px] h-[320px] rounded-full bg-white/5" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-[1.3fr_1fr] gap-12 items-center">
          <div>
            <p className="text-[12px] uppercase tracking-[0.25em] text-white/70 mb-5">SRM Global Hospitals · Blood Bank</p>
            <h1 className="font-headline text-[clamp(34px,5vw,60px)] font-extrabold leading-[1.08] tracking-tight mb-6">
              Caring for life,<br />every drop counts.
            </h1>
            <p className="text-white/80 text-lg leading-relaxed max-w-xl mb-9">
              A safe, well-stocked blood bank for every patient — tracked in real time, matched with care and ready when it matters most.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#availability" className="bg-white text-[#492880] px-7 py-3.5 rounded-md font-semibold hover:bg-[#f3effa] transition-colors">
                View blood availability
              </a>
              <a href={HELPLINE_TEL} className="border border-white/50 px-7 py-3.5 rounded-md font-semibold hover:bg-white/10 transition-colors">
                Call helpline
              </a>
            </div>
          </div>
          {/* Image slot: replace this panel with a hospital photo when one is available */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-64 h-64 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 120, fontVariationSettings: "'FILL' 1" }}>water_drop</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── NUMBERS STRIP ── */}
      <section className="bg-[#f9f6fd] border-b border-[#d9d0ea]">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="border-l-2 border-[#6B4A98] pl-5">
              <div className="font-headline text-3xl font-extrabold text-[#492880]">{value}</div>
              <div className="text-[13px] text-[#6b6680] mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW CAN WE HELP ── */}
      <section id="help" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-[#492880] mb-3">How can we help?</h2>
        <p className="text-[#6b6680] mb-10 max-w-xl">Choose what you need and we will point you in the right direction.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {HELP.map(({ icon, title, desc, href }) => (
            <a key={title} href={href}
              className="group bg-white border border-[#d9d0ea] rounded-xl p-6 hover:border-[#6B4A98] hover:shadow-lg transition-all">
              <span className="w-12 h-12 rounded-lg bg-[#f3effa] group-hover:bg-[#6B4A98] flex items-center justify-center mb-5 transition-colors">
                <span className="material-symbols-outlined text-[#6B4A98] group-hover:text-white text-[26px]">{icon}</span>
              </span>
              <h3 className="font-headline font-bold text-lg text-[#2e2157] mb-2">{title}</h3>
              <p className="text-[14px] text-[#6b6680] leading-relaxed">{desc}</p>
            </a>
          ))}
        </div>
      </section>

      {/* ── BLOOD BANK / AVAILABILITY ── */}
      <section id="availability" className="bg-[#f9f6fd] border-y border-[#d9d0ea]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-[#492880] mb-3">Our blood bank</h2>
          <p className="text-[#6b6680] mb-10 max-w-2xl">
            We store and issue all eight blood groups across three components. Live stock levels are available to hospital staff through the admin dashboard — call the helpline to confirm availability for a patient.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {COMPONENTS.map(({ code, name, shelf }) => (
              <div key={code} className="bg-white border border-[#d9d0ea] rounded-xl p-6">
                <div className="font-headline text-2xl font-extrabold text-[#6B4A98] mb-1">{code}</div>
                <div className="text-[14px] font-medium text-[#2e2157]">{name}</div>
                <div className="text-[12px] text-[#6b6680] mt-2">Shelf life: {shelf}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {GROUPS.map((g) => (
              <span key={g} className="w-16 h-16 rounded-full bg-white border-2 border-[#6B4A98] text-[#492880] flex items-center justify-center font-headline font-extrabold text-lg">
                {g}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPARTMENTS ── */}
      <section id="departments" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-[#492880] mb-10">Departments we support</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {DEPARTMENTS.map(({ icon, name }) => (
            <div key={name} className="flex items-center gap-3 border border-[#d9d0ea] rounded-lg px-4 py-4 hover:bg-[#f3effa] transition-colors">
              <span className="material-symbols-outlined text-[#6B4A98] text-[24px]">{icon}</span>
              <span className="text-[14px] font-semibold text-[#2e2157]">{name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── STORIES ── */}
      <section id="stories" className="bg-[#f9f6fd] border-y border-[#d9d0ea]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-[#492880] mb-10">Stories from the blood bank</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {STORIES.map(({ tag, title, desc }) => (
              <article key={title} className="bg-white border border-[#d9d0ea] rounded-xl overflow-hidden">
                {/* Image slot: swap for a photo when available */}
                <div className="h-36 bg-gradient-to-br from-[#d9cfee] to-[#c9bde5]" />
                <div className="p-6">
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-[#6B4A98]">{tag}</span>
                  <h3 className="font-headline font-bold text-lg text-[#2e2157] mt-2 mb-2 leading-snug">{title}</h3>
                  <p className="text-[14px] text-[#6b6680] leading-relaxed">{desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── DONATE CTA ── */}
      <section id="donate" className="bg-gradient-to-r from-[#492880] to-[#294C98] text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 flex items-center justify-between gap-8 flex-wrap">
          <div>
            <h2 className="font-headline text-3xl font-extrabold mb-2">Ready to donate blood?</h2>
            <p className="text-white/80">Call us to book a slot or ask any question about donating.</p>
          </div>
          <a href={HELPLINE_TEL} className="bg-white text-[#492880] px-8 py-3.5 rounded-md font-semibold hover:bg-[#f3effa] transition-colors">
            Call {HELPLINE}
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-[#2e2157] text-white/70">
        <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-[1.5fr_1fr_1fr] gap-10 text-[14px]">
          <div>
            <img src={logo} alt="SRM Global Hospitals" className="h-10 w-auto bg-white rounded p-1.5 mb-4" />
            <p className="max-w-xs leading-relaxed">SRM Global Hospitals — compassionate, safe and dependable care.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Contact</h4>
            <p><a href={HELPLINE_TEL} className="hover:text-white">{HELPLINE}</a></p>
            <p><a href={`mailto:${EMAIL}`} className="hover:text-white">{EMAIL}</a></p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Staff</h4>
            <button onClick={handleAdmin} className="hover:text-white">
              {isAuthenticated ? 'Dashboard →' : 'Admin Login →'}
            </button>
          </div>
        </div>
        <div className="border-t border-white/10 px-6 py-4 text-center text-[12px] text-white/40">
          © SRM Global Hospitals · Blood Bank Management System
        </div>
      </footer>
    </div>
  )
}
