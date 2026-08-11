type GoogleAuthorizationUrlOptions = {
  clientId:string;
  redirectUri:string;
  scopes:readonly string[];
  accessType:"online" | "offline";
  state:string;
  codeChallenge:string;
  prompt?:"consent";
  includeGrantedScopes?:boolean;
};


type GoogleTokenRequestOptions = {
  clientId:string;
  clientSecret:string;
  redirectUri:string;
  code:string;
  codeVerifier:string;
};


export function buildGoogleAuthorizationUrl(
  options:GoogleAuthorizationUrlOptions,
){
  const params =
    new URLSearchParams({
      client_id:
        options.clientId,
      redirect_uri:
        options.redirectUri,
      response_type:
        "code",
      scope:
        options.scopes.join(" "),
      access_type:
        options.accessType,
      state:
        options.state,
      code_challenge:
        options.codeChallenge,
      code_challenge_method:
        "S256",
    });

  if(options.prompt){
    params.set(
      "prompt",
      options.prompt,
    );
  }

  if(options.includeGrantedScopes){
    params.set(
      "include_granted_scopes",
      "true",
    );
  }

  return (
    "https://accounts.google.com/o/oauth2/v2/auth?"
    +
    params.toString()
  );
}


export function buildGoogleTokenRequestBody(
  options:GoogleTokenRequestOptions,
){
  return new URLSearchParams({
    client_id:
      options.clientId,
    client_secret:
      options.clientSecret,
    code:
      options.code,
    code_verifier:
      options.codeVerifier,
    grant_type:
      "authorization_code",
    redirect_uri:
      options.redirectUri,
  });
}
