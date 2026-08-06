import assert from "node:assert/strict";
import test from "node:test";


import {
  AIProviderRouter,
  GroqTextProvider,
} from "../../src/modules/intelligence/index.js";


import type {
  AITextProvider,
} from "../../src/modules/intelligence/index.js";


interface TestTransaction {

  amount:string;

  source:string;

}


const input = {
  text:
    "makan RM12 tunai",

  transactionDate:
    "2026-08-06T10:00:00.000Z",

  currency:
    "MYR",
};


test(
  "router returns the first successful provider result",
  async () => {

    let fallbackCalled =
      false;


    const provider:
      AITextProvider<TestTransaction> = {

        name:
          "primary",

        capabilities:[
          "text",
        ],

        isAvailable:() =>
          true,

        parseTransaction:
          async () => ({
            status:
              "success",

            provider:
              "primary",

            value:{
              amount:
                "12",

              source:
                "provider",
            },
          }),

      };


    const router =
      new AIProviderRouter<
        TestTransaction
      >(
        [
          provider,
        ],
      );


    const result =
      await router
        .parseTransaction(
          input,
          () => {

            fallbackCalled =
              true;

            return {
              amount:
                "99",

              source:
                "fallback",
            };

          },
        );


    assert.equal(
      result.source,
      "primary",
    );

    assert.equal(
      result.value.source,
      "provider",
    );

    assert.equal(
      fallbackCalled,
      false,
    );

  },
);


test(
  "router uses deterministic fallback when provider is unavailable",
  async () => {

    const provider:
      AITextProvider<TestTransaction> = {

        name:
          "primary",

        capabilities:[
          "text",
        ],

        isAvailable:() =>
          false,

        parseTransaction:
          async () => {

            throw new Error(
              "must not be called",
            );

          },

      };


    const router =
      new AIProviderRouter<
        TestTransaction
      >(
        [
          provider,
        ],
      );


    const result =
      await router
        .parseTransaction(
          input,
          () => ({
            amount:
              "12",

            source:
              "fallback",
          }),
        );


    assert.equal(
      result.source,
      "deterministic",
    );

    assert.equal(
      result.value.source,
      "fallback",
    );

    assert.equal(
      result.attempts[0]?.status,
      "unavailable",
    );

  },
);


test(
  "router uses deterministic fallback when provider throws",
  async () => {

    const provider:
      AITextProvider<TestTransaction> = {

        name:
          "primary",

        capabilities:[
          "text",
        ],

        isAvailable:() =>
          true,

        parseTransaction:
          async () => {

            throw new Error(
              "provider failed",
            );

          },

      };


    const router =
      new AIProviderRouter<
        TestTransaction
      >(
        [
          provider,
        ],
      );


    const result =
      await router
        .parseTransaction(
          input,
          () => ({
            amount:
              "12",

            source:
              "fallback",
          }),
        );


    assert.equal(
      result.source,
      "deterministic",
    );

    assert.equal(
      result.attempts[0]?.status,
      "failed",
    );

  },
);


test(
  "Groq adapter does not call fetch without configuration",
  async () => {

    let fetchCalled =
      false;


    const provider =
      new GroqTextProvider({
        model:
          "test-model",

        fetchImpl:
          async () => {

            fetchCalled =
              true;

            throw new Error(
              "must not be called",
            );

          },
      });


    const result =
      await provider
        .parseTransaction(
          input,
        );


    assert.equal(
      result.status,
      "unavailable",
    );

    assert.equal(
      fetchCalled,
      false,
    );

  },
);


test(
  "Groq adapter normalizes a valid JSON response",
  async () => {

    const provider =
      new GroqTextProvider({
        apiKey:
          "test-key",

        model:
          "test-model",

        fetchImpl:
          async () => ({
            ok:
              true,

            status:
              200,

            json:
              async () => ({
                choices:[
                  {
                    message:{
                      content:
                        JSON.stringify({
                          amount:
                            "12",

                          currency:
                            "MYR",

                          type:
                            "EXPENSE",

                          categoryName:
                            "Food",

                          merchantName:
                            "Kedai Makan",

                          paymentMethodName:
                            "Cash",

                          description:
                            "makan RM12 tunai",

                          transactionDate:
                            input.transactionDate,

                          rawText:
                            input.text,
                        }),
                    },
                  },
                ],
              }),
          } as Response),
      });


    const result =
      await provider
        .parseTransaction(
          input,
        );


    assert.equal(
      result.status,
      "success",
    );


    if(
      result.status !== "success"
    ){

      assert.fail(
        "Expected successful Groq result",
      );

    }


    assert.equal(
      result.value.amount,
      "12",
    );

    assert.equal(
      result.value.categoryName,
      "Food",
    );

    assert.equal(
      result.value.rawText,
      input.text,
    );

  },
);
