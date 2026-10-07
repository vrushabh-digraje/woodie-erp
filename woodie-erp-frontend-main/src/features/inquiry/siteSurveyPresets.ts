export type LocationCategory = {
  id: string;
  name: string;
  locations: string[];
};

export const LOCATION_CATEGORIES: LocationCategory[] = [
  {
    id: "residential",
    name: "Residential / Living",
    locations: [
      "Living Room / TV Hall",
      "Master Bedroom",
      "Bedroom",
      "Kitchen",
      "Dining Area",
      "Bathroom / Toilet",
      "Majlis",
      "Balcony / Terrace",
      "Entrance Foyer",
    ],
  },
  {
    id: "commercial",
    name: "Commercial & Office",
    locations: [
      "Reception / Lobby",
      "CEO / Executive Office",
      "Manager Cabin",
      "Meeting / Conference Room",
      "Workstation Area",
      "VIP Room / Suite",
      "Pantry",
    ],
  },
  {
    id: "common",
    name: "Common & Services",
    locations: [
      "Corridor / Hallway",
      "Store Room",
      "Laundry Room",
      "Facade / Exterior",
    ],
  },
];

export type ScopePreset = {
  id: string;
  label: string;
  defaultUnit: string;
  defaultMaterial: string;
  preparationSteps: string[];
};

export const SCOPE_PRESETS: ScopePreset[] = [
  {
    id: "painting",
    label: "Painting & Finishing",
    defaultUnit: "m2",
    defaultMaterial: "High-quality washable emulsion / PU finish",
    preparationSteps: [
      "• Surface preparation and cleaning of existing substrate.",
      "• Application of suitable primer and putty finish.",
      "• Complete protection of adjacent walls, floors & surrounding areas (masking).",
      "• Repainting in approved shade with touch-up and final finishing.",
    ],
  },
  {
    id: "joinery",
    label: "Joinery & Cabinetry",
    defaultUnit: "Nos",
    defaultMaterial: "Melamine MDF / Solid wood veneer with PU finish",
    preparationSteps: [
      "• Accurate on-site measurement and shop-drawing verification.",
      "• Complete fabrication as per approved design and sample.",
      "• Fitting of internal shelves, soft-close hardware, and shutters.",
      "• Transportation, on-site installation, and final alignment.",
    ],
  },
  {
    id: "mirrors",
    label: "Bronze / Decorative Mirrors",
    defaultUnit: "Nos",
    defaultMaterial: "Bronze tinted mirror with 1 cm bevelled edge",
    preparationSteps: [
      "• Site verification of wall levels, alignment, and dimensions.",
      "• 1 cm bevelled edge on all sides with matte metal profile/frame.",
      "• Direct fixing with high-strength structural adhesive and safety backing.",
      "• Complete finishing, touch-up, and alignment as required.",
    ],
  },
  {
    id: "wall-beading",
    label: "Decorative Wall Beading",
    defaultUnit: "Nos",
    defaultMaterial: "Decorative profile molding with leaf cutouts",
    preparationSteps: [
      "• Supply of decorative profiles and cutout details.",
      "• Primer & putty finish to beading and cutout joints.",
      "• Direct laser-aligned pasting / fixing on wall.",
      "• Final touch-up and surface finish preparation.",
    ],
  },
  {
    id: "metal-artwork",
    label: "Metal Artwork & Refurbishment",
    defaultUnit: "Nos",
    defaultMaterial: "Antique gold PU finish & mounting hardware",
    preparationSteps: [
      "• Surface preparation and degreasing of existing metal artwork.",
      "• Repainting with high-quality antique gold finish.",
      "• Touch-up and final finishing as required.",
      "• Transportation/handling and complete installation at site.",
    ],
  },
  {
    id: "flooring-tiling",
    label: "Flooring & Tiling",
    defaultUnit: "m2",
    defaultMaterial: "Porcelain tiles / Epoxy flooring",
    preparationSteps: [
      "• Subfloor level checking and surface preparation.",
      "• Waterproofing / self-leveling underlayment application where required.",
      "• Tile fixing with leveling spacers and epoxy grout joint filling.",
      "• Skirting alignment and post-installation deep cleaning.",
    ],
  },
  {
    id: "waterproofing",
    label: "Waterproofing & Wet Areas",
    defaultUnit: "m2",
    defaultMaterial: "Polyurethane liquid membrane / Bitumen sheet",
    preparationSteps: [
      "• Surface crack filling and corner fillet preparation.",
      "• Application of heavy-duty waterproofing membrane up to specified height.",
      "• 24-hour water ponding leak test before final finish.",
      "• Protective screed layer application.",
    ],
  },
  {
    id: "custom",
    label: "Custom / General Work",
    defaultUnit: "LS",
    defaultMaterial: "",
    preparationSteps: [
      "• On-site survey, measurement, and scope verification.",
      "• Surface preparation and necessary preliminary works.",
      "• Supply, installation, and final finishing as required.",
    ],
  },
];

export const SUPPLY_OPTIONS = [
  "Woodie Supply",
  "Supplied by Client",
  "Painting to be Done by Client",
  "Tiles to be Supplied by Client",
  "As per Approved Sample",
];

export const COMMON_DIMENSION_PRESETS = [
  "60 × 280cm (2 Nos)",
  "30 × 280cm (1 No)",
  "2.5m L × 1.0m H",
  "3.0m W × 80cm H × 50cm D",
  "24mm × 24mm Profile",
];

export const TRADE_MATERIALS: Record<string, string[]> = {
  mirrors: [
    "Bronze tinted mirror with 1 cm bevelled edge",
    "Silver float mirror (6mm thickness)",
    "Organic shape with LED backlit provision",
    "Matte bronze metal profile / frame",
    "Grey tinted decorative mirror",
  ],
  joinery: [
    "Cabinet in Laminate Finish with Granite Top",
    "Natural wood veneer with PU finish",
    "Antique Gold PU Paint finish",
    "2 cm thick solid polished granite countertop",
    "Built-in drawers with soft-close slides",
  ],
  painting: [
    "Repainting in approved Off-White / Beige shade",
    "Powder-coated aluminum frame repaint",
    "Special etching metal primer & final topcoat",
    "High-grade washable matt emulsion",
  ],
  "wall-beading": [
    "24 mm × 24 mm decorative profile beading",
    "Leaf-shaped CNC cutout details",
    "Primer & putty finish to beading joints",
    "Direct wall pasting with laser alignment",
  ],
  "metal-artwork": [
    "Antique gold PU finish on metal artwork",
    "Matte black powder coat finish",
    "Brushed brass finish",
  ],
  "flooring-tiling": [
    "Tile cladding with 45° cutting (Tiles by Client)",
    "Porcelain tiles with epoxy grout",
    "Anti-skid ceramic tiles",
  ],
  waterproofing: [
    "Polyurethane liquid waterproofing membrane",
    "Cementitious 2-coat waterproofing",
    "24-hour water ponding leak test",
  ],
};

