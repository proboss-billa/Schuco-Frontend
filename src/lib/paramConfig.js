// lib/paramConfig.js
// Parameter groups for Commercial and Residential project types.
// Each group has an id, label, and list of parameters with key/label/unit.
// The "type" tag on each param: "both", "commercial", "residential"
// is used to filter which params show for each project type.

// ── TECHNICAL SPECIFICATION ─────────────────────────────────────────────────
const TECH_SPEC_PARAMS = [
  // Shared
  { key: "Wind Load",                                          label: "Wind Load",                                          unit: "kN/m² / Pa",          type: "both" },
  { key: "Wind Load Zoning",                                   label: "Wind Load Zoning",                                   unit: "zone / kN/m²",        type: "both" },
  { key: "Glass Thickness (Vision & Spandrel)",                label: "Glass Thickness (Vision & Spandrel)",                unit: "mm",                  type: "both" },
  { key: "Glass Thickness (Openable)",                         label: "Glass Thickness (Openable)",                         unit: "mm",                  type: "both" },
  { key: "Structural Member Wall Thickness",                   label: "Structural Member Wall Thickness",                   unit: "mm",                  type: "both" },
  { key: "Material of Gasket",                                 label: "Material of Gasket",                                 unit: "material",            type: "both" },
  { key: "Water Tightness",                                    label: "Water Tightness",                                    unit: "Pa / Class",          type: "both" },
  { key: "Air Permeability",                                   label: "Air Permeability",                                   unit: "m³/h·m² / Class",     type: "both" },
  { key: "Seismic Performance",                                label: "Seismic Performance",                                unit: "mm / zone",           type: "both" },
  { key: "Acoustic Rating",                                    label: "Acoustic Rating",                                    unit: "dB / Rw",             type: "both" },
  { key: "U-Value",                                            label: "U-Value",                                            unit: "W/m²K",               type: "both" },
  { key: "Horizontal Movement",                                label: "Horizontal Movement",                                unit: "mm",                  type: "both" },
  { key: "Face Width of Mullion",                              label: "Face Width of Mullion",                              unit: "mm",                  type: "both" },
  { key: "100% Dead Load on Sill / Intermediate Transom",      label: "100% Dead Load on Sill / Intermediate Transom",      unit: "yes/no",              type: "both" },
  { key: "100% Dead Load on Glass Support (Openable)",         label: "100% Dead Load on Glass Support (Openable)",         unit: "yes/no",              type: "both" },
  { key: "Distance – Slab to Mullion",                         label: "Distance – Slab to Mullion",                         unit: "mm",                  type: "both" },
  { key: "Load of Canopy",                                     label: "Load of Canopy",                                     unit: "kN / yes/no",         type: "both" },
  { key: "Load of Catwalk",                                    label: "Load of Catwalk",                                    unit: "kN / yes/no",         type: "both" },
  { key: "Inserts Required",                                   label: "Inserts Required",                                   unit: "yes/no",              type: "both" },
  { key: "Movement of Slab Mounted Bracket",                   label: "Movement of Slab Mounted Bracket",                   unit: "mm",                  type: "both" },

  // Commercial-only
  { key: "Panel Modulation",                                   label: "Panel Modulation",                                   unit: "mm × mm",             type: "commercial" },
  { key: "BMU Load",                                           label: "BMU Load",                                           unit: "kN / kg",             type: "commercial" },
  { key: "Lighting Provision",                                 label: "Lighting Provision",                                 unit: "yes/no",              type: "commercial" },
  { key: "Panel Typologies",                                   label: "Panel Typologies",                                   unit: "nos",                 type: "commercial" },
  { key: "No. of Barriers",                                    label: "No. of Barriers",                                    unit: "nos",                 type: "commercial" },
  { key: "Stack Height",                                       label: "Stack Height",                                       unit: "mm",                  type: "commercial" },
  { key: "Vertical Stack Movement",                            label: "Vertical Stack Movement",                            unit: "mm",                  type: "commercial" },
  { key: "Bracket Type",                                       label: "Bracket Type",                                       unit: "type",                type: "commercial" },
  { key: "Signage Load",                                       label: "Signage Load",                                       unit: "kN / kg",             type: "commercial" },

  // Residential-only
  { key: "No. of Locking Points",                              label: "No. of Locking Points",                              unit: "nos",                 type: "residential" },
  { key: "Sealant Bite",                                       label: "Sealant Bite",                                       unit: "mm",                  type: "residential" },
  { key: "Location of Restrain Pin",                           label: "Location of Restrain Pin",                           unit: "mullion / transom",   type: "residential" },
  { key: "Gutter Sleeve Length & Thickness",                   label: "Gutter Sleeve Length & Thickness",                   unit: "mm",                  type: "residential" },
  { key: "Openable Edge Guard – First Barrier Gasket",         label: "Openable Edge Guard – First Barrier Gasket",         unit: "yes/no",              type: "residential" },
  { key: "Drip Bar Edge Guard for Openable",                   label: "Drip Bar Edge Guard for Openable",                   unit: "material",            type: "residential" },
  { key: "Structural Adequacy in Open Condition",              label: "Structural Adequacy in Open Condition",              unit: "yes/no",              type: "residential" },
  { key: "Deflection Criteria",                                label: "Deflection Criteria",                                unit: "L/xxx / mm",          type: "residential" },
  { key: "Fire Rating",                                        label: "Fire Rating",                                        unit: "min / Class",         type: "residential" },
  { key: "Testing Standards (Onsite / Offsite)",               label: "Testing Standards (Onsite / Offsite)",               unit: "standard",            type: "residential" },
  { key: "Surface Finish",                                     label: "Surface Finish",                                     unit: "AAMA / µm",           type: "residential" },
  { key: "Corrosion Class for Fittings",                       label: "Corrosion Class for Fittings",                       unit: "class",               type: "residential" },
  { key: "Durability Test",                                    label: "Durability Test",                                    unit: "cycles / standard",   type: "residential" },
  { key: "Live Load Criteria for Railing",                     label: "Live Load Criteria for Railing",                     unit: "kN/m",                type: "residential" },
  { key: "Operating Force Requirement",                        label: "Operating Force Requirement",                        unit: "N",                   type: "residential" },
  { key: "Easy Clean System in Openable",                      label: "Easy Clean System in Openable",                      unit: "yes/no",              type: "residential" },
  { key: "Limiting Stay in Openable",                          label: "Limiting Stay in Openable",                          unit: "yes/no",              type: "residential" },
  { key: "Door Closure Required",                              label: "Door Closure Required",                              unit: "yes/no",              type: "residential" },
  { key: "SS Screws & Hardware – Visible Area",                label: "SS Screws & Hardware – Visible Area",                unit: "SS 304 / 316",        type: "residential" },
  { key: "SS Screws & Hardware – Non-Visible Area",            label: "SS Screws & Hardware – Non-Visible Area",            unit: "SS 304 / 316",        type: "residential" },
  { key: "Aluminium Alloy (6063 / 6060)",                      label: "Aluminium Alloy (6063 / 6060)",                      unit: "alloy",               type: "residential" },
  { key: "Shims – Make / Type (HDG / PVC)",                    label: "Shims – Make / Type (HDG / PVC)",                    unit: "HDG / PVC",           type: "residential" },
  { key: "PMU Requirement",                                    label: "PMU Requirement",                                    unit: "yes/no",              type: "residential" },
  { key: "VMU Requirement",                                    label: "VMU Requirement",                                    unit: "yes/no",              type: "residential" },
];

