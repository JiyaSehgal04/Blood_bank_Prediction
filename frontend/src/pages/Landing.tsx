import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import logo from '../assets/srm-logo.png'
import campus from '../assets/hospital-campus.jpg'
import lawn from '../assets/hospital-lawn.jpg'
import donation from '../assets/hospital-donation.jpg'
import aerial from '../assets/hospital-aerial.jpg'

const HELPLINE = '96444 96444'
const HELPLINE_TEL = 'tel:+919644496444'
const EMAIL = 'info@srmglobalhospitals.com'

const TICKER = [
  { icon: 'call',          text: `Helpline ${HELPLINE}`,                 href: HELPLINE_TEL },
  { icon: 'emergency',     text: 'Need blood urgently? Call us now',     href: HELPLINE_TEL },
  { icon: 'mail',          text: EMAIL,                                  href: `mailto:${EMAIL}` },
  { icon: 'bloodtype',     text: 'View blood availability',              href: '#availability' },
  { icon: 'volunteer_activism', text: 'Donate blood, save lives',        href: '#donate' },
]

const STATS = [
  { to: 24,   suffix: '-hour', label: 'Licensed blood centre' },
  { to: 2004, suffix: '',      label: 'Serving patients since' },
  { to: 100,  suffix: '%',     label: 'Voluntary donation goal' },
  { to: 8,    suffix: '',      label: 'Blood groups' },
]

const HELP = [
  { icon: 'bloodtype',          title: 'Find blood',         desc: 'See which blood groups and components we hold for a patient.', href: '#availability' },
  { icon: 'volunteer_activism', title: 'Become a donor',     desc: 'Help us keep every group stocked for emergencies.',            href: '#donate' },
  { icon: 'support_agent',      title: 'Contact blood bank', desc: 'Questions about donation or compatibility.',                   href: `mailto:${EMAIL}` },
  { icon: 'biotech',            title: 'Lab services',       desc: 'Grouping, cross-matching and transfusion testing.',            href: '#departments' },
]

const COMPONENTS = [
  { code: 'PRC', name: 'Packed Red Blood Cells', note: 'Leucodepletion of red cells available' },
  { code: 'FFP', name: 'Fresh Frozen Plasma',    note: 'Separated from whole blood donations' },
  { code: 'PLT', name: 'Platelet Concentrates',  note: 'Single-donor platelets by apheresis' },
  { code: 'CRYO', name: 'Cryoprecipitate',       note: 'Component separation facility on site' },
]


const LAB_SERVICES = [
  { icon: 'bloodtype',     name: 'Blood grouping & Rh typing' },
  { icon: 'biotech',       name: 'DCT & ICT' },
  { icon: 'science',       name: 'Antibody titres' },
  { icon: 'compare_arrows', name: 'Blood cross-matching' },
  { icon: 'search',        name: 'Antibody screening & identification' },
  { icon: 'fact_check',    name: 'Pre-transfusion testing & issue' },
  { icon: 'report',        name: 'Post-transfusion reaction investigation' },
  { icon: 'vaccines',      name: 'Therapeutic phlebotomy' },
]

const VISION = [
  'To become the model blood centre in the state, providing excellent service to patients and the community.',
  'To become one of the best immuno-haematology units with well-equipped laboratory facilities.',
]

const MISSION = [
  'Increase voluntary donors through regular camps and awareness drives, towards 100% voluntary blood donation.',
  'Follow good manufacturing practices as per NABH guidelines.',
  'Carry out extramural research in immuno-haematology and blood transfusion.',
  'Hold national and regional conferences and CME programmes for staff and students.',
]

const STORIES = [
  { img: donation, tag: 'Donation', title: 'Voluntary donors keep the blood centre ready', desc: 'We hold voluntary blood donation camps and awareness drives on campus and beyond, working towards 100% voluntary donation.' },
  { img: campus, tag: 'Safety',   title: 'Every unit screened by automated CLIA', desc: 'Units are tested for transfusion-transmissible infections using fully automated Chemiluminescence Immuno Assay.' },
  { img: lawn,   tag: 'Apheresis', title: 'Single-donor platelets for patients who need them', desc: 'Automated cell separators have been used for apheresis procedures since 2019.' },
  { img: aerial, tag: 'Since 2004', title: 'From SRM Blood Bank to a full blood centre', desc: 'Started in 2004, with component separation from 2006, and now a licensed 24-hour blood centre.' },
  { img: campus, tag: 'Compatibility', title: 'The right match for every patient', desc: 'Immuno-haematology is done on column agglutination technology and a high-throughput automated platform.' },
]

