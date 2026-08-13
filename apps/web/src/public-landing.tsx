import { useEffect, useRef, useState } from "react";

type LandingIconName =
  | "arrow"
  | "check"
  | "lock"
  | "message"
  | "microphone"
  | "receipt"
  | "sheet"
  | "sync";

type CapabilityKey =
  | "whatsapp"
  | "receipts"
  | "voice"
  | "sheets";

type Capability = {
  key: CapabilityKey;
  label: string;
  icon: LandingIconName;
  title: string;
  body: string;
  bullets: string[];
};

const capabilities: Capability[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: "message",
    title: "Money records in the chat you already use.",
    body: "Record income, expenses and commitments without learning another complicated finance app.",
    bullets: [
      "Natural English or Bahasa Melayu",
      "Private chats and groups with your bot alias",
      "Immediate, clear recording confirmations",
    ],
  },
  {
    key: "receipts",
    label: "Receipts",
    icon: "receipt",
    title: "Receipts that understand more than totals.",
    body: "MyPocket reads the purchase context and prepares a draft for you to review before anything is recorded.",
    bullets: [
      "Merchant, date and reference number",
      "Fuel, groceries and everyday categories",
      "Nothing is recorded before !confirm",
    ],
  },
  {
    key: "voice",
    label: "Voice",
    icon: "microphone",
    title: "Speak naturally. MyPocket handles the admin.",
    body: "Start with “bot” or your custom alias and record the money action in your own words.",
    bullets: [
      "Voice transcription with financial intent",
      "Understands amount, category and payment method",
      "Ignores voice notes that are not meant for the bot",
    ],
  },
  {
    key: "sheets",
    label: "Google Sheets",
    icon: "sheet",
    title: "Every confirmed record stays in sync.",
    body: "Your dashboard, connected Google Sheet and receipt folder stay aligned with the same workspace data.",
    bullets: [
      "Transaction and commitment records",
      "Receipt references and secure Drive links",
      "Family and business workspace separation",
    ],
  },
];

function LandingIcon({ name }: { name: LandingIconName }) {
  const common = {
    "aria-hidden": true,
    fill: "none",
    viewBox: "0 0 24 24",
  } as const;

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h13M14 7l5 5-5 5" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.6 2.6L16.5 9" />
      </svg>
    );
  }

  if (name === "lock") {
    return (
      <svg {...common}>
        <rect x="5" y="10" width="14" height="10" rx="3" />
        <path d="M8.5 10V7.8a3.5 3.5 0 0 1 7 0V10M12 14v2.4" />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg {...common}>
        <path d="M20 11.2a7.6 7.6 0 0 1-8 7.2 9.2 9.2 0 0 1-3.2-.7L4 19l1.4-4a7 7 0 0 1-1.2-3.8A7.6 7.6 0 0 1 12 4a7.6 7.6 0 0 1 8 7.2Z" />
        <path d="M8.4 11.4h.1m3.4 0h.1m3.4 0h.1" />
      </svg>
    );
  }

  if (name === "microphone") {
    return (
      <svg {...common}>
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4m-3 0h6" />
      </svg>
    );
  }

  if (name === "receipt") {
    return (
      <svg {...common}>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6m-6 4h6m-6 4h4" />
      </svg>
    );
  }

  if (name === "sheet") {
    return (
      <svg {...common}>
        <path d="M6 3h8l4 4v14H6V3Z" />
        <path d="M14 3v5h5M9 12h6m-6 4h6M11 10v8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M18.4 11a7 7 0 0 0-11.9-3L4 10m16 4-2.5 2a7 7 0 0 1-11.9-3" />
    </svg>
  );
}

function LandingBrand() {
  return (
    <span className="mpBrand">
      <img src="/mypocket-mark.png" alt="" />
      <strong>MyPocket AI</strong>
    </span>
  );
}

function CtaLink({
  children,
  className = "",
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <a className={`mpButton ${className}`.trim()} href={href}>
      {children}
    </a>
  );
}