// ── TENDER DRAWING REQUIREMENTS ─────────────────────────────────────────────
const TENDER_DRAWING_PARAMS = [
  // Shared
  { key: "Drawing – Elevations",                               label: "Drawing – Elevations",                               unit: "yes/no",              type: "both" },
  { key: "Drawing – Plan",                                     label: "Drawing – Plan",                                     unit: "yes/no",              type: "both" },
  { key: "Drawing – Section",                                  label: "Drawing – Section",                                  unit: "yes/no",              type: "both" },
  { key: "Location of Openable in Elevation & Plan",           label: "Location of Openable in Elevation & Plan",           unit: "yes/no",              type: "both" },
  { key: "ACP Band Interface Details",                         label: "ACP Band Interface Details",                         unit: "yes/no",              type: "both" },
  { key: "Horizontal Fin Details",                             label: "Horizontal Fin Details",                             unit: "yes/no",              type: "both" },
  { key: "Louvers Details (Shape & Location)",                 label: "Louvers Details (Shape & Location)",                 unit: "yes/no",              type: "both" },
  { key: "Wind Load Brackets & Dead Load",                     label: "Wind Load Brackets & Dead Load",                     unit: "yes/no",              type: "both" },
  { key: "Flashings",                                          label: "Flashings",                                          unit: "yes/no",              type: "both" },
  { key: "Waterproofing Membrane",                             label: "Waterproofing Membrane",                             unit: "yes/no",              type: "both" },
  { key: "Subframes",                                          label: "Subframes",                                          unit: "yes/no",              type: "both" },
  { key: "Perimeter Tubes (Curtain Wall / Toggle / UCW)",      label: "Perimeter Tubes (Curtain Wall / Toggle / UCW)",      unit: "yes/no",              type: "both" },
  { key: "Fin Bracket & Bolts",                                label: "Fin Bracket & Bolts",                                unit: "yes/no",              type: "both" },

  // Commercial-only
  { key: "Drawing – PE at Typical / Corner / Terrace / Starter", label: "Drawing – PE at Typical / Corner / Terrace / Starter", unit: "yes/no",          type: "commercial" },
  { key: "Drawing – PE at Refuge Area",                        label: "Drawing – PE at Refuge Area",                        unit: "yes/no",              type: "commercial" },
  { key: "Drawing – Railing Interface",                        label: "Drawing – Railing Interface",                        unit: "yes/no",              type: "commercial" },
  { key: "Drawing – PE for Non-Typical Area",                  label: "Drawing – PE for Non-Typical Area",                  unit: "yes/no",              type: "commercial" },
  { key: "Fin Details (Width, Depth, Shape)",                  label: "Fin Details (Width, Depth, Shape)",                  unit: "mm",                  type: "commercial" },
  { key: "Coping Details",                                     label: "Coping Details",                                     unit: "yes/no",              type: "commercial" },
  { key: "Inner / Outer Corner Details (Split / Single)",      label: "Inner / Outer Corner Details (Split / Single)",      unit: "split / single",      type: "commercial" },
  { key: "Variable Angle",                                     label: "Variable Angle",                                     unit: "degrees",             type: "commercial" },
  { key: "Variable Gasket",                                    label: "Variable Gasket",                                    unit: "yes/no",              type: "commercial" },
  { key: "Variable Angle Mullion (Semi-Unitised)",             label: "Variable Angle Mullion (Semi-Unitised)",             unit: "yes/no",              type: "commercial" },
  { key: "Top & Bottom Flashing with Insulation",              label: "Top & Bottom Flashing with Insulation",              unit: "yes/no",              type: "commercial" },
  { key: "Semi-Unitised Glass Support and Cleats",             label: "Semi-Unitised Glass Support and Cleats",             unit: "yes/no",              type: "commercial" },
  { key: "Gasket for Transom and Mullion",                     label: "Gasket for Transom and Mullion",                     unit: "material",            type: "commercial" },
  { key: "Intermediate Transom Edge Guard (No Visible Screws)", label: "Intermediate Transom Edge Guard (No Visible Screws)", unit: "yes/no",            type: "commercial" },
  { key: "Fin Lightning Provision",                            label: "Fin Lightning Provision",                            unit: "yes/no",              type: "commercial" },
  { key: "Canopy Details",                                     label: "Canopy Details",                                     unit: "yes/no",              type: "commercial" },
  { key: "Catwalk Details",                                    label: "Catwalk Details",                                    unit: "yes/no",              type: "commercial" },
  { key: "Mullion Sleeve Length (Semi-Unitised)",              label: "Mullion Sleeve Length (Semi-Unitised)",              unit: "mm",                  type: "commercial" },
  { key: "Mullion Structural Design Principle",                label: "Mullion Structural Design Principle",                unit: "type",                type: "commercial" },

  // Residential-only
  { key: "Profile Wall Thickness",                             label: "Profile Wall Thickness",                             unit: "mm",                  type: "residential" },
  { key: "Arch / Curved Windows",                              label: "Arch / Curved Windows",                              unit: "yes/no",              type: "residential" },
  { key: "Slider Types",                                       label: "Slider Types",                                       unit: "type",                type: "residential" },
  { key: "Openable Types",                                     label: "Openable Types",                                     unit: "type",                type: "residential" },
  { key: "Chajja Details (Width, Depth, Shape)",               label: "Chajja Details (Width, Depth, Shape)",               unit: "mm",                  type: "residential" },
  { key: "Windows Layout",                                     label: "Windows Layout",                                     unit: "yes/no",              type: "residential" },
  { key: "Openable Windows – Inside / Outside",                label: "Openable Windows – Inside / Outside",                unit: "type",                type: "residential" },
  { key: "Mesh Required",                                      label: "Mesh Required",                                      unit: "yes/no",              type: "residential" },
  { key: "Mesh Interlock Detail",                              label: "Mesh Interlock Detail",                              unit: "yes/no",              type: "residential" },
  { key: "Make of Mesh",                                       label: "Make of Mesh",                                       unit: "brand",               type: "residential" },
  { key: "Curved Glass",                                       label: "Curved Glass",                                       unit: "yes/no",              type: "residential" },
  { key: "No. of Floors",                                      label: "No. of Floors",                                      unit: "floors",              type: "residential" },
  { key: "Slider / Openable Integrated with Façade",           label: "Slider / Openable Integrated with Façade",           unit: "yes/no",              type: "residential" },
  { key: "Gutter – Integrated / Third Party",                  label: "Gutter – Integrated / Third Party",                  unit: "type",                type: "residential" },
];

