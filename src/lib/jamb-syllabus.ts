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
  objectives?: string[];
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
  sourcePageLabel?: string;
  officialSourceUrl?: string;
  officialSourceCheckedAt?: string;
  sourceComparisonNote?: string;
  examinationStructure?: string[];
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
  "use_of_english", "math", "physics", "chemistry", "biology",
];

export const JAMB_SYLLABUS: Record<JambSyllabusSubjectId, JambSyllabusSubject> = {
  physics: {
    id: "physics", label: "Physics", icon: "⚛️",
    description: "Measurements, mechanics, thermal physics, waves, optics, electricity and modern physics",
    compulsory: false, questionBankAvailable: false, questionSourcePackAvailable: true,
    sourceFile: "Physics-1.pdf",
    sourceSha256: "62f5ac84592735cd5829296cb52da5bc8b582ee0f2227999cca73b58dcabfee5",
    sourcePageCount: 20, reviewState: "needs_current_source_review",
    officialSourceUrl: "https://ibass.jamb.gov.ng/assets/uploads/Physics.pdf",
    officialSourceCheckedAt: "2026-11-19",
    sourcePageLabel: "JAMB IBASS printed pages",
    sourceComparisonNote: "The current JAMB-hosted IBASS Physics PDF lists 39 topics. The uploaded July 2025 copy has different topic ordering and includes a separate Fibre Optics and Lasers topic; the current IBASS PDF instead includes optical fibre within Refraction and does not list a separate fibre/laser topic. This catalogue follows the JAMB-hosted 39-topic IBASS structure. The uploaded PDF remains linked separately as provenance for the source pack, and no questions from it are published.",
    generalObjectives: [
      "Sustain interest in physics.",
      "Develop attitudes that encourage accuracy, precision and objectivity.",
      "Interpret physical phenomena, laws, definitions, concepts and theories.",
      "Solve physics problems correctly using relevant theories and concepts.",
    ],
    sections: [{ id: "physics-core", title: "Physics syllabus (current IBASS structure)", topics: [
        {
          ...topic("phy-01-measurements", "1", "Measurements and Units", ["Length, area and volume; metre rule, vernier callipers, micrometer screw gauge and measuring cylinder","Mass, beam balances and time-measuring devices","Fundamental and derived quantities, dimensions and dimensional homogeneity","Accuracy, errors, significant figures and standard form","Position, distance, displacement, coordinates and frame of reference"], [172,173]),
          objectives: ["Identify units of length, area and volume and use measuring instruments to determine regular and irregular bodies.","Identify mass and time units and use beam balances and time-measuring devices.","Relate fundamental quantities to units and deduce derived units and dimensions; test equation homogeneity.","Assess instrument accuracy, estimate errors and express measurements in standard form.","Use measuring tools, compasses, protractors and Cartesian coordinates; plot graphs and draw inferences."],
        },
        {
          ...topic("phy-02-scalars-vectors", "2", "Scalars and Vectors", ["Definitions and examples of scalar and vector quantities","Relative velocity","Resolution of vectors into perpendicular directions, including graphical methods"], [173]),
          objectives: ["Distinguish scalars from vectors and give examples.","Determine resultants and relative velocity; resolve vectors into perpendicular components.","Use graphical methods to solve vector problems."],
        },
        {
          ...topic("phy-03-motion", "3", "Motion", ["Translational, oscillatory, rotational, spin and random motion; relative motion and causes","Contact and field forces","Linear motion, projectiles, Newton's laws, impulse and momentum","Circular motion and simple harmonic motion"], [174,175]),
          objectives: ["Identify types of motion and solve collinear-motion problems.","Identify force as a cause of motion; distinguish contact and field forces; differentiate speed, velocity and acceleration.","Deduce uniformly accelerated-motion equations; solve gravity and projectile problems; interpret motion graphs.","Solve impulse and momentum problems; interpret Newton's laws, force-time graphs and conservation of momentum.","Solve circular-motion problems; relate period and frequency; analyse simple harmonic motion, forced vibration and resonance."],
        },
        {
          ...topic("phy-04-gravitational-field", "4", "Gravitational Field", ["Universal gravitation, gravitational potential and conservative and non-conservative fields","Acceleration due to gravity and its variation over the Earth's surface","Mass, weight, escape velocity, parking orbits and weightlessness"], [175]),
          objectives: ["Apply Newton's law of universal gravitation and identify gravitational force between bodies.","Give examples of conservative and non-conservative fields and deduce gravitational potential.","Explain variation in g, distinguish mass from weight and determine escape velocity."],
        },
        {
          ...topic("phy-05-equilibrium", "5", "Equilibrium of Forces", ["Equilibrium of coplanar forces, triangle and polygon laws and Lami's theorem","Moments, couples, rigid-body equilibrium, resultants and equilibrants","Centre of gravity and stable, unstable and neutral equilibrium"], [175]),
          objectives: ["Apply conditions for equilibrium of coplanar forces and use triangle/polygon laws and Lami's theorem.","Determine moments and couples and describe applications.","Apply rigid-body equilibrium, resolve forces and determine resultants and equilibrants.","Differentiate stable, unstable and neutral equilibrium."],
        },
        {
          ...topic("phy-06-work-energy-power", "6", "Work, Energy and Power", ["Work, energy, power, forms and conservation of energy","Energy transformation and area under force-distance curve","Energy sources, development, diversification, environmental impact and energy crises","Dams, nuclear energy and solar energy"], [175,176]),
          objectives: ["Differentiate work, energy and power and compare energy forms.","Apply conservation and transformation of energy; interpret force-distance graphs and solve numerical problems.","Identify energy sources and distinguish renewable from non-renewable energy.","Explain energy's role in development, environmental impact, safe use and energy conversion.","Identify energy-production devices, dams, nuclear and solar energy."],
        },
        {
          ...topic("phy-07-friction", "7", "Friction", ["Static and dynamic friction; coefficient of limiting friction","Advantages, disadvantages and reduction of friction","Viscosity, terminal velocity and Stoke's law"], [176]),
          objectives: ["Differentiate static and dynamic friction and determine limiting-friction coefficient.","Compare advantages and disadvantages and suggest ways to reduce friction.","Analyse factors affecting viscosity and terminal velocity and apply Stoke's law."],
        },
        {
          ...topic("phy-08-simple-machines", "8", "Simple Machines", ["Definition and types of simple machines","Mechanical advantage, velocity ratio and efficiency"], [176]),
          objectives: ["Identify types of simple machines.","Solve problems involving simple machines, mechanical advantage, velocity ratio and efficiency."],
        },
        {
          ...topic("phy-09-elasticity", "9", "Elasticity", ["Elastic limit, yield point, breaking point, Hooke's law and Young's modulus","Spring balance and work done per unit volume in springs and elastic strings"], [177]),
          objectives: ["Interpret force-extension curves, Hooke's law and Young's modulus.","Use a spring balance to measure force and determine work done in springs and elastic strings."],
        },
        {
          ...topic("phy-10-pressure", "10", "Pressure", ["Atmospheric pressure, SI unit and measurement; barometers and manometers","Variation of pressure with height and barometer as altimeter","Pressure in liquids, depth, density and Pascal's principle"], [177]),
          objectives: ["Recognise pressure units and identify pressure-measuring instruments.","Relate pressure to height and use a barometer as an altimeter.","Determine pressure-depth-density relationships and apply pressure transmission in liquids."],
        },
        {
          ...topic("phy-11-liquids-rest", "11", "Liquids at Rest", ["Density and relative density of solids and liquids","Upthrust, Archimedes' principle and law of floatation","Applications such as ships and hydrometers"], [177]),
          objectives: ["Distinguish density from relative density.","Determine upthrust on an immersed body.","Apply Archimedes' principle and the law of floatation."],
        },
        {
          ...topic("phy-12-temperature", "12", "Temperature and Its Measurement", ["Temperature and thermometric properties","Calibration and types of thermometers","Celsius and Kelvin scales and conversion"], [178]),
          objectives: ["Identify thermometric properties and calibrate thermometers.","Compare thermometer types and convert between Celsius and Kelvin scales."],
        },
        {
          ...topic("phy-13-thermal-expansion", "13", "Thermal Expansion", ["Linear, area and volume expansivities of solids","Applications and relationships between coefficients of expansivity","Real and apparent volume expansivity of liquids and anomalous expansion of water"], [178]),
          objectives: ["Determine linear and volume expansivities and assess applications.","Determine relationships between expansivities.","Determine volume, apparent and real expansivities of liquids and analyse anomalous expansion of water."],
        },
        {
          ...topic("phy-14-gas-laws", "14", "Gas Laws", ["Boyle's, Charles' and pressure laws","Absolute zero and general gas equation","Ideal gas equation and Van der Waals equation"], [178]),
          objectives: ["Interpret gas laws and use them to solve numerical problems.","Interpret the Van der Waals equation for one mole of a real gas."],
        },
        {
          ...topic("phy-15-quantity-heat", "15", "Quantity of Heat", ["Heat as energy; heat capacity and specific heat capacity of solids and liquids","Determination by mixtures and electrical methods; Newton's law of cooling"], [179]),
          objectives: ["Differentiate heat capacity from specific heat capacity.","Determine both by simple methods and solve numerical problems."],
        },
        {
          ...topic("phy-16-change-state", "16", "Change of State", ["Latent heat and specific latent heats of fusion and vaporisation","Melting, evaporation and boiling","Effects of pressure and dissolved substances on melting and boiling points"], [180]),
          objectives: ["Differentiate latent heat from specific latent heats of fusion and vaporisation.","Differentiate melting, evaporation and boiling.","Examine pressure and solute effects and solve numerical problems."],
        },
        {
          ...topic("phy-17-vapours", "17", "Vapours", ["Saturated and unsaturated vapours and vapour pressure and boiling","Barometer-tube method; dew, mist, fog and rain","Dew point, humidity, relative humidity and hygrometry"], [180]),
          objectives: ["Distinguish saturated from unsaturated vapours and relate vapour pressure to boiling.","Determine saturated vapour pressure by the barometer-tube method.","Differentiate dew point, humidity and relative humidity; estimate humidity with wet- and dry-bulb hygrometers.","Solve numerical problems."],
        },
        {
          ...topic("phy-18-structure-matter", "18", "Structure of Matter and Kinetic Theory", ["Atoms and molecules; Brownian motion, diffusion, surface tension, capillarity, adhesion and cohesion","Assumptions of kinetic theory and explanation of gas pressure and gas laws","Melting, boiling, vaporisation, temperature change and evaporation"], [180,181]),
          objectives: ["Differentiate atoms from molecules.","Use molecular theory to explain Brownian motion, diffusion, surface tension, capillarity, adhesion, cohesion and angle of contact.","Examine kinetic-theory assumptions and use the theory to interpret gas pressure, gas laws and changes of state."],
        },
        {
          ...topic("phy-19-heat-transfer", "19", "Heat Transfer", ["Conduction, convection and radiation","Temperature gradient, thermal conductivity, heat flux and surface properties","Thermos flask, land and sea breeze and engines"], [181]),
          objectives: ["Differentiate heat-transfer modes and solve temperature-gradient, thermal-conductivity and heat-flux problems.","Assess surface effects on radiation and absorption and compare material conductivities.","Explain thermos-flask components, land and sea breezes, and engine operating principles."],
        },
        {
          ...topic("phy-20-waves", "20", "Waves", ["Wave motion, vibrating sources and energy transfer","Frequency, wavelength, velocity, phase difference, wave number, wave vector and progressive-wave equation","Mechanical/electromagnetic; longitudinal/transverse; stationary/progressive waves","Springs, ropes, strings and ripple tanks; reflection, refraction, diffraction, polarisation, superposition, beats and Doppler effect"], [181,182]),
          objectives: ["Interpret wave motion and identify sources and energy transfer.","Relate frequency, wavelength and velocity; determine phase difference, wave number and wave vector; use the progressive-wave equation.","Differentiate wave classes and identify examples from springs, ropes, strings and ripple tanks.","Differentiate reflection, refraction, diffraction and polarisation; analyse superposition, beats and Doppler effect."],
        },
        {
          ...topic("phy-21-sound-propagation", "21", "Propagation of Sound Waves", ["Need for a material medium","Speed in solids, liquids and air and effects of temperature and pressure","Reflection, echoes, reverberation, applications and disadvantages"], [182]),
          objectives: ["Explain the need for a medium and compare sound speeds in solids, liquids and air.","Relate temperature and pressure to sound speed in air.","Solve problems involving echoes, reverberation and speed of sound."],
        },
        {
          ...topic("phy-22-sound-characteristics", "22", "Characteristics of Sound Waves", ["Noise and musical notes; quality, pitch, intensity and loudness","Overtones from strings and air columns; acoustic resonance","Frequencies of notes in open and closed pipes"], [182]),
          objectives: ["Differentiate noise from musical notes and analyse sound characteristics.","Evaluate applications in musical instruments and identify overtones and acoustic resonance.","Determine frequencies of notes from open and closed pipes."],
        },
        {
          ...topic("phy-23-light-energy", "23", "Light Energy", ["Natural and artificial sources; luminous and non-luminous objects","Speed, frequency and wavelength; shadows and eclipses","Pinhole camera"], [182]),
          objectives: ["Compare light sources and differentiate luminous from non-luminous objects.","Relate light speed, frequency and wavelength and interpret shadows and eclipses.","Solve problems using a pinhole camera."],
        },
        {
          ...topic("phy-24-reflection", "24", "Reflection of Light at Plane and Curved Surfaces", ["Laws and applications of reflection","Images in plane, concave and convex mirrors and ray diagrams","Mirror formula, linear magnification, periscopes, kaleidoscopes and sextants"], [182,183]),
          objectives: ["Interpret laws of reflection and illustrate mirror-image formation.","Apply the mirror formula and determine linear magnification.","Explain applications in periscopes, kaleidoscopes and sextants."],
        },
        {
          ...topic("phy-25-refraction", "25", "Refraction of Light Through Plane and Curved Surfaces", ["Refraction, velocity of light in media and laws of refraction","Refractive index, Snell's law, apparent depth, lateral displacement and total internal reflection","Prisms, lenses, optical fibres, binoculars, mirages and lens formulae"], [183]),
          objectives: ["Determine refractive indices using Snell's law and real/apparent depth.","Determine total-internal-reflection conditions and explain uses of optical fibres, prisms and binoculars.","Apply total internal reflection to mirages and use lens formulae and ray diagrams to solve problems.","Determine magnification and prism refractive index using minimum deviation."],
        },
        {
          ...topic("phy-26-optical-instruments", "26", "Optical Instruments", ["Microscopes, telescopes, projectors, cameras and the human eye","Lens power and angular magnification","Near and far points, sight defects and correction"], [184]),
          objectives: ["Apply operating principles of optical instruments to solve problems.","Distinguish the human eye from a camera.","Calculate lens power and angular magnification and identify sight defects and corrections."],
        },
        {
          ...topic("phy-27-dispersion", "27", "Dispersion of Light and Colours", ["Dispersion of white light and pure spectrum","Primary/secondary colours, additive/subtractive mixing, filters and rainbow","Electromagnetic spectrum: sources, detection and uses"], [184]),
          objectives: ["Identify primary colours and obtain secondary colours by mixing.","Explain rainbow formation, object colours and colour filters.","Relate electromagnetic radiation to wavelength, sources, detection and uses."],
        },
        {
          ...topic("phy-28-electrostatics", "28", "Electrostatics", ["Positive and negative charges; charging by friction, contact and induction","Electroscope and Coulomb's inverse-square law","Electric field intensity, potential, discharge and lightning"], [185]),
          objectives: ["Identify charges and examine uses of an electroscope.","Apply Coulomb's law and deduce electric-field and potential expressions.","Identify field patterns and analyse charge distribution on conductors and lightning conductors."],
        },
        {
          ...topic("phy-29-capacitors", "29", "Capacitors", ["Types and functions; parallel-plate capacitors and capacitance","Relationship between capacitance, plate area, separation and dielectric medium","Series and parallel arrangements and stored energy"], [185]),
          objectives: ["Determine uses and capacitance of capacitors.","Analyse factors affecting capacitance and parallel-plate capacitors.","Solve problems on capacitor arrangements and stored energy."],
        },
        {
          ...topic("phy-30-electric-cells", "30", "Electric Cells", ["Simple voltaic cell and defects","Daniell, Leclanche, lead-acid, nickel-iron, lithium-iron and mercury-cadmium cells","Maintenance, arrangements and efficiency"], [185]),
          objectives: ["Identify defects of a simple voltaic cell and their correction.","Compare cell types, including solar cells, and compare lead-acid and nickel-iron accumulators.","Solve series and parallel cell problems."],
        },
        {
          ...topic("phy-31-current-electricity", "31", "Current Electricity", ["EMF, potential difference, current, internal resistance and lost volts","Ohm's law, resistance measurement, metre bridge and series/parallel networks","Potentiometer and electrical networks"], [186]),
          objectives: ["Differentiate EMF, potential difference, current and internal resistance.","Apply Ohm's law, metre bridge and series/parallel resistance rules.","Determine resistivity and conductivity; measure EMF, current and internal resistance with a potentiometer.","Apply Kirchhoff's law to electrical networks."],
        },
        {
          ...topic("phy-32-electrical-energy-power", "32", "Electrical Energy and Power", ["Electrical energy, power and commercial units","Power transmission","Heating effect of current, house wiring and fuses"], [186]),
          objectives: ["Apply electrical energy and power expressions and analyse power transmission.","Identify heating effects and uses; explain advantages of parallel house wiring.","Determine fuse ratings."],
        },
        {
          ...topic("phy-33-magnets", "33", "Magnets and Magnetic Fields", ["Natural and artificial magnets; soft iron and steel","Making, demagnetising and preserving magnets","Magnetic fields of magnets, current conductors, circular wires and solenoids","Earth's magnetic field, magnetic meridian, dip, declination, flux and flux density"], [186,187]),
          objectives: ["Give examples of magnets and compare soft iron with steel.","Identify methods of making, demagnetising and preserving magnets.","Determine flux patterns for magnets, conductors, circular wires and solenoids.","Identify Earth's magnetic elements and analyse field variation and applications in navigation and mineral exploration."],
        },
        {
          ...topic("phy-34-force-current-conductor", "34", "Force on a Current-Carrying Conductor in a Magnetic Field", ["Force between parallel current-carrying conductors and on a moving charge","DC motor, electromagnets and carbon microphone","Moving-coil and moving-iron instruments; galvanometer conversion and sensitivity"], [187]),
          objectives: ["Use Fleming's left-hand rule and diagrams to determine force direction and interactions.","Relate force to magnetic-field strength, charge velocity and entry angle.","Interpret the DC motor and electromagnets and compare measuring instruments.","Convert galvanometers to ammeters or voltmeters and identify sensitivity factors."],
        },
        {
          ...topic("phy-35-electromagnetic-induction", "35", "Electromagnetic Induction", ["Faraday's laws, factors affecting induced EMF and Lenz's law","AC/DC generators, transformers and induction coil","Inductance, stored energy, applications and eddy currents"], [187,188]),
          objectives: ["Interpret Faraday's and Lenz's laws and identify factors affecting induced EMF.","Interpret generator and transformer arrangements and identify transformer types and operation.","Explain induction coils and inductance; calculate series/parallel inductance and stored energy.","Describe eddy-current applications and methods of reducing losses."],
        },
        {
          ...topic("phy-36-ac-circuits", "36", "Simple A.C. Circuits", ["AC current and voltage; peak and RMS values","Resistive, capacitive, inductive and series R-L-C circuits","Vector diagrams, phase angle, power factor, impedance, resonance and resonant frequency"], [188]),
          objectives: ["Differentiate peak and RMS values and determine current-voltage phase difference.","Interpret series R-L-C circuits and vector diagrams.","Calculate effective voltage, reactance and impedance.","Determine resonance conditions, resonant frequency, instantaneous and average power and power factor."],
        },
        {
          ...topic("phy-37-conduction-liquids-gases", "37", "Conduction of Electricity Through Liquids and Gases", ["Electrolytes, non-electrolytes and electrolysis","Faraday's laws and applications including electroplating and ammeter calibration","Discharge through gases and its applications"], [189]),
          objectives: ["Distinguish electrolytes from non-electrolytes and analyse electrolysis.","Apply Faraday's laws to solve problems.","Analyse gas discharge and determine applications of electrical conduction through gases."],
        },
        {
          ...topic("phy-38-modern-physics", "38", "Elementary Modern Physics", ["Atomic models and structure; energy levels and spectra","Thermionic and photoelectric emission, Einstein's equation, stopping potential and X-rays","Radioactivity, isotopes, half-life, decay constant, alpha/beta/gamma rays","Fusion, fission, binding energy, mass defect, wave-particle duality, electron diffraction and uncertainty principle"], [189,190]),
          objectives: ["Identify atomic models and limitations, describe atomic structure and differentiate energy levels and spectra.","Compare thermionic and photoelectric emission; apply Einstein's equation and calculate stopping potential.","Explain X-ray production, properties and applications.","Analyse radioactivity and nuclear stability; identify isotopes and compare alpha, beta and gamma rays.","Relate half-life to decay constant and determine binding energy, mass defect and Einstein's equation.","Analyse wave-particle duality and solve problems involving uncertainty and duality."],
        },
        {
          ...topic("phy-39-electronics", "39", "Introductory Electronics", ["Metals, semiconductors and insulators; elementary band-gap knowledge","Intrinsic and extrinsic semiconductors; n-type and p-type materials","Diodes, rectification and transistor amplification"], [190]),
          objectives: ["Differentiate conductors, semiconductors and insulators.","Distinguish intrinsic from extrinsic semiconductors and electron from hole carriers.","Distinguish n-type from p-type semiconductors; relate diodes to rectification and transistors to amplification."],
        }
    ]}],
  },
  chemistry: {
    id: "chemistry", label: "Chemistry", icon: "🧪",
    description: "Chemical principles, reactions, calculations, compounds and industry",
    compulsory: false, questionBankAvailable: false, questionSourcePackAvailable: true,
    sourceFile: "Chemistry-1.pdf",
    sourceSha256: "a3c15bfee3bece0f4106a32b0091e2a2c51eaec8baa62fafa44afcad72193738",
    sourcePageCount: 16, reviewState: "needs_current_source_review",
    officialSourceUrl: "https://ibass.jamb.gov.ng/static/media/Chemistry.9efd0b98043d56922aaa.pdf",
    sourceComparisonNote: "The current JAMB IBASS Chemistry asset is linked above. Current IBASS-derived transcriptions dated 24 October 2026 list the same 18 top-level topics in the same order as this uploaded 2025 copy, including Astronomical Chemistry. The direct JAMB PDF endpoint could not be retrieved in the 19 November 2026 review, so this is a heading/order cross-check only; complete subtopic and objective wording still requires direct page-by-page reconciliation. The uploaded PDF hash remains the provenance record.",
    generalObjectives: [
      "Understand the basic principles and concepts in chemistry.",
      "Interpret scientific data relating to chemistry.",
      "Deduce relationships between chemistry and other sciences.",
      "Apply chemistry knowledge to industry and everyday life.",
    ],
    sections: [{
      id: "chemistry-core", title: "Chemistry syllabus",
      topics: [
        {
          ...topic("chem-01-separation", "1", "Separation of Mixtures and Purification of Chemical Substances", ["Elements, compounds and mixtures", "Chemical and physical changes", "Pure and impure substances", "Boiling, density, freezing and melting points", "Evaporation, distillation, sublimation, crystallisation, filtration and chromatography"], [1]),
          objectives: ["Distinguish elements, compounds and mixtures, and chemical from physical changes.","Distinguish pure and impure substances and use boiling or melting points as purity criteria.","Identify mixture components and the principles behind separation techniques.","Apply evaporation, crystallisation, distillation, sublimation, chromatography, filtration, decantation and related separation methods."],
        },
        {
          ...topic("chem-02-combination", "2", "Chemical Combination", ["Laws of chemical combination", "Chemical symbols, formulae and equations", "Relative atomic mass", "Mole concept and stoichiometry"], [1,2]),
          objectives: ["Deduce the laws of chemical combination from statements and experimental data.","Perform calculations involving chemical formulae, equations, relative atomic mass and the mole concept.","Determine the stoichiometry of chemical reactions."],
        },
        {
          ...topic("chem-03-kinetic-theory", "3", "Kinetic Theory of Matter and Gas Laws", ["States of matter and change of state", "Kinetic theory", "Boyle's, Charles', Avogadro's and related gas laws", "Ideal gas equation and real gases"], [2]),
          objectives: ["Use kinetic theory to distinguish solids, liquids and gases and explain changes of state.","Explain molecular motion and interpret Brownian movement.","Deduce Boyle's, Charles', Avogadro's, Gay-Lussac's, Graham's and Dalton's gas laws.","Interpret gas-law graphs and perform related calculations using the ideal gas equation.","Explain deviations of real gases from ideal behaviour and relate vapour density to relative molecular mass."],
        },
        {
          ...topic("chem-04-atomic-structure", "4", "Atomic Structure and Bonding", ["Atoms, molecules and ions", "Atomic models and electronic structure", "Isotopy and orbitals", "Periodic table and periodicity", "Ionic, covalent, metallic and hydrogen bonding"], [2,3]),
          objectives: ["Distinguish atoms, molecules and ions and describe contributions to atomic theory.","Determine protons, neutrons and electrons from atomic and mass numbers.","Apply electron-arrangement rules and explain isotopes and simple isotope calculations.","Identify s and p orbital shapes and electron capacities.","Relate atomic number to periodic-table position and explain periodic trends.","Differentiate ionic, covalent, coordinate, metallic and hydrogen bonding and relate bonding to compound properties.","Predict the shapes of simple linear, bent, tetrahedral and pyramidal molecules."],
        },
        {
          ...topic("chem-05-nuclear", "5", "Nuclear Chemistry", ["Radioactivity and radioactive decay", "Properties and uses of radioactive emissions", "Half-life and nuclear reactions"], [3,4]),
          objectives: ["Distinguish ordinary chemical reactions from nuclear reactions.","Differentiate natural and artificial radioactivity.","Compare the properties of radioactive emissions.","Calculate simple radioactive half-lives and balance nuclear equations.","Identify practical applications of radioactivity."],
        },
        {
          ...topic("chem-06-solubility", "6", "Solubility", ["Solutions and solubility", "Factors affecting solubility", "Solubility curves and calculations", "Crystallisation"], [4]),
          objectives: ["Distinguish unsaturated, saturated and supersaturated solutions.","Interpret solubility curves and calculate solubility at a given temperature.","Relate solubility to temperature and to the nature and use of solvents.","Differentiate true solutions, suspensions and colloids using their properties and examples."],
        },
        {
          ...topic("chem-07-pollution", "7", "Environmental Pollution", ["Air, water and land pollution", "Sources and effects of pollutants", "Pollution control"], [4,5]),
          objectives: ["Explain the composition of air and why air is a mixture.","Identify natural and variable constituents of air and the uses of noble gases.","Identify air, water and soil pollutants, their sources and effects.","Classify pollutants as biodegradable or non-biodegradable.","Describe measures for controlling environmental pollution."],
        },
        {
          ...topic("chem-08-acids-bases-salts", "8", "Acids, Bases and Salts", ["Properties and definitions", "pH and indicators", "Neutralisation", "Preparation and uses of salts"], [5,6]),
          objectives: ["Differentiate acids, bases and salts and identify their properties and uses.","Determine the basicity of acids and use indicators to distinguish acidity and alkalinity.","Describe salt preparation by neutralisation, precipitation and reactions with metals.","Classify normal, acidic, basic and double salts.","Relate dissociation and conductance to acid/base strength.","Calculate pH and pOH and explain their everyday significance and buffer solutions.","Interpret titration curves, perform mole calculations and predict salt hydrolysis."],
        },
        {
          ...topic("chem-09-redox", "9", "Oxidation and Reduction (Redox)", ["Oxidation and reduction concepts", "Oxidation numbers", "Redox equations and applications"], [6,7]),
          objectives: ["Express oxidation and reduction in terms of oxygen, hydrogen, electron transfer and oxidation number.","Classify reactions as oxidation or reduction and balance redox equations.","Determine oxidation numbers and electron transfer in redox reactions.","Identify oxidising and reducing agents and name inorganic compounds using oxidation numbers."],
        },
        {
          ...topic("chem-10-electrolysis", "10", "Electrolysis", ["Electrolytes and non-electrolytes", "Electrolysis of melts and solutions", "Electrodes and discharge of ions", "Faraday's laws and applications"], [7]),
          objectives: ["Distinguish electrolytes from non-electrolytes and explain electrolysis.","Predict electrode reactions and products for common molten and aqueous electrolytes.","Use Faraday's laws to calculate quantities in electrolysis.","Explain factors affecting ion discharge and select suitable electrodes.","Describe metal purification, electrochemical cells, electrode potentials and applications of electrolysis.","Explain corrosion as an electrochemical process and methods of corrosion prevention."],
        },
        {
          ...topic("chem-11-energy-changes", "11", "Energy Changes", ["Exothermic and endothermic reactions", "Enthalpy and energy profiles", "Bond energy and calorimetry"], [7,8]),
          objectives: ["Identify endothermic and exothermic changes and determine enthalpy changes.","Interpret energy and heat-change diagrams.","Explain entropy as a measure of disorder and relate it to spontaneous processes.","Use the relationship between Gibbs free energy, enthalpy and entropy to solve simple problems."],
        },
        {
          ...topic("chem-12-reaction-rates", "12", "Rates of Chemical Reaction", ["Rate measurement", "Collision theory", "Effects of concentration, temperature, pressure, surface area and catalysts"], [8]),
          objectives: ["Identify how temperature, concentration, pressure, surface area and catalysts affect reaction rates.","Interpret rate curves and solve simple rate problems.","Explain collision theory, activation energy and the qualitative Arrhenius relationship.","Determine activation energy from reaction-rate curves and explain the effect of light on selected reactions."],
        },
        {
          ...topic("chem-13-equilibria", "13", "Chemical Equilibria", ["Reversible reactions", "Dynamic equilibrium", "Le Chatelier's principle", "Equilibrium constants and applications"], [8,9]),
          objectives: ["Identify factors affecting the position of chemical equilibrium and predict their effects.","Apply Le Chatelier's principle to industrial processes.","Explain the effect of conditions on the equilibrium constant."],
        },
        {
          ...topic("chem-14-nonmetals", "14", "Non-metals and Their Compounds", ["Hydrogen and water", "Halogens", "Oxygen and sulphur", "Nitrogen and its compounds", "Carbon and its compounds"], [9,10,11]),
          objectives: ["Describe laboratory and industrial preparation, properties, tests and uses of hydrogen and its compounds.","Explain the preparation, properties and uses of chlorine and hydrogen chloride and test for chloride ions.","Identify allotropes and compounds of oxygen and sulphur and explain their properties and uses.","Describe nitrogen and its compounds and relate selected compounds to industrial and everyday applications.","Explain carbon and its compounds, including their properties and uses."],
        },
        {
          ...topic("chem-15-metals", "15", "Metals and Their Compounds", ["Occurrence and extraction", "Properties and reactions", "Compounds and uses of selected metals", "Alloys and corrosion"], [11,12]),
          objectives: ["Describe occurrence, extraction, properties, tests and uses of selected metals and their compounds.","Relate the method of extraction of metals to their chemical and physical properties.","Compare reactivities of alkali, alkaline-earth and selected other metals.","Explain the preparation, properties and uses of important sodium, calcium, aluminium, tin, iron and copper compounds.","Identify characteristic properties of first-row transition metals, including oxidation states, complex formation, colour and catalysis.","Describe iron and copper extraction, tests, uses and common alloys."],
        },
        {
          ...topic("chem-16-organic", "16", "Organic Compounds", ["Hydrocarbons and homologous series", "Functional groups", "Nomenclature and isomerism", "Reactions and uses of organic compounds"], [13,14]),
          objectives: ["Derive names, structures, empirical formulae and molecular formulae of organic compounds.","Relate carbon tetravalency and catenation to the structures of organic compounds.","Classify organic compounds by homologous series and functional groups.","Identify structural and geometric isomerism and derive simple isomers.","Distinguish alkanes, alkenes, alkynes and aromatic hydrocarbons by structure, reactions and tests.","Explain petroleum composition, fractional distillation, cracking, reforming, octane rating and hydrocarbon uses.","Describe alkanol classes and ethanol production by fermentation and from petroleum by-products.","Differentiate alkanals, alkanones, alkanoic acids and alkanoates and describe characteristic reactions.","Explain saponification and the production of soaps, detergents and margarine.","Compare amines, carbohydrates, proteins and polymers and identify relevant tests, hydrolysis reactions and uses.","Differentiate addition from condensation polymerisation and thermoplastics from thermosetting plastics."],
        },
        {
          ...topic("chem-17-industry", "17", "Chemistry and Industry", ["Chemical industries and raw materials", "Industrial processes", "Products, economic importance and environmental impact"], [15]),
          objectives: ["Classify chemical industries according to their products.","Identify industrial raw materials and distinguish fine from heavy chemicals.","Explain the relevance of chemical industries and relate industrial processes to biotechnology."],
        },
        {
          ...topic("chem-18-astronomical", "18", "Astronomical Chemistry", ["Elements and compounds in space", "Chemical processes in stars and celestial bodies"], [15,16]),
          objectives: ["State the composition of the solar system and list the planets.","Identify the main segments of the Earth: atmosphere, lithosphere and hydrosphere.","Identify Earth's natural satellite and the smallest and farthest planet from the Sun."],
        },
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
    sourcePageLabel: "JAMB IBASS printed pages",
    officialSourceUrl: "https://ibass.jamb.gov.ng/assets/uploads/Biology.pdf",
    officialSourceCheckedAt: "2026-11-19",
    sourceComparisonNote: "The catalogue follows the JAMB-hosted IBASS Biology structure: Variety of Organisms (3 topics), Form and Functions (9), Ecology (7), Heredity and Variations (2) and Evolution (2). The uploaded 2025 copy presents Biotechnology as a separate topic; current IBASS includes biotechnology applications (GMO, gene therapy, recombinant DNA products) within Heredity, so that extra entry has been merged there. Printed page references follow the IBASS PDF (pp. 27–38). The uploaded PDF remains linked for provenance; current-cycle/version sign-off is still pending.",
    generalObjectives: [
      "Demonstrate knowledge of diversity, interdependence and unity of life.",
      "Account for continuity of life through reorganization, inheritance and evolution.",
      "Apply biological principles to living things, society, the environment, community health and the economy.",
    ],
    sections: [
      { id: "biology-a", title: "A. Variety of Organisms", topics: [
        {
          ...topic("bio-a-01-living-organisms", "1", "Living Organisms", ["Characteristics of living things", "Cell structure and functions", "Levels of organisation: cell, tissue, organ, system and organism"], [27]),
          objectives: ["Differentiate living things from non-living things.","Identify the structures of plant and animal cells and explain the functions of their components.","Compare and contrast plant and animal cells.","Trace the organisation of living things through cell, tissue, organ, system and organism."],
        },
        {
          ...topic("bio-a-02-evolution-organisms", "2", "Evolution Among Organisms", ["Monera, Protista and Fungi", "Plant groups: Thallophyta, Bryophyta, Pteridophyta and Spermatophyta", "Invertebrates and vertebrates", "Structural complexity and life histories"], [27,28]),
          objectives: ["Analyse the external features and characteristics of the listed Monera, Protista, fungi, plants and animals.","Use examples to demonstrate increasing structural complexity.","Trace the life histories of representative organisms.","Explain the transition from aquatic to terrestrial life using life-history evidence.","Trace the evolution and major groups of plants and animals, including vertebrates and invertebrates.","Determine the economic and environmental importance of selected insects and other organisms.","Classify plants according to annual, biennial and perennial life cycles."],
        },
        {
          ...topic("bio-a-03-adaptations", "3", "Structural, Functional and Behavioural Adaptations", ["Adaptive colouration", "Behavioural adaptations in social animals", "Structural adaptations", "Feeding, protection, mating, temperature regulation and water conservation"], [28]),
          objectives: ["Explain how structural, functional and behavioural features adapt organisms to their environments.","Describe adaptive colouration, including countershading and warning colouration.","Differentiate castes in social insects and explain their roles.","Explain basking, territorial behaviour, hibernation and aestivation.","Relate feeding structures, protection, defence, mating displays, temperature regulation and water conservation to adaptation."],
        },
      ]},
      { id: "biology-b", title: "B. Form and Functions", topics: [
        {
          ...topic("bio-b-01-plant-structure", "1", "Internal Structure of a Flowering Plant", ["Root, stem and leaf structure", "Supporting tissues", "Internal structure of a mammal"], [29]),
          objectives: ["Identify transverse sections of roots, stems and leaves.","Relate the internal structures of plant organs to their functions.","Identify supporting tissues and describe their distribution in roots, stems and leaves.","Examine the arrangement, appearance and position of mammalian internal, digestive, reproductive and excretory organs."],
        },
        {
          ...topic("bio-b-02-nutrition", "2", "Nutrition", ["Autotrophic and heterotrophic nutrition", "Photosynthesis and chemosynthesis", "Mineral requirements", "Animal nutrition, food classes and food tests", "Teeth and alimentary canal"], [29,30]),
          objectives: ["Compare autotrophic and heterotrophic nutrition and give plant examples.","Compare photosynthesis with chemosynthesis and distinguish major heterotrophic feeding modes.","Explain light and dark reactions and the roles of light, carbon dioxide and chlorophyll in photosynthesis.","Describe a starch test as evidence of photosynthesis.","Identify plant macro- and micro-elements and recognise nitrogen, phosphorus and potassium deficiency symptoms.","Identify food classes, their sources, nutritional values, functions and deficiency diseases, and explain balanced diets.","Interpret food-test experiments for starch, reducing sugars, proteins, oils and fats.","Describe mammalian teeth, compare tooth types and dental formulae, and relate structure to function.","Relate the alimentary canal and accessory organs to their functions.","Explain digestive enzymes, their action on carbohydrates, proteins and fats, and the resulting end products."],
        },
        {
          ...topic("bio-b-03-transport", "3", "Transport", ["Need and materials for transportation", "Mammalian circulatory system", "Plant vascular system", "Transport media and mechanisms"], [30]),
          objectives: ["Explain why increasing organism size and complexity require transport systems.","Identify materials transported and the sources and forms in which they are carried.","Describe the general mammalian circulatory system and compare the functions of major arteries and veins.","Identify plant vascular tissues and explain the roles of xylem and phloem.","Identify transport media such as cytoplasm, cell sap, body fluid, blood and lymph.","State the composition and functions of blood and lymph.","Explain diffusion, osmosis, plasmolysis and turgidity as transport mechanisms.","Compare open circulation in animals with transpiration pull, root pressure and active transport in plants."],
        },
        {
          ...topic("bio-b-04-respiration", "4", "Respiration", ["Respiratory organs and surfaces", "Gaseous exchange in plants and animals", "Aerobic and anaerobic respiration"], [30,31]),
          objectives: ["Explain the significance of respiration and the role of oxygen in energy release.","Outline glycolysis and the Krebs cycle with reference to ATP production.","Interpret experiments on gaseous exchange, respiratory products and heat production.","Describe body surfaces, gills, tracheae, lungs, stomata and lenticels as respiratory surfaces.","Explain stomatal opening and closing and compare respiratory mechanisms in plants and animals.","Explain the effect of inadequate oxygen supply on muscles.","Demonstrate fermentation using yeast and sugar solution and state the economic importance of yeast."],
        },
        {
          ...topic("bio-b-05-excretion", "5", "Excretion", ["Excretory organs and products", "Excretion in plants and animals", "Osmoregulation"], [31]),
          objectives: ["Define excretion and explain its significance.","Relate the structures of contractile vacuoles, flame cells, nephridia, Malpighian tubules, kidneys, stomata and lenticels to excretion.","Explain excretory and osmoregulatory functions of the kidneys.","Identify the excretory products and functions of the lungs and skin.","Explain the economic importance of plant excretory products such as oxygen, carbon dioxide, tannins, resins, gums and alkaloids."],
        },
        {
          ...topic("bio-b-06-support-movement", "6", "Support and Movement", ["Support in plants", "Skeleton and support in animals", "Movement and locomotion"], [31,32]),
          objectives: ["Explain the need for support and movement in organisms.","Identify plant supporting tissues and describe their distribution in roots, stems and leaves.","Relate plant tropic, tactic, nastic and sleep movements to responses to light, water, gravity and touch.","Identify regions of growth in roots and shoots and explain the role of auxins in tropism.","Relate chitin, cartilage and bone to support in animals.","Relate the mammalian skeleton to support, locomotion and respiration.","Differentiate types of joints with appropriate examples.","Explain the protective, supportive, locomotive and respiratory functions of the skeleton."],
        },
        {
          ...topic("bio-b-07-reproduction", "7", "Reproduction", ["Asexual and sexual reproduction", "Reproduction in flowering plants", "Pollination and fertilisation", "Reproduction in mammals"], [32]),
          objectives: ["Differentiate asexual and sexual reproduction.","Describe fission, budding and natural vegetative propagation.","Apply grafting, budding and layering in crop production.","Relate floral parts to their functions, pollination and fertilisation.","State advantages of cross-pollination and relate placentation to fruit types.","Identify male and female mammalian reproductive organs and relate their structures to their functions.","Explain gamete fusion and fertilisation.","Relate maternal health, nutrition and drug use to embryonic development and birth.","Explain modern reproductive technologies, including in-vitro fertilisation and birth control."],
        },
        {
          ...topic("bio-b-08-growth", "8", "Growth", ["Meaning and stages of growth", "Seed germination and conditions necessary for germination"], [32]),
          objectives: ["Explain growth and the conditions necessary for seed germination.","Differentiate epigeal and hypogeal germination."],
        },
        {
          ...topic("bio-b-09-coordination", "9", "Co-ordination and Control", ["Nervous coordination and impulse transmission", "Reflex action", "Sense organs", "Hormonal control", "Homeostasis"], [32,33]),
          objectives: ["Explain how the central and peripheral nervous systems coordinate body functions.","Describe nerve impulse transmission and illustrate reflex actions such as blinking and the knee jerk.","Differentiate reflex, voluntary and conditioned actions.","Relate the skin, nose, tongue, eye and ear to their sensory functions and defects.","Locate the principal endocrine glands and relate their hormones to their functions.","Explain the effects of auxins, gibberellins, cytokinins and ethylene on plant growth and development.","Relate hormones to homeostasis, including temperature, salt and water regulation."],
        },
      ]},
      { id: "biology-c", title: "C. Ecology", topics: [
        {
          ...topic("bio-c-01-distribution", "1", "Factors Affecting the Distribution of Organisms", ["Abiotic factors", "Biotic factors"], [33]),
          objectives: ["Relate temperature, rainfall, humidity, wind, altitude, salinity, turbidity, pH and soil conditions to organism distribution.","Use appropriate equipment, including a Secchi disc, thermometer and rain gauge, to measure abiotic factors.","Explain how plant, animal and human activities affect organism distribution."],
        },
        {
          ...topic("bio-c-02-symbiosis", "2", "Symbiotic Interactions of Plants and Animals", ["Energy flow, food chains and food webs", "Trophic levels", "Carbon, water and nitrogen cycles"], [33]),
          objectives: ["Give examples of symbiosis, parasitism, saprophytism, commensalism, mutualism, amensalism, competition, predation and cooperation.","Explain food chains, food webs, trophic levels and energy flow in habitats.","Describe the carbon, water and nitrogen cycles and their significance.","Relate the carbon cycle to atmospheric oxygen and carbon dioxide balance and global warming.","Explain how the water cycle affects other nutrient cycles.","Explain the roles of bacteria and leguminous plants in nitrogen cycling."],
        },
        {
          ...topic("bio-c-03-habitats", "3", "Natural Habitats", ["Aquatic habitats", "Terrestrial and arboreal habitats"], [33]),
          objectives: ["Associate plants and animals with aquatic, terrestrial and arboreal habitats.","Relate adaptive features of organisms to the habitats in which they live."],
        },
        {
          ...topic("bio-c-04-biomes", "4", "Local Nigerian Biomes", ["Tropical rainforest", "Guinea and Sudan savanna", "Desert", "Montane forests and highland grasslands"], [34]),
          objectives: ["Locate the major Nigerian biomes, including tropical rainforest, Guinea and Sudan savanna, desert and montane highlands.","Use the characteristics of local biomes to distinguish regions of Nigeria."],
        },
        {
          ...topic("bio-c-05-populations", "5", "The Ecology of Populations", ["Population density and overcrowding", "Competition and succession", "Biotic and abiotic factors affecting population size"], [34]),
          objectives: ["Explain causes of rapid human population change and the consequences of overcrowding.","Calculate population density as organisms per unit area.","Relate food, disease and space pressures to intra- and inter-specific competition.","Explain niche differentiation as a way of reducing competition.","Relate competition to ecological succession.","Explain biotic and abiotic factors that affect population size.","Describe primary and secondary succession and the progression to a stable climax community."],
        },
        {
          ...topic("bio-c-06-soil", "6", "Soil", ["Soil types and structure", "Porosity, capillarity and humus", "Soil components and organisms", "Soil fertility, loss, renewal and maintenance"], [34,35]),
          objectives: ["Identify the physical properties of sandy, loamy and clayey soils.","Determine soil particle size, porosity, water retention, air, water, humus and capillarity experimentally.","Relate soil types, characteristics and components to healthy plant growth.","Explain soil fertility loss through nutrient depletion, compaction, leaching, erosion and repeated cropping.","Apply contour ridging, terracing, mulching, mixed cropping, strip cropping, fertilisers, crop rotation and shifting cultivation to soil conservation."],
        },
        {
          ...topic("bio-c-07-humans-environment", "7", "Humans and the Environment", ["Common and endemic diseases", "Drug abuse and prevention", "Pollution, sanitation and sewage", "Conservation, game reserves and national parks"], [35,36]),
          objectives: ["Identify ecological conditions that favour common endemic and epidemic diseases.","Relate disease agents and vectors to disease spread and control.","Define drug abuse and addiction, identify commonly abused drugs and state their health effects.","Use knowledge of causative organisms, transmission and symptoms to explain disease prevention and control.","Explain inoculation and vaccination.","Classify pollution and relate air, water and soil pollutants to human health and environmental degradation.","Describe methods of pollution control, sanitation, sewage disposal, personal hygiene and community health.","Explain the roles of WHO, UNICEF, the Red Cross and national health/environment agencies.","Apply conservation methods to renewable and non-renewable resources and explain their benefits.","Identify conservation organisations, game reserves and national parks in Nigeria and explain their importance."],
        },
      ]},
      { id: "biology-d", title: "D. Heredity and Variations", topics: [
        {
          ...topic("bio-d-01-variation", "1", "Variation in Population", ["Morphological variation", "Physiological variation", "Applications in crime detection, blood transfusion and paternity"], [36]),
          objectives: ["Differentiate continuous and discontinuous variation.","Relate variation to environmental conditions, habitat and genetic constitution.","Measure and plot frequency distributions for human heights and weights.","Observe and record colour patterns in plants and animals.","Apply fingerprint classification to identity detection.","Identify physiological variations such as tongue rolling, PTC tasting and blood groups.","Apply blood-group knowledge to transfusion and paternity determination and discontinuous variation to crime detection."],
        },
        {
          ...topic("bio-d-02-heredity", "2", "Heredity", ["Heritable and non-heritable characters", "Chromosomes and transmission of hereditary characters", "Genetic probability and sex determination", "Applications in agriculture and medicine", "Sex-linked characters", "Biotechnology applications: genetically modified organisms, gene therapy, biosafety and recombinant DNA products"], [36,37]),
          objectives: ["Differentiate heritable and non-heritable characters and illustrate the structure of DNA.","Explain gene segregation during meiosis and random recombination at fertilisation.","Analyse cross-breeding data and apply heredity to crop and livestock improvement.","State advantages and disadvantages of in-breeding and out-breeding.","Discuss genetically modified organisms, gene therapy and biosafety at an elementary level.","Apply heredity to counselling related to blood groups, sickle-cell anaemia and Rhesus factors.","Explain recombinant DNA applications in producing insulin, interferon and enzymes.","Identify sex-linked characters such as haemophilia and colour blindness.","Explain biotechnology and list its applications in agriculture, medicine, pharmaceuticals and the food industry."],
        },
      ]},
      { id: "biology-e", title: "E. Evolution", topics: [
        {
          ...topic("bio-e-01-theories", "1", "Theories of Evolution", ["Lamarck's theory", "Darwin's theory", "Organic theory"], [38]),
          objectives: ["Explain organic evolution as cumulative adaptive change producing the diversity of organisms.","Describe the contributions of Lamarck and Darwin to evolutionary theory.","State evidence supporting organic evolution."],
        },
        {
          ...topic("bio-e-02-evidence", "2", "Evidence of Evolution", ["Evidence used to explain evolutionary change"], [38]),
          objectives: ["Identify fossil, comparative anatomical, physiological and embryological evidence for evolution.","Trace evolutionary trends in plants and animals.","Describe evidence from modern evolutionary theory, including genetic studies and mutation."],
        },
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
    officialSourceUrl: "https://ibass.jamb.gov.ng/static/media/Mathematics.c0621f4b8b674e75fd05.pdf",
    sourceComparisonNote: "The current JAMB IBASS Mathematics asset is linked above. Current IBASS-derived transcriptions dated 24 October 2026 list five sections and 23 top-level topics in the same order as this uploaded 2025 copy. The direct JAMB PDF endpoint could not be retrieved in the 19 November 2026 review, so this is a section/topic-heading cross-check only; complete subtopic and objective wording still requires direct page-by-page reconciliation. The uploaded PDF hash remains the provenance record.",
    generalObjectives: [
      "Acquire computational and manipulative skills.",
      "Develop precise, logical and formal reasoning skills.",
      "Develop deductive skills in interpretation of graphs, diagrams and data.",
      "Apply mathematical concepts to resolve issues in daily living.",
    ],
    sections: [
      { id: "math-i", title: "I. Number and Numeration", topics: [
        {
          ...topic("math-i-01-number-bases", "1", "Number Bases and Modular Arithmetic", ["Operations in bases 2 to 10", "Conversion between bases, including fractions", "Modular arithmetic"], [38]),
          objectives: ["Perform addition, subtraction, multiplication and division in number bases 2 to 10.","Convert numbers between bases, including fractional parts.","Perform calculations in modular arithmetic."],
        },
        {
          ...topic("math-i-02-fractions-percentages", "2", "Fractions, Decimals, Approximations and Percentages", ["Fractions and decimals", "Significant figures and decimal places", "Percentage errors", "Simple interest, profit and loss", "Ratio, proportion, rate, shares and VAT"], [2]),
          objectives: ["Perform the four basic operations on fractions and decimals.","Round values to specified significant figures and decimal places.","Calculate percentage errors, simple interest and profit or loss.","Solve ratio, proportion, rate, share and VAT problems."],
        },
        {
          ...topic("math-i-03-indices-log-surds", "3", "Indices, Logarithms and Surds", ["Laws and equations of indices", "Standard form", "Laws of logarithms and change of base", "Relationship between indices and logarithms", "Surds"], [2]),
          objectives: ["Apply the laws of indices and solve equations involving indices.","Use standard form and laws of logarithms, including change of base.","Solve logarithmic problems and explain the relationship between indices and logarithms.","Simplify, rationalise and perform basic operations on surds."],
        },
        {
          ...topic("math-i-04-sets", "4", "Sets", ["Types and algebra of sets", "Venn diagrams and applications"], [2]),
          objectives: ["Identify empty, universal, complement, subset, finite, infinite and disjoint sets.","Solve problems involving set cardinality and set notation.","Use Venn diagrams to solve problems involving up to three sets."],
        },
      ]},
      { id: "math-ii", title: "II. Algebra", topics: [
        {
          ...topic("math-ii-01-polynomials", "1", "Polynomials", ["Change of subject of formula", "Polynomial operations", "Factorisation and roots up to degree three", "Factor and remainder theorems", "Simultaneous equations and polynomial graphs"], [2,3]),
          objectives: ["Change the subject of a formula.","Add, subtract, multiply and divide polynomials of degree not exceeding three.","Apply factor and remainder theorems and factorise polynomial expressions.","Find roots of polynomials up to degree three.","Solve simultaneous equations consisting of one linear and one quadratic equation.","Interpret polynomial graphs, including maximum and minimum values."],
        },
        {
          ...topic("math-ii-02-variation", "2", "Variation", ["Direct, inverse, joint and partial variation", "Percentage increase and decrease"], [3]),
          objectives: ["Solve problems involving direct, inverse, joint and partial variation.","Calculate percentage increase and decrease in variation problems."],
        },
        {
          ...topic("math-ii-03-inequalities", "3", "Inequalities", ["Analytical and graphical linear inequalities", "Quadratic inequalities"], [3]),
          objectives: ["Solve linear and quadratic inequalities analytically and graphically.","Interpret graphs of inequalities."],
        },
        {
          ...topic("math-ii-04-progression", "4", "Progression", ["Nth term", "Arithmetic progression", "Geometric progression and sums"], [3]),
          objectives: ["Determine the nth term of an arithmetic or geometric progression.","Calculate sums of arithmetic and geometric progressions.","Calculate the sum to infinity of a convergent geometric progression."],
        },
        {
          ...topic("math-ii-05-binary-operations", "5", "Binary Operations", ["Closure, commutativity, associativity and distributivity", "Identity and inverse elements"], [3]),
          objectives: ["Solve problems involving closure, commutativity, associativity and distributivity.","Solve problems involving identity and inverse elements."],
        },
        {
          ...topic("math-ii-06-matrices", "6", "Matrices and Determinants", ["Matrix operations up to 3 x 3", "Determinants up to 3 x 3", "Inverse of 2 x 2 matrices"], [3]),
          objectives: ["Perform addition, subtraction, multiplication and division-related operations on matrices up to order 3 × 3.","Calculate determinants of matrices up to order 3 × 3.","Find inverses of 2 × 2 matrices."],
        },
      ]},
      { id: "math-iii", title: "III. Geometry and Trigonometry", topics: [
        {
          ...topic("math-iii-01-euclidean", "1", "Euclidean Geometry", ["Angles and lines", "Polygons", "Circle theorems and cyclic quadrilaterals", "Construction"], [3]),
          objectives: ["Identify types of lines, angles and polygons and solve related problems.","Apply circle theorems, including cyclic quadrilaterals and intersecting chords.","Identify construction procedures for standard angles."],
        },
        {
          ...topic("math-iii-02-mensuration", "2", "Mensuration", ["Lengths, perimeters and plane areas", "Arcs, chords, sectors and segments", "Surface areas and volumes", "Longitudes and latitudes"], [4]),
          objectives: ["Calculate perimeters and areas of triangles, quadrilaterals, circles and composite plane figures.","Find arc and chord lengths and the perimeters and areas of sectors and segments.","Calculate surface areas and volumes of common solids and composite figures.","Determine distances on the Earth's surface using longitudes and latitudes."],
        },
        {
          ...topic("math-iii-03-loci", "3", "Loci", ["Two-dimensional loci based on lines and curves"], [4]),
          objectives: ["Identify and interpret two-dimensional loci based on lines and curves, including parallel lines, perpendicular bisectors, angle bisectors and circles."],
        },
        {
          ...topic("math-iii-04-coordinate-geometry", "4", "Coordinate Geometry", ["Midpoint and gradient", "Distance between points", "Parallel and perpendicular lines", "Equations of straight lines"], [4]),
          objectives: ["Determine the midpoint and gradient of a line segment and the distance between two points.","Identify conditions for parallel and perpendicular lines.","Find equations of straight lines in two-point, point-slope, slope-intercept and general forms."],
        },
        {
          ...topic("math-iii-05-trigonometry", "5", "Trigonometry", ["Trigonometric ratios", "Elevation, depression and bearings", "Areas and solutions of triangles", "Sine and cosine graphs and formulae"], [4]),
          objectives: ["Calculate sine, cosine and tangent for angles from −360° to 360°.","Apply standard angles to solve trigonometric problems.","Solve problems involving elevation, depression and bearings.","Use trigonometric formulae to calculate triangle areas and solve triangles.","Interpret sine and cosine graphs and apply sine and cosine formulae."],
        },
      ]},
      { id: "math-iv", title: "IV. Calculus", topics: [
        {
          ...topic("math-iv-01-differentiation", "1", "Differentiation", ["Limits of functions", "Differentiation of explicit algebraic functions", "Simple trigonometric functions"], [4]),
          objectives: ["Find limits of functions.","Differentiate explicit algebraic functions and simple sine, cosine and tangent functions."],
        },
        {
          ...topic("math-iv-02-applications", "2", "Application of Differentiation", ["Rates of change", "Maxima and minima"], [4,5]),
          objectives: ["Solve rate-of-change problems using differentiation.","Determine maxima and minima of functions."],
        },
        {
          ...topic("math-iv-03-integration", "3", "Integration", ["Integration of explicit algebraic functions", "Simple trigonometric functions", "Area under a curve"], [5]),
          objectives: ["Integrate explicit algebraic and simple trigonometric functions.","Calculate areas under curves in simple cases."],
        },
      ]},
      { id: "math-v", title: "V. Statistics", topics: [
        {
          ...topic("math-v-01-data", "1", "Representation of Data", ["Frequency distribution", "Histograms, bar charts and pie charts"], [5]),
          objectives: ["Identify and interpret frequency distribution tables.","Interpret histograms, bar charts and pie charts."],
        },
        {
          ...topic("math-v-02-location", "2", "Measures of Location", ["Mean, mode and median", "Cumulative frequency"], [5]),
          objectives: ["Calculate mean, mode and median for grouped and ungrouped data in simple cases.","Use ogives to estimate medians, quartiles and percentiles."],
        },
        {
          ...topic("math-v-03-dispersion", "3", "Measures of Dispersion", ["Range, mean deviation, variance and standard deviation"], [5]),
          objectives: ["Calculate range, mean deviation, variance and standard deviation for grouped and ungrouped data."],
        },
        {
          ...topic("math-v-04-permutation", "4", "Permutation and Combination", ["Linear and circular arrangements", "Arrangements involving repeated objects"], [5]),
          objectives: ["Solve simple problems involving linear and circular arrangements and arrangements with repeated objects."],
        },
        {
          ...topic("math-v-05-probability", "5", "Probability", ["Experimental probability", "Addition and multiplication of probabilities", "Mutually exclusive and independent events"], [5]),
          objectives: ["Solve simple experimental probability problems.","Apply addition and multiplication rules of probability to mutually exclusive and independent events."],
        },
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
    sourcePageLabel: "JAMB IBASS printed pages",
    officialSourceUrl: "https://ibass.jamb.gov.ng/assets/uploads/Use-of-English.pdf",
    officialSourceCheckedAt: "2026-11-18",
    sourceComparisonNote: "The uploaded 2025 PDF differs from the JAMB-hosted IBASS PDF: it adds a separate five-question summary passage, allocates five rather than ten questions to the reading text, omits the named reading text The Lekki Headmaster by Kabir Alabi Garba, omits homonyms, and differs on punctuation/spelling and oral-form coverage. IBASS specifies one comprehension passage (5 questions), one cloze passage (10), and one reading text (10), for the same 25-question Section A total. This catalogue follows the JAMB-hosted IBASS PDF checked on 18 November 2026; the uploaded copy remains linked as a separate source record.",
    generalObjectives: [
      "Communicate effectively in both written and spoken English.",
      "Use English Language for learning at the tertiary level.",
    ],
    examinationStructure: [
      "Section A — Comprehension/Summary: one comprehension passage (5 questions), one cloze passage (10 questions), and one reading text (10 questions).",
      "Section B — Lexis and Structure: sentence interpretation (5), antonyms (5), synonyms (5), and sentence completion (10).",
      "Section C — Oral Forms: 10 questions.",
      "Total: 60 Use of English questions.",
    ],
    sections: [
      { id: "english-a", title: "A. Comprehension and Summary", topics: [
        {
          ...topic("eng-a-01-comprehension-summary", "A", "Comprehension and Summary", [
            "Description, narration, exposition and argumentation/persuasion.",
            "Two passages of about 200 words each, one of which is a cloze test, reflecting various disciplines.",
            "Comprehension of whole or parts of passages; words, phrases, clauses, sentences, figures of speech and idioms in context.",
            "Coherence and logical reasoning, including deductions and inferences.",
            "The prescribed reading text: The Lekki Headmaster by Kabir Alabi Garba.",
            "Synthesis of ideas from passages.",
          ], [198]),
          objectives: [
            "Identify main points and topic sentences in passages.",
            "Determine implied meaning.",
            "Identify grammatical functions of words, phrases and clauses, including figurative and idiomatic expressions.",
            "Infer writers' intentions, mood, attitude to the subject matter and opinion.",
          ],
        },
      ]},
      { id: "english-b", title: "B. Lexis and Structure", topics: [
        {
          ...topic("eng-b-01-lexis-structure", "B", "Lexis and Structure", [
            "Synonyms, antonyms and homonyms.",
            "Clause and sentence patterns.",
            "Word classes and their functions.",
            "Mood, tense, aspect, number, agreement/concord, degree and question tags.",
            "Punctuation and spelling.",
            "Ordinary, figurative and idiomatic usage; tested idioms are formal Standard British English.",
          ], [199]),
          objectives: [
            "Identify words and expressions in ordinary, figurative and idiomatic contexts.",
            "Determine similar and opposite meanings of words.",
            "Differentiate between correct and incorrect punctuation and spelling.",
            "Identify grammatical patterns in use.",
            "Interpret information conveyed in sentences.",
          ],
        },
      ]},
      { id: "english-c", title: "C. Oral Forms", topics: [
        {
          ...topic("eng-c-01-oral-forms", "C", "Oral Forms", [
            "Vowels: monothongs and diphthongs.",
            "Consonants, including clusters.",
            "Rhymes, including homophones.",
            "Word stress in monosyllabic and polysyllabic words.",
            "Intonation and emphatic stress in connected speech.",
          ], [199]),
          objectives: [
            "Make distinctions between vowel types.",
            "Differentiate between consonant types.",
            "Identify correct accentuation and pronunciation in individual words and connected speech.",
          ],
        },
      ]},
    ],
  },
};

export const JAMB_SYLLABUS_REVIEW_NOTICE =
  "This catalogue is still under source review and is not certified as the complete current JAMB syllabus.";

export const JAMB_SYLLABUS_VERSION = "mixed-sources-checked-2026-11-19";
export const JAMB_SYLLABUS_VERIFIED = false;

export function getJambSyllabusSubject(id: string): JambSyllabusSubject | undefined {
  return JAMB_SYLLABUS[id as JambSyllabusSubjectId];
}

export function getJambSyllabusTopic(
  subjectId: string,
  topicId: string,
): JambSyllabusTopic | undefined {
  const subject = getJambSyllabusSubject(subjectId);
  if (!subject || !topicId.trim()) return undefined;
  return subject.sections
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