function CapabilityPreview({ capability }: { capability: CapabilityKey }) {
  return (
    <div className={`mpProductPreview mpProductPreview--${capability}`}>
      <aside className="mpPreviewNav" aria-label="Dashboard preview navigation">
        <span className="mpPreviewBrand"><LandingIcon name="message" /> MP</span>
        <i></i>
        <i className="active"></i>
        <i></i>
        <i></i>
      </aside>

      <div className="mpPreviewMain">
        <div className="mpPreviewTop">
          <div>
            <small>MyPocket AI</small>
            <strong>{capability === "receipts" ? "Receipt review" : "Financial overview"}</strong>
          </div>
          <span>This month</span>
        </div>

        {capability === "receipts" ? (
          <>
            <div className="mpReceiptSummary">
              <span className="mpReceiptThumb"><LandingIcon name="receipt" /></span>
              <div>
                <small>Receipt draft</small>
                <strong>Shell · RM341.92</strong>
                <span>Fuel · Transport</span>
              </div>
              <b>Pending</b>
            </div>
            <dl className="mpReceiptDetails">
              <div><dt>Date</dt><dd>17 Jul 2026</dd></div>
              <div><dt>Reference</dt><dd>b76l0e</dd></div>
              <div><dt>Payment</dt><dd>Card</dd></div>
            </dl>
            <button type="button">!confirm</button>
          </>
        ) : capability === "voice" ? (
          <div className="mpVoicePreview">
            <span className="mpVoiceAvatar"><LandingIcon name="microphone" /></span>
            <div>
              <small>Voice note · 0:06</small>
              <div className="mpWaveform" aria-hidden="true">
                {Array.from({ length: 18 }, (_, index) => <i key={index}></i>)}
              </div>
              <strong>“bot beli petrol RM40 guna kad”</strong>
            </div>
            <b>Recorded</b>
          </div>
        ) : capability === "sheets" ? (
          <div className="mpSheetPreview">
            <div className="mpSheetHeader"><LandingIcon name="sheet" /> Transactions</div>
            <div className="mpSheetRow heading"><span>Date</span><span>Merchant</span><span>Category</span><span>Amount</span></div>
            <div className="mpSheetRow"><span>17 Jul</span><span>Shell</span><span>Transport</span><span>RM341.92</span></div>
            <div className="mpSheetRow"><span>18 Jul</span><span>KFC</span><span>Food</span><span>RM40.00</span></div>
            <div className="mpSyncLine"><LandingIcon name="sync" /> Synced with your workspace</div>
          </div>
        ) : (
          <div className="mpChatPreview">
            <div className="mpChatBubble user">bot beli petrol RM40 guna kad</div>
            <div className="mpChatBubble bot">
              <span><LandingIcon name="check" /></span>
              <div><strong>Recorded Expense</strong><small>Transport · Petrol · RM40.00</small></div>
            </div>
            <div className="mpChatComposer">Type a message… <LandingIcon name="arrow" /></div>
          </div>
        )}
      </div>
    </div>
  );
}

function PricingPlan({
  features,
  name,
  price,
  tone = "light",
}: {
  features: string[];
  name: string;
  price: string;
  tone?: "dark" | "light";
}) {
  return (
    <article className={`mpPlan mpPlan--${tone}`}>
      <h3>{name}</h3>
      <p><strong>{price}</strong><span>/ month</span></p>
      <ul>
        {features.map((feature) => (
          <li key={feature}><LandingIcon name="check" />{feature}</li>
        ))}
      </ul>
      <CtaLink href="https://app.imai.my" className={tone === "dark" ? "mpButtonLight" : "mpButtonPrimary"}>
        Choose {name.replace(" Pro", "")}
      </CtaLink>
    </article>
  );
}

