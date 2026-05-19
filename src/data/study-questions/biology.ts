import type { StudyQuestion } from "@/types/study-questions";

function q(
  id: string,
  year: number,
  category: "objective" | "theory" | "practical",
  overrides: Partial<StudyQuestion>,
): StudyQuestion {
  return {
    id,
    subject: "biology",
    year,
    category,
    ...overrides,
  } as StudyQuestion;
}

function obj(
  id: string,
  year: number,
  question: string,
  options: { label: string; text: string }[],
  correctAnswer: string,
  explanation: string,
  difficulty: "easy" | "medium" | "hard",
  topic?: string,
): StudyQuestion {
  return q(id, year, "objective", {
    question,
    options,
    correctAnswer,
    explanation,
    difficulty,
    topic,
  });
}

function theory(
  id: string,
  year: number,
  question: string,
  answerGuide: string,
  markScheme: { point: string; marks: number }[],
  topic?: string,
): StudyQuestion {
  return q(id, year, "theory", {
    question,
    answerGuide,
    markScheme,
    totalMarks: 10,
    topic,
  });
}

function practical(
  id: string,
  year: number,
  title: string,
  objective: string,
  apparatus: string[],
  procedure: string,
  subQuestions: { id: string; text: string; answerGuide: string }[],
  topic?: string,
): StudyQuestion {
  return q(id, year, "practical", {
    question: title,
    title,
    objective,
    apparatus,
    procedure,
    subQuestions,
    totalMarks: 15,
    topic,
  });
}

