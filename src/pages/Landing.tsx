import { useState } from "react"
import { useNavigate } from "react-router-dom"

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:       "#115E59",  // teal-800 - site background
  bgDim:    "#134E4A",  // teal-900 - footer band
  body:     "#99F6E4",  // teal-200 - body paragraph text
  headline: "#FFFFFF",  // white - all headlines
  accent:   "#14B8A6",  // teal-500 - links, badges, score numbers, data viz mid
  cta:      "#A3E635",  // lime-400 - CTA button background
  ctaDark:  "#84CC16",  // lime-500 - CTA hover
  coal:     "#1A1A1A",  // dark text on white cards
  slate:    "#6B6560",  // muted text on white cards
  smoke:    "#E8E6E1",  // dividers on white cards
  white:    "#FFFFFF",  // card backgrounds
  green:    "#2ECC71",  // data viz - healthy bar
}

const F = {
  display: "'Playfair Display', Georgia, serif",
  body:    "'Inter', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'Courier New', monospace",
}

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
  { q: "Does Sundial replace Clio or MyCase?",
    a: "No. It reads from them. You keep using whatever you're using. Sundial surfaces what your software already knows but never tells you." },
  { q: "Is there a dashboard?",
    a: "No. There is one email per week. If you need to see more than the email shows, open Clio - that's where the data lives. Sundial is the signal, not the system." },
  { q: "What does 'read only' mean for my bank account?",
    a: "Sundial never sees your banking credentials. Plaid handles authentication. Sundial reads deposit amounts and timing only - not transaction descriptions, not client names. Read-only means read-only." },
  { q: "What practice management software does it work with?",
    a: "Clio, Filevine, MyCase, Cosmolex, and PracticePanther at launch. Smokeball in Q3." },
  { q: "Is my client data safe?",
    a: "Sundial reads operational patterns - billing totals, payment timing, matter counts. It never reads client names, case details, or privileged communications. It cannot write to any connected system." },
  { q: "What if the email isn't useful?",
    a: "Cancel. No contract. We'd rather you not pay than pay for something that doesn't change anything." },
]

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: F.body, fontSize: 12, fontWeight: 500,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: `rgba(153,246,228,0.45)`, margin: "0 0 16px",
    }}>
      {children}
    </p>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const onCTA = () => navigate("/onboarding")

  return (
    <div style={{ backgroundColor: C.bg, fontFamily: F.body, color: C.body }}>

      {/* ── Global styles ── */}
      <style>{`
        @keyframes sundial-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex; width: max-content;
          will-change: transform;
          animation: sundial-ticker 40s linear infinite;
        }
        .ticker-track:hover { animation-play-state: paused; }
        html { scroll-behavior: smooth; }
        *, *::before, *::after { box-sizing: border-box; }

        .desktop-only { display: flex; }
        .mobile-only  { display: none; }

        /* Asymmetric sticky-sidebar layout: 60% content / 10% gap / 30% CTA */
        .layout-grid  { display: grid; grid-template-columns: 60fr 10fr 30fr; align-items: start; }
        .layout-cta   { grid-column: 3; position: sticky; top: 80px; align-self: start; }

        .grid-2       { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .grid-3       { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .grid-auto    { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .table-wrap   { width: 100%; overflow-x: auto; }
        .mobile-cta   { display: none; }

        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only  { display: flex !important; }
          .layout-grid  { grid-template-columns: 1fr; }
          .layout-cta   { grid-column: 1; order: -1; position: static; }
          .grid-2       { grid-template-columns: 1fr; }
          .grid-3       { grid-template-columns: 1fr; }
          .grid-auto    { grid-template-columns: 1fr; }
          .mobile-cta   {
            display: flex !important;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
            background: ${C.cta}; padding: 14px 20px;
            align-items: center; justify-content: center;
            box-shadow: 0 -2px 16px rgba(0,0,0,0.3);
          }
          .section-pad  { padding: 64px 20px !important; }
          .hero-pad     { padding: 48px 20px 80px !important; }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════
          NAV
      ════════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        height: 56, backgroundColor: C.bg,
        borderBottom: "1px solid rgba(255,255,255,0.10)",
      }}>
        <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>

          <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.headline }}>
            Sundial
          </span>

          {/* Center links - desktop */}
          <div className="desktop-only" style={{ gap: 32, alignItems: "center" }}>
            {[["#overview", "Overview"], ["#use-cases", "Use Cases"], ["#", "Changelog"], ["https://github.com/pepdek/PracticeIQ", "GitHub"]].map(([href, label]) => (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: "rgba(153,246,228,0.6)", textDecoration: "none", transition: "color 150ms" }}
                onMouseEnter={e => (e.currentTarget.style.color = C.headline)}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(153,246,228,0.6)")}
              >{label}</a>
            ))}
          </div>

          {/* Right - compact post-it card (desktop) */}
          <div className="desktop-only" style={{ alignItems: "center" }}>
            <div style={{
              background: C.white, borderRadius: 8, height: 40,
              display: "flex", alignItems: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}>
              <div style={{ padding: "0 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.slate }}>Sundial</span>
                <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 700, color: C.accent, lineHeight: 1 }}>74</span>
                <span style={{ fontFamily: F.mono, fontSize: 9, color: C.slate }}>this week</span>
              </div>
              <div style={{ width: 1, height: 24, background: C.smoke }} />
              <button onClick={onCTA} style={{
                background: C.cta, border: "none", cursor: "pointer",
                fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.coal,
                height: 40, padding: "0 16px", transition: "background 150ms",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.ctaDark)}
              onMouseLeave={e => (e.currentTarget.style.background = C.cta)}
              >
                Get it free
              </button>
            </div>
          </div>

          {/* Mobile: lime pill */}
          <button className="mobile-only" onClick={onCTA} style={{
            background: C.cta, border: "none", cursor: "pointer",
            fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.coal,
            padding: "8px 16px", borderRadius: 999,
          }}>
            Get it free
          </button>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════════ */}
      <section>
        <div className="hero-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 32px 96px" }}>
          <div className="layout-grid">

            {/* Left - 60% */}
            <div>
              <div style={{ display: "inline-block", marginBottom: 28 }}>
                <span style={{ fontFamily: F.mono, fontSize: 11, color: "rgba(153,246,228,0.5)", border: "1px solid rgba(153,246,228,0.2)", borderRadius: 4, padding: "2px 8px" }}>
                  2.0
                </span>
              </div>

              <h1 style={{
                fontFamily: F.display, fontSize: "clamp(32px, 4vw, 64px)",
                fontWeight: 700, lineHeight: 1.1, color: C.headline,
                letterSpacing: "-0.02em", margin: "0 0 20px",
              }}>
                Practice intelligence for solo and small law firms. Without the guesswork.
              </h1>

              <p style={{
                fontFamily: F.display, fontSize: "clamp(18px, 2vw, 26px)",
                fontWeight: 400, color: "rgba(153,246,228,0.70)", lineHeight: 1.25,
                margin: "0 0 24px",
              }}>
                And every number comes from your actual data.
              </p>

              <p style={{
                fontFamily: F.body, fontSize: "clamp(15px, 1.2vw, 17px)", color: C.body,
                lineHeight: 1.65, margin: "0 0 36px", maxWidth: 520,
              }}>
                If you use Clio, Filevine, or MyCase, you already have the data.
                Connect once. Sundial reads it in the background. One email, every Sunday.
                You know more about your practice than you ever have - without changing anything.
              </p>

              <div style={{
                background: "rgba(255,255,255,0.07)", borderRadius: 8,
                padding: "14px 20px", display: "inline-block",
                border: "1px solid rgba(255,255,255,0.12)",
              }}>
                <span style={{ fontFamily: F.mono, fontSize: 13, color: C.accent }}>
                  Your Practice Health Score: 74 - down 6 points. Here's why.
                </span>
              </div>
              <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(153,246,228,0.35)", marginTop: 8, fontStyle: "italic" }}>
                What Sunday morning looks like.
              </p>
            </div>

            {/* Right - 30% (col 3), sticky CTA card. On mobile: order -1, appears above */}
            <div className="layout-cta">
              <div style={{
                background: C.white, borderRadius: 12, padding: 28,
                boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                  <div>
                    <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.coal, margin: "0 0 2px" }}>Sundial</p>
                    <p style={{ fontFamily: F.body, fontSize: 11, color: C.slate, margin: 0 }}>one number. every week.</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: F.display, fontSize: 38, fontWeight: 700, lineHeight: 1, color: C.accent, display: "block" }}>74</span>
                    <span style={{ fontFamily: F.mono, fontSize: 9, color: C.slate }}>this week</span>
                  </div>
                </div>

                <div style={{ borderTop: `1px solid ${C.smoke}`, margin: "0 0 16px" }} />

                <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.slate, margin: "0 0 12px" }}>
                  What's included?
                </p>

                {["One email. Every Sunday. No logins.", "Five dimensions. All sourced from your data.", "Connects to Clio, Plaid, and Google.", "Your first score, free."].map(item => (
                  <div key={item} style={{ display: "flex", gap: 9, marginBottom: 10, alignItems: "flex-start" }}>
                    <span style={{ color: C.accent, fontSize: 13, lineHeight: "19px", flexShrink: 0, fontWeight: 700 }}>✓</span>
                    <span style={{ fontFamily: F.body, fontSize: 13, color: C.coal, lineHeight: 1.45 }}>{item}</span>
                  </div>
                ))}

                <div style={{ background: "#F9F8F5", borderRadius: 8, padding: "10px 12px", margin: "14px 0" }}>
                  {[["Revenue", 12.5], ["Velocity", 17], ["Risk", 16], ["Financial", 13.5], ["Reputation", 13]].map(([label, score]) => (
                    <div key={String(label)} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <span style={{ fontFamily: F.body, fontSize: 10, color: C.slate, width: 62, flexShrink: 0 }}>{label}</span>
                      <div style={{ flex: 1, height: 3, background: C.smoke, borderRadius: 2 }}>
                        <div style={{ height: 3, borderRadius: 2, width: `${(Number(score) / 20) * 100}%`, background: Number(score) >= 16 ? C.green : Number(score) >= 12 ? C.accent : "#ef4444" }} />
                      </div>
                      <span style={{ fontFamily: F.mono, fontSize: 9, color: C.slate, width: 28, textAlign: "right" }}>{score}/20</span>
                    </div>
                  ))}
                </div>

                <button onClick={onCTA} style={{
                  width: "100%", background: C.cta, border: "none", cursor: "pointer",
                  fontFamily: F.body, fontSize: 15, fontWeight: 700, color: C.coal,
                  height: 48, borderRadius: 8, transition: "background 150ms",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = C.ctaDark)}
                onMouseLeave={e => (e.currentTarget.style.background = C.cta)}
                >
                  Get your first email free
                </button>

                <p style={{ fontFamily: F.body, fontSize: 11, color: C.slate, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
                  <a href="#faq" style={{ color: C.slate, textDecoration: "underline" }}>Read the FAQs</a>
                  {" "}before connecting. 30-day money-back.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          TICKER
      ════════════════════════════════════════════════════════════════ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.10)", borderBottom: "1px solid rgba(255,255,255,0.10)", padding: "40px 0", overflow: "hidden" }} id="overview">
        <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(153,246,228,0.4)", textAlign: "center", marginBottom: 24, marginTop: 0 }}>
          What Sunday looks like
        </p>
        <div style={{ overflow: "hidden" }}>
          <div className="ticker-track">
            {[...TICKER_CARDS, ...TICKER_CARDS].map((card, i) => (
              <div key={i} style={{
                flexShrink: 0, width: 280, margin: "0 10px",
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8, padding: "16px 18px",
              }}>
                <p style={{ fontFamily: F.mono, fontSize: 9, color: "rgba(153,246,228,0.4)", margin: "0 0 8px" }}>Week ending {card.week}</p>
                <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.headline, margin: "0 0 5px", lineHeight: 1.3 }}>{card.headline}</p>
                <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(153,246,228,0.60)", margin: 0, lineHeight: 1.5 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          THE PROBLEM
      ════════════════════════════════════════════════════════════════ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="section-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 32px" }}>
          <Eyebrow>The problem</Eyebrow>
          <h2 style={{ fontFamily: F.display, fontSize: "clamp(26px, 3vw, 44px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 48px", maxWidth: 640 }}>
            Every attorney in America is running their practice blind.
          </h2>

          <div className="grid-2" style={{ marginBottom: 56 }}>
            {[
              "What is your real realization rate this month?",
              "What actually landed in your bank account last week?",
              "Which matter type generates your highest revenue per hour?",
              "What percentage of consultations became retained clients?",
            ].map(q => (
              <div key={q} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "20px 24px" }}>
                <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(153,246,228,0.60)", lineHeight: 1.5, margin: "0 0 14px" }}>{q}</p>
                <p style={{ fontFamily: F.display, fontSize: 26, fontWeight: 700, color: "rgba(153,246,228,0.15)", margin: 0, letterSpacing: "-0.02em" }}>Unknown.</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }} className="grid-2">
            <div>
              <blockquote style={{
                fontFamily: F.display, fontSize: "clamp(16px, 1.8vw, 22px)",
                fontWeight: 400, fontStyle: "italic", color: C.accent, lineHeight: 1.55,
                margin: "0 0 14px",
                borderLeft: `3px solid ${C.accent}`, paddingLeft: 24,
              }}>
                "It shouldn't be the case that an attorney billing $300 an hour has never seen their real realization rate.
                That they don't know which referral source produces their highest-value clients.
                That they can't tell, right now, whether their practice is growing or slowly dying."
              </blockquote>
              <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(153,246,228,0.35)", paddingLeft: 24 }}>
                That's not a software gap. That's a structural failure of an entire industry - accepted as normal for thirty years.
              </p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "28px 32px" }}>
              <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(153,246,228,0.35)", margin: "0 0 16px" }}>
                Clio knows your matters.
              </p>
              <p style={{ fontFamily: F.display, fontSize: "clamp(18px, 1.8vw, 24px)", fontWeight: 700, color: C.headline, lineHeight: 1.3, margin: "0 0 16px" }}>
                It doesn't know your practice. There's a difference.
              </p>
              <p style={{ fontFamily: F.body, fontSize: 15, color: C.body, lineHeight: 1.65, margin: 0 }}>
                Practice management software was built to manage cases, not to run businesses.
                Attorneys who connect Sundial see their practice differently within one email.
                They stop flying by feel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════════════ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} id="how-it-works">
        <div className="section-pad" style={{ maxWidth: 640, margin: "0 auto", padding: "96px 32px" }}>
          <Eyebrow>Setup</Eyebrow>
          <h2 style={{ fontFamily: F.display, fontSize: "clamp(22px, 2.5vw, 36px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 48px" }}>
            Connect your practice in ten minutes.
          </h2>

          {["Connect your practice management software", "Connect your bank account via Plaid", "Confirm your email address"].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 20, marginBottom: i < 2 ? 28 : 0, alignItems: "flex-start" }}>
              <span style={{ fontFamily: F.mono, fontSize: 13, color: C.accent, flexShrink: 0, marginTop: 2, minWidth: 20 }}>{i + 1}.</span>
              <p style={{ fontFamily: F.body, fontSize: 17, color: C.body, lineHeight: 1.5, margin: 0 }}>{step}</p>
            </div>
          ))}

          <p style={{ fontFamily: F.display, fontSize: 18, fontStyle: "italic", color: "rgba(153,246,228,0.40)", margin: "44px 0 0" }}>
            That's it. Your first email arrives Sunday.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          USE CASES
      ════════════════════════════════════════════════════════════════ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} id="use-cases">
        <div className="section-pad" style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 32px" }}>
          <Eyebrow>It fits wherever you are</Eyebrow>
          <h2 style={{ fontFamily: F.display, fontSize: "clamp(22px, 2.5vw, 36px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 40px", maxWidth: 520 }}>
            It fits in a lot of places.
          </h2>
          <div className="grid-auto">
            {[
              { title: "If you're a solo flying by feel.", body: "You track some numbers - a rough sense of realization, a month-end spreadsheet. Sundial gives you the next level of clarity without hiring an office manager." },
              { title: "If you're managing 3-8 attorneys.", body: "You're a managing partner by necessity, not by choice. You know something's wrong with the numbers but can't see what. Sundial shows you." },
              { title: "If you've been burned by dashboards before.", body: "There is no dashboard. There is one email. It arrives. You read it. That's the product." },
              { title: "If you're on Clio.", body: "You're already connected. Sundial adds Plaid and Google. Ten-minute setup. First email Sunday." },
              { title: "If you're on Filevine or MyCase.", body: "Same email. Same intelligence. Your software's data, finally surfaced." },
              { title: "If you're growing intentionally.", body: "Sundial tells you your intake conversion rate - of every consultation booked, how many became retained matters. That number tells you exactly where your marketing spend is working." },
            ].map(({ title, body }) => (
              <div key={title} style={{ background: C.white, borderRadius: 8, padding: 24, transition: "box-shadow 150ms" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.30)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
              >
                <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.coal, margin: "0 0 8px", lineHeight: 1.3 }}>{title}</p>
                <p style={{ fontFamily: F.body, fontSize: 13, color: C.slate, margin: 0, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          DATA SOURCES
      ════════════════════════════════════════════════════════════════ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="section-pad" style={{ maxWidth: 800, margin: "0 auto", padding: "96px 32px" }}>
          <Eyebrow>Connect once. Read forever.</Eyebrow>
          <h2 style={{ fontFamily: F.display, fontSize: "clamp(22px, 2.5vw, 36px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 36px" }}>
            Your data stays where it lives.
          </h2>
          <div className="table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.06)" }}>
                  {["Platform", "Connection", "What you'll see"].map(h => (
                    <th key={h} style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, color: "rgba(153,246,228,0.45)", textAlign: "left", padding: "10px 16px", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Clio", "OAuth - one click", "Matters, time, invoices, AR aging, billing rates"],
                  ["Filevine", "OAuth - one click", "Matters, tasks, contacts, billing"],
                  ["MyCase", "OAuth - one click", "Matters, time entries, invoices"],
                  ["Plaid", "Plaid Link - read only", "Cash position, deposit timing, trust account balance"],
                  ["QuickBooks Online", "OAuth - one click", "P&L, expenses, payroll"],
                  ["Google Business Profile", "Google OAuth", "Reviews, rating, referral velocity"],
                ].map(([platform, conn, what]) => (
                  <tr key={platform} style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <td style={{ fontFamily: F.body, fontSize: 13, fontWeight: 500, color: C.body, padding: "11px 16px" }}>{platform}</td>
                    <td style={{ fontFamily: F.mono, fontSize: 11, color: "rgba(153,246,228,0.50)", padding: "11px 16px" }}>{conn}</td>
                    <td style={{ fontFamily: F.body, fontSize: 13, color: "rgba(153,246,228,0.65)", padding: "11px 16px" }}>{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(153,246,228,0.30)", marginTop: 20, fontStyle: "italic" }}>
            Sundial never writes to your software. It reads. Your data stays where it lives.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          PRICING
      ════════════════════════════════════════════════════════════════ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} id="pricing">
        <div className="section-pad" style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 32px" }}>
          <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 48px" }}>
            <Eyebrow>Pricing</Eyebrow>
            <h2 style={{ fontFamily: F.display, fontSize: "clamp(22px, 2.5vw, 36px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
              Pay once a month. Know your practice forever.
            </h2>
            <p style={{ fontFamily: F.body, fontSize: 16, color: "rgba(153,246,228,0.60)", margin: 0, lineHeight: 1.65 }}>
              One hour of recovered billing pays for six months of Sundial.
            </p>
          </div>

          <div className="grid-3">
            {[
              { name: "Solo", price: "$149", period: "/mo", desc: "One attorney. One practice management connection. Plaid. Google. The weekly email that changes how you see your own business.", highlight: false, ctaLabel: "Get started" },
              { name: "Firm", price: "$299", period: "/mo", desc: "Up to four attorneys. Multi-platform support. Every attorney gets their own email. You get the firm-level roll-up.", highlight: true, ctaLabel: "Get started" },
              { name: "LawStack", price: "$99", period: "/mo for 6 months", desc: "Already on LawStack? Your Clio connection already exists. Add Plaid. Add Google. Ten minutes.", highlight: false, ctaLabel: "Sign in with LawStack" },
            ].map(({ name, price, period, desc, highlight, ctaLabel }) => (
              <div key={name} style={{
                background: C.white,
                border: `${highlight ? 2 : 1}px solid ${highlight ? C.cta : "rgba(255,255,255,0.15)"}`,
                borderRadius: 12, padding: 28,
                boxShadow: highlight ? "0 8px 32px rgba(0,0,0,0.30)" : "none",
              }}>
                {highlight && (
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.accent, background: "rgba(20,184,166,0.10)", borderRadius: 999, padding: "3px 9px" }}>
                      Most popular
                    </span>
                  </div>
                )}
                <p style={{ fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.slate, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.07em" }}>{name}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "0 0 14px" }}>
                  <span style={{ fontFamily: F.display, fontSize: 38, fontWeight: 700, color: C.coal, lineHeight: 1 }}>{price}</span>
                  <span style={{ fontFamily: F.body, fontSize: 13, color: C.slate }}>{period}</span>
                </div>
                <div style={{ borderTop: `1px solid ${C.smoke}`, margin: "0 0 16px" }} />
                <p style={{ fontFamily: F.body, fontSize: 13, color: C.slate, lineHeight: 1.6, margin: "0 0 20px" }}>{desc}</p>
                <button onClick={onCTA} style={{
                  width: "100%",
                  background: highlight ? C.cta : "transparent",
                  border: `1px solid ${highlight ? C.cta : C.smoke}`,
                  borderRadius: 8, cursor: "pointer",
                  fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.coal,
                  height: 42, transition: "all 150ms",
                }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.background = highlight ? C.ctaDark : C.coal; el.style.borderColor = highlight ? C.ctaDark : C.coal; el.style.color = C.white }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.background = highlight ? C.cta : "transparent"; el.style.borderColor = highlight ? C.cta : C.smoke; el.style.color = C.coal }}
                >
                  {ctaLabel}
                </button>
              </div>
            ))}
          </div>

          <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(153,246,228,0.35)", textAlign: "center", marginTop: 24, fontStyle: "italic" }}>
            No free trial. 30-day money-back guarantee. No contract.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          FAQ
      ════════════════════════════════════════════════════════════════ */}
      <section style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} id="faq">
        <div className="section-pad" style={{ maxWidth: 720, margin: "0 auto", padding: "96px 32px" }}>
          <Eyebrow>FAQ</Eyebrow>
          <h2 style={{ fontFamily: F.display, fontSize: "clamp(22px, 2.5vw, 32px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 40px" }}>
            Common questions.
          </h2>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0", textAlign: "left" }}
              >
                <span style={{ fontFamily: F.body, fontSize: 15, fontWeight: 600, color: C.headline, lineHeight: 1.3, paddingRight: 16 }}>{faq.q}</span>
                <span style={{ color: C.cta, fontSize: 18, flexShrink: 0, transform: openFaq === i ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 300ms ease", display: "inline-block" }}>›</span>
              </button>
              <div style={{ maxHeight: openFaq === i ? 300 : 0, overflow: "hidden", transition: "max-height 300ms ease" }}>
                <p style={{ fontFamily: F.body, fontSize: 14, color: "rgba(153,246,228,0.60)", lineHeight: 1.65, padding: "0 0 18px", margin: 0 }}>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          FOOTER CTA
      ════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.bgDim, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="section-pad" style={{ maxWidth: 640, margin: "0 auto", padding: "96px 32px", textAlign: "center" }}>
          <h2 style={{ fontFamily: F.display, fontSize: "clamp(22px, 2.5vw, 38px)", fontWeight: 700, lineHeight: 1.1, color: C.headline, letterSpacing: "-0.02em", margin: "0 0 18px" }}>
            One number. Every week. From your own data.
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 17, color: "rgba(153,246,228,0.65)", lineHeight: 1.65, margin: "0 0 36px" }}>
            Stop flying by feel. Your first score is free.
          </p>
          <button onClick={onCTA} style={{
            background: C.cta, border: "none", cursor: "pointer",
            fontFamily: F.body, fontSize: 16, fontWeight: 700, color: C.coal,
            padding: "15px 40px", borderRadius: 8, transition: "background 150ms, transform 150ms",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.ctaDark; e.currentTarget.style.transform = "scale(1.01)" }}
          onMouseLeave={e => { e.currentTarget.style.background = C.cta; e.currentTarget.style.transform = "scale(1)" }}
          >
            Get your first email free
          </button>
          <p style={{ fontFamily: F.body, fontSize: 11, color: "rgba(153,246,228,0.30)", marginTop: 14 }}>
            Your first score arrives this Sunday.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════ */}
      <footer style={{ backgroundColor: C.bgDim, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 32px 40px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 40 }}>
          <div>
            <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.headline, margin: "0 0 6px" }}>Sundial</p>
            <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(153,246,228,0.35)", margin: "0 0 4px" }}>Designed, built, and backed by LawStack Inc.</p>
            <p style={{ fontFamily: F.body, fontSize: 11, color: "rgba(153,246,228,0.20)", margin: 0, fontStyle: "italic" }}>one number. every week. your practice, finally legible.</p>
          </div>
          <div style={{ display: "flex", gap: 48 }}>
            <div>
              <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(153,246,228,0.25)", margin: "0 0 10px" }}>Product</p>
              {[["#overview","Overview"],["#use-cases","Use Cases"],["#pricing","Pricing"],["#faq","FAQ"]].map(([href, label]) => (
                <div key={href} style={{ marginBottom: 7 }}>
                  <a href={href} style={{ fontFamily: F.body, fontSize: 13, color: "rgba(153,246,228,0.40)", textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.body)}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(153,246,228,0.40)")}
                  >{label}</a>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontFamily: F.body, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(153,246,228,0.25)", margin: "0 0 10px" }}>Legal</p>
              {[["Privacy","#"],["Terms","#"],["Security","#"]].map(([label, href]) => (
                <div key={label} style={{ marginBottom: 7 }}>
                  <a href={href} style={{ fontFamily: F.body, fontSize: 13, color: "rgba(153,246,228,0.40)", textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.body)}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(153,246,228,0.40)")}
                  >{label}</a>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 32px 32px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <p style={{ fontFamily: F.body, fontSize: 11, color: "rgba(153,246,228,0.20)", margin: 0 }}>© 2026 LawStack Inc. All rights reserved.</p>
          <p style={{ fontFamily: F.body, fontSize: 11, color: "rgba(153,246,228,0.20)", margin: 0 }}>legal@lawstack.co · privacy@lawstack.co</p>
        </div>
      </footer>

      {/* ════════════════════════════════════════════════════════════════
          MOBILE FLOATING CTA BAR
      ════════════════════════════════════════════════════════════════ */}
      <div className="mobile-cta">
        <button onClick={onCTA} style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: F.body, fontSize: 15, fontWeight: 700, color: C.coal,
          width: "100%", padding: "4px 0",
        }}>
          Get your first email free →
        </button>
      </div>

    </div>
  )
}
