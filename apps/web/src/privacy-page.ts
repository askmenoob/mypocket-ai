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
      "Privacy Policy for MyPocket AI, including Google user data, Limited Use, retention, deletion, and security practices.";
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

      h3 {
        margin-top: 24px;
        color: #173b3b;
        font-size: 18px;
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
      <p class="updated">Last updated: August 2, 2026</p>

      <p>
        This Privacy Policy explains how MyPocket AI collects, uses,
        stores, shares, protects, retains, and deletes personal
        information when you use imai.my, app.imai.my, api.imai.my, and
        related MyPocket AI services.
      </p>

      <h2>1. Information We Collect</h2>

      <p>We may collect the following information:</p>

      <ul>
        <li>Name, email address, profile information, and account identifiers.</li>
        <li>Workspace, member, subscription, billing status, and support information.</li>
        <li>Transaction records, categories, merchants, payment methods, notes, receipt links, and related financial entries that you submit or sync through the service.</li>
        <li>WhatsApp connection status and message information needed to provide the WhatsApp bot features you enable.</li>
        <li>Authentication, authorization, browser, device, IP address, and access-log information used for account security and service operation.</li>
      </ul>

      <h2>2. Google User Data We Access</h2>

      <p>
        MyPocket AI accesses Google user data only after you authorize the
        requested Google OAuth permissions. Depending on the feature you
        use, this may include:
      </p>

      <ul>
        <li>Google account identity data, including your email address and basic profile information, to authenticate you and connect the correct workspace owner account.</li>
        <li>Google OAuth access tokens, refresh tokens, token expiry information, and the scopes you granted, so MyPocket AI can maintain the Google connection you requested.</li>
        <li>Google Sheets data and metadata, including spreadsheet IDs, spreadsheet titles, sheet names, spreadsheet URLs, ranges, rows, and cell values in spreadsheets connected to or created for your MyPocket AI workspace.</li>
        <li>Google Drive file and folder metadata needed to create, copy, organize, and move MyPocket AI workspace folders, reports, exports, receipt folders, templates, backups, and connected spreadsheets.</li>
      </ul>

      <p>
        MyPocket AI does not request or store your Google password.
      </p>

      <h2>3. How We Use Google User Data</h2>

      <p>
        We use Google user data only to provide and maintain the Google
        features that you choose to enable. Specifically, MyPocket AI may
        use Google user data to:
      </p>

      <ul>
        <li>Sign you in, identify your account, and verify that the connected Google account matches the workspace owner email.</li>
        <li>Create or connect a Google Sheet for your financial workspace.</li>
        <li>Create a MyPocket AI folder structure in Google Drive for reports, receipts, exports, templates, and backups.</li>
        <li>Copy workspace templates and backup spreadsheets into your Google Drive.</li>
        <li>Read spreadsheet metadata and selected sheet ranges required to show or manage your connected workspace.</li>
        <li>Append or update transaction rows, dashboard ranges, settings, reports, and related workspace data in your connected Google Sheet.</li>
        <li>Refresh expired access tokens so the integration can continue working until you disconnect or revoke access.</li>
        <li>Troubleshoot, secure, and maintain the Google integration.</li>
      </ul>

      <h2>4. Limited Use and AI/ML Training</h2>

      <p>
        MyPocket AI's use and transfer of information received from Google
        APIs complies with the Google API Services User Data Policy,
        including the Limited Use requirements.
      </p>

      <p>
        MyPocket AI does not sell Google user data, does not use Google user data for advertising, and does not use Google Workspace APIs data to develop, improve, or train generalized artificial intelligence or machine learning models.
      </p>

      <p>
        Human access to Google user data is limited to cases required for
        security, support, legal compliance, or service troubleshooting,
        and only where permitted by law and the Google API Services User
        Data Policy.
      </p>

      <h2>5. Sharing of Google User Data and Other Information</h2>

      <p>
        We do not sell Google user data or personal information. We do not
        share Google user data with unrelated third parties for their own
        marketing or advertising purposes.
      </p>

      <p>
        We may share or process information with limited categories of
        service providers only as needed to operate MyPocket AI, such as:
      </p>

      <ul>
        <li>Cloud hosting, database, storage, monitoring, logging, and security providers used to run and protect the service.</li>
        <li>Authentication and infrastructure providers used to deliver account access and application functionality.</li>
        <li>Payment and billing providers for subscription, checkout, invoice, and payment-status processing.</li>
        <li>Customer support or operational tools used to respond to requests you send us.</li>
      </ul>

      <p>
        These providers may process information only for authorized
        purposes on our behalf. We may also disclose information if
        required by law, court order, regulatory obligation, or a lawful
        request from a public authority.
      </p>

      <h2>6. Data Storage and Protection</h2>

      <p>
        MyPocket AI stores application data in controlled systems used to
        operate the service. Google OAuth tokens are stored in encrypted
        form where supported by the application, and access to production
        systems is restricted to authorized personnel.
      </p>

      <p>
        We use reasonable technical and organizational safeguards designed
        to protect information against unauthorized access, misuse,
        alteration, disclosure, loss, or destruction. These safeguards may
        include encryption, access controls, environment separation,
        logging, monitoring, backups, and secure operational procedures.
      </p>

      <p>
        No electronic transmission or storage system can be guaranteed to
        be completely secure.
      </p>

      <h2>7. Data Retention and Deletion</h2>

      <p>
        We retain personal information and Google user data only for as
        long as reasonably necessary to provide the service, maintain
        security, resolve disputes, comply with legal obligations, and
        support legitimate business operations. This section describes how Google user data is retained and deleted.
      </p>

      <p>
        Google OAuth tokens and stored Google connection records are kept
        while your Google integration remains connected. If you disconnect
        Google from MyPocket AI, revoke access from your Google Account, or
        request deletion, we will delete or de-identify Google connection
        records that are no longer required for legal, security, or
        operational reasons.
      </p>

      <p>
        You may request access, correction, export, or deletion of your
        personal information and Google user data by contacting us through
        the official contact channel on <a href="https://imai.my">imai.my</a>
        or by emailing <a href="mailto:admin@imai.my">admin@imai.my</a>.
        We may need to verify your identity before completing a request.
      </p>

      <p>
        You may also revoke MyPocket AI's access from your Google Account
        security settings at any time. Revoking access stops future Google
        API access, but it does not automatically delete data already
        stored in MyPocket AI or files that remain in your Google Drive.
      </p>

      <h2>8. Cookies and Browser Storage</h2>

      <p>
        The website may use cookies, local storage, and similar
        technologies for authentication, security, preferences, and
        essential website operation.
      </p>

      <h2>9. International Processing</h2>

      <p>
        Some service providers may process information outside Malaysia.
        We take reasonable steps to protect information in accordance with
        applicable requirements.
      </p>

      <h2>10. Your Rights</h2>

      <p>Subject to applicable law, you may request:</p>

      <ul>
        <li>Access to personal information held about you.</li>
        <li>Correction of inaccurate or incomplete information.</li>
        <li>Withdrawal of consent where applicable.</li>
        <li>Deletion or restriction of eligible information.</li>
        <li>Information about how your Google user data is accessed, used, stored, shared, retained, and deleted.</li>
      </ul>

      <h2>11. Third-Party Services</h2>

      <p>
        Third-party websites and services, including Google services,
        operate under their own terms and privacy policies. You should
        review those policies before granting access or submitting
        information.
      </p>

      <h2>12. Children Privacy</h2>

      <p>
        The website is not intended for children who cannot provide valid
        consent under applicable law.
      </p>

      <h2>13. Changes to This Policy</h2>

      <p>
        We may update this Privacy Policy from time to time. The current
        version and its revision date will be published on this page.
      </p>

      <h2>14. Contact</h2>

      <p>
        Privacy-related questions, Google data requests, and deletion
        requests may be submitted through the official contact channel on
        <a href="https://imai.my">imai.my</a> or by emailing
        <a href="mailto:admin@imai.my">admin@imai.my</a>.
      </p>

      <footer>
        <a href="/terms">Terms of Service</a>
        &nbsp;·&nbsp;
        <a href="/">MyPocket AI</a>

        <p>&copy; 2026 MyPocket AI. All rights reserved.</p>
      </footer>
    </main>
  `;
}
