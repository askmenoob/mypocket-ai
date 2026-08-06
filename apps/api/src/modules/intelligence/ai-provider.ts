import type {
  AIProviderCapability,
  AIProviderResult,
  AITransactionParseInput,
} from "./ai-provider.types.js";


export interface AITextProvider<T> {

  readonly name:string;

  readonly capabilities:
    readonly AIProviderCapability[];

  isAvailable():boolean;

  parseTransaction(
    input:AITransactionParseInput,
  ):Promise<AIProviderResult<T>>;

}