export function PublicLandingPage() {
  const landingRef = useRef<HTMLElement | null>(null);
  const [activeCapability, setActiveCapability] =
    useState<CapabilityKey>("whatsapp");
  const capability =
    capabilities.find((item) => item.key === activeCapability) ?? capabilities[0];

  useEffect(() => {
    const landing = landingRef.current;
    if (!landing) {
      return;
    }

    const revealItems = Array.from(
      landing.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const storySteps = Array.from(
      landing.querySelectorAll<HTMLElement>("[data-story-step]"),
    );
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    landing.classList.add("mpRevealReady");

    const supportsIntersectionObserver = "IntersectionObserver" in window;

    if (prefersReducedMotion || !supportsIntersectionObserver) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    }

    const revealObserver = prefersReducedMotion || !supportsIntersectionObserver
      ? null
      : new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) {
              return;
            }

            entry.target.classList.add("is-visible");
            revealObserver?.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.16 },
      );

    revealItems.forEach((item) => revealObserver?.observe(item));

    if (!supportsIntersectionObserver) {
      landing.classList.add("mpStoryStatic");
      return () => revealObserver?.disconnect();
    }

    const storyObserver = new IntersectionObserver(
      (entries) => {
        const activeEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        const key = activeEntry?.target.getAttribute(
          "data-capability",
        ) as CapabilityKey | null;

        if (key) {
          setActiveCapability(key);
        }
      },
      {
        rootMargin: "-28% 0px -44% 0px",
        threshold: [0.2, 0.45, 0.7],
      },
    );

    storySteps.forEach((step) => storyObserver.observe(step));

    return () => {
      revealObserver?.disconnect();
      storyObserver.disconnect();
    };
  }, []);

  return (
    <main className="mpLanding" id="top" ref={landingRef}>
      <header className="mpNav">
        <div className="mpNavInner">
          <a className="mpBrandLink" href="#top" aria-label="MyPocket AI home">
            <LandingBrand />
          </a>
          <nav className="mpNavLinks" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#pricing">Plans</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="mpNavActions">
            <a className="mpSignIn" href="https://app.imai.my">Sign In</a>
            <CtaLink href="https://app.imai.my" className="mpButtonPrimary mpNavCta">
              <span className="mpNavCtaLong">Start with MyPocket AI</span>
              <span className="mpNavCtaShort">Get started</span>
            </CtaLink>
          </div>
        </div>
      </header>

      <section className="mpHero" aria-labelledby="mp-hero-title">
        <div className="mpHeroInner">
          <div className="mpHeroCopy" data-reveal="up">
            <h1 id="mp-hero-title">
              <span className="mpHeroLine">Your money,</span>
              <span className="mpHeroLine">organised. Right</span>
              <span className="mpHeroLine">from <em>WhatsApp.</em></span>
            </h1>
            <p>
              Record expenses, scan receipts, send voice notes
              <br />
              {" "}and keep your dashboard and Google Sheet in sync.
            </p>
            <div className="mpHeroActions">
              <CtaLink href="https://app.imai.my" className="mpButtonPrimary">
                <LandingIcon name="message" />
                Start with MyPocket AI
              </CtaLink>
              <CtaLink href="#how" className="mpButtonSecondary">
                See how it works
                <LandingIcon name="arrow" />
              </CtaLink>
            </div>
          </div>

          <div className="mpHeroStage" aria-label="MyPocket AI assistant preview" data-reveal="from-right">
            <div className="mpHeroShape" aria-hidden="true"></div>
            <img
              className="mpHeroRobot"
              src="/mypocket-robot-wave.webp"
              alt="MyPocket AI robot assistant waving"
              fetchPriority="high"
            />
            <div className="mpActivity mpActivityReceipt">
              <span><LandingIcon name="receipt" /></span>
              <div><small>Receipt understood</small><strong>RM341.92</strong></div>
              <LandingIcon name="check" />
            </div>
            <div className="mpActivity mpActivityVoice">
              <span><LandingIcon name="microphone" /></span>
              <div><small>Voice note</small><strong>Recorded</strong></div>
              <LandingIcon name="check" />
            </div>
            <div className="mpActivity mpActivitySheet">
              <span><LandingIcon name="sheet" /></span>
              <div><small>Google Sheet</small><strong>Synced</strong></div>
              <LandingIcon name="check" />
            </div>
          </div>
        </div>

        <div className="mpValueRail">
          <article data-reveal="up"><span><LandingIcon name="message" /></span><div><strong>WhatsApp-first</strong><p>Chat naturally on WhatsApp. We handle the rest.</p></div></article>
          <article data-reveal="up"><span><LandingIcon name="sync" /></span><div><strong>AI-assisted</strong><p>Smart understanding and helpful summaries.</p></div></article>
          <article data-reveal="up"><span><LandingIcon name="lock" /></span><div><strong>Workspace private</strong><p>Your data stays in your workspace, always.</p></div></article>
        </div>
      </section>

      <section className="mpCapabilities mpScrolly" id="features" aria-labelledby="mp-features-title">
        <div className="mpSectionInner">
          <div className="mpScrollyHeading" data-reveal="up">
            <p className="mpSectionLabel">Capabilities</p>
            <h2 id="mp-features-title">One place for the whole money routine<span>.</span></h2>
            <p>Scroll through the ways MyPocket turns everyday messages into organised records.</p>
          </div>

          <div className="mpScrollyLayout">
            <div className="mpScrollySteps">
              {capabilities.map((item, index) => (
                <article
                  className={`mpScrollyStep ${item.key === activeCapability ? "is-active" : ""}`}
                  data-capability={item.key}
                  data-story-step
                  key={item.key}
                >
                  <button
                    aria-pressed={item.key === activeCapability}
                    onClick={() => setActiveCapability(item.key)}
                    onFocus={() => setActiveCapability(item.key)}
                    type="button"
                  >
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <span><LandingIcon name={item.icon} /></span>
                    {item.label}
                  </button>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <ul>
                    {item.bullets.map((bullet) => (
                      <li key={bullet}><LandingIcon name="check" />{bullet}</li>
                    ))}
                  </ul>
                  <div className="mpMobileStoryPreview">
                    <CapabilityPreview capability={item.key} />
                  </div>
                </article>
              ))}
            </div>

            <div className="mpScrollySticky">
              <div className="mpStoryVisual" data-reveal="scale">
                <div className="mpStoryTopline">
                  <span aria-live="polite" role="status">{capability.label}</span>
                  <div
                    aria-label={`Feature ${capabilities.findIndex((item) => item.key === activeCapability) + 1} of ${capabilities.length}`}
                    aria-valuemax={capabilities.length}
                    aria-valuemin={1}
                    aria-valuenow={capabilities.findIndex((item) => item.key === activeCapability) + 1}
                    role="progressbar"
                  >
                    {capabilities.map((item) => (
                      <i className={item.key === activeCapability ? "active" : ""} key={item.key}></i>
                    ))}
                  </div>
                </div>
                <div className="mpStoryPreview">
                  <CapabilityPreview capability={activeCapability} key={activeCapability} />
                  <img src="/mypocket-robot.webp?v=2" alt="" loading="lazy" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mpHow" id="how" aria-labelledby="mp-how-title" data-reveal="up">
        <div className="mpHowInner">
          <h2 id="mp-how-title">From message to money record in three steps<span>.</span></h2>
          <div className="mpStepRail">
            <article><b>01</b><span><LandingIcon name="message" /></span><h3>Send it</h3><p>Text, receipt or voice note.</p></article>
            <article><b>02</b><span><LandingIcon name="sync" /></span><h3>MyPocket understands</h3><p>Amount, merchant and category.</p></article>
            <article><b>03</b><span><LandingIcon name="check" /></span><h3>Review and record</h3><p>You stay in control.</p></article>
          </div>

          <div className="mpReceiptFlow">
            <div className="mpWhatsappPanel">
              <div className="mpWhatsappHeader"><LandingBrand /><span>online</span></div>
              <div className="mpReceiptPhoto"><LandingIcon name="receipt" /><span>Receipt photo</span></div>
              <div className="mpWhatsappDraft"><small>Receipt draft</small><strong>Shell · RM341.92</strong><span>Fuel · Transport</span></div>
              <div className="mpWhatsappConfirm">!confirm</div>
            </div>
            <div className="mpRecordPanel">
              <span className="mpRecordIcon"><LandingIcon name="receipt" /></span>
              <small>Ready for review</small>
              <strong>RM341.92</strong>
              <dl>
                <div><dt>Merchant</dt><dd>Shell</dd></div>
                <div><dt>Category</dt><dd>Transport</dd></div>
                <div><dt>Reference</dt><dd>b76l0e</dd></div>
              </dl>
              <div className="mpRecordSuccess"><LandingIcon name="check" /> Confirmed records update every connected view.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mpPricing" id="pricing" aria-labelledby="mp-pricing-title" data-reveal="up">
        <div className="mpSectionInner">
          <div className="mpPricingHead">
            <h2 id="mp-pricing-title">Simple plans. Serious control<span>.</span></h2>
            <p>Begin on your own, then move to a shared workspace when you are ready.</p>
          </div>
          <div className="mpPricingGrid">
            <PricingPlan name="Personal Pro" price="RM9" features={["Receipts with !confirm", "WhatsApp and voice capture", "Google Sheets export", "Budgets and categories"]} />
            <PricingPlan name="Family" price="RM19" tone="dark" features={["Everything in Personal Pro", "Multiple members", "Shared categories", "Household spending overview"]} />
            <PricingPlan name="Business" price="RM49" features={["Everything in Family", "Team role management", "Advanced reports", "Business workspace"]} />
          </div>
        </div>
      </section>

      <section className="mpFaq" id="faq" aria-labelledby="mp-faq-title" data-reveal="up">
        <div className="mpSectionInner mpFaqInner">
          <h2 id="mp-faq-title">Questions, answered clearly<span>.</span></h2>
          <div className="mpFaqList">
            <details>
              <summary>Can I use MyPocket AI in a WhatsApp group?<span aria-hidden="true">+</span></summary>
              <p>Yes. Start the message with “bot” or the custom alias configured for your group.</p>
            </details>
            <details>
              <summary>Are receipts uploaded before I confirm?<span aria-hidden="true">+</span></summary>
              <p>No. MyPocket prepares a one-minute draft. Upload and recording only happen after !confirm.</p>
            </details>
            <details>
              <summary>Can I cancel anytime?<span aria-hidden="true">+</span></summary>
              <p>Yes. Subscription controls are available from your dashboard, subject to the billing terms shown before checkout.</p>
            </details>
            <details>
              <summary>Where is my data stored?<span aria-hidden="true">+</span></summary>
              <p>Records stay in your MyPocket workspace and the Google services you explicitly connect.</p>
            </details>
          </div>
        </div>
      </section>

      <section className="mpFinalCta" aria-labelledby="mp-final-title" data-reveal="up">
        <div className="mpFinalShape" aria-hidden="true"></div>
        <div>
          <h2 id="mp-final-title">Make money admin feel effortless.</h2>
          <p>Start with one message. MyPocket AI keeps the rest organised.</p>
        </div>
        <div className="mpFinalActions">
          <CtaLink href="https://app.imai.my" className="mpButtonLight">Start with MyPocket AI</CtaLink>
          <CtaLink href="https://app.imai.my" className="mpButtonOutlineLight">Sign In</CtaLink>
        </div>
      </section>

      <footer className="mpFooter">
        <div className="mpFooterInner">
          <LandingBrand />
          <nav aria-label="Footer navigation">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/refund-policy">Refunds</a>
            <a href="/shipping-policy">Digital delivery</a>
            <a href="/help">Help</a>
            <a href="/blog">Blog</a>
          </nav>
          <span>
            © 2026 MyPocket AI · RIFTECH ENTERPRISE ·
            201803398437 (002913082-T) ·
            <a href="mailto:support@imai.my"> support@imai.my</a>
          </span>
        </div>
      </footer>
    </main>
  );
}
