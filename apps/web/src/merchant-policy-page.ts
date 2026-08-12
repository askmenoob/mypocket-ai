type MerchantPolicyPath = "/refund-policy" | "/shipping-policy";

const merchantIdentity = `
  <aside class="merchant-card" aria-label="Merchant information">
    <p class="merchant-label">Merchant information</p>
    <dl>
      <div><dt>Service</dt><dd>MyPocket AI</dd></div>
      <div><dt>Operator</dt><dd>RIFTECH ENTERPRISE</dd></div>
      <div><dt>SSM registration</dt><dd>201803398437 (002913082-T)</dd></div>
      <div><dt>Business type</dt><dd>Sole proprietorship</dd></div>
      <div><dt>Registration status</dt><dd>Active</dd></div>
      <div>
        <dt>Registered address</dt>
        <dd>
          <address>
            NO. 7, JALAN TANJUNG API-API 30/241<br />
            SEKSYEN 30<br />
            40460 SHAH ALAM, SELANGOR<br />
            MALAYSIA
          </address>
        </dd>
      </div>
      <div><dt>Business</dt><dd>Malaysian web and mobile software-as-a-service</dd></div>
      <div><dt>Website</dt><dd><a href="https://imai.my">https://imai.my</a></dd></div>
      <div><dt>Email</dt><dd><a href="mailto:support@imai.my">support@imai.my</a></dd></div>
      <div><dt>Telephone</dt><dd><a href="tel:+60103250032">+60 10-325 0032</a></dd></div>
    </dl>
  </aside>
`;

const refundPolicy = `
  <p class="policy-label">Payments and subscriptions</p>
  <h1>Refund Policy</h1>
  <p class="policy-date">Effective and last updated: August 13, 2026</p>
  <p class="policy-intro">
    This policy applies to subscriptions and other digital services sold
    through MyPocket AI by RIFTECH ENTERPRISE. It explains cancellation,
    refund eligibility, and how approved refunds are returned.
  </p>

  ${merchantIdentity}

  <section>
    <h2>1. Subscription charges</h2>
    <p>
      MyPocket AI offers Personal Pro, Family, and Business subscriptions.
      The price, billing interval, any applicable discount, total payable,
      and renewal terms are shown before you complete checkout. Available
      billing intervals may include monthly, six-month, and annual plans.
    </p>
    <p>
      A purchase is complete only after the payment provider confirms a
      successful payment. A pending or failed payment does not activate a
      paid subscription and should not be treated as a completed charge.
    </p>
  </section>

  <section>
    <h2>2. Cancellation and plan changes</h2>
    <ul>
      <li>You may cancel automatic renewal from the subscription controls in your dashboard.</li>
      <li>Cancellation stops future renewal charges. Access normally continues until the end of the period already paid for.</li>
      <li>Upgrades may take effect after the required payment is successfully confirmed.</li>
      <li>Downgrades normally take effect at the next billing cycle and are disclosed before you confirm the change.</li>
    </ul>
  </section>

  <section>
    <h2>3. When a refund may be approved</h2>
    <p>
      Contact us within <strong>7 calendar days</strong> of the charge if you
      believe a refund is due. We will review requests fairly and in
      accordance with applicable Malaysian law. A refund may be approved for:
    </p>
    <ul>
      <li>a duplicate or incorrect charge;</li>
      <li>a successful payment where paid access was not activated and we could not resolve the issue;</li>
      <li>an unauthorised charge reported promptly, subject to identity and payment verification;</li>
      <li>a material service failure attributable to MyPocket AI; or</li>
      <li>another circumstance where a refund is required by applicable law.</li>
    </ul>
    <p>
      Used subscription periods, completed digital services, and partial
      billing periods are generally non-refundable unless the request falls
      within one of the circumstances above or the law requires otherwise.
    </p>
  </section>

  <section>
    <h2>4. How to request a refund</h2>
    <p>
      Email <a href="mailto:support@imai.my">support@imai.my</a> with the
      account email, workspace name, payment date, amount, transaction or
      purchase reference, and a short explanation. Do not send a full card
      number, PIN, CVV, online-banking password, or one-time password.
    </p>
  </section>

  <section>
    <h2>5. Refund method and timing</h2>
    <p>
      An approved refund is sent to the <strong>original payment method</strong>.
      We normally submit an approved refund within 7 business days. The bank,
      card network, e-wallet, or payment provider may require additional time
      before the credit appears in your account.
    </p>
  </section>

  <section>
    <h2>6. Related policies</h2>
    <p>
      See our <a href="/shipping-policy">Digital Delivery Policy</a>,
      <a href="/terms">Terms of Service</a>, and
      <a href="/privacy">Privacy Policy</a> for further information.
    </p>
  </section>
`;