const DONOR_GUIDE = [
  { title: 'Voluntary donor screening and medical examination', body: 'Every voluntary donor is screened and medically examined before giving blood, so donation is safe for the donor and the patient who receives it.', action: 'book' },
  { title: 'Pre- and post-donation counselling', body: 'Our team counsels donors before and after donation, answering questions and explaining what to expect.', action: 'book' },
  { title: 'Blood collection, including plateletpheresis', body: 'We collect whole blood, and run regular plateletpheresis to provide single-donor platelets for patients who need them.', action: 'book' },
  { title: 'Voluntary donation camps and awareness drives', body: 'We hold voluntary blood donation camps and awareness drives on the SRM Institute of Science and Technology campus and outside it. Call to ask about camps near you.', action: 'call' },
  { title: 'Contact the blood centre', body: 'Reach the blood centre by phone or email for donation, compatibility or availability questions.', action: 'contact' },
]

const SERVICES = [
  { title: 'Blood grouping and Rh typing', body: 'ABO and Rh grouping of donors and patients, the starting point for every safe transfusion.', action: 'call' },
  { title: 'Cross-matching and pre-transfusion testing', body: 'Antibody screening and identification and cross-matching, using column agglutination and a fully automated platform, before components are issued.', action: 'call' },
  { title: 'Component separation and issue', body: 'Whole blood is separated into packed red cells, fresh frozen plasma, platelet concentrates and cryoprecipitate, then issued as the patient needs.', action: 'call' },
  { title: 'Leucodepletion of red cells', body: 'Leucodepletion of red cells is available at the blood centre for patients who need it.', action: 'call' },
  { title: 'Therapeutic phlebotomy', body: 'Therapeutic phlebotomy is available at the blood centre when a clinician advises it.', action: 'call' },
]

const GROUP_IDS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-']
const DONATES_TO: Record<string, string[]> = {
  'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+':  ['O+', 'A+', 'B+', 'AB+'],
  'A-':  ['A-', 'A+', 'AB-', 'AB+'],
  'A+':  ['A+', 'AB+'],
  'B-':  ['B-', 'B+', 'AB-', 'AB+'],
  'B+':  ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
}
const RECEIVES_FROM = (g: string) => GROUP_IDS.filter((d) => DONATES_TO[d].includes(g))
const pretty = (g: string) => g.replace('-', '−')

const JOURNEY = [
  { icon: 'health_and_safety', title: 'Donor screening',   desc: 'Medical examination and counselling before and after donation.' },
  { icon: 'bloodtype',         title: 'Collection',        desc: 'Whole blood, and plateletpheresis for single-donor platelets.' },
  { icon: 'biotech',           title: 'Infection screening', desc: 'Fully automated CLIA testing for transfusion-transmissible infections.' },
  { icon: 'science',           title: 'Component separation', desc: 'Packed red cells, plasma, platelets and cryoprecipitate.' },
  { icon: 'compare_arrows',    title: 'Grouping & cross-match', desc: 'Column agglutination and automated immuno-haematology.' },
  { icon: 'local_hospital',    title: 'Issue to patient',  desc: 'Pre-transfusion testing, issue and reaction follow-up.' },
]

const SLIDES = [
  { src: campus,   alt: 'SRM Global Hospitals campus on a clear day' },
  { src: donation, alt: 'A donor and a nurse smiling during a blood donation' },
  { src: aerial,   alt: 'Avenue leading to the hospital buildings' },
  { src: lawn,     alt: 'SRM Global Hospitals campus lawn' },
]

function CountUp({ to, suffix = '', duration = 1600 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [reduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [n, setN] = useState(reduced ? to : 0)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    let timer: ReturnType<typeof setInterval> | undefined
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      const start = Date.now()
      timer = setInterval(() => {
        const t = Math.min((Date.now() - start) / duration, 1)
        setN(Math.round(to * (1 - Math.pow(1 - t, 3))))
        if (t >= 1) clearInterval(timer)
      }, 30)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); clearInterval(timer) }
  }, [to, duration, reduced])
  return <span ref={ref}>{n}{suffix}</span>
}

function Divider() {
  return <div aria-hidden="true" className="h-px w-full bg-[#4A2C8A]/12" />
}

