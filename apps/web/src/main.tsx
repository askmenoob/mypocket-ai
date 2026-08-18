import { renderPrivacyPage } from "./privacy-page";
import { renderMerchantPolicyPage } from "./merchant-policy-page";
import { renderResourcePage } from "./resource-page";
import { renderTermsPage } from "./terms-page";

/* MYPOCKET_TERMS_ROUTE */

const pathname =
  window.location.pathname.replace(/\/+$/, "") || "/";

if (pathname === "/terms") {
  renderTermsPage();
} else if (pathname === "/privacy") {
  renderPrivacyPage();
} else if (pathname === "/refund-policy" || pathname === "/shipping-policy") {
  renderMerchantPolicyPage(pathname);
} else if (["/blog", "/help", "/guides", "/guides/whatsapp-bot", "/updates"].includes(pathname)) {
  renderResourcePage(pathname);
} else if (pathname === "/catalog") {
  void import("./catalog-page").then(
    ({ renderCatalogPage }) => renderCatalogPage(),
  );
} else {
  void import("./app-bootstrap");
}
