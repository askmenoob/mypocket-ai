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
  SheetInitializerService,
} from "../initializer/sheet-initializer.service.js";


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


  private readonly sheetInitializer:
    SheetInitializerService;


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


    this.sheetInitializer =
      new SheetInitializerService(
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

    void input;

    throw new AppError(
      "GOOGLE_MANUAL_STORAGE_LEGACY_CONNECT_DISABLED",
      "Direct Google Sheet connection is disabled. Validate and save Google links through the Manual Google Storage flow.",
      410,
    );
  }



  async listManualPickerItems(
    workspaceId:string,
    input:{
      kind:
        "folder"
        |
        "spreadsheet";
      query?:string;
    },
  ){

    const items =
      await this.driveService
        .listManualPickerItems(
          workspaceId,
          input,
        );

    return {
      items,
    };
  }


  async validateManualStorage(
    workspaceId:string,

    input:{
      rootFolderUrl:string;
      spreadsheetUrl:string;
      backupSpreadsheetUrl?:string;
    },
  ){

    const folderId =
      this.parseManualFolderId(
        input.rootFolderUrl,
      );

    const spreadsheetId =
      this.parseManualSpreadsheetId(
        input.spreadsheetUrl,
      );

    const backupSpreadsheetId =
      input.backupSpreadsheetUrl
        ?
        this.parseManualSpreadsheetId(
          input.backupSpreadsheetUrl,
        )
        :
        null;

    if(
      backupSpreadsheetId
      &&
      backupSpreadsheetId
      ===
      spreadsheetId
    ){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_DUPLICATE_SHEET",
        "Working Google Sheet and Backup Google Sheet must be different spreadsheets.",
        409,
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

    let folderMetadata;

    try{

      folderMetadata =
        await this.driveService
          .getFileMetadata(
            workspaceId,
            folderId,
          );

    }catch(error){

      if(error instanceof AppError){
        throw error;
      }

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_FOLDER_ACCESS_FAILED",
        "The selected Google Drive folder could not be accessed with the current Google connection.",
        409,
      );
    }

    if(
      folderMetadata.trashed
      ||
      folderMetadata.mimeType
      !==
      "application/vnd.google-apps.folder"
    ){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_FOLDER_INVALID",
        "The supplied Google Drive URL must point to an accessible folder.",
        409,
      );
    }

    if(
      folderMetadata.capabilities
        ?.canAddChildren
      ===
      false
    ){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_FOLDER_NOT_WRITABLE",
        "MyPocket does not have permission to add files to the selected Google Drive folder.",
        409,
      );
    }

    const working =
      await this.classifyManualSpreadsheet(
        workspaceId,
        spreadsheetId,
        workspaceType,
      );

    const backup =
      backupSpreadsheetId
        ?
        await this.classifyManualSpreadsheet(
          workspaceId,
          backupSpreadsheetId,
          workspaceType,
        )
        :
        null;

    const canSave =
      working.classification
      ===
      "COMPATIBLE"
      &&
      (
        !backup
        ||
        backup.classification
        ===
        "COMPATIBLE"
      );

    const installRequired =
      working.classification
      ===
      "EMPTY"
      ||
      (
        backup
        ?.classification
        ===
        "EMPTY"
      );

    return {
      workspaceType,

      folder:{
        id:
          folderId,

        name:
          folderMetadata.name
          ??
          "",
      },

      working,

      backup,

      canSave,

      installRequired,
    };
  }


  async saveManualStorage(
    workspaceId:string,

    input:{
      rootFolderUrl:string;
      spreadsheetUrl:string;
      backupSpreadsheetUrl?:string;
    },
  ){

    const validation =
      await this.validateManualStorage(
        workspaceId,
        input,
      );

    if(!validation.canSave){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_NOT_READY",
        validation.installRequired
          ?
          "Install the MyPocket template into each empty spreadsheet before saving these Google links."
          :
          "The selected Google Sheet is not compatible with MyPocket and was not connected.",
        409,
      );
    }

    const reconciliation =
      await this
        .reconcileManualStorageTransactions(
          workspaceId,
          [
            validation.working.id,

            validation.backup
              ?.id
            ??
            null,
          ],
        );

    const setting =
      await this.repository
        .upsert({

        workspaceId,

        spreadsheetId:
          validation.working.id,

        spreadsheetTitle:
          validation.working.title,

        backupSpreadsheetId:
          validation.backup
            ?.id
          ??
          null,

        backupSpreadsheetTitle:
          validation.backup
            ?.title
          ??
          null,

        templateType:
          validation.workspaceType,

        rootFolderId:
          validation.folder.id,

        reportsFolderId:
          validation.folder.id,

        receiptsFolderId:
          validation.folder.id,

        exportsFolderId:
          validation.folder.id,

        transactionSheet:
          "Transactions",

        dashboardSheet:
          "Dashboard",

        mode:
          "EXISTING_SHEET",
      });

    return {
      ...setting,

      reconciledTransactions:
        reconciliation.count,
    };
  }


  async installManualTemplate(
    workspaceId:string,

    input:{
      spreadsheetUrl:string;
    },
  ){

    const spreadsheetId =
      this.parseManualSpreadsheetId(
        input.spreadsheetUrl,
      );

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

    const before =
      await this.classifyManualSpreadsheet(
        workspaceId,
        spreadsheetId,
        workspaceType,
      );

    if(
      before.classification
      !==
      "EMPTY"
    ){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_INSTALL_NOT_ALLOWED",
        "MyPocket template installation is allowed only on a demonstrably empty spreadsheet.",
        409,
      );
    }

    await this.sheetsService
      .createMissingSheets(
        workspaceId,
        {
          spreadsheetId,

          titles:[
            "Transactions",
            "Dashboard",
            "Settings",
          ],
        },
      );

    await this.sheetInitializer
      .initialize({
        workspaceId,
        spreadsheetId,
        workspaceType,
      });

    const after =
      await this.classifyManualSpreadsheet(
        workspaceId,
        spreadsheetId,
        workspaceType,
      );

    if(
      after.classification
      !==
      "COMPATIBLE"
    ){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_INSTALL_VALIDATION_FAILED",
        "MyPocket template installation completed but compatibility validation failed.",
        500,
      );
    }

    return after;
  }


  private parseManualFolderId(
    value:string,
  ){

    let parsed:URL;

    try{

      parsed =
        new URL(
          value,
        );

    }catch{

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_FOLDER_URL_INVALID",
        "Google Drive folder URL is invalid.",
        400,
      );
    }

    if(
      parsed.protocol
      !==
      "https:"
      ||
      parsed.hostname
      !==
      "drive.google.com"
    ){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_FOLDER_URL_INVALID",
        "Google Drive folder URL is invalid.",
        400,
      );
    }

    const match =
      parsed.pathname
        .match(
          /\/folders\/([A-Za-z0-9_-]+)/,
        );

    const folderId =
      match?.[1]
      ??
      "";

    if(!folderId){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_FOLDER_URL_INVALID",
        "Google Drive folder URL is invalid.",
        400,
      );
    }

    return folderId;
  }


  private parseManualSpreadsheetId(
    value:string,
  ){

    let parsed:URL;

    try{

      parsed =
        new URL(
          value,
        );

    }catch{

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_SPREADSHEET_URL_INVALID",
        "Google Sheet URL is invalid.",
        400,
      );
    }

    if(
      parsed.protocol
      !==
      "https:"
      ||
      parsed.hostname
      !==
      "docs.google.com"
    ){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_SPREADSHEET_URL_INVALID",
        "Google Sheet URL is invalid.",
        400,
      );
    }

    const match =
      parsed.pathname
        .match(
          /^\/spreadsheets\/d\/([A-Za-z0-9_-]+)/,
        );

    const spreadsheetId =
      match?.[1]
      ??
      "";

    if(!spreadsheetId){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_SPREADSHEET_URL_INVALID",
        "Google Sheet URL is invalid.",
        400,
      );
    }

    return spreadsheetId;
  }


  private async classifyManualSpreadsheet(
    workspaceId:string,
    spreadsheetId:string,
    workspaceType:
      WorkspaceTemplateType,
  ){

    let metadata;

    try{

      metadata =
        await this.sheetsService
          .getSpreadsheetMetadata(
            workspaceId,
            spreadsheetId,
          );

    }catch{

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_SPREADSHEET_ACCESS_FAILED",
        "The selected Google Sheet could not be accessed with the current Google connection.",
        409,
      );
    }

    let spreadsheetDriveMetadata;

    try{

      spreadsheetDriveMetadata =
        await this.driveService
          .getFileMetadata(
            workspaceId,
            spreadsheetId,
          );

    }catch{

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_SPREADSHEET_ACCESS_FAILED",
        "The selected Google Sheet could not be inspected through Google Drive.",
        409,
      );
    }

    if(
      spreadsheetDriveMetadata
        .trashed
    ){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_SPREADSHEET_ACCESS_FAILED",
        "The selected Google Sheet is trashed or unavailable.",
        409,
      );
    }

    if(
      spreadsheetDriveMetadata
        .capabilities
        ?.canEdit
      ===
      false
    ){

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_SPREADSHEET_NOT_WRITABLE",
        "MyPocket does not have edit permission for the selected Google Sheet.",
        409,
      );
    }


    let hasAnyValues:boolean;

    try{

      hasAnyValues =
        await this.sheetsService
          .hasAnyValues(
            workspaceId,
            spreadsheetId,
          );

    }catch{

      throw new AppError(
        "GOOGLE_MANUAL_STORAGE_SPREADSHEET_ACCESS_FAILED",
        "The selected Google Sheet could not be inspected with the current Google connection.",
        409,
      );
    }

    if(!hasAnyValues){

      return {
        id:
          spreadsheetId,

        title:
          metadata.title
          ??
          "",

        classification:
          "EMPTY" as const,

        sheetTitles:
          metadata.sheetTitles,
      };
    }

    const requiredTabs = [
      "Transactions",
      "Dashboard",
      "Settings",
    ];

    const hasRequiredTabs =
      requiredTabs.every(
        (title) =>
          metadata.sheetTitles
            .includes(
              title,
            ),
      );

    if(!hasRequiredTabs){

      return {
        id:
          spreadsheetId,

        title:
          metadata.title
          ??
          "",

        classification:
          "INCOMPATIBLE" as const,

        sheetTitles:
          metadata.sheetTitles,
      };
    }

    let headerRows:unknown[][];
    let settingsRows:unknown[][];

    try{

      [
        headerRows,
        settingsRows,
      ] =
        await Promise.all([

          this.sheetsService
            .readRange(
              workspaceId,
              {
                spreadsheetId,

                range:
                  "Transactions!A1:O1",
              },
            ),

          this.sheetsService
            .readRange(
              workspaceId,
              {
                spreadsheetId,

                range:
                  "Settings!A1:B12",
              },
            ),
        ]);

    }catch{

      return {
        id:
          spreadsheetId,

        title:
          metadata.title
          ??
          "",

        classification:
          "INCOMPATIBLE" as const,

        sheetTitles:
          metadata.sheetTitles,
      };
    }

    const expectedHeader = [
      "Transaction ID",
      "Date",
      "Time",
      "Type",
      "Category",
      "Merchant",
      "Description",
      "Amount",
      "Payment Method",
      "Source",
      "AI Confidence",
      "Receipt URL",
      "Created At",
      "Created By ID",
      "Created By Email",
    ];

    const currentHeader =
      normalizeSheetRow(
        headerRows[0]
        ??
        [],
        15,
      );

    const normalizedExpectedHeader =
      normalizeSheetRow(
        expectedHeader,
        15,
      );

    const settings =
      parseTemplateSettings(
        settingsRows,
      );

    const sheetWorkspaceType =
      (
        settings[
          "workspace type"
        ]
        ??
        ""
      )
        .trim()
        .toUpperCase();

    const system =
      (
        settings.system
        ??
        ""
      )
        .trim()
        .toUpperCase();

    const sheetWorkspaceId =
      (
        settings[
          "workspace id"
        ]
        ??
        ""
      )
        .trim();

    const compatible =
      JSON.stringify(
        currentHeader,
      )
      ===
      JSON.stringify(
        normalizedExpectedHeader,
      )
      &&
      sheetWorkspaceType
      ===
      workspaceType
      &&
      sheetWorkspaceId
      ===
      workspaceId
      &&
      system
      ===
      "MYPOCKET AI";

    return {
      id:
        spreadsheetId,

      title:
        metadata.title
        ??
        "",

      classification:
        compatible
          ?
          "COMPATIBLE" as const
          :
          "INCOMPATIBLE" as const,

      sheetTitles:
        metadata.sheetTitles,
    };
  }



  private buildAutoCreatedRootFolderName(
    ownerEmail?:string | null,
  ):string{

    const normalizedEmail =
      ownerEmail
        ?.trim()
        .toLowerCase()
        .replace(
          /\s+/g,
          "",
        );

    if(!normalizedEmail){

      return "MyPocket AI";
    }

    return `MyPocket AI (${normalizedEmail})`;
  }


  async autoCreateSheet(
    workspaceId:string,
    title:string,

    ownerEmail?:string,
  ){

    void title;

    const rootFolderName =
      this.buildAutoCreatedRootFolderName(
        ownerEmail,
      );


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

          rootFolderName,

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




  private async reconcileManualStorageTransactions(
    workspaceId:string,
    spreadsheetIds:Array<string | null>,
  ){

    const app =
      this.app as
        FastifyInstance | undefined;

    if(
      !app
      ||
      !app.prisma
      ||
      !app.prisma.transaction
    ){

      return {
        count:
          0,
      };
    }

    const transactions =
      await app.prisma
        .transaction
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

    const currentSetting =
      await this.repository
        .findByWorkspaceId(
          workspaceId,
        );

    const excludedTransactionIds =
      new Set<string>();

    const currentSpreadsheetIds =
      Array.from(
        new Set(
          [
            currentSetting
              ?.spreadsheetId
            ??
            null,

            currentSetting
              ?.backupSpreadsheetId
            ??
            null,
          ]
            .filter(
              (
                spreadsheetId,
              ):
                spreadsheetId is string =>
                  Boolean(
                    spreadsheetId,
                  ),
            ),
        ),
      );

    for(
      const currentSpreadsheetId
      of currentSpreadsheetIds
    ){

      const currentRows =
        await this.sheetsService
          .readRange(
            workspaceId,
            {
              spreadsheetId:
                currentSpreadsheetId,

              range:
                "Transactions!A:O",
            },
          );

      for(
        const row
        of currentRows.slice(
          1,
        )
      ){

        const transactionId =
          String(
            row[0]
            ??
            "",
          )
            .trim();

        const description =
          String(
            row[6]
            ??
            "",
          )
            .trim()
            .toUpperCase();

        if(!transactionId){
          continue;
        }

        if(
          description
            .startsWith(
              "[DELETED]",
            )
          ||
          description
            .startsWith(
              "[CANCELLED]",
            )
        ){

          excludedTransactionIds
            .add(
              transactionId,
            );
        }
      }
    }

    let count =
      0;

    const targets =
      Array.from(
        new Set(
          spreadsheetIds
            .filter(
              (
                spreadsheetId,
              ):
                spreadsheetId is string =>
                  Boolean(
                    spreadsheetId,
                  ),
            ),
        ),
      );

    for(
      const spreadsheetId
      of targets
    ){

      const idRows =
        await this.sheetsService
          .readRange(
            workspaceId,
            {
              spreadsheetId,

              range:
                "Transactions!A:A",
            },
          );

      const existingIds =
        new Set(
          idRows
            .slice(
              1,
            )
            .map(
              (row) =>
                String(
                  row[0]
                  ??
                  "",
                )
                  .trim(),
            )
            .filter(
              Boolean,
            ),
        );

      for(
        const transaction
        of transactions
      ){

        if(
          excludedTransactionIds
            .has(
              transaction.id,
            )
        ){
          continue;
        }

        if(
          existingIds.has(
            transaction.id,
          )
        ){
          continue;
        }

        const transactionIso =
          transaction
            .transactionDate
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

          transaction.category
            ?.name
          ??
          "Others",

          transaction.merchant
            ?.name
          ??
          "-",

          transaction.description
          ??
          "",

          transaction.amount
            .toString(),

          transaction.paymentMethod
            ?.name
          ??
          "",

          "SYSTEM",

          "",

          transaction.receiptUrl
          ??
          "",

          transactionIso,

        ];

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

        existingIds.add(
          transaction.id,
        );

        count += 1;
      }
    }

    return {
      count,
    };
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
