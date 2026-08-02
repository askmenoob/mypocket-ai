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
  "/guides/whatsapp-bot": {
    title: "WhatsApp Bot Guide",
    eyebrow: "User Guide",
    description:
      "Learn the correct WhatsApp command format so every transaction is recorded into the right MyPocket AI columns.",
    sections: [
      {
        heading: "Where to send commands",
        body:
          "In WhatsApp groups, start every bot message with ! or @mypocket. In private chat with the bot, the trigger is optional.",
        items: [
          "Group example: !beli buku RM50 cash",
          "Group alias example: @mypocket beli buku RM50 cash",
          "Private chat example: beli buku RM50 cash",
          "Messages without the group trigger are ignored to avoid recording normal group conversation.",
        ],
      },
      {
        heading: "Basic transaction format",
        body:
          "Use natural language, but keep the amount and payment method clear. MyPocket AI reads the command, merchant, amount, and payment method from your message.",
        items: [
          "Expense: !beli buku RM50 cash",
          "Expense: !makan nasi lemak RM8 tng",
          "Bill: !bayar internet unifi RM129 bank",
          "Income: !gaji RM3000",
          "Income: !income freelance RM800 bank",
        ],
      },
      {
        heading: "How your message maps to Google Sheet columns",
        body:
          "Each accepted command creates a row in the Transactions tab. These are the important mappings.",
        items: [
          "Type: beli, makan, bayar, petrol, bill create EXPENSE; gaji, salary, income create INCOME.",
          "Category: detected from the command and merchant, such as Food, Shopping, Bills, Transport, Salary, or Others.",
          "Merchant: the item or payee, for example buku, internet unifi, nasi lemak, telefon, or laptop.",
          "Description: the original cleaned command text, kept for audit and review.",
          "Amount: the RM value in the message, for example RM50, rm129, or RM3,000.",
          "Payment Method: cash, bank, tng, card, or other detected payment method.",
          "Source: WhatsApp transactions are saved as WHATSAPP.",
          "Created By: Family and Business workspaces use the linked WhatsApp number to map the member.",
        ],
      },
      {
        heading: "Record multiple transactions in one message",
        body:
          "Separate transactions with a comma. The bot will create one row for each transaction.",
        items: [
          "!beli jam tangan RM500 cash, beli telefon RM2000 bank, beli laptop RM3000 bank",
          "Expected result: 3 separate rows in Transactions and Google Sheet.",
          "Do not use commas inside amounts. Prefer RM1000 instead of RM1,000 when sending WhatsApp commands.",
        ],
      },
      {
        heading: "Summaries and checks",
        body:
          "Use command words to check your bot status, summaries, and available commands.",
        items: [
          "!help — quick help",
          "!commands — full command list",
          "!status — bot and workspace status",
          "!today — today's summary",
          "!week — this week summary",
          "!month — this month summary",
          "!members — linked WhatsApp members",
        ],
      },
      {
        heading: "Commitments and reminders",
        body:
          "Commitment commands help track repeating payments and reminders.",
        items: [
          "!reminder — unpaid commitments",
          "!all reminders — all commitments",
          "!paid reminders — completed commitments",
          "!Remind me to pay car RM1000 every 10th",
          "!paid car or !mark paid car — mark as paid",
          "!disable reminder car — disable reminder",
        ],
      },
      {
        heading: "Best practices for clean data",
        body:
          "Short, consistent messages produce cleaner Google Sheet rows and better reports.",
        items: [
          "Always include RM amount.",
          "Include payment method when you know it: cash, bank, tng, card.",
          "Use one comma only to separate multiple transactions.",
          "For receipts and LHDN review, later verify supplier, receipt URL, and e-Invoice details in Google Sheet.",
        ],
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
