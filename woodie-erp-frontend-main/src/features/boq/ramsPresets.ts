export type RamsControlMeasure = {
  title: string;
  desc: string;
};

export type RamsMethodologyPhase = {
  phase: string;
  steps: string[];
};

export type RamsPreset = {
  key: string;
  title: string;
  workTypeLower: string;
  workTypeCap: string;
  hazards: string[];
  controlMeasures: RamsControlMeasure[];
  mosScope: string;
  methodology: RamsMethodologyPhase[];
  safetyPrecautions: string[];
};

export type RamsPayload = {
  docType?: "risk_assessment" | "mos" | "combined";
  locationName?: string;
  presetKey?: string;
  workTypeLower?: string;
  workTypeCap?: string;
  hazards?: string[];
  controlMeasures?: RamsControlMeasure[];
  mosScope?: string;
  methodology?: RamsMethodologyPhase[];
  safetyPrecautions?: string[];
};

export const RAMS_PRESETS: Record<string, RamsPreset> = {
  glass_film: {
    key: "glass_film",
    title: "Glass Film Installation",
    workTypeLower: "glass film installation",
    workTypeCap: "Glass Film",
    hazards: [
      "Sharp tools such as blades and knives that are used during the cutting of the film can cause cuts and injuries to personnel.",
      "Slips and falls can occur due to the use of water and soapy solutions during the installation process.",
      "The film material can cause breathing difficulties and skin irritation to personnel with allergies.",
    ],
    controlMeasures: [
      {
        title: "Personnel safety",
        desc: "We will ensure that all personnel involved in the installation are adequately trained and competent to carry out the work. We will also provide them with the necessary PPE to protect them from potential hazards.",
      },
      {
        title: "Slip and fall prevention",
        desc: "We will ensure that the work area is kept clean and clear of any obstructions to minimize the risk of slips and falls. Non-slip mats will also be used to provide a stable and secure work surface.",
      },
      {
        title: "Health hazards",
        desc: "We will provide adequate ventilation in the work area to minimize the inhalation of any fumes from the installation process. Personnel with allergies or sensitivities will be advised to avoid contact with the film material and will be provided with appropriate PPE if required.",
      },
    ],
    mosScope:
      "The scope of work includes the installation of a glass film on the interior side of the glass windows. The purpose of the glass film is to provide privacy, reduce heat and glare, and improve the overall aesthetics of the building.",
    methodology: [
      {
        phase: "Preparation",
        steps: [
          "Clear the area around the windows to ensure that there is sufficient space for the installation.",
          "Clean the glass surface thoroughly to ensure that there are no dust or debris particles that may affect the adhesion of the film.",
        ],
      },
      {
        phase: "Measuring and Cutting",
        steps: [
          "Measure the dimensions of the glass surface to determine the required size of the film.",
          "Cut the film using a sharp blade to the exact size required.",
        ],
      },
      {
        phase: "Application",
        steps: [
          "Spray the glass surface with a solution of soapy water to facilitate the application of the film.",
          "Peel off the backing paper from the film to reveal the adhesive side.",
          "Carefully apply the film to the glass surface, ensuring that there are no air bubbles or wrinkles.",
          "Use a squeegee to remove any excess water and air from underneath the film.",
        ],
      },
      {
        phase: "Final Inspection",
        steps: [
          "Inspect the installed film for any defects or issues.",
          "Check that the edges of the film are securely attached to the glass surface.",
          "Clean the glass surface of any residual water or debris.",
        ],
      },
    ],
    safetyPrecautions: [
      "Ensure that all personnel involved in the installation wear appropriate Personal Protective Equipment (PPE) including gloves and eye protection.",
      "Use caution when working with sharp blades and handling the film to avoid injury.",
      "Keep the work area clean and clear of any obstructions to avoid tripping hazards.",
    ],
  },

  joinery: {
    key: "joinery",
    title: "Joinery & Wood Works",
    workTypeLower: "joinery and wood works installation",
    workTypeCap: "Joinery & Wood Works",
    hazards: [
      "Sharp cutting tools, power machinery (saws, drills, routers) causing cuts or entanglement injuries.",
      "Manual handling of heavy wooden panels, doors, or cabinetry causing strain or impact injuries.",
      "Inhalation of wood dust and chemical fumes from lacquers, wood glues, and sealants.",
    ],
    controlMeasures: [
      {
        title: "Personnel safety",
        desc: "We will ensure that all carpenters are trained and certified to operate power tools. Mandatory PPE including cut-resistant gloves, safety goggles, and steel-toe boots will be provided and enforced.",
      },
      {
        title: "Material handling & slip prevention",
        desc: "Two-person lift protocols will be observed for heavy wooden panels. Walkways will be kept clear of wood off-cuts and power cords, with floor protection laid across the work area.",
      },
      {
        title: "Health & dust control",
        desc: "Dust extraction attachments will be fitted to power tools, and adequate ventilation will be maintained. Technicians will wear N95 dust masks and eye protection during cutting and sanding.",
      },
    ],
    mosScope:
      "The scope of work includes the precision installation, fixing, and finishing of custom joinery, cabinetry, doors, and wooden panels according to approved architectural specifications.",
    methodology: [
      {
        phase: "Preparation",
        steps: [
          "Inspect the work area and lay corrugated protective sheets over finished floors.",
          "Verify wall levels, plumb lines, and mounting points prior to commencing installation.",
        ],
      },
      {
        phase: "Measuring and Cutting",
        steps: [
          "Cross-check on-site dimensions against approved shop drawings.",
          "Conduct precision trimming and adjustments in designated dust-controlled cutting areas.",
        ],
      },
      {
        phase: "Application",
        steps: [
          "Securely anchor sub-frames, base units, and carcasses using approved fasteners.",
          "Mount panels, doors, and architectural hardware with uniform gaps and alignments.",
          "Apply color-matched edge trims, fillers, and perimeter sealants.",
        ],
      },
      {
        phase: "Final Inspection",
        steps: [
          "Test all hinges, drawer runners, and hardware for smooth, quiet operation.",
          "Inspect all wooden surfaces for any scratches, gaps, or misalignments.",
          "Clean all joinery surfaces and vacuum the work area thoroughly.",
        ],
      },
    ],
    safetyPrecautions: [
      "Ensure all personnel wear safety shoes, cut-resistant gloves, and protective eyewear.",
      "Disconnect power tools from power sources before changing blades or bits.",
      "Keep fire extinguishers accessible and work areas clear of tripping hazards.",
    ],
  },

  gypsum: {
    key: "gypsum",
    title: "Gypsum Partitions & False Ceilings",
    workTypeLower: "gypsum partition and ceiling installation",
    workTypeCap: "Gypsum Partitions & Ceilings",
    hazards: [
      "Work at height using ladders or mobile scaffold towers with risks of falls.",
      "Sharp edges of metal studs, tracks, and utility blades causing lacerations.",
      "Airborne gypsum dust during cutting, sanding, and joint compound application.",
    ],
    controlMeasures: [
      {
        title: "Working at height safety",
        desc: "All mobile scaffolds and ladders will be inspected prior to use. Scaffold wheels will be locked, outriggers deployed, and safety guardrails installed.",
      },
      {
        title: "Sharp tools & material handling",
        desc: "Personnel will wear heavy-duty cut-resistant gloves when handling metal studs, GI channels, and utility knives.",
      },
      {
        title: "Dust & respiratory protection",
        desc: "Adequate ventilation will be maintained in closed rooms. Dust masks and goggles will be mandatory during gypsum cutting and sanding.",
      },
    ],
    mosScope:
      "The scope of work includes installing galvanized steel framing, gypsum board cladding, acoustic insulation, joint taping, and surface smoothing for partitions and false ceilings.",
    methodology: [
      {
        phase: "Preparation",
        steps: [
          "Mark partition and ceiling layout lines on floors and soffits using laser levels.",
          "Ensure ceiling voids are inspected for MEP clearances before framing.",
        ],
      },
      {
        phase: "Measuring and Framing",
        steps: [
          "Fix floor and ceiling metal tracks with approved anchors at regular centers.",
          "Erect vertical metal studs and ceiling channels at specified grid intervals.",
        ],
      },
      {
        phase: "Boarding & Jointing",
        steps: [
          "Install gypsum boards with staggered joints, fastening with drywall screws.",
          "Apply fiberglass joint tape and embed with multiple coats of joint compound.",
        ],
      },
      {
        phase: "Final Inspection",
        steps: [
          "Check wall and ceiling surfaces for flatness, plumb, and seamless jointing.",
          "Sand surfaces smooth and ready for primer and paint application.",
          "Clean the site and remove all drywall off-cuts and debris.",
        ],
      },
    ],
    safetyPrecautions: [
      "Ensure full PPE including hard hats, safety goggles, gloves, and safety shoes.",
      "Never overload ladders or stand on the top rungs.",
      "Keep floor areas clear of metal scraps and screw hazards.",
    ],
  },

  painting: {
    key: "painting",
    title: "Painting & Surface Finishes",
    workTypeLower: "interior painting and surface finishing",
    workTypeCap: "Painting & Wall Finishes",
    hazards: [
      "Slip hazards from spilled paint, cleaning water, or wet drop cloths.",
      "Fumes and volatile organic compounds (VOC) from primers, paints, and thinners.",
      "Work at height on step ladders when painting high walls and ceilings.",
    ],
    controlMeasures: [
      {
        title: "Slip prevention & floor protection",
        desc: "Heavy-duty canvas drop cloths and plastic sheets will be securely taped down across all work zones to prevent slipping and protect existing finishes.",
      },
      {
        title: "Health & ventilation",
        desc: "Work areas will be well-ventilated with fans or open windows. Low-VOC and eco-friendly paint products will be utilized wherever specified.",
      },
      {
        title: "Height safety",
        desc: "Step ladders with rubber non-slip feet will be placed strictly on flat, dry surfaces. 3-point contact will be maintained at all times.",
      },
    ],
    mosScope:
      "The scope of work includes surface preparation, crack filling, primer application, and finish painting for interior walls, ceilings, and architectural trims.",
    methodology: [
      {
        phase: "Preparation",
        steps: [
          "Cover and protect furniture, floors, switches, and architectural trim with masking tape and drop cloths.",
          "Scrape loose paint, sand rough surfaces, and fill cracks/holes with interior filler.",
        ],
      },
      {
        phase: "Priming",
        steps: [
          "Apply an approved acrylic primer coat to seal surfaces and ensure optimal paint adhesion.",
          "Allow primer to dry completely before applying top coats.",
        ],
      },
      {
        phase: "Application",
        steps: [
          "Apply the first coat of approved paint evenly using professional rollers and cut-in brushes.",
          "Allow recommended drying time between coats and apply the final finish coat for uniform color and sheen.",
        ],
      },
      {
        phase: "Final Inspection",
        steps: [
          "Inspect walls and ceilings under good lighting for even coverage, lap marks, or touch-up needs.",
          "Remove masking tape cleanly without peeling paint edges.",
          "Clean and restore the work area to its original condition.",
        ],
      },
    ],
    safetyPrecautions: [
      "Wear protective overalls, gloves, and safety goggles during paint application.",
      "Keep paint cans sealed tightly when not in immediate use.",
      "Ensure proper disposal of paint waste and rags in accordance with safety norms.",
    ],
  },

  fitout: {
    key: "fitout",
    title: "Interior Fit-Out & Installation",
    workTypeLower: "interior fit-out installation work",
    workTypeCap: "Interior Fit-Out",
    hazards: [
      "Sharp tools and power machinery during installation activities.",
      "Slips, trips, and falls from tools, materials, or cords on the floor.",
      "Dust and noise exposure during drilling, fixing, and surface preparations.",
    ],
    controlMeasures: [
      {
        title: "Personnel safety",
        desc: "All technicians are trained and equipped with mandatory PPE (safety shoes, high-vis vests, cut-resistant gloves, and eye protection).",
      },
      {
        title: "Housekeeping & trip prevention",
        desc: "Work areas are kept organized, clean, and free of clutter. Power cables are safely routed away from primary walkways.",
      },
      {
        title: "Health & environmental controls",
        desc: "Work areas are properly ventilated, and noise-intensive operations are scheduled during authorized building working hours.",
      },
    ],
    mosScope:
      "The scope of work includes executing interior fit-out, architectural installations, and technical finishing works in strict accordance with project specifications.",
    methodology: [
      {
        phase: "Preparation",
        steps: [
          "Protect existing floors, walls, and tenant assets within the work zone.",
          "Inspect site readiness, substrate stability, and verified dimensions.",
        ],
      },
      {
        phase: "Measuring & Setting Out",
        steps: [
          "Verify setting-out marks and datum levels using laser measuring equipment.",
          "Pre-check material specifications and client approvals prior to mounting.",
        ],
      },
      {
        phase: "Installation & Execution",
        steps: [
          "Carry out installations systematically adhering to engineering best practices.",
          "Secure all fixtures, fittings, and components using approved structural fixings.",
        ],
      },
      {
        phase: "Final Inspection & Handover",
        steps: [
          "Perform comprehensive quality inspection covering alignments, finishes, and functionality.",
          "Carry out deep cleaning and debris removal for formal handover.",
        ],
      },
    ],
    safetyPrecautions: [
      "Mandatory PPE compliance for all site personnel at all times.",
      "Adherence to building management security, noise, and working hour guidelines.",
      "Keep emergency exits and firefighting equipment unblocked at all times.",
    ],
  },
};

export function detectPresetKey(text = ""): string {
  const t = String(text).toLowerCase();
  if (t.includes("film") || t.includes("tint") || t.includes("glass")) return "glass_film";
  if (
    t.includes("wood") ||
    t.includes("joiner") ||
    t.includes("door") ||
    t.includes("cabinet") ||
    t.includes("desk") ||
    t.includes("counter") ||
    t.includes("table")
  )
    return "joinery";
  if (t.includes("gypsum") || t.includes("ceiling") || t.includes("partition") || t.includes("drywall"))
    return "gypsum";
  if (t.includes("paint") || t.includes("coating") || t.includes("polish")) return "painting";
  return "glass_film";
}
