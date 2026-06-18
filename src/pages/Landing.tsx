import { useState } from "react"
import { useNavigate } from "react-router-dom"

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  coal:      "#1A1A1A",
  ash:       "#F5F4F0",
  smoke:     "#E8E6E1",
  slate:     "#6B6560",
  ember:     "#D94F2B",   // accent only — links, badges, version callout
  emberDark: "#B83D1F",
  gold:      "#C8971A",   // score display — brass sundial face
  oxblood:   "#7F1D1D",   // Tailwind red-900 — our version of Campfire's blue. The wow.
  amber:     "#D97706",   // Tailwind amber-600 — the ONLY amber on the page. The exhale.
  amberDark: "#B45309",   // amber-700 — hover state
  green:     "#2ECC71",   // data viz only — dimension bar "healthy" indicator
  white:     "#FFFFFF",
}

const F = {
  display: "'Playfair Display', Georgia, serif",
  body:    "'Inter', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'Courier New', monospace",
}

// ── Ticker cards ──────────────────────────────────────────────────────────────
const TICKER_CARDS = [
  { week: "Jun 15", headline: "Revenue Capture: 12.5/20", body: "AR over 60 days reached $14,200 — up $5,800 from last week. Three invoices past due." },
  { week: "Jun 22", headline: "Practice Velocity: 17/20", body: "Active matters at 12-week high. 3 opened, 1 closed. Pipeline direction: positive." },
  { week: "Jun 8",  headline: "Risk Exposure: 8/20", body: "Trust balance dipped to $320 — below the $500 threshold. Review before Thursday." },
  { week: "May 25", headline: "Collection rate: 91%", body: "Best 4-week average in 8 months. 14.2 hours billed, 12.9 collected." },
  { week: "Jun 1",  headline: "Financial Position: 13.5/20", body: "Operating balance 18% below 90-day average. $28k invoiced, $12.4k deposited this week." },
  { week: "Jun 29", headline: "Reputation: 4.8 ★", body: "No new reviews this week. Last review 23 days ago. Velocity below baseline." },
  { week: "May 18", headline: "Realization rate: 87%", body: "Two matters under 70% realization. Both opened 60+ days ago with no activity logged." },
  { week: "Jun 15", headline: "AR 90+ days: $0", body: "Every invoice collected within 90 days. First clean week in 6 months." },
]

