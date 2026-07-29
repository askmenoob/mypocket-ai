export function renderTermsPage(): void {
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("Root element not found");
  }

  document.title = "Terms of Service | MyPocket AI";
  document.documentElement.lang = "en";

  const description =
    document.querySelector<HTMLMetaElement>('meta[name="description"]');

  if (description) {
    description.content =
      "Terms of Service governing access to and use of the MyPocket AI website and related services.";
  }

  root.innerHTML = `
    <style>
      :root {
        color-scheme: light;
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        background: #f3f7f6;
        color: #163839;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background:
          radial-gradient(
            circle at top right,
            rgba(31, 150, 126, 0.12),
            transparent 34rem
          ),
          #f3f7f6;
      }

      a {
        color: #087f6a;
      }

      .legal-header {
        border-bottom: 1px solid #d9e7e4;
        background: rgba(255, 255, 255, 0.94);
        backdrop-filter: blur(12px);
      }

      .legal-nav {
        width: min(100% - 32px, 960px);
        margin: 0 auto;
        padding: 18px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
      }

      .legal-brand {
        color: #062f30;
        font-size: 20px;
        font-weight: 800;
        text-decoration: none;
      }

      .legal-home {
        border: 1px solid #b7d2cc;
        border-radius: 999px;
        padding: 9px 16px;
        color: #0b5d50;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
      }

      .legal-shell {
        width: min(100% - 32px, 900px);
        margin: 42px auto;
      }

      .legal-card {
        border: 1px solid #d9e7e4;
        border-radius: 24px;
        padding: clamp(28px, 5vw, 60px);
        background: #ffffff;
        box-shadow: 0 20px 60px rgba(14, 55, 53, 0.08);
      }

      .legal-label {
        margin: 0 0 12px;
        color: #087f6a;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        color: #062f30;
        font-size: clamp(36px, 7vw, 58px);
        line-height: 1.05;
        letter-spacing: -0.04em;
      }

      .legal-date {
        margin: 18px 0 32px;
        color: #687d7b;
        font-size: 15px;
      }

      .legal-intro {
        margin-bottom: 34px;
        color: #385756;
        font-size: 18px;
        line-height: 1.8;
      }

      section {
        padding: 6px 0 18px;
      }

      h2 {
        margin: 22px 0 10px;
        color: #0a4040;
        font-size: 22px;
        line-height: 1.4;
      }

      p,
      li {
        color: #415c5b;
        font-size: 16px;
        line-height: 1.8;
      }

      ul {
        padding-left: 24px;
      }

      .legal-footer {
        margin-top: 36px;
        padding-top: 24px;
        border-top: 1px solid #e3ecea;
        color: #718482;
        font-size: 14px;
        text-align: center;
      }

      @media (max-width: 600px) {
        .legal-shell {
          width: min(100% - 20px, 900px);
          margin: 20px auto;
        }

        .legal-card {
          border-radius: 18px;
          padding: 28px 22px;
        }

        .legal-nav {
          width: min(100% - 28px, 960px);
          padding: 14px 0;
        }
      }
    </style>

    <header class="legal-header">
      <nav class="legal-nav" aria-label="Main navigation">
        <a class="legal-brand" href="/">MyPocket AI</a>
        <a class="legal-home" href="/">Back to home</a>
      </nav>
    </header>

    <main class="legal-shell">
      <article class="legal-card">
        <p class="legal-label">Legal</p>

        <h1>Terms of Service</h1>

        <p class="legal-date">
          Last updated: July 29, 2026
        </p>

        <p class="legal-intro">
          These Terms of Service govern your access to and use of the
          MyPocket AI website and any related services made available
          through imai.my.
        </p>

        <section>
          <h2>1. Acceptance of Terms</h2>

          <p>
            By accessing or using this website, you acknowledge that you
            have read, understood and agreed to be bound by these Terms
            of Service.
          </p>

          <p>
            If you do not agree with these terms, you should discontinue
            your use of the website and related services.
          </p>
        </section>

        <section>
          <h2>2. Eligibility</h2>

          <p>
            You must have the legal capacity to enter into a binding
            agreement under applicable law. Where you use the website on
            behalf of an organisation, you represent that you have the
            authority to bind that organisation to these terms.
          </p>
        </section>

        <section>
          <h2>3. Acceptable Use</h2>

          <p>
            You agree to use the website and related services only for
            lawful purposes and in a manner that does not infringe the
            rights of others.
          </p>

          <p>You must not:</p>

          <ul>
            <li>Use the website in violation of any applicable law.</li>

            <li>
              Attempt to gain unauthorised access to any account,
              computer system, network or data.
            </li>

            <li>
              Introduce viruses, malicious code or other harmful
              material.
            </li>

            <li>
              Interfere with the operation, availability or security of
              the website.
            </li>

            <li>
              Use automated systems to overload, scrape or misuse the
              website without written permission.
            </li>

            <li>
              Use the website to impersonate another person or
              misrepresent your identity or affiliation.
            </li>
          </ul>
        </section>

        <section>
          <h2>4. Accounts and Security</h2>

          <p>
            Where an account is required, you are responsible for
            providing accurate information and maintaining the
            confidentiality of your login credentials.
          </p>

          <p>
            You are responsible for activities conducted through your
            account. You should inform us promptly if you believe your
            account has been accessed without authorisation.
          </p>
        </section>

        <section>
          <h2>5. User Submissions</h2>

          <p>
            You retain ownership of information or materials that you
            submit through the website.
          </p>

          <p>
            You represent that you have the necessary rights and
            permissions to submit such materials and that they do not
            violate applicable law or the rights of another person.
          </p>
        </section>

        <section>
          <h2>6. Intellectual Property</h2>

          <p>
            Unless otherwise stated, the website, branding, design,
            software, text, graphics, logos and other materials made
            available through imai.my are owned by or licensed to
            MyPocket AI and are protected by applicable intellectual
            property laws.
          </p>

          <p>
            You may not copy, reproduce, modify, distribute, sell,
            license or commercially exploit these materials without
            prior written permission.
          </p>
        </section>

        <section>
          <h2>7. Third-Party Services and Links</h2>

          <p>
            The website may contain links to, or interact with,
            third-party websites and services.
          </p>

          <p>
            We do not control and are not responsible for the
            availability, security, content, terms or privacy practices
            of third parties. Your use of third-party services is subject
            to their respective terms and policies.
          </p>
        </section>

        <section>
          <h2>8. Availability and Modifications</h2>

          <p>
            We may update, modify, suspend, restrict or discontinue any
            part of the website or related services at any time.
          </p>

          <p>
            We do not guarantee that the website will always be
            available, uninterrupted, secure or free from errors.
          </p>
        </section>

        <section>
          <h2>9. Disclaimer of Warranties</h2>

          <p>
            The website and related services are provided on an
            "as is" and "as available" basis.
          </p>

          <p>
            To the maximum extent permitted by law, we make no express
            or implied warranties regarding availability, accuracy,
            reliability, suitability, security or fitness for a
            particular purpose.
          </p>
        </section>

        <section>
          <h2>10. Limitation of Liability</h2>

          <p>
            To the maximum extent permitted by applicable law, MyPocket
            AI will not be liable for indirect, incidental, special,
            consequential or punitive losses arising from your access
            to, use of, or inability to use the website or related
            services.
          </p>

          <p>
            Nothing in these terms excludes or limits any liability that
            cannot lawfully be excluded or limited.
          </p>
        </section>

        <section>
          <h2>11. Suspension and Termination</h2>

          <p>
            We may suspend, restrict or terminate access where we
            reasonably believe that a user has violated these terms,
            engaged in unlawful conduct, created a security risk or
            misused the website.
          </p>
        </section>

        <section>
          <h2>12. Privacy</h2>

          <p>
            Personal information submitted through the website will be
            handled in accordance with the applicable Privacy Policy and
            relevant data protection requirements.
          </p>
        </section>

        <section>
          <h2>13. Changes to These Terms</h2>

          <p>
            We may revise these Terms of Service from time to time. The
            latest version will be published on this page together with
            the applicable revision date.
          </p>

          <p>
            Your continued use of the website after revised terms become
            effective constitutes acceptance of those revised terms.
          </p>
        </section>

        <section>
          <h2>14. Governing Law</h2>

          <p>
            These Terms of Service are governed by the laws of Malaysia.
            Any dispute relating to these terms will be subject to the
            jurisdiction of the courts of Malaysia.
          </p>
        </section>

        <section>
          <h2>15. Contact</h2>

          <p>
            Questions regarding these Terms of Service may be submitted
            through the official MyPocket AI website.
          </p>
        </section>

        <footer class="legal-footer">
          © 2026 MyPocket AI. All rights reserved.
        </footer>
      </article>
    </main>
  `;
}
