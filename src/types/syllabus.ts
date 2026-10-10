import { Subject } from './question';

export interface SyllabusTopic {
  id: string;
  name: string;
  description: string;
  subtopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
}

export interface DailyTask {
  day: number;
  topics: SyllabusTopic[];
  subject: Subject;
  learningObjectives: string[];
  checkpointQuestions: string[];
  isCompleted: boolean;
  completedAt?: Date;
  masteryScore?: number;
}

export interface UserSubjectCombination {
  core: Subject[];
  elective: Subject[];
}

export interface SyllabusProgress {
  combination: UserSubjectCombination;
  currentDay: number;
  dailyTasks: DailyTask[];
  startedAt: Date;
  lastStudiedAt?: Date;
  overallProgress: number;
  subjectProgress: Record<Subject, number>;
}

export type SessionStatus = 'active' | 'paused' | 'completed';

export interface StudySessionData {
  id: string;
  name: string;
  subjects: Subject[];
  status: SessionStatus;
  progress: SyllabusProgress;
  startDate: string;
  dailyGoalMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredStudySession {
  id: string;
  name: string;
  subjects: Subject[];
  status: SessionStatus;
  progress: StoredSyllabus;
  startDate: string;
  dailyGoalMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export type StoredDailyTask = Omit<DailyTask, 'completedAt'> & {
  completedAt?: string;
};

export type StoredSyllabus = Omit<SyllabusProgress, 'startedAt' | 'lastStudiedAt' | 'dailyTasks'> & {
  startedAt: string;
  lastStudiedAt?: string;
  dailyTasks: StoredDailyTask[];
};

export function serializeProgress(p: SyllabusProgress): StoredSyllabus {
  return {
    combination: p.combination,
    currentDay: p.currentDay,
    dailyTasks: p.dailyTasks.map(t => ({
      ...t,
      completedAt: t.completedAt ? (typeof t.completedAt === 'string' ? t.completedAt : t.completedAt.toISOString()) : undefined,
    })),
    startedAt: typeof p.startedAt === 'string' ? p.startedAt : p.startedAt.toISOString(),
    lastStudiedAt: p.lastStudiedAt ? (typeof p.lastStudiedAt === 'string' ? p.lastStudiedAt : p.lastStudiedAt.toISOString()) : undefined,
    overallProgress: p.overallProgress,
    subjectProgress: { ...p.subjectProgress },
  };
}

export function deserializeProgress(s: StoredSyllabus): SyllabusProgress {
  return {
    ...s,
    startedAt: new Date(s.startedAt),
    lastStudiedAt: s.lastStudiedAt ? new Date(s.lastStudiedAt) : undefined,
    dailyTasks: s.dailyTasks.map(t => ({
      ...t,
      completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
    })),
    subjectProgress: s.subjectProgress as Record<Subject, number>,
  };
}

export function combinationFromSubjects(subjects: Subject[]): UserSubjectCombination {
  const core: Subject[] = [];
  const elective: Subject[] = [];
  for (const s of subjects) {
    if (s === 'physics' || s === 'chemistry') {
      core.push(s);
    } else {
      elective.push(s);
    }
  }
  return { core, elective };
}

export function generateSessionTasks(subjects: Subject[], totalDays: number = 30): DailyTask[] {
  const tasks: DailyTask[] = [];
  const allTopics: { topic: SyllabusTopic; subject: Subject }[] = [];
  for (const subject of subjects) {
    const syllabus = SYLLABUSES[subject];
    if (!syllabus) continue;
    for (const topic of syllabus) {
      allTopics.push({ topic, subject });
    }
  }
  const topicsPerDay = Math.ceil(allTopics.length / totalDays);
  let topicIndex = 0;
  for (let day = 1; day <= totalDays; day++) {
    const dayTopics: SyllabusTopic[] = [];
    let daySubject: Subject = subjects[0] || 'physics';
    const objectives: string[] = [];
    const checkpoints: string[] = [];
    for (let i = 0; i < topicsPerDay && topicIndex < allTopics.length; i++) {
      const { topic, subject } = allTopics[topicIndex];
      dayTopics.push(topic);
      daySubject = subject;
      objectives.push(`Understand the key concepts of ${topic.name}`);
      topic.subtopics.slice(0, 2).forEach(sub => {
        objectives.push(`Master ${sub}`);
      });
      checkpoints.push(`Can you explain ${topic.name} in your own words?`);
      checkpoints.push(`What are the key formulas/concepts in ${topic.subtopics[0] || 'this topic'}?`);
      topicIndex++;
    }
    if (dayTopics.length > 0) {
      tasks.push({
        day,
        topics: dayTopics,
        subject: daySubject,
        learningObjectives: objectives,
        checkpointQuestions: checkpoints,
        isCompleted: false,
      });
    }
  }
  while (tasks.length < totalDays) {
    const reviewDay = tasks.length + 1;
    const reviewSubject = subjects[reviewDay % subjects.length];
    tasks.push({
      day: reviewDay,
      subject: reviewSubject,
      topics: [],
      learningObjectives: ['Review previous topics', 'Practice past questions', 'Strengthen weak areas'],
      checkpointQuestions: ['Can you solve problems from the topics covered this week?'],
      isCompleted: false,
    });
  }
  return tasks;
}

// Comprehensive JUPEB Syllabuses based on official JUPEB curriculum from syllabus.ng
export const SYLLABUSES: Record<Subject, SyllabusTopic[]> = {
  physics: [
    { id: 'phy-units', name: 'Units and Measurements', description: 'Fundamental and derived quantities, units, dimensional analysis, measurement methods', subtopics: ['Order of Magnitude', 'SI Units', 'Unit Conversion', 'Dimensional Analysis', 'Measurement of Length/Mass/Time'], difficulty: 'beginner', estimatedHours: 3 },
    { id: 'phy-vectors', name: 'Vectors', description: 'Vector representation, operations, and applications in Cartesian coordinates', subtopics: ['Vector Representation', 'Vector Addition/Subtraction', 'Resolution of Vectors', 'Vector Multiplication', 'Cartesian Coordinate System'], difficulty: 'beginner', estimatedHours: 3 },
    { id: 'phy-kinematics', name: 'Particle Kinetics', description: 'Types of motion, linear motion, kinematic equations, projectiles', subtopics: ['Types of Motion', 'Linear Motion', 'Kinematic Graphs', 'Instantaneous/Average Velocity', 'Relative Motion', 'Free Fall', 'Projectile Motion'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'phy-dynamics', name: 'Dynamics', description: "Newton's laws, forces, equilibrium, momentum, collisions", subtopics: ["Newton's Laws of Motion", 'Types of Forces', 'Universal Gravitation', 'Equilibrium of Forces', 'Centre of Mass/Gravity', 'Linear Momentum', 'Elastic/Inelastic Collisions', 'Friction', 'Inclined Planes'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'phy-gravity', name: 'Gravitational Field', description: 'Universal gravitation, Kepler\'s laws, satellite motion', subtopics: ["Kepler's Laws", "Newton's Law of Gravitation", 'Gravitational Field Strength', 'Gravitational Potential', 'Satellite Motion', 'Escape Velocity'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-work-energy', name: 'Work, Energy and Power', description: 'Energy transformations, conservation, power', subtopics: ['Work Done', 'Types of Energy', 'Conservation of Energy', 'Power', 'Kilowatt-hour', 'Mechanical Energy Conservation'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-circular', name: 'Circular and Oscillatory Motion', description: 'Angular motion, centripetal force, simple harmonic motion, resonance', subtopics: ['Angular Displacement/Velocity', 'Torque and Angular Acceleration', 'Angular Momentum', 'Centripetal Force/Acceleration', 'Rotational Kinetic Energy', 'Simple Harmonic Motion', 'Damped/Forced Oscillations', 'Resonance'], difficulty: 'advanced', estimatedHours: 5 },
    { id: 'phy-elasticity', name: 'Elasticity', description: 'Hooke\'s law, stress, strain, elastic moduli', subtopics: ["Hooke's Law", 'Elastic Limit', 'Stress and Strain', "Young's Modulus", 'Shear Modulus', 'Bulk Modulus', 'Elastic/Plastic Deformation', 'Energy Stored in Solids'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-hydrostatics', name: 'Hydrostatics', description: 'Pressure in fluids, Archimedes\' principle, floatation', subtopics: ['States of Matter', 'Density', 'Pressure in Fluids', "Archimedes' Principle", 'Principle of Floatation', "Stokes' Law", 'Terminal Velocity'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-hydrodynamics', name: 'Hydrodynamics', description: 'Viscosity, surface tension, fluid flow, Bernoulli\'s principle', subtopics: ['Viscosity', 'Surface Tension', 'Adhesion and Cohesion', 'Capillarity', "Bernoulli's Principle", "Pascal's Principle", "Reynold's Number", 'Laminar/Turbulent Flow', "Poiseuille's Equation"], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'phy-gases', name: 'Ideal Gases', description: 'Gas laws, kinetic theory, equation of state', subtopics: ["Boyle's Law", "Charles' Law", 'Pressure Law', 'Equation of State', 'Kinetic Theory of Gases', 'Pressure of a Gas', 'Kinetic Energy of Molecules'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-temperature', name: 'Temperature and Thermometry', description: 'Heat capacity, specific/latent heat, thermal conductivity, blackbody radiation', subtopics: ['Heat Capacity', 'Specific Heat Capacity', 'Latent Heat', 'Internal Energy', 'Thermal Conductivity', 'Blackbody Radiation'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-thermodynamics', name: 'Thermodynamics', description: 'Laws of thermodynamics, isothermal and adiabatic processes', subtopics: ['Work Done by Gas', 'Internal Energy of Gas', 'First Law of Thermodynamics', 'Second Law of Thermodynamics', 'Isothermal Processes', 'Adiabatic Processes'], difficulty: 'advanced', estimatedHours: 3 },
    { id: 'phy-em-waves', name: 'Electromagnetic Waves', description: 'Electromagnetic spectrum and applications', subtopics: ['Electromagnetic Spectrum', 'Applications of EM Waves'], difficulty: 'beginner', estimatedHours: 2 },
    { id: 'phy-geometrical-optics', name: 'Geometrical Optics', description: 'Reflection, refraction, mirrors, lenses, optical instruments', subtopics: ['Rectilinear Propagation', 'Laws of Reflection/Refraction', 'Plane/Curved Mirrors', 'Total Internal Reflection', 'Critical Angle', 'Dispersion by Prism', 'Lenses', 'Image Formation', 'Optical Instruments', 'Defects of Vision'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'phy-waves', name: 'Oscillations and Waves', description: 'Wave properties, classification, superposition, interference, diffraction', subtopics: ['Classification of Waves', 'Wave Parameters', 'Wave Equation', 'Progressive/Stationary Waves', 'Reflection/Refraction/Diffraction', 'Principle of Superposition', 'Interference'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'phy-wave-light', name: 'Wave Theory of Light', description: "Huygens' principle, Young's double slit, polarization", subtopics: ['Wave-Particle Nature', "Huygens' Principle", 'Interference and Diffraction', "Young's Double Slit", 'Coherent Sources', 'Diffraction Grating', 'Polarization'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'phy-sound', name: 'Sound Waves', description: 'Characteristics of sound, Doppler effect, waves in strings and pipes', subtopics: ['Pitch/Loudness/Quality', 'Intensity and Decibel', 'Beats', 'Doppler Effect', 'Waves in Strings', 'Waves in Pipes'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-electrostatics', name: 'Electrostatics', description: "Coulomb's law, Gauss's law, electric field and potential", subtopics: ["Coulomb's Law", "Gauss's Law", 'Electric Field', 'Electric Potential', 'Potential due to Point Charge', 'Equipotential Surfaces'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'phy-capacitors', name: 'Capacitors', description: 'Capacitance, dielectrics, energy storage, charging/discharging', subtopics: ['Capacitance', 'Dielectrics and Permittivity', 'Capacitors in Series/Parallel', 'Energy Stored', 'Charging/Discharging', 'C-R Circuit Time Constant'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-current', name: 'Current Electricity', description: "Ohm's law, circuits, Kirchhoff's laws, potentiometer, Wheatstone bridge", subtopics: ['Electric Current', 'Potential Difference', 'Resistance and Resistivity', "Ohm's Law", 'Resistors in Series/Parallel', 'EMF and Internal Resistance', "Kirchhoff's Laws", 'Electrical Power/Energy', 'Potentiometer', 'Wheatstone Bridge', 'Temperature Coefficient of Resistance'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'phy-magnetism', name: 'Magnetic Fields', description: 'Magnetic flux, flux density, earth\'s magnetism', subtopics: ["Earth's Magnetic Field", 'Magnetic Flux', 'Magnetic Flux Density', 'Solenoids/Conductors/Coils'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-force-conductor', name: 'Force on a Conductor and Moving Charge', description: "Fleming's rules, torque, Ampere's law, Biot-Savart law", subtopics: ['Force on Current-Carrying Conductor', 'Force Between Conductors', "Fleming's Left-Hand Rule", 'Torque on Coil', "Ampere's Law", 'Biot-Savart Law'], difficulty: 'advanced', estimatedHours: 3 },
    { id: 'phy-induction', name: 'Electromagnetic Induction', description: "Faraday's law, Lenz's law, transformers, generators, motors", subtopics: ["Faraday's Law", "Lenz's Law", "Fleming's Right-Hand Rule", 'Dynamo', 'Transformer', 'Eddy Current', 'Self/Mutual Inductance', 'Motors and Generators'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'phy-ac', name: 'Alternating Current Circuits', description: 'AC characteristics, L-C-R circuits, resonance, power', subtopics: ['AC Characteristics', 'Resistive/Capacitive/Inductive Circuits', 'C-R and L-R Circuits', 'L-C-R Series Circuit', 'Resonance', 'Power in AC Circuits'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'phy-atomic', name: 'Atomic Structure', description: 'Nucleus, electron, isotopes, spectra, Millikan\'s experiment', subtopics: ['Protons/Neutrons/Electrons', 'Specific Charge', 'Isotopes', "Millikan's Experiment", 'Cathode Rays', 'Types of Spectrum', 'Hydrogen Spectrum'], difficulty: 'advanced', estimatedHours: 3 },
    { id: 'phy-modern', name: 'Elements of Modern Physics', description: "Photoelectric effect, Bohr's theory, lasers", subtopics: ['Ultraviolet Catastrophe', 'Photoelectric Emission', "Bohr's Theory", 'Energy Levels', 'Excitation and Emission', 'Fraunhofer Lines', 'Laser Principle'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'phy-xrays', name: 'X-Rays', description: "Nature/properties of X-rays, Bragg's law, Moseley's law", subtopics: ['Nature of X-Rays', 'Crystal Diffraction', "Bragg's Law", "Moseley's Law", 'Absorption Spectra'], difficulty: 'advanced', estimatedHours: 2 },
    { id: 'phy-quantum', name: 'Wave-Particle Duality', description: "De Broglie, Compton effect, Heisenberg's uncertainty principle", subtopics: ['Electron Diffraction', 'De Broglie Formula', 'Compton Effect', "Heisenberg's Uncertainty Principle"], difficulty: 'advanced', estimatedHours: 2 },
    { id: 'phy-radioactivity', name: 'Principles of Radioactivity', description: 'Radioactive decay, half-life, nuclear fission/fusion, nuclear energy', subtopics: ['Radioactivity', 'Mass Excess and Binding Energy', 'Nuclear Fission/Fusion', 'Geiger-Muller Tube', 'Half-Life and Decay Constant', 'Nuclear Reactions', 'Einstein Mass-Energy Relation'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'phy-semiconductors', name: 'Introduction to Semiconductors', description: 'Intrinsic/extrinsic semiconductors, p-n junctions, rectifiers, transistors', subtopics: ['Intrinsic Semiconductors', 'Energy Bands', 'Doping', 'P-N Junction Diodes', 'Half/Full Wave Rectification', 'Bridge Rectifier', 'Transistor as Amplifier/Switch'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'phy-applied', name: 'Applied Physics', description: 'Applications to life sciences, ultrasound, X-ray, NMR', subtopics: ['Physics in Life Sciences', 'Ultrasound Principles', 'X-Ray Applications', 'Nuclear Magnetic Resonance'], difficulty: 'advanced', estimatedHours: 2 },
  ],
  chemistry: [
    { id: 'chm-measurement', name: 'Measurement', description: 'SI units, data analysis, error calculations in chemistry', subtopics: ['SI Units', 'Derived Units', 'Significant Figures', 'Precision and Accuracy', 'Systematic/Random Errors', 'Standard Deviation'], difficulty: 'beginner', estimatedHours: 3 },
    { id: 'chm-mole', name: 'Mole Concept', description: 'Atomic masses, stoichiometry, empirical/molecular formulae, standard solutions', subtopics: ['Isotopy and Mass Spectrometry', 'Relative Atomic Mass', 'The Mole', 'Empirical/Molecular Formula', 'Stoichiometry', 'Molarity/Molality/Mole Fraction', 'Standard Solutions', 'Serial Dilution'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'chm-atomic', name: 'Atomic Structure', description: 'Sub-atomic particles, quantum theory, electron configuration', subtopics: ['Discovery of Sub-Atomic Particles', "Planck's Theory", "Bohr's Theory", 'Wave Theory of Atom', 'Quantum Numbers', 'Atomic Orbitals', 'Electron Configuration', 'Aufbau Principle'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'chm-periodicity', name: 'Periodicity', description: 'Periodic table development, trends in atomic properties', subtopics: ['Modern Periodic Table', 'Periods/Blocks/Groups', 'Periodic Law', 'Atomic Size Trends', 'Ionization Potential', 'Electron Affinity', 'Electronegativity', 'Ionic Radii', 'Isoelectronic Species'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'chm-reactions', name: 'Types of Chemical Reactions', description: 'Neutralization, precipitation, redox, displacement reactions', subtopics: ['Neutralization Reactions', 'Precipitation Reactions', 'Oxidation and Reduction', 'Oxidation Numbers', 'Balancing Redox Reactions', 'Disproportionation', 'Single/Double Displacement'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'chm-bonding', name: 'Chemical Bonding', description: 'Ionic, covalent, coordinate, metallic bonding; molecular geometry; intermolecular forces', subtopics: ['Ionic/Electrovalent Bonding', 'Covalent Bonding', 'Coordinate/Dative Bonding', 'Metallic Bonding', 'Hybridization (sp, sp2, sp3)', 'VSEPR Theory', 'Molecular Shapes', 'Bond Energy/Length/Polarity', 'Intermolecular Forces', 'Hydrogen Bonding'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'chm-matter', name: 'Nature of Matter', description: 'States of matter, phase diagrams, interconversion', subtopics: ['Three States of Matter', 'Interconversion', 'Phase Diagrams', 'One-Component Systems'], difficulty: 'beginner', estimatedHours: 2 },
    { id: 'chm-gases', name: 'Kinetic Molecular Theory of Gases', description: 'Gas laws, ideal and real gases, Boltzmann distribution', subtopics: ['Gas Laws', 'Ideal Gas Equation', 'Kinetic Theory Assumptions', 'Gas Densities and Molar Mass', "Boltzmann's Distribution", 'Real Gases and van der Waals Equation'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'chm-solutions', name: 'Solutions', description: "Raoult's law, colligative properties, ideal and non-ideal solutions", subtopics: ["Raoult's Law", 'Ideal/Non-Ideal Solutions', 'Vapour Pressure Lowering', 'Freezing Point Depression', 'Boiling Point Elevation', 'Osmotic Pressure', 'Molar Mass Determination'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'chm-thermochemistry', name: 'Thermochemistry', description: "Enthalpy changes, Hess's law, Born-Haber cycle", subtopics: ['Exothermic/Endothermic Changes', 'Enthalpy of Combustion/Formation', "Hess's Law", 'Born-Haber Cycle', 'Bond Energy Calculations'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'chm-thermodynamics', name: 'Thermodynamics', description: 'First law, internal energy, entropy, free energy, spontaneity', subtopics: ['First Law of Thermodynamics', 'Internal Energy', 'Heat and Work', 'Isothermal/Adiabatic Processes', 'Entropy Changes', 'Gibbs Free Energy', 'Spontaneity of Reactions'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'chm-electrochemistry', name: 'Electrochemistry', description: "Electrolysis, electrochemical cells, Faraday's laws, Nernst equation", subtopics: ["Faraday's Laws of Electrolysis", 'Electrode Potentials', 'Standard Electrode Potential', 'Cell EMF', 'Nernst Equation', 'Fuel Cells', 'Batteries', 'Electrochemical Series'], difficulty: 'advanced', estimatedHours: 5 },
    { id: 'chm-kinetics', name: 'Chemical Kinetics', description: 'Rate equations, order of reaction, activation energy, catalysis', subtopics: ['Rate of Reaction', 'Order and Molecularity', 'Rate Laws', 'Half-Life', 'Activation Energy', 'Arrhenius Equation', 'Collision Theory', 'Homogeneous/Heterogeneous Catalysis'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'chm-equilibrium', name: 'Chemical Equilibrium', description: "Equilibrium constant, Le Chatelier's principle, acid-base equilibria", subtopics: ['Law of Mass Action', 'Equilibrium Constant (Kc/Kp)', "Le Chatelier's Principle", 'Acid-Base Concepts', 'pH Calculations', 'Buffer Solutions', 'Indicator Theory', 'Solubility Product', 'Common Ion Effect', 'Salt Hydrolysis'], difficulty: 'advanced', estimatedHours: 5 },
    { id: 'chm-nuclear', name: 'Nuclear Chemistry', description: 'Radioactivity, nuclear reactions, half-life, carbon dating', subtopics: ['Types of Radiation', 'Nuclear Stability', 'Balancing Nuclear Equations', 'Half-Life', 'Radioactive Carbon Dating', 'Mass Defect', 'Nuclear Energy', 'Applications of Radioactivity'], difficulty: 'advanced', estimatedHours: 3 },
    { id: 'chm-periodicity-advanced', name: 'Periodicity and s-Block Elements', description: 'Period III trends, groups 1-2, diagonal relationship, hydrogen chemistry', subtopics: ['Period III Trends', 'Diagonal Relationship', 'Anomalous Period II', 'Hydrogen Occurrence/Isotopes', 'Hydrides', 'Group 1 Properties/Extraction', 'Group 2 Properties/Extraction', 'Compounds of s-Block Elements'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'chm-pblock', name: 'p-Block Elements', description: 'Groups 14-17 elements, trends, compounds, allotropes', subtopics: ['Group 14 (Carbon Group)', 'Allotropes of Carbon', 'Group 15 (Nitrogen Group)', 'Group 16 (Oxygen Group)', 'Types of Oxides', 'Group 17 (Halogens)', 'Hydrogen Halides', 'Inter-Halogen Compounds'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'chm-environment', name: 'Chemistry of the Environment', description: 'Greenhouse effect, acid rain, ozone depletion, global warming', subtopics: ['Greenhouse Gases', 'Environmental Impact of NOx/SOx', 'Acid Rain', 'Ozone Layer Depletion', 'Global Warming'], difficulty: 'intermediate', estimatedHours: 2 },
    { id: 'chm-dblock', name: 'd-Block Elements and Coordination Chemistry', description: 'Transition elements, coordination compounds, ligands', subtopics: ['Definition of Transition Elements', 'Electronic Configuration', 'Variable Oxidation States', 'Properties of Transition Metals', 'Complex Ions and Ligands', 'Types of Ligands', 'Crystal Field Theory', 'Valence Bond Theory', 'Nomenclature of Coordination Compounds'], difficulty: 'advanced', estimatedHours: 5 },
    { id: 'chm-nanochemistry', name: 'Nanochemistry', description: 'Introduction to nanomaterials and nanotechnology', subtopics: ['Definition of Nanomaterials', 'Classification of Nanostructures', 'Sources of Nanomaterials', 'Applications'], difficulty: 'advanced', estimatedHours: 2 },
    { id: 'chm-separation', name: 'Separation and Purification Techniques', description: 'Distillation, chromatography, recrystallization, element analysis', subtopics: ['Distillation', 'Liquid Extraction', 'Sublimation', 'Recrystallization', 'Melting Point Determination', 'Thin Layer Chromatography', 'Paper Chromatography', 'Sodium Fusion Test'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'chm-organic-structure', name: 'Structure and Bonding in Organic Compounds', description: 'Hybridization, IUPAC nomenclature, functional groups', subtopics: ['Tetravalency of Carbon', 'Hybridization (sp3, sp2, sp)', 'Sigma and Pi Bonds', 'Homologous Series', 'Functional Groups', 'IUPAC Nomenclature'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'chm-organic-reactions', name: 'Organic Reactions', description: 'Bond cleavage, reaction types, SN1/SN2, electronic effects', subtopics: ['Homolytic/Heterolytic Fission', 'Free Radicals', 'Nucleophiles/Electrophiles', 'Addition/Substitution/Elimination', 'SN1 vs SN2', 'Inductive Effect', 'Mesomeric Effect', 'Electromeric Effect'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'chm-isomerism', name: 'Isomerism in Organic Compounds', description: 'Constitutional, stereoisomerism, geometrical and optical isomerism', subtopics: ['Chain Isomerism', 'Position Isomerism', 'Functional Group Isomerism', 'Metamerism', 'Tautomerism', 'Geometrical (Cis/Trans) Isomerism', 'Optical Isomerism', 'Chirality'], difficulty: 'advanced', estimatedHours: 3 },
    { id: 'chm-hydrocarbons', name: 'Hydrocarbons', description: 'Alkanes, alkenes, alkynes, alcohols, alkyl halides, carbonyl compounds, carboxylic acids, amines', subtopics: ['Alkanes/Alkenes/Alkynes', "Markovnikov's Rule", 'Alcohols (Lucas/Jones Test)', 'Alkyl Halides', 'Carbonyl Compounds', 'Carboxylic Acids and Derivatives', 'Amines and Diazonium Salts', 'Aromatic Compounds', 'Benzene Reactions (Nitration/Sulphonation/Halogenation/Friedel Crafts)', 'Effects of Substituents'], difficulty: 'advanced', estimatedHours: 6 },
    { id: 'chm-macromolecules', name: 'Macromolecules', description: 'Carbohydrates, proteins, amino acids, polymers', subtopics: ['Classes of Carbohydrates', 'Simple Tests for Carbohydrates', 'Amino Acids', 'Peptide Bonds and Zwitterions', 'Types of Proteins', 'Polymerization Reactions', 'Thermosets vs Thermoplastics', 'Uses of Polymers'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'chm-petroleum', name: 'Petroleum Industry', description: 'Crude oil constituents, refining, cracking, petrochemicals', subtopics: ['Constituents of Crude Oil', 'Refining Process', 'Cracking', 'Chemicals from Crude Oil'], difficulty: 'intermediate', estimatedHours: 2 },
  ],
  biology: [
    { id: 'bio-origin', name: 'Origin of Living Things', description: 'Definition of biology, scientific methods, importance of biology', subtopics: ['Definition of Biology', 'Importance of Biology', 'Scientific Methods', 'Hypothesis Testing', 'Data Collection and Analysis', 'Biology in Medicine/Agriculture'], difficulty: 'beginner', estimatedHours: 3 },
    { id: 'bio-molecules', name: 'Living Things in Nature and Biological Molecules', description: 'Kingdoms of life, carbohydrates, lipids, proteins, nucleic acids', subtopics: ['Different Kingdoms', 'Characteristics of Kingdoms', 'Carbohydrates', 'Lipids', 'Proteins', 'Nucleic Acids'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-cells', name: 'Cell Organization, Structure and Function', description: 'Cell structure, microscopy, plant and animal cell comparison', subtopics: ['Cell Structure', 'Microscope Demonstration', 'Biological Drawings', 'Plant vs Animal Cells'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-genetics', name: 'Cell Division, Genetics, Variation and Heredity', description: "Mendel's laws, chromosomes, genes, cell division, blood groups", subtopics: ['Chromosomes and Genes', 'Alleles and Inheritance', 'Genotype/Phenotype', "Mendel's Laws", 'Mitosis', 'Meiosis', 'Multiple Alleles (Blood Groups)', 'Inheritance Determination'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'bio-taxonomy', name: 'Systematics: Taxonomy and Nomenclature', description: 'Classification and identification of organisms, adaptive features', subtopics: ['Classification of Organisms', 'Identification Methods', 'Adaptive Features and Uses'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'bio-ecology', name: 'Ecology', description: 'Symbiosis, mutualism, parasitism, environmental studies, climate change', subtopics: ['Symbiosis', 'Mutualism', 'Parasitism', 'Environmental Studies', 'Ecological Equipment', 'Population Studies', 'Climate Change Impacts'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-bio-methods', name: 'Biology Methods and Application', description: 'Standard drawing rules, microscopy techniques, specimen analysis', subtopics: ['Drawing Rules', 'Specimen Proportions', 'Magnification', 'Labelling Guidelines'], difficulty: 'beginner', estimatedHours: 2 },
    { id: 'bio-evolution', name: 'Evolution', description: 'Types of evolution, application to plant and animal taxonomy', subtopics: ['Definition of Evolution', 'Types of Evolution', 'Application to Plants', 'Application to Animals'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'bio-plant-diversity', name: 'Basic Characteristics and Diversity of Plants', description: 'Classification of major plant groups, algae, fungi, bryophytes, pteridophytes, spermatophytes', subtopics: ['Lower vs Higher Plants', 'Algae (Chlorella, Spirogyra)', 'Fungi (Yeast, Rhizopus)', 'Bryophytes (Riccia, Funaria)', 'Pteridophytes', 'Spermatophytes (Cycas, Pinus)', 'Economic/Ecological Importance'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'bio-plant-taxonomy', name: 'Taxonomy of Lower and Higher Plants', description: 'Plant nomenclature, classification, systematics', subtopics: ['Plant Nomenclature', 'Plant Classification', 'Taxonomy vs Systematics'], difficulty: 'intermediate', estimatedHours: 2 },
    { id: 'bio-plant-conservation', name: 'Plant Conservation', description: 'In-situ and ex-situ conservation, climate change impact, biological control', subtopics: ['In-Situ Conservation', 'Ex-Situ Conservation', 'Biological Control', 'Climate Change Impact on Plants'], difficulty: 'intermediate', estimatedHours: 2 },
    { id: 'bio-plant-tissues', name: 'Plant Tissues and Functions', description: 'Parenchyma, collenchyma, sclerenchyma, epidermal, vascular tissues', subtopics: ['Parenchyma', 'Collenchyma', 'Sclerenchyma', 'Epidermal Tissue', 'Peridermal Tissue', 'Cambium/Phloem/Xylem', 'Osmosis and Transpiration Practical'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-plant-anatomy', name: 'Plant Morphology and Anatomy', description: 'Roots, stems, leaves, flowers, fruits - monocot and dicot comparisons', subtopics: ['Root Morphology (Tap/Fibrous)', 'Stem Anatomy (Monocot/Dicot)', 'Leaf Types and Modifications', 'Flower Structure', 'Fruit Types', 'Anatomical Drawings'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-plant-nutrition', name: 'Nutrition in Plants', description: 'Photosynthesis, chemosynthesis, mineral requirements, fertilizers', subtopics: ['Autotrophic Nutrition', 'Photosynthesis (Light/Dark Reactions)', 'Chemosynthesis', 'Heterotrophic Nutrition', 'Mineral Requirements', 'Deficiency Symptoms', 'Chemical Fertilizers'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-plant-transport', name: 'Transport System in Plants', description: 'Xylem, phloem, transpiration, osmosis, food transport', subtopics: ['Transport in Xylem', 'Transport in Phloem', 'Transpiration', 'Osmosis', 'Food Transport Mechanisms'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'bio-plant-respiration', name: 'Respiration in Plants', description: 'Stomata, lenticels, aerobic and anaerobic respiration', subtopics: ['Stomata Apparatus', 'Lenticels', 'Aerobic Respiration', 'Anaerobic Respiration'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'bio-plant-reproduction', name: 'Plant Reproduction', description: 'Angiosperm flowers, monocot vs dicot flower differences', subtopics: ['Angiosperm Flower Structure', 'Monocot vs Dicot Flowers'], difficulty: 'intermediate', estimatedHours: 2 },
    { id: 'bio-growth-regulators', name: 'Growth Regulators', description: 'Auxins, gibberellins, cytokinins, ascorbic acid, ethylene', subtopics: ['Auxins', 'Gibberellins', 'Cytokinins', 'Ascorbic Acid', 'Ethylene'], difficulty: 'advanced', estimatedHours: 2 },
    { id: 'bio-crop-improvement', name: 'Crop Improvement', description: 'Genetically modified crops, resistant species, ethical implications', subtopics: ['Genetically Modified Crops', 'Challenges of Resistance', 'Ethical Implications'], difficulty: 'advanced', estimatedHours: 2 },
    { id: 'bio-economic-plants', name: 'Economic and Ecological Importance of Plants', description: 'Food, medicinal, and ornamental plants and their economic value', subtopics: ['Food Plants', 'Medicinal Plants', 'Ornamental Plants'], difficulty: 'beginner', estimatedHours: 2 },
    { id: 'bio-micro-history', name: 'History of the Discovery of Microorganisms', description: 'Spontaneous generation, germ theory, golden era of microbiology, discovery of viruses', subtopics: ['Spontaneous Generation Theory', 'Conflict Over Spontaneous Generation', 'Golden Era of Microbiology', 'Germ Theory of Disease', 'Discovery of Viruses', 'Microbial Laboratory Equipment'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'bio-micro-types', name: 'Types and Taxonomic Groupings of Microorganisms', description: 'Bacteria, fungi, protozoa, viruses, algae classification', subtopics: ['Bacteria (Size/Shape/Motility)', 'Fungi (Yeast/Mould)', 'Protozoa', 'Viruses (Bacteriophages)', 'Algae (Diatoms/Seaweed)', 'Aseptic Techniques'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-micro-structure', name: 'Structure, Morphology and Characteristics of Microorganisms', description: 'Bacterial/fungal/viral structure, cultural characteristics, growth phases', subtopics: ['Bacterial Cell Structure', 'Fungal Cell Structure', 'Cultural Characteristics', 'Biochemical Characteristics', 'Viral Structure', 'Reproduction and Growth Phases', 'Cultivation and Identification'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'bio-microbial-ecology', name: 'Microbial Ecology', description: 'Predation, competition, synergism, commensalism, infectious diseases, immunity', subtopics: ['Predation', 'Competition', 'Synergism', 'Commensalism', 'Infectious Diseases', 'Immunity', 'Food Spoilage', 'Control of Microbial Activities'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'bio-micro-nucleic', name: 'Microbial Nucleic Acids', description: 'DNA/RNA structure, genetic code, transcription, translation, mutations, biotechnology', subtopics: ['Nature of DNA', 'Nucleosides and Nucleotides', 'Types of RNA', 'DNA Replication Enzymes', 'Genetic Code', 'Transcription and Translation', 'Genetic Transfer in Prokaryotes', 'Mutations', 'Biotechnological Applications'], difficulty: 'advanced', estimatedHours: 5 },
    { id: 'bio-animal-diversity', name: 'Diversity and General Characteristics of Animals', description: 'General animal characteristics, diversity of lifestyles and habitats', subtopics: ['General Characteristics', 'Diversity of Lifestyles', 'Diversity of Habitats', 'Categories of Animals'], difficulty: 'beginner', estimatedHours: 2 },
    { id: 'bio-animal-taxonomy', name: 'Systematics (Taxonomy) of Animals', description: 'Classification of invertebrates and vertebrates, major phyla', subtopics: ['Unicellular to Metazoan', 'Invertebrate Classification', 'Animals with/without Tissues', 'Bilateral Symmetry', 'Coelomates', 'Segmented Animals', 'Jointed Appendages', 'Vertebrates', 'Major/Minor Phyla', 'Dissection Practical'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'bio-animal-evolution', name: 'Evolution of Animals', description: 'Adaptations of animals in water, land, and air', subtopics: ['Adaptations in Water', 'Adaptations on Land', 'Adaptations in Air'], difficulty: 'intermediate', estimatedHours: 2 },
    { id: 'bio-invertebrates', name: 'Invertebrates', description: 'Flatworms, parasitic worms, arthropods, body plans, life cycles', subtopics: ['Free-Living Flatworms', 'Parasitic Flatworms', 'Medical/Veterinary Importance', 'Body Plans', 'Arthropod Success'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'bio-chordates', name: 'Introduction to Chordates', description: 'Diversity, classification, morphology, adaptations, reptile dominance', subtopics: ['Adaptations to Habitats', 'History of Adaptations', 'Diversity and Classification', 'Rise and Fall of Reptiles', 'Taxonomic Features of Classes'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'bio-animal-economic', name: 'Ecological and Economic Importance of Animals', description: 'Benefits of animals to man, economic importance of arthropods', subtopics: ['Benefits to Man', 'Economic Importance of Arthropods'], difficulty: 'beginner', estimatedHours: 2 },
    { id: 'bio-physiology', name: 'Physiological Processes', description: 'Animal nutrition, respiration, skeletal system, reproduction', subtopics: ['Types of Nutrition', 'Human Alimentary System', 'Digestion and Absorption', 'Food Tests', 'Mammalian Respiration', 'Human Skeleton', 'Bone vs Cartilage', 'Types of Joints', 'Vertebrate Reproduction', 'Male/Female Reproductive Systems'], difficulty: 'advanced', estimatedHours: 6 },
    { id: 'bio-transport', name: 'Transport of Substances Across Membranes', description: 'Excretion, osmoregulation, circulatory system, diffusion, osmosis, active transport', subtopics: ['Excretion and Osmoregulation', 'Nephron Structure/Function', 'Human Circulatory System', 'Components of Blood', 'Types of Circulation', 'Embryological Development', 'Diffusion and Osmosis', 'Active Transport', 'Turgor Pressure'], difficulty: 'advanced', estimatedHours: 5 },
  ],
  math: [
    { id: 'mat-numbers', name: 'Real Numbers', description: 'Integers, rational/irrational numbers, mathematical induction, sequences and series', subtopics: ['Integers', 'Rational and Irrational Numbers', 'Mathematical Induction', 'Arithmetic Progression', 'Geometric Progression', 'Sum to Infinity', 'Binary Operations'], difficulty: 'beginner', estimatedHours: 4 },
    { id: 'mat-algebra', name: 'Algebra', description: 'Set theory, mappings, quadratics, polynomials, binomial theorem, logarithms, matrices, inequalities', subtopics: ['Set Theory and Venn Diagrams', 'Mapping and Functions', 'Composite/Inverse Functions', 'Quadratic Equations', 'Factor and Remainder Theorem', 'Partial Fractions', 'Binomial Theorem', 'Logarithms', 'Matrices and Determinants', 'Simultaneous Equations', 'Linear/Quadratic Inequalities', 'Absolute Values'], difficulty: 'intermediate', estimatedHours: 8 },
    { id: 'mat-complex', name: 'Complex Numbers', description: 'Algebra of complex numbers, Argand diagram, polar form, De Moivre\'s theorem', subtopics: ['Basic Complex Numbers', 'Algebra of Complex Numbers', 'Argand Diagram', 'Polar Form', "De Moivre's Theorem", 'nth Root of Unity', 'Loci Problems'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'mat-trig', name: 'Trigonometry', description: 'Circular measure, trigonometric functions, graphs, identities, equations', subtopics: ['Radians and Degrees', 'Arc Length', 'Sector/ Segment Area', 'Trigonometric Functions', 'Sine/Cosine/Tangent Graphs', 'Inverse Trig Functions', 'Trigonometric Identities', 'Trigonometric Equations'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'mat-coord', name: 'Coordinate Geometry', description: 'Straight lines, circles, parabola, ellipse, hyperbola and their properties', subtopics: ['Straight Line Equations', 'Gradient and Midpoint', 'Parallel/Perpendicular Lines', 'Circles', 'Parabola', 'Ellipse', 'Hyperbola', 'Tangents and Normals'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'mat-diff', name: 'Differentiation', description: 'Limits, continuity, differentiation rules, chain/product/quotient rules, implicit/parametric differentiation', subtopics: ['Limits and Continuity', 'Differentiation from First Principles', 'Algebraic Functions', 'Trigonometric Functions', 'Chain Rule', 'Product and Quotient Rule', 'Implicit Differentiation', 'Parametric Differentiation', 'Higher Order Derivatives'], difficulty: 'intermediate', estimatedHours: 5 },
    { id: 'mat-diff-apps', name: 'Applications of Differentiation', description: 'Rectilinear motion, tangents/normals, maxima/minima, rate of change, curve sketching, series', subtopics: ['Rectilinear Motion', 'Tangents and Normals', 'Maximum and Minimum', 'Rate of Change', 'Curve Sketching', 'Maclaurin Series', 'Taylor Series'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'mat-exponential', name: 'Exponential Functions', description: 'Graph, limit and derivative of exponential functions', subtopics: ['Graph of Exponential Functions', 'Limit of Exponential Functions', 'Derivative of Exponential Functions', 'The Number e'], difficulty: 'intermediate', estimatedHours: 2 },
    { id: 'mat-logarithm', name: 'Logarithm Functions', description: 'Relationship with exponentials, graph, limit and derivative of logarithmic functions', subtopics: ['Logarithmic and Exponential Relationship', 'Graph of Logarithmic Functions', 'Limits of Logarithmic Functions', 'Derivatives of Logarithmic Functions'], difficulty: 'intermediate', estimatedHours: 2 },
    { id: 'mat-int', name: 'Integration', description: 'Standard integrals, definite integrals, techniques of integration, reduction formula', subtopics: ['Standard Integrals', 'Integration as Inverse Differentiation', 'Definite Integrals', 'Substitution Method', 'Integration by Parts', 'Partial Fractions in Integration', 'Reduction Formula', 'Inverse Trigonometric Integration'], difficulty: 'advanced', estimatedHours: 5 },
    { id: 'mat-int-apps', name: 'Applications of Integration', description: 'Areas, volumes, trapezoidal rule, Simpson\'s rule', subtopics: ['Area Under Curves', 'Volumes of Revolution', 'Trapezoidal Rule', "Simpson's Rule"], difficulty: 'advanced', estimatedHours: 3 },
    { id: 'mat-ode', name: 'Second Order Differential Equations', description: 'Homogeneous second order ODEs with constant coefficients, exponential growth/decay', subtopics: ['Homogeneous Second Order ODEs', 'Constant Coefficients', 'Exponential Growth', 'Exponential Decay'], difficulty: 'advanced', estimatedHours: 3 },
    { id: 'mat-vectors', name: 'Vectors', description: 'Vector algebra, vector equations, vector functions, differentiation/integration of vectors', subtopics: ['Scalar and Vector Quantities', 'Vector Addition/Subtraction', 'Linear Dependence', 'Perpendicularity', 'Vector Equations of Lines/Planes', 'Vectors in 3D', 'Unit Vectors i,j,k', 'Differentiation of Vectors', 'Integration of Vectors'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'mat-kinematics', name: 'Kinematics of Motion in a Straight Line', description: 'Motion in a straight line, rectilinear motion, motion under gravity, motion in a plane', subtopics: ['Position/Speed/Velocity/Acceleration', 'Velocity-Time Graphs', 'Displacement-Time Graphs', 'Uniform Acceleration', 'Motion Under Gravity', 'Rectangular Components', 'Resultant Velocity', 'Relative Velocity'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'mat-mechanics', name: 'Newtonian Mechanics', description: "Energy, work, power, Newton's laws, momentum, connected particles, inclined planes", subtopics: ['Energy and Work', 'Power', 'Force and Motion', 'Momentum', "Newton's Laws of Motion", 'Types of Forces', 'Connected Particles', "Atwood's Machine", 'Inclined Planes'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'mat-forces', name: 'Forces and Equilibrium', description: 'Forces on rigid bodies, parallel forces, couples, moments, friction, centre of gravity', subtopics: ['Forces at Various Points', 'Parallel Forces', 'Couples', 'Moments', 'Friction', 'Smooth Bodies', 'Tension and Thrust', 'Equilibrium on Rough/Inclined Planes', 'Centre of Gravity'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'mat-rigid-body', name: 'Equilibrium of a Rigid Body', description: 'Moment of inertia, radius of gyration, parallel/perpendicular axes theorem, rotating bodies', subtopics: ['Moment of Inertia', 'Radius of Gyration', 'Parallel Axes Theorem', 'Perpendicular Axes Theorem', 'Kinetic Energy of Rotating Bodies'], difficulty: 'advanced', estimatedHours: 3 },
    { id: 'mat-statistics', name: 'Description of a Data Set', description: 'Population/sample, graphical representation, central tendency, dispersion, skewness', subtopics: ['Population and Sample', 'Random Variables', 'Histograms/Bar Charts/Pie Charts', 'Ogive and Frequency Polygon', 'Mean/Median/Mode', 'Mean Deviation/Variance', 'Standard Deviation', 'Skewness and Kurtosis'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'mat-counting', name: 'Mathematics of Counting', description: 'Permutation, combination, fundamental principles of probability', subtopics: ['Permutation', 'Combination', 'Fundamental Probability Principles', 'Discrete/Continuous Random Variables'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'mat-probability', name: 'Random Variables', description: 'Probability distributions, expectation, variance, Bernoulli, Binomial, Poisson', subtopics: ['Probability Density Function', 'Probability Distribution Function', 'Mean and Variance', 'Bernoulli Distribution', 'Binomial Distribution', 'Geometric Distribution', 'Poisson Distribution'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'mat-normal', name: 'Normal Random Variables', description: 'Normal distribution, hypothesis testing, t-distribution, chi-square test', subtopics: ['Standard Normal Table', 'Normal Distribution Model', 'Test of Hypothesis', 'Type I and Type II Errors', 'Student t-Distribution', 'Chi-Square Test', 'Goodness of Fit', 'Contingency Table', 'One Sample Mean Test', 'Difference of Means', 'One Sample Proportion Test'], difficulty: 'advanced', estimatedHours: 5 },
    { id: 'mat-regression', name: 'Regression and Correlation', description: 'Types of correlation, simple linear regression', subtopics: ['Types of Correlation', 'Simple Correlation', 'Simple Linear Regression'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'mat-sampling', name: 'Basic Sampling Techniques', description: 'Types of sampling, finite and infinite sample sizes', subtopics: ['Simple Sampling Techniques', 'Finite Sample Sizes', 'Infinite Sample Sizes'], difficulty: 'intermediate', estimatedHours: 2 },
  ],
};