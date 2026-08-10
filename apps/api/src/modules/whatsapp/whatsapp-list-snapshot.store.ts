const DEFAULT_SNAPSHOT_TTL_MS =
  5 * 60 * 1000;


type SnapshotRecord = {
  transactionIds:string[];
  expiresAt:number;
};


export type SnapshotResolveResult =
  | {
      status:"ok";
      transactionId:string;
    }
  | {
      status:"missing";
    }
  | {
      status:"expired";
    }
  | {
      status:"out_of_range";
    };


export class WhatsAppTransactionListSnapshotStore {

  private readonly snapshots =
    new Map<string, SnapshotRecord>();


  constructor(
    private readonly ttlMs =
      DEFAULT_SNAPSHOT_TTL_MS,
  ){}


  save(
    input:{
      workspaceId:string;
      userId:string;
      transactionIds:string[];
      now?:Date;
    },
  ){

    const transactionIds =
      input.transactionIds
        .map(
          (value) =>
            String(
              value,
            ).trim(),
        )
        .filter(
          Boolean,
        );


    const key =
      this.key(
        input.workspaceId,
        input.userId,
      );


    if(transactionIds.length === 0){

      this.snapshots
        .delete(
          key,
        );

      return;

    }


    const now =
      input.now
      ??
      new Date();


    this.snapshots
      .set(
        key,
        {
          transactionIds:
            [...transactionIds],

          expiresAt:
            now.getTime()
            +
            this.ttlMs,
        },
      );

  }


  resolve(
    input:{
      workspaceId:string;
      userId:string;
      number:number;
      now?:Date;
    },
  ):SnapshotResolveResult{

    const key =
      this.key(
        input.workspaceId,
        input.userId,
      );


    const snapshot =
      this.snapshots
        .get(
          key,
        );


    if(!snapshot){

      return {
        status:
          "missing",
      };

    }


    const now =
      input.now
      ??
      new Date();


    if(
      snapshot.expiresAt
      <
      now.getTime()
    ){

      this.snapshots
        .delete(
          key,
        );


      return {
        status:
          "expired",
      };

    }


    const index =
      input.number
      -
      1;


    if(
      !Number.isInteger(
        input.number,
      )
      ||
      index < 0
      ||
      index
        >=
        snapshot.transactionIds.length
    ){

      return {
        status:
          "out_of_range",
      };

    }


    return {
      status:
        "ok",

      transactionId:
        snapshot.transactionIds[
          index
        ]!,
    };

  }


  clear(
    workspaceId:string,
    userId:string,
  ){

    this.snapshots
      .delete(
        this.key(
          workspaceId,
          userId,
        ),
      );

  }


  private key(
    workspaceId:string,
    userId:string,
  ){

    return [
      workspaceId,
      userId,
    ].join(
      ":",
    );

  }

}
