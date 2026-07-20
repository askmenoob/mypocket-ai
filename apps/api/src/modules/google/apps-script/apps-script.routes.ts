import type { FastifyInstance } from "fastify";

import {
 AppsScriptService
}
from "./apps-script.service.js";



export async function appsScriptRoutes(
 fastify:FastifyInstance
){


 const service =
 new AppsScriptService();



 fastify.post(
  "/test",
  async(
   request,
   reply
  )=>{


   const body =
   request.body as any;



   const result =
   await service.addTransaction(

    body.workspace || "PERSONAL",

    body.data || {

     type:"EXPENSE",

     category:"Food",

     merchant:"Fastify Test",

     description:
      "Apps Script Connector Test",

     amount:10

    }

   );



   return reply.send(
    result
   );


  }
 );


}
