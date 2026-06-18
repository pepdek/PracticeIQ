import { useState } from "react"
import { useNavigate } from "react-router-dom"

const C = {
  bg:       "#115E59",
  bgDim:    "#134E4A",
  body:     "#99F6E4",
  headline: "#FFFFFF",
  accent:   "#14B8A6",
  cta:      "#A3E635",
  ctaDark:  "#84CC16",
  coal:     "#1A1A1A",
  slate:    "#6B6560",
  smoke:    "#E8E6E1",
  white:    "#FFFFFF",
  green:    "#2ECC71",
}

const F = {
  display: "'Playfair Display', Georgia, serif",
  body:    "'Inter', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'Courier New', monospace",
}

const CARD_BG = "rgb(249,248,245)"
const NAV_H   = 56
const CARD_W  = 320

const TICKER_CARDS = [
  { week: "Jun 15", headline: "Revenue Capture: 12.5/20", body: "AR over 60 days reached $14,200 - up $5,800 from last week. Three invoices past due." },
  { week: "Jun 22", headline: "Practice Velocity: 17/20", body: "Active matters at 12-week high. 3 opened, 1 closed. Pipeline direction: positive." },
  { week: "Jun 8",  headline: "Risk Exposure: 8/20",      body: "Trust balance dipped to $320 - below the $500 threshold. Review before Thursday." },
  { week: "May 25", headline: "Collection rate: 91%",     body: "Best 4-week average in 8 months. 14.2 hours billed, 12.9 collected." },
  { week: "Jun 1",  headline: "Financial Position: 13.5/20", body: "Operating balance 18% below 90-day average. $28k invoiced, $12.4k deposited this week." },
  { week: "Jun 29", headline: "Reputation: 4.8 ★",        body: "No new reviews this week. Last review 23 days ago. Velocity below baseline." },
  { week: "May 18", headline: "Realization rate: 87%",    body: "Two matters under 70% realization. Both opened 60+ days ago with no activity logged." },
  { week: "Jun 15", headline: "AR 90+ days: $0",          body: "Every invoice collected within 90 days. First clean week in 6 months." },
]

const FAQS = [
  { q: "Does Tiata replace Clio or MyCase?",
    a: "No. It reads from them. You keep using whatever you're using. Tiata surfaces what your software already knows but never tells you." },
  { q: "Is there a dashboard?",
    a: "No. There is one email per week. If you need to see more than the email shows, open Clio - that's where the data lives. Tiata is the signal, not the system." },
  { q: "What does 'read only' mean for my bank account?",
    a: "Tiata never sees your banking credentials. Plaid handles authentication. Tiata reads deposit amounts and timing only - not transaction descriptions, not client names. Read-only means read-only." },
  { q: "What practice management software does it work with?",
    a: "Clio, Filevine, MyCase, Cosmolex, and PracticePanther at launch. Smokeball in Q3." },
  { q: "Is my client data safe?",
    a: "Tiata reads operational patterns - billing totals, payment timing, matter counts. It never reads client names, case details, or privileged communications. It cannot write to any connected system." },
  { q: "What if the email isn't useful?",
    a: "Cancel. No contract. We'd rather you not pay than pay for something that doesn't change anything." },
]

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(153,246,228,0.45)", margin: "0 0 16px" }}>
      {children}
    </p>
  )
}

const SEP = "1px solid rgba(255,255,255,0.08)"