// ── BOQ & HARDWARE ──────────────────────────────────────────────────────────
const BOQ_PARAMS = [
  // Shared
  { key: "Glazing / Façade Area",                              label: "Glazing / Façade Area",                              unit: "m²",                  type: "both" },
  { key: "Handle for Openable",                                label: "Handle for Openable",                                unit: "type",                type: "both" },
  { key: "No. of Locking Points (BOQ)",                        label: "No. of Locking Points",                              unit: "nos",                 type: "both" },
  { key: "Hardware Specification",                             label: "Hardware Specification",                             unit: "brand / grade",       type: "both" },
  { key: "Concealed Door Closure & Hinge",                     label: "Concealed Door Closure & Hinge",                     unit: "yes/no",              type: "both" },
  { key: "Screw Hole Caps",                                    label: "Screw Hole Caps",                                    unit: "yes/no",              type: "both" },
  { key: "Warranty Terms",                                     label: "Warranty Terms",                                     unit: "years",               type: "both" },

  // Commercial-only
  { key: "Door Threshold Type",                                label: "Door Threshold Type",                                unit: "type",                type: "commercial" },
  { key: "Distance – Glass Edge to Glass Support",             label: "Distance – Glass Edge to Glass Support",             unit: "mm",                  type: "commercial" },
  { key: "Aluminium Alloy (6063 / 6060)",                      label: "Aluminium Alloy (6063 / 6060)",                      unit: "alloy",               type: "commercial" },
  { key: "SS Screws & Hardware Grade",                         label: "SS 316 or 304 for Screws & Hardware",                unit: "SS 304 / 316",        type: "commercial" },
  { key: "Durability Requirements",                            label: "Durability Requirements",                            unit: "cycles / years",      type: "commercial" },
  { key: "PMU Requirement",                                    label: "PMU Requirements",                                   unit: "yes/no",              type: "commercial" },
  { key: "Lifting Provision",                                  label: "Lifting Provision",                                  unit: "yes/no",              type: "commercial" },
  { key: "Silicon Gasket",                                     label: "Silicon Gasket",                                     unit: "type",                type: "commercial" },
  { key: "Coating Specification (AAMA 2603 / 2604 / 2605)",   label: "Coating Specification (AAMA 2603 / 2604 / 2605)",   unit: "AAMA grade",          type: "commercial" },
  { key: "Metal Separator",                                    label: "Metal Separator",                                    unit: "yes/no",              type: "commercial" },
  { key: "Perimeter Rectangular Tube",                         label: "Perimeter Rectangular Tube",                         unit: "mm × mm",             type: "commercial" },
  { key: "Fasteners",                                          label: "Fasteners",                                          unit: "grade / type",        type: "commercial" },
  { key: "Fin End Caps",                                       label: "Fin End Caps",                                       unit: "yes/no",              type: "commercial" },
  { key: "Shims – Make / Type (HDG / PVC)",                    label: "Shims – Make / Type (HDG / PVC)",                    unit: "HDG / PVC",           type: "commercial" },

  // Residential-only
  { key: "Handle Requirements (Lockable / Non-Lockable / Custodian)", label: "Handle Requirements (Lockable / Non-Lockable / Custodian)", unit: "type", type: "residential" },
  { key: "Outside Pull Handle Required",                       label: "Outside Pull Handle Required",                       unit: "yes/no",              type: "residential" },
  { key: "Lock & Key Required",                                label: "Lock & Key Required",                                unit: "yes/no",              type: "residential" },
  { key: "Handle for Sliders",                                 label: "Handle for Sliders",                                 unit: "type",                type: "residential" },
  { key: "Standard / Custom Colour",                           label: "Standard / Custom Colour",                           unit: "standard / custom",   type: "residential" },
  { key: "Track Protection",                                   label: "Track Protection",                                   unit: "yes/no",              type: "residential" },
  { key: "Ventilator Type (Exhaust Fan / Louvre)",             label: "Ventilator Type (Exhaust Fan / Louvre)",             unit: "type",                type: "residential" },
  { key: "Door Type (Pivot / Swing)",                          label: "Door Type (Pivot / Swing)",                          unit: "type",                type: "residential" },
  { key: "Georgian Bar Requirements",                          label: "Georgian Bar Requirements",                          unit: "yes/no",              type: "residential" },
  { key: "Integration with Ventilators (Renson)",             label: "Integration with Ventilators (Renson)",             unit: "yes/no",              type: "residential" },
  { key: "Door Threshold (Frame / Medium / Flat)",             label: "Door Threshold (Frame / Medium / Flat)",             unit: "type",                type: "residential" },
  { key: "Interlock End Caps",                                 label: "Interlock End Caps",                                 unit: "yes/no",              type: "residential" },
  { key: "Door Stopper",                                       label: "Door Stopper",                                       unit: "yes/no",              type: "residential" },
  { key: "Automation",                                         label: "Automation",                                         unit: "yes/no",              type: "residential" },
];

