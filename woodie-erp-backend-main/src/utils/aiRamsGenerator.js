const { escapeHtml } = require("./pdfShared");

/**
 * Cleans location text by removing internal directions (>), room numbers, elevator clutter,
 * resulting in clean UAE location names like "Address Downtown Hotel, Dubai" or "Taweelah Palace, Abu Dhabi".
 */
function cleanLocationAddress(inquiry, boq) {
  const inq = inquiry || {};
  const b = boq || {};

  let raw = String(
    (b.location && String(b.location).trim()) ||
    inq.fullAddress ||
    b.siteInformation?.location ||
    inq.siteDetails ||
    ""
  ).trim();

  if (!raw) {
    const fallbackEmirates = b.emirates || inq.emirates || inq.state || "Dubai";
    return fallbackEmirates ? `${fallbackEmirates}, UAE` : "Dubai, UAE";
  }

  let cleaned = raw
    .replace(/\s*(?:>|->|→)\s*/g, ", ")
    .replace(/\b(?:near|opposite|next to|behind)\s+(?:the\s+)?(?:elevator|lift|stairs|staircase|lobby|reception)\b[^\n,;]*/gi, "")
    .replace(/\b(?:\d+(?:st|nd|rd|th)?|ground|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|mezzanine|basement)\s+(?:floor|flr|level|lvl)\b/gi, "")
    .replace(/\b(?:floor|flr|level|lvl)\s*(?:no\.?|#)?\s*\d+\b/gi, "")
    .replace(/\b(?:room|rm)\s*(?:no\.?|#)?\s*[a-z0-9-]+\b/gi, "")
    .replace(/[\t ]+/g, " ")
    .replace(/\s*,\s*,+/g, ",")
    .replace(/\s*;\s*/g, ", ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/^[,\s\-:]+/, "")
    .replace(/[,\s\-:]+$/, "")
    .trim();

  if (!cleaned || cleaned.length < 3) {
    cleaned = raw.replace(/[\r\n]+/g, ", ").trim();
  }

  return cleaned || "Dubai, UAE";
}

/**
 * Formats a Date object or string as DD/MM/YYYY
 */
function formatDateDDMMYYYY(date) {
  if (!date) return new Date().toLocaleDateString("en-GB");
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date(date);
  if (isNaN(d.getTime())) return new Date().toLocaleDateString("en-GB");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Trade-specific domain knowledge engines
 */
const TRADE_DEFINITIONS = {
  water_heater: {
    key: "water_heater",
    title: "Bathroom Water Heater Replacement",
    keywords: ["water heater", "geyser", "ariston", "heater", "water-heater", "hot water"],
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
      { step: "Site Inspection", text: "Inspect the existing water heater and surrounding area. Verify heater capacity, physical dimensions, and wall load-bearing capacity." },
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
      { activity: "Site inspection", hazard: "Wet/slippery bathroom floor", risk: "Slip, trip and fall", controls: "Keep work area dry where possible; use warning signage; maintain good housekeeping", level: "Low" },
      { activity: "Isolation of water supply", hazard: "Unexpected water release", risk: "Flooding, slip hazard", controls: "Isolate water supply and confirm isolation before disconnecting", level: "Low" },
      { activity: "Electrical isolation", hazard: "Live electrical supply", risk: "Electric shock/electrocution", controls: "Isolate power, verify dead with suitable test equipment, and use competent electrician", level: "Low" },
      { activity: "Draining existing heater", hazard: "Hot water", risk: "Burns/scalding", controls: "Allow water to cool; drain carefully; wear gloves and suitable PPE", level: "Low" },
      { activity: "Removing existing heater", hazard: "Heavy equipment", risk: "Back injury, dropped equipment", controls: "Use correct lifting technique; two-person lifting where required", level: "Low" },
      { activity: "Working at height", hazard: "Ladder/access equipment", risk: "Fall from height", controls: "Use inspected and stable ladder; maintain three-point contact; do not overreach", level: "Medium" },
      { activity: "Drilling/fixing brackets", hazard: "Dust, flying particles", risk: "Eye/respiratory injury", controls: "Wear safety glasses and dust protection; use suitable tools", level: "Low" },
      { activity: "Installing new heater", hazard: "Heavy/awkward equipment", risk: "Strain, dropped heater", controls: "Use suitable manpower and secure lifting/support arrangements", level: "Low" },
      { activity: "Plumbing connection", hazard: "Water leakage", risk: "Flooding/property damage", controls: "Check and tighten all connections; pressure/leak test before completion", level: "Low" },
      { activity: "Electrical connection", hazard: "Incorrect wiring", risk: "Electric shock/fire/equipment damage", controls: "Work by qualified electrician; verify cable, protection and earthing", level: "Low" },
      { activity: "Testing heater", hazard: "Electrical/water interaction", risk: "Shock, leakage, equipment damage", controls: "Ensure tank is completely filled before energizing; inspect connections before testing", level: "Low" },
      { activity: "Pressure relief valve", hazard: "Excess pressure", risk: "Equipment failure/injury", controls: "Install and test manufacturer's specified safety/pressure-relief device", level: "Low" },
      { activity: "Use of hand tools", hazard: "Sharp/damaged tools", risk: "Cuts/hand injuries", controls: "Inspect tools; use correct tool and gloves", level: "Low" },
      { activity: "Housekeeping", hazard: "Cables, tools and waste", risk: "Trips/falls", controls: "Keep work area organized; remove waste regularly", level: "Low" },
      { activity: "Chemical/sealant use", hazard: "Skin/eye contact", risk: "Irritation", controls: "Use gloves/eye protection and follow product instructions/SDS", level: "Low" },
      { activity: "Hotel/occupied area", hazard: "Unauthorized access", risk: "Injury to guests/staff", controls: "Barricade/secure work area and display warning signs", level: "Low" },
    ],
  },

  waterproofing: {
    key: "waterproofing",
    title: "Rooftop & Wet Area Waterproofing",
    keywords: ["waterproof", "waterproofing", "roof", "rooftop", "membrane", "coating", "polyurethane", "wet area"],
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
      { activity: "Working at rooftop height", hazard: "Fall from height, edge openings", risk: "Fall from height, serious injury", controls: "Provide approved edge protection, guardrails and safe access. Use suitable fall-arrest equipment where required.", level: "Medium" },
      { activity: "Rooftop surface preparation", hazard: "Dust, flying debris, flying particles", risk: "Dust inhalation, eye injury, cuts", controls: "Wear safety goggles, suitable gloves and dust mask. Use proper tools and maintain good housekeeping.", level: "Low" },
      { activity: "Handling waterproofing materials", hazard: "Chemical vapours, liquid resins", risk: "Skin irritation, chemical exposure", controls: "Follow the product SDS, wear suitable PPE and ensure adequate ventilation.", level: "Low" },
      { activity: "Use of tools and equipment", hazard: "Defective cables, rotating blades", risk: "Cuts, hand injuries, electric shock", controls: "Inspect tools before use, use suitable equipment and ensure electrical tools are properly protected.", level: "Low" },
      { activity: "Manual handling of materials", hazard: "Heavy rolls, pails of coating", risk: "Back strain, muscle injury", controls: "Use correct lifting techniques, team lifting or mechanical assistance where necessary.", level: "Low" },
      { activity: "Slippery rooftop surface", hazard: "Wet coating, smooth wet surfaces", risk: "Slips, trips and falls", controls: "Keep the work area clean, manage spills immediately and maintain clear access routes.", level: "Low" },
      { activity: "Hot weather and direct sunlight", hazard: "High ambient temperature, UV exposure", risk: "Heat stress, dehydration", controls: "Provide drinking water, rest breaks, shade where possible and comply with applicable UAE heat-stress requirements.", level: "Medium" },
      { activity: "Waterproofing application", hazard: "Volatile organic compounds, fumes", risk: "Contact with chemicals, fumes", controls: "Follow manufacturer instructions, use required PPE and keep incompatible materials separate.", level: "Low" },
      { activity: "Work near roof edges and openings", hazard: "Unprotected skylights, voids", risk: "Falls through openings or over edges", controls: "Install secure covers and barricades, identify hazards and restrict access to authorized personnel.", level: "Medium" },
      { activity: "Material storage and waste disposal", hazard: "Flammable solvent storage, packaging", risk: "Fire risk, environmental contamination", controls: "Store materials safely, keep flammable products away from ignition sources and dispose of waste appropriately.", level: "Low" },
      { activity: "Water ponding test, if applicable", hazard: "Water weight, slippery surface", risk: "Slips, overloading or water leakage", controls: "Obtain approval before testing, confirm drainage and structural suitability, barricade the test area and remove water safely.", level: "Low" },
    ],
  },

  painting: {
    key: "painting",
    title: "Painting & Wall Finishes",
    keywords: ["paint", "painting", "emulsion", "coating", "putty", "primer", "wall finish"],
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
      { activity: "Surface sanding & scraping", hazard: "Airborne paint dust & particles", risk: "Inhalation, eye irritation", controls: "Wear N95 dust masks and safety glasses; use vacuum attachments on sanders", level: "Low" },
      { activity: "Working from ladders", hazard: "Working at elevated wall heights", risk: "Fall from ladder, dropped equipment", controls: "Inspect ladders; ensure level footing; maintain 3-point contact; do not overreach", level: "Medium" },
      { activity: "Paint & primer application", hazard: "Paint vapours and chemical splashes", risk: "Respiratory irritation, skin contact", controls: "Maintain good cross-ventilation; wear nitrile gloves and protective eyewear", level: "Low" },
      { activity: "Floor protection & masking", hazard: "Loose polythene sheets on walkways", risk: "Slips, trips and falls", controls: "Tape all sheet edges securely to skirting with high-tack tape; keep walkways unobstructed", level: "Low" },
      { activity: "Handling paint cans & equipment", hazard: "Heavy paint containers (20L pails)", risk: "Manual handling strain, paint spills", controls: "Use two-person lift for heavy pails; place pails on drip trays to prevent spills", level: "Low" },
      { activity: "Housekeeping & waste disposal", hazard: "Flammable solvent rags & waste", risk: "Fire hazard, site clutter", controls: "Store rags in closed metal bins; dispose of waste paint as per local municipality rules", level: "Low" },
    ],
  },

  joinery: {
    key: "joinery",
    title: "Joinery & Wood Works",
    keywords: ["joinery", "wood", "door", "cabinet", "wardrobe", "vanity", "counter", "carpentry", "timber"],
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
      { activity: "Manual handling of heavy panels", hazard: "Heavy wooden boards, awkward sizes", risk: "Back strain, crushed fingers", controls: "Observe two-person lift protocol; use transport dollies and suction glass/panel lifters", level: "Low" },
      { activity: "Use of power cutting tools", hazard: "Circular saw blades, router bits", risk: "Cuts, projectile off-cuts, noise", controls: "Ensure blade guards in place; wear safety goggles and ear protection; trained carpenters only", level: "Medium" },
      { activity: "Drilling & wall anchoring", hazard: "Concealed electrical conduits / pipes", risk: "Electric shock, water line puncture", controls: "Scan walls with digital multi-detector before drilling; isolate local DB breakers if in doubt", level: "Medium" },
      { activity: "Working at upper cabinet height", hazard: "Working from ladders / hop-ups", risk: "Loss of balance, fall from height", controls: "Use stable hop-up work platforms; do not lean outside platform footprint", level: "Low" },
      { activity: "Wood dust generation", hazard: "Sanding and trimming dust", risk: "Inhalation, eye irritation", controls: "Fit vacuum extractor to circular saw; wear N95 dust mask and safety glasses", level: "Low" },
      { activity: "Housekeeping & waste", hazard: "Sharp off-cuts, screws, sawdust", risk: "Puncture wounds, slips and trips", controls: "Clean off-cuts continuously into scrap boxes; sweep and vacuum site at end of each shift", level: "Low" },
    ],
  },

  glass_film: {
    key: "glass_film",
    title: "Glass, Mirrors & Window Film",
    keywords: ["glass", "film", "tint", "mirror", "frosted", "glazing", "window"],
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
      { activity: "Handling glass & mirrors", hazard: "Sharp edges, fragile brittle material", risk: "Deep cuts, lacerations, glass breakage", controls: "Wear Level 5 Kevlar cut-resistant gloves; use vacuum suction lifters; never carry flat", level: "Medium" },
      { activity: "Film cutting & trimming", hazard: "Razor-sharp snap-off blades", risk: "Finger cuts, puncture wounds", controls: "Always cut away from body; dispose of used blade segments in puncture-proof sharps container", level: "Low" },
      { activity: "Water & soap solution spraying", hazard: "Wet, slippery floor around windows", risk: "Slips, trips and falls", controls: "Lay absorbent drop cloths on floor; wear non-slip safety shoes; mop dry immediately", level: "Low" },
      { activity: "Working at window heights", hazard: "Elevated window installations", risk: "Fall from height", controls: "Use inspected scaffolding or mobile access towers with guardrails; clip safety harness if exposed", level: "Medium" },
      { activity: "Occupied area / client office", hazard: "Operations in active tenant space", risk: "Disturbance, damage to tenant assets", controls: "Barricade work zone; protect computers and desks with plastic dust sheets", level: "Low" },
    ],
  },

  electrical: {
    key: "electrical",
    title: "Electrical & Lighting Works",
    keywords: ["electrical", "wiring", "light", "lighting", "db", "breaker", "socket", "cable", "conduit", "switch"],
    defaultScope: [
      "Site inspection, circuit tracing, and isolation verification.",
      "Lockout / Tagout (LOTO) of existing electrical distribution boards (DB).",
      "Conduit routing, cable pull, and circuit wire laying.",
      "Installation and dressing of DB, MCBs, ELCBs, and isolators.",
      "Fixing and wiring of light fixtures, switches, and power sockets.",
      "Earthing continuity and insulation resistance testing (megger test).",
      "Energization, circuit balancing, and lux level testing.",
      "Final inspection, labeling, and client handover.",
    ],
    materials: [
      "Approved PVC insulated single/multi-core copper cables.",
      "High-impact PVC conduits, couplers, inspection boxes, and saddles.",
      "Distribution board with approved MCBs, RCCBs, and main isolator.",
      "Commercial LED light fittings, emergency exit lights, and drivers.",
      "White polycarbonate / metal-clad wiring accessories (switches/sockets).",
      "Earthing copper tape, earth rods, and crimp lugs.",
    ],
    tools: [
      "Calibrated digital multimeter, clamp meter, and insulation tester (Megger).",
      "Electrician insulated hand tool set (1000V rated).",
      "Cable puller / nylon fish tape.",
      "Cordless hammer drill and conduit benders.",
      "Step ladders and fiberglass non-conductive ladders.",
      "PPE (safety shoes, insulated gloves, arc flash face shield if working live).",
    ],
    methodology: [
      { step: "Isolation & LOTO", text: "Isolate power supply at source. Apply safety padlock and warning tag. Verify absence of voltage with two-pole tester." },
      { step: "Containment & Conduit", text: "Route and fix PVC/metallic conduits rigidly with saddles spaced every 800mm as per DEWA regulations." },
      { step: "Cable Pulling", text: "Pull color-coded cables (Phase: Red/Yellow/Blue, Neutral: Black, Earth: Green/Yellow) without twisting or skinning." },
      { step: "DB Dressing & Termination", text: "Terminate cables neatly in distribution board. Crimp lugs securely, label circuits, and torque breaker screws." },
      { step: "Fixture Installation", text: "Mount light fittings, drivers, switches, and sockets securely with proper strain relief." },
      { step: "Testing Before Energization", text: "Perform insulation resistance test (min 1 Megohm), continuity test, and earth loop impedance check." },
      { step: "Energization & Commissioning", text: "Energize circuits one by one. Verify voltage, polarity, RCD trip test, and functional operation." },
      { step: "Handover", text: "Clean all switch plates, fix DB schedule directory chart, and hand over to client." },
    ],
    risks: [
      { activity: "Electrical isolation & inspection", hazard: "Live conductors, backfeed voltages", risk: "Electric shock, electrocution, arc flash", controls: "Strict LOTO protocol; test before touch; use 1000V insulated tools; DEWA certified electrician", level: "Medium" },
      { activity: "Working at height (ceilings)", hazard: "Working from ladders on high ceilings", risk: "Fall from height, dropped tools", controls: "Use fiberglass non-conductive ladders; tether tools; maintain 3-point contact", level: "Medium" },
      { activity: "Cable pulling through conduits", hazard: "Cable tension, sharp conduit edges", risk: "Finger pinch, hand lacerations", controls: "Deburr conduits; wear leather work gloves; use approved cable pulling lubricant", level: "Low" },
      { activity: "Drilling into slabs / walls", hazard: "Hidden conduits, embedded rebar", risk: "Electric shock, pipe puncture", controls: "Use multi-scanner to detect live conduits before drilling; wear safety glasses", level: "Medium" },
      { activity: "Testing & energizing", hazard: "Short circuit on first power-up", risk: "Flashover, equipment damage", controls: "Ensure all dead tests pass before energizing; stand clear of panel during main breaker throw", level: "Medium" },
    ],
  },

  manual: {
    key: "manual",
    title: "General & Custom Contracting",
    keywords: ["manual", "custom", "general contracting"],
    defaultScope: [
      "Initial site survey and work perimeter hazard inspection.",
      "Mobilization of certified personnel, tools, and approved materials.",
      "Execution of site works in strict accordance with approved drawings and specifications.",
      "Quality control inspection, compliance checks, and testing prior to concealment.",
      "Final cleanup, site demobilization, and formal client handover.",
    ],
    materials: [
      "Approved materials complying with project specifications.",
      "Safety warning signs, barriers, and Personal Protective Equipment (PPE).",
    ],
    tools: [
      "Standard trade hand and power tools.",
      "Precision measuring and leveling instruments.",
      "Access ladders / work platform (where applicable).",
      "Site cleaning and vacuum equipment.",
    ],
    methodology: [
      { step: "Site Inspection & Preparation", text: "Conduct pre-task safety briefing, inspect work area, ensure safe access, and install warning barriers." },
      { step: "Material & Equipment Check", text: "Verify that all tools, access equipment, and materials meet approved project specifications and safety standards." },
      { step: "Work Execution", text: "Execute the works systematically following approved engineering procedures, safety regulations, and manufacturer instructions." },
      { step: "Quality Verification", text: "Perform quality checks, dimension verification, and testing to ensure complete compliance with client requirements." },
      { step: "Housekeeping & Handover", text: "Clean and remove all debris, inspect the completed work with the client representative, and obtain formal handover approval." },
    ],
    risks: [
      { activity: "Material handling & mobilization", hazard: "Heavy or awkward loads", risk: "Back strain, crushed fingers", controls: "Observe two-person lift protocol; use transport dollies and wear safety gloves", level: "Low" },
      { activity: "Use of hand and power tools", hazard: "Sharp edges, rotating parts, noise", risk: "Cuts, projectile debris, eye injury", controls: "Ensure blade guards in place; wear safety goggles and cut-resistant gloves", level: "Low" },
      { activity: "Working at height (if applicable)", hazard: "Ladders, scaffolding, elevated edges", risk: "Fall from height, dropped tools", controls: "Use inspected stable ladder/scaffold; maintain 3-point contact; clip safety harness where required", level: "Medium" },
      { activity: "Electrical equipment connection", hazard: "Damaged cables, live circuits in vicinity", risk: "Electric shock, trip hazard", controls: "Inspect cables before use; route cables away from walkways; isolate circuits if in doubt", level: "Low" },
      { activity: "Dust and airborne particles", hazard: "Drilling, cutting, or surface preparation", risk: "Inhalation, eye irritation", controls: "Wear dust masks and safety glasses; utilize dust extraction attachments", level: "Low" },
      { activity: "Housekeeping & waste disposal", hazard: "Scrap off-cuts, screws, site clutter", risk: "Slips, trips, and puncture wounds", controls: "Maintain clean work zone; clear debris into designated waste bins continuously", level: "Low" },
    ],
  },
};

/**
 * Detects the most relevant trade based on quotation items and descriptions.
 */
function detectTradeKey(text = "", items = []) {
  const combined = (
    text +
    " " +
    items.map((i) => `${i.description || ""} ${i.category || ""}`).join(" ")
  ).toLowerCase();

  for (const [key, trade] of Object.entries(TRADE_DEFINITIONS)) {
    for (const kw of trade.keywords) {
      if (combined.includes(kw)) {
        return key;
      }
    }
  }

  // Fallback defaults
  if (combined.includes("film") || combined.includes("glass")) return "glass_film";
  if (combined.includes("door") || combined.includes("wood")) return "joinery";
  if (combined.includes("paint")) return "painting";
  if (combined.includes("heater") || combined.includes("plumb")) return "water_heater";
  return "waterproofing";
}

/**
 * Main AI Engine: Extracts quotation details, dynamically synthesizes Scope, Materials,
 * Step-by-Step Procedure, and Risk Assessment Table with zero manual work.
 */
function generateRamsData(quotation = {}, inquiry = {}, overrides = {}) {
  const q = quotation || {};
  const inq = inquiry || {};

  const items = Array.isArray(q.items) ? q.items : [];
  const projectName =
    overrides.projectName ||
    q.projectName ||
    q.subject ||
    inq.projectName ||
    inq.clientRefNo ||
    "Project";

  const location =
    overrides.locationName ||
    cleanLocationAddress(inq, q);

  const clientName =
    overrides.clientName ||
    q.clientName ||
    inq.clientName ||
    inq.companyName ||
    "Valued Client";

  const contractor = overrides.contractor || "";

  const rawDate = q.quoteDate || q.createdAt || inq.createdAt || new Date();
  const formattedDate = formatDateDDMMYYYY(rawDate);

  const detectedKey = detectTradeKey(
    `${projectName} ${q.subject || ""} ${location}`,
    items
  );

  const tradeKey = overrides.presetKey || detectedKey;
  const trade = TRADE_DEFINITIONS[tradeKey] || TRADE_DEFINITIONS.manual || TRADE_DEFINITIONS.water_heater;

  let subject =
    overrides.subject ||
    overrides.tradeTitle ||
    q.subject ||
    projectName;

  if (tradeKey === "manual" && (overrides.tradeTitle || overrides.subject)) {
    subject = overrides.tradeTitle || overrides.subject;
  } else if (subject.toLowerCase() === "project" || subject.length < 3) {
    subject = trade.title;
  }

  // 1. Build Scope of Work
  let scopeOfWork = [];
  if (Array.isArray(overrides.scopeOfWork) && overrides.scopeOfWork.length) {
    scopeOfWork = overrides.scopeOfWork;
  } else {
    scopeOfWork = [...trade.defaultScope];

    // If quotation has specific line items, inject them into the scope (only for auto-detected presets)
    if (items.length > 0 && tradeKey !== "manual") {
      const itemHighlights = items
        .filter((it) => it.description && it.description.trim().length > 3)
        .map((it) => {
          let desc = it.description.split("—")[0].trim().replace(/\n/g, " ");
          if (it.quantity && it.unit) {
            desc += ` (${it.quantity} ${it.unit})`;
          }
          return `Supply and installation of ${desc} in accordance with approved specifications.`;
        });

      if (itemHighlights.length) {
        // Splice after the first 2 preparation points
        const insertIdx = Math.min(2, scopeOfWork.length);
        scopeOfWork.splice(insertIdx, 0, ...itemHighlights.slice(0, 4));
      }
    }
  }

  // 2. Build Materials and Equipment
  let materials = [];
  if (Array.isArray(overrides.materials) && overrides.materials.length) {
    materials = overrides.materials;
  } else {
    materials = [...trade.materials];
    // Add specific quotation materials if available
    if (tradeKey !== "manual") {
      items.forEach((it) => {
        if (it.description && it.description.includes("Finish:")) {
          const finish = it.description.split("Finish:")[1]?.trim();
          if (finish && !materials.includes(finish)) {
            materials.unshift(`Approved finish: ${finish}`);
          }
        }
      });
    }
  }

  const tools = Array.isArray(overrides.tools) && overrides.tools.length
    ? overrides.tools
    : trade.tools;

  // 3. Build Methodology
  let methodology = [];
  if (Array.isArray(overrides.methodology) && overrides.methodology.length) {
    methodology = overrides.methodology;
  } else {
    methodology = [...trade.methodology];
  }

  // 4. Build Risk Assessment Table
  let risks = [];
  const hasManualRisks = Array.isArray(overrides.risks) && overrides.risks.length > 0;
  if (hasManualRisks) {
    risks = overrides.risks;
  } else {
    risks = [...trade.risks];
  }

  // Incorporate any site-visit risks if recorded and not manually overridden
  if (!hasManualRisks && tradeKey !== "manual") {
    const siteRisks = q.siteInformation?.riskAssessment || inq.riskAssessment;
    if (siteRisks) {
      if (siteRisks.heightWork && !risks.some((r) => r.activity.toLowerCase().includes("height"))) {
        risks.push({
          activity: "Working at height",
          hazard: "Elevated work area / scaffolding",
          risk: "Fall from height, dropped tools",
          controls: "Inspect scaffolding / ladder; use full-body harness tied to certified lifeline",
          level: "Medium",
        });
      }
      if (siteRisks.electricalRisk && !risks.some((r) => r.activity.toLowerCase().includes("electrical"))) {
        risks.push({
          activity: "Electrical isolation",
          hazard: "Live electrical cabling in vicinity",
          risk: "Electric shock / electrocution",
          controls: "Isolate power supply, lockout and tagout; verify dead with multimeter",
          level: "Low",
        });
      }
      if (siteRisks.waterLeakage && !risks.some((r) => r.activity.toLowerCase().includes("water"))) {
        risks.push({
          activity: "Plumbing isolation",
          hazard: "Pressurized water line",
          risk: "Flooding, slip hazard",
          controls: "Isolate main shut-off valve, drain lines, and inspect before uncoupling",
          level: "Low",
        });
      }
    }
  }

  // Ensure risk numbers are consecutive
  risks = risks.map((r, idx) => ({
    no: idx + 1,
    activity: r.activity || r.workActivity || "Activity",
    hazard: r.hazard || "Potential Hazard",
    risk: r.risk || r.potentialRisk || "Risk",
    controls: r.controls || r.controlMeasures || "Control Measures",
    level: r.level || r.riskLevel || "Low",
  }));

  return {
    projectName,
    subject,
    location,
    clientName,
    contractor,
    formattedDate,
    tradeKey,
    scopeOfWork,
    materials,
    tools,
    methodology,
    risks,
  };
}

module.exports = {
  cleanLocationAddress,
  formatDateDDMMYYYY,
  TRADE_DEFINITIONS,
  detectTradeKey,
  generateRamsData,
};
