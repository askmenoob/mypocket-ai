export function renderPrivacyPage(): void {
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("Root element not found");
  }

  document.title = "Privacy Policy | MyPocket AI";
  document.documentElement.lang = "en";

  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );

  if (meta) {
    meta.content =
      "Privacy Policy for the MyPocket AI website and related services.";
  }

  root.innerHTML = `
    <style>
      :root {
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont,
          "Segoe UI", sans-serif;
        background: #f3f7f6;
        color: #173b3b;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #f3f7f6;
      }

      a {
        color: #087f6a;
      }

      header {
        border-bottom: 1px solid #d9e7e4;
        background: #ffffff;
      }

      nav {
        width: min(100% - 32px, 920px);
        margin: 0 auto;
        padding: 18px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      nav a {
        color: #073f3e;
        font-weight: 700;
        text-decoration: none;
      }

      .home-link {
        border: 1px solid #b7d2cc;
        border-radius: 999px;
        padding: 8px 15px;
        font-size: 14px;
      }

      main {
        width: min(100% - 24px, 880px);
        margin: 36px auto;
        padding: clamp(26px, 5vw, 58px);
        border: 1px solid #d9e7e4;
        border-radius: 22px;
        background: #ffffff;
        box-shadow: 0 18px 50px rgba(14, 55, 53, 0.08);
      }

      h1 {
        margin: 0;
        color: #063f3e;
        font-size: clamp(36px, 7vw, 56px);
        letter-spacing: -0.04em;
      }

      h2 {
        margin-top: 32px;
        color: #0a4d4b;
        font-size: 22px;
      }

      p,
      li {
        color: #435f5e;
        font-size: 16px;
        line-height: 1.8;
      }

      .updated {
        color: #718482;
      }

      footer {
        margin-top: 42px;
        padding-top: 22px;
        border-top: 1px solid #e3ecea;
        color: #718482;
        text-align: center;
      }
    </style>

    <header>
      <nav>
        <a href="/">MyPocket AI</a>
        <a class="home-link" href="/">Back to home</a>
      </nav>
    </header>

    <main>
      <h1>Privacy Policy</h1>
      <p class="updated">Last updated: July 29, 2026</p>

      <p>
        This Privacy Policy explains how MyPocket AI collects, uses,
        stores, discloses and protects personal information when you
        access imai.my or related services.
      </p>

      <h2>1. Information We Collect</h2>

      <p>We may collect information including:</p>

      <ul>
        <li>Name, email address and account identifiers.</li>
        <li>Information voluntarily submitted by you.</li>
        <li>Authentication and authorisation information.</li>
        <li>Browser, device, IP address and access-log information.</li>
        <li>
          Information received from services that you choose to
          authorise.
        </li>
      </ul>

      <h2>2. How We Use Information</h2>

      <p>We may use personal information to:</p>

      <ul>
        <li>Create, authenticate and administer accounts.</li>
        <li>Provide and maintain requested services.</li>
        <li>Respond to questions and support requests.</li>
        <li>Protect the security and integrity of the website.</li>
        <li>Investigate misuse and enforce applicable terms.</li>
        <li>Comply with legal and regulatory requirements.</li>
      </ul>

      <h2>3. Google User Data</h2>

      <p>
        When you choose to authorise a Google account, MyPocket AI may
        receive information associated with the permissions displayed
        during the Google authorisation process.
      </p>

      <p>
        Google user data is accessed and used only after your
        authorisation and only for purposes necessary to provide the
        services you request.
      </p>

      <p>
        We do not sell Google user data, use it for personalised
        advertising or disclose it to unrelated third parties.
      </p>

      <p>
        Information received from Google APIs is handled in accordance
        with the Google API Services User Data Policy, including
        applicable Limited Use requirements.
      </p>

      <p>
        You may revoke access through the security or third-party
        connection settings of your Google Account.
      </p>

      <h2>4. Disclosure of Information</h2>

      <p>
        Personal information may be disclosed to service providers that
        support website operations, security and infrastructure. Such
        providers may process information only for authorised purposes.
      </p>

      <p>
        Information may also be disclosed where required by applicable
        law, court order or a lawful request from a public authority.
      </p>

      <p>We do not sell personal information.</p>

      <h2>5. Data Retention</h2>

      <p>
        Personal information is retained only for as long as reasonably
        necessary to provide the service, maintain security, resolve
        disputes and comply with legal obligations.
      </p>

      <h2>6. Data Security</h2>

      <p>
        We use reasonable technical and organisational safeguards
        designed to protect personal information against unauthorised
        access, misuse, alteration, disclosure, loss or destruction.
      </p>

      <p>
        No electronic transmission or storage system can be guaranteed
        to be completely secure.
      </p>

      <h2>7. International Processing</h2>

      <p>
        Some service providers may process information outside Malaysia.
        Reasonable steps will be taken to protect information in
        accordance with applicable requirements.
      </p>

      <h2>8. Your Rights</h2>

      <p>Subject to applicable law, you may request:</p>

      <ul>
        <li>Access to personal information held about you.</li>
        <li>Correction of inaccurate or incomplete information.</li>
        <li>Withdrawal of consent where applicable.</li>
        <li>Deletion or restriction of eligible information.</li>
      </ul>

      <h2>9. Cookies and Browser Storage</h2>

      <p>
        The website may use cookies, local storage and similar
        technologies for authentication, security, preferences and
        essential website operation.
      </p>

      <h2>10. Third-Party Services</h2>

      <p>
        Third-party websites and services operate under their own terms
        and privacy policies. You should review those policies before
        granting access or submitting information.
      </p>

      <h2>11. Children’s Privacy</h2>

      <p>
        The website is not intended for children who cannot provide
        valid consent under applicable law.
      </p>

      <h2>12. Changes to This Policy</h2>

      <p>
        We may update this Privacy Policy from time to time. The current
        version and its revision date will be published on this page.
      </p>

      <h2>13. Contact</h2>

      <p>
        Privacy-related questions or requests may be submitted through
        the official contact channel displayed on
        <a href="https://imai.my">imai.my</a>.
      </p>

      <footer>
        <a href="/terms">Terms of Service</a>
        &nbsp;·&nbsp;
        <a href="/">MyPocket AI</a>

        <p>© 2026 MyPocket AI. All rights reserved.</p>
      </footer>
    </main>
  `;
}
