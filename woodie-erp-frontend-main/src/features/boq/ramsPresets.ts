export type RamsRiskItem = {
  no: number;
  activity: string;
  hazard: string;
  risk: string;
  controls: string;
  level: "Low" | "Medium" | "High";
};

export type RamsMethodStep = {
  step: string;
  text: string;
};

export type RamsPreset = {
  key: string;
  title: string;
  defaultScope: string[];
  materials: string[];
  tools: string[];
  methodology: RamsMethodStep[];
  risks: RamsRiskItem[];
};

export type RamsPayload = {
  docType?: "risk_assessment" | "mos" | "combined";
  locationName?: string;
  presetKey?: string;
  tradeTitle?: string;
  subject?: string;
  scopeOfWork?: string[];
  materials?: string[];
  tools?: string[];
  methodology?: RamsMethodStep[];
  risks?: RamsRiskItem[];
  [key: string]: unknown;
};

export const RAMS_PRESETS: Record<string, RamsPreset> = {
  water_heater: {
    key: "water_heater",
    title: "Bathroom Water Heater",
    defaultScope: [
      "Site inspection and verification of existing water heater and surrounding area.",
      "Isolation and lockout of electrical and water supplies.",
      "Controlled draining of existing water heater.",
      "Safe removal and disposal of existing water heater.",
      "Supply and installation of new approved water heater.",
      "Installation of heavy-duty mounting brackets and fixing anchors.",
      "Hot and cold-water piping connections with isolation valves.",
      "Installation of certified pressure-relief / safety valve and drain line.",
      "Electrical connection, isolator switch, and earthing verification.",
      "Testing, pressure checking, commissioning, and client handover.",
    ],
    materials: [
      "New approved electric water heater as per project specifications.",
      "Heavy-duty mounting brackets and fixing anchor bolts.",
      "Brass isolation ball valves (hot and cold).",
      "Certified pressure-relief / safety valve.",
      "High-pressure braided stainless steel flexible hoses/connectors.",
      "Required brass and PPR plumbing fittings and Teflon tape.",
      "Heat-resistant electrical cable, glands, and accessories where required.",
    ],
    tools: [
      "Hand tools and spanner sets.",
      "Pipe wrench and adjustable spanners.",
      "Heavy-duty hammer drill and masonry drill bits.",
      "Digital multimeter and electrical test equipment.",
      "Pipe-cutting tools and deburring equipment.",
      "A-frame ladder and access equipment.",
      "Personal Protective Equipment (PPE).",
      "Water collection buckets, drainage hose, and wet-dry vacuum.",
    ],
    methodology: [
      { step: "Site Inspection", text: "Inspect existing water heater and surrounding area. Verify heater capacity, physical dimensions, and wall load-bearing capacity." },
      { step: "Isolation of Services", text: "Isolate the cold water supply valve and electrical isolator. Verify absence of voltage using a calibrated multimeter before proceeding." },
      { step: "Draining Old Unit", text: "Connect drainage hose to drain cock. Allow hot water to cool down and discharge water completely into drain safely." },
      { step: "Disconnection & Removal", text: "Disconnect electrical wiring, hot and cold flexible hoses, and unmount old water heater using two-person team lift." },
      { step: "Mounting Bracket Installation", text: "Set out mounting levels using a spirit level. Drill anchor holes and secure heavy-duty brackets firmly into structural wall." },
      { step: "Mounting New Water Heater", text: "Mount new water heater onto brackets. Verify secure seating and vertical alignment." },
      { step: "Plumbing Connections", text: "Install pressure relief valve, isolation valves, and flexible connectors. Tighten to manufacturer torque specifications." },
      { step: "Electrical Termination", text: "Connect phase, neutral, and earth wires into water heater terminal block. Verify earthing continuity and waterproof gland entry." },
      { step: "Filling & Testing", text: "Open cold water supply and bleed air from hot water taps until water flows steadily without bubbles. Check all joints for leaks." },
      { step: "Commissioning & Handover", text: "Energize electrical supply. Verify heating element operation, thermostat cut-off, clean work area, and hand over to client." },
    ],
    risks: [
      { no: 1, activity: "Site inspection", hazard: "Wet/slippery bathroom floor", risk: "Slip, trip and fall", controls: "Keep work area dry where possible; use warning signage; maintain good housekeeping", level: "Low" },
      { no: 2, activity: "Isolation of water supply", hazard: "Unexpected water release", risk: "Flooding, slip hazard", controls: "Isolate water supply and confirm isolation before disconnecting", level: "Low" },
      { no: 3, activity: "Electrical isolation", hazard: "Live electrical supply", risk: "Electric shock/electrocution", controls: "Isolate power, verify dead with suitable test equipment, and use competent electrician", level: "Low" },
      { no: 4, activity: "Draining existing heater", hazard: "Hot water", risk: "Burns/scalding", controls: "Allow water to cool; drain carefully; wear gloves and suitable PPE", level: "Low" },
      { no: 5, activity: "Removing existing heater", hazard: "Heavy equipment", risk: "Back injury, dropped equipment", controls: "Use correct lifting technique; two-person lifting where required", level: "Low" },
      { no: 6, activity: "Working at height", hazard: "Ladder/access equipment", risk: "Fall from height", controls: "Use inspected and stable ladder; maintain three-point contact; do not overreach", level: "Medium" },
      { no: 7, activity: "Drilling/fixing brackets", hazard: "Dust, flying particles", risk: "Eye/respiratory injury", controls: "Wear safety glasses and dust protection; use suitable tools", level: "Low" },
      { no: 8, activity: "Installing new heater", hazard: "Heavy/awkward equipment", risk: "Strain, dropped heater", controls: "Use suitable manpower and secure lifting/support arrangements", level: "Low" },
      { no: 9, activity: "Plumbing connection", hazard: "Water leakage", risk: "Flooding/property damage", controls: "Check and tighten all connections; pressure/leak test before completion", level: "Low" },
      { no: 10, activity: "Electrical connection", hazard: "Incorrect wiring", risk: "Electric shock/fire/equipment damage", controls: "Work by qualified electrician; verify cable, protection and earthing", level: "Low" },
      { no: 11, activity: "Testing heater", hazard: "Electrical/water interaction", risk: "Shock, leakage, equipment damage", controls: "Ensure tank is completely filled before energizing; inspect connections before testing", level: "Low" },
      { no: 12, activity: "Pressure relief valve", hazard: "Excess pressure", risk: "Equipment failure/injury", controls: "Install and test manufacturer's specified safety/pressure-relief device", level: "Low" },
      { no: 13, activity: "Use of hand tools", hazard: "Sharp/damaged tools", risk: "Cuts/hand injuries", controls: "Inspect tools; use correct tool and gloves", level: "Low" },
      { no: 14, activity: "Housekeeping", hazard: "Cables, tools and waste", risk: "Trips/falls", controls: "Keep work area organized; remove waste regularly", level: "Low" },
      { no: 15, activity: "Chemical/sealant use", hazard: "Skin/eye contact", risk: "Irritation", controls: "Use gloves/eye protection and follow product instructions/SDS", level: "Low" },
      { no: 16, activity: "Hotel/occupied area", hazard: "Unauthorized access", risk: "Injury to guests/staff", controls: "Barricade/secure work area and display warning signs", level: "Low" },
    ],
  },

  waterproofing: {
    key: "waterproofing",
    title: "Rooftop & Wet Area Waterproofing",
    defaultScope: [
      "Inspection of the existing rooftop / substrate surface.",
      "Removal of dust, dirt, loose materials and debris.",
      "Surface preparation and repair of cracks, depressions, and damaged areas.",
      "Application of approved primer according to manufacturer technical data sheets.",
      "Application and installation of the approved waterproofing membrane / coating system.",
      "Treatment of joints, corners, upstands, parapet walls, outlets, and penetrations.",
      "Inspection, curing, and water ponding / leakage testing.",
      "Cleaning of the work area, disposal of waste, and client handover.",
    ],
    materials: [
      "Approved waterproofing material / membrane as per project specifications.",
      "Compatible bonding primer and polyurethane joint sealant.",
      "Approved surface repair mortar and non-shrink grout.",
      "Reinforcement polyester / geotextile mesh for corners and outlets.",
      "Angle fillets / chamfers for parapet upstands.",
      "Safety barricades, warning signs, and PPE.",
      "Water testing equipment and temporary drain plugs.",
    ],
    tools: [
      "Surface cleaning tools, wire brushes, and industrial vacuum cleaners.",
      "Surface grinding machine and rotary scarifier where required.",
      "Application rollers, brushes, notched trowels, and squeegees.",
      "Gas torch / hot-air gun for membrane detailing (if applicable).",
      "Measuring tape, laser level, and thickness gauge.",
      "Fall arrest harnesses, safety ropes, and guardrail systems.",
    ],
    methodology: [
      { step: "Site Inspection", text: "Inspect the rooftop surface and identify cracks, damaged areas, drainage points, and existing waterproofing defects." },
      { step: "Surface Preparation", text: "Remove dust, dirt, loose particles, and other contaminants. Ensure the surface is dry, clean, and sound." },
      { step: "Surface Repair", text: "Repair cracks, expansion joints, and damaged areas using approved repair mortars and polyurethane sealants." },
      { step: "Primer Application", text: "Apply the approved primer uniformly according to manufacturer instructions and allow required drying time." },
      { step: "Waterproofing Application", text: "Apply the approved waterproofing system uniformly according to technical data sheets and specified thickness." },
      { step: "Detailing & Upstands", text: "Ensure proper waterproofing treatment at corners, parapet walls, joints, pipe penetrations, and drainage outlets." },
      { step: "Inspection", text: "Check completed application for gaps, pinholes, blisters, or uneven coverage. Rectify defects before proceeding." },
      { step: "Water Testing", text: "Conduct a 24-48 hour water ponding test after full curing. Verify absence of leaks on underside slabs." },
      { step: "Protection and Handover", text: "Protect completed waterproofing layer from mechanical damage, clean work area, and obtain final inspection approval." },
    ],
    risks: [
      { no: 1, activity: "Working at rooftop height", hazard: "Fall from height, edge openings", risk: "Fall from height, serious injury", controls: "Provide approved edge protection, guardrails and safe access. Use suitable fall-arrest equipment where required.", level: "Medium" },
      { no: 2, activity: "Rooftop surface preparation", hazard: "Dust, flying debris, flying particles", risk: "Dust inhalation, eye injury, cuts", controls: "Wear safety goggles, suitable gloves and dust mask. Use proper tools and maintain good housekeeping.", level: "Low" },
      { no: 3, activity: "Handling waterproofing materials", hazard: "Chemical vapours, liquid resins", risk: "Skin irritation, chemical exposure", controls: "Follow the product SDS, wear suitable PPE and ensure adequate ventilation.", level: "Low" },
      { no: 4, activity: "Use of tools and equipment", hazard: "Defective cables, rotating blades", risk: "Cuts, hand injuries, electric shock", controls: "Inspect tools before use, use suitable equipment and ensure electrical tools are properly protected.", level: "Low" },
      { no: 5, activity: "Manual handling of materials", hazard: "Heavy rolls, pails of coating", risk: "Back strain, muscle injury", controls: "Use correct lifting techniques, team lifting or mechanical assistance where necessary.", level: "Low" },
      { no: 6, activity: "Slippery rooftop surface", hazard: "Wet coating, smooth wet surfaces", risk: "Slips, trips and falls", controls: "Keep the work area clean, manage spills immediately and maintain clear access routes.", level: "Low" },
      { no: 7, activity: "Hot weather and direct sunlight", hazard: "High ambient temperature, UV exposure", risk: "Heat stress, dehydration", controls: "Provide drinking water, rest breaks, shade where possible and comply with applicable UAE heat-stress requirements.", level: "Medium" },
      { no: 8, activity: "Waterproofing application", hazard: "Volatile organic compounds, fumes", risk: "Contact with chemicals, fumes", controls: "Follow manufacturer instructions, use required PPE and keep incompatible materials separate.", level: "Low" },
      { no: 9, activity: "Work near roof edges and openings", hazard: "Unprotected skylights, voids", risk: "Falls through openings or over edges", controls: "Install secure covers and barricades, identify hazards and restrict access to authorized personnel.", level: "Medium" },
      { no: 10, activity: "Material storage and waste disposal", hazard: "Flammable solvent storage, packaging", risk: "Fire risk, environmental contamination", controls: "Store materials safely, keep flammable products away from ignition sources and dispose of waste appropriately.", level: "Low" },
      { no: 11, activity: "Water ponding test, if applicable", hazard: "Water weight, slippery surface", risk: "Slips, overloading or water leakage", controls: "Obtain approval before testing, confirm drainage and structural suitability, barricade the test area and remove water safely.", level: "Low" },
    ],
  },

  painting: {
    key: "painting",
    title: "Painting & Wall Finishes",
    defaultScope: [
      "Site inspection, moisture measurement, and substrate assessment.",
      "Protection of existing floors, fixtures, furniture, and adjacent surfaces with masking sheets.",
      "Surface preparation including scraping, sanding, and cleaning existing walls.",
      "Crack repair, gouge filling, and application of approved acrylic putty.",
      "Sanding putty to a smooth, plumb, and even surface finish.",
      "Application of approved alkali-resistant primer coat.",
      "Application of two full coats of approved washable emulsion / polyurethane paint.",
      "Touch-up, removal of masking tapes, deep cleaning, and client inspection.",
    ],
    materials: [
      "Approved high-quality washable interior / exterior emulsion paint.",
      "Alkali-resistant acrylic primer.",
      "Interior wall filler / acrylic putty.",
      "Fine and medium grit sandpaper.",
      "High-grade masking tapes, polythene floor protection sheets, and drop cloths.",
      "Touch-up rollers and angle cutting brushes.",
    ],
    tools: [
      "Paint rollers, extension poles, and paint trays.",
      "Sash cutting brushes and touch-up brushes.",
      "Putty knives, filling scrapers, and trowels.",
      "Sanding blocks and pole sanders.",
      "A-frame aluminum ladders with rubber feet.",
      "Work lights / inspection floodlights.",
      "PPE (coveralls, gloves, dust masks, goggles).",
    ],
    methodology: [
      { step: "Site Inspection & Area Protection", text: "Inspect walls for dampness, cracks, or loose plaster. Lay heavy floor protection and tape all skirting, doors, and sockets." },
      { step: "Surface Preparation", text: "Scrape off loose or flaking paint. Clean surface free of dust, grease, and efflorescence." },
      { step: "Crack Repair & Puttying", text: "V-cut cracks, apply flexible filler, and apply two coats of acrylic wall putty over repaired areas." },
      { step: "Sanding", text: "Sand surface with fine sandpaper to achieve a level, flawless finish. Wipe off all sanding dust thoroughly." },
      { step: "Primer Application", text: "Apply one coat of approved primer uniformly to seal the substrate and provide optimal topcoat adhesion." },
      { step: "First Coat Application", text: "Apply first coat of approved paint using roller and cutting-in brushes. Maintain wet edge and uniform spread rate." },
      { step: "Intermediate Inspection", text: "Allow specified drying time. Inspect surface with sidelight and rectify minor surface imperfections." },
      { step: "Final Coat Application", text: "Apply final topcoat uniformly to achieve consistent color, texture, and sheen throughout." },
      { step: "Cleaning & Handover", text: "Remove masking cleanly. Clean paint splatters, vacuum floor, and inspect with client for formal acceptance." },
    ],
    risks: [
      { no: 1, activity: "Surface sanding & scraping", hazard: "Airborne paint dust & particles", risk: "Inhalation, eye irritation", controls: "Wear N95 dust masks and safety glasses; use vacuum attachments on sanders", level: "Low" },
      { no: 2, activity: "Working from ladders", hazard: "Working at elevated wall heights", risk: "Fall from ladder, dropped equipment", controls: "Inspect ladders; ensure level footing; maintain 3-point contact; do not overreach", level: "Medium" },
      { no: 3, activity: "Paint & primer application", hazard: "Paint vapours and chemical splashes", risk: "Respiratory irritation, skin contact", controls: "Maintain good cross-ventilation; wear nitrile gloves and protective eyewear", level: "Low" },
      { no: 4, activity: "Floor protection & masking", hazard: "Loose polythene sheets on walkways", risk: "Slips, trips and falls", controls: "Tape all sheet edges securely to skirting with high-tack tape; keep walkways unobstructed", level: "Low" },
      { no: 5, activity: "Handling paint cans & equipment", hazard: "Heavy paint containers (20L pails)", risk: "Manual handling strain, paint spills", controls: "Use two-person lift for heavy pails; place pails on drip trays to prevent spills", level: "Low" },
      { no: 6, activity: "Housekeeping & waste disposal", hazard: "Flammable solvent rags & waste", risk: "Fire hazard, site clutter", controls: "Store rags in closed metal bins; dispose of waste paint as per local municipality rules", level: "Low" },
    ],
  },

  joinery: {
    key: "joinery",
    title: "Joinery & Wood Works",
    defaultScope: [
      "Site verification of wall levels, datum heights, and final clear dimensions.",
      "Verification of approved shop drawings, finishes, and sample sign-offs.",
      "Off-site precision CNC cutting, edge-banding, and modular carcass fabrication.",
      "Supply and delivery of fabricated joinery units with protective transit wrapping.",
      "Site hoisting, distribution, and positioning of cabinetry / door frames.",
      "Securing units using heavy-duty structural fixings, brackets, and shims.",
      "Installation of soft-close hinges, drawer runners, handles, and architectural hardware.",
      "Joint detailing, perimeter silicone caulking, touch-up polish, and client handover.",
    ],
    materials: [
      "Moisture-resistant MDF / marine plywood / solid wood as approved.",
      "Natural wood veneer / high-pressure laminate (HPL) with PU clear lacquer.",
      "Concealed soft-close hinges, tandem drawer runners, and magnetic catches.",
      "Stainless steel fixing screws, wall plugs, and heavy-duty angle cleats.",
      "Color-matched acrylic sealant / silicone for wall-to-wood perimeter junctions.",
      "Touch-up wax sticks and finish repair kit.",
    ],
    tools: [
      "Cordless drills, impact drivers, and countersink bits.",
      "Laser level and precision spirit levels (1200mm).",
      "Plunge circular saw with guide rail for site scribing.",
      "Clamps, rubber mallets, and hand chisels.",
      "Silicone caulking guns.",
      "Heavy-duty transport dollies and suction grips.",
      "PPE (safety shoes, eye goggles, cut-resistant gloves).",
    ],
    methodology: [
      { step: "Site Survey & Setting Out", text: "Verify finished floor level, wall squareness, electrical points, and plumbing stub-outs against shop drawings." },
      { step: "Receiving & Handling", text: "Unload modular units carefully using transport dollies. Store in a dry, covered area protected from moisture." },
      { step: "Base Plinth Installation", text: "Level and anchor base plinths / kickers using laser level and leveling shims. Fix securely into floor/wall." },
      { step: "Carcass Installation", text: "Position lower and upper carcasses. Fasten modules together with connecting bolts and anchor firmly into wall studs/masonry." },
      { step: "Shutters & Drawers", text: "Mount cabinet shutters and insert drawers. Adjust 3-way hinge screws for uniform 2mm reveals and smooth movement." },
      { step: "Hardware & Accessories", text: "Install designer handles, soft-close dampers, pull-out baskets, and internal shelves." },
      { step: "Scribing & Trim", text: "Scribe and fit filler pieces flush against adjacent out-of-plumb walls. Apply neat perimeter sealant." },
      { step: "Quality Inspection & Handover", text: "Inspect all alignments, wipe clean with microfiber cloths, test hardware, and hand over to client." },
    ],
    risks: [
      { no: 1, activity: "Manual handling of heavy panels", hazard: "Heavy wooden boards, awkward sizes", risk: "Back strain, crushed fingers", controls: "Observe two-person lift protocol; use transport dollies and suction glass/panel lifters", level: "Low" },
      { no: 2, activity: "Use of power cutting tools", hazard: "Circular saw blades, router bits", risk: "Cuts, projectile off-cuts, noise", controls: "Ensure blade guards in place; wear safety goggles and ear protection; trained carpenters only", level: "Medium" },
      { no: 3, activity: "Drilling & wall anchoring", hazard: "Concealed electrical conduits / pipes", risk: "Electric shock, water line puncture", controls: "Scan walls with digital multi-detector before drilling; isolate local DB breakers if in doubt", level: "Medium" },
      { no: 4, activity: "Working at upper cabinet height", hazard: "Working from ladders / hop-ups", risk: "Loss of balance, fall from height", controls: "Use stable hop-up work platforms; do not lean outside platform footprint", level: "Low" },
      { no: 5, activity: "Wood dust generation", hazard: "Sanding and trimming dust", risk: "Inhalation, eye irritation", controls: "Fit vacuum extractor to circular saw; wear N95 dust mask and safety glasses", level: "Low" },
      { no: 6, activity: "Housekeeping & waste", hazard: "Sharp off-cuts, screws, sawdust", risk: "Puncture wounds, slips and trips", controls: "Clean off-cuts continuously into scrap boxes; sweep and vacuum site at end of each shift", level: "Low" },
    ],
  },

  glass_film: {
    key: "glass_film",
    title: "Glass, Mirrors & Window Film",
    defaultScope: [
      "Site survey, measurement verification, and glass substrate inspection.",
      "Thorough cleaning, degreasing, and scraping of glass surface.",
      "Precision template cutting of approved architectural glass / frosted film / mirror.",
      "Application of slip solution and bubble-free film installation.",
      "Direct fixing of mirrors using structural neutral-cure mirror adhesive and safety backing.",
      "Pressure squeegeeing to extract water and air pockets.",
      "Edge trimming with safety blades and perimeter silicone sealing.",
      "Final inspection, cleaning, and handover.",
    ],
    materials: [
      "Approved solar control / decorative frosted glass film as per specification.",
      "High-grade copper-free silver / bronze mirror with safety shatterproof backing.",
      "Non-corrosive structural mirror silicone adhesive.",
      "High-tack double-sided spacer tape.",
      "PH-neutral glass installation solution.",
      "Lint-free microfiber cleaning cloths.",
    ],
    tools: [
      "Heavy-duty glass suction lifters (double and triple cup).",
      "Precision stainless steel snap-off blades and scrapers.",
      "Rubber and polyurethane squeegees of varied hardness.",
      "Pump-action pressure spray bottles.",
      "Laser level and aluminum straight edges.",
      "PPE (cut-resistant Kevlar gloves, eye protection, safety shoes).",
    ],
    methodology: [
      { step: "Site Inspection & Glass Prep", text: "Inspect glass for chips, scratches, or uneven gaskets. Deep clean with slip solution and single-edge glass scraper." },
      { step: "Cutting to Dimension", text: "Measure glass panels accurately. Cut film with 5mm excess allowance using precision cutting guides." },
      { step: "Wetting & Positioning", text: "Spray glass generously with slip solution. Peel film release liner and position film onto wet glass." },
      { step: "Squeegeeing", text: "Squeegee firmly from center outward in overlapping strokes to remove all water and air bubbles." },
      { step: "Edge Trimming", text: "Trim film edges with fresh blade leaving consistent 1-2mm perimeter gap to prevent future peeling." },
      { step: "Mirror Fixing (where applicable)", text: "Apply structural neutral-cure silicone in vertical beads. Press mirror onto wall using suction lifters and temporary support plinth." },
      { step: "Final Inspection", text: "Inspect under direct light for bubbles, water pockets, or edge lift. Clean thoroughly and hand over." },
    ],
    risks: [
      { no: 1, activity: "Handling glass & mirrors", hazard: "Sharp edges, fragile brittle material", risk: "Deep cuts, lacerations, glass breakage", controls: "Wear Level 5 Kevlar cut-resistant gloves; use vacuum suction lifters; never carry flat", level: "Medium" },
      { no: 2, activity: "Film cutting & trimming", hazard: "Razor-sharp snap-off blades", risk: "Finger cuts, puncture wounds", controls: "Always cut away from body; dispose of used blade segments in puncture-proof sharps container", level: "Low" },
      { no: 3, activity: "Water & soap solution spraying", hazard: "Wet, slippery floor around windows", risk: "Slips, trips and falls", controls: "Lay absorbent drop cloths on floor; wear non-slip safety shoes; mop dry immediately", level: "Low" },
      { no: 4, activity: "Working at window heights", hazard: "Elevated window installations", risk: "Fall from height", controls: "Use inspected scaffolding or mobile access towers with guardrails; clip safety harness if exposed", level: "Medium" },
      { no: 5, activity: "Occupied area / client office", hazard: "Operations in active tenant space", risk: "Disturbance, damage to tenant assets", controls: "Barricade work zone; protect computers and desks with plastic dust sheets", level: "Low" },
    ],
  },

  manual: {
    key: "manual",
    title: "Enter",
    defaultScope: [
      "Site inspection and verification of work area.",
      "Mobilization of tools, equipment, and approved materials.",
      "Execution of work according to project specifications and drawings.",
      "Quality inspection, testing, and cleaning of the work site.",
      "Final handover to client representative.",
    ],
    materials: [
      "Approved materials as per project specifications.",
      "Safety signs, barriers, and Personal Protective Equipment (PPE).",
    ],
    tools: [
      "Standard hand and power tools.",
      "Measuring and leveling instruments.",
      "Access ladders / work platform (if required).",
      "Cleaning and waste disposal equipment.",
    ],
    methodology: [
      { step: "Site Inspection & Preparation", text: "Inspect work location, ensure area is safe, and install warning barriers." },
      { step: "Material & Equipment Check", text: "Verify that all tools and materials meet approved specifications." },
      { step: "Work Execution", text: "Carry out the works in accordance with approved standards and safety procedures." },
      { step: "Quality Verification", text: "Inspect completed work to verify quality, dimensions, and compliance." },
      { step: "Site Cleaning & Handover", text: "Clean and remove all debris, inspect with the client, and obtain handover sign-off." },
    ],
    risks: [
      { no: 1, activity: "Material handling", hazard: "Heavy / awkward objects", risk: "Back strain, hand injury", controls: "Use team lifting and wear safety gloves", level: "Low" },
      { no: 2, activity: "Use of hand & power tools", hazard: "Sharp blades, moving parts", risk: "Cuts, abrasions, eye injury", controls: "Inspect tools before use; wear safety goggles and gloves", level: "Low" },
      { no: 3, activity: "Working at height (if applicable)", hazard: "Ladders / platforms", risk: "Fall from height", controls: "Use inspected stable ladder with 3-point contact", level: "Medium" },
      { no: 4, activity: "Electrical tools & cords", hazard: "Damaged cables, live circuits", risk: "Electric shock, trips", controls: "Keep cables tidy; check insulation; use RCD protection", level: "Low" },
      { no: 5, activity: "Housekeeping", hazard: "Debris and site waste", risk: "Slips, trips and falls", controls: "Maintain clean work area; dispose of waste continuously", level: "Low" },
    ],
  },
};

export function detectPresetKey(text = ""): string {
  const t = String(text).toLowerCase();
  if (t.includes("heater") || t.includes("geyser") || t.includes("ariston") || t.includes("plumb")) return "water_heater";
  if (t.includes("roof") || t.includes("waterproof") || t.includes("membrane")) return "waterproofing";
  if (t.includes("paint") || t.includes("coating") || t.includes("primer")) return "painting";
  if (t.includes("wood") || t.includes("joiner") || t.includes("door") || t.includes("cabinet")) return "joinery";
  if (t.includes("film") || t.includes("tint") || t.includes("glass") || t.includes("mirror")) return "glass_film";
  return "water_heater";
}