function Reveal({ from = 'up', delay = 0, className = '', children }: {
  from?: 'left' | 'right' | 'up'; delay?: number; className?: string; children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('in'); io.disconnect() }
    }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal reveal-${from} ${className}`}>
      {children}
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const handleAdmin = () => navigate(isAuthenticated ? '/dashboard' : '/login')
  const [scrolled, setScrolled] = useState(false)
  const [slide, setSlide] = useState(0)
  const [paused, setPaused] = useState(false)
  const [group, setGroup] = useState('O+')
  const [tab, setTab] = useState<'donor' | 'services'>('donor')
  const [openItem, setOpenItem] = useState<number | null>(0)
  const go = (d: number) => setSlide((i) => (i + d + SLIDES.length) % SLIDES.length)

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setSlide((i) => (i + 1) % SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [slide, paused])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className="min-h-screen text-[#1a1040] overflow-x-hidden"
      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f3effa 14%, #ffffff 28%, #efeaf8 44%, #ffffff 58%, #f1edf9 72%, #ffffff 86%, #ebe5f6 100%)' }}
    >

      {/* ── EMERGENCY STRIP (revolving) ── */}
      <div className="marquee bg-[#2E1A66] text-white text-[13px] overflow-hidden">
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1} className="flex items-center shrink-0">
              {TICKER.map(({ icon, text, href }) => (
                <a key={text} href={href} className="flex items-center gap-2 px-8 py-2.5 font-medium whitespace-nowrap hover:underline">
                  <span className="material-symbols-outlined text-[16px]">{icon}</span>
                  {text}
                  <span className="ml-8 text-white/30">•</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── HEADER (glass bar floating over the hero, sticky) ── */}
      <header
        className={`sticky top-0 z-40 border-b text-white transition-all duration-300 ${
          scrolled
            ? 'bg-[#2E1A66]/55 backdrop-blur-xl border-white/20 shadow-[0_8px_30px_rgba(26,16,64,0.3)]'
            : 'bg-[#1a1040]/40 backdrop-blur-md border-white/10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-3 sm:py-4 flex items-center gap-4 md:gap-5 xl:gap-10">
          <img src={logo} alt="SRM Global Hospitals" className="h-10 md:h-12 w-auto shrink-0 bg-white rounded-md px-2 py-1" />
          <span className="hidden xl:block text-white text-xl font-medium whitespace-nowrap">A caring blood bank</span>
          <nav className="hidden lg:flex items-center gap-4 xl:gap-8 ml-auto text-[13px] xl:text-[15px] font-semibold text-white/90 whitespace-nowrap">
            <a href="#help" className="hover:text-white">How can we help</a>
            <a href="#availability" className="hover:text-white">Blood Bank</a>
            <a href="#departments" className="hover:text-white">Lab services</a>
            <a href="#stories" className="hover:text-white">Stories</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </nav>
          <button
            onClick={handleAdmin}
            className="ml-auto lg:ml-0 flex items-center gap-2 whitespace-nowrap shrink-0 bg-white hover:bg-[#f3effa] text-[#2E1A66] px-4 xl:px-6 py-2.5 rounded-md text-[14px] font-bold transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
            {isAuthenticated ? 'Go to Dashboard' : 'Admin Login'}
          </button>
        </div>
      </header>

      {/* ── HERO (full-width photo carousel, text block on the image — after ki.se) ── */}
      <section className="relative -mt-[4.25rem] md:-mt-[5.25rem] h-[38rem] md:h-[46rem] bg-[#1a1040] overflow-hidden text-white" aria-roledescription="carousel" aria-label="SRM Global Hospitals photos">
        <div
          className="absolute inset-0 flex transition-transform duration-1000 ease-in-out"
          style={{ width: `${SLIDES.length * 100}%`, transform: `translateX(-${(slide * 100) / SLIDES.length}%)` }}
        >
          {SLIDES.map(({ src, alt }, i) => (
            <div key={i} className="relative h-full overflow-hidden" style={{ width: `${100 / SLIDES.length}%` }}
              role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${SLIDES.length}`} aria-hidden={i !== slide}>
              <img src={src} alt={alt} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        {/* Solid text box sitting on the photo */}
        <div className="absolute inset-x-0 bottom-16 md:bottom-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8">
            <div className="bg-[#2E1A66] max-w-3xl p-7 md:p-9 rounded-md shadow-xl">
              <h1 className="font-headline text-[clamp(28px,3.4vw,44px)] font-bold leading-[1.1] mb-4">
                SRM Global Hospitals Blood Bank
              </h1>
              <p className="text-white/90 text-lg leading-relaxed mb-6">
                Caring for life, every drop counts — a safe, well-stocked blood bank for every patient, tracked in real time and ready when it matters most.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#availability" className="bg-white text-[#2E1A66] px-6 py-3 rounded-md font-semibold hover:bg-[#f3effa] transition-colors">
                  View blood availability
                </a>
                <a href={HELPLINE_TEL} className="border border-white/50 px-6 py-3 rounded-md font-semibold hover:bg-white/10 transition-colors">
                  Call helpline
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Controls: previous / pause / next + dots */}
        <div className="absolute right-4 sm:right-8 bottom-6 z-10 flex items-center gap-2 bg-[#1a1040]/70 backdrop-blur rounded-full px-3 py-2">
          <button onClick={() => go(-1)} aria-label="Previous photo" className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button onClick={() => setPaused((v) => !v)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'} className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">{paused ? 'play_arrow' : 'pause'}</span>
          </button>
          <button onClick={() => go(1)} aria-label="Next photo" className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
          <div className="flex gap-1.5 pl-2">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} aria-label={`Show photo ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === slide ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ── NUMBERS STRIP ── */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-11 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(({ to, suffix, label }) => (
            <div key={label} className="border-l-4 border-[#4A2C8A] pl-5">
              <div className="font-headline text-4xl md:text-5xl font-black tracking-tight text-[#2E1A66]"><CountUp to={to} suffix={suffix} /></div>
              <div className="text-[13px] font-bold uppercase tracking-wide text-[#4a4466] mt-1.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── PROMO GRID: tinted photo cards with tab + white title (after ki.se) ── */}
      <section id="stories">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 pt-14 pb-16">
          <div className="flex items-baseline gap-5 flex-wrap border-b border-[#d9d0ea] pb-3 mb-8">
            <h2 className="font-headline text-3xl font-extrabold text-[#1a1040] border-b-2 border-[#1a1040] -mb-[14px] pb-3">Stories</h2>
            <span className="text-[#4a4466]">Latest from the blood centre</span>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {STORIES.map(({ img, tag, title, desc }, i) => {
              const featured = i === 0
              return (
                <Reveal key={title} from={featured ? 'left' : i % 2 ? 'up' : 'right'} delay={featured ? 0 : i * 90}
                  className={featured ? 'lg:row-span-2' : ''}>
                  <article tabIndex={0} className={`group relative h-full overflow-hidden rounded-lg border border-[#4A2C8A]/40 shadow-md outline-none focus-visible:ring-2 focus-visible:ring-[#4A2C8A] ${featured ? 'min-h-[30rem] lg:min-h-[36rem]' : 'min-h-[17rem]'}`}>
                    <img src={img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    {/* photo stays natural; the deep purple tint only appears on hover */}
                    <div className="absolute inset-0 bg-[#3a1f7a]/70 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1040]/85 via-[#1a1040]/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 pb-5 text-white">
                      <span className="inline-block bg-[#7a2c8a] text-white text-[15px] font-bold px-5 py-2 rounded-r-md mb-3">{tag}</span>
                      <div className="px-5">
                        <h3 className={`font-headline font-extrabold leading-snug ${featured ? 'text-2xl md:text-3xl' : 'text-lg md:text-xl'}`}>{title}</h3>
                        {featured && <p className="mt-3 text-white/90 text-[16px] leading-relaxed max-w-md">{desc}</p>}
                      </div>
                    </div>
                  </article>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <Divider />

      {/* ── HOW CAN WE HELP (bento) ── */}
      <section id="help" className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#4A2C8A] mb-2">Here for you</p>
          <h2 className="font-headline text-3xl md:text-5xl font-extrabold text-[#2E1A66] mb-3">How can we help?</h2>
          <p className="text-[#6b6680] text-lg">Choose what you need and we will point you in the right direction.</p>
        </div>
        <div className="grid lg:grid-cols-4 lg:grid-rows-2 gap-5">
          <Reveal from="left" className="lg:col-span-2 lg:row-span-2">
            <a href={HELPLINE_TEL} className="group relative h-full min-h-[22rem] flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E1A66] via-[#4A2C8A] to-[#14327A] p-8 md:p-10 text-white shadow-xl">
              <span className="material-symbols-outlined absolute -right-6 -bottom-8 text-white/10" style={{ fontSize: 260, fontVariationSettings: "'FILL' 1" }}>water_drop</span>
              <div className="relative">
                <span className="relative inline-flex">
                  <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
                  <span className="relative w-14 h-14 rounded-full bg-white text-[#2E1A66] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[30px]">emergency</span>
                  </span>
                </span>
              </div>
              <div className="relative">
                <h3 className="font-headline text-3xl md:text-4xl font-black mb-3">Emergency request</h3>
                <p className="text-white/85 text-lg max-w-sm mb-6">Need blood urgently? Call our helpline and we will respond at once.</p>
                <span className="inline-flex items-center gap-3 bg-white text-[#2E1A66] px-6 py-3 rounded-md font-bold group-hover:bg-[#f3effa] transition-colors">
                  <span className="material-symbols-outlined">call</span>{HELPLINE}
                </span>
              </div>
            </a>
          </Reveal>
          {HELP.map(({ icon, title, desc, href }, i) => (
            <Reveal key={title} from="up" delay={i * 90}>
              <a href={href} className="group relative h-full flex flex-col rounded-2xl bg-white border-2 border-[#4A2C8A]/20 p-6 overflow-hidden hover:-translate-y-1 hover:border-[#4A2C8A] hover:shadow-xl transition-all duration-300">
                <span className="absolute right-4 top-3 font-headline text-5xl font-black text-[#4A2C8A]/10 group-hover:text-[#4A2C8A]/20 transition-colors">0{i + 1}</span>
                <span className="w-12 h-12 rounded-xl bg-[#f3effa] group-hover:bg-[#4A2C8A] flex items-center justify-center mb-5 transition-colors">
                  <span className="material-symbols-outlined text-[#4A2C8A] group-hover:text-white text-[26px]">{icon}</span>
                </span>
                <h3 className="font-headline font-extrabold text-lg text-[#1a1040] mb-1">{title}</h3>
                <p className="text-[14px] text-[#6b6680] leading-relaxed">{desc}</p>
                <span className="material-symbols-outlined mt-auto pt-4 text-[#4A2C8A] group-hover:translate-x-1 transition-transform self-start">arrow_forward</span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── BLOOD BANK + COMPATIBILITY EXPLORER ── */}
      <section id="availability">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-20">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center mb-12">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#4A2C8A] mb-2">Blood centre</p>
              <h2 className="font-headline text-3xl md:text-5xl font-extrabold text-[#2E1A66] mb-4">Our blood bank</h2>
              <p className="text-[#4a4466] text-lg leading-relaxed max-w-2xl">
                A state-of-the-art licensed blood centre with a 24-hour facility, offering the full spectrum of services from donor screening and blood collection to component separation. Live stock levels are available to hospital staff through the admin dashboard — call the helpline to confirm availability for a patient.
              </p>
            </div>
            <Reveal from="right"><img src={aerial} alt="Avenue leading to the hospital buildings" loading="lazy" className="w-full h-64 object-cover rounded-2xl shadow-lg" /></Reveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {COMPONENTS.map(({ code, name, note }, i) => (
              <Reveal key={code} from="up" delay={i * 80}>
                <div className="h-full bg-white border-2 border-[#4A2C8A]/30 border-t-4 border-t-[#4A2C8A] rounded-xl p-7 shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                  <div className="font-headline text-4xl font-black text-[#4A2C8A] mb-2">{code}</div>
                  <div className="text-[16px] font-bold text-[#1a1040]">{name}</div>
                  <div className="text-[14px] font-semibold text-[#4a4466] mt-3">{note}</div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* who can give to whom */}
          <div className="rounded-2xl bg-white border-2 border-[#4A2C8A]/25 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#2E1A66] to-[#14327A] text-white px-8 py-6">
              <h3 className="font-headline text-2xl font-extrabold">Who can give to whom?</h3>
              <p className="text-white/80">Pick a blood group to see its compatible donors and recipients.</p>
            </div>
            <div className="p-8">
              <div className="flex flex-wrap gap-3 mb-8" role="group" aria-label="Blood group">
                {GROUP_IDS.map((g) => (
                  <button key={g} onClick={() => setGroup(g)} aria-pressed={group === g}
                    className={`w-16 h-16 rounded-full border-2 font-headline font-extrabold text-lg transition-all ${
                      group === g
                        ? 'bg-[#4A2C8A] border-[#4A2C8A] text-white scale-110 shadow-lg'
                        : 'bg-white border-[#4A2C8A] text-[#2E1A66] hover:bg-[#f3effa]'
                    }`}>
                    {pretty(g)}
                  </button>
                ))}
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { label: `${pretty(group)} can donate to`, ids: DONATES_TO[group], icon: 'volunteer_activism' },
                  { label: `${pretty(group)} can receive from`, ids: RECEIVES_FROM(group), icon: 'bloodtype' },
                ].map(({ label, ids, icon }) => (
                  <div key={label} className="rounded-xl bg-[#f3effa] p-6">
                    <div className="flex items-center gap-2 font-bold text-[#2E1A66] mb-4">
                      <span className="material-symbols-outlined text-[#4A2C8A]">{icon}</span>{label}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ids.map((g) => (
                        <span key={g} className="px-4 py-2 rounded-full bg-white border border-[#4A2C8A]/40 font-headline font-extrabold text-[#2E1A66]">{pretty(g)}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-[#6b6680] mt-5">General ABO/Rh red-cell guide only — every unit is still cross-matched before it is issued.</p>
            </div>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── JOURNEY: donor to patient ── */}
      <section id="departments" className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-[#4A2C8A] mb-2">Laboratory services</p>
          <h2 className="font-headline text-3xl md:text-5xl font-extrabold text-[#2E1A66]">From donor to patient</h2>
        </div>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-6 gap-x-6 gap-y-10">
          {JOURNEY.map(({ icon, title, desc }, i) => (
            <Reveal key={title} from="up" delay={i * 90}>
              <li className="relative list-none">
                {i < JOURNEY.length - 1 && <span className="hidden lg:block absolute top-8 left-16 right-[-1.5rem] h-0.5 bg-gradient-to-r from-[#4A2C8A] to-[#4A2C8A]/20" />}
                <span className="relative z-10 flex w-16 h-16 rounded-full bg-[#2E1A66] text-white items-center justify-center shadow-lg ring-4 ring-white">
                  <span className="material-symbols-outlined text-[28px]">{icon}</span>
                </span>
                <span className="absolute -top-2 left-12 z-20 w-7 h-7 rounded-full bg-[#7a2c8a] text-white text-[13px] font-bold flex items-center justify-center">{i + 1}</span>
                <h3 className="font-headline font-extrabold text-lg text-[#1a1040] mt-4 mb-1">{title}</h3>
                <p className="text-[14px] text-[#6b6680] leading-relaxed">{desc}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <div className="flex flex-wrap gap-3 mt-12">
          {LAB_SERVICES.map(({ icon, name }) => (
            <span key={name} className="inline-flex items-center gap-2 rounded-full border-2 border-[#4A2C8A]/30 bg-white px-4 py-2 text-[13px] font-bold text-[#1a1040] hover:bg-[#f3effa] transition-colors">
              <span className="material-symbols-outlined text-[#4A2C8A] text-[18px]">{icon}</span>{name}
            </span>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── VISION & MISSION (split) ── */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-20 grid md:grid-cols-2 gap-6">
          <Reveal from="left">
            <div className="relative h-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E1A66] to-[#14327A] p-9 text-white shadow-xl">
              <span className="material-symbols-outlined absolute -right-6 -bottom-10 text-white/10" style={{ fontSize: 180 }}>visibility</span>
              <h2 className="relative font-headline text-3xl font-black mb-5">Our vision</h2>
              <ul className="relative space-y-4">
                {VISION.map((t) => (
                  <li key={t} className="flex gap-3 text-lg leading-relaxed text-white/90">
                    <span className="material-symbols-outlined text-[#b8a8e6] mt-1 shrink-0">flag</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal from="right">
            <div className="relative h-full overflow-hidden rounded-2xl bg-white border-2 border-[#4A2C8A]/30 p-9 shadow-md">
              <span className="material-symbols-outlined absolute -right-6 -bottom-10 text-[#4A2C8A]/10" style={{ fontSize: 180 }}>flag</span>
              <h2 className="relative font-headline text-3xl font-black text-[#2E1A66] mb-5">Our mission</h2>
              <ul className="relative space-y-4">
                {MISSION.map((t, i) => (
                  <li key={t} className="flex gap-4 text-[16px] leading-relaxed text-[#1a1040]">
                    <span className="font-headline font-black text-[#4A2C8A] text-xl leading-none mt-0.5">0{i + 1}</span>{t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
        <p className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 pb-8 text-[12px] text-[#6b6680]">
          Source: Department of Transfusion Medicine &amp; Blood Centre, SRM Medical College Hospital &amp; Research Centre.
        </p>
      </section>

      <Divider />

      {/* ── DONOR GUIDE / SERVICES (tabs + accordion) ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 xl:px-8 py-20">
        <div role="tablist" className="inline-flex rounded-full bg-[#f3effa] border-2 border-[#4A2C8A]/25 p-1 mb-8">
          {([['donor', 'Donor guide'], ['services', 'Blood bank services']] as const).map(([id, label]) => (
            <button key={id} id={`tab-${id}`} role="tab" aria-selected={tab === id} aria-controls="guide-panel"
              onClick={() => { setTab(id); setOpenItem(0) }}
              className={`px-6 py-2.5 rounded-full text-[15px] font-bold transition-colors ${tab === id ? 'bg-[#2E1A66] text-white shadow' : 'text-[#2E1A66] hover:bg-white'}`}>
              {label}
            </button>
          ))}
        </div>
        <ul id="guide-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="rounded-2xl bg-white border-2 border-[#4A2C8A]/25 shadow-md overflow-hidden">
          {(tab === 'donor' ? DONOR_GUIDE : SERVICES).map(({ title, body, action }, i) => {
            const open = openItem === i
            return (
              <li key={title} className="border-b last:border-b-0 border-[#d9d0ea]">
                <button
                  onClick={() => setOpenItem(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`guide-item-${i}`}
                  className={`w-full flex items-center gap-4 px-6 py-5 text-left font-semibold text-[#1a1040] transition-colors ${open ? 'bg-[#f3effa]' : 'hover:bg-[#f9f6fd]'}`}
                >
                  <span className="font-headline font-black text-[#4A2C8A]/40 text-xl w-8">0{i + 1}</span>
                  <span className="flex-1">{title}</span>
                  <span className={`material-symbols-outlined text-[#4A2C8A] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                <div id={`guide-item-${i}`} role="region" hidden={!open} className="px-6 pb-6 pt-1 bg-[#f3effa]">
                  <p className="text-[#4a4466] leading-relaxed pl-12 max-w-2xl">{body}</p>
                  <div className="flex flex-wrap gap-3 mt-4 pl-12">
                    {(action === 'call' || action === 'book' || action === 'contact') && (
                      <a href={HELPLINE_TEL} className="inline-flex items-center gap-2 bg-[#2E1A66] hover:bg-[#4A2C8A] text-white px-5 py-2.5 rounded-md text-[14px] font-bold transition-colors">
                        <span className="material-symbols-outlined text-[18px]">call</span>
                        {action === 'book' ? 'Call to book a slot' : `Call ${HELPLINE}`}
                      </a>
                    )}
                    {action === 'contact' && (
                      <a href={`mailto:${EMAIL}`} className="inline-flex items-center gap-2 border-2 border-[#2E1A66] text-[#2E1A66] hover:bg-white px-5 py-2.5 rounded-md text-[14px] font-bold transition-colors">
                        <span className="material-symbols-outlined text-[18px]">mail</span>Email us
                      </a>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <Divider />

      {/* ── DONATE CTA ── */}
      <section id="donate" className="relative text-white overflow-hidden">
        <img src={donation} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2E1A66]/95 via-[#2E1A66]/85 to-[#14327A]/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-20 flex items-center justify-between gap-8 flex-wrap">
          <div className="max-w-xl">
            <h2 className="font-headline text-4xl font-black mb-3">Ready to donate blood?</h2>
            <p className="text-white/90 text-lg">Voluntary donors make our blood centre possible. Call us to book a slot or ask any question about donating.</p>
          </div>
          <a href={HELPLINE_TEL} className="bg-white text-[#2E1A66] px-8 py-3.5 rounded-md font-semibold hover:bg-[#f3effa] transition-colors">
            Call {HELPLINE}
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-[#1a1040] text-white/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 xl:px-8 py-12 grid md:grid-cols-[1.5fr_1fr_1fr] gap-10 text-[14px]">
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
