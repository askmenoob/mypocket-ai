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
        "",
        "Help & status:",
        "• help — format help",
        "• commands — command list",
        "• status — check bot connection",
        "• whoami — check WhatsApp identity",
        "",
        "Transaction summaries:",
        "• today — today's summary",
        "• week / minggu — this week summary",
        "• month / bulan — this month summary",
        "• last — last transaction",
        "• undo / batal — undo last transaction",
        "",
        "Setup & references:",
        "• categories — category list",
        "• members — WhatsApp member mapping",
        "• methods — payment method list",
        "",
        "Commitments & reminders:",
        "• reminder — unpaid commitments",
        "• all reminders — all commitments",
        "• paid reminders — completed commitments",
        "• Remind me to pay car RM1000 every 10th",
        "• paid car / mark paid car — mark as paid",
      ].join("\n");
    }

    return [
      "📋 Command MyPocket AI",
      "",
      "Bantuan & status:",
      "• help — bantuan format",
      "• commands — senarai command",
      "• status — semak sambungan bot",
      "• whoami — semak identity WhatsApp",
      "",
      "Ringkasan transaksi:",
      "• today — ringkasan hari ini",
      "• week / minggu — ringkasan minggu ini",
      "• month / bulan — ringkasan bulan ini",
      "• last — transaksi terakhir",
      "• undo / batal — batalkan transaksi terakhir",
      "",
      "Setup & rujukan:",
      "• categories — senarai kategori",
      "• members — senarai mapping WhatsApp",
      "• methods — senarai payment method",
      "",
      "Komitmen & reminder:",
      "• reminder — komitmen belum dibayar",
      "• reminder semua — semua komitmen",
      "• reminder selesai — komitmen sudah dibayar",
      "• Ingatkan bayaran kereta RM1000 setiap 10hb",
      "• bayar kereta / selesai kereta — tandakan sudah dibayar",
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
        "Help version: 2026-08-03",
        "",
        "📣 *In WhatsApp groups:*",
        `• Start messages with *!* or *${aliasTrigger}*`,
        "• Messages without a trigger are ignored.",
        "",
        "💬 *Private chat:*",
        "• No ! or alias is required.",
        "",
        "🧾 *Record transactions:*",
        "• !lunch mamak rm7.80 tng",
        `• ${aliasTrigger} petrol shell rm50 cash`,
        "• bill unifi rm129 bank",
        "• salary rm3000",
        "",
        "🔔 *Commitments & reminders:*",
        "• !reminder — unpaid commitments",
        "• !all reminders — all commitments",
        "• !paid reminders — completed commitments",
        "• !Remind me to pay car RM1000 every 10th",
        "• !change reminder car to 15th",
        "• !paid car / !mark paid car",
        "• !disable reminder car / !enable reminder car",
        "• !delete commitment car",
        "",
        "📊 *Summaries & controls:*",
        "• !today — today summary",
        "• !week — this week summary",
        "• !month — this month summary",
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
      "Versi bantuan: 2026-08-03",
      "",
      "📣 *Dalam WhatsApp group:*",
      `• Mula mesej dengan *!* atau *${aliasTrigger}*`,
      "• Mesej tanpa trigger akan diabaikan.",
      "",
      "💬 *Private chat:*",
      "• Tidak perlu ! atau alias.",
      "",
      "🧾 *Rekod transaksi:*",
      "• !makan kedai mamak rm7.80 tng",
      `• ${aliasTrigger} petrol shell rm50 cash`,
      "• bill unifi rm129 bank",
      "• gaji rm3000",
      "",
      "🔔 *Komitmen & reminder:*",
      "• !reminder — senarai belum dibayar",
      "• !reminder semua — semua komitmen",
      "• !reminder selesai — sudah dibayar",
      "• !Ingatkan bayaran kereta RM1000 setiap 10hb",
      "• !ubah reminder kereta ke 15hb",
      "• !bayar kereta / !selesai kereta",
      "• !tutup reminder kereta / !aktifkan reminder kereta",
      "• !padam komitmen kereta",
      "",
      "📊 *Ringkasan & kawalan:*",
      "• !today — ringkasan hari ini",
      "• !week — ringkasan minggu ini",
      "• !month — ringkasan bulan ini",
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
          ? "Type help to view the format."
          : "Taip help untuk lihat format.",
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
        ? "Type help to view the format."
        : "Taip help untuk lihat format.",
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
