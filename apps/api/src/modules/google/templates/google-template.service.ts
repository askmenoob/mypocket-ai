import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleTemplateRepository,
} from "./google-template.repository.js";



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
  ){


    const template =
      await this.repository
        .findActiveByType(
          type,
        );



    if(!template){

      throw new Error(
        `Google template not found: ${type}`
      );

    }



    return template;


  }


}
