type VisualKind =
  | "dashboard"
  | "timeline"
  | "map"
  | "kanban"
  | "studio"
  | "kiosk"
  | "command"
  | "mobile"
  | "editorial"
  | "ledger";

type IdeaSeed = [
  string,
  string,
  string,
  string,
  string,
  string
];

type CategorySeed = {
  name: string;
  short: string;
  description: string;
  accent: string;
  soft: string;
  ideas: IdeaSeed[];
};

type CatalogIdea = {
  id: number;
  title: string;
  category: string;
  categoryShort: string;
  categoryDescription: string;
  accent: string;
  soft: string;
  summary: string;
  owner: string;
  features: string[];
  kind: VisualKind;
};

const visualKinds: VisualKind[] = [
  "dashboard",
  "timeline",
  "map",
  "kanban",
  "studio",
  "kiosk",
  "command",
  "mobile",
  "editorial",
  "ledger",
];

const categorySeeds: CategorySeed[] = [
  {
    name: "Retail & Commerce",
    short: "Retail",
    description:
      "Aplikasi khusus untuk kedai, butik, showroom dan perniagaan jualan fizikal.",
    accent: "#6d5dfc",
    soft: "#eeecff",
    ideas: [
      [
        "ShelfSense",
        "Dashboard pintar untuk membantu kedai mengenal pasti rak yang perlu diisi semula sebelum stok habis.",
        "Mini market, kedai runcit dan convenience store",
        "Amaran rak rendah",
        "Cadangan restock",
        "Prestasi setiap rak",
      ],
      [
        "BoutiqueFit",
        "Profil saiz pelanggan dan sejarah fitting untuk butik yang mahu memberi pengalaman membeli lebih peribadi.",
        "Butik pakaian dan tailor boutique",
        "Profil ukuran pelanggan",
        "Cadangan saiz",
        "Sejarah pembelian",
      ],
      [
        "GiftComposer",
        "Aplikasi visual untuk staff membina gift box mengikut bajet, tema dan penerima.",
        "Gift shop dan premium hamper business",
        "Builder gift box",
        "Pilihan tema",
        "Kiraan harga masa nyata",
      ],
      [
        "TradeIn Desk",
        "Sistem pemeriksaan, grading dan tawaran trade-in terus di kaunter.",
        "Kedai telefon, gadget dan elektronik",
        "Checklist kondisi",
        "Harga trade-in",
        "Rekod serial number",
      ],
      [
        "DropLaunch",
        "Aplikasi khas untuk mengurus pelancaran produk terhad, waiting list dan slot pembelian.",
        "Sneaker, collectible dan limited product store",
        "Waiting list",
        "Countdown drop",
        "Kawalan kuantiti",
      ],
      [
        "RepairCounter",
        "Kaunter digital untuk menerima barang rosak, gambar kondisi dan menjejaki proses repair.",
        "Kedai elektronik dan repair center",
        "Intake bergambar",
        "Status repair",
        "Customer pickup code",
      ],
      [
        "BundleStudio",
        "Tool visual untuk membina bundle produk dan melihat margin sebelum dipromosikan.",
        "Retailer dan reseller",
        "Bundle builder",
        "Margin calculator",
        "Promo preview",
      ],
      [
        "PickUpLane",
        "Sistem click-and-collect dalaman dengan nombor pickup dan status penyediaan pesanan.",
        "Kedai dengan online order",
        "Pickup queue",
        "Ready notification",
        "Counter handover",
      ],
      [
        "SalesAssist",
        "Tablet app untuk salesperson mencari produk, membandingkan model dan menghasilkan recommendation.",
        "Showroom dan kedai high-ticket",
        "Product compare",
        "Sales recommendation",
        "Quick quotation",
      ],
      [
        "DisplayPlanner",
        "Visual merchandising planner untuk menyusun display kedai dan merekod perubahan mengikut musim.",
        "Boutique, showroom dan chain outlet kecil",
        "Floor layout",
        "Display checklist",
        "Seasonal plan",
      ],
    ],
  },

  {
    name: "Food & Beverage",
    short: "F&B",
    description:
      "Idea untuk restoran, cafe, bakeri, katering dan pengeluar makanan.",
    accent: "#ff7448",
    soft: "#fff0e9",
    ideas: [
      [
        "KitchenPulse",
        "Command center dapur yang menunjukkan order, masa menunggu dan bottleneck setiap station.",
        "Restoran dan central kitchen",
        "Kitchen queue",
        "Station timer",
        "Delay alert",
      ],
      [
        "MenuMargin",
        "Dashboard menu yang menggabungkan harga jual, kos bahan dan margin setiap hidangan.",
        "Restoran, cafe dan food truck",
        "Food costing",
        "Margin menu",
        "Harga cadangan",
      ],
      [
        "BakeBatch",
        "Production planner untuk bakeri mengurus batch, proofing, oven schedule dan output harian.",
        "Bakeri dan pastry kitchen",
        "Batch planner",
        "Oven timeline",
        "Production yield",
      ],
      [
        "CateringCanvas",
        "Visual quotation builder untuk pelanggan memilih menu, pax, setup dan add-on katering.",
        "Katering dan event food provider",
        "Menu composer",
        "Pax calculator",
        "Visual quotation",
      ],
      [
        "CoffeePass",
        "Membership app milik cafe sendiri untuk coffee pass, reward dan prepaid drinks.",
        "Cafe dan specialty coffee shop",
        "Coffee credits",
        "Member wallet",
        "Reward streak",
      ],
      [
        "FreshPrep",
        "Prep-list digital berdasarkan menu dan jumlah order yang dijangka pada hari tersebut.",
        "Restoran dan cloud kitchen",
        "Prep forecast",
        "Ingredient checklist",
        "Shift handover",
      ],
      [
        "ChefQueue",
        "Sistem tempahan chef table atau private dining dengan deposit dan pilihan menu.",
        "Private chef dan fine dining",
        "Slot booking",
        "Menu selection",
        "Deposit tracking",
      ],
      [
        "EventTray",
        "Sistem tray dan equipment tracking untuk katering semasa keluar masuk venue.",
        "Katering dan banquet operator",
        "Tray inventory",
        "Venue checklist",
        "Return confirmation",
      ],
      [
        "RecipeVault",
        "Digital recipe book dalaman dengan portion scaling, costing dan SOP plating.",
        "Restaurant group kecil dan bakeri",
        "Recipe library",
        "Portion scaling",
        "Plating guide",
      ],
      [
        "WasteWatch Kitchen",
        "Aplikasi dapur untuk merekod makanan dibuang dan mengenal pasti punca pembaziran.",
        "Restaurant, hotel kitchen dan buffet",
        "Waste logging",
        "Reason analysis",
        "Cost impact",
      ],
    ],
  },

  {
    name: "Services & Field Operations",
    short: "Field Service",
    description:
      "Sistem untuk syarikat yang menghantar pekerja, installer atau technician ke lokasi pelanggan.",
    accent: "#0c9f81",
    soft: "#e7f8f3",
    ideas: [
      [
        "RouteBoard",
        "Dispatch board untuk menyusun job harian mengikut technician, kawasan dan masa.",
        "Service company dan maintenance business",
        "Drag-drop jobs",
        "Route overview",
        "Technician status",
      ],
      [
        "SiteCheck",
        "Inspection app untuk merekod keadaan tapak menggunakan checklist, gambar dan severity.",
        "Contractor dan inspection company",
        "Inspection form",
        "Photo evidence",
        "Issue severity",
      ],
      [
        "ServicePassport",
        "QR pada equipment yang membuka sejarah servis lengkap milik syarikat.",
        "Maintenance dan equipment service company",
        "QR equipment",
        "Service history",
        "Next service date",
      ],
      [
        "TeamDispatch",
        "Live operations screen untuk melihat siapa available, siapa dalam perjalanan dan siapa lewat.",
        "Field service owner",
        "Live crew status",
        "ETA tracking",
        "Job reassignment",
      ],
      [
        "QuoteOnSite",
        "Tablet app untuk mengukur keperluan pelanggan dan menghasilkan quotation semasa berada di site.",
        "Renovator, installer dan contractor",
        "Site measurement",
        "Price builder",
        "Instant quotation",
      ],
      [
        "CleanRounds",
        "Checklist berjadual mengikut zone untuk syarikat cleaning dan housekeeping.",
        "Cleaning contractor",
        "Zone rounds",
        "Supervisor audit",
        "Photo completion",
      ],
      [
        "PestVisit",
        "Rekod treatment point, chemical, gambar dan follow-up untuk pest control.",
        "Pest control company",
        "Treatment map",
        "Chemical log",
        "Follow-up schedule",
      ],
      [
        "InstallFlow",
        "Sistem untuk mengurus pemasangan dari survey, material, install sehingga handover.",
        "Solar, CCTV, aircond dan installer",
        "Installation stages",
        "Material checklist",
        "Customer handover",
      ],
      [
        "SafetyWalk",
        "Mobile safety inspection dengan hazard pin, corrective action dan close-out.",
        "Factory contractor dan facility company",
        "Hazard capture",
        "Corrective action",
        "Close-out proof",
      ],
      [
        "MobileWorkshop",
        "Job card mudah alih untuk perniagaan repair yang datang terus ke lokasi pelanggan.",
        "Mobile mechanic dan repair service",
        "Mobile job card",
        "Parts used",
        "Digital completion",
      ],
    ],
  },

  {
    name: "Property & Rental",
    short: "Property",
    description:
      "Aplikasi operasi untuk homestay, landlord, property manager dan syarikat sewaan.",
    accent: "#2878ff",
    soft: "#e9f2ff",
    ideas: [
      [
        "StayOps",
        "Operations dashboard homestay untuk arrival, cleaning, guest request dan checkout.",
        "Homestay dan short-stay owner",
        "Arrival board",
        "Cleaning status",
        "Guest requests",
      ],
      [
        "UnitTurn",
        "Turnover workflow bagi memastikan unit siap semula selepas penyewa atau guest keluar.",
        "Property manager",
        "Turnover checklist",
        "Damage capture",
        "Ready status",
      ],
      [
        "KeyHandover",
        "Digital handover system untuk kunci, access card dan acknowledgment.",
        "Property agent dan building operator",
        "Key inventory",
        "Digital signature",
        "Return tracking",
      ],
      [
        "FixUnit",
        "Maintenance request board khusus untuk unit hartanah dengan gambar dan contractor assignment.",
        "Landlord dan property manager",
        "Issue ticket",
        "Vendor assignment",
        "Repair history",
      ],
      [
        "TenantWelcome",
        "Private tenant portal untuk house rules, contacts, utility guide dan move-in steps.",
        "Landlord dan serviced apartment owner",
        "Welcome guide",
        "Move-in checklist",
        "Important contacts",
      ],
      [
        "RoomInspect",
        "Room-by-room inspection app dengan condition score dan gambar.",
        "Rental property owner",
        "Room inspection",
        "Condition scoring",
        "Photo comparison",
      ],
      [
        "DepositCheck",
        "Check-in vs check-out comparison untuk membantu menentukan potongan deposit.",
        "Rental business",
        "Before-after evidence",
        "Damage estimate",
        "Deposit summary",
      ],
      [
        "ViewingFlow",
        "Schedule dan feedback app untuk property viewing.",
        "Property agency atau individual agent",
        "Viewing slots",
        "Lead notes",
        "Interest scoring",
      ],
      [
        "VendorAccess",
        "Temporary access manager untuk contractor yang memasuki unit atau building.",
        "Building dan facility operator",
        "Visitor approval",
        "Access window",
        "Entry history",
      ],
      [
        "MeterSnap",
        "Aplikasi gambar meter elektrik/air dengan bacaan dan sejarah setiap unit.",
        "Property manager dan rental owner",
        "Meter photo",
        "Reading history",
        "Usage comparison",
      ],
    ],
  },

  {
    name: "Health, Beauty & Wellness",
    short: "Wellness",
    description:
      "Aplikasi pemilikan tunggal untuk salon, spa, trainer, therapist dan pusat rawatan.",
    accent: "#d64f9d",
    soft: "#fcecf6",
    ideas: [
      [
        "SalonJourney",
        "Customer journey dari consultation, service, stylist notes hingga next appointment.",
        "Hair salon",
        "Consultation card",
        "Service history",
        "Next appointment",
      ],
      [
        "BeautyProfile",
        "Profil pelanggan bergambar untuk merekod preference, formula dan treatment terdahulu.",
        "Beauty salon dan aesthetic studio",
        "Client profile",
        "Treatment photos",
        "Preference history",
      ],
      [
        "ConsentCare",
        "Digital consent dan pre-treatment questionnaire dengan signature.",
        "Beauty, wellness dan treatment center",
        "Consent form",
        "Risk questions",
        "Digital signature",
      ],
      [
        "ClinicFlow",
        "Simple patient flow board dari registration hingga selesai consultation.",
        "Small clinic dan wellness center",
        "Queue status",
        "Room assignment",
        "Visit completion",
      ],
      [
        "SpaRoom",
        "Room occupancy dan therapist schedule dalam satu visual timeline.",
        "Spa dan massage center",
        "Room timeline",
        "Therapist schedule",
        "Turnover status",
      ],
      [
        "WellnessPass",
        "Membership wallet untuk package session, balance dan expiry.",
        "Wellness studio",
        "Session wallet",
        "Package balance",
        "Expiry reminder",
      ],
      [
        "TrainerPlan",
        "Personal trainer dashboard untuk workout plan, measurement dan progress photo.",
        "Personal trainer dan boutique gym",
        "Workout plan",
        "Body progress",
        "Client check-in",
      ],
      [
        "TherapyJournal",
        "Private client progress journal untuk therapist dengan session goals dan follow-up.",
        "Therapist dan coaching practice",
        "Session notes",
        "Goal progress",
        "Follow-up plan",
      ],
      [
        "QueueCare",
        "Waiting room screen dan mobile queue status untuk pusat rawatan.",
        "Clinic, dental dan treatment center",
        "Queue number",
        "Estimated wait",
        "Room call",
      ],
      [
        "Aftercare",
        "Branded aftercare app yang memberi panduan pelanggan selepas treatment.",
        "Salon, tattoo dan treatment studio",
        "Care instructions",
        "Daily checklist",
        "Follow-up alert",
      ],
    ],
  },

  {
    name: "Automotive & Workshop",
    short: "Automotive",
    description:
      "Sistem bengkel, tyre shop, car wash, fleet dan automotive service.",
    accent: "#e24242",
    soft: "#fdecec",
    ideas: [
      [
        "WorkshopBay",
        "Visual bay board yang menunjukkan kereta, mechanic dan tahap kerja setiap bay.",
        "Car workshop",
        "Bay status",
        "Mechanic assignment",
        "Job progress",
      ],
      [
        "VehiclePassport",
        "Digital history setiap kereta termasuk servis, mileage, parts dan inspection.",
        "Workshop dan specialist garage",
        "Vehicle history",
        "Mileage log",
        "Parts record",
      ],
      [
        "TyreTrack",
        "Tyre record menggunakan position map, tread depth dan replacement history.",
        "Tyre shop",
        "Tyre position",
        "Tread measurement",
        "Replacement reminder",
      ],
      [
        "WashFlow",
        "Queue dan package tracking untuk car wash dengan live progress.",
        "Car wash dan detailing center",
        "Vehicle queue",
        "Package status",
        "Ready pickup",
      ],
      [
        "FleetLite",
        "Maintenance board untuk syarikat yang mempunyai fleet kenderaan sendiri.",
        "Delivery dan service company",
        "Fleet health",
        "Service due",
        "Downtime view",
      ],
      [
        "DamageIntake",
        "Visual vehicle intake dengan body diagram dan gambar kerosakan sebelum kerja.",
        "Body repair dan workshop",
        "Damage map",
        "Photo evidence",
        "Customer approval",
      ],
      [
        "PartsBench",
        "Parts request dan reservation board mengikut job card.",
        "Workshop dan spare-part operation",
        "Parts request",
        "Reservation status",
        "Job matching",
      ],
      [
        "ServiceEstimate",
        "Interactive estimate builder yang membandingkan basic, recommended dan premium repair.",
        "Workshop dan automotive specialist",
        "Estimate options",
        "Customer approval",
        "Price comparison",
      ],
      [
        "RoadsideBoard",
        "Dispatch map untuk tow truck atau roadside technician.",
        "Towing dan roadside service",
        "Live requests",
        "Driver assignment",
        "ETA map",
      ],
      [
        "DeliveryVehicleCheck",
        "Pre-trip dan post-trip vehicle inspection untuk van dan lori kecil.",
        "Delivery company",
        "Vehicle checklist",
        "Defect report",
        "Driver sign-off",
      ],
    ],
  },

  {
    name: "Agriculture & Production",
    short: "Production",
    description:
      "Aplikasi operasi untuk farm, nursery, livestock, aquaculture dan pengeluaran kecil.",
    accent: "#5a9838",
    soft: "#eef7e8",
    ideas: [
      [
        "FarmDay",
        "Daily farm operations board untuk tugasan, pekerja, plot dan completion.",
        "Farm owner",
        "Daily tasks",
        "Plot assignment",
        "Work completion",
      ],
      [
        "HarvestBoard",
        "Harvest planning mengikut crop block, target date dan expected yield.",
        "Fruit dan vegetable farm",
        "Harvest calendar",
        "Yield estimate",
        "Collection status",
      ],
      [
        "LivestockRoutine",
        "Routine health, feeding dan treatment tracker untuk ternakan.",
        "Livestock farm",
        "Feeding rounds",
        "Health events",
        "Treatment record",
      ],
      [
        "BatchTrace",
        "Traceability dari bahan mentah kepada production batch dan customer delivery.",
        "Local food producer",
        "Batch genealogy",
        "Ingredient source",
        "Delivery trace",
      ],
      [
        "NurseryStock",
        "Visual stock system mengikut plant type, age, location dan readiness.",
        "Plant nursery",
        "Plant batches",
        "Nursery zones",
        "Ready-to-sell status",
      ],
      [
        "FertilizerPlan",
        "Application schedule dan usage tracker mengikut plot.",
        "Farm dan plantation kecil",
        "Plot schedule",
        "Application record",
        "Usage summary",
      ],
      [
        "PondLog",
        "Daily water, feeding, mortality dan growth record untuk fish pond.",
        "Aquaculture operator",
        "Water readings",
        "Feed log",
        "Growth tracking",
      ],
      [
        "ProductionBatch",
        "Small factory production board untuk plan, WIP, reject dan completed quantity.",
        "SME manufacturer",
        "Production plan",
        "WIP tracking",
        "Reject record",
      ],
      [
        "ColdRoomWatch",
        "Manual/IoT-ready cold room monitoring dengan temperature log dan stock zones.",
        "Food producer dan distributor",
        "Temperature log",
        "Cold-room zones",
        "Alert history",
      ],
      [
        "MarketPrep",
        "Preparation board untuk producer yang menjual di pasar, booth atau weekend market.",
        "Local producer dan artisan seller",
        "Packing list",
        "Market inventory",
        "Return count",
      ],
    ],
  },

  {
    name: "Tourism, Events & Hospitality",
    short: "Hospitality",
    description:
      "Aplikasi untuk tour operator, event organizer, chalet, venue dan activity provider.",
    accent: "#00a6bf",
    soft: "#e6f8fb",
    ideas: [
      [
        "TourGuide Console",
        "One-screen tour operations untuk guest list, pickup point, guide dan itinerary.",
        "Tour operator",
        "Guest manifest",
        "Pickup map",
        "Live itinerary",
      ],
      [
        "EventCrew",
        "Crew assignment board dengan zone, shift, radio channel dan task.",
        "Event organizer",
        "Crew roster",
        "Zone assignment",
        "Task status",
      ],
      [
        "VenueFlow",
        "Venue event-day dashboard untuk hall setup, vendor arrival dan readiness.",
        "Event venue",
        "Setup timeline",
        "Vendor check-in",
        "Venue readiness",
      ],
      [
        "GuestJourney",
        "Branded mobile guest guide dari pre-arrival hingga checkout.",
        "Boutique hotel dan resort",
        "Arrival guide",
        "Guest requests",
        "Checkout steps",
      ],
      [
        "WeddingRun",
        "Wedding day run-sheet visual dengan vendor, cue dan important moments.",
        "Wedding planner",
        "Run sheet",
        "Vendor contacts",
        "Live cue status",
      ],
      [
        "ActivityPass",
        "Digital activity pass untuk attraction atau recreational operator.",
        "Outdoor activity business",
        "Booking pass",
        "QR check-in",
        "Activity capacity",
      ],
      [
        "ChaletOps",
        "Daily chalet board untuk occupancy, room status, cleaning dan maintenance.",
        "Chalet dan small resort",
        "Room board",
        "Cleaning state",
        "Maintenance flags",
      ],
      [
        "TripBus",
        "Passenger, seat, pickup dan trip manifest untuk private bus operator.",
        "Tour bus dan charter company",
        "Seat plan",
        "Pickup manifest",
        "Trip status",
      ],
      [
        "BoothQueue",
        "Digital queue untuk photo booth, activity booth atau event attraction.",
        "Event booth operator",
        "Queue ticket",
        "Live wait time",
        "Session completion",
      ],
      [
        "VendorFestival",
        "Organizer dashboard untuk vendor allocation, booth readiness dan event-day issues.",
        "Festival dan bazaar organizer",
        "Vendor map",
        "Booth status",
        "Issue center",
      ],
    ],
  },

  {
    name: "Professional & Office",
    short: "Professional",
    description:
      "Custom software untuk consultant, agency, office, lawyer, designer dan professional services.",
    accent: "#3446a8",
    soft: "#eceefd",
    ideas: [
      [
        "ClientPortal",
        "Private portal milik firma sendiri untuk project status, files dan communication.",
        "Consultant dan professional firm",
        "Client dashboard",
        "File exchange",
        "Progress updates",
      ],
      [
        "CaseBoard",
        "Matter/case board yang memaparkan deadline, owner dan next action.",
        "Legal dan advisory practice",
        "Case timeline",
        "Deadline tracker",
        "Next actions",
      ],
      [
        "DesignApproval",
        "Visual proofing portal untuk customer approve design dan tinggalkan komen tepat pada artwork.",
        "Design agency dan printing business",
        "Version compare",
        "Pinned comments",
        "Approval history",
      ],
      [
        "TenderRoom",
        "Workspace untuk menyusun requirement tender, document status dan submission readiness.",
        "Contractor dan supplier",
        "Tender checklist",
        "Document status",
        "Readiness score",
      ],
      [
        "ConsultantDesk",
        "Session booking, note, action dan deliverable tracker untuk consultant solo.",
        "Business consultant",
        "Session planner",
        "Client actions",
        "Deliverable board",
      ],
      [
        "AuditEvidence",
        "Evidence collection workspace dengan request list, owner dan audit trail.",
        "Internal auditor dan compliance consultant",
        "Evidence requests",
        "Document status",
        "Audit trail",
      ],
      [
        "DocumentRequest",
        "Client-facing checklist untuk meminta dokumen dan menunjukkan apa yang masih belum lengkap.",
        "Accountant, lawyer dan consultant",
        "Request checklist",
        "Secure uploads",
        "Missing-item view",
      ],
      [
        "ProjectPulse",
        "Executive project screen yang hanya memaparkan milestone, blockers dan decisions.",
        "Project consultancy dan SME owner",
        "Milestones",
        "Blocker radar",
        "Decision log",
      ],
      [
        "RetainerDesk",
        "Retainer usage tracker untuk jam, request, deliverable dan balance bulanan.",
        "Agency dan professional service",
        "Retainer balance",
        "Request queue",
        "Monthly summary",
      ],
      [
        "ActionBoard",
        "Meeting-to-action system yang mengubah keputusan kepada owner, due date dan status.",
        "Management team dan consultant",
        "Decision capture",
        "Action owner",
        "Follow-up status",
      ],
    ],
  },

  {
    name: "Creative & Lifestyle Business",
    short: "Creative",
    description:
      "Idea untuk studio kreatif, tailor, florist, pet grooming dan perniagaan custom.",
    accent: "#a65cdb",
    soft: "#f5ecfb",
    ideas: [
      [
        "TailorFit",
        "Customer measurement, fitting stage, fabric dan alteration history dalam satu visual profile.",
        "Tailor dan bridal boutique",
        "Measurement profile",
        "Fitting timeline",
        "Alteration notes",
      ],
      [
        "StudioProof",
        "Photo selection portal untuk client pilih gambar, favorite dan request edit.",
        "Photographer dan photo studio",
        "Photo proofing",
        "Client favorites",
        "Edit requests",
      ],
      [
        "FloristCanvas",
        "Visual flower arrangement builder mengikut occasion, palette dan bajet.",
        "Florist",
        "Bouquet builder",
        "Color palette",
        "Budget preview",
      ],
      [
        "InteriorSelect",
        "Client selection board untuk material, paint, tile, furniture dan approval.",
        "Interior designer",
        "Material board",
        "Option approval",
        "Budget impact",
      ],
      [
        "TattooSession",
        "Consultation, design approval, session planning dan aftercare untuk tattoo studio.",
        "Tattoo artist dan studio",
        "Design approval",
        "Session record",
        "Aftercare guide",
      ],
      [
        "PetGroom Journey",
        "Pet profile dengan grooming style, behaviour notes, photo dan repeat schedule.",
        "Pet grooming center",
        "Pet profile",
        "Style history",
        "Repeat booking",
      ],
      [
        "CustomCake Studio",
        "Customer configurator untuk bentuk, saiz, flavour, theme dan decoration kek.",
        "Custom cake business",
        "Cake builder",
        "Price calculation",
        "Design approval",
      ],
      [
        "MusicRoom",
        "Studio booking dan session log untuk rehearsal, recording atau podcast room.",
        "Music dan recording studio",
        "Room calendar",
        "Equipment add-ons",
        "Session log",
      ],
      [
        "PrintDesk",
        "Job approval board untuk artwork, material, finishing dan production status.",
        "Printing business",
        "Artwork approval",
        "Production stages",
        "Finishing options",
      ],
      [
        "CraftWorkshop",
        "Class and workshop manager untuk capacity, materials, participant dan session flow.",
        "Craft studio dan workshop business",
        "Workshop calendar",
        "Material kits",
        "Participant status",
      ],
    ],
  },
];

