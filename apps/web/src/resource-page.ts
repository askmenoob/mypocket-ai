type ResourcePageContent = {
  title: string;
  eyebrow: string;
  description: string;
  sections: Array<{
    heading: string;
    body: string;
    items?: string[];
  }>;
};

const pages: Record<string, ResourcePageContent> = {
  "/blog": {
    title: "Blog",
    eyebrow: "Resources",
    description:
      "Product notes and practical finance automation articles from MyPocket AI.",
    sections: [
      {
        heading: "Latest articles",
        body:
          "Our public blog is being prepared. For now, use this page as the official MyPocket AI blog index.",
        items: [
          "WhatsApp to Google Sheets finance tracking for Malaysians",
          "How MyPocket AI organizes transaction records in your Google Sheet",
          "Privacy and Google data handling in MyPocket AI",
        ],
      },
      {
        heading: "Need help now?",
        body:
          "For account, Google Sheet, or WhatsApp setup questions, contact support@imai.my.",
      },
    ],
  },
  "/help": {
    title: "Help Center",
    eyebrow: "Support",
    description:
      "Help for setting up MyPocket AI, connecting Google, and using WhatsApp finance automation.",
    sections: [
      {
        heading: "Common setup steps",
        body:
          "Start from the dashboard, sign in, connect Google, create or connect your Google Sheet, then connect WhatsApp features available for your package.",
        items: [
          "Use the same Google account as the workspace owner when connecting Google.",
          "Keep the MyPocket AI folder and backup spreadsheet in Google Drive.",
          "If Google access is revoked, reconnect Google from the dashboard.",
        ],
      },
      {
        heading: "Support contact",
        body:
          "Email support@imai.my with your account email, workspace name, and a short description of the issue.",
      },
    ],
  },
  "/guides": {
    title: "Guides",
    eyebrow: "Learning",
    description:
      "Step-by-step guides for using MyPocket AI with Google Sheets and WhatsApp.",
    sections: [
      {
        heading: "Available guides",
        body:
          "These guides summarize the core workflows currently supported by MyPocket AI.",
        items: [
          "Connect your Google account and create a workspace Google Sheet.",
          "Record expenses and income through WhatsApp-style transaction messages.",
          "Review transactions, categories, reports, and backups in Google Sheets.",
        ],
      },
      {
        heading: "More documentation",
        body:
          "Additional detailed guides will be published here as product workflows expand.",
      },
    ],
  },
  "/updates": {
    title: "Updates",
    eyebrow: "Changelog",
    description:
      "Product updates, fixes, and service notices for MyPocket AI.",
    sections: [
      {
        heading: "Current updates",
        body:
          "MyPocket AI is actively improving Google Sheet sync, WhatsApp finance workflows, workspace setup, and privacy documentation.",
        items: [
          "Privacy policy updated for Google OAuth verification requirements.",
          "Public footer links now route to working pages.",
          "Google Sheet workspace setup continues to use user-authorized Google access.",
        ],
      },
      {
        heading: "Service notices",
        body:
          "Important notices will be posted here when they affect account access, Google integration, or core automation features.",
      },
    ],
  },
};

export function renderResourcePage(pathname: string): void {
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("Root element not found");
  }

  const page = pages[pathname] ?? pages["/help"];

  document.title = `${page.title} | MyPocket AI`;
  document.documentElement.lang = "en";

  const description = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );

  if (description) {
    description.content = page.description;
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

      .eyebrow {
        margin: 0 0 12px;
        color: #087f6a;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
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
      <p class="eyebrow">${page.eyebrow}</p>
      <h1>${page.title}</h1>
      <p>${page.description}</p>

      ${page.sections
        .map(
          (section) => `
            <section>
              <h2>${section.heading}</h2>
              <p>${section.body}</p>
              ${
                section.items
                  ? `<ul>${section.items
                      .map((item) => `<li>${item}</li>`)
                      .join("")}</ul>`
                  : ""
              }
            </section>
          `,
        )
        .join("")}

      <footer>
        <a href="/privacy">Privacy Policy</a>
        &nbsp;·&nbsp;
        <a href="/terms">Terms of Service</a>
        &nbsp;·&nbsp;
        <a href="/">MyPocket AI</a>

        <p>&copy; 2026 MyPocket AI. All rights reserved.</p>
      </footer>
    </main>
  `;
}
