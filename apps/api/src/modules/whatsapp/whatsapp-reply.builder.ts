import type {
  ParsedWhatsAppTransaction,
} from "./whatsapp.types.js";



export class WhatsAppReplyBuilder {



  static methods(){

    return [
      "💳 Payment method auto MyPocket",
      "",
      "• TNG — tng, touch n go",
      "• Cash — cash, tunai",
      "• Bank — bank, transfer, fpx",
      "• Card — card, kad, visa",
      "• DuitNow — duitnow, qr",
      "• GrabPay — grabpay",
    ].join(
      "\n",
    );

  }





  static commands(){

    return [
      "📋 Command MyPocket AI",
      "",
      "• help — bantuan format",
      "• today — ringkasan hari ini",
      "• week / minggu — ringkasan minggu ini",
      "• month / bulan — ringkasan bulan ini",
      "• last — transaksi terakhir",
      "• undo / batal — batalkan transaksi terakhir",
      "• categories — senarai kategori",
      "• methods — senarai payment method",
      "• status — semak sambungan bot",
    ].join(
      "\n",
    );

  }





  static help(){

    return [
      "👋 MyPocket AI",
      "",
      "Hantar transaksi dalam format ringkas:",
      "• makan kedai mamak rm7.80 tng",
      "• petrol shell rm50 cash",
      "• bill unifi rm129 bank",
      "• gaji rm3000",
      "",
      "Command:",
      "• today — ringkasan hari ini",
      "• week — ringkasan minggu ini",
      "• month — ringkasan bulan ini",
      "• undo — batalkan transaksi terakhir",
      "• categories — senarai kategori auto",
      "• methods — senarai payment method",
      "• commands — senarai semua command",
      "• status — semak sambungan bot",
      "• help — bantuan format",
      "",
      "Kategori, merchant dan payment method akan dikesan automatik.",
    ].join(
      "\n",
    );

  }





  static parseFailed(
    reason:string,
  ){

    if(
      reason === "WHATSAPP_AMOUNT_NOT_FOUND"
    ){

      return [
        "⚠️ Saya tak jumpa amount.",
        "Contoh: makan kedai mamak rm7.80 tng",
        "",
        "Taip help untuk lihat format.",
      ].join(
        "\n",
      );

    }


    return [
      "⚠️ Saya tak dapat faham transaksi ini.",
      "Contoh: petrol shell rm50 cash",
      "",
      "Taip help untuk lihat format.",
    ].join(
      "\n",
    );

  }





  static transaction(
    parsed:ParsedWhatsAppTransaction,
  ){

    const label =
      parsed.type === "INCOME"
        ?
        "Pendapatan"
        :
        "Perbelanjaan";


    const merchant =
      parsed.merchantName
        ?
        ` @ ${parsed.merchantName}`
        :
        "";


    const paymentMethod =
      parsed.paymentMethodName
        ?
        ` (${parsed.paymentMethodName})`
        :
        "";


    return [
      "✅ Direkod",
      `${label}: ${parsed.categoryName}${merchant}${paymentMethod}`,
      `RM${parsed.amount}`,
      `— ${parsed.description}`,
    ].join(
      " ",
    );

  }





  static editLast(
    transaction:any,

    field:string,
  ){

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
      "✏️ Transaksi terakhir dikemaskini.",
      `Field: ${field}`,
      "",
      `${transaction.type}: ${category}${merchant}${paymentMethod}`,
      `MYR ${transaction.amount} — ${transaction.description ?? "-"}`,
    ].join(
      "\n",
    );

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
  ){

    const category =
      transaction.category?.name
      ??
      "Others";


    const merchant =
      transaction.merchant?.name
        ?
        ` @ ${transaction.merchant.name}`
        :
        "";


    const description =
      transaction.description
      ??
      "";


    return [
      "↩️ Transaksi terakhir dibatalkan:",
      `${category}${merchant}`,
      `${transaction.currency}${transaction.amount}`,
      description
        ?
        `— ${description}`
        :
        "",
    ].filter(Boolean)
      .join(
        " ",
      );

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
  ){

    if(transactions.length === 0){

      return `${title}\n\nℹ️ Tiada transaksi ditemui.`;

    }


    const rows =
      transactions
        .slice(
          0,
          5,
        )
        .map(
          (
            transaction,
            index,
          ) => {

            const category =
              transaction.category?.name
              ??
              "Others";

            const merchant =
              transaction.merchant?.name
                ?
                ` @ ${transaction.merchant.name}`
                :
                "";

            const paymentMethod =
              transaction.paymentMethod?.name
                ?
                ` (${transaction.paymentMethod.name})`
                :
                "";

            const date =
              transaction.transactionDate
                .toISOString()
                .slice(
                  0,
                  10,
                );

            return [
              `${index + 1}. ${date}`,
              `${transaction.type}: ${category}${merchant}${paymentMethod}`,
              `${transaction.currency}${transaction.amount}`,
              transaction.description
                ??
                "",
            ].filter(Boolean)
              .join(
                " — ",
              );

          },
        );


    return [
      title,
      "",
      ...rows,
    ].join(
      "\n",
    );

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
  ){

    let expense =
      0;


    let income =
      0;


    const categoryTotals =
      new Map<string, number>();


    for(
      const transaction of transactions
    ){

      const amount =
        Number(
          transaction.amount,
        );


      if(
        !Number.isFinite(
          amount,
        )
      ){

        continue;

      }


      if(
        transaction.type === "INCOME"
      ){

        income += amount;

      }else{

        expense += amount;


        const category =
          transaction.category?.name
          ??
          "Others";


        categoryTotals.set(
          category,
          (
            categoryTotals.get(
              category,
            )
            ??
            0
          )
          +
          amount,
        );

      }

    }


    const topCategory =
      [...categoryTotals.entries()]
        .sort(
          (
            first,
            second,
          ) =>
            second[1]
            -
            first[1],
        )[0];


    const title =
      period === "today"
        ?
        "📊 Ringkasan hari ini"
        :
        period === "week"
          ?
          "📊 Ringkasan minggu ini"
          :
          "📊 Ringkasan bulan ini";


    return [
      title,
      label,
      "",
      `Expense: MYR ${expense.toFixed(2)}`,
      `Income: MYR ${income.toFixed(2)}`,
      `Net: MYR ${(income - expense).toFixed(2)}`,
      `Transaksi: ${transactions.length}`,
      topCategory
        ?
        `Top category: ${topCategory[0]} MYR ${topCategory[1].toFixed(2)}`
        :
        "Top category: -",
    ].join(
      "\n",
    );

  }



}
