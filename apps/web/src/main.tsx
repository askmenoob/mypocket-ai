import { renderPrivacyPage } from "./privacy-page";
import { renderTermsPage } from "./terms-page";

/* MYPOCKET_TERMS_ROUTE */

const pathname =
  window.location.pathname.replace(/\/+$/, "") || "/";

if (pathname === "/terms") {
  renderTermsPage();
} else if (pathname === "/privacy") {
  renderPrivacyPage();
} else {
  void import("./app-bootstrap");
}
