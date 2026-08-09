import type {
  ParsedWhatsAppTransaction,
} from "./whatsapp.types.js";

type ReplyLanguage = "ms" | "en";

export class WhatsAppReplyBuilder {

  static methods(language:ReplyLanguage = "ms"){
    const isEnglish =
      language === "en";

    return [
      isEnglish
        ? "💳 MyPocket auto payment methods"
        : "💳 Payment method auto MyPocket",
      "",
      "• TNG — tng, touch n go",
      isEnglish
        ? "• Cash — cash, tunai"
        : "• Cash — cash, tunai",
      "• Bank — bank, transfer, fpx",
      "• Card — card, kad, visa",
      "• DuitNow — duitnow, qr",
      "• GrabPay — grabpay",
    ].join("\n");
  }

  static categories(language:ReplyLanguage = "ms"){
    const isEnglish =
      language === "en";

    return [
      isEnglish
        ? "🏷️ MyPocket auto categories"
        : "🏷️ Kategori auto MyPocket",
      "",
      isEnglish
        ? "• Food — eat, drink, coffee, rice"
        : "• Food — makan, minum, kopi, nasi",
      isEnglish
        ? "• Transport — petrol, grab, toll, parking"
        : "• Transport — petrol, grab, tol, parking",
      isEnglish
        ? "• Bills — bill, electricity, water, internet"
        : "• Bills — bill, elektrik, air, internet",
      isEnglish
        ? "• Shopping — shopping, buy, shopee, lazada"
        : "• Shopping — belanja, beli, shopee, lazada",
      isEnglish
        ? "• Rent — rent, rental"
        : "• Rent — rent, sewa",
      isEnglish
        ? "• Salary — salary, bonus, income, receive, refund"
        : "• Salary — gaji, bonus, income, terima, refund",
      isEnglish
        ? "• Others — fallback"
        : "• Others — fallback",
    ].join("\n");
  }

  static commands(language:ReplyLanguage = "ms"){
    if(language === "en"){
      return [
        "📋 MyPocket AI Commands",
        "Tip: start commands with ! so they are easy to remember.",
        "",
        "Record transactions:",
        "• !makan KFC rm20 card",
        "• !add lunch mamak rm7.80 tng",
        "• !add petrol shell rm50 cash",
        "• !add salary rm3000 income bank",
        "Format: !add <item/merchant> rm<amount> <payment>",
        "Payment: cash, bank, tng, card, duitnow, grabpay",
        "",
        "Transaction summaries:",
        "• !today — today's summary",
        "• !week — this week summary",
        "• !month — this month summary",
        "• !list — latest transactions today",
        "• !search nasi — search transactions",
        "• !last — last transaction",
        "• !undo — undo last transaction",
        "",
        "References:",
        "• !categories — category list",
        "• !methods — payment method list",
        "• !members — WhatsApp members",
        "• !status — check bot connection",
        "• !whoami — check WhatsApp identity",
        "",
        "Commitments & reminders:",
        "• !commitments — all commitments",
        "• !reminder — unpaid commitments",
        "• !paid reminders — completed commitments",
        "• !add reminder car RM1000 every 10th",
        "• !paycommitment — guided payment flow",
        "• !paid car — mark as paid",
        "• !delete commitment car — delete commitment",
        "",
        "Help:",
        "• !help — quick guide",
        "• !commands — command list",
      ].join("\n");
    }

    return [
      "📋 Command MyPocket AI",
      "Tip: mula semua command dengan ! supaya mudah diingati.",
      "",
      "Rekod transaksi:",
      "• !makan KFC rm20 card",
      "• !add makan nasi lemak rm7.80 tng",
      "• !add petrol shell rm50 cash",
      "• !add gaji rm3000 income bank",
      "Format: !add <item/merchant> rm<jumlah> <payment>",
      "Payment: cash, bank, tng, card, duitnow, grabpay",
      "",
      "Ringkasan transaksi:",
      "• !today — ringkasan hari ini",
      "• !week — ringkasan minggu ini",
      "• !month — ringkasan bulan ini",
      "• !list — transaksi terkini hari ini",
      "• !search nasi — cari transaksi",
      "• !last — transaksi terakhir",
      "• !undo — batalkan transaksi terakhir",
      "",
      "Rujukan:",
      "• !categories — senarai kategori",
      "• !methods — senarai payment method",
      "• !members — ahli WhatsApp",
      "• !status — status bot",
      "• !whoami — semak role & nombor",
      "",
      "Komitmen & reminder:",
      "• !commitments — semua komitmen",
      "• !reminder — komitmen belum dibayar",
      "• !paid reminders — komitmen sudah dibayar",
      "• !add reminder kereta RM1000 every 10th",
      "• !paycommitment — flow bayar komitmen",
      "• !bayar kereta — tandakan sudah dibayar",
      "• !delete commitment kereta — padam komitmen",
      "",
      "Bantuan:",
      "• !help — panduan ringkas",
      "• !commands — semua command",
    ].join("\n");
  }

