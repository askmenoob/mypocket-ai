import type {
  FastifyInstance,
} from "fastify";


import {
  GoogleSettingsRepository,
} from "./google-settings.repository.js";


import {
  GoogleSheetsService,
} from "../sheets/google-sheets.service.js";


import {
  GoogleDriveService,
} from "../drive/google-drive.service.js";


import {
  GoogleTemplateService,
} from "../templates/google-template.service.js";


import {
  AppError,
} from "../../../shared/errors/index.js";


import {
  buildTransactionSnapshot,
  compareTemplateVersions,
  findTemplateSettingRow,
  normalizeSheetRow,
  parseTemplateSettings,
  sameTransactionSnapshot,
} from "../templates/template-update.utils.js";




import {
  TemplateProvisioner,
} from "../provisioner/template.provisioner.js";




import {
  WorkspaceRepository,
} from "../../workspace/workspace.repository.js";


import type {
  WorkspaceTemplateType,
} from "../provisioner/template.types.js";



export class GoogleSettingsService {


  private readonly repository:
    GoogleSettingsRepository;


  private readonly sheetsService:
    GoogleSheetsService;


  private readonly driveService:
    GoogleDriveService;


  private readonly templateService:
    GoogleTemplateService;


  private static readonly activeTemplateUpdates =
    new Set<string>();




  private readonly templateProvisioner:
    TemplateProvisioner;




  private readonly workspaceRepository:
    WorkspaceRepository;



  constructor(
    private readonly app:FastifyInstance,
  ){

    this.repository =
      new GoogleSettingsRepository(
        app.prisma,
      );


    this.sheetsService =
      new GoogleSheetsService(
        app,
      );


    this.driveService =
      new GoogleDriveService(
        app,
      );


    this.templateService =
      new GoogleTemplateService(
        app,
      );




    this.templateProvisioner =
      new TemplateProvisioner(
        app,
      );




    this.workspaceRepository =
      new WorkspaceRepository(
        app.prisma,
      );

  }





  async getSettings(
    workspaceId:string,
  ){

    const setting =
      await this.repository
        .findByWorkspaceId(
          workspaceId,
        );

    if(!setting){
      return null;
    }

    const templateUpdate =
      await this.getTemplateUpdateStatus(
        workspaceId,
      );

    return {
      ...setting,
      ...templateUpdate,
    };

  }





  async connectExistingSheet(
    input:{
      workspaceId:string;

      spreadsheetId:string;

      spreadsheetTitle?:string;

    },
  ){


    return this.repository
      .upsert({

        workspaceId:
          input.workspaceId,


        spreadsheetId:
          input.spreadsheetId,


        spreadsheetTitle:
          input.spreadsheetTitle,


        mode:
          "EXISTING_SHEET",

      });

  }






  async autoCreateSheet(
    workspaceId:string,
    title:string,
  ){

    void title;


    const workspace =
      await this.workspaceRepository
        .findWorkspaceById(
          workspaceId,
        );


    const workspaceType:
      WorkspaceTemplateType =
        workspace?.type
        ??
        "PERSONAL";



    const provision =
      await this.templateProvisioner
        .provision({

          workspaceId,

          workspaceType:
            workspaceType,

        });


    if(provision.templateType !== workspaceType){

      throw new Error(
        `Google template type mismatch: workspace is ${workspaceType}, provisioned ${provision.templateType}`,
      );

    }



    const setting =
      await this.repository
        .upsert({

          workspaceId,

          spreadsheetId:
            provision.spreadsheetId,


          spreadsheetTitle:
            provision.spreadsheetTitle,


          backupSpreadsheetId:
            provision.backupSpreadsheetId,


          backupSpreadsheetTitle:
            provision.backupSpreadsheetTitle,


          templateType:
            provision.templateType,


          rootFolderId:
            provision.rootFolderId,


          reportsFolderId:
            provision.reportsFolderId,


          receiptsFolderId:
            provision.receiptsFolderId,


          exportsFolderId:
            provision.exportsFolderId,


          mode:
            "AUTO_CREATED",

        });


    const backfill =
      await this.backfillTransactionsToSheet(
        workspaceId,
        [
          setting.spreadsheetId,

          setting.backupSpreadsheetId,
        ],
      );


    return {
      ...setting,

      backfilledTransactions:
        backfill.count,
    };

  }



