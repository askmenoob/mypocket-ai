const DEFAULT_TTL_MS =
  24 * 60 * 60 * 1000;


export class WhatsAppVoiceIdempotencyStore {

  private readonly processed =
    new Map<string, number>();


  constructor(
    private readonly ttlMs =
      DEFAULT_TTL_MS,
  ){}


  has(
    workspaceId:string,
    messageId:string,
    now = Date.now(),
  ){

    this.prune(
      now,
    );

    const expiresAt =
      this.processed.get(
        this.key(
          workspaceId,
          messageId,
        ),
      );

    return expiresAt !== undefined
      &&
      expiresAt > now;

  }


  mark(
    workspaceId:string,
    messageId:string,
    now = Date.now(),
  ){

    this.prune(
      now,
    );

    this.processed.set(
      this.key(
        workspaceId,
        messageId,
      ),
      now + this.ttlMs,
    );

  }


  private prune(
    now:number,
  ){

    for(const [key, expiresAt] of this.processed){

      if(expiresAt <= now){

        this.processed.delete(
          key,
        );

      }

    }

  }


  private key(
    workspaceId:string,
    messageId:string,
  ){

    return `${workspaceId}:${messageId}`;

  }

}
