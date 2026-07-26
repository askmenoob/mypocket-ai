export type WhatsAppCommandKind =
  | "help"
  | "info"
  | "categories"
  | "members"
  | "last"
  | "status"
  | "summary"
  | "list"
  | "edit"
  | "undo"
  | "transaction";



export type WhatsAppInfoCommand =
  | "methods"
  | "commands";


export type WhatsAppSummaryPeriod =
  | "today"
  | "week"
  | "month";


export type WhatsAppEditField =
  | "amount"
  | "category"
  | "merchant"
  | "method"
  | "date"
  | "time"
  | "type"
  | "description";


export interface WhatsAppListCommand {

  mode:
    | "period"
    | "search";

  period?:
    | WhatsAppSummaryPeriod;

  keyword?:string;

}



export interface WhatsAppEditCommand {

  field:
    WhatsAppEditField;

  value:
    string;

}


export class WhatsAppCommandParser {



  static isHelp(
    text:string,
  ){

    const normalized =
      this.normalize(
        text,
      );


    return [
      "help",
      "/help",
      "bantuan",
      "format",
      "cara guna",
      "macam mana",
    ].includes(
      normalized,
    );

  }





  static isUndo(
    text:string,
  ){

    const normalized =
      this.normalize(
        text,
      );


    return [
      "undo",
      "/undo",
      "cancel",
      "batal",
      "delete last",
      "padam",
    ].includes(
      normalized,
    );

  }





  static summaryPeriod(
    text:string,
  ):
    | WhatsAppSummaryPeriod
    | null {

    const normalized =
      this.normalize(
        text,
      );


    if(
      [
        "today",
        "/today",
        "summary",
        "ringkasan",
        "hari ini",
        "hariini",
        "harini",
        "today summary",
      ].includes(
        normalized,
      )
    ){

      return "today";

    }


    if(
      [
        "week",
        "/week",
        "weekly",
        "summary week",
        "ringkasan minggu",
        "minggu ini",
        "minggu",
      ].includes(
        normalized,
      )
    ){

      return "week";

    }


    if(
      [
        "month",
        "/month",
        "monthly",
        "summary month",
        "ringkasan bulan",
        "bulan ini",
        "bulan",
      ].includes(
        normalized,
      )
    ){

      return "month";

    }


    return null;

  }





  static isStatus(
    text:string,
  ){

    const normalized =
      this.normalize(
        text,
      );


    return [
      "status",
      "/status",
      "check",
      "semak",
    ].includes(
      normalized,
    );

  }





  static isLast(
    text:string,
  ){

    const normalized =
      this.normalize(
        text,
      );


    return [
      "last",
      "/last",
      "latest",
      "terakhir",
      "transaksi terakhir",
    ].includes(
      normalized,
    );

  }





  static isMembers(
    text:string,
  ){

    const normalized =
      this.normalize(
        text,
      );


    return [
      "members",
      "/members",
      "member",
      "ahli",
      "senarai ahli",
      "whatsapp members",
    ].includes(
      normalized,
    );

  }





  static isCategories(
    text:string,
  ){

    const normalized =
      this.normalize(
        text,
      );


    return [
      "categories",
      "/categories",
      "category",
      "kategori",
      "senarai kategori",
    ].includes(
      normalized,
    );

  }





  static info(
    text:string,
  ):
    | WhatsAppInfoCommand
    | null {

    const normalized =
      this.normalize(
        text,
      );


    if(
      [
        "methods",
        "/methods",
        "payment methods",
        "payment",
        "bayaran",
        "cara bayar",
      ].includes(
        normalized,
      )
    ){

      return "methods";

    }


    if(
      [
        "commands",
        "/commands",
        "command",
        "menu",
        "senarai command",
      ].includes(
        normalized,
      )
    ){

      return "commands";

    }


    return null;

  }





  static list(
    text:string,
  ):
    | WhatsAppListCommand
    | null {

    const normalized =
      this.normalize(
        text,
      );


    if(
      [
        "list",
        "/list",
        "senarai",
        "list today",
        "senarai hari ini",
      ].includes(
        normalized,
      )
    ){

      return {
        mode:
          "period",

        period:
          "today",
      };

    }


    if(
      [
        "list week",
        "/list week",
        "senarai minggu",
        "list minggu",
      ].includes(
        normalized,
      )
    ){

      return {
        mode:
          "period",

        period:
          "week",
      };

    }


    if(
      [
        "list month",
        "/list month",
        "senarai bulan",
        "list bulan",
      ].includes(
        normalized,
      )
    ){

      return {
        mode:
          "period",

        period:
          "month",
      };

    }


    const searchMatch =
      text
        .trim()
        .match(
          /^(?:search|cari|find)\s+(.+)$/i,
        );


    if(searchMatch){

      const keyword =
        searchMatch[1]
          .trim();


      if(keyword){

        return {
          mode:
            "search",

          keyword,
        };

      }

    }


    return null;

  }





  static editLast(
    text:string,
  ):
    | WhatsAppEditCommand
    | null {

    const trimmed =
      text
        .trim();


    const match =
      trimmed.match(
        /^(?:edit|ubah|update)\s+(?:last|latest|terakhir)\s+(amount|jumlah|category|kategori|merchant|kedai|method|payment|bayaran|date|tarikh|time|masa|type|jenis|desc|description|nota)\s+(.+)$/i,
      );


    if(!match){

      return null;

    }


    const rawField =
      match[1]
        .toLowerCase();

    const value =
      match[2]
        .trim();


    if(!value){

      return null;

    }


    if(
      rawField === "amount"
      ||
      rawField === "jumlah"
    ){

      return {
        field:
          "amount",

        value,
      };

    }


    if(
      rawField === "category"
      ||
      rawField === "kategori"
    ){

      return {
        field:
          "category",

        value,
      };

    }


    if(
      rawField === "merchant"
      ||
      rawField === "kedai"
    ){

      return {
        field:
          "merchant",

        value,
      };

    }


    if(
      rawField === "method"
      ||
      rawField === "payment"
      ||
      rawField === "bayaran"
    ){

      return {
        field:
          "method",

        value,
      };

    }


    if(
      rawField === "date"
      ||
      rawField === "tarikh"
    ){

      return {
        field:
          "date",

        value,
      };

    }


    if(
      rawField === "time"
      ||
      rawField === "masa"
    ){

      return {
        field:
          "time",

        value,
      };

    }


    if(
      rawField === "type"
      ||
      rawField === "jenis"
    ){

      return {
        field:
          "type",

        value,
      };

    }


    return {
      field:
        "description",

      value,
    };

  }





  private static normalize(
    text:string,
  ){

    return text
      .trim()
      .toLowerCase();

  }



}