// ── COMMERCIAL TERMS & CONDITIONS (identical for both types) ────────────────
const COMMERCIAL_TERMS_PARAMS = [
  { key: "DLP (Defect Liability Period)",                      label: "DLP (Defect Liability Period)",                      unit: "months",              type: "both" },
  { key: "BG (Bank Guarantee)",                                label: "BG (Bank Guarantee)",                                unit: "%",                   type: "both" },
  { key: "Retention",                                          label: "Retention",                                          unit: "%",                   type: "both" },
  { key: "Quotation Validity",                                 label: "Quotation Validity",                                 unit: "days / months",       type: "both" },
  { key: "NALCO Rate / Clause",                                label: "NALCO Rate / Clause",                                unit: "INR/kg",              type: "both" },
  { key: "Rate Validity",                                      label: "Rate Validity",                                      unit: "months",              type: "both" },
  { key: "Supplies Validity",                                  label: "Supplies Validity",                                  unit: "months",              type: "both" },
  { key: "Scope of Supply (CIF / Ex Works)",                   label: "Scope of Supply (CIF / Ex Works)",                   unit: "Incoterm",            type: "both" },
  { key: "Wastages",                                           label: "Wastages",                                           unit: "%",                   type: "both" },
  { key: "Project Completion Timelines",                       label: "Project Completion Timelines",                       unit: "months",              type: "both" },
  { key: "Project Management Requirements",                    label: "Project Management Requirements",                    unit: "text",                type: "both" },
  { key: "Shop Drawings",                                      label: "Shop Drawings",                                      unit: "text",                type: "both" },
  { key: "Tolerances",                                         label: "Tolerances",                                         unit: "±mm",                 type: "both" },
  { key: "PMU Cost",                                           label: "PMU Cost",                                           unit: "INR / lump sum",      type: "both" },
  { key: "Mode of Measurement (BOQ / Actual Size)",            label: "Mode of Measurement (BOQ / Actual Size)",            unit: "type",                type: "both" },
  { key: "Payment Terms",                                      label: "Payment Terms",                                      unit: "% / days",            type: "both" },
  { key: "MTC (Material Test Certificate)",                    label: "MTC (Material Test Certificate)",                    unit: "yes/no",              type: "both" },
  { key: "Protection Tape",                                    label: "Protection Tape",                                    unit: "yes/no",              type: "both" },
  { key: "No. of Lots Required",                               label: "No. of Lots Required",                               unit: "nos",                 type: "both" },
  { key: "Stationed Service Engineer",                         label: "Stationed Service Engineer",                         unit: "yes/no",              type: "both" },
  { key: "Stationed Project Manager",                          label: "Stationed Project Manager",                          unit: "yes/no",              type: "both" },
  { key: "Sample Board",                                       label: "Sample Board",                                       unit: "yes/no",              type: "both" },
];

// ── Master groups (all params, tagged) ──────────────────────────────────────
const ALL_PARAM_GROUPS = [
  { id: "technical_spec",   label: "Technical Specification",       params: TECH_SPEC_PARAMS },
  { id: "tender_drawing",   label: "Tender Drawing Requirements",   params: TENDER_DRAWING_PARAMS },
  { id: "boq_hardware",     label: "BOQ & Hardware",                params: BOQ_PARAMS },
  { id: "commercial_terms", label: "Commercial Terms & Conditions", params: COMMERCIAL_TERMS_PARAMS },
];

/**
 * Return PARAM_GROUPS filtered for the given project type.
 * @param {"commercial"|"residential"} projectType
 */
export function getParamGroups(projectType = "commercial") {
  const t = projectType === "residential" ? "residential" : "commercial";
  return ALL_PARAM_GROUPS.map(g => ({
    ...g,
    params: g.params.filter(p => p.type === "both" || p.type === t),
  }));
}

/**
 * Flat list of required params for a project type (used for merge/export).
 */
export function getRequiredParams(projectType = "commercial") {
  return getParamGroups(projectType).flatMap(g =>
    g.params.map(p => ({ ...p, group: g.id, groupLabel: g.label }))
  );
}
