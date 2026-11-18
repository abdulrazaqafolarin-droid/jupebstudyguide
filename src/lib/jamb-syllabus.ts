/**
 * JAMB syllabus source catalogue for Rutex Master.
 *
 * Transcribed into searchable topic outlines from the five source PDFs uploaded
 * to the repository on 18 Nov 2026. The source files were authored/created in
 * 2025 and are retained as candidate source copies; current IBASS reconciliation
 * is deliberately pending. Do not use this catalogue to assert the current
 * official exam format or unlock a full mock.
 */
export type JambSyllabusSubjectId = "physics" | "chemistry" | "biology" | "math" | "use_of_english";
export type JambSyllabusReviewState = "needs_current_source_review";

export interface JambSyllabusTopic {
  id: string;
  number: string;
  title: string;
  outline: string[];
  sourcePages: number[];
}

export interface JambSyllabusSection {
  id: string;
  title: string;
  topics: JambSyllabusTopic[];
}

export interface JambSyllabusSubject {
  id: JambSyllabusSubjectId;
  label: string;
  icon: string;
  description: string;
  compulsory: boolean;
  questionBankAvailable: boolean;
  questionSourcePackAvailable: boolean;
  sourceFile: string;
  sourceSha256: string;
  sourcePageCount: number;
  reviewState: JambSyllabusReviewState;
  generalObjectives: string[];
  sections: JambSyllabusSection[];
}

const topic = (
  id: string,
  number: string,
  title: string,
  outline: string[],
  sourcePages: number[],
): JambSyllabusTopic => ({ id, number, title, outline, sourcePages });

export const JAMB_SYLLABUS_SUBJECTS: JambSyllabusSubjectId[] = [
  "use_of_english", "mathematics", "physics", "chemistry", "biology",
];

