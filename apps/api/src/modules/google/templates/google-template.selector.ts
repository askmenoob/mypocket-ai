import {
  GoogleTemplateService,
} from "./google-template.service.js";



export class GoogleTemplateSelector {


  constructor(
    private readonly service:
      GoogleTemplateService,
  ){}





  async select(
    workspaceType:
      | "PERSONAL"
      | "FAMILY"
      | "BUSINESS",
  ){


    return this.service
      .getTemplate(
        workspaceType,
      );


  }


}
