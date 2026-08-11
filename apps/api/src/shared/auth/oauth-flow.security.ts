import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";


export const OAUTH_FLOW_COOKIE_MAX_AGE_SECONDS =
  10 * 60;


export type OAuthFlow = {
  state:string;
  verifier:string;
  challenge:string;
  challengeMethod:"S256";
};


export function createOAuthFlow():OAuthFlow{
  const verifier =
    randomBytes(48)
      .toString("base64url");

  return {
    state:
      randomBytes(32)
        .toString("base64url"),
    verifier,
    challenge:
      createHash("sha256")
        .update(verifier)
        .digest("base64url"),
    challengeMethod:
      "S256",
  };
}


export function serializeOAuthCookie(
  name:string,
  value:string,
  maxAge =
    OAUTH_FLOW_COOKIE_MAX_AGE_SECONDS,
){
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");
}


export function clearOAuthCookie(
  name:string,
){
  return serializeOAuthCookie(
    name,
    "",
    0,
  );
}


export function readCookie(
  cookieHeader:string | undefined,
  name:string,
){
  if(!cookieHeader){
    return null;
  }

  for(const part of cookieHeader.split(";")){
    const separator =
      part.indexOf("=");

    if(separator < 0){
      continue;
    }

    const candidate =
      part.slice(0, separator)
        .trim();

    if(candidate !== name){
      continue;
    }

    try{
      return decodeURIComponent(
        part.slice(separator + 1)
          .trim(),
      );
    }catch{
      return null;
    }
  }

  return null;
}


export function oauthValuesMatch(
  expected:string | null | undefined,
  actual:string | null | undefined,
){
  if(!expected || !actual){
    return false;
  }

  const expectedBuffer =
    Buffer.from(expected);
  const actualBuffer =
    Buffer.from(actual);

  if(
    expectedBuffer.length
    !==
    actualBuffer.length
  ){
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    actualBuffer,
  );
}
