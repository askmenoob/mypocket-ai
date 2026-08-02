import { renderPrivacyPage } from "./privacy-page";
import { renderResourcePage } from "./resource-page";
import { renderTermsPage } from "./terms-page";

/* MYPOCKET_TERMS_ROUTE */

const pathname =
  window.location.pathname.replace(/\/+$/, "") || "/";

if (pathname === "/terms") {
  renderTermsPage();
} else if (pathname === "/privacy") {
  renderPrivacyPage();
} else if (["/blog", "/help", "/guides", "/guides/whatsapp-bot", "/updates"].includes(pathname)) {
  renderResourcePage(pathname);
} else {
  void import("./app-bootstrap");
}