  static whoami(
    input:{
      workspaceName:string;
      workspaceType:string;
      role:string;
      name:string | null;
      email:string;
      whatsappPhoneNumber:string | null;
    },
    language:ReplyLanguage = "ms",
  ){
    const isEnglish =
      language === "en";

    return [
      isEnglish
        ? "👤 WhatsApp Identity"
        : "👤 Identiti WhatsApp",
      `Workspace: ${input.workspaceName} (${input.workspaceType})`,
      `${isEnglish ? "Role" : "Peranan"}: ${input.role}`,
      `${isEnglish ? "Name" : "Nama"}: ${input.name ?? "-"}`,
      `Email: ${input.email}`,
      `${isEnglish ? "Phone" : "Telefon"}: ${input.whatsappPhoneNumber ?? (isEnglish ? "not linked" : "belum dipautkan")}`,
    ].join("\n");
  }

  static members(
    members:Array<{
      name:string | null;
      email:string;
      role:string;
      whatsappPhoneNumber:string | null;
    }>,
    language:ReplyLanguage = "ms",
  ){
    const isEnglish =
      language === "en";
    const total =
      members.length;
    const linked =
      members
        .filter((member) => Boolean(member.whatsappPhoneNumber))
        .length;
    const lines =
      members.map((member) => {
        const label =
          member.name
          ??
          member.email;
        const phone =
          member.whatsappPhoneNumber
            ? `✅ ${member.whatsappPhoneNumber}`
            : isEnglish
              ? "⚠️ not linked"
              : "⚠️ belum dipautkan";
        return `${member.role} ${label} — ${phone}`;
      });

    return [
      isEnglish
        ? "👥 WhatsApp Members"
        : "👥 Ahli WhatsApp",
      `${isEnglish ? "Linked" : "Dipautkan"}: ${linked}/${total}`,
      "",
      ...lines,
    ].join("\n");
  }

  static help(
    botAlias:string,
    language:ReplyLanguage = "ms",
  ){
    const normalizedBotAlias =
      botAlias.trim().replace(/^@+/, "").toLowerCase()
      ||
      "mypocket";
    const aliasTrigger =
      `@${normalizedBotAlias}`;

    if(language === "en"){
      return [
        "👋 MyPocket AI — Quick help",
        "Help version: 2026-08-10",
        "",
        "📣 *In WhatsApp groups:*",
        `• Start messages with *!* or *${aliasTrigger}*`,
        "• Messages without a trigger are ignored.",
        "",
        "💬 *Private chat:*",
        "• Start commands with *!* too. Messages without *!* are ignored.",
        "• You may use your own WhatsApp number as the bot number.",
        "• Example: !makan KFC rm20 card",
        "",
        "🧾 *Record transactions:*",
        "• !add lunch mamak rm7.80 tng",
        "• !add petrol shell rm50 cash",
        "• !add salary rm3000 income bank",
        "Format: !add <item/merchant> rm<amount> <payment>",
        "",
        "🔔 *Add commitment by live chat:*",
        "• !addcommitment",
        "Bot will ask: name → amount → due date → reminder days → reminder time → confirm.",
        "Due date format: DD/MM/YYYY, example 12/08/2026.",
        "",
        "⚡ *Fast commitment format:*",
        "• !addcommitment Car payment RM1000 12/08/2026",
        "",
        "📌 *Commitment controls:*",
        "• !reminder — unpaid commitments",
        "• !commitments — all commitments",
        "• !paid reminders — completed commitments",
        "• !paycommitment — guided payment flow",
        "  Bot asks which commitment → reply number → !confirm.",
        "• !paid car — mark as paid",
        "• !delete commitment car",
        "",
        "📊 *Summaries & controls:*",
        "• !today — today summary",
        "• !week — this week summary",
        "• !month — this month summary",
        "• !list — latest transactions today",
        "• !search nasi — search transactions",
        "• !last — last transaction",
        "• !undo — undo last transaction",
        "• !categories — category list",
        "• !methods — payment methods",
        "• !members — WhatsApp members",
        "• !status — bot status",
        "• !commands — all commands",
        "",
        "🌐 Reply language can be changed in Dashboard → Bot Settings.",
        "Category, merchant, and payment method are detected automatically.",
      ].join("\n");
    }

    return [
      "👋 MyPocket AI — Bantuan ringkas",
      "Versi bantuan: 2026-08-10",
      "",
      "📣 *Dalam WhatsApp group:*",
      `• Mula mesej dengan *!* atau *${aliasTrigger}*`,
      "• Mesej tanpa trigger akan diabaikan.",
      "",
      "💬 *Private chat:*",
      "• Mula command dengan *!* juga. Mesej tanpa *!* akan diabaikan.",
      "• Anda boleh guna nombor WhatsApp sendiri sebagai nombor bot.",
      "• Contoh: !makan KFC rm20 card",
      "",
      "🧾 *Rekod transaksi:*",
      "• !add makan nasi lemak rm7.80 tng",
      "• !add petrol shell rm50 cash",
      "• !add gaji rm3000 income bank",
      "Format: !add <item/merchant> rm<jumlah> <payment>",
      "",
      "🔔 *Tambah komitmen cara live chat:*",
      "• !addcommitment",
      "Bot akan tanya: nama → amount → due date → hari reminder → masa reminder → confirm.",
      "Format due date: DD/MM/YYYY, contoh 12/08/2026.",
      "",
      "⚡ *Format pantas komitmen:*",
      "• !addcommitment Bayaran kereta RM1000 12/08/2026",
      "",
      "📌 *Kawalan komitmen:*",
      "• !reminder — senarai belum dibayar",
      "• !commitments — semua komitmen",
      "• !paid reminders — sudah dibayar",
      "• !paycommitment — flow bayar komitmen",
      "  Bot tanya komitmen mana → reply nombor → !confirm.",
      "• !bayar kereta — tanda sudah dibayar",
      "• !delete commitment kereta — padam komitmen",
      "",
      "📊 *Ringkasan & kawalan:*",
      "• !today — ringkasan hari ini",
      "• !week — ringkasan minggu ini",
      "• !month — ringkasan bulan ini",
      "• !list — transaksi terkini hari ini",
      "• !search nasi — cari transaksi",
      "• !last — transaksi terakhir",
      "• !undo — batalkan transaksi terakhir",
      "• !categories — senarai kategori",
      "• !methods — payment method",
      "• !members — ahli WhatsApp",
      "• !status — status bot",
      "• !commands — semua command",
      "",
      "🌐 Bahasa reply boleh ditukar di Dashboard → Bot Settings.",
      "Kategori, merchant dan payment method akan dikesan automatik.",
    ].join("\n");
  }

