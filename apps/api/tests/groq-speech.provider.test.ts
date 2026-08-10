import assert from "node:assert/strict";
import test from "node:test";

import {
  GroqSpeechProvider,
} from "../src/modules/intelligence/groq-speech.provider.js";


test(
  "reports unavailable when Groq speech configuration is missing",
  async () => {
    const provider =
      new GroqSpeechProvider({
        model:"whisper-large-v3-turbo",
      });

    assert.deepEqual(
      await provider.transcribe({
        audio:new Uint8Array([1]),
        mimeType:"audio/ogg",
        fileName:"voice.ogg",
      }),
      {
        status:"unavailable",
        provider:"groq-speech",
        reason:"GROQ_CONFIGURATION_MISSING",
      },
    );
  },
);


test(
  "rejects empty and oversized audio before network calls",
  async () => {
    let calls = 0;
    const provider =
      new GroqSpeechProvider({
        apiKey:"test-key",
        model:"whisper-large-v3-turbo",
        maxBytes:2,
        fetchImpl:async () => {
          calls += 1;
          throw new Error("must not call network");
        },
      });

    assert.equal(
      (await provider.transcribe({
        audio:new Uint8Array(),
        mimeType:"audio/ogg",
        fileName:"empty.ogg",
      })).reason,
      "AUDIO_EMPTY",
    );

    assert.equal(
      (await provider.transcribe({
        audio:new Uint8Array([1, 2, 3]),
        mimeType:"audio/ogg",
        fileName:"large.ogg",
      })).reason,
      "AUDIO_TOO_LARGE",
    );

    assert.equal(
      calls,
      0,
    );
  },
);


test(
  "sends multilingual hint and normalizes verbose Groq transcript metadata",
  async () => {
    let requestBody:FormData | null = null;
    const provider =
      new GroqSpeechProvider({
        apiKey:"test-key",
        model:"whisper-large-v3-turbo",
        fetchImpl:async (_url, init) => {
          requestBody =
            init?.body as FormData;

          return new Response(
            JSON.stringify({
              text:"bayar makan RM 12",
              language:"ms",
              duration:2.4,
              segments:[
                {no_speech_prob:0.1},
                {no_speech_prob:0.3},
              ],
            }),
            {
              status:200,
              headers:{
                "Content-Type":"application/json",
              },
            },
          );
        },
      });

    const result =
      await provider.transcribe({
        audio:new Uint8Array([1, 2, 3]),
        mimeType:"audio/ogg",
        fileName:"voice.ogg",
        language:"ms",
      });

    assert.equal(
      result.status,
      "success",
    );

    if(result.status !== "success"){
      return;
    }

    assert.equal(
      result.value.text,
      "bayar makan RM 12",
    );

    assert.equal(
      result.value.confidence,
      0.8,
    );

    assert.equal(
      result.value.model,
      "whisper-large-v3-turbo",
    );

    assert.ok(
      result.value.latencyMs >= 0,
    );

    assert.ok(requestBody);
    assert.equal(
      requestBody!.get("model"),
      "whisper-large-v3-turbo",
    );
    assert.equal(
      requestBody!.get("language"),
      "ms",
    );
    assert.match(
      String(requestBody!.get("prompt")),
      /Bahasa Melayu.*English.*Manglish/,
    );
    assert.equal(
      requestBody!.get("response_format"),
      "verbose_json",
    );
  },
);


test(
  "fails closed on empty transcript and HTTP errors",
  async () => {
    const emptyProvider =
      new GroqSpeechProvider({
        apiKey:"test-key",
        model:"whisper-large-v3-turbo",
        fetchImpl:async () =>
          new Response(
            JSON.stringify({text:"   "}),
            {status:200},
          ),
      });

    assert.equal(
      (await emptyProvider.transcribe({
        audio:new Uint8Array([1]),
        mimeType:"audio/ogg",
        fileName:"voice.ogg",
      })).reason,
      "GROQ_STT_TRANSCRIPT_EMPTY",
    );

    const errorProvider =
      new GroqSpeechProvider({
        apiKey:"test-key",
        model:"whisper-large-v3-turbo",
        fetchImpl:async () =>
          new Response(
            "provider down",
            {status:503},
          ),
      });

    assert.equal(
      (await errorProvider.transcribe({
        audio:new Uint8Array([1]),
        mimeType:"audio/ogg",
        fileName:"voice.ogg",
      })).reason,
      "GROQ_STT_HTTP_503",
    );
  },
);
