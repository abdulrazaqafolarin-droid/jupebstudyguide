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
  core: ['physics', 'chemistry'];
  elective: ('biology' | 'math')[];
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

// Comprehensive JUPEB Syllabuses based on official curriculum
export const SYLLABUSES: Record<Subject, SyllabusTopic[]> = {
  physics: [
    { id: 'phy-units', name: 'Physical Quantities and Units', description: 'Fundamental and derived quantities, dimensional analysis', subtopics: ['S.I. Units', 'Dimensional Analysis', 'Error Analysis', 'Significant Figures'], difficulty: 'beginner', estimatedHours: 3 },
    { id: 'phy-vectors', name: 'Vectors', description: 'Vector operations and resolution', subtopics: ['Vector Addition', 'Vector Subtraction', 'Resolution of Vectors', 'Unit Vectors'], difficulty: 'beginner', estimatedHours: 2 },
    { id: 'phy-kinematics', name: 'Kinematics', description: 'Study of motion', subtopics: ['Equations of Motion', 'Free Fall', 'Projectile Motion', 'Relative Motion'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'phy-dynamics', name: 'Dynamics', description: "Newton's Laws and forces", subtopics: ["Newton's Laws", 'Friction', 'Inclined Planes', 'Center of Mass'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'phy-gravity', name: 'Gravitational Field', description: 'Universal gravitation', subtopics: ['Universal Gravitation', 'Field Strength', 'Satellite Motion', 'Orbits'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-work-energy', name: 'Work, Energy and Power', description: 'Energy transformations', subtopics: ['Work', 'Kinetic Energy', 'Potential Energy', 'Power'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-circular', name: 'Circular and Oscillatory Motion', description: 'Angular motion and SHM', subtopics: ['Angular Velocity', 'Centripetal Force', 'Simple Harmonic Motion', 'Resonance'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'phy-fluids', name: 'Fluid Mechanics', description: 'Properties of fluids', subtopics: ['Pressure', "Archimedes' Principle", 'Viscosity', "Bernoulli's Principle"], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-heat', name: 'Temperature and Heat', description: 'Thermal properties', subtopics: ['Temperature Scales', 'Heat Capacity', 'Latent Heat', 'Thermal Expansion'], difficulty: 'beginner', estimatedHours: 3 },
    { id: 'phy-gases', name: 'Ideal Gases', description: 'Gas laws', subtopics: ["Boyle's Law", "Charles' Law", 'Ideal Gas Equation', 'Kinetic Theory'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'phy-waves', name: 'Waves', description: 'Wave properties', subtopics: ['Wave Types', 'Superposition', 'Interference', 'Diffraction'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'phy-optics', name: 'Geometrical Optics', description: 'Reflection and refraction', subtopics: ['Reflection', 'Refraction', 'Lenses', 'Optical Instruments'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'phy-electrostatics', name: 'Electrostatics', description: 'Electric charges and fields', subtopics: ["Coulomb's Law", 'Electric Field', 'Electric Potential', "Gauss's Law"], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'phy-current', name: 'Current Electricity', description: 'Electric circuits', subtopics: ["Ohm's Law", 'Resistance', 'Circuit Analysis', "Kirchhoff's Laws"], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'phy-magnetism', name: 'Magnetic Fields', description: 'Magnetism and induction', subtopics: ['Magnetic Field', 'Electromagnetic Induction', "Faraday's Law", "Lenz's Law"], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'phy-modern', name: 'Modern Physics', description: 'Quantum and nuclear physics', subtopics: ['Photoelectric Effect', 'Atomic Structure', 'Radioactivity', 'Nuclear Reactions'], difficulty: 'advanced', estimatedHours: 4 },
  ],
  chemistry: [
    { id: 'chm-mole', name: 'Mole Concept', description: 'Stoichiometry and calculations', subtopics: ['Atomic Mass', "Avogadro's Number", 'Empirical Formula', 'Stoichiometry'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'chm-atomic', name: 'Atomic Structure', description: 'Electron configuration', subtopics: ['Subatomic Particles', "Bohr's Model", 'Quantum Numbers', 'Electron Configuration'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'chm-periodic', name: 'Periodicity', description: 'Periodic trends', subtopics: ['Periodic Table', 'Atomic Radius', 'Ionization Energy', 'Electronegativity'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'chm-bonding', name: 'Chemical Bonding', description: 'Types of bonds', subtopics: ['Ionic Bonding', 'Covalent Bonding', 'VSEPR Theory', 'Molecular Shapes'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'chm-gases', name: 'Kinetic Theory of Gases', description: 'Gas laws', subtopics: ['Gas Laws', 'Ideal Gas Equation', 'Real Gases', "Van der Waals"], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'chm-thermo', name: 'Thermochemistry', description: 'Energy changes', subtopics: ['Enthalpy', "Hess's Law", 'Bond Energy', 'Born-Haber Cycle'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'chm-kinetics', name: 'Chemical Kinetics', description: 'Reaction rates', subtopics: ['Rate of Reaction', 'Rate Laws', 'Activation Energy', 'Catalysis'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'chm-equilibrium', name: 'Chemical Equilibrium', description: 'Equilibrium concepts', subtopics: ['Equilibrium Constant', "Le Chatelier's Principle", 'pH Calculations'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'chm-electrochem', name: 'Electrochemistry', description: 'Electrolysis and cells', subtopics: ["Faraday's Laws", 'Electrode Potentials', 'Cell EMF', 'Batteries'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'chm-sblock', name: 's-Block Elements', description: 'Group 1 and 2 elements', subtopics: ['Group 1 Properties', 'Group 2 Properties', 'Compounds', 'Uses'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'chm-transition', name: 'Transition Elements', description: 'd-block elements', subtopics: ['d-Block Properties', 'Variable Oxidation States', 'Complex Ions', 'Ligands'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'chm-hydrocarbons', name: 'Hydrocarbons', description: 'Organic compounds', subtopics: ['Alkanes', 'Alkenes', 'Alkynes', 'Benzene'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'chm-functional', name: 'Functional Groups', description: 'Organic functional groups', subtopics: ['Alcohols', 'Aldehydes/Ketones', 'Carboxylic Acids', 'Amines'], difficulty: 'intermediate', estimatedHours: 4 },
  ],
  biology: [
    { id: 'bio-molecules', name: 'Biological Molecules', description: 'Biomolecules structure', subtopics: ['Carbohydrates', 'Lipids', 'Proteins', 'Nucleic Acids'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-cells', name: 'Cell Biology', description: 'Cell structure and division', subtopics: ['Cell Theory', 'Organelles', 'Mitosis', 'Meiosis'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-genetics', name: 'Genetics', description: 'Heredity and inheritance', subtopics: ["Mendel's Laws", 'Punnett Squares', 'Sex Linkage', 'Mutations'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-evolution', name: 'Evolution', description: 'Evolutionary theory', subtopics: ['Natural Selection', "Darwin's Theory", 'Evidence of Evolution', 'Speciation'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'bio-ecology', name: 'Ecology', description: 'Ecosystems and populations', subtopics: ['Ecosystems', 'Food Chains', 'Population Ecology', 'Conservation'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'bio-microbes', name: 'Microbiology', description: 'Microorganisms', subtopics: ['Bacteria', 'Fungi', 'Viruses', 'Protozoa'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-plants', name: 'Plant Biology', description: 'Plant classification', subtopics: ['Algae', 'Bryophytes', 'Pteridophytes', 'Spermatophytes'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-plant-physio', name: 'Plant Physiology', description: 'Plant processes', subtopics: ['Photosynthesis', 'Transpiration', 'Plant Reproduction'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-animals', name: 'Animal Kingdom', description: 'Animal classification', subtopics: ['Invertebrates', 'Vertebrates', 'Mammals'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'bio-physiology', name: 'Animal Physiology', description: 'Body systems', subtopics: ['Digestive System', 'Circulatory System', 'Nervous System', 'Respiratory System'], difficulty: 'intermediate', estimatedHours: 4 },
  ],
  math: [
    { id: 'mat-numbers', name: 'Real Numbers', description: 'Number systems', subtopics: ['Integers', 'Mathematical Induction', 'Sequences and Series', 'Binary Operations'], difficulty: 'beginner', estimatedHours: 3 },
    { id: 'mat-sets', name: 'Set Theory and Mappings', description: 'Sets and functions', subtopics: ['Set Operations', 'Venn Diagrams', 'Functions', 'Inverse Functions'], difficulty: 'beginner', estimatedHours: 3 },
    { id: 'mat-algebra', name: 'Algebra', description: 'Algebraic concepts', subtopics: ['Quadratic Equations', 'Polynomials', 'Partial Fractions', 'Inequalities'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'mat-complex', name: 'Complex Numbers', description: 'Complex number operations', subtopics: ['Argand Diagram', 'Polar Form', "De Moivre's Theorem"], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'mat-trig', name: 'Trigonometry', description: 'Trig functions', subtopics: ['Radians', 'Trig Functions', 'Trig Identities', 'Trig Equations'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'mat-coord', name: 'Coordinate Geometry', description: 'Conic sections', subtopics: ['Straight Lines', 'Circles', 'Parabola', 'Ellipse'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'mat-matrices', name: 'Matrices and Determinants', description: 'Matrix operations', subtopics: ['Matrix Operations', 'Determinants', 'Matrix Inverse', 'System of Equations'], difficulty: 'intermediate', estimatedHours: 3 },
    { id: 'mat-diff', name: 'Differentiation', description: 'Derivatives', subtopics: ['Limits', 'Differentiation Rules', 'Chain Rule', 'Implicit Differentiation'], difficulty: 'intermediate', estimatedHours: 4 },
    { id: 'mat-diff-apps', name: 'Applications of Differentiation', description: 'Using derivatives', subtopics: ['Maxima/Minima', 'Rate of Change', 'Curve Sketching', 'Maclaurin Series'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'mat-int', name: 'Integration', description: 'Integration techniques', subtopics: ['Standard Integrals', 'Substitution', 'Integration by Parts', 'Definite Integrals'], difficulty: 'advanced', estimatedHours: 4 },
    { id: 'mat-int-apps', name: 'Applications of Integration', description: 'Using integrals', subtopics: ['Area Under Curves', 'Volumes of Revolution', "Simpson's Rule"], difficulty: 'advanced', estimatedHours: 3 },
    { id: 'mat-stats', name: 'Statistics and Probability', description: 'Data analysis', subtopics: ['Measures of Central Tendency', 'Probability', 'Distributions', 'Correlation'], difficulty: 'intermediate', estimatedHours: 4 },
  ],
};