  static parseFailed(
    reason:string,
    language:ReplyLanguage = "ms",
  ){
    const isEnglish =
      language === "en";

    if(reason === "WHATSAPP_AMOUNT_NOT_FOUND"){
      return [
        isEnglish
          ? "⚠️ I could not find an amount."
          : "⚠️ Saya tak jumpa amount.",
        isEnglish
          ? "Example: lunch mamak rm7.80 tng"
          : "Contoh: makan kedai mamak rm7.80 tng",
        "",
        isEnglish
          ? "Type !help to view the format."
          : "Taip !help untuk lihat format.",
      ].join("\n");
    }

    return [
      isEnglish
        ? "⚠️ I could not understand this transaction."
        : "⚠️ Saya tak dapat faham transaksi ini.",
      isEnglish
        ? "Example: petrol shell rm50 cash"
        : "Contoh: petrol shell rm50 cash",
      "",
      isEnglish
        ? "Type !help to view the format."
        : "Taip !help untuk lihat format.",
    ].join("\n");
  }

  static transaction(
    parsed:ParsedWhatsAppTransaction,
    language:ReplyLanguage = "ms",
  ){
    const isEnglish =
      language === "en";
    const label =
      parsed.type === "INCOME"
        ? isEnglish ? "Income" : "Pendapatan"
        : isEnglish ? "Expense" : "Perbelanjaan";
    const merchant =
      parsed.merchantName
        ? ` @ ${parsed.merchantName}`
        : "";
    const paymentMethod =
      parsed.paymentMethodName
        ? ` (${parsed.paymentMethodName})`
        : "";

    return [
      isEnglish
        ? "✅ Recorded"
        : "✅ Direkod",
      `${label}: ${parsed.categoryName}${merchant}${paymentMethod}`,
      `RM${parsed.amount}`,
      `— ${parsed.description}`,
    ].join(" ");
  }