const ideas: CatalogIdea[] = [];
let runningId = 1;

categorySeeds.forEach((category, categoryIndex) => {
  category.ideas.forEach((seed, ideaIndex) => {
    ideas.push({
      id: runningId,
      title: seed[0],
      category: category.name,
      categoryShort: category.short,
      categoryDescription: category.description,
      accent: category.accent,
      soft: category.soft,
      summary: seed[1],
      owner: seed[2],
      features: [seed[3], seed[4], seed[5]],
      kind:
        visualKinds[
          (ideaIndex + categoryIndex * 3) %
            visualKinds.length
        ],
    });

    runningId += 1;
  });
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ideaNumber(id: number): string {
  return String(id).padStart(3, "0");
}

function previewMarkup(
  idea: CatalogIdea,
  large = false,
): string {
  const title = escapeHtml(idea.title);
  const f = idea.features.map(escapeHtml);
  const sizeClass = large ? "preview--large" : "";

  const wrap = (inner: string) => `
    <div
      class="idea-preview ${sizeClass} preview-${idea.kind}"
      style="--accent:${idea.accent};--soft:${idea.soft}"
    >
      ${inner}
    </div>
  `;

  if (idea.kind === "dashboard") {
    return wrap(`
      <div class="mock-top">
        <b>${title}</b>
        <span></span><span></span><span></span>
      </div>
      <div class="mock-dashboard">
        <aside>
          <i></i><i></i><i></i><i></i><i></i>
        </aside>
        <main>
          <div class="mock-kpis">
            <strong>${f[0]}</strong>
            <strong>${f[1]}</strong>
            <strong>${f[2]}</strong>
          </div>
          <div class="mock-chart">
            <i style="height:34%"></i>
            <i style="height:58%"></i>
            <i style="height:44%"></i>
            <i style="height:78%"></i>
            <i style="height:63%"></i>
            <i style="height:91%"></i>
          </div>
          <div class="mock-rows">
            <span></span><span></span><span></span>
          </div>
        </main>
      </div>
    `);
  }

  if (idea.kind === "timeline") {
    return wrap(`
      <div class="mock-top">
        <b>${title}</b><small>Today</small>
      </div>
      <div class="timeline-layout">
        <div class="timeline-calendar">
          <div class="calendar-line"></div>
          <div class="calendar-line short"></div>
          <div class="calendar-grid">
            ${Array.from({ length: 20 })
              .map((_, i) =>
                `<i class="${i === 11 ? "active" : ""}"></i>`,
              )
              .join("")}
          </div>
        </div>
        <div class="timeline-steps">
          ${f
            .map(
              (label, index) => `
              <div>
                <i>${index + 1}</i>
                <span>${label}</span>
              </div>
            `,
            )
            .join("")}
        </div>
      </div>
    `);
  }

  if (idea.kind === "map") {
    return wrap(`
      <div class="map-preview">
        <div class="map-grid"></div>
        <span class="pin p1"></span>
        <span class="pin p2"></span>
        <span class="pin p3"></span>
        <div class="map-float">
          <b>${title}</b>
          <small>${f[0]}</small>
          <small>${f[1]}</small>
          <small>${f[2]}</small>
        </div>
      </div>
    `);
  }

  if (idea.kind === "kanban") {
    return wrap(`
      <div class="mock-top">
        <b>${title}</b>
        <button>+ New</button>
      </div>
      <div class="kanban">
        ${f
          .map(
            (label, column) => `
            <div class="kanban-col">
              <strong>${label}</strong>
              <i style="height:${38 + column * 8}px"></i>
              <i style="height:${55 - column * 5}px"></i>
              <i style="height:${30 + column * 10}px"></i>
            </div>
          `,
          )
          .join("")}
      </div>
    `);
  }

  if (idea.kind === "studio") {
    return wrap(`
      <div class="studio-layout">
        <div class="studio-tools">
          <i></i><i></i><i></i><i></i><i></i>
        </div>
        <div class="studio-canvas">
          <div class="studio-object">
            <span>${title}</span>
          </div>
        </div>
        <div class="studio-panel">
          <b>Design</b>
          <small>${f[0]}</small>
          <small>${f[1]}</small>
          <small>${f[2]}</small>
        </div>
      </div>
    `);
  }

  if (idea.kind === "kiosk") {
    return wrap(`
      <div class="kiosk">
        <div class="kiosk-logo">${title}</div>
        <h4>What would you like to do?</h4>
        <div class="kiosk-actions">
          <button>${f[0]}</button>
          <button>${f[1]}</button>
          <button>${f[2]}</button>
        </div>
        <div class="kiosk-footer"></div>
      </div>
    `);
  }

  if (idea.kind === "command") {
    return wrap(`
      <div class="command">
        <div class="command-head">
          <span class="live-dot"></span>
          <b>${title}</b>
          <small>LIVE</small>
        </div>
        <div class="command-grid">
          <div class="command-main">
            <strong>Operations</strong>
            <div class="command-wave"></div>
            <div class="command-status">
              <span>${f[0]}</span>
              <span>${f[1]}</span>
              <span>${f[2]}</span>
            </div>
          </div>
          <div class="command-feed">
            <i></i><i></i><i></i><i></i>
          </div>
        </div>
      </div>
    `);
  }

  if (idea.kind === "mobile") {
    return wrap(`
      <div class="mobile-preview">
        <div class="phone">
          <div class="phone-notch"></div>
          <b>${title}</b>
          <div class="phone-hero"></div>
          <span>${f[0]}</span>
          <span>${f[1]}</span>
          <button>${f[2]}</button>
        </div>
        <div class="phone phone-second">
          <div class="phone-notch"></div>
          <strong>Detail</strong>
          <div class="phone-list"></div>
          <div class="phone-list"></div>
          <div class="phone-list"></div>
          <button>Continue</button>
        </div>
      </div>
    `);
  }

  if (idea.kind === "editorial") {
    return wrap(`
      <div class="editorial">
        <div class="editorial-copy">
          <small>PRIVATE APP</small>
          <h3>${title}</h3>
          <p>${f[0]}</p>
          <button>${f[1]}</button>
        </div>
        <div class="editorial-image">
          <div class="editorial-shape"></div>
          <span>${f[2]}</span>
        </div>
      </div>
    `);
  }

  return wrap(`
    <div class="ledger">
      <div class="ledger-head">
        <b>${title}</b>
        <strong>Overview</strong>
      </div>
      <div class="ledger-body">
        <div class="ledger-table">
          <div><b>01</b><span>${f[0]}</span><em>Active</em></div>
          <div><b>02</b><span>${f[1]}</span><em>Review</em></div>
          <div><b>03</b><span>${f[2]}</span><em>Ready</em></div>
          <div><b>04</b><span>History & reports</span><em>Done</em></div>
        </div>
        <aside>
          <small>Progress</small>
          <strong>84%</strong>
          <i></i>
        </aside>
      </div>
    </div>
  `);
}

function renderCatalogPage(): void {
  const root = document.getElementById("root");

  if (!root) {
    throw new Error("Root element not found");
  }

  document.title = "Private Project Catalog | IMAI";
  document.documentElement.lang = "ms";

  let robots = document.querySelector<HTMLMetaElement>(
    'meta[name="robots"]',
  );

  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.appendChild(robots);
  }

  robots.content =
    "noindex,nofollow,noarchive,nosnippet,noimageindex";

  root.innerHTML = `
    <style>
      :root {
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
        color: #101828;
        background: #f7f8fb;
      }

      * {
        box-sizing: border-box;
      }

      html {
        scroll-behavior: smooth;
      }

      body {
        margin: 0;
        background:
          radial-gradient(
            circle at 4% 0%,
            rgba(109,93,252,.08),
            transparent 28rem
          ),
          radial-gradient(
            circle at 96% 15%,
            rgba(12,159,129,.07),
            transparent 30rem
          ),
          #f7f8fb;
      }

      button,
      input {
        font: inherit;
      }

      button {
        cursor: pointer;
      }

      .catalog-shell {
        min-height: 100vh;
      }

      .catalog-nav {
        position: sticky;
        top: 0;
        z-index: 30;
        height: 72px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 max(28px, calc((100vw - 1440px) / 2));
        border-bottom: 1px solid rgba(16,24,40,.08);
        background: rgba(255,255,255,.88);
        backdrop-filter: blur(20px);
      }

      .catalog-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .catalog-logo {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        color: white;
        font-weight: 900;
        background:
          linear-gradient(135deg,#6d5dfc,#0c9f81);
        box-shadow:
          0 10px 24px rgba(82,70,210,.22);
      }

      .catalog-brand strong {
        display: block;
        font-size: 15px;
        letter-spacing: -.02em;
      }

      .catalog-brand small {
        display: block;
        margin-top: 1px;
        color: #667085;
        font-size: 11px;
      }

      .catalog-private {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #475467;
        font-size: 12px;
        font-weight: 700;
      }

      .catalog-private::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #12b76a;
        box-shadow: 0 0 0 5px rgba(18,183,106,.12);
      }

      .catalog-hero {
        width: min(100% - 40px, 1440px);
        margin: 0 auto;
        padding: 82px 0 58px;
        display: grid;
        grid-template-columns:
          minmax(0, 1.05fr)
          minmax(440px, .95fr);
        gap: 70px;
        align-items: center;
      }

      .catalog-hero h1 {
        margin: 0;
        max-width: 780px;
        font-size: clamp(48px,6vw,92px);
        line-height: .94;
        letter-spacing: -.065em;
      }

      .catalog-hero h1 span {
        color: #6d5dfc;
      }

      .catalog-hero p {
        max-width: 720px;
        margin: 28px 0 0;
        color: #667085;
        font-size: 18px;
        line-height: 1.75;
      }

      .hero-stats {
        display: flex;
        gap: 32px;
        margin-top: 38px;
      }

      .hero-stats div {
        min-width: 100px;
      }

      .hero-stats strong {
        display: block;
        font-size: 30px;
        letter-spacing: -.04em;
      }

      .hero-stats span {
        color: #667085;
        font-size: 12px;
      }

      .hero-display {
        position: relative;
        min-height: 470px;
      }

      .hero-window {
        position: absolute;
        inset: 18px 0 0 54px;
        overflow: hidden;
        border: 1px solid rgba(16,24,40,.08);
        border-radius: 28px;
        background: white;
        box-shadow:
          0 38px 100px rgba(34,42,70,.18);
        transform: rotate(1.5deg);
      }

      .hero-window-bar {
        height: 45px;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 0 17px;
        border-bottom: 1px solid #eef0f4;
      }

      .hero-window-bar i {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #d0d5dd;
      }

      .hero-window-body {
        display: grid;
        grid-template-columns: 94px 1fr;
        height: 360px;
      }

      .hero-side {
        padding: 25px 16px;
        background: #111827;
      }

      .hero-side i {
        display: block;
        width: 100%;
        height: 8px;
        margin-bottom: 18px;
        border-radius: 10px;
        background: rgba(255,255,255,.13);
      }

      .hero-side i:first-child {
        background: #7c6dfd;
      }

      .hero-main {
        padding: 28px;
      }

      .hero-main-title {
        width: 44%;
        height: 16px;
        border-radius: 12px;
        background: #101828;
      }

      .hero-kpi-row {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 13px;
        margin-top: 24px;
      }

      .hero-kpi-row div {
        height: 82px;
        border-radius: 16px;
        background: #f3f4f7;
      }

      .hero-kpi-row div:nth-child(1) {
        background: #eeecff;
      }

      .hero-kpi-row div:nth-child(2) {
        background: #e7f8f3;
      }

      .hero-kpi-row div:nth-child(3) {
        background: #fff0e9;
      }

      .hero-chart {
        height: 146px;
        margin-top: 18px;
        display: flex;
        align-items: end;
        gap: 11px;
        padding: 20px;
        border-radius: 18px;
        background: #fafafa;
      }

      .hero-chart i {
        flex: 1;
        border-radius: 7px 7px 2px 2px;
        background:
          linear-gradient(#7c6dfd,#b4aaff);
      }

      .hero-floating {
        position: absolute;
        z-index: 2;
        border: 1px solid rgba(16,24,40,.07);
        border-radius: 20px;
        background: rgba(255,255,255,.94);
        box-shadow:
          0 20px 50px rgba(34,42,70,.16);
        backdrop-filter: blur(16px);
      }

      .hero-floating.one {
        left: 0;
        bottom: 6px;
        width: 210px;
        padding: 18px;
      }

      .hero-floating.two {
        right: -15px;
        top: 0;
        width: 190px;
        padding: 16px;
      }

      .hero-floating b {
        display: block;
        font-size: 12px;
      }

      .hero-floating strong {
        display: block;
        margin-top: 6px;
        font-size: 25px;
      }

      .hero-floating small {
        display: block;
        margin-top: 4px;
        color: #667085;
      }

      .catalog-tools-wrap {
        position: sticky;
        top: 72px;
        z-index: 24;
        border-top: 1px solid rgba(16,24,40,.06);
        border-bottom: 1px solid rgba(16,24,40,.08);
        background: rgba(247,248,251,.92);
        backdrop-filter: blur(18px);
      }

      .catalog-tools {
        width: min(100% - 40px, 1440px);
        margin: 0 auto;
        padding: 18px 0;
      }

      .search-box {
        position: relative;
        margin-bottom: 14px;
      }

      .search-box input {
        width: 100%;
        height: 54px;
        padding: 0 20px 0 50px;
        border: 1px solid #e4e7ec;
        border-radius: 17px;
        outline: none;
        color: #101828;
        background: white;
        box-shadow: 0 6px 18px rgba(16,24,40,.04);
        transition: .2s;
      }

      .search-box input:focus {
        border-color: #9b8fff;
        box-shadow:
          0 0 0 4px rgba(109,93,252,.10);
      }

      .search-icon {
        position: absolute;
        left: 19px;
        top: 50%;
        width: 17px;
        height: 17px;
        border: 2px solid #98a2b3;
        border-radius: 50%;
        transform: translateY(-50%);
      }

      .search-icon::after {
        content: "";
        position: absolute;
        right: -6px;
        bottom: -4px;
        width: 7px;
        height: 2px;
        background: #98a2b3;
        transform: rotate(45deg);
      }

      .category-tabs {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: none;
      }

      .category-tabs::-webkit-scrollbar {
        display: none;
      }

      .category-tab {
        flex: 0 0 auto;
        padding: 9px 14px;
        border: 1px solid #e4e7ec;
        border-radius: 999px;
        color: #475467;
        background: white;
        font-size: 12px;
        font-weight: 700;
        transition: .18s ease;
      }

      .category-tab:hover,
      .category-tab.active {
        color: white;
        border-color: #101828;
        background: #101828;
      }

      .catalog-content {
        width: min(100% - 40px, 1440px);
        margin: 0 auto;
        padding: 62px 0 110px;
      }

      .category-block {
        margin-bottom: 90px;
      }

      .category-head {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 30px;
        align-items: end;
        margin-bottom: 28px;
      }

      .category-index {
        display: inline-flex;
        margin-bottom: 10px;
        color: var(--accent);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .16em;
        text-transform: uppercase;
      }

      .category-head h2 {
        margin: 0;
        font-size: clamp(31px,4vw,48px);
        letter-spacing: -.045em;
      }

      .category-head p {
        max-width: 670px;
        margin: 10px 0 0;
        color: #667085;
        line-height: 1.6;
      }

      .category-count {
        min-width: 82px;
        padding: 12px 14px;
        border-radius: 16px;
        color: var(--accent);
        background: var(--soft);
        text-align: center;
        font-weight: 900;
      }

      .idea-grid {
        display: grid;
        grid-template-columns:
          repeat(2,minmax(0,1fr));
        gap: 24px;
      }

      .idea-card {
        min-width: 0;
        overflow: hidden;
        padding: 0;
        border: 1px solid #e4e7ec;
        border-radius: 24px;
        background: white;
        text-align: left;
        box-shadow:
          0 9px 22px rgba(16,24,40,.045);
        transition:
          transform .22s ease,
          box-shadow .22s ease,
          border-color .22s ease;
      }

      .idea-card:hover {
        transform: translateY(-5px);
        border-color: color-mix(
          in srgb,
          var(--accent) 35%,
          #e4e7ec
        );
        box-shadow:
          0 24px 60px rgba(16,24,40,.10);
      }

      .idea-card-body {
        padding: 23px 24px 25px;
      }

      .idea-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
      }

      .idea-no {
        color: var(--accent);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .11em;
      }

      .idea-type {
        padding: 6px 9px;
        border-radius: 999px;
        color: #667085;
        background: #f2f4f7;
        font-size: 10px;
        font-weight: 700;
      }

      .idea-card h3 {
        margin: 13px 0 8px;
        color: #101828;
        font-size: 25px;
        letter-spacing: -.035em;
      }

      .idea-card p {
        min-height: 48px;
        margin: 0;
        color: #667085;
        font-size: 13px;
        line-height: 1.65;
      }

      .idea-card-owner {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 18px;
        color: #475467;
        font-size: 11px;
        font-weight: 700;
      }

      .idea-card-owner i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--accent);
      }

      .idea-preview {
        position: relative;
        height: 245px;
        overflow: hidden;
        color: #101828;
        background:
          linear-gradient(
            145deg,
            var(--soft),
            #fff 72%
          );
      }

      .idea-preview.preview--large {
        height: 500px;
        border-radius: 24px;
      }

      .mock-top {
        height: 38px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 15px;
        border-bottom: 1px solid rgba(16,24,40,.07);
        background: rgba(255,255,255,.72);
      }

      .mock-top b {
        margin-right: auto;
        font-size: 9px;
      }

      .preview--large .mock-top {
        height: 58px;
        padding: 0 25px;
      }

      .preview--large .mock-top b {
        font-size: 14px;
      }

      .mock-top span {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #d0d5dd;
      }

      .mock-top small {
        color: #98a2b3;
        font-size: 8px;
      }

      .mock-top button {
        padding: 4px 8px;
        border: 0;
        border-radius: 6px;
        color: white;
        background: var(--accent);
        font-size: 7px;
      }

      .mock-dashboard {
        display: grid;
        grid-template-columns: 45px 1fr;
        height: calc(100% - 38px);
      }

      .preview--large .mock-dashboard {
        grid-template-columns: 90px 1fr;
        height: calc(100% - 58px);
      }

      .mock-dashboard aside {
        padding: 17px 9px;
        background: #131722;
      }

      .preview--large .mock-dashboard aside {
        padding: 35px 18px;
      }

      .mock-dashboard aside i {
        display: block;
        height: 4px;
        margin-bottom: 11px;
        border-radius: 6px;
        background: rgba(255,255,255,.14);
      }

      .mock-dashboard aside i:first-child {
        background: var(--accent);
      }

      .mock-dashboard main {
        padding: 16px;
      }

      .preview--large .mock-dashboard main {
        padding: 34px;
      }

      .mock-kpis {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 8px;
      }

      .mock-kpis strong {
        min-width: 0;
        padding: 10px;
        overflow: hidden;
        border-radius: 9px;
        color: #475467;
        background: white;
        font-size: 6px;
        white-space: nowrap;
        text-overflow: ellipsis;
        box-shadow:
          0 4px 10px rgba(16,24,40,.05);
      }

      .preview--large .mock-kpis {
        gap: 16px;
      }

      .preview--large .mock-kpis strong {
        padding: 20px;
        border-radius: 15px;
        font-size: 12px;
      }

      .mock-chart {
        height: 82px;
        display: flex;
        align-items: end;
        gap: 6px;
        margin-top: 12px;
        padding: 10px;
        border-radius: 11px;
        background: rgba(255,255,255,.74);
      }

      .preview--large .mock-chart {
        height: 210px;
        gap: 13px;
        margin-top: 20px;
        padding: 22px;
        border-radius: 18px;
      }

      .mock-chart i {
        flex: 1;
        border-radius: 4px 4px 1px 1px;
        background:
          linear-gradient(
            var(--accent),
            color-mix(
              in srgb,
              var(--accent) 30%,
              white
            )
          );
      }

      .mock-rows {
        display: grid;
        gap: 6px;
        margin-top: 10px;
      }

      .mock-rows span {
        height: 10px;
        border-radius: 5px;
        background: white;
      }

      .preview--large .mock-rows {
        gap: 10px;
        margin-top: 20px;
      }

      .preview--large .mock-rows span {
        height: 22px;
      }

      .timeline-layout {
        height: 100%;
        display: grid;
        grid-template-columns: 1.2fr .8fr;
        gap: 12px;
        padding: 18px;
      }

      .timeline-calendar,
      .timeline-steps {
        border-radius: 15px;
        background: rgba(255,255,255,.82);
        box-shadow:
          0 6px 18px rgba(16,24,40,.05);
      }

      .timeline-calendar {
        padding: 15px;
      }

      .calendar-line {
        width: 63%;
        height: 7px;
        border-radius: 10px;
        background: #101828;
      }

      .calendar-line.short {
        width: 32%;
        height: 4px;
        margin-top: 7px;
        background: #d0d5dd;
      }

      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(5,1fr);
        gap: 6px;
        margin-top: 16px;
      }

      .calendar-grid i {
        aspect-ratio: 1;
        border-radius: 6px;
        background: #f2f4f7;
      }

      .calendar-grid i.active {
        background: var(--accent);
      }

      .timeline-steps {
        padding: 16px 12px;
      }

      .timeline-steps div {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 7px 0;
        color: #475467;
        font-size: 6px;
      }

      .timeline-steps i {
        width: 15px;
        height: 15px;
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 50%;
        color: white;
        background: var(--accent);
        font-size: 6px;
        font-style: normal;
      }

      .preview--large .timeline-layout {
        gap: 24px;
        padding: 36px;
      }

      .preview--large .timeline-calendar,
      .preview--large .timeline-steps {
        border-radius: 24px;
      }

      .preview--large .timeline-calendar {
        padding: 28px;
      }

      .preview--large .calendar-grid {
        gap: 12px;
        margin-top: 30px;
      }

      .preview--large .timeline-steps {
        padding: 34px 25px;
      }

      .preview--large .timeline-steps div {
        gap: 15px;
        padding: 15px 0;
        font-size: 12px;
      }

      .preview--large .timeline-steps i {
        width: 28px;
        height: 28px;
        font-size: 10px;
      }

      .map-preview {
        position: absolute;
        inset: 0;
        overflow: hidden;
        background:
          linear-gradient(
            32deg,
            transparent 47%,
            rgba(255,255,255,.8) 48%,
            rgba(255,255,255,.8) 51%,
            transparent 52%
          ),
          linear-gradient(
            145deg,
            transparent 38%,
            rgba(255,255,255,.7) 39%,
            rgba(255,255,255,.7) 43%,
            transparent 44%
          ),
          #dfe9e6;
      }

      .map-grid {
        position: absolute;
        inset: 0;
        opacity: .28;
        background-image:
          linear-gradient(
            rgba(70,90,90,.3) 1px,
            transparent 1px
          ),
          linear-gradient(
            90deg,
            rgba(70,90,90,.3) 1px,
            transparent 1px
          );
        background-size: 32px 32px;
      }

      .pin {
        position: absolute;
        width: 19px;
        height: 19px;
        border: 5px solid white;
        border-radius: 50% 50% 50% 0;
        background: var(--accent);
        box-shadow:
          0 8px 15px rgba(16,24,40,.16);
        transform: rotate(-45deg);
      }

      .pin.p1 { left: 24%; top: 30%; }
      .pin.p2 { left: 66%; top: 23%; }
      .pin.p3 { left: 54%; top: 64%; }

      .map-float {
        position: absolute;
        left: 15px;
        right: 15px;
        bottom: 14px;
        padding: 13px;
        border-radius: 13px;
        background: rgba(255,255,255,.94);
        box-shadow:
          0 12px 30px rgba(16,24,40,.15);
      }

      .map-float b {
        display: block;
        margin-bottom: 6px;
        font-size: 9px;
      }

      .map-float small {
        margin-right: 5px;
        padding: 4px 6px;
        border-radius: 999px;
        color: var(--accent);
        background: var(--soft);
        font-size: 5px;
      }

      .preview--large .pin {
        width: 34px;
        height: 34px;
        border-width: 8px;
      }

      .preview--large .map-float {
        left: 35px;
        right: auto;
        bottom: 34px;
        width: 430px;
        padding: 24px;
        border-radius: 20px;
      }

      .preview--large .map-float b {
        margin-bottom: 13px;
        font-size: 17px;
      }

      .preview--large .map-float small {
        padding: 7px 10px;
        font-size: 10px;
      }

      .kanban {
        height: calc(100% - 38px);
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 8px;
        padding: 14px;
      }

      .kanban-col {
        padding: 10px;
        border-radius: 11px;
        background: rgba(255,255,255,.75);
      }

      .kanban-col strong {
        display: block;
        margin-bottom: 8px;
        overflow: hidden;
        font-size: 6px;
        white-space: nowrap;
      }

      .kanban-col i {
        display: block;
        margin-bottom: 7px;
        border-left: 3px solid var(--accent);
        border-radius: 7px;
        background: white;
        box-shadow:
          0 4px 9px rgba(16,24,40,.06);
      }

      .preview--large .kanban {
        height: calc(100% - 58px);
        gap: 18px;
        padding: 30px;
      }

      .preview--large .kanban-col {
        padding: 20px;
        border-radius: 19px;
      }

      .preview--large .kanban-col strong {
        margin-bottom: 18px;
        font-size: 12px;
      }

      .preview--large .kanban-col i {
        height: 80px !important;
        margin-bottom: 14px;
        border-left-width: 5px;
        border-radius: 12px;
      }

      .studio-layout {
        height: 100%;
        display: grid;
        grid-template-columns: 34px 1fr 75px;
        background: #171922;
      }

      .studio-tools {
        padding: 15px 8px;
        border-right: 1px solid rgba(255,255,255,.07);
      }

      .studio-tools i {
        display: block;
        height: 17px;
        margin-bottom: 8px;
        border-radius: 5px;
        background: rgba(255,255,255,.10);
      }

      .studio-tools i:nth-child(2) {
        background: var(--accent);
      }

      .studio-canvas {
        display: grid;
        place-items: center;
        background:
          radial-gradient(
            circle,
            rgba(255,255,255,.06) 1px,
            transparent 1px
          );
        background-size: 12px 12px;
      }

      .studio-object {
        width: 70%;
        aspect-ratio: 1.5;
        display: grid;
        place-items: center;
        border-radius: 10px;
        color: white;
        background:
          linear-gradient(
            135deg,
            var(--accent),
            #101828
          );
        box-shadow:
          0 20px 35px rgba(0,0,0,.35);
        transform: rotate(-4deg);
      }

      .studio-object span {
        font-size: 8px;
        font-weight: 800;
      }

      .studio-panel {
        padding: 14px 9px;
        border-left: 1px solid rgba(255,255,255,.07);
        color: white;
      }

      .studio-panel b,
      .studio-panel small {
        display: block;
      }

      .studio-panel b {
        margin-bottom: 14px;
        font-size: 7px;
      }

      .studio-panel small {
        margin-bottom: 8px;
        padding: 7px;
        border-radius: 5px;
        color: #d0d5dd;
        background: rgba(255,255,255,.07);
        font-size: 5px;
      }

      .preview--large .studio-layout {
        grid-template-columns: 70px 1fr 180px;
      }

      .preview--large .studio-tools {
        padding: 30px 15px;
      }

      .preview--large .studio-tools i {
        height: 30px;
        margin-bottom: 14px;
      }

      .preview--large .studio-object span {
        font-size: 18px;
      }

      .preview--large .studio-panel {
        padding: 30px 20px;
      }

      .preview--large .studio-panel b {
        font-size: 14px;
      }

      .preview--large .studio-panel small {
        margin-bottom: 14px;
        padding: 13px;
        font-size: 10px;
      }

      .kiosk {
        height: 100%;
        padding: 24px;
        text-align: center;
        background:
          linear-gradient(
            140deg,
            #fff,
            var(--soft)
          );
      }

      .kiosk-logo {
        display: inline-block;
        padding: 7px 10px;
        border-radius: 9px;
        color: white;
        background: var(--accent);
        font-size: 8px;
        font-weight: 900;
      }

      .kiosk h4 {
        margin: 19px 0 15px;
        font-size: 12px;
      }

      .kiosk-actions {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 8px;
      }

      .kiosk-actions button {
        min-height: 70px;
        padding: 8px;
        border: 1px solid rgba(16,24,40,.07);
        border-radius: 12px;
        color: #344054;
        background: white;
        font-size: 6px;
        font-weight: 800;
      }

      .kiosk-actions button:first-child {
        color: white;
        border-color: var(--accent);
        background: var(--accent);
      }

      .kiosk-footer {
        width: 33%;
        height: 5px;
        margin: 19px auto 0;
        border-radius: 10px;
        background: #d0d5dd;
      }

      .preview--large .kiosk {
        padding: 52px;
      }

      .preview--large .kiosk-logo {
        padding: 11px 16px;
        font-size: 14px;
      }

      .preview--large .kiosk h4 {
        margin: 38px 0 26px;
        font-size: 28px;
      }

      .preview--large .kiosk-actions {
        gap: 18px;
      }

      .preview--large .kiosk-actions button {
        min-height: 190px;
        border-radius: 24px;
        font-size: 14px;
      }

      .command {
        height: 100%;
        color: #eef2ff;
        background:
          radial-gradient(
            circle at 75% 10%,
            color-mix(
              in srgb,
              var(--accent) 25%,
              transparent
            ),
            transparent 28%
          ),
          #0c1018;
      }

      .command-head {
        height: 38px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 15px;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }

      .command-head b {
        margin-right: auto;
        font-size: 8px;
      }

      .command-head small {
        color: #98a2b3;
        font-size: 6px;
      }

      .live-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #f04438;
        box-shadow:
          0 0 0 4px rgba(240,68,56,.12);
      }

      .command-grid {
        display: grid;
        grid-template-columns: 1fr 85px;
        height: calc(100% - 38px);
      }

      .command-main {
        padding: 17px;
      }

      .command-main > strong {
        font-size: 7px;
      }

      .command-wave {
        height: 82px;
        margin: 13px 0;
        border-radius: 10px;
        background:
          linear-gradient(
            180deg,
            color-mix(
              in srgb,
              var(--accent) 25%,
              transparent
            ),
            transparent
          ),
          repeating-linear-gradient(
            90deg,
            var(--accent) 0 2px,
            transparent 2px 13px
          );
        opacity: .8;
      }

      .command-status {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 7px;
      }

      .command-status span {
        padding: 8px 5px;
        overflow: hidden;
        border-radius: 7px;
        color: #d0d5dd;
        background: rgba(255,255,255,.06);
        font-size: 5px;
        white-space: nowrap;
      }

      .command-feed {
        padding: 13px 10px;
        border-left: 1px solid rgba(255,255,255,.08);
      }

      .command-feed i {
        display: block;
        height: 26px;
        margin-bottom: 8px;
        border-left: 2px solid var(--accent);
        border-radius: 5px;
        background: rgba(255,255,255,.05);
      }

      .preview--large .command-head {
        height: 64px;
        padding: 0 26px;
      }

      .preview--large .command-head b {
        font-size: 14px;
      }

      .preview--large .command-grid {
        grid-template-columns: 1fr 230px;
        height: calc(100% - 64px);
      }

      .preview--large .command-main {
        padding: 35px;
      }

      .preview--large .command-main > strong {
        font-size: 14px;
      }

      .preview--large .command-wave {
        height: 230px;
        margin: 25px 0;
      }

      .preview--large .command-status {
        gap: 15px;
      }

      .preview--large .command-status span {
        padding: 15px;
        font-size: 10px;
      }

      .preview--large .command-feed {
        padding: 28px 20px;
      }

      .preview--large .command-feed i {
        height: 65px;
        margin-bottom: 14px;
      }

      .mobile-preview {
        height: 100%;
        display: flex;
        align-items: end;
        justify-content: center;
        gap: 13px;
        padding-top: 20px;
        background:
          linear-gradient(140deg,#f8f7ff,var(--soft));
      }

      .phone {
        width: 37%;
        height: 92%;
        padding: 15px 10px 10px;
        border: 5px solid #161922;
        border-radius: 21px 21px 0 0;
        background: white;
        box-shadow:
          0 20px 35px rgba(16,24,40,.13);
      }

      .phone-second {
        height: 80%;
        opacity: .84;
      }

      .phone-notch {
        width: 34%;
        height: 6px;
        margin: -9px auto 13px;
        border-radius: 0 0 7px 7px;
        background: #161922;
      }

      .phone b,
      .phone strong {
        display: block;
        font-size: 7px;
      }

      .phone-hero {
        height: 52px;
        margin: 10px 0;
        border-radius: 9px;
        background:
          linear-gradient(
            135deg,
            var(--accent),
            var(--soft)
          );
      }

      .phone span,
      .phone-list {
        display: block;
        height: 13px;
        margin-bottom: 7px;
        border-radius: 5px;
        color: #475467;
        background: #f2f4f7;
        font-size: 5px;
      }

      .phone button {
        width: 100%;
        padding: 7px;
        border: 0;
        border-radius: 7px;
        color: white;
        background: var(--accent);
        font-size: 5px;
      }

      .preview--large .mobile-preview {
        gap: 32px;
        padding-top: 34px;
      }

      .preview--large .phone {
        width: 28%;
        padding: 28px 20px;
        border-width: 9px;
        border-radius: 36px 36px 0 0;
      }

      .preview--large .phone-notch {
        height: 10px;
        margin: -21px auto 24px;
      }

      .preview--large .phone b,
      .preview--large .phone strong {
        font-size: 14px;
      }

      .preview--large .phone-hero {
        height: 130px;
        margin: 20px 0;
        border-radius: 18px;
      }

      .preview--large .phone span,
      .preview--large .phone-list {
        height: 28px;
        margin-bottom: 13px;
        font-size: 9px;
      }

      .preview--large .phone button {
        padding: 14px;
        border-radius: 12px;
        font-size: 10px;
      }

      .editorial {
        height: 100%;
        display: grid;
        grid-template-columns: .9fr 1.1fr;
        background: #fff;
      }

      .editorial-copy {
        padding: 28px 14px 20px 24px;
      }

      .editorial-copy small {
        color: var(--accent);
        font-size: 5px;
        font-weight: 900;
        letter-spacing: .16em;
      }

      .editorial-copy h3 {
        margin: 12px 0 9px;
        font-family:
          Georgia,
          "Times New Roman",
          serif;
        font-size: 23px;
        line-height: .95;
        letter-spacing: -.05em;
      }

      .editorial-copy p {
        margin: 0;
        color: #667085;
        font-size: 6px;
      }

      .editorial-copy button {
        margin-top: 18px;
        padding: 7px 10px;
        border: 0;
        border-radius: 999px;
        color: white;
        background: #101828;
        font-size: 5px;
      }

      .editorial-image {
        position: relative;
        display: grid;
        place-items: center;
        overflow: hidden;
        background: var(--soft);
      }

      .editorial-shape {
        width: 62%;
        aspect-ratio: .78;
        border-radius: 50% 50% 12px 12px;
        background:
          linear-gradient(
            145deg,
            var(--accent),
            #101828
          );
        box-shadow:
          30px 20px 0
          color-mix(
            in srgb,
            var(--accent) 14%,
            white
          );
        transform: rotate(7deg);
      }

      .editorial-image span {
        position: absolute;
        right: 13px;
        bottom: 12px;
        padding: 6px 8px;
        border-radius: 99px;
        background: white;
        font-size: 5px;
      }

      .preview--large .editorial-copy {
        padding: 70px 30px 50px 55px;
      }

      .preview--large .editorial-copy small {
        font-size: 10px;
      }

      .preview--large .editorial-copy h3 {
        margin: 26px 0 18px;
        font-size: 56px;
      }

      .preview--large .editorial-copy p {
        font-size: 13px;
      }

      .preview--large .editorial-copy button {
        margin-top: 36px;
        padding: 13px 18px;
        font-size: 10px;
      }

      .preview--large .editorial-image span {
        right: 25px;
        bottom: 25px;
        padding: 10px 14px;
        font-size: 10px;
      }

      .ledger {
        height: 100%;
        padding: 17px;
        background:
          linear-gradient(150deg,#fff,var(--soft));
      }

      .ledger-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .ledger-head b {
        font-size: 8px;
      }

      .ledger-head strong {
        color: var(--accent);
        font-size: 6px;
      }

      .ledger-body {
        display: grid;
        grid-template-columns: 1fr 75px;
        gap: 10px;
        margin-top: 14px;
      }

      .ledger-table {
        overflow: hidden;
        border: 1px solid rgba(16,24,40,.06);
        border-radius: 10px;
        background: white;
      }

      .ledger-table div {
        display: grid;
        grid-template-columns: 20px 1fr 35px;
        gap: 6px;
        align-items: center;
        min-height: 31px;
        padding: 5px 8px;
        border-bottom: 1px solid #f2f4f7;
        font-size: 5px;
      }

      .ledger-table div:last-child {
        border-bottom: 0;
      }

      .ledger-table b {
        color: #98a2b3;
      }

      .ledger-table em {
        color: var(--accent);
        font-style: normal;
      }

      .ledger-body aside {
        padding: 12px;
        border-radius: 10px;
        color: white;
        background: #101828;
      }

      .ledger-body aside small,
      .ledger-body aside strong {
        display: block;
      }

      .ledger-body aside small {
        color: #98a2b3;
        font-size: 5px;
      }

      .ledger-body aside strong {
        margin-top: 8px;
        font-size: 18px;
      }

      .ledger-body aside i {
        display: block;
        width: 84%;
        height: 5px;
        margin-top: 19px;
        border-radius: 5px;
        background: var(--accent);
      }

      .preview--large .ledger {
        padding: 38px;
      }

      .preview--large .ledger-head b {
        font-size: 16px;
      }

      .preview--large .ledger-head strong {
        font-size: 12px;
      }

      .preview--large .ledger-body {
        grid-template-columns: 1fr 200px;
        gap: 24px;
        margin-top: 28px;
      }

      .preview--large .ledger-table {
        border-radius: 18px;
      }

      .preview--large .ledger-table div {
        grid-template-columns: 50px 1fr 80px;
        min-height: 78px;
        padding: 10px 22px;
        font-size: 11px;
      }

      .preview--large .ledger-body aside {
        padding: 27px;
        border-radius: 18px;
      }

      .preview--large .ledger-body aside small {
        font-size: 10px;
      }

      .preview--large .ledger-body aside strong {
        margin-top: 18px;
        font-size: 42px;
      }

      .preview--large .ledger-body aside i {
        height: 9px;
        margin-top: 35px;
      }

      .empty-state {
        padding: 90px 20px;
        text-align: center;
        color: #667085;
      }

      .catalog-modal {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: none;
        overflow-y: auto;
        padding: 30px;
        background: rgba(10,14,25,.76);
        backdrop-filter: blur(18px);
      }

      .catalog-modal.open {
        display: block;
      }

      .modal-card {
        width: min(100%, 1280px);
        margin: 0 auto;
        overflow: hidden;
        border-radius: 30px;
        background: #f8f9fb;
        box-shadow:
          0 50px 130px rgba(0,0,0,.38);
      }

      .modal-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        background: #101828;
      }

      .modal-nav strong {
        color: white;
        font-size: 13px;
      }

      .modal-actions {
        display: flex;
        gap: 8px;
      }

      .modal-actions button {
        min-height: 38px;
        padding: 0 14px;
        border: 1px solid rgba(255,255,255,.13);
        border-radius: 11px;
        color: white;
        background: rgba(255,255,255,.08);
        font-size: 11px;
        font-weight: 700;
      }

      .modal-body {
        padding: 32px;
      }

      .modal-title-grid {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 30px;
        align-items: end;
        margin-bottom: 28px;
      }

      .modal-label {
        display: block;
        margin-bottom: 10px;
        color: var(--accent);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .13em;
        text-transform: uppercase;
      }

      .modal-title-grid h2 {
        margin: 0;
        font-size: clamp(38px,6vw,72px);
        line-height: .95;
        letter-spacing: -.055em;
      }

      .modal-title-grid p {
        max-width: 760px;
        margin: 18px 0 0;
        color: #667085;
        font-size: 16px;
        line-height: 1.7;
      }

      .modal-number {
        min-width: 90px;
        color: var(--accent);
        font-size: 38px;
        font-weight: 900;
        letter-spacing: -.04em;
        text-align: right;
      }

      .modal-preview-wrap {
        padding: 18px;
        border: 1px solid #e4e7ec;
        border-radius: 30px;
        background: white;
        box-shadow:
          0 24px 60px rgba(16,24,40,.08);
      }

      .modal-info {
        display: grid;
        grid-template-columns: .9fr 1.1fr;
        gap: 22px;
        margin-top: 24px;
      }

      .info-panel {
        padding: 26px;
        border: 1px solid #e4e7ec;
        border-radius: 22px;
        background: white;
      }

      .info-panel h3 {
        margin: 0 0 12px;
        font-size: 18px;
        letter-spacing: -.02em;
      }

      .info-panel p {
        margin: 0;
        color: #667085;
        font-size: 13px;
        line-height: 1.7;
      }

      .owner-box {
        margin-top: 20px;
        padding: 15px;
        border-radius: 14px;
        color: var(--accent);
        background: var(--soft);
        font-size: 12px;
        font-weight: 800;
      }

      .feature-list {
        display: grid;
        grid-template-columns: repeat(3,1fr);
        gap: 12px;
      }

      .feature-item {
        min-height: 120px;
        padding: 17px;
        border-radius: 16px;
        background: #f8f9fb;
      }

      .feature-item i {
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        margin-bottom: 18px;
        border-radius: 10px;
        color: white;
        background: var(--accent);
        font-size: 10px;
        font-style: normal;
        font-weight: 900;
      }

      .feature-item strong {
        display: block;
        font-size: 12px;
      }

      .feature-item small {
        display: block;
        margin-top: 6px;
        color: #98a2b3;
        font-size: 10px;
        line-height: 1.5;
      }

      .modal-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-top: 24px;
        padding: 22px 26px;
        border-radius: 22px;
        color: white;
        background: #101828;
      }

      .modal-footer div strong {
        display: block;
        font-size: 16px;
      }

      .modal-footer div span {
        display: block;
        margin-top: 5px;
        color: #98a2b3;
        font-size: 11px;
      }

      .modal-footer button {
        min-height: 46px;
        padding: 0 18px;
        border: 0;
        border-radius: 13px;
        color: #101828;
        background: white;
        font-size: 11px;
        font-weight: 800;
      }

      .catalog-footer {
        padding: 35px 20px 50px;
        border-top: 1px solid #e4e7ec;
        color: #667085;
        background: white;
        text-align: center;
        font-size: 11px;
      }

      @media (max-width: 1000px) {
        .catalog-hero {
          grid-template-columns: 1fr;
        }

        .hero-display {
          min-height: 430px;
        }

        .idea-grid {
          grid-template-columns: 1fr;
        }

        .modal-info {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 700px) {
        .catalog-nav {
          height: 62px;
          padding: 0 16px;
        }

        .catalog-private {
          font-size: 0;
        }

        .catalog-tools-wrap {
          top: 62px;
        }

        .catalog-hero,
        .catalog-tools,
        .catalog-content {
          width: min(100% - 24px,1440px);
        }

        .catalog-hero {
          padding-top: 48px;
        }

        .catalog-hero h1 {
          font-size: 50px;
        }

        .catalog-hero p {
          font-size: 15px;
        }

        .hero-stats {
          gap: 18px;
        }

        .hero-stats strong {
          font-size: 23px;
        }

        .hero-display {
          min-height: 330px;
        }

        .hero-window {
          inset: 20px 0 0 15px;
        }

        .hero-floating.one {
          width: 165px;
        }

        .hero-floating.two {
          width: 145px;
          right: -5px;
        }

        .category-head {
          grid-template-columns: 1fr;
        }

        .category-count {
          display: none;
        }

        .catalog-modal {
          padding: 0;
        }

        .modal-card {
          min-height: 100vh;
          border-radius: 0;
        }

        .modal-body {
          padding: 20px 14px 30px;
        }

        .modal-title-grid {
          grid-template-columns: 1fr;
        }

        .modal-number {
          display: none;
        }

        .idea-preview.preview--large {
          height: 360px;
        }

        .feature-list {
          grid-template-columns: 1fr;
        }

        .modal-footer {
          align-items: stretch;
          flex-direction: column;
        }

        .preview--large .studio-layout {
          grid-template-columns: 45px 1fr 100px;
        }

        .preview--large .command-grid {
          grid-template-columns: 1fr 110px;
        }
      }
    </style>

    <div class="catalog-shell">
      <nav class="catalog-nav">
        <div class="catalog-brand">
          <div class="catalog-logo">I</div>
          <div>
            <strong>IMAI Project Catalog</strong>
            <small>Custom Software & Digital Products</small>
          </div>
        </div>

        <div class="catalog-private">
          Private client presentation
        </div>
      </nav>

      <header class="catalog-hero">
        <div>
          <h1>
            100 ideas.
            <br>
            <span>Built differently.</span>
          </h1>

          <p>
            Koleksi idea custom software untuk pemilik perniagaan.
            Setiap konsep boleh dibina sebagai sistem milik syarikat
            sendiri — dengan workflow, branding dan pengalaman pengguna
            yang disesuaikan kepada operasi sebenar.
          </p>

          <div class="hero-stats">
            <div>
              <strong>100</strong>
              <span>Project concepts</span>
            </div>
            <div>
              <strong>10</strong>
              <span>Business categories</span>
            </div>
            <div>
              <strong>10+</strong>
              <span>UI/UX directions</span>
            </div>
          </div>
        </div>

        <div class="hero-display">
          <div class="hero-window">
            <div class="hero-window-bar">
              <i></i><i></i><i></i>
            </div>

            <div class="hero-window-body">
              <div class="hero-side">
                <i></i><i></i><i></i><i></i><i></i>
              </div>

              <div class="hero-main">
                <div class="hero-main-title"></div>

                <div class="hero-kpi-row">
                  <div></div>
                  <div></div>
                  <div></div>
                </div>

                <div class="hero-chart">
                  <i style="height:36%"></i>
                  <i style="height:55%"></i>
                  <i style="height:43%"></i>
                  <i style="height:76%"></i>
                  <i style="height:64%"></i>
                  <i style="height:92%"></i>
                  <i style="height:83%"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="hero-floating one">
            <b>Business-first software</b>
            <strong>Custom</strong>
            <small>Bukan template generik.</small>
          </div>

          <div class="hero-floating two">
            <b>Visual directions</b>
            <strong>10+</strong>
            <small>Dashboard, mobile, kiosk & more.</small>
          </div>
        </div>
      </header>

      <div class="catalog-tools-wrap">
        <div class="catalog-tools">
          <div class="search-box">
            <span class="search-icon"></span>
            <input
              id="catalogSearch"
              type="search"
              placeholder="Cari idea, jenis perniagaan atau fungsi..."
              autocomplete="off"
            >
          </div>

          <div
            class="category-tabs"
            id="categoryTabs"
          ></div>
        </div>
      </div>

      <main
        class="catalog-content"
        id="catalogContent"
      ></main>

      <footer class="catalog-footer">
        IMAI Private Project Catalog ·
        Custom software concepts for client presentation.
      </footer>
    </div>

    <div
      class="catalog-modal"
      id="catalogModal"
      aria-hidden="true"
    >
      <div
        class="modal-card"
        id="modalCard"
      ></div>
    </div>
  `;

  const tabsElement =
    document.getElementById("categoryTabs") as HTMLElement;

  const contentElement =
    document.getElementById("catalogContent") as HTMLElement;

  const searchElement =
    document.getElementById(
      "catalogSearch",
    ) as HTMLInputElement;

  const modalElement =
    document.getElementById("catalogModal") as HTMLElement;

  const modalCard =
    document.getElementById("modalCard") as HTMLElement;

  if (
    !tabsElement ||
    !contentElement ||
    !searchElement ||
    !modalElement ||
    !modalCard
  ) {
    throw new Error(
      "Catalog UI elements missing",
    );
  }

  let activeCategory = "ALL";
  let searchQuery = "";

  function renderTabs(): void {
    tabsElement.innerHTML = [
      `
        <button
          class="category-tab ${
            activeCategory === "ALL"
              ? "active"
              : ""
          }"
          data-category="ALL"
        >
          Semua · 100
        </button>
      `,
      ...categorySeeds.map(
        (category) => `
          <button
            class="category-tab ${
              activeCategory === category.name
                ? "active"
                : ""
            }"
            data-category="${escapeHtml(
              category.name,
            )}"
          >
            ${escapeHtml(category.short)}
          </button>
        `,
      ),
    ].join("");

    tabsElement
      .querySelectorAll<HTMLButtonElement>(
        "[data-category]",
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            activeCategory =
              button.dataset.category ??
              "ALL";

            renderTabs();
            renderIdeas();

            window.scrollTo({
              top:
                document.querySelector(
                  ".catalog-tools-wrap",
                )?.getBoundingClientRect()
                  .bottom
                  ? window.scrollY +
                    (
                      document.querySelector(
                        ".catalog-tools-wrap",
                      ) as HTMLElement
                    ).getBoundingClientRect()
                      .bottom
                  : 0,
              behavior: "smooth",
            });
          },
        );
      });
  }

  function visibleIdeas(): CatalogIdea[] {
    return ideas.filter((idea) => {
      if (
        activeCategory !== "ALL" &&
        idea.category !== activeCategory
      ) {
        return false;
      }

      const q =
        searchQuery.trim().toLowerCase();

      if (!q) {
        return true;
      }

      const haystack = [
        idea.title,
        idea.category,
        idea.summary,
        idea.owner,
        ...idea.features,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }

  function renderIdeas(): void {
    const filtered = visibleIdeas();

    if (!filtered.length) {
      contentElement.innerHTML = `
        <div class="empty-state">
          <h2>Tiada idea ditemui.</h2>
          <p>
            Cuba perkataan lain atau pilih kategori berbeza.
          </p>
        </div>
      `;
      return;
    }

    const groups =
      categorySeeds
        .map((category) => ({
          category,
          ideas: filtered.filter(
            (idea) =>
              idea.category === category.name,
          ),
        }))
        .filter(
          (group) => group.ideas.length > 0,
        );

    contentElement.innerHTML = groups
      .map(
        (group, groupIndex) => `
          <section
            class="category-block"
            style="
              --accent:${group.category.accent};
              --soft:${group.category.soft}
            "
          >
            <header class="category-head">
              <div>
                <span class="category-index">
                  Category ${String(
                    categorySeeds.indexOf(
                      group.category,
                    ) + 1,
                  ).padStart(2, "0")}
                </span>

                <h2>
                  ${escapeHtml(
                    group.category.name,
                  )}
                </h2>

                <p>
                  ${escapeHtml(
                    group.category.description,
                  )}
                </p>
              </div>

              <div class="category-count">
                ${group.ideas.length}
                <small
                  style="
                    display:block;
                    margin-top:2px;
                    font-size:9px;
                    font-weight:700;
                  "
                >
                  IDEAS
                </small>
              </div>
            </header>

            <div class="idea-grid">
              ${group.ideas
                .map(
                  (idea) => `
                    <button
                      class="idea-card"
                      data-idea-id="${idea.id}"
                      style="
                        --accent:${idea.accent};
                        --soft:${idea.soft}
                      "
                    >
                      ${previewMarkup(idea)}

                      <div class="idea-card-body">
                        <div class="idea-card-top">
                          <span class="idea-no">
                            IDEA ${ideaNumber(
                              idea.id,
                            )}
                          </span>

                          <span class="idea-type">
                            ${
                              visualKinds.indexOf(
                                idea.kind,
                              ) + 1
                            }
                            ·
                            ${escapeHtml(
                              idea.kind.toUpperCase(),
                            )}
                          </span>
                        </div>

                        <h3>
                          ${escapeHtml(
                            idea.title,
                          )}
                        </h3>

                        <p>
                          ${escapeHtml(
                            idea.summary,
                          )}
                        </p>

                        <div class="idea-card-owner">
                          <i></i>
                          ${escapeHtml(
                            idea.owner,
                          )}
                        </div>
                      </div>
                    </button>
                  `,
                )
                .join("")}
            </div>
          </section>
        `,
      )
      .join("");

    contentElement
      .querySelectorAll<HTMLButtonElement>(
        "[data-idea-id]",
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const id = Number(
              button.dataset.ideaId,
            );

            openIdea(id);
          },
        );
      });
  }

  function updateIdeaUrl(
    ideaId: number | null,
  ): void {
    const url = new URL(
      window.location.href,
    );

    if (ideaId) {
      url.searchParams.set(
        "idea",
        String(ideaId),
      );
    } else {
      url.searchParams.delete("idea");
    }

    history.replaceState(
      {},
      "",
      url.toString(),
    );
  }

  function openIdea(id: number): void {
    const idea = ideas.find(
      (item) => item.id === id,
    );

    if (!idea) {
      return;
    }

    modalCard.style.setProperty(
      "--accent",
      idea.accent,
    );

    modalCard.style.setProperty(
      "--soft",
      idea.soft,
    );

    modalCard.innerHTML = `
      <div class="modal-nav">
        <strong>
          IMAI Project Catalog
        </strong>

        <div class="modal-actions">
          <button id="copyIdeaLink">
            Copy link
          </button>

          <button id="closeIdea">
            Close
          </button>
        </div>
      </div>

      <div class="modal-body">
        <div class="modal-title-grid">
          <div>
            <span class="modal-label">
              ${escapeHtml(
                idea.category,
              )}
            </span>

            <h2>
              ${escapeHtml(
                idea.title,
              )}
            </h2>

            <p>
              ${escapeHtml(
                idea.summary,
              )}
            </p>
          </div>

          <div class="modal-number">
            ${ideaNumber(idea.id)}
          </div>
        </div>

        <div class="modal-preview-wrap">
          ${previewMarkup(
            idea,
            true,
          )}
        </div>

        <div class="modal-info">
          <section class="info-panel">
            <h3>
              Untuk siapa?
            </h3>

            <p>
              Konsep ini sesuai untuk
              <strong>
                ${escapeHtml(
                  idea.owner,
                )}
              </strong>.
              Ia dibina sebagai custom software
              milik perniagaan sendiri dan tidak
              perlu menjadi SaaS awam.
            </p>

            <div class="owner-box">
              Target owner:
              ${escapeHtml(
                idea.owner,
              )}
            </div>
          </section>

          <section class="info-panel">
            <h3>
              Fungsi utama
            </h3>

            <div class="feature-list">
              ${idea.features
                .map(
                  (feature, index) => `
                    <div class="feature-item">
                      <i>
                        ${index + 1}
                      </i>

                      <strong>
                        ${escapeHtml(
                          feature,
                        )}
                      </strong>

                      <small>
                        Modul ini boleh disesuaikan
                        mengikut workflow sebenar
                        syarikat.
                      </small>
                    </div>
                  `,
                )
                .join("")}
            </div>
          </section>
        </div>

        <div class="modal-footer">
          <div>
            <strong>
              Idea ${ideaNumber(
                idea.id,
              )} ·
              ${escapeHtml(
                idea.title,
              )}
            </strong>

            <span>
              Simpan nombor idea ini dan bincangkan
              versi yang sesuai untuk perniagaan anda.
            </span>
          </div>

          <button id="copyIdeaName">
            Copy idea name
          </button>
        </div>
      </div>
    `;

    modalElement.classList.add("open");
    modalElement.setAttribute(
      "aria-hidden",
      "false",
    );

    document.body.style.overflow =
      "hidden";

    updateIdeaUrl(id);

    document
      .getElementById("closeIdea")
      ?.addEventListener(
        "click",
        closeIdea,
      );

    document
      .getElementById("copyIdeaLink")
      ?.addEventListener(
        "click",
        async () => {
          try {
            await navigator.clipboard.writeText(
              window.location.href,
            );

            const button =
              document.getElementById(
                "copyIdeaLink",
              );

            if (button) {
              button.textContent =
                "Copied";
            }
          } catch {
            // Clipboard permission may be unavailable.
          }
        },
      );

    document
      .getElementById("copyIdeaName")
      ?.addEventListener(
        "click",
        async () => {
          try {
            await navigator.clipboard.writeText(
              `Idea ${ideaNumber(
                idea.id,
              )} — ${idea.title}`,
            );

            const button =
              document.getElementById(
                "copyIdeaName",
              );

            if (button) {
              button.textContent =
                "Copied";
            }
          } catch {
            // Clipboard permission may be unavailable.
          }
        },
      );
  }

  function closeIdea(): void {
    modalElement.classList.remove(
      "open",
    );

    modalElement.setAttribute(
      "aria-hidden",
      "true",
    );

    document.body.style.overflow = "";
    updateIdeaUrl(null);
  }

  searchElement.addEventListener(
    "input",
    () => {
      searchQuery =
        searchElement.value;
      renderIdeas();
    },
  );

  modalElement.addEventListener(
    "click",
    (event) => {
      if (
        event.target === modalElement
      ) {
        closeIdea();
      }
    },
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        modalElement.classList.contains(
          "open",
        )
      ) {
        closeIdea();
      }
    },
  );

  renderTabs();
  renderIdeas();

  const initialIdea = Number(
    new URL(
      window.location.href,
    ).searchParams.get("idea"),
  );

  if (
    Number.isInteger(initialIdea) &&
    initialIdea >= 1 &&
    initialIdea <= ideas.length
  ) {
    openIdea(initialIdea);
  }
}

export { renderCatalogPage };