const shippingPolicy = `
  <p class="policy-label">Digital service fulfilment</p>
  <h1>Digital Delivery Policy</h1>
  <p class="policy-date">Effective and last updated: August 13, 2026</p>
  <p class="policy-intro">
    MyPocket AI is a software-as-a-service product. We sell digital access
    and <strong>no physical goods</strong> are shipped. This page is also our
    shipping and delivery policy for payment-review purposes.
  </p>

  ${merchantIdentity}

  <section>
    <h2>1. What is delivered</h2>
    <p>
      Depending on the plan selected, digital access may include the
      MyPocket AI dashboard, WhatsApp transaction recording, receipt and
      voice processing, Google Sheets and Google Drive integration, shared
      workspaces, and reporting features described on the pricing page.
    </p>
  </section>

  <section>
    <h2>2. Delivery method and timing</h2>
    <ul>
      <li>Delivery is electronic through the MyPocket AI account associated with the email used at checkout.</li>
      <li>Paid access is activated only after our payment provider sends a valid successful-payment confirmation.</li>
      <li>Activation is normally immediate and may take up to 15 minutes after confirmation.</li>
      <li>You can verify the active plan and access status in the MyPocket AI dashboard.</li>
    </ul>
    <p>
      There are no shipping fees, couriers, physical delivery addresses, or
      parcel tracking numbers because no physical product is supplied.
    </p>
  </section>

  <section>
    <h2>3. Setup required by the customer</h2>
    <p>
      Some features require you to complete the setup wizard, authorize a
      Google account, connect a WhatsApp instance, or link workspace members.
      These setup steps do not change the payment confirmation time, but a
      feature cannot operate until its required connection is completed.
    </p>
  </section>

  <section>
    <h2>4. Failed, pending, or overdue payments</h2>
    <p>
      A failed or pending payment does not activate a new paid plan. For
      renewals, MyPocket AI may send reminders and apply the grace period
      disclosed for the subscription. Paid features may be restricted or
      suspended if payment remains overdue. Access can be restored after a
      later successful payment confirmation, subject to the plan terms.
    </p>
  </section>

  <section>
    <h2>5. Delivery problems</h2>
    <p>
      If payment is shown as successful but access is not active after 15
      minutes, email <a href="mailto:support@imai.my">support@imai.my</a>
      with your account email and transaction or purchase reference, or call
      <a href="tel:+60103250032">+60 10-325 0032</a>. Never send full payment
      credentials or one-time passwords.
    </p>
  </section>

  <section>
    <h2>6. Returns and refunds</h2>
    <p>
      A digital subscription cannot be physically returned. Eligible payment
      reversals are handled under our <a href="/refund-policy">Refund Policy</a>.
      You may also review our <a href="/terms">Terms of Service</a> and
      <a href="/privacy">Privacy Policy</a>.
    </p>
  </section>
`;

