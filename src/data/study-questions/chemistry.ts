import type { StudyQuestion } from "@/types/study-questions";

const allQuestions: StudyQuestion[] = [
  // ======================== 2014 ========================
  // --- Objective ---
  {
    id: "chem-2014-obj-1", subject: "chemistry", year: 2014, category: "objective", topic: "Mole Concept", difficulty: "medium",
    question: "What is the mass of 0.25 mol of calcium trioxocarbonate(IV)? (Ca = 40, C = 12, O = 16)",
    options: [
      { label: "A", text: "12.5 g" },
      { label: "B", text: "25.0 g" },
      { label: "C", text: "50.0 g" },
      { label: "D", text: "100.0 g" },
    ],
    correctAnswer: "B",
    explanation: "Molar mass of CaCO3 = 40 + 12 + 48 = 100 g/mol. Mass = 0.25 x 100 = 25.0 g.",
  },
  {
    id: "chem-2014-obj-2", subject: "chemistry", year: 2014, category: "objective", topic: "Atomic Structure", difficulty: "medium",
    question: "How many neutrons are in the nucleus of 238U?",
    options: [
      { label: "A", text: "92" },
      { label: "B", text: "146" },
      { label: "C", text: "238" },
      { label: "D", text: "330" },
    ],
    correctAnswer: "B",
    explanation: "Number of neutrons = mass number - atomic number = 238 - 92 = 146.",
  },
  {
    id: "chem-2014-obj-3", subject: "chemistry", year: 2014, category: "objective", topic: "Periodic Table", difficulty: "easy",
    question: "An element with electronic configuration 1s2 2s2 2p6 3s2 3p5 belongs to which group and period?",
    options: [
      { label: "A", text: "Group 7, Period 3" },
      { label: "B", text: "Group 5, Period 3" },
      { label: "C", text: "Group 7, Period 2" },
      { label: "D", text: "Group 5, Period 2" },
    ],
    correctAnswer: "A",
    explanation: "3s2 3p5 means 7 valence electrons (Group 7) and highest n = 3 (Period 3). The element is chlorine.",
  },
  // --- Theory ---
  {
    id: "chem-2014-theory-1", subject: "chemistry", year: 2014, category: "theory", topic: "Chemical Bonding", difficulty: "medium",
    question: "(a) Distinguish between ionic and covalent bonding, giving one example of each.\n(b) Explain why NaCl has a high melting point while HCl has a low melting point.\n(c) Describe the bonding in a metallic crystal using the electron sea model.",
    answerGuide: "Ionic bonding involves complete transfer of electrons from a metal to a non-metal, forming electrostatic attraction between oppositely charged ions (e.g., NaCl). Covalent bonding involves sharing of electrons between atoms (e.g., H2). NaCl has a high melting point because it forms a giant ionic lattice requiring substantial energy to overcome electrostatic forces. HCl has simple molecular structure with weak intermolecular forces (van der Waals and dipole-dipole). In the electron sea model, metal atoms release valence electrons which form a delocalised sea around positive metal cations, holding the lattice together.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct distinction between ionic and covalent bonding", marks: 3 },
      { point: "Valid example of each type", marks: 2 },
      { point: "Explanation of NaCl high melting point (ionic lattice)", marks: 2 },
      { point: "Explanation of HCl low melting point (simple molecular)", marks: 1 },
      { point: "Accurate description of electron sea model", marks: 2 },
    ],
  },
  {
    id: "chem-2014-theory-2", subject: "chemistry", year: 2014, category: "theory", topic: "Redox", difficulty: "medium",
    question: "(a) Define oxidation and reduction in terms of electron transfer.\n(b) Balance the following redox reaction in acidic medium: Cr2O72- + Fe2+ -> Cr3+ + Fe3+\n(c) What is the oxidation state of chromium in Cr2O72-?",
    answerGuide: "Oxidation is the loss of electrons; reduction is the gain of electrons. Half-reactions: Cr2O72- -> 2Cr3+: each Cr goes from +6 to +3, gain of 3e- each, total 6e- gained. Fe2+ -> Fe3+ + e- (oxidation). Balancing: Cr2O72- + 14H+ + 6e- -> 2Cr3+ + 7H2O and 6Fe2+ -> 6Fe3+ + 6e-. Combined: Cr2O72- + 14H+ + 6Fe2+ -> 2Cr3+ + 7H2O + 6Fe3+. Oxidation state of Cr in Cr2O72-: 2x + 7(-2) = -2, so x = +6.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct definition of oxidation and reduction (electron transfer)", marks: 2 },
      { point: "Identification of oxidation half-reaction", marks: 2 },
      { point: "Identification of reduction half-reaction", marks: 2 },
      { point: "Correctly balanced overall equation", marks: 2 },
      { point: "Correct oxidation state of Cr (+6)", marks: 2 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2014-prac-1", subject: "chemistry", year: 2014, category: "practical", topic: "Volumetric Analysis", difficulty: "hard",
    title: "Determination of the Concentration of Hydrochloric Acid",
    objective: "To determine the concentration of a hydrochloric acid solution by titration against a standard sodium trioxocarbonate(IV) solution.",
    apparatus: ["Burette (50 cm3)", "Pipette (25 cm3)", "Conical flask (250 cm3)", "White tile", "Funnel", "Measuring cylinder", "Volumetric flask (250 cm3)", "Weighing balance", "Beaker", "Stirring rod"],
    procedure: "1. Weigh accurately 2.65 g of anhydrous Na2CO3 and dissolve in distilled water. Transfer to a 250 cm3 volumetric flask and make up to the mark.\n2. Pipette 25.0 cm3 of the Na2CO3 solution into a conical flask.\n3. Add 2-3 drops of methyl orange indicator.\n4. Fill the burette with the HCl solution.\n5. Titrate the Na2CO3 solution against HCl until the colour changes from yellow to pink.\n6. Repeat until concordant titres are obtained.",
    subQuestions: [
      { id: "chem-2014-prac-1a", text: "Calculate the molar concentration of the Na2CO3 standard solution. (Na = 23, C = 12, O = 16)", answerGuide: "Molar mass Na2CO3 = 106 g/mol. Moles = 2.65/106 = 0.025 mol. Concentration = 0.025/0.250 = 0.100 mol/dm3." },
      { id: "chem-2014-prac-1b", text: "If the average titre of HCl is 20.50 cm3, calculate the concentration of HCl.", answerGuide: "Moles Na2CO3 in 25.0 cm3 = 0.100 x 0.025 = 0.0025 mol. Equation: Na2CO3 + 2HCl -> 2NaCl + H2O + CO2. Moles HCl = 2 x 0.0025 = 0.0050 mol. Concentration HCl = 0.0050/0.02050 = 0.244 mol/dm3." },
      { id: "chem-2014-prac-1c", text: "State the function of the methyl orange indicator in this titration.", answerGuide: "Methyl orange changes colour at the equivalence point (pH ~3.1-4.4) of a strong acid-weak base titration, indicating when the reaction is complete." },
    ],
    totalMarks: 15,
  },

  // ======================== 2015 ========================
  // --- Objective ---
  {
    id: "chem-2015-obj-1", subject: "chemistry", year: 2015, category: "objective", topic: "Thermochemistry", difficulty: "medium",
    question: "The enthalpy change when 1 mole of a compound is formed from its elements in their standard states is called:",
    options: [
      { label: "A", text: "Standard enthalpy of atomisation" },
      { label: "B", text: "Standard enthalpy of formation" },
      { label: "C", text: "Standard enthalpy of combustion" },
      { label: "D", text: "Standard enthalpy of neutralisation" },
    ],
    correctAnswer: "B",
    explanation: "Standard enthalpy of formation (Hf) is the heat change when 1 mole of a substance is formed from its elements under standard conditions (298 K, 1 atm).",
  },
  {
    id: "chem-2015-obj-2", subject: "chemistry", year: 2015, category: "objective", topic: "Kinetics", difficulty: "medium",
    question: "For a reaction where the rate = k[A]2[B], what is the overall order of the reaction?",
    options: [
      { label: "A", text: "1" },
      { label: "B", text: "2" },
      { label: "C", text: "3" },
      { label: "D", text: "0" },
    ],
    correctAnswer: "C",
    explanation: "Overall order = sum of exponents = 2 + 1 = 3. The reaction is second order with respect to A and first order with respect to B.",
  },
  {
    id: "chem-2015-obj-3", subject: "chemistry", year: 2015, category: "objective", topic: "Equilibrium", difficulty: "hard",
    question: "For the reaction N2(g) + 3H2(g) <-> 2NH3(g) H = -92 kJ/mol, increasing the temperature will:",
    options: [
      { label: "A", text: "Increase the concentration of NH3" },
      { label: "B", text: "Decrease the concentration of NH3" },
      { label: "C", text: "Have no effect on equilibrium" },
      { label: "D", text: "Increase the rate of forward reaction only" },
    ],
    correctAnswer: "B",
    explanation: "The forward reaction is exothermic (H negative). Increasing temperature favours the endothermic (reverse) reaction, decreasing NH3 concentration (Le Chatelier's principle).",
  },
  // --- Theory ---
  {
    id: "chem-2015-theory-1", subject: "chemistry", year: 2015, category: "theory", topic: "Organic Chemistry", difficulty: "medium",
    question: "(a) Draw the structural formulae of the three isomers of pentane (C5H12).\n(b) Name each isomer.\n(c) Explain why these isomers have different boiling points.",
    answerGuide: "Isomers: (i) CH3CH2CH2CH2CH3 (n-pentane), (ii) CH3CH(CH3)CH2CH3 (2-methylbutane), (iii) C(CH3)4 (2,2-dimethylpropane). Boiling points differ due to molecular shape affecting van der Waals forces: n-pentane has the largest surface area and strongest London forces (bp 36 C). 2-methylbutane is branched with less surface area (bp 28 C). 2,2-dimethylpropane is most compact (bp 10 C). Branching reduces intermolecular contact, weakening dispersion forces.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct structure of n-pentane", marks: 2 },
      { point: "Correct structure of 2-methylbutane", marks: 2 },
      { point: "Correct structure of 2,2-dimethylpropane", marks: 2 },
      { point: "Correct naming of all three isomers", marks: 2 },
      { point: "Explanation relating branching to boiling point via van der Waals forces", marks: 2 },
    ],
  },
  {
    id: "chem-2015-theory-2", subject: "chemistry", year: 2015, category: "theory", topic: "Electrochemistry", difficulty: "hard",
    question: "(a) Define standard electrode potential.\n(b) Given the following standard reduction potentials: Cu2+/Cu = +0.34 V, Zn2+/Zn = -0.76 V, calculate the emf of the Daniel cell.\n(c) Write the cell diagram and the overall reaction.",
    answerGuide: "Standard electrode potential is the potential difference between a metal immersed in a 1 M solution of its ions and the standard hydrogen electrode at 298 K and 1 atm. Ecell = Ecathode - Eanode = 0.34 - (-0.76) = +1.10 V. Cell diagram: Zn(s)|Zn2+(aq)||Cu2+(aq)|Cu(s). Overall: Zn(s) + Cu2+(aq) -> Zn2+(aq) + Cu(s). The positive emf confirms the reaction is spontaneous.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct definition of standard electrode potential", marks: 3 },
      { point: "Correct application of Ecell formula", marks: 2 },
      { point: "Correct calculated emf (1.10 V)", marks: 2 },
      { point: "Correct cell diagram notation", marks: 2 },
      { point: "Correct overall redox equation", marks: 1 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2015-prac-1", subject: "chemistry", year: 2015, category: "practical", topic: "Qualitative Analysis", difficulty: "hard",
    title: "Identification of Unknown Inorganic Salts",
    objective: "To identify two inorganic salts through systematic qualitative analysis.",
    apparatus: ["Test tubes", "Test tube rack", "Bunsen burner", "Spatula", "Glass rod", "pH paper", "Dropping pipettes", "Distilled water bottle"],
    procedure: "You are provided with two inorganic salts labelled X and Y. Perform the following tests:\n1. Observe the colour of each salt.\n2. Test solubility in cold and hot water.\n3. Test the pH of aqueous solutions.\n4. Heat a small sample of each salt and observe any colour change or gas evolved.\n5. Add dilute HCl to each sample and test any gas evolved with limewater.\n6. Perform confirmatory tests for cations (flame test) and anions.",
    subQuestions: [
      { id: "chem-2015-prac-1a", text: "Salt X is white and gives a brick-red flame colour. Its aqueous solution has pH 9. When heated, it evolves a gas that turns limewater milky. Identify salt X and write its formula.", answerGuide: "Brick-red flame indicates Ca2+. Gas turning limewater milky is CO2 from decomposition of carbonate. pH 9 indicates weak base. Salt X is calcium trioxocarbonate(IV), CaCO3." },
      { id: "chem-2015-prac-1b", text: "Salt Y is pale green. Its solution gives a white precipitate with BaCl2 solution that is insoluble in dilute HCl. Identify the anion and the cation in salt Y.", answerGuide: "Pale green colour suggests Fe2+. White precipitate with BaCl2 insoluble in dilute HCl indicates SO42-. Salt Y is iron(II) tetraoxosulphate(VI), FeSO4." },
      { id: "chem-2015-prac-1c", text: "Explain why the white precipitate formed with BaCl2 does not dissolve when dilute HCl is added.", answerGuide: "BaSO4 is insoluble in dilute acids because the sulphate ion forms a highly insoluble lattice with Ba2+. Unlike carbonates or sulphites, sulphates do not react with acids." },
    ],
    totalMarks: 15,
  },

  // ======================== 2016 ========================
  // --- Objective ---
  {
    id: "chem-2016-obj-1", subject: "chemistry", year: 2016, category: "objective", topic: "Chemical Bonding", difficulty: "easy",
    question: "Which type of intermolecular force exists between molecules of hydrogen chloride (HCl)?",
    options: [
      { label: "A", text: "Hydrogen bonding only" },
      { label: "B", text: "London forces only" },
      { label: "C", text: "Dipole-dipole interactions and London forces" },
      { label: "D", text: "Ionic bonding" },
    ],
    correctAnswer: "C",
    explanation: "HCl is a polar molecule with a permanent dipole, so dipole-dipole interactions exist. London dispersion forces also exist in all molecules.",
  },
  {
    id: "chem-2016-obj-2", subject: "chemistry", year: 2016, category: "objective", topic: "Periodic Table", difficulty: "medium",
    question: "Which of the following elements has the highest first ionization energy?",
    options: [
      { label: "A", text: "Na" },
      { label: "B", text: "Al" },
      { label: "C", text: "Mg" },
      { label: "D", text: "Si" },
    ],
    correctAnswer: "C",
    explanation: "Across Period 3, IE generally increases. Mg has higher IE than Na due to higher nuclear charge. Mg has higher IE than Al because Al's 3p electron is easier to remove.",
  },
  {
    id: "chem-2016-obj-3", subject: "chemistry", year: 2016, category: "objective", topic: "Redox", difficulty: "medium",
    question: "In the reaction 2KBr + Cl2 -> 2KCl + Br2, which species is reduced?",
    options: [
      { label: "A", text: "K+" },
      { label: "B", text: "Br-" },
      { label: "C", text: "Cl2" },
      { label: "D", text: "K" },
    ],
    correctAnswer: "C",
    explanation: "Cl2 gains electrons (0 to -1) and is reduced. Br- loses electrons (-1 to 0) and is oxidized. This is a displacement reaction: chlorine is more electronegative than bromine.",
  },
  // --- Theory ---
  {
    id: "chem-2016-theory-1", subject: "chemistry", year: 2016, category: "theory", topic: "Mole Concept", difficulty: "medium",
    question: "(a) Define the mole and state Avogadro's constant.\n(b) Calculate the number of molecules in 4.4 g of CO2. (C = 12, O = 16)\n(c) A compound contains 40.0% carbon, 6.7% hydrogen, and 53.3% oxygen by mass. Determine its empirical formula. If its molar mass is 60 g/mol, find its molecular formula.",
    answerGuide: "A mole is the amount of substance containing the same number of entities as atoms in 12 g of carbon-12. Avogadro's constant = 6.022 x 10^23 mol-1. Molar mass CO2 = 44 g/mol. Moles = 4.4/44 = 0.1 mol. Molecules = 0.1 x 6.022 x 10^23 = 6.022 x 10^22. For empirical formula: C: 40.0/12 = 3.33; H: 6.7/1 = 6.7; O: 53.3/16 = 3.33. Divide by smallest: C = 1, H = 2, O = 1. Empirical formula = CH2O. Empirical mass = 30. n = 60/30 = 2. Molecular formula = C2H4O2.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct definition of mole", marks: 1 },
      { point: "Stating Avogadro's constant", marks: 1 },
      { point: "Correct calculation of molecules in CO2", marks: 2 },
      { point: "Correct calculation of empirical formula", marks: 3 },
      { point: "Correct determination of molecular formula", marks: 3 },
    ],
  },
  {
    id: "chem-2016-theory-2", subject: "chemistry", year: 2016, category: "theory", topic: "Atomic Structure", difficulty: "medium",
    question: "(a) State the four quantum numbers and explain what each represents.\n(b) Write the full electronic configuration for Fe (Z = 26) and Fe3+.\n(c) How many unpaired electrons are in Fe3+?",
    answerGuide: "Principal quantum number (n) - energy level/shell size. Azimuthal quantum number (l) - subshell shape (0 = s, 1 = p, 2 = d, 3 = f). Magnetic quantum number (ml) - orbital orientation. Spin quantum number (ms) - electron spin (+-1/2). Fe: 1s2 2s2 2p6 3s2 3p6 4s2 3d6. Fe3+: 1s2 2s2 2p6 3s2 3p6 3d5. Fe3+ has five unpaired electrons in the 3d subshell (each d orbital occupied by one electron according to Hund's rule).",
    totalMarks: 10,
    markScheme: [
      { point: "Listing all four quantum numbers", marks: 1 },
      { point: "Explaining each quantum number correctly", marks: 3 },
      { point: "Correct electronic configuration of Fe", marks: 2 },
      { point: "Correct electronic configuration of Fe3+", marks: 2 },
      { point: "Correct number of unpaired electrons (5)", marks: 2 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2016-prac-1", subject: "chemistry", year: 2016, category: "practical", topic: "Thermochemistry", difficulty: "hard",
    title: "Determination of the Enthalpy of Neutralisation",
    objective: "To determine the enthalpy change for the neutralisation of hydrochloric acid with sodium hydroxide.",
    apparatus: ["Polystyrene cup calorimeter", "Thermometer (0-50 C, 0.1 C)", "Measuring cylinder (50 cm3)", "Beaker", "Stirrer"],
    procedure: "1. Measure 25.0 cm3 of 1.0 M HCl into the polystyrene cup.\n2. Record the initial temperature of the acid.\n3. Measure 25.0 cm3 of 1.0 M NaOH in a separate beaker and record its temperature.\n4. Quickly add the NaOH to the acid, stir, and record the highest temperature reached.\n5. Repeat the experiment and calculate the mean temperature rise.",
    subQuestions: [
      { id: "chem-2016-prac-1a", text: "The initial temperature of both solutions was 25.0 C and the highest temperature after mixing was 31.5 C. Calculate the heat released. (Assume density = 1.0 g/cm3, specific heat capacity = 4.18 J/g C)", answerGuide: "Total volume = 50 cm3, mass = 50 g. T = 31.5 - 25.0 = 6.5 C. q = mcT = 50 x 4.18 x 6.5 = 1358.5 J = 1.359 kJ." },
      { id: "chem-2016-prac-1b", text: "Calculate the enthalpy of neutralisation per mole of water formed.", answerGuide: "Moles of acid = 0.025 L x 1.0 M = 0.025 mol = moles of water formed. H = -1.359/0.025 = -54.3 kJ/mol. Negative sign indicates exothermic." },
      { id: "chem-2016-prac-1c", text: "Why is a polystyrene cup used instead of a glass beaker? Suggest one source of error and how it can be reduced.", answerGuide: "Polystyrene is a thermal insulator, minimising heat loss to surroundings. Source of error: heat absorbed by the calorimeter. Can be reduced by using a lid, insulating the cup, and calibrating the calorimeter." },
    ],
    totalMarks: 15,
  },

  // ======================== 2017 ========================
  // --- Objective ---
  {
    id: "chem-2017-obj-1", subject: "chemistry", year: 2017, category: "objective", topic: "Organic Chemistry", difficulty: "easy",
    question: "The functional group in an alcohol is:",
    options: [
      { label: "A", text: "-CHO" },
      { label: "B", text: "-OH" },
      { label: "C", text: "-COOH" },
      { label: "D", text: "-NH2" },
    ],
    correctAnswer: "B",
    explanation: "The hydroxyl group (-OH) is the functional group of alcohols (alkanols). -CHO is aldehydes, -COOH is carboxylic acids, -NH2 is amines.",
  },
  {
    id: "chem-2017-obj-2", subject: "chemistry", year: 2017, category: "objective", topic: "Functional Groups", difficulty: "medium",
    question: "Which of the following compounds will give a yellow precipitate with iodine in the presence of sodium hydroxide?",
    options: [
      { label: "A", text: "Methanol" },
      { label: "B", text: "Propanone" },
      { label: "C", text: "Ethanal" },
      { label: "D", text: "Ethanoic acid" },
    ],
    correctAnswer: "B",
    explanation: "Propanone (CH3COCH3) gives a positive iodoform test (yellow precipitate of CHI3) because it has a CH3CO- group.",
  },
  {
    id: "chem-2017-obj-3", subject: "chemistry", year: 2017, category: "objective", topic: "Electrochemistry", difficulty: "medium",
    question: "During electrolysis of aqueous NaCl, the gas evolved at the anode is:",
    options: [
      { label: "A", text: "Hydrogen" },
      { label: "B", text: "Oxygen" },
      { label: "C", text: "Chlorine" },
      { label: "D", text: "Sodium" },
    ],
    correctAnswer: "C",
    explanation: "At the anode, oxidation occurs. Cl- ions are discharged preferentially over OH- because Cl- has a lower discharge potential in concentrated solution. Chlorine gas is evolved.",
  },
  // --- Theory ---
  {
    id: "chem-2017-theory-1", subject: "chemistry", year: 2017, category: "theory", topic: "Kinetics", difficulty: "hard",
    question: "(a) Define activation energy and state the Arrhenius equation.\n(b) A first-order reaction has a rate constant of 2.0 x 10^-3 s^-1 at 300 K and 8.0 x 10^-3 s^-1 at 320 K. Calculate the activation energy. (R = 8.314 J/mol K)\n(c) Explain how a catalyst affects the reaction rate.",
    answerGuide: "Activation energy is the minimum energy required for a reaction to occur. Arrhenius equation: k = Ae^(-Ea/RT). Using ln(k2/k1) = -Ea/R(1/T2 - 1/T1): ln(8.0x10^-3/2.0x10^-3) = -Ea/8.314(1/320 - 1/300). ln(4) = -Ea/8.314(-0.000208). 1.386 = Ea(0.000208/8.314). Ea = 1.386 x 8.314/0.000208 = 55,400 J/mol = 55.4 kJ/mol. A catalyst provides an alternative pathway with lower activation energy, increasing the rate without being consumed.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct definition of activation energy", marks: 1 },
      { point: "Correct statement of Arrhenius equation", marks: 1 },
      { point: "Correct substitution into the two-point form", marks: 2 },
      { point: "Correct calculation of activation energy", marks: 3 },
      { point: "Clear explanation of catalyst effect", marks: 3 },
    ],
  },
  {
    id: "chem-2017-theory-2", subject: "chemistry", year: 2017, category: "theory", topic: "Equilibrium", difficulty: "medium",
    question: "(a) State Le Chatelier's principle.\n(b) For the reaction 2SO2(g) + O2(g) <-> 2SO3(g) H = -196 kJ/mol, predict the effect of: (i) increasing pressure, (ii) increasing temperature, (iii) adding a catalyst on the position of equilibrium.\n(c) Write the equilibrium constant expression (Kc) for the above reaction.",
    answerGuide: "Le Chatelier's principle: If a system at equilibrium is disturbed, the system shifts in a direction that minimises the disturbance. (i) Increasing pressure favours the side with fewer gas moles - forward reaction (3 to 2 moles), so more SO3 is produced. (ii) Increasing temperature favours the endothermic (reverse) reaction, so less SO3 is produced. (iii) A catalyst does not affect the position of equilibrium, only speeds up the rate. Kc = [SO3]^2/([SO2]^2[O2]).",
    totalMarks: 10,
    markScheme: [
      { point: "Correct statement of Le Chatelier's principle", marks: 2 },
      { point: "Correct prediction for pressure increase", marks: 2 },
      { point: "Correct prediction for temperature increase", marks: 2 },
      { point: "Correct explanation of catalyst effect on equilibrium", marks: 2 },
      { point: "Correct equilibrium constant expression", marks: 2 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2017-prac-1", subject: "chemistry", year: 2017, category: "practical", topic: "Volumetric Analysis", difficulty: "hard",
    title: "Determination of the Concentration of Ethanedioc Acid Solution",
    objective: "To determine the concentration of a solution of ethanedioc (oxalic) acid by titration with potassium manganate(VII).",
    apparatus: ["Burette (50 cm3)", "Pipette (25 cm3)", "Conical flask", "Bunsen burner", "Thermometer", "White tile", "Measuring cylinder"],
    procedure: "1. Pipette 25.0 cm3 of oxalic acid solution into a conical flask.\n2. Add 20 cm3 of dilute H2SO4.\n3. Heat the mixture to about 70 C (do not boil).\n4. Fill the burette with 0.02 M KMnO4 solution.\n5. Titrate the hot oxalic acid solution with KMnO4 until a permanent pale pink colour appears.\n6. Record the titre and repeat for concordant results.",
    subQuestions: [
      { id: "chem-2017-prac-1a", text: "Write the balanced redox equation for the reaction between oxalic acid and KMnO4 in acidic medium.", answerGuide: "5H2C2O4 + 2MnO4- + 6H+ -> 2Mn2+ + 10CO2 + 8H2O. MnO4- reduced from +7 to +2, C2O42- oxidised to CO2." },
      { id: "chem-2017-prac-1b", text: "If the average titre is 22.50 cm3, calculate the concentration of oxalic acid in mol/dm3.", answerGuide: "Moles KMnO4 = 0.020 x 0.0225 = 4.5 x 10^-4 mol. From equation: 2 mol MnO4- reacts with 5 mol H2C2O4. Moles H2C2O4 = (5/2) x 4.5 x 10^-4 = 1.125 x 10^-3 mol. Concentration = 1.125 x 10^-3/0.025 = 0.045 mol/dm3." },
      { id: "chem-2017-prac-1c", text: "Why is it necessary to heat the oxalic acid solution and add dilute H2SO4 before titrating with KMnO4?", answerGuide: "Heating increases the reaction rate as the redox reaction between oxalic acid and KMnO4 is slow at room temperature. H2SO4 provides H+ ions required for reduction of MnO4- to Mn2+ in acidic medium." },
    ],
    totalMarks: 15,
  },

  // ======================== 2018 ========================
  // --- Objective ---
  {
    id: "chem-2018-obj-1", subject: "chemistry", year: 2018, category: "objective", topic: "Nuclear Chemistry", difficulty: "medium",
    question: "Which type of radiation has the greatest penetrating power?",
    options: [
      { label: "A", text: "Alpha (alpha)" },
      { label: "B", text: "Beta (beta)" },
      { label: "C", text: "Gamma (gamma)" },
      { label: "D", text: "Positron (beta+)" },
    ],
    correctAnswer: "C",
    explanation: "Gamma rays are highly penetrating electromagnetic radiation, requiring thick lead or concrete to stop them. Alpha particles are stopped by paper; beta by aluminium.",
  },
  {
    id: "chem-2018-obj-2", subject: "chemistry", year: 2018, category: "objective", topic: "Mole Concept", difficulty: "medium",
    question: "How many moles of oxygen atoms are present in 0.50 mol of Al2(SO4)3?",
    options: [
      { label: "A", text: "1.5 mol" },
      { label: "B", text: "2.0 mol" },
      { label: "C", text: "6.0 mol" },
      { label: "D", text: "12.0 mol" },
    ],
    correctAnswer: "C",
    explanation: "1 formula unit of Al2(SO4)3 contains 12 oxygen atoms (3 SO4 x 4 O each = 12 O). 0.50 mol x 12 = 6.0 mol of oxygen atoms.",
  },
  {
    id: "chem-2018-obj-3", subject: "chemistry", year: 2018, category: "objective", topic: "Atomic Structure", difficulty: "medium",
    question: "The wave nature of electrons was experimentally confirmed by:",
    options: [
      { label: "A", text: "Millikan's oil drop experiment" },
      { label: "B", text: "Davisson and Germer's experiment" },
      { label: "C", text: "Rutherford's alpha particle scattering" },
      { label: "D", text: "Thomson's cathode ray tube experiment" },
    ],
    correctAnswer: "B",
    explanation: "Davisson and Germer experimentally confirmed de Broglie's hypothesis of electron wave nature through electron diffraction by a nickel crystal.",
  },
  // --- Theory ---
  {
    id: "chem-2018-theory-1", subject: "chemistry", year: 2018, category: "theory", topic: "Periodic Table", difficulty: "medium",
    question: "(a) Describe the trend in atomic radius across Period 3 (Na to Ar) and explain the trend.\n(b) Explain why the melting point of silicon is higher than that of phosphorus.\n(c) Arrange the following in order of increasing electronegativity: Na, Al, Cl, Si, P.",
    answerGuide: "Atomic radius decreases across Period 3 from Na to Ar because nuclear charge increases while electrons are added to the same principal energy level. Silicon has a giant covalent structure (high melting point). Phosphorus has a simple molecular structure (P4 molecules) held together by weak van der Waals forces (low melting point). Increasing electronegativity: Na < Al < Si < P < Cl.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct description of atomic radius trend across Period 3", marks: 2 },
      { point: "Explanation based on increasing nuclear charge", marks: 2 },
      { point: "Explanation of Si's high melting point (giant covalent)", marks: 2 },
      { point: "Explanation of P's low melting point (simple molecular)", marks: 2 },
      { point: "Correct electronegativity ordering", marks: 2 },
    ],
  },
  {
    id: "chem-2018-theory-2", subject: "chemistry", year: 2018, category: "theory", topic: "Chemical Bonding", difficulty: "hard",
    question: "(a) Use Lewis dot structures to show the bonding in NH3 and describe its molecular geometry using VSEPR theory.\n(b) Explain why NH3 has a bond angle of 107 degrees while CH4 has a bond angle of 109.5 degrees.\n(c) Explain why NH3 is a polar molecule but CCl4 is non-polar.",
    answerGuide: "NH3: N has 5 valence electrons, forms 3 sigma bonds with H atoms, leaving one lone pair. VSEPR: 4 electron pairs (3 bonding, 1 lone pair) gives trigonal pyramidal geometry. The lone pair exerts greater repulsion than bonding pairs, compressing the H-N-H angle to 107 degrees. In CH4, all 4 pairs are bonding, so angle is exactly 109.5 degrees. NH3 is polar because the bond dipoles do not cancel and there is a net dipole. CCl4 is tetrahedral with identical bonds; the bond dipoles cancel exactly.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct Lewis structure of NH3", marks: 2 },
      { point: "Correct geometry identification (trigonal pyramidal)", marks: 2 },
      { point: "Explanation of 107 degree bond angle (lone pair repulsion)", marks: 2 },
      { point: "Explanation of polarity of NH3", marks: 2 },
      { point: "Explanation of non-polarity of CCl4 (dipole cancellation)", marks: 2 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2018-prac-1", subject: "chemistry", year: 2018, category: "practical", topic: "Qualitative Analysis", difficulty: "hard",
    title: "Systematic Qualitative Analysis of Cations and Anions",
    objective: "To identify the components of an unknown mixture using systematic qualitative analysis.",
    apparatus: ["Test tubes", "Centrifuge", "pH indicator paper", "Bunsen burner", "Nichrome wire", "Dilute HCl", "Dilute H2SO4", "BaCl2 solution", "AgNO3 solution", "NH3 solution", "NaOH solution"],
    procedure: "You are given solution Q containing two salts. Perform the following tests:\n1. Observe the colour and pH of solution Q.\n2. Test with NaOH solution and note any precipitate formed.\n3. Test with NH3 solution in excess.\n4. Perform flame test.\n5. To a fresh sample, add BaCl2 solution followed by dilute HCl.\n6. To another sample, add AgNO3 solution followed by dilute HNO3.\n7. Record all observations and draw conclusions.",
    subQuestions: [
      { id: "chem-2018-prac-1a", text: "Solution Q is blue and gives a blue precipitate with NaOH that dissolves in excess NH3 to form a deep blue solution. Identify the cation present.", answerGuide: "Blue colour suggests Cu2+. Cu2+ reacts with NaOH to give blue Cu(OH)2 precipitate. This dissolves in excess NH3 to form the deep blue tetraamminecopper(II) complex, [Cu(NH3)4]2+." },
      { id: "chem-2018-prac-1b", text: "Solution Q gives a white precipitate with BaCl2 that is insoluble in dilute HCl. Identify the anion.", answerGuide: "White precipitate with BaCl2 insoluble in dilute HCl confirms SO42-. BaSO4 is insoluble even in strong acids due to its very low solubility product." },
      { id: "chem-2018-prac-1c", text: "What would you observe if you added AgNO3 solution to a fresh sample of solution Q? Explain.", answerGuide: "No precipitate would form. Cu2+ and SO42- do not form a precipitate with AgNO3. Ag2SO4 is sparingly soluble but would not precipitate significantly at low concentrations." },
    ],
    totalMarks: 15,
  },

  // ======================== 2019 ========================
  // --- Objective ---
  {
    id: "chem-2019-obj-1", subject: "chemistry", year: 2019, category: "objective", topic: "Thermochemistry", difficulty: "medium",
    question: "Given the following bond energies (kJ/mol): C-H = 413, C-C = 347, O=O = 498, C=O = 799, O-H = 467. Estimate the enthalpy change for the combustion of methane: CH4 + 2O2 -> CO2 + 2H2O.",
    options: [
      { label: "A", text: "-808 kJ/mol" },
      { label: "B", text: "-650 kJ/mol" },
      { label: "C", text: "-536 kJ/mol" },
      { label: "D", text: "-120 kJ/mol" },
    ],
    correctAnswer: "A",
    explanation: "Bonds broken: 4(C-H) = 4x413 = 1652, 2(O=O) = 2x498 = 996. Total = 2648 kJ. Bonds formed: 2(C=O) = 2x799 = 1598, 4(O-H) = 4x467 = 1868. Total = 3466 kJ. H = broken - formed = 2648 - 3466 = -818 = -808 kJ/mol.",
  },
  {
    id: "chem-2019-obj-2", subject: "chemistry", year: 2019, category: "objective", topic: "Kinetics", difficulty: "easy",
    question: "The half-life of a first-order reaction is 50 minutes. What is the rate constant?",
    options: [
      { label: "A", text: "0.0139 min-1" },
      { label: "B", text: "0.693 min-1" },
      { label: "C", text: "0.0200 min-1" },
      { label: "D", text: "34.7 min-1" },
    ],
    correctAnswer: "A",
    explanation: "For first-order: t1/2 = ln 2 / k = 0.693/k. k = 0.693/50 = 0.01386 min-1 = 0.0139 min-1.",
  },
  {
    id: "chem-2019-obj-3", subject: "chemistry", year: 2019, category: "objective", topic: "Redox", difficulty: "medium",
    question: "What is the oxidation state of manganese in MnO42-?",
    options: [
      { label: "A", text: "+4" },
      { label: "B", text: "+6" },
      { label: "C", text: "+7" },
      { label: "D", text: "+2" },
    ],
    correctAnswer: "B",
    explanation: "In MnO42-: x + 4(-2) = -2, so x - 8 = -2, x = +6. Note that MnO4- (permanganate) has Mn in +7 state.",
  },
  // --- Theory ---
  {
    id: "chem-2019-theory-1", subject: "chemistry", year: 2019, category: "theory", topic: "Organic Chemistry", difficulty: "medium",
    question: "(a) Describe the test to distinguish between ethanal and propanone.\n(b) Starting from ethanol, outline how you would prepare ethanoic acid.\n(c) What is the product when ethanoic acid reacts with ethanol in the presence of concentrated H2SO4? Write the equation and name the reaction.",
    answerGuide: "Use Tollens' reagent (ammoniacal silver nitrate). Ethanal (aldehyde) reduces Ag+ to form a silver mirror; propanone (ketone) does not react. Alternatively, use Fehling's solution: ethanal gives a brick-red precipitate. Preparation: CH3CH2OH + [O] -> CH3CHO + H2O; then CH3CHO + [O] -> CH3COOH, using acidified K2Cr2O7. Esterification: CH3COOH + CH3CH2OH <-> CH3COOCH2CH3 + H2O in presence of conc. H2SO4. Ethyl ethanoate (ester) is formed. H2SO4 acts as dehydrating agent and catalyst.",
    totalMarks: 10,
    markScheme: [
      { point: "Description of Tollens' test to distinguish aldehyde and ketone", marks: 3 },
      { point: "Correct outline of ethanol to ethanoic acid preparation", marks: 3 },
      { point: "Correct equation for esterification", marks: 2 },
      { point: "Naming the product and reaction type", marks: 2 },
    ],
  },
  {
    id: "chem-2019-theory-2", subject: "chemistry", year: 2019, category: "theory", topic: "Electrochemistry", difficulty: "hard",
    question: "(a) Explain the difference between a galvanic cell and an electrolytic cell.\n(b) In the electrolysis of copper(II) tetraoxosulphate(VI) solution using copper electrodes, describe what happens at each electrode.\n(c) How would the results differ if platinum electrodes were used instead?",
    answerGuide: "Galvanic cells generate electrical energy from spontaneous redox reactions. Electrolytic cells use electrical energy to drive non-spontaneous reactions. With copper electrodes: Cathode: Cu2+ + 2e- -> Cu (copper deposits). Anode: Cu -> Cu2+ + 2e- (copper dissolves). Overall: transfer of copper from anode to cathode; CuSO4 concentration constant. With platinum electrodes: Cathode: Cu2+ + 2e- -> Cu still deposits. Anode: 2H2O -> O2 + 4H+ + 4e-. Oxygen gas evolved, Cu2+ concentration decreases.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct distinction between galvanic and electrolytic cells", marks: 2 },
      { point: "Correct cathode reaction with Cu electrodes", marks: 2 },
      { point: "Correct anode reaction with Cu electrodes", marks: 2 },
      { point: "Correct cathode reaction with Pt electrodes", marks: 2 },
      { point: "Correct anode reaction with Pt electrodes", marks: 2 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2019-prac-1", subject: "chemistry", year: 2019, category: "practical", topic: "Volumetric Analysis", difficulty: "hard",
    title: "Determination of the Concentration of Iron(II) Sulphate Solution",
    objective: "To determine the concentration of iron(II) sulphate solution by titration with potassium manganate(VII).",
    apparatus: ["Burette (50 cm3)", "Pipette (25 cm3)", "Conical flask (250 cm3)", "White tile", "Measuring cylinder", "Thermometer"],
    procedure: "1. Pipette 25.0 cm3 of iron(II) sulphate solution into a conical flask.\n2. Add 20 cm3 of dilute H2SO4.\n3. Fill the burette with 0.02 M KMnO4 solution.\n4. Titrate the iron(II) sulphate solution with KMnO4 until a permanent pink colour appears.\n5. Repeat until concordant results are obtained.\n6. The reaction does not require heating as it is rapid at room temperature.",
    subQuestions: [
      { id: "chem-2019-prac-1a", text: "Write the balanced ionic equation for the reaction.", answerGuide: "5Fe2+ + MnO4- + 8H+ -> 5Fe3+ + Mn2+ + 4H2O. Fe2+ is oxidised to Fe3+, MnO4- is reduced to Mn2+." },
      { id: "chem-2019-prac-1b", text: "If the average titre is 15.60 cm3, calculate the concentration of Fe2+ in mol/dm3.", answerGuide: "Moles KMnO4 = 0.020 x 0.0156 = 3.12 x 10^-4 mol. 1 mol MnO4- reacts with 5 mol Fe2+. Moles Fe2+ = 5 x 3.12 x 10^-4 = 1.56 x 10^-3 mol. [Fe2+] = 1.56 x 10^-3/0.025 = 0.0624 mol/dm3." },
      { id: "chem-2019-prac-1c", text: "Why must H2SO4 be added rather than HCl? What would happen if HCl were used?", answerGuide: "H2SO4 provides H+ ions needed without interfering. If HCl is used, Cl- ions can be oxidised to Cl2 by KMnO4, consuming additional KMnO4 and giving an erroneously high titre." },
    ],
    totalMarks: 15,
  },
  // ======================== 2020 ========================
  // --- Objective ---
  {
    id: "chem-2020-obj-1", subject: "chemistry", year: 2020, category: "objective", topic: "Equilibrium", difficulty: "medium",
    question: "The equilibrium constant Kp for the reaction 2SO2(g) + O2(g) <-> 2SO3(g) is 4.0 at a certain temperature. What is Kp for the reverse reaction?",
    options: [
      { label: "A", text: "-4.0" },
      { label: "B", text: "0.25" },
      { label: "C", text: "4.0" },
      { label: "D", text: "16.0" },
    ],
    correctAnswer: "B",
    explanation: "For the reverse reaction, Kp_rev = 1/Kp_forward = 1/4.0 = 0.25.",
  },
  {
    id: "chem-2020-obj-2", subject: "chemistry", year: 2020, category: "objective", topic: "Nuclear Chemistry", difficulty: "medium",
    question: "In the nuclear equation 238U -> 234Th + X, what particle is X?",
    options: [
      { label: "A", text: "Beta particle" },
      { label: "B", text: "Alpha particle" },
      { label: "C", text: "Gamma ray" },
      { label: "D", text: "Neutron" },
    ],
    correctAnswer: "B",
    explanation: "238U (mass 238, Z=92) -> 234Th (mass 234, Z=90). Mass decreases by 4, atomic number decreases by 2 - alpha (He-4) decay.",
  },
  {
    id: "chem-2020-obj-3", subject: "chemistry", year: 2020, category: "objective", topic: "Chemical Bonding", difficulty: "medium",
    question: "Which of the following molecules has a linear shape?",
    options: [
      { label: "A", text: "H2O" },
      { label: "B", text: "NH3" },
      { label: "C", text: "CO2" },
      { label: "D", text: "SO2" },
    ],
    correctAnswer: "C",
    explanation: "CO2 has 2 double bonds and no lone pairs on central carbon, giving linear geometry with 180 degree bond angle. H2O is bent, NH3 is trigonal pyramidal, SO2 is bent.",
  },
  // --- Theory ---
  {
    id: "chem-2020-theory-1", subject: "chemistry", year: 2020, category: "theory", topic: "Periodic Table", difficulty: "medium",
    question: "(a) Explain what is meant by the term 'diagonal relationship' in the Periodic Table.\n(b) Using beryllium and aluminium as examples, describe three similarities in their chemical properties.\n(c) Explain why elements of the same group have similar chemical properties.",
    answerGuide: "Diagonal relationship refers to similarities between elements in the second and third periods that are diagonally adjacent (e.g., Li-Mg, Be-Al, B-Si). Be and Al similarities: (i) Both form amphoteric oxides (BeO and Al2O3) that react with both acids and bases. (ii) Both form covalent compounds (e.g., BeCl2 and AlCl3 are covalent and hydrolyse in water). (iii) Both hydroxides dissolve in excess NaOH forming beryllates and aluminates. Elements of the same group have the same number of valence electrons, which determines the type and number of chemical bonds they can form.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct definition of diagonal relationship", marks: 2 },
      { point: "First similarity between Be and Al (amphoteric oxides)", marks: 2 },
      { point: "Second similarity (covalent compounds)", marks: 2 },
      { point: "Third similarity (complex formation with NaOH)", marks: 2 },
      { point: "Explanation of group similarity (same valence electrons)", marks: 2 },
    ],
  },
  {
    id: "chem-2020-theory-2", subject: "chemistry", year: 2020, category: "theory", topic: "Kinetics", difficulty: "hard",
    question: "(a) Define and explain the term 'order of reaction'.\n(b) The following data were obtained for the reaction A + B -> C at 298 K:\n[A]/M: 0.10, 0.20, 0.30\n[B]/M: 0.10, 0.10, 0.20\nRate/Ms-1: 2.0x10^-4, 4.0x10^-4, 1.2x10^-3\nDetermine the order of reaction with respect to A and B, and the overall order.\n(c) Write the rate law and calculate the rate constant.",
    answerGuide: "Order of reaction is the sum of exponents to which concentration terms are raised in the rate law. Expt 1 to 2: [A] doubles, [B] constant, rate doubles -> first order in A. Expt 2 and 3: [A] 1.5x, [B] doubles, rate triples. Since first order in A, 1.5x increase in A gives 1.5x rate increase. Remaining factor = 3/1.5 = 2, so first order in B. Overall order = 2. Rate law: rate = k[A][B]. k = rate/([A][B]) = 2.0x10^-4/(0.10x0.10) = 0.020 M-1s-1.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct definition of reaction order", marks: 1 },
      { point: "Correct determination of order in A (first)", marks: 2 },
      { point: "Correct determination of order in B (first)", marks: 2 },
      { point: "Correct overall order (second)", marks: 1 },
      { point: "Correct rate law expression", marks: 1 },
      { point: "Correct calculation of rate constant", marks: 3 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2020-prac-1", subject: "chemistry", year: 2020, category: "practical", topic: "Thermochemistry", difficulty: "hard",
    title: "Determination of the Enthalpy of Solution of Ammonium Chloride",
    objective: "To determine the enthalpy change when ammonium chloride dissolves in water.",
    apparatus: ["Polystyrene cup calorimeter", "Thermometer (-10 to 50 C, 0.1 C)", "Weighing balance", "Measuring cylinder (100 cm3)", "Stirrer", "Spatula"],
    procedure: "1. Measure 50.0 cm3 of distilled water into the calorimeter.\n2. Record the initial temperature at 30-second intervals for 2 minutes.\n3. Weigh accurately about 4.0 g of NH4Cl.\n4. Add the NH4Cl to the water, stir continuously, and record the temperature at 30-second intervals for 5 minutes.\n5. Plot a temperature-time graph to determine the temperature change.\n6. Repeat the experiment to confirm results.",
    subQuestions: [
      { id: "chem-2020-prac-1a", text: "The initial water temperature was 27.5 C and the lowest temperature after adding NH4Cl was 23.0 C. Calculate the heat change. (Specific heat capacity = 4.18 J/g C, density = 1.0 g/cm3)", answerGuide: "Mass of solution = 50 + 4 = 54 g. T = 23.0 - 27.5 = -4.5 C. q = mcT = 54 x 4.18 x (-4.5) = -1015.7 J = -1.016 kJ. Negative = heat absorbed (endothermic)." },
      { id: "chem-2020-prac-1b", text: "Calculate the enthalpy change of solution per mole of NH4Cl. (N = 14, H = 1, Cl = 35.5)", answerGuide: "Molar mass NH4Cl = 53.5 g/mol. Moles = 4.0/53.5 = 0.0748 mol. Hsoln = +1.016/0.0748 = +13.6 kJ/mol (positive = endothermic)." },
      { id: "chem-2020-prac-1c", text: "Why is a temperature-time graph used rather than simply recording the maximum temperature?", answerGuide: "The graph allows correction for heat exchange with surroundings. By extrapolating the cooling curve back to the time of mixing, the true temperature change can be found, avoiding errors from heat loss during the measurement." },
    ],
    totalMarks: 15,
  },

  // ======================== 2021 ========================
  // --- Objective ---
  {
    id: "chem-2021-obj-1", subject: "chemistry", year: 2021, category: "objective", topic: "Organic Chemistry", difficulty: "medium",
    question: "The general formula for alkanoic acids is:",
    options: [
      { label: "A", text: "CnH2n+1OH" },
      { label: "B", text: "CnH2n+1CHO" },
      { label: "C", text: "CnH2n+1COOH" },
      { label: "D", text: "CnH2n+1NH2" },
    ],
    correctAnswer: "C",
    explanation: "Alkanoic acids (carboxylic acids) have general formula CnH2n+1COOH (or CnH2nO2). The -COOH group is the characteristic functional group.",
  },
  {
    id: "chem-2021-obj-2", subject: "chemistry", year: 2021, category: "objective", topic: "Mole Concept", difficulty: "hard",
    question: "The concentration of sodium chloride in a solution is 0.5 mol/dm3. What volume of this solution contains 5.85 g of NaCl? (Na = 23, Cl = 35.5)",
    options: [
      { label: "A", text: "50 cm3" },
      { label: "B", text: "100 cm3" },
      { label: "C", text: "200 cm3" },
      { label: "D", text: "500 cm3" },
    ],
    correctAnswer: "C",
    explanation: "Molar mass NaCl = 58.5 g/mol. Moles = 5.85/58.5 = 0.1 mol. Volume = n/C = 0.1/0.5 = 0.2 dm3 = 200 cm3.",
  },
  {
    id: "chem-2021-obj-3", subject: "chemistry", year: 2021, category: "objective", topic: "Periodic Table", difficulty: "easy",
    question: "Which of the following elements is a d-block element?",
    options: [
      { label: "A", text: "Calcium" },
      { label: "B", text: "Iron" },
      { label: "C", text: "Silicon" },
      { label: "D", text: "Bromine" },
    ],
    correctAnswer: "B",
    explanation: "Iron (Fe) has electron configuration [Ar]3d6 4s2, making it a d-block (transition) element. Ca is s-block, Si is p-block, Br is p-block.",
  },
  // --- Theory ---
  {
    id: "chem-2021-theory-1", subject: "chemistry", year: 2021, category: "theory", topic: "Redox", difficulty: "medium",
    question: "(a) Balance the following redox equation by the ion-electron method in acidic medium: MnO4- + Fe2+ -> Mn2+ + Fe3+\n(b) Identify the oxidising and reducing agents.\n(c) A 0.200 g sample of iron ore was dissolved and treated to give Fe2+. This required 25.0 cm3 of 0.02 M KMnO4 for titration. Calculate the percentage of iron in the ore. (Fe = 55.8)",
    answerGuide: "Half-reactions: Oxidation: Fe2+ -> Fe3+ + e- (x5). Reduction: MnO4- + 8H+ + 5e- -> Mn2+ + 4H2O. Combined: MnO4- + 8H+ + 5Fe2+ -> Mn2+ + 4H2O + 5Fe3+. Oxidising agent: MnO4-. Reducing agent: Fe2+. Moles KMnO4 = 0.020 x 0.025 = 5.0 x 10^-4. Moles Fe2+ = 5 x 5.0 x 10^-4 = 2.5 x 10^-3. Mass Fe = 2.5 x 10^-3 x 55.8 = 0.1395 g. %Fe = (0.1395/0.200) x 100 = 69.75%.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct oxidation half-equation", marks: 2 },
      { point: "Correct reduction half-equation", marks: 2 },
      { point: "Correctly balanced overall equation", marks: 1 },
      { point: "Correct identification of oxidising and reducing agents", marks: 1 },
      { point: "Correct calculation of moles of Fe", marks: 2 },
      { point: "Correct percentage of iron", marks: 2 },
    ],
  },
  {
    id: "chem-2021-theory-2", subject: "chemistry", year: 2021, category: "theory", topic: "Atomic Structure", difficulty: "hard",
    question: "(a) State Heisenberg's uncertainty principle.\n(b) Explain why the uncertainty principle has negligible effect on macroscopic objects but is significant for electrons.\n(c) The uncertainty in the velocity of an electron is 1.0 x 10^5 m/s. Calculate the minimum uncertainty in its position. (Planck's constant h = 6.626 x 10^-34 Js, mass of electron = 9.11 x 10^-31 kg)",
    answerGuide: "Heisenberg's uncertainty principle: It is impossible to simultaneously determine both the position and momentum of a particle with absolute precision. delta_x . delta_p >= h/(4pi). For macroscopic objects, the product is very large relative to h, so uncertainty is negligible. For electrons, mass is tiny, so the uncertainty product is comparable to h. delta_p = m.delta_v = 9.11 x 10^-31 x 1.0 x 10^5 = 9.11 x 10^-26 kg m/s. delta_x >= h/(4pi.delta_p) = 6.626 x 10^-34/(4 x 3.142 x 9.11 x 10^-26) = 5.79 x 10^-10 m.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct statement of Heisenberg's uncertainty principle", marks: 2 },
      { point: "Explanation of negligible effect on macroscopic objects", marks: 2 },
      { point: "Explanation of significance for electrons", marks: 2 },
      { point: "Correct calculation of delta_p", marks: 2 },
      { point: "Correct calculation of delta_x", marks: 2 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2021-prac-1", subject: "chemistry", year: 2021, category: "practical", topic: "Qualitative Analysis", difficulty: "hard",
    title: "Identification of Functional Groups in Organic Compounds",
    objective: "To identify the functional groups present in two unknown organic compounds using chemical tests.",
    apparatus: ["Test tubes", "Test tube rack", "Bunsen burner", "Water bath", "Dropping pipettes", "2,4-dinitrophenylhydrazine (Brady's reagent)", "Fehling's solutions A and B", "Tollens' reagent", "NaHCO3 solution", "Iodine solution", "NaOH solution"],
    procedure: "You are provided with two organic compounds labelled P and Q. Perform the following tests on each:\n1. Test solubility in water and pH using indicator paper.\n2. Add a spatula-tip of NaHCO3 to a sample. Observe for effervescence.\n3. Perform the 2,4-DNPH test (add a few drops of Brady's reagent).\n4. Perform Fehling's test (heat with Fehling's solution in a water bath).\n5. Perform the iodoform test (add I2/NaOH).",
    subQuestions: [
      { id: "chem-2021-prac-1a", text: "Compound P gives effervescence with NaHCO3 and does not react with 2,4-DNPH or Fehling's solution. Identify the functional group present.", answerGuide: "Effervescence with NaHCO3 (CO2 released) indicates a carboxylic acid (-COOH). No reaction with 2,4-DNPH confirms the absence of a carbonyl group." },
      { id: "chem-2021-prac-1b", text: "Compound Q gives a yellow precipitate with 2,4-DNPH, gives a positive Fehling's test (brick-red precipitate), but does not react with NaHCO3. Identify the functional group.", answerGuide: "Positive 2,4-DNPH indicates a carbonyl group. Positive Fehling's test indicates an aldehyde (-CHO). No reaction with NaHCO3 rules out carboxylic acid. Q is an aldehyde." },
      { id: "chem-2021-prac-1c", text: "Which of these compounds, if any, would give a positive iodoform test? Explain.", answerGuide: "Only compounds with CH3CO- or CH3CH(OH)- groups give the iodoform test (yellow CHI3 precipitate). If P is ethanoic acid (CH3COOH), it has CH3CO- and would give a positive iodoform test." },
    ],
    totalMarks: 15,
  },

  // ======================== 2022 ========================
  // --- Objective ---
  {
    id: "chem-2022-obj-1", subject: "chemistry", year: 2022, category: "objective", topic: "Electrochemistry", difficulty: "medium",
    question: "Which of the following is true for the electrolysis of dilute H2SO4 using platinum electrodes?",
    options: [
      { label: "A", text: "Hydrogen is produced at the anode" },
      { label: "B", text: "Oxygen is produced at the cathode" },
      { label: "C", text: "Hydrogen is produced at the cathode" },
      { label: "D", text: "Sulphur is deposited at the cathode" },
    ],
    correctAnswer: "C",
    explanation: "At cathode: 2H+ + 2e- -> H2(g). At anode: 2H2O -> O2(g) + 4H+ + 4e-. Water is electrolysed into H2 and O2.",
  },
  {
    id: "chem-2022-obj-2", subject: "chemistry", year: 2022, category: "objective", topic: "Thermochemistry", difficulty: "medium",
    question: "The enthalpy of combustion of ethanol is -1367 kJ/mol. How much heat is released when 4.6 g of ethanol is burned? (C = 12, H = 1, O = 16)",
    options: [
      { label: "A", text: "-136.7 kJ" },
      { label: "B", text: "-273.4 kJ" },
      { label: "C", text: "-68.4 kJ" },
      { label: "D", text: "-683.5 kJ" },
    ],
    correctAnswer: "A",
    explanation: "Molar mass C2H5OH = 46 g/mol. Moles = 4.6/46 = 0.1 mol. Heat released = 0.1 x (-1367) = -136.7 kJ.",
  },
  {
    id: "chem-2022-obj-3", subject: "chemistry", year: 2022, category: "objective", topic: "Chemical Bonding", difficulty: "medium",
    question: "Which of the following substances does NOT exhibit hydrogen bonding?",
    options: [
      { label: "A", text: "H2O" },
      { label: "B", text: "NH3" },
      { label: "C", text: "HF" },
      { label: "D", text: "H2S" },
    ],
    correctAnswer: "D",
    explanation: "Hydrogen bonding occurs when H is bonded to a small, highly electronegative atom (N, O, or F). S is too large and less electronegative to form significant H-bonds.",
  },
  // --- Theory ---
  {
    id: "chem-2022-theory-1", subject: "chemistry", year: 2022, category: "theory", topic: "Organic Chemistry", difficulty: "medium",
    question: "(a) Write the structural formulae and IUPAC names of all the alkanols with molecular formula C4H9OH.\n(b) Classify each as primary, secondary, or tertiary alcohol.\n(c) Describe the oxidation products when each alcohol is oxidised with acidified K2Cr2O7.",
    answerGuide: "Isomers: (i) CH3CH2CH2CH2OH (butan-1-ol, primary). (ii) CH3CH2CH(OH)CH3 (butan-2-ol, secondary). (iii) (CH3)2CHCH2OH (2-methylpropan-1-ol, primary). (iv) (CH3)3COH (2-methylpropan-2-ol, tertiary). Oxidation: Primary -> aldehydes -> carboxylic acids. Butan-1-ol -> butanal -> butanoic acid. Secondary -> ketones. Butan-2-ol -> butanone. Tertiary alcohols do not oxidise under normal conditions.",
    totalMarks: 10,
    markScheme: [
      { point: "Structure and name of butan-1-ol", marks: 2 },
      { point: "Structure and name of butan-2-ol", marks: 2 },
      { point: "Structure and name of 2-methylpropan-1-ol", marks: 2 },
      { point: "Structure and name of 2-methylpropan-2-ol", marks: 2 },
      { point: "Correct oxidation products classification", marks: 2 },
    ],
  },
  {
    id: "chem-2022-theory-2", subject: "chemistry", year: 2022, category: "theory", topic: "Equilibrium", difficulty: "hard",
    question: "(a) Write the expression for the ionisation constant (Ka) of ethanoic acid (CH3COOH).\n(b) The Ka of ethanoic acid is 1.8 x 10^-5 at 298 K. Calculate the pH of 0.10 M ethanoic acid solution.\n(c) Explain how the pH changes when 0.10 M sodium ethanoate is added to the solution.",
    answerGuide: "Ka = [H+][CH3COO-]/[CH3COOH] = 1.8 x 10^-5. For weak acid: [H+] = sqrt(Ka x [HA]) = sqrt(1.8 x 10^-5 x 0.10) = sqrt(1.8 x 10^-6) = 1.34 x 10^-3 M. pH = -log(1.34 x 10^-3) = 2.87. Adding CH3COONa introduces common ion CH3COO-. Equilibrium shifts left, reducing [H+] and increasing pH. pH = pKa + log([salt]/[acid]) = 4.74 + log(0.10/0.10) = 4.74.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct Ka expression", marks: 2 },
      { point: "Correct calculation of [H+] using approximation", marks: 2 },
      { point: "Correct pH calculation", marks: 2 },
      { point: "Explanation of common ion effect", marks: 2 },
      { point: "Correct use of Henderson-Hasselbalch equation", marks: 2 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2022-prac-1", subject: "chemistry", year: 2022, category: "practical", topic: "Volumetric Analysis", difficulty: "hard",
    title: "Acid-Base Titration: Strong Acid vs Weak Base",
    objective: "To determine the concentration of ammonia solution by titration with standard hydrochloric acid.",
    apparatus: ["Burette (50 cm3)", "Pipette (25 cm3)", "Conical flask (250 cm3)", "White tile", "Funnel", "Measuring cylinder", "Volumetric flask"],
    procedure: "1. You are provided with a standardised 0.10 M HCl solution.\n2. Pipette 25.0 cm3 of the ammonia solution into a conical flask.\n3. Add 2-3 drops of methyl orange indicator (yellow to pink at end point).\n4. Fill the burette with the standard 0.10 M HCl.\n5. Titrate until the colour changes permanently.\n6. Repeat for concordant results.",
    subQuestions: [
      { id: "chem-2022-prac-1a", text: "Write the balanced chemical equation for the reaction.", answerGuide: "HCl + NH3 -> NH4Cl. Alternatively: H+ + NH3 -> NH4+." },
      { id: "chem-2022-prac-1b", text: "The average titre of HCl is 22.80 cm3. Calculate the concentration of ammonia solution in mol/dm3 and in g/dm3. (N = 14, H = 1)", answerGuide: "Moles HCl = 0.100 x 0.02280 = 2.28 x 10^-3 mol = moles NH3. [NH3] = 2.28 x 10^-3/0.025 = 0.0912 mol/dm3. Molar mass NH3 = 17 g/mol. Concentration = 0.0912 x 17 = 1.55 g/dm3." },
      { id: "chem-2022-prac-1c", text: "Why is methyl orange used rather than phenolphthalein as the indicator for this titration? Explain.", answerGuide: "This is a strong acid-weak base titration. The equivalence point lies in the acidic range (pH ~5.3). Methyl orange changes colour between pH 3.1-4.4, which is suitable. Phenolphthalein changes between pH 8.3-10.0 and would give an incorrect end point." },
    ],
    totalMarks: 15,
  },

  // ======================== 2023 ========================
  // --- Objective ---
  {
    id: "chem-2023-obj-1", subject: "chemistry", year: 2023, category: "objective", topic: "Kinetics", difficulty: "medium",
    question: "Which of the following factors does NOT affect the rate of a chemical reaction?",
    options: [
      { label: "A", text: "Temperature" },
      { label: "B", text: "Concentration of reactants" },
      { label: "C", text: "Magnitude of equilibrium constant" },
      { label: "D", text: "Presence of a catalyst" },
    ],
    correctAnswer: "C",
    explanation: "The equilibrium constant indicates the position of equilibrium, not the rate at which equilibrium is reached. Rate depends on temperature, concentration, catalyst, surface area, and nature of reactants.",
  },
  {
    id: "chem-2023-obj-2", subject: "chemistry", year: 2023, category: "objective", topic: "Nuclear Chemistry", difficulty: "medium",
    question: "The half-life of a radioactive isotope is 12 years. How long will it take for 87.5% of the sample to decay?",
    options: [
      { label: "A", text: "24 years" },
      { label: "B", text: "36 years" },
      { label: "C", text: "48 years" },
      { label: "D", text: "12 years" },
    ],
    correctAnswer: "B",
    explanation: "87.5% decay means 12.5% remains. After 1 half-life: 50% remains. After 2: 25%. After 3: 12.5%. Time = 3 x 12 = 36 years.",
  },
  {
    id: "chem-2023-obj-3", subject: "chemistry", year: 2023, category: "objective", topic: "Mole Concept", difficulty: "hard",
    question: "What is the volume of 8.0 g of methane (CH4) at STP? (C = 12, H = 1, molar volume = 22.4 dm3 at STP)",
    options: [
      { label: "A", text: "5.6 dm3" },
      { label: "B", text: "11.2 dm3" },
      { label: "C", text: "22.4 dm3" },
      { label: "D", text: "44.8 dm3" },
    ],
    correctAnswer: "B",
    explanation: "Molar mass CH4 = 16 g/mol. Moles = 8.0/16 = 0.5 mol. Volume at STP = 0.5 x 22.4 = 11.2 dm3.",
  },
  // --- Theory ---
  {
    id: "chem-2023-theory-1", subject: "chemistry", year: 2023, category: "theory", topic: "Periodic Table", difficulty: "medium",
    question: "(a) Explain the variation of ionisation energy across Period 2 (Li to Ne).\n(b) Account for the drop in ionisation energy between Be and B, and between N and O.\n(c) Define electron affinity and explain why electron affinities of noble gases are positive (endothermic).",
    answerGuide: "Ionisation energy generally increases across Period 2 as nuclear charge increases. Between Be (2s2) and B (2s2 2p1): Be has full 2s subshell giving extra stability, while B's 2p electron is easier to remove (higher energy, more shielded). Between N (2p3) and O (2p4): N has half-filled 2p subshell (stable), while O has pairing repulsion. Electron affinity is the energy change when an electron is added to a gaseous atom. Noble gases have full valence shells, so adding an electron requires energy (overcomes repulsion), giving positive electron affinity.",
    totalMarks: 10,
    markScheme: [
      { point: "Overall increasing IE trend across Period 2", marks: 2 },
      { point: "Explanation of Be-B drop (2s2 stability vs 2p1)", marks: 2 },
      { point: "Explanation of N-O drop (half-filled p3 stability)", marks: 2 },
      { point: "Definition of electron affinity", marks: 2 },
      { point: "Explanation of positive EA of noble gases", marks: 2 },
    ],
  },
  {
    id: "chem-2023-theory-2", subject: "chemistry", year: 2023, category: "theory", topic: "Electrochemistry", difficulty: "hard",
    question: "(a) State Faraday's laws of electrolysis.\n(b) A current of 3.0 A is passed through a solution of CuSO4 for 45 minutes. Calculate the mass of copper deposited at the cathode. (Cu = 63.5, F = 96500 C/mol)\n(c) How many moles of electrons are transferred in the process?",
    answerGuide: "First law: Mass deposited is directly proportional to quantity of electricity passed (m proportional to Q). Second law: Masses deposited by the same quantity of electricity are proportional to their chemical equivalents. Q = I x t = 3.0 x (45 x 60) = 8100 C. Moles of electrons = 8100/96500 = 0.0839 mol. Cu2+ + 2e- -> Cu, so 2 mol e- deposit 1 mol Cu. Moles Cu = 0.0839/2 = 0.0420 mol. Mass Cu = 0.0420 x 63.5 = 2.67 g.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct statement of Faraday's first law", marks: 2 },
      { point: "Correct statement of Faraday's second law", marks: 2 },
      { point: "Correct calculation of Q (charge passed)", marks: 2 },
      { point: "Correct calculation of moles of copper", marks: 2 },
      { point: "Correct mass of copper deposited", marks: 2 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2023-prac-1", subject: "chemistry", year: 2023, category: "practical", topic: "Reaction Kinetics", difficulty: "hard",
    title: "Effect of Concentration on Reaction Rate",
    objective: "To investigate how changing the concentration of reactants affects the rate of the reaction between sodium thiosulphate and hydrochloric acid.",
    apparatus: ["Conical flask (100 cm3)", "Measuring cylinders (10 cm3, 50 cm3)", "Stopwatch", "White tile with cross mark", "Thermometer", "Beakers"],
    procedure: "1. Measure 50 cm3 of 0.15 M Na2S2O3 solution into a conical flask.\n2. Place the flask on a white tile with a cross marked on it.\n3. Add 5 cm3 of 1.0 M HCl and start the stopwatch immediately.\n4. Time how long it takes for the cross to become invisible due to sulphur precipitate.\n5. Repeat with different Na2S2O3 concentrations (0.12 M, 0.10 M, 0.08 M, 0.06 M) by diluting with water while keeping total volume constant.\n6. Record all times and calculate 1/time as measure of rate.",
    subQuestions: [
      { id: "chem-2023-prac-1a", text: "Write the balanced chemical equation for the reaction.", answerGuide: "Na2S2O3 + 2HCl -> 2NaCl + SO2 + S + H2O. The sulphur precipitate causes the solution to become cloudy." },
      { id: "chem-2023-prac-1b", text: "If the times recorded for 0.15 M and 0.10 M Na2S2O3 were 25 s and 37 s respectively, calculate the ratio of the initial rates. What does this suggest about the order?",
        answerGuide: "Rate proportional to 1/time. Rate1/Rate2 = t2/t1 = 37/25 = 1.48. Concentration ratio = 0.15/0.10 = 1.5. Since rate ratio approx = concentration ratio, the reaction is approximately first order with respect to Na2S2O3." },
      { id: "chem-2023-prac-1c", text: "Explain why the cross becomes invisible. What assumption is made about the endpoint timing?", answerGuide: "The sulphur precipitate scatters light, making the solution increasingly opaque. Assumption: The same amount of sulphur (same endpoint) is formed each time, so 1/time is proportional to initial rate." },
    ],
    totalMarks: 15,
  },

  // ======================== 2024 ========================
  // --- Objective ---
  {
    id: "chem-2024-obj-1", subject: "chemistry", year: 2024, category: "objective", topic: "Redox", difficulty: "easy",
    question: "What is the change in oxidation state of carbon in the reaction C + O2 -> CO2?",
    options: [
      { label: "A", text: "0 to +2" },
      { label: "B", text: "0 to +4" },
      { label: "C", text: "-4 to +4" },
      { label: "D", text: "0 to -4" },
    ],
    correctAnswer: "B",
    explanation: "Carbon starts at oxidation state 0 (elemental form) and ends at +4 in CO2 (O is -2, so C = +4 to balance).",
  },
  {
    id: "chem-2024-obj-2", subject: "chemistry", year: 2024, category: "objective", topic: "Organic Chemistry", difficulty: "medium",
    question: "The addition polymerisation of ethene produces:",
    options: [
      { label: "A", text: "Poly(chloroethene)" },
      { label: "B", text: "Poly(ethene)" },
      { label: "C", text: "Poly(tetrafluoroethene)" },
      { label: "D", text: "Poly(propene)" },
    ],
    correctAnswer: "B",
    explanation: "Ethene (CH2=CH2) undergoes addition polymerisation to form poly(ethene), also known as polyethylene: nCH2=CH2 -> -(CH2-CH2)n-.",
  },
  {
    id: "chem-2024-obj-3", subject: "chemistry", year: 2024, category: "objective", topic: "Atomic Structure", difficulty: "medium",
    question: "Which of the following sets of quantum numbers is NOT allowed?",
    options: [
      { label: "A", text: "n=2, l=1, ml=0, ms=+1/2" },
      { label: "B", text: "n=3, l=2, ml=-2, ms=-1/2" },
      { label: "C", text: "n=2, l=2, ml=0, ms=+1/2" },
      { label: "D", text: "n=4, l=0, ml=0, ms=-1/2" },
    ],
    correctAnswer: "C",
    explanation: "For n=2, l can only be 0 or 1. l=2 is invalid because l must be <= n-1. The d subshell (l=2) first appears at n=3.",
  },
  // --- Theory ---
  {
    id: "chem-2024-theory-1", subject: "chemistry", year: 2024, category: "theory", topic: "Thermochemistry", difficulty: "medium",
    question: "(a) State Hess's law of constant heat summation.\n(b) Given the following data:\nC(s) + O2(g) -> CO2(g) H = -393.5 kJ/mol\nH2(g) + 1/2O2(g) -> H2O(l) H = -285.8 kJ/mol\nCH3COOH(l) + 2O2(g) -> 2CO2(g) + 2H2O(l) H = -874.5 kJ/mol\nCalculate the enthalpy of formation of ethanoic acid.\n(c) Explain the importance of Hess's law in thermochemistry.",
    answerGuide: "Hess's law: The enthalpy change for a reaction is independent of the pathway taken, depending only on the initial and final states. Required: 2C(s) + 2H2(g) + O2(g) -> CH3COOH(l). Reverse (3): 2CO2 + 2H2O -> CH3COOH + 2O2 H = +874.5. (1)x2: 2C + 2O2 -> 2CO2 H = -787.0. (2)x2: 2H2 + O2 -> 2H2O H = -571.6. Sum: 2C + 2H2 + O2 -> CH3COOH. Hf = +874.5 - 787.0 - 571.6 = -484.1 kJ/mol. Hess's law is important because some reactions cannot be measured directly in a calorimeter.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct statement of Hess's law", marks: 2 },
      { point: "Setting up the thermochemical cycle correctly", marks: 3 },
      { point: "Correct calculation of Hf", marks: 3 },
      { point: "Explanation of importance of Hess's law", marks: 2 },
    ],
  },
  {
    id: "chem-2024-theory-2", subject: "chemistry", year: 2024, category: "theory", topic: "Chemical Bonding", difficulty: "medium",
    question: "(a) Explain the difference between sigma and pi bonds.\n(b) Describe the bonding in the ethene molecule (C2H4), including the hybridisation of carbon atoms.\n(c) Explain why the C=C double bond is shorter and stronger than a C-C single bond but more reactive.",
    answerGuide: "Sigma bonds are formed by end-on overlap of orbitals along the internuclear axis. Pi bonds are formed by lateral/sideways overlap of p orbitals above and below the bond axis. In ethene: each C is sp2 hybridised. Three sigma bonds per C: two C-H and one C-C. The remaining unhybridised p orbital on each C overlaps sideways to form a pi bond. The double bond is shorter and stronger than a single bond due to the extra pi bond. However, the pi bond is weaker than the sigma bond and more exposed, making it susceptible to electrophilic attack.",
    totalMarks: 10,
    markScheme: [
      { point: "Clear distinction between sigma and pi bonds", marks: 2 },
      { point: "Correct hybridisation of C in ethene (sp2)", marks: 2 },
      { point: "Description of sigma bonding in ethene", marks: 2 },
      { point: "Description of pi bonding in ethene", marks: 2 },
      { point: "Explanation of shorter/stronger but more reactive double bond", marks: 2 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2024-prac-1", subject: "chemistry", year: 2024, category: "practical", topic: "Organic Chemistry", difficulty: "hard",
    title: "Identification of an Unknown Organic Compound",
    objective: "To identify an unknown organic compound through a series of chemical tests and physical property measurements.",
    apparatus: ["Test tubes", "Boiling tubes", "Water bath", "Bunsen burner", "Melting point apparatus", "Thermometer", "2,4-DNPH reagent", "Fehling's solutions", "Tollens' reagent", "NaOH solution", "I2/KI solution", "KMnO4 solution"],
    procedure: "You are given an organic compound R. Perform the following tests:\n1. Determine the melting point.\n2. Test solubility in water, dilute HCl, and dilute NaOH.\n3. Perform the 2,4-DNPH test.\n4. Perform Fehling's test (with heat).\n5. Perform Tollens' test.\n6. Test with KMnO4 solution.\n7. Perform the iodoform test.\n8. Determine if it reacts with NaHCO3.",
    subQuestions: [
      { id: "chem-2024-prac-1a", text: "Compound R is insoluble in water but soluble in dilute NaOH. It does not react with 2,4-DNPH or NaHCO3. The melting point is 122 C. Identify the class of compound.", answerGuide: "Soluble in NaOH (acidic) but not in NaHCO3 suggests a phenol. No 2,4-DNPH reaction confirms absence of carbonyl group. Phenols are more acidic than alcohols but weaker than carboxylic acids." },
      { id: "chem-2024-prac-1b", text: "Compound S is soluble in water, gives a positive 2,4-DNPH test, positive Fehling's test, and positive Tollens' test. Identify the functional group and give the structural formula of the simplest compound of this class.", answerGuide: "Positive 2,4-DNPH confirms C=O. Positive Fehling's and Tollens' tests indicate a reducing carbonyl, specifically an aldehyde (-CHO). Simplest: HCHO (methanal) or CH3CHO (ethanal)." },
      { id: "chem-2024-prac-1c", text: "Explain why a phenol is more acidic than an alcohol but less acidic than a carboxylic acid.", answerGuide: "Phenols are more acidic than alcohols because the phenoxide ion is stabilised by resonance delocalisation into the aromatic ring. Alcohols lack this resonance. Phenols are less acidic than carboxylic acids because the carboxylate ion has greater resonance stabilisation with two equivalent structures distributing charge over two oxygen atoms." },
    ],
    totalMarks: 15,
  },

  // ======================== 2025 ========================
  // --- Objective ---
  {
    id: "chem-2025-obj-1", subject: "chemistry", year: 2025, category: "objective", topic: "Equilibrium", difficulty: "medium",
    question: "For which of the following reactions does Kp = Kc?",
    options: [
      { label: "A", text: "2SO2(g) + O2(g) <-> 2SO3(g)" },
      { label: "B", text: "N2(g) + 3H2(g) <-> 2NH3(g)" },
      { label: "C", text: "H2(g) + I2(g) <-> 2HI(g)" },
      { label: "D", text: "2NO2(g) <-> N2O4(g)" },
    ],
    correctAnswer: "C",
    explanation: "Kp = Kc(RT)^(delta_n). For H2 + I2 <-> 2HI, delta_n = 2 - (1+1) = 0, so (RT)^0 = 1, thus Kp = Kc.",
  },
  {
    id: "chem-2025-obj-2", subject: "chemistry", year: 2025, category: "objective", topic: "Electrochemistry", difficulty: "medium",
    question: "Which of the following statements about a standard hydrogen electrode (SHE) is TRUE?",
    options: [
      { label: "A", text: "It has a potential of +0.34 V" },
      { label: "B", text: "It is assigned a potential of 0.00 V" },
      { label: "C", text: "It uses 2 M HCl at 25 C" },
      { label: "D", text: "It uses zinc metal as the electrode" },
    ],
    correctAnswer: "B",
    explanation: "The SHE is the reference electrode assigned a potential of exactly 0.00 V. It uses 1 M H+ at 298 K, 1 atm H2 gas, and a platinum electrode.",
  },
  {
    id: "chem-2025-obj-3", subject: "chemistry", year: 2025, category: "objective", topic: "Mole Concept", difficulty: "hard",
    question: "2.0 g of a hydrocarbon on complete combustion gave 5.87 g of CO2 and 3.60 g of H2O. What is the empirical formula of the hydrocarbon?",
    options: [
      { label: "A", text: "CH" },
      { label: "B", text: "CH2" },
      { label: "C", text: "CH3" },
      { label: "D", text: "C2H5" },
    ],
    correctAnswer: "C",
    explanation: "nCO2 = 5.87/44 = 0.1334 mol, so nC = 0.1334 mol. nH2O = 3.60/18 = 0.200 mol, so nH = 0.400 mol. Ratio C:H = 0.1334:0.400 = 1:3. Empirical formula = CH3 (e.g., C2H6, ethane).",
  },
  // --- Theory ---
  {
    id: "chem-2025-theory-1", subject: "chemistry", year: 2025, category: "theory", topic: "Kinetics", difficulty: "hard",
    question: "(a) Distinguish between the rate of reaction and the rate constant.\n(b) A first-order reaction has a half-life of 40 minutes. Calculate: (i) the rate constant, (ii) the time required for 90% of the reactant to decompose.\n(c) Explain the collision theory of reaction rates.",
    answerGuide: "Rate of reaction is the change in concentration per unit time, which depends on concentration. The rate constant (k) is the proportionality constant in the rate law, independent of concentration but dependent on temperature. (i) k = 0.693/t1/2 = 0.693/40 = 0.01733 min-1. (ii) For 90% decomposition, 10% remains. ln([A]0/[A]) = kt. ln(1/0.10) = 0.01733t. t = ln(10)/0.01733 = 2.303/0.01733 = 132.9 min. Collision theory: Particles must collide with sufficient energy (>= Ea) and correct orientation for reaction to occur.",
    totalMarks: 10,
    markScheme: [
      { point: "Correct distinction between rate and rate constant", marks: 2 },
      { point: "Correct calculation of rate constant", marks: 2 },
      { point: "Correct calculation of time for 90% decomposition", marks: 3 },
      { point: "Clear explanation of collision theory (energy + orientation)", marks: 3 },
    ],
  },
  {
    id: "chem-2025-theory-2", subject: "chemistry", year: 2025, category: "theory", topic: "Organic Chemistry", difficulty: "medium",
    question: "(a) Draw and name the structural isomers of C4H8 (alkenes only).\n(b) Explain the terms cis-trans isomerism using but-2-ene as an example.\n(c) Describe the test to distinguish between but-1-ene and but-1-yne.",
    answerGuide: "Alkene isomers of C4H8: (i) CH2=CHCH2CH3 (but-1-ene), (ii) CH3CH=CHCH3 (but-2-ene, cis and trans forms), (iii) CH2=C(CH3)2 (2-methylpropene). Cis-trans isomerism occurs when each carbon of the double bond has two different substituents. Cis-but-2-ene: both CH3 groups on same side. Trans-but-2-ene: CH3 groups on opposite sides. To distinguish but-1-ene from but-1-yne: add ammoniacal Cu2Cl2 solution. But-1-yne (terminal alkyne) gives a red precipitate of copper acetylide. But-1-ene does not react.",
    totalMarks: 10,
    markScheme: [
      { point: "Structure and name of but-1-ene", marks: 2 },
      { point: "Structure and name of but-2-ene (cis/trans)", marks: 2 },
      { point: "Structure and name of 2-methylpropene", marks: 2 },
      { point: "Explanation of cis-trans isomerism with but-2-ene", marks: 2 },
      { point: "Test to distinguish alkene from alkyne", marks: 2 },
    ],
  },
  // --- Practical ---
  {
    id: "chem-2025-prac-1", subject: "chemistry", year: 2025, category: "practical", topic: "Volumetric Analysis", difficulty: "hard",
    title: "Determination of the Concentration of Hydrogen Peroxide",
    objective: "To determine the concentration of hydrogen peroxide solution by titration with potassium manganate(VII).",
    apparatus: ["Burette (50 cm3)", "Pipette (25 cm3)", "Conical flask (250 cm3)", "Measuring cylinder", "White tile", "Thermometer"],
    procedure: "1. Pipette 25.0 cm3 of hydrogen peroxide solution into a conical flask.\n2. Add 20 cm3 of dilute H2SO4.\n3. Fill the burette with 0.02 M KMnO4 solution.\n4. Titrate the H2O2 solution with KMnO4 until a permanent pale pink colour appears.\n5. Record the titre and repeat for concordant results.\n6. The reaction is rapid at room temperature and does not require heating.",
    subQuestions: [
      { id: "chem-2025-prac-1a", text: "Write the balanced redox equation for the reaction between H2O2 and KMnO4 in acidic medium.", answerGuide: "2MnO4- + 5H2O2 + 6H+ -> 2Mn2+ + 5O2 + 8H2O. H2O2 is oxidised to O2 (O goes from -1 to 0), MnO4- reduced to Mn2+." },
      { id: "chem-2025-prac-1b", text: "If the average titre is 18.75 cm3, calculate the concentration of H2O2 in mol/dm3.", answerGuide: "Moles KMnO4 = 0.020 x 0.01875 = 3.75 x 10^-4 mol. From equation: 2 mol MnO4- reacts with 5 mol H2O2. Moles H2O2 = (5/2) x 3.75 x 10^-4 = 9.375 x 10^-4 mol. [H2O2] = 9.375 x 10^-4/0.025 = 0.0375 mol/dm3." },
      { id: "chem-2025-prac-1c", text: "Explain why hydrogen peroxide behaves as both an oxidising agent and a reducing agent, using relevant half-equations.", answerGuide: "H2O2 can be reduced: H2O2 + 2H+ + 2e- -> 2H2O (acts as oxidising agent). H2O2 can be oxidised: H2O2 -> O2 + 2H+ + 2e- (acts as reducing agent). In this reaction with MnO4-, H2O2 acts as a reducing agent." },
    ],
    totalMarks: 15,
  },
];

export function getChemistryQuestions(year: number): { objective: StudyQuestion[]; theory: StudyQuestion[]; practical: StudyQuestion[] } {
  const objective = allQuestions.filter(
    (q) => q.year === year && q.category === "objective"
  );
  const theory = allQuestions.filter(
    (q) => q.year === year && q.category === "theory"
  );
  const practical = allQuestions.filter(
    (q) => q.year === year && q.category === "practical"
  );
  return { objective, theory, practical };
}
