import crypto from "node:crypto";


export class TokenEncryptionService {


  private readonly key: Buffer;


  constructor(){

    const secret =
      process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;


    if(!secret){

      throw new Error(
        "GOOGLE_TOKEN_ENCRYPTION_KEY is missing",
      );

    }


    this.key =
      Buffer.from(
        secret,
        "hex",
      );


    if(this.key.length !== 32){

      throw new Error(
        "GOOGLE_TOKEN_ENCRYPTION_KEY must be 32 bytes",
      );

    }

  }



  encrypt(
    value:string,
  ){

    const iv =
      crypto.randomBytes(12);


    const cipher =
      crypto.createCipheriv(
        "aes-256-gcm",
        this.key,
        iv,
      );


    const encrypted =
      Buffer.concat([
        cipher.update(value,"utf8"),
        cipher.final(),
      ]);


    const authTag =
      cipher.getAuthTag();



    return [

      iv.toString("hex"),

      authTag.toString("hex"),

      encrypted.toString("hex"),

    ].join(":");

  }





  decrypt(
    payload:string,
  ){

    const [
      ivHex,
      authTagHex,
      encryptedHex,
    ] =
      payload.split(":");



    const decipher =
      crypto.createDecipheriv(
        "aes-256-gcm",
        this.key,
        Buffer.from(ivHex,"hex"),
      );


    decipher.setAuthTag(
      Buffer.from(
        authTagHex,
        "hex",
      ),
    );



    const decrypted =
      Buffer.concat([

        decipher.update(
          Buffer.from(
            encryptedHex,
            "hex",
          ),
        ),

        decipher.final(),

      ]);



    return decrypted.toString("utf8");

  }


}