export function renderMerchantPolicyPage(pathname: MerchantPolicyPath): void {
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("Root element not found");
  }

  const isRefund = pathname === "/refund-policy";
  document.title = `${isRefund ? "Refund Policy" : "Digital Delivery Policy"} | MyPocket AI`;
  document.documentElement.lang = "en";

  const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (meta) {
    meta.content = isRefund
      ? "MyPocket AI subscription cancellation and refund policy."
      : "MyPocket AI digital delivery, activation, and shipping policy.";
  }

  root.innerHTML = `
    <style>
      :root { color-scheme: light; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f3f7f6; color:#163839; }
      * { box-sizing:border-box; }
      body { margin:0; background:radial-gradient(circle at top right, rgba(31,150,126,.13), transparent 34rem), #f3f7f6; }
      a { color:#087f6a; }
      .policy-header { border-bottom:1px solid #d9e7e4; background:rgba(255,255,255,.95); backdrop-filter:blur(12px); }
      .policy-nav { width:min(100% - 32px, 960px); margin:0 auto; padding:18px 0; display:flex; align-items:center; justify-content:space-between; gap:18px; }
      .policy-brand { color:#062f30; font-size:20px; font-weight:850; text-decoration:none; }
      .policy-home { border:1px solid #b7d2cc; border-radius:999px; padding:9px 16px; color:#0b5d50; font-size:14px; font-weight:750; text-decoration:none; }
      .policy-shell { width:min(100% - 32px, 900px); margin:42px auto; }
      .policy-card { border:1px solid #d9e7e4; border-radius:24px; padding:clamp(28px,5vw,60px); background:#fff; box-shadow:0 20px 60px rgba(14,55,53,.08); }
      .policy-label, .merchant-label { margin:0 0 12px; color:#087f6a; font-size:13px; font-weight:850; letter-spacing:.12em; text-transform:uppercase; }
      h1 { margin:0; color:#062f30; font-size:clamp(36px,7vw,58px); line-height:1.05; letter-spacing:-.04em; }
      .policy-date { margin:18px 0 28px; color:#687d7b; font-size:15px; }
      .policy-intro { margin-bottom:30px; color:#385756; font-size:18px; line-height:1.8; }
      section { padding:7px 0 16px; }
      h2 { margin:22px 0 10px; color:#0a4040; font-size:22px; line-height:1.4; }
      p, li, dd, dt { color:#415c5b; font-size:16px; line-height:1.8; }
      ul { padding-left:24px; }
      .merchant-card { margin:28px 0 30px; padding:22px; border:1px solid #bfe0d8; border-radius:18px; background:#effaf6; }
      .merchant-card dl { margin:0; display:grid; gap:8px; }
      .merchant-card dl div { display:grid; grid-template-columns:130px minmax(0,1fr); gap:16px; }
      .merchant-card dt { color:#60736f; font-size:14px; font-weight:700; }
      .merchant-card dd { margin:0; color:#173b3b; font-weight:650; overflow-wrap:anywhere; }
      .merchant-card address { font-style:normal; line-height:1.55; }
      .policy-footer { margin-top:34px; padding-top:24px; border-top:1px solid #e3ecea; display:flex; flex-wrap:wrap; justify-content:center; gap:10px 18px; color:#718482; font-size:14px; text-align:center; }
      @media (max-width:600px) { .policy-shell{width:min(100% - 20px,900px);margin:20px auto}.policy-card{border-radius:18px;padding:28px 22px}.policy-nav{width:min(100% - 28px,960px);padding:14px 0}.merchant-card dl div{grid-template-columns:1fr;gap:0} }
    </style>
    <header class="policy-header">
      <nav class="policy-nav" aria-label="Main navigation">
        <a class="policy-brand" href="/">MyPocket AI</a>
        <a class="policy-home" href="/">Back to home</a>
      </nav>
    </header>
    <main class="policy-shell">
      <article class="policy-card">
        ${isRefund ? refundPolicy : shippingPolicy}
        <footer class="policy-footer">
          <a href="/refund-policy">Refund Policy</a>
          <a href="/shipping-policy">Digital Delivery Policy</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <span>© 2026 MyPocket AI · Operated by RIFTECH ENTERPRISE</span>
        </footer>
      </article>
    </main>
  `;
}
