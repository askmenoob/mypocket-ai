export type HitPayEnvironment =
  | "sandbox"
  | "production";


type HitPayEnvironmentInput = {
  environment:HitPayEnvironment;
  apiBaseUrl:string;
  webhookUrl:string;
  personalProPlanId:string;
  familyPlanId:string;
  businessPlanId:string;
};


const HITPAY_API_ORIGIN:
Record<HitPayEnvironment, string> = {
  sandbox:
    "https://api.sandbox.hit-pay.com",
  production:
    "https://api.hit-pay.com",
};


const HITPAY_WEBHOOK_SOURCE_IPS:
Record<HitPayEnvironment, readonly string[]> = {
  sandbox:[
    "54.179.156.147",
  ],
  production:[
    "3.1.13.32",
    "52.77.254.34",
  ],
};


export function activeHitPayWebhookPath(
  environment:HitPayEnvironment,
){
  return `/billing/hitpay/webhook/${environment}`;
}


export function hitPayWebhookSourceIps(
  environment:HitPayEnvironment,
){
  return [
    ...HITPAY_WEBHOOK_SOURCE_IPS[
      environment
    ],
  ];
}


export function hitPayWebhookSourceAllowed(
  environment:HitPayEnvironment,
  sourceIp:string,
){
  const normalized =
    sourceIp
      .trim()
      .replace(
        /^::ffff:/i,
        "",
      );

  return HITPAY_WEBHOOK_SOURCE_IPS[
    environment
  ].includes(
    normalized,
  );
}


export function hitPayEnvironmentIssues(
  input:HitPayEnvironmentInput,
){
  const issues:string[] = [];
  const expectedApiOrigin =
    HITPAY_API_ORIGIN[input.environment];

  try{
    const apiUrl =
      new URL(input.apiBaseUrl);

    if(apiUrl.origin !== expectedApiOrigin){
      issues.push(
        "HITPAY_API_BASE_URL_ENVIRONMENT_MISMATCH",
      );
    }

    if(
      !["", "/"].includes(apiUrl.pathname)
      || apiUrl.search
      || apiUrl.hash
    ){
      issues.push(
        "HITPAY_API_BASE_URL_PATH_INVALID",
      );
    }
  }catch{
    issues.push(
      "HITPAY_API_BASE_URL_ENVIRONMENT_MISMATCH",
    );
  }

  try{
    const webhookUrl =
      new URL(input.webhookUrl);

    if(webhookUrl.protocol !== "https:"){
      issues.push(
        "HITPAY_WEBHOOK_URL_PROTOCOL_INVALID",
      );
    }

    if(
      !webhookUrl.pathname.endsWith(
        activeHitPayWebhookPath(
          input.environment,
        ),
      )
      || webhookUrl.search
      || webhookUrl.hash
    ){
      issues.push(
        "HITPAY_WEBHOOK_URL_ENVIRONMENT_MISMATCH",
      );
    }
  }catch{
    issues.push(
      "HITPAY_WEBHOOK_URL_ENVIRONMENT_MISMATCH",
    );
  }

  const planIds =
    new Set([
      input.personalProPlanId,
      input.familyPlanId,
      input.businessPlanId,
    ]);

  if(planIds.size !== 3){
    issues.push(
      "HITPAY_PLAN_IDS_NOT_UNIQUE",
    );
  }

  return issues;
}