const biologyData: Record<number, { objective: StudyQuestion[]; theory: StudyQuestion[]; practical: StudyQuestion[] }> = {
  2014: {
    objective: [
      obj(
        "bio-2014-obj-1", 2014,
        "Which organelle is responsible for the modification, sorting, and packaging of proteins for secretion?",
        [
          { label: "A", text: "Rough endoplasmic reticulum" },
          { label: "B", text: "Golgi apparatus" },
          { label: "C", text: "Lysosome" },
          { label: "D", text: "Peroxisome" },
        ],
        "B",
        "The Golgi apparatus receives proteins from the RER, modifies them (e.g., glycosylation), sorts them, and packages them into vesicles for transport to their final destinations.",
        "medium",
        "Cell Biology",
      ),
      obj(
        "bio-2014-obj-2", 2014,
        "In a dihybrid cross involving two heterozygous parents (AaBb × AaBb), what is the probability of obtaining offspring that are homozygous recessive for both traits?",
        [
          { label: "A", text: "1/4" },
          { label: "B", text: "1/8" },
          { label: "C", text: "1/16" },
          { label: "D", text: "1/2" },
        ],
        "C",
        "For each gene, the probability of homozygous recessive (aa) is 1/4. Since the genes assort independently, multiply: 1/4 × 1/4 = 1/16. This follows Mendel's law of independent assortment.",
        "medium",
        "Genetics",
      ),
      obj(
        "bio-2014-obj-3", 2014,
        "Which of the following best describes the role of decomposers in an ecosystem?",
        [
          { label: "A", text: "They convert light energy into chemical energy" },
          { label: "B", text: "They consume living organisms for energy" },
          { label: "C", text: "They break down dead organic matter and recycle nutrients" },
          { label: "D", text: "They fix atmospheric nitrogen into ammonia" },
        ],
        "C",
        "Decomposers (bacteria, fungi) break down dead organisms and waste, releasing inorganic nutrients back into the ecosystem. This nutrient cycling is essential for ecosystem sustainability.",
        "easy",
        "Ecology",
      ),
    ],
    theory: [
      theory(
        "bio-2014-theory-1", 2014,
        "Describe the structure of a typical cell membrane according to the fluid mosaic model. Explain how the arrangement of phospholipids, proteins, and cholesterol contributes to membrane function.",
        "The fluid mosaic model describes the cell membrane as a dynamic structure. The phospholipid bilayer forms the basic framework with hydrophilic heads facing outward and hydrophobic tails inward. Integral proteins span the bilayer, serving as channels, carriers, or receptors. Peripheral proteins associate with one surface. Cholesterol molecules intersperse among phospholipids, modulating fluidity. Glycoproteins and glycolipids on the external surface participate in cell recognition. The fluid nature allows lateral movement of components, enabling membrane fusion, endocytosis, and signal transduction. This arrangement supports selective permeability, cell signaling, and structural integrity.",
        [
          { point: "Correct description of phospholipid bilayer orientation (hydrophilic heads outward, hydrophobic tails inward)", marks: 2 },
          { point: "Explanation of integral and peripheral membrane proteins and their functions", marks: 2 },
          { point: "Role of cholesterol in modulating membrane fluidity and stability", marks: 2 },
          { point: "Description of glycoproteins/glycolipids in cell recognition", marks: 2 },
          { point: "Explanation of fluid nature and its functional significance (lateral movement, membrane fusion)", marks: 2 },
        ],
        "Cell Biology",
      ),
      theory(
        "bio-2014-theory-2", 2014,
        "Explain the process of glycolysis, including the phosphorylation steps, splitting of hexose sugar, and ATP yield. Where does it occur within the cell?",
        "Glycolysis occurs in the cytoplasm and begins with glucose (6C) being phosphorylated twice using 2 ATP to form fructose-1,6-bisphosphate. This hexose is then split into two triose phosphates (glyceraldehyde-3-phosphate). Each triose phosphate is oxidized, with NAD+ accepting hydrogen to form NADH. Substrate-level phosphorylation generates 4 ATP (2 per triose phosphate). The final product is pyruvate (3C). Net gain: 2 ATP and 2 NADH per glucose. Glycolysis does not require oxygen and is the first stage of both aerobic and anaerobic respiration.",
        [
          { point: "Location: cytoplasm/cytosol", marks: 1 },
          { point: "Phosphorylation: 2 ATP used to phosphorylate glucose to hexose bisphosphate", marks: 2 },
          { point: "Splitting: hexose bisphosphate splits into two triose phosphates", marks: 2 },
          { point: "Oxidation and ATP generation: NAD+ reduced to NADH, 4 ATP produced via substrate-level phosphorylation", marks: 3 },
          { point: "Net yield: 2 ATP, 2 NADH, 2 pyruvate per glucose", marks: 2 },
        ],
        "Biochemistry",
      ),
    ],
    practical: [
      practical(
        "bio-2014-prac-1", 2014,
        "Microscopic Examination of Onion Epidermal Cells",
        "To observe and draw the cellular structure of onion epidermal cells under the light microscope, identifying the cell wall, nucleus, and cytoplasm.",
        ["Light microscope", "Glass slide and coverslip", "Onion bulb", "Scalpel or forceps", "Iodine solution (or methylene blue)", "Distilled water", "Filter paper", "Mounting needle"],
        "Peel a thin layer of epidermis from the inner surface of an onion scale leaf using forceps. Place the epidermal layer flat on a clean glass slide. Add one drop of iodine solution to stain the cells. Gently lower a coverslip at an angle to avoid air bubbles. Remove excess stain with filter paper. Observe under low power (×100), then high power (×400). Draw a few adjacent cells, labeling the cell wall, nucleus, and cytoplasm.",
        [
          { id: "bio-2014-prac-1-a", text: "Draw and label a group of onion epidermal cells as seen under high power magnification.", answerGuide: "Drawing should show rectangular cells with clearly visible cell walls, a centrally located or displaced nucleus, and granular cytoplasm. Label cell wall, nucleus, and cytoplasm. Include magnification used." },
          { id: "bio-2014-prac-1-b", text: "Why was iodine solution used in this experiment? State one other stain that could be used.", answerGuide: "Iodine solution stains starch granules blue-black and makes the nucleus more visible by binding to nucleic acids. Methylene blue is an alternative stain that binds to negatively charged components." },
          { id: "bio-2014-prac-1-c", text: "Explain why air bubbles must be avoided when preparing the slide. How would you identify an air bubble under the microscope?", answerGuide: "Air bubbles distort the specimen, create optical artifacts, and obstruct clear viewing. Air bubbles appear as dark-bordered circles/rings with a clear center, unlike cellular structures which show internal detail." },
        ],
        "Cell Biology",
      ),
    ],
  },

  2015: {
    objective: [
      obj(
        "bio-2015-obj-1", 2015,
        "Which type of reproduction involves the fusion of male and female gametes to form a zygote?",
        [
          { label: "A", text: "Binary fission" },
          { label: "B", text: "Budding" },
          { label: "C", text: "Sexual reproduction" },
          { label: "D", text: "Vegetative propagation" },
        ],
        "C",
        "Sexual reproduction requires the fusion of haploid male and female gametes (fertilization) to form a diploid zygote, which develops into a new organism. This generates genetic diversity through recombination.",
        "easy",
        "Reproduction",
      ),
      obj(
        "bio-2015-obj-2", 2015,
        "Which of the following pairs of organisms belongs to the same taxonomic class?",
        [
          { label: "A", text: "Dog and tapeworm" },
          { label: "B", text: "Lizard and frog" },
          { label: "C", text: "Whale and bat" },
          { label: "D", text: "Spider and crab" },
        ],
        "C",
        "Whale (mammal) and bat (mammal) both belong to Class Mammalia. Dog is Mammalia but tapeworm is Cestoda. Lizard is Reptilia, frog is Amphibia. Spider is Arachnida, crab is Malacostraca.",
        "medium",
        "Classification",
      ),
      obj(
        "bio-2015-obj-3", 2015,
        "Enzymes catalyze biochemical reactions by:",
        [
          { label: "A", text: "Increasing the activation energy of the reaction" },
          { label: "B", text: "Decreasing the activation energy of the reaction" },
          { label: "C", text: "Being consumed in the reaction" },
          { label: "D", text: "Changing the equilibrium constant of the reaction" },
        ],
        "B",
        "Enzymes are biological catalysts that lower the activation energy required for a reaction to proceed, allowing reactions to occur faster at normal body temperatures. They are not consumed and do not alter equilibrium constants.",
        "easy",
        "Enzymes",
      ),
    ],
    theory: [
      theory(
        "bio-2015-theory-1", 2015,
        "Describe the structure of the mammalian heart, including the chambers, valves, and major blood vessels. Explain how the cardiac cycle produces the characteristic heartbeat sounds.",
        "The mammalian heart has four chambers: right and left atria (thin-walled, receive blood) and right and left ventricles (thick-walled, pump blood). The right AV valve (tricuspid) separates right atrium and ventricle; the left AV valve (bicuspid/mitral) separates left atrium and ventricle. Semilunar valves (pulmonary and aortic) are at the artery exits. The cardiac cycle: atrial systole contracts atria, forcing blood into ventricles; ventricular systole contracts ventricles, forcing AV valves shut (first heart sound 'lub') and blood into arteries; diastole relaxes all chambers, semilunar valves close (second heart sound 'dub'). The SA node initiates the heartbeat as the natural pacemaker.",
        [
          { point: "Correct identification and description of the four chambers", marks: 2 },
          { point: "Identification of valves (tricuspid, bicuspid, semilunar) and their positions", marks: 2 },
          { point: "Major blood vessels attached (vena cava, pulmonary artery, pulmonary veins, aorta)", marks: 2 },
          { point: "Description of cardiac cycle phases (atrial systole, ventricular systole, diastole)", marks: 2 },
          { point: "Explanation of heart sounds ('lub' from AV valves closing, 'dub' from semilunar valves closing)", marks: 2 },
        ],
        "Physiology",
      ),
      theory(
        "bio-2015-theory-2", 2015,
        "Outline the process of aerobic respiration after glycolysis. Describe the reactions of the Krebs cycle and the electron transport chain, and calculate the total ATP yield from one glucose molecule.",
        "After glycolysis (2 pyruvate, 2 ATP, 2 NADH), pyruvate enters the mitochondrial matrix where it is oxidatively decarboxylated to acetyl-CoA, producing 1 NADH per pyruvate. Acetyl-CoA enters the Krebs cycle: it combines with oxaloacetate (4C) to form citrate (6C), which undergoes a series of decarboxylation and oxidation reactions, regenerating oxaloacetate. Per cycle: 3 NADH, 1 FADH₂, 1 ATP (GTP), and 2 CO₂ are produced. NADH and FADH₂ feed electrons into the electron transport chain on the inner mitochondrial membrane. Electrons pass through complexes I-IV, creating a proton gradient that drives ATP synthase. Chemiosmosis yields ~34 ATP from oxidative phosphorylation. Total: ~36-38 ATP per glucose.",
        [
          { point: "Conversion of pyruvate to acetyl-CoA (oxidative decarboxylation in mitochondrial matrix)", marks: 2 },
          { point: "Krebs cycle: substrate entry, decarboxylation steps, and products (NADH, FADH₂, ATP, CO₂)", marks: 3 },
          { point: "Electron transport chain: electron carriers, proton gradient formation, oxygen as final acceptor", marks: 3 },
          { point: "Total ATP yield calculation (≈36-38 ATP including glycolysis and Krebs)", marks: 2 },
        ],
        "Respiration",
      ),
    ],
    practical: [
      practical(
        "bio-2015-prac-1", 2015,
        "Investigation of the Effect of Temperature on Enzyme Activity",
        "To investigate how temperature affects the rate of an enzyme-catalyzed reaction using catalase or amylase.",
        ["Hydrogen peroxide solution (3%)", "Fresh potato tuber (source of catalase)", "Test tubes and rack", "Water baths at 10°C, 20°C, 30°C, 40°C, 50°C, 60°C", "Thermometer", "Stopwatch", "Ruler or measuring cylinder", "Pipettes", "Filter paper discs"],
        "Cut equal-sized discs of potato using a cork borer. Place one disc in each test tube. Add 5 cm³ of hydrogen peroxide to each tube. Place tubes in water baths at different temperatures for 5 minutes. Measure the height of oxygen bubble column produced or time for disc to rise. Record the rate of reaction. Plot a graph of reaction rate against temperature.",
        [
          { id: "bio-2015-prac-1-a", text: "Tabulate your results showing temperature, time taken, and calculated rate of reaction (1/time).", answerGuide: "Table should have columns for temperature (°C), time (seconds), and rate (s⁻¹). Rate increases up to optimum temperature then decreases as enzyme denatures." },
          { id: "bio-2015-prac-1-b", text: "Plot a graph of reaction rate against temperature and determine the optimum temperature for the enzyme.", answerGuide: "Graph: rate on y-axis, temperature on x-axis. Curve rises to a peak (optimum ~35-40°C for catalase), then falls sharply as high temperature denatures the enzyme." },
          { id: "bio-2015-prac-1-c", text: "Explain the shape of your graph with reference to enzyme kinetics and protein structure.", answerGuide: "Increasing temperature increases kinetic energy and collision rate (Q₁₀ effect) up to optimum. Beyond optimum, hydrogen bonds and other weak interactions break, altering the active site (denaturation). The enzyme loses catalytic function." },
        ],
        "Enzymes",
      ),
    ],
  },

  2016: {
    objective: [
      obj(
        "bio-2016-obj-1", 2016,
        "The light-independent stage of photosynthesis (Calvin cycle) occurs in the:",
        [
          { label: "A", text: "Thylakoid membrane" },
          { label: "B", text: "Stroma of the chloroplast" },
          { label: "C", text: "Inner mitochondrial membrane" },
          { label: "D", text: "Cytoplasm" },
        ],
        "B",
        "The Calvin cycle (light-independent reactions) takes place in the stroma of chloroplasts. It uses ATP and NADPH produced in the light-dependent reactions (thylakoid membrane) to fix CO₂ into carbohydrates.",
        "medium",
        "Photosynthesis",
      ),
      obj(
        "bio-2016-obj-2", 2016,
        "Which of the following is NOT a mechanism of evolution?",
        [
          { label: "A", text: "Natural selection" },
          { label: "B", text: "Genetic drift" },
          { label: "C", text: "Gene flow" },
          { label: "D", text: "Homeostasis" },
        ],
        "D",
        "Homeostasis is the maintenance of internal stability, not an evolutionary mechanism. Natural selection, genetic drift, gene flow (migration), and mutation are the four main mechanisms that drive evolutionary change in populations.",
        "easy",
        "Evolution",
      ),
      obj(
        "bio-2016-obj-3", 2016,
        "Which structure in eukaryotic cells is continuous with the nuclear envelope and has ribosomes attached to its surface?",
        [
          { label: "A", text: "Smooth endoplasmic reticulum" },
          { label: "B", text: "Rough endoplasmic reticulum" },
          { label: "C", text: "Golgi apparatus" },
          { label: "D", text: "Plasma membrane" },
        ],
        "B",
        "The rough endoplasmic reticulum (RER) is continuous with the outer membrane of the nuclear envelope and is studded with ribosomes on its cytoplasmic surface. It synthesizes and processes proteins destined for secretion or membrane insertion.",
        "easy",
        "Cell Biology",
      ),
    ],
    theory: [
      theory(
        "bio-2016-theory-1", 2016,
        "Explain the principle of independent assortment as described by Mendel. Use a dihybrid cross involving seed shape (round R, wrinkled r) and seed color (yellow Y, green y) in pea plants to illustrate your answer. Show the phenotypic and genotypic ratios of the F₂ generation.",
        "Mendel's law of independent assortment states that alleles of different genes segregate independently during gamete formation, provided the genes are on different chromosomes (or far apart on the same chromosome). For a dihybrid cross RrYy × RrYy: each parent produces four gamete types (RY, Ry, rY, ry) in equal proportions. The Punnett square yields 16 combinations. Phenotypic ratio: 9 round yellow : 3 round green : 3 wrinkled yellow : 1 wrinkled green. Genotypic ratio: 1 RRYY : 2 RRYy : 1 RRyy : 2 RrYY : 4 RrYy : 2 Rryy : 1 rrYY : 2 rrYy : 1 rryy. This ratio confirms independent assortment because each trait segregates independently (3:1 for each trait when considered separately).",
        [
          { point: "Statement of the law of independent assortment", marks: 2 },
          { point: "Correct parental genotypes and gamete types produced", marks: 2 },
          { point: "Punnett square or correct ratios for F₂ generation", marks: 2 },
          { point: "Correct phenotypic ratio (9:3:3:1)", marks: 2 },
          { point: "Explanation of how this demonstrates independent assortment of genes", marks: 2 },
        ],
        "Genetics",
      ),
      theory(
        "bio-2016-theory-2", 2016,
        "Describe the carbon cycle, explaining the processes by which carbon moves between the atmosphere, living organisms, and geological reservoirs.",
        "The carbon cycle maintains atmospheric CO₂ balance. Photosynthesis removes CO₂ from the atmosphere, incorporating carbon into organic compounds in producers. Consumers obtain carbon by feeding. Respiration by all organisms returns CO₂ to the atmosphere. Decomposition of dead organisms releases CO₂ via microbial respiration. Combustion of fossil fuels and biomass releases stored carbon as CO₂. Over geological timescales, sedimentation of marine organisms forms limestone and fossil fuels. Carbon also exchanges with oceans through dissolution and photosynthesis by marine phytoplankton. Human activities (deforestation, burning fossil fuels) disrupt this balance, increasing atmospheric CO₂ and contributing to climate change.",
        [
          { point: "Photosynthesis as carbon fixation from atmosphere into organic compounds", marks: 2 },
          { point: "Feeding and food chains transferring carbon between organisms", marks: 1 },
          { point: "Respiration releasing CO₂ from all living organisms", marks: 2 },
          { point: "Decomposition and microbial activity returning carbon to atmosphere/soil", marks: 2 },
          { point: "Geological reservoirs: fossil fuels, limestone, and human impact (combustion, deforestation)", marks: 1 },
          { point: "Ocean exchange and marine carbon cycling", marks: 1 },
          { point: "Overall balance and anthropogenic disruption", marks: 1 },
        ],
        "Ecology",
      ),
    ],
    practical: [
      practical(
        "bio-2016-prac-1", 2016,
        "Separation of Photosynthetic Pigments Using Paper Chromatography",
        "To separate and identify the photosynthetic pigments present in a green leaf extract using paper chromatography.",
        ["Fresh green leaves (e.g., spinach)", "Mortar and pestle", "Acetone or ethanol", "Chromatography paper (Whatman No. 1)", "Chromatography tank or large test tube", "Solvent: petroleum ether/acetone mixture (9:1)", "Capillary tube", "Scissors", "Ruler", "Pencil"],
        "Grind fresh leaves with acetone to extract pigments. Draw a pencil line 2 cm from the bottom of the chromatography paper. Apply a concentrated spot of the extract on the line using a capillary tube, drying between applications. Place the paper in a tank containing solvent, ensuring the spot is above the solvent level. Cover the tank. Allow solvent to rise until near the top. Remove, mark the solvent front, and dry. Measure Rf values: distance moved by pigment ÷ distance moved by solvent front.",
        [
          { id: "bio-2016-prac-1-a", text: "Draw and label the chromatogram showing all separated pigment bands with their colors.", answerGuide: "From solvent front: carotene (yellow-orange), xanthophyll (yellow), chlorophyll a (blue-green), chlorophyll b (yellow-green). Bands should be clearly drawn and labeled with colors." },
          { id: "bio-2016-prac-1-b", text: "Calculate the Rf values for each pigment and identify them.", answerGuide: "Rf = distance pigment traveled / distance solvent traveled. Carotene ~0.95, xanthophyll ~0.71, chlorophyll a ~0.65, chlorophyll b ~0.45. Values depend on solvent system used." },
          { id: "bio-2016-prac-1-c", text: "Explain why different pigments travel different distances on the chromatogram.", answerGuide: "Pigments differ in polarity and solubility in the solvent. Carotene is nonpolar (travels farthest), xanthophyll has polar groups, chlorophylls a and b are more polar with Mg center and hydrophilic tails. Less polar = more soluble in nonpolar solvent = travels farther." },
        ],
        "Photosynthesis",
      ),
    ],
  },

  2017: {
    objective: [
      obj(
        "bio-2017-obj-1", 2017,
        "The structure in a neuron that transmits impulses away from the cell body toward the next neuron or effector is the:",
        [
          { label: "A", text: "Dendrite" },
          { label: "B", text: "Axon" },
          { label: "C", text: "Synapse" },
          { label: "D", text: "Myelin sheath" },
        ],
        "B",
        "The axon is a long fiber that conducts nerve impulses away from the neuron cell body (soma) toward the synaptic terminals, where neurotransmitters are released to communicate with the next neuron or effector organ.",
        "easy",
        "Physiology",
      ),
      obj(
        "bio-2017-obj-2", 2017,
        "A DNA strand has the base sequence 5'-ATGCGT-3'. What will be the sequence of the complementary strand?",
        [
          { label: "A", text: "5'-TACGCA-3'" },
          { label: "B", text: "3'-TACGCA-5'" },
          { label: "C", text: "5'-ATGCGT-3'" },
          { label: "D", text: "3'-ATGCGT-5'" },
        ],
        "B",
        "DNA base pairing rules: A pairs with T (2 H-bonds), G pairs with C (3 H-bonds). The complementary strand runs antiparallel: 5'-ATGCGT-3' pairs with 3'-TACGCA-5'. Note the 3'→5' direction of the complement.",
        "medium",
        "Biochemistry",
      ),
      obj(
        "bio-2017-obj-3", 2017,
        "Which of the following reproductive structures in flowering plants produces the male gametophyte?",
        [
          { label: "A", text: "Ovary" },
          { label: "B", text: "Anther" },
          { label: "C", text: "Stigma" },
          { label: "D", text: "Style" },
        ],
        "B",
        "The anther contains pollen sacs (microsporangia) where microspores undergo mitosis to form pollen grains — the male gametophytes. The ovary (A) contains ovules with female gametophytes. Stigma (C) and style (D) are female floral parts.",
        "medium",
        "Reproduction",
      ),
    ],
    theory: [
      theory(
        "bio-2017-theory-1", 2017,
        "Explain the principles of classification used in modern taxonomy. Describe the hierarchy of taxonomic ranks from domain to species, and discuss how molecular evidence has changed our understanding of evolutionary relationships.",
        "Modern taxonomy uses phylogenetic classification based on evolutionary relationships. The hierarchical system: Domain, Kingdom, Phylum, Class, Order, Family, Genus, Species (mnemonic: Dear King Philip Came Over For Good Soup). Each rank groups organisms sharing common ancestry. Molecular phylogenetics uses DNA/RNA sequencing, comparing homologous genes (e.g., rRNA) to construct phylogenetic trees. Molecular clocks estimate divergence times. This has reorganized traditional groups: three-domain system (Bacteria, Archaea, Eukarya) replaced five-kingdom system. Cladistics groups by shared derived characteristics (synapomorphies). Monophyletic groups include common ancestor and all descendants. Molecular evidence revealed Archaea are more closely related to Eukarya than to Bacteria.",
        [
          { point: "Purpose of classification: organizing biodiversity, reflecting evolutionary relationships", marks: 1 },
          { point: "Correct taxonomic hierarchy with mnemonic", marks: 2 },
          { point: "Binomial nomenclature (Genus species)", marks: 1 },
          { point: "Molecular phylogenetics: DNA sequencing, rRNA comparison, molecular clocks", marks: 2 },
          { point: "Three-domain system vs. five-kingdom system", marks: 2 },
          { point: "Cladistics and monophyletic groups", marks: 2 },
        ],
        "Classification",
      ),
      theory(
        "bio-2017-theory-2", 2017,
        "Describe the mechanism of enzyme action using the induced fit model. Explain how competitive and non-competitive inhibitors differ in their mode of action and effects on enzyme kinetics.",
        "The induced fit model proposes that the enzyme's active site is flexible and changes shape upon substrate binding. This conformational change stresses substrate bonds, stabilizing the transition state and lowering activation energy. The enzyme-substrate complex forms, then the product is released. Competitive inhibitors resemble the substrate and bind reversibly to the active site, blocking substrate access. This increases Km (apparent affinity decreases) but Vmax remains unchanged; increasing substrate concentration overcomes inhibition. Non-competitive inhibitors bind elsewhere (allosteric site), altering the enzyme's shape and active site function. Vmax decreases (fewer functional enzymes) but Km is unchanged; substrate cannot overcome this inhibition. Lineweaver-Burk plots distinguish them: competitive shows same y-intercept, different slope; non-competitive shows different y-intercept, same x-intercept.",
        [
          { point: "Induced fit model: active site conformational change upon substrate binding", marks: 2 },
          { point: "Formation of enzyme-substrate complex and transition state stabilization", marks: 1 },
          { point: "Competitive inhibition: active site binding, increased Km, same Vmax, overcome by excess substrate", marks: 2.5 },
          { point: "Non-competitive inhibition: allosteric binding, decreased Vmax, same Km, not overcome by substrate", marks: 2.5 },
          { point: "Lineweaver-Burk plot interpretation for each type", marks: 2 },
        ],
        "Enzymes",
      ),
    ],
    practical: [
      practical(
        "bio-2017-prac-1", 2017,
        "Genetic Cross Simulation Using Drosophila Phenotypes",
        "To investigate patterns of inheritance by analyzing Drosophila (fruit fly) crosses involving eye color and wing length traits.",
        ["Drosophila phenotype cards or images", "Chi-square calculator or formula", "Punnett square worksheets", "Ruler", "Pencil"],
        "Examine the provided data from a cross between heterozygous gray-bodied, normal-winged flies (BbVgvg × BbVgvg). Count the phenotypes in the F₂ generation. Record observed numbers. Use a Punnett square to predict expected ratios. Apply the chi-square (χ²) test: χ² = Σ(O-E)²/E to determine if observed results fit the expected 9:3:3:1 ratio. Degrees of freedom = number of phenotypic classes − 1.",
        [
          { id: "bio-2017-prac-1-a", text: "Construct a Punnett square for the dihybrid cross and state the expected phenotypic ratio.", answerGuide: "Punnett square: 4×4 grid with gametes (BVg, Bvg, bVg, bvg). Expected ratio: 9 gray normal : 3 gray vestigial : 3 ebony normal : 1 ebony vestigial (9:3:3:1)." },
          { id: "bio-2017-prac-1-b", text: "Calculate the chi-square value and determine whether the observed data significantly deviates from expected (critical value at p=0.05, df=3 is 7.815).", answerGuide: "χ² = Σ(O-E)²/E. Compare calculated χ² to 7.815. If χ² < 7.815, accept null hypothesis (data fits 9:3:3:1). If χ² > 7.815, reject null hypothesis (significant deviation)." },
          { id: "bio-2017-prac-1-c", text: "Explain what the chi-square result tells you about gene linkage in this cross.", answerGuide: "If χ² is not significant, the genes assort independently (on different chromosomes or far apart). If significant, genes may be linked on the same chromosome. The deviation from 9:3:3:1 suggests linkage with parental phenotypes more frequent than recombinants." },
        ],
        "Genetics",
      ),
    ],
  },

  2018: {
    objective: [
      obj(
        "bio-2018-obj-1", 2018,
        "In the mammalian circulatory system, the pulmonary vein carries:",
        [
          { label: "A", text: "Deoxygenated blood from heart to lungs" },
          { label: "B", text: "Oxygenated blood from lungs to heart" },
          { label: "C", text: "Deoxygenated blood from body to heart" },
          { label: "D", text: "Oxygenated blood from heart to body" },
        ],
        "B",
        "The pulmonary vein is unique among veins because it carries oxygenated blood from the lungs back to the left atrium of the heart. All other veins carry deoxygenated blood toward the heart.",
        "medium",
        "Transport Systems",
      ),
      obj(
        "bio-2018-obj-2", 2018,
        "The final electron acceptor in the electron transport chain during aerobic respiration is:",
        [
          { label: "A", text: "NAD+" },
          { label: "B", text: "FAD" },
          { label: "C", text: "Oxygen" },
          { label: "D", text: "Carbon dioxide" },
        ],
        "C",
        "Oxygen is the terminal electron acceptor in aerobic respiration. It accepts electrons from complex IV of the electron transport chain, combining with protons to form water. Without oxygen, the chain stops and ATP production via oxidative phosphorylation ceases.",
        "easy",
        "Respiration",
      ),
      obj(
        "bio-2018-obj-3", 2018,
        "The pigment that absorbs light energy and transfers it to chlorophyll a during photosynthesis is called:",
        [
          { label: "A", text: "Chlorophyll b" },
          { label: "B", text: "Carotene" },
          { label: "C", text: "Xanthophyll" },
          { label: "D", text: "Accessory pigment" },
        ],
        "D",
        "Accessory pigments (chlorophyll b, carotenoids) absorb light at wavelengths chlorophyll a absorbs poorly and transfer the energy to chlorophyll a in the reaction center. This broadens the absorption spectrum for photosynthesis.",
        "medium",
        "Photosynthesis",
      ),
    ],
    theory: [
      theory(
        "bio-2018-theory-1", 2018,
        "Discuss the evidence for evolution from comparative anatomy, fossil records, and molecular biology. Provide specific examples for each line of evidence.",
        "Comparative anatomy: homologous structures (e.g., pentadactyl limb in mammals — human arm, bat wing, whale flipper) share underlying skeletal structure despite different functions, indicating common ancestry. Analogous structures (e.g., insect and bird wings) show convergent evolution. Vestigial structures (e.g., human appendix, whale pelvis) are reduced remnants of functional organs in ancestors. Fossil records show transitional forms: Tiktaalik (fish to tetrapod), Archaeopteryx (dinosaur to bird). Fossils demonstrate chronological succession — simpler forms in older rocks, increasing complexity over time. Molecular biology: DNA sequence comparisons reveal phylogenetic relationships. Cytochrome c and rRNA genes are conserved across species; more sequence divergence = more distant common ancestor. Universal genetic code suggests all life shares a common origin.",
        [
          { point: "Homologous structures: pentadactyl limb example with proper explanation", marks: 2 },
          { point: "Analogous vs. homologous structures and convergent evolution", marks: 1 },
          { point: "Vestigial organs as evolutionary remnants", marks: 1 },
          { point: "Fossil evidence: transitional forms and chronological succession", marks: 2 },
          { point: "Molecular evidence: DNA/protein sequence comparisons, molecular clocks", marks: 2 },
          { point: "Universal genetic code as evidence for common ancestry", marks: 1 },
          { point: "Synthesis: how these lines of evidence converge", marks: 1 },
        ],
        "Evolution",
      ),
      theory(
        "bio-2018-theory-2", 2018,
        "Describe the structure and function of the mammalian kidney nephron. Explain the processes of ultrafiltration, selective reabsorption, and osmoregulation.",
        "The nephron is the functional unit of the kidney. It consists of: Bowman's capsule surrounding the glomerulus (capillary network), proximal convoluted tubule (PCT), loop of Henle (descending and ascending limbs), distal convoluted tubule (DCT), and collecting duct. Ultrafiltration occurs in the glomerulus: blood pressure forces water, ions, glucose, urea, and small molecules through the filtration membrane into Bowman's capsule; cells and proteins remain in blood. Selective reabsorption in PCT: glucose, amino acids, vitamins, and most ions actively reabsorbed; about 65% of filtrate volume reabsorbed. Loop of Henle creates medullary osmotic gradient via countercurrent multiplier. DCT and collecting duct regulate fine-tuning: ADH increases water permeability of collecting duct (water reabsorption). Aldosterone increases Na⁺ reabsorption and K⁺ secretion. This maintains blood pressure, pH, and electrolyte balance.",
        [
          { point: "Labeled diagram or description of nephron structure (Bowman's capsule, PCT, loop of Henle, DCT, collecting duct)", marks: 2 },
          { point: "Ultrafiltration: pressure-driven filtration at glomerulus, what passes and what is retained", marks: 2 },
          { point: "Selective reabsorption in PCT: active transport of glucose, amino acids, ions", marks: 2 },
          { point: "Role of loop of Henle in creating medullary osmotic gradient", marks: 2 },
          { point: "Osmoregulation: ADH, aldosterone, and collecting duct function", marks: 2 },
        ],
        "Physiology",
      ),
    ],
    practical: [
      practical(
        "bio-2018-prac-1", 2018,
        "Ecological Survey Using Quadrat Sampling",
        "To estimate the population density and frequency of plant species in a grassland ecosystem using quadrat sampling techniques.",
        ["1 m × 1 m quadrat frame", "Measuring tape (50 m)", "Pegs and string", "Notebook and pencil", "Plant identification guide", "Hand lens", "Calculator"],
        "Establish a 50 m baseline in the study area. Use random numbers to select coordinates for quadrat placement. Place the 1 m² quadrat at each selected coordinate. Identify and count each plant species within the quadrat. Record number of individuals per species and whether each species is present. Repeat for 20 quadrats. Calculate: Density = total individuals / total area sampled. Frequency = (number of quadrats containing species / total quadrats) × 100. Relative density and relative frequency can also be calculated.",
        [
          { id: "bio-2018-prac-1-a", text: "Tabulate your data showing species name, number of individuals per quadrat, and presence/absence for 20 quadrats.", answerGuide: "Table should have quadrat number as columns and species as rows. At a minimum, include 5-6 common grassland species. Total individuals per species should be summed at bottom." },
          { id: "bio-2018-prac-1-b", text: "Calculate the density (individuals/m²) and frequency (%) for each species identified.", answerGuide: "Density = total count / 20 m². Frequency = (quadrats present / 20) × 100. Show working for at least three dominant species." },
          { id: "bio-2018-prac-1-c", text: "Explain why random sampling is important in ecological studies and how the quadrat size relates to the organisms being sampled.", answerGuide: "Random sampling avoids bias and ensures data is representative of the whole area. Quadrat size should match organism size: 1 m² for herbs/grasses, larger quadrats for shrubs or trees. Too small: misses individuals. Too large: cumbersome and may over-represent common species." },
        ],
        "Ecology",
      ),
    ],
  },

  2019: {
    objective: [
      obj(
        "bio-2019-obj-1", 2019,
        "A woman with blood type O gives birth to a child with blood type A. Which of the following is the most likely blood type of the father?",
        [
          { label: "A", text: "Type O" },
          { label: "B", text: "Type AB" },
          { label: "C", text: "Type B" },
          { label: "D", text: "Type O or A" },
        ],
        "B",
        "Blood type O (genotype ii) mother can only contribute i allele. Child has blood type A, meaning genotype IAi. The father must contribute the IA allele. Only a father with type AB (IAIB) or type A (IAIA or IAi) could contribute IA. Type AB is the most definitive answer since it guarantees the IA allele.",
        "hard",
        "Genetics",
      ),
      obj(
        "bio-2019-obj-2", 2019,
        "The term 'carrying capacity' in ecology refers to:",
        [
          { label: "A", text: "The maximum population size an environment can sustain indefinitely" },
          { label: "B", text: "The rate at which a population grows" },
          { label: "C", text: "The number of species in a habitat" },
          { label: "D", text: "The total biomass of all organisms in an ecosystem" },
        ],
        "A",
        "Carrying capacity (K) is the maximum population size of a species that an environment can support over the long term given available resources (food, water, shelter). Beyond K, population declines due to resource limitation.",
        "easy",
        "Ecology",
      ),
      obj(
        "bio-2019-obj-3", 2019,
        "Which of the following is an example of a negative feedback mechanism in the human body?",
        [
          { label: "A", text: "Oxytocin release during childbirth" },
          { label: "B", text: "Blood clotting cascade" },
          { label: "C", text: "Insulin secretion in response to high blood glucose" },
          { label: "D", text: "Action potential propagation" },
        ],
        "C",
        "Insulin secretion in response to high blood glucose is negative feedback: the response (insulin lowering glucose) reverses the initial stimulus. Childbirth and blood clotting are positive feedback (amplifies stimulus). Action potential involves depolarization feedback.",
        "medium",
        "Physiology",
      ),
    ],
    theory: [
      theory(
        "bio-2019-theory-1", 2019,
        "Discuss the structure and function of DNA. Include the chemical composition, the double helix model proposed by Watson and Crick, and the significance of complementary base pairing.",
        "DNA (deoxyribonucleic acid) is composed of nucleotides, each containing deoxyribose sugar, phosphate group, and a nitrogenous base (adenine A, guanine G, cytosine C, thymine T). DNA is double-stranded, forming a right-handed double helix. The backbone consists of alternating sugar and phosphate molecules linked by phosphodiester bonds. The two strands run antiparallel (5'→3' and 3'→5'). Base pairing: A pairs with T via 2 hydrogen bonds; G pairs with C via 3 hydrogen bonds (complementary base pairing). This ensures accurate replication. The sequence of bases encodes genetic information. The double helix structure protects the genetic code while allowing access for transcription and replication. Major and minor grooves provide binding sites for regulatory proteins.",
        [
          { point: "Chemical composition: nucleotides (deoxyribose, phosphate, nitrogenous bases A, T, G, C)", marks: 2 },
          { point: "Double helix: antiparallel strands, sugar-phosphate backbone", marks: 2 },
          { point: "Complementary base pairing: A=T (2 H-bonds), G≡C (3 H-bonds)", marks: 2 },
          { point: "Directionality: 5'→3' and 3'→5' antiparallel orientation", marks: 2 },
          { point: "Functional significance: replication fidelity, transcription access, genetic encoding", marks: 2 },
        ],
        "Biochemistry",
      ),
      theory(
        "bio-2019-theory-2", 2019,
        "Describe the human female menstrual cycle, including the roles of hormones (FSH, LH, estrogen, progesterone) and the changes that occur in the ovary and uterus.",
        "The menstrual cycle averages 28 days. The follicular phase (days 1-13): FSH from anterior pituitary stimulates ovarian follicle development. Follicles produce estrogen, which rebuilds the endometrium. Rising estrogen triggers LH surge around day 14. Ovulation (day 14): LH surge triggers release of secondary oocyte from mature Graafian follicle. The luteal phase (days 15-28): LH converts ruptured follicle into corpus luteum, which secretes progesterone and estrogen. Progesterone maintains the endometrial lining for implantation. If no fertilization occurs, corpus luteum degenerates (days 24-28), progesterone drops, endometrial lining breaks down (menstruation, days 1-5). Negative feedback: high estrogen and progesterone inhibit FSH and LH. Positive feedback: high estrogen before ovulation triggers LH surge.",
        [
          { point: "Phases of the cycle with approximate timing (menstrual, follicular, ovulation, luteal)", marks: 2 },
          { point: "Role of FSH: follicle development and estrogen production", marks: 1.5 },
          { point: "Role of LH: ovulation and corpus luteum formation", marks: 1.5 },
          { point: "Estrogen and progesterone effects on endometrium", marks: 2 },
          { point: "Hormonal feedback mechanisms (positive and negative feedback)", marks: 2 },
          { point: "Fate of corpus luteum if no fertilization occurs", marks: 1 },
        ],
        "Reproduction",
      ),
    ],
    practical: [
      practical(
        "bio-2019-prac-1", 2019,
        "Determination of Osmotic Potential Using Potato Cylinders",
        "To determine the osmotic potential (solute concentration) of potato tuber cells by immersing tissue in sucrose solutions of varying concentrations.",
        ["Fresh potato tuber", "Cork borer (5 mm diameter)", "Scalpel", "Ruler (mm)", "Sucrose solutions: 0.0, 0.2, 0.4, 0.6, 0.8, 1.0 M", "6 test tubes", "Test tube rack", "Balance (optional)", "Filter paper", "Stopwatch"],
        "Use a cork borer to cut 6 potato cylinders of equal diameter. Cut to equal length (50 mm). Blot dry and measure initial length accurately. Place one cylinder in each sucrose concentration. After 30 minutes, remove, blot dry, and measure final length. Calculate percentage change in length: (final − initial) / initial × 100. Plot % change against concentration. Determine the concentration where no change occurs — this equals the osmotic potential of the potato cells.",
        [
          { id: "bio-2019-prac-1-a", text: "Tabulate your results showing sucrose concentration, initial length, final length, and percentage change.", answerGuide: "Table: columns for conc. (M), initial length (mm), final length (mm), change (mm), % change. Include all 6 concentrations. Positive values = gain (hypotonic), negative = loss (hypertonic)." },
          { id: "bio-2019-prac-1-b", text: "Plot a graph of percentage length change against sucrose concentration and determine the concentration at which no net change occurs.", answerGuide: "Graph: % change on y-axis, concentration on x-axis. Line crosses zero at the iso-osmotic point. Read concentration from x-intercept. Typical value for potato ~0.3-0.4 M sucrose." },
          { id: "bio-2019-prac-1-c", text: "Explain the results in terms of water potential, osmosis, and the concept of incipient plasmolysis.", answerGuide: "Water moves from high to low water potential. Lower sucrose concentration = higher water potential → water enters cells, cylinder gains length. Higher sucrose = lower water potential → water leaves cells, cylinder shrinks. At no-change point, internal solute potential equals external. Beyond this, plasmolysis begins." },
        ],
        "Cell Biology",
      ),
    ],
  },

  2020: {
    objective: [
      obj(
        "bio-2020-obj-1", 2020,
        "Which of the following characteristics is unique to prokaryotic cells?",
        [
          { label: "A", text: "Presence of ribosomes" },
          { label: "B", text: "Presence of a cell membrane" },
          { label: "C", text: "Circular DNA not enclosed within a nuclear membrane" },
          { label: "D", text: "Ability to perform cellular respiration" },
        ],
        "C",
        "Prokaryotic cells have a single circular chromosome located in the nucleoid region without a nuclear envelope. Both prokaryotes and eukaryotes have ribosomes, cell membranes, and can perform respiration. The absence of a membrane-bound nucleus is definitive for prokaryotes.",
        "easy",
        "Classification",
      ),
      obj(
        "bio-2020-obj-2", 2020,
        "An enzyme's active site becomes denatured at high temperatures primarily because:",
        [
          { label: "A", text: "The amino acid sequence is altered" },
          { label: "B", text: "The peptide bonds break" },
          { label: "C", text: "Weak intramolecular bonds maintaining tertiary structure are disrupted" },
          { label: "D", text: "The substrate changes shape" },
        ],
        "C",
        "Heat disrupts hydrogen bonds, ionic bonds, and hydrophobic interactions that maintain the enzyme's specific three-dimensional tertiary structure. The active site loses its shape so substrate cannot bind. The primary structure (amino acid sequence) and peptide bonds remain intact below ~100°C.",
        "medium",
        "Enzymes",
      ),
      obj(
        "bio-2020-obj-3", 2020,
        "Which blood vessels have valves to prevent the backflow of blood?",
        [
          { label: "A", text: "Arteries" },
          { label: "B", text: "Arterioles" },
          { label: "C", text: "Capillaries" },
          { label: "D", text: "Veins" },
        ],
        "D",
        "Veins have semilunar valves at intervals along their length because venous blood flows at low pressure toward the heart. Valves prevent backflow and ensure one-way flow, assisted by skeletal muscle contractions (skeletal muscle pump).",
        "easy",
        "Transport Systems",
      ),
    ],
    theory: [
      theory(
        "bio-2020-theory-1", 2020,
        "Compare and contrast aerobic and anaerobic respiration in terms of the processes involved, end products, ATP yield, and organisms that utilize each type.",
        "Aerobic respiration: requires O₂, occurs in cytoplasm and mitochondria, complete oxidation of glucose to CO₂ and H₂O, yields 36-38 ATP per glucose. Stages: glycolysis (cytoplasm), link reaction, Krebs cycle (matrix), electron transport chain (inner mitochondrial membrane). Anaerobic respiration: no O₂, incomplete oxidation. In humans/mammals: glycolysis → pyruvate → lactate (in muscles), 2 ATP per glucose, NAD⁺ regenerated. In yeast/plants: glycolysis → pyruvate → ethanol + CO₂, 2 ATP per glucose. Both start with glycolysis and require NAD⁺ regeneration. Aerobic yields about 18-19 times more ATP. Anaerobic supports rapid ATP production during oxygen deficit (sprint) or in environments lacking O₂ (waterlogged soil, deep sediments). Obligate anaerobes die in oxygen presence.",
        [
          { point: "Aerobic: complete oxidation, O₂ required, CO₂ + H₂O end products, 36-38 ATP", marks: 2.5 },
          { point: "Anaerobic (human): lactate as end product, 2 ATP, NAD⁺ regeneration", marks: 2.5 },
          { point: "Anaerobic (yeast): ethanol + CO₂, 2 ATP, NAD⁺ regeneration, fermentation", marks: 2 },
          { point: "Comparison: common starting point (glycolysis), ATP yield difference, physiological contexts", marks: 2 },
          { point: "Organism examples and ecological significance of each type", marks: 1 },
        ],
        "Respiration",
      ),
      theory(
        "bio-2020-theory-2", 2020,
        "Describe the light-dependent reactions of photosynthesis, including the roles of photosystem II, photosystem I, the electron transport chain, and photophosphorylation. Explain how ATP and NADPH are produced.",
        "Light-dependent reactions occur in thylakoid membranes. Photosystem II (PSII) absorbs light (P680), exciting electrons that are captured by primary acceptor. Water is split (photolysis): 2H₂O → O₂ + 4H⁺ + 4e⁻, replacing lost electrons. Electrons pass through electron transport chain (plastoquinone, cytochrome b₆f complex, plastocyanin), releasing energy that pumps H⁺ into thylakoid lumen, creating a proton gradient. Photosystem I (PSI) absorbs light (P700), re-exciting electrons to reduce NADP⁺ to NADPH (catalyzed by ferredoxin-NADP⁺ reductase). ATP is synthesized via chemiosmosis: H⁺ flows through ATP synthase from lumen to stroma (photophosphorylation). Non-cyclic photophosphorylation produces ATP + NADPH (linear flow from H₂O to NADP⁺). Cyclic photophosphorylation (PSI only) produces ATP only, used when more ATP than NADPH is needed.",
        [
          { point: "Location: thylakoid membranes of chloroplasts", marks: 1 },
          { point: "Photosystem II: light absorption, electron excitation, photolysis of water", marks: 2.5 },
          { point: "Electron transport chain: carriers, proton pumping, proton gradient formation", marks: 2.5 },
          { point: "Photosystem I: light absorption, NADP⁺ reduction to NADPH", marks: 1 },
          { point: "Chemiosmosis and ATP synthase: photophosphorylation producing ATP", marks: 2 },
          { point: "Non-cyclic vs. cyclic photophosphorylation", marks: 1 },
        ],
        "Photosynthesis",
      ),
    ],
    practical: [
      practical(
        "bio-2020-prac-1", 2020,
        "Qualitative Analysis of Carbohydrates Using Biochemical Tests",
        "To identify the presence of reducing sugars, starch, and non-reducing sugars in unknown food samples using Benedict's test and iodine test.",
        ["Unknown food samples (A, B, C)", "Benedict's reagent", "Iodine solution", "Dilute hydrochloric acid (HCl)", "Sodium hydrogen carbonate (NaHCO₃)", "Water bath (95°C)", "Test tubes and rack", "Pipettes", "Test tube holder"],
        "Prepare sample solutions by grinding food with water. For reducing sugars: add 2 cm³ Benedict's reagent to 2 cm³ sample, heat in boiling water bath for 5 minutes. Color change (blue → green → yellow → orange → brick-red precipitate) indicates reducing sugar. For starch: add 2 drops iodine solution; blue-black color = starch present. For non-reducing sugars: hydrolyze with dilute HCl (boil 5 min), neutralize with NaHCO₃, then repeat Benedict's test. A positive result after hydrolysis (but not before) indicates non-reducing sugar (e.g., sucrose).",
        [
          { id: "bio-2020-prac-1-a", text: "Record the color changes observed for each food sample with Benedict's test and iodine test.", answerGuide: "Table with samples A, B, C as rows and tests as columns. Reducing sugars: record color after Benedict's (blue = none, green = trace, yellow = low, orange = moderate, brick-red = high). Starch: brown/yellow = absent, blue-black = present." },
          { id: "bio-2020-prac-1-b", text: "Based on your results, classify each sample according to the carbohydrates present.", answerGuide: "Sample A might contain reducing sugar only (e.g., glucose solution), B might contain starch (e.g., potato), C might contain non-reducing sugar (e.g., sucrose) or a combination. Justify based on test results." },
          { id: "bio-2020-prac-1-c", text: "Explain the chemistry behind Benedict's test for reducing sugars.", answerGuide: "Reducing sugars have free aldehyde or ketone groups that reduce Cu²⁺ (blue) in Benedict's reagent to Cu⁺ (red Cu₂O precipitate). The color indicates concentration: more reducing sugar = more Cu₂O formed = redder precipitate. Non-reducing sucrose lacks free reducing group until hydrolyzed." },
        ],
        "Biochemistry",
      ),
    ],
  },

  2021: {
    objective: [
      obj(
        "bio-2021-obj-1", 2021,
        "During mitotic cell division, sister chromatids separate and move to opposite poles during:",
        [
          { label: "A", text: "Prophase" },
          { label: "B", text: "Metaphase" },
          { label: "C", text: "Anaphase" },
          { label: "D", text: "Telophase" },
        ],
        "C",
        "Anaphase: the centromeres split, and spindle fibers shorten, pulling sister chromatids toward opposite poles. This ensures each daughter cell receives an identical set of chromosomes. Prophase: condensation. Metaphase: alignment at equator. Telophase: nuclear envelope reforms.",
        "easy",
        "Cell Biology",
      ),
      obj(
        "bio-2021-obj-2", 2021,
        "In a pedigree analysis, an autosomal recessive disorder would most likely:",
        [
          { label: "A", text: "Appear in every generation" },
          { label: "B", text: "Affect only males" },
          { label: "C", text: "Skip generations and affect males and females equally" },
          { label: "D", text: "Be passed from father to all sons" },
        ],
        "C",
        "Autosomal recessive disorders (e.g., cystic fibrosis) skip generations because affected individuals are homozygous recessive. Carriers (heterozygotes) are unaffected. Males and females are equally affected. Affected individuals appear when both parents are carriers (or affected).",
        "hard",
        "Genetics",
      ),
      obj(
        "bio-2021-obj-3", 2021,
        "The biome characterized by low rainfall (< 250 mm/year) and extreme temperature variations between day and night is the:",
        [
          { label: "A", text: "Tropical rainforest" },
          { label: "B", text: "Desert" },
          { label: "C", text: "Savanna" },
          { label: "D", text: "Tundra" },
        ],
        "B",
        "Deserts receive less than 250 mm annual rainfall and experience extreme diurnal temperature ranges (hot days, cold nights). Tropical rainforests have high rainfall (2000+ mm). Savanna has seasonal rainfall. Tundra is cold year-round with low precipitation.",
        "easy",
        "Ecology",
      ),
    ],
    theory: [
      theory(
        "bio-2021-theory-1", 2021,
        "Explain how the mammalian nervous system coordinates a reflex action. Describe the structure of a reflex arc and trace the pathway of a nerve impulse in the knee-jerk (patellar) reflex.",
        "A reflex arc is the neural pathway controlling a reflex action — an involuntary, rapid response to a stimulus. Components: receptor (sensory nerve ending) detects stimulus → sensory neuron conducts impulse to spinal cord → integration center (monosynaptic: direct synapse, or polysynaptic: interneuron involved) → motor neuron conducts impulse to effector → effector (muscle/gland) produces response. The knee-jerk reflex: tapping the patellar tendon stretches the quadriceps muscle spindle. Sensory neuron fires, synapse directly onto alpha motor neuron in spinal cord (monosynaptic), motor neuron causes quadriceps contraction → leg extends. Simultaneously, inhibitory interneuron relaxes hamstring (reciprocal inhibition). This bypasses the brain for speed, though the brain receives sensory information afterward. Reflexes protect the body and maintain posture.",
        [
          { point: "Definition of reflex arc and its biological significance", marks: 1 },
          { point: "Components: receptor, sensory neuron, integration center, motor neuron, effector", marks: 2 },
          { point: "Monosynaptic vs. polysynaptic reflex arcs", marks: 1 },
          { point: "Knee-jerk reflex pathway: stretch receptor → sensory neuron → spinal cord → motor neuron → quadriceps", marks: 3 },
          { point: "Reciprocal inhibition of antagonist muscle", marks: 1 },
          { point: "Speed advantage: bypasses brain, short neural pathway", marks: 1 },
          { point: "Synaptic transmission across the reflex arc", marks: 1 },
        ],
        "Physiology",
      ),
      theory(
        "bio-2021-theory-2", 2021,
        "Outline the theory of natural selection as proposed by Charles Darwin. Discuss the requirements for natural selection to occur and provide a modern example of evolution by natural selection.",
        "Darwin's theory of natural selection: individuals within a population show heritable variation; more offspring are produced than can survive (overproduction); individuals with traits better suited to the environment are more likely to survive and reproduce (differential survival and reproduction); these advantageous traits become more common in the population over generations (descent with modification). Requirements: variation (genetic diversity from mutation and recombination), heritability (traits must be genetically determined), differential reproductive success (not all individuals contribute equally to next generation), selection pressure (environmental factor favoring certain traits). Modern example: peppered moth (Biston betularia) in industrial England — dark (melanic) form became more common due to camouflage on soot-darkened trees, then decreased after clean air legislation. Another: antibiotic resistance in bacteria — resistant bacteria survive treatment and reproduce, spreading resistance genes.",
        [
          { point: "Darwin's key observations: variation, overproduction, limited resources", marks: 2 },
          { point: "Mechanism: differential survival and reproduction based on advantageous traits", marks: 2 },
          { point: "Requirements for natural selection: heritable variation, selection pressure, differential fitness", marks: 2 },
          { point: "Modern example: peppered moth or antibiotic resistance with full explanation", marks: 2 },
          { point: "Descent with modification — population-level change over generations", marks: 1 },
          { point: "Distinction from Lamarckian evolution", marks: 1 },
        ],
        "Evolution",
      ),
    ],
    practical: [
      practical(
        "bio-2021-prac-1", 2021,
        "Identification of Taxonomic Groups Using Dichotomous Keys",
        "To construct and use a dichotomous key to identify common plant or animal specimens to their taxonomic groups.",
        ["Specimens: 5-8 leaves or preserved arthropods", "Hand lens", "Ruler", "Forceps", "Dissecting microscope (if available)", "Reference taxonomic key", "Notebook"],
        "Observe each specimen carefully, noting key morphological features. For leaves: shape, margin, venation, arrangement. For arthropods: body segments, appendages, antennae, wings. Construct a dichotomous key using pairs of contrasting statements. Each step offers two choices that lead to either identification or another couplet. Test your key on unknown specimens. Alternatively, use a provided key to identify specimens: start at couplet 1, follow the choices until the specimen is identified to phylum/class/order level.",
        [
          { id: "bio-2021-prac-1-a", text: "Construct a dichotomous key for the identification of the provided specimens.", answerGuide: "Key should be numbered with paired choices (e.g., 1a. Leaves simple ... 1b. Leaves compound ...). Each choice leads to either identification or next number. Key should correctly separate all specimens using visible features." },
          { id: "bio-2021-prac-1-b", text: "Use your key to identify each specimen and record the taxonomic group (phylum/class) it belongs to.", answerGuide: "Table: specimen number, key pathway followed, identification, and group. For arthropods: identify to class (Insecta, Arachnida, Crustacea, Myriapoda). For leaves: identify to broad group (dicot/monocot, simple/compound, leaf margin type)." },
          { id: "bio-2021-prac-1-c", text: "Explain the advantages of using dichotomous keys for biological identification.", answerGuide: "Dichotomous keys are systematic, require no prior knowledge, can be used by anyone with observation skills. They force careful observation, break down complex identifications into manageable choices, and provide consistent results. Limitation: only works for included species; natural variation can cause confusion." },
        ],
        "Classification",
      ),
    ],
  },

  2022: {
    objective: [
      obj(
        "bio-2022-obj-1", 2022,
        "Which of the following processes occurs during anaphase I of meiosis?",
        [
          { label: "A", text: "Sister chromatids separate" },
          { label: "B", text: "Homologous chromosomes separate" },
          { label: "C", text: "Crossing over occurs" },
          { label: "D", text: "Chromosomes align at the metaphase plate" },
        ],
        "B",
        "Anaphase I: homologous chromosomes (each with two sister chromatids) separate and move to opposite poles. Sister chromatids remain attached at centromeres. Crossing over occurs in prophase I. Sister chromatid separation occurs in anaphase II.",
        "medium",
        "Reproduction",
      ),
      obj(
        "bio-2022-obj-2", 2022,
        "Which molecule acts as the primary energy currency of the cell?",
        [
          { label: "A", text: "NADH" },
          { label: "B", text: "FADH₂" },
          { label: "C", text: "ATP" },
          { label: "D", text: "Glucose" },
        ],
        "C",
        "Adenosine triphosphate (ATP) is the universal energy currency. It stores energy in its high-energy phosphate bonds. Hydrolysis of ATP to ADP + Pi releases energy (≈30.5 kJ/mol) that drives cellular work including muscle contraction, active transport, and biosynthesis.",
        "easy",
        "Biochemistry",
      ),
      obj(
        "bio-2022-obj-3", 2022,
        "The optimal temperature for most human enzymes is approximately:",
        [
          { label: "A", text: "15°C" },
          { label: "B", text: "25°C" },
          { label: "C", text: "37°C" },
          { label: "D", text: "45°C" },
        ],
        "C",
        "Human enzymes have an optimal temperature around 37°C (normal body temperature). At this temperature, molecular motion is sufficient for effective collisions, and the enzyme structure is stable. Above 40-45°C, denaturation begins. At low temperatures, reaction rates decrease.",
        "easy",
        "Enzymes",
      ),
    ],
    theory: [
      theory(
        "bio-2022-theory-1", 2022,
        "Describe the structure and function of the mammalian circulatory system, distinguishing between systemic and pulmonary circulation. Explain how the structure of blood vessels relates to their function.",
        "The mammalian circulatory system is a closed, double circulatory system. Pulmonary circulation: right ventricle pumps deoxygenated blood via pulmonary arteries to lungs for gas exchange; oxygenated blood returns via pulmonary veins to left atrium. Systemic circulation: left ventricle pumps oxygenated blood via aorta to all body tissues; deoxygenated blood returns via vena cava to right atrium. Arteries: thick muscular/elastic walls with narrow lumen, withstand high pressure, expand and recoil (elastic arteries) or constrict (muscular arterioles). Capillaries: one-cell-thick endothelium, narrow lumen, large surface area — facilitate diffusion of gases, nutrients, wastes. Veins: thin walls with wider lumen, valves prevent backflow, rely on skeletal muscle pump. Blood pressure: highest in arteries, drops in capillaries, lowest in veins.",
        [
          { point: "Double circulation concept: pulmonary and systemic circuits", marks: 2 },
          { point: "Pulmonary route: right ventricle → lungs → left atrium, gas exchange", marks: 2 },
          { point: "Systemic route: left ventricle → body → right atrium, oxygen delivery", marks: 2 },
          { point: "Artery structure: thick elastic/muscular walls, pressure accommodation", marks: 1.5 },
          { point: "Capillary structure: thin endothelium for diffusion — structure relates to exchange function", marks: 1.5 },
          { point: "Vein structure: thin walls, valves, low pressure — structure relates to return function", marks: 1 },
        ],
        "Transport Systems",
      ),
      theory(
        "bio-2022-theory-2", 2022,
        "Describe the stages of the cell cycle, including the phases of mitosis. Explain how the cell cycle is regulated by cyclins and cyclin-dependent kinases (CDKs), and what happens when regulation fails.",
        "The cell cycle: Interphase (G₁, S, G₂) and M phase (mitosis + cytokinesis). G₁: cell growth, protein synthesis, organelle duplication. S phase: DNA replication (each chromosome becomes two sister chromatids). G₂: further growth, preparation for mitosis. Mitosis: prophase (chromosomes condense, nuclear envelope breaks down, spindle forms), metaphase (chromosomes align at equator, spindle fibers attach to centromeres), anaphase (sister chromatids separate to opposite poles), telophase (nuclei reform, chromosomes decondense). Cytokinesis divides cytoplasm. Regulation: cyclins bind CDKs, activating them to phosphorylate target proteins. Cyclin levels fluctuate: G₁ cyclins trigger G₁/S transition, mitotic cyclins trigger mitosis. CDK-cyclin complexes act at checkpoints: G₁/S checkpoint (checks DNA damage), G₂/M checkpoint (checks DNA replication), M checkpoint (checks spindle attachment). Failure of regulation leads to uncontrolled cell division → cancer. Tumor suppressor proteins (p53, Rb) normally halt cycle if damage detected.",
        [
          { point: "Cell cycle phases: G₁, S, G₂, M with key events in each", marks: 2 },
          { point: "Mitosis stages: prophase, metaphase, anaphase, telophase — key events of each", marks: 2 },
          { point: "Cytokinesis in animal vs. plant cells", marks: 1 },
          { point: "Role of cyclins and CDKs in cell cycle regulation", marks: 2 },
          { point: "Cell cycle checkpoints and their functions", marks: 1.5 },
          { point: "Consequences of failed regulation: cancer, role of p53 and tumor suppressors", marks: 1.5 },
        ],
        "Cell Biology",
      ),
    ],
    practical: [
      practical(
        "bio-2022-prac-1", 2022,
        "Microscopic Examination of Reproductive Structures in Flowering Plants",
        "To examine, draw, and label the reproductive parts of a hibiscus flower, identifying male and female structures.",
        ["Fresh hibiscus flower (or other large flower)", "Scalpel or razor blade", "Forceps", "Dissecting needle", "Hand lens or dissecting microscope", "Glass slide", "Cover slip", "Water dropper", "White tile"],
        "Obtain a hibiscus flower. Carefully remove the sepals and petals. Identify the male structures (stamens): filaments with anthers at tips. Cut an open anther and squash onto a slide with water — observe pollen grains under microscope. Identify the female structure (pistil): stigma (sticky top), style (stalk), ovary (base). Cut the ovary crosswise and observe ovules inside. Draw each structure separately. Record observations in a table.",
        [
          { id: "bio-2022-prac-1-a", text: "Draw and label the male reproductive parts including anther, filament, and pollen grains as seen under the microscope.", answerGuide: "Drawing shows the stamen: filament (stalk) supporting anther (two-lobed structure). Pollen grains appear spherical/oval with textured outer wall (exine). Label: filament, anther, pollen grain, exine." },
          { id: "bio-2022-prac-1-b", text: "Draw the L.S. (longitudinal section) of the pistil showing stigma, style, and ovary. Label the ovules inside the ovary.", answerGuide: "Drawing should show the three regions of the pistil. Stigma at top (lobed, sticky), style (long slender tube), ovary (swollen base with ovules attached to placenta via funicle). Label micropyle, integuments, nucellus of an ovule." },
          { id: "bio-2022-prac-1-c", text: "Explain the function of each reproductive structure you have drawn in relation to pollination and fertilization.", answerGuide: "Anther produces pollen (male gametophyte). Stigma receives pollen. Pollen tube grows through style to ovary. Ovule contains female gametophyte. After fertilization, ovule becomes seed, ovary becomes fruit. Each structure plays a specific role in sexual reproduction." },
        ],
        "Reproduction",
      ),
    ],
  },

  2023: {
    objective: [
      obj(
        "bio-2023-obj-1", 2023,
        "The primary product of the light-independent reactions (Calvin cycle) that can be used to synthesize glucose is:",
        [
          { label: "A", text: "RuBP" },
          { label: "B", text: "Glyceraldehyde-3-phosphate (G3P)" },
          { label: "C", text: "Ribulose-1,5-bisphosphate" },
          { label: "D", text: "Phosphoglyceric acid (PGA)" },
        ],
        "B",
        "The Calvin cycle produces G3P (glyceraldehyde-3-phosphate), a 3-carbon sugar. Two G3P molecules are needed to form one glucose (6C). G3P is also used to regenerate RuBP (the CO₂ acceptor). PGA (3-phosphoglycerate) is the first stable intermediate.",
        "medium",
        "Photosynthesis",
      ),
      obj(
        "bio-2023-obj-2", 2023,
        "During strenuous exercise when oxygen is limited, human muscle cells produce:",
        [
          { label: "A", text: "Ethanol and CO₂" },
          { label: "B", text: "Lactic acid" },
          { label: "C", text: "Acetyl-CoA" },
          { label: "D", text: "Citric acid" },
        ],
        "B",
        "Under anaerobic conditions, muscle cells convert pyruvate to lactate (lactic acid) via lactate dehydrogenase. This regenerates NAD⁺ from NADH, allowing glycolysis to continue producing ATP. Lactate accumulation causes muscle fatigue and soreness.",
        "easy",
        "Respiration",
      ),
      obj(
        "bio-2023-obj-3", 2023,
        "Which of the following is a characteristic feature of organisms in the Kingdom Plantae?",
        [
          { label: "A", text: "Heterotrophic nutrition" },
          { label: "B", text: "Cell walls made of chitin" },
          { label: "C", text: "Autotrophic nutrition via photosynthesis" },
          { label: "D", text: "Motile at some life stage" },
        ],
        "C",
        "Plants are autotrophic, using chlorophyll-containing chloroplasts for photosynthesis. They have cellulose cell walls (not chitin — that's fungi). Most are non-motile. Kingdom Plantae includes bryophytes, ferns, gymnosperms, and angiosperms.",
        "easy",
        "Classification",
      ),
    ],
    theory: [
      theory(
        "bio-2023-theory-1", 2023,
        "Describe the structure and replication of DNA. Explain the role of DNA polymerase, helicase, and DNA ligase in semi-conservative replication.",
        "DNA replication is semi-conservative: each new DNA molecule has one original strand and one newly synthesized strand. Helicase unwinds the double helix by breaking hydrogen bonds, creating a replication fork. Single-strand binding proteins stabilize unwound strands. Topoisomerase relieves supercoiling. DNA polymerase III adds complementary nucleotides in the 5'→3' direction. Leading strand: synthesized continuously toward the fork. Lagging strand: synthesized discontinuously away from fork as Okazaki fragments. Primase synthesizes RNA primers to initiate each fragment. DNA polymerase I removes RNA primers and fills gaps. DNA ligase seals nicks between Okazaki fragments. Proofreading: DNA polymerase has 3'→5' exonuclease activity, correcting mismatches. This ensures high fidelity (∼1 error per 10⁹ base pairs). Replication occurs at multiple origins in eukaryotes, one origin in prokaryotes.",
        [
          { point: "Semi-conservative replication: each daughter has one original and one new strand", marks: 2 },
          { point: "Helicase, SSB proteins, topoisomerase function at replication fork", marks: 2 },
          { point: "Leading strand: continuous synthesis in 5'→3' direction", marks: 1.5 },
          { point: "Lagging strand: Okazaki fragments, role of primase", marks: 1.5 },
          { point: "DNA polymerase: 5'→3' synthesis and proofreading (3'→5' exonuclease)", marks: 1.5 },
          { point: "DNA ligase: sealing Okazaki fragments", marks: 1 },
          { point: "Overall: energy source (dNTPs), origins of replication", marks: 0.5 },
          { point: "Fidelity: error rate and repair mechanisms", marks: 0.5 },
        ],
        "Genetics",
      ),
      theory(
        "bio-2023-theory-2", 2023,
        "Explain the concept of ecological succession. Describe the differences between primary and secondary succession, using specific examples of each.",
        "Ecological succession is the gradual, directional change in community composition over time. Primary succession occurs on barren surfaces with no soil (e.g., bare rock after glacial retreat, new volcanic island). Pioneer species (lichens, mosses) colonize, weathering rock and forming soil. This is followed by herbaceous plants, then shrubs, then pioneer trees, eventually climax community (stable, self-perpetuating). Example: succession on Krakatoa after 1883 eruption. Secondary succession occurs on sites where soil remains after disturbance (e.g., abandoned farmland, forest after fire). Faster because soil and seed bank exist. Example: old-field succession: annual weeds → perennial grasses → shrubs → pioneer trees (pines) → climax hardwood forest. Factors affecting succession: climate, soil type, seed availability, disturbance frequency. Modern ecology recognizes multiple stable states and disturbance-dependent communities rather than single inevitable climax.",
        [
          { point: "Definition of ecological succession as directional community change", marks: 1.5 },
          { point: "Primary succession: no soil, pioneer species, gradual soil formation, timescale", marks: 2.5 },
          { point: "Example of primary succession (volcanic island, glacial retreat)", marks: 1.5 },
          { point: "Secondary succession: existing soil, faster process, role of seed bank", marks: 2.5 },
          { point: "Example of secondary succession (abandoned farmland, forest fire)", marks: 1.5 },
          { point: "Concept of climax community and modern modifications", marks: 0.5 },
        ],
        "Ecology",
      ),
    ],
    practical: [
      practical(
        "bio-2023-prac-1", 2023,
        "Investigation of the Effect of pH on Enzyme Activity",
        "To determine the effect of pH on the rate of amylase activity in breaking down starch, using iodine solution to detect starch disappearance.",
        ["Amylase solution (1%)", "Starch solution (1%)", "Buffer solutions: pH 3, 5, 7, 9, 11", "Iodine solution (IKI)", "Test tubes and rack", "Water bath (37°C)", "Pipettes (1 cm³, 5 cm³)", "Stopwatch", "White tile (for spot tests)", "Marker pen"],
        "Label 5 test tubes with pH values. Add 2 cm³ of appropriate buffer and 2 cm³ starch solution to each. Place in 37°C water bath. Add 1 cm³ amylase to each tube, start stopwatch. At 30-second intervals, remove a drop from each tube and test with iodine on a white tile. Record time when blue-black color no longer appears (starch fully digested). Plot a graph of time for starch digestion against pH.",
        [
          { id: "bio-2023-prac-1-a", text: "Tabulate your results showing pH, time for starch disappearance, and note any observations at each pH.", answerGuide: "Table: pH 3-11, time in seconds for complete starch digestion. Fastest time at optimum pH (~7 for salivary amylase). At extreme pH, starch may not be fully digested within observation period." },
          { id: "bio-2023-prac-1-b", text: "Plot a graph of time for starch digestion against pH and determine the optimum pH for amylase activity.", answerGuide: "Graph: time (s) on y-axis, pH on x-axis. Low point on curve = optimum pH. Salivary amylase ~pH 7. Curve rises sharply on both sides of optimum." },
          { id: "bio-2023-prac-1-c", text: "Explain the effect of pH on enzyme activity with reference to enzyme structure and the ionization of active site amino acids.", answerGuide: "Enzymes have optimal pH where active site amino acids have correct ionization state for substrate binding and catalysis. H⁺ and OH⁻ concentrations affect charges on R-groups, altering hydrogen bonds, ionic interactions, and tertiary structure. Extreme pH denatures the enzyme by disrupting these interactions." },
        ],
        "Enzymes",
      ),
    ],
  },

  2024: {
    objective: [
      obj(
        "bio-2024-obj-1", 2024,
        "The theory of punctuated equilibrium proposed by Eldredge and Gould suggests that:",
        [
          { label: "A", text: "Evolution occurs gradually over long periods" },
          { label: "B", text: "Species remain stable for long periods punctuated by rapid change" },
          { label: "C", text: "Evolution is driven primarily by genetic drift" },
          { label: "D", text: "All evolutionary change is adaptive" },
        ],
        "B",
        "Punctuated equilibrium proposes that species experience long periods of stasis (little change) interrupted by brief periods of rapid speciation, often associated with environmental change or isolation. This contrasts with gradualism (continuous slow change).",
        "medium",
        "Evolution",
      ),
      obj(
        "bio-2024-obj-2", 2024,
        "In the human ear, the structure responsible for detecting sound vibrations and converting them into electrical signals is the:",
        [
          { label: "A", text: "Tympanic membrane" },
          { label: "B", text: "Ossicles (malleus, incus, stapes)" },
          { label: "C", text: "Organ of Corti (spiral organ)" },
          { label: "D", text: "Semicircular canals" },
        ],
        "C",
        "The organ of Corti in the cochlea contains hair cells (mechanoreceptors) that convert sound vibrations into nerve impulses. The tympanic membrane (eardrum) vibrates, ossicles amplify and transmit vibrations to oval window, but transduction occurs in the organ of Corti.",
        "medium",
        "Physiology",
      ),
      obj(
        "bio-2024-obj-3", 2024,
        "Which of the following transport processes requires the direct input of ATP?",
        [
          { label: "A", text: "Diffusion of oxygen across alveolar membranes" },
          { label: "B", text: "Facilitated diffusion of glucose into red blood cells" },
          { label: "C", text: "Active transport of Na⁺ ions via the Na⁺/K⁺ pump" },
          { label: "D", text: "Osmosis of water through aquaporins" },
        ],
        "C",
        "The Na⁺/K⁺ pump is an active transport mechanism that uses ATP to move 3 Na⁺ out and 2 K⁺ into the cell against their concentration gradients. Diffusion, facilitated diffusion, and osmosis are passive processes requiring no ATP.",
        "medium",
        "Transport Systems",
      ),
    ],
    theory: [
      theory(
        "bio-2024-theory-1", 2024,
        "Compare and contrast the processes of mitosis and meiosis. Explain the significance of each type of cell division in living organisms.",
        "Mitosis: one division producing two genetically identical diploid daughter cells. Phases: prophase, metaphase, anaphase, telophase. No crossing over. Sister chromatids separate in anaphase. Significance: growth, repair, asexual reproduction, maintaining chromosome number. Meiosis: two divisions (meiosis I and II) producing four genetically unique haploid daughter cells. Meiosis I: homologous chromosomes pair (synapsis), crossing over occurs in prophase I, homologous chromosomes separate in anaphase I (reduction division). Meiosis II: sister chromatids separate (equational division). Significance: genetic variation (crossing over + independent assortment), halving chromosome number for sexual reproduction. Mitosis maintains genetic stability; meiosis generates genetic diversity. Mitosis occurs in somatic cells; meiosis occurs in germ cells. Mitosis produces cells for growth/repair; meiosis produces gametes.",
        [
          { point: "Mitosis: one division, 2 identical diploid daughter cells, somatic cells", marks: 2 },
          { point: "Meiosis: two divisions, 4 non-identical haploid daughter cells, germ cells", marks: 2 },
          { point: "Meiosis I: synapsis, crossing over, homologous chromosome separation (reduction)", marks: 2 },
          { point: "Meiosis II: sister chromatid separation (equational)", marks: 1 },
          { point: "Genetic variation mechanisms: crossing over and independent assortment in meiosis I", marks: 1.5 },
          { point: "Significance: mitosis for growth/repair, meiosis for gamete formation and genetic diversity", marks: 1.5 },
        ],
        "Reproduction",
      ),
      theory(
        "bio-2024-theory-2", 2024,
        "Explain how the structure of the leaf is adapted for photosynthesis. Include the roles of the epidermis, mesophyll, stomata, and vascular bundles.",
        "Leaf structure is highly adapted for photosynthesis. Upper epidermis: transparent cells allow light penetration; cuticle (waxy waterproof layer) reduces water loss. Palisade mesophyll: elongated cells packed with chloroplasts, arranged perpendicular to leaf surface to maximize light absorption — the main photosynthetic tissue. Spongy mesophyll: irregular cells with large air spaces for gas circulation (CO₂ diffusion to cells, O₂ removal). Stomata (guard cells): pores regulating gas exchange (CO₂ in, O₂ out) and transpiration; guard cells control opening/closing based on turgor. Vascular bundles (veins): xylem transports water and minerals to photosynthetic cells; phloem transports sucrose (photosynthate) to rest of plant. Large surface area: thin, flat blade maximizes light capture and minimizes diffusion distances. Leaf arrangement: often alternate to reduce self-shading. All these features maximize photosynthetic efficiency.",
        [
          { point: "Upper epidermis and cuticle: light transmission and water conservation", marks: 2 },
          { point: "Palisade mesophyll: main photosynthetic tissue, chloroplast arrangement, light absorption", marks: 2 },
          { point: "Spongy mesophyll: air spaces for gas exchange and circulation", marks: 1.5 },
          { point: "Stomata and guard cells: CO₂ entry, O₂ exit, transpiration control", marks: 2 },
          { point: "Vascular bundles: xylem (water/minerals) and phloem (sucrose transport)", marks: 1.5 },
          { point: "Overall shape: large surface area, thin blade, minimized diffusion distance", marks: 1 },
        ],
        "Photosynthesis",
      ),
    ],
    practical: [
      practical(
        "bio-2024-prac-1", 2024,
        "Genetic Study of Human Traits: PTC Tasting and Earlobe Attachment",
        "To investigate the inheritance patterns of human genetic traits (PTC tasting and earlobe attachment) within a class population, calculating phenotype and allele frequencies.",
        ["PTC (phenylthiocarbamide) test paper", "Mirror (for observing earlobes)", "Notebook and pencil", "Calculator", "Data recording sheet"],
        "Test each individual for PTC tasting ability (dominant: taster, recessive: non-taster). Observe and record earlobe type: free earlobes (dominant) vs. attached earlobes (recessive). Record data anonymously for the class. Calculate: phenotype frequency = (number with phenotype / total individuals) × 100. Use Hardy-Weinberg equation to estimate allele frequencies: p² + 2pq + q² = 1, where p = frequency of dominant allele, q = frequency of recessive allele. For a recessive trait, q² = frequency of recessive phenotype, so q = √q² and p = 1 − q.",
        [
          { id: "bio-2024-prac-1-a", text: "Construct a table showing the number and percentage of individuals for each phenotype of the two traits.", answerGuide: "Table with trait as rows: PTC tasting (taster/non-taster) and earlobe (free/attached). Include count and percentage for each. Record total sample size at bottom." },
          { id: "bio-2024-prac-1-b", text: "Use the Hardy-Weinberg equation to calculate the allele frequencies for PTC tasting in your population sample.", answerGuide: "Show working: q² = (non-tasters / total). q = √q². p = 1 − q. Then calculate p² (homozygous dominant), 2pq (heterozygous), q² (homozygous recessive). Example: if 36% non-tasters, q = 0.6, p = 0.4." },
          { id: "bio-2024-prac-1-c", text: "What assumptions must be met for the Hardy-Weinberg equilibrium to apply? Discuss whether your sample likely meets these assumptions.", answerGuide: "Assumptions: large population size, random mating, no mutation, no migration (gene flow), no natural selection. Discuss which assumptions are violated in a classroom sample: small population, non-random mating, possible selection against certain traits." },
        ],
        "Genetics",
      ),
    ],
  },

  2025: {
    objective: [
      obj(
        "bio-2025-obj-1", 2025,
        "The molecule that serves as the primary energy storage form in living organisms, with high-energy bonds between phosphate groups, is:",
        [
          { label: "A", text: "Glucose" },
          { label: "B", text: "Adenosine triphosphate (ATP)" },
          { label: "C", text: "Nicotinamide adenine dinucleotide (NADH)" },
          { label: "D", text: "Glycogen" },
        ],
        "B",
        "ATP contains three phosphate groups with high-energy phosphoanhydride bonds. Hydrolysis of ATP to ADP + Pi releases ~30.5 kJ/mol, driving endergonic reactions. Glucose and glycogen store energy for longer-term use; NADH is an electron carrier, not a direct energy currency.",
        "easy",
        "Biochemistry",
      ),
      obj(
        "bio-2025-obj-2", 2025,
        "Which of the following cellular structures is the primary site of aerobic respiration in eukaryotic cells?",
        [
          { label: "A", text: "Chloroplast" },
          { label: "B", text: "Nucleus" },
          { label: "C", text: "Mitochondrion" },
          { label: "D", text: "Ribosome" },
        ],
        "C",
        "Mitochondria are the sites of aerobic respiration. The Krebs cycle occurs in the mitochondrial matrix, and the electron transport chain/oxidative phosphorylation occurs on the inner mitochondrial membrane. Mitochondria are often called the 'powerhouses of the cell.'",
        "easy",
        "Cell Biology",
      ),
      obj(
        "bio-2025-obj-3", 2025,
        "The relationship where one organism benefits and the other is neither helped nor harmed is called:",
        [
          { label: "A", text: "Mutualism" },
          { label: "B", text: "Parasitism" },
          { label: "C", text: "Commensalism" },
          { label: "D", text: "Competition" },
        ],
        "C",
        "Commensalism is a symbiotic relationship where one species benefits and the other is unaffected (e.g., barnacles on whales). Mutualism: both benefit. Parasitism: one benefits, one is harmed. Competition: both are harmed by resource limitation.",
        "easy",
        "Ecology",
      ),
    ],
    theory: [
      theory(
        "bio-2025-theory-1", 2025,
        "Describe the process of aerobic respiration in detail, from glucose to ATP production. Include the location, substrate inputs, and products of each major stage.",
        "Stage 1 — Glycolysis (cytoplasm): Glucose (6C) → 2 pyruvate (3C). Net gain: 2 ATP (substrate-level phosphorylation), 2 NADH. No O₂ required. Stage 2 — Link reaction (mitochondrial matrix): Each pyruvate is oxidatively decarboxylated to acetyl-CoA, producing 1 NADH and 1 CO₂ per pyruvate (×2 = 2 NADH, 2 CO₂). Stage 3 — Krebs cycle (matrix): Acetyl-CoA (2C) + oxaloacetate (4C) → citrate (6C) → series of reactions regenerating oxaloacetate. Per cycle: 3 NADH, 1 FADH₂, 1 ATP (GTP), 2 CO₂. ×2 per glucose: 6 NADH, 2 FADH₂, 2 ATP, 4 CO₂. Stage 4 — Electron transport chain (inner mitochondrial membrane): NADH and FADH₂ donate electrons to complexes I-IV. Electrons pass through carriers, pumping H⁺ across inner membrane. O₂ accepts electrons (forming H₂O). H⁺ flows back through ATP synthase: chemiosmosis produces ~34 ATP. Total: ~36-38 ATP per glucose.",
        [
          { point: "Glycolysis: cytoplasmic, glucose → pyruvate, 2 ATP + 2 NADH net", marks: 2 },
          { point: "Link reaction: pyruvate → acetyl-CoA, occurs in matrix, produces NADH + CO₂", marks: 1.5 },
          { point: "Krebs cycle: matrix, acetyl-CoA oxidation, NADH/FADH₂/ATP/CO₂ production", marks: 2.5 },
          { point: "Electron transport chain: inner membrane, electron carriers, proton gradient", marks: 2 },
          { point: "Chemiosmosis: ATP synthase, oxidative phosphorylation, total ATP yield calculation", marks: 2 },
        ],
        "Respiration",
      ),
      theory(
        "bio-2025-theory-2", 2025,
        "Outline the Linnaean system of classification. Discuss the characteristics of the five major kingdoms (Monera, Protista, Fungi, Plantae, Animalia) and modern revisions including the three-domain system.",
        "Linnaean system: hierarchical classification from broadest to most specific — Kingdom, Phylum, Class, Order, Family, Genus, Species. Binomial nomenclature: Genus species (italicized or underlined). Five Kingdom system (Whittaker, 1969): Monera: prokaryotic, unicellular, no membrane-bound organelles, cell wall of peptidoglycan (bacteria). Protista: eukaryotic, mostly unicellular, diverse (algae, protozoa). Fungi: eukaryotic, heterotrophic (absorption), chitin cell walls, multicellular (mushrooms, molds). Plantae: eukaryotic, autotrophic (photosynthesis), cellulose cell walls, multicellular. Animalia: eukaryotic, heterotrophic (ingestion), no cell walls, multicellular, motile. Modern revision: three-domain system (Woese, 1990) based on rRNA sequencing: Bacteria (true bacteria), Archaea (extremophiles, distinct biochemistry), Eukarya (protists, fungi, plants, animals). Archaea are more closely related to Eukarya than Bacteria. This reflects phylogenetic relationships more accurately.",
        [
          { point: "Linnaean hierarchy with correct rank sequence and binomial nomenclature", marks: 1.5 },
          { point: "Kingdom Monera: prokaryotic, unicellular, peptidoglycan cell wall", marks: 1 },
          { point: "Kingdom Protista: eukaryotic, unicellular/simple multicellular, diverse nutrition", marks: 1 },
          { point: "Kingdom Fungi: eukaryotic, heterotrophic by absorption, chitin wall, hyphae", marks: 1.5 },
          { point: "Kingdom Plantae: autotrophic, cellulose wall, alternation of generations", marks: 1.5 },
          { point: "Kingdom Animalia: heterotrophic by ingestion, no cell wall, tissues/organs", marks: 1.5 },
          { point: "Three-domain system: Bacteria, Archaea, Eukarya — molecular basis and relationships", marks: 2 },
        ],
        "Classification",
      ),
    ],
    practical: [
      practical(
        "bio-2025-prac-1", 2025,
        "Examination of the Transport System in Plants — Stems and Roots",
        "To observe and compare the arrangement of vascular bundles in monocot and dicot plant stems through microscopic examination.",
        ["Microscope", "Prepared slides: monocot stem (maize) T.S., dicot stem (sunflower) T.S., dicot root (buttercup) T.S.", "Hand lens", "White paper", "Pencil and colored pencils"],
        "Examine each prepared slide under low power (×100). Draw the entire cross-section for each specimen. For dicot stem: note ring arrangement of vascular bundles, large pith, cambium between xylem and phloem. For monocot stem: note scattered vascular bundles, no cambium. For dicot root: note radial arrangement of xylem and phloem, endodermis, pericycle. For each, identify and label: epidermis, cortex, pith, xylem (toward center), phloem (toward outside), vascular cambium (if present). Compare the arrangements in a table.",
        [
          { id: "bio-2025-prac-1-a", text: "Draw and label the T.S. of the dicot stem and monocot stem, showing the arrangement of vascular bundles.", answerGuide: "Dicot: circular outline, vascular bundles in a ring (eustele), large central pith, xylem toward pith, phloem outward, cambium between. Monocot: scattered vascular bundles (atactostele), no distinct pith/cortex boundary, no cambium. Label all tissues." },
          { id: "bio-2025-prac-1-b", text: "Draw and label the T.S. of the dicot root, showing the radial arrangement of vascular tissues.", answerGuide: "Circular outline, central stele with xylem arms (star-shaped, typically 4-6 arms), phloem patches between xylem arms, pericycle surrounding stele, endodermis with Casparian strip, cortex, epidermis." },
          { id: "bio-2025-prac-1-c", text: "Explain the functional significance of the different vascular arrangements in monocots and dicots.", answerGuide: "Dicot ring arrangement allows secondary growth (cambium produces secondary xylem/phloem, enabling increased girth). Monocot scattered bundles provide flexibility and strength but no secondary growth — explains why monocots (palms, grasses) don't increase in girth. Root radial arrangement allows efficient water uptake via shortest path from epidermis to xylem." },
        ],
        "Transport Systems",
      ),
    ],
  },
};

export function getBiologyQuestions(year: number): { objective: StudyQuestion[]; theory: StudyQuestion[]; practical: StudyQuestion[] } {
  const data = biologyData[year];
  if (!data) {
    return { objective: [], theory: [], practical: [] };
  }
  return {
    objective: data.objective,
    theory: data.theory,
    practical: data.practical,
  };
}
