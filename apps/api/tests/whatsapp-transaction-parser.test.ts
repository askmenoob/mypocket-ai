import assert from "node:assert/strict";
import test from "node:test";

import {
  WhatsAppService,
} from "../src/modules/whatsapp/whatsapp.service.js";


const service =
  Object.create(
    WhatsAppService.prototype,
  ) as any;


const parse =
  (
    text:string,
  ) =>
    service.parseTransactionText(
      text,
      "2026-08-03T00:00:00.000Z",
    );


test("explicit RM amount takes precedence over product numbers", () => {

  const parsed =
    parse(
      "beli iphone 15 RM3,000.50 bank",
    );


  assert.equal(
    parsed.amount,
    "3000.50",
  );

  assert.equal(
    parsed.categoryName,
    "Shopping",
  );

  assert.equal(
    parsed.paymentMethodName,
    "Bank",
  );

});


test("buku is classified consistently as Shopping", () => {

  const withLeadWord =
    parse(
      "beli buku RM20 cash",
    );

  const withoutLeadWord =
    parse(
      "buku RM20 cash",
    );


  assert.equal(
    withLeadWord.categoryName,
    "Shopping",
  );

  assert.equal(
    withoutLeadWord.categoryName,
    "Shopping",
  );

});


test("category keyword matching respects word boundaries", () => {

  const airAsia =
    parse(
      "airasia RM120 card",
    );

  assert.equal(
    airAsia.categoryName,
    "Transport",
  );


  const repair =
    parse(
      "repair rumah RM200 cash",
    );

  assert.equal(
    repair.categoryName,
    "Others",
  );


  const grabPay =
    parse(
      "grabpay topup RM50",
    );

  assert.equal(
    grabPay.categoryName,
    "Others",
  );

  assert.equal(
    grabPay.paymentMethodName,
    "GrabPay",
  );

});


test("payment matching avoids merchant and substring false positives", () => {

  const cardigan =
    parse(
      "cardigan RM80",
    );

  assert.equal(
    cardigan.paymentMethodName,
    undefined,
  );


  const bankMerchant =
    parse(
      "bank rakyat RM100",
    );

  assert.equal(
    bankMerchant.merchantName,
    "bank rakyat",
  );

  assert.equal(
    bankMerchant.paymentMethodName,
    undefined,
  );


  const explicitBank =
    parse(
      "beli buku bank RM20",
    );

  assert.equal(
    explicitBank.paymentMethodName,
    "Bank",
  );

});


test("income matching avoids substring and courtesy false positives", () => {

  assert.equal(
    parse(
      "terima kasih RM10",
    ).type,
    "EXPENSE",
  );

  assert.equal(
    parse(
      "dapatkan buku RM20",
    ).type,
    "EXPENSE",
  );

  assert.equal(
    parse(
      "masukkan minyak RM50",
    ).type,
    "EXPENSE",
  );

  assert.equal(
    parse(
      "terima RM100 bank",
    ).type,
    "INCOME",
  );

  assert.equal(
    parse(
      "refund RM25 bank",
    ).type,
    "INCOME",
  );

});


test("merchant extraction removes command and payment tokens", () => {

  const commandPrefixed =
    parse(
      "!beli buku cash RM20",
    );

  assert.equal(
    commandPrefixed.merchantName,
    "buku",
  );


  const explicitMerchant =
    parse(
      "beli buku di Popular RM20 card",
    );

  assert.equal(
    explicitMerchant.merchantName,
    "Popular",
  );

  assert.equal(
    explicitMerchant.paymentMethodName,
    "Card",
  );

});


test("merchant extraction supports explicit merchant after amount", () => {

  const parsed =
    parse(
      "belanja RM1.23 di E2TEST180137 guna tunai",
    );


  assert.equal(
    parsed.amount,
    "1.23",
  );


  assert.equal(
    parsed.categoryName,
    "Shopping",
  );


  assert.equal(
    parsed.merchantName,
    "E2TEST180137",
  );


  assert.equal(
    parsed.paymentMethodName,
    "Cash",
  );

});


test("multi-input prefix inheritance remains deterministic", () => {

  const parts =
    service.splitWebhookTransactionTexts(
      "!beli buku RM20 cash, pen RM5 cash, pemadam RM2 cash",
    );


  assert.deepEqual(
    parts,
    [
      "!beli buku RM20 cash",
      "beli pen RM5 cash",
      "beli pemadam RM2 cash",
    ],
  );


  const parsed =
    parts.map(
      (
        part:string,
      ) =>
        parse(
          part,
        ),
    );


  assert.deepEqual(
    parsed.map(
      (
        item:any,
      ) =>
        item.categoryName,
    ),
    [
      "Shopping",
      "Shopping",
      "Shopping",
    ],
  );

});
