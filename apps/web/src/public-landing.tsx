import { useState } from "react";

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
      <img src="/icon.svg" alt="" />
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
  const [activeCapability, setActiveCapability] =
    useState<CapabilityKey>("receipts");
  const capability =
    capabilities.find((item) => item.key === activeCapability) ?? capabilities[1];

  return (
    <main className="mpLanding" id="top">
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
              Start with MyPocket AI
            </CtaLink>
          </div>
        </div>
      </header>

      <section className="mpHero" aria-labelledby="mp-hero-title">
        <div className="mpHeroInner">
          <div className="mpHeroCopy">
            <h1 id="mp-hero-title">
              Your money, organised. Right from <span>WhatsApp.</span>
            </h1>
            <p>
              Record expenses, scan receipts, send voice notes and keep
              your dashboard and Google Sheet in sync.
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

          <div className="mpHeroStage" aria-label="MyPocket AI assistant preview">
            <div className="mpHeroShape" aria-hidden="true"></div>
            <img
              className="mpHeroRobot"
              src="/mypocket-robot.webp?v=2"
              alt="MyPocket AI robot assistant holding a magnifying glass"
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
          <article><span><LandingIcon name="message" /></span><div><strong>WhatsApp-first</strong><p>Chat naturally. We handle the admin.</p></div></article>
          <article><span><LandingIcon name="sync" /></span><div><strong>AI-assisted</strong><p>Receipts, voice and everyday money language.</p></div></article>
          <article><span><LandingIcon name="lock" /></span><div><strong>Workspace private</strong><p>Your records stay inside your workspace.</p></div></article>
        </div>
      </section>

      <section className="mpProblem" aria-labelledby="mp-problem-title">
        <div className="mpProblemInner">
          <div className="mpProblemCopy">
            <h2 id="mp-problem-title">Finance shouldn’t feel like admin<span>.</span></h2>
            <p>One message should be enough to keep your records accurate.</p>
            <div className="mpProblemList">
              <article><span><LandingIcon name="receipt" /></span><div><h3>Receipts become records</h3><p>Scan, review and confirm before anything is saved.</p></div></article>
              <article><span><LandingIcon name="microphone" /></span><div><h3>Voice becomes action</h3><p>Say “bot” and record expenses naturally.</p></div></article>
              <article><span><LandingIcon name="sync" /></span><div><h3>Everything stays in sync</h3><p>Dashboard, Google Sheet and Drive update together.</p></div></article>
            </div>
          </div>
          <div className="mpProblemVisual" aria-hidden="true">
            <div></div>
            <img src="/mypocket-robot.webp?v=2" alt="" loading="lazy" />
          </div>
        </div>
      </section>

      <section className="mpHow" id="how" aria-labelledby="mp-how-title">
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

      <section className="mpCapabilities" id="features" aria-labelledby="mp-features-title">
        <div className="mpSectionInner">
          <h2 id="mp-features-title">One place for the whole money routine<span>.</span></h2>
          <div className="mpTabs" role="tablist" aria-label="MyPocket AI capabilities">
            {capabilities.map((item) => (
              <button
                aria-selected={item.key === activeCapability}
                className={item.key === activeCapability ? "active" : ""}
                key={item.key}
                onClick={() => setActiveCapability(item.key)}
                role="tab"
                type="button"
              >
                <LandingIcon name={item.icon} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="mpCapabilityPanel" role="tabpanel">
            <div className="mpCapabilityCopy">
              <h3>{capability.title}</h3>
              <p>{capability.body}</p>
              <ul>
                {capability.bullets.map((bullet) => (
                  <li key={bullet}><LandingIcon name="check" />{bullet}</li>
                ))}
              </ul>
            </div>
            <CapabilityPreview capability={activeCapability} />
          </div>
        </div>
      </section>

      <section className="mpPricing" id="pricing" aria-labelledby="mp-pricing-title">
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

      <section className="mpTrust" aria-labelledby="mp-trust-title">
        <div className="mpSectionInner mpTrustInner">
          <div>
            <h2 id="mp-trust-title">Your finances. Your control<span>.</span></h2>
            <p>MyPocket AI uses authorised connections and never asks for your Google or WhatsApp password.</p>
          </div>
          <div className="mpTrustPoints">
            <article><LandingIcon name="lock" /><h3>Workspace separation</h3><p>Personal, family and business records remain scoped to the right workspace.</p></article>
            <article><LandingIcon name="check" /><h3>Confirmation first</h3><p>A receipt is only uploaded and recorded after you type !confirm.</p></article>
            <article><LandingIcon name="sync" /><h3>Connected, not trapped</h3><p>Your Google integration can be reviewed or disconnected from the dashboard.</p></article>
          </div>
        </div>
      </section>

      <section className="mpFaq" id="faq" aria-labelledby="mp-faq-title">
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

      <section className="mpFinalCta" aria-labelledby="mp-final-title">
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
            <a href="/help">Help</a>
            <a href="/blog">Blog</a>
          </nav>
          <span>© 2026 MyPocket AI</span>
        </div>
      </footer>
    </main>
  );
}