  async getTemplateUpdateStatus(
    workspaceId:string,
  ){

    try{

      const context =
        await this.readTemplateUpdateContext(
          workspaceId,
        );

      const updateAvailable =
        context.comparison < 0;

      const updateSupported =
        context.workspaceType === "PERSONAL"
        &&
        context.currentVersion === "1.0.0"
        &&
        context.latestVersion === "1.1.0";

      return {
        currentTemplateVersion:
          context.currentVersion,

        latestTemplateVersion:
          context.latestVersion,

        templateUpdateAvailable:
          updateAvailable,

        templateUpdateSupported:
          updateAvailable
          &&
          updateSupported,

        templateUpdateStatus:
          context.comparison > 0
            ? "AHEAD"
            : updateAvailable
              ? updateSupported
                ? "UPDATE_AVAILABLE"
                : "MIGRATION_REQUIRED"
              : "UP_TO_DATE",

        templateUpdateMessage:
          context.comparison > 0
            ? "Google Sheet version is newer than the active master template."
            : updateAvailable
              ? updateSupported
                ? "A safe Google Sheet template update is available."
                : "A newer template exists, but a structural migration must be prepared first."
              : "Google Sheet is up to date.",
      };

    }catch(error){

      return {
        currentTemplateVersion:
          null,

        latestTemplateVersion:
          null,

        templateUpdateAvailable:
          false,

        templateUpdateSupported:
          false,

        templateUpdateStatus:
          "UNAVAILABLE",

        templateUpdateMessage:
          error instanceof Error
            ? error.message
            : "Google Sheet template status is unavailable.",
      };

    }

  }


  async updateTemplate(
    workspaceId:string,
  ){

    if(
      GoogleSettingsService
        .activeTemplateUpdates
        .has(
          workspaceId,
        )
    ){

      throw new AppError(
        "GOOGLE_TEMPLATE_UPDATE_IN_PROGRESS",
        "A Google Sheet template update is already running for this workspace.",
        409,
      );

    }

    GoogleSettingsService
      .activeTemplateUpdates
      .add(
        workspaceId,
      );

    try{

      return await this.performTemplateUpdate(
        workspaceId,
      );

    }finally{

      GoogleSettingsService
        .activeTemplateUpdates
        .delete(
          workspaceId,
        );

    }

  }


  private async performTemplateUpdate(
    workspaceId:string,
  ){

    const context =
      await this.readTemplateUpdateContext(
        workspaceId,
      );

    if(context.comparison >= 0){

      return {
        updated:
          false,

        reused:
          true,

        currentTemplateVersion:
          context.currentVersion,

        latestTemplateVersion:
          context.latestVersion,

        message:
          "Google Sheet is already up to date.",
      };

    }

    const supported =
      context.workspaceType === "PERSONAL"
      &&
      context.currentVersion === "1.0.0"
      &&
      context.latestVersion === "1.1.0";

    if(!supported){

      throw new AppError(
        "GOOGLE_TEMPLATE_MIGRATION_NOT_SUPPORTED",
        `Template migration ${context.workspaceType} ${context.currentVersion} to ${context.latestVersion} is not enabled yet.`,
        409,
      );

    }

    const [
      currentSheetTitles,
      masterSheetTitles,
      currentHeaderRows,
      masterHeaderRows,
      beforeRows,
    ] =
      await Promise.all([
        this.sheetsService
          .getSheetTitles(
            workspaceId,
            context.setting.spreadsheetId,
          ),

        this.sheetsService
          .getSheetTitles(
            workspaceId,
            context.template.spreadsheetId,
          ),

        this.sheetsService
          .readRange(
            workspaceId,
            {
              spreadsheetId:
                context.setting.spreadsheetId,

              range:
                "Transactions!A1:O1",
            },
          ),

        this.sheetsService
          .readRange(
            workspaceId,
            {
              spreadsheetId:
                context.template.spreadsheetId,

              range:
                "Transactions!A1:O1",
            },
          ),

        this.sheetsService
          .readRange(
            workspaceId,
            {
              spreadsheetId:
                context.setting.spreadsheetId,

              range:
                "Transactions!A:O",
            },
          ),
      ]);

    const missingTabs =
      masterSheetTitles.filter(
        (title) =>
          !currentSheetTitles.includes(
            title,
          ),
      );

    if(missingTabs.length > 0){

      throw new AppError(
        "GOOGLE_TEMPLATE_STRUCTURE_MIGRATION_REQUIRED",
        `Google Sheet is missing template tabs: ${missingTabs.join(", ")}.`,
        409,
      );

    }

    const currentHeader =
      normalizeSheetRow(
        currentHeaderRows[0] ?? [],
        15,
      );

    const masterHeader =
      normalizeSheetRow(
        masterHeaderRows[0] ?? [],
        15,
      );

    if(
      JSON.stringify(
        currentHeader,
      )
      !==
      JSON.stringify(
        masterHeader,
      )
    ){

      throw new AppError(
        "GOOGLE_TEMPLATE_TRANSACTION_HEADER_MISMATCH",
        "Transactions header does not match the active master template.",
        409,
      );

    }

    const beforeSnapshot =
      buildTransactionSnapshot(
        beforeRows,
      );

    if(beforeSnapshot.duplicateIds.length > 0){

      throw new AppError(
        "GOOGLE_TEMPLATE_DUPLICATE_TRANSACTION_IDS",
        "Duplicate Transaction IDs were detected. Template update was stopped.",
        409,
      );

    }

    const timestamp =
      new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          "-",
        );

