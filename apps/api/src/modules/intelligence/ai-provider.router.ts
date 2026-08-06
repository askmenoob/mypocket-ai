import type {
  AITextProvider,
} from "./ai-provider.js";


import type {
  AIProviderAttempt,
  AIRouterResult,
  AITransactionParseInput,
} from "./ai-provider.types.js";


export class AIProviderRouter<T> {

  constructor(
    private readonly providers:
      readonly AITextProvider<T>[],
  ){}


  async parseTransaction(
    input:AITransactionParseInput,

    deterministicFallback:
      () => T | Promise<T>,
  ):Promise<AIRouterResult<T>>{

    const attempts:
      AIProviderAttempt[] =
        [];


    for(const provider of this.providers){

      if(
        !provider.capabilities
          .includes(
            "text",
          )
        ||
        !provider.isAvailable()
      ){

        attempts.push({
          provider:
            provider.name,

          status:
            "unavailable",

          reason:
            "PROVIDER_UNAVAILABLE",
        });

        continue;

      }


      try{

        const result =
          await provider
            .parseTransaction(
              input,
            );


        attempts.push({
          provider:
            result.provider,

          status:
            result.status,

          reason:
            result.status === "success"
              ? undefined
              : result.reason,
        });


        if(
          result.status === "success"
        ){

          return {
            value:
              result.value,

            source:
              result.provider,

            attempts,
          };

        }

      }catch{

        attempts.push({
          provider:
            provider.name,

          status:
            "failed",

          reason:
            "PROVIDER_THROWN_ERROR",
        });

      }

    }


    return {
      value:
        await deterministicFallback(),

      source:
        "deterministic",

      attempts,
    };

  }

}