// The sticky CTA card — shared between nav (desktop) and inline (mobile)
function CtaCard({ onCTA }: { onCTA: () => void }) {
  return (
    <>
      {/* Header — white, with stacked tagline */}
      <div style={{ background: C.white, padding: "0 20px 14px", borderRadius: "0 0 0 0", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        {/* Row 1: wordmark + score */}
        <div style={{ height: NAV_H, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.coal, margin: 0 }}>Tiata</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
            <span style={{ fontFamily: F.display, fontSize: 30, fontWeight: 700, lineHeight: 1, color: C.accent }}>74</span>
            <span style={{ fontFamily: F.mono, fontSize: 9, color: C.slate }}>this week</span>
          </div>
        </div>
        {/* Row 2: tagline */}
        <p style={{ fontFamily: F.mono, fontSize: 9, color: C.slate, margin: 0 }}>one number. every week.</p>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: C.smoke }} />

      {/* Body — warm off-white */}
      <div style={{ background: CARD_BG, padding: "18px 20px 20px", borderRadius: "0 0 12px 12px", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.slate, margin: "0 0 10px" }}>What's included?</p>
        {["One email. Every Sunday. No logins.", "Five dimensions. All sourced from your data.", "Connects to Clio, Plaid, and Google.", "Your first score, free."].map(item => (
          <div key={item} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
            <span style={{ color: C.accent, fontSize: 11, lineHeight: "17px", flexShrink: 0, fontWeight: 700 }}>✓</span>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.coal, lineHeight: 1.45 }}>{item}</span>
          </div>
        ))}
        <div style={{ background: C.white, borderRadius: 6, padding: "8px 10px", margin: "12px 0" }}>
          {[["Revenue", 12.5], ["Velocity", 17], ["Risk", 16], ["Financial", 13.5], ["Reputation", 13]].map(([label, score]) => (
            <div key={String(label)} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <span style={{ fontFamily: F.body, fontSize: 9, color: C.slate, width: 56, flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, height: 3, background: C.smoke, borderRadius: 2 }}>
                <div style={{ height: 3, borderRadius: 2, width: `${(Number(score) / 20) * 100}%`, background: Number(score) >= 16 ? C.green : Number(score) >= 12 ? C.accent : "#ef4444" }} />
              </div>
              <span style={{ fontFamily: F.mono, fontSize: 8, color: C.slate, width: 28, textAlign: "right" }}>{score}/20</span>
            </div>
          ))}
        </div>
        <button onClick={onCTA} style={{ width: "100%", background: C.cta, border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.coal, height: 42, borderRadius: 8, transition: "background 150ms" }}
          onMouseEnter={e => (e.currentTarget.style.background = C.ctaDark)}
          onMouseLeave={e => (e.currentTarget.style.background = C.cta)}
        >Get your first email free</button>
      </div>

      {/* FAQ — below the card, in the sidebar */}
      <p style={{ fontFamily: F.body, fontSize: 11, color: "rgba(153,246,228,0.45)", textAlign: "center", margin: "12px 0 0", lineHeight: 1.5 }}>
        <a href="#faq" style={{ color: "rgba(153,246,228,0.6)", textDecoration: "underline", fontWeight: 600 }}>Review all of the FAQs</a>{" "}before connecting. 30-day money-back.
      </p>
    </>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const onCTA = () => navigate("/onboarding")

  return (
    <div style={{ backgroundColor: C.bg, fontFamily: F.body, color: C.body }}>

      <style>{`
        @keyframes sundial-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex; width: max-content; will-change: transform;
          animation: sundial-ticker 40s linear infinite;
        }
        .ticker-track:hover { animation-play-state: paused; }
        html { scroll-behavior: smooth; }
        *, *::before, *::after { box-sizing: border-box; }

        .desktop-only { display: flex; }
        .mobile-only  { display: none; }

        /* Page grid — left content col + gap + spacer matching card width */
        .page-grid {
          display: grid;
          grid-template-columns: 60fr 10fr 30fr;
          align-items: start;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 32px;
        }
        .page-left  { min-width: 0; }
        .page-right { grid-column: 3; } /* empty spacer — card lives in nav */

        .grid-2    { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .grid-auto { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .table-wrap { width: 100%; overflow-x: auto; }

        /* Desktop nav card */
        .nav-card {
          position: absolute;
          right: 32px;
          top: 0;
          width: ${CARD_W}px;
          z-index: 10;
        }

        .mobile-cta { display: none; }

        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only  { display: flex !important; }
          .page-grid    { grid-template-columns: 1fr; padding: 0 20px; }
          .page-right   { display: none; }
          .nav-card     { display: none; }
          .grid-2       { grid-template-columns: 1fr; }
          .grid-auto    { grid-template-columns: 1fr; }
          .mobile-cta   {
            display: flex !important;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
            background: ${C.cta}; padding: 14px 20px;
            align-items: center; justify-content: center;
            box-shadow: 0 -2px 16px rgba(0,0,0,0.3);
          }
        }
      `}</style>

      {/* ── NAV ── sticky, overflow visible so card hangs below */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        height: NAV_H, backgroundColor: C.bg,
        borderBottom: SEP,
        overflow: "visible",
      }}>
        <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", height: "100%", display: "flex", alignItems: "center", padding: "0 32px", position: "relative" }}>

          {/* Wordmark */}
          <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.headline, flexShrink: 0 }}>
            Tiata
          </span>

          {/* Nav links — left side, after wordmark */}
          <div className="desktop-only" style={{ gap: 28, alignItems: "center", marginLeft: 40 }}>
            {[["#overview","Overview"],["#use-cases","Use Cases"],["#","Changelog"],["https://github.com/pepdek/PracticeIQ","GitHub"]].map(([href, label]) => (
              <a key={label} href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: "rgba(153,246,228,0.6)", textDecoration: "none", transition: "color 150ms" }}
                onMouseEnter={e => (e.currentTarget.style.color = C.headline)}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(153,246,228,0.6)")}
              >{label}</a>
            ))}
          </div>

          {/* Mobile CTA pill */}
          <button className="mobile-only" onClick={onCTA} style={{ marginLeft: "auto", background: C.cta, border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.coal, padding: "8px 16px", borderRadius: 999 }}>
            Get it free
          </button>

          {/* CTA card anchored to top-right of nav, overflowing below */}
          <div className="nav-card desktop-only">
            <CtaCard onCTA={onCTA} />
          </div>
        </div>
      </nav>

      {/* ── PAGE GRID — left content / empty spacer for card column ── */}
      <div className="page-grid">

        {/* LEFT COLUMN */}
        <div className="page-left">

          {/* HERO */}
          <div style={{ padding: "80px 0 88px" }}>
            <div style={{ display: "inline-block", marginBottom: 28 }}>
              <span style={{ fontFamily: F.mono, fontSize: 11, color: "rgba(153,246,228,0.5)", border: "1px solid rgba(153,246,228,0.2)", borderRadius: 4, padding: "2px 8px" }}>Tiata 2.0</span>
            </div>
            <h1 style={{ fontFamily: F.display, fontSize: "clamp(32px, 3.5vw, 60px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
              Practice intelligence for solo and small law firms. Without the guesswork.
            </h1>
            <p style={{ fontFamily: F.display, fontSize: "clamp(17px, 1.8vw, 24px)", fontWeight: 400, color: "rgba(153,246,228,0.70)", lineHeight: 1.25, margin: "0 0 24px" }}>
              And every number comes from your actual data.
            </p>
            <p style={{ fontFamily: F.body, fontSize: "clamp(14px, 1.1vw, 16px)", color: C.body, lineHeight: 1.65, margin: "0 0 36px", maxWidth: 480 }}>
              If you use Clio, Filevine, or MyCase, you already have the data.
              Connect once. Tiata reads it in the background. One email, every Sunday.
              You know more about your practice than you ever have - without changing anything.
            </p>
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "14px 20px", display: "inline-block", border: "1px solid rgba(255,255,255,0.12)" }}>
              <span style={{ fontFamily: F.mono, fontSize: 13, color: C.accent }}>
                Your Practice Health Score: 74 - down 6 points. Here's why.
              </span>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(153,246,228,0.35)", marginTop: 8, fontStyle: "italic" }}>What Sunday morning looks like.</p>
          </div>

          {/* TICKER */}
          <div style={{ borderTop: SEP, borderBottom: SEP, padding: "40px 0", overflow: "hidden" }} id="overview">
            <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(153,246,228,0.4)", textAlign: "center", margin: "0 0 24px" }}>
              What Sunday looks like
            </p>
            <div style={{ overflow: "hidden" }}>
              <div className="ticker-track">
                {[...TICKER_CARDS, ...TICKER_CARDS].map((card, i) => (
                  <div key={i} style={{ flexShrink: 0, width: 260, margin: "0 10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "16px 18px" }}>
                    <p style={{ fontFamily: F.mono, fontSize: 9, color: "rgba(153,246,228,0.4)", margin: "0 0 8px" }}>Week ending {card.week}</p>
                    <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.headline, margin: "0 0 5px", lineHeight: 1.3 }}>{card.headline}</p>
                    <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(153,246,228,0.60)", margin: 0, lineHeight: 1.5 }}>{card.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* THE PROBLEM */}
          <div style={{ borderTop: SEP, padding: "88px 0" }}>
            <Eyebrow>The problem</Eyebrow>
            <h2 style={{ fontFamily: F.display, fontSize: "clamp(24px, 2.5vw, 40px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 40px" }}>
              Every attorney in America is running their practice blind.
            </h2>
            <div className="grid-2" style={{ marginBottom: 48 }}>
              {[
                "What is your real realization rate this month?",
                "What actually landed in your bank account last week?",
                "Which matter type generates your highest revenue per hour?",
                "What percentage of consultations became retained clients?",
              ].map(q => (
                <div key={q} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "18px 20px" }}>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(153,246,228,0.60)", lineHeight: 1.5, margin: "0 0 12px" }}>{q}</p>
                  <p style={{ fontFamily: F.display, fontSize: 24, fontWeight: 700, color: "rgba(153,246,228,0.15)", margin: 0, letterSpacing: "-0.02em" }}>Unknown.</p>
                </div>
              ))}
            </div>
            <div className="grid-2" style={{ gap: 32 }}>
              <div>
                <blockquote style={{ fontFamily: F.display, fontSize: "clamp(15px, 1.4vw, 19px)", fontWeight: 400, fontStyle: "italic", color: C.accent, lineHeight: 1.55, margin: "0 0 12px", borderLeft: `3px solid ${C.accent}`, paddingLeft: 20 }}>
                  "It shouldn't be the case that an attorney billing $300 an hour has never seen their real realization rate.
                  That they don't know which referral source produces their highest-value clients.
                  That they can't tell, right now, whether their practice is growing or slowly dying."
                </blockquote>
                <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(153,246,228,0.35)", paddingLeft: 20 }}>
                  That's not a software gap. That's a structural failure of an entire industry - accepted as normal for thirty years.
                </p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "24px 28px" }}>
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(153,246,228,0.35)", margin: "0 0 14px" }}>Clio knows your matters.</p>
                <p style={{ fontFamily: F.display, fontSize: "clamp(16px, 1.5vw, 21px)", fontWeight: 700, color: C.headline, lineHeight: 1.3, margin: "0 0 14px" }}>
                  It doesn't know your practice. There's a difference.
                </p>
                <p style={{ fontFamily: F.body, fontSize: 14, color: C.body, lineHeight: 1.65, margin: 0 }}>
                  Practice management software was built to manage cases, not to run businesses.
                  Attorneys who connect Tiata see their practice differently within one email.
                </p>
              </div>
            </div>
          </div>

          {/* HOW IT WORKS */}
          <div style={{ borderTop: SEP, padding: "88px 0" }} id="how-it-works">
            <Eyebrow>Setup</Eyebrow>
            <h2 style={{ fontFamily: F.display, fontSize: "clamp(22px, 2.2vw, 34px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 44px" }}>
              Connect your practice in ten minutes.
            </h2>
            {["Connect your practice management software", "Connect your bank account via Plaid", "Confirm your email address"].map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 20, marginBottom: i < 2 ? 28 : 0, alignItems: "flex-start" }}>
                <span style={{ fontFamily: F.mono, fontSize: 13, color: C.accent, flexShrink: 0, marginTop: 2, minWidth: 20 }}>{i + 1}.</span>
                <p style={{ fontFamily: F.body, fontSize: 16, color: C.body, lineHeight: 1.5, margin: 0 }}>{step}</p>
              </div>
            ))}
            <p style={{ fontFamily: F.display, fontSize: 17, fontStyle: "italic", color: "rgba(153,246,228,0.40)", margin: "40px 0 0" }}>
              That's it. Your first email arrives Sunday.
            </p>
          </div>

          {/* USE CASES */}
          <div style={{ borderTop: SEP, padding: "88px 0" }} id="use-cases">
            <Eyebrow>It fits wherever you are</Eyebrow>
            <h2 style={{ fontFamily: F.display, fontSize: "clamp(22px, 2.2vw, 34px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 36px" }}>
              It fits in a lot of places.
            </h2>
            <div className="grid-auto">
              {[
                { title: "If you're a solo flying by feel.", body: "You track some numbers - a rough sense of realization, a month-end spreadsheet. Tiata gives you the next level of clarity without hiring an office manager." },
                { title: "If you're managing 3-8 attorneys.", body: "You're a managing partner by necessity, not by choice. You know something's wrong with the numbers but can't see what. Tiata shows you." },
                { title: "If you've been burned by dashboards before.", body: "There is no dashboard. There is one email. It arrives. You read it. That's the product." },
                { title: "If you're on Clio.", body: "You're already connected. Tiata adds Plaid and Google. Ten-minute setup. First email Sunday." },
                { title: "If you're on Filevine or MyCase.", body: "Same email. Same intelligence. Your software's data, finally surfaced." },
                { title: "If you're growing intentionally.", body: "Tiata tells you your intake conversion rate - of every consultation booked, how many became retained matters. That tells you exactly where your marketing spend is working." },
              ].map(({ title, body }) => (
                <div key={title} style={{ background: C.white, borderRadius: 8, padding: 20, transition: "box-shadow 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.30)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                >
                  <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.coal, margin: "0 0 7px", lineHeight: 1.3 }}>{title}</p>
                  <p style={{ fontFamily: F.body, fontSize: 12, color: C.slate, margin: 0, lineHeight: 1.6 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* DATA SOURCES */}
          <div style={{ borderTop: SEP, padding: "88px 0" }}>
            <Eyebrow>Connect once. Read forever.</Eyebrow>
            <h2 style={{ fontFamily: F.display, fontSize: "clamp(22px, 2.2vw, 34px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 32px" }}>
              Your data stays where it lives.
            </h2>
            <div className="table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 440 }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.06)" }}>
                    {["Platform", "Connection", "What you'll see"].map(h => (
                      <th key={h} style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, color: "rgba(153,246,228,0.45)", textAlign: "left", padding: "9px 14px", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Clio", "OAuth - one click", "Matters, time, invoices, AR aging, billing rates"],
                    ["Filevine", "OAuth - one click", "Matters, tasks, contacts, billing"],
                    ["MyCase", "OAuth - one click", "Matters, time entries, invoices"],
                    ["Plaid", "Plaid Link - read only", "Cash position, deposit timing, trust balance"],
                    ["QuickBooks Online", "OAuth - one click", "P&L, expenses, payroll"],
                    ["Google Business Profile", "Google OAuth", "Reviews, rating, referral velocity"],
                  ].map(([platform, conn, what]) => (
                    <tr key={platform} style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      <td style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.body, padding: "10px 14px" }}>{platform}</td>
                      <td style={{ fontFamily: F.mono, fontSize: 10, color: "rgba(153,246,228,0.50)", padding: "10px 14px" }}>{conn}</td>
                      <td style={{ fontFamily: F.body, fontSize: 12, color: "rgba(153,246,228,0.65)", padding: "10px 14px" }}>{what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(153,246,228,0.30)", marginTop: 16, fontStyle: "italic" }}>
              Tiata never writes to your software. It reads. Your data stays where it lives.
            </p>
          </div>

          {/* PRICING */}
          <div style={{ borderTop: SEP, padding: "88px 0" }} id="pricing">
            <Eyebrow>Pricing</Eyebrow>
            <h2 style={{ fontFamily: F.display, fontSize: "clamp(22px, 2.2vw, 34px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
              Pay once a month. Know your practice forever.
            </h2>
            <p style={{ fontFamily: F.body, fontSize: 15, color: "rgba(153,246,228,0.60)", margin: "0 0 36px", lineHeight: 1.6 }}>
              One hour of recovered billing pays for six months of Tiata.
            </p>
            <div className="grid-auto">
              {[
                { name: "Solo", price: "$149", period: "/mo", desc: "One attorney. One practice management connection. Plaid. Google. The weekly email that changes how you see your own business.", highlight: false, ctaLabel: "Get started" },
                { name: "Firm", price: "$299", period: "/mo", desc: "Up to four attorneys. Multi-platform support. Every attorney gets their own email. You get the firm-level roll-up.", highlight: true, ctaLabel: "Get started" },
                { name: "LawStack", price: "$99", period: "/mo for 6 mo", desc: "Already on LawStack? Your Clio connection already exists. Add Plaid. Add Google. Ten minutes.", highlight: false, ctaLabel: "Sign in with LawStack" },
              ].map(({ name, price, period, desc, highlight, ctaLabel }) => (
                <div key={name} style={{ background: C.white, border: `${highlight ? 2 : 1}px solid ${highlight ? C.cta : "rgba(255,255,255,0.15)"}`, borderRadius: 12, padding: 22, boxShadow: highlight ? "0 8px 32px rgba(0,0,0,0.30)" : "none" }}>
                  {highlight && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.accent, background: "rgba(20,184,166,0.10)", borderRadius: 999, padding: "3px 9px" }}>Most popular</span>
                    </div>
                  )}
                  <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: C.slate, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.07em" }}>{name}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "0 0 12px" }}>
                    <span style={{ fontFamily: F.display, fontSize: 34, fontWeight: 700, color: C.coal, lineHeight: 1 }}>{price}</span>
                    <span style={{ fontFamily: F.body, fontSize: 12, color: C.slate }}>{period}</span>
                  </div>
                  <div style={{ borderTop: `1px solid ${C.smoke}`, margin: "0 0 12px" }} />
                  <p style={{ fontFamily: F.body, fontSize: 12, color: C.slate, lineHeight: 1.6, margin: "0 0 16px" }}>{desc}</p>
                  <button onClick={onCTA}
                    style={{ width: "100%", background: highlight ? C.cta : "transparent", border: `1px solid ${highlight ? C.cta : C.smoke}`, borderRadius: 8, cursor: "pointer", fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.coal, height: 38, transition: "all 150ms" }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.background = highlight ? C.ctaDark : C.coal; el.style.borderColor = highlight ? C.ctaDark : C.coal; el.style.color = C.white }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.background = highlight ? C.cta : "transparent"; el.style.borderColor = highlight ? C.cta : C.smoke; el.style.color = C.coal }}
                  >{ctaLabel}</button>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(153,246,228,0.35)", marginTop: 20, fontStyle: "italic" }}>
              No free trial. 30-day money-back guarantee. No contract.
            </p>
          </div>

          {/* FAQ */}
          <div style={{ borderTop: SEP, padding: "88px 0 96px" }} id="faq">
            <Eyebrow>FAQ</Eyebrow>
            <h2 style={{ fontFamily: F.display, fontSize: "clamp(22px, 2.2vw, 32px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 36px" }}>
              Common questions.
            </h2>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "17px 0", textAlign: "left" }}>
                  <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.headline, lineHeight: 1.3, paddingRight: 16 }}>{faq.q}</span>
                  <span style={{ color: C.cta, fontSize: 18, flexShrink: 0, transform: openFaq === i ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 300ms ease", display: "inline-block" }}>›</span>
                </button>
                <div style={{ maxHeight: openFaq === i ? 300 : 0, overflow: "hidden", transition: "max-height 300ms ease" }}>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(153,246,228,0.60)", lineHeight: 1.65, padding: "0 0 17px", margin: 0 }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>

        </div>{/* end page-left */}

        {/* RIGHT COLUMN — empty spacer so content doesn't slide under the nav card */}
        <div className="page-right" />

      </div>{/* end page-grid */}

      {/* FOOTER */}
      <footer style={{ backgroundColor: C.bgDim, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px 36px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 48, flexWrap: "wrap", marginBottom: 32 }}>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.headline, margin: 0 }}>Tiata</p>
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
              {[["#overview","Overview"],["#use-cases","Use Cases"],["#pricing","Pricing"],["#faq","FAQ"],["#","Changelog"],["https://github.com/pepdek/PracticeIQ","GitHub"]].map(([href, label]) => (
                <a key={label} href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  style={{ fontFamily: F.body, fontSize: 13, color: "rgba(153,246,228,0.40)", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.body)}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(153,246,228,0.40)")}
                >{label}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 18, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontFamily: F.body, fontSize: 11, color: "rgba(153,246,228,0.20)", margin: 0 }}>© 2026 LawStack Inc. All rights reserved.</p>
            <p style={{ fontFamily: F.body, fontSize: 11, color: "rgba(153,246,228,0.20)", margin: 0 }}>legal@lawstack.co · privacy@lawstack.co</p>
          </div>
        </div>
      </footer>

      {/* Mobile sticky bar */}
      <div className="mobile-cta">
        <button onClick={onCTA} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.body, fontSize: 15, fontWeight: 700, color: C.coal, width: "100%", padding: "4px 0" }}>
          Get your first email free →
        </button>
      </div>

    </div>
  )
}
