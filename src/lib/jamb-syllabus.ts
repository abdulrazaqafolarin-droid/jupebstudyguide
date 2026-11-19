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
    officialSourceUrl: "https://ibass.jamb.gov.ng/assets/uploads/Physics.pdf",
    officialSourceCheckedAt: "2026-11-18",
    sourceComparisonNote: "JAMB-hosted IBASS Physics PDF is available. The uploaded 2025 copy is retained as supplied; the complete topic/objective mapping still needs line-by-line reconciliation against the IBASS PDF.",
    generalObjectives: [
      "Sustain interest in physics.",
      "Develop attitudes relevant to accuracy, precision and objectivity.",
      "Interpret physical phenomena, laws, definitions, concepts and theories.",
      "Solve physics problems correctly using relevant theories and concepts.",
    ],
    sections: [{
      id: "physics-core", title: "Physics syllabus",
      topics: [
        {
          ...topic("phy-01-measurements", "1", "Measurements and Units", ["Fundamental and derived units", "Measuring instruments", "Fundamental physical quantities", "Dimensions", "Experimental accuracy, errors and significant figures"], [1,2]),
          objectives: ["Identify SI and common units of length, area, volume, mass and time.","Use metre rules, vernier callipers, micrometers, measuring cylinders, stopwatches and balances.","Determine lengths, surface areas and volumes of regular and irregular bodies.","Relate fundamental quantities to their units and deduce units of derived quantities.","Determine dimensions, test dimensional homogeneity and use dimensions to check equations.","Assess instrument accuracy, estimate errors and express measurements in standard form."],
        },
        {
          ...topic("phy-02-scalars-vectors", "2", "Scalars and Vectors", ["Scalar and vector quantities", "Relative velocity", "Resolution of vectors", "Graphical methods", "Measurement, position, distance and displacement", "Coordinates and frame of reference"], [2]),
          objectives: ["Distinguish scalar from vector quantities and give examples.","Determine resultants of two or more vectors, relative velocity and perpendicular components.","Use graphical methods, strings and measuring instruments to solve vector and displacement problems.","Distinguish distance from displacement and use compass bearings, protractors and Cartesian coordinates to locate positions.","Identify the accuracy and appropriate use of instruments for measuring position and displacement."],
        },
        {
          ...topic("phy-04-motion", "3", "Motion", ["Newton's laws", "Types and causes of motion", "Linear motion and motion graphs", "Projectiles", "Circular motion", "Simple harmonic motion"], [3,4]),
          objectives: ["Identify translational, oscillatory, rotational, spin and random motion.","Explain inertia, mass, force, impulse and momentum and solve collinear-motion problems.","Interpret Newton's laws, force-time graphs and conservation of linear momentum.","Distinguish contact forces from field forces and identify push and pull as forms of force.","Differentiate speed, velocity and acceleration and apply uniformly accelerated motion equations.","Solve problems involving motion under gravity and interpret distance-time and velocity-time graphs.","Calculate instantaneous velocity, acceleration, projectile range, maximum height and time of flight.","Establish angular velocity, angular acceleration and centripetal force and solve circular-motion problems.","Relate period and frequency, analyse energy changes in simple harmonic motion and identify forced vibrations and resonance."],
        },
        {
          ...topic("phy-05-gravitational-field", "4", "Gravitational Field", ["Universal gravitation", "Gravitational potential and fields", "Acceleration due to gravity", "Mass and weight", "Escape velocity and orbits"], [4]),
          objectives: ["Apply Newton's law of universal gravitation to calculate forces between bodies.","Explain gravitational potential and distinguish conservative from non-conservative fields.","Explain variations in gravitational acceleration over the Earth's surface.","Differentiate mass from weight and solve related problems.","Calculate escape velocity and explain orbital motion and weightlessness."],
        },
        {
          ...topic("phy-06-equilibrium", "5", "Equilibrium of Forces", ["Equilibrium of particles", "Triangles and polygon of forces", "Lami's theorem", "Principle of moments and torque", "Centre of gravity and stability"], [5]),
          objectives: ["Apply equilibrium conditions for coplanar forces to solve problems.","Use triangle and polygon laws of forces and Lami's theorem.","Calculate moments and couples and describe their applications.","Apply equilibrium conditions to rigid bodies under parallel and non-parallel forces.","Resolve forces into perpendicular components and determine resultants and equilibrants.","Differentiate stable, unstable and neutral equilibrium."],
        },
        {
          ...topic("phy-07-friction", "6", "Friction", ["Static and dynamic friction", "Coefficient of limiting friction", "Advantages and reduction of friction", "Viscosity and terminal velocity", "Stoke's law"], [5]),
          objectives: ["Differentiate static and dynamic friction and determine limiting friction coefficients.","Compare the advantages and disadvantages of friction and suggest ways to reduce it.","Analyse factors affecting viscosity and terminal velocity.","Apply Stoke's law to solve simple problems."],
        },
        {
          ...topic("phy-08-work-energy-power", "7", "Work, Energy and Power", ["Forms and conservation of energy", "Energy conversion", "Energy and society", "Dams, nuclear and solar energy"], [5,6]),
          objectives: ["Differentiate work, energy and power and solve numerical problems.","Compare forms of energy and apply conservation and transformation of energy.","Interpret the area under a force-distance graph.","Identify renewable and non-renewable energy sources and discuss energy use, development and environmental effects.","Explain energy diversification, energy conversion, dams, nuclear energy, solar collectors, photovoltaic cells and solar panels.","Relate solar energy to the photoelectric effect, work function and Planck's constant."],
        },
        {
          ...topic("phy-09-simple-machines", "8", "Simple Machines", ["Types of simple machines", "Mechanical advantage", "Velocity ratio", "Efficiency"], [6]),
          objectives: ["Identify types of simple machines and explain their operation.","Calculate mechanical advantage, velocity ratio and efficiency.","Solve numerical problems involving simple machines."],
        },
        {
          ...topic("phy-10-elasticity", "9", "Elasticity: Hooke's Law and Young's Modulus", ["Elastic limit, yield point and breaking point", "Spring balance", "Work done in springs and elastic strings"], [7]),
          objectives: ["Interpret force-extension curves and explain elastic limit, yield point and breaking point.","Apply Hooke's law and Young's modulus to material behaviour.","Use a spring balance to measure force.","Calculate work done in springs and elastic strings."],
        },
        {
          ...topic("phy-11-pressure", "10", "Pressure", ["Atmospheric pressure and its measurement", "Barometers and manometers", "Pressure in liquids", "Pascal's principle"], [7]),
          objectives: ["Recognise the SI unit of pressure and identify pressure-measuring instruments.","Explain atmospheric pressure and the use of mercury and aneroid barometers and manometers.","Relate pressure variation to height and use a barometer as an altimeter.","Determine the relationship between pressure, depth and liquid density.","Apply Pascal's principle to solve problems involving pressure transmission in liquids."],
        },
        {
          ...topic("phy-12-liquids-rest", "11", "Liquids at Rest", ["Density and relative density", "Upthrust", "Archimedes' principle", "Law of floatation and applications"], [7]),
          objectives: ["Distinguish density from relative density and determine both for substances.","Calculate upthrust on a body immersed in a liquid.","Apply Archimedes' principle and the law of floatation to problems and applications such as ships and hydrometers."],
        },
        {
          ...topic("phy-13-temperature", "12", "Temperature and Its Measurement", ["Thermometric properties", "Calibration of thermometers", "Celsius and Kelvin scales", "Types of thermometers"], [7,8]),
          objectives: ["Identify thermometric properties used in different thermometers.","Calibrate thermometers and compare thermometer types.","Differentiate Celsius, Fahrenheit and Kelvin scales and convert between them."],
        },
        {
          ...topic("phy-14-quantity-heat", "13", "Quantity of Heat", ["Heat capacity", "Specific heat capacity", "Methods of determining heat capacity", "Newton's law of cooling"], [8]),
          objectives: ["Differentiate heat capacity from specific heat capacity.","Determine heat capacity and specific heat capacity using simple experimental methods.","Solve numerical problems involving heat capacity and specific heat capacity."],
        },
        {
          ...topic("phy-15-change-state", "14", "Change of State", ["Latent heat", "Specific latent heat of fusion and vaporisation", "Melting, evaporation and boiling", "Effects of pressure and dissolved substances"], [8]),
          objectives: ["Differentiate latent heat from specific latent heats of fusion and vaporisation.","Differentiate melting, evaporation and boiling.","Examine the effects of pressure and dissolved substances on melting and boiling points.","Solve numerical problems involving latent heat and change of state."],
        },
        {
          ...topic("phy-16-thermal-expansion", "15", "Thermal Expansion", ["Expansion of solids", "Linear, area and volume expansivity", "Expansion of liquids", "Anomalous expansion of water"], [8,9]),
          objectives: ["Determine linear, area and volume expansivities of solids.","Explain effects and applications of expansion in structures and engineering.","Relate different coefficients of expansivity.","Determine volume, apparent and real expansivities of liquids.","Explain anomalous expansion of water."],
        },
        {
          ...topic("phy-17-gas-laws", "16", "Gas Laws", ["Boyle's law", "Charles' law", "Pressure law", "General and ideal gas equations", "Real gases"], [9]),
          objectives: ["Interpret Boyle's, Charles' and pressure laws and apply them to numerical problems.","Use the general gas equation and ideal gas equation.","Explain absolute zero and the relationship between pressure, volume and temperature.","Interpret the Van der Waals equation for a real gas."],
        },
        {
          ...topic("phy-18-vapours", "17", "Vapours", ["Saturated and unsaturated vapours", "Saturated vapour pressure and boiling", "Dew point, humidity and relative humidity", "Hygrometry"], [9]),
          objectives: ["Distinguish saturated from unsaturated vapours.","Relate saturated vapour pressure to boiling point.","Determine saturated vapour pressure using a barometer-tube method.","Differentiate dew point, humidity and relative humidity.","Estimate atmospheric humidity using wet- and dry-bulb hygrometers.","Solve simple numerical problems involving vapours and humidity."],
        },
        {
          ...topic("phy-19-structure-matter", "18", "Structure of Matter and Kinetic Theory", ["Molecular nature of matter", "Atoms and molecules", "Brownian motion and diffusion", "Kinetic theory and gas pressure"], [9,10]),
          objectives: ["Differentiate atoms from molecules.","Use molecular theory to explain Brownian motion, diffusion, surface tension, capillarity, adhesion, cohesion and angle of contact.","State the assumptions of kinetic theory.","Use kinetic theory to explain gas pressure, gas laws and changes of state including melting, boiling, vaporisation and evaporation."],
        },
        {
          ...topic("phy-20-heat-transfer", "19", "Heat Transfer", ["Conduction, convection and radiation", "Thermal conductivity and heat flux", "Absorption and radiation", "Vacuum flask", "Land and sea breeze"], [10]),
          objectives: ["Differentiate conduction, convection and radiation.","Solve problems involving temperature gradient, thermal conductivity and heat flux.","Explain how surface properties affect absorption and emission of radiant energy.","Compare the thermal conductivities of common materials.","Explain the components and operation of a vacuum flask.","Explain land and sea breezes and the principles of jet and combustion engines.","Compare the advantages and disadvantages of electric and combustion engines."],
        },
        {
          ...topic("phy-21-waves", "20", "Waves", ["Production and propagation", "Wave types and classification", "Frequency, wavelength and velocity", "Reflection, refraction and diffraction", "Superposition, interference and beats"], [10,11]),
          objectives: ["Interpret wave motion and identify vibrating systems as sources of waves and waves as energy transfer.","Distinguish particle motion from wave motion and relate frequency, wavelength and wave velocity.","Determine phase difference, wave number and wave vector and use the progressive-wave equation.","Differentiate mechanical and electromagnetic waves, longitudinal and transverse waves, and stationary and progressive waves.","Identify waves produced by springs, ropes, stretched strings and ripple tanks.","Differentiate reflection, refraction, diffraction and plane polarisation.","Apply superposition and solve problems involving interference, beats and beat frequency.","Explain the Doppler effect and its applications."],
        },
        {
          ...topic("phy-22-sound-propagation", "21", "Propagation of Sound Waves", ["Need for a material medium", "Speed of sound in solids, liquids and air", "Reflection, echoes and reverberation"], [11]),
          objectives: ["Explain why a material medium is needed for sound propagation.","Compare the speed of sound in solids, liquids and air and relate it to temperature and pressure.","Solve problems involving echoes, reverberation and speed of sound.","Explain advantages and disadvantages of echoes and reverberation."],
        },
        {
          ...topic("phy-23-sound-characteristics", "22", "Characteristics of Sound Waves", ["Noise and musical notes", "Quality, pitch, intensity and loudness", "Harmonics and overtones"], [12]),
          objectives: ["Differentiate noise from musical notes.","Analyse quality, pitch, intensity and loudness and relate them to musical instruments.","Identify harmonics and overtones from vibrating strings and air columns.","Give acoustic examples of resonance.","Calculate frequencies of notes produced by open and closed pipes."],
        },
        {
          ...topic("phy-24-light-energy", "23", "Light Energy", ["Sources and nature of light", "Propagation of light", "Applications of light"], [12]),
          objectives: ["Compare natural and artificial sources of light and distinguish luminous from non-luminous objects.","Relate the speed, frequency and wavelength of light.","Explain the formation of shadows and eclipses.","Solve problems using the principle of a pinhole camera."],
        },
        {
          ...topic("phy-25-reflection", "24", "Reflection of Light at Plane and Curved Surfaces", ["Laws of reflection", "Plane and curved mirrors", "Image formation and applications"], [12,13]),
          objectives: ["Apply the laws of reflection.","Illustrate image formation by plane, concave and convex mirrors.","Apply the mirror formula and calculate linear magnification.","Explain applications of reflection in periscopes, kaleidoscopes and sextants."],
        },
        {
          ...topic("phy-26-refraction", "25", "Refraction of Light", ["Laws of refraction", "Refractive index", "Critical angle and total internal reflection", "Refraction through prisms and lenses"], [13]),
          objectives: ["Apply the laws of refraction and determine refractive index using Snell's law.","Determine refractive index using real and apparent depth.","Explain critical angle, total internal reflection, mirages and optical fibres.","Use ray diagrams and lens formulae to solve optical problems and calculate magnification.","Calculate prism refractive index using minimum deviation and trace rays through prisms."],
        },
        {
          ...topic("phy-27-optical-instruments", "26", "Optical Instruments", ["Simple microscope", "Compound microscope", "Telescope", "Camera and related instruments"], [13]),
          objectives: ["Apply operating principles of microscopes, telescopes, projectors, cameras and the human eye.","Distinguish the human eye from a camera.","Calculate the power of a lens and angular magnification of optical instruments.","Determine near and far points and identify and correct sight defects."],
        },
        {
          ...topic("phy-28-dispersion", "27", "Dispersion of Light and Colours", ["Dispersion through a prism", "Spectrum and colour", "Applications of dispersion"], [14]),
          objectives: ["Identify primary colours and obtain secondary colours by mixing.","Explain rainbow formation and why objects appear coloured.","Analyse colour filters and additive and subtractive colour mixing.","Relate electromagnetic radiation to wavelength, sources, detection and uses.","Define monochromatic light."],
        },
        {
          ...topic("phy-29-electrostatics", "28", "Electrostatics", ["Electric charges", "Coulomb's law", "Electric fields and potential", "Applications"], [14]),
          objectives: ["Identify positive and negative charges and charge bodies by friction, contact and induction.","Explain the operation and uses of an electroscope.","Apply Coulomb's inverse-square law to solve problems.","Deduce expressions for electric field intensity, potential and potential difference.","Identify electric-field patterns around isolated and interacting charges.","Explain charge distribution on conductors and the use of lightning conductors."],
        },
        {
          ...topic("phy-30-capacitors", "29", "Capacitors", ["Capacitance", "Dielectrics", "Series and parallel combinations", "Energy stored"], [14]),
          objectives: ["Identify types and uses of capacitors.","Analyse parallel-plate capacitors and determine capacitance.","Explain how plate area, separation and dielectric medium affect capacitance.","Solve problems involving capacitor combinations in series and parallel.","Determine energy stored in a capacitor."],
        },
        {
          ...topic("phy-31-electric-cells", "30", "Electric Cells", ["Cells and electromotive force", "Internal resistance", "Series and parallel cell combinations"], [15]),
          objectives: ["Identify defects of a simple voltaic cell and methods of correcting them.","Compare types of cells, including solar cells, Daniell, Leclanche and accumulators.","Compare lead-acid and nickel-iron accumulators.","Solve problems involving cells arranged in series and parallel."],
        },
        {
          ...topic("phy-32-current-electricity", "31", "Current Electricity", ["Electric current and potential difference", "Ohm's law", "Resistance and resistivity", "Electric circuits"], [15]),
          objectives: ["Differentiate electromotive force, potential difference, current and internal resistance.","Apply Ohm's law to solve problems.","Use a metre bridge to determine resistance.","Calculate effective resistance in series and parallel circuits.","Determine resistivity and conductivity.","Measure emf, current and internal resistance using a potentiometer and explain its advantages.","Apply Kirchhoff's laws to electrical networks."],
        },
        {
          ...topic("phy-33-electrical-energy-power", "32", "Electrical Energy and Power", ["Electrical energy", "Power", "Electrical energy consumption and applications"], [15]),
          objectives: ["Apply equations for electrical energy and power to solve problems.","Explain transmission of electrical power from generating stations to consumers.","Identify heating effects of current and their uses.","Explain advantages of parallel house wiring over series arrangements.","Explain electrical wiring and the use and rating of fuses."],
        },
        {
          ...topic("phy-34-magnets", "33", "Magnets and Magnetic Fields", ["Magnetic poles and fields", "Magnetic materials", "Earth's magnetic field"], [16]),
          objectives: ["Give examples of natural and artificial magnets and compare soft iron with steel.","Describe methods of making and demagnetising magnets and ways to preserve magnetism.","Determine magnetic flux patterns for isolated magnets, interacting poles, conductors, circular coils and solenoids.","Identify magnetic elements of the Earth, including magnetic meridian, dip and declination.","Explain variation of the Earth's magnetic field and applications in navigation and mineral exploration."],
        },
        {
          ...topic("phy-35-force-current-conductor", "34", "Force on a Current-Carrying Conductor in a Magnetic Field", ["Force on a conductor", "Direction of force", "Applications in electric motors"], [16,17]),
          objectives: ["Use Fleming's left-hand rule to determine force direction on a current-carrying conductor.","Explain attractive and repulsive forces between parallel current-carrying conductors.","Relate force on a moving charge to magnetic field strength, velocity and entry angle.","Explain the operation of a DC motor and the principles and applications of electromagnets.","Compare moving-iron and moving-coil instruments.","Convert galvanometers into ammeters and voltmeters and identify factors affecting sensitivity."],
        },
        {
          ...topic("phy-36-electromagnetic-induction", "35", "Electromagnetic Induction", ["Faraday's law", "Lenz's law", "Induced e.m.f. and current", "Applications"], [17]),
          objectives: ["Interpret Faraday's and Lenz's laws and identify factors affecting induced emf.","Explain AC and DC generators, transformers and induction coils.","Explain inductance, its unit and applications.","Calculate total inductance in series and parallel and energy stored in an inductor.","Explain eddy-current effects, applications and methods of reducing losses."],
        },
        {
          ...topic("phy-37-ac-circuits", "36", "Simple A.C. Circuits", ["Alternating current and voltage", "A.C. circuit behaviour", "Transformers and applications"], [17]),
          objectives: ["Differentiate AC current and voltage and distinguish peak from RMS values.","Determine phase differences between current and voltage.","Interpret vector diagrams and RLC circuits.","Calculate effective voltage, reactance and impedance.","Identify resonance conditions and calculate resonant frequency.","Determine instantaneous and average power and power factor in AC circuits."],
        },
        {
          ...topic("phy-38-electricity-gases", "37", "Conduction of Electricity Through Gases", ["Ionisation", "Discharge through gases", "Applications and observations"], [18]),
          objectives: ["Distinguish electrolytes from non-electrolytes and explain electrolysis.","Apply Faraday's laws of electrolysis to solve problems.","Analyse discharge through gases and identify applications of electrical conduction through gases."],
        },
        {
          ...topic("phy-38-modern-physics", "38", "Elementary Modern Physics", ["Atomic models and structure", "Energy levels and spectra", "Photoelectric effect", "X-rays", "Radioactivity, half-life and nuclear energy", "Wave-particle duality"], [18,19]),
          objectives: ["Identify atomic models and their limitations and describe elementary atomic structure.","Differentiate energy levels and atomic spectra.","Compare thermionic emission and photoelectric emission and apply Einstein's equation to problems.","Explain x-ray production, properties and applications.","Analyse radioactivity, isotopes, nuclear stability and alpha, beta and gamma radiation.","Relate half-life to decay constant and solve simple radioactive-decay problems.","Explain fusion, fission, binding energy, mass defect and Einstein's energy equation.","Analyse wave-particle duality, electron diffraction and the uncertainty principle."],
        },
        {
          ...topic("phy-39-electronics", "39", "Introductory Electronics", ["Conductors, semiconductors and insulators", "Intrinsic and extrinsic semiconductors", "Diodes and transistors"], [19]),
          objectives: ["Differentiate conductors, semiconductors and insulators, including elementary band-gap ideas.","Distinguish intrinsic from extrinsic semiconductors and n-type from p-type materials.","Differentiate electron and hole carriers.","Explain diode rectification and transistor amplification."],
        },
        {
          ...topic("phy-40-fibre-lasers", "40", "Introduction to Fibre Optics and Lasers", ["Fibre optics and light transmission", "Laser types", "Applications and safety"], [19,20]),
          objectives: ["Explain the concept of fibre optics and the principle of light transmission through an optical fibre.","Apply fibre-optic principles in local area networks, medicine and communications.","Explain lasers and identify solid-state, gas, liquid and semiconductor laser types.","Describe scientific, communication, medical, military and holographic applications of lasers.","Identify hazards associated with laser use."],
        },
      ],
    }],
  },
  chemistry: {
    id: "chemistry", label: "Chemistry", icon: "🧪",
    description: "Chemical principles, reactions, calculations, compounds and industry",
    compulsory: false, questionBankAvailable: false, questionSourcePackAvailable: true,
    sourceFile: "Chemistry-1.pdf",
    sourceSha256: "a3c15bfee3bece0f4106a32b0091e2a2c51eaec8baa62fafa44afcad72193738",
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
    officialSourceUrl: "https://ibass.jamb.gov.ng/assets/uploads/Biology.pdf",
    officialSourceCheckedAt: "2026-11-18",
    sourceComparisonNote: "JAMB-hosted IBASS Biology PDF is available. The uploaded 2025 copy is retained as supplied; the complete topic/objective mapping still needs line-by-line reconciliation against the IBASS PDF.",
    generalObjectives: [
      "Demonstrate knowledge of diversity, interdependence and unity of life.",
      "Account for continuity of life through reorganization, inheritance and evolution.",
      "Apply biological principles to living things, society, the environment, community health and the economy.",
    ],
    sections: [
      { id: "biology-a", title: "A. Variety of Organisms", topics: [
        {
          ...topic("bio-a-01-living-organisms", "1", "Living Organisms", ["Characteristics of living things", "Cell structure and functions", "Levels of organisation: cell, tissue, organ, system and organism"], [1]),
          objectives: ["Differentiate living things from non-living things.","Identify the structures of plant and animal cells and explain the functions of their components.","Compare and contrast plant and animal cells.","Trace the organisation of living things through cell, tissue, organ, system and organism."],
        },
        {
          ...topic("bio-a-02-evolution-organisms", "2", "Evolution Among Organisms", ["Monera, Protista and Fungi", "Plant groups: Thallophyta, Bryophyta, Pteridophyta and Spermatophyta", "Invertebrates and vertebrates", "Structural complexity and life histories"], [1,2]),
          objectives: ["Analyse the external features and characteristics of the listed Monera, Protista, fungi, plants and animals.","Use examples to demonstrate increasing structural complexity.","Trace the life histories of representative organisms.","Explain the transition from aquatic to terrestrial life using life-history evidence.","Trace the evolution and major groups of plants and animals, including vertebrates and invertebrates.","Determine the economic and environmental importance of selected insects and other organisms.","Classify plants according to annual, biennial and perennial life cycles."],
        },
        {
          ...topic("bio-a-03-adaptations", "3", "Structural, Functional and Behavioural Adaptations", ["Adaptive colouration", "Behavioural adaptations in social animals", "Structural adaptations", "Feeding, protection, mating, temperature regulation and water conservation"], [2]),
          objectives: ["Explain how structural, functional and behavioural features adapt organisms to their environments.","Describe adaptive colouration, including countershading and warning colouration.","Differentiate castes in social insects and explain their roles.","Explain basking, territorial behaviour, hibernation and aestivation.","Relate feeding structures, protection, defence, mating displays, temperature regulation and water conservation to adaptation."],
        },
      ]},
      { id: "biology-b", title: "B. Form and Functions", topics: [
        {
          ...topic("bio-b-01-plant-structure", "1", "Internal Structure of a Flowering Plant", ["Root, stem and leaf structure", "Supporting tissues", "Internal structure of a mammal"], [3]),
          objectives: ["Identify transverse sections of roots, stems and leaves.","Relate the internal structures of plant organs to their functions.","Identify supporting tissues and describe their distribution in roots, stems and leaves.","Examine the arrangement, appearance and position of mammalian internal, digestive, reproductive and excretory organs."],
        },
        {
          ...topic("bio-b-02-nutrition", "2", "Nutrition", ["Autotrophic and heterotrophic nutrition", "Photosynthesis and chemosynthesis", "Mineral requirements", "Animal nutrition, food classes and food tests", "Teeth and alimentary canal"], [3,4]),
          objectives: ["Compare autotrophic and heterotrophic nutrition and give plant examples.","Compare photosynthesis with chemosynthesis and distinguish major heterotrophic feeding modes.","Explain light and dark reactions and the roles of light, carbon dioxide and chlorophyll in photosynthesis.","Describe a starch test as evidence of photosynthesis.","Identify plant macro- and micro-elements and recognise nitrogen, phosphorus and potassium deficiency symptoms.","Identify food classes, their sources, nutritional values, functions and deficiency diseases, and explain balanced diets.","Interpret food-test experiments for starch, reducing sugars, proteins, oils and fats.","Describe mammalian teeth, compare tooth types and dental formulae, and relate structure to function.","Relate the alimentary canal and accessory organs to their functions.","Explain digestive enzymes, their action on carbohydrates, proteins and fats, and the resulting end products."],
        },
        {
          ...topic("bio-b-03-transport", "3", "Transport", ["Need and materials for transportation", "Mammalian circulatory system", "Plant vascular system", "Transport media and mechanisms"], [4]),
          objectives: ["Explain why increasing organism size and complexity require transport systems.","Identify materials transported and the sources and forms in which they are carried.","Describe the general mammalian circulatory system and compare the functions of major arteries and veins.","Identify plant vascular tissues and explain the roles of xylem and phloem.","Identify transport media such as cytoplasm, cell sap, body fluid, blood and lymph.","State the composition and functions of blood and lymph.","Explain diffusion, osmosis, plasmolysis and turgidity as transport mechanisms.","Compare open circulation in animals with transpiration pull, root pressure and active transport in plants."],
        },
        {
          ...topic("bio-b-04-respiration", "4", "Respiration", ["Respiratory organs and surfaces", "Gaseous exchange in plants and animals", "Aerobic and anaerobic respiration"], [4,5]),
          objectives: ["Explain the significance of respiration and the role of oxygen in energy release.","Outline glycolysis and the Krebs cycle with reference to ATP production.","Interpret experiments on gaseous exchange, respiratory products and heat production.","Describe body surfaces, gills, tracheae, lungs, stomata and lenticels as respiratory surfaces.","Explain stomatal opening and closing and compare respiratory mechanisms in plants and animals.","Explain the effect of inadequate oxygen supply on muscles.","Demonstrate fermentation using yeast and sugar solution and state the economic importance of yeast."],
        },
        {
          ...topic("bio-b-05-excretion", "5", "Excretion", ["Excretory organs and products", "Excretion in plants and animals", "Osmoregulation"], [5]),
          objectives: ["Define excretion and explain its significance.","Relate the structures of contractile vacuoles, flame cells, nephridia, Malpighian tubules, kidneys, stomata and lenticels to excretion.","Explain excretory and osmoregulatory functions of the kidneys.","Identify the excretory products and functions of the lungs and skin.","Explain the economic importance of plant excretory products such as oxygen, carbon dioxide, tannins, resins, gums and alkaloids."],
        },
        {
          ...topic("bio-b-06-support-movement", "6", "Support and Movement", ["Support in plants", "Skeleton and support in animals", "Movement and locomotion"], [5]),
          objectives: ["Explain the need for support and movement in organisms.","Identify plant supporting tissues and describe their distribution in roots, stems and leaves.","Relate plant tropic, tactic, nastic and sleep movements to responses to light, water, gravity and touch.","Identify regions of growth in roots and shoots and explain the role of auxins in tropism.","Relate chitin, cartilage and bone to support in animals.","Relate the mammalian skeleton to support, locomotion and respiration.","Differentiate types of joints with appropriate examples.","Explain the protective, supportive, locomotive and respiratory functions of the skeleton."],
        },
        {
          ...topic("bio-b-07-reproduction", "7", "Reproduction", ["Asexual and sexual reproduction", "Reproduction in flowering plants", "Pollination and fertilisation", "Reproduction in mammals"], [5,6]),
          objectives: ["Differentiate asexual and sexual reproduction.","Describe fission, budding and natural vegetative propagation.","Apply grafting, budding and layering in crop production.","Relate floral parts to their functions, pollination and fertilisation.","State advantages of cross-pollination and relate placentation to fruit types.","Identify male and female mammalian reproductive organs and relate their structures to their functions.","Explain gamete fusion and fertilisation.","Relate maternal health, nutrition and drug use to embryonic development and birth.","Explain modern reproductive technologies, including in-vitro fertilisation and birth control."],
        },
        {
          ...topic("bio-b-08-growth", "8", "Growth", ["Meaning and stages of growth", "Seed germination and conditions necessary for germination"], [6]),
          objectives: ["Explain growth and the conditions necessary for seed germination.","Differentiate epigeal and hypogeal germination."],
        },
        {
          ...topic("bio-b-09-coordination", "9", "Co-ordination and Control", ["Nervous coordination and impulse transmission", "Reflex action", "Sense organs", "Hormonal control", "Homeostasis"], [6]),
          objectives: ["Explain how the central and peripheral nervous systems coordinate body functions.","Describe nerve impulse transmission and illustrate reflex actions such as blinking and the knee jerk.","Differentiate reflex, voluntary and conditioned actions.","Relate the skin, nose, tongue, eye and ear to their sensory functions and defects.","Locate the principal endocrine glands and relate their hormones to their functions.","Explain the effects of auxins, gibberellins, cytokinins and ethylene on plant growth and development.","Relate hormones to homeostasis, including temperature, salt and water regulation."],
        },
      ]},
      { id: "biology-c", title: "C. Ecology", topics: [
        {
          ...topic("bio-c-01-distribution", "1", "Factors Affecting the Distribution of Organisms", ["Abiotic factors", "Biotic factors"], [6,7]),
          objectives: ["Relate temperature, rainfall, humidity, wind, altitude, salinity, turbidity, pH and soil conditions to organism distribution.","Use appropriate equipment, including a Secchi disc, thermometer and rain gauge, to measure abiotic factors.","Explain how plant, animal and human activities affect organism distribution."],
        },
        {
          ...topic("bio-c-02-symbiosis", "2", "Symbiotic Interactions of Plants and Animals", ["Energy flow, food chains and food webs", "Trophic levels", "Carbon, water and nitrogen cycles"], [7]),
          objectives: ["Give examples of symbiosis, parasitism, saprophytism, commensalism, mutualism, amensalism, competition, predation and cooperation.","Explain food chains, food webs, trophic levels and energy flow in habitats.","Describe the carbon, water and nitrogen cycles and their significance.","Relate the carbon cycle to atmospheric oxygen and carbon dioxide balance and global warming.","Explain how the water cycle affects other nutrient cycles.","Explain the roles of bacteria and leguminous plants in nitrogen cycling."],
        },
        {
          ...topic("bio-c-03-habitats", "3", "Natural Habitats", ["Aquatic habitats", "Terrestrial and arboreal habitats"], [7]),
          objectives: ["Associate plants and animals with aquatic, terrestrial and arboreal habitats.","Relate adaptive features of organisms to the habitats in which they live."],
        },
        {
          ...topic("bio-c-04-biomes", "4", "Local Nigerian Biomes", ["Tropical rainforest", "Guinea and Sudan savanna", "Desert", "Montane forests and highland grasslands"], [7]),
          objectives: ["Locate the major Nigerian biomes, including tropical rainforest, Guinea and Sudan savanna, desert and montane highlands.","Use the characteristics of local biomes to distinguish regions of Nigeria."],
        },
        {
          ...topic("bio-c-05-populations", "5", "The Ecology of Populations", ["Population density and overcrowding", "Competition and succession", "Biotic and abiotic factors affecting population size"], [7,8]),
          objectives: ["Explain causes of rapid human population change and the consequences of overcrowding.","Calculate population density as organisms per unit area.","Relate food, disease and space pressures to intra- and inter-specific competition.","Explain niche differentiation as a way of reducing competition.","Relate competition to ecological succession.","Explain biotic and abiotic factors that affect population size.","Describe primary and secondary succession and the progression to a stable climax community."],
        },
        {
          ...topic("bio-c-06-soil", "6", "Soil", ["Soil types and structure", "Porosity, capillarity and humus", "Soil components and organisms", "Soil fertility, loss, renewal and maintenance"], [8]),
          objectives: ["Identify the physical properties of sandy, loamy and clayey soils.","Determine soil particle size, porosity, water retention, air, water, humus and capillarity experimentally.","Relate soil types, characteristics and components to healthy plant growth.","Explain soil fertility loss through nutrient depletion, compaction, leaching, erosion and repeated cropping.","Apply contour ridging, terracing, mulching, mixed cropping, strip cropping, fertilisers, crop rotation and shifting cultivation to soil conservation."],
        },
        {
          ...topic("bio-c-07-humans-environment", "7", "Humans and the Environment", ["Common and endemic diseases", "Drug abuse and prevention", "Pollution, sanitation and sewage", "Conservation, game reserves and national parks"], [8,9]),
          objectives: ["Identify ecological conditions that favour common endemic and epidemic diseases.","Relate disease agents and vectors to disease spread and control.","Define drug abuse and addiction, identify commonly abused drugs and state their health effects.","Use knowledge of causative organisms, transmission and symptoms to explain disease prevention and control.","Explain inoculation and vaccination.","Classify pollution and relate air, water and soil pollutants to human health and environmental degradation.","Describe methods of pollution control, sanitation, sewage disposal, personal hygiene and community health.","Explain the roles of WHO, UNICEF, the Red Cross and national health/environment agencies.","Apply conservation methods to renewable and non-renewable resources and explain their benefits.","Identify conservation organisations, game reserves and national parks in Nigeria and explain their importance."],
        },
      ]},
      { id: "biology-d", title: "D. Heredity and Variations", topics: [
        {
          ...topic("bio-d-01-variation", "1", "Variation in Population", ["Morphological variation", "Physiological variation", "Applications in crime detection, blood transfusion and paternity"], [9]),
          objectives: ["Differentiate continuous and discontinuous variation.","Relate variation to environmental conditions, habitat and genetic constitution.","Measure and plot frequency distributions for human heights and weights.","Observe and record colour patterns in plants and animals.","Apply fingerprint classification to identity detection.","Identify physiological variations such as tongue rolling, PTC tasting and blood groups.","Apply blood-group knowledge to transfusion and paternity determination and discontinuous variation to crime detection."],
        },
        {
          ...topic("bio-d-02-heredity", "2", "Heredity", ["Heritable and non-heritable characters", "Chromosomes and transmission of hereditary characters", "Genetic probability and sex determination", "Applications in agriculture and medicine", "Sex-linked characters"], [10]),
          objectives: ["Differentiate heritable and non-heritable characters and illustrate the structure of DNA.","Explain gene segregation during meiosis and random recombination at fertilisation.","Analyse cross-breeding data and apply heredity to crop and livestock improvement.","State advantages and disadvantages of in-breeding and out-breeding.","Discuss genetically modified organisms, gene therapy and biosafety at an elementary level.","Apply heredity to counselling related to blood groups, sickle-cell anaemia and Rhesus factors.","Explain recombinant DNA applications in producing insulin, interferon and enzymes.","Identify sex-linked characters such as haemophilia and colour blindness."],
        },
        {
          ...topic("bio-d-03-biotechnology", "3", "Biotechnology", ["Applications in agriculture", "Applications in medicine and pharmaceuticals", "Applications in the food industry"], [10]),
          objectives: ["Define biotechnology.","List applications of biotechnology in agriculture, medicine, pharmaceuticals and the food industry."],
        },
      ]},
      { id: "biology-e", title: "E. Evolution", topics: [
        {
          ...topic("bio-e-01-theories", "1", "Theories of Evolution", ["Lamarck's theory", "Darwin's theory", "Organic theory"], [11]),
          objectives: ["Explain organic evolution as cumulative adaptive change producing the diversity of organisms.","Describe the contributions of Lamarck and Darwin to evolutionary theory.","State evidence supporting organic evolution."],
        },
        {
          ...topic("bio-e-02-evidence", "2", "Evidence of Evolution", ["Evidence used to explain evolutionary change"], [11]),
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
    generalObjectives: [
      "Acquire computational and manipulative skills.",
      "Develop precise, logical and formal reasoning skills.",
      "Develop deductive skills in interpretation of graphs, diagrams and data.",
      "Apply mathematical concepts to resolve issues in daily living.",
    ],
    sections: [
      { id: "math-i", title: "I. Number and Numeration", topics: [
        {
          ...topic("math-i-01-number-bases", "1", "Number Bases and Modular Arithmetic", ["Operations in bases 2 to 10", "Conversion between bases, including fractions", "Modular arithmetic"], [2]),
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
          ], [1,2]),
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
          ], [2]),
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
          ], [2]),
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
  "This catalogue combines the five 2025-created source PDFs supplied by the owner with JAMB-hosted IBASS references. Use of English now follows the JAMB-hosted PDF checked on 18 November 2026 because the uploaded copy materially differs. Physics and Biology have official IBASS links but still need full line-by-line mapping; Chemistry and Mathematics remain supplied-source candidates pending IBASS reconciliation. This catalogue is not certified as the 2027 syllabus or a verified complete current syllabus.";

export const JAMB_SYLLABUS_VERSION = "mixed-sources-checked-2026-11-18";
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