export const JAMB_SYLLABUS: Record<JambSyllabusSubjectId, JambSyllabusSubject> = {
  physics: {
    id: "physics", label: "Physics", icon: "⚛️",
    description: "Measurements, mechanics, thermal physics, waves, optics, electricity and modern physics",
    compulsory: false, questionBankAvailable: false, questionSourcePackAvailable: true,
    sourceFile: "Physics-1.pdf",
    sourceSha256: "62f5ac84592735cd5829296cb52da5bc8b582ee0f2227999cca73b58dcabfee5",
    sourcePageCount: 20, reviewState: "needs_current_source_review",
    generalObjectives: [
      "Sustain interest in physics.",
      "Develop attitudes relevant to accuracy, precision and objectivity.",
      "Interpret physical phenomena, laws, definitions, concepts and theories.",
      "Solve physics problems correctly using relevant theories and concepts.",
    ],
    sections: [{
      id: "physics-core", title: "Physics syllabus",
      topics: [
        topic("phy-01-measurements", "1", "Measurements and Units", ["Fundamental and derived units", "Measuring instruments", "Fundamental physical quantities", "Dimensions", "Experimental accuracy, errors and significant figures"], [1,2]),
        topic("phy-02-scalars-vectors", "2", "Scalars and Vectors", ["Scalar and vector quantities", "Relative velocity", "Resolution of vectors", "Graphical methods", "Measurement, position, distance and displacement", "Coordinates and frame of reference"], [2]),
        topic("phy-04-motion", "3", "Motion", ["Newton's laws", "Types and causes of motion", "Linear motion and motion graphs", "Projectiles", "Circular motion", "Simple harmonic motion"], [3,4]),
        topic("phy-05-gravitational-field", "4", "Gravitational Field", ["Universal gravitation", "Gravitational potential and fields", "Acceleration due to gravity", "Mass and weight", "Escape velocity and orbits"], [4]),
        topic("phy-06-equilibrium", "5", "Equilibrium of Forces", ["Equilibrium of particles", "Triangles and polygon of forces", "Lami's theorem", "Principle of moments and torque", "Centre of gravity and stability"], [5]),
        topic("phy-07-friction", "6", "Friction", ["Static and dynamic friction", "Coefficient of limiting friction", "Advantages and reduction of friction", "Viscosity and terminal velocity", "Stoke's law"], [5]),
        topic("phy-08-work-energy-power", "7", "Work, Energy and Power", ["Forms and conservation of energy", "Energy conversion", "Energy and society", "Dams, nuclear and solar energy"], [5,6]),
        topic("phy-09-simple-machines", "8", "Simple Machines", ["Types of simple machines", "Mechanical advantage", "Velocity ratio", "Efficiency"], [6]),
        topic("phy-10-elasticity", "9", "Elasticity: Hooke's Law and Young's Modulus", ["Elastic limit, yield point and breaking point", "Spring balance", "Work done in springs and elastic strings"], [7]),
        topic("phy-11-pressure", "10", "Pressure", ["Atmospheric pressure and its measurement", "Barometers and manometers", "Pressure in liquids", "Pascal's principle"], [7]),
        topic("phy-12-liquids-rest", "11", "Liquids at Rest", ["Density and relative density", "Upthrust", "Archimedes' principle", "Law of floatation and applications"], [7]),
        topic("phy-13-temperature", "12", "Temperature and Its Measurement", ["Thermometric properties", "Calibration of thermometers", "Celsius and Kelvin scales", "Types of thermometers"], [7,8]),
        topic("phy-14-quantity-heat", "13", "Quantity of Heat", ["Heat capacity", "Specific heat capacity", "Methods of determining heat capacity", "Newton's law of cooling"], [8]),
        topic("phy-15-change-state", "14", "Change of State", ["Latent heat", "Specific latent heat of fusion and vaporisation", "Melting, evaporation and boiling", "Effects of pressure and dissolved substances"], [8]),
        topic("phy-16-thermal-expansion", "15", "Thermal Expansion", ["Expansion of solids", "Linear, area and volume expansivity", "Expansion of liquids", "Anomalous expansion of water"], [8,9]),
        topic("phy-17-gas-laws", "16", "Gas Laws", ["Boyle's law", "Charles' law", "Pressure law", "General and ideal gas equations", "Real gases"], [9]),
        topic("phy-18-vapours", "17", "Vapours", ["Saturated and unsaturated vapours", "Saturated vapour pressure and boiling", "Dew point, humidity and relative humidity", "Hygrometry"], [9]),
        topic("phy-19-structure-matter", "18", "Structure of Matter and Kinetic Theory", ["Molecular nature of matter", "Atoms and molecules", "Brownian motion and diffusion", "Kinetic theory and gas pressure"], [9,10]),
        topic("phy-20-heat-transfer", "19", "Heat Transfer", ["Conduction, convection and radiation", "Thermal conductivity and heat flux", "Absorption and radiation", "Vacuum flask", "Land and sea breeze"], [10]),
        topic("phy-21-waves", "20", "Waves", ["Production and propagation", "Wave types and classification", "Frequency, wavelength and velocity", "Reflection, refraction and diffraction", "Superposition, interference and beats"], [10,11]),
        topic("phy-22-sound-propagation", "21", "Propagation of Sound Waves", ["Need for a material medium", "Speed of sound in solids, liquids and air", "Reflection, echoes and reverberation"], [11]),
        topic("phy-23-sound-characteristics", "22", "Characteristics of Sound Waves", ["Noise and musical notes", "Quality, pitch, intensity and loudness", "Harmonics and overtones"], [12]),
        topic("phy-24-light-energy", "23", "Light Energy", ["Sources and nature of light", "Propagation of light", "Applications of light"], [12]),
        topic("phy-25-reflection", "24", "Reflection of Light at Plane and Curved Surfaces", ["Laws of reflection", "Plane and curved mirrors", "Image formation and applications"], [12,13]),
        topic("phy-26-refraction", "25", "Refraction of Light", ["Laws of refraction", "Refractive index", "Critical angle and total internal reflection", "Refraction through prisms and lenses"], [13]),
        topic("phy-27-optical-instruments", "26", "Optical Instruments", ["Simple microscope", "Compound microscope", "Telescope", "Camera and related instruments"], [13]),
        topic("phy-28-dispersion", "27", "Dispersion of Light and Colours", ["Dispersion through a prism", "Spectrum and colour", "Applications of dispersion"], [14]),
        topic("phy-29-electrostatics", "28", "Electrostatics", ["Electric charges", "Coulomb's law", "Electric fields and potential", "Applications"], [14]),
        topic("phy-30-capacitors", "29", "Capacitors", ["Capacitance", "Dielectrics", "Series and parallel combinations", "Energy stored"], [14]),
        topic("phy-31-electric-cells", "30", "Electric Cells", ["Cells and electromotive force", "Internal resistance", "Series and parallel cell combinations"], [15]),
        topic("phy-32-current-electricity", "31", "Current Electricity", ["Electric current and potential difference", "Ohm's law", "Resistance and resistivity", "Electric circuits"], [15]),
        topic("phy-33-electrical-energy-power", "32", "Electrical Energy and Power", ["Electrical energy", "Power", "Electrical energy consumption and applications"], [15]),
        topic("phy-34-magnets", "33", "Magnets and Magnetic Fields", ["Magnetic poles and fields", "Magnetic materials", "Earth's magnetic field"], [16]),
        topic("phy-35-force-current-conductor", "34", "Force on a Current-Carrying Conductor in a Magnetic Field", ["Force on a conductor", "Direction of force", "Applications in electric motors"], [16,17]),
        topic("phy-36-electromagnetic-induction", "35", "Electromagnetic Induction", ["Faraday's law", "Lenz's law", "Induced e.m.f. and current", "Applications"], [17]),
        topic("phy-37-ac-circuits", "36", "Simple A.C. Circuits", ["Alternating current and voltage", "A.C. circuit behaviour", "Transformers and applications"], [17]),
        topic("phy-38-electricity-gases", "37", "Conduction of Electricity Through Gases", ["Ionisation", "Discharge through gases", "Applications and observations"], [18]),
        topic("phy-38-modern-physics", "38", "Elementary Modern Physics", ["Atomic models and structure", "Energy levels and spectra", "Photoelectric effect", "X-rays", "Radioactivity, half-life and nuclear energy", "Wave-particle duality"], [18,19]),
        topic("phy-39-electronics", "39", "Introductory Electronics", ["Conductors, semiconductors and insulators", "Intrinsic and extrinsic semiconductors", "Diodes and transistors"], [19]),
        topic("phy-40-fibre-lasers", "40", "Introduction to Fibre Optics and Lasers", ["Fibre optics and light transmission", "Laser types", "Applications and safety"], [19,20]),
      ],
    }],
  },
  chemistry: {
    id: "chemistry", label: "Chemistry", icon: "🧪",
    description: "Chemical principles, reactions, calculations, compounds and industry",
    compulsory: false, questionBankAvailable: false, questionSourcePackAvailable: true,
    sourceFile: "Chemistry-1.pdf",
    sourceSha256: "a3c15bfee3bece851d6a7ec9b6ce85909aa94f1657d0d01b76d96a5d904467f5",
    sourcePageCount: 16, reviewState: "needs_current_source_review",
    generalObjectives: [
      "Understand the basic principles and concepts in chemistry.",
      "Interpret scientific data relating to chemistry.",
      "Deduce relationships between chemistry and other sciences.",
      "Apply chemistry knowledge to industry and everyday life.",
    ],
    sections: [{
      id: "chemistry-core", title: "Chemistry syllabus",
      topics: [
        topic("chem-01-separation", "1", "Separation of Mixtures and Purification of Chemical Substances", ["Elements, compounds and mixtures", "Chemical and physical changes", "Pure and impure substances", "Boiling, density, freezing and melting points", "Evaporation, distillation, sublimation, crystallisation, filtration and chromatography"], [1]),
        topic("chem-02-combination", "2", "Chemical Combination", ["Laws of chemical combination", "Chemical symbols, formulae and equations", "Relative atomic mass", "Mole concept and stoichiometry"], [1,2]),
        topic("chem-03-kinetic-theory", "3", "Kinetic Theory of Matter and Gas Laws", ["States of matter and change of state", "Kinetic theory", "Boyle's, Charles', Avogadro's and related gas laws", "Ideal gas equation and real gases"], [2]),
        topic("chem-04-atomic-structure", "4", "Atomic Structure and Bonding", ["Atoms, molecules and ions", "Atomic models and electronic structure", "Isotopy and orbitals", "Periodic table and periodicity", "Ionic, covalent, metallic and hydrogen bonding"], [2,3]),
        topic("chem-05-nuclear", "5", "Nuclear Chemistry", ["Radioactivity and radioactive decay", "Properties and uses of radioactive emissions", "Half-life and nuclear reactions"], [3,4]),
        topic("chem-06-solubility", "6", "Solubility", ["Solutions and solubility", "Factors affecting solubility", "Solubility curves and calculations", "Crystallisation"], [4]),
        topic("chem-07-pollution", "7", "Environmental Pollution", ["Air, water and land pollution", "Sources and effects of pollutants", "Pollution control"], [4,5]),
        topic("chem-08-acids-bases-salts", "8", "Acids, Bases and Salts", ["Properties and definitions", "pH and indicators", "Neutralisation", "Preparation and uses of salts"], [5,6]),
        topic("chem-09-redox", "9", "Oxidation and Reduction (Redox)", ["Oxidation and reduction concepts", "Oxidation numbers", "Redox equations and applications"], [6,7]),
        topic("chem-10-electrolysis", "10", "Electrolysis", ["Electrolytes and non-electrolytes", "Electrolysis of melts and solutions", "Electrodes and discharge of ions", "Faraday's laws and applications"], [7]),
        topic("chem-11-energy-changes", "11", "Energy Changes", ["Exothermic and endothermic reactions", "Enthalpy and energy profiles", "Bond energy and calorimetry"], [7,8]),
        topic("chem-12-reaction-rates", "12", "Rates of Chemical Reaction", ["Rate measurement", "Collision theory", "Effects of concentration, temperature, pressure, surface area and catalysts"], [8]),
        topic("chem-13-equilibria", "13", "Chemical Equilibria", ["Reversible reactions", "Dynamic equilibrium", "Le Chatelier's principle", "Equilibrium constants and applications"], [8,9]),
        topic("chem-14-nonmetals", "14", "Non-metals and Their Compounds", ["Hydrogen and water", "Halogens", "Oxygen and sulphur", "Nitrogen and its compounds", "Carbon and its compounds"], [9,10,11]),
        topic("chem-15-metals", "15", "Metals and Their Compounds", ["Occurrence and extraction", "Properties and reactions", "Compounds and uses of selected metals", "Alloys and corrosion"], [11,12]),
        topic("chem-16-organic", "16", "Organic Compounds", ["Hydrocarbons and homologous series", "Functional groups", "Nomenclature and isomerism", "Reactions and uses of organic compounds"], [13,14]),
        topic("chem-17-industry", "17", "Chemistry and Industry", ["Chemical industries and raw materials", "Industrial processes", "Products, economic importance and environmental impact"], [15]),
        topic("chem-18-astronomical", "18", "Astronomical Chemistry", ["Elements and compounds in space", "Chemical processes in stars and celestial bodies"], [15,16]),
      ],
    }],
  },
  biology: {
    id: "biology", label: "Biology", icon: "🧬",
    description: "Living organisms, form and functions, ecology, heredity and evolution",
    compulsory: false, questionBankAvailable: false, questionSourcePackAvailable: true,
    sourceFile: "Biology-1.pdf",
    sourceSha256: "8afb9aa5c3bece851d6a7ec9b6ce85909aa94f1657d0d01b76d96a5d904467f5",
    sourcePageCount: 12, reviewState: "needs_current_source_review",
    generalObjectives: [
      "Demonstrate knowledge of diversity, interdependence and unity of life.",
      "Account for continuity of life through reorganization, inheritance and evolution.",
      "Apply biological principles to living things, society, the environment, community health and the economy.",
    ],
    sections: [
      { id: "biology-a", title: "A. Variety of Organisms", topics: [
        topic("bio-a-01-living-organisms", "1", "Living Organisms", ["Characteristics of living things", "Cell structure and functions", "Levels of organisation: cell, tissue, organ, system and organism"], [1]),
        topic("bio-a-02-evolution-organisms", "2", "Evolution Among Organisms", ["Monera, Protista and Fungi", "Plant groups: Thallophyta, Bryophyta, Pteridophyta and Spermatophyta", "Invertebrates and vertebrates", "Structural complexity and life histories"], [1,2]),
        topic("bio-a-03-adaptations", "3", "Structural, Functional and Behavioural Adaptations", ["Adaptive colouration", "Behavioural adaptations in social animals", "Structural adaptations", "Feeding, protection, mating, temperature regulation and water conservation"], [2]),
      ]},
      { id: "biology-b", title: "B. Form and Functions", topics: [
        topic("bio-b-01-plant-structure", "1", "Internal Structure of a Flowering Plant", ["Root, stem and leaf structure", "Supporting tissues", "Internal structure of a mammal"], [3]),
        topic("bio-b-02-nutrition", "2", "Nutrition", ["Autotrophic and heterotrophic nutrition", "Photosynthesis and chemosynthesis", "Mineral requirements", "Animal nutrition, food classes and food tests", "Teeth and alimentary canal"], [3,4]),
        topic("bio-b-03-transport", "3", "Transport", ["Need and materials for transportation", "Mammalian circulatory system", "Plant vascular system", "Transport media and mechanisms"], [4]),
        topic("bio-b-04-respiration", "4", "Respiration", ["Respiratory organs and surfaces", "Gaseous exchange in plants and animals", "Aerobic and anaerobic respiration"], [4,5]),
        topic("bio-b-05-excretion", "5", "Excretion", ["Excretory organs and products", "Excretion in plants and animals", "Osmoregulation"], [5]),
        topic("bio-b-06-support-movement", "6", "Support and Movement", ["Support in plants", "Skeleton and support in animals", "Movement and locomotion"], [5]),
        topic("bio-b-07-reproduction", "7", "Reproduction", ["Asexual and sexual reproduction", "Reproduction in flowering plants", "Pollination and fertilisation", "Reproduction in mammals"], [5,6]),
        topic("bio-b-08-growth", "8", "Growth", ["Meaning and stages of growth", "Seed germination and conditions necessary for germination"], [6]),
        topic("bio-b-09-coordination", "9", "Co-ordination and Control", ["Nervous coordination and impulse transmission", "Reflex action", "Sense organs", "Hormonal control", "Homeostasis"], [6]),
      ]},
      { id: "biology-c", title: "C. Ecology", topics: [
        topic("bio-c-01-distribution", "1", "Factors Affecting the Distribution of Organisms", ["Abiotic factors", "Biotic factors"], [6,7]),
        topic("bio-c-02-symbiosis", "2", "Symbiotic Interactions of Plants and Animals", ["Energy flow, food chains and food webs", "Trophic levels", "Carbon, water and nitrogen cycles"], [7]),
        topic("bio-c-03-habitats", "3", "Natural Habitats", ["Aquatic habitats", "Terrestrial and arboreal habitats"], [7]),
        topic("bio-c-04-biomes", "4", "Local Nigerian Biomes", ["Tropical rainforest", "Guinea and Sudan savanna", "Desert", "Montane forests and highland grasslands"], [7]),
        topic("bio-c-05-populations", "5", "The Ecology of Populations", ["Population density and overcrowding", "Competition and succession", "Biotic and abiotic factors affecting population size"], [7,8]),
        topic("bio-c-06-soil", "6", "Soil", ["Soil types and structure", "Porosity, capillarity and humus", "Soil components and organisms", "Soil fertility, loss, renewal and maintenance"], [8]),
        topic("bio-c-07-humans-environment", "7", "Humans and the Environment", ["Common and endemic diseases", "Drug abuse and prevention", "Pollution, sanitation and sewage", "Conservation, game reserves and national parks"], [8,9]),
      ]},
      { id: "biology-d", title: "D. Heredity and Variations", topics: [
        topic("bio-d-01-variation", "1", "Variation in Population", ["Morphological variation", "Physiological variation", "Applications in crime detection, blood transfusion and paternity"], [9]),
        topic("bio-d-02-heredity", "2", "Heredity", ["Heritable and non-heritable characters", "Chromosomes and transmission of hereditary characters", "Genetic probability and sex determination", "Applications in agriculture and medicine", "Sex-linked characters"], [10]),
        topic("bio-d-03-biotechnology", "3", "Biotechnology", ["Applications in agriculture", "Applications in medicine and pharmaceuticals", "Applications in the food industry"], [10]),
      ]},
      { id: "biology-e", title: "E. Evolution", topics: [
        topic("bio-e-01-theories", "1", "Theories of Evolution", ["Lamarck's theory", "Darwin's theory", "Organic theory"], [11]),
        topic("bio-e-02-evidence", "2", "Evidence of Evolution", ["Evidence used to explain evolutionary change"], [11]),
      ]},
    ],
  },
  math: {
    id: "math", label: "Mathematics", icon: "📐",
    description: "Number and numeration, algebra, geometry, trigonometry, calculus and statistics",
    compulsory: false, questionBankAvailable: false, questionSourcePackAvailable: false,
    sourceFile: "Mathematics.pdf",
    sourceSha256: "aff7a7c2cc46036902dda38db1d1567d10982de709305cfbfc90dc437329754f",
    sourcePageCount: 6, reviewState: "needs_current_source_review",
    generalObjectives: [
      "Acquire computational and manipulative skills.",
      "Develop precise, logical and formal reasoning skills.",
      "Develop deductive skills in interpretation of graphs, diagrams and data.",
      "Apply mathematical concepts to resolve issues in daily living.",
    ],
    sections: [
      { id: "math-i", title: "I. Number and Numeration", topics: [
        topic("math-i-01-number-bases", "1", "Number Bases and Modular Arithmetic", ["Operations in bases 2 to 10", "Conversion between bases, including fractions", "Modular arithmetic"], [2]),
        topic("math-i-02-fractions-percentages", "2", "Fractions, Decimals, Approximations and Percentages", ["Fractions and decimals", "Significant figures and decimal places", "Percentage errors", "Simple interest, profit and loss", "Ratio, proportion, rate, shares and VAT"], [2]),
        topic("math-i-03-indices-log-surds", "3", "Indices, Logarithms and Surds", ["Laws and equations of indices", "Standard form", "Laws of logarithms and change of base", "Relationship between indices and logarithms", "Surds"], [2]),
        topic("math-i-04-sets", "4", "Sets", ["Types and algebra of sets", "Venn diagrams and applications"], [2]),
      ]},
      { id: "math-ii", title: "II. Algebra", topics: [
        topic("math-ii-01-polynomials", "1", "Polynomials", ["Change of subject of formula", "Polynomial operations", "Factorisation and roots up to degree three", "Factor and remainder theorems", "Simultaneous equations and polynomial graphs"], [2,3]),
        topic("math-ii-02-variation", "2", "Variation", ["Direct, inverse, joint and partial variation", "Percentage increase and decrease"], [3]),
        topic("math-ii-03-inequalities", "3", "Inequalities", ["Analytical and graphical linear inequalities", "Quadratic inequalities"], [3]),
        topic("math-ii-04-progression", "4", "Progression", ["Nth term", "Arithmetic progression", "Geometric progression and sums"], [3]),
        topic("math-ii-05-binary-operations", "5", "Binary Operations", ["Closure, commutativity, associativity and distributivity", "Identity and inverse elements"], [3]),
        topic("math-ii-06-matrices", "6", "Matrices and Determinants", ["Matrix operations up to 3 x 3", "Determinants up to 3 x 3", "Inverse of 2 x 2 matrices"], [3]),
      ]},
      { id: "math-iii", title: "III. Geometry and Trigonometry", topics: [
        topic("math-iii-01-euclidean", "1", "Euclidean Geometry", ["Angles and lines", "Polygons", "Circle theorems and cyclic quadrilaterals", "Construction"], [3]),
        topic("math-iii-02-mensuration", "2", "Mensuration", ["Lengths, perimeters and plane areas", "Arcs, chords, sectors and segments", "Surface areas and volumes", "Longitudes and latitudes"], [4]),
        topic("math-iii-03-loci", "3", "Loci", ["Two-dimensional loci based on lines and curves"], [4]),
        topic("math-iii-04-coordinate-geometry", "4", "Coordinate Geometry", ["Midpoint and gradient", "Distance between points", "Parallel and perpendicular lines", "Equations of straight lines"], [4]),
        topic("math-iii-05-trigonometry", "5", "Trigonometry", ["Trigonometric ratios", "Elevation, depression and bearings", "Areas and solutions of triangles", "Sine and cosine graphs and formulae"], [4]),
      ]},
      { id: "math-iv", title: "IV. Calculus", topics: [
        topic("math-iv-01-differentiation", "1", "Differentiation", ["Limits of functions", "Differentiation of explicit algebraic functions", "Simple trigonometric functions"], [4]),
        topic("math-iv-02-applications", "2", "Application of Differentiation", ["Rates of change", "Maxima and minima"], [4,5]),
        topic("math-iv-03-integration", "3", "Integration", ["Integration of explicit algebraic functions", "Simple trigonometric functions", "Area under a curve"], [5]),
      ]},
      { id: "math-v", title: "V. Statistics", topics: [
        topic("math-v-01-data", "1", "Representation of Data", ["Frequency distribution", "Histograms, bar charts and pie charts"], [5]),
        topic("math-v-02-location", "2", "Measures of Location", ["Mean, mode and median", "Cumulative frequency"], [5]),
        topic("math-v-03-dispersion", "3", "Measures of Dispersion", ["Range, mean deviation, variance and standard deviation"], [5]),
        topic("math-v-04-permutation", "4", "Permutation and Combination", ["Linear and circular arrangements", "Arrangements involving repeated objects"], [5]),
        topic("math-v-05-probability", "5", "Probability", ["Experimental probability", "Addition and multiplication of probabilities", "Mutually exclusive and independent events"], [5]),
      ]},
    ],
  },
  use_of_english: {
    id: "use_of_english", label: "Use of English", icon: "📖",
    description: "Comprehension and summary, lexis and structure, and oral forms",
    compulsory: true, questionBankAvailable: false, questionSourcePackAvailable: false,
    sourceFile: "Use of English.pdf",
    sourceSha256: "f2b6bc4f2c30fc19ecf57bc14778100ce0deca59445beff9f7e10f34cbf7da18",
    sourcePageCount: 5, reviewState: "needs_current_source_review",
    generalObjectives: [
      "Communicate effectively in written and spoken English.",
      "Use English Language for learning at the tertiary level.",
    ],
    sections: [
      { id: "english-a", title: "A. Comprehension and Summary", topics: [
        topic("eng-a-01-comprehension-summary", "A", "Comprehension and Summary", ["Description, narration, exposition and argumentation/persuasion", "Comprehension of passages and vocabulary in context", "Coherence, logical reasoning and inference", "Approved reading text", "Synthesis of ideas"], [1,2]),
      ]},
      { id: "english-b", title: "B. Lexis and Structure", topics: [
        topic("eng-b-01-lexis-structure", "B", "Lexis and Structure", ["Synonyms and antonyms", "Clause and sentence patterns", "Word classes and functions", "Mood, tense, aspect, number, agreement and degree", "Question tags and mechanics", "Ordinary, figurative and idiomatic usage"], [2]),
      ]},
      { id: "english-c", title: "C. Oral Forms", topics: [
        topic("eng-c-01-oral-forms", "C", "Oral Forms", ["Vowels: monophthongs, diphthongs and triphthongs", "Consonants and clusters", "Rhymes and homophones", "Word stress", "Emphatic stress in connected speech"], [2]),
      ]},
    ],
  },
};