  static editLast(
    transaction:any,
    field:string,
    language:ReplyLanguage = "ms",
  ){
    const isEnglish =
      language === "en";
    const category =
      transaction.category?.name
      ??
      "-";
    const merchant =
      transaction.merchant?.name
        ? ` @ ${transaction.merchant.name}`
        : "";
    const paymentMethod =
      transaction.paymentMethod?.name
        ? ` (${transaction.paymentMethod.name})`
        : "";

    return [
      isEnglish
        ? "✏️ Last transaction updated."
        : "✏️ Transaksi terakhir dikemaskini.",
      `${isEnglish ? "Field" : "Medan"}: ${field}`,
      "",
      `${transaction.type}: ${category}${merchant}${paymentMethod}`,
      `MYR ${transaction.amount} — ${transaction.description ?? "-"}`,
    ].join("\n");
  }

  static undo(
    transaction:{
      amount:unknown;
      currency:string;
      description:string | null;
      category?:{
        name:string;
      } | null;
      merchant?:{
        name:string;
      } | null;
    },
    language:ReplyLanguage = "ms",
  ){
    const isEnglish =
      language === "en";
    const category =
      transaction.category?.name
      ??
      "Others";
    const merchant =
      transaction.merchant?.name
        ? ` @ ${transaction.merchant.name}`
        : "";
    const description =
      transaction.description
      ??
      "";

    return [
      isEnglish
        ? "↩️ Last transaction cancelled:"
        : "↩️ Transaksi terakhir dibatalkan:",
      `${category}${merchant}`,
      `${transaction.currency}${transaction.amount}`,
      description
        ? `— ${description}`
        : "",
    ].filter(Boolean).join(" ");
  }

  static transactionList(
    transactions:Array<{
      amount:unknown;
      currency:string;
      type:string;
      description:string | null;
      transactionDate:Date;
      category?:{
        name:string;
      } | null;
      merchant?:{
        name:string;
      } | null;
      paymentMethod?:{
        name:string;
      } | null;
    }>,
    title:string,
    language:ReplyLanguage = "ms",
  ){
    const isEnglish =
      language === "en";

    if(transactions.length === 0){
      return `${title}\n\n${isEnglish ? "ℹ️ No transactions found." : "ℹ️ Tiada transaksi ditemui."}`;
    }

    const rows =
      transactions
        .slice(0, 5)
        .map((transaction, index) => {
          const category =
            transaction.category?.name
            ??
            "Others";
          const merchant =
            transaction.merchant?.name
              ? ` @ ${transaction.merchant.name}`
              : "";
          const paymentMethod =
            transaction.paymentMethod?.name
              ? ` (${transaction.paymentMethod.name})`
              : "";
          const date =
            transaction.transactionDate.toISOString().slice(0, 10);

          return [
            `${index + 1}. ${date}`,
            `${transaction.type}: ${category}${merchant}${paymentMethod}`,
            `${transaction.currency}${transaction.amount}`,
            transaction.description
              ??
              "",
          ].filter(Boolean).join(" — ");
        });

    return [
      title,
      "",
      ...rows,
    ].join("\n");
  }

  static summary(
    transactions:Array<{
      amount:unknown;
      type:string;
      category?:{
        name:string;
      } | null;
    }>,
    period:
      | "today"
      | "week"
      | "month",
    label:string,
    language:ReplyLanguage = "ms",
  ){
    const isEnglish =
      language === "en";
    let expense =
      0;
    let income =
      0;
    const categoryTotals =
      new Map<string, number>();

    for(const transaction of transactions){
      const amount =
        Number(transaction.amount);
      if(!Number.isFinite(amount)){
        continue;
      }
      if(transaction.type === "INCOME"){
        income += amount;
      }else{
        expense += amount;
        const category =
          transaction.category?.name
          ??
          "Others";
        categoryTotals.set(
          category,
          (categoryTotals.get(category) ?? 0) + amount,
        );
      }
    }

    const topCategory =
      [...categoryTotals.entries()].sort((first, second) => second[1] - first[1])[0];
    const title =
      period === "today"
        ? isEnglish ? "📊 Today's summary" : "📊 Ringkasan hari ini"
        : period === "week"
          ? isEnglish ? "📊 This week summary" : "📊 Ringkasan minggu ini"
          : isEnglish ? "📊 This month summary" : "📊 Ringkasan bulan ini";

    return [
      title,
      label,
      "",
      `${isEnglish ? "Expense" : "Perbelanjaan"}: MYR ${expense.toFixed(2)}`,
      `${isEnglish ? "Income" : "Pendapatan"}: MYR ${income.toFixed(2)}`,
      `Net: MYR ${(income - expense).toFixed(2)}`,
      `${isEnglish ? "Transactions" : "Transaksi"}: ${transactions.length}`,
      topCategory
        ? `${isEnglish ? "Top category" : "Kategori tertinggi"}: ${topCategory[0]} MYR ${topCategory[1].toFixed(2)}`
        : `${isEnglish ? "Top category" : "Kategori tertinggi"}: -`,
    ].join("\n");
  }

}
