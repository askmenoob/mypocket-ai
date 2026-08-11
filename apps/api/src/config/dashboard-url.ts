const PRODUCTION_DASHBOARD_URL =
  "https://app.imai.my";


const ALLOWED_DASHBOARD_HOSTS =
  new Set([
    "app.imai.my",
    "localhost",
    "127.0.0.1",
  ]);


export function resolveDashboardUrl(
  configuredUrl:string | undefined,
){
  try{
    const url =
      new URL(
        configuredUrl
        ??
        PRODUCTION_DASHBOARD_URL,
      );

    if(
      !ALLOWED_DASHBOARD_HOSTS.has(
        url.hostname,
      )
    ){
      return new URL(
        PRODUCTION_DASHBOARD_URL,
      ).toString();
    }

    if(
      url.protocol !== "https:"
      &&
      url.hostname !== "localhost"
      &&
      url.hostname !== "127.0.0.1"
    ){
      return new URL(
        PRODUCTION_DASHBOARD_URL,
      ).toString();
    }

    url.hash = "";
    url.search = "";

    return url.toString();
  }catch{
    return new URL(
      PRODUCTION_DASHBOARD_URL,
    ).toString();
  }
}