    const sourceTitle =
      context.setting.spreadsheetTitle
      ||
      `MyPocket ${context.workspaceType} Template`;

    const backup =
      await this.driveService
        .copyFile(
          workspaceId,
          context.setting.spreadsheetId,
          `${sourceTitle} Backup ${context.currentVersion}-to-${context.latestVersion} ${timestamp}`,
          context.setting.exportsFolderId
          ||
          undefined,
        );

    if(!backup.id){

      throw new AppError(
        "GOOGLE_TEMPLATE_BACKUP_FAILED",
        "Google Sheet backup could not be created.",
        500,
      );

    }

    await this.repository
      .update(
        workspaceId,
        {
          backupSpreadsheetId:
            backup.id,

          backupSpreadsheetTitle:
            backup.name,
        },
      );

    const versionRange =
      `Settings!B${context.currentVersionRow}`;

    let versionWritten =
      false;

    try{

      await this.sheetsService
        .updateRange(
          workspaceId,
          {
            spreadsheetId:
              context.setting.spreadsheetId,

            range:
              versionRange,

            values:[
              [
                context.latestVersion,
              ],
            ],
          },
        );

      versionWritten =
        true;

      const [
        afterSettingsRows,
        afterRows,
      ] =
        await Promise.all([
          this.sheetsService
            .readRange(
              workspaceId,
              {
                spreadsheetId:
                  context.setting.spreadsheetId,

                range:
                  "Settings!A1:B12",
              },
            ),

          this.sheetsService
            .readRange(
              workspaceId,
              {
                spreadsheetId:
                  context.setting.spreadsheetId,

                range:
                  "Transactions!A:O",
              },
            ),
        ]);

      const afterSettings =
        parseTemplateSettings(
          afterSettingsRows,
        );

      const afterVersion =
        afterSettings.version
        ||
        "";

      const afterSnapshot =
        buildTransactionSnapshot(
          afterRows,
        );

      if(
        afterVersion
        !==
        context.latestVersion
      ){

        throw new AppError(
          "GOOGLE_TEMPLATE_VERSION_VALIDATION_FAILED",
          "Google Sheet version did not update correctly.",
          500,
        );

      }

      if(
        !sameTransactionSnapshot(
          beforeSnapshot,
          afterSnapshot,
        )
      ){

        throw new AppError(
          "GOOGLE_TEMPLATE_DATA_VALIDATION_FAILED",
          "Transaction data changed during template update. The update was rolled back.",
          500,
        );

      }

      await this.sheetsService
        .appendRow(
          workspaceId,
          {
            spreadsheetId:
              context.setting.spreadsheetId,

            range:
              "_System_Log!A:F",

            values:[
              new Date()
                .toISOString(),

              context.workspaceType,

              "TEMPLATE_UPDATE",

              "SUCCESS",

              context.currentVersion,

              context.latestVersion,
            ],
          },
        );

      return {
        updated:
          true,

        reused:
          false,

        migrationMode:
          "VERSION_VALIDATION_ONLY",

        currentTemplateVersion:
          context.latestVersion,

        previousTemplateVersion:
          context.currentVersion,

        latestTemplateVersion:
          context.latestVersion,

        backupSpreadsheetTitle:
          backup.name,

        preservedTransactions:
          beforeSnapshot.recordCount,

        preservedAmountCents:
          beforeSnapshot.totalAmountCents,

        message:
          `Google Sheet updated safely to Version ${context.latestVersion}.`,
      };

    }catch(error){

      if(versionWritten){

        try{

          await this.sheetsService
            .updateRange(
              workspaceId,
              {
                spreadsheetId:
                  context.setting.spreadsheetId,

                range:
                  versionRange,

                values:[
                  [
                    context.currentVersion,
                  ],
                ],
              },
            );

        }catch{
          // The full backup remains available for manual recovery.
        }

      }

      if(error instanceof AppError){
        throw error;
      }

      throw new AppError(
        "GOOGLE_TEMPLATE_UPDATE_FAILED",
        error instanceof Error
          ? error.message
          : "Google Sheet template update failed.",
        500,
      );

    }

  }


  private async readTemplateUpdateContext(
    workspaceId:string,
  ){

    const setting =
      await this.repository
        .findByWorkspaceId(
          workspaceId,
        );

    if(!setting){

      throw new AppError(
        "GOOGLE_SHEET_NOT_CONNECTED",
        "Google Sheet is not connected.",
        404,
      );

    }

    const workspace =
      await this.workspaceRepository
        .findWorkspaceById(
          workspaceId,
        );

    if(!workspace){

      throw new AppError(
        "WORKSPACE_NOT_FOUND",
        "Workspace was not found.",
        404,
      );

    }

    const workspaceType =
      workspace.type as
        WorkspaceTemplateType;

    const template =
      await this.templateService
        .getTemplate(
          workspaceType,
        );

    const [
      currentRows,
      latestRows,
    ] =
      await Promise.all([
        this.sheetsService
          .readRange(
            workspaceId,
            {
              spreadsheetId:
                setting.spreadsheetId,

              range:
                "Settings!A1:B12",
            },
          ),

        this.sheetsService
          .readRange(
            workspaceId,
            {
              spreadsheetId:
                template.spreadsheetId,

              range:
                "Settings!A1:B12",
            },
          ),
      ]);

    const currentSettings =
      parseTemplateSettings(
        currentRows,
      );

    const latestSettings =
      parseTemplateSettings(
        latestRows,
      );

    const currentVersion =
      currentSettings.version
      ||
      "";

    const latestVersion =
      latestSettings.version
      ||
      "";

    const currentType =
      (
        currentSettings[
          "workspace type"
        ]
        ||
        ""
      ).toUpperCase();

    const latestType =
      (
        latestSettings[
          "workspace type"
        ]
        ||
        ""
      ).toUpperCase();

    const latestStatus =
      (
        latestSettings.status
        ||
        ""
      ).toUpperCase();

    const currentVersionRow =
      findTemplateSettingRow(
        currentRows,
        "Version",
      );

    if(
      !currentVersion
      ||
      !latestVersion
      ||
      currentVersionRow < 1
    ){

      throw new AppError(
        "GOOGLE_TEMPLATE_VERSION_MISSING",
        "Template version metadata is missing from the Settings tab.",
        409,
      );

    }

    if(
      currentType !== workspaceType
      ||
      latestType !== workspaceType
    ){

      throw new AppError(
        "GOOGLE_TEMPLATE_TYPE_MISMATCH",
        `Google Sheet and master template must both use workspace type ${workspaceType}.`,
        409,
      );

    }

    if(latestStatus !== "ACTIVE"){

      throw new AppError(
        "GOOGLE_TEMPLATE_NOT_ACTIVE",
        "The latest master template is not marked ACTIVE.",
        409,
      );

    }

    const comparison =
      compareTemplateVersions(
        currentVersion,
        latestVersion,
      );

    return {
      setting,
      workspaceType,
      template,
      currentVersion,
      latestVersion,
      currentVersionRow,
      comparison,
    };

  }


  async updateSheet(
    workspaceId:string,

    input:{
      spreadsheetId?:string;

      spreadsheetTitle?:string;

      transactionSheet?:string;

      dashboardSheet?:string;

    },
  ){


    return this.repository
      .update(
        workspaceId,
        input,
      );

  }





  async disconnect(
    workspaceId:string,
  ){

    return this.repository
      .delete(
        workspaceId,
      );

  }




  private async backfillTransactionsToSheet(
    workspaceId:string,
    spreadsheetIds:Array<string | null>,
  ){

    const transactions =
      await this.app.prisma.transaction
        .findMany({

          where:{
            workspaceId,

            status:{
              not:
                "CANCELLED",
            },
          },

          include:{
            category:true,

            merchant:true,

            paymentMethod:true,
          },

          orderBy:{
            transactionDate:
              "asc",
          },

        });


    for(const transaction of transactions){

      const transactionIso =
        transaction.transactionDate
          .toISOString();

      const transactionDate =
        transactionIso
          .slice(
            0,
            10,
          );

      const transactionTime =
        transactionIso
          .slice(
            11,
            19,
          );


      const values = [

        transaction.id,

        transactionDate,

        transactionTime,

        transaction.type,

        transaction.category?.name
        ??
        "Others",

        transaction.merchant?.name
        ??
        "-",

        transaction.description
        ??
        "",

        transaction.amount
          .toString(),

        transaction.paymentMethod?.name
        ??
        "",

        "SYSTEM",

        "",

        transaction.receiptUrl
        ??
        "",

        transactionIso,

      ];


      for(const spreadsheetId of spreadsheetIds){

        if(!spreadsheetId){

          continue;

        }


        await this.sheetsService
          .appendRow(
            workspaceId,
            {
              spreadsheetId,

              range:
                "Transactions!A:M",

              values,

            },
          );

      }

    }


    return {
      count:
        transactions.length,
    };

  }


}