// ── FAQ data ──────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "Does Sundial replace Clio or MyCase?",
    a: "No. It reads from them. You keep using whatever you're using. Sundial surfaces what your software already knows but never tells you.",
  },
  {
    q: "Is there a dashboard?",
    a: "No. There is one email per week. If you need to see more than the email shows, open Clio — that's where the data lives. Sundial is the signal, not the system.",
  },
  {
    q: "What does 'read only' mean for my bank account?",
    a: "Sundial never sees your banking credentials. Plaid handles authentication. Sundial reads deposit amounts and timing only — not individual transaction descriptions, not client names, not payee details. Read-only means read-only.",
  },
  {
    q: "What practice management software does it work with?",
    a: "Clio, Filevine, MyCase, Cosmolex, and PracticePanther at launch. Smokeball in Q3.",
  },
  {
    q: "Is my client data safe?",
    a: "Sundial reads operational patterns — billing totals, payment timing, matter counts. It does not read client names, case details, or privileged communications. It is a business intelligence tool, not a case management tool.",
  },
  {
    q: "What if the email isn't useful?",
    a: "Cancel. No contract. We'd rather you not pay than pay for something that doesn't change anything.",
  },
]

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  children,
  id,
  bg = C.ash,
  style = {},
}: {
  children: React.ReactNode
  id?: string
  bg?: string
  style?: React.CSSProperties
}) {
  return (
    <section id={id} style={{ backgroundColor: bg, ...style }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 32px" }}>
        {children}
      </div>
    </section>
  )
}

// ── Eyebrow label ─────────────────────────────────────────────────────────────
function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p style={{
      fontFamily: F.body,
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: light ? "rgba(245,244,240,0.5)" : C.slate,
      marginBottom: 16,
    }}>
      {children}
    </p>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const onCTA = () => navigate("/onboarding")
  const onSignIn = () => navigate("/onboarding")

  return (
    <div style={{ backgroundColor: C.ash, fontFamily: F.body, color: C.coal }}>

      {/* ── Ticker keyframe ── */}
      <style>{`
        @keyframes sundial-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: sundial-ticker 40s linear infinite;
        }
        .ticker-track:hover { animation-play-state: paused; }
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════
          NAV
      ════════════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        height: 56, backgroundColor: C.ash,
        borderBottom: `1px solid ${C.smoke}`,
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center",
        padding: "0 32px",
      }}>
        <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.coal }}>
              Sundial
            </span>
          </div>

          {/* Center links — desktop */}
          <div style={{ display: "flex", gap: 32, alignItems: "center" }} className="hidden-mobile">
            {[
              ["#what-is-it", "Overview"],
              ["#how-it-works", "How it works"],
              ["#pricing", "Pricing"],
              ["#faq", "FAQ"],
            ].map(([href, label]) => (
              <a key={href} href={href} style={{
                fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.slate,
                textDecoration: "none", transition: "color 150ms",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = C.coal)}
              onMouseLeave={e => (e.currentTarget.style.color = C.slate)}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={onSignIn} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.slate,
              padding: "0 4px",
            }}>
              Sign in
            </button>
            <button onClick={onCTA} style={{
              background: C.amber, border: "none", cursor: "pointer",
              fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.coal,
              padding: "8px 20px", borderRadius: 999,
              transition: "background 150ms, transform 150ms",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.amberDark; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.amber; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)" }}
            >
              Get it free
            </button>
          </div>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.oxblood }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 32px 96px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 64, alignItems: "start" }}>

            {/* Left */}
            <div>
              {/* Version badge */}
              <div style={{ display: "inline-block", marginBottom: 28 }}>
                <span style={{
                  fontFamily: F.mono, fontSize: 11,
                  color: "rgba(245,244,240,0.55)",
                  border: "1px solid rgba(245,244,240,0.25)",
                  borderRadius: 4, padding: "2px 8px",
                }}>
                  2.0
                </span>
              </div>

              <h1 style={{
                fontFamily: F.display, fontSize: "clamp(36px, 4vw, 64px)",
                fontWeight: 700, lineHeight: 1.1, color: C.ash,
                letterSpacing: "-0.02em", margin: "0 0 20px",
                maxWidth: 580,
              }}>
                Practice intelligence for solo and small law firms. Without the guesswork.
              </h1>

              <p style={{
                fontFamily: F.display, fontSize: "clamp(20px, 2vw, 28px)",
                fontWeight: 400, color: "rgba(245,244,240,0.65)", lineHeight: 1.25,
                margin: "0 0 24px",
              }}>
                And every number comes from your actual data.
              </p>

              <p style={{
                fontFamily: F.body, fontSize: 17, color: "rgba(245,244,240,0.85)",
                lineHeight: 1.65, margin: "0 0 36px", maxWidth: 520,
              }}>
                If you use Clio, Filevine, or MyCase, you already have the data.
                Connect once, and Sundial reads it in the background. One email arrives
                every Sunday. You know more about your practice than you ever have —
                without changing anything.
              </p>

              {/* Sample subject line */}
              <div style={{
                background: "rgba(255,255,255,0.10)", borderRadius: 8,
                padding: "14px 20px", display: "inline-block", marginBottom: 8,
                border: "1px solid rgba(255,255,255,0.12)",
              }}>
                <span style={{ fontFamily: F.mono, fontSize: 13, color: C.gold }}>
                  Your Practice Health Score: 74 — down 6 points. Here's why.
                </span>
              </div>
              <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(245,244,240,0.40)", marginTop: 8, fontStyle: "italic" }}>
                What Sunday morning looks like.
              </p>
            </div>

            {/* Right — Campfire-style post-it CTA card */}
            <div style={{ position: "sticky", top: 80 }}>
              <div style={{
                background: C.white, border: `1px solid ${C.smoke}`,
                borderRadius: 12, padding: 32,
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }}>
                {/* Card header — wordmark + score side-by-side */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.coal, margin: "0 0 2px" }}>
                      Sundial
                    </p>
                    <p style={{ fontFamily: F.body, fontSize: 12, color: C.slate, margin: 0 }}>
                      one number. every week.
                    </p>
                  </div>
                  {/* Score pill — the product made visible */}
                  <div style={{ textAlign: "right" }}>
                    <span style={{
                      fontFamily: F.display, fontSize: 40, fontWeight: 700,
                      lineHeight: 1, color: C.gold, display: "block",
                    }}>74</span>
                    <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate }}>this week</span>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: `1px solid ${C.smoke}`, margin: "0 0 20px" }} />

                {/* What's included label */}
                <p style={{
                  fontFamily: F.body, fontSize: 11, fontWeight: 600,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  color: C.slate, margin: "0 0 14px",
                }}>
                  What's included?
                </p>

                {/* Feature checklist */}
                {[
                  "One email. Every Sunday. No logins.",
                  "Five dimensions. All sourced from your data.",
                  "Connects to Clio, Plaid, and Google.",
                  "Your first score, free.",
                ].map(item => (
                  <div key={item} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                    <span style={{
                      color: C.amber, fontSize: 14, lineHeight: "20px",
                      flexShrink: 0, fontWeight: 700,
                    }}>✓</span>
                    <span style={{ fontFamily: F.body, fontSize: 14, color: C.coal, lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}

                {/* Dimension score bars — compact */}
                <div style={{
                  background: "#F9F8F5", border: `1px solid ${C.smoke}`,
                  borderRadius: 8, padding: "12px 14px", margin: "16px 0",
                }}>
                  {[["Revenue", 12.5], ["Velocity", 17], ["Risk", 16], ["Financial", 13.5], ["Reputation", 13]].map(([label, score]) => (
                    <div key={String(label)} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontFamily: F.body, fontSize: 11, color: C.slate, width: 68, flexShrink: 0 }}>{label}</span>
                      <div style={{ flex: 1, height: 4, background: C.smoke, borderRadius: 2 }}>
                        <div style={{
                          height: 4, borderRadius: 2,
                          width: `${(Number(score) / 20) * 100}%`,
                          background: Number(score) >= 16 ? C.green : Number(score) >= 12 ? C.gold : C.ember,
                        }} />
                      </div>
                      <span style={{ fontFamily: F.mono, fontSize: 10, color: C.slate, width: 30, textAlign: "right" }}>{score}/20</span>
                    </div>
                  ))}
                </div>

                {/* Amber CTA — the only amber on the page. The exhale. */}
                <button onClick={onCTA} style={{
                  width: "100%",
                  background: C.amber, border: "none", cursor: "pointer",
                  fontFamily: F.body, fontSize: 16, fontWeight: 700, color: C.coal,
                  height: 52, borderRadius: 8,
                  transition: "background 150ms, transform 150ms",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.amberDark; e.currentTarget.style.color = C.white }}
                onMouseLeave={e => { e.currentTarget.style.background = C.amber; e.currentTarget.style.color = C.coal }}
                >
                  Get your first email free
                </button>

                {/* Footer note */}
                <p style={{ fontFamily: F.body, fontSize: 12, color: C.slate, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
                  <a href="#faq" style={{ color: C.slate, textDecoration: "underline" }}>Review all of the FAQs</a>
                  {" "}before connecting. 30-day money-back.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — THE PROBLEM (dark)
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.coal, padding: "96px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow light>The problem</Eyebrow>
          <h2 style={{
            fontFamily: F.display, fontSize: "clamp(28px, 3vw, 44px)",
            fontWeight: 700, lineHeight: 1.1, color: C.ash,
            letterSpacing: "-0.02em", margin: "0 0 48px", maxWidth: 640,
          }}>
            Every attorney in America is running their practice blind.
          </h2>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 56 }}>
            {[
              { q: "What is your real realization rate this month?", unit: "%" },
              { q: "What actually landed in your bank account last week?", unit: "$" },
              { q: "Which matter type generates your highest revenue per hour?", unit: "type" },
              { q: "What percentage of consultations became retained clients?", unit: "%" },
            ].map(({ q }) => (
              <div key={q} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: 24,
              }}>
                <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(245,244,240,0.5)", lineHeight: 1.5, margin: "0 0 16px" }}>{q}</p>
                <p style={{ fontFamily: F.display, fontSize: 28, fontWeight: 700, color: "rgba(245,244,240,0.2)", margin: 0, letterSpacing: "-0.02em" }}>Unknown.</p>
              </div>
            ))}
          </div>

          {/* Pull quote */}
          <blockquote style={{
            fontFamily: F.display, fontSize: "clamp(18px, 2vw, 24px)",
            fontWeight: 400, fontStyle: "italic",
            color: C.gold, lineHeight: 1.5,
            margin: "0 0 16px", maxWidth: 720,
            borderLeft: `3px solid ${C.gold}`, paddingLeft: 24,
          }}>
            "It shouldn't be the case that an attorney billing $300 an hour has never seen
            their real realization rate. That they don't know which referral source produces
            their highest-value clients. That they can't tell, right now, whether their
            practice is growing or slowly dying."
          </blockquote>
          <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(245,244,240,0.35)", paddingLeft: 24 }}>
            That's not a software gap. That's a structural failure of an entire industry — accepted as normal for thirty years.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — WHAT IS IT?
      ════════════════════════════════════════════════════════════════════ */}
      <Section id="what-is-it">
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <Eyebrow>What is it?</Eyebrow>
          <h2 style={{
            fontFamily: F.display, fontSize: "clamp(24px, 2.5vw, 36px)",
            fontWeight: 700, lineHeight: 1.1, color: C.coal,
            letterSpacing: "-0.02em", margin: "0 0 24px",
          }}>
            Everything a practice instrument needs to be. Nothing it doesn't.
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 17, color: C.coal, lineHeight: 1.65, margin: "0 0 24px" }}>
            Sundial is a practice intelligence layer that sits above your existing software.
            It connects to wherever your data lives — practice management, bank accounts, Google reviews.
            It reads. It never writes. Every Sunday evening, one plain-English email arrives:
            your realization rate, your collection rate, your cash position, your intake conversion, your AR aging.
          </p>
          <p style={{ fontFamily: F.body, fontSize: 17, color: C.coal, lineHeight: 1.65, margin: 0 }}>
            Every number sourced from your actual data. Nothing modeled. Nothing estimated.
            And since it reads from your existing software, you don't replace anything.{" "}
            <em style={{ fontFamily: F.display, fontStyle: "italic" }}>You just finally understand it.</em>
          </p>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4 — SCROLLING TICKER
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: "#F0EEE9", borderTop: `1px solid ${C.smoke}`, borderBottom: `1px solid ${C.smoke}`, padding: "40px 0", overflow: "hidden" }}>
        <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: C.slate, textAlign: "center", marginBottom: 24 }}>
          What Sunday looks like
        </p>
        <div style={{ overflow: "hidden" }}>
          <div className="ticker-track">
            {[...TICKER_CARDS, ...TICKER_CARDS].map((card, i) => (
              <div key={i} style={{
                flexShrink: 0, width: 300, margin: "0 12px",
                background: C.white, border: `1px solid ${C.smoke}`,
                borderRadius: 8, padding: "18px 20px",
              }}>
                <p style={{ fontFamily: F.mono, fontSize: 10, color: C.slate, margin: "0 0 8px" }}>
                  Week ending {card.week}
                </p>
                <p style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.coal, margin: "0 0 6px", lineHeight: 1.3 }}>
                  {card.headline}
                </p>
                <p style={{ fontFamily: F.body, fontSize: 12, color: C.slate, margin: 0, lineHeight: 1.5 }}>
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 5 — THE TAKEDOWN
      ════════════════════════════════════════════════════════════════════ */}
      <Section>
        <div style={{ maxWidth: 720 }}>
          <Eyebrow>But we already have Clio or MyCase</Eyebrow>
          <h2 style={{
            fontFamily: F.display, fontSize: "clamp(24px, 2.5vw, 36px)",
            fontWeight: 700, lineHeight: 1.1, color: C.coal,
            letterSpacing: "-0.02em", margin: "0 0 24px",
          }}>
            Yes, and those products come with the same blind spot they've always had.
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 17, color: C.coal, lineHeight: 1.65, margin: "0 0 24px" }}>
            They were built to manage cases, not to run businesses. Clio knows your matters.
            It doesn't know your practice. There's a difference.
          </p>
          <p style={{ fontFamily: F.body, fontSize: 17, color: C.coal, lineHeight: 1.65, margin: "0 0 24px" }}>
            Besides, Clio and MyCase have become practice management platforms.
            They were never meant to be instrument panels. They're not.
            Stop expecting them to be.
          </p>
          <p style={{ fontFamily: F.body, fontSize: 17, color: C.coal, lineHeight: 1.65, margin: "0 0 32px" }}>
            Attorneys who connect Sundial see their practice differently within one email.{" "}
            <a href="#testimonials" style={{ color: C.ember, textDecoration: "none", borderBottom: `1px solid ${C.ember}` }}>
              Here's what they said after week one.
            </a>
          </p>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 6 — HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ backgroundColor: C.coal, padding: "96px 32px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <Eyebrow light>Setup</Eyebrow>
          <h2 style={{
            fontFamily: F.display, fontSize: "clamp(24px, 2.5vw, 36px)",
            fontWeight: 700, lineHeight: 1.1, color: C.ash,
            letterSpacing: "-0.02em", margin: "0 0 48px",
          }}>
            Connect your practice in ten minutes.
          </h2>

          {[
            "Connect your practice management software",
            "Connect your bank account via Plaid",
            "Confirm your email address",
          ].map((step, i) => (
            <div key={i} style={{
              display: "flex", gap: 20, marginBottom: i < 2 ? 32 : 0,
              alignItems: "flex-start",
            }}>
              <span style={{
                fontFamily: F.mono, fontSize: 13, color: C.gold,
                flexShrink: 0, marginTop: 2, minWidth: 20,
              }}>
                {i + 1}.
              </span>
              <p style={{
                fontFamily: F.body, fontSize: 17, color: C.ash,
                lineHeight: 1.5, margin: 0,
              }}>
                {step}
              </p>
            </div>
          ))}

          <p style={{
            fontFamily: F.display, fontSize: 18, fontStyle: "italic",
            color: "rgba(245,244,240,0.45)", margin: "48px 0 0",
          }}>
            That's it. Your first email arrives Sunday.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 7 — USE CASES
      ════════════════════════════════════════════════════════════════════ */}
      <Section id="use-cases">
        <Eyebrow>It fits wherever you are</Eyebrow>
        <h2 style={{
          fontFamily: F.display, fontSize: "clamp(24px, 2.5vw, 36px)",
          fontWeight: 700, lineHeight: 1.1, color: C.coal,
          letterSpacing: "-0.02em", margin: "0 0 40px", maxWidth: 520,
        }}>
          It fits in a lot of places.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {[
            {
              title: "If you're a solo flying by feel.",
              body: "You track some numbers — a rough sense of realization, a month-end spreadsheet. Sundial gives you the next level of clarity without hiring an office manager.",
            },
            {
              title: "If you're managing 3–8 attorneys.",
              body: "You're a managing partner by necessity, not by choice. You know something's wrong with the numbers but can't see what. Sundial shows you.",
            },
            {
              title: "If you've been burned by dashboards before.",
              body: "There is no dashboard. There is one email. It arrives. You read it. That's the product.",
            },
            {
              title: "If you're on Clio.",
              body: "You're already connected. Sundial adds Plaid and Google. Ten-minute setup. First email Sunday.",
            },
            {
              title: "If you're on Filevine or MyCase.",
              body: "Same email. Same intelligence. Your software's data, finally surfaced.",
            },
            {
              title: "If you're growing intentionally.",
              body: "Sundial tells you your intake conversion rate — of every consultation booked, how many became retained matters. Trended over 12 months, that number tells you exactly where your marketing spend is working.",
            },
          ].map(({ title, body }) => (
            <div key={title} style={{
              background: C.white, border: `1px solid ${C.smoke}`,
              borderRadius: 8, padding: 28,
              transition: "border-color 150ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.ember)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.smoke)}
            >
              <p style={{ fontFamily: F.body, fontSize: 15, fontWeight: 600, color: C.coal, margin: "0 0 10px", lineHeight: 1.3 }}>{title}</p>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.slate, margin: 0, lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 8 — DATA SOURCES (table)
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: "#F0EEE9", padding: "96px 32px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Eyebrow>Connect once. Read forever.</Eyebrow>
          <h2 style={{
            fontFamily: F.display, fontSize: "clamp(24px, 2.5vw, 36px)",
            fontWeight: 700, lineHeight: 1.1, color: C.coal,
            letterSpacing: "-0.02em", margin: "0 0 40px",
          }}>
            Your data stays where it lives.
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.coal }}>
                {["Platform", "Connection", "What you'll see"].map(h => (
                  <th key={h} style={{
                    fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.ash,
                    textAlign: "left", padding: "12px 20px", letterSpacing: "0.04em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Clio", "OAuth — one click", "Matters, time, invoices, AR aging, billing rates"],
                ["Filevine", "OAuth — one click", "Matters, tasks, contacts, billing"],
                ["MyCase", "OAuth — one click", "Matters, time entries, invoices"],
                ["Plaid", "Plaid Link — read only", "Cash position, deposit timing, trust account balance"],
                ["QuickBooks Online", "OAuth — one click", "P&L, expenses, payroll"],
                ["Google Business Profile", "Google OAuth", "Reviews, rating, referral velocity"],
              ].map(([platform, conn, what], i) => (
                <tr key={platform} style={{ background: i % 2 === 0 ? C.ash : C.white }}>
                  <td style={{ fontFamily: F.body, fontSize: 14, fontWeight: 500, color: C.coal, padding: "12px 20px", border: `1px solid ${C.smoke}` }}>{platform}</td>
                  <td style={{ fontFamily: F.mono, fontSize: 12, color: C.slate, padding: "12px 20px", border: `1px solid ${C.smoke}` }}>{conn}</td>
                  <td style={{ fontFamily: F.body, fontSize: 13, color: C.coal, padding: "12px 20px", border: `1px solid ${C.smoke}` }}>{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.slate, marginTop: 20, fontStyle: "italic" }}>
            Sundial never writes to your software. It reads. Your data stays where it lives.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 9 — PRICING
      ════════════════════════════════════════════════════════════════════ */}
      <Section id="pricing">
        <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 48px" }}>
          <Eyebrow>Pricing</Eyebrow>
          <h2 style={{
            fontFamily: F.display, fontSize: "clamp(24px, 2.5vw, 36px)",
            fontWeight: 700, lineHeight: 1.1, color: C.coal,
            letterSpacing: "-0.02em", margin: "0 0 16px",
          }}>
            Pay once a month. Know your practice forever.
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 16, color: C.slate, margin: 0, lineHeight: 1.65 }}>
            One hour of recovered billing pays for six months of Sundial.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, maxWidth: 900, margin: "0 auto" }}>
          {[
            {
              name: "Solo",
              price: "$149",
              period: "/mo",
              desc: "One attorney. One practice management connection. Plaid. Google. The weekly email that changes how you see your own business.",
              highlight: false,
              cta: "Get started",
            },
            {
              name: "Firm",
              price: "$299",
              period: "/mo",
              desc: "Up to four attorneys. Multi-platform support. Every attorney gets their own email. You get the firm-level roll-up.",
              highlight: true,
              cta: "Get started",
            },
            {
              name: "LawStack",
              price: "$99",
              period: "/mo for 6 months",
              desc: "Already on LawStack? Your Clio connection already exists. Add Plaid. Add Google. Ten minutes.",
              highlight: false,
              cta: "Sign in with LawStack",
            },
          ].map(({ name, price, period, desc, highlight, cta }) => (
            <div key={name} style={{
              background: C.white,
              border: `${highlight ? 2 : 1}px solid ${highlight ? C.amber : C.smoke}`,
              borderRadius: 12, padding: 32,
            }}>
              {highlight && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{
                    fontFamily: F.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
                    textTransform: "uppercase", color: C.ember,
                    background: "rgba(217,79,43,0.08)", borderRadius: 999, padding: "3px 10px",
                  }}>
                    Most popular
                  </span>
                </div>
              )}
              <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.slate, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{name}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "0 0 16px" }}>
                <span style={{ fontFamily: F.display, fontSize: 40, fontWeight: 700, color: C.coal, lineHeight: 1 }}>{price}</span>
                <span style={{ fontFamily: F.body, fontSize: 14, color: C.slate }}>{period}</span>
              </div>
              <div style={{ borderTop: `1px solid ${C.smoke}`, margin: "0 0 20px" }} />
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.slate, lineHeight: 1.6, margin: "0 0 24px" }}>{desc}</p>
              <button onClick={onCTA} style={{
                width: "100%", background: highlight ? C.amber : "transparent",
                border: `1px solid ${highlight ? C.amber : C.smoke}`,
                borderRadius: 8, cursor: "pointer",
                fontFamily: F.body, fontSize: 14, fontWeight: 600,
                color: C.coal,
                height: 44, transition: "all 150ms",
              }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.background = highlight ? C.amberDark : C.coal; el.style.borderColor = highlight ? C.amberDark : C.coal; el.style.color = highlight ? C.white : C.white }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.background = highlight ? C.amber : "transparent"; el.style.borderColor = highlight ? C.amber : C.smoke; el.style.color = C.coal }}
              >
                {cta}
              </button>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: F.body, fontSize: 13, color: C.slate, textAlign: "center", marginTop: 24, fontStyle: "italic" }}>
          No free trial. 30-day money-back guarantee. No contract.
        </p>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 10 — COMPLIANCE
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.coal, padding: "96px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow light>Security</Eyebrow>
          <h2 style={{
            fontFamily: F.display, fontSize: "clamp(24px, 2.5vw, 36px)",
            fontWeight: 700, lineHeight: 1.1, color: C.ash,
            letterSpacing: "-0.02em", margin: "0 0 48px", maxWidth: 520,
          }}>
            Built for people who are paid to be paranoid about data.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {[
              { title: "Read-only by design.", body: "Sundial never writes to any connected system. It cannot create matters, modify invoices, or touch your billing data. The connection is structurally one-directional." },
              { title: "Your bank credentials stay with Plaid.", body: "We never see your username or password. Plaid handles bank authentication. Sundial receives deposit totals and timing — nothing else." },
              { title: "No client data, ever.", body: "Sundial reads operational patterns — billing totals, payment timing, matter counts. It does not read client names, case details, or privileged communications." },
              { title: "Encrypted in transit and at rest.", body: "TLS 1.3 on every connection. AES-256 at rest. OAuth tokens are encrypted before storage. No credentials stored in plaintext." },
              { title: "SOC 2 compliant infrastructure.", body: "Hosted on Supabase (SOC 2 Type II certified). Payment processing via Stripe (PCI DSS Level 1). We inherit the compliance posture of the best infrastructure in the industry." },
              { title: "IOLTA-aware.", body: "Trust account data is handled separately and never commingled with operating account data in reports. Sundial understands the ethical rules that govern attorney trust accounting." },
            ].map(({ title, body }) => (
              <div key={title} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: 24,
              }}>
                <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.ash, margin: "0 0 10px" }}>{title}</p>
                <p style={{ fontFamily: F.body, fontSize: 13, color: "rgba(245,244,240,0.45)", margin: 0, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 11 — FAQ
      ════════════════════════════════════════════════════════════════════ */}
      <Section id="faq">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Eyebrow>FAQ</Eyebrow>
          <h2 style={{
            fontFamily: F.display, fontSize: "clamp(24px, 2.5vw, 32px)",
            fontWeight: 700, lineHeight: 1.1, color: C.coal,
            letterSpacing: "-0.02em", margin: "0 0 40px",
          }}>
            Common questions.
          </h2>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${C.smoke}` }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: "100%", background: "none", border: "none", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "20px 0", textAlign: "left",
                }}
              >
                <span style={{ fontFamily: F.body, fontSize: 15, fontWeight: 600, color: C.coal, lineHeight: 1.3, paddingRight: 16 }}>
                  {faq.q}
                </span>
                <span style={{
                  color: C.ember, fontSize: 18, flexShrink: 0,
                  transform: openFaq === i ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 300ms ease",
                  display: "inline-block",
                }}>
                  ›
                </span>
              </button>
              <div style={{
                maxHeight: openFaq === i ? 300 : 0,
                overflow: "hidden",
                transition: "max-height 300ms ease",
              }}>
                <p style={{
                  fontFamily: F.body, fontSize: 14, color: C.slate,
                  lineHeight: 1.65, padding: "0 0 20px", margin: 0,
                }}>
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 12 — FOOTER CTA STRIP
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ backgroundColor: C.ember, padding: "96px 32px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{
            fontFamily: F.display, fontSize: "clamp(24px, 3vw, 40px)",
            fontWeight: 700, lineHeight: 1.1, color: C.white,
            letterSpacing: "-0.02em", margin: "0 0 20px",
          }}>
            Every attorney in America is running their practice blind.
          </h2>
          <p style={{ fontFamily: F.body, fontSize: 17, color: "rgba(255,255,255,0.8)", lineHeight: 1.65, margin: "0 0 40px", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
            They don't know their real realization rate. They don't know which clients cost them money.
            They don't know whether they're growing or slowly dying — because nobody has ever shown them
            a number they can act on. Sundial is that number. Every week. From your own data.
          </p>
          <button onClick={onCTA} style={{
            background: C.amber, border: "none", cursor: "pointer",
            fontFamily: F.body, fontSize: 16, fontWeight: 700, color: C.coal,
            padding: "16px 40px", borderRadius: 8,
            transition: "background 150ms, transform 150ms",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.amberDark; e.currentTarget.style.color = C.white; e.currentTarget.style.transform = "scale(1.01)" }}
          onMouseLeave={e => { e.currentTarget.style.background = C.amber; e.currentTarget.style.color = C.coal; e.currentTarget.style.transform = "scale(1)" }}
          >
            Get your first email free
          </button>
          <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 16 }}>
            Stop flying blind. Your first score arrives Sunday.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 13 — FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <footer style={{ backgroundColor: C.ash, borderTop: `1px solid ${C.smoke}`, padding: "64px 32px 48px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
          <div>
            <p style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.coal, margin: "0 0 8px" }}>Sundial</p>
            <p style={{ fontFamily: F.body, fontSize: 13, color: C.slate, margin: "0 0 16px", lineHeight: 1.65 }}>
              Designed, built, and backed by LawStack Inc.
            </p>
            <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(107,101,96,0.6)", margin: "0 0 4px" }}>
              LawStack Inc. · Tacoma, WA
            </p>
            <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(107,101,96,0.6)", margin: 0, fontStyle: "italic" }}>
              one number. every week. your practice, finally legible.
            </p>
          </div>
          <div style={{ display: "flex", gap: 48, justifyContent: "flex-end" }}>
            <div>
              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.slate, margin: "0 0 12px" }}>Product</p>
              {[["#what-is-it", "Overview"], ["#how-it-works", "How it works"], ["#pricing", "Pricing"], ["#faq", "FAQ"]].map(([href, label]) => (
                <div key={href} style={{ marginBottom: 8 }}>
                  <a href={href} style={{ fontFamily: F.body, fontSize: 13, color: C.slate, textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.ember)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.slate)}
                  >{label}</a>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.slate, margin: "0 0 12px" }}>Legal</p>
              {[["Privacy", "#"], ["Terms", "#"], ["Security", "#"]].map(([label, href]) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <a href={href} style={{ fontFamily: F.body, fontSize: 13, color: C.slate, textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = C.ember)}
                  onMouseLeave={e => (e.currentTarget.style.color = C.slate)}
                  >{label}</a>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1200, margin: "40px auto 0", borderTop: `1px solid ${C.smoke}`, paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(107,101,96,0.6)", margin: 0 }}>
            © 2026 LawStack Inc. All rights reserved.
          </p>
          <p style={{ fontFamily: F.body, fontSize: 12, color: "rgba(107,101,96,0.6)", margin: 0 }}>
            legal@lawstack.co · privacy@lawstack.co
          </p>
        </div>
      </footer>

    </div>
  )
}