export const JAMB_SYLLABUS_REVIEW_NOTICE =
  "This catalogue is transcribed into topic outlines from the five source PDFs uploaded to the Rutex repository. Their metadata identifies them as 2025-created copies. The uploaded Physics and Use of English content differs from JAMB-hosted copies checked during this review; Chemistry and Mathematics still need current IBASS reconciliation. Topics are visible for planning, but this catalogue is not marked as the verified current or 2027 official syllabus.";

export const JAMB_SYLLABUS_VERSION = "uploaded-source-candidate-2025";
export const JAMB_SYLLABUS_VERIFIED = false;

export function getJambSyllabusSubject(id: string): JambSyllabusSubject | undefined {
  return JAMB_SYLLABUS[id as JambSyllabusSubjectId];
}

export function getJambSyllabusTopic(
  subjectId: JambSyllabusSubjectId,
  topicId: string,
): JambSyllabusTopic | undefined {
  return JAMB_SYLLABUS[subjectId].sections
    .flatMap((section) => section.topics)
    .find((item) => item.id === topicId);
}

export function getJambSyllabusTopicCount(subjectId?: JambSyllabusSubjectId): number {
  const subjects = subjectId ? [JAMB_SYLLABUS[subjectId]] : Object.values(JAMB_SYLLABUS);
  return subjects.reduce(
    (total, subject) => total + subject.sections.reduce((sum, section) => sum + section.topics.length, 0),
    0,
  );
}
