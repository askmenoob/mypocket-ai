import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleTemplateRepository,
} from "./google-template.repository.js";

import type {
  GoogleTemplateTier,
} from "./google-template.types.js";



export class GoogleTemplateService {


  private readonly repository:
    GoogleTemplateRepository;



  constructor(
    app:FastifyInstance,
  ){

    this.repository =
      new GoogleTemplateRepository(
        app.prisma,
      );

  }





  async getTemplate(
    type:
      | "PERSONAL"
      | "FAMILY"
      | "BUSINESS",

    tier?:
      GoogleTemplateTier,
  ){


    const template =
      type === "PERSONAL"
      &&
      tier
        ? await this.repository
          .findActivePersonalByTier(
            tier,
          )
        : await this.repository
          .findActiveByType(
            type,
          );



    if(!template){

      throw new Error(
        `Google template not found: ${type}${tier ? `:${tier}` : ""}`
      );

    }


    const expectedName =
      type === "PERSONAL"
      &&
      tier
        ? tier.toLowerCase()
        : type.toLowerCase();


    if(
      !template.name
        .toLowerCase()
        .includes(
          expectedName,
        )
    ){

      throw new Error(
        `Google template mismatch: expected ${type}, got ${template.name}`,
      );

    }



    return template;


  }


}
