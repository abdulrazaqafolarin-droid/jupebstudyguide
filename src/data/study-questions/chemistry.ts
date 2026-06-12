import type { StudyQuestion } from "@/types/study-questions";
import type { Subject } from "@/types/question";

const chemistryQuestions: StudyQuestion[] = [
// === 2014 CHEMISTRY ===
    {
      id: "che-2014-obj-0001",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "The equilibrium constant Keq = 0.040 for the system PCl₅(g) → PCl₃(g) + Cl₂(g). Evaluate Kp for the reaction at 450°",
      options: [
        { label: "A", text: "0.40" },
        { label: "B", text: "0.64" },
        { label: "C", text: "2.4" },
        { label: "D", text: "0.052" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0002",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "What is the conjugate acid of OH⁻?",
      options: [
        { label: "A", text: "It does not have a conjugate acid" },
        { label: "B", text: "H₂O" },
        { label: "C", text: "H₃O⁺" },
        { label: "D", text: "O²⁻" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0003",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Given Kb for ammonia, NH₃ is 1.8 x 10⁻⁵ and that of hydroxylamine, NH₂OH is 1.1 x 10⁻⁸, which of the following is true?",
      options: [
        { label: "A", text: "Ammonia is a stronger base" },
        { label: "B", text: "Hydroxylamine is a stronger base" },
        { label: "C", text: "Ammonia and Hydroxylamine have equal strength" },
        { label: "D", text: "Their relative strengths cannot be determined" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0004",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "The addition of a common ion to an equilibrium:",
      options: [
        { label: "A", text: "increase the degree of ionization of the substance" },
        { label: "B", text: "Reduce the degree of ionization of the substance" },
        { label: "C", text: "Make the solution a better buffer" },
        { label: "D", text: "None of the above" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0005",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "List the following atoms in order of decreasing electronegativity: Cl, K, Cu",
      options: [
        { label: "A", text: "Cu > Cl > K" },
        { label: "B", text: "K > Cu > Cl" },
        { label: "C", text: "Cl > Cu > K" },
        { label: "D", text: "Cu > K > Cl" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0007",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "How many atoms of Cu are there in 34.5 g of Cu?\n[Cu = 63.5; NA = 6.0 x 10²³]",
      options: [
        { label: "A", text: "3.4 x 10²³ atoms" },
        { label: "B", text: "6.0 x 10²³ atoms" },
        { label: "C", text: "12.04 x 10²³ atoms" },
        { label: "D", text: "3.4 x 10²⁴ atoms" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0008",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Which of the following statements is correct for an electron that has the quantum numbers n = 4 and ml = -2?",
      options: [
        { label: "A", text: "The electron may be in a p-orbital" },
        { label: "B", text: "The electron may be in a d-orbital" },
        { label: "C", text: "The electron must have a spin quantum number, ms = +½" },
        { label: "D", text: "The electron is in second principal shell" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0009",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "The e.m.f. of a simple cell is 1.5 V under standard conditions. The following standard electrode potentials are given. (The letters are not the usual symbols of the elements concerned).\n\n| | |\n|--|--|\n| L⁺/L | -1.8 V |\n| M²⁺/M | +0.3 V |\n| W⁺/W | -0.3 V |\n| X²⁺/X | -0.3 V |",
      options: [
        { label: "A", text: "L and M" },
        { label: "B", text: "L and X" },
        { label: "C", text: "M and W" },
        { label: "D", text: "M and X" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0010",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "What were the two electrodes of the cell?\nA current of 8 A was passed for 100 minutes through molten aluminium oxide using inert electrodes. What would be the approximate volume of gas liberated, measured at s.t.p.?",
      options: [
        { label: "A", text: "5.6 dm³" },
        { label: "B", text: "2.8 dm³" },
        { label: "C", text: "8.4 dm³" },
        { label: "D", text: "11.2 dm³" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0011",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Which theory postulated that the electrons in an atom revolve about the nucleus in a circular orbit?",
      options: [
        { label: "A", text: "Rutherford's theory" },
        { label: "B", text: "Bohr's theory" },
        { label: "C", text: "Dalton's theory" },
        { label: "D", text: "Thompson's theory" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0012",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "The rate of formation of O₃(g) is 2.0 x 10⁷ mol L⁻¹s⁻¹. What is the rate of disappearance of O₂(g) in mol L⁻¹s⁻¹ for the reaction 3O₂(g) →",
      options: [
        { label: "A", text: "2.0 x 10⁷" },
        { label: "B", text: "2.0 x 10⁷" },
        { label: "C", text: "3.0 x 10⁻⁷" },
        { label: "D", text: "4.5 x 10⁻⁷" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0013",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "The following data were obtained for a reaction at constant concentration while temperature is changed.\nRate constant (moldm⁻³s⁻¹): 1.5\nTemp: 20°C 30°C\nThe activation energy for the reaction in kJmol⁻¹ is",
      options: [
        { label: "A", text: "1.3 x 10⁻⁷" },
        { label: "B", text: "2.0 x 10⁻⁷" },
        { label: "C", text: "3.0 x 10⁻⁷" },
        { label: "D", text: "(2.4)" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0014",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "A radioactive element has an initial count rate of 1200 cpm measured by a scalar and falls to 150 cpm after 15 hours. Calculate the half-life of the radioactive element.",
      options: [
        { label: "A", text: "5 Hrs" },
        { label: "B", text: "10 Hrs" },
        { label: "C", text: "2Hrs" },
        { label: "D", text: "7 Hrs" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0015",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Calculate the molar mass of a solution given that 35.0 g of the solute in 1.00 dm³ has an osmotic pressure of 5.15 x 10⁵ Nm⁻² at 20°",
      options: [
        { label: "A", text: "0.211 g/mol" },
        { label: "B", text: "11.3 g/mol" },
        { label: "C", text: "16.6 g/mol" },
        { label: "D", text: "166 g/mol" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0016",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "At a constant temperature, which of the following molecules has an average velocity closest to that of ethylene, C₂H₄, at the same temperature?",
      options: [
        { label: "A", text: "N₂" },
        { label: "B", text: "CO₂" },
        { label: "C", text: "NO₂" },
        { label: "D", text: "O₂" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0017",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "A mixture of the gases neon and krypton are in a 2.0 L container. The partial pressure of the neon is 0.40 atm and the partial pressure of the krypton is 1.20 atm. What is the mole fraction of neon?",
      options: [
        { label: "A", text: "0.20" },
        { label: "B", text: "0.25" },
        { label: "C", text: "0.60" },
        { label: "D", text: "0.80" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0018",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "What type of intermolecular forces holds liquid N₂ together?",
      options: [
        { label: "A", text: "Covalent bonding" },
        { label: "B", text: "London forces" },
        { label: "C", text: "hydrogen bonding" },
        { label: "D", text: "Dipole-dipole interaction" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0019",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "The neutral atom of BrF₅ has ……… bond pairs of electrons and ………… non-bonding pairs of electrons.\n\n| | Bonding | Nonbonding |\n|--|---------|------------|\n|",
      options: [
        { label: "A", text: "| 1 | 5 |\n|" },
        { label: "B", text: "| 0 | 5 |\n|" },
        { label: "C", text: "| 5 | 1 |\n|" },
        { label: "D", text: "| 5 | 0 |" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0020",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "What are assumptions of kinetic theory of gases and hence, of the ideal gas equation, PV = nRT?\nI. Molecules move without interacting with one another except for collisions.\nII. Intermolecular forces are negligible\nIII. Intermolecular distances are much greater than the molecular size.",
      options: [
        { label: "A", text: "I, II and III are correct" },
        { label: "B", text: "I and II only are correct" },
        { label: "C", text: "II and III only are correct" },
        { label: "D", text: "I only is correct" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0021",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "A student borrowed a friend's chemistry notes and copied out the notes. From the Chemistry note, which of the following statements is/are correct? A gas behaves less like an ideal gas when the gas\nI. is at low pressure II. is at low temperature III. can be easily liquefied",
      options: [
        { label: "A", text: "I, II and III" },
        { label: "B", text: "I and II only" },
        { label: "C", text: "II and III only" },
        { label: "D", text: "I only" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0022",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Beryllium shows a diagonal relationship with",
      options: [
        { label: "A", text: "Magnesium" },
        { label: "B", text: "Boron" },
        { label: "C", text: "Aluminium" },
        { label: "D", text: "Sodium" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0023",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Metal carbonates decompose on heating to give metal oxides and carbon dioxide. Which of the following metal carbonates is most stable thermally?",
      options: [
        { label: "A", text: "MgCO₃" },
        { label: "B", text: "CaCO₃" },
        { label: "C", text: "SrCO₃" },
        { label: "D", text: "BaCO₃" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0024",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "A substance which gives brick red flame and breaks down on heating to give oxygen and a brown gas is",
      options: [
        { label: "A", text: "Magnesium nitrate" },
        { label: "B", text: "Calcium nitrate" },
        { label: "C", text: "Barium nitrate" },
        { label: "D", text: "Strontium nitrate" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0025",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Which compound is expected to be diamagnetic?",
      options: [
        { label: "A", text: "ZnCl₂" },
        { label: "B", text: "FeCl₃" },
        { label: "C", text: "CuCl₂" },
        { label: "D", text: "VCl₃" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0026",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "What is the coordination number and oxidation state of the central atom in [PtCl₂(en)₂]?",
      options: [
        { label: "A", text: "2 and 0" },
        { label: "B", text: "4 and 0" },
        { label: "C", text: "3 and 0" },
        { label: "D", text: "4 and +2" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0027",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "The IUPAC name for [Co(NH₃)₆]²⁺ is",
      options: [
        { label: "A", text: "Hexaammine cobaltate (II) ion" },
        { label: "B", text: "Hexaammonia cobaltate (II) ion" },
        { label: "C", text: "Hexaammonia cobalte (II) ion" },
        { label: "D", text: "Hexaammine cobalt (II) ion" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0028",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Which of the following is not a greenhouse gas?",
      options: [
        { label: "A", text: "CFC" },
        { label: "B", text: "SO₂" },
        { label: "C", text: "H₂O" },
        { label: "D", text: "CH₄" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0029",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Diamond is hard due to the",
      options: [
        { label: "A", text: "polymerization of the benzene type ring" },
        { label: "B", text: "interlocking of strong covalent bonds" },
        { label: "C", text: "delocalization of electrons" },
        { label: "D", text: "free electrons" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0030",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "The decreasing order of electron affinity for the halogens is",
      options: [
        { label: "A", text: "F < Cl < Br < I" },
        { label: "B", text: "Cl > F > Br > I" },
        { label: "C", text: "I > Br > Cl > F" },
        { label: "D", text: "I > Br > Cl > I" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0031",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Polysaccharides are made up of",
      options: [
        { label: "A", text: "thousands of units of acids linked by glycosidic linkage" },
        { label: "B", text: "thousands of units of amino acids linked by peptide bonds" },
        { label: "C", text: "thousands of units of monosaccharide linked by glycosidic bonds" },
        { label: "D", text: "thousands of units of glucose linked by glycosidic bonds" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0032",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Isomerization is the phenomenon of:",
      options: [
        { label: "A", text: "Existence of molecules with the same composition but different structures" },
        { label: "B", text: "Molecules absorbing all lights" },
        { label: "C", text: "Molecules with the same molecular mass" },
        { label: "D", text: "Molecules differing in one segment constituted by one atom of carbon and two atoms of hydrogen" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0033",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Oils are:",
      options: [
        { label: "A", text: "esters of glycerol and unsaturated fatty acids" },
        { label: "B", text: "esters of superior alcohols and saturated fatty acids" },
        { label: "C", text: "esters of superior alcohols and unsaturated fatty acids" },
        { label: "D", text: "esters of glycerol and saturated fatty acids" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0034",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "What class of compound is produced in the following reaction?\nCH₃CHCH₂CH₃ (with OH group) + Na₂Cr₂O₇/H₂SO₄ →",
      options: [
        { label: "A", text: "Alcohols" },
        { label: "B", text: "Carboxylic acids" },
        { label: "C", text: "Aldehydes" },
        { label: "D", text: "Ketones" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0035",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Alkynes react with water in the presence of a catalyst to give",
      options: [
        { label: "A", text: "a diol" },
        { label: "B", text: "an alkane" },
        { label: "C", text: "an enol" },
        { label: "D", text: "an alkoxy alkane" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0037",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Which of the following compounds will show a geometrical isomerism?",
      options: [
        { label: "A", text: "Pentanone bromide" },
        { label: "B", text: "ethyl bromopropanone" },
        { label: "C", text: "2-pentyne" },
        { label: "D", text: "1-bromo pentan-3-one" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0038",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Which of the following will likely give only one product when dehydrated?",
      options: [
        { label: "A", text: "1-butane" },
        { label: "B", text: "2-butene" },
        { label: "C", text: "2-pentyne" },
        { label: "D", text: "1,2-dichloropropane" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0039",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Which of the following reagents can be used to differentiate a terminal alkyne from a non-terminal alkyne?",
      options: [
        { label: "A", text: "H₂SO₄" },
        { label: "B", text: "KMnO₄" },
        { label: "C", text: "HBr" },
        { label: "D", text: "CuCl" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0040",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "What are the hybridization of C1, C2 and N in the following molecule (oxime structure shown)?\nC1: sp², C2: sp², N: sp²",
      options: [
        { label: "A", text: "sp², sp², sp²" },
        { label: "B", text: "sp², sp³, sp²" },
        { label: "C", text: "sp², sp², sp³" },
        { label: "D", text: "sp³, sp², sp²" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0041",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "How many unpaired electrons are in Cu²⁺ ion?",
      options: [
        { label: "A", text: "3" },
        { label: "B", text: "1" },
        { label: "C", text: "2" },
        { label: "D", text: "0" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0042",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Polarizing power of cation increases with",
      options: [
        { label: "A", text: "small charge" },
        { label: "B", text: "small charge and large size" },
        { label: "C", text: "high charge and large size" },
        { label: "D", text: "large size" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0043",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "The path of ion after deflection depends on",
      options: [
        { label: "A", text: "only the mass of the ion" },
        { label: "B", text: "neither the charge nor the mass of the ion" },
        { label: "C", text: "both the charge and the mass of the ion" },
        { label: "D", text: "only the charge on the ion" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0044",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "A sample of a nitrogen containing gas is found to contain 2.34 g N and 5.34 g [N = 14; O = 16]. Determine the empirical formula of this substance",
      options: [
        { label: "A", text: "NO" },
        { label: "B", text: "NO₂" },
        { label: "C", text: "N₂O₄" },
        { label: "D", text: "N₂O" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0045",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "What order process is radioactive decay?",
      options: [
        { label: "A", text: "zeroth" },
        { label: "B", text: "first" },
        { label: "C", text: "second" },
        { label: "D", text: "third" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0046",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "The activation energy for a reaction can be determined by measuring the reaction rate at different",
      options: [
        { label: "A", text: "temperatures" },
        { label: "B", text: "catalyst concentrations" },
        { label: "C", text: "reactant concentrations" },
        { label: "D", text: "time of reaction" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0047",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Which law states that the rate of a chemical reaction is proportional to the product of the masses of the reacting substances, with each mass raised to a power equal to the coefficient that occurs in the chemical equation?",
      options: [
        { label: "A", text: "Law of mass action" },
        { label: "B", text: "Law of active mass" },
        { label: "C", text: "Law of reaction" },
        { label: "D", text: "Law of kinetics" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0048",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "When 5 moles of electrons are passed through a molten aluminium salt, what is the maximum mass of aluminium formed at the cathode?",
      options: [
        { label: "A", text: "54 g" },
        { label: "B", text: "16.2 g" },
        { label: "C", text: "45 g" },
        { label: "D", text: "27 g" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0049",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "The enthalpy changes for two reactions are given by the equations below:\n2Fe(s) + 3/2 O₂(g) → Fe₂O₃(s) ΔH = -822 kJmol⁻¹\n2Fe(s) + ½O₂(g) → CO(g); ΔH = -110 kJmol⁻¹\nWhat is the enthalpy change for the following reaction?\n3C(s) + Fe₂O₃(g) → 2Fe(s) + 3CO(g)",
      options: [
        { label: "A", text: "-71.2" },
        { label: "B", text: "-492" },
        { label: "C", text: "+492" },
        { label: "D", text: "+712" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-obj-0050",
      subject: "chemistry",
      year: 2014,
      category: "objective",
      question: "Arrange the following carboxylic acids in increasing order of acidic strength. (Five benzoic acid derivative structures shown: benzoic acid, 2-methylbenzoic acid, 2,6-dinitrobenzoic acid, 2-nitrobenzoic acid, 4-nitrobenzoic acid)",
      options: [
        { label: "A", text: "i, ii, iii, iv, v" },
        { label: "B", text: "ii, i, iii, iv, v" },
        { label: "C", text: "iii, v, iv, i, ii" },
        { label: "D", text: "ii, i, iv, iii, v\n\n---" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2014-t0001",
      subject: "chemistry",
      year: 2014,
      category: "theory",
      question: "CHM 001: Answer One (1) Question from this course\\n\\n**1(a).** The following quantum number contributions are not allowed. Assuming the n and ml values are correct, change the values of l to create an allowed combination.\n(i). n = 3; l = 0; ml = -1\n(ii). n = 3; l = 3; ml = +1\n(iii). n = 7; l = 2; ml = +3\n(iv). n = 4; l = 1; ml = -2\n\n**(b).** Trimethylamine is a gas with a fishy, ammonia-like odour.\n(i). Write equation to show the dissociation of trimethylamine in water.\n(ii). Calculate the base protonation constant for an aqueous solution that is 0.25 M trimethylamine has a pH of 11.63.\n\n**(c).** When a solution of CaCl₂ is added to a solution of dicarboxylic acid, malonic acid, the salt, calcium malonate is precipitated as a white solid. The solid has the following composition by mass: Ca = 28.2%; C = 25.2%; H = 1.4%; O = 45.2%. Calculate the empirical formula of calcium malonate from this data.\n\n**2(a).** Briefly describe the following:\n(i). Absorption spectrum\n(ii). Emission spectrum\n\n**(b).** A buffered solution is made by dissolving 0.10 mole of acetic acid, CH₃COOH and 0.10 mole of sodium acetate, CH₃COONa in 1.00 L. Calculate the pH of this buffer. [pKa for acetic acid = 4.76]\n\n**(c).** What is an activity series and how does it relate to chemical reaction?\n\n---",
      totalMarks: 10,
      difficulty: "hard"
    },
    {
      id: "che-2014-t0002",
      subject: "chemistry",
      year: 2014,
      category: "theory",
      question: "CHM 002: Answer One (1) Question from this course\\n\\n**3(ai).** Name a mineral from which aluminium may be extracted.\n(ii). Describe with the aid of a diagram, the electrolytic extraction of aluminium from purified aluminium oxide. State what the electrodes are made of.\n(iii). Give ionic equations for each of the electrode reaction.\n(iv). What further reaction takes place at the anode?\n(v). State two other industrial applications of electrolysis.\n\n**(b).** A first order reaction is monitored by measuring the concentration of the reactant as a function of time. The initial concentration was 0.2 moldm⁻³. Calculate:\n(i). the reaction rate constant.\n(ii). The rate of change of concentration of the reactant at 24 minutes.\n\n**4(ai).** A flask with a volume of 100 cm³ was first weighed with air filling the flask, and then with another gas, Y, filling the flask. The results, measured at 26°C and 1.00 x 10⁵ Pa are shown:\nMass of flask containing air = 47.930 g\nMass of flask containing Y = 47.982 g\nDensity of air = 0.00118 gcm⁻³\nCalculate the relative molecular mass of Y.\n\n(ii). Calculate the molar mass of a solute given that 85.0 g of the solute in 1.00 dm³ water has an osmotic pressure of 5.15 x 10⁵ Nm⁻² at 20°C.\n(b). Calculate the temperature of an ideal gas in a sealed container falls. State, with reason, what happens to the:\n(i). root mean speed of the gas molecules\n(ii). Pressure of the gas\n\n---",
      totalMarks: 10,
      difficulty: "hard"
    },
    {
      id: "che-2014-t0003",
      subject: "chemistry",
      year: 2014,
      category: "theory",
      question: "CHM 003: Answer One (1) Question from this course\\n\\n**5(ai).** Describe the trend in the thermal stabilities of the carbonates of the Group II elements down the group.\n(ii). Give the equation for the thermal decomposition of magnesium carbonate.\n\n**(b).** The elements in Group II show a variety of trends in the reactivity.\n(i). Explain the trend in reactivity of magnesium, calcium and barium with water.\n(ii). Suggest the equation for the reaction of magnesium with steam.\n(c). Give four (4) structural differences between diamond and graphite.\n**6(a).** Define the term complex ion, ligand and coordination number.\n**(b).** Name the following complex ions:\n(i). [CuCl₄]²⁻ (ii). [Cu(NH₃)₄]²⁺ (iii). [CuCl₄]²⁻ (iv). K₄[Fe(CN)₆] (v). [Cr(H₂O)₆]³⁺\n**(c).** Name three greenhouse gases and mention a source each of the gases.\n\n---",
      totalMarks: 10,
      difficulty: "hard"
    },
    {
      id: "che-2014-t0004",
      subject: "chemistry",
      year: 2014,
      category: "theory",
      question: "CHM 004: Answer One (1) Question from this course\\n\\n**7(a).** Hydrocarbon with molecular formula C₅H₁₀ may be branched chain, straight chain or cyclic.\n(i). Draw a displayed formula of C₅H₁₀ as a branched chain hydrocarbon.\n(ii). Pent-2-ene is a straight chain hydrocarbon with formula C₅H₁₀ and it exhibits cis-trans isomerism. Draw and name the structural formulae of the two cis-trans isomers of pent-2-ene.\n(iii). Draw the structural formulae of two alcohols which would each produced pent-2-ene on dehydration.\n(iv). One of these alcohols exhibits optical isomerism. Draw the structural formulae of the two isomers of this alcohol. Your structure should clearly indicate the three-dimensional nature of the structure.\n(v). Pent-2-ene can be polymerized. Draw the structure of the polymer chain produced showing two repeat units.\n(b). Proteins are formed by the polymerization of amino acids. State the type of chemical reaction used to form these polymer chains.\n(c). The amino acids serine and valine can combine together to form a dipeptide. (Structures of Serine and Valine shown.)\n\n**8(a).** Three organic compounds G, H and J, each have the empirical formula CH₂O. The number of carbon atoms in their molecules are shown in the Table.\n\n| Compound | Number of carbon atoms |\n|----------|----------------------|\n| G | 1 |\n| H | 2 |\n| J | 3 |\n\nIn H and in J, the carbon atoms are bonded directly to one another. G gives a silver mirror when treated with Tollen's reagent. H and J each gives a brisk effervescence with Na₂CO₃(aq).\n(ai). Identify G\n(ii). What functional group is common to both H and J?\n(iii). Identify H\n(iv). Identify J\n\n**(b).** When J is heated under reflux with acidified K₂Cr₂O₇, the product K gives a red orange precipitate with 2,4-dinitrophenyl hydrazine reagent.\n(i). Draw the structural formula of K, the compound formed from J.\nWhen J is warmed with concentrated sulphuric acid, a cyclic compound, L, is formed. L has the molecular formula C₆H₈O₄.\n(ii). Suggest a displayed formula for L.\n(iii). What type of reaction occurred when L is formed from J?\n\n**(c).** Ethanoic acid can also be formed in the laboratory by the oxidation of ethanol.\nCH₃CH₂OH + 2[O] → CH₃CO₂H + H₂O\n(i). What oxidizing agent is used for this laboratory reaction?\n(ii). What colour change would be observed?\n(iii). When ethanoic acid is prepared in this way in the laboratory, the reagents are heated under reflux for some time before the ethanoic acid is separated. Why is this reaction carried out by heating under reflux?\n\n---",
      totalMarks: 10,
      difficulty: "hard"
    },
    {
      id: "che-2014-p0001",
      subject: "chemistry",
      year: 2014,
      category: "practical",
      question: "Quantitative Analysis\\n\\n**1.** Solution A1 contains 6.95 g of hydrated ammonium iron (II) sulphate, (NH₄)₂Fe(SO₄)₂.6H₂O per dm³ of the solution. Solution B is acidified potassium permanganate.\nDetermine the concentration of potassium permanganate per dm³ in B using the following procedure:\nPipette 10 cm³ of the solution A1 into a clean conical flask and add 10 cm³ of 2M H₂SO₄ solution using measuring cylinder.\nTitrate the resulting solution with the provided acidified potassium permanganate solution.\nRecord your results in an appropriate Table and answer the following questions.\n(ai). What is the concentration of (NH₄)₂Fe(SO₄)₂.6H₂O in mol/dm³.\n(ii). Outline three precautions taken in order to get accurate results in your titration.\n(iii). State the colour change at the end of the titration.\n(bi). Write the half equation for the oxidation of iron (II) ions to iron (III) ions.\n(ii). Write the half equation for the reduction of manganese (VII) ions to manganese (II) ions.\n(iii). Write the ionic equation for the reaction.\n(c). Calculate the concentration of acidified potassium permanganate solution in mol/dm³.\n(d). Two students determine the percentage water of crystallization of a hydrated salt using four different titrations each. The accepted value of the percentage water of crystallization for the salt is 23.55% and the students' results in % are:\nStudent A: 25.31, 25.37, 25.35 and 25.33\nStudent B: 23.50, 24.04, 22.96 and 23.70\nCalculate the standard deviation for the two set of results and comment on their precision and accuracy.",
      difficulty: "medium"
    },
    {
      id: "che-2014-p0002",
      subject: "chemistry",
      year: 2014,
      category: "practical",
      question: "Qualitative Analysis\\n\\n**2.** You are provided with an organic sample Y. Carryout the following tests, record your observations and inferences clearly in a tabular form.\n(a). Record the physical appearance of Y.\n(b). Using a clean spatula, heat small quantity of Y in a Bunsen burner flame.\n(c). To a little amount of Y, add a drop of dilute H₂SO₄ and add % KMnO₄ dropwise and shake thoroughly.\n(d). Test the solubility of Y in cold and hot water.\n(e). Test the solution obtained in (2d) above with blue and red litmus paper.\n(f). To a small quantity of sample, add drop wise ceric ammonium nitrate.\n(g). To a small amount of Y, add saturated solution of NaHCO₃ drop by drop.\n(h). To a small quantity of the sample, add 2-3 drops of FeCl₃ solution, warm the test tube.\n(i). Mix dilute NaOH with aqueous AgNO₃ solution follow by few amounts of NH₄OH solution. Then, add few drops of sample Y.",
      difficulty: "medium"
    },

{
      id: "che-2015-obj-0001",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "A normal body temperature is 37℃, 𝐾𝑤 = 2.4 × 10−14. 𝐶𝑎𝑙𝑐𝑢𝑙𝑎𝑡𝑒 [𝐻3𝑂+] 𝑎𝑛𝑑 [𝑂𝐻−] for the body fluid at this temperature",
      options: [
        { label: "A", text: "[𝐻3𝑂+] = [𝑂𝐻−] = 2.5 × 10−7" },
        { label: "B", text: "[𝐻3𝑂+] = [𝑂𝐻−] = 1.5 × 10−8" },
        { label: "C", text: "[𝐻3𝑂+] = [𝑂𝐻−] = 1.5 × 10−6" },
        { label: "D", text: "[𝐻3𝑂+] = [𝑂𝐻−] = 1.5 × 10−7" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0002",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Atoms of elements in a group on the Periodic Table have similar chemical properties. This similarity is most closely related to the atoms.",
      options: [
        { label: "A", text: "number of principal energy levels" },
        { label: "B", text: "number of valence electrons" },
        { label: "C", text: "atomic numbers" },
        { label: "D", text: "atomic masses" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0003",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "How many atoms of 𝐶𝑢 are present in 35.4 𝑔 𝑜𝑓 𝐶𝑢? [𝐶𝑢 = 63.5𝑔𝑚𝑜𝑙−1]",
      options: [
        { label: "A", text: "1.08 × 1024 𝑎𝑡𝑜𝑚𝑠 𝑜𝑓 𝐶𝑢" },
        { label: "B", text: "3.27 × 1023 𝑎𝑡𝑜𝑚𝑠 𝑜𝑓 𝐶𝑢" },
        { label: "C", text: "6.02 × 1023 𝑎𝑡𝑜𝑚𝑠 𝑜𝑓 𝐶𝑢" },
        { label: "D", text: "1.20 × 1022 𝑎𝑡𝑜𝑚𝑠 𝑜𝑓 𝐶𝑢" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0004",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "How would you prepare 250𝑐𝑚3 𝑜𝑓 0.25𝑀 aqueous solution of 𝑁𝑎𝐶𝑙? [𝑁𝑎= 23𝑔𝑚𝑜𝑙−1; 𝐶𝑙 = 35.5𝑔𝑚𝑜𝑙−1]",
      options: [
        { label: "A", text: "Add 3.66𝑔 𝑁𝑎𝐶𝑙 𝑡𝑜 250𝑐𝑚3 of distilled water" },
        { label: "B", text: "Weigh 3.66𝑔 𝑁𝑎𝐶𝑙 𝑖𝑛𝑡𝑜 250𝑚𝑙 flask and add distilled water up to the mark" },
        { label: "C", text: "Add 14.60𝑔 𝑁𝑎𝐶𝑙 𝑡𝑜 250𝑐𝑚3 of distilled water" },
        { label: "D", text: "Weigh 14.60𝑔 𝑁𝑎𝐶𝑙 𝑖𝑛𝑡𝑜 250𝑚𝑙 flask and add distilled water up to the mark" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0005",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "What is the shape of 𝑃𝐶𝑙3?",
      options: [
        { label: "A", text: "Trigonal planar" },
        { label: "B", text: "Trigonal pyramidal" },
        { label: "C", text: "Tetrahedral" },
        { label: "D", text: "V-shaped (bent)" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0006",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "𝑈𝑟𝑎𝑛𝑖𝑢𝑚 −233 (𝑈92 233)𝑑𝑒𝑐𝑎𝑦𝑠 𝑏𝑦 𝛼 – 𝑒𝑚𝑖𝑠𝑠𝑖𝑜𝑛. What is the decay product?",
      options: [
        { label: "A", text: "𝑇ℎ90 229" },
        { label: "B", text: "𝑇ℎ90 231" },
        { label: "C", text: "𝐴𝑐91 231" },
        { label: "D", text: "𝐴𝑐91 233" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0007",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Arrange the following ions in order of decreasing charge density; 𝐶𝑎2+, 𝑀𝑔2+, 𝐴𝑙3+ 𝑎𝑛𝑑 𝐵𝑎2+",
      options: [
        { label: "A", text: "𝐴𝑙3+ > 𝑀𝑔2+ > 𝐶𝑎2+ > 𝐵𝑎2+" },
        { label: "B", text: "𝐵𝑎2+ > 𝐶𝑎2+ > 𝑀𝑔2+ > 𝐴𝑙3+" },
        { label: "C", text: "𝐴𝑙3+ < 𝑀𝑔2+ < 𝐶𝑎2+ < 𝐵𝑎2+" },
        { label: "D", text: "𝑀𝑔2+ > 𝐴𝑙3+ > 𝐵𝑎2+ > 𝐶𝑎2+" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0008",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Which of the following statements explain why caesium has a lower melting point than sodium?",
      options: [
        { label: "A", text: "Sodium is a more electropositive metal" },
        { label: "B", text: "Sodium has higher ionization energy" },
        { label: "C", text: "Sodium has a stronger metallic bond" },
        { label: "D", text: "Caesium has a larger atomic radius" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0009",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Transition metals can form complex ions because",
      options: [
        { label: "A", text: "They have paired electrons in the d subshell" },
        { label: "B", text: "They have unpaired electrons in the d subshell" },
        { label: "C", text: "They have empty d orbitals" },
        { label: "D", text: "They have small charge/size ratio" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0010",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "How many equivalent hybrid orbitals are there in 𝑆𝑝2 − ℎ𝑦𝑏𝑟𝑖𝑑𝑖𝑧𝑒𝑑 𝑐𝑎𝑟𝑏𝑜𝑛?",
      options: [
        { label: "A", text: "Four" },
        { label: "B", text: "Two" },
        { label: "C", text: "Three" },
        { label: "D", text: "One" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0011",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "When common names are used for acids, the underlined carbon atom in the molecule shown would be designated as the − 𝐶 𝑎𝑡𝑜𝑚. 𝐶𝐻3𝐶𝐻2𝐶𝐻2 − 𝑂 ‖ 𝐶−𝑂𝐻",
      options: [
        { label: "A", text: "Gamma" },
        { label: "B", text: "Alpha" },
        { label: "C", text: "Delta" },
        { label: "D", text: "Beta" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0012",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Purification of a strip of impure copper metal in aqueous CuSO4 was carried out using a steady current. Which graph shows the change in mass of the cathode with time?",
      options: [
        { label: "A", text: "" },
        { label: "B", text: "" },
        { label: "C", text: "D." },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0013",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Which gas closely approaches ideal behaviour at room temperature and pressure?",
      options: [
        { label: "A", text: "Helium" },
        { label: "B", text: "Carbon dioxide" },
        { label: "C", text: "Ammonia" },
        { label: "D", text: "Oxygen" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0014",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "A sample of a brown gas, a major air pollutant, is found to contain 2.34𝑔 𝑁 and 5.34𝑔 𝑂. Determine the empirical formula for this substance. [𝑁 = 14, 𝑂 = 16]",
      options: [
        { label: "A", text: "𝑁𝑂2" },
        { label: "B", text: "𝑁𝑂" },
        { label: "C", text: "𝑁2𝑂" },
        { label: "D", text: "𝑁2𝑂3" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0015",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Why does the rate of a gaseous reaction increase when the pressure is increased at a constant temperature?",
      options: [
        { label: "A", text: "More particles have energy that exceeds the activation energy." },
        { label: "B", text: "The particles have more space in which to move" },
        { label: "C", text: "The particles move faster." },
        { label: "D", text: "There are more frequent collisions between particles." },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0016",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Why is gaseous nitrogen less reactive than gaseous fluorine?",
      options: [
        { label: "A", text: "The boiling point of nitrogen is lower than that of fluorine" },
        { label: "B", text: "The relative molecular mass of nitrogen is lower than that of fluorine" },
        { label: "C", text: "The atomic radius of nitrogen is greater than that of fluorine" },
        { label: "D", text: "The bond strength in the molecule is greater in nitrogen than in fluorine" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0017",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The first stage in the manufacture of nitric acid is the oxidation of ammonia by oxygen. 𝑤𝑁𝐻3(𝑔) + 𝑥𝑂2(𝑔) → 𝑦𝑁𝑂(𝑔) + 𝑧𝐻2𝑂(𝑔) What values for 𝑤, 𝑥, 𝑦 𝑎𝑛𝑑 𝑧 are needed to balance the equation?",
      options: [
        { label: "A", text: "4, 5, 4 𝑎𝑛𝑑 6" },
        { label: "B", text: "4, 6, 4 𝑎𝑛𝑑 5" },
        { label: "C", text: "5, 6, 5 𝑎𝑛𝑑 4" },
        { label: "D", text: "6, 5, 6 𝑎𝑛𝑑 4" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0018",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The reaction of chlorine with methane is carried out in the presence of light. What is the function of the light?",
      options: [
        { label: "A", text: "to break the 𝐶 – 𝐻 bonds in methane" },
        { label: "B", text: "to break up the chlorine molecules into atoms" },
        { label: "C", text: "to break up the chlorine molecules into ions" },
        { label: "D", text: "to heat up the mixture" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0019",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "In the Solvay process, 𝑁𝑎𝐶𝑙(𝑎𝑞) + 𝑁𝐻3(𝑔) + 𝐻2𝑂(𝑙) + 𝐶𝑂2(𝑔) → 𝑁𝑎𝐻𝐶𝑂3(𝑠) + 𝑁𝐻44𝐶𝑙(𝑎𝑞). What volume of carbon dioxide (at s.t.p) is required to produce 1.00 𝑘𝑔 𝑜𝑓 𝑠𝑜𝑑𝑖𝑢𝑚 ℎ𝑦𝑑𝑟𝑜𝑔𝑒𝑛 𝑐𝑎𝑟𝑏𝑜𝑛𝑎𝑡𝑒? (𝐼 𝑚𝑜𝑙𝑒 𝑜𝑓 𝑔𝑎𝑠 𝑎𝑡 𝑠. 𝑡. 𝑝 𝑜𝑐𝑐𝑢𝑝𝑖𝑒𝑠 22.4𝑑𝑚3) [𝑁𝑎 = 23, 𝐶𝑙 = 35.5, 𝐶 = 12, 𝑂 = 16, 𝐻 = 1, 𝑁 = 14].",
      options: [
        { label: "A", text: "250𝑑𝑚3" },
        { label: "B", text: "762𝑑𝑚3" },
        { label: "C", text: "267𝑑𝑚3" },
        { label: "D", text: "462𝑑𝑚3" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0020",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Which group of particles is in order of increasing size?",
      options: [
        { label: "A", text: "𝑁, 𝑂, 𝐹" },
        { label: "B", text: "𝑁3−, 𝑂2−, 𝐹−" },
        { label: "C", text: "𝑁𝑎+, 𝑀𝑔2+, 𝐴𝑙3+" },
        { label: "D", text: "𝑁𝑎+, 𝑁𝑒, 𝐹−" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0021",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "River water in a chalky agricultural area may contain 𝐶𝑎2+, 𝑀𝑔2+, 𝐶𝑂3 2−, 𝐻𝐶𝑂3−, 𝐶𝑙−, 𝑁𝑂3− 𝑖𝑜𝑛𝑠. In a waterworks, such water is treated by adding a calculated quantity of calcium hydroxide. What will be precipitated following the addition of calcium hydroxide?",
      options: [
        { label: "A", text: "𝐶𝑎𝐶𝑙2" },
        { label: "B", text: "𝐶𝑎𝐶𝑂3" },
        { label: "C", text: "𝐶𝑎(𝑁𝑂3)2" },
        { label: "D", text: "𝑀𝑔(𝑁𝑂3)2" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0022",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The electronic configuration of the 𝐹𝑒3+ is",
      options: [
        { label: "A", text: "1𝑠22𝑠22𝑝63𝑠23𝑝63𝑑4" },
        { label: "B", text: "1𝑠22𝑠22𝑝63𝑠23𝑝63𝑑5" },
        { label: "C", text: "1𝑠22𝑠22𝑝63𝑠23𝑝63𝑑3" },
        { label: "D", text: "1𝑠22𝑠22𝑝63𝑠23𝑝63𝑑6" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0023",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "An element with an atomic number of 35 is --------- block element.",
      options: [
        { label: "A", text: "S – block" },
        { label: "B", text: "P – block" },
        { label: "C", text: "D – block" },
        { label: "D", text: "F – block" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0024",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Iodine trichloride, 𝐼𝐶𝑙3 is made by reacting iodine with chlorine. 𝐼2(𝑠) + 𝐶𝑙2(𝑔) → 2𝐼𝐶𝑙(𝑠); 𝛥𝐻 = +14𝑘𝐽𝑚𝑜𝑙−1 𝐼𝐶𝑙(𝑠) + 𝐶𝑙2(𝑔) → 𝐼𝐶𝑙3(𝑠); 𝛥𝐻𝜃= – 88𝑘𝐽𝑚𝑜𝑙−1 By using the data above, what is the enthalpy change of the formation for solid iodine trichloride? a reactant, A. how many times does the rate increase a [A] increases by a factor of 2?",
      options: [
        { label: "A", text: "−162𝑘𝐽𝑚𝑜𝑙−1" },
        { label: "B", text: "−81𝑘𝐽𝑚𝑜𝑙−1" },
        { label: "C", text: "−74𝑘𝐽𝑚𝑜𝑙−1" },
        { label: "D", text: "−60𝑘𝐽𝑚𝑜𝑙−1" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0025",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The standard enthalpy changes of formation of 𝑇𝑖𝑂2(𝑠) 𝑎𝑛𝑑 𝐶𝑂(𝑔) 𝑎𝑟𝑒 – 940𝑘𝐽𝑚𝑜𝑙−1 𝑎𝑛𝑑 −110𝑘𝐽𝑚𝑜𝑙−1 respectively. 𝑇𝑖𝑂2(𝑠) + 2𝐶(𝑠) → 𝑇𝑖(𝑠) + 2𝐶𝑂(𝑔) What is the standard enthalpy change of this reaction?",
      options: [
        { label: "A", text: "−830𝑘𝐽𝑚𝑜𝑙−1" },
        { label: "B", text: "−720𝑘𝐽𝑚𝑜𝑙−1" },
        { label: "C", text: "+720𝑘𝐽𝑚𝑜𝑙−1" },
        { label: "D", text: "+830𝑘𝐽𝑚𝑜𝑙−1" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0026",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The standard enthalpy changes of formation of 𝐻𝐶𝑙 𝑎𝑛𝑑 𝐻𝐼 𝑎𝑟𝑒 – 93𝑘𝐽𝑚𝑜𝑙−1 𝑎𝑛𝑑 + 25𝑘𝐽𝑚𝑜𝑙−1 respectively. Which statement is most important in explaining this difference?",
      options: [
        { label: "A", text: "The bond energy of 𝐶𝑙2 is smaller than the bond energy of 𝐼2." },
        { label: "B", text: "The activation energy for the 𝐻2 / 𝐶𝑙2 reaction is much less than that for the 𝐻2 / 𝐼2 reaction." },
        { label: "C", text: "The bond energy of 𝐼2 is smaller than the bond energy of 𝐶𝑙2." },
        { label: "D", text: "The bond energy of 𝐻𝐼 is smaller than the bond energy of 𝐻𝐶𝑙." },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0027",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "What is the catalyst used in the contact process?",
      options: [
        { label: "A", text: "𝑃𝑑" },
        { label: "B", text: "𝑃𝑡" },
        { label: "C", text: "𝐹𝑒2𝑂3" },
        { label: "D", text: "𝑉2𝑂5" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0028",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The main purpose of adding cryolite to the ore (bauxite) during the preparation of Aluminium metal by electrolysis is?",
      options: [
        { label: "A", text: "minimizes the release of oxygen at the graphite anode" },
        { label: "B", text: "reduce the melting point of the bauxite" },
        { label: "C", text: "increase the melting point of the bauxite" },
        { label: "D", text: "enables the aluminum discharge at the anode" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0029",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "What type of bond needs to be broken for magnesium oxide to melt?",
      options: [
        { label: "A", text: "Co-ordinate" },
        { label: "B", text: "Covalent" },
        { label: "C", text: "Ionic" },
        { label: "D", text: "Metallic" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0030",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "A substance which contains the following elements by mass: 𝐶, 17.8%; 𝐻, 1.5%; 𝐶𝑙, 52.6%; 𝐹, 28.1% has molecular mass of 135. Determine the molecular formula",
      options: [
        { label: "A", text: "𝐶2𝐻2𝐹𝐶𝑙" },
        { label: "B", text: "𝐶2𝐻2𝐹2𝐶𝑙" },
        { label: "C", text: "𝐶2𝐻2𝐹2𝐶𝑙2" },
        { label: "D", text: "𝐶2𝐻2𝐹𝐶𝑙3" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0031",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "How many chiral centres does the compound below possess? 𝐶𝐻2𝐶𝑂2𝐻 | 𝐶(𝑂𝐻)𝐶𝑂2𝐻 | 𝐶𝐻2𝐶𝑂2𝐻",
      options: [
        { label: "A", text: "0" },
        { label: "B", text: "1" },
        { label: "C", text: "2" },
        { label: "D", text: "3" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0032",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "0.200 𝑚𝑜𝑙 of a hydrocarbon undergo complete combustion to give 35.2𝑔 of Carbondioxide and 14.4𝑔 of water as the only products. What is the molecular formula of the hydrocarbon?",
      options: [
        { label: "A", text: "𝐶2H4" },
        { label: "B", text: "𝐶2H6" },
        { label: "C", text: "𝐶4H4" },
        { label: "D", text: "𝐶4H8" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0033",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "One of the original postulates of Dalton’s Atomic Theory is:",
      options: [
        { label: "A", text: "An atom reacts to attain electronic configuration of the noble gas closest to it." },
        { label: "B", text: "When atoms of different elements react to form chemical compound, the atoms are combined in simple whole number ratio." },
        { label: "C", text: "The isotopes of an element are in whole number ratio." },
        { label: "D", text: "Atoms of different elements differ in terms of number of protons in their nuclei." },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0034",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The ions in a mass spectrophotometer are separated based on their mass: charge ratio by the",
      options: [
        { label: "A", text: "Ion source" },
        { label: "B", text: "Mass analyzer" },
        { label: "C", text: "Deflector" },
        { label: "D", text: "Detector" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0035",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Which of the following terms accurately describes the energy associated with the process? 𝐿𝑖(𝑔) ⟶ 𝐿𝑖(𝑔) + + 𝑒−",
      options: [
        { label: "A", text: "Electron affinity" },
        { label: "B", text: "Binding energy" },
        { label: "C", text: "Ionization energy" },
        { label: "D", text: "Electronegativity" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0036",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "If the activation energy in the forward direction of an elementary step is 52𝑘𝐽 and the activation energy in the reverse direction is 74𝑘𝐽, what is the energy of reaction 𝐸 for this step?",
      options: [
        { label: "A", text: "+22𝑘𝐽" },
        { label: "B", text: "−22𝑘𝐽" },
        { label: "C", text: "+52𝑘𝐽" },
        { label: "D", text: "−52𝑘𝐽" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0037",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Sodium peroxide dissolves in water in accordance with the following reaction: 𝑁𝑎2𝑂2(𝑠) + 2𝐻2𝑂(𝑙) ⟶𝑁𝑎𝑂𝐻(𝑎𝑞) + 𝐻2𝑂(𝑙) The 𝑝𝐻 of the solution after reaction will be",
      options: [
        { label: "A", text: "7 −8" },
        { label: "B", text: "6 −7" },
        { label: "C", text: "< 2" },
        { label: "D", text: "> 10" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0038",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Gunpowder is a mixture of saltpeter, Sulphur and wood charcoal in the ratio of 6: 1: 1 by mass. The mixture burns with explosion because it produces a large volume of gases. Saltpeter in the mixture acts as",
      options: [
        { label: "A", text: "Modifier" },
        { label: "B", text: "Reducing agent" },
        { label: "C", text: "Oxidizing agent" },
        { label: "D", text: "Fuel" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0039",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The oxidation state of 𝐴𝑢 𝑖𝑛 𝐾[𝐴𝑢(𝑂𝐻)4] is:",
      options: [
        { label: "A", text: "+1" },
        { label: "B", text: "+2" },
        { label: "C", text: "+3" },
        { label: "D", text: "+4" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0040",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The most common type of chemical reaction which alkanes undergo is",
      options: [
        { label: "A", text: "Substitution" },
        { label: "B", text: "Addition" },
        { label: "C", text: "Condensation" },
        { label: "D", text: "Elimination" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0041",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The boiling point of water is higher than that of methanol because",
      options: [
        { label: "A", text: "Water is oxide while methanol is an alcohol" },
        { label: "B", text: "Inter molecular forces in water are stronger than those in methanol" },
        { label: "C", text: "Water is an inorganic compound while methanol is organic" },
        { label: "D", text: "Water is an ionic compound while methanol is covalent" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0042",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "In the Rutherford scattering experiment, Rutherford bombarded a thin piece of gold foil with a beam of",
      options: [
        { label: "A", text: "Electrons" },
        { label: "B", text: "Neutrons" },
        { label: "C", text: "Protons" },
        { label: "D", text: "Alpha particles" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0043",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "When azimuthal quantum number (l = 2), what set of orbitals is designated?",
      options: [
        { label: "A", text: "P" },
        { label: "B", text: "D" },
        { label: "C", text: "F" },
        { label: "D", text: "G" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0044",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Sodium hydroxide is an Arrhenius base because it contains",
      options: [
        { label: "A", text: "𝑁𝑎+" },
        { label: "B", text: "𝑂𝐻−" },
        { label: "C", text: "𝑁𝑎𝑂𝐻" },
        { label: "D", text: "𝑁𝑎" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0045",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The standard state of an element or compound is determined at a pressure of________ and a temperature of _______",
      options: [
        { label: "A", text: "760𝑚𝑚𝐻𝑔, 0℃" },
        { label: "B", text: "1 𝑎𝑡𝑚, 273℃" },
        { label: "C", text: "760𝑚𝑚𝐻𝑔, 0𝐾" },
        { label: "D", text: "1 𝑎𝑡𝑚, 298𝐾" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0046",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Which of the following is a state function?",
      options: [
        { label: "A", text: "Enthalpy" },
        { label: "B", text: "Work" },
        { label: "C", text: "Heat" },
        { label: "D", text: "Power" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0047",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The method that cannot be used for removing permanent hardness of water is",
      options: [
        { label: "A", text: "Adding sodium carbonate" },
        { label: "B", text: "Boiling" },
        { label: "C", text: "Adding caustic soda" },
        { label: "D", text: "Adding slaked lime" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0048",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Identify 𝑃 In which of the following characteristics does hydrogen resemble halogens?",
      options: [
        { label: "A", text: "Hydrogen is the lightest" },
        { label: "B", text: "Hydrogen forms ionic hydrides with alkali metals" },
        { label: "C", text: "Hydrogen atom contains one electron each" },
        { label: "D", text: "Hydrogen has three isotopes" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0049",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "Which alkali metal reacts directly with Nitrogen to form nitride?",
      options: [
        { label: "A", text: "Na" },
        { label: "B", text: "K" },
        { label: "C", text: "Rb" },
        { label: "D", text: "Li" },
      ],
      difficulty: "medium"
    },
    {
      id: "che-2015-obj-0050",
      subject: "chemistry",
      year: 2015,
      category: "objective",
      question: "The isomerism which exists between 𝐶𝐻3𝐶𝐻𝐶𝐼2 and 𝐶𝐻2𝐶𝐼. 𝐶𝐻2𝐶𝐼 is",
      options: [
        { label: "A", text: "Chain isomerism" },
        { label: "B", text: "Functional group isomerism" },
        { label: "C", text: "Positional isomerism" },
        { label: "D", text: "metamerism" },
      ],
      difficulty: "medium"
    },

    {
      id: "che-2015-t0001",
      subject: "chemistry",
      year: 2015,
      category: "theory",
      question: "CHM 001: GENERAL CHEMISTRY\n\n1.a \nExplain the following terms: \ni) Precision \nii) Accuracy  \n \n \n \n \n \n \n \n(4 𝑀𝑎𝑟𝑘𝑠) \n1.b \nThe concentration of Nickel in Nigerian coin was determined with visible \nspectrophotometer and the following results (%) were obtained: \n3.65, 4.11, 3.59, 7.51, 3.95, 3.87, 4.06, 1.48, 3.60, 3.76 𝑎𝑛𝑑 3.99. if the true \nconcentration (%) of nickel in coin as determined by atomic absorption and \ninductively coupled plasma atomic emission spectrophotometer was 3.92. \n \nUse the above data to determine \ni) Absolute error \nii) Percentage relative error \niii) Average error \n \n \n \n \n \n \n \n(6 𝑀𝑎𝑟𝑘𝑠) \n \n \n2.a \nWrite an equation for the synthesis of hydrogen gas by the reaction of methane \nwith steam.  \n \n \n \n \n \n \n \n(1 𝑀𝑎𝑟𝑘) \n2.b \nCompare the physical and chemical properties of the hydrides of; \n𝑁𝑎, 𝐶, 𝑁 𝑎𝑛𝑑 𝑆  \n \n \n \n \n \n \n(3 𝑀𝑎𝑟𝑘𝑠) \n2.c \nExplain using equation why rain falling in unpolluted air is acidic with a 𝑝𝐻 of \nabout 5.6.  \n \n \n \n \n \n \n \n(2 𝑀𝑎𝑟𝑘𝑠) \n2.d \nAcid rain has a 𝑝𝐻 value less than 5.6. Explain using equation how the burning of \ncoal can contribute to acid rain formation \n \n \n \n(2 𝑀𝑎𝑟𝑘𝑠) \n2.e \nWhat are the consequences of global warming on the environment? \n  \n \n \n \n \n \n \n \n \n \n(2 𝑀𝑎𝑟𝑘𝑠) \n\n\n \n15",
      totalMarks: 10,
      difficulty: "medium"
    },
    {
      id: "che-2015-t0002",
      subject: "chemistry",
      year: 2015,
      category: "theory",
      question: "CHM 002: PHYSICAL CHEMISTRY\n\n3.a \nExplain the condition of chemical equilibrium using the hypothetical equilibrium \nequation 𝑎𝐴+  𝑏𝐵⇌ 𝑐𝐶 +  𝑑𝐷  \n \n \n \n \n(3 𝑀𝑎𝑟𝑘𝑠) \n3.b \nWrite the equilibrium constant, 𝐾𝐶 expressions for the following reactions \ni) 3𝐶2𝐻2(𝑔)  ⇌𝐶2𝐻6(𝑔)   \n \n \n \n \n \n(1 𝑀𝑎𝑟𝑘) \nii) 2𝑁𝑂𝐶𝑙 ⇌2𝑁𝑂 + 𝐶𝑙2  \n \n \n \n \n \n(1 𝑀𝑎𝑟𝑘) \niii) 𝑁2𝑂4(𝑔)  ⇌2𝑁𝑂2  \n \n \n \n \n \n \n(1 𝑀𝑎𝑟𝑘) \n3.c \nA mixture of 0.003 𝑚𝑜𝑙 𝑜𝑓 𝐻2 𝑎𝑛𝑑 0.002 𝑚𝑜𝑙𝑒 𝑜𝑓 𝐼2 were reacted to attain \nequilibrium in a 2 − 𝐿 container at 400℃. Analysis of the equilibrium mixtures \nshows that the concentration of 𝐻𝐼 𝑖𝑠 0.0022 𝑀. Calculate 𝐾𝐶 for the reaction at \n400℃.  \n \n \n \n \n \n \n \n \n(4 𝑚𝑎𝑟𝑘𝑠) \n \n \n4.a \nState three (3) major factors which affect the discharge of ions at the electrodes \nduring electrolysis. \n \n \n \n \n \n \n(2 𝑚𝑎𝑟𝑘𝑠) \n4.b \nExplain why a tin-plated iron container corrodes faster than a galvanized iron \ncontainer with reference to the electrochemical series. \n \n \n \n \n \n \n \n \n \n \n \n \n \n(2 𝑚𝑎𝑟𝑘𝑠) \n4.c \n5.28𝑔 of a trivalent metal is deposited when a current of 1.56𝐴 is passed through a \nsolution of its salt for 1 ℎ𝑜𝑢𝑟; calculate the relative atomic mass of the metal. \nHence identify the metal. (1𝐹 =  96500𝐶).  \n \n \n(2 𝑚𝑎𝑟𝑘𝑠) \n4.d \nState any three (3) common applications of electrolysis. \n \n \n \n \n \n \n \n \n \n \n \n \n \n(2 𝑚𝑎𝑟𝑘𝑠) \n \n \n \n \n \n\n\n \n16",
      totalMarks: 10,
      difficulty: "medium"
    },
    {
      id: "che-2015-t0003",
      subject: "chemistry",
      year: 2015,
      category: "theory",
      question: "CHM 003: INORGANIC CHEMISTRY\n\n5.a \nName the strongest type of intermolecular force between hydrogen fluoride \nmolecules and draw a diagram to illustrate how two molecules of HF are attracted \nto each other. In your diagram show all lone pairs of electrons and any partial \ncharges. Explain the origin of these charges. Suggest why this strong \nintermolecular force is not present between HI molecules. \n(3 𝑚𝑎𝑟𝑘𝑠) \n5.b \nCrystals of sodium chloride and of diamond both have giant structures. Their \nmelting points are 1074𝐾 𝑎𝑛𝑑 3827𝐾, respectively. State the type of structure \npresent in each case and explain why the melting point of diamond is so high. \n  \n \n \n \n \n \n \n \n \n \n(3 𝑚𝑎𝑟𝑘𝑠) \n5.c \nWrite a Lewis structure and identify the octet-rule exception for \ni) 𝑆𝐶𝑙𝐹5 \nii) 𝐵𝐹𝐶𝑙2 \n \n \n \n \n \n \n \n \n(4 𝑚𝑎𝑟𝑘𝑠) \n \n6.a \nState Gay-Lussac’s law  \n \n \n \n \n \n(2  𝑚𝑎𝑟𝑘) \n6.b \nState Aufbau’s principle and hund’s rule of maximum multiplicity \n \n \n \n \n \n \n \n \n \n \n \n(2 𝑚𝑎𝑟𝑘𝑠) \n6.c \nWhat do you understand by a Bronsted acid? \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n(1 𝑚𝑎𝑟𝑘𝑠) \n6.d \nExplain briefly the term “Inert pair Effect”  \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n(2 𝑚𝑎𝑟𝑘𝑠) \n6.e \nCompare and contrast the following properties of the transition elements with that \nof S and P- block elements.  \ni) Colour  \nii) Atomic / ionic radius  \niii) Oxidation states  \n \n \n \n \n \n \n(3 𝑚𝑎𝑟𝑘𝑠) \n \n\n\n \n17",
      totalMarks: 10,
      difficulty: "medium"
    },
    {
      id: "che-2015-t0004",
      subject: "chemistry",
      year: 2015,
      category: "theory",
      question: "CHM 004: ORGANIC CHEMISTRY\n\n7.a \nCrude oil is the principal source of hydrocarbons. The following are examples of \nsuch hydrocarbons. \n𝐻−\n𝐻\n|\n𝐶\n|\n𝐻\n−\n𝐻\n|\n𝐶\n|\n𝐻\n−𝐻 \nethane \n \n𝐻\n|\n𝐶\n|\n𝐻\n=\n𝐻\n|\n𝐶\n|\n𝐶𝐻3\n \npropane \n \n \ncyclohexane \n \nGive the structural formulae of the organic products in the following reactions. \ni) The reaction of ethane with bromine in the presence of U.V. light. \n \n \n \n \n \n \n \n \n \n \n \n(1 𝑚𝑎𝑟𝑘) \nii) The reaction of HBr with butene. \n \n \n \n \n(1 𝑚𝑎𝑟𝑘) \niii) The reaction of cyclohexene with hydrogen bromide. \n \n(1 𝑚𝑎𝑟𝑘) \n7.b \nWrite equations for the following reactions.  \ni) The complete combustion of propane  \n \n \n \n(1 𝑚𝑎𝑟𝑘)  \nii) The action of steam on propene in the presence of a catalyst. \n(1 𝑚𝑎𝑟𝑘) \niii) The reaction of cyclohexene with hydrogen in the presence of a catalyst. \n(1 𝑚𝑎𝑟𝑘) \n\n\n \n18 \n \n7.c \nWrite a structural formula for each of the following and indicate whether it is \nprimary, secondary or tertiary.  \n \n \ni) 3 – pentanol \nii) 2, 2 – dimethyl – 1 – propanol \niii) 1 – methyl cyclopentanol \niv) 2 – methyl – 2 – propanol  \n \n \n \n \n \n(4 𝑚𝑎𝑟𝑘𝑠) \n \n8.a \nAn organic compound 𝑋 contains \n40% 𝑐𝑎𝑟𝑏𝑜𝑛, 53.3% 𝑜𝑥𝑦𝑔𝑒𝑛 𝑎𝑛𝑑 6.7% ℎ𝑦𝑑𝑟𝑜𝑔𝑒𝑛. The vapor density of 𝑋 𝑖𝑠 30. \nThe organic compound reacted with sodium hydrogen trioxo carbonate (IV) and a \ncolorless gas was given off which turned lime water milky. On boiling under \nreflux, the mixture of 𝑋 and ethanol, a sweet-smelling liquid 𝑌 was formed. \nDetermine \ni) Empirical and   \n \n \n \n \n \n \n \nii) Molecular formula of 𝑋  \n \n \n \n \n \n(4 𝑚𝑎𝑟𝑘𝑠) \n8.b \nWhat is the name of the colourless gas given off?  \n \n(1 𝑚𝑎𝑟𝑘) \n8.c \nGive the formula of the functional group present in X. \n \n(1 𝑚𝑎𝑟𝑘) \n8.d \nDeduce the structure of the compound X \n \n \n \n(1 𝑚𝑎𝑟𝑘) \n8.e \nName the reaction which took place between 𝑋 and ethanol, and write an equation \nfor the reaction between 𝑋 and ethanol.  \n \n \n \n(3 𝑚𝑎𝑟𝑘𝑠) \n \n \n \n \n \n \n \n \n\n\n \n19 \n \nSECTION A: MULTIPLE CHOICE ANSWERS \n1. Option D \n𝐿𝑒𝑡 𝑡ℎ𝑒 𝑐𝑜𝑛𝑐𝑒𝑛𝑡𝑟𝑎𝑡𝑖𝑜𝑛 𝑜𝑓 [𝐻3𝑂+] 𝑎𝑛𝑑 [𝑂𝐻−] 𝑖𝑜𝑛𝑠 𝑎𝑡 37𝐶 𝑏𝑒 𝑥 \n𝑈𝑠𝑖𝑛𝑔 𝑘𝑤= [𝐻3𝑂+][𝑂𝐻−]   \n𝑘𝑤= 𝑥2  \n𝑥2 = 2.4 × 10−4 \n𝑥= √2.4 × 10−4 \n ∴ [𝐻3𝑂+] = [𝑂𝐻−] =  1.5 × 10−7𝑚𝑜𝑙𝑑𝑚−3 \n \n2. Option B \n \n3. Option B \n𝑁𝑢𝑚𝑏𝑒𝑟 𝑜𝑓 𝑚𝑜𝑙𝑒𝑠 𝑜𝑓 𝐶𝑢= \n𝑚𝑎𝑠𝑠\n𝑚𝑜𝑙𝑎𝑟 𝑚𝑎𝑠𝑠= 35.4\n63.5 = 0.557 𝑚𝑜𝑙 \n𝐹𝑟𝑜𝑚 𝑚𝑜𝑙𝑒 𝑐𝑜𝑛𝑐𝑒𝑝𝑡: \n \n𝑁𝑢𝑚𝑏𝑒𝑟 𝑜𝑓 𝑚𝑜𝑙𝑒𝑠 𝑜𝑓 𝐶𝑢= \n𝑁𝑢𝑚𝑏𝑒𝑟 𝑜𝑓 𝑎𝑡𝑜𝑚\n𝐴𝑣𝑜𝑔𝑎𝑑𝑟𝑜′𝑠 𝑐𝑜𝑛𝑠𝑡𝑎𝑛𝑡 \n0.557 = 𝑁𝑢𝑚𝑏𝑒𝑟 𝑜𝑓 𝑎𝑡𝑜𝑚\n6.02 × 1023\n \n𝑁𝑢𝑚𝑏𝑒𝑟 𝑜𝑓 𝑎𝑡𝑜𝑚𝑠= 0.557 × 6.02 × 1023 \n𝑁𝑢𝑚𝑏𝑒𝑟 𝑜𝑓 𝑎𝑡𝑜𝑚𝑠 =  3.35 × 1023 𝑎𝑡𝑜𝑚𝑠 𝑜𝑓 𝐶𝑢 \n*The correct answer is not in option, you choose the closest answer \n \n4. Option B \n𝑃𝑟𝑒𝑝𝑎𝑟𝑎𝑡𝑖𝑜𝑛 𝑜𝑓 250𝑐𝑚3 𝑜𝑓 𝑁𝑎𝐶𝑙: \n𝑀𝑜𝑙𝑎𝑟𝑖𝑡𝑦 =  0.25𝑚𝑜𝑙𝑑𝑚−3 \n𝑉𝑜𝑙𝑢𝑚𝑒 𝑜𝑓 𝑠𝑜𝑙𝑢𝑡𝑖𝑜𝑛 =  250𝑐𝑚3  =  0.25𝑑𝑚3 \n𝐶𝑜𝑛𝑐𝑒𝑛𝑡𝑟𝑎𝑡𝑖𝑜𝑛 𝑜𝑓 𝑔𝑑𝑚−3 = ? \n𝑀𝑜𝑙𝑎𝑟 𝑚𝑎𝑠𝑠 𝑜𝑓 𝑁𝑎𝑐𝑙 =  23 +  35.5 =  58.5𝑔𝑚𝑜𝑙−1 \n𝑅𝑒𝑐𝑎𝑙𝑙,\n𝑐𝑜𝑛𝑐𝑒𝑛𝑡𝑟𝑎𝑡𝑖𝑜𝑛 𝑖𝑛 𝑔𝑑𝑚−3 = 𝑐𝑜𝑛𝑐. 𝑚𝑜𝑙𝑑𝑚−3 × 𝑚𝑜𝑙𝑎𝑟 𝑚𝑎𝑠𝑠 \n\n\n \n20 \n \n0.25 × 58.5 = 14.625𝑔𝑑𝑚−3 \n∴14.625𝑔 𝑜𝑓 𝑁𝑎𝑐𝑙 𝑖𝑠 𝑝𝑟𝑒𝑠𝑒𝑛𝑡 𝑖𝑛 (1𝑑𝑚3  ≡1000𝑐𝑚3) \n𝑥𝑔 𝑜𝑓 𝑁𝑎𝑐𝑙 𝑖𝑠 𝑝𝑟𝑒𝑠𝑒𝑛𝑡 𝑖𝑛 250𝑐𝑚3 \n1000𝑥= 250 × 14.625 \n𝑥= 3656.25\n1000\n= 3.66𝑔 \n𝑖. 𝑒 𝑊𝑒𝑖𝑔ℎ 3.66𝑔 𝑁𝑎𝑐𝑙 𝑎𝑛𝑑 𝑑𝑖𝑠𝑠𝑜𝑙𝑣𝑒 𝑡𝑜 250𝑐𝑚3 𝑑𝑖𝑠𝑡𝑖𝑙𝑙𝑒𝑑 𝑤𝑎𝑡𝑒𝑟 \n \n5. Option B \n \n6. Option A \n𝑈 → \n𝑇ℎ+ 𝐻𝑒\n2\n4\n90\n229\n92\n223\n \n𝑇ℎ𝑒 𝑑𝑒𝑐𝑎𝑦 𝑝𝑟𝑜𝑑𝑢𝑐𝑡 = \n𝑇ℎ\n90\n229\n  \n \n7. Option A \nCharge density increase across the period and decreases down the group \n \n \n𝐺𝑟𝑜𝑢𝑝 2 \n𝐺𝑟𝑜𝑢𝑝 3 \n𝑃𝑒𝑟𝑖𝑜𝑑 3 \n𝑚𝑔 \n𝐴𝑙 \n \n𝐶𝑎 \n \n \n𝑆𝑟 \n \n \n𝐵𝑎 \n \n \n∴𝑂𝑟𝑑𝑒𝑟 𝑜𝑓 𝑑𝑒𝑐𝑟𝑒𝑎𝑠𝑖𝑛𝑔 𝑐ℎ𝑎𝑟𝑔𝑒 𝑑𝑒𝑛𝑠𝑖𝑡𝑦: \n𝐴𝑙3+ > 𝑀𝑔2+ > 𝐶𝑎2+ > 𝐵𝑎2+  \n \n8. Option D \n9. Option C \n10. Option C \n11. Option D \n12. Option C \n\n\n \n21 \n \n13. Option A \n \n14. Option A \n \n𝑬𝒍𝒆𝒎𝒆𝒏𝒕 \n𝑵 \n𝑶 \n𝑀𝑎𝑠𝑠 \n2.34 \n5.34 \n𝑀𝑜𝑙𝑒 \n2.34\n14  \n5.34\n16  \n \n0.17 \n0.33 \n𝐷𝑖𝑣𝑖𝑑𝑒 𝑏𝑦 𝑡ℎ𝑒 𝑠𝑚𝑎𝑙𝑙𝑒𝑠𝑡 𝑣𝑎𝑙𝑢𝑒 \n0.17\n0.17 \n0.33\n0.17 \n \n \n \n𝑀𝑜𝑙𝑒 𝑟𝑎𝑡𝑖𝑜 =  1 ∶ 2 \n \n𝐸𝑚𝑝𝑖𝑟𝑖𝑐𝑎𝑙 𝑓𝑜𝑟𝑚𝑢𝑙𝑎 =  𝑁𝑂2 \n15. Option D \n16. Option D \n17. Option A \n18. Option B \n \n19. Option C \n𝐵𝑎𝑙𝑎𝑛𝑐𝑒𝑑 𝑒𝑞𝑢𝑎𝑡𝑖𝑜𝑛 𝑜𝑓 𝑟𝑒𝑎𝑐𝑡𝑖𝑜𝑛: \n𝑁𝑎𝐶𝑙(𝑎𝑞)  +  𝑁𝐻3(𝑔) +  𝐻2𝑂(𝑙)  +  𝐶𝑂2(𝑔) →𝑁𝑎𝐻𝐶𝑂3(𝑠) + 𝑁𝐻4𝐶𝑙(𝑎𝑞) \n(𝑈𝑠𝑖𝑛𝑔 𝑠𝑡𝑜𝑖𝑐ℎ𝑖𝑜𝑚𝑒𝑡𝑟𝑦) 𝑀𝑎𝑠𝑠 𝑜𝑓 𝑁𝑎𝐻𝐶𝑂3(𝑠) 𝑝𝑟𝑜𝑑𝑢𝑐𝑒𝑑 =  1𝑘𝑔 =  1000𝑔 \n𝑀𝑜𝑙𝑎𝑟 𝑚𝑎𝑠𝑠 𝑁𝑎𝐻𝐶𝑂3(𝑠)  =  23 +  1 +  12 + (16 ×  3) =  23 +  1 +  12 +  48 \n=  84𝑔𝑚𝑜𝑙−1 \n84𝑔𝑚𝑜𝑙−1 𝑜𝑓 𝑁𝑎𝐻𝐶𝑂3(𝑠) 𝑖𝑠 𝑝𝑟𝑜𝑑𝑢𝑐𝑒𝑑 𝑏𝑦 22.4𝑑𝑚3 𝑜𝑓 𝐶𝑂2 𝑎𝑡 𝑠. 𝑡. 𝑝 \n \n𝑛𝑜 𝑜𝑓 𝑚𝑜𝑙𝑒= \n𝑚𝑎𝑠𝑠\n𝑚𝑜𝑙𝑎𝑟 𝑚𝑎𝑠𝑠= 1000\n84\n= 11.9𝑚𝑜𝑙 \n𝑚𝑜𝑙𝑒 𝑟𝑎𝑡𝑖𝑜∶ 𝐶𝑂2\n⏟\n1\n∶ 𝑁𝑎𝐻𝐶𝑂3\n⏟      \n1\n  \n\n\n \n22 \n \n∴𝑛𝑜 𝑜𝑓 𝑚𝑜𝑙𝑒 𝑜𝑓 𝐶𝑂2 = 11.9𝑚𝑜𝑙  \n𝐹𝑟𝑜𝑚 𝑚𝑜𝑙𝑒 𝑐𝑜𝑛𝑐𝑒𝑝𝑡;  \n𝑁𝑜 𝑜𝑓 𝑚𝑜𝑙𝑒 = \n𝑉𝑜𝑙𝑢𝑚𝑒 𝑜𝑓 𝑔𝑎𝑠 (𝑑𝑚3)\n𝑀𝑜𝑙𝑎𝑟 𝑣𝑜𝑙𝑢𝑚𝑒 𝑜𝑓 𝑔𝑎𝑠 𝑖𝑛 𝑑𝑚3  \n𝑉𝑜𝑙𝑢𝑚𝑒 𝑜𝑓 𝐶𝑂2 = 𝑛𝑜 𝑜𝑓 𝑚𝑜𝑙𝑒 × 𝑚𝑜𝑙𝑎𝑟 𝑣𝑜𝑙𝑢𝑚𝑒 𝑜𝑓 𝑔𝑎𝑠 \n= 11.9 × 22.4 \n=  267𝑑𝑚3 𝑜𝑓  𝐶𝑂2 𝑎𝑡 𝑠. 𝑡. 𝑝 \n \n20. Option D \nAtomic size decreases across the period \n \n𝑃𝑒𝑟𝑖𝑜𝑑 2 \n𝑁 \n𝑂 \n𝐹 \n𝑃𝑒𝑟𝑖𝑜𝑑 3 \n𝑁𝑎 \n𝑀𝑔 \n𝐴𝑙 \n \n𝐷𝑒𝑐𝑟𝑒𝑎𝑠𝑖𝑛𝑔 𝑜𝑟𝑑𝑒𝑟 𝑜𝑓 𝑠𝑖𝑧𝑒 \n \nHowever, for 180 𝑒𝑙𝑒𝑐𝑡𝑟𝑜𝑛𝑖𝑐 species (i.e different atoms having the same electronic \nconfigurations). The effective nuclear charge (𝑍𝑒𝑓𝑓) varies because each atom has \ndifferent atomic number. \n \n𝑁𝑎+, 𝑁𝑒, 𝐹− \n𝑍𝑒𝑓𝑓( 𝐹−) = +7 \n𝑍𝑒𝑓𝑓( 𝑁𝑒) = +8 \n𝑍𝑒𝑓𝑓( 𝑁𝑎+) = +9 \n \n∴𝑆𝑜𝑑𝑖𝑢𝑚 𝑐𝑎𝑡𝑖𝑜𝑛 ℎ𝑎𝑠 𝑡ℎ𝑒 𝑙𝑎𝑟𝑔𝑒𝑠𝑡 𝑒𝑓𝑓𝑒𝑐𝑡𝑖𝑣𝑒 𝑛𝑢𝑐𝑙𝑒𝑎𝑟 𝑐ℎ𝑎𝑟𝑔𝑒, \n𝑎𝑛𝑑 𝑡ℎ𝑢𝑠 𝑡ℎ𝑒 𝑠𝑚𝑎𝑙𝑙𝑒𝑠𝑡 𝑠𝑖𝑧𝑒 \n𝑁𝑎+, 𝑁𝑒, 𝐹− \n \n𝑂𝑟𝑑𝑒𝑟 𝑜𝑓 𝑖𝑛𝑐𝑟𝑒𝑎𝑠𝑖𝑛𝑔 𝑠𝑖𝑧𝑒 \n\n\n \n23 \n \n \n21. Option B \n22. Option B \n23. Option B \n \n24. Option B \n𝐹𝑜𝑟 𝑒𝑞𝑢𝑎𝑡𝑖𝑜𝑛 (𝑖) \n∆𝐻𝜃 = ∑𝑚∆𝐻𝑝\n𝜃− ∑𝑛∆𝐻𝑅\n𝜃 \n∆𝐻𝜃 =  2∆𝐻𝑓\n𝜃(𝐼𝐶𝐼) − (∆𝐻𝑓\n𝜃(𝐼2) + ∆𝐻𝑓\n𝜃(𝐶𝐼2) ) \n+14 =  2∆𝐻𝑓\n𝜃(𝐼𝐶𝐼) − (0 +  0) \n+14 =  2∆𝐻𝑓\n𝜃(𝐼𝐶𝐼) \n∆𝐻𝑓\n𝜃(𝐼𝐶𝐼) = +14\n2\n= +7𝑘𝑗𝑚𝑜𝑙−1 \n𝐹𝑜𝑟 𝑒𝑞𝑢𝑎𝑡𝑖𝑜𝑛 (𝑖𝑖) \n∆𝐻𝜃= ∆𝐻𝑓\n𝜃(𝐼𝐶𝐼3) − (∆𝐻𝑓\n𝜃(𝐼𝐶𝐼) + ∆𝐻𝑓\n𝜃(𝐶𝐼2)) \n−88 = ∆𝐻𝑓\n𝜃(𝐼𝐶𝐼3) − (+7 + 0) \n−88 = ∆𝐻𝑓\n𝜃(𝐼𝐶𝐼3) − 7  \n∴ ∆𝐻𝑓\n𝜃(𝐼𝐶𝐼3) = −88 + 7 = −81𝑘𝑗𝑚𝑜𝑙−1 \n \n25. Option C \n∆𝐻𝑓\n𝜃(𝑇𝑖𝑂2) = −940𝑘𝑗𝑚𝑜𝑙−1 \n∆𝐻𝑓\n𝜃(𝐶𝑂) = −110𝑘𝑗𝑚𝑜𝑙−11 \n∆𝐻𝑟𝑒𝑎𝑐𝑡𝑖𝑜𝑛\n𝜃\n= ∑𝐻𝑝\n𝜃− ∑𝐻𝑅\n𝜃 \n∆𝐻𝜃= (∆𝐻𝑓\n𝜃(𝑇𝑖𝑂3) + 2∆𝐻𝑓\n𝜃(𝐶𝑂)) − (∆𝐻𝑓\n𝜃(𝑇𝑖𝑂2) + 2∆𝐻𝑓\n𝜃(𝐶)) \n= (0 +  2 × −110) – (−940 +  2 ×  0) \n= − 220 – (−940) = − 220 +  940𝑠 \n= +720𝑘𝑗𝑚𝑜𝑙−1 \n \n\n\n \n24 \n \n26. Option C \n27. Option D \n28. Option B \n29. Option C \n30. Option C \n \n𝑬𝒍𝒆𝒎𝒆𝒏𝒕 \n𝑪 \n𝑯 \n𝑭 \n𝑪𝒍 \n% 𝑏𝑦 𝑚𝑎𝑠𝑠 \n17.8 \n1.5 \n28.1 \n52.6 \n𝑀𝑜𝑙𝑒 \n17.8\n12  \n1.5\n1  \n28.1\n19  \n52.6\n35.5 \n \n1.48 \n1.50 \n1.48 \n1.48 \n𝐷𝑖𝑣𝑖𝑑𝑒 𝑏𝑦 𝑡ℎ𝑒 𝑠𝑚𝑎𝑙𝑙𝑒𝑠𝑡 𝑣𝑎𝑙𝑢𝑒 \n1.48\n1.48 \n1.50\n1.48 \n1.48\n1.48 \n1.48\n1.48 \n \n \n \n𝑀𝑜𝑙𝑎𝑟 𝑟𝑎𝑡𝑖𝑜 =  1  ∶   1  ∶   1  ∶   1 \n𝐸𝑚𝑝𝑖𝑟𝑖𝑐𝑎𝑙 𝑓𝑜𝑟𝑚𝑢𝑙𝑎 =  𝐶𝐻𝐹𝐶𝑙 \n𝑀𝑜𝑙𝑒𝑐𝑢𝑙𝑎𝑟 𝑓𝑜𝑟𝑚𝑢𝑙𝑎 = (𝐶𝐻𝐹𝐶𝑙)𝑛 \n(𝐶𝐻𝐹𝐶𝑙)𝑛 =  𝑚𝑜𝑙𝑒𝑐𝑢𝑙𝑎𝑟 𝑚𝑎𝑠𝑠 \n(12 +  1 +  19 +  35.5)𝑛 =  135 \n67.5𝑛 =  135 \n𝑛 = 135\n67.5 =  2 \n𝑀𝑜𝑙𝑒𝑐𝑢𝑙𝑎𝑟 𝑓𝑜𝑟𝑚𝑢𝑙𝑎 = (𝐶𝐻𝐹𝐶𝑙)2 \n𝑀𝑜𝑙𝑒𝑐𝑢𝑙𝑎𝑟 𝑓𝑜𝑟𝑚𝑢𝑙𝑎 = 𝐶2𝐻2𝐹2𝐶𝑙2 \n \n31. Option A \n \n32. Option D \n\n\n \n25 \n \n𝑀𝑎𝑠𝑠 𝑜𝑓 𝐶𝑎𝑟𝑏𝑜𝑛𝑑𝑖𝑜𝑥𝑖𝑑𝑒 \n𝐶𝑂2  =  35.2𝑔 \n𝑀𝑎𝑠𝑠 𝑜𝑓 𝐶 = 12\n44  ×  35.2 =  9.6𝑔 \n𝑀𝑎𝑠𝑠 𝑜𝑓 𝑤𝑎𝑡𝑒𝑟, 𝐻2𝑂 =  14.4𝑔 \n𝑀𝑎𝑠𝑠 𝑜𝑓 𝐻 = 2\n18  ×  14.4 =  1.6𝑔 \n𝑬𝒍𝒆𝒎𝒆𝒏𝒕 \n𝑪 \n𝑯 \n𝑀𝑎𝑠𝑠 \n9.6 \n1.6 \n𝑀𝑜𝑙𝑒 \n9.6\n12 \n1.6\n1  \n \n0.8 \n1.6 \n𝐷𝑖𝑣𝑖𝑑𝑒 𝑏𝑦 𝑡ℎ𝑒 𝑠𝑚𝑎𝑙𝑙𝑒𝑠𝑡 𝑣𝑎𝑙𝑢𝑒 \n0.8\n0.8 \n1.6\n0.8 \n \n𝑀𝑜𝑙𝑎𝑟 𝑟𝑎𝑡𝑖𝑜 =  1  ∶   2 \n𝐸𝑚𝑝𝑖𝑟𝑖𝑐𝑎𝑙 𝑓𝑜𝑟𝑚𝑢𝑙𝑎 =  𝐶𝐻2 \n0.200𝑚𝑜𝑙𝑒 𝑜𝑓 𝐶𝐻2 𝑐𝑜𝑛𝑡𝑎𝑖𝑛𝑠 (9.6 +  1.6 ×  2) =  12.8𝑔 \n1 𝑚𝑜𝑙𝑒 𝑜𝑓 𝐶𝐻2 𝑤𝑖𝑙𝑙 𝑐𝑜𝑛𝑡𝑎𝑖𝑛 1 x 12.8\n0.200 =  64𝑔 \n \n∴ 𝑀𝑜𝑙𝑒𝑐𝑢𝑙𝑎𝑟 𝑚𝑎𝑠𝑠 =  64𝑔 \n𝑀𝑜𝑙𝑒𝑐𝑢𝑙𝑎𝑟 𝑓𝑜𝑟𝑚𝑢𝑙𝑎 = (𝐶𝐻2)𝑛 \n(𝐶𝐻2)𝑛 =  64 \n(12 +  2)𝑛 =  64 \n14𝑛 =  64 \n𝑛 = 64\n14 =  4 \n \n𝑀𝑜𝑙𝑒𝑐𝑢𝑙𝑎𝑟 𝑓𝑜𝑟𝑚𝑢𝑙𝑎 = (𝐶𝐻2)4  = 𝐶4𝐻8 \n \n33. Option B \n34. Option B \n\n\n \n26 \n \n35. Option C \n \n36. Option A \n𝑈𝑠𝑖𝑛𝑔 𝐸𝑎 𝑟𝑒𝑣𝑒𝑟𝑠𝑒 = ∆𝐻 + 𝐸𝑎 𝑓𝑜𝑟𝑤𝑎𝑟𝑑 \n∆𝐻 = 𝐸𝑎 𝑟𝑒𝑣𝑒𝑟𝑠𝑒 − 𝐸𝑎 𝑓𝑜𝑟𝑤𝑎𝑟𝑑 =  74 –  52  \n=  22𝑘𝑗 \n \n37. Option D \n38. Option C \n \n39. Option C \n𝐾 (𝐴𝑢(𝑂𝐻)4) \n𝑂. 𝑁 𝑜𝑓 𝐾 = +1 \n𝑂. 𝑁 𝑜𝑓 𝑂𝐻 = −1 \n𝐿𝑒𝑡 𝑂. 𝑁 𝑜𝑓 𝐴𝑢 𝑏𝑒 𝑥 \n+1 +  𝑥 +  4 (−1) =  0 \n+1 +  𝑥 –  4 =  0 \n𝑥 =  4 –  1 = +3 \n \n40. Option A \n41. Option B \n42. Option D \n43. Option B \n44. Option B \n \n45. Option D \n𝑇ℎ𝑒 𝑠𝑡𝑎𝑛𝑑𝑎𝑟𝑑 𝑠𝑢𝑏𝑠𝑡𝑎𝑛𝑐𝑒 𝑖𝑠 𝑖𝑡𝑠 𝑝ℎ𝑎𝑠𝑒 (𝑠𝑜𝑙𝑖𝑑, 𝑙𝑖𝑞𝑢𝑖𝑑 𝑎𝑛𝑑 𝑔𝑎𝑠)𝑎𝑡 25.0℃  \n𝑎𝑛𝑑 1 𝑎𝑡𝑚𝑜𝑠𝑝ℎ𝑒𝑟𝑒 𝑝𝑟𝑒𝑠𝑠𝑢𝑟𝑒. \n𝑃𝑟𝑒𝑠𝑠𝑢𝑟𝑒 =  1 𝑎𝑡𝑚 \n𝑇𝑒𝑚𝑝𝑒𝑟𝑎𝑡𝑢𝑟𝑒 =  25 +  273 =  298𝐾 \n \n\n\n \n27 \n \n46. Option A \n47. Option B \n48. Option B \n49. Option D \n50. Option C \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n\n\n \n28 \n \nSECTION B: ESSAY ANSWERS",
      totalMarks: 10,
      difficulty: "medium"
    },
    {
      id: "che-2015-t0005",
      subject: "chemistry",
      year: 2015,
      category: "theory",
      question: "CHM 001: GENERAL CHEMISTRY\n\n1.a \n  \ni) Precision is the closeness of two or more measurements to each other. \nii) Accuracy is the closeness of a measured value to true value. \n \n1.b \n \ni) Absolute error, ∆𝑥= |𝑥̅𝑚− 𝑥𝑡| \nWhere 𝑥̅𝑚= 𝑀𝑒𝑎𝑛 𝑚𝑒𝑎𝑠𝑢𝑟𝑒𝑑 𝑣𝑎𝑙𝑢𝑒 \n𝑥𝑡= 𝑇𝑟𝑢𝑒 𝑣𝑎𝑙𝑢𝑒= 3.92 \nBut mean measured value 𝑥̅𝑚= \n∑\n𝑥𝑖\n𝑁\n𝑖=1\n𝑁\n \n𝑥̅𝑚= 3.65 + 4.11 + 3.59 + 7.51 + 3.95 + 3.87 + 4.06 + 1.48 + 3.60 + 3.76 + 3.99\n11\n \n𝑥̅𝑚= 43.57\n11\n= 3.96 \nAbsolute error, ∆𝑥= |𝑥̅𝑚− 𝑥𝑡| \n∆𝑥 =  3.96 –  3.92 = | −0.04| =  0.04 \nii) % 𝑟𝑒𝑙𝑎𝑡𝑖𝑣𝑒 𝑒𝑟𝑟𝑜𝑟= \n𝐴𝑏𝑠𝑜𝑙𝑢𝑡𝑒 𝑒𝑟𝑟𝑜𝑟\n𝑇𝑟𝑢𝑒 𝑣𝑎𝑙𝑢𝑒\n × 100 \n% 𝑟𝑒𝑙𝑎𝑡𝑖𝑣𝑒 𝑒𝑟𝑟𝑜𝑟= 0.04\n3.92 × 100 = 1.02% \niii) 𝐴𝑣𝑒𝑟𝑎𝑔𝑒 𝑒𝑟𝑟𝑜𝑟 = \n∑\n|𝑥𝑖−𝑥|\n𝑁\n𝑖=1\n𝑁\n   \n∑|𝑥𝑖− 𝑥̅| = 𝑆𝑢𝑚 𝑜𝑓 𝑎𝑏𝑠𝑜𝑙𝑢𝑡𝑒 𝑒𝑟𝑟𝑜𝑟 (𝑆𝐴𝐸)\n𝑁\n𝑖=1\n \n𝑆𝐴𝐸 = |3.65 −3.92| + |4.11 −3.92| + |3.59 −3.92| + |7.51 −3.92| + |3.95\n−3.92| + |3.87 −3.92| + |4.06 −3.92| + |1.48 −3.92| + |3.60\n−3.92| + |3.76 −3.92| + |3.99 −3.92| \n𝑆𝐴𝐸 = | −0.27| + |0.19| + | −0.33| + |3.59| + |0.03| + | −0.05| + |0.14| + |\n−2.44| + | −0.32| + | −0.16| + |0.07| \n\n\n \n29 \n \n𝑆𝐴𝐸 =  0.27 +  0.19 +  0.33 +  3.59 +  0.03 +  0.05 +  0.14 +  2.44 \n+  0.32 +  0.16 +  0.07 \n𝑆𝐴𝐸 =  7.59 \n∴  𝐴𝑣𝑒𝑟𝑎𝑔𝑒 𝑒𝑟𝑟𝑜𝑟 = 7.59\n11  =  0.69 \n \n2.a \n 𝐶𝐻4(𝑔) + 𝐻2𝑂(𝑙)  → 𝐶𝑂(𝑔) + 3𝐻2(𝑔) \n \n2.b \n \n \n𝐻𝑦𝑑𝑟𝑖𝑑𝑒𝑠\n𝑃ℎ𝑦𝑠𝑖𝑐𝑎𝑙 𝑝𝑟𝑜𝑝𝑒𝑟𝑡𝑖𝑒𝑠 \n𝑆𝑜𝑙𝑢𝑏𝑖𝑙𝑖𝑡𝑦 𝑃ℎ𝑦𝑠𝑖𝑐𝑎𝑙 𝑠𝑡𝑎𝑡𝑒\n(𝐴𝑝𝑝𝑒𝑎𝑟𝑎𝑛𝑐𝑒)\n𝑀𝑒𝑙𝑡𝑖𝑛𝑔 \n𝑝𝑜𝑖𝑛𝑡 \n𝐵𝑜𝑖𝑙𝑖𝑛𝑔 \n𝑃𝑜𝑖𝑛𝑡 \n𝐵𝑜𝑛𝑑𝑖𝑛𝑔 \n𝑈𝑛𝑖𝑡 \n𝐴𝑐𝑖𝑑𝑖𝑐\n/𝐴𝑙𝑘𝑎𝑙𝑖𝑛𝑒\n𝑛𝑎𝑡𝑢𝑟𝑒 𝑖𝑛\n𝑤𝑎𝑡𝑒𝑟 \n𝑁𝑎𝐻 \n𝐼𝑡 𝑖𝑠 𝑠𝑜𝑙𝑢𝑏𝑙𝑒\n𝑖𝑛  \n𝑤𝑎𝑡𝑒𝑟 \nIt is a grey or \nwhite solid \nHigh \n- \nIonic/ \nions \nAlkaline \nsolution \n𝐶𝐻4 \nIt is \ninsoluble \nin water \nIt is a \ncolourless \ngas \nLow \nLow \nCovalen\nt/ \nMolecul\nes \nNeutral \nsolution \n𝑁𝐻3 \nIt is very \nsoluble in \nwater \nIt is a \ncolourless \ngas \nHigh \nHigh \nCovalen\nt \nMolecul\nes \nAlkaline \nsolution \n𝐻2𝑆 \nIt is \nslightly \nIt is a \ncolourless \ngas \nLow \nLow \nCovalen\nt/ \nMolecul\nes \nAcidic \nsolution \n\n\n \n30 \n \n \nChemical Properties \n(1) Reaction of hydrides with air \n(i) 𝑁𝑎𝐻(𝑠) + 𝐻2(𝑔)  ⟶\n⏞\n𝐻𝑒𝑎𝑡\n 𝑁𝑎𝑂(𝑠) + 𝐻2𝑂(𝑔) \n(ii) 𝐶𝐻4(𝑔)  + 𝑂2(𝑔)  ⟶\n⏞\n𝐻𝑒𝑎𝑡\n  𝐶𝑂2(𝑔)  + 2𝐻2𝑂(𝑔) \n(iii) \n4𝑁𝐻3(𝑔) + 5𝑂2(𝑔)\n⟶\n⏞\n𝐶𝑎𝑡𝑎𝑙𝑦𝑠𝑡\n4𝑁𝑂(𝑔) + 6𝐻2𝑂(𝑔) \n(iv) \n2𝐻2𝑆(𝑔)  +  3𝑂2(𝑔) ⟶\n⏞\n𝐻𝑒𝑎𝑡\n 2𝑆𝑂2(𝑔) + 2𝐻2𝑂(𝑙) \n(2) Reaction of hydrides with water \n(i) 𝑁𝑎𝐻(𝑠) + 𝐻2𝑂(𝑙)   ⟶  𝑁𝑎𝑂𝐻(𝑎𝑞) + 𝐻2(𝑔) \n(ii) 𝑀𝑒𝑡ℎ𝑎𝑛𝑒 𝑑𝑜𝑒𝑠 𝑛𝑜𝑡 𝑟𝑒𝑎𝑐𝑡 𝑤𝑖𝑡ℎ 𝑤𝑎𝑡𝑒𝑟 𝑎𝑡 𝑟𝑜𝑜𝑚 𝑡𝑒𝑚𝑝𝑒𝑟𝑎𝑡𝑢𝑟𝑒 \n(iii) \n𝑁𝐻3(𝑔) + 𝐻2𝑂(𝑙)   ⇌ 𝐻3𝑂(𝑎𝑞)\n+\n+  𝑂𝐻(𝑎𝑞)\n−\n \n(iv) \n𝐻2𝑆(𝑔)  + 𝐻2𝑂(𝑙)   ⟶  \n𝐻3𝑂(𝑎𝑞)\n+\n⏟    \n𝐻𝑦𝑑𝑟𝑜𝑛𝑖𝑢𝑚 𝑖𝑜𝑛\n +\n 𝐻𝑆(𝑎𝑞)\n−\n⏟    \n𝐻𝑦𝑑𝑟𝑜𝑠𝑢𝑙𝑝ℎ𝑖𝑑𝑒 𝑖𝑜𝑛\n \n(v) 𝐻𝑆(𝑎𝑞)\n−\n + 𝐻2𝑂(𝑙)   ⟶𝐻3𝑂(𝑎𝑞)\n+\n + \n𝑆(𝑎𝑞)\n−\n⏟\n𝑆𝑢𝑙𝑝ℎ𝑖𝑑𝑒 𝑖𝑜𝑛\n \n \n2.c \nRain falling in unpolluted air is acidic with 𝑃𝐻 𝑜𝑓 5.6 because of the presence of \ndissolved 𝑐𝑎𝑟𝑏𝑜𝑛 (𝐼𝑉) 𝑜𝑥𝑖𝑑𝑒 gas. The Carbondioxide reacts with water in the \natmosphere to form a weak acid called carbonic acid (acid rain). \n𝐶𝑂2  + 𝐻2𝑂 ⟶ 𝐻2𝐶𝑂3 \n \n2.d \nWhen coal is burned, the Sulphur combines with oxygen and the Sulphur oxide are \nreleased to the atmosphere. 𝑆𝑢𝑙𝑝ℎ𝑢𝑟 𝑑𝑖𝑜𝑥𝑖𝑑𝑒 (𝑆𝑂2) becomes Sulphur trioxide \n(𝑆𝑂3) when reacting with oxygen in the air. This reacts with water molecules in \nthe atmosphere to form Sulphuric acid, a strong mineral acid. This makes rain \nacidic. \n𝑆 + 𝑂2  ⟶ 𝑆𝑂2 \n\n\n \n31 \n \n2 𝑆𝑂2 + 𝑂2  ⟶𝑆𝑂3 \n𝑆𝑂3 + 𝐻2𝑂 ⟶𝐻2𝑆𝑂4 \n \n2.e \nHigher sea levels \nMore frequent and severe weather \nHigher death rates \nHigher wildlife extinction rates \nMore acidic oceans \nDirtier air \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n \n\n\n \n32",
      totalMarks: 10,
      difficulty: "medium"
    },
    {
      id: "che-2015-t0006",
      subject: "chemistry",
      year: 2015,
      category: "theory",
      question: "CHM 002: PHYSICAL CHEMISTRY\n\n3.a \nChemical equilibrium is a state in which the rate of the forward reaction equals the \nrate of the backward reaction in other word; there is no net change in \nconcentrations of reactants and products. In the hypothetical equation, \n𝑎𝐴 +  𝑏𝐵 ⇌𝑐𝐶 +  𝑑𝐷 \nThe equilibrium state is achieved when the amounts of 𝐴 𝑎𝑛𝑑 𝐵 that are \ncombining to produce 𝐶 𝑎𝑛𝑑 𝐷 equals the amounts of 𝐶 𝑎𝑛𝑑 𝐷 that are combining \nto produce 𝐴 𝑎𝑛𝑑 𝐵. \n \n3.b \n  \ni) 𝐾𝑐 = \n[𝐶6𝐻6]\n[𝐶2𝐻2] \n \nii) 𝐾𝑐 = \n[𝑁𝑂2]2[𝐶𝑙2]\n[𝑁𝑂𝐶𝑙]2  \niii) 𝐾𝑐 = \n[𝑁𝑂2]2\n[𝑁2𝑂4] \n \n3.c \n𝑛𝑜 𝑜𝑓 𝑚𝑜𝑙𝑒 𝐻2 = 0.003 \n𝑛𝑜 𝑜𝑓 𝑚𝑜𝑙𝑒 𝐼2 = 0.002 \n𝑖𝑛 𝑎 2 −𝐿 𝑐𝑜𝑛𝑡𝑎𝑖𝑛𝑒𝑟= 𝑣𝑜𝑙 𝑜𝑓 2𝑑𝑚3 \n[𝐻2] = 0.003\n2\n =  0.0015 𝑀 \n[𝐼2] = 0.002\n2\n =  0.001 𝑀 \n[𝐻𝐼] =  0.0022 𝑀 \n𝐸𝑞𝑢𝑎𝑡𝑖𝑜𝑛 𝑜𝑓 𝑚𝑖𝑥𝑡𝑢𝑟𝑒: 𝐻2  + 𝐼2  →2𝐻𝐼 \n𝐾𝑐 = [𝐻𝐼]2\n[𝐻2][𝐼2] = \n(0.0022)2\n0.0015 ×  0.001 = 4.84 × 10−6\n1.50 × 10−6 \n𝐾𝑐 =  3.23 \n \n \n \n \n\n\n \n33 \n \n4.a \n \ni) Nature of electrode \nii) Concentration of ions \niii) Position of ion in the electrochemical series \n \n4.b \nIn a tin protected iron, the iron being above tin in the electrochemical series serves \nas the anode while the tin will be the cathode. This makes the iron to undergo \noxidation by losing electrons and rustling takes place.  \nIn a galvanized iron (zinc protected iron) on the other hand, the zinc being above \niron in the electrochemical series serves as the anode and it is therefore oxidized \ninstead of the iron in the process. It is when all the zinc parts have corroded that \nrusting of iron sets in. Thus, zinc protects iron better than tin against corrosion. \n \n4.c \n𝑀𝑟 = \n𝑚 𝑥 𝑛𝐹\n𝐼𝑡\n = \n5.28 × 3 × 96500\n1.56 × 60 × 60  = \n152860\n5616  =  27. 22 \nRelative atomic mass of the metal is 27. 22 and the metal is Aluminium. \n \n4.d \nApplications of Electrolysis are: \ni) Electroplating \nii) Extraction of metals from their ores \niii) Manufacture of heavy water (𝐷2𝑂) \niv) Production of hydrogen by electrolysis of water \n \n \n \n \n \n \n \n\n\n \n34",
      totalMarks: 10,
      difficulty: "medium"
    },
    {
      id: "che-2015-t0007",
      subject: "chemistry",
      year: 2015,
      category: "theory",
      question: "CHM 003: PHYSICAL CHEMISTRY\n\n5.a \nHydrogen bond \n \n \n \nThe origin of the charge is the difference in electronegativity between hydrogen \nand fluorine. Fluorine being the most electronegativity atom, the bonding electrons \nwill be attracted towards the fluorine away from the hydrogen. That leaves the \nhydrogen with quite a lot of positive charges and the fluorine quite negative charge \nand also has at least one active lone pair. The fairly positive hydrogen on one HF \nmolecule will be attracted to one of the lone pairs on a nearby HF molecule. \nThe strong intermolecular force is not present in HI molecules because the iodine \natom has low electronegativity which cannot induce partial negative charge on \nitself and partial positive charge on the hydrogen which can then form hydrogen \nbonds with adjacent molecules. \n \n \n5.b \nSodium chloride – giant ionic structure \nDiamond – giant covalent structure \nThe melting point of diamond is so high because the atoms are strongly held \ntogether with covalent bonds and a lot of energy would be needed to separate \natoms. \n \n \n \n \n\n\n \n35 \n \n5.c \n  \ni)  \n \nii)   \n \n \n𝑆𝐶𝐼𝐹5 does not obey octet rule because Sulphur is surrounded with more than \neight electrons. 𝐵𝐹𝐶𝑙2 does not obey octet rule because boron contains less than \neight electrons. \n \n6.a \nGay – Lussac’s law states that when gases react, they do so in volumes which bear \na simple ratio to one another and to the volume of the products formed if gaseous, \nprovided the temperature and pressure remains constant. \n6.b \nAufbau’s principle states that in the ground state of an atom, ion, electrons fill \natomic orbitals of the lowest available energy levels before occupying higher \nlevels. \nS \n:𝐹ሷ: \n:𝐶𝑙ሷ: \n:𝐹ሷ: \n:𝐹ሷ: \n:𝐹ሷ: \n:𝐹ሷ: \n𝐵 \n:𝐹ሷ: \n:𝐶𝑙ሷ: \n:𝐶𝑙ሷ: \n\n\n \n36 \n \nHund’s rule states that for a given electron configuration, the lowest energy terms \nare the one with greatest value of spin multiplicity. This implies that if two or more \norbitals of equal energy are available, electrons will occupy them singly before \nfilling them in pairs.  \n \n6.c \nBronsted acid is a chemical substance that donates an 𝐻+ ion (proton) to form a \nconjugate base. \ne.g. 𝐶𝐻3𝐶𝑂𝑂𝐻\n⏟      \n𝐴𝑐𝑒𝑡𝑖𝑐 𝑎𝑐𝑖𝑑\n+  𝑁𝐻3  →  𝑁𝐻4\n+ + 𝐶𝐻3𝐶𝑂𝑂–\n⏟      \n𝐶𝑜𝑛𝑗𝑢𝑔𝑎𝑡𝑒 𝑏𝑎𝑠𝑒\n \n \n6.d \nThe Inert Pair Effect Is the tendency of the two electrons in the outermost atomic s \n- orbital to remain unionized or unshared in compounds of post – transition metal. \n \n6.e \n  \nProperty \nTransition \nelements \nS – and P – \nblocks elements \nColour \nColoured \nColourless \nAtomic / ionic \nradius \nLarge \nSmall \nOxidations states \nVariable \nFixed \n \n \n \n \n \n \n \n \n \n \n \n\n\n \n37",
      totalMarks: 10,
      difficulty: "medium"
    },
    {
      id: "che-2015-t0008",
      subject: "chemistry",
      year: 2015,
      category: "theory",
      question: "CHM 004: PHYSICAL CHEMISTRY\n\n7.a \n  \ni) 𝐻−\n𝐵𝑟\n|\n𝐶\n|\n𝐻\n−\n𝐵𝑟\n|\n𝐶\n|\n𝐻\n−𝐵𝑟 \nHexabromoethane \n \nii) 𝐻−\n𝐻\n|\n𝐶\n|\n𝐻\n−\n𝐵𝑟\n|\n𝐶\n|\n𝐻\n−\n𝐻\n|\n𝐶\n|\n𝐻\n−\n𝐻\n|\n𝐶\n|\n𝐻\n−𝐻 \n2 – bromobutane \n \niii)   \n \nBromocyclohexane \n \n \n \n \n \n \n \n \n \n𝐻 \n𝐵𝑟",
      totalMarks: 10,
      difficulty: "medium"
    },
    {
      id:"che-2017-q0001",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which theory postulated that the electrons in an atom revolve about the nucleus from one circular orbit to another?",
      options:[
            {label:"A", text:"Rutherford's theory"},
            {label:"B", text:"Dalton's theory"},
            {label:"C", text:"Bohr's theory"},
            {label:"D", text:"Thomson's theory"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0002",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The principal, angular momentum, magnetic and spin quantum numbers of the third electron of boron atom have the respective values:",
      options:[
            {label:"A", text:"2, 0, 0,  "},
            {label:"B", text:"2, 0, 0, - "},
            {label:"C", text:"2, 1, -1, - "},
            {label:"D", text:"2, 1, -1, + "},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0003",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"What is the mass of a carbon dioxide molecule? [O = 16, C = 12, NA = 6.02 x 1023]",
      options:[
            {label:"A", text:"44 g"},
            {label:"B", text:"7.31 x 10-23 g"},
            {label:"C", text:"73.1 x 10-23 g"},
            {label:"D", text:"4.4 g"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0004",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"A certain elementary gas is triatomic and has a vapour density of 48. The atomic mass of the gas is.",
      options:[
            {label:"A", text:"48"},
            {label:"B", text:"96"},
            {label:"C", text:"32"},
            {label:"D", text:"16"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0005",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The process of preparing hydrogen from red-hot coke and steam is generally called",
      options:[
            {label:"A", text:"Lane's process"},
            {label:"B", text:"Reforming of coke"},
            {label:"C", text:"Linde's process"},
            {label:"D", text:"Bosch's process"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0006",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Ethanoic acid is a weak electrolyte because",
      options:[
            {label:"A", text:"It exists in dimer form"},
            {label:"B", text:"It has low degree of ionization"},
            {label:"C", text:"It has high molecular mass"},
            {label:"D", text:"It is an organic compound"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0007",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Phenolphthalein is an acidic indicator which has the following equilibrium solution: HIn (undissociated) -> H+ + In-. The undissociated form, HIn, is colourless while the ion, In-, is pink. What will be the colour of the indicator in acid medium?",
      options:[
            {label:"A", text:"Pink"},
            {label:"B", text:"Colourless"},
            {label:"C", text:"Yellow"},
            {label:"D", text:"Blue"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0008",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The conjugate acids of the Bronsted bases, HCO3- and CO32- are:",
      options:[
            {label:"A", text:"HCO3- and HCO32-"},
            {label:"B", text:"CO32- and HCO3-"},
            {label:"C", text:"H2CO3 and HCO3-"},
            {label:"D", text:"CO32- and HCO3-"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0009",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"A normal body temperature is 37degC, Kw = 2.4 x 10-  , calculate [H3O+] and [OH-] for a neutral solution at this temperature",
      options:[
            {label:"A", text:"[H3O+] = [OH-] = 2.5 x 10- "},
            {label:"B", text:"[H3O+] = [OH-] = 1.5 x 10- "},
            {label:"C", text:"[H3O+] = [OH-] = 1.5 x 10- "},
            {label:"D", text:"[H3O+] = [OH-] = 1.5 x 10- "},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0010",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"One of the following is a correct quantum number combination.",
      options:[
            {label:"A", text:"n = 3, l = 0, m = +2"},
            {label:"B", text:"n = 3, l = 0, m = +1"},
            {label:"C", text:"n = 2, l = 2, m = +1"},
            {label:"D", text:"n = 2, l = 1, m = -1"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0011",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The bromine content of average ocean water is 65 parts per weight per million. Assuming 100% recovery, how many cubic meters of ocean water must be processed to produce 0.61 kg of bromine assuming the density of seawater is 1.023 x 103 kg/m3?",
      options:[
            {label:"A", text:"9.4 m3"},
            {label:"B", text:"12.6 m3"},
            {label:"C", text:"9.17 m3"},
            {label:"D", text:"18 m3"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0012",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"If the wavelength of a microwave oven used to cook a meal is 1.20 cm, what is the energy of one photon of this microwave radiation? [h = 6.63 x 10-3  Js; c = 3 x 10   cm]",
      options:[
            {label:"A", text:"1.66 x 10-23 J"},
            {label:"B", text:"1.66 x 10-2  J"},
            {label:"C", text:"3.32 x 10-2  J"},
            {label:"D", text:"16.6 x 10-2  J"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0013",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Calculate the wavelength (in nm) associated with a proton moving at 1.0 x 102 m/s [mass of proton = 1.67 x 10-2  kg; h = 6.63 x 10-3  Js]",
      options:[
            {label:"A", text:"0.032"},
            {label:"B", text:"4.0"},
            {label:"C", text:"2.0"},
            {label:"D", text:"14.0"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0014",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The electronic transition from n = 2 to n = 1 will produce shortest wavelength in which of the following? (where n = principal quantum state).",
      options:[
            {label:"A", text:"Li2+"},
            {label:"B", text:"He"},
            {label:"C", text:"H"},
            {label:"D", text:"H+"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0015",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The term that refers to the reproducibility of a measurement is:",
      options:[
            {label:"A", text:"quality"},
            {label:"B", text:"precision"},
            {label:"C", text:"sharpness"},
            {label:"D", text:"accuracy"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0016",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The electronic configuration of carbon in its excited state is",
      options:[
            {label:"A", text:"1s2 2s  2px  2py  2pz "},
            {label:"B", text:"1s  2s  2px  2py  2pz "},
            {label:"C", text:"1s2 2s2 2p2"},
            {label:"D", text:"1s  2s  2px2 2py  2pz "},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0017",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Electronegativity is the ability of an atom",
      options:[
            {label:"A", text:"in a molecule to attract shared electrons to itself"},
            {label:"B", text:"gain electron"},
            {label:"C", text:"lose electron"},
            {label:"D", text:"form covalent bond"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0018",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which of the following has least electron affinity?",
      options:[
            {label:"A", text:"oxygen"},
            {label:"B", text:"argon"},
            {label:"C", text:"nitrogen"},
            {label:"D", text:"boron"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0019",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which of the following configurations represents a metallic character?",
      options:[
            {label:"A", text:"2,8,2"},
            {label:"B", text:"2,8,4"},
            {label:"C", text:"2,8,7"},
            {label:"D", text:"2,8,8"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0020",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"A compound has an empirical formula of NO2. The colourless liquid used in rocket engines has a molecular mass of 92.0 gml- . What is the molecular formula of the compound?",
      options:[
            {label:"A", text:"NO2"},
            {label:"B", text:"N2O"},
            {label:"C", text:"NO"},
            {label:"D", text:"N2O4"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0021",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"A substance has the following composition by mass: 60.80% Na; 28.60% Br; 10.60% H. What is the empirical formula of the substance?",
      options:[
            {label:"A", text:"NaBH4"},
            {label:"B", text:"NaBH"},
            {label:"C", text:"NaB2H4"},
            {label:"D", text:"Na2BH"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0022",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Find the volume occupied by 3.55 g of chlorine gas at room temperature and pressure. [Cl = 35.5; Vm at stp = 22.4 dm3 mol- ]",
      options:[
            {label:"A", text:"1.1 dm3"},
            {label:"B", text:"2.4 dm3"},
            {label:"C", text:"0.6 dm3"},
            {label:"D", text:"12 dm3"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0023",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"1.6 g of a gas occupies 1.12 dm3 at a room temperature and pressure. What is the relative molecular mass of the gas? [Vm = 22.4 dm3 mol- ]",
      options:[
            {label:"A", text:"16"},
            {label:"B", text:"64"},
            {label:"C", text:"48"},
            {label:"D", text:"32"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0024",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"An aqueous solution of which of the following will produce a basic solution?",
      options:[
            {label:"A", text:"NH4Cl"},
            {label:"B", text:"KBr"},
            {label:"C", text:"NaCl"},
            {label:"D", text:"Na2SO3"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0025",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which of the following molecules is square planar in shape?",
      options:[
            {label:"A", text:"XeO4"},
            {label:"B", text:"XeF4"},
            {label:"C", text:"SF4"},
            {label:"D", text:"SiF4"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0026",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"What happens when lithium and oxygen react together?",
      options:[
            {label:"A", text:"Each lithium atom gains one electron"},
            {label:"B", text:"Each lithium atom loses one electron"},
            {label:"C", text:"Each oxygen atom gains one electron"},
            {label:"D", text:"Each oxygen atom loses one electron"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0027",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which statement about covalent bond is correct?",
      options:[
            {label:"A", text:"Breaking covalent bond is exothermic and releases energy"},
            {label:"B", text:"Breaking covalent bond is endothermic and absorbs energy"},
            {label:"C", text:"Making covalent bond is endothermic and absorbs energy"},
            {label:"D", text:"Making covalent bond is endothermic and releases energy"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0028",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"A gas that is confined in a rigid container is heated. Which of the following statements is TRUE?",
      options:[
            {label:"A", text:"The kinetic energy of the gas particle will decrease"},
            {label:"B", text:"The pressure will increase"},
            {label:"C", text:"The density of gas will increase"},
            {label:"D", text:"The number of moles of gas will decrease"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0029",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Equal masses of hydrogen and oxygen are placed in a rigid closed container. Which statement is TRUE about the system?",
      options:[
            {label:"A", text:"There are more hydrogen molecule than oxygen molecule"},
            {label:"B", text:"All the molecules have the same velocity"},
            {label:"C", text:"Both gases exact the same pressure on the walls of the container"},
            {label:"D", text:"All the molecules strike the walls with the same force"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0030",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which of the following atoms is never found with more than an octet of valence electrons around it?",
      options:[
            {label:"A", text:"Si"},
            {label:"B", text:"C"},
            {label:"C", text:"P"},
            {label:"D", text:"Br"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0031",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"A rigid metal tank contains helium gas. Which applies to the gas in the tank when some helium is removed at constant temperature?",
      options:[
            {label:"A", text:"The volume of the gas decreases"},
            {label:"B", text:"The pressure of the gas decreases"},
            {label:"C", text:"The average speed of the gas molecules decreases"},
            {label:"D", text:"The total number of gas molecules remains the same"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0032",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The IUPAC name of the compound shown (1,3,5-trimethylcyclopentane structure) is:",
      options:[
            {label:"A", text:"1,2,4-trimethyl cyclopentane"},
            {label:"B", text:"1,3,4-trimethyl cyclopentane"},
            {label:"C", text:"1,3,5-trimethyl cyclopentane"},
            {label:"D", text:"trimethyl cyclopentane"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0033",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The following compounds exhibit covalent bonding EXCEPT",
      options:[
            {label:"A", text:"AlCl3"},
            {label:"B", text:"Al2Cl6"},
            {label:"C", text:"NH4+"},
            {label:"D", text:"NH3"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0034",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"If the rate of reaction becomes double for every 10degC rise in temperature, by what factor will the rate of reaction increase when temperature is increase from 25degC to 65degC?",
      options:[
            {label:"A", text:"8"},
            {label:"B", text:"16"},
            {label:"C", text:"32"},
            {label:"D", text:"64"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0035",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The t0.5 for a second order reaction is:",
      options:[
            {label:"A", text:"1/k[a]"},
            {label:"B", text:"1/(2k[a]3)"},
            {label:"C", text:"3/(2k[A]3)"},
            {label:"D", text:"7/(3k[A]3)"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0036",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The formula for the compound dichlorodiammine platinum (II) is",
      options:[
            {label:"A", text:"[Pt(NH4)2Cl2]"},
            {label:"B", text:"[Pt(NH3)2Cl2]"},
            {label:"C", text:"[Pl(NH4)2Cl2]"},
            {label:"D", text:"[Pl(NH4)2Cl2]"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0037",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which of the following pollutants is dangerous to the ozone layer?",
      options:[
            {label:"A", text:"CFC"},
            {label:"B", text:"CO2"},
            {label:"C", text:"CO"},
            {label:"D", text:"Oxides of nitrogen"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0038",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The order of increasing ionic character of LiH, NaH, KH, RbH, CsH is",
      options:[
            {label:"A", text:"LiH, NaH, CsH, KH, RbH"},
            {label:"B", text:"LiH, NaH, KH, RbH, CsH"},
            {label:"C", text:"RbH, CsH, NaH, KH, LiH"},
            {label:"D", text:"NaH, CsH, RbH, KH, LiH"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0039",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which alcohol will most easily react with HCl in presence of ZnCl2 to form an alkyl halide?",
      options:[
            {label:"A", text:"primary alcohol"},
            {label:"B", text:"secondary alcohol"},
            {label:"C", text:"tertiary alcohol"},
            {label:"D", text:"all alcohols react equally"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0040",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which of these reagents could accomplish the following reduction (nitrile to amine reaction)?",
      options:[
            {label:"A", text:"NaBH4"},
            {label:"B", text:"LiAlH4"},
            {label:"C", text:"H3O+"},
            {label:"D", text:"1 mole of H2, poisoned catalyst, low pressure"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0041",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The correct name of (C2H3)2C=C(CH3)CH2CO2H is",
      options:[
            {label:"A", text:"4,4-diethyl-3-methyl-3-butenoic acid"},
            {label:"B", text:"4-ethyl-3-methyl-3-hexenoic acid"},
            {label:"C", text:"3-ethyl-4-methyl-3-hexenoic acid"},
            {label:"D", text:"3-ethyl-4-methyl-3-hexen-6-oic acid"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0042",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which of the following pairs of compounds are not isomers of each other?",
      options:[
            {label:"A", text:"n-pentane and 2-methylbutane"},
            {label:"B", text:"CH3CHOH and CH3CHO"},
            {label:"C", text:"CH3COCH3 and CH3CH2CHO"},
            {label:"D", text:"CH3COOCH3 and CH3CH2COOH"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0043",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The name of the compound shown (tertiary amide structure) is:",
      options:[
            {label:"A", text:"dimethyl-2,3,3-trimethylbutanamide"},
            {label:"B", text:"N,N-dimethyl-2,3-dimethylbutanamide"},
            {label:"C", text:""},
            {label:"D", text:""},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0044",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Succinic acid is:",
      options:[
            {label:"A", text:"(structure with COOH-(CH2)-COOH)"},
            {label:"B", text:"(structure with COOH-(CH2)2-COOH)"},
            {label:"C", text:"(structure with COOH-(CH2)3-COOH)"},
            {label:"D", text:"(structure with COOH-(CH2)4-COOH)"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0045",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which of the following will not give an alcohol on reduction?",
      options:[
            {label:"A", text:"CH3COCl"},
            {label:"B", text:"CH3COCH3"},
            {label:"C", text:"CH3COOH"},
            {label:"D", text:"CH3CONH2"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0046",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Vinegar contains mainly",
      options:[
            {label:"A", text:"Ethyl ethanoate"},
            {label:"B", text:"Ethanoic acid"},
            {label:"C", text:"Ethanol"},
            {label:"D", text:"Ethanamide"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0047",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The name of this compound (HC C-CH2-CH3 structure) is",
      options:[
            {label:"A", text:"1-butene"},
            {label:"B", text:"Propyne"},
            {label:"C", text:"Acetylene"},
            {label:"D", text:"1-butyne"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0048",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"Which of these pairs are homologues?",
      options:[
            {label:"A", text:"1-butene"},
            {label:"B", text:"Propyne"},
            {label:"C", text:"Acetylene"},
            {label:"D", text:"1-butyne"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0049",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The odd one out among the compounds shown is/are:",
      options:[
            {label:"A", text:"Acetylene and naphthalene"},
            {label:"B", text:"Dodecanoic acid and dodecane"},
            {label:"C", text:"Nonyne and methyl butyne"},
            {label:"D", text:"Heptanol and ethanoic acid"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-q0050",
      subject:"chemistry",
      year:2017,
      category:"objective",
      question:"The product of catalytic cracking of C 2H26 are",
      options:[
            {label:"A", text:"C3H 0 and C3H 6"},
            {label:"B", text:"C5H 2 and C7H 6"},
            {label:"C", text:"C5H 4 and C7H 2"},
            {label:"D", text:"C3H 2 and C H 4 ---"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2017-t0001",
      subject:"chemistry",
      year:2017,
      category:"theory",
      course:"CHM 001-004",
      question:"CHEMISTRY ESSAY QUESTIONS (2017)\n\n### CHM 001: General Chemistry\n\n**1a)** Briefly explain the following:\n(i) Duality of light\n(ii) Photon of light\n(iii) Pauli exclusion principle\n\n**1b)** What is the set of quantum numbers for third and eight electrons of fluorine (F)?\n\n**2.** Ionization energy increases across a period. Phosphorus and sulphur, in period 3, have ionization energies of 1011.8 kJ/mol and 999.7 kJ/mol respectively.\nWrite the electronic configurations of these two elements.\n\n**3a)** Water and methane have similar relative molecular masses and both contain the element hydrogen. The table below gives some information about water and methane.\n\n| Compound | Melting point/K |\n|-|-|\n| H2O | 273 |\n| CH4 | 91 |\n| Mr | H2O: 18.0 / CH4: 16.0 |\n\n(i) State the strongest type of intermolecular force holding the water molecules together in the ice crystal.\n(ii) Give one reason why the melting point of ice is greater than the melting point of methane.\n(iii) State the strongest type of intermolecular force in methane.\n\n**3b)** Explain this anomalous character in their ionization energies.\n\n**3c)** What do you understand by the term \"common ion effect\"? Give an example.\n\n**3d)** What is a buffer solution?\n\n**4ai)** What is meant by the standard enthalpy of formation of a compound?\n\n**4aii)** Write the equation, with symbols, which represents the standard enthalpy of formation of propane.\n\n**4b)** Assume that two cylinders at 27degC are connected by a stop clock (valve system). The right-hand cylinder is larger and contains 6.8 L of helium at 1.4 atm. The left-hand cylinder contains 2.4 L of hydrogen at 0.60 atm, and the left-hand cylinder is opened.\n(i) How many moles of each gas are present?\n(ii) What is the total pressure when the valve is opened?\n(iii) Determine the partial pressures of these two gases at 27degC when the stop cock is opened.\n\nUse the following standard enthalpy changes of combustion,  Hcdeg, to calculate the enthalpy change of formation of butane.\nCarbon: -393, Hydrogen: -286, Butane: -2876.5 kJmol- \n\n\n\n### CHM 002: Physical Chemistry\n\n**3ai)** Water and methane have similar relative molecular masses and both contain the element hydrogen. [Table as above]\n\n**3b)** Explain this anomalous character in their ionization energies.\n\n**Q3a (2022):**\n(i) Hydrogen bonding\n(ii) Van der Waal's forces\n(iii) Melting point of ice is greater than that of methane because hydrogen bond is stronger and requires more energy to break than Van der Waal's forces.\n\n**(bi)** Number of mole of He = ...\n**(ii)** Number of mole of H2 = ...\n**(iii)** Mole fraction of He, X2 = 0.869; Mole fraction of H2, X  = 0.131\nThe total pressure is 1.19 atm\nStandard enthalpy of formation is the energy change when one mole of a substance is formed by direct combination of its constituent elements at standard temperature and pressure.\n\n**(iii)** 3C(s) + 3H2(g) -> C3H6(g);  Hdeg = ?\n\n**Rearrange equation (III)**\n4CO2(g) + 5H2O -> C4H 0(s) + 13/2O2(g);\nH2(s) +  O2(g) -> H2O(g);  Hdeg = -286 kJmol- \nC4H 0(s) + 13/2O2(g) -> 4CO2(g) + 5H2O;  Hdeg = -2876.5 kJmol- \nMultiply equation [II] by 4 and equation [III] by 5\n4C(s) + 4O2(g) -> 4CO2(g);  Hdeg = -1572 kJmol- \n4C(s) + 5H2O(g) -> H2O(g);  Hdeg = -1430 kJmol- \nAdd equations [V], [V] and [VII]\n5H2(s) + 5/2O2(g) -> 5H2O(g);  Hdeg = -1430 kJmol- \n4C(s) + 5H2(s) -> C4H 0(s);  Hfdeg = -2876.5 kJmol- \nEnthalpy change of formation of butane is -125.5 kJmol- \n\n\n\n### CHM 003: Inorganic Chemistry\n\n**5.** As a result of structural differences between diamond and graphite there are remarkable differences in their physical properties and uses.\n(a) Account for these observable differences\n(b) State the trend in atomic radius down Group II from Mg to Ba and give a reason for this trend.\n(c) State and explain the trend in melting points of the elements down Group II from Mg to Ba.\n(d) State the trend in reactivity with water of the elements down Group II from Mg to Ba. Write an equation for the reaction of Mg with steam and an equation for the reaction of strontium with water.\n\n**6ai)** A complex ion is a metal atom or ion with Lewis bases or ligands attached to it through coordinate covalent bonds.\n(ii) A ligand is a Lewis base or electron pair donor attached to transition metal atom/ion through coordinate covalent bonds.\n(iii) Coordination number is the number of donor atoms or ligands attached to the central atom/ion in a complex through coordinate covalent bonds.\n\n**(bi)** Name the following complex ions:\n(i) [Cr(H2O)6]3+\n(ii) K2[TiCl6]\n(iii) [Pt(H2O)4(C2O4)]Br2\n(iv) [Co(NH3)6]Cl3\n\n**(ci)** Where is the ozone layer found and why is it important to us?\n(ii) Write the following terms in coordination chemistry:\n(i) complex ion\n(ii) ligand\n(iii) coordination number\n\nThe following counts per minute were recorded on a counter for the isotope 3 S at various times:\n\n| Time (days) | Counts/min |\n|-||\n| 0 | 4280 |\n| 1 | 4245 |\n| 2 | 4212 |\n| 3 | 4179 |\n| 4 | 4146 |\n| 5 | 4113 |\n| 6 | 3952 |\n| 7 | 3798 |\n\n(i) Determine the half-life in days and the decay rate constant in s- .\n(ii) How many counts per minute would be expected after 60 days?\n(iii) The following two reactions are proposed as elementary steps in the mechanism for an overall reaction.\nNO2Cl(g) -> NO2(g) + Cl(g) step I\nNO2Cl(g) + Cl(g) -> NO2(g) + Cl2(g) step II\n(i) Write the overall balanced equation\n(ii) What is the molecularity of each step?\n(iii) Write the rate law for each step\n\n\n\n### CHM 004: Organic Chemistry\n\n**7.** What are the reagents or products labelled a-f in the following transformations (diagram showing benzene ring transformations with MgBr, CH3CN, H+/H2O, CO2)?\n\n**7(b)** What is Friedel Craft's alkylation?\n\n**7(c)** Give two examples each of alkylation/acetylation reagents\n\n**8a)** An unknown compound was found by quantitative elemental analysis to contain 32% C, 6.67% H, 18.8% N and the remaining weight is assumed to be O. If the molecular mass of the compound is 75, what is the molecular formula?\n\n**8b)** Write the IUPAC names of the following structures (three organic structures shown)\n\n**Given two organic compounds: CH3COCH2CH3 and CH3CH2CH2CHO**\n(i) Which of these will react with metallic silver to form mirror on the wall of the test tube?\n(ii) Which of them will react with hot acidified KMnO4 to give mixtures of two acids\n(iii) Write out the reaction equations for the reactions in c(ii).",
      difficulty:"medium"
    },
    {
      id:"che-2017-p0001",
      subject:"chemistry",
      year:2017,
      category:"practical",
      question:"PRACTICAL CHEMISTRY -- QUANTITATIVE ANALYSIS (2017)\n\nYou are provided with a solution containing 1.3g of substance Z in 250 cm3 distilled water.\n(i) Clean your burette with distilled water and then with the standard solution of 0.100 moldm-3 HCl to be used for the titration\n(ii) Pipette 25 cm3 of the substance Z solution into a clean conical flask. Using methyl orange indicator, titrate with the standard HCl\n(iii) Repeat step (iii) until concordant results are obtained. Record your results.\nTidy up and answer the questions below.\n\n**Calculate:**\n(i) the number of moles of HCl in your average titre\n(ii) concentration (moldm-3) of X2CO3 in substance Z solution\n(iii) the number of moles of X2CO3 in the 250 cm3 of substance Z solution\n(iv) the number of moles of HCl that would react with the entire 250 cm3 of substance Z solution\n(v) identify substance Z and show your reasoning?\n\n\n\n### QUALITATIVE ANALYSIS\n\nYou are provided with sample B, a mixture of three simple salts, and you are required to perform the following experiments to identify the anions:\n\n**Test 1:** Introduce about 0.5g of B in the test tube provided, add equal amount of sodium carbonate and minimum volume of water, apply heat to boil and filter.\n\n**Test 2:** To a portion of filtrate from Test 1, add 5 cm3 of 2M HNO3 and apply heat to boil then add 0.5M AgNO3 until a precipitate is observed, then add excess 2M NH4OH.\n\n**Test 3:** To another portion of filtrate from Test 1, add 5 cm3 of 2M H2SO4 and heat to boil then add 0.5M BaCl2 until a precipitate is observed, then add excess 2M HCl.\n\n**Test 4:** To another portion of filtrate from Test 1, add 5 cm3 of 2M HCl and heat to boil, add freshly prepared solution of ferrous ammonium sulphate, then add slowly (carefully) by the side of the test tube concentrated H2SO4.\n(i) State the chemical compound formed in the final step of testes 2, 3 and 4.\n(ii) Give reasons for boiling extract with dilute acids in all the test tube.",
      difficulty:"medium"
    },


    
    {
      id:"che-2018-q0001",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The electronic configuration for Cu is",
      options:[
            {label:"A", text:"1s 22s 22p 63s 23p 6"},
            {label:"B", text:"1s 22s 22p 63s 23p 64s 23d 9"},
            {label:"C", text:"1s 22s 22p 63s 23p 64s 13d 10"},
            {label:"D", text:"1s 22s 23s 22p 64s 22p 6"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0002",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"What is the value of angular momentum quantum of a 3d orbital?",
      options:[
            {label:"A", text:"3"},
            {label:"B", text:"0"},
            {label:"C", text:"1"},
            {label:"D", text:"2"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0003",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The energy needed to remove an electron in the outermost shell of a gaseous atom is called?",
      options:[
            {label:"A", text:"Ionization energy"},
            {label:"B", text:"Electron affinity"},
            {label:"C", text:"Electrode potential"},
            {label:"D", text:"Photoelectronic energy"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0004",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Which of the following atomic properties generally increases down a group in the periodic table of elements?",
      options:[
            {label:"A", text:"Electronegativity"},
            {label:"B", text:"Atomic radius"},
            {label:"C", text:"Electron affinity"},
            {label:"D", text:"Ionization energy"},
          ],
      correctAnswer:"B",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0005",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Substances that are electron pair acceptors are called",
      options:[
            {label:"A", text:"Arrhenius bases"},
            {label:"B", text:"Lewis acids"},
            {label:"C", text:"Bronsted Lowry acids"},
            {label:"D", text:"Lewis bases"},
          ],
      correctAnswer:"B",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0006",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"All the A shampoo solution at 25degC has a hydroxide-ion concentration of 1.5 x 10-9moldm-3 . The solution is",
      options:[
            {label:"A", text:"Acidic"},
            {label:"B", text:"Neutral"},
            {label:"C", text:"Basic"},
            {label:"D", text:"Amphiprotic"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0007",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"In a measurement, significant figures include",
      options:[
            {label:"A", text:"All digits except zero that are measured"},
            {label:"B", text:"All digits except zero that are not measured"},
            {label:"C", text:"All zeros at the beginning of a number"},
            {label:"D", text:"All digits in a number"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0008",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The degeneracy of orbitals with angular momentum quantum number i = 2 is",
      options:[
            {label:"A", text:"2"},
            {label:"B", text:"3"},
            {label:"C", text:"5"},
            {label:"D", text:"1"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0009",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"What is the principle that allows the use of mass spectrometry in determination of the molecular weight of a compound?",
      options:[
            {label:"A", text:"Higher molecular weight compounds are less volatile"},
            {label:"B", text:"Higher molecular weight compounds are denser"},
            {label:"C", text:"A beam of higher molecular weight cations is deflected less by magnetic field"},
            {label:"D", text:"Ions with higher molecular weight absorb higher frequencies of light"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0010",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"State What is the oxidation state of oxygen in OF2?",
      options:[
            {label:"A", text:"+2"},
            {label:"B", text:"-2"},
            {label:"C", text:"-1"},
            {label:"D", text:"+1"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0011",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Which of the following is not true about ionization energy?",
      options:[
            {label:"A", text:"Ionization energy increases across a period"},
            {label:"B", text:"Reversal in trend of ionization occurs in passing from beryllium to baron"},
            {label:"C", text:"Half-filled subshell makes ionization energy of oxygen lower than that of nitrogen"},
            {label:"D", text:"Ionization energy does not depend on nuclear charge"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0012",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"In terms of Lewis concept, an acid and a base are a/an:",
      options:[
            {label:"A", text:"Proton donor and proton acceptor respectively"},
            {label:"B", text:"Electron donor and electron acceptor respectively"},
            {label:"C", text:"Proton acceptor and proton donor respectively"},
            {label:"D", text:"Electron acceptor and electron donor respectively"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0013",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Which of the following will affect the equilibrium position of the reaction? I2(g) + H2(g) <-> 2HI(g)",
      options:[
            {label:"A", text:"Addition of a catalyst"},
            {label:"B", text:"Increase in pressure"},
            {label:"C", text:"Decrease in pressure"},
            {label:"D", text:"Addition of HI"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0014",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Which of the following ions has the smallest size?",
      options:[
            {label:"A", text:"O 2+"},
            {label:"B", text:"Na+"},
            {label:"C", text:"Mg2+"},
            {label:"D", text:"F -"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0015",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"A sodium pellet is dropped into warm water and 500cm3 of hydrogen gas is liberated. What mass of sodium is involved in the reaction? [Na = 23; Vm = 22400cm3 ]",
      options:[
            {label:"A", text:"1.03g"},
            {label:"B", text:"0.51g"},
            {label:"C", text:"2.30g"},
            {label:"D", text:"0.98g"},
          ],
      correctAnswer:"B",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0016",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Calculate the percentage by mass of water of crystallization in MgSO4 . 7H2O [Mg = 24, S = 32,O = 16, H = 1]",
      options:[
            {label:"A", text:"51.2%"},
            {label:"B", text:"56.7%"},
            {label:"C", text:"50.12%"},
            {label:"D", text:"52.55%"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0017",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"What volume of 5 moldm-3 tetraoxosulp ate (VI) acid is required to prepare 300cm3 0f 0.5moldm-3 solutions?",
      options:[
            {label:"A", text:"30cm3"},
            {label:"B", text:"50cm3"},
            {label:"C", text:"3cm3"},
            {label:"D", text:"30cm3"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0018",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"An iron complex with molecular formula C34H32FeN4O4 , constitutes 6% of haemoglobin by mass. If a blood sample contains 0.75g haemoglobin, what mass of Fe is contributed by the complex? [O = 12, H = 1, Fe = 56, N = 14,O = 16]",
      options:[
            {label:"A", text:"0.0041g"},
            {label:"B", text:"0.0450g"},
            {label:"C", text:"0.06000g"},
            {label:"D", text:"0.0056g"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0019",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The temperature above which the liquid states of a substance no longer exist is called",
      options:[
            {label:"A", text:"Supercritical temperature"},
            {label:"B", text:"Critical pressure"},
            {label:"C", text:"Critical temperature"},
            {label:"D", text:"Critical point"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0020",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"According to the collision theory and kinetic theory, increase in temperature does the following except",
      options:[
            {label:"A", text:"Increases the frequency of collision"},
            {label:"B", text:"Increases the number of particles with energy greater than the activation energy"},
            {label:"C", text:"Increases the activation energy"},
            {label:"D", text:"Increases the kinetic energy of the molecules"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0021",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The part of the universe that is of immediate interest in a reaction is termed",
      options:[
            {label:"A", text:"Universe"},
            {label:"B", text:"Surrounding"},
            {label:"C", text:"System"},
            {label:"D", text:"Environment"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0022",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"An example of a natural radioactivity is",
      options:[
            {label:"A", text:"14 7N + 2 4He -> 17 8O + 1 1H"},
            {label:"B", text:"214 83Bi -> 214 84Po + -1 0 e"},
            {label:"C", text:"238 92U + 2 4He -> 17 8O + 1 1H"},
            {label:"D", text:"12 6C -> 12 7N + -1 1 e"},
          ],
      correctAnswer:"B",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0023",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The general gas equation can be used to calculate the molar mass, Mr value of a gas. For a sample of a gas of mass mg, which expression will give the value of Mr?",
      options:[
            {label:"A", text:"Mr = PVRT m"},
            {label:"B", text:"Mr = mPV RT"},
            {label:"C", text:"Mr = mRT PV"},
            {label:"D", text:"Mr = PV mRT"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0024",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Which of these bonds does not exist within a molecule of ammonium chloride?",
      options:[
            {label:"A", text:"Ionic"},
            {label:"B", text:"Covalent"},
            {label:"C", text:"Dative covalent"},
            {label:"D", text:"Van der waals"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0025",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The dissolution of a non-volatile solute in a volatile solvent",
      options:[
            {label:"A", text:"Increases its boiling point"},
            {label:"B", text:"Decreases its boiling point"},
            {label:"C", text:"Has no effect"},
            {label:"D", text:"Increases the vapour pressure"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0026",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Gaseous deviate from Charles' law at",
      options:[
            {label:"A", text:"High temperature"},
            {label:"B", text:"Low pressure"},
            {label:"C", text:"Low temperature"},
            {label:"D", text:"Moderate pressure"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0027",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The average distance of the orbital from the nucleus of an atom orbital is determined by the",
      options:[
            {label:"A", text:"Spin quantum number"},
            {label:"B", text:"Principal quantum number"},
            {label:"C", text:"Magnetic quantum"},
            {label:"D", text:"Orbital subshell"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0028",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"What is the standard cell potential for the overall reaction of the cell below? Cu(s)/Cu2+ (1M)//Ag+ (1M)/Ag(s) [Eredox 0 Cu2+ (aq)/Cu(s) = 0.3402V and E 0Ag+(aq)/Ag(s) = 0.7996V]",
      options:[
            {label:"A", text:"0.229V"},
            {label:"B", text:"1.2590V"},
            {label:"C", text:"0.4594V"},
            {label:"D", text:"1.1398V"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0029",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The element that gives no colour in flame is",
      options:[
            {label:"A", text:"Be"},
            {label:"B", text:"Ca"},
            {label:"C", text:"Na"},
            {label:"D", text:"Li"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0030",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"All group I metals react with water to form",
      options:[
            {label:"A", text:"Hydrogen gas only"},
            {label:"B", text:"Neutral solutions"},
            {label:"C", text:"Acidic solution with liberation of hydrogen"},
            {label:"D", text:"Strong caustic solution with liberation of hydrogen"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0031",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The effect of acid rain includes the following except",
      options:[
            {label:"A", text:"Death of aquatic animals"},
            {label:"B", text:"Damage of buildings and status"},
            {label:"C", text:"Corrosion of iron"},
            {label:"D", text:"Depletion of ozone layer"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0032",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Which of the following is not a greenhouse gas?",
      options:[
            {label:"A", text:"CFCS"},
            {label:"B", text:"SO2"},
            {label:"C", text:"H2O"},
            {label:"D", text:"CH4"},
          ],
      correctAnswer:"B",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0033",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Which of the following is the correct increasing order of conductivity in aqueous solution?",
      options:[
            {label:"A", text:"Li+, Na+, K +, Cs+,Rb+"},
            {label:"B", text:"Rb+, Na+, K +, Cs+, Li+"},
            {label:"C", text:"Li+, Na+, K +,Rb+, Cs+"},
            {label:"D", text:"Na+, K +, Cs+, Li+, Rb+"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0034",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The alkaline earth metals become more reactive as we",
      options:[
            {label:"A", text:"Ascend the group"},
            {label:"B", text:"Descend the group"},
            {label:"C", text:"Introduce other group elements"},
            {label:"D", text:"Introduce an external force"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0035",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Chromium has the following isotopic masses and fractional abundances Mass Number Isotopic Mass (amu) Fractional Abundance 50 49.9461 0.0435 52 51.9405 0.8379 53 52.9407 0.0950 54 53.9389 0.0236 What is the atomic mass of chromium?",
      options:[
            {label:"A", text:"55.49 amu"},
            {label:"B", text:"50.49 amu"},
            {label:"C", text:"51.99 amu"},
            {label:"D", text:"51.00 amu"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0036",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"What is the name given to this complex ion [Co(SO4)(NH3)5 ] +?",
      options:[
            {label:"A", text:"Pentaaminesulphatocobalt(I)ion"},
            {label:"B", text:"Pentaaminesulphatocobaltate(II)ion"},
            {label:"C", text:"Pentaaminesulphatocobalt(III)ion"},
            {label:"D", text:"Pentaaminesulphatocobalt(IV)ion"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0037",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Which of the following will form pale yellow precipitate slightly soluble in aqueous ammonia upon treatment with trioxonitrate (V) acid followed by silver nitrate",
      options:[
            {label:"A", text:"NAHCO3"},
            {label:"B", text:"NaCI"},
            {label:"C", text:"NaBr"},
            {label:"D", text:"Nal"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0038",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Which of the statement below is not a property of halogen?",
      options:[
            {label:"A", text:"They all exhibit valency of +1"},
            {label:"B", text:"They belong to the P - Block of the periodic table"},
            {label:"C", text:"They are non-metals"},
            {label:"D", text:"They are all oxidizing agents"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0039",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"An element which can be detected using Lassaigne's test is",
      options:[
            {label:"A", text:"Sodium"},
            {label:"B", text:"Sulphur"},
            {label:"C", text:"Potassium"},
            {label:"D", text:"Magnesium"},
          ],
      correctAnswer:"B",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0040",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"If the molecule A-B breaks homolytically, then",
      options:[
            {label:"A", text:"A becomes negatively charged"},
            {label:"B", text:"A becomes positively charged"},
            {label:"C", text:"Electrons are shared evenly"},
            {label:"D", text:"Both electrons move to B because B is more electronegative"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0041",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Lucas reagent is used to distinguish between",
      options:[
            {label:"A", text:"Saturated and unsaturated hydrocarbons"},
            {label:"B", text:"Primary and secondary amines"},
            {label:"C", text:"Alkanals and alkanones"},
            {label:"D", text:"The three classes of alkanols"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0042",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The IUPAC name of the compound CH = C - CH2 - CH2 - COOH is",
      options:[
            {label:"A", text:"1 - pentyne - 4 - oic acid"},
            {label:"B", text:"Pentyne - 1 - oic acid"},
            {label:"C", text:"5 - pentyn - 1 - oic acid"},
            {label:"D", text:"Pent - 4 - yne - 1 - oic acid"},
          ],
      correctAnswer:"B",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0043",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Which of the following compounds will show geometrical isomerism?",
      options:[
            {label:"A", text:"1 - butane"},
            {label:"B", text:"2 - butene"},
            {label:"C", text:"2 - pentyne"},
            {label:"D", text:"1, 2 - dic loropropane"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0044",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The number of pi electrons in butyne is",
      options:[
            {label:"A", text:"6"},
            {label:"B", text:"2"},
            {label:"C", text:"4"},
            {label:"D", text:"8"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0045",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The change in hybridization of carbon when two moles of hydrogen gas is passed over ethyne in the presence of platinum is",
      options:[
            {label:"A", text:"Sp 2 to Sp 3"},
            {label:"B", text:"Sp to Sp 3"},
            {label:"C", text:"Sp 3 to Sp"},
            {label:"D", text:"Sp to Sp 2"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0046",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"2.40g of ethanol was reacted with an excess of aqueous acidified potassium dic romate (VI). The yield of the desired organic product was 70.0%. What mass of the desired product was collected? [C = 12,O = 16, H = 1]",
      options:[
            {label:"A", text:"1.60g"},
            {label:"B", text:"4.10g"},
            {label:"C", text:"2.29g"},
            {label:"D", text:"3.29g"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0047",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"In the reaction between propene and hydrogen chloride, the electrophile that initiates the reaction is",
      options:[
            {label:"A", text:"The pi electrons of C = C bond in propane"},
            {label:"B", text:"The partially positive hydrogen atom from HCI"},
            {label:"C", text:"The partially negative chlorine atom from HCI"},
            {label:"D", text:"The fully positive hydrogen from HCI"},
          ],
      correctAnswer:"B",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0048",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Iodo exane and 2 - iodooctane are related as",
      options:[
            {label:"A", text:"Functional isomers"},
            {label:"B", text:"Positional isomers"},
            {label:"C", text:"Chain isomers"},
            {label:"D", text:"Homologues"},
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0049",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"Which of the following has the shortest carbon-carbon bond length?",
      options:[
            {label:"A", text:"Propene"},
            {label:"B", text:"Propane"},
            {label:"C", text:"Propyne"},
            {label:"D", text:"Ethane"},
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2018-q0050",
      subject:"chemistry",
      year:2018,
      category:"objective",
      question:"The properties of organic molecules are related to Carbon to Carbon bond properties such as: (I) Bond Length (II) Bond dissociation energy (III) Bond rotation Which of these properties reveal the fact that a pi - bond is weaker than a   - bond?",
      options:[
            {label:"A", text:"(II) Only"},
            {label:"B", text:"(III) Only"},
            {label:"C", text:"(I) Only"},
            {label:"D", text:"(I) and (III)"},
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2018-t0001",
      subject:"chemistry",
      year:2018,
      category:"theory",
      course:"CHM 001",
      question:"1.a What are acid-base indicators? (1 mark)\n1.b A 550mg tablet containing vitamin C, C6H8O6\n, was dissolved in water and \nreacted with bromine (C6H8O6\n, + Br2 -> C6H6O6 + 2HBr). The resulting \nsolution was titrated with 40cm3 of 0.145M NaOH\n(HBr + NaOH -> NaBr + H2O)\n[C = 12, Na = 23,O = 16, H = 1, Br = 79]\ni) Calculate the percentage of vitamin C in the tablet. Calculate the percentage of \nCarbon in the Vitamin C content of the tablet.\n(6 marks)\n1.c The equilibrium-constant expression for a reaction is \nKC =\n[NO2] [O2]\n[N2O5\n]\n2\ni) Write the balanced chemical equation corresponding to this expression.\nii) What is the equilibrium constant expression when the concentrations are halved?\niii) Write the equilibrium constant expression for c (ii) above when the equation is \nreversed\n(3 marks)\n2.a\ni) Define an acid and a base in terms of Browsted-Lowry concept\n(2 marks)\nii) Calculate the pH of a buffer solution containing\n0.623moldm-3  exanoic acid and 0.812moldm-3\nsodium  exanoate.\n[Ka  exanoic acid = 1.32 x 10 - 5]. (2 marks)",
      difficulty:"medium"
    },
    {
      id:"che-2018-t0002",
      subject:"chemistry",
      year:2018,
      category:"theory",
      course:"CHM 001",
      question:"2.a\ni) Define an acid and a base in terms of Browsted-Lowry concept\n(2 marks)\nii) Calculate the pH of a buffer solution containing\n0.623moldm-3  exanoic acid and 0.812moldm-3\nsodium  exanoate.\n[Ka  exanoic acid = 1.32 x 10 - 5]. (2 marks)\n2.b Classify the reactants in each of the following reactions as acid or base and \nidentify the acid-base conjugate pairs:\ni) NH4\n+ + H2O <-> NH3 + H2O\n+ (2 marks)\nii) OH- + CH3NH2 <-> CH3NH3\n+ + O\n2- (2 marks)\n2.c Using relevant reactions equations, explain why\ni) Water is amphiprotic (1 mark)\nii) Methanol is a Bronsted-Lowry acid (1 mark)\nCHM 002: PHYSICAL CHEMISTRY",
      difficulty:"medium"
    },
    {
      id:"che-2018-t0003",
      subject:"chemistry",
      year:2018,
      category:"theory",
      course:"CHM 002",
      question:"3.a Using the following data\nFe(\n3\naq\n+\n) + e\n- <-> Fe(\n2\naq\n+\n)\n; E\n0 = +0.77V\nMnO4(aq) + 8H(\n+\naq) + 5e\n- <-> Mn(\n2\naq\n+\n) + 4H2O(l)\n; E\n0 = +1.52V\nI2(aq) + 2e\n- <-> 2l(\n-\naq)\n; E\n0 = +0.54V\nCr2O7\n2\n(\n-\naq) + 14H(\n+\naq) + 6e\n- <-> 2Cr5+ + 7H2O(l)\n; E\n0 = +1.33V\nPredict the outcome of mixing aqueous solutions of\ni) Iron (II) sulphate with acidified potassium manganese (VII) (1 mark)\nii) Potassium iodide with acidified potassium dichromate (VI) (1 mark)\n3.b Write the half equations and the balanced equations for the reactions you predict \nabove. (2 marks)\n3.c Calculate the standard cell potential in each case (2 marks)\n3.d The reaction 1\n2\nN2 +\n3\n2\nH2 -> NH2 proceeded in a closed autoclave of volume\n5dm-3\nin 1 second, 0.01 mole of nitrogen reacted. Calculate the rate of\ni) Consumption of nitrogen (1 mark)\nii) Consumption of hydrogen (1 mark)\niii) Formation of ammonia (1 mark)\niv) The reaction (1 mark)",
      difficulty:"medium"
    },
    {
      id:"che-2018-t0004",
      subject:"chemistry",
      year:2018,
      category:"theory",
      course:"CHM 002",
      question:"4.a State two differences between alpha ( ) and beta ( ) particles. \n(2 marks)\n4.b\ni) Define nuclear fusion \nii) Calculate the nuclear energy per mole for the following nuclear reaction:\nN7\n14 + 2\n4He <-> 17\n8O + 1\n1H\nGiven the following isotropic masses\nN7\n14 = 13.9992amu\nHe 2\n4 = 4.0026amu\nO8\n17 = 16.9991amu\nH1\n1 = 1.0078amu\n1amu = 1.66 x 10-27kg atom-1\nNA = 6.023 x 1023 atom mol-1\n4.c\ni) State Hess's Law\nii) For the reaction:\nC2H4(g) + 3O2(g) -> 2CO2(g) + 2H2O(g)\n Hrxn\n0 = -1323kJmol-1\nGiven t at S\n0\n[C2H4(g)\n] = 219.6 Jmol-1\n;\nS\n0\n[O2(g)] = 205 Jmol-1\nS\n0\n[CO2(g)] = 213.6 Jmol-1\nS\n0\n[H2O(g)] = 130.6 Jmol-1\n, Calculate the value of  Grxn\n0 at 250\n(3 marks)\nCHM 003: INORGANIC CHEMISTRY",
      difficulty:"medium"
    },
    {
      id:"che-2018-t0005",
      subject:"chemistry",
      year:2018,
      category:"theory",
      course:"CHM 003",
      question:"5.a The elements in Group II show a variety of trends in their properties\ni) Explain the trend in reactivity of magnesium, calcium and barium with cold water.\n(2 marks)\nii) Write the equation for the reaction of magnesium with steam\n(1 mark)\n5.b Name an element among the period three elements which forms an amphoteric \noxide and write equations which illustrate this amphoteric property.\n(2 marks)\n5.c\ni) What is meant by the term ionization energy?\n(1 mark)\nii) Explain why the first ionization energy of nitrogen is greater than that of oxygen.\n(2 marks)\n5.d List four unique properties of carbon that makes it different from other members of \ngroup 14 elements. (2 marks)\n6.a\ni) What is a Complex ion? (1 mark)\nii) What is the name given to the molecules of ions bonded to a complex ion?\n(1 mark)\n6.b\ni) What is the co-ordination number of the metal in the following complexes\n[Cu(NH3\n)4\n(H2O)2\n]\n2+ and\n[Cu(H2NCH2CH2NH2\n)2\n]\n2+ (1 mark)\nii) Provide the IUPAC names for the following:\n(1) [Fe(H2O)2\n(en)2\n]\n +\n(2) [Ni(NH3\n)2Cl4\n]\n -\n(3) [Cr(NH3\n)3\n(H2O)3\n]Cl3\n(4) [Co(H2NCH2CH2NH2\n)3\n(SO4\n)3\n] (2 marks)\n6.c\ni) Briefly explain why beryllium tends to be different from the elements in group 2 of \nthe periodic table. Give two anomalous properties of beryllium\n(2 marks)\nii) Explain the trend of the thermal decomposition of the carbonates and nitrates of \nthe alkaline earth metals. (2 marks)\nCHM 004: ORGANIC CHEMISTRY\n7.a\ni) What is isomerism? (1 mark)\nii) Draw the structural formula of the isomeric alcohols with the molecular formula \nC4H10O and name them using the IUPAC system of naming. (4 marks)\niii) What are the products of oxidation of each of the isomers in 1a (ii)?\n(2 marks)",
      difficulty:"medium"
    },
    {
      id:"che-2018-t0006",
      subject:"chemistry",
      year:2018,
      category:"theory",
      course:"CHM 003",
      question:"6.a\ni) What is a Complex ion? (1 mark)\nii) What is the name given to the molecules of ions bonded to a complex ion?\n(1 mark)\n6.b\ni) What is the co-ordination number of the metal in the following complexes\n[Cu(NH3\n)4\n(H2O)2\n]\n2+ and\n[Cu(H2NCH2CH2NH2\n)2\n]\n2+ (1 mark)\nii) Provide the IUPAC names for the following:\n(1) [Fe(H2O)2\n(en)2\n]\n +\n(2) [Ni(NH3\n)2Cl4\n]\n -\n(3) [Cr(NH3\n)3\n(H2O)3\n]Cl3\n(4) [Co(H2NCH2CH2NH2\n)3\n(SO4\n)3\n] (2 marks)\n6.c\ni) Briefly explain why beryllium tends to be different from the elements in group 2 of \nthe periodic table. Give two anomalous properties of beryllium\n(2 marks)\nii) Explain the trend of the thermal decomposition of the carbonates and nitrates of \nthe alkaline earth metals. (2 marks)\nCHM 004: ORGANIC CHEMISTRY\n7.a\ni) What is isomerism? (1 mark)\nii) Draw the structural formula of the isomeric alcohols with the molecular formula \nC4H10O and name them using the IUPAC system of naming. (4 marks)\niii) What are the products of oxidation of each of the isomers in 1a (ii)?\n(2 marks)",
      difficulty:"medium"
    },
    {
      id:"che-2018-t0007",
      subject:"chemistry",
      year:2018,
      category:"theory",
      course:"CHM 004",
      question:"7.a\ni) What is isomerism? (1 mark)\nii) Draw the structural formula of the isomeric alcohols with the molecular formula \nC4H10O and name them using the IUPAC system of naming. (4 marks)\niii) What are the products of oxidation of each of the isomers in 1a (ii)?\n(2 marks)\n7.b Show the conversion of ethanoic acid into the following with suitable equation and \nreagents;\ni) Acid chloride (II) Acid anhydride (III) Ester (3 marks)\n8.a\ni) What is a Grignard reagent?\n(1 mark)\nii) Give an equation for the preparation of Grignard reagent. \n(1 mark)\niii) What is the product of the reaction?\nCH3CH2CHO + CH3CH2MgBr -> ? + ?\nGive the IUPAC name of the product\n(1 mark)",
      difficulty:"medium"
    },
    {
      id:"che-2018-t0008",
      subject:"chemistry",
      year:2018,
      category:"theory",
      course:"CHM 004",
      question:"8.a\ni) What is a Grignard reagent?\n(1 mark)\nii) Give an equation for the preparation of Grignard reagent. \n(1 mark)\niii) What is the product of the reaction?\nCH3CH2CHO + CH3CH2MgBr -> ? + ?\nGive the IUPAC name of the product\n(1 mark)\n8.b Reactions of alcohols involve cleavage of the C - O bond or that of the O - H\nbond. Give one example each of such reactions\n(2 marks)\n8.c Why does benzene not undergo addition reaction as expected of unsaturated \nhydrocarbons? (1 mark)\n8.d State two (2) reasons why aldehydes are more reactive than ketones.\n(2 marks)\n8.e Name the monomers used in the synthesis of Nylon 6,6. (1 mark)",
      difficulty:"medium"
    },

    {
      id:"che-2019-q0001",
      subject:"chemistry",
      year:2019,
      category:"objective",
      question:"When 4 mol of nitrogen dioxide was put into a 1 dm  container and heated to a constant temperature, the equilibrium mixture contained 0.8 mol of oxygen. What is the numerical value of equilibrium constant, Kc, at the temperature of the experiment? 14. In which of the following reactions is the change in entropy positive? 15. A system in which only energy is transferred between the system and the surroundings is 16. Which of these orbitals is the most stable? 17. Identify the species A in the radioactive reaction represented by the equation below.    Th      U + A 18. Arrange the following elements in order of decreasing reducing power Na, Rb, K, Cs 19. Hydride of the halogens with the highest stability to heat is 20. Hydrocarbons which react with ammoniacal copper(I)chloride solution conform to the general molecular formula _____ 21. In the coordination compounds, [Co(NH ) ]F , if the primary valences of Co and Fe are both +3, x? 22. Which of the following is TRUE about sodium chloride in the solid state? 23. A method of preventing corrosion that involves coating steel with zinc metal is called 24. Which type of radioactive decay produces a daughter nucleus with a higher atomic number? 25. For a reaction that is second order with respect to a reactant, A, how many times does the rate increase if the concentration of A increases by a factor of 2? 26. What is the number of atoms present in 21.6 g of silver? [Ag=108 gmol  , N =6.023 x 10   mol  ] 27. Transition metal atoms without unpaired electrons are said to be _____ 28. Strontium is an element in Group 2 of the Periodic Table. Which of the following statements about strontium is NOT correct?",
      options:[
            {label:"A", text:"0.8"},
          {label:"B", text:"2.4"},
          {label:"C", text:"1.6"},
          {label:"A", text:"2Ag (aq) + Zn(s)   Zn  (aq) + 2Ag(s)"},
          {label:"B", text:"2SO (g)   2SO (g) + O (g)"},
          {label:"C", text:"2HF(g)   H (g) + F (g)"},
          {label:"A", text:"open system."},
          {label:"B", text:"closed system."},
          {label:"C", text:"isolated system."},
          {label:"A", text:"3d"},
          {label:"B", text:"4p"},
          {label:"C", text:"5p"},
          {label:"A", text:" "},
          {label:"B", text:" "},
          {label:"C", text:" "},
          {label:"A", text:"Cs > K > Rb > Na"},
          {label:"B", text:"Na > K > Cs > Rb"},
          {label:"C", text:"Cs > Rb > K > Na"},
          {label:"A", text:"HCl"},
          {label:"B", text:"HBr"},
          {label:"C", text:"HF"},
          {label:"A", text:"CnHn"},
          {label:"B", text:"CnH2n"},
          {label:"C", text:"CnH2n+2"},
          {label:"A", text:"2"},
          {label:"B", text:"1"},
          {label:"A", text:"Its ions are linked by metallic bonds"},
          {label:"B", text:"It exists as aggregate of ions"},
          {label:"C", text:"It conducts electricity"},
          {label:"A", text:"painting"},
          {label:"B", text:"enameling"},
          {label:"C", text:"electroplating"},
          {label:"A", text:" "},
          {label:"B", text:" -"},
          {label:"A", text:"1 time"},
          {label:"B", text:"2 times"},
          {label:"C", text:"3 times"},
          {label:"A", text:"0.2 x 10  "},
          {label:"B", text:"1.204 x 10  "},
          {label:"C", text:"6.02 x 10  "},
          {label:"A", text:"diamagnetic"},
          {label:"B", text:"paramagnetic"},
          {label:"C", text:"ferromagnetic"},
          {label:"A", text:"Its first ionization energy is lower than t"}
          ],
      correctAnswer:"C",
      explanation:"Reaction: 2NO    2NO + O . Initial: 4 mol. Change: -1.6 mol NO , +1.6 mol NO, +0.8 mol O . Equilibrium: [NO ]=2.4, [NO]=1.6, [O ]=0.8. Kc = (1.6  * 0.8) / 2.4  = 1.6.",
      difficulty:"medium"
    },
    {
      id:"che-2019-q0002",
      subject:"chemistry",
      year:2019,
      category:"objective",
      question:"The energy associated with the process below is called:",
      options:[
            {label:"A", text:"electron affinity -"},
          {label:"B", text:"ionization energy -"},
          {label:"C", text:"lattice energy -"},
          {label:"D", text:"binding energy"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2019-q0003",
      subject:"chemistry",
      year:2019,
      category:"objective",
      question:"Nitrogen dioxide decomposes on heating according to the following equation:",
      options:[
            {label:"A", text:"4 /(0.8    0.8) -"},
          {label:"B", text:"(1.6    0.8)/(4 ) -"},
          {label:"C", text:"(1.6    0.8)/(4 ) -"},
          {label:"D", text:"1.6 /(4 )"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2019-q0004",
      subject:"chemistry",
      year:2019,
      category:"objective",
      question:"Identify the species A in the radioactive reaction represented by the equation below:",
      options:[
            {label:"A", text:" He (alpha) -"},
          {label:"B", text:" e (beta) -"},
          {label:"C", text:"   -"},
          {label:"D", text:" He"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2019-q0005",
      subject:"chemistry",
      year:2019,
      category:"objective",
      question:"Given that the standard enthalpy changes of formation of TiO (s) and CO(g) are 940 kJmol   and  110 kJmol   respectively. What is the standard enthalpy change for:",
      options:[
            {label:"A", text:" 830 -"},
          {label:"B", text:" 720 -"},
          {label:"C", text:"+720 -"},
          {label:"D", text:"+830"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2019-q0006",
      subject:"chemistry",
      year:2019,
      category:"objective",
      question:"Identify P in the reaction:",
      options:[
            {label:"A", text:"C H CHO -"},
          {label:"B", text:"C H MgBr -"},
          {label:"C", text:"C H COCH  -"},
          {label:"D", text:"C H COC H "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2019-q0007",
      subject:"chemistry",
      year:2019,
      category:"objective",
      question:"What is the major product of the following reaction?",
      options:[
            {label:"A", text:"(structure A   2-methylbut-1-ene type) -"},
          {label:"B", text:"(structure B   2-methylbut-2-ene type) -"},
          {label:"C", text:"(structure C   methylenbutane type) -"},
          {label:"D", text:"(structure D)"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2020-q0001",
      subject:"chemistry",
      year:2020,
      category:"objective",
      question:"Calculate the relative molecular mass of a gaseous compound if 13.15 g of the compound occupies 4.80 dm  at STP.",
      options:[
            {label:"A", text:"61 -"},
          {label:"B", text:"34 -"},
          {label:"C", text:"24 -"},
          {label:"D", text:"29"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2020-q0002",
      subject:"chemistry",
      year:2020,
      category:"objective",
      question:"What is the volume of oxygen required to burn completely 45 cm  of methane?",
      options:[
            {label:"A", text:"400 cm  -"},
          {label:"B", text:"180 cm  -"},
          {label:"C", text:"90 cm  -"},
          {label:"D", text:"22.5 cm "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2020-q0003",
      subject:"chemistry",
      year:2020,
      category:"objective",
      question:"What mass of carbon dioxide is formed when 60.0 g of carbon is burned in 750.0 g of oxygen? [C = 12, O = 16]",
      options:[
            {label:"A", text:"60.0 g -"},
          {label:"B", text:"160.0 g -"},
          {label:"C", text:"220.0 g -"},
          {label:"D", text:"1031 g"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2020-q0004",
      subject:"chemistry",
      year:2020,
      category:"objective",
      question:"What is the percentage by mass of carbon present in 6.0 g of a hydrocarbon which burns completely in air to produce 11.0 g of carbon dioxide?",
      options:[
            {label:"A", text:"25% -"},
          {label:"B", text:"33% -"},
          {label:"C", text:"50% -"},
          {label:"D", text:"75%"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2020-q0005",
      subject:"chemistry",
      year:2020,
      category:"objective",
      question:"What is the mole fraction of hydrogen gas in a mixture containing 32.0 g of oxygen gas and 32.0 g of sulphur (IV) oxide?",
      options:[
            {label:"A", text:"21 cm  -"},
          {label:"B", text:"97 cm  -"},
          {label:"C", text:"161 cm  -"},
          {label:"D", text:"735 cm "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2020-q0006",
      subject:"chemistry",
      year:2020,
      category:"objective",
      question:"Use the following data to determine the standard enthalpy of formation of solid ICl :",
      options:[
            {label:"A", text:"-60 kJ/mol -"},
          {label:"B", text:"-74 kJ/mol -"},
          {label:"C", text:"-81 kJ/mol -"},
          {label:"D", text:"-162 kJ/mol"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2020-q0007",
      subject:"chemistry",
      year:2020,
      category:"objective",
      question:"Name the following compound:",
      options:[
            {label:"A", text:"3-ethylbutanamine -"},
          {label:"B", text:"3-methylamine pentane -"},
          {label:"C", text:"2-ethylbutanamine -"},
          {label:"D", text:"3-ethyl-4-butanamine"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2020-q0008",
      subject:"chemistry",
      year:2020,
      category:"objective",
      question:"Branched chain isomers have the following properties when compared to their linear isomers:",
      options:[
            {label:"A", text:"Low boiling point, low melting point and high density -"},
          {label:"B", text:"Lower boiling point, high melting point and lower density -"},
          {label:"C", text:"Higher boiling point, high melting point and low density -"},
          {label:"D", text:"Lower boiling point, low melting point and low density"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2021-q0001",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"The reproducibility or repeatability of a measurement is termed",
      options:[
            {label:"A", text:"Accuracy"},
          {label:"B", text:"Precision"},
          {label:"C", text:"Range"},
          {label:"D", text:"Confidence Interval"}
          ],
      correctAnswer:"B",
      explanation:"Precision refers to the closeness of two or more measurements to each other, which is the definition of reproducibility or repeatability.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0002",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Fucoserratene, a hydrocarbon usually identified as the sexual pheromone of the brown seaweed Fucus serratus has an empirical formula of C 2 H 3 . If the experimentally determined molecular weight of this substance is 108 g/mol, the molecular formula of fucoserratene is",
      options:[
            {label:"A", text:"  4   6"},
          {label:"B", text:"  6   9"},
          {label:"C", text:"  8   12"},
          {label:"D", text:"  10   15"}
          ],
      correctAnswer:"B",
      explanation:"Ionic compounds conduct electricity when molten or in aqueous solution because the ions are free to move, but not in the solid state where they are fixed in a lattice.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0003",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"In a chemical reaction, the heat change at constant pressure is referred to as",
      options:[
            {label:"A", text:"Entropy"},
          {label:"B", text:"Enthalpy"},
          {label:"C", text:"Gibbs free energy"},
          {label:"D", text:"Bond energy"}
          ],
      correctAnswer:"C",
      explanation:"Empirical mass of C2H3 = 27. Ratio = 108/27 = 4. Molecular formula = 4 * (C2H3) = C8H12.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0004",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Which of the following is used as detector for radiations from nuclear processes?",
      options:[
            {label:"A", text:". Cyclotron"},
          {label:"B", text:"Particle accelerator"},
          {label:"C", text:"Geiger counter"},
          {label:"D", text:"Electron volts system"}
          ],
      correctAnswer:"C",
      explanation:"A Geiger counter is a standard instrument used to detect and measure ionizing radiation.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0005",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"The following represents a plot obtained from an experiment to graphically determine the activation energy of a reaction. ln k 1/T (K -1 ) Which of the following is a measure of the slope?",
      options:[
            {label:"A", text:"    "},
          {label:"B", text:"        "},
          {label:"C", text:"     "},
          {label:"D", text:"-       "}
          ],
      correctAnswer:"B",
      explanation:"According to the Arrhenius equation (ln k = -Ea/RT + ln A), the slope of a plot of ln k versus 1/T is -Ea/R.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0006",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"The alpha ( -) scattering experiment is synonymous with",
      options:[
            {label:"A", text:"J. J. Thomson"},
          {label:"B", text:"Ernest Rutherford"},
          {label:"C", text:"James Chadwick"},
          {label:"D", text:"Henry Mosley"}
          ],
      correctAnswer:"B",
      explanation:"Ernest Rutherford conducted the famous gold foil experiment using alpha particles to discover the atomic nucleus.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0007",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"A solid which contains more than one type of bonding is 7 27. Which of the following is/are true of alkali metals (I) They have the largest size in their respective period (II) They have weak metallic bonding (III) They are soft and they have low melting point",
      options:[
            {label:"A", text:"Ice."},
          {label:"B", text:"Diamond."},
          {label:"C", text:"Iron."},
          {label:"D", text:"Calcium oxide. 23. What is the coordination number of the coordination compound Pt(NH 3 ) 2 C 2 O 4 ?"},
          {label:"A", text:"3"},
          {label:"B", text:"4"},
          {label:"C", text:"6"},
          {label:"D", text:"8  24. All the following will exhibit common ion effect except"},
          {label:"A", text:"Addition of sodium acetate to a solution of acetic acid."},
          {label:"B", text:"Addition of sodium chromate to a saturated solution of lead chromate."},
          {label:"C", text:"Addition of hydrochloric acid to a saturated solution of silver chloride."},
          {label:"D", text:"Addition of hydrochloric acid to a saturated solution of silver nitrate. 25. When white phosphorus burns in air, it produces phosphorus (V) oxide. P 4 ( s ) + 5O 2   ( g )   P 4 O 10 ( s );     H   =   3010 kJ What is   H   for the following equation? P 4 O 10 ( s )   P 4 ( s ) + 5O 2   ( g )"},
          {label:"A", text:"+ 3010 kJ"},
          {label:"B", text:"  3010 kJ"},
          {label:"C", text:"+ 602 kJ"},
          {label:"D", text:"  602 kJ 26. Water gas is a mixture of two gases namely"},
          {label:"A", text:"         "},
          {label:"B", text:"   2         2"},
          {label:"C", text:"         2"},
          {label:"A", text:"I only"},
          {label:"B", text:"II only"},
          {label:"C", text:"I,II and III"},
          {label:"D", text:"I and III only 28. The following statements are properties of group 17 elements except"},
          {label:"A", text:"They have a valency of -1"},
          {label:"B", text:"They belong to the p-block of the periodic table"},
          {label:"C", text:"They are all non-metals"},
          {label:"D", text:"They are all reducing agents with Fluorine having the highest reducing power."}
          ],
      correctAnswer:"D",
      explanation:"Calcium oxide (CaO) is an ionic solid, but it is often cited in this context because it contains both ionic bonding and, in some structural contexts, lattice energy considerations; however, looking at the options, it is the most complex. Regarding the alkali metal question (27), all statements (I, II, III) are true.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0008",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Which of the following does not exhibit allotropy?",
      options:[
            {label:"A", text:"Sulphur"},
          {label:"B", text:"Phosphorus"},
          {label:"C", text:"Carbon"},
          {label:"D", text:"Nitrogen"}
          ],
      correctAnswer:"D",
      explanation:"Nitrogen is a diatomic gas and does not exhibit allotropy, unlike Sulphur, Phosphorus, and Carbon.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0009",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Why is the ionic radius of a chloride ion larger than the ionic radius of a sodium ion?",
      options:[
            {label:"A", text:"A chloride ion has one more occupied electron shell than a sodium ion"},
          {label:"B", text:"chlorine has a higher proton number than sodium"},
          {label:"C", text:"Ionic radius increases regularly across the third period"},
          {label:"D", text:"Sodium is a metal, chloride is a non-metal"}
          ],
      correctAnswer:"A",
      explanation:"The chloride ion (Cl-) has electrons in the third shell, whereas the sodium ion (Na+) has lost its third shell, leaving it with only two occupied shells.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0010",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Which group of particles is in order of increasing size?",
      options:[
            {label:"A", text:"N, O, F"},
          {label:"B", text:"N 3 -   , O 2    , F    "},
          {label:"C", text:"Na + , Mg 2+   , Al 3+"},
          {label:"D", text:"Na + , Ne, F    "}
          ],
      correctAnswer:"D",
      explanation:"Na+ (10e-), Ne (10e-), and F- (10e-) are isoelectronic. Size decreases as nuclear charge (proton number) increases: F- > Ne > Na+.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0011",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Diagonal relationships exist between the following pairs except 9",
      options:[
            {label:"A", text:"Be and Al"},
          {label:"B", text:"B and Si"},
          {label:"C", text:"Li and Mg"},
          {label:"D", text:"Mg and Al 36. Chlorine react with methane in the presence of sunlight through a process known as free radical reaction, which equation represents the propagation step?"},
          {label:"A", text:"CH 4   + Cl    CH 3   + HCl"},
          {label:"B", text:"CH 3   + CH 3     C 2 H 6"},
          {label:"C", text:"CH 3   + Cl    CH 3 Cl"},
          {label:"D", text:"Cl 2     2Cl  37. What is the product of the reaction between bromine and ethene gas?"},
          {label:"A", text:"2-bromoethane"},
          {label:"B", text:"Bromoethane"},
          {label:"C", text:"1, 2-dibromoethane"},
          {label:"D", text:"1, 1-dibromoethane 38. The IUPAC name of the compound CH C-CH 2 -CH 2 -COOH is"},
          {label:"A", text:"1-pentyn-4-oic acid"},
          {label:"B", text:"pentyn-1-oic acid"},
          {label:"C", text:"5-pentyn-1-oic acid"}
          ],
      correctAnswer:"D",
      explanation:"Diagonal relationships exist between Li-Mg, Be-Al, and B-Si. Mg and Al are in the same period, not diagonally related.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0012",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"A family of organic compounds which follows a regular structural pattern such that each successive member differs from the preceding one by a     2         is termed",
      options:[
            {label:"A", text:"Homologue"},
          {label:"B", text:"Organic series"},
          {label:"C", text:"Homologous series"},
          {label:"D", text:"Isotopic series"}
          ],
      correctAnswer:"C",
      explanation:"A homologous series is a group of organic compounds where each successive member differs by a -CH2- unit.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0013",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"The hybridization of the carbon atom in ethyne is",
      options:[
            {label:"A", text:"sp 4"},
          {label:"B", text:"sp"},
          {label:"C", text:"sp 3"},
          {label:"D", text:"sp 2 . 41. The following types of isomerism are found in aliphatic alkanes EXCEPT"},
          {label:"A", text:"Geometric isomerism"},
          {label:"B", text:"Position isomerism"},
          {label:"C", text:"Chain isomerism"},
          {label:"D", text:"Structural isomerism 42. How many isomers are possible for a hydrocarbon with molecular formula C 4 H 8 ?"},
          {label:"A", text:"two"},
          {label:"B", text:"three"},
          {label:"C", text:"four"},
          {label:"D", text:"six 43. What compounds are formed when sodium metal reacts with propanol?"},
          {label:"A", text:"Sodium propoxide and hydrogen"},
          {label:"B", text:"Sodium oxide and propene"},
          {label:"C", text:"Sodium hydroxide and propene"},
          {label:"D", text:"Sodium methoxide and water"}
          ],
      correctAnswer:"B",
      explanation:"Ethyne (HC CH) contains a triple bond, requiring sp hybridization for the carbon atoms.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0014",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"According to Br nsted-Lowry, an acid is a\\\\\\\\an",
      options:[
            {label:"A", text:"proton acceptor."},
          {label:"B", text:"proton donor."},
          {label:"C", text:"electron acceptor."},
          {label:"D", text:"electron donor."}
          ],
      correctAnswer:"B",
      explanation:"According to the Br nsted-Lowry theory, an acid is defined as a proton (H+) donor.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0015",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"According to Br nsted-Lowry, an acid is a\\\\an",
      options:[
            {label:"A", text:"proton acceptor."},
          {label:"B", text:"proton donor."},
          {label:"C", text:"electron acceptor."},
          {label:"D", text:"electron donor."}
          ],
      correctAnswer:"B",
      explanation:"According to the Br nsted-Lowry theory, an acid is defined as a proton (H+) donor.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0016",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"What are the geometric shape and oxidation number of the cobalt in the complex ion, [Co(NH 3 ) 4 (H 2 O) 2 ] 3+ ?",
      options:[
            {label:"A", text:"Tetrahedral,+3"},
          {label:"B", text:"Octahedral, -3"},
          {label:"C", text:"Octahedral, +3"},
          {label:"D", text:"Tetrahedral, -3 46. What type of reaction occurs between propene and concentrated hydrogen bromide solution to produce a mixture of 2-bromopropane and 1-bromopropane?"},
          {label:"A", text:"Addition"},
          {label:"B", text:"Substitution"},
          {label:"C", text:"Elimination"},
          {label:"D", text:"Displacement"}
          ],
      correctAnswer:"C",
      explanation:"The coordination number is 6 (4 NH3 + 2 H2O), which corresponds to an octahedral geometry. The oxidation state of Co is calculated as x + 4(0) + 2(0) = +3, so Co is +3.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0017",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"How many counter ions are there in the coordination compound [Co(NH 3 ) 5 Cl]Cl 2 ?",
      options:[
            {label:"A", text:"1"},
          {label:"B", text:"2"},
          {label:"C", text:"5"},
          {label:"D", text:"6"}
          ],
      correctAnswer:"B",
      explanation:"In the coordination compound [Co(NH3)5Cl]Cl2, the species outside the square brackets are the counter ions. There are 2 chloride ions (Cl-) acting as counter ions.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0018",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"The product of oxidation of secondary alcohol with K 2 Cr 2 O 7 /H + is a/an",
      options:[
            {label:"A", text:"carboxylic acid"},
          {label:"B", text:"ester"},
          {label:"C", text:"aldehyde"},
          {label:"D", text:"a ketone"}
          ],
      correctAnswer:"D",
      explanation:"Secondary alcohols are oxidized by strong oxidizing agents like K2Cr2O7/H+ to form ketones.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0019",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"The following are reducing sugars EXCEPT?",
      options:[
            {label:"A", text:"Fructose"},
          {label:"B", text:"Sucrose"},
          {label:"C", text:"Maltose"},
          {label:"D", text:"Cellulose"}
          ],
      correctAnswer:"B",
      explanation:"Sucrose is a non-reducing sugar because its glycosidic bond involves the anomeric carbons of both glucose and fructose, preventing the formation of an open-chain aldehyde or ketone group.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0020",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"In what period of the periodic table can the element with the electronic configuration 1s 2 2s 2 2p 6 3s 2 3p 6 4s 2 3d 1 be found?",
      options:[
            {label:"A", text:"4"},
          {label:"B", text:"3"},
          {label:"C", text:"2"},
          {label:"D", text:"1 8. When a proton and an electron beam are subjected to the same strong electric field, the electron beam is deflected at a greater angle than the proton beam because"},
          {label:"A", text:"electron beam has a negative charge while proton beam has a positive charge"},
          {label:"B", text:"an electron is heavier than a proton"},
          {label:"C", text:"the electron is lighter than the proton"},
          {label:"D", text:"an electron has more electrical energy than a proton"}
          ],
      correctAnswer:"A",
      explanation:"The highest principal quantum number in the configuration is 4, which indicates the element is in period 4.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0021",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"    +       2+ +     . The energy utilized in the equation is typical of",
      options:[
            {label:"A", text:"1 st   electron affinity"},
          {label:"B", text:"1 st   ionization energy"},
          {label:"C", text:"2 nd   ionization energy"},
          {label:"D", text:"2 nd   electron affinity 10. Which of these electronic configurations belong to an element in period 3 of the periodic table?"},
          {label:"A", text:"[Ne] 3s 1"},
          {label:"B", text:"1s 2"},
          {label:"C", text:"[He] 2s 2   2p 3"},
          {label:"D", text:"[Ar] 4s 2   3d 3"}
          ],
      correctAnswer:"C",
      explanation:"Since force F = qE and F = ma, the acceleration a = qE/m. Because an electron has a much smaller mass than a proton, it experiences greater acceleration and deflection.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0022",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"According to Br nsted-Lowry, an acid is a/an",
      options:[
            {label:"A", text:"proton acceptor."},
          {label:"B", text:"proton donor."},
          {label:"C", text:"electron acceptor."},
          {label:"D", text:"electron donor."}
          ],
      correctAnswer:"B",
      explanation:"Br nsted-Lowry theory defines an acid as a substance that can donate a proton (H+).",
      difficulty:"easy"
    },
    {
      id:"che-2021-q0023",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Isotopes of hydrogen differ from one another in",
      options:[
            {label:"A", text:"atomic number."},
          {label:"B", text:"number of protons."},
          {label:"C", text:"number of electrons."},
          {label:"D", text:"number of neutrons."}
          ],
      correctAnswer:"D",
      explanation:"Isotopes are atoms of the same element with the same number of protons but different numbers of neutrons.",
      difficulty:"easy"
    },
    {
      id:"che-2021-q0024",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"A solution of known concentration is termed a",
      options:[
            {label:"A", text:"standard solution."},
          {label:"B", text:"unsaturated solution."},
          {label:"C", text:"saturated solution."},
          {label:"D", text:"supersaturated solution."}
          ],
      correctAnswer:"A",
      explanation:"A standard solution is a solution containing a precisely known concentration of an element or a substance.",
      difficulty:"easy"
    },
    {
      id:"che-2021-q0025",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"In what period of the periodic table can the element with the electronic configuration 1s2 2s2 2p6 3s2 3p6 4s2 3d1 be found?",
      options:[
            {label:"A", text:"4"},
          {label:"B", text:"3"},
          {label:"C", text:"2"},
          {label:"D", text:"1"}
          ],
      correctAnswer:"A",
      explanation:"The period is determined by the highest principal quantum number (n=4).",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0026",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"When a proton and an electron beam are subjected to the same strong electric field, the electron beam is deflected at a greater angle than the proton beam because",
      options:[
            {label:"A", text:"electron beam has a negative charge while proton beam has a positive charge"},
          {label:"B", text:"an electron is heavier than a proton"},
          {label:"C", text:"the electron is lighter than the proton"},
          {label:"D", text:"an electron has more electrical energy than a proton"}
          ],
      correctAnswer:"C",
      explanation:"Deflection is inversely proportional to mass; since electrons are much lighter than protons, they deflect more.",
      difficulty:"hard"
    },
    {
      id:"che-2021-q0027",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Xg+   Xg2+ + e- . The energy utilized in the equation is typical of",
      options:[
            {label:"A", text:"1st electron affinity"},
          {label:"B", text:"1st ionization energy"},
          {label:"C", text:"2nd ionization energy"},
          {label:"D", text:"2nd electron affinity"}
          ],
      correctAnswer:"C",
      explanation:"The energy required to remove an electron from a gaseous +1 ion is the second ionization energy.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0028",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Which of the following is the best evidence of the presence of ionic bonding in an unknown substance? The substance conducts electricity",
      options:[
            {label:"A", text:"in the solid state and in aqueous solution."},
          {label:"B", text:"when molten and in aqueous solution."},
          {label:"C", text:"in the solid state and when molten."},
          {label:"D", text:"when molten but not in the solid state."}
          ],
      correctAnswer:"D",
      explanation:"Ionic compounds only conduct when ions are free to move (molten or aqueous), and not in the fixed solid lattice.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0029",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Decomposition reaction has a half-life that does not depend on the initial concentration of the reactant. What is the order of the reaction?",
      options:[
            {label:"A", text:"zero order"},
          {label:"B", text:"first order"},
          {label:"C", text:"second order"},
          {label:"D", text:"pseudo-first order"}
          ],
      correctAnswer:"B",
      explanation:"For first-order reactions, t1/2 = 0.693/k, which is independent of initial concentration.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0030",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Atoms of elements principally go into bonding in order to achieve",
      options:[
            {label:"A", text:"stability"},
          {label:"B", text:"covalency"},
          {label:"C", text:"electrovalency"},
          {label:"D", text:"attraction"}
          ],
      correctAnswer:"A",
      explanation:"Bonding occurs to lower the potential energy of the atoms and achieve a stable octet configuration.",
      difficulty:"easy"
    },
    {
      id:"che-2021-q0031",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"In a given chemical reaction, the exponent (s) of the concentration terms with respect to the reactant species as determined experimentally is/are called",
      options:[
            {label:"A", text:"Molecularity"},
          {label:"B", text:"Order of reaction"},
          {label:"C", text:"Elementary step"},
          {label:"D", text:"Rate law"}
          ],
      correctAnswer:"B",
      explanation:"The order of reaction is the sum of exponents of concentration terms in the rate law.",
      difficulty:"easy"
    },
    {
      id:"che-2021-q0032",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Which of the following is a measure of the slope of ln k vs 1/T?",
      options:[
            {label:"A", text:"Ea/R"},
          {label:"B", text:"-Ea/R"},
          {label:"C", text:"Ea/RT"},
          {label:"D", text:"-R/Ea"}
          ],
      correctAnswer:"B",
      explanation:"From the Arrhenius equation ln k = ln A - Ea/RT, the slope of ln k against 1/T is -Ea/R.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0033",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Sodium is not suitable as a sacrificial anode to prevent corrosion of underground iron pipes because",
      options:[
            {label:"A", text:"It would react with groundwater quickly."},
          {label:"B", text:"It has less standard electrode potential than that of iron."},
          {label:"C", text:"It will form an oxide coating that prevents further oxidation."},
          {label:"D", text:"It is not a transition metal."}
          ],
      correctAnswer:"A",
      explanation:"Sodium is extremely reactive with water and would be consumed by groundwater before it could protect the iron.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0034",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"What is the coordination number of the coordination compound Pt(NH3)2C2O4?",
      options:[
            {label:"A", text:"3"},
          {label:"B", text:"4"},
          {label:"C", text:"6"},
          {label:"D", text:"8"}
          ],
      correctAnswer:"B",
      explanation:"Pt is bonded to 2 NH3 (monodentate) and 1 C2O4 (bidentate). Total coordination sites = 2 + 2 = 4.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0035",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"P4(s) + 5O2 (g)   P4O10(s);  H =   3010 kJ. What is  H for: P4O10(s)   P4(s) + 5O2 (g)",
      options:[
            {label:"A", text:"+ 3010 kJ"},
          {label:"B", text:"  3010 kJ"},
          {label:"C", text:"+ 602 kJ"},
          {label:"D", text:"  602 kJ"}
          ],
      correctAnswer:"A",
      explanation:"Reversing a reaction changes the sign of the enthalpy change.",
      difficulty:"easy"
    },
    {
      id:"che-2021-q0036",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Which of the following is/are true of alkali metals? (I) Largest size in period (II) Weak metallic bonding (III) Soft and low melting point",
      options:[
            {label:"A", text:"I only"},
          {label:"B", text:"II only"},
          {label:"C", text:"I,II and III"},
          {label:"D", text:"I and III only"}
          ],
      correctAnswer:"C",
      explanation:"All listed properties are characteristic of Group 1 alkali metals.",
      difficulty:"easy"
    },
    {
      id:"che-2021-q0037",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"The following statements are properties of group 17 elements except",
      options:[
            {label:"A", text:"They have a valency of -1"},
          {label:"B", text:"They belong to the p-block of the periodic table"},
          {label:"C", text:"They are all non-metals"},
          {label:"D", text:"They are all reducing agents with Fluorine having the highest reducing power."}
          ],
      correctAnswer:"D",
      explanation:"Halogens are oxidizing agents, not reducing agents. Fluorine is the strongest oxidizing agent.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0038",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Transition elements usually exhibit variable oxidation states mainly because",
      options:[
            {label:"A", text:"they are metals"},
          {label:"B", text:"they are employed as catalysts"},
          {label:"C", text:"their d-electrons are involved in bonding"},
          {label:"D", text:"they have high melting and boiling point"}
          ],
      correctAnswer:"C",
      explanation:"The energy of (n-1)d and ns orbitals are close, allowing both to participate in bonding.",
      difficulty:"easy"
    },
    {
      id:"che-2021-q0039",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"The highest oxidation number of iodine is",
      options:[
            {label:"A", text:"-1"},
          {label:"B", text:"0"},
          {label:"C", text:"+5"},
          {label:"D", text:"+7"}
          ],
      correctAnswer:"D",
      explanation:"Iodine is in group 17 and can exhibit an oxidation state up to +7 (as in periodates).",
      difficulty:"easy"
    },
    {
      id:"che-2021-q0040",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"The IUPAC name of the compound CH C-CH2-CH2-COOH is",
      options:[
            {label:"A", text:"1-pentyn-4-oic acid"},
          {label:"B", text:"pentyn-1-oic acid"},
          {label:"C", text:"5-pentyn-1-oic acid"},
          {label:"D", text:"pent-4-yn-1-oic acid"}
          ],
      correctAnswer:"D",
      explanation:"Carbon 1 is the COOH group. The triple bond starts at carbon 4. Five carbons = pent-4-yn-1-oic acid.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0041",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"A family of organic compounds which follows a regular structural pattern... differs by a -CH2- group is termed",
      options:[
            {label:"A", text:"Homologue"},
          {label:"B", text:"Organic series"},
          {label:"C", text:"Homologous series"},
          {label:"D", text:"Isotopic series"}
          ],
      correctAnswer:"C",
      explanation:"The definition of a homologous series.",
      difficulty:"easy"
    },
    {
      id:"che-2021-q0042",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"How many isomers are possible for a hydrocarbon with molecular formula C4H8?",
      options:[
            {label:"A", text:"two"},
          {label:"B", text:"three"},
          {label:"C", text:"four"},
          {label:"D", text:"six"}
          ],
      correctAnswer:"D",
      explanation:"But-1-ene, cis-but-2-ene, trans-but-2-ene, 2-methylpropene, cyclobutane, methylcyclopropane. (Note: standard level often counts 5 if stereoisomers aren't distinguished, but C4H8 includes 6 total structural/stereo isomers).",
      difficulty:"hard"
    },
    {
      id:"che-2021-q0043",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"What compounds are formed when sodium metal reacts with propanol?",
      options:[
            {label:"A", text:"Sodium propoxide and hydrogen"},
          {label:"B", text:"Sodium oxide and propene"},
          {label:"C", text:"Sodium hydroxide and propene"},
          {label:"D", text:"Sodium methoxide and water"}
          ],
      correctAnswer:"A",
      explanation:"Alcohols react with active metals to form alkoxides and hydrogen gas.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0044",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Which of the following chemical equations represents the reaction of group 1 metal hydrides (MH) with water?",
      options:[
            {label:"A", text:"MH + H2O   MO + 3H"},
          {label:"B", text:"MH + H2O   MOH + H2"},
          {label:"C", text:"MH + H2O   MOH + 2H"},
          {label:"D", text:"MH + H2O   M + OH + H2"}
          ],
      correctAnswer:"B",
      explanation:"Metal hydrides react with water to form a metal hydroxide and hydrogen gas.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0045",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"What are the geometric shape and oxidation number of the cobalt in the complex ion, [Co(NH3)4(H2O)2]3+?",
      options:[
            {label:"A", text:"Tetrahedral,+3"},
          {label:"B", text:"Octahedral, -3"},
          {label:"C", text:"Octahedral, +3"},
          {label:"D", text:"Tetrahedral, -3"}
          ],
      correctAnswer:"C",
      explanation:"Coordination number is 6 (4 NH3 + 2 H2O), so shape is octahedral. Charge: x + 0 + 0 = +3, so Co is +3.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0046",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"How many counter ions are there in the coordination compound [Co(NH3)5Cl]Cl2?",
      options:[
            {label:"A", text:"1"},
          {label:"B", text:"2"},
          {label:"C", text:"5"},
          {label:"D", text:"6"}
          ],
      correctAnswer:"B",
      explanation:"The ions outside the coordination brackets are the counter ions; here, there are 2 chloride ions.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0047",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"The product of oxidation of secondary alcohol with K2Cr2O7 /H+ is a/an",
      options:[
            {label:"A", text:"carboxylic acid"},
          {label:"B", text:"ester"},
          {label:"C", text:"aldehyde"},
          {label:"D", text:"a ketone"}
          ],
      correctAnswer:"D",
      explanation:"Secondary alcohols oxidize to ketones.",
      difficulty:"easy"
    },
    {
      id:"che-2021-q0048",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"How many isomeric forms are there for the molecular formula C3H6Br2?",
      options:[
            {label:"A", text:"4"},
          {label:"B", text:"1"},
          {label:"C", text:"2"},
          {label:"D", text:"3"}
          ],
      correctAnswer:"A",
      explanation:"1,1-dibromopropane; 1,2-dibromopropane; 1,3-dibromopropane; 2,2-dibromopropane.",
      difficulty:"hard"
    },
    {
      id:"che-2021-q0049",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"According to Br nsted-Lowry, an acid is a\\an",
      options:[
            {label:"A", text:"proton acceptor."},
          {label:"B", text:"proton donor."},
          {label:"C", text:"electron acceptor."},
          {label:"D", text:"electron donor."}
          ],
      correctAnswer:"B",
      explanation:"According to the Br nsted-Lowry theory, an acid is defined as a proton (H+) donor.",
      difficulty:"medium"
    },
    {
      id:"che-2021-q0050",
      subject:"chemistry",
      year:2021,
      category:"objective",
      question:"Which of the following is the reason why CCl 4 is non-polar? 3",
      options:[
            {label:"A", text:"The polar bonds cancel each other."},
          {label:"B", text:"The molecule is non-linear."},
          {label:"C", text:"The molecule is covalent."}
          ],
      correctAnswer:"A",
      explanation:"CCl4 has a tetrahedral geometry where the four polar C-Cl bonds are arranged symmetrically, causing their dipole moments to cancel out.",
      difficulty:"medium"
    },
    {
      id:"che-2021-t0001",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:": \\\\n  Answer   FOUR   questions;   ONE   question from each course . Ensure you read and follow all the Instructions on the cover page of the Answer Booklet.  JSC 606   Turn Over\\\\n\\\\n=== PAGE 2 ===\\\\n2  SECTION A: MULTIPLE CHOICE QUESTIONS Answer All Questions.  1.   The reproducibility or repeatability of a measurement is termed A.   Accuracy B.   Precision C.   Range D.   Confidence Interval 2.   The alpha ( -) scattering experiment is synonymous with A.   J. J. Thomson B.   Ernest Rutherford C.   J",
      difficulty:"medium"
    },
    {
      id:"che-2021-t0002",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:": \\n  Answer   FOUR   questions;   ONE   question from each course . Ensure you read and follow all the Instructions on the cover page of the Answer Booklet.  JSC 606   Turn Over\\n\\n=== PAGE 2 ===\\n2  SECTION A: MULTIPLE CHOICE QUESTIONS Answer All Questions.  1.   The reproducibility or repeatability of a measurement is termed A.   Accuracy B.   Precision C.   Range D.   Confidence Interval 2.   The alpha ( -) scattering experiment is synonymous with A.   J. J. Thomson B.   Ernest Rutherford C.   J",
      difficulty:"medium"
    },
    {
      id:"che-2021-t0003",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"2.   (a)   A compound X is known to contain carbon, hydrogen and oxygen only. When it is burnt completely in excess oxygen, carbon dioxide and water are given out as the only products. It is found that 0.46g of X gives 0.88g carbon dioxide and 0.54g water. Find the empirical formula of compound X (R.A. M : H=1.0, C=12.0, O=16.0)  [4 marks]  (b) (i) Differentiate between extensive and intensive property (ii) Give one example each of extensive and intensive property   [2 marks]  (c) (i) State one ",
      difficulty:"medium"
    },
    {
      id:"che-2021-t0004",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"3. (a) (i) Write the van der Waals equation and state all the parameters.   [ 2 marks]  (ii) If sulfur (iv) oxide were an ideal gas, the pressure at 0.0       exerted by 1.0 mole occupying 22.4 L would be 1.0 atm (22.4 L is the molar volume of an ideal gas at (STP). Use the Van der Waals equation to estimate the pressure of this volume of 1.0 mol.      2   at 0.0     .   ( Take     = 6.865   2 .    /    2 , b = 0.05679 L/mol.)  [2 marks]  (b)   Briefly account for the following observa",
      difficulty:"medium"
    },
    {
      id:"che-2021-t0005",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"4. (a) (i) State the law of mass action. (ii) Using relevant illustrative reaction, distinguish between the reaction quotient (Q) and the equilibrium constant (K).   [3 marks]  (b) 70 g of ethanol and 30 g of methanol were mixed to form a solution. If the vapour pressure of ethanol is 75 mmHg and methanol is 22 mmHg at 20   o C (C=12; O =16; H = 1) (i) Calculate the mole fraction of ethanol and methanol in the solution (ii) Calculate pressure of each component and total vapour pressure of the so",
      difficulty:"medium"
    },
    {
      id:"che-2021-t0006",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"6. (a) (i) Write balanced equations for the reactions of sodium and phosphorus with oxygen and chlorine respectively. (ii) Write chemical equations to illustrate what happens when each oxide in (i) is in contact with water (iii) Using Chemical equations only, describe what happens when water is added to the chlorides of the elements in (a) (i). [ 4 marks]  (b)   Consider the coordination compound [Co(NH 3 ) 6 ]Cl 3 . (i) State the primary valency of the central metal ion. (ii) State the secondar",
      difficulty:"medium"
    },
    {
      id:"che-2021-t0007",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"(a) Distinguish between ionization energy and electron affinity giving an example in each case. ; (b) Briefly describe and give reasons for the observed trends of the following atomic properties in the periodic table (i) Atomic size (ii) Ionization energy (iii) Electron affinity. ; (c) Balance the following oxidation-reduction reactions / Cr2O72-(aq) + Cl- (aq)   Cr3+ (aq) + Cl2(g) ; (d) Assign oxidation number to each atom in specific reactions and identify agents.",
      answerGuide:"(a) IE = energy to remove electron (X   X+ + e-) / EA = energy released/absorbed when adding electron (X + e-   X-). ; (b) Size decreases across period (increasing Z_eff) and increases down group (extra shells). IE and EA generally increase across period and decrease down group. ; (c) 14H+ + Cr2O72- + 6Cl-   2Cr3+ + 3Cl2 + 7H2O. ; (d)(i) Al(0), H(+1), S(+6), O(-2). Al is RA / H is OA. (ii) Pb(+2), O(-2), C(+2). CO is RA / PbO is OA.",
      difficulty:"medium"
    },
    {
      id:"che-2021-t0008",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"5. (a) (i) Using chemical equations only, show the amphoteric behaviour of aluminium in Group 13. (ii) Using chemical equations only, describe what happens when fluorine and bromine are separately added to water. Name the type of reaction that occurs. (b) (i) what is meant by diagonal relationship? (ii) Give two (2) properties of lithium that illustrates its diagonal relationship with magnesium. (c) Mention two (2) consequences of ozone layer depletion",
      answerGuide:"(a)(i) Al2O3 + 6HCl -> 2AlCl3 + 3H2O / Al2O3 + 2NaOH + 3H2O -> 2NaAl(OH)4. (ii) 2F2 + 2H2O -> 4HF + O2 / Br2 + H2O -> HOBr + HBr. It is a disproportionation reaction (for Br2) or redox. (b)(i) Similarity in properties between elements in the second period and elements diagonally below them in the third period. (ii) Both form nitrides by direct reaction with nitrogen / both carbonates decompose on heating to release CO2. (c) Increased skin cancer / global warming / damage to marine life.",
      difficulty:"medium"
    },
    {
      id:"che-2021-t0009",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"(a) Compound X contains C/ H/ O. 0.46g gives 0.88g CO2 and 0.54g H2O. Find empirical formula. ; (b) (i) Differentiate between extensive and intensive property. (ii) Give examples. ; (c) (i) Info from n / l / m. (ii) Identify and arrange: n=4/l=0/m=0; n=3/l=2/m=-1; n=4/l=2/m=2; n=3/l=1/m=0.",
      answerGuide:"(a) C=0.88/44 * 12 = 0.24g / H=0.54/18 * 2 = 0.06g / O=0.46-(0.24+0.06)=0.16g. Ratio C:H:O = 0.02:0.06:0.01 = 2:6:1. EF = C2H6O. ; (b) Extensive depends on mass (Volume) / Intensive doesn't (Temp). ; (c) n=size / l=shape / m=orientation. Orbitals: 4s / 3d / 4d / 3p. Order: 3p < 4s < 3d < 4d.",
      difficulty:"hard"
    },
    {
      id:"che-2021-t0010",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"6. (a) (i) Write balanced equations for the reactions of sodium and phosphorus with oxygen and chlorine respectively. (ii) Write chemical equations to illustrate what happens when each oxide in (i) is in contact with water. (iii) Using Chemical equations only, describe what happens when water is added to the chlorides of the elements in (a) (i). (b) Consider the coordination compound [Co(NH3)6]Cl3. (i) State the primary valency. (ii) State index of secondary valency. (iii) How many moles of silver chloride will be precipitated when 1 mole of the compound is reacted with silver nitrate? (iv) Which ions would be formed when dissolved in water? (c) (i) Arrange halogen hydrides in order of increasing acidic strength. (ii) Account for the order.",
      answerGuide:"(a)(i) 4Na + O2 -> 2Na2O / P4 + 5O2 -> P4O10 / 2Na + Cl2 -> 2NaCl / P4 + 6Cl2 -> 4PCl3. (ii) Na2O + H2O -> 2NaOH / P4O10 + 6H2O -> 4H3PO4. (iii) NaCl + H2O -> Na+(aq) + Cl-(aq) (Neutral) / PCl3 + 3H2O -> H3PO3 + 3HCl (Hydrolysis). (b)(i) +3 (ii) 6 (iii) 3 moles (iv) [Co(NH3)6]3+ and 3Cl-. (c)(i) HF < HCl < HBr < HI. (ii) Down the group/ atomic size increases / bond dissociation energy decreases / H+ is released more easily.",
      difficulty:"hard"
    },
    {
      id:"che-2021-t0011",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"(a) (i) Van der Waals equation. (ii) Calculate pressure of 1.0 mol SO2 at 0.0 C / V=22.4L. ; (b) Account for NaI+KNO3 (no reaction) vs Pb(NO3)2+NaI (precipitate). ; (c) (i) Natural vs Induced radioactivity. (ii) Sr-90: 0.600g to 0.395g in 10 yrs. Calculate half-life.",
      answerGuide:"(a)(i) (P + an^2/V^2)(V-nb) = nRT. (ii) P = [nRT/(V-nb)] - [an^2/V^2] = 0.985 atm. ; (b) NaI and KNO3 salts are soluble, no net ionic reaction. PbI2 is an insoluble yellow precipitate. ; (c)(i) Natural: spontaneous decay of unstable nuclei / Induced: bombardment of stable nuclei. (ii) ln(0.395/0.600) = -k(10); k = 0.0418 / t1/2 = 0.693/0.0418 = 16.58 years.",
      difficulty:"hard"
    },
    {
      id:"che-2021-t0012",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"7 (a) (i) Give three characteristics of homologous series (ii) Name 3 classes of compounds which form such a series. (iii) Define the term hybridization? (b) A saturated organic compound A containing two carbon atoms reacted with ethanoic acid in the presence of a mineral acid to form a compound B with a sweet smell. (i) Name the functional group present in A. (ii) Draw the structure of A. (iii) Write a chemical equation to show the formation of B. (iv) Name the compound B. (c) (i) Mention two (2) types of bond scission organic compounds undergo. (ii) What type of organic reagents result from each scission type?",
      answerGuide:"(a)(i) Same general formula / successive members differ by -CH2- / similar chemical properties. (ii) Alkanes / Alkenes / Alcohols. (iii) The mixing of atomic orbitals of different shapes and energies to form new equivalent hybrid orbitals. (b)(i) Hydroxyl group (-OH). (ii) CH3CH2OH. (iii) CH3COOH + CH3CH2OH -> CH3COOCH2CH3 + H2O. (iv) Ethyl ethanoate. (c)(i) Homolytic scission and Heterolytic scission. (ii) Free radicals (Homolytic) and Ions/Electrophiles/Nucleophiles (Heterolytic).",
      difficulty:"medium"
    },
    {
      id:"che-2021-t0013",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"(a) (i) Law of mass action. (ii) Q vs K. ; (b) 70g ethanol + 30g methanol. VP ethanol=75mmHg / methanol=22mmHg. (i) Mole fractions. (ii) Total pressure. ; (c) (i) Reaction of Cl2 + FeSO4. Write equations and calculate Ecell.",
      answerGuide:"(a)(i) Rate/equilibrium is proportional to concentration of reactants. (ii) Q at any time / K at equilibrium. ; (b)(i) n_eth = 70/46=1.52 / n_meth = 30/32=0.94. X_eth = 0.62 / X_meth = 0.38. (ii) P_tot = (0.62*75) + (0.38*22) = 46.5+8.36 = 54.86 mmHg. ; (c)(i) 2Fe2+ + Cl2   2Fe3+ + 2Cl-. Ecell = 1.36 - 0.77 = +0.59V.",
      difficulty:"medium"
    },
    {
      id:"che-2021-t0014",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:"8 (a) Write the name and structure of the major organic product from each of the following reactions: (i) CH3CONH2 on heating with dilute HCl ; (ii) CH3CH2CH2CONH2 on heating with LiAlH4 ; (iii) CH3CH2CO2H on refluxing with SOCl2 ; (iv) CH3COCH2CH3 on shaking with H2NNH2. (b) (i) Name 4 types of addition reactions an alkene would undergo. (ii) Write the structure of the following compounds: butoxy-pentane and N-propylpropanoate. (c) Potassium manganate (VII) solution reacts with but-2-ene in the cold. Describe the colour change in the potassium manganate (VII) solution under (i) acidic conditions; (ii) alkaline conditions.",
      answerGuide:"(a)(i) Ethanoic acid (CH3COOH). (ii) Butan-1-amine (CH3CH2CH2CH2NH2). (iii) Propanoyl chloride (CH3CH2COCl). (iv) Butan-2-one hydrazone (CH3C(=NNH2)CH2CH3). (b)(i) Hydrogenation / Halogenation / Hydrohalogenation / Hydration. (ii) CH3CH2CH2CH2-O-CH2CH2CH2CH2CH3 (butoxy-pentane) / CH3CH2COONHCH2CH2CH3 (N-propylpropanoate). (c)(i) Purple to colourless. (ii) Purple to green / brown precipitate (MnO2).",
      difficulty:"hard"
    },
    {
      id:"che-2021-t0015",
      subject:"chemistry",
      year:2021,
      category:"theory",
      question:":    Answer   FOUR   questions;   ONE   question from each course . Ensure you read and follow all the Instructions on the cover page of the Answer Booklet.  JSC 606   Turn Over  === PAGE 2 === 2  SECTION A: MULTIPLE CHOICE QUESTIONS Answer All Questions.  1.   The reproducibility or repeatability of a measurement is termed A.   Accuracy B.   Precision C.   Range D.   Confidence Interval 2.   The alpha ( -) scattering experiment is synonymous with A.   J. J. Thomson B.   Ernest Rutherford C.   J",
      totalMarks:10,
      difficulty:"medium"
    },
        {
      id:"che-2022-q0001",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Which of the following information is obtained from the spectrum of a spectrometer?",
      options:[
            {label:"A", text:"Charge/Mass ratio"},
            {label:"B", text:"Mass/charge ratio"},
            {label:"C", text:"Atomic mass ratio"},
            {label:"D", text:"Charge ratio"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0002",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Identify a pair of compounds with the same empirical formula in the options below.",
      options:[
            {label:"A", text:"C₃H₆ and C₄H₁₀"},
            {label:"B", text:"NO₂ and N₂O₅"},
            {label:"C", text:"C₂H₂ and C₆H₆"},
            {label:"D", text:"C₆H₅OH and C₁₂H₁₀O"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0003",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Which of the following pairs of elements will react together to form a compound with ionic bonding?",
      options:[
            {label:"A", text:"S & S"},
            {label:"B", text:"C & F"},
            {label:"C", text:"B & H"},
            {label:"D", text:"Rb & Cl"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0004",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Which of the following is not a unit of measurement of volume?",
      options:[
            {label:"A", text:"Ounce"},
            {label:"B", text:"Quart"},
            {label:"C", text:"Cubic meter"},
            {label:"D", text:"Litre"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0005",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"What is the wavelength of the radio-waves with a frequency of 12 MHz?",
      options:[
            {label:"A", text:"25.0 m"},
            {label:"B", text:"250.0 m"},
            {label:"C", text:"0.25 m"},
            {label:"D", text:"2.50 m"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0006",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The mass spectrum of an unknown element is displayed below. The atomic mass of the unknown element is:",
      options:[
            {label:"A", text:"70"},
            {label:"B", text:"72"},
            {label:"C", text:"75"},
            {label:"D", text:"78"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0007",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Which of the following statements can be attributed to Niels Bohr? i. Electrons in a hydrogen atom moves around the nucleus only in certain allowed circular orbits. ii. There is a fundamental limitation to just how precisely we can know both the position and momentum of a particle at a given time. iii. In a given atom, no two electrons can have the same set of quantum numbers.",
      options:[
            {label:"A", text:"I"},
            {label:"B", text:"ii"},
            {label:"C", text:"iii"},
            {label:"D", text:"i and ii"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0008",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Iodine trichloride has 2 lone pairs and 3 bond pairs. Predict a shape for the molecule.",
      options:[
            {label:"A", text:"Trigonal bipyramidal"},
            {label:"B", text:"T-shaped"},
            {label:"C", text:"Trigonal pyramidal"},
            {label:"D", text:"Tetrahedral"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0009",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The general trend of atomic radius and ionization energy follow the same trend i.e decrease across the period and increase down the group. This means that:",
      options:[
            {label:"A", text:"it is easier to remove an electron across the period"},
            {label:"B", text:"each successive element down a group has electrons in a higher energy level"},
            {label:"C", text:"each successive element across a period has electrons in a higher energy level"},
            {label:"D", text:"it is difficult to remove an electron down the group"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0010",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Which reaction corresponds to ΔHf for Na₂CO₃ at 298 K?",
      options:[
            {label:"A", text:"Na₂O(s) + CO₂(g) → Na₂CO₃(s)"},
            {label:"B", text:"2Na(s) + CO₂(g) + CO₃²⁻(aq) → Na₂CO₃(s)"},
            {label:"C", text:"2Na(s) + C(s) + ³⁄₂O₂(g) → Na₂CO₃(s)"},
            {label:"D", text:"2Na⁺(aq) + OH⁻(aq) + CO₂(g) → Na₂CO₃(s)"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0011",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Which of the following is NOT a shape obtained using VSEPR?",
      options:[
            {label:"A", text:"Trigonal planar"},
            {label:"B", text:"Trigonal bipyramidal"},
            {label:"C", text:"Square planar"},
            {label:"D", text:"Tetragonal pyramidal"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0012",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"A student obtained the following values from the measurement of a physical quantity. Which of the measurements is the most precise?",
      options:[
            {label:"A", text:"4.0"},
            {label:"B", text:"4.00"},
            {label:"C", text:"4.0000"},
            {label:"D", text:"4.000"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0013",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"A measuring cylinder labelled 25 mL has its initial volume to be 24 mL, what type of error(s) will the cylinder introduced into measurements?",
      options:[
            {label:"A", text:"Systemic error"},
            {label:"B", text:"Random error"},
            {label:"C", text:"Random and systemic errors"},
            {label:"D", text:"Error due to parallax"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0014",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The atomic structure described as a diffuse cloud of positive charge with negative electrons embedded in it is known as:",
      options:[
            {label:"A", text:"Alpha scattering model"},
            {label:"B", text:"Bohr's model"},
            {label:"C", text:"Rutherford's model"},
            {label:"D", text:"Plum pudding model"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0015",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The proposed heat exchanger in the Haber process is to:",
      options:[
            {label:"A", text:"cool the incoming gas mixture to avoid over heating the catalyst"},
            {label:"B", text:"cool the incoming gas mixture and separate N₂ and H₂"},
            {label:"C", text:"warm the incoming gas mixture and speed up the reaction"},
            {label:"D", text:"warm the incoming gas mixture and shift the equilibrium to give more NH₃"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0016",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Liquefaction occurs when gases are subjected to:",
      options:[
            {label:"A", text:"high pressure and high temperature"},
            {label:"B", text:"high pressure and low temperature"},
            {label:"C", text:"low pressure and high temperature"},
            {label:"D", text:"low pressure and low temperature"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0017",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Which of the following is transferred from cathode to anode through a membrane in hydrogen fuel cell?",
      options:[
            {label:"A", text:"Electron"},
            {label:"B", text:"Neutron"},
            {label:"C", text:"Proton"},
            {label:"D", text:"Hydrogen gas"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0018",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Identify the rate-determining step in the reaction A → E, which goes through the following steps: A →(1.2 secs) B →(56 secs) C →(2.1 secs) D →(1.55 secs) E",
      options:[
            {label:"A", text:"A → B"},
            {label:"B", text:"B → C"},
            {label:"C", text:"C → D"},
            {label:"D", text:"D → E"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0019",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Which pair of gases has the same average rate of diffusion at 25°C?",
      options:[
            {label:"A", text:"N₂ and O₂"},
            {label:"B", text:"NO and CO"},
            {label:"C", text:"N₂O and CO₂"},
            {label:"D", text:"NO₂ and CO₂"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0020",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The following are true of carbon EXCEPT:",
      options:[
            {label:"A", text:"it is a non-metal"},
            {label:"B", text:"it exhibits covalency"},
            {label:"C", text:"it is a typical metal"},
            {label:"D", text:"it occurs in two isotopic forms"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0021",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The following describe the properties of transition metal element except:",
      options:[
            {label:"A", text:"formation of coloured ions"},
            {label:"B", text:"formation of complex ions"},
            {label:"C", text:"catalytic ability"},
            {label:"D", text:"it occurs in two isotopic form"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0022",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The following ions are monodentate ligands EXCEPT:",
      options:[
            {label:"A", text:"Cyanide"},
            {label:"B", text:"thiocyanide"},
            {label:"C", text:"oxalate"},
            {label:"D", text:"bromide"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0023",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Graphite has a large network of strong covalent bonds, which of the following is NOT a property of graphite?",
      options:[
            {label:"A", text:"Presence of sp³ hybridized carbon atoms"},
            {label:"B", text:"Presence of sp² hybridized carbon atoms"},
            {label:"C", text:"High melting point"},
            {label:"D", text:"Electrical conductivity"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0024",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The correct order of melting points of B, Al and Ga is:",
      options:[
            {label:"A", text:"B > Al > Ga"},
            {label:"B", text:"Al > B > Ga"},
            {label:"C", text:"Ga > B > Al"},
            {label:"D", text:"B > Ga > Al"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0025",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"An element with high electronegativity has:",
      options:[
            {label:"A", text:"high ionization energy and low electron affinity"},
            {label:"B", text:"high ionization energy and high electron affinity"},
            {label:"C", text:"low ionization energy and low electron affinity"},
            {label:"D", text:"low ionization energy and high electron affinity"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0026",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Which statement about the reactions of lithium or its compounds is based on the diagonal relationship with magnesium?",
      options:[
            {label:"A", text:"Lithium burns very slowly in oxygen"},
            {label:"B", text:"Lithium decomposes readily on heating, forming Li₂O and O₂"},
            {label:"C", text:"Lithium carbonate decomposes on heating, forming Li₃N and O₂"},
            {label:"D", text:"Lithium reacts very violently with cold water, producing hydrogen"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0027",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The coordination number of [Co(en)(H₂O)₄]Cl₃ complex is:",
      options:[
            {label:"A", text:"4"},
            {label:"B", text:"5"},
            {label:"C", text:"6"},
            {label:"D", text:"8"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0028",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The condensed electron configuration of chloride ion is:",
      options:[
            {label:"A", text:"[Ne] 3s¹ sp⁶"},
            {label:"B", text:"[Ne] 3s² sp⁶"},
            {label:"C", text:"[Ne] 3s² sp⁵"},
            {label:"D", text:"[Ne] 3s² sp⁴"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0029",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Why do lithium halides have greater degree of covalent character than halides of other members of the group?",
      options:[
            {label:"A", text:"The small size of Li⁺ gives it a high polarizing power and high covalent character"},
            {label:"B", text:"The small charge of Li⁺ gives it a low polarizing power and high covalent character"},
            {label:"C", text:"Li⁺ is the most electronegative and confers higher covalent character"},
            {label:"D", text:"Li⁺ has equivalent size with halide ions and greater covalent character"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0030",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"List the group 1 elements, K, Na, Li, Rb and Cs in order of increasing reactivity with water.",
      options:[
            {label:"A", text:"Na < Li < Cs < Na < K"},
            {label:"B", text:"K < Rb < Cs < Na < Li"},
            {label:"C", text:"Rb < Cs < Na < K < Li"},
            {label:"D", text:"Li < Na < K < Rb < Cs"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0031",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"In which of the following reactions does chlorine disproportionate?",
      options:[
            {label:"A", text:"AgNO₃ + HCl → AgCl + HNO₃"},
            {label:"B", text:"2KClO₃ → 2KCl + 3O₂"},
            {label:"C", text:"Cl₂ + H₂O → HCl + HOCl"},
            {label:"D", text:"HCl + NaOH → NaCl + H₂O"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0032",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Carbon in its excited state has which of the following electronic configuration?",
      options:[
            {label:"A", text:"1s² 2s² 2p²"},
            {label:"B", text:"1s² 2s¹ 2p³"},
            {label:"C", text:"1s¹ 2s² 2p³"},
            {label:"D", text:"1s¹ 2s¹ 2p³"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0033",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The advantage of biotechnology as a tool for plant breeding over other plant breeding techniques is that it:",
      options:[
            {label:"A", text:"is less precise and produces specific gene to make changes"},
            {label:"B", text:"is more precise and isolates specific gene to make exact changes"},
            {label:"C", text:"is precise and makes definite gene to particular changes"},
            {label:"D", text:"isolates gene with certain characteristics"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0034",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Concentrated tetraoxosulphate (VI) acid in the reaction of ethanol and ethanoic acid acts as:",
      options:[
            {label:"A", text:"a catalyst"},
            {label:"B", text:"a solvent"},
            {label:"C", text:"an oxidizing agent"},
            {label:"D", text:"a dehydrating agent"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0035",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The following molecules are: [diagram of a molecule with F, Cl, Br substituents]",
      options:[
            {label:"A", text:"Optical isomers"},
            {label:"B", text:"Geometrical isomers"},
            {label:"C", text:"Diastereomers"},
            {label:"D", text:"Tautomers"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0036",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The respective stationary phase in the column chromatography and paper chromatography are usually:",
      options:[
            {label:"A", text:"SnO₂ and paper"},
            {label:"B", text:"SiO₂ and paper"},
            {label:"C", text:"Paper and SiO₂"},
            {label:"D", text:"Al₂O₃ and SiO₂"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0037",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The two species formed in the homolytic fission of Cl–Cl bond are called:",
      options:[
            {label:"A", text:"ions"},
            {label:"B", text:"free radicals"},
            {label:"C", text:"molecules"},
            {label:"D", text:"hybrids"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0038",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The boiling point of butanoic acid is higher than that of ethyl ethanoate despite being isomers. This can be attributed to:",
      options:[
            {label:"A", text:"ethyl ethanoate being an ester"},
            {label:"B", text:"the inductive effect of the alkyl group on ethyl ethanoate"},
            {label:"C", text:"the steric hindrance of the alkyl group in butanoic acid"},
            {label:"D", text:"hydrogen bond formed in butanoic acid"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0039",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The three chlorinated benzene derivatives A, B and C vary in their ease of hydrolysis. Choose the order of the ease of hydrolysis.",
      options:[
            {label:"A", text:"A > B > C"},
            {label:"B", text:"A > C > B"},
            {label:"C", text:"C > B > A"},
            {label:"D", text:"C > A > B"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0040",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"What is the conjugate base in the reaction of bicarbonate ion, HCO₃⁻ with water?",
      options:[
            {label:"A", text:"HCO₃⁻"},
            {label:"B", text:"H₂O"},
            {label:"C", text:"H₂CO₃"},
            {label:"D", text:"OH⁻"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0041",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Which of the following statements is NOT true about the effect of an increase in the temperature on the distribution of molecular speeds in a gas?",
      options:[
            {label:"A", text:"The most probable speed increases"},
            {label:"B", text:"The collision of the molecule increases"},
            {label:"C", text:"The area under the distribution curve remains the same"},
            {label:"D", text:"The area under the distribution curve becomes broader"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0042",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"A mixture of gases contained in a vessel of 1.5 atm is found to be 15% N₂, 50% of N₂O and 35% CO₂ by volume. Calculate the partial pressure of nitrogen gas.",
      options:[
            {label:"A", text:"0.23 atm"},
            {label:"B", text:"0.75 atm"},
            {label:"C", text:"0.98 atm"},
            {label:"D", text:"1.28 atm"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0043",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"In which reaction will the pressure equilibrium constant (Kp) equals the concentration equilibrium constant (Kc)?",
      options:[
            {label:"A", text:"PCl₅(g) ↔ PCl₃(g) + Cl₂(g)"},
            {label:"B", text:"2H₂O(g) ↔ H₂(g) + O₂(g)"},
            {label:"C", text:"2SO₂(g) + O₂(g) ↔ 2SO₃(g)"},
            {label:"D", text:"N₂(g) + H₂(g) ↔ 2NH₃(g)"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0044",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"When the half-life of a reaction is inversely proportional to the initial concentration of the reactant, the kinetics follows:",
      options:[
            {label:"A", text:"zero order"},
            {label:"B", text:"first order"},
            {label:"C", text:"second order"},
            {label:"D", text:"third order"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0045",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The balanced equation when CH₃COCl reacts with ethanol to produce a fruity-smelling liquid is:",
      options:[
            {label:"A", text:"CH₃COCl + CH₃CH₂OH → CH₃CH₂OH + HCl"},
            {label:"B", text:"CH₃COCl + CH₃CH₂OH → CH₃COOCH₂CH₃ + HCl"},
            {label:"C", text:"CH₃COCl + CH₃CH₂OH → CH₃COOCH₂CH₃ + H₂O + HCl"},
            {label:"D", text:"CH₃COCl + CH₃CH₂OH → CH₃CH₂COOCH₂OH + HCl"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0046",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"The organic compound quinine is a secondary metabolite (natural product) isolated from a medicinal plant, which possesses antimalarial property. Classify the hydroxyl group in quinine.",
      options:[
            {label:"A", text:"Primary"},
            {label:"B", text:"Secondary"},
            {label:"C", text:"Tertiary"},
            {label:"D", text:"Quaternary"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0047",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Deduce X in the reaction below: C₂H₅N–N=O → C₂H₅NHCH₃ + HONO → X at 0°C.",
      options:[
            {label:"A", text:"C₂H₅N–N=O"},
            {label:"B", text:"C₂H₅NH–NO₂"},
            {label:"C", text:"C₂H₅NHCH₃ + HONO → X"},
            {label:"D", text:"C₂H₅N–N=O (with CH₃)"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0048",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"Identify Y in the reaction below, and the type of reaction it is termed. [diagram showing benzene ring reacting to form nitrobenzene]",
      options:[
            {label:"A", text:"Conc. HNO₃, substitution reaction"},
            {label:"B", text:"Conc. HNO₃/H₂SO₄, electrophilic substitution reaction"},
            {label:"C", text:"Conc. H₂SO₄, electrophilic substitution reaction"},
            {label:"D", text:"Conc. HNO₃/H₂SO₄, addition reaction"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-q0049",
      subject:"chemistry",
      year:2022,
      category:"objective",
      question:"What kind of polymerization can occur with eugenol which has the structure below? [structure shown]",
      options:[
            {label:"A", text:"Condensation"},
            {label:"B", text:"Geometrical"},
            {label:"C", text:"Addition"},
            {label:"D", text:"Optical polymerization"},
          ],
      difficulty:"medium"
    },
    {
      id:"che-2022-t0001",
      subject:"chemistry",
      year:2022,
      category:"theory",
      course:"CHM 001: GENERAL CHEMISTRY",
      question:"**(a)** [3.5 Marks] (i) State the Periodic law. (ii) State the group, period and block of the elements calcium (20Ca) and bromine (35Br).\\n**(b)** [3.5 Marks] 4.0 g of NaCl is heated with manganese(IV) oxide in excess concentrated tetraoxosulphate(VI) acid; the chlorine gas liberated is then passed through KI solution to liberate iodine. (i) Balance the equation for the reaction. (ii) Calculate the mass of MnO2 used. (iii) Provide an equation for the production of potassium chloride from the reaction of chlorine and potassium iodide. (iv) Calculate the mass of iodine liberated. [Na=23, Cl=35.5, H=1, S=32, Mn=55, O=16, I=127]\\n**(c)** [3 Marks] (i) What is a precipitation reaction and why do precipitates form? Write balanced molecular and net ionic equations for: (ii) NH4Cl(aq) + KOH(aq) → ; (iii) Al(NO3)3(aq) + Ba(OH)2(aq) →",
      difficulty:"hard"
    },
    {
      id:"che-2022-t0002",
      subject:"chemistry",
      year:2022,
      category:"theory",
      course:"CHM 001: GENERAL CHEMISTRY",
      question:"**(a)** [3 Marks] (i) Define the term 'electronegativity'. (ii) Write the Lewis structure for the following compounds: ICl4- and PCl3. (iii) Explain the difference between using Lewis structures and VSEPR to provide the shapes/structures of molecules.\\n**(b)** [4 Marks] (i) Determine the empirical formula of a compound used as explosive which contains C, H, N and O, if 50 g of the compound was found to contain 31.72 g of O, 7.93 g of C and 1.10 g of H. [Mr of explosive = 227 g]. (ii) Write an equation for the decomposition of the explosive obtained in (b)(i) if it decomposes into carbon dioxide, nitrogen, oxygen and water.\\n**(c)** [3 Marks] Percentages of protein content in milk were 54.01, 54.24, 54.05, 54.27 and 54.11. The accepted true value is 54.20. Calculate: (i) Absolute error (ii) Relative error (iii) Mean Deviation (iv) Standard Deviation.",
      difficulty:"hard"
    },
    {
      id:"che-2022-t0003",
      subject:"chemistry",
      year:2022,
      category:"theory",
      course:"CHM 002: PHYSICAL CHEMISTRY",
      question:"**(a)** [2 Marks] (i) Define buffer solution. (ii) Write the Ksp expressions for saturated solutions of AgCl and Fe(OH)2.\\n**(b)** [3 Marks] (i) Explain the term electrochemical cells. (ii) Using equation only, explain the electrochemical process involved in the rusting of iron. (iii) Obtain a formula for the Nernst equation from the free energy in a non-standard state to one in a standard state.\\n**(c)** [2 Marks] (i) How does neutron to proton ratio affect stability of a radioactive element? (ii) What is the mass per mole of 11C in the following nuclear reaction? 11C → 11B + 0+1e [c = 3 × 10^8 m/s]\\n**(d)** [3 Marks] What is the standard enthalpy of formation of ethene, (C2H4), if the standard enthalpy of combustion is -1411 kJmol-1? ΔHf°CO2 = -394 kJ/mol; ΔHf°H2O = -286 kJ/mol",
      difficulty:"hard"
    },
    {
      id:"che-2022-t0004",
      subject:"chemistry",
      year:2022,
      category:"theory",
      course:"CHM 002: PHYSICAL CHEMISTRY",
      question:"**(a)** [2 Marks] State Faraday's second law of electrolysis.\\n**(b)** [3 Marks] A direct current of 200 mA flows for 3 hours through three cells in series. They contain solutions of sodium chloride, copper(II) tetraoxosulphate(VI) and gold trioxonitrate(V). Calculate the mass of metal deposited in each cell.\\n**(c)** [3 Marks] (i) Define solubility product. (ii) Explain presence of ion-pairs, diverse ion effect and common-ion effect. (iii) In the equation below: Ag2CrO4(s) → 2Ag+(aq) + CrO42-(aq). Calculate the solubility product (Ksp) of Ag2CrO4 if the concentration of Ag+ is 1.5 × 10-4 M.\\n**(d)** [2 Marks] (i) State two uses of radioactive isotopes. (ii) The half-life of the isotope of uranium of mass number 234 is 3.5 × 10^5 years. How long after the isolation of a sample of this isotope will only one fifth of the original mass be left?",
      difficulty:"hard"
    },
    {
      id:"che-2022-t0005",
      subject:"chemistry",
      year:2022,
      category:"theory",
      course:"CHM 003: INORGANIC CHEMISTRY",
      question:"**(a)** [2 Marks] Outline FOUR differences between the most popular allotropes of carbon.\\n**(b)** [2 Marks] Give reasons for the following observations: (i) Group 2A elements always show small positive electron affinity. (ii) Beryllium ion is amphoteric but magnesium ion is ionic. (iii) Non-metallic properties of elements increase across the period. (iv) Group IIA elements always form colourless compounds.\\n**(c)** [3 Marks] Give the name of the following complexes: (i) K4[Fe(CN)6] (ii) [Co(SO4)2Cl2]4- (iii) [Ni(NH2CH2CH2NH2)2Cl2]2+\\n**(d)** [3 Marks] Show how the combustion of sulphur-containing fossil fuel causes acid rain in a polluted industrialized environment. (Name all the products formed).",
      difficulty:"hard"
    },
    {
      id:"che-2022-t0006",
      subject:"chemistry",
      year:2022,
      category:"theory",
      course:"CHM 003: INORGANIC CHEMISTRY",
      question:"**(a)** [3 Marks] The properties of lithium are quite different from the properties of other members of group one elements but similar to those of magnesium. State SIX similarities between lithium and magnesium.\\n**(b)** [4 Marks] (i) List the TWO major gases which cause acid rain and give the non-natural (artificial) sources of these gases. (ii) What products are formed when each of the following elements reacts with red phosphorus? I. Bromine II. Chlorine\\n**(c)** [3 Marks] (i) Give reason why compounds of Sc3+ and Zn2+ are mostly white whereas those of Sc2+ and Cu2+ are coloured. (ii) List TWO distinct features of these transition metals.",
      difficulty:"hard"
    },
    {
      id:"che-2022-t0007",
      subject:"chemistry",
      year:2022,
      category:"theory",
      course:"CHM 004: ORGANIC CHEMISTRY",
      question:"**(a)** [3 Marks] An alcohol has the molecular formula C3H8O. When warmed with an alkaline solution of iodine it forms a yellow precipitate. (i) Give the reaction scheme and name the yellow precipitate. (ii) Draw the displayed formula of the alcohol. (iii) The first stage in the reaction of the alcohol with alkaline iodine solution is an oxidation reaction. Name the organic product of this first stage.\\n**(b)** [3 Marks] A hydrocarbon X contains 92.3% carbon by mass. The relative molecular mass of X is 78.0. Calculate the: (i) empirical formula of X (ii) Molecular formula of X.\\n**(c)** [4 Marks] (i) Draw the structures of the two (2) geometrical isomers of 1,2-dibromoethene. What feature of the double bond prevents isomer 1 from changing into isomer 2? (ii) B is a saturated unbranched hydrocarbon compound. When treated with chlorine under free radical conditions, it produces a mixture of chlorinated compounds including C, C6H12Cl2. Dehydrochlorination of C produces D, C6H10. When D is oxidized by hot conc. KMnO4, two compounds, CO2 and a carboxylic acid are formed in equimolar amounts. Suggest a structure for compound D and deduce the structure of compound B.",
      difficulty:"hard"
    },
    {
      id:"che-2022-t0008",
      subject:"chemistry",
      year:2022,
      category:"theory",
      course:"CHM 004: ORGANIC CHEMISTRY",
      question:"**(a)** [3 Marks] (i) Hydrocarbons with high molecular mass are subjected to a process known as cracking. Provide the name and structure for any monosubstituted benzene compound. (ii) What conditions are used for cracking? (iii) Differentiate between cracking and reforming.\\n**(b)** [3 Marks] The following scheme shows some reactions of toluene. Identify the reagents I, II, III and IV. [I = Cl2/AlCl3; II = Cl2/pyridine or PCl5; III = KMnO4/OH-/180°C; IV = SOCl2/pyridine or PCl5]\\n**(c)** [4 Marks] (i) What kind of polymerization can occur with eugenol? (ii) Explain how addition polymerization differs from condensation polymerization. (iii) Give one example of each type of polymer formed and state one use of each.",
      difficulty:"hard"
    },
    {
      id:"che-2022-p0001",
      subject:"chemistry",
      year:2022,
      category:"practical",
      question:"**Question 1: Quantitative Analysis**\\nYou are provided with the following solutions: A = HCl of unknown concentration. B = 1.32 g of Na2CO3 in 250 cm3. Indicator = Methyl orange.\\n**(a)** Pipette 25 cm3 portion of solution B into a conical flask. Add 2 or 3 drops of methyl orange indicator. Titrate against solution A from the burette. Record your titre value.\\n**(b)** Repeat the titration two or three more times and find the average titre value.\\n**(c)** From your results, determine: (i) the balanced equation for the reaction. (ii) the number of moles present in 25 cm3 of solution B. (iii) the molarity of solution B.",
      difficulty:"hard"
    },
    {
      id:"che-2022-p0002",
      subject:"chemistry",
      year:2022,
      category:"practical",
      question:"**Question 2: Qualitative Analysis**\\nQ is a mixture of inorganic salts. Carry out the following tests on sample Q:\\n**(a)** Transfer 1.0 g of Q into a boiling tube and add 5 mL of distilled water. Stir and allow to settle, then filter and keep the filtrate.\\n**(b)** To a small portion of the filtrate in a test tube, add small amount of ammonia solution in drops and then in excess.\\n**(c)** To the precipitate obtained in (b), add 6M HCl to the residue followed by K3Fe(CN)6.\\n**(d)** To another portion of solution in (a), add HNO3 solution.\\n**(e)** To the resulting mixture in (d), add NH3 solution.\\n**(f)** To another portion of solution in (d), add HCl, then BaCl2 solution.\\n**(g)** To the resulting mixture in (f), add hydrochloric acid in excess.",
      difficulty:"hard"
    },
    {
      id:"che-2023-q0001",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Which theory postulated that the electrons in an atom revolve about the nucleus from one circular orbit to another?",
      options:[
            {label:"A", text:"Rutherford's theory"},
          {label:"B", text:"Dalton's theory"},
          {label:"C", text:"Bohr's theory"},
          {label:"D", text:"Thomson's theory"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0002",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The principal, angular momentum, magnetic and spin quantum numbers of the third electron of boron atom have the respective values:",
      options:[
            {label:"A", text:"2, 0, 0,  "},
          {label:"B", text:"2, 0, 0,   "},
          {label:"C", text:"2, 1,  1,   "},
          {label:"D", text:"2, 1,  1, + "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0003",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"What is the mass of a carbon dioxide molecule? [O = 16, C = 12, N  = 6.02   10  ]",
      options:[
            {label:"A", text:"44 g"},
          {label:"B", text:"7.31   10    g"},
          {label:"C", text:"73.1   10    g"},
          {label:"D", text:"4.4 g"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0004",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"A certain elementary gas is triatomic and has a vapour density of 48. The atomic mass of the gas is:",
      options:[
            {label:"A", text:"48"},
          {label:"B", text:"96"},
          {label:"C", text:"32"},
          {label:"D", text:"16"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0005",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Ethanoic acid is a weak electrolyte because:",
      options:[
            {label:"A", text:"It exists in dimer form"},
          {label:"B", text:"It has low degree of ionization"},
          {label:"C", text:"It has high molecular mass"},
          {label:"D", text:"It is an organic compound"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0006",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Phenolphthalein is an acidic indicator which has the following equilibrium solution: HIn (undissociated)   H  + In . The undissociated form, HIn, is colourless while the ion, In , is pink. What will be the colour of the indicator in acid medium?",
      options:[
            {label:"A", text:"Pink"},
          {label:"B", text:"Colourless"},
          {label:"C", text:"Yellow"},
          {label:"D", text:"Blue"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0007",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The conjugate acids of the Bronsted bases, HCO   and CO    are:",
      options:[
            {label:"A", text:"HCO   and HCO   "},
          {label:"B", text:"CO    and HCO  "},
          {label:"C", text:"H CO  and HCO  "},
          {label:"D", text:"CO    and HCO  "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0008",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"A normal body temperature is 37 C, Kw = 2.4   10   , calculate [H O ] and [OH ] for a neutral solution at this temperature:",
      options:[
            {label:"A", text:"[H O ] = [OH ] = 2.5   10  "},
          {label:"B", text:"[H O ] = [OH ] = 1.5   10  "},
          {label:"C", text:"[H O ] = [OH ] = 1.5   10  "},
          {label:"D", text:"[H O ] = [OH ] = 1.5   10  "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0009",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"One of the following is a correct quantum number combination:",
      options:[
            {label:"A", text:"n = 3, l = 0, m = +2"},
          {label:"B", text:"n = 3, l = 0, m = +1"},
          {label:"C", text:"n = 2, l = 2, m = +1"},
          {label:"D", text:"n = 2, l = 1, m =  1"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0010",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The bromine content of average ocean water is 65 parts per weight per million. Assuming 100% recovery, how many cubic meters of ocean water must be processed to produce 0.61 kg of bromine assuming the density of seawater is 1.023   10  kg/m ?",
      options:[
            {label:"A", text:"9.4m "},
          {label:"B", text:"12.6 m "},
          {label:"C", text:"9.17 m "},
          {label:"D", text:"18 m "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0011",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"If the wavelength of a microwave oven used to cook a meal is 1.20 cm, what is the energy of one photon of this microwave radiation? [h = 6.63   10   Js; c = 3   10   cm]",
      options:[
            {label:"A", text:"1.66   10   J"},
          {label:"B", text:"1.66   10   J"},
          {label:"C", text:"3.32   10   J"},
          {label:"D", text:"16.6   10   J"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0012",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"A substance has the following composition by mass: 60.80% Na; 28.60% B; 10.60% H. What is the empirical formula of the substance?",
      options:[
            {label:"A", text:"NaBH "},
          {label:"B", text:"NaBH"},
          {label:"C", text:"NaB H "},
          {label:"D", text:"Na BH"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0013",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Find the volume occupied by 3.55 g of chlorine gas at room temperature and pressure. [Cl = 35.5; Vm at stp = 22.4 dm  mol  ]",
      options:[
            {label:"A", text:"1.1 dm "},
          {label:"B", text:"2.4 dm "},
          {label:"C", text:"0.6 dm "},
          {label:"D", text:"12 dm "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0014",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Which of the following molecules is square planar in shape?",
      options:[
            {label:"A", text:"XeO "},
          {label:"B", text:"XeF "},
          {label:"C", text:"SF "},
          {label:"D", text:"SiF "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0015",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"What happens when lithium and oxygen react together?",
      options:[
            {label:"A", text:"Each lithium atom gains one electron; each oxygen atom loses one electron"},
          {label:"B", text:"Each lithium atom gains one electron; each oxygen atom loses one electron"},
          {label:"C", text:"Each lithium atom loses one electron; each oxygen atom loses one electron"},
          {label:"D", text:"Each oxygen atom gains one electron; each oxygen atom loses one electron"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0016",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Which statement about covalent bond is correct?",
      options:[
            {label:"A", text:"Breaking covalent bond is exothermic and releases energy"},
          {label:"B", text:"Breaking covalent bond is endothermic and absorbs energy"},
          {label:"C", text:"Making covalent bond is endothermic and absorbs energy"},
          {label:"D", text:"Making covalent bond is endothermic and releases energy"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0017",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"A gas that is confined in a rigid container is heated. Which of the following statements is TRUE?",
      options:[
            {label:"A", text:"The kinetic energy of the gas particle will decrease"},
          {label:"B", text:"The pressure will increase"},
          {label:"C", text:"The density will decrease"},
          {label:"D", text:"The number of moles of gas will increase"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0018",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Which of the following atoms is never found with more than an octet of valence electrons around it?",
      options:[
            {label:"A", text:"Si"},
          {label:"D", text:"Br"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0019",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The IUPAC name of the compound shown below is: (1,3,5-trimethyl cyclopentane with CH  groups)",
      options:[
            {label:"A", text:"1,2,4-trimethyl cyclopentane"},
          {label:"B", text:"1,3,4-trimethyl cyclopentane"},
          {label:"C", text:"1,3,5-trimethyl cyclopentane"},
          {label:"D", text:"trimethyl cyclopentane"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0020",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The following compounds exhibit covalent bonding EXCEPT:",
      options:[
            {label:"A", text:"AlCl .NH "},
          {label:"B", text:"Al Cl "},
          {label:"C", text:"NH  "},
          {label:"D", text:"NH "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0021",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"If the rate of reaction becomes double for every 10 C rise in temperature, by what factor will the rate of reaction increase when temperature is increase from 25 C to 65 C?",
      options:[
            {label:"B", text:"16"},
          {label:"C", text:"32"},
          {label:"D", text:"64"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0022",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The t .  for a second order reaction is: k/[A]      = 1/k[A]; formula is:",
      options:[
            {label:"A", text:"k/[A]"},
          {label:"B", text:"1/k[a]"},
          {label:"C", text:"2k[A] "},
          {label:"D", text:"7/3k[A] "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0023",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The formula for the compound dichlorodiammine platinum (II) is:",
      options:[
            {label:"A", text:"[Pt(NH ) Cl ]"},
          {label:"B", text:"[Pt(NH ) Cl ]"},
          {label:"C", text:"[Pl(NH ) Cl ]"},
          {label:"D", text:"[Pl(NH ) Cl ]"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0024",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Which of the following pollutants is dangerous to the ozone layer?",
      options:[
            {label:"A", text:"CFC"},
          {label:"B", text:"CO "},
          {label:"C", text:"CO"},
          {label:"D", text:"Oxides of nitrogen"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0025",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The order of increasing ionic character of LiH, NaH, KH, RbH, CsH is:",
      options:[
            {label:"A", text:"LiH, NaH, CsH, KH, RbH"},
          {label:"B", text:"LiH, NaH, KH, RbH, CsH"},
          {label:"C", text:"RbH, CsH, NaH, KH, LiH"},
          {label:"D", text:"NaH, CsH, RbH, KH, LiH"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0026",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Which alcohol will most easily react with HCl in presence of ZnCl  to form an alkyl halide?",
      options:[
            {label:"A", text:"primary alcohol"},
          {label:"B", text:"secondary alcohol"},
          {label:"C", text:"tertiary alcohol"},
          {label:"D", text:"all alcohols react equally"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0027",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The correct name of (C H ) C=C(CH )CH CO H is:",
      options:[
            {label:"A", text:"4,4-diethyl-3-methyl-3-butenoic acid"},
          {label:"B", text:"3-ethyl-4-methyl-3-hexenoic acid"},
          {label:"C", text:"3-ethyl-4-methyl-3-hexenoic acid"},
          {label:"D", text:"3-ethyl-4-methyl-3-hexen-6-oic acid"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0028",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Which of the following pairs of compounds are not isomers of each other?",
      options:[
            {label:"A", text:"n-pentane and 2-methylbutane"},
          {label:"B", text:"CH CHOH and CH CHO"},
          {label:"C", text:"CH COCH  and CH CH CHO"},
          {label:"D", text:"CH COOCH  and CH CH COOH"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0029",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The name of the compound below is: (structure showing N-dimethylbutanamide)",
      options:[
            {label:"A", text:"dimethyl-2,3,3-trimethylbutanamide"},
          {label:"B", text:"N,N-dimethyl-2,3,3-trimethylbutanamide"},
          {label:"C", text:"N,N-dimethyl-2,3,3-trimethylbutanamide"},
          {label:"D", text:"N-dimethyl-2,3-dimethylbutanamide"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0030",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Which of the following will not give an alcohol on reduction?",
      options:[
            {label:"A", text:"CH COCl"},
          {label:"B", text:"CH COOCH "},
          {label:"C", text:"CH CONH "},
          {label:"D", text:"CH COOH"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0031",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Vinegar contains mainly:",
      options:[
            {label:"A", text:"Ethyl ethanoate"},
          {label:"B", text:"Ethanoic acid"},
          {label:"C", text:"Ethanamide"},
          {label:"D", text:"Ethanol"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0032",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The name of this compound is (structure showing HC C CH  CH  with CH  group):",
      options:[
            {label:"A", text:"Ethyl ethanoate"},
          {label:"B", text:"Ethanoic acid"},
          {label:"C", text:"Ethanamide"},
          {label:"D", text:"Ethanol"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0033",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Which of these pairs are homologues?",
      options:[
            {label:"A", text:"1-butene"},
          {label:"B", text:"Propyne"},
          {label:"C", text:"Acetylene"},
          {label:"D", text:"1-butyne"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0034",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The electronic configuration for Cu is:",
      options:[
            {label:"A", text:"1s  2s  2p  3s  3p  4s  3d  "},
          {label:"B", text:"1s  2s  2p  3s  3p  4s  3d "},
          {label:"C", text:"1s  2s  2p  3s  2p  4s  2p "},
          {label:"D", text:"1s  2s  2p  3s  2p  3s  2p  4s  3d  "}
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2023-q0035",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"What is the value of angular momentum quantum number of a 3d-orbital?",
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2023-q0036",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The energy needed to remove an electron in the outermost shell of a gaseous atom is called:",
      options:[
            {label:"A", text:"Ionization energy"},
          {label:"B", text:"Electron affinity"},
          {label:"C", text:"electrode potential"},
          {label:"D", text:"photoelectric energy"}
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2023-q0037",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Substances that are electron pair acceptors are called:",
      options:[
            {label:"A", text:"Arrhenius bases"},
          {label:"B", text:"Lewis bases"},
          {label:"C", text:"Bronsted-Lowry acids"},
          {label:"D", text:"Lewis acids"}
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2023-q0038",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"A shampoo solution at 25 C has a hydroxide ion concentration of 1.5   10   moldm  . The solution is:",
      options:[
            {label:"A", text:"acidic"},
          {label:"B", text:"neutral"},
          {label:"C", text:"basic"},
          {label:"D", text:"amphoteric"}
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2023-q0039",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The degeneracy of orbitals with angular momentum quantum number l = 2 is:",
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2023-q0040",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Gases deviate from Charles' law at:",
      options:[
            {label:"A", text:"high temperature"},
          {label:"B", text:"low pressure"},
          {label:"C", text:"low temperature"},
          {label:"D", text:"moderate pressure"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0041",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The element that gives no colour in flame is:",
      options:[
            {label:"A", text:"Be"},
          {label:"B", text:"Ca"},
          {label:"C", text:"Na"},
          {label:"D", text:"Li"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0042",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"All Group I metals react with water to form:",
      options:[
            {label:"A", text:"hydrogen gas only"},
          {label:"B", text:"neutral solutions"},
          {label:"C", text:"acidic solution with liberation of hydrogen"},
          {label:"D", text:"strong caustic solution with liberation of hydrogen"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0043",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"If the molecule A   B breaks homolytically, then:",
      options:[
            {label:"A", text:"A becomes negatively charged"},
          {label:"B", text:"A becomes positively charged, B becomes negatively charged"},
          {label:"C", text:"both electrons move to B because B is more electronegative"},
          {label:"D", text:"electrons are shared evenly"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0044",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The effect of acid rain include the following except :",
      options:[
            {label:"A", text:"death of aquatic animals"},
          {label:"B", text:"damage of buildings and statues"},
          {label:"C", text:"depletion of ozone layer"},
          {label:"D", text:"corrosion of iron"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0045",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The alkaline earth metals becomes more reactive as we:",
      options:[
            {label:"A", text:"ascend the group"},
          {label:"B", text:"descend the group"},
          {label:"C", text:"introduce an external force"},
          {label:"D", text:"introduce other group elements"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0046",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"What is the name given to the complex ion [Co(SO )(NH ) ] ?",
      options:[
            {label:"A", text:"Pentaammine sulphatocobalt(I) ion"},
          {label:"B", text:"Pentaammine sulphato cobaltate (I) ion"},
          {label:"C", text:"Pentaammine sulphato cobalt (III) ion"},
          {label:"D", text:"Pentaammine sulphato cobalate (III) ion"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0047",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Which of the statements below is not a property of halogen?",
      options:[
            {label:"A", text:"They all exhibit valency of +1"},
          {label:"B", text:"They belong to the p-block of the periodic table"},
          {label:"C", text:"They are all non-metals"},
          {label:"D", text:"They are all oxidizing agents"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0048",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"Lucas reagent is used to distinguish between:",
      options:[
            {label:"A", text:"saturated and unsaturated hydrocarbons"},
          {label:"B", text:"primary and secondary amines"},
          {label:"C", text:"the three classes of alkanols"},
          {label:"D", text:"alkanols and alkanones"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0049",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The IUPAC name of the compound CH =C CH  CH  COOH is:",
      options:[
            {label:"A", text:"1-pentyne-4-oic acid"},
          {label:"B", text:"pent-4-yne-1-oic acid"},
          {label:"C", text:"5-pentyn-1-oic acid"},
          {label:"D", text:"pent-4-yne-1-oic acid"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-q0050",
      subject:"chemistry",
      year:2023,
      category:"objective",
      question:"The number of   electrons in butyne is:",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0001",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"A sodium pellet is dropped into warm water and 500 cm  of hydrogen gas is liberated. What mass of sodium is involved in the reaction?",
      options:[
            {label:"A", text:"1.03 g"},
          {label:"B", text:"0.51 g"},
          {label:"C", text:"2.30 g"},
          {label:"D", text:"0.98 g"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0002",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Calculate the percentage by mass of water of crystallization in MgSO  7H O:",
      options:[
            {label:"A", text:"51.2%"},
          {label:"B", text:"56.7%"},
          {label:"C", text:"50.12%"},
          {label:"D", text:"52.55%"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0003",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"What volume of 5 moldm   tetraoxosulphate (VI) acid is required to prepare 300 cm  of 0.5 moldm   solution?",
      options:[
            {label:"A", text:"51.2%"},
          {label:"B", text:"56.7%"},
          {label:"C", text:"3 cm "},
          {label:"D", text:"50 cm "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0004",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"An ion complex with molecular formula C H FeN O , constitutes 6% of haemoglobin by mass. If a blood sample contains 0.75 g of haemoglobin, what percentage of Fe is contributed by the complex?",
      options:[
            {label:"A", text:"0.0041g"},
          {label:"B", text:"0.0450g"},
          {label:"C", text:"0.0600g"},
          {label:"D", text:"0.00556g"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0005",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The temperature above which the liquid state of a substance no longer exists is called:",
      options:[
            {label:"A", text:"Supercritical temperature"},
          {label:"B", text:"Critical pressure"},
          {label:"C", text:"Critical temperature"},
          {label:"D", text:"Critical point"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0006",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"According to the collision theory and kinetic theory, increase in temperature does the following except:",
      options:[
            {label:"A", text:"Supercritical temperature"},
          {label:"B", text:"Critical pressure"},
          {label:"C", text:"Increases the frequency of collision"},
          {label:"D", text:"Increases the number of particles with energy greater than the activation energy"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0007",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The part of the universe that is of immediate interest in a reaction is termed:",
      options:[
            {label:"A", text:"Universe"},
          {label:"B", text:"Surrounding"},
          {label:"C", text:"System"},
          {label:"D", text:"Environment"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0008",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Which of the following will affect the equilibrium position of the reaction? I (g) + H (g)   2HI(g) *(Continuing from page 140 questions 13 onwards   these are cut off in the images but the Qualitative Analysis practical answers are clearly visible on pages 139)* Given the following data: | Substance |  H  (kJmol  ) | S  (Jmol  ) | |---|---|---| | SO  |  157 | 42.63 | | CuO |  395.2 | 256.2 | | CuSO  |  771.36 | 109 | (i). Calculate the standard free energy for this reaction at 37 ",
      options:[
            {label:"A", text:"Addition of a catalyst"},
          {label:"B", text:"Increase in pressure"},
          {label:"C", text:"Decrease in pressure"},
          {label:"D", text:"Addition of HI (i). Calculate the standard free energy for this reaction at 37 "}
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0009",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Using the equation: C  = (P   d   10)/(M) = (37.8   1.1917   10)/36.5 = 12.34M Where C  = conc. of stock, P = 37.8, d = 1.1917, M = 36.5; Answer = C (12.0 M)",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0010",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Let O.N of S in S O    be x. 4y + 7( 2) =  2; 4y   14 =  2; 4y = +12; y = +3 Let O.N of S in S O    be x. 2x + 3( 2) =  2; 2x   6 =  2; 2x = +4; x = +2",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0011",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"R.M.M of C H NO  = 5   12 + 8   1 + 14 + 4   16 = 146 %C = (60/146)   100 = 41.1%; Answer = C",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0012",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"A 2NO (g)   2NO(g) + O (g) t = 0: 2NO ; x; 0 t = t: 4   2x; 2x; x [NO] = 2   (0.8)/1 = 1.6; x = 0.8; [NO] = 2x/1 = 2(0.8) = 1.6 M [O ] = 0.8/1 = 0.8 M; [NO ] = (4 2(0.8))/1 = 2.4 M Kc = [NO] [O ]/[NO ]  = (1.6    0.8)/2.4  = 0.8/1; Answer = Option D",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0013",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"D B A D C C D",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0014",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"C B D D D 108 g/mol of Ag contains 6.023   10   atoms of Ag 21.6 g of Ag will contain (21.6   6.023   10  )/108 = 1.024   10   atoms; Answer = **C**",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0015",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"A B A C D B D B",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0016",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Enthalpy change of formation of TiO (s): Ti(s) + O (g)   TiO (s);  H =  940 kJmol   ...(1) Enthalpy of formation of CO(g): C(s) +  O (g)   CO(g);  H =  110 kJmol   ...(2) Multiply equation (1) by 2, rearrange equation (1) and add: TiO (s)   Ti(s) + O (g);  H = +940 kJmol   2C(s) + O (g)   2CO(g);  H =  220 kJmol   Overall equation: TiO (s) + 2C(s)   Ti(s) + 2CO(g);  H = +720 kJmol  ; **Option C**",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0017",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The properties of organic molecules are related to carbon to carbon bond properties such as: (i) bond length (ii) bond dissociation energy & (iii) bond rotation. Which of these properties revealed the fact that a  -bond is weaker than a  -bond? **Question 1** **(a)** What are acid-base indicators? **[1 Mark]** **(b)** A 550 mg tablet containing vitamin C, C H O , was dissolved in water and reacted with bromine: C H O  + Br    C H O  + 2HBr The resulting solution was titrated with 40 cm  of 0.145 M NaOH: HBr + NaOH   NaBr + H O - (i) Calculate the percentage of vitamin C in the tablet - (ii) Calculate the percentage of carbon in the vitamin C content of the tablet. **[6]** **(c)** The equilibrium constant expression for a reaction is: K = [NO ] [O ] / [N O ] - (i) Write the balanced chemical equation corresponding to this expression. - (ii) What is the equilibrium constant expression when the concentrations are halved? **[3 Marks]** - (iii) Write the equilibrium constant expression for (cii) above when the equation is reversed.",
      options:[
            {label:"A", text:"(ii) only"},
          {label:"B", text:"(iii) only"},
          {label:"C", text:"(i) only"},
          {label:"D", text:"(i) and (iii)"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0018",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The product of catalytic cracking of C  H   are: **Question 1a)** Briefly explain the following: - i. Duality of light - ii. Photon of light - iii. Pauli exclusion principle - b) What is the set of quantum numbers for third and eight electrons of fluorine (F)? **(Pages 158 162 continuing with more 2017 questions)**",
      options:[
            {label:"A", text:"C H   and C H  "},
          {label:"B", text:"C H   and C H  "},
          {label:"C", text:"C H   and C H  "},
          {label:"D", text:"C H   and C H  "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0019",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"An example of a natural radioactivity is:      U +   n        Th +   He +  ",
      options:[
            {label:"A", text:"Mr = PV/RT/m"},
          {label:"B", text:"Mr = mPV/RT"},
          {label:"C", text:"Mr = mRT/PV"},
          {label:"D", text:"Mr = PV/MRT"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0020",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The general gas equation can be used to calculate the molar mass, M, value of a gas. For a sample of a gas of mass m, which expression will give the value of M?",
      options:[
            {label:"A", text:"     Bi        Po +    e"},
          {label:"B", text:"   N +   He      O +  H"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0021",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Which of the following will affect the equilibrium position of the reaction? I (g) + H (g)   2HI(g) - A. Addition of a catalyst - B. Increase in pressure - C. Decrease in pressure - D. Addition of HI --- *(Continuing from page 140 questions 13 onwards   these are cut off in the images but the Qualitative Analysis practical answers are clearly visible on pages 139)* --- Given the following data: | Substance |  H  (kJmol  ) | S  (Jmol  ) | |---|---|---| | SO  |  157 | 42.63 | | CuO |  395.2 | 256.2 | | CuSO  |  771.36 | 109 | (i). Calculate the standard free energy for this reaction at 37 C. [3 Mks]  H  =  H p    H r =  771.36   ( 395.2   157) =  771.36 + 552.2 =  219.16 kJmol    S  =  S p    S r = 109   (256.2 + 42.63) =  189.83 Jmol  K    G  =  H    T S  =  219.16   310( 0.18983) =  160.31 kJmol   (ii). The reaction is a spontaneous reaction. **(d).** RNH /Rx =  (Mx/MMNH ) 2.25/1.40 =  (Mx/17); Mx = (2.25/1.40)    17 = 44 The molar mass of X is therefore 44, and possible gases are CO  and C H . --- 1. A 2. A 3. C 4. B 5. D 6. B 7. B 8. B",
      options:[
            {label:"A", text:"Addition of a catalyst"},
          {label:"B", text:"Increase in pressure"},
          {label:"C", text:"Decrease in pressure"},
          {label:"D", text:"Addition of HI"}
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0022",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"A **13.** 2NO (g)   2NO(g) + O (g) t = 0: 2NO ; x; 0 t = t: 4   2x; 2x; x [NO] = 2   (0.8)/1 = 1.6; x = 0.8; [NO] = 2x/1 = 2(0.8) = 1.6 M [O ] = 0.8/1 = 0.8 M; [NO ] = (4 2(0.8))/1 = 2.4 M Kc = [NO] [O ]/[NO ]  = (1.6    0.8)/2.4  = 0.8/1; Answer = Option D",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0023",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"D **15.** B **16.** A **17.** D **18.** C **19.** C **20.** D",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0024",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"C **22.** B **23.** D **24.** D **25.** D **26.** 108 g/mol of Ag contains 6.023   10   atoms of Ag 21.6 g of Ag will contain (21.6   6.023   10  )/108 = 1.024   10   atoms; Answer = **C**",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0025",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"A **28.** B **29.** A **30.** C **31.** D **32.** B **33.** D **34.** B",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0026",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The properties of organic molecules are related to carbon to carbon bond properties such as: (i) bond length (ii) bond dissociation energy & (iii) bond rotation. Which of these properties revealed the fact that a  -bond is weaker than a  -bond? - A. (ii) only - B. (iii) only - C. (i) only - D. (i) and (iii) --- --- **Question 1** **(a)** What are acid-base indicators? **[1 Mark]** **(b)** A 550 mg tablet containing vitamin C, C H O , was dissolved in water and reacted with bromine: C H O  + Br    C H O  + 2HBr The resulting solution was titrated with 40 cm  of 0.145 M NaOH: HBr + NaOH   NaBr + H O - (i) Calculate the percentage of vitamin C in the tablet - (ii) Calculate the percentage of carbon in the vitamin C content of the tablet. **[6]** **(c)** The equilibrium constant expression for a reaction is: K = [NO ] [O ] / [N O ] - (i) Write the balanced chemical equation corresponding to this expression. - (ii) What is the equilibrium constant expression when the concentrations are halved? **[3 Marks]** - (iii) Write the equilibrium constant expression for (cii) above when the equation is reversed.",
      options:[
            {label:"A", text:"(ii) only"},
          {label:"B", text:"(iii) only"},
          {label:"C", text:"(i) only"},
          {label:"D", text:"(i) and (iii)"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0027",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The product of catalytic cracking of C  H   are: - A. C H   and C H   - B. C H   and C H   - C. C H   and C H   - D. C H   and C H   --- **Question 1a)** Briefly explain the following: - i. Duality of light - ii. Photon of light - iii. Pauli exclusion principle - b) What is the set of quantum numbers for third and eight electrons of fluorine (F)? --- **(Pages 158 162 continuing with more 2017 questions)**",
      options:[
            {label:"A", text:"C H   and C H  "},
          {label:"B", text:"C H   and C H  "},
          {label:"C", text:"C H   and C H  "},
          {label:"D", text:"C H   and C H  "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0028",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Which of the following ions has the smallest size? - A. O   - B. Na  - C. Mg   - D. F ",
      options:[
            {label:"A", text:"O  "},
          {label:"B", text:"Na "},
          {label:"C", text:"Mg  "},
          {label:"D", text:"F "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0029",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"A sodium pellet is dropped into warm water and 500 cm  of hydrogen gas is liberated. What mass of sodium is involved in the reaction? - A. 1.03 g - B. 0.51 g - C. 2.30 g - D. 0.98 g",
      options:[
            {label:"A", text:"1.03 g"},
          {label:"B", text:"0.51 g"},
          {label:"C", text:"2.30 g"},
          {label:"D", text:"0.98 g"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0030",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Calculate the percentage by mass of water of crystallization in MgSO  7H O: - A. 51.2% - B. 56.7% - C. 50.12% - D. 52.55%",
      options:[
            {label:"A", text:"51.2%"},
          {label:"B", text:"56.7%"},
          {label:"C", text:"50.12%"},
          {label:"D", text:"52.55%"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0031",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"What volume of 5 moldm   tetraoxosulphate (VI) acid is required to prepare 300 cm  of 0.5 moldm   solution? - A. 51.2% - B. 56.7% - C. 3 cm  - D. 50 cm ",
      options:[
            {label:"A", text:"51.2%"},
          {label:"B", text:"56.7%"},
          {label:"C", text:"3 cm "},
          {label:"D", text:"50 cm "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0032",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"An ion complex with molecular formula C H FeN O , constitutes 6% of haemoglobin by mass. If a blood sample contains 0.75 g of haemoglobin, what percentage of Fe is contributed by the complex? - A. 0.0041g - B. 0.0450g - C. 0.0600g - D. 0.00556g",
      options:[
            {label:"A", text:"0.0041g"},
          {label:"B", text:"0.0450g"},
          {label:"C", text:"0.0600g"},
          {label:"D", text:"0.00556g"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0033",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The temperature above which the liquid state of a substance no longer exists is called: - A. Supercritical temperature - B. Critical pressure - C. Critical temperature - D. Critical point",
      options:[
            {label:"A", text:"Supercritical temperature"},
          {label:"B", text:"Critical pressure"},
          {label:"C", text:"Critical temperature"},
          {label:"D", text:"Critical point"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0034",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"According to the collision theory and kinetic theory, increase in temperature does the following except: - A. Supercritical temperature - B. Critical pressure - C. Increases the frequency of collision - D. Increases the number of particles with energy greater than the activation energy",
      options:[
            {label:"A", text:"Supercritical temperature"},
          {label:"B", text:"Critical pressure"},
          {label:"C", text:"Increases the frequency of collision"},
          {label:"D", text:"Increases the number of particles with energy greater than the activation energy"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0035",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The part of the universe that is of immediate interest in a reaction is termed: - A. Universe - B. Surrounding - C. System - D. Environment",
      options:[
            {label:"A", text:"Universe"},
          {label:"B", text:"Surrounding"},
          {label:"C", text:"System"},
          {label:"D", text:"Environment"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0036",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"An example of a natural radioactivity is:      U +   n        Th +   He +   - A. Mr = PV/RT/m - B. Mr = mPV/RT - C. Mr = mRT/PV - D. Mr = PV/MRT",
      options:[
            {label:"A", text:"Mr = PV/RT/m"},
          {label:"B", text:"Mr = mPV/RT"},
          {label:"C", text:"Mr = mRT/PV"},
          {label:"D", text:"Mr = PV/MRT"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0037",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The general gas equation can be used to calculate the molar mass, M, value of a gas. For a sample of a gas of mass m, which expression will give the value of M? - A.      Bi        Po +    e - B.    N +   He      O +  H",
      options:[
            {label:"A", text:"     Bi        Po +    e"},
          {label:"B", text:"   N +   He      O +  H"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0038",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Which of these bonds does not exist within a molecule of ammonium chloride? - A. Ionic - B. Covalent - C. Dative covalent - D. Van der Waals",
      options:[
            {label:"A", text:"Ionic"},
          {label:"B", text:"Covalent"},
          {label:"C", text:"Dative covalent"},
          {label:"D", text:"Van der Waals"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0039",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Which of the following will affect the equilibrium position of the reaction? I (g) + H (g)   2HI(g) -",
      options:[
            {label:"A", text:"Addition of a catalyst"},
          {label:"B", text:"Increase in pressure"},
          {label:"C", text:"Decrease in pressure"},
          {label:"D", text:"Addition of HI"},
          {label:"C", text:"[3 Mks]"}
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2023-t0040",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The properties of organic molecules are related to carbon to carbon bond properties such as: (i) bond length (ii) bond dissociation energy & (iii) bond rotation. Which of these properties revealed the fact that a  -bond is weaker than a  -bond? -",
      options:[
            {label:"A", text:"(ii) only"},
          {label:"B", text:"(iii) only"},
          {label:"C", text:"(i) only"},
          {label:"D", text:"(i) and (iii)"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0041",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The product of catalytic cracking of C  H   are: -",
      options:[
            {label:"A", text:"C H   and C H  "},
          {label:"B", text:"C H   and C H  "},
          {label:"C", text:"C H   and C H  "},
          {label:"D", text:"C H   and C H  "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0042",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Which of the following ions has the smallest size? -",
      options:[
            {label:"A", text:"O  "},
          {label:"B", text:"Na "},
          {label:"C", text:"Mg  "},
          {label:"D", text:"F "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0043",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"A sodium pellet is dropped into warm water and 500 cm  of hydrogen gas is liberated. What mass of sodium is involved in the reaction? -",
      options:[
            {label:"A", text:"1.03 g"},
          {label:"B", text:"0.51 g"},
          {label:"C", text:"2.30 g"},
          {label:"D", text:"0.98 g"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0044",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Calculate the percentage by mass of water of crystallization in MgSO  7H O: -",
      options:[
            {label:"A", text:"51.2%"},
          {label:"B", text:"56.7%"},
          {label:"C", text:"50.12%"},
          {label:"D", text:"52.55%"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0045",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"What volume of 5 moldm   tetraoxosulphate (VI) acid is required to prepare 300 cm  of 0.5 moldm   solution? -",
      options:[
            {label:"A", text:"51.2%"},
          {label:"B", text:"56.7%"},
          {label:"C", text:"3 cm "},
          {label:"D", text:"50 cm "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0046",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"An ion complex with molecular formula C H FeN O , constitutes 6% of haemoglobin by mass. If a blood sample contains 0.75 g of haemoglobin, what percentage of Fe is contributed by the complex? -",
      options:[
            {label:"A", text:"0.0041g"},
          {label:"B", text:"0.0450g"},
          {label:"C", text:"0.0600g"},
          {label:"D", text:"0.00556g"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0047",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The temperature above which the liquid state of a substance no longer exists is called: -",
      options:[
            {label:"A", text:"Supercritical temperature"},
          {label:"B", text:"Critical pressure"},
          {label:"C", text:"Critical temperature"},
          {label:"D", text:"Critical point"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0048",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"According to the collision theory and kinetic theory, increase in temperature does the following except: -",
      options:[
            {label:"A", text:"Supercritical temperature"},
          {label:"B", text:"Critical pressure"},
          {label:"C", text:"Increases the frequency of collision"},
          {label:"D", text:"Increases the number of particles with energy greater than the activation energy"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0049",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The part of the universe that is of immediate interest in a reaction is termed: -",
      options:[
            {label:"A", text:"Universe"},
          {label:"B", text:"Surrounding"},
          {label:"C", text:"System"},
          {label:"D", text:"Environment"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0050",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"An example of a natural radioactivity is:      U +   n        Th +   He +   -",
      options:[
            {label:"A", text:"Mr = PV/RT/m"},
          {label:"B", text:"Mr = mPV/RT"},
          {label:"C", text:"Mr = mRT/PV"},
          {label:"D", text:"Mr = PV/MRT"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0051",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"The general gas equation can be used to calculate the molar mass, M, value of a gas. For a sample of a gas of mass m, which expression will give the value of M? -",
      options:[
            {label:"A", text:"     Bi        Po +    e"},
          {label:"B", text:"   N +   He      O +  H"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-t0052",
      subject:"chemistry",
      year:2023,
      category:"theory",
      question:"Which of these bonds does not exist within a molecule of ammonium chloride? -",
      options:[
            {label:"A", text:"Ionic"},
          {label:"B", text:"Covalent"},
          {label:"C", text:"Dative covalent"},
          {label:"D", text:"Van der Waals"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2023-p0001",
      subject:"chemistry",
      year:2023,
      category:"practical",
      question:"(ai) Define an acid and a base in terms of Bronsted-Lowry concept. **[2 Mks]** (ii) Calculate the pH of a buffer solution containing 0.623 moldm   hexanoic acid and 0.812 moldm   sodium hexanoate. [Ka = 1.32   10  ] **[2 Marks]** **(b)** Classify the reactants in each of the following reactions as acid or base and identify the acid-base conjugate pairs: - (i) NH   + H O   NH  + H O  - (ii) OH  + CH NH    CH NH   + O   **(c)** Using relevant reactions equation, explain why: - (i) water is amphoteric **[1]** - (ii) methanol is a Bronsted-Lowry acid **[1 Mark]** **Question 3.** Using the following data: Fe  (aq) + e    Fe  (aq); E  = +0.77 V MnO  (aq) + 8H (aq) + 5e    Mn  (aq) + 4H O(l); E  = +1.52 V I (aq) + 2e    2I (aq); E  = +0.54 V Cr O   (aq) + 14H (aq) + 6e    2Cr  (aq) + 7H O(l); E  = +1.33 V **(a)** Predict the outcome of mixing aqueous solutions of: - (i) Iron (II) sulphate with acidified potassium manganate (VII) **[1 Mark]** - (ii) Potassium iodide with acidified potassium dichromate (VI) **[1 Mark]** **(b)** Write the half equations and the balanced equations for the reactions you predicted **[2 Marks]** **(c)** Calculate the standard cell potential in each case **[2 Marks]** **(d)** The reaction  N  + 3/2 H    NH  proceeded in a closed autoclaved of volume 5 dm . In 1 second, 0.01 mole of nitrogen reacted. Calculate the rate of: - (i) Consumption of nitrogen **[1 Mark]** - (ii) Consumption of hydrogen **[1 Mark]** - (iii) Formation of ammonia **[1 Mark]** - (iv) The reaction **[1 Mark]** **Question 4.** **(a)** State two differences between alpha ( ) and beta ( ) particle. **[2 Marks]** **(b)(i)** Define nuclear fusion **[1 Mark]** **(ii)** Calculate the nuclear energy per mole for the following nuclear reaction:    N +   He      O +   H Given the following isotopic masses:    N = 13.9992 amu,   He = 4.0026 amu,    O = 16.9991 amu,   H = 1.0078 amu; 1 amu = 1.66   10    kg atom  , N  = 6.023   10   mol   **[3 Marks]** **(ci)** State Hess's law **[1 Mark]** **(ii)** For the reaction: C H (g) + 3O (g)   2CO (g) + 2H O(g);  H rxn =  1323 kJmol   Given that S [C H (g)] = 219.6 Jmol  ; S [O (g)] = 205 Jmol  ; S [CO (g)] = 213.6 Jmol  ; S [H O(g)] = 130.6 Jmol  , calculate the value of  G rxn at 25 ",
      difficulty:"medium"
    },
    {
      id:"che-2023-p0002",
      subject:"chemistry",
      year:2023,
      category:"practical",
      question:"Na + H O   NaOH +  H  No. of mole of H  = 500/22400 = 0.0223; 1 mole of Na = 0.5 mole of hydrogen; 0.0223 mole of H  = 0.0223/0.5 = 0.0446 mole Mass of Na = 23   0.0446 = 1.03 g **Option A**",
      difficulty:"medium"
    },
    {
      id:"che-2023-p0003",
      subject:"chemistry",
      year:2023,
      category:"practical",
      question:"RMM of MgSO  7H O = 24 + 32 + 4   16 + 7   18 = 246; % water of crystallization = 126/246   100 = 51.2% **Option A**",
      difficulty:"medium"
    },
    {
      id:"che-2023-p0004",
      subject:"chemistry",
      year:2023,
      category:"practical",
      question:"C V  = C V ; V  = C V /C  = 0.5   300/5 = 30 cm  **Option A**",
      difficulty:"medium"
    },
    {
      id:"che-2023-p0005",
      subject:"chemistry",
      year:2023,
      category:"practical",
      question:"Mass of haemoglobin in the sample = 0.75 g; Mass of complex in the haemoglobin = (0.75   6)/100 = 0.045 g Molar mass of complex = 34   12 + 32   1 + 56 + 4   14 + 4   16 = 616 gmol  ; 616 g of complex contains 56 g of Fe 0.045 g of complex will contain = (0.045   56)/616 = 0.0041 g **Option A** 19. C, 20. C, 21. C, 22. B, 23. C, 24. A, 25. C, 26. C, 27. B",
      difficulty:"medium"
    },
    {
      id:"che-2023-p0006",
      subject:"chemistry",
      year:2023,
      category:"practical",
      question:"E cell = E R   E L = 0.7996   0.3402 = 0.4594 V **Option C** 29. A, 30. D, 31. D, 32. B, 33. C, 34. B",
      difficulty:"medium"
    },
    {
      id:"che-2023-p0007",
      subject:"chemistry",
      year:2023,
      category:"practical",
      question:"(ai) Define an acid and a base in terms of Bronsted-Lowry concept. **[2 Mks]** (ii) Calculate the pH of a buffer solution containing 0.623 moldm   hexanoic acid and 0.812 moldm   sodium hexanoate. [Ka = 1.32   10  ] **[2 Marks]** **(b)** Classify the reactants in each of the following reactions as acid or base and identify the acid-base conjugate pairs: - (i) NH   + H O   NH  + H O  - (ii) OH  + CH NH    CH NH   + O   **(c)** Using relevant reactions equation, explain why: - (i) water is amphoteric **[1]** - (ii) methanol is a Bronsted-Lowry acid **[1 Mark]** --- **Question 3.** Using the following data: Fe  (aq) + e    Fe  (aq); E  = +0.77 V MnO  (aq) + 8H (aq) + 5e    Mn  (aq) + 4H O(l); E  = +1.52 V I (aq) + 2e    2I (aq); E  = +0.54 V Cr O   (aq) + 14H (aq) + 6e    2Cr  (aq) + 7H O(l); E  = +1.33 V **(a)** Predict the outcome of mixing aqueous solutions of: - (i) Iron (II) sulphate with acidified potassium manganate (VII) **[1 Mark]** - (ii) Potassium iodide with acidified potassium dichromate (VI) **[1 Mark]** **(b)** Write the half equations and the balanced equations for the reactions you predicted **[2 Marks]** **(c)** Calculate the standard cell potential in each case **[2 Marks]** **(d)** The reaction  N  + 3/2 H    NH  proceeded in a closed autoclaved of volume 5 dm . In 1 second, 0.01 mole of nitrogen reacted. Calculate the rate of: - (i) Consumption of nitrogen **[1 Mark]** - (ii) Consumption of hydrogen **[1 Mark]** - (iii) Formation of ammonia **[1 Mark]** - (iv) The reaction **[1 Mark]** **Question 4.** **(a)** State two differences between alpha ( ) and beta ( ) particle. **[2 Marks]** **(b)(i)** Define nuclear fusion **[1 Mark]** **(ii)** Calculate the nuclear energy per mole for the following nuclear reaction:    N +   He      O +   H Given the following isotopic masses:    N = 13.9992 amu,   He = 4.0026 amu,    O = 16.9991 amu,   H = 1.0078 amu; 1 amu = 1.66   10    kg atom  , N  = 6.023   10   mol   **[3 Marks]** **(ci)** State Hess's law **[1 Mark]** **(ii)** For the reaction: C H (g) + 3O (g)   2CO (g) + 2H O(g);  H rxn =  1323 kJmol   Given that S [C H (g)] = 219.6 Jmol  ; S [O (g)] = 205 Jmol  ; S [CO (g)] = 213.6 Jmol  ; S [H O(g)] = 130.6 Jmol  , calculate the value of  G rxn at 25 C. **[3 Mks]** --- **Question 5.** **(a)** The elements in Group II show a variety of trends in their properties. - (i) Explain the trend in reactivity of Mg, Ca and Ba with cold water. **[2 Marks]** - (ii) Write the equation for the reaction of Mg with steam **[1 Mark]** **(b)** Name an element among the period three elements which forms an amphoteric oxide and write equations which illustrate this amphoteric property. **[2 Marks]** **(ci)** What is a complex ion? **[1 Mark]** **(ii)** Explain why the first ionization energy of nitrogen is greater than that of the other members of group 14 elements. **[1 Mark]** **(d)** List four unique characteristics of carbon that makes it different from the other members of group 14 elements. **[2 Marks]** **(e)** Name the element among the period three elements which forms an amphoteric oxide and write equations which illustrate this amphoteric property. **[2 Marks]** **Question 6.** **(a)(i)** What is a complex ion? **(ii)** What is a complex ion? **[1 Mark]** **(b)** What is the coordination number of the metal in the following molecules or ions bonded to a complex ion? - [Cu(NH ) (H O) ]   and [Cu(NH CH CH NH ) ]   **(ii)** Provide the IUPAC names for the following: - (I) [Cu(NH ) (H O) ]   - (II) [Ni(NH ) Cl ] - (III) [Fe(H O) (en) ]   - (IV) [Cr(NH ) (H O) ]Cl  **(iii)** Briefly explain why beryllium tend to be different from the other elements in group 2 of the periodic table. Give two anomalous properties of beryllium. **[2]** **(iv)** Explain the trend of the periodic table. Give two anomalous properties of beryllium and nitrates of alkaline earth metals decompose on heating. **[2 Marks]** --- **Question 7.** **(ai)** What is isomerism? **[1 Mark]** **(ii)** Draw the structural formula of the isomeric alcohols with the molecular formula C H  O and name them using IUPAC system of naming. **[4 Marks]** The four isomers are: - A = Butan-1-ol - B = Butan-2-ol - C = 2-methyl propan-1-ol - D = 2-methyl propan-2-ol **(iii)** Draw the products of oxidation of each of the isomers using IUPAC system: - A   [O]   Butanal - B   [O]   Butanone - C   [O]   2-methyl propanal - D   [O]   No oxidation **(b)(i)** Give one example each of such reactions (cleavage of C-O bond and O-H bond in alcohols involving unsaturated bond). **(ii)** Show the conversion of ethanoic acid into the following using suitable equations: - (i) acid chloride (ii) acid anhydride (iii) ester **8(a)(i)** Grignard reagents are organometallic compounds containing carbon-magnesium metallic bond formed by reacting alkyl halides with magnesium fillings in dry ether. R X + Mg   RMgX (X = Cl, Br or I) **(ii)** Give the IUPAC name of the product. **(iii)** CH CH CHO + CH CH MgBr   CH CH CH(OH)CH CH  + Mg(OH)Br **(iv)** Pentan-2-ol; Cleavage of C-O bond: CH CH OH + CH COOH   CH COOCH CH  + H O Cleavage of O-H bond: CH CH OH + Na   CH CH O Na  +  H  **(b)** Benzene does not undergo addition reaction because of its aromaticity (resonance effect) which gives the benzene ring enough stability. **(c)** The two alkyl groups on either side of the carbonyl of ketones make them bulkier than aldehydes which contains small hydrogen atom on the other end of the carbonyl. More so, alkyl groups are electron releasing groups thereby reducing reactivity of ketones towards electrophilic reactions. **(d)** Steric and inductive (electronic) effects. **(e)** Hexane-1,6-dioic acid / adipic acid and hexane-1,6-diamine. --- **Given the following information:** - Solution A: An aqueous solution of HCl - Solution B: 0.05 moldm   solution of Na CO  - Solution C: A solution of NaOH **Procedure:** - (i) Pipette 25 cm  of solution B into a clean conical flask. Add 2 or 3 drops of indicator. Titrate against the solution A in the burette. Record your titre value. - (ii) Repeat the titration 2 more times and find the average. - (iii) Pipette 25 cm  of solution C into another conical flask. Add 2 or 3 drops of indicator. Titrate against the solution A in the burette. Record your titre values. [Na = 23, O = 16, C = 12, Cl = 35.5, H = 1] - (iv) Repeat the titration 2 more times and find the average titre values. From your results, determine: - (a) What is the aim of this titrimetric analysis? - (b) Number of moles of HCl in 1 dm  of A - (c) From your results, determine: (ii) Concentration in g/dm  - (iii) Number of moles of NaOH in 1 dm  of C - (iv) Concentration in g/dm  **[Total = 10 Marks]** You are provided with sample (D), a mixture of two simple salts, and you are required to perform the following tests to identify the cations: **Test 1:** To about 0.5 g of (D) in the test tube, add hot water and allow to cool for five minutes. **Test 2:** To the precipitate obtained in test 1, add hot water and allow to cool for followed by 6M HCl. Filter any precipitate formed. **Test 3:** Transfer filtrate from test 1 to a test tube and introduce 2M NH Cl, 2M NH OH and 2M (NH ) CO  until a precipitate is observed. **Test 4:** Filter the precipitate obtained in test 3, transfer the precipitate into a test tube and add 2M CH COOH and 0.5M potassium chromate. State the compounds formed after: (i) test 1 (ii) test 4 **[Total = 10 Marks]** --- **Option A:** 1. C, 2. D, 3. A, 4. B, 5. B 6. pOH =  log 1.5   10   = 8.82; pH = 14   8.82 = 5.18 7. B, 8. C, 9. C, 10. A, 11. D, 12. D, 13. D, 14. C",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0001",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"N  = 100; N  = 12.5; ln(N /N ) =  t;   = 0.693/t /  = 0.693/24 = 0.028875 hr  ; ln(100/12.5) = 0.028875   t; t = 2.0794/0.028875 = 72 hrs = 3 days **(C)** **18. C 19. A 20. B 21. A 22. B 23. D 24. D 25. B 26. A 27. B** **28. C 29. A 30. C 31. B 32. C 33. A 34.** ram = 6/11   80 + 5/11   100 = 43.6363 + 45.4545 = 89.1 **(C)** **35. A 36. B 37. B 38. D 39. C 40. D 41. B 42. B 43. B 44. A 45. D 46. A 47. C 48. A 49. C 50. C** **1(ai).** 1s  2s  2p  3s  3p  4s  3d   4p  **(ii).** 1s  2s  2  2p  3s  3p  4s  3d  **(bi).** (ii). 4s **[  Mark]** **(iii).** 3d **[  Mark]** **(iv).** 3s **[  Mark]** **(c).** Mass of C in CO  = 12/44   62.85 = 17.14 g | Element | Mass (g) | Number of moles (mol) | Mole ration | |---|---|---|---| | C | 17.14 | 17.14/12 = 1.4283 | 1.4283/1.4283 = 1 | | H | 2.84 | 2.84/1 = 2.84 | 2.84/1.4283 = 2 | **[  Mark]** Empirical formula = Molecular mass But, [Empirical formula]n = Molecular mass [CH ]n = 252; 14n = 252; n = 252/14 = **18** Molecular formula of the compound is CH . **[  Mark]** **(d).** | Measurement (x ) | /x    x / | /x    x /  | |---|---|---| | 10.325 | 0.005 | 0.000025 | | 10.320 | 0.000 | 0.000000 | | 10.315 | 0.005 | 0.000025 | | 10.313 | 0.007 | 0.000049 | | 10.327 | 0.007 | 0.000049 | | Summation | 0.024 | 0.000148 | Average deviation =  /x    x //N = 0.024/5 **[ ] = 0.0048 [1 Mark]** **Total = 10 Marks** **2(ai).** Ionization of atom is the process by which an atom gains or loses electrons to become an electrically charged ion. **[1 Mark]** **(ii).**   = 1460 nm = 1460   10   m = 1460   10   cm. From the expression: 1/  = R    (1/n     1/n  ); 1/1460   10   = 109678   (1/n     1/  ) 1/n   = 6849/109678 = 0.064; n   = 1/0.064 = 15.625; n  =  16 = 4 **[1 Mark]** The initial state of the electron is 4. **[1 Mark]** **(bi).** The shape of phosphine is trigonal pyramidal. **[1 Mark]** The bond angles in phosphine is 93.5 . **[1 Mark]** **(ii).** Covalent and dative bonds **[1 Mark]** **(c).** When a sample is introduced into the mass spectrometer through sample inlet, it is ionized in the ionization chamber to produce charged particles. The ions are then accelerated by the electric field followed by their separation based on their mass-to-charge ratios (m/z). The detector then detects the various separated ions and produce a mass spectrum of ion abundance against m/z and the sample components are identified. **[1 Mark]** **(d).** Displacement reaction is a reaction whereby an atom or group of atoms displaces another in a molecule. An example is the reaction between elemental sodium and dilute HCl. Na(s) + HCl(aq)   NaCl(aq) +  H (g) **[1 Mark]** **Total = 10 Marks** **3(ai).** State Hess's law **(ii). Rearrange equation (1):** H O(l)   H (g) +  O (g)  H = +285.8 kJ (5) **[  Mark]** Multiply equation (3) by 2: 2N (g) + 3O (g)   H (g) + H O(g)  H =  348.2 kJ (5) **[  Mark]** Add equations (4) and (5): 2N (g) + 3O (g)   N O (g)  H =  271.6 kJ (6) **[  Mark]** Add equations (6) and (7): 2N (g) + 5O (g)   2N O (g) Rearrange equation (1); H O(l)   H (g) +  O (g) Add equations (6) and (7): 2N (g) + 5/2 O (g)   N O (g)  H = +285.8 kJ (7) **[  Mark]** Add equations (6) and (7):  H = +14.2 kJ **[1 Mark]** **(b).** Anodic equation: 2Cr(s) + 6e    2Cr  (aq) + 6e    3Fe(s) Cathodic equation: 3Fe  (s) + 6e  + 2Cl(s) + 2Cl(s)   3Fe(s) + 2Cr  (s) Overall equation: 3Fe   + 6e     0.44 + 0.74 = +0.34   0.74 =  0.44 + 0.74 E_Cr  /Cr =  0.74V **[  Mark]** E_Fe  /Fe =  0.44V **[  Mark]** E _cell = E _reduced   E _oxidized =  0.44   ( 0.74) = 0.34   0.009855   4 = 0.34   0.039 Temp. T = 25  C + 273 = 298 K; Using Nernst equation: E_cell = E _cell   2.303RT/nF log [oxidized]/[Reduced] E_cell = 0.34   2.303   8.314   298/6   96500 log (0.1) /(0.01)  E_cell = 0.34   0.009855 log 10000 = 0.34   0.039 = **0.301 V** **[1 Mark]** **(ci).** Adding more of COCl  will increase the concentration of COCl  in the reaction and thereby shifts the equilibrium position to the right by increasing the rate of forward reaction. More of CO and Cl  will be produced. **[1 Marks]** **(ii).** Adding more of Cl  will increase the concentration of Cl  in the reaction and thereby shifts the equilibrium position to the left by increasing the rate of backward reaction. More of COCl  will be produced. **[1 Marks]** **Total = 10 Marks** **4(ai).** Nuclear binding energy is the energy that holds the nucleon particles (protons and neutrons) together in the nucleus of an atom. **[1 Mark]** **(ii).** Half-life, t /  = 15 days; Original mass, N  = 0.35 g; time of reaction, t = 6.5 days; Mass after time t, N  = ? The decay constant,  , is given as:   = 0.693/t /  = 0.693/15 = 0.0462 day   **[  Mark]** From the equation; N  = N e  t = 0.35   e                = 0.35   e        = 0.2499   **0.25 g** **[  Mark]** The amount used in the reaction is 0.35   0.25 = **0.10 g** **[  Mark]** **(bi).** Kc = 1/[O ]  K_c = number of mole/volume = 1/(1.5)  Given that: K_p = Kc[RT]^ n; T = 298 K;  n =  3 R = 0.0821L atm mol  K   respectively. K_p = 0.296   (0.0821   298)   = 0.296   24.4658 = 6.83   10   atm   **[1 Mk]** **(c).** MnO   + C O      MnO  + CO  Oxidation half equation: C O      2CO  + 2e  Reduction half equation: MnO   + 4H  + 3e    MnO  + 2H O Multiply the oxidation half equation by 3 and reduction half equation by 2 and add: 3C O      6CO  + 6e  2MnO   + 8H  + 6e    2MnO  + 4H O Over all equation: 2MnO   + 3C O      2MnO  + 6CO  + 4H O **[2]** **(di).** Mg(OH) (s)   Mg  (aq) + 2OH (aq) K_sp = [Mg  ][OH ]  **[1 Mark]** **(ii).** Let solubility of Mg(OH)  be y. Therefore; K_sp = [Mg  ][OH ]  = y   (2y)  = 4y  y =   (K_sp/4) =   (2.0   10   /4) =   5.0   10    = 1.71   10   moldm   Concentration of Mg(OH)  is **1.71   10   moldm  ** **[2 Marks]** **Total = 10 Marks** **5(ai).** Zn, Cd and Hg are not considered transition metals because they have completely filled d-orbitals (d  ) in their atomic and ionic forms while transition metals have partially filled d-orbitals. **[1 Mark]** **(ii).** Zn   salts are white because the ion has completely/fully filled d-orbitals (d  ) which prevents the ion from absorbing UV-visible light. Thus, it does not undergo d-d electronic transition. Cu   salts on the other hand are blue because Cu   has partially d-orbitals (d ) and absorbs visible light that causes the ion to undergo d-d electronic transition. Cu   salts are therefore coloured. **[  Mark]** **(b).** (i).   V   = 1s  2s  2p  3s  3p  4s  3d  **[ ] Paramagnetic [ ]** (ii).   Fe   = 1s  2s  2p  3s  3p  4s  3d  **[ ] Paramagnetic [ ]** (iii).   Ti = 1s  2s  2p  3s  3p  4s  3d  **[ ] Paramagnetic [ ]** (iv).   Cr  = 1s  2s  2p  3s  3p  4s  3d  **[ ] Paramagnetic [ ] [4 Marks]** That completes all 20 Chemistry images. Send the next batch and I'll continue building the full **2015 2024** Chemistry and Physics collection! **1(ai).** Explain why N   is larger than F , though both are isoelectronic ions with 10 electrons. N   is larger than F  because N   was formed after gaining 3 electrons by the nucleus, which has smaller attraction of the nucleus for electrons. Although both are isoelectronic (24 electrons   actually 10 electrons), Fe   is larger than Fe   since Fe   has more electrons (24) resulting in greater electron-electron repulsion as compared to Fe   (23) despite having the same nuclear charge. [1 Mark each] **1(bi).** State the uses of a blank determination in the laboratory. - Careful calibration of instruments - Maintaining constant temperature and humidity in the laboratory - Running of a blank determination - Isotopic dilution - Independent method of analysis etc. [1 Mark] **1(bii).** Balance the following equation: Cr O      Cr   Step 1   Balance Cr atoms (multiply product side by 2): Cr O      2Cr   Step 2   Balance O atoms by adding 7H O to product side: Cr O      2Cr   + 7H O Step 3   Balance H atoms by adding 14H  to reactant side: Cr O    + 14H    2Cr   + 7H O Step 4   Balance charges by adding 6e  to reactant side: Cr O    + 14H  + 6e    2Cr   + 7H O [2 Marks] [  Mark] [  Mark] **(ci).** Give examples of ionic compounds: Al S ; AlCl ; MgS; NaCl or MgS [1 Mark] **(cii).** Name elements: Na, Mg, Al, S, Cl [1 Mark] **2(a). Compound X** | Element | O | P | |---------|-----|------| | % Composition | 43.7 | 56.3 | | Number of mole (mol) | 43.7/16 = 2.73125 | 56.3/31 = 1.8161 | Mole ratio: 2.73125/1.8161 = 1.5   multiply   2   ratio = 3:2...   1.8161/1.8161 = 1 Therefore mole ratio   2: - P: 1.8161/1.8161   2 = 2 - O: 2.73125/1.8161   2 = 3 (approximately) Empirical formula of X = P O  [P O ]n = (2   31 + 3   16)n = 220; 110n = 220; n = 220/110 = 2 **Molecular formula of X is P O ** [2 Marks] **Compound Y** | Element | P | O | |---------|-----|------| | % Composition | 43.6 | 56.4 | | Number of mole (mol) | 43.6/31 = 1.4064 | 56.4/16 = 3.525 | Mole ratio: 1.4064/1.4064 = 1; 3.525/1.4064 = 2.5 Multiply   2: P = 2, O = 5 Empirical formula = P O  [P O ]n = (2   31 + 5   16)n = 284; 142n = 284; n = 284/142 = 2 **Molecular formula of X is P O  ** [2 Marks] **(bi).** State TWO postulates of Bohr's model: - Electrons revolve round the nucleus of an atom in a circular orbit - When an electron is in a particular energy level, it does not lose or gain energy but when changing state, energy is lost or gained. - Electrons in an atom exist in one of several allowed stationary states, each with a fixed energy. - The state of allowed motion are those for which angular momentum are quantized into a multiple of h/2 . [1 Mark for any two] **(bii).** State failures of Bohr's model: - Failure to explain splitting of some line spectra under the influence of electric field (Stark effect) - Failure to explain splitting of some line spectra under the influence of magnetic field (Zeeman effect) - The model only explains quantization of electrons and could not explain arrangement of electrons in an atom - The model was not accurate for complex and many-electron atoms - Failure to explain some line doublets and fine structure observed under high resolution - Failure to explain electron-electron repulsion [1 Mark for any two] Let the percentage abundance of Sr-86 be q: 47.04 + 86q + 609 + 7267.04 = 7923.08 + 86q = 8762 86q = 8762   7923.08 = 838.92 q = 838.92/86 = 9.75 (3 s.f.) [3 Marks] **1(ai).** Electronic configuration of O is 1s  2s  2px  2py  2pz  Quantum numbers table: | N | l(n-1) | m( l) | s | |---|--------|-------|---| | 1 | 0 | 0 | +  | | 1 | 0 | 0 | -  | | 2 | 0 | 0 | +  | | 2 | 0 | 0 | -  | | 2 | 1 | +1 | +  | | 2 | 1 | +1 | -  | | 2 | 1 | 0 | +  | | 2 | 1 | -1 | +  | [3 Marks] **(ii).** Distinguish between determinate and indeterminate errors. Determinate errors are errors due to the fault in the measuring device during experiment while indeterminate errors are errors caused by the sudden change in experimental conditions and tiredness of the operators. [1 Mark] **(b).** Calculate the relative atomic mass of Nickel given: -   Ni = 69%,   Ni = 27%,   Ni = 4% Relative atomic mass of Ni = 58   (69/100) + 60   (27/100) + 62   (4/100) = 58   0.69 + 60   0.27 + 62   0.04 = 40.02 + 16.2 + 2.48 = **58.7** [2 Marks] **(ci).** Write the equation for reaction of Na O  with water: Na O (aq) + H O(l)   2NaOH(aq) +  O (g) [1 Mark] **(cii).** Molar mass of Na O  = 2   23 + 2   16 = 46 + 32 = 78 gmol   Number of mole of Na O  = 45/78 = 0.5769 mol From stoichiometry: 1 mole Na O  produces 2 moles NaOH   0.5769 mol   0.5769   2/1 = 1.1538 mol NaOH Amount of caustic soda = **1.1538 moles** [1 Mark] **(ciii).** Number of mole from 10 g of Na O  = 10/78 = 0.1282 mol 1 mole Na O  gives 0.5 mole O  0.1282 mol   0.1282   0.5 = 0.0641 mol Volume of O  liberated = 0.0641   22400 = **1435.84 cm ** [2 Marks] **2(ai).** Mass of dust, m = 2.30   10   g = 2.30   10   kg Speed, c = 20 km/hr = 20   1000/3600 = 5.56 m/s From de Broglie wavelength equation:   = h/mc = (6.626   10   )/(2.30   10     5.56) = 6.626   10    / 1.2788   10   = **5.18   10    m** [3 Marks] **(ii).** State Aufbau's Principle: In using many electrons orbital energy level diagram, electrons enter the available orbitals starting with the lowest energy orbital. [1 Mark] State Pauli Exclusion Principle: No two electrons in an atom or molecule can have the same possible sets of four quantum numbers. That is, at least one of the principal, subsidiary, magnetic and spin quantum numbers must distinguish two electrons in an atom. [1 Mark] **(bi).** Types of reactions: (i) Displacement reaction (ii) Precipitation reaction (iii) Decomposition reaction (iv) Disproportionation reaction [2 Marks] **(ci).** State Heisenberg Uncertainty Principle: It is impossible to know simultaneously both the position and momentum of an electron in an atom. [1] **(cii).** Dalton's Atomic Theory and Modifications: I. Dalton postulated that matters are made up of very small indivisible particles called atoms. *Modification:* Matters are made up of very small particles some of which are positively charged, some are negatively charged while some are electrically neutral. II. Dalton postulated that atoms of the same element are identical both in mass and chemical behaviours. *Modification:* Atoms of the same element may differ in mass (isotopes) but with the same chemical behaviours. E.g.   Cl and   Cl. III. Dalton postulated that atoms of different elements differ both in mass and chemical behaviours. *Modification:* Atoms of different elements may have the same mass (isobars) but different chemical behaviours. [2 Marks for any 2] **3(ai).** Le Chatelier's Principle: When a system is at equilibrium and there is a change in one of the factors that keep the system at equilibrium, the equilibrium position will shift in the direction that will nullify the effect of the change. [1 Mark] **Gas Law Calculation:** T  = 5 C + 273 = 278 K, P  = 754   9 = 745 mmHg, V  = 40 cm  T  = 0 C + 273 = 273 K, P  = 760 mmHg, V  = ? Using: P V /T  = P V /T  V  = (745   40   273)/(760   278) = 8,135,400/211,280   **38.51   39 cm ** [2 Marks] **Graham's Law / Diffusion:** (b) Molar mass of nitrogen, M  = 2   14 = 28 gmol   Rate of diffusion of nitrogen, R  = 320/40 = 8 cm s   Molar mass of X = 2   28 = 56 gmol   From Graham's law: R /R  =  (M /M ) R  = R     (M /M ) = 8    (28/56) = 8    (1/2) = 8   0.71 = **5.68 cm s  ** Time of diffusion of X, t  = 480/5.68 = 84.51   **84.5 seconds** R  = V /t ; 5.68 = 480/t  [2 Marks] **(ci).** Isotopy is a phenomenon whereby two or more atoms of the same elements have the same atomic number but different mass numbers. [1 Mark] **(cii).** Let the % abundance of Cl-35 be x: % abundance of Cl-37 = 100   x Relative atomic mass of Cl-35 = 35   x/100 Relative atomic mass of Cl-37 = 37   (100 x)/100 35x/100 + (3700 37x)/100 = 35.5 35x + 3700   37x = 3550  0.02x =  0.15 x =  0.15/ 0.02 = **75%** % abundance of Cl-35 = 75% % abundance of Cl-37 = 100   75 = **25%** [  Mark] **4(ai).** Faraday's first law: The mass of a material deposited or evolved at an electrode during electrolysis is directly proportional to the quantity of electricity that passed through the electrolyte. [1 Mark] **(ii).** Current, I = 5 A; Time, t = 1   60 = 3600 s; Mass, m = 2 g Quantity of electricity, Q = It = 5   3600 = 18,000 C From Faraday's first law: Z = m/Q = 2/18000 = **1.111   10   gC  ** [  Mark] **(bi).** Weight of solvent, w  = 0.350 g; Weight of substance, w  = 40 g [1  Marks] Boiling point elevation:  T  = 0.357 C; K  = 5.02 C/kg Using expression:  T  = K    M    M  = (K    w    M )/(K    w    1000) M  = (0.357   40)/(5.02   0.35   1000) = 1757/14.28   **123 gmol  ** [2 Marks]  E = Q   W (Change in internal energy; Q = Heat gained; W = Heat done on system) An adiabatic process: no heat change between system and surroundings.  Q = 0. Temperature, pressure, volume, internal energy, enthalpy and entropy. Isolated system:  Q = 0. [  Mark] **Raoult's Law Calculation (D041; Q3ai):** Raoult's law states that in an ideal solution, the equilibrium vapour pressure of a solution (P ) is equal to the product of the vapour pressure of the pure solvent (P  ) and its mole fraction (X ) in the solution: P  = X    P   Multiply equation (2) by 2: H (g) +  O (g)   H O(g) ... (1) CH (g) + O (g)   CO (g) + 2H O(g) ... (2) Rearrange equation (3): CO (g) + 2H O(g) + 2O (g)   CH (g) Addition of equations (1), (4) and (5): C(s) + O (g)   CO (g);  H =  392 kJmol   H (g) +  O (g)   H O(g);  H =  283 kJmol   CH (g) + 2O (g)   CO (g) + 2H O(g);  H =  1891 kJmol   Overall: C(s) + 2H (g)   CH (g);  H = **+1891 kJmol  ** [1  Marks]  H =  566 kJmol   [1 Mark] Total = 10 Marks **5(ai).** Chadwick discovered neutron. [1 Mark] **(ii).** Lithium has the smallest atomic and ionic radii and shares some resemblance with magnesium in Group 2 of the periodic table via diagonal relationship. Both elements have similar size. [1 Mark] He formulated the modern atomic theory experimentally. **(bi).** The carbonates, nitrates and hydroxides of Li and Mg decompose on heating to the oxides (Li O and MgO) of the elements. [1 Mark] **(bii).** The oxides and hydroxides of Li and Mg are not deliquescent. [1 Mark] The chlorides of both elements are soluble in ethanol and are deliquescent. Both Li and Mg form normal oxides only. - It produces oxy-acetylene flame when mixed with acetylene for cutting and welding of metals. - It is used in steel making via basic oxygen furnace process. Treatment of wastewater: 2H O (aq) + MnO (catalyst)   2H O(l) + O (g) **Carbon-based nanomaterials:** I. They are nanomaterials that are composed of carbon in the form of hollow spheres, ellipsoids or tubes. Examples include nanogold, nanosilver, quantum fullerene and graphenes. [1 Mark for any 2] II. Metal based nanomaterials: include TiO . A quantum dot is a closely packed semiconductor crystal comprised of thousands of atoms. III. Dendrimers: are repetitively branched molecules or nanosized order of a few nanometer. The surface of a dendrimer has numerous polymers built from branched unit with specific chemical functions. IV. Composites: are nanomaterials formed by the combination of poly(amidoamine), poly(imine) and polyether-copolyester chains. Examples include starch, cellulose, collagen, gelatin, fibrin, chitosan, poly(vinyl alcohol) and poly(ethylene glycol). [2 Marks] **6(ai).** Global warming is the increase in the earth's surface temperature due to human activities such as burning of fossils. [  Mark] Photodissociation of O : O  + h    2O [  Mark] Formation of ozone layer: O + O  + M   O  + M [1 Mark] **(bi).** Hydrogen is a safe fuel for electricity generation because its combustion produces heat and water with zero greenhouse gas emissions. [1 Mark] **(bii).** (i) Argon is used in arc welding because it is non-reactive (inert) in nature. (ii) Because iodine sublimes (undergoes sublimation) when heated, changing directly from solid to gas and deposited as pure iodine when cooled. (iii)    X = 1s  2s  2p  [1] (iv)     Cu: [Ar] 3d   4s  [1] Fe(OH)(NH ) Cl ; [Fe(CN) (NH ) ]  [1] **(ai).** X = CO ; Y = CaCO ; Z = Ca(HCO )  CO  + Ca(OH) (aq)   CaCO  + H O(l) [1  Marks] **(bi).** - Ozone layer filters out harmful UV rays from the sun. - Ozone layer acts as a shield preventing meteors from hitting the earth surface. - Ozone layer allows cloud to be formed as part of water cycle. - It is a poor conductor of heat and electricity. - Ozone has a bright yellow colour; it is insoluble in water but soluble in CS . - SiO  is a Lewis acid and reacts with bases to form salts and water. SiO (s) + 2NaOH(aq)   Na SiO (aq) + H O(l) [1  Marks] **(ci).** - Sulphur: SiO  is a Lewis acid and reacts with bases. [1 Mark] **(di).** (a). Hydrogen is a reducing agent because it causes many substances to undergo reduction by donating electrons. It is highly flammable. [1 Mark] H (g) + 2Cl(g)   2HCl(g) [  Mark] **(ii).** Fe  : Electronic configuration is 1s  2s  2p  3s  3p  3d  There are **four unpaired electrons** in the 3d  subshell. [1  Marks] **Rate law calculation:** Using experiment 1 to obtain k: k = rate/([NO] [H ] ) 2.4   10   = k[0.0250]    [0.010]  ... (i) Divide experiment 1 by experiment 3: 2.4   10  /0.6   10   = k[0.0250]    [0.010]  / k[0.0125]    [0.010]  4 = 2 ; x = 2 (2nd order in NO) The reaction is 2nd order overall in [NO] Divide experiment 1 by experiment 2: 2.4   10  /2.4   10   = [0.025]    [0.010]  / [0.025]    [0.010]  ... y = 0 The empirical rate law is: rate = k[NO]  k = rate/[NO]  = 0.000625/0.0250 = 40 Lmol  s   [1 Mark] **Ecell Calculation:** Ecell =  (0.0591/n) log([H ] ) But E H = E ; Then Ecell = E cell = 0 Ecell =  0.0591 log(PH /[H ] ) =  0.0591 log([H ] ) =  0.0591   2log[H ] = +0.0591   pH But, pH =  log[H ]; Therefore: Ecell = 0.0591   10 = **+0.591 V** Hence, oxidation potential of hydrogen electrode = +0.591 V [2 Marks] Total = 10 Marks **5(ai).** Cobalt, iron and nickel. **(ii).** Carbon is the only member of the group that: - Is a non-metal - Catenates readily - Forms stable p    p  multiple covalent bonds with smaller sizes and higher electronegativities (as in C=O, C=S and C N) - Is the only member whose oxides (CO and CO ) are gases at ordinary temperature - It is the only member of the group without empty d-orbitals [1  Marks for any three] **(b).** Formulae of compounds formed: HW, XH, YH  and HZ [4 Mks] **(ci).** Generally, ionization energy of group 14 elements decreases down the group. Meanwhile, the 1st ionization energy of Pb is slightly higher than that of Sn due to lanthanide contraction resulting to an increase in nuclear attraction to an increase in nuclear attraction of electrons. [1  Mks] **(cii).** Hydrogen is prepared when steam combines: C(s) + H O(g)   CO(g) + H (g) The product is called synthesis gas (syn-gas) which is a mixture of CO and H  gases in the ratio 1:1 by volume. [1  Marks] Total = 10 Marks Here is the full transcription of pages 21 40, organized by page number and topic: **Q7(ai).** Draw the structure of 2-hydroxybutanonitrile. \\`\\`\\` OH | H   C   C   N | CH  | CH  \\`\\`\\` 2-Hydroxybutanonitrile + NH   (Addition reaction) [1 Mark] **Q7(aii).** Write the product of the addition reaction shown. **Q7(aiii).** Draw the structural formula of the product. \\`\\`\\` H H H OH | | | | H C C C C COOH | | | | H H H OH \\`\\`\\` [  Mark] **Q(ii). Hydrogen   position in periodic table:** - (ii). NaO. - Hydrogen is placed in Group I of the periodic table because it is an s-block element with one electron in its only shell and can ionize by losing electron to form mono-positive cation, H . [  Mark] - Hydrogen is placed in Group VII of the periodic table because it exists as a diatomic molecule, forms covalent bonds and can accept an electron to form a mono-negative anion, H . [  Mark] - (d). Hydrogen with one electron in its only shell and can ionize by losing electron to form mono-positive cation, H . [  Mark] **Total = 10 Marks** **(b). Fractional distillation of petroleum table:** | Fraction | Temp. of Separation ( C) | No. of C | Use | |---|---|---|---| | Petroleum gas | Under 30 | 2 4 | Rocket fuel | | Gasoline | 30 180 | 4 9 | Motor fuel | | Kerosene | 160 230 | 8 16 | Heat, jet fuel | | Diesel | 200 320 | 12 20 | Motor fuel | | Heavy fuel oil | 300 450 | 16 30 | Heating lubricant, Electrical insulation, candle making | | Petroleum jelly/paraffin wax | >300 | >25 |   | | Asphalt/Residue | >300 Vacuum | >30 | In construction | [3 Marks] **(cii). Reactions of benzene:** Reaction 1 (Nitration): \\`\\`\\` Benzene + HNO /H    Nitrobenzene (NO  attached to ring) \\`\\`\\` Reaction 2 (Bromination): \\`\\`\\` Benzene + Br /FeBr    Bromobenzene (Br attached to ring) \\`\\`\\` [3 Marks] **Q(di). Structures of D-Glucose and D-Fructose:** D-Glucose: \\`\\`\\` CHO | H C OH | HO C H | H C OH | H C OH | CH OH \\`\\`\\` D-Fructose: \\`\\`\\` CH OH | C=O | HO C H | H C OH | H C OH | CH OH \\`\\`\\` **(dii). Fehling's solution** is reduced by D-Glucose and not by D-Fructose because D-Glucose is a reducing sugar with free anomeric/aldehydic carbon while D-Fructose does not reduce because it contains a ketonic group. [1 Mark] **Total = 10 Marks** **Q8(ai). Reaction of CH CH CH=CH  + HBr   H O:** \\`\\`\\` CH CH CH=CH  + HBr   H C C C C Br H H H H H H H H 1-Bromobutane \\`\\`\\` [2 Marks] **(ii). Table   Inductive Effect vs Mesomeric Effect:** | Inductive Effect | Mesomeric Effect | |---|---| | It occurs in single covalent bond ( ) | It occurs in multiple covalent bond ( ) | | No formation of ions | Ion formation occurs | | It involves partial charge separation | It involves full charge separation | **(b). Bond fission:** - X Y undergoes homolytic fission in the presence of UV-light/heat to produce free radicals: X Y + UV-Light   X  + Y  - X Y undergoes heterolytic fission in polar/aqueous medium to produce an electrophile and a nucleophile: X Y   X  + Y  - (c). Making of dinnerware; making of electrical switchboxes; making of trays, cutlery, handles, brushes and baby dishes; making of funnels, radio and television cables. [1  Marks for any three] [1 Mark for any two] **(di). Free radicals and ions:** - (ii). Cl ; Br ; CH  ; H ; I  - (iii). Cl ; Br ; CH  ; H ; I  **Total = 10 Marks** **Q1(ai).** - N   is larger than F . Though both are isoelectronic ions with 10 electrons, but N   which was formed after gaining 3 electrons that resulted to smaller attraction by the nucleus is larger. [1 Mark] - (ii). Fe   is larger than Fe   since Fe   has more electrons (24) resulting to greater electron-electron repulsion as compared to Fe   (23) despite having the same nuclear charge. [1 Mark] **(bi). Sources of laboratory errors:** - Careful calibration of instruments; maintaining constant temperature and humidity in the laboratory; running of a blank determination; isotopic dilution, use of independent method of analysis etc. [1 Mark] **(bii). Balancing Cr O      Cr  :** Step 1: Cr O      2Cr   Step 2 (Balance O): Cr O      2Cr   + 7H O Step 3 (Balance H): Cr O    + 14H    2Cr   + 7H O Step 4 (Balance charge): Cr O    + 14H  + 6e    2Cr   + 7H O Salts: NaCl; MgCl ; Al S ; AlCl ; MgS; Na S; NaCl; MgCl . (ii). NaCl or MgS (iii). Na, Mg, Al, S, Cl [2 Marks] [1 Mark] [  Mark] [  Mark] **Percentage abundance of Sr-86:** 84 q + 86 0.56 + 88 q = 87.62 Let the percentage abundance of Sr-86 be q: 47.04 + 86q + 609 + 7267.04 = 7923.08 + 86q = 8762 86q = 8762   7923.08 = 838.92 q = 838.92/86 = 9.75 (3 s.f.) [3 Marks] **Total = 10 Marks** **Q2(a). Empirical formula calculation:** | | C | P | O | |---|---|---|---| | % Composition | 56.3 | 43.7 |   | | Number of mole (mol) | 56.3/12 = 4.692 | 43.7/31 = 1.4097 |   | | Mole ratio | 56.3/31 = 1.8161 | 43.7/16 = 2.73125 |   | **Empirical formula calculation continued:** Mole ratio  2: - [P O ]n = 2 110; 220/110 = 2; n = 110 - (62+48)n = 220; 110n = 220; n = 2 - Molecular formula of X = P O  **Compound Y calculation:** | Element | P | O | |---|---|---| | % Composition | 43.6 | 56.4 | | Number of mole (mol) | 43.6/31 = 1.4064 | 56.4/16 = 3.525 | | Mole ratio | 1.4064/1.4064 = 1 | 3.525/1.4064 = 2.5 | Mole ratio  2: [P O ]n (2 31 + 5 16)n = 284; 142n = 284; n = 2 Molecular formula of X = P O   [2 Marks] **(bi). Bohr's model limitations:** - Electrons revolve round the nucleus of an atom in a circular orbit - When an electron is in a particular energy level, it does not lose or gain energy but when changing state, energy is lost or gained. - Electrons in an atom exist in one of several allowed stationary states, each with a fixed energy. - The state of allowed motion are those for which angular momentum are quantized into a multiple of h/2 . [1 Mark for any two] **(ii). Limitations of Bohr's model:** - Failure to explain splitting of some line spectra under the influence of magnetic field   Zeeman effect. - Failure to explain splitting of some line spectra under the influence of electric field   Stark effect. - The model only explains quantization of electrons and could not explain arrangement of electrons in an atom. - The model was not accurate for complex and many-electron atoms. - Failure to explain some line doublets and fine structure observed under high resolution. - Failure to explain electron-electron repulsion. [1 Mark for any two] **Q3(ai). Postulates of Kinetic Theory of gases:** - Every gas consists of identical molecules which are considered as non-interacting point masses. - Gases are made up of very small, discrete, tiny or hard sphere particles called molecules in constant random motion. - The shape and volume of gas molecules are negligible or infinitesimally small relative to the shape and volume of container. - Gas molecules travel in straight line with varying speeds. - There is no effect of gravity on the motion of gas molecules. - Temperature is a measure of average kinetic energy of gas molecules and all gases at the same temperature have the same average kinetic energy. - Gas molecules collide with one another and with the walls of container and gases collide, momentum because there is force of attraction between gas molecules when they collide. - The collision between them is perfectly elastic. [2 Marks for any 4] **(iii). Rydberg equation   n  = 2; n  = ?;   = 24372.796 cm  ; Rb = 109677.581 cm  :**   = R (1/n     1/n  ) 24372.796 = 109677.581   (1/4   1/n  ) 1/4   1/n   = 24372.796/109677.581 = 0.2222 1/n   = 0.25   0.2222 = 0.0278 n   = 1/0.0278 = 35.9712 n  =  35.9712 = 5.998   6 [2 Marks] **(c). First ionization energy decreases down the group** of the periodic table because, the energy level (principal quantum number) of the orbital holding the outermost electron becomes larger as we go down the group. Although the number of protons in the nucleus also becomes larger, the electrons in smaller shells and sub-shells tend to screen the outermost electron for some of the forces of attraction of the nucleus (Screening effect). Furthermore, more shells are added and the electron being removed when the first ionization energy is measured is less of its time near the nucleus of the atom, and it therefore takes less energy to remove this electron from the atom. [2 Marks] **Using the combined gas equation:** P V /T  = P V /T  V  = (745 40 273)/(760 273) = (8135400)/(211280) = 38.51   39 cm  [2 Marks] **(b). Molar mass of nitrogen:** M_A = 2 14 = 28 gmol   Rate of diffusion of nitrogen, R_A = 320/40 = 8 cm s   Molar mass of X = 2 28 = 56 gmol   From Graham's law of diffusion: R_B = R_A    (M_A/M_B) = 8    (28/56) = 8   0.71 = 5.68 cm s   R_X = V_X/t_X 5.68 = 480/t_X   t_X = 480/5.68 = 84.51   84.5 seconds [2 Marks] **(ci). Isotopy** is a phenomenon whereby two or more atoms of the same elements have the same atomic number but different mass numbers. [1 Mark] **(ii). % abundance of Cl-35:** Let % abundance of Cl-35 = x 35x/100 + 37(100 x)/100 = 35.5 35x + 3700 37x = 3500  0.02x =  0.15 x =  0.15/ 0.02 = 75% Hence % abundance of Cl-35 = 75%; Cl-37 = 25% [1 Mark] **Relative atomic mass of Cl-35:** = 35   0.35x/100 = 35.5; 37 0.02x = 35.5 Therefore: 37 0.37x+0.35x = 35.5   x = 75% **",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0002",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Identify the correct trend of decrease in electronegativity on the periodic table. Left to right, bottom to top",
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0003",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"If the mass of electron is 9.11 10    kg, what is the de Broglie wavelength of an electron traveling at two-thirds the speed of light? (c = 3.0 10  ms  ; h = 6.626 10    Js).",
      options:[
            {label:"A", text:"3.75 pm"},
          {label:"B", text:"36.4 pm"},
          {label:"C", text:"3.64 pm"},
          {label:"D", text:"1.62 pm"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0004",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"If a bottle of concentrated HCl solution has label reading 37.8% HCl by mass. Calculate the molarity of this solution if the density of HCl is 1.1917 gcm  :",
      options:[
            {label:"A", text:"11.3 M"},
          {label:"B", text:"14.5 M"},
          {label:"C", text:"12.0 M"},
          {label:"D", text:"12.3 M"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0005",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"The maximum number of electrons that can be accommodated in a sub-level for which l = 3 is:",
      options:[
            {label:"B", text:"14"},
          {label:"C", text:"10"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0006",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"The atom's nucleus is made up of:",
      options:[
            {label:"A", text:"proton and radical"},
          {label:"B", text:"electron and ion"},
          {label:"C", text:"proton and ion"},
          {label:"D", text:"neutron and proton"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0007",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following statements is correct about the radii of atoms and their ions? Cations are larger and anions are smaller than their atoms.",
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0008",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"A covalent bond is formed when: a metal and non-metal share electrons.",
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0009",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"The net ionic equation is an equation that shows: electrons are transferred between non-metals.",
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0010",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following has only one possible oxidation state? O **B.** Br **C.** N **D.** F",
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0011",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Calculate the volume occupied by 1.73 moles of N  gas at 0.992 atm pressure and temperature of 75 C:",
      options:[
            {label:"A", text:"10.7 dm "},
          {label:"B", text:"33.8 dm "},
          {label:"C", text:"49.8 dm "},
          {label:"D", text:"52.2 dm "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0012",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"What does X represent in the following reaction?      U +   n       Kr +      Ba + X",
      options:[
            {label:"A", text:"X =   n"},
          {label:"B", text:"X =   n"},
          {label:"C", text:"X =    "},
          {label:"D", text:"X =    n"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0013",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"What is the equilibrium constant for the cell formed at 25 C by the two electrodes? A   + 2e    A; E  = +0.050 v B  + e    B; E  = +0.011 v",
      options:[
            {label:"A", text:"X = 40"},
          {label:"B", text:"35"},
          {label:"C", text:"21"},
          {label:"D", text:"14"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0014",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"What will be the standard enthalpy change for the Haber process, if the standard enthalpy of formation of ammonia gas is  11 kcal/mol?",
      options:[
            {label:"A", text:"22 kcal/mol"},
          {label:"B", text:" 22 kcal/mol"},
          {label:"C", text:"20 kcal/mol"},
          {label:"D", text:" 20kcal/mol"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0015",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Determine the order of reaction if the rate of chemical reaction is expressed as: rate = k[x] [y] :",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0016",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following statements is NOT true? The conjugate base of a weak acid is:",
      options:[
            {label:"A", text:"a weak acid is a strong base"},
          {label:"B", text:"an acid is formed from a base"},
          {label:"C", text:"an acid is formed from a proton loss"},
          {label:"D", text:"a weak acid is a salt"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0017",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"The equilibrium constant Kc for a reaction is 55.78 at 291 K. Which of the following statements is correct, when more reactants are added to the reaction? reaction rate will increase",
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0018",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Why does nitrogen form a stable trihalides but not pentahalides? Lone pair of electrons on nitrogen is +3.",
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0019",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Why is CO  a gas whereas SiO  is a solid? Graphite allotrope of carbon is involved in the formation of CO .",
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0020",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following sets of statements are correct about paramagnetism in transition metals? I, III and V",
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0021",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following chlorides will have the highest melting point?",
      options:[
            {label:"A", text:"AlCl "},
          {label:"B", text:"MgCl "},
          {label:"C", text:"NaCl"},
          {label:"D", text:"SiCl "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0022",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"What is the magnetic moment of a certain transition metal ion in four unpaired electrons?",
      options:[
            {label:"A", text:"3.8 BM"},
          {label:"B", text:"4.0 BM"},
          {label:"C", text:"4.9 BM"},
          {label:"D", text:"3.7 BM"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0023",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following elements will violently react with cold water to give hydrogen gas?",
      options:[
            {label:"A", text:"Na"},
          {label:"B", text:"Mg"},
          {label:"C", text:"Al"},
          {label:"D", text:"Ca"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0024",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"The unexpectedly high boiling point of HF is due to:",
      options:[
            {label:"A", text:"dipole-dipole forces"},
          {label:"B", text:"covalent bond"},
          {label:"C", text:"hydrogen bond"},
          {label:"D", text:"Van der Waal's forces."}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0025",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"The oxidation number of Cu in Cu(H O) Cl  is:",
      options:[
            {label:"A", text:"+2"},
          {label:"B", text:"+3"},
          {label:"C", text:"+4"},
          {label:"D", text:" 1"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0026",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"How many optical isomers would 2,3-dibromobutanoic acid have?",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0027",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Organic compound contains carbon and one or more elements: (i). hydrogen (ii). oxygen (iii). nitrogen (iv). sulphur (v). chlorine **(vi). bromine (vii). iodine.** Which of these elements are detectable by test?",
      options:[
            {label:"A", text:"(i) & (ii) only"},
          {label:"C", text:"(ii) & (vii) & (vii)"},
          {label:"B", text:"(iii),(iv),(v),(vi) & (vii)"},
          {label:"D", text:"(v),(vi),(vii) only"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0028",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Determine x, y and z respectively in the following equation: C H O + xO    yCO  + zH O",
      options:[
            {label:"A", text:"5/2, 2, 2"},
          {label:"B", text:"5/2, 1, 1"},
          {label:"C", text:"5/2, 2, 2"},
          {label:"D", text:"5, 4, 4"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0029",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"How many isomeric form(s) is/are there for the molecular formula C H Br ?",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0030",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following is a constituent of petrol?",
      options:[
            {label:"A", text:"Heptane"},
          {label:"B", text:"Isopropane"},
          {label:"C", text:"Propane"},
          {label:"D", text:"Ethane"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0031",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following pairs of compounds are geometrical isomers? (Structures shown in image   two pairs of alkene structural drawings) (the pair with cis-trans possible geometry)",
      correctAnswer:"B",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0032",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Recrystallization is an analytical technique that is based on the difference in:",
      options:[
            {label:"A", text:"solubility"},
          {label:"B", text:"melting points"},
          {label:"C", text:"boiling points"},
          {label:"D", text:"acidity"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0033",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Arrange the following acids in descending order of acidity: CF COOH, CH COOH, FCH COOH, F CHCOOH CF COOH > CH COOH > F CHCOOH > FCH COOH > FCHCOOH",
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0034",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following compounds can be hydrolysed to give one simple sugar?",
      options:[
            {label:"A", text:"Maltose"},
          {label:"B", text:"Sucrose"},
          {label:"C", text:"Glucose"},
          {label:"D", text:"Lactose"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0035",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"The substance with a bond angle of 107  is:",
      options:[
            {label:"A", text:"H O"},
          {label:"B", text:"CH "},
          {label:"C", text:"H O"},
          {label:"D", text:"NH "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0036",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"The excitation of an electron from its initial energy state to infinite energy state is:",
      options:[
            {label:"A", text:"Bohr radius"},
          {label:"B", text:"electron affinity"},
          {label:"C", text:"ionization"},
          {label:"D", text:"absorption energy"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0037",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"In which of the following groups are the three species isoelectronics?",
      options:[
            {label:"A", text:"Sulphide ion, potassium ion, sodium ion"},
          {label:"B", text:"Scandium ion, titanium ion, sodium ion"},
          {label:"C", text:"Oxide ion, sulphide ion, chloride ion"},
          {label:"D", text:"Magnesium ion, calcium ion, strontium ion"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0038",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"What is the precipitate formed on heating aqueous solutions of calcium chloride and sodium fluoride?",
      options:[
            {label:"A", text:"Sodium chloride"},
          {label:"C", text:"No precipitate"},
          {label:"B", text:"Calcium fluoride"},
          {label:"D", text:"Sodium chloro-fluoride complex"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0039",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Two students obtained the following results in a certain experiment: Chidi: 4.38, 4.37, 4.36; Bola: 3.98, 3.98, 3.39 If the actual value for the experiment is 4.37, which of the following is correct? Chidi is accurate and precise",
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0040",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following is NOT responsible for making chemical reactions to proceed faster at higher temperatures? Increase in the number of reacting molecules.",
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0041",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"A thermodynamic system in which its temperature remains constant is called: isothermal",
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0042",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"The boiling point of a solution containing 40 g of an unknown substance dissolved in 100 g of water is 105.3 ",
      options:[
            {label:"A", text:"10.5"},
          {label:"B", text:"38.6"},
          {label:"C", text:"66.0"},
          {label:"D", text:"98.0"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-q0043",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"The amount of a fissionable substance that can remain a chain reaction with a constant rate is referred to as: critical mass",
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0044",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"The F  molecule has the shortest length and the least bond energy due to the: inter-nuclear repulsion of the lone pair of electrons on the fluorine",
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0045",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"What is the formula of the hydroxide that can be used in medicine to treat stomach acidity? Mg(OH) ",
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0046",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following ions will give a white coloured salt? Zn  ",
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0047",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"Which of the following gases will turn a red litmus paper blue? NH ",
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0048",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"N  = 100; N  = 12.5; ln(N /N ) =  t;   = 0.693/t /  = 0.693/24 = 0.028875 hr  ; ln(100/12.5) = 0.028875   t; t = 2.0794/0.028875 = 72 hrs = 3 days **(C)** **18. C 19. A 20. B 21. A 22. B 23. D 24. D 25. B 26. A 27. B** **28. C 29. A 30. C 31. B 32. C 33. A 34.** ram = 6/11   80 + 5/11   100 = 43.6363 + 45.4545 = 89.1 **(C)** **35. A 36. B 37. B 38. D 39. C 40. D 41. B 42. B 43. B 44. A 45. D 46. A 47. C 48. A 49. C 50. C** --- **1(ai).** 1s  2s  2p  3s  3p  4s  3d   4p  **(ii).** 1s  2s  2  2p  3s  3p  4s  3d  **(bi).** (ii). 4s **[  Mark]** **(iii).** 3d **[  Mark]** **(iv).** 3s **[  Mark]** **(c).** Mass of C in CO  = 12/44   62.85 = 17.14 g | Element | Mass (g) | Number of moles (mol) | Mole ration | |---|---|---|---| | C | 17.14 | 17.14/12 = 1.4283 | 1.4283/1.4283 = 1 | | H | 2.84 | 2.84/1 = 2.84 | 2.84/1.4283 = 2 | **[  Mark]** Empirical formula = Molecular mass But, [Empirical formula]n = Molecular mass [CH ]n = 252; 14n = 252; n = 252/14 = **18** Molecular formula of the compound is CH . **[  Mark]** --- **(d).** | Measurement (x ) | /x    x / | /x    x /  | |---|---|---| | 10.325 | 0.005 | 0.000025 | | 10.320 | 0.000 | 0.000000 | | 10.315 | 0.005 | 0.000025 | | 10.313 | 0.007 | 0.000049 | | 10.327 | 0.007 | 0.000049 | | Summation | 0.024 | 0.000148 | Average deviation =  /x    x //N = 0.024/5 **[ ] = 0.0048 [1 Mark]** **Total = 10 Marks** --- **2(ai).** Ionization of atom is the process by which an atom gains or loses electrons to become an electrically charged ion. **[1 Mark]** **(ii).**   = 1460 nm = 1460   10   m = 1460   10   cm. From the expression: 1/  = R    (1/n     1/n  ); 1/1460   10   = 109678   (1/n     1/  ) 1/n   = 6849/109678 = 0.064; n   = 1/0.064 = 15.625; n  =  16 = 4 **[1 Mark]** The initial state of the electron is 4. **[1 Mark]** **(bi).** The shape of phosphine is trigonal pyramidal. **[1 Mark]** The bond angles in phosphine is 93.5 . **[1 Mark]** **(ii).** Covalent and dative bonds **[1 Mark]** **(c).** When a sample is introduced into the mass spectrometer through sample inlet, it is ionized in the ionization chamber to produce charged particles. The ions are then accelerated by the electric field followed by their separation based on their mass-to-charge ratios (m/z). The detector then detects the various separated ions and produce a mass spectrum of ion abundance against m/z and the sample components are identified. **[1 Mark]** **(d).** Displacement reaction is a reaction whereby an atom or group of atoms displaces another in a molecule. An example is the reaction between elemental sodium and dilute HCl. Na(s) + HCl(aq)   NaCl(aq) +  H (g) **[1 Mark]** **Total = 10 Marks** --- **3(ai).** State Hess's law **(ii). Rearrange equation (1):** H O(l)   H (g) +  O (g)  H = +285.8 kJ (5) **[  Mark]** Multiply equation (3) by 2: 2N (g) + 3O (g)   H (g) + H O(g)  H =  348.2 kJ (5) **[  Mark]** Add equations (4) and (5): 2N (g) + 3O (g)   N O (g)  H =  271.6 kJ (6) **[  Mark]** Add equations (6) and (7): 2N (g) + 5O (g)   2N O (g) Rearrange equation (1); H O(l)   H (g) +  O (g) Add equations (6) and (7): 2N (g) + 5/2 O (g)   N O (g)  H = +285.8 kJ (7) **[  Mark]** Add equations (6) and (7):  H = +14.2 kJ **[1 Mark]** **(b).** Anodic equation: 2Cr(s) + 6e    2Cr  (aq) + 6e    3Fe(s) Cathodic equation: 3Fe  (s) + 6e  + 2Cl(s) + 2Cl(s)   3Fe(s) + 2Cr  (s) Overall equation: 3Fe   + 6e     0.44 + 0.74 = +0.34   0.74 =  0.44 + 0.74 E_Cr  /Cr =  0.74V **[  Mark]** E_Fe  /Fe =  0.44V **[  Mark]** E _cell = E _reduced   E _oxidized =  0.44   ( 0.74) = 0.34   0.009855   4 = 0.34   0.039 Temp. T = 25  C + 273 = 298 K; Using Nernst equation: E_cell = E _cell   2.303RT/nF log [oxidized]/[Reduced] E_cell = 0.34   2.303   8.314   298/6   96500 log (0.1) /(0.01)  E_cell = 0.34   0.009855 log 10000 = 0.34   0.039 = **0.301 V** **[1 Mark]** **(ci).** Adding more of COCl  will increase the concentration of COCl  in the reaction and thereby shifts the equilibrium position to the right by increasing the rate of forward reaction. More of CO and Cl  will be produced. **[1 Marks]** **(ii).** Adding more of Cl  will increase the concentration of Cl  in the reaction and thereby shifts the equilibrium position to the left by increasing the rate of backward reaction. More of COCl  will be produced. **[1 Marks]** **Total = 10 Marks** --- **4(ai).** Nuclear binding energy is the energy that holds the nucleon particles (protons and neutrons) together in the nucleus of an atom. **[1 Mark]** **(ii).** Half-life, t /  = 15 days; Original mass, N  = 0.35 g; time of reaction, t = 6.5 days; Mass after time t, N  = ? The decay constant,  , is given as:   = 0.693/t /  = 0.693/15 = 0.0462 day   **[  Mark]** From the equation; N  = N e  t = 0.35   e                = 0.35   e        = 0.2499   **0.25 g** **[  Mark]** The amount used in the reaction is 0.35   0.25 = **0.10 g** **[  Mark]** **(bi).** Kc = 1/[O ]  K_c = number of mole/volume = 1/(1.5)  Given that: K_p = Kc[RT]^ n; T = 298 K;  n =  3 R = 0.0821L atm mol  K   respectively. K_p = 0.296   (0.0821   298)   = 0.296   24.4658 = 6.83   10   atm   **[1 Mk]** **(c).** MnO   + C O      MnO  + CO  Oxidation half equation: C O      2CO  + 2e  Reduction half equation: MnO   + 4H  + 3e    MnO  + 2H O Multiply the oxidation half equation by 3 and reduction half equation by 2 and add: 3C O      6CO  + 6e  2MnO   + 8H  + 6e    2MnO  + 4H O Over all equation: 2MnO   + 3C O      2MnO  + 6CO  + 4H O **[2]** **(di).** Mg(OH) (s)   Mg  (aq) + 2OH (aq) K_sp = [Mg  ][OH ]  **[1 Mark]** **(ii).** Let solubility of Mg(OH)  be y. Therefore; K_sp = [Mg  ][OH ]  = y   (2y)  = 4y  y =   (K_sp/4) =   (2.0   10   /4) =   5.0   10    = 1.71   10   moldm   Concentration of Mg(OH)  is **1.71   10   moldm  ** **[2 Marks]** **Total = 10 Marks** --- **5(ai).** Zn, Cd and Hg are not considered transition metals because they have completely filled d-orbitals (d  ) in their atomic and ionic forms while transition metals have partially filled d-orbitals. **[1 Mark]** **(ii).** Zn   salts are white because the ion has completely/fully filled d-orbitals (d  ) which prevents the ion from absorbing UV-visible light. Thus, it does not undergo d-d electronic transition. Cu   salts on the other hand are blue because Cu   has partially d-orbitals (d ) and absorbs visible light that causes the ion to undergo d-d electronic transition. Cu   salts are therefore coloured. **[  Mark]** **(b).** (i).   V   = 1s  2s  2p  3s  3p  4s  3d  **[ ] Paramagnetic [ ]** (ii).   Fe   = 1s  2s  2p  3s  3p  4s  3d  **[ ] Paramagnetic [ ]** (iii).   Ti = 1s  2s  2p  3s  3p  4s  3d  **[ ] Paramagnetic [ ]** (iv).   Cr  = 1s  2s  2p  3s  3p  4s  3d  **[ ] Paramagnetic [ ] [4 Marks]** --- That completes all 20 Chemistry images. Send the next batch and I'll continue building the full **2015 2024** Chemistry and Physics collection! --- --- --- **1(ai).** Explain why N   is larger than F , though both are isoelectronic ions with 10 electrons. N   is larger than F  because N   was formed after gaining 3 electrons by the nucleus, which has smaller attraction of the nucleus for electrons. Although both are isoelectronic (24 electrons   actually 10 electrons), Fe   is larger than Fe   since Fe   has more electrons (24) resulting in greater electron-electron repulsion as compared to Fe   (23) despite having the same nuclear charge. [1 Mark each] --- **1(bi).** State the uses of a blank determination in the laboratory. - Careful calibration of instruments - Maintaining constant temperature and humidity in the laboratory - Running of a blank determination - Isotopic dilution - Independent method of analysis etc. [1 Mark] --- **1(bii).** Balance the following equation: Cr O      Cr   Step 1   Balance Cr atoms (multiply product side by 2): Cr O      2Cr   Step 2   Balance O atoms by adding 7H O to product side: Cr O      2Cr   + 7H O Step 3   Balance H atoms by adding 14H  to reactant side: Cr O    + 14H    2Cr   + 7H O Step 4   Balance charges by adding 6e  to reactant side: Cr O    + 14H  + 6e    2Cr   + 7H O [2 Marks] [  Mark] [  Mark] --- **(ci).** Give examples of ionic compounds: Al S ; AlCl ; MgS; NaCl or MgS [1 Mark] **(cii).** Name elements: Na, Mg, Al, S, Cl [1 Mark] --- **2(a). Compound X** | Element | O | P | |---------|-----|------| | % Composition | 43.7 | 56.3 | | Number of mole (mol) | 43.7/16 = 2.73125 | 56.3/31 = 1.8161 | Mole ratio: 2.73125/1.8161 = 1.5   multiply   2   ratio = 3:2...   1.8161/1.8161 = 1 Therefore mole ratio   2: - P: 1.8161/1.8161   2 = 2 - O: 2.73125/1.8161   2 = 3 (approximately) Empirical formula of X = P O  [P O ]n = (2   31 + 3   16)n = 220; 110n = 220; n = 220/110 = 2 **Molecular formula of X is P O ** [2 Marks] --- **Compound Y** | Element | P | O | |---------|-----|------| | % Composition | 43.6 | 56.4 | | Number of mole (mol) | 43.6/31 = 1.4064 | 56.4/16 = 3.525 | Mole ratio: 1.4064/1.4064 = 1; 3.525/1.4064 = 2.5 Multiply   2: P = 2, O = 5 Empirical formula = P O  [P O ]n = (2   31 + 5   16)n = 284; 142n = 284; n = 284/142 = 2 **Molecular formula of X is P O  ** [2 Marks] --- **(bi).** State TWO postulates of Bohr's model: - Electrons revolve round the nucleus of an atom in a circular orbit - When an electron is in a particular energy level, it does not lose or gain energy but when changing state, energy is lost or gained. - Electrons in an atom exist in one of several allowed stationary states, each with a fixed energy. - The state of allowed motion are those for which angular momentum are quantized into a multiple of h/2 . [1 Mark for any two] **(bii).** State failures of Bohr's model: - Failure to explain splitting of some line spectra under the influence of electric field (Stark effect) - Failure to explain splitting of some line spectra under the influence of magnetic field (Zeeman effect) - The model only explains quantization of electrons and could not explain arrangement of electrons in an atom - The model was not accurate for complex and many-electron atoms - Failure to explain some line doublets and fine structure observed under high resolution - Failure to explain electron-electron repulsion [1 Mark for any two] --- Let the percentage abundance of Sr-86 be q: 47.04 + 86q + 609 + 7267.04 = 7923.08 + 86q = 8762 86q = 8762   7923.08 = 838.92 q = 838.92/86 = 9.75 (3 s.f.) [3 Marks] --- --- **1(ai).** Electronic configuration of O is 1s  2s  2px  2py  2pz  Quantum numbers table: | N | l(n-1) | m( l) | s | |---|--------|-------|---| | 1 | 0 | 0 | +  | | 1 | 0 | 0 | -  | | 2 | 0 | 0 | +  | | 2 | 0 | 0 | -  | | 2 | 1 | +1 | +  | | 2 | 1 | +1 | -  | | 2 | 1 | 0 | +  | | 2 | 1 | -1 | +  | [3 Marks] --- **(ii).** Distinguish between determinate and indeterminate errors. Determinate errors are errors due to the fault in the measuring device during experiment while indeterminate errors are errors caused by the sudden change in experimental conditions and tiredness of the operators. [1 Mark] --- **(b).** Calculate the relative atomic mass of Nickel given: -   Ni = 69%,   Ni = 27%,   Ni = 4% Relative atomic mass of Ni = 58   (69/100) + 60   (27/100) + 62   (4/100) = 58   0.69 + 60   0.27 + 62   0.04 = 40.02 + 16.2 + 2.48 = **58.7** [2 Marks] --- **(ci).** Write the equation for reaction of Na O  with water: Na O (aq) + H O(l)   2NaOH(aq) +  O (g) [1 Mark] **(cii).** Molar mass of Na O  = 2   23 + 2   16 = 46 + 32 = 78 gmol   Number of mole of Na O  = 45/78 = 0.5769 mol From stoichiometry: 1 mole Na O  produces 2 moles NaOH   0.5769 mol   0.5769   2/1 = 1.1538 mol NaOH Amount of caustic soda = **1.1538 moles** [1 Mark] **(ciii).** Number of mole from 10 g of Na O  = 10/78 = 0.1282 mol 1 mole Na O  gives 0.5 mole O  0.1282 mol   0.1282   0.5 = 0.0641 mol Volume of O  liberated = 0.0641   22400 = **1435.84 cm ** [2 Marks] --- --- **2(ai).** Mass of dust, m = 2.30   10   g = 2.30   10   kg Speed, c = 20 km/hr = 20   1000/3600 = 5.56 m/s From de Broglie wavelength equation:   = h/mc = (6.626   10   )/(2.30   10     5.56) = 6.626   10    / 1.2788   10   = **5.18   10    m** [3 Marks] --- **(ii).** State Aufbau's Principle: In using many electrons orbital energy level diagram, electrons enter the available orbitals starting with the lowest energy orbital. [1 Mark] State Pauli Exclusion Principle: No two electrons in an atom or molecule can have the same possible sets of four quantum numbers. That is, at least one of the principal, subsidiary, magnetic and spin quantum numbers must distinguish two electrons in an atom. [1 Mark] --- **(bi).** Types of reactions: (i) Displacement reaction (ii) Precipitation reaction (iii) Decomposition reaction (iv) Disproportionation reaction [2 Marks] --- **(ci).** State Heisenberg Uncertainty Principle: It is impossible to know simultaneously both the position and momentum of an electron in an atom. [1] --- **(cii).** Dalton's Atomic Theory and Modifications: I. Dalton postulated that matters are made up of very small indivisible particles called atoms. *Modification:* Matters are made up of very small particles some of which are positively charged, some are negatively charged while some are electrically neutral. II. Dalton postulated that atoms of the same element are identical both in mass and chemical behaviours. *Modification:* Atoms of the same element may differ in mass (isotopes) but with the same chemical behaviours. E.g.   Cl and   Cl. III. Dalton postulated that atoms of different elements differ both in mass and chemical behaviours. *Modification:* Atoms of different elements may have the same mass (isobars) but different chemical behaviours. [2 Marks for any 2] --- **3(ai).** Le Chatelier's Principle: When a system is at equilibrium and there is a change in one of the factors that keep the system at equilibrium, the equilibrium position will shift in the direction that will nullify the effect of the change. [1 Mark] --- **Gas Law Calculation:** T  = 5 C + 273 = 278 K, P  = 754   9 = 745 mmHg, V  = 40 cm  T  = 0 C + 273 = 273 K, P  = 760 mmHg, V  = ? Using: P V /T  = P V /T  V  = (745   40   273)/(760   278) = 8,135,400/211,280   **38.51   39 cm ** [2 Marks] --- **Graham's Law / Diffusion:** (b) Molar mass of nitrogen, M  = 2   14 = 28 gmol   Rate of diffusion of nitrogen, R  = 320/40 = 8 cm s   Molar mass of X = 2   28 = 56 gmol   From Graham's law: R /R  =  (M /M ) R  = R     (M /M ) = 8    (28/56) = 8    (1/2) = 8   0.71 = **5.68 cm s  ** Time of diffusion of X, t  = 480/5.68 = 84.51   **84.5 seconds** R  = V /t ; 5.68 = 480/t  [2 Marks] --- **(ci).** Isotopy is a phenomenon whereby two or more atoms of the same elements have the same atomic number but different mass numbers. [1 Mark] **(cii).** Let the % abundance of Cl-35 be x: % abundance of Cl-37 = 100   x Relative atomic mass of Cl-35 = 35   x/100 Relative atomic mass of Cl-37 = 37   (100 x)/100 35x/100 + (3700 37x)/100 = 35.5 35x + 3700   37x = 3550  0.02x =  0.15 x =  0.15/ 0.02 = **75%** % abundance of Cl-35 = 75% % abundance of Cl-37 = 100   75 = **25%** [  Mark] --- **4(ai).** Faraday's first law: The mass of a material deposited or evolved at an electrode during electrolysis is directly proportional to the quantity of electricity that passed through the electrolyte. [1 Mark] **(ii).** Current, I = 5 A; Time, t = 1   60 = 3600 s; Mass, m = 2 g Quantity of electricity, Q = It = 5   3600 = 18,000 C From Faraday's first law: Z = m/Q = 2/18000 = **1.111   10   gC  ** [  Mark] **(bi).** Weight of solvent, w  = 0.350 g; Weight of substance, w  = 40 g [1  Marks] --- Boiling point elevation:  T  = 0.357 C; K  = 5.02 C/kg Using expression:  T  = K    M    M  = (K    w    M )/(K    w    1000) M  = (0.357   40)/(5.02   0.35   1000) = 1757/14.28   **123 gmol  ** [2 Marks]  E = Q   W (Change in internal energy; Q = Heat gained; W = Heat done on system) An adiabatic process: no heat change between system and surroundings.  Q = 0. Temperature, pressure, volume, internal energy, enthalpy and entropy. Isolated system:  Q = 0. [  Mark] --- **Raoult's Law Calculation (D041; Q3ai):** Raoult's law states that in an ideal solution, the equilibrium vapour pressure of a solution (P ) is equal to the product of the vapour pressure of the pure solvent (P  ) and its mole fraction (X ) in the solution: P  = X    P   Multiply equation (2) by 2: H (g) +  O (g)   H O(g) ... (1) CH (g) + O (g)   CO (g) + 2H O(g) ... (2) Rearrange equation (3): CO (g) + 2H O(g) + 2O (g)   CH (g) Addition of equations (1), (4) and (5): C(s) + O (g)   CO (g);  H =  392 kJmol   H (g) +  O (g)   H O(g);  H =  283 kJmol   CH (g) + 2O (g)   CO (g) + 2H O(g);  H =  1891 kJmol   Overall: C(s) + 2H (g)   CH (g);  H = **+1891 kJmol  ** [1  Marks]  H =  566 kJmol   [1 Mark] Total = 10 Marks --- --- **5(ai).** Chadwick discovered neutron. [1 Mark] **(ii).** Lithium has the smallest atomic and ionic radii and shares some resemblance with magnesium in Group 2 of the periodic table via diagonal relationship. Both elements have similar size. [1 Mark] He formulated the modern atomic theory experimentally. **(bi).** The carbonates, nitrates and hydroxides of Li and Mg decompose on heating to the oxides (Li O and MgO) of the elements. [1 Mark] **(bii).** The oxides and hydroxides of Li and Mg are not deliquescent. [1 Mark] The chlorides of both elements are soluble in ethanol and are deliquescent. Both Li and Mg form normal oxides only. - It produces oxy-acetylene flame when mixed with acetylene for cutting and welding of metals. - It is used in steel making via basic oxygen furnace process. Treatment of wastewater: 2H O (aq) + MnO (catalyst)   2H O(l) + O (g) --- **Carbon-based nanomaterials:** I. They are nanomaterials that are composed of carbon in the form of hollow spheres, ellipsoids or tubes. Examples include nanogold, nanosilver, quantum fullerene and graphenes. [1 Mark for any 2] II. Metal based nanomaterials: include TiO . A quantum dot is a closely packed semiconductor crystal comprised of thousands of atoms. III. Dendrimers: are repetitively branched molecules or nanosized order of a few nanometer. The surface of a dendrimer has numerous polymers built from branched unit with specific chemical functions. IV. Composites: are nanomaterials formed by the combination of poly(amidoamine), poly(imine) and polyether-copolyester chains. Examples include starch, cellulose, collagen, gelatin, fibrin, chitosan, poly(vinyl alcohol) and poly(ethylene glycol). [2 Marks] --- **6(ai).** Global warming is the increase in the earth's surface temperature due to human activities such as burning of fossils. [  Mark] Photodissociation of O : O  + h    2O [  Mark] Formation of ozone layer: O + O  + M   O  + M [1 Mark] **(bi).** Hydrogen is a safe fuel for electricity generation because its combustion produces heat and water with zero greenhouse gas emissions. [1 Mark] **(bii).** (i) Argon is used in arc welding because it is non-reactive (inert) in nature. (ii) Because iodine sublimes (undergoes sublimation) when heated, changing directly from solid to gas and deposited as pure iodine when cooled. (iii)    X = 1s  2s  2p  [1] (iv)     Cu: [Ar] 3d   4s  [1] Fe(OH)(NH ) Cl ; [Fe(CN) (NH ) ]  [1] --- **(ai).** X = CO ; Y = CaCO ; Z = Ca(HCO )  CO  + Ca(OH) (aq)   CaCO  + H O(l) [1  Marks] **(bi).** - Ozone layer filters out harmful UV rays from the sun. - Ozone layer acts as a shield preventing meteors from hitting the earth surface. - Ozone layer allows cloud to be formed as part of water cycle. - It is a poor conductor of heat and electricity. - Ozone has a bright yellow colour; it is insoluble in water but soluble in CS . - SiO  is a Lewis acid and reacts with bases to form salts and water. SiO (s) + 2NaOH(aq)   Na SiO (aq) + H O(l) [1  Marks] **(ci).** - Sulphur: SiO  is a Lewis acid and reacts with bases. [1 Mark] **(di).** (a). Hydrogen is a reducing agent because it causes many substances to undergo reduction by donating electrons. It is highly flammable. [1 Mark] H (g) + 2Cl(g)   2HCl(g) [  Mark] **(ii).** Fe  : Electronic configuration is 1s  2s  2p  3s  3p  3d  There are **four unpaired electrons** in the 3d  subshell. [1  Marks] --- **Rate law calculation:** Using experiment 1 to obtain k: k = rate/([NO] [H ] ) 2.4   10   = k[0.0250]    [0.010]  ... (i) Divide experiment 1 by experiment 3: 2.4   10  /0.6   10   = k[0.0250]    [0.010]  / k[0.0125]    [0.010]  4 = 2 ; x = 2 (2nd order in NO) The reaction is 2nd order overall in [NO] Divide experiment 1 by experiment 2: 2.4   10  /2.4   10   = [0.025]    [0.010]  / [0.025]    [0.010]  ... y = 0 The empirical rate law is: rate = k[NO]  k = rate/[NO]  = 0.000625/0.0250 = 40 Lmol  s   [1 Mark] --- **Ecell Calculation:** Ecell =  (0.0591/n) log([H ] ) But E H = E ; Then Ecell = E cell = 0 Ecell =  0.0591 log(PH /[H ] ) =  0.0591 log([H ] ) =  0.0591   2log[H ] = +0.0591   pH But, pH =  log[H ]; Therefore: Ecell = 0.0591   10 = **+0.591 V** Hence, oxidation potential of hydrogen electrode = +0.591 V [2 Marks] Total = 10 Marks --- **5(ai).** Cobalt, iron and nickel. **(ii).** Carbon is the only member of the group that: - Is a non-metal - Catenates readily - Forms stable p    p  multiple covalent bonds with smaller sizes and higher electronegativities (as in C=O, C=S and C N) - Is the only member whose oxides (CO and CO ) are gases at ordinary temperature - It is the only member of the group without empty d-orbitals [1  Marks for any three] --- **(b).** Formulae of compounds formed: HW, XH, YH  and HZ [4 Mks] **(ci).** Generally, ionization energy of group 14 elements decreases down the group. Meanwhile, the 1st ionization energy of Pb is slightly higher than that of Sn due to lanthanide contraction resulting to an increase in nuclear attraction to an increase in nuclear attraction of electrons. [1  Mks] **(cii).** Hydrogen is prepared when steam combines: C(s) + H O(g)   CO(g) + H (g) The product is called synthesis gas (syn-gas) which is a mixture of CO and H  gases in the ratio 1:1 by volume. [1  Marks] Total = 10 Marks Here is the full transcription of pages 21 40, organized by page number and topic: --- --- **Q7(ai).** Draw the structure of 2-hydroxybutanonitrile. \\`\\`\\` OH | H   C   C   N | CH  | CH  \\`\\`\\` 2-Hydroxybutanonitrile + NH   (Addition reaction) [1 Mark] **Q7(aii).** Write the product of the addition reaction shown. **Q7(aiii).** Draw the structural formula of the product. \\`\\`\\` H H H OH | | | | H C C C C COOH | | | | H H H OH \\`\\`\\` [  Mark] **Q(ii). Hydrogen   position in periodic table:** - (ii). NaO. - Hydrogen is placed in Group I of the periodic table because it is an s-block element with one electron in its only shell and can ionize by losing electron to form mono-positive cation, H . [  Mark] - Hydrogen is placed in Group VII of the periodic table because it exists as a diatomic molecule, forms covalent bonds and can accept an electron to form a mono-negative anion, H . [  Mark] - (d). Hydrogen with one electron in its only shell and can ionize by losing electron to form mono-positive cation, H . [  Mark] **Total = 10 Marks** --- **(b). Fractional distillation of petroleum table:** | Fraction | Temp. of Separation ( C) | No. of C | Use | |---|---|---|---| | Petroleum gas | Under 30 | 2 4 | Rocket fuel | | Gasoline | 30 180 | 4 9 | Motor fuel | | Kerosene | 160 230 | 8 16 | Heat, jet fuel | | Diesel | 200 320 | 12 20 | Motor fuel | | Heavy fuel oil | 300 450 | 16 30 | Heating lubricant, Electrical insulation, candle making | | Petroleum jelly/paraffin wax | >300 | >25 |   | | Asphalt/Residue | >300 Vacuum | >30 | In construction | [3 Marks] **(cii). Reactions of benzene:** Reaction 1 (Nitration): \\`\\`\\` Benzene + HNO /H    Nitrobenzene (NO  attached to ring) \\`\\`\\` Reaction 2 (Bromination): \\`\\`\\` Benzene + Br /FeBr    Bromobenzene (Br attached to ring) \\`\\`\\` [3 Marks] --- **Q(di). Structures of D-Glucose and D-Fructose:** D-Glucose: \\`\\`\\` CHO | H C OH | HO C H | H C OH | H C OH | CH OH \\`\\`\\` D-Fructose: \\`\\`\\` CH OH | C=O | HO C H | H C OH | H C OH | CH OH \\`\\`\\` **(dii). Fehling's solution** is reduced by D-Glucose and not by D-Fructose because D-Glucose is a reducing sugar with free anomeric/aldehydic carbon while D-Fructose does not reduce because it contains a ketonic group. [1 Mark] **Total = 10 Marks** --- **Q8(ai). Reaction of CH CH CH=CH  + HBr   H O:** \\`\\`\\` CH CH CH=CH  + HBr   H C C C C Br H H H H H H H H 1-Bromobutane \\`\\`\\` [2 Marks] **(ii). Table   Inductive Effect vs Mesomeric Effect:** | Inductive Effect | Mesomeric Effect | |---|---| | It occurs in single covalent bond ( ) | It occurs in multiple covalent bond ( ) | | No formation of ions | Ion formation occurs | | It involves partial charge separation | It involves full charge separation | **(b). Bond fission:** - X Y undergoes homolytic fission in the presence of UV-light/heat to produce free radicals: X Y + UV-Light   X  + Y  - X Y undergoes heterolytic fission in polar/aqueous medium to produce an electrophile and a nucleophile: X Y   X  + Y  - (c). Making of dinnerware; making of electrical switchboxes; making of trays, cutlery, handles, brushes and baby dishes; making of funnels, radio and television cables. [1  Marks for any three] [1 Mark for any two] **(di). Free radicals and ions:** - (ii). Cl ; Br ; CH  ; H ; I  - (iii). Cl ; Br ; CH  ; H ; I  **Total = 10 Marks** --- **Q1(ai).** - N   is larger than F . Though both are isoelectronic ions with 10 electrons, but N   which was formed after gaining 3 electrons that resulted to smaller attraction by the nucleus is larger. [1 Mark] - (ii). Fe   is larger than Fe   since Fe   has more electrons (24) resulting to greater electron-electron repulsion as compared to Fe   (23) despite having the same nuclear charge. [1 Mark] **(bi). Sources of laboratory errors:** - Careful calibration of instruments; maintaining constant temperature and humidity in the laboratory; running of a blank determination; isotopic dilution, use of independent method of analysis etc. [1 Mark] **(bii). Balancing Cr O      Cr  :** Step 1: Cr O      2Cr   Step 2 (Balance O): Cr O      2Cr   + 7H O Step 3 (Balance H): Cr O    + 14H    2Cr   + 7H O Step 4 (Balance charge): Cr O    + 14H  + 6e    2Cr   + 7H O Salts: NaCl; MgCl ; Al S ; AlCl ; MgS; Na S; NaCl; MgCl . (ii). NaCl or MgS (iii). Na, Mg, Al, S, Cl [2 Marks] [1 Mark] [  Mark] [  Mark] **Percentage abundance of Sr-86:** 84 q + 86 0.56 + 88 q = 87.62 Let the percentage abundance of Sr-86 be q: 47.04 + 86q + 609 + 7267.04 = 7923.08 + 86q = 8762 86q = 8762   7923.08 = 838.92 q = 838.92/86 = 9.75 (3 s.f.) [3 Marks] **Total = 10 Marks** **Q2(a). Empirical formula calculation:** | | C | P | O | |---|---|---|---| | % Composition | 56.3 | 43.7 |   | | Number of mole (mol) | 56.3/12 = 4.692 | 43.7/31 = 1.4097 |   | | Mole ratio | 56.3/31 = 1.8161 | 43.7/16 = 2.73125 |   | --- **Empirical formula calculation continued:** Mole ratio  2: - [P O ]n = 2 110; 220/110 = 2; n = 110 - (62+48)n = 220; 110n = 220; n = 2 - Molecular formula of X = P O  **Compound Y calculation:** | Element | P | O | |---|---|---| | % Composition | 43.6 | 56.4 | | Number of mole (mol) | 43.6/31 = 1.4064 | 56.4/16 = 3.525 | | Mole ratio | 1.4064/1.4064 = 1 | 3.525/1.4064 = 2.5 | Mole ratio  2: [P O ]n (2 31 + 5 16)n = 284; 142n = 284; n = 2 Molecular formula of X = P O   [2 Marks] **(bi). Bohr's model limitations:** - Electrons revolve round the nucleus of an atom in a circular orbit - When an electron is in a particular energy level, it does not lose or gain energy but when changing state, energy is lost or gained. - Electrons in an atom exist in one of several allowed stationary states, each with a fixed energy. - The state of allowed motion are those for which angular momentum are quantized into a multiple of h/2 . [1 Mark for any two] **(ii). Limitations of Bohr's model:** - Failure to explain splitting of some line spectra under the influence of magnetic field   Zeeman effect. - Failure to explain splitting of some line spectra under the influence of electric field   Stark effect. - The model only explains quantization of electrons and could not explain arrangement of electrons in an atom. - The model was not accurate for complex and many-electron atoms. - Failure to explain some line doublets and fine structure observed under high resolution. - Failure to explain electron-electron repulsion. [1 Mark for any two] --- **Q3(ai). Postulates of Kinetic Theory of gases:** - Every gas consists of identical molecules which are considered as non-interacting point masses. - Gases are made up of very small, discrete, tiny or hard sphere particles called molecules in constant random motion. - The shape and volume of gas molecules are negligible or infinitesimally small relative to the shape and volume of container. - Gas molecules travel in straight line with varying speeds. - There is no effect of gravity on the motion of gas molecules. - Temperature is a measure of average kinetic energy of gas molecules and all gases at the same temperature have the same average kinetic energy. - Gas molecules collide with one another and with the walls of container and gases collide, momentum because there is force of attraction between gas molecules when they collide. - The collision between them is perfectly elastic. [2 Marks for any 4] **(iii). Rydberg equation   n  = 2; n  = ?;   = 24372.796 cm  ; Rb = 109677.581 cm  :**   = R (1/n     1/n  ) 24372.796 = 109677.581   (1/4   1/n  ) 1/4   1/n   = 24372.796/109677.581 = 0.2222 1/n   = 0.25   0.2222 = 0.0278 n   = 1/0.0278 = 35.9712 n  =  35.9712 = 5.998   6 [2 Marks] **(c). First ionization energy decreases down the group** of the periodic table because, the energy level (principal quantum number) of the orbital holding the outermost electron becomes larger as we go down the group. Although the number of protons in the nucleus also becomes larger, the electrons in smaller shells and sub-shells tend to screen the outermost electron for some of the forces of attraction of the nucleus (Screening effect). Furthermore, more shells are added and the electron being removed when the first ionization energy is measured is less of its time near the nucleus of the atom, and it therefore takes less energy to remove this electron from the atom. [2 Marks] --- **Using the combined gas equation:** P V /T  = P V /T  V  = (745 40 273)/(760 273) = (8135400)/(211280) = 38.51   39 cm  [2 Marks] **(b). Molar mass of nitrogen:** M_A = 2 14 = 28 gmol   Rate of diffusion of nitrogen, R_A = 320/40 = 8 cm s   Molar mass of X = 2 28 = 56 gmol   From Graham's law of diffusion: R_B = R_A    (M_A/M_B) = 8    (28/56) = 8   0.71 = 5.68 cm s   R_X = V_X/t_X 5.68 = 480/t_X   t_X = 480/5.68 = 84.51   84.5 seconds [2 Marks] **(ci). Isotopy** is a phenomenon whereby two or more atoms of the same elements have the same atomic number but different mass numbers. [1 Mark] **(ii). % abundance of Cl-35:** Let % abundance of Cl-35 = x 35x/100 + 37(100 x)/100 = 35.5 35x + 3700 37x = 3500  0.02x =  0.15 x =  0.15/ 0.02 = 75% Hence % abundance of Cl-35 = 75%; Cl-37 = 25% [1 Mark] **Relative atomic mass of Cl-35:** = 35   0.35x/100 = 35.5; 37 0.02x = 35.5 Therefore: 37 0.37x+0.35x = 35.5   x = 75% **",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0049",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"If the mass of electron is 9.11 10    kg, what is the de Broglie wavelength of an electron traveling at two-thirds the speed of light? (c = 3.0 10  ms  ; h = 6.626 10    Js). **A.** 3.75 pm **B.** 36.4 pm **C.** 3.64 pm **D.** 1.62 pm",
      difficulty:"medium"
    },
    {
      id:"che-2024-q0050",
      subject:"chemistry",
      year:2024,
      category:"objective",
      question:"If a bottle of concentrated HCl solution has label reading 37.8% HCl by mass. Calculate the molarity of this solution if the density of HCl is 1.1917 gcm  : **A.** 11.3 M **B.** 14.5 M **C.** 12.0 M **D.** 12.3 M",
      difficulty:"medium"
    },
    {
      id:"che-2024-p0001",
      subject:"chemistry",
      year:2024,
      category:"practical",
      question:"Which of these properties are applicable to a nucleophile or a potential source of one? They are organic reagents which may be: I. positively charged II. negatively charged. III. neutral but possess a central atom which is electron deficient. IV. neutral but possess a central atom with lone pair(s) of electrons. *End of Pages 21 40 transcription.* Here is the transcribed text from all 20 images: **PAGE 41** V. neutral but can polarize and attack a substrate with its positive end. VI. neutral but can polarize and attack a substrate with its negative end. 48. The IUPAC name of the compound with the structural formula CH C(CH )=CHCH  is 49. Which of the following reactions will not give secondary alcohol as product? 50. The product of the reaction of acid chloride with aliphatic or aromatic hydrocarbons in the presence of a Lewis acid is **ESSAY QUESTIONS (2024)** **Answer FOUR Questions; ONE from each Course** **CHM 001: GENERAL CHEMISTRY** 1(a). Define the following terms and state their units in each case: (i). molality (ii). molarity [2 Marks] (b). What is the frequency and wavelength of a photon emitted during transition of hydrogen atom from the n  = 5 state to the nf = 2 state? [R  = 2.18 x 10   J; h = 6.626 x 10    Js; c = 3.0 x 10  ms  ] [3 Marks] (c). State whether a reaction will occur or not among the following pairs, and write the molecular, total ionic, net ionic equations where applicable: (i). Sodium sulphate (Na SO ) solution + strontium nitrate (Sr(NO ) ) solution. (ii). Ammonium perchlorate (NH ClO ) solution and sodium bromide (NaBr) solution. [3 Marks] (d). Determine the oxidation number of zinc in the following compounds: (i). Zn(NH ) SO  (ii). [Zn(NH ) Cl]   [2 Marks] 2(a). 7.0 g of FeBr  were mixed with 3.2 g of Na S in solution according to the following equations: 2FeBr (aq) + 3Na S(aq)   Fe S(s) + 6NaBr(aq) (i). Which reagent is limiting? (ii). How much in g of Fe S  would be formed? (iii). If the mass of Fe S  after washing and drying is 1.92 g, calculate its percentage yield. [Fe = 56, Br = 79.9, Na = 23, S = 32] [4 Marks] [1 Mark] (b). What is meant by the term precipitation reaction? **PAGE 42** (ci). Differentiate between accuracy and precision. [1 Mark] (ii). Balance the redox reaction below in basic medium. H O  + MnO     O  + MnO  [4 Marks] **CHM 002: PHYSICAL CHEMISTRY** 3(ai). What is meant by the term half-life of a radioactive element? (ii). State any three (3) parameters that can be used to determine the stability of nuclides. [2  Marks] (b). Given that the half-life of cobalt-60 is 6.0 years, calculate the (i). decay constant in per seconds. (ii). activity of a 1.0 mg sample of cobalt-60. [4  Marks] (c). Define the following thermodynamic terms: (i). entropy (ii). Gibb's free energy (iii). enthalpy [3 Marks] (d). State the expressions for the integrated law and the unit of the rate constant for: (i). zeroth-order reaction (ii). first-order reaction [3 Marks] 4(a). State the expressions for the integrated law and the unit of the rate constant (b). The enthalpy change for the reaction: C H  + Cl    C H Cl  is -129 kJmol  . Given the following bond energy values: [1 Mark] | Bond | C-C | C=C | C-H | Cl-Cl | C-Cl | |------|-----|-----|-----|-------|------| | Bond Energy (kJ/mol) | +330 | +612 | +415 | +243 | +338 | Determine the bond energy for the C-Cl bond. [3 Marks] (c). The rate constant for the reaction A (g) + B (g)   2AB(g) are 4.2 dm  mol   sec at 298 K and 12.64 dm  mol   sec at 400 K. Calculate the activation energy Ea for this reaction. [R = 8.314 J mol   K  ] [3 Marks] (d). What conditions often make non-ideal solutions to show positive deviation from the Raoult's law? [1 Mark] **CHM 003: INORGANIC CHEMISTRY** 5(a). Give a reason for each of the following: (i). electronegativity increases from left to right in the periodic table. (ii). Ionization enthalpy decreases in group from top to bottom. (iii). Helium has electronic configuration of 1s  but it is placed in p-block in group 18. [3 Marks] (b). Account for why: (i). the second ionization enthalpy of alkali metals is higher than that of alkaline earth metals. (ii). the solution of alkali metals in ammonia is conducting in nature. (iii). HF is the weakest acid among haloacids in spite of the fact that F is the most electronegative. [3 Marks] **PAGE 43** (c). Using appropriate chemical equations, show what happens when calcium is treated with: (i). nitrogen (ii). dilute tetraoxosulphate (VI) acid. [2 Marks] (d). What is the oxidation state of Co in the complex [Co(NH ) (NO )Cl][Au(CN) ]? [2 Marks] 6(a). Write the correct formula for the following compounds: (i). CrCl .6H O (violet, with three chloride ions/units in the formula). (ii). CrCl .6H O (light green, with two chloride ions/units in the formula). [3 Marks] (iii). CrCl .6H O (dark green, with one chloride ions/units in the formula). [3 Marks] (b). Arrange the following complexes in order of increasing electrical conductivity: [Co(NH ) Cl ], [Co(NH ) Cl]Cl , [Co(NH ) ]Cl , [Co(NH ) Cl ]Cl [2 Marks] (c). Hydrogen forms compounds with elements W, X, Y and Z having atomic numbers 9, 11, 12 and 17 respectively. (i). Write a balanced chemical equation for the formation of each of the compounds in (c) above. [3 Marks] (ii). What type of hydride is each of the compounds formed by Fe   with the following compounds in (ci) above. [3 Marks] (iii). Write the formula of the complexes formed by Fe   with the following ligands: (i). one hydroxyl ion, two ammonia molecules and three chloride ions (ii). three cyanide ions and three ammonia molecules. [2 Marks] **CHM 004: ORGANIC CHEMISTRY** 7(a). Differentiate between the following sets of terms: (i). thermoplastics and thermosets. [3 Marks] (ii). addition and condensation polymers. (iii). natural and synthetic polymers. [3 Marks] (bi). List the characteristic reactions that alkyl halides undergo. (ii). Give one equation each for the reactions listed in (bi) above. (iii). Write the equation to show the reaction of methyl iodide with aqueous potassium iodide. [3  Marks] (c). Give the IUPAC nomenclature of the following compounds: (i). CH CHICONH  (ii). ClC(C H )COOH (iii). CH CH COOCH CH  [1  Marks] (d). Give reasons for the following observations: (i). alkynes generally have higher boiling points than corresponding alkenes. (ii). benzene readily undergo substitution reactions instead of addition reactions. [2 Marks] 8(a). Sodium hydroxide solution was mixed in three different vessels A, B and C containing haloalkanes. The mixture was acidified with dilute nitric acid. The precipitate obtained in vessels A, B and C were yellow, white and pale yellow respectively. **PAGE 44** (i). Identify the halide ions present in each vessel. (ii). Arrange the halide ions in their order of increasing reactivity. [2 Marks] (b). Consider the reaction below: CH CHCICH +KOH/C H OH   A + B [3 Marks] (i). Draw the structure and give the names of A and B without the alcohol? (ii). What product will be formed if the reaction proceeds without the alcohol? (c). Calculate the specific activity of a 600 g sample of organic compound per +1.2  at sodium D-line. [3 Marks] (d). Give the major products of the following reactions: (i). C H COCl + LiAlH    ? (ii). C H CONH  + NaOH   ? [2 Marks] (iii). CH COCH  + CH COCH    ? [3 Marks] **PRACTICAL QUESTIONS (2024)** **Question 1: QUANTITATIVE ANALYSIS** You are provided with the following solutions: A is a solution containing 15.00 cm  concentrated acid, HX, in 1.0 dm  of solution (36% pure and 1.25 g/cm  density). B is a solution that contains 1.08 g of sodium trioxocarbonate (IV), Na CO  in 200 cm  of solution. **Procedure:** (a). Pipette 25 cm  portion of solution B into a clean conical flask, add 2 or 3 drops of methyl orange indicator and titrate against solution A from the burette. (i). Tabulate your readings and obtain the average value of acid used in the titration. (ii). Write a balanced chemical equation for the reaction. (b). From the information given and your titre value, determine: (i). Molar concentration of Na CO  in solution B; (ii). Mole of the acid, HX per dm  of solution A; (iii). Mass of HX in g/dm ; (iv). Relative atomic mass of X. (v). What will be the colour change at the end point if phenolphthalein is used for the titration? (vi). Assume that 1.2 g of impure Na CO  in 1 dm  of solution",
      options:[
            {label:"A", text:"I and III only"},
          {label:"C", text:"I, II and III"},
          {label:"B", text:"II, IV and VI only"},
          {label:"D", text:"I, III and V."}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-p0002",
      subject:"chemistry",
      year:2024,
      category:"practical",
      question:"Number of mole = CV = (500/100)   0.2 = 0.1 mol; Mass of NaOH = n   Mr = 0.1   40 = 4 g **(D)**",
      difficulty:"medium"
    },
    {
      id:"che-2024-p0003",
      subject:"chemistry",
      year:2024,
      category:"practical",
      question:"Which of these properties are applicable to a nucleophile or a potential source of one? They are organic reagents which may be: I. positively charged II. negatively charged. III. neutral but possess a central atom which is electron deficient. IV. neutral but possess a central atom with lone pair(s) of electrons. --- *End of Pages 21 40 transcription.* --- > **Note:** This covers all 20 images (pages 21 40) from the JUPEB Chemistry Feedback book by Ismaeel R.O. Seriki. The content includes JUPEB 2025 essay marking guides (CHM 001 004), JUPEB 2025 practical answers, and JUPEB 2024 multiple choice questions. Send the next batch of images (pages 41 onward) to continue the full 2014 2025 compilation. Here is the transcribed text from all 20 images: --- **PAGE 41** V. neutral but can polarize and attack a substrate with its positive end. VI. neutral but can polarize and attack a substrate with its negative end. 48. The IUPAC name of the compound with the structural formula CH C(CH )=CHCH  is 49. Which of the following reactions will not give secondary alcohol as product? 50. The product of the reaction of acid chloride with aliphatic or aromatic hydrocarbons in the presence of a Lewis acid is --- **ESSAY QUESTIONS (2024)** **CHM 001: GENERAL CHEMISTRY** 1(a). Define the following terms and state their units in each case: (i). molality (ii). molarity [2 Marks] (b). What is the frequency and wavelength of a photon emitted during transition of hydrogen atom from the n  = 5 state to the nf = 2 state? [R  = 2.18 x 10   J; h = 6.626 x 10    Js; c = 3.0 x 10  ms  ] [3 Marks] (c). State whether a reaction will occur or not among the following pairs, and write the molecular, total ionic, net ionic equations where applicable: (i). Sodium sulphate (Na SO ) solution + strontium nitrate (Sr(NO ) ) solution. (ii). Ammonium perchlorate (NH ClO ) solution and sodium bromide (NaBr) solution. [3 Marks] (d). Determine the oxidation number of zinc in the following compounds: (i). Zn(NH ) SO  (ii). [Zn(NH ) Cl]   [2 Marks] 2(a). 7.0 g of FeBr  were mixed with 3.2 g of Na S in solution according to the following equations: 2FeBr (aq) + 3Na S(aq)   Fe S(s) + 6NaBr(aq) (i). Which reagent is limiting? (ii). How much in g of Fe S  would be formed? (iii). If the mass of Fe S  after washing and drying is 1.92 g, calculate its percentage yield. [Fe = 56, Br = 79.9, Na = 23, S = 32] [4 Marks] [1 Mark] (b). What is meant by the term precipitation reaction? --- **PAGE 42** (ci). Differentiate between accuracy and precision. [1 Mark] (ii). Balance the redox reaction below in basic medium. H O  + MnO     O  + MnO  [4 Marks] **CHM 002: PHYSICAL CHEMISTRY** 3(ai). What is meant by the term half-life of a radioactive element? (ii). State any three (3) parameters that can be used to determine the stability of nuclides. [2  Marks] (b). Given that the half-life of cobalt-60 is 6.0 years, calculate the (i). decay constant in per seconds. (ii). activity of a 1.0 mg sample of cobalt-60. [4  Marks] (c). Define the following thermodynamic terms: (i). entropy (ii). Gibb's free energy (iii). enthalpy [3 Marks] (d). State the expressions for the integrated law and the unit of the rate constant for: (i). zeroth-order reaction (ii). first-order reaction [3 Marks] 4(a). State the expressions for the integrated law and the unit of the rate constant (b). The enthalpy change for the reaction: C H  + Cl    C H Cl  is -129 kJmol  . Given the following bond energy values: [1 Mark] | Bond | C-C | C=C | C-H | Cl-Cl | C-Cl | |------|-----|-----|-----|-------|------| | Bond Energy (kJ/mol) | +330 | +612 | +415 | +243 | +338 | Determine the bond energy for the C-Cl bond. [3 Marks] (c). The rate constant for the reaction A (g) + B (g)   2AB(g) are 4.2 dm  mol   sec at 298 K and 12.64 dm  mol   sec at 400 K. Calculate the activation energy Ea for this reaction. [R = 8.314 J mol   K  ] [3 Marks] (d). What conditions often make non-ideal solutions to show positive deviation from the Raoult's law? [1 Mark] **CHM 003: INORGANIC CHEMISTRY** 5(a). Give a reason for each of the following: (i). electronegativity increases from left to right in the periodic table. (ii). Ionization enthalpy decreases in group from top to bottom. (iii). Helium has electronic configuration of 1s  but it is placed in p-block in group 18. [3 Marks] (b). Account for why: (i). the second ionization enthalpy of alkali metals is higher than that of alkaline earth metals. (ii). the solution of alkali metals in ammonia is conducting in nature. (iii). HF is the weakest acid among haloacids in spite of the fact that F is the most electronegative. [3 Marks] --- **PAGE 43** (c). Using appropriate chemical equations, show what happens when calcium is treated with: (i). nitrogen (ii). dilute tetraoxosulphate (VI) acid. [2 Marks] (d). What is the oxidation state of Co in the complex [Co(NH ) (NO )Cl][Au(CN) ]? [2 Marks] 6(a). Write the correct formula for the following compounds: (i). CrCl .6H O (violet, with three chloride ions/units in the formula). (ii). CrCl .6H O (light green, with two chloride ions/units in the formula). [3 Marks] (iii). CrCl .6H O (dark green, with one chloride ions/units in the formula). [3 Marks] (b). Arrange the following complexes in order of increasing electrical conductivity: [Co(NH ) Cl ], [Co(NH ) Cl]Cl , [Co(NH ) ]Cl , [Co(NH ) Cl ]Cl [2 Marks] (c). Hydrogen forms compounds with elements W, X, Y and Z having atomic numbers 9, 11, 12 and 17 respectively. (i). Write a balanced chemical equation for the formation of each of the compounds in (c) above. [3 Marks] (ii). What type of hydride is each of the compounds formed by Fe   with the following compounds in (ci) above. [3 Marks] (iii). Write the formula of the complexes formed by Fe   with the following ligands: (i). one hydroxyl ion, two ammonia molecules and three chloride ions (ii). three cyanide ions and three ammonia molecules. [2 Marks] **CHM 004: ORGANIC CHEMISTRY** 7(a). Differentiate between the following sets of terms: (i). thermoplastics and thermosets. [3 Marks] (ii). addition and condensation polymers. (iii). natural and synthetic polymers. [3 Marks] (bi). List the characteristic reactions that alkyl halides undergo. (ii). Give one equation each for the reactions listed in (bi) above. (iii). Write the equation to show the reaction of methyl iodide with aqueous potassium iodide. [3  Marks] (c). Give the IUPAC nomenclature of the following compounds: (i). CH CHICONH  (ii). ClC(C H )COOH (iii). CH CH COOCH CH  [1  Marks] (d). Give reasons for the following observations: (i). alkynes generally have higher boiling points than corresponding alkenes. (ii). benzene readily undergo substitution reactions instead of addition reactions. [2 Marks] 8(a). Sodium hydroxide solution was mixed in three different vessels A, B and C containing haloalkanes. The mixture was acidified with dilute nitric acid. The precipitate obtained in vessels A, B and C were yellow, white and pale yellow respectively. --- **PAGE 44** (i). Identify the halide ions present in each vessel. (ii). Arrange the halide ions in their order of increasing reactivity. [2 Marks] (b). Consider the reaction below: CH CHCICH +KOH/C H OH   A + B [3 Marks] (i). Draw the structure and give the names of A and B without the alcohol? (ii). What product will be formed if the reaction proceeds without the alcohol? (c). Calculate the specific activity of a 600 g sample of organic compound per +1.2  at sodium D-line. [3 Marks] (d). Give the major products of the following reactions: (i). C H COCl + LiAlH    ? (ii). C H CONH  + NaOH   ? [2 Marks] (iii). CH COCH  + CH COCH    ? [3 Marks] **PRACTICAL QUESTIONS (2024)** **Question 1: QUANTITATIVE ANALYSIS** You are provided with the following solutions: A is a solution containing 15.00 cm  concentrated acid, HX, in 1.0 dm  of solution (36% pure and 1.25 g/cm  density). B is a solution that contains 1.08 g of sodium trioxocarbonate (IV), Na CO  in 200 cm  of solution. **Procedure:** (a). Pipette 25 cm  portion of solution B into a clean conical flask, add 2 or 3 drops of methyl orange indicator and titrate against solution A from the burette. (i). Tabulate your readings and obtain the average value of acid used in the titration. (ii). Write a balanced chemical equation for the reaction. (b). From the information given and your titre value, determine: (i). Molar concentration of Na CO  in solution B; (ii). Mole of the acid, HX per dm  of solution A; (iii). Mass of HX in g/dm ; (iv). Relative atomic mass of X. (v). What will be the colour change at the end point if phenolphthalein is used for the titration? (vi). Assume that 1.2 g of impure Na CO  in 1 dm  of solution B. Anhydrous sodium trioxocarbonate (IV) is a primary standard. State any TWO of its properties that affirms this statement. (c). Anhydrous sodium trioxocarbonate (IV) is a primary standard. State any TWO of its properties that affirms this statement. [Total = 10 Marks] --- **PAGE 46 (MCQ ANSWERS)** 12. A   A   + 2e , E  = +0.050 v; 2B  + 2e    2B, E  = +0.011 v Overall equation: A + 2B    A   + 2B, E cell = E Red.   E oxid. = 0.050   0.011 = +0.0392 v Given: logK = (2.303RT/nF) logK = (2 x 96500)/(2.303 x 8.314 x 298) logK 0.0392 = 10^1.314; K = 10^1.314 = 20.606   21 (C) 16. C 17. D 18. B 19. D 20. C 21. M.M =  n(n+2) =  4(4+2) =  24 = 4.9 BM **(C)** 22. A 23. C 24. B 25. D 26. B 27. C 28. D 29. A 30. B 31. A 32. C 33. A 34. D 35. D 36. A 37. B 38. A 39. B 40. D 41.  Tb = Mc   Kb 105.3   100 = Mc   0.512; M = 0.512 x 100/(5.3 x 100)   (40 x 1000)/(100 x M) = 38.6 **(B)** 42. A 43. A 44. D 45. D 46. A 47. II, IV & V 48. B 49. C 50. B 13. B 14. A 15. D 32. C 33. A 39. B 40. D 45. D 46. A **MARKING GUIDE TO ESSAY QUESTIONS (2024)** **CHM 001: GENERAL CHEMISTRY** 1(ai). Molality is amount in mole of a substance contained in 1 kg of solution. It is measured in molkg   [ ]. (ii). Molarity is the amount in mole of a substance contained in 1 dm /L of solution [ ]. It is measured in molL   or moldm   [ ]. (b). Using Bohr's theory equation; E  =  E /n  When n = 5; E  =  2.18 x 10   /5  =  2.18 x 10   /25 When n = 2; E  =  2.18 x 10   /2  =  1.09 x 10    J  E = E    E  = [ 0.0872   ( 1.09)] x 10    = 1.0028 x 10    / 1.0028 x 10    = 1.513 x 10   s  . The frequency is 1.513 x 10   s  . But;   = c/v = (1.9828 x 10  m)/(1.513 x 10  ) = 198.28 x 10  m = 198.28nm [3 Marks] (ci). Reaction will occur. Molecular equation: Na SO (aq) + Sr(NO ) (aq)   2NaNO (aq) + SrSO (s) Total ionic equation: 2Na  SO   (aq) + Sr   2NO  (aq)   2Na  NO  (aq) + SrSO (s) [2 Marks] Net ionic equation: SO   (aq) + Sr     SrSO (s) [1 Mark] (ii). No reaction will occur. [2 Marks] (di). +2 (ii). +3 Total = 10 Marks --- **PAGE 47** 2(ai). Molar mass of Na S = 2 x 23 + 32 = 78 gmol   Molar mass of FeBr  = 56 + 3(79.9) = 295.5 gmol   Number of mole of Na S = Mass/Molar mass = 3.2/78 = 0.041 mol. Number of mole of FeBr  = Mass/Molar mass = 7.0/295.5 = 0.024 mol. From the balanced equation: 2 mols of FeBr  required 3 mols of Na S 0.024 mol of FeBr  will require 0.024 x 3/2 = 0.036 mol of Na S Therefore, the limiting reagent is FeBr . It is completely consumed. [1 Mark] (ii). From the balanced equation; 2 mols of FeBr  produced 1 mol of Fe S  0.024 mol of FeBr  will produce 0.024 x 1/2 = 0.012 mol of Fe S  Molar mass of Fe S  = 2 x 56 + 3 x 32 = 208 gmol   Mass of Fe S  produced = Number of mole x molar mass = 0.012 x 208 = 2.50g [2] (iii). % Yield = Actual Yield/Theoretical Yield x 100 = 1.92/2.50 x 100 = 76.8% [1 Mark] (b). Precipitation reaction is a reaction in which aqueous solution of two soluble compounds react together to form an insoluble solid called precipitate. [1 Mark] (ci). Accuracy is the degree of closeness of a measured value (or mean of set of measurements) to a standard or known value. Precision is the degree of closeness or agreement of two or more measurements of a quantity on the same instrument to one another. [1 Mark] (ii). Oxidation half equation: H O    O  + 2H  + 2e  Reduction half equation: MnO   + 4H  + 3e    MnO  + 2H O Multiply the oxidation half equation by 3 and reduction half equation by 2 & add 3H O    3O  + 6H  + 6e  [1 Mark] 2MnO   + 8H  + 6e    2MnO  + 4H O [1 Mark] Overall equation: 3H O  + 2MnO   + 2H    3O  + 2MnO  + 4H O [1 Mark] Total = 10 Marks --- **PAGE 48** **CHM 001: PHYSICAL CHEMISTRY** 3(ai). The half-life of a reaction is the time required for half of the initial concentration of a reactant to be used up in a chemical reaction. [1 Mark] (ii). Decay constant, proton/neutron ratio and half-life of the element. [1  Mks] (bi). Half-life, t  = 60 x 60 x 24 x 365 x 60 = 31,536,000 s The decay constant,   = 0.693/t  = 0.693/31536000 = 2.198 x 10   s   [2 Mark] (ii). Number of radioactive atoms, N = 0.001 g/60 gmol   x 6.023 x 10   atoms/mol = 1.00 x 10   atoms Activity, A =   x N = 2.198 x 10   x 1.0x10   = 2.198 x 10   decays/sec. [2 ] (ci). Entropy is a measure of the degree of randomness or disorderliness of a system. [1 Mark] (ii). Gibb's free energy is a thermodynamic function that is used to measure the maximum amount of work done in a thermodynamic system at constant temperature and pressure. [1 Mark] (iii). Enthalpy is the heat change that accompany a process at constant pressure.[1] 4(ai). [A]t = [A]    kt, where A is the reactant Unit of k = moldm  s   [1 Mark] (ii). ln[A]t = ln[A]    kt, where A is the reactant Unit of k = s   [  Mark] (b). Enthalpy of reactant,  HR = H(C=C) + H(Cl-Cl) + 4H(C-H) = 612 + 243 + 415 = +1270 kJ mol   Enthalpy of Product,  Hp = H(C-C) + 2H(C-Cl) + 4H(C-H) = 330 + 2H(C-Cl) + 415 = 745 + 2H(C-Cl)  HRxn =  Hp    HR 745 + 2H(C-Cl)   1270 =  129; 745 + 2H(C-Cl) = 1141   745 = 396 H(C-Cl) = 396/2 = 196 kJmol   Therefore, the bond dissociation enthalpy of C-Cl bond is 196kJmol  . [3 Mks] (c). ln k /k  = Ea/R x (1/T    1/T ) ln 12.64/4.2 = Ea/8.314 x (1/298   1/400) ln 3.01 = 1.099 = 0.000103 Ea Ea = 1.099/0.000103 = 0.000103Ea; Ea = 1.067 kJmol   [3 Marks] --- **PAGE 49** 5(ai). Electronegativity increases from left to right across the period due to an increase in effective nuclear charge and an increase in nuclear pull since the valence electrons also increases in the same shell. [1 Mark] (ii). Ionization energy decreases down the group due to an increase in the number of shells or energy level of electrons. Down the group, the electrostatic force of attraction between the nuclear charge and the electrons outside it increases since there is an increase in the distance between the nuclear charge and the valence electrons to be removed. [1 Mark] (iii). After the first ionization, the ion of alkali metals (M ) has a stable electronic configuration, (n-1)s  (n-1)p . To undergo the second ionization, the electron to be removed will be from the fully filled p-subshell which require high energy. [1 Mark] (b). After the first ionization, the ion of alkali metals (M ) has a stable electronic configuration, and has a completely filled shell. He is placed in group 18 because it has a stable electronic configuration (n-1)s  (n-1)p  ns  after undergoing first ionization has an unstable electronic configuration, (n-1)s  (n-1)p  ns  and the remaining electrons(s) to be removed and the nuclear charge. [1 Mark] For alkaline earth metals, their ions (M  ) after undergoing first ionization has an unstable electronic configuration, (n-1)s  (n-1)p  ns  and the remaining electrons shell require lesser energy to be removed compared to alkali metal ions. [1 Mark] Alkali metal solution in ammonia are conducting because the metals readily ionize in ammonia to form monopositive cations and both the cation and the electron are ammoniated by ammonia and conduct easily. [1 Mark] (iii). HF is the weakest acid compared to HCl, HBr and HI because the higher electronegativity of fluorine makes it to form a strong covalent bond with hydrogen thereby hindering the ease of deprotonation. More so, F  ion is a strong conjugate base compared to nitrogen, an ionic compound, calcium nitride is formed accordingly: Ca(s) + N (g)   Ca N (s) When calcium is treated with tetraoxosulphate (VI) acid, hydrogen gas is liberated and calcium sulphate is formed. [1 Mark] (d). Oxidation state of NH  = 0; oxidation state of CN =  1; oxidation number of Co be x. x + 0   2   1 + 2   2 = 0; x = +3 Oxidation number of Co is +3. Let oxidation number of Cl =  1; oxidation state of NO  =  1; oxidation state of Au = +2(0) + 2( 1)   1 + 2 + 2( 1) = 0 Total = 10 Marks --- **PAGE 50** 6(ai). [Co(H O) ]Cl  (ii). [Co(H O) Cl]Cl  (iii). [Co(H O) Cl ]Cl  (2 Marks) (b). [Co(NH ) ]Cl  [2 Mks] (c). [Co(NH ) Cl]Cl  [2 Mks] (d). [Co(NH ) Cl ]Cl [  Mark] [  Mark] [  Mark] [  Mark] (ii). YH = Ionic/saline hydride [1 Mark] ZH = Covalent hydride [2 Marks] HW = Covalent hydride; YH = Ionic/saline hydride [  Mark] H (g) + W (g)   2HW(g) [  Mark] 2X(s) + H (g)   2XH(s) [  Mark] (di). [Fe(OH)(NH ) Cl ]   (ii). [Fe(CN) (NH ) ]   7(ai). Thermoplastics are polymers that soften on heating and hardened on cooling while thermosets are polymers that hardened irreversibly when heated. [1 Mark] (ii). Natural polymers are polymers that exist in nature and are found in plants and animals while synthetic polymers are man-made polymers that are synthesized in the laboratory. [1 Mark] (iii). Addition polymers are polymers to form a single compound (polymer) without formation of a by-product while condensation polymers are polymers formed when large number of each of two different monomers combined together to form a compound of higher molecular weight (polymer) and a simple inorganic molecule as by-product. [1 Mark] (bi). Hydrolysis, dehydrohalogenation, dehalogenation, catalytic reduction, nitrile formation. (ii). Dehydrohalogenation: CH CHClCH    CH =CH  + Cl  Catalytic reduction: C H Cl + Zn/HCl   KBr + C H  Nitrile formation: C H Br + KCN   C H CN [1 Mark] (iii). CH I + KI/H O   CH OH + KCl [1 Mark] (ci). 2-Iodobutanamide (ii). 4-Chlorobenzoic acid (iii). Ethyl propanoate [1  Marks] (di). Alkynes are more polar than alkenes due to their higher electronegativity as a result of the presence of an additional pi-electron that is easily distorted thereby creating a stronger intermolecular attraction. [1 Mark] (ii). Benzene does not undergo addition reactions easily due to resonance effect since the 6 carbon atoms are arranged in ring planar with each C-atom having a sp  hybridization. Thus, it undergoes substitution reactions easily. [1 Mark] --- **PAGE 51** 8(a). A contains I ; B contains Cl  and; C contains Br  [1  Marks] (b). Cl  < Br  < I . [  Mark] (ci). 2-Butanol [1 Mark] (ii). But-1-ene and But-2-ene [2 Marks] (c). Specific activity, [ c]  is given as: [ c]  = cxl/ , where   is the specific rotation, T is the temperature in  C and   is the wavelength. From the question; [ c]  = cxl/  = 0.6 x 0.2/1.2 = 0.12/1.2 = +10    = +1.2 ; l = 0.2 dm; c = mass/volume = 600g/1000mL = 0.600 gmL  . [2 Marks] (di). C H CH OH [3 Marks] (ii). C H OOCH (iii). 4-hydroxy-4-methyl-2-pentanone Total = 10 Marks --- **PAGE 52   ANSWERS TO PRACTICAL QUESTIONS (2024)** **QUESTION 1: Quantitative Analysis** (ai) Titration with methyl orange indicator. | Burette readings (cm ) | 1st Titration (cm ) | 2nd Titration (cm ) | 3rd Titration (cm ) | |---|---|---|---| | Final Reading (cm ) | 14.00 | 27.80 | 41.60 | | Initial Reading (cm ) | 0.00 | 14.00 | 27.80 | | Titre value (cm ) | 14.00 | 13.80 | 13.80 | Average tire value = (13.80 + 13.80)/2 = 27.60/2 = 13.80 cm  [2 Marks] [  Mark] (ii). 2HX + Na CO    2NaCl + H O + CO  (bi). 200 cm  of B contains 1.08 g of Na CO  1000 cm  of B will contain 1.08 x 1000/200 = 1080/200 = 5.40 gdm   of Na CO  [1 Mark] Molar mass of Na CO  = 2x23 + 12 + 3x16 = 46 + 12 + 48 = 106 gmol  . [  Mk] Concentration of B (moldm  ) = Mass conc./Molar mass = 5.40/106 = 0.0509 moldm   [1 Mark] (ii). 1000 cm  of B contains 0.0509 mole of Na CO  25 cm  of B will contain 25 x 0.0509/1000 = 1.2725/1000 = 1.2725 x 10   mole of Na CO  Number of mole of B used in each titration is 0.0012725 mol [1 Mark] From the balanced equation of reaction, 1 mole of Na CO  reacted with 2 moles of HX 1.2725 x 10   mole of Na CO  will react with 1.2725 x 10   x 2/1 = 2.545 x 10   mol of HX Number of mole of HX in the average titre is 0.002545 mol. [1 Mark] 13.80 cm  of A contains 0.002545 mole of HX 1000 cm  of A will contain 1000 x 0.002545/13.80 = 2.545/13.80 = 0.1844 moldm   Concentration of B is 0.1844 moldm   [1 Mark] (iii). 1 cm  of A contains 1.25 g of an impure HX 1 cm  of A contains 36 x 1.25/100 = 0.45 g of pure HX 1000 cm  of A will contain 450 g of pure HX. C  = 450 gdm  , V  = 15 cm , C  = ?, V  = 1000 cm  C xV  = C xV  C  = C xV /V  = 450 x 15/1000 = 6750/10000 = 6.75 gdm   Mass of HX is 6.75 gm  . (iv). Molar mass of HX = Mass Conc./Molar Conc. = 6.75/0.1844 = 36.6 gmol   [1 Mark] --- **PAGE 53** HX = 36.6; 1 + X = 36.6; X = 36.6   1 = 35.6 Therefore, Relative atomic mass of X is 35.6 [1 Mark] Total = 10 Marks **QUESTION 2: Qualitative Analysis** | Test | Observation | Inference | |------|-------------|-----------| | (ai): P + heat | Sample decompose to give a colourless and alkaline gas with chocking smell. Gas forms white fumes with HCl gas [ ] | Gas is NH . White fumes of NH Cl. NH   ion present [ ] | | (ii): P + H O | Sample dissolves completely [ ] | Gas is ammonia from NH  . [ ] | | (iii): P solution + NaOH in drops and excess | Effervescence of a colourless gas with choking smell. Gas turns damp red litmus paper blue [ ] | | | (iv): P solution + dil. HCl + BaCl (aq) | White precipitate formed [ ] | Precipitate of BaSO . SO    ion confirmed [ ] | (v). Ions in sample P are NH   and SO   . [1 Mark] (vi). (NH ) SO (aq) + 2NaOH(aq)   Na SO (aq) + 2NH (g) + H O(l) [1 Mark] | Test | Observation | Inference | |------|-------------|-----------| | (bi): Q + water | Q dissolves completely [ ] | | | (ii): Q solution + NaOH(aq) in drops and excess | Green precipitate. Precipitate insoluble in excess NaOH [ ] | Precipitate of Fe(OH) . Fe   ion present [ ] | | (iii): P solution + NH (aq) in drops and excess | Green precipitate. Precipitate insoluble in excess NaOH. Precipitate turns brown on standing [ ] | Precipitate of Fe(OH) . Fe   ion present. Brown colour due to the formation ferric ion [ ] | | (iv): P solution + K Fe(CN) (aq) solution | Dark or Prussian blue [ ] | Precipitate of Fe[ Fe(CN) ](s). Fe   ion confirmed [1] | (c). The formula of the compound formed is Fe(NH ) (SO ) .6H O [1 Mark] Total = 10 Marks --- **PAGE 54   JUPEB 2023** **MULTIPLE CHOICE QUESTIONS: SCI-J153** 1. Properties of chlorine, bromine and their compounds are compared. Property Q for chlorine is smaller than for iodine. What is property Q? 2. Which of the following forms an amphoteric oxide? 3. Chlorine reacts with oxygen to give an oxide in which its oxidation state is +3, deduce the product of hydrolysis of the oxide and predict its acid-base character. 4. Using the valence bond model, determine the number of unpaired electrons in an sp d  hybridized Cr   metal complex. [Cr = 24] A. 2 B. 3 C. 4 D. 5 5. Which of the following metals does NOT form stable trioxocarbonate (IV)? 6. Which of the following is NOT possible? I. Formation of metal hydroxide by reacting BeO(s) and H O(l). II. Reduction of halogens with Be to form ionic halides. III. Reaction of potassium with excess oxygen to form potassium superoxide. 7. In which of the following physical properties are the values for group 2 metals higher than the corresponding group 1 metal? (I) Hardness (II) Density (III) Boiling point 8. Hydrogen can be prepared from the following laboratory methods EXCEPT 9. [Ni(CN) ]   and Ni(CO)  are both diamagnetic species. Deduce the structures of both compounds. --- **PAGE 55** 10. Which of the options is the correct product of the reaction: CH CH CH CH MgBr + H O   Organic product 11. Methanol, ethane and ethylacetate are solvents used in chromatography to separate constituents based on different 12. The addition of a small amount of a non-volatile solute to a solvent 13. The exact location and momentum of an electron can be determined at the same time. This is the statement of: 14. Which of these will have the smallest dimensions? 15. In acid-base titrations, sodium hydroxide is not an ideal primary standard because it A. absorbs moisture from the atmosphere B. is a strong base 16. The shell which is closest to the nucleus has principal quantum number of 17. Bromine reacts with dilute alkali as shown below: 3Br (aq) + 6OH (aq)   BrO  (aq) + 5Br (aq) + 3H O(l) The reaction is a 18. Which salt would dissolve in water to give an acidic solution? 19. What atomic property explains the reason why the first ionization energies of elements decrease down the group from lithium to rubidium? 20. In the given equations, water can be described as: (i) HCl + H O   H O  + OH  (ii) NH  + H O   NH   + OH  --- **PAGE 56** 21. The structure of a metal having coordination number 12 with four atoms per unit cell is 22. The primary and secondary valences of the iron in the complex, Na [Fe(CN) ], are 23. A system that is operated at constant heat is said to be 24. What reaction occurs at the anode during the electrolysis of brine using the diaphragm cell? 25. What is the E cell of MnO /Mn  //Cr/Cr   cell is E MnO2 = +1.28 V and E Cr = 0.74 V? 26. How many chiral centres can be found in 2-nitro-4-dibromo-5-hydroxyhexanoic acid? 27. The order of reactivity towards a nucleophilic reaction is 28. The reaction between steam and heated magnesium metal produces compound X and hydrogen. Which of the options is NOT a property of compound X formed? 29. Identify the species in which the underlined atom has an incomplete outer shell? 30. When a solution of potassium fluoride and strontium nitrate are mixed together, which of the following anion-cation combination will result in a precipitate? 31. For the reaction 2B(g) = C(g); which of the following will favour forward reaction? --- **PAGE 57** 32. Which of the following best accounts for why SO  molecule has a dipole? 33. What weight of sodium hydroxide is required to make 500 cm  of 0.2 M solution? 34. How many milligrams of NaOH are required to react with 50 mL of 0.35 M HNO ? 35. Carbon reacts with steam according to the equation below: H O(g) + C(s)   H (g) + CO(g) The correct unit for the equilibrium expression (Kc) derived from the equation is given as: 36. The name of this compound is HC C CH  CH  37. The alcohol obtained from the production of soap is 38. A polymerization reaction is one in which 39. What is the hybridization of carbons in propane? 40. Determine the IUPAC name of the compound [Co(en) ]Cl . 41. 2-phenylehanol is refluxed with K Cr O /H  to give product Y which is 42. What are the strongest attractive forces that must be overcome to vapourize CaCl  and liquid Cl  respectively? 43. The order of reaction is equal to the molecularity in all --- **PAGE 58** 44. Electrolytes are substances that conduct electric current by movement of 45. Boyle's law states that 46. How many counter ions rae there in the coordination compound [Co(NH ) Cl]Cl ? 47. What is the order of increasing dispersion forces in the following halogens? 48. Which of the following nitrile/alcohol would give the same carboxylic acid when hydrolysed/oxidized respectively? 49. How many functional groups are in the compound 2-hydroxyglycine? 50. The IUPAC name of the structure below is CH CHC CCH Cl (with CH  branch) --- **ESSAY QUESTIONS (2023)** **CHM 001: GENERAL CHEMISTRY** 1(ai). 2.21 g of calcium is reacted with dilute hydrochloric acid, to give 6.15 g of anhydrous metal chloride. Find the empirical formula of the chloride. [3 Marks] (b). What are the oxidation numbers of nitrogen in the following compounds? (i). Dinitrogen oxide (ii). Sodium nitrite (ii). Dinitrogen trioxide (N O ). [3] (c). Use the balanced equation of reaction of disproportionation of chlorine gas with water to: (i). explain disproportionation of chlorine; [2 Marks] (ii). find the oxidation number of oxygen in sodium peroxide (Na O ) and caesium superoxide (CsO ). [1 Mark] 2(ai). List any 2 atomic properties and state their trends in the periodic table. 2 Marks (ii). State *Periodic law*. [1 Mark] --- **PAGE 59** (bi). Define the term *Standard solution*. Mention one other application of standard solution. [1 Mark] (ii). Differentiate between empirical and molecular formula. Name one other application of standard solution. [2 Mks] (iii). An organic compound J is known to contain carbon, hydrogen and oxygen only. When burnt completely in excess oxygen, carbon dioxide and water are given out as the only products. It is found that 0.46 g of J gives 0.88 g of carbon dioxide and 0.54 g of water. Find the empirical formula of compound J. [4] Total = 10 Marks 3(ai). State Hess' law of enthalpy summation. [1 Mark] (ii). Hydrogen sulphide, H S, is a poisonous gas with the odour of rotten eggs. The chemical formula that describes atoms in a molecule of a compound. Use Hess' law to obtain the enthalpy change for this reaction for the formation of H S from the element is: H (g) +  S (rhombic)   H S(g).  H =  297 kJmol   [2  Mks]  S (rhombic)   H S(g) +  O (g)   SO (g).  H =  242 kJmol   H S(g) +  O (g)   H O(g) + SO (g)  H =  518 kJmol   [1 Mark] **CHM 002: PHYSICAL CHEMISTRY** 4(a). What do you understand by the term \"Standard enthalpy of combustion\"? (b). Complete the following reactions: (i).     Na +     Mg + ? (ii).   Cu    e + ? (iii).      Pd + ?        Ag +  P (iv).    B +   He      N + ? (v). Uranium has an atomic weight of 236 and a half-life of 4.5 x 10  years. Calculate the number of disintegrations produced per year from 1 g of uranium. [3 Total = 10 Marks (b). A sample of butane gas, measured at 25 C and 98 kPa having a volume of 200 cm , was completely burnt. The heat produced during this experiment, calculate the mass of water by 14.4 C. (i). Assuming no heat losses occurred during this experiment, calculate the mass of water by 14.4 C. (ii). Determine the amount of heat released if the specific heat capacity of water is 4.2 JKg  . (iii). Calculate the standard enthalpy of combustion of butane. [4  Marks] --- **PAGE 60** (c). Given that 0.153 g of dichloromethane displaced 45 cm  of air at 20 C and 100.7 kNm   pressure. If at 20 C, the saturated vapour pressure of water is 2.319 kNm  , calculate the relative molecular mass of the dichloromethane [4 ] Total = 10 Marks **CHM 003: INORGANIC CHEMISTRY** 5(a). Define the following: (i). A ligand (ii). the coordination number of the complex ion. (b). Given the complex ion [Cu(NH ) ]  : (i). What is the coordination number of the complex ion? (ii). Give the IUPAC name of the complex ion? (iii). What is the oxidation state of the central metal ion? (iv). What is the shape of the complex ion? (c). Iodine, bromine and chlorine belong to Group 17 of the periodic table. Describe the reason(s) why iodine, bromine is a liquid and chlorine is a gas. [2 Marks] (d). Explain why the alkaline earth metals are harder and have higher melting point than alkali metals? 6(ai). Why do halogens form interhalogen compounds? (ii). Give four (4) examples of interhalogen compounds. (b). Suggest reasons for the following: (i). Ionization energy of manganese (Mn) is greater than that of aluminium (Al). (ii). Ionization energy increases across the period on the periodic table. (iii). Compounds of Sc   and Zn   are mostly white while those of Sc   and Cu   are coloured. [4  Marks] (c). Mention two (2) greenhouse gases and give a source of each gas. [3 Marks] Total = 10 Marks **CHM 004: ORGANIC CHEMISTRY** 7(a). Draw the structures of three (3) isomers of C H O. (b). The chlorination of methane can be achieved through a free radical reaction. Write a balanced equation for each stage. (c). Write balanced reaction equations using structural formulae, for the reaction of propene with: (i). Br  (ii). hydrogen bromide (iii). H O (iv). H  (with catalyst). [2 ] d(i). Given the reaction scheme below: CH =CHCH COOH + H /Ni   X + C H OH/H    Y Write the chemical formulae and names of compounds X and Y. (ii). Give the name of the reactions producing X and Y respectively. [3 Marks] Total = 10 Marks --- **PAGE 61** 8(ai). Give the names of the first and last carbon atoms. CH =CHCHCH COOH [1 Mark] (ii). Give the names of the following compounds and the hybridization pattern in first and last carbon atoms. [2 Marks] (b). Using butanal and 2-butanone as examples, what type of isomerism is exhibited by these two classes of organic compounds? (ci). Aldehydes and ketones are important class of organic compounds. [2 Marks] (ii). Using butanal and 2-butanone as examples, what type of isomerism is exhibited? (iii). Give two (2) differences between condensation polymerization and addition polymerization. (iv). Define the term *polymerization*. [2  Marks] (d). Using appropriate examples, describe a chemical test to distinguish between a reducing sugar and a non-reducing sugar. [2 Marks] **PRACTICAL QUESTIONS (2023)** **Question 1: QUANTITATIVE ANALYSIS** You are provided with the following: Solution A containing 1.83 g of HCl in 500 cm  of solution. Solution B: a saturated solution of an alkaline earth metal hydroxide, M(OH)  prepared at 298 K containing 0.71 g of salt at 1 dm  solution. **Procedure:** (i). Pipette 25 cm  portion of solution B into a conical flask. Add 2 drops of methyl orange indicator and titrate against solution A from the burette and to an orange end point. (ii). Solution A containing 1.83 g of HCl in 500 cm  of solution. (iii). Methyl orange indicator. Repeat the procedure above twice, using fresh portions of solution B. **Calculate:** (i). concentration of HCl in solution A in moldm  ; (ii). the average titre; (iii). Write a balanced equation for the reaction. (iv). Calculate the average titre; (v). the number of moles of A in the average titre; (vi). concentration of B used in each titration; (vii). the number of moles of B used in each titration; (viii). the molar concentration of M(OH)  in solution B; (ix). the solubility of M(OH)  at 298 K and; (x). the relative atomic mass of M. --- That completes the transcription of all 20 images (pages 41 61), covering JUPEB 2024 and 2023 questions and answers across all four chemistry courses. Here is the full transcription of the next batch of pages: --- --- You are provided with sample **C**, a mixture of two inorganic salts. Perform the following tests, record your observations and deduce the appropriate inference. Present your report in a tabular form. (a). To 0.5 g of C in a test tube, add 5 cm  of water. Shake and filter the solution if necessary. (b). To 1 cm  of the solution in (a), add two drops of acetic acid followed by freshly prepared solution of cobalt nitrite. (c). To 1 cm  of the solution in (a), add 0.5 cm  of dilute HNO  followed by 1 cm  of AgNO  solutions. (d). To the mixture in (c), add dilute ammonia solution. (e). To 1 cm  of the solution in (a), add dilute ammonia solution followed by NH Cl. (f). Filter the mixture in (e) and add dilute HCl to the residue followed by excess ammonia solution. (g). Identify a possible salt present in the mixture. --- 1. C 2. A 3. B 4. B 5. None of the options 6. A 7. D 8. B 9. B 10. A 11. A 12. C 13. B 14. B 15. A 16. C 17. D 18. B 19. D 20. D 21. C 22. A 23. A 24. D 25. C 26. C 27. A 28. A 29. D 30. C 31. D 32. D",
      options:[
            {label:"A", text:"I and III only"},
          {label:"C", text:"I, II and III"},
          {label:"B", text:"II, IV and VI only"},
          {label:"D", text:"I, III and V."}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2024-p0004",
      subject:"chemistry",
      year:2024,
      category:"practical",
      question:"Which of these properties are applicable to a nucleophile or a potential source of one? They are organic reagents which may be: I. positively charged II. negatively charged. III. neutral but possess a central atom which is electron deficient. IV. neutral but possess a central atom with lone pair(s) of electrons. **Answer: II and IV** *End of Pages 21 40 transcription.* Here is the transcribed text from all 20 images: **PAGE 41** V. neutral but can polarize and attack a substrate with its positive end. VI. neutral but can polarize and attack a substrate with its negative end. 48. The IUPAC name of the compound with the structural formula CH C(CH )=CHCH  is 49. Which of the following reactions will not give secondary alcohol as product? 50. The product of the reaction of acid chloride with aliphatic or aromatic hydrocarbons in the presence of a Lewis acid is **ESSAY QUESTIONS (2024)** **Answer FOUR Questions; ONE from each Course** **CHM 001: GENERAL CHEMISTRY** 1(a). Define the following terms and state their units in each case: (i). molality (ii). molarity [2 Marks] (b). What is the frequency and wavelength of a photon emitted during transition of hydrogen atom from the n  = 5 state to the nf = 2 state? [R  = 2.18 x 10   J; h = 6.626 x 10    Js; c = 3.0 x 10  ms  ] [3 Marks] (c). State whether a reaction will occur or not among the following pairs, and write the molecular, total ionic, net ionic equations where applicable: (i). Sodium sulphate (Na SO ) solution + strontium nitrate (Sr(NO ) ) solution. (ii). Ammonium perchlorate (NH ClO ) solution and sodium bromide (NaBr) solution. [3 Marks] (d). Determine the oxidation number of zinc in the following compounds: (i). Zn(NH ) SO  (ii). [Zn(NH ) Cl]   [2 Marks] 2(a). 7.0 g of FeBr  were mixed with 3.2 g of Na S in solution according to the following equations: 2FeBr (aq) + 3Na S(aq)   Fe S(s) + 6NaBr(aq) (i). Which reagent is limiting? (ii). How much in g of Fe S  would be formed? (iii). If the mass of Fe S  after washing and drying is 1.92 g, calculate its percentage yield. [Fe = 56, Br = 79.9, Na = 23, S = 32] [4 Marks] [1 Mark] (b). What is meant by the term precipitation reaction? **PAGE 42** (ci). Differentiate between accuracy and precision. [1 Mark] (ii). Balance the redox reaction below in basic medium. H O  + MnO     O  + MnO  [4 Marks] **CHM 002: PHYSICAL CHEMISTRY** 3(ai). What is meant by the term half-life of a radioactive element? (ii). State any three (3) parameters that can be used to determine the stability of nuclides. [2  Marks] (b). Given that the half-life of cobalt-60 is 6.0 years, calculate the (i). decay constant in per seconds. (ii). activity of a 1.0 mg sample of cobalt-60. [4  Marks] (c). Define the following thermodynamic terms: (i). entropy (ii). Gibb's free energy (iii). enthalpy [3 Marks] (d). State the expressions for the integrated law and the unit of the rate constant for: (i). zeroth-order reaction (ii). first-order reaction [3 Marks] 4(a). State the expressions for the integrated law and the unit of the rate constant (b). The enthalpy change for the reaction: C H  + Cl    C H Cl  is -129 kJmol  . Given the following bond energy values: [1 Mark] | Bond | C-C | C=C | C-H | Cl-Cl | C-Cl | |------|-----|-----|-----|-------|------| | Bond Energy (kJ/mol) | +330 | +612 | +415 | +243 | +338 | Determine the bond energy for the C-Cl bond. [3 Marks] (c). The rate constant for the reaction A (g) + B (g)   2AB(g) are 4.2 dm  mol   sec at 298 K and 12.64 dm  mol   sec at 400 K. Calculate the activation energy Ea for this reaction. [R = 8.314 J mol   K  ] [3 Marks] (d). What conditions often make non-ideal solutions to show positive deviation from the Raoult's law? [1 Mark] **CHM 003: INORGANIC CHEMISTRY** 5(a). Give a reason for each of the following: (i). electronegativity increases from left to right in the periodic table. (ii). Ionization enthalpy decreases in group from top to bottom. (iii). Helium has electronic configuration of 1s  but it is placed in p-block in group 18. [3 Marks] (b). Account for why: (i). the second ionization enthalpy of alkali metals is higher than that of alkaline earth metals. (ii). the solution of alkali metals in ammonia is conducting in nature. (iii). HF is the weakest acid among haloacids in spite of the fact that F is the most electronegative. [3 Marks] **PAGE 43** (c). Using appropriate chemical equations, show what happens when calcium is treated with: (i). nitrogen (ii). dilute tetraoxosulphate (VI) acid. [2 Marks] (d). What is the oxidation state of Co in the complex [Co(NH ) (NO )Cl][Au(CN) ]? [2 Marks] 6(a). Write the correct formula for the following compounds: (i). CrCl .6H O (violet, with three chloride ions/units in the formula). (ii). CrCl .6H O (light green, with two chloride ions/units in the formula). [3 Marks] (iii). CrCl .6H O (dark green, with one chloride ions/units in the formula). [3 Marks] (b). Arrange the following complexes in order of increasing electrical conductivity: [Co(NH ) Cl ], [Co(NH ) Cl]Cl , [Co(NH ) ]Cl , [Co(NH ) Cl ]Cl [2 Marks] (c). Hydrogen forms compounds with elements W, X, Y and Z having atomic numbers 9, 11, 12 and 17 respectively. (i). Write a balanced chemical equation for the formation of each of the compounds in (c) above. [3 Marks] (ii). What type of hydride is each of the compounds formed by Fe   with the following compounds in (ci) above. [3 Marks] (iii). Write the formula of the complexes formed by Fe   with the following ligands: (i). one hydroxyl ion, two ammonia molecules and three chloride ions (ii). three cyanide ions and three ammonia molecules. [2 Marks] **CHM 004: ORGANIC CHEMISTRY** 7(a). Differentiate between the following sets of terms: (i). thermoplastics and thermosets. [3 Marks] (ii). addition and condensation polymers. (iii). natural and synthetic polymers. [3 Marks] (bi). List the characteristic reactions that alkyl halides undergo. (ii). Give one equation each for the reactions listed in (bi) above. (iii). Write the equation to show the reaction of methyl iodide with aqueous potassium iodide. [3  Marks] (c). Give the IUPAC nomenclature of the following compounds: (i). CH CHICONH  (ii). ClC(C H )COOH (iii). CH CH COOCH CH  [1  Marks] (d). Give reasons for the following observations: (i). alkynes generally have higher boiling points than corresponding alkenes. (ii). benzene readily undergo substitution reactions instead of addition reactions. [2 Marks] 8(a). Sodium hydroxide solution was mixed in three different vessels A, B and C containing haloalkanes. The mixture was acidified with dilute nitric acid. The precipitate obtained in vessels A, B and C were yellow, white and pale yellow respectively. **PAGE 44** (i). Identify the halide ions present in each vessel. (ii). Arrange the halide ions in their order of increasing reactivity. [2 Marks] (b). Consider the reaction below: CH CHCICH +KOH/C H OH   A + B [3 Marks] (i). Draw the structure and give the names of A and B without the alcohol? (ii). What product will be formed if the reaction proceeds without the alcohol? (c). Calculate the specific activity of a 600 g sample of organic compound per +1.2  at sodium D-line. [3 Marks] (d). Give the major products of the following reactions: (i). C H COCl + LiAlH    ? (ii). C H CONH  + NaOH   ? [2 Marks] (iii). CH COCH  + CH COCH    ? [3 Marks] **PRACTICAL QUESTIONS (2024)** **Question 1: QUANTITATIVE ANALYSIS** You are provided with the following solutions: A is a solution containing 15.00 cm  concentrated acid, HX, in 1.0 dm  of solution (36% pure and 1.25 g/cm  density). B is a solution that contains 1.08 g of sodium trioxocarbonate (IV), Na CO  in 200 cm  of solution. **Procedure:** (a). Pipette 25 cm  portion of solution B into a clean conical flask, add 2 or 3 drops of methyl orange indicator and titrate against solution A from the burette. (i). Tabulate your readings and obtain the average value of acid used in the titration. (ii). Write a balanced chemical equation for the reaction. (b). From the information given and your titre value, determine: (i). Molar concentration of Na CO  in solution B; (ii). Mole of the acid, HX per dm  of solution A; (iii). Mass of HX in g/dm ; (iv). Relative atomic mass of X. (v). What will be the colour change at the end point if phenolphthalein is used for the titration? (vi). Assume that 1.2 g of impure Na CO  in 1 dm  of solution",
      options:[
            {label:"A", text:"I and III only C. I, II and III"},
          {label:"B", text:"II, IV and VI only D. I, III and V."},
          {label:"A", text:"2-methylbut-1-ene C. 2-ethylbut-1-ene"},
          {label:"B", text:"2-methylbut-2-ene D. 2-ethylbut-2-ene"},
          {label:"A", text:"Reaction of ketone with LiAlH "},
          {label:"B", text:"Reaction of Grignard reagent with ethanal."},
          {label:"C", text:"Reaction of Grignard reagent with methanol."},
          {label:"D", text:"Acid catalysed hydration of propene."},
          {label:"A", text:"aldehyde B. ketone C. acid D. alcohol"},
          {label:"A", text:"Oxidizing ability of the elements. C. Van der waal's force"},
          {label:"B", text:"Solubility of the silver halides in NH (aq)."},
          {label:"D", text:"Thermal stability of the hydrogen halides."},
          {label:"A", text:"Al B. C C. Mg D. Rb"},
          {label:"A", text:"HClO    Acidic B. HClO    Acidic"},
          {label:"C", text:"Cl(OH)    Basic D. Cl O    Basic"},
          {label:"A", text:"Fe B. Zn C. Pb D. Al"},
          {label:"A", text:"I and II only B. II and III only C. I, II and III D. III only."},
          {label:"A", text:"I only B. III only C. I and III only D. I, II and III"},
          {label:"A", text:"action of zinc on dilute acids C. action of sodium on steam"},
          {label:"B", text:"action of sodium on potassium hydride D. electrolysis of water"},
          {label:"A", text:"[Ni(CN) ]   is tetrahedral and Ni(CO)  is square planar"},
          {label:"B", text:"[Ni(CN) ]   is square planar and Ni(CO)  is tetrahedral"},
          {label:"C", text:"both species are square planar"},
          {label:"D", text:"both species are tetrahedral"},
          {label:"A", text:"CH CH CH CH  B. CH CH CH CH OH"},
          {label:"C", text:"CH CH CH CH MgOH D. CH CH CH CH OBr"},
          {label:"A", text:"solubilities B. boiling points C. refractive indices D. adsorptions"},
          {label:"A", text:"decreases the boiling point B. increases the vapour pressure"},
          {label:"C", text:"decreases the freezing point D. decreases the osmotic pressure"},
          {label:"A", text:"Hund's rule B. Heisenberg's uncertainty principle"},
          {label:"C", text:"Pauli's exclusion principle D. (n + l) rule"},
          {label:"A", text:"Nanotube B. Nanodots C. Nanontods D. Nanoplates"},
          {label:"C", text:"ionizes in aqueous medium D. reacts very slowly with acids"},
          {label:"A", text:"3 B. 2 C. 1 D. 0"},
          {label:"A", text:"decomposition reaction C. neutralization reaction"},
          {label:"B", text:"precipitation reaction D. disproportionation reaction"},
          {label:"A", text:"NaNO  B. NH Cl C. Na CO  D. (NH ) CO "},
          {label:"A", text:"The repulsion between spin-paired electrons decreases."},
          {label:"B", text:"The outer electrons are in 's' subshell."},
          {label:"C", text:"The nuclear charge of the elements increases down the group."},
          {label:"D", text:"The shielding effect of the inner shells increase down the group."},
          {label:"A", text:"basic B. acidic C. neutral D. amphoteric"},
          {label:"A", text:"body centred cubic B. cubic closed pack"},
          {label:"C", text:"face centred cubic D. hexagonal closed pack"},
          {label:"A", text:"+2 and 6 respectively B. -2 and 4 respectively"},
          {label:"C", text:"+3 and 10 respectively D. +2 and 4 respectively"},
          {label:"A", text:"adiabatic B. isobaric C. isothermal D. isosmotic"},
          {label:"A", text:"Hydroxide ions are produced B. Hydrogen gas is liberated"},
          {label:"C", text:"Chloride ions are oxidized D. Chlorine gas is produced"},
          {label:"A", text:"4.58 V B. 3.10 V C. 2.02 V D. 0.54 V"},
          {label:"A", text:"+1 B. 4 C. 2 D. 3"},
          {label:"A", text:"acid chloride > acid anhydride > acid > ester > amide"},
          {label:"B", text:"acid chloride > acid > acid anhydride > ester > amide"},
          {label:"C", text:"acid chloride > acid anhydride > acid > amide > ester"},
          {label:"B", text:"acid anhydride > acid > acid chloride > ester > amide"},
          {label:"A", text:"It has high solubility in water. B. It is a white solid"},
          {label:"C", text:"It is basic in character D. It has a molecular mass of 40.3"},
          {label:"A", text:"H O  B. F O C. CH   D. BF "},
          {label:"A", text:"K /NO   B. Sr  /NO   C. Sr  /F  D. K /F "},
          {label:"A", text:"Addition of C B. Removal of B"},
          {label:"C", text:"Decrease in volume of container D. Decrease in volume of container"},
          {label:"A", text:"The electronegativity difference S and O. C. The molecule is liner."},
          {label:"B", text:"The greater size of S compared to O. D. The molecule is bent."},
          {label:"A", text:"40 g B. 20 g C. 15 g D. 4 g"},
          {label:"A", text:"700 B. 175 C. 17.50 D. 1.75"},
          {label:"A", text:"dm mol   B. moldm  C. mol mol   D. no unit"},
          {label:"A", text:"1-butene B. 1-butyen C. propyne D. acetylene"},
          {label:"A", text:"methanol B. glycerol C. ethanol D. propanol"},
          {label:"A", text:"atoms form molecules B. molecules form volatile compounds"},
          {label:"C", text:"small molecules from giant molecules D. a molecule rearranges itself"},
          {label:"A", text:"sp B. sp  C. sp  D. sp "},
          {label:"A", text:"Tri(ethylenediamine)cobalt(II)chloride"},
          {label:"B", text:"Tris(ethylenediamine)cobalt(II)dichloride"},
          {label:"C", text:"Tris(ethylenediamine)cobalt(II)chloride"},
          {label:"D", text:"Tri(ethylenediamine)cobalt(II)chlorine"},
          {label:"A", text:"C H COCH  B. C H CH CHO C. C H CH COOH D. C H CH COCH "},
          {label:"A", text:"Metallic bonds and dispersion forces"},
          {label:"B", text:"Dipole-dipole and dispersion forces"},
          {label:"C", text:"Ionic bonds and dispersion forces"},
          {label:"D", text:"Ionic bonds and dipole-dipole interactions"},
          {label:"A", text:"bimolecular reactions B. elementary reactions"},
          {label:"C", text:"unimolecular reactions D. complex reactions"},
          {label:"A", text:"electrons B. voltage C. ions D. electrodes"},
          {label:"A", text:"PV = nRT B. V   T C. PV/T = constant D. V   1/P"},
          {label:"A", text:"1 B. 2 C. 5 D. 6"},
          {label:"A", text:"I  < Br  < Cl  < F "},
          {label:"B", text:"F  < Cl  < Br  < I "},
          {label:"C", text:"Br  < I  < Cl  < F "},
          {label:"D", text:"I  < Br  < F  < Cl "},
          {label:"A", text:"CH CH CN / CH CH OH"},
          {label:"B", text:"C H CH CN/C H CH CH OH"},
          {label:"C", text:"C H CH(CH )CN/C H CH CH(OH)CH "},
          {label:"D", text:"(CH ) CHCN / (CH ) COH"},
          {label:"A", text:"4 B. 2 C. 3 D. 1"},
          {label:"A", text:"1-Chloro-4-methylpent-3-ene B. 1-Chloro-2-methylpent-2-ene"},
          {label:"C", text:"5-Chloro-2-methylpent-3-yne D. 5-Chloro-2-methylpent-3-yne D. 1"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0001",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The ratio of the absolute error in measurement to the expected true value defines the:",
      options:[
            {label:"A", text:"relative error B. mean error C. absolute error D. random error"},
          {label:"A", text:"relative error"},
          {label:"B", text:"mean error"},
          {label:"C", text:"absolute error"},
          {label:"D", text:"random error"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0002",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Which element of group 16 cannot form a compound of the type XF?",
      options:[
            {label:"A", text:"Selenium"},
          {label:"B", text:"Sulphur"},
          {label:"C", text:"Oxygen"},
          {label:"D", text:"Tellurium"}
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0003",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The gas heavier than air is:",
      options:[
            {label:"A", text:"pure N  B. pure Cl  C. moist air D. moist H "},
          {label:"A", text:"pure N "},
          {label:"B", text:"pure Cl "},
          {label:"C", text:"moist air"},
          {label:"D", text:"moist H "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0004",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"What is the atomic mass of a triatomic elementary gas with a vapour density of 48?",
      options:[
            {label:"A", text:"48 B. 96 C. 32 D. 16"},
          {label:"A", text:"48"},
          {label:"B", text:"96"},
          {label:"C", text:"32"},
          {label:"D", text:"16"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0005",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"In the equation: xNH  + yH O   zNO + wH O. If x is 2, then y, z and w are:",
      options:[
            {label:"A", text:"5/2, 4, 6 B. 5/2, 2, 3 C. 3, 2, 4 D. 2, 4, 6"},
          {label:"A", text:"5/2, 4, 6"},
          {label:"B", text:"5/2, 2, 3"},
          {label:"C", text:"3, 2, 4"},
          {label:"D", text:"2, 4, 6"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0006",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"What type of reaction can convert alkyl halide into an alcohol?",
      options:[
            {label:"A", text:"Addition B. Elimination C. Substitution D. Hydrolysis"},
          {label:"A", text:"Addition"},
          {label:"B", text:"Elimination"},
          {label:"C", text:"Substitution"},
          {label:"D", text:"Hydrolysis"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0007",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"In a measurement, significant figures include:",
      options:[
            {label:"A", text:"Only the digits before the decimal point"},
          {label:"B", text:"Only the non-zero digits"},
          {label:"C", text:"Only the digits after the decimal point"},
          {label:"D", text:"All certain digits and the first uncertain digit"}
          ],
      correctAnswer:"D",
      explanation:"Significant figures in a measurement consist of all the digits that are known with certainty, plus one final digit that is estimated or uncertain.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0008",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The rate constant does not depend on:",
      options:[
            {label:"A", text:"temperature B. concentration C. presence of catalyst D. nature of reactants"},
          {label:"A", text:"temperature"},
          {label:"B", text:"concentration"},
          {label:"C", text:"presence of catalyst"},
          {label:"D", text:"nature of reactants"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0009",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"What is the principle that allows the use of mass spectrometry in determination of the molecular weight of a compound?",
      options:[
            {label:"A", text:"The absorption of electromagnetic radiation"},
          {label:"B", text:"The mass-to-charge ratio of ions"},
          {label:"C", text:"The resonance frequency of nuclei in a magnetic field"},
          {label:"D", text:"The diffraction of electrons by a crystal lattice"}
          ],
      correctAnswer:"B",
      explanation:"Mass spectrometry works by ionizing molecules and then separating the resulting ions based on their mass-to-charge ratio (m/z), which allows for the determination of molecular weight.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0010",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Which of the following is not true about ionization energy?",
      options:[
            {label:"A", text:"It is the energy required to remove an electron from an atom"},
          {label:"B", text:"It generally increases down a group"},
          {label:"C", text:"It generally increases across a period"},
          {label:"D", text:"It decreases across a period from left to right"}
          ],
      correctAnswer:"D",
      explanation:"Ionization energy actually increases across a period from left to right due to the increase in effective nuclear charge, which holds electrons more tightly.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0011",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"In terms of Lewis concept, an acid and a base is a/an:",
      options:[
            {label:"A", text:"Proton donor and proton acceptor respectively"},
          {label:"B", text:"Electron pair acceptor and electron pair donor respectively"},
          {label:"C", text:"Hydroxide ion producer and proton producer respectively"},
          {label:"D", text:"Electron pair donor and electron pair acceptor respectively"}
          ],
      correctAnswer:"B",
      explanation:"According to the Lewis concept, an acid is a species that can accept an electron pair, while a base is a species that can donate an electron pair.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0012",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Which of the following will affect the equilibrium position of the reaction?",
      options:[
            {label:"A", text:"Addition of a catalyst"},
          {label:"B", text:"Addition of an inert gas at constant volume"},
          {label:"C", text:"Use of a different reaction vessel"},
          {label:"D", text:"Change in concentration, temperature, or pressure"}
          ],
      correctAnswer:"D",
      explanation:"According to Le Chatelier's Principle, the equilibrium position of a system is shifted by changes in concentration, temperature, or pressure (for gaseous reactants/products). Catalysts only increase the rate of reaction without shifting the equilibrium.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0013",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Identify the option which contains the highest number of atoms:",
      options:[
            {label:"A", text:"71 g of chlorine B. 48 g of magnesium C. 127 g of iodine D. 4 g of hydrogen"},
          {label:"A", text:"71 g of chlorine"},
          {label:"B", text:"48 g of magnesium"},
          {label:"C", text:"127 g of iodine"},
          {label:"D", text:"4 g of hydrogen"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0014",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"In which of the following species is sp hybrid orbitals NOT involved?",
      options:[
            {label:"A", text:"BeCl2"},
          {label:"B", text:"H2O"},
          {label:"C", text:"C2H2"},
          {label:"D", text:"CO2"}
          ],
      correctAnswer:"B",
      explanation:"In H2O, the oxygen atom is sp3 hybridized. In BeCl2, C2H2, and CO2, the central atoms utilize sp hybridization.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0015",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"If 2.5 L of a sample of a gas at 27  C and 1 bar pressure is compressed to a volume of 500 ml at constant temperature, what is the percentage increase in pressure?",
      options:[
            {label:"A", text:"100 % B. 400 % C. 500 % D. 80 %"},
          {label:"A", text:"100 %"},
          {label:"B", text:"400 %"},
          {label:"C", text:"500 %"},
          {label:"D", text:"80 %"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0016",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The formula for washing soda is:",
      options:[
            {label:"A", text:"Na CO  B. Na CO .10H O C. Na CO .3H O D. Na CO .7H O"},
          {label:"A", text:"Na CO "},
          {label:"B", text:"Na CO .10H O"},
          {label:"C", text:"Na CO .3H O"},
          {label:"D", text:"Na CO .7H O"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0017",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Synthesis gas is a mixture of:",
      options:[
            {label:"A", text:"steam and CO B. CO and N  C. H  and CO D. H  and CH "},
          {label:"A", text:"steam and CO"},
          {label:"B", text:"CO and N "},
          {label:"C", text:"H  and CO"},
          {label:"D", text:"H  and CH "}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0018",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"If the half-life of a radioactive nuclide is 24 hours. What time will be required for 12.5 % of its original amount to remain?",
      options:[
            {label:"A", text:"1 day B. 2 days C. 3 days D. 4 days"},
          {label:"A", text:"1 day"},
          {label:"B", text:"2 days"},
          {label:"C", text:"3 days"},
          {label:"D", text:"4 days"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0019",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"For exothermic reactions to be spontaneous, the temperature should be:",
      options:[
            {label:"A", text:"high B. 0  C C. low D. 373 K"},
          {label:"A", text:"high"},
          {label:"B", text:"0  C"},
          {label:"C", text:"low"},
          {label:"D", text:"373 K"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0020",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The mixing of atomic orbitals at different energy levels to form hybrid orbitals is known as:",
      options:[
            {label:"A", text:"isomerization B. hybridization C. delocalization D. cyclization"},
          {label:"A", text:"isomerization"},
          {label:"B", text:"hybridization"},
          {label:"C", text:"delocalization"},
          {label:"D", text:"cyclization"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0021",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"An organic reaction in which bond fission results in formation of free radicals is:",
      options:[
            {label:"A", text:"homolytic B. ozonolysis C. rearrangement D. elimination"},
          {label:"A", text:"homolytic"},
          {label:"B", text:"ozonolysis"},
          {label:"C", text:"rearrangement"},
          {label:"D", text:"elimination"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0022",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"What is the hybrid state of boron in boric acid?",
      options:[
            {label:"A", text:"sp B. sp  C. sp  D. sp d"},
          {label:"A", text:"sp"},
          {label:"B", text:"sp "},
          {label:"C", text:"sp "},
          {label:"D", text:"sp d"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0023",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"An example of a zwitterion is:",
      options:[
            {label:"A", text:"sp"},
          {label:"B", text:"sp "},
          {label:"C", text:"sp "},
          {label:"D", text:"sp d"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0024",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The acid with the highest Ka value is:",
      options:[
            {label:"A", text:"HIO B. HFO C. HClO D. BrOH"},
          {label:"A", text:"HIO"},
          {label:"B", text:"HFO"},
          {label:"C", text:"HClO"},
          {label:"D", text:"BrOH"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0025",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The standard enthalpy changes of formation of TiO(s) and CO(g) are -940 kJ mol and -110 kJ mol respectively. TiO(s) + 2C(s)  Ti(s) + 2CO(g)",
      options:[
            {label:"A", text:"-720 kJ/mol"},
          {label:"B", text:"+720 kJ/mol"},
          {label:"C", text:"-1050 kJ/mol"},
          {label:"D", text:"+1050 kJ/mol"}
          ],
      correctAnswer:"B",
      explanation:"Using Hess's Law:  H_rxn =   H_f(products) -   H_f(reactants).  H_rxn = [ H_f(Ti) + 2* H_f(CO)] - [ H_f(TiO) + 2* H_f(C)]. Since Ti and C are elements in their standard states, their  H_f = 0.  H_rxn = [0 + 2(-110)] - [-940 + 0] = -220 + 940 = +720 kJ/mol.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0026",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The average distance of the orbital from the nucleus of an atomic orbital is determined by the:",
      options:[
            {label:"A", text:"Principal quantum number"},
          {label:"B", text:"Azimuthal quantum number"},
          {label:"C", text:"Magnetic quantum number"},
          {label:"D", text:"Spin quantum number"}
          ],
      correctAnswer:"A",
      explanation:"The principal quantum number (n) determines the size and energy level of an orbital, which directly relates to the average distance of the electron from the nucleus.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0027",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"What is the standard cell potential for the overall reaction of the cell below?",
      options:[
            {label:"A", text:"0.42 V"},
          {label:"B", text:"1.10 V"},
          {label:"C", text:"-1.10 V"},
          {label:"D", text:"0.76 V"}
          ],
      correctAnswer:"B",
      explanation:"The standard cell potential is calculated using the formula E cell = E cathode - E anode. For a standard Zinc-Copper cell, E cell = 0.34 V - (-0.76 V) = 1.10 V.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0028",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The reaction between steam and heated magnesium metal produces compound X and hydrogen. Which of the options is NOT a property of compound X formed?",
      options:[
            {label:"A", text:"It is a basic oxide"},
          {label:"B", text:"It is a white solid"},
          {label:"C", text:"It is highly soluble in water"},
          {label:"D", text:"It has a high melting point"}
          ],
      correctAnswer:"C",
      explanation:"The reaction between magnesium and steam produces magnesium oxide (MgO). MgO is a basic oxide, a white solid, and has a high melting point, but it is only slightly soluble in water.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0029",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Equal masses of hydrogen and oxygen are placed in a rigid closed container. Which statement is TRUE about the system?",
      options:[
            {label:"A", text:"The number of moles of hydrogen is greater than the number of moles of oxygen"},
          {label:"B", text:"The number of moles of oxygen is greater than the number of moles of hydrogen"},
          {label:"C", text:"The pressure exerted by hydrogen is equal to the pressure exerted by oxygen"},
          {label:"D", text:"The total number of molecules is equal for both gases"}
          ],
      correctAnswer:"A",
      explanation:"Moles (n) = mass / molar mass. Since the molar mass of H2 (2 g/mol) is much smaller than that of O2 (32 g/mol), equal masses of these gases will result in a higher number of moles for hydrogen.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0030",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"When a solution of potassium fluoride and strontium nitrate are mixed together, which of the following anion-cation combination will result in a precipitate?",
      options:[
            {label:"A", text:"K+ and NO3-"},
          {label:"B", text:"K+ and F-"},
          {label:"C", text:"Sr2+ and F-"},
          {label:"D", text:"Sr2+ and NO3-"}
          ],
      correctAnswer:"C",
      explanation:"When potassium fluoride and strontium nitrate are mixed, the strontium ions (Sr2+) and fluoride ions (F-) combine to form strontium fluoride (SrF2), which is an insoluble salt that forms a precipitate.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0031",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"A rigid metal tank contains helium gas. Which applies to the gas in the tank when some helium is removed at constant temperature?",
      options:[
            {label:"A", text:"The pressure increases"},
          {label:"B", text:"The pressure decreases"},
          {label:"C", text:"The volume increases"},
          {label:"D", text:"The density increases"}
          ],
      correctAnswer:"B",
      explanation:"According to the ideal gas law (PV = nRT), in a rigid tank (constant volume) at a constant temperature, the pressure is directly proportional to the number of moles of gas. Removing helium reduces the number of moles, thereby decreasing the pressure.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0032",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The IUPAC name of the compound shown below is: (1,3,5-trimethyl cyclopentane with CH groups)",
      options:[
            {label:"A", text:"1,2,3-trimethylcyclopentane"},
          {label:"B", text:"1,3-dimethylcyclopentane"},
          {label:"C", text:"1,3,5-trimethylcyclopentane"},
          {label:"D", text:"1,2,4-trimethylcyclopentane"}
          ],
      correctAnswer:"C",
      explanation:"Based on the description of the substituents being at the 1, 3, and 5 positions on a five-membered carbon ring, the IUPAC name is 1,3,5-trimethylcyclopentane.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0033",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Which of the following is the correct increasing order of conductivity in aqueous solution?",
      options:[
            {label:"A", text:"H2O < CH3COOH < HCl"},
          {label:"B", text:"HCl < CH3COOH < H2O"},
          {label:"C", text:"CH3COOH < H2O < HCl"},
          {label:"D", text:"H2O < HCl < CH3COOH"}
          ],
      correctAnswer:"A",
      explanation:"Conductivity depends on the concentration of ions. H2O is a non-electrolyte (very low conductivity), CH3COOH is a weak electrolyte (partial ionization), and HCl is a strong electrolyte (complete ionization), resulting in the increasing order: H2O < CH3COOH < HCl.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0034",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The mass spectrum of an atom shows two peaks with masses 80 and 100. If the isotopic ratio of the isotopes is 6:5 respectively, determine the average atomic mass of the atom.",
      options:[
            {label:"A", text:"98.0 B. 90.2 C. 89.1 D. 72.7"},
          {label:"A", text:"98.0"},
          {label:"B", text:"90.2"},
          {label:"C", text:"89.1"},
          {label:"D", text:"72.7"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0035",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The element whose electronic configuration is 1s 2s 2p 3s 3p 4s 3d is:",
      options:[
            {label:"A", text:"metal"},
          {label:"B", text:"non-metal"},
          {label:"C", text:"noble gas"},
          {label:"D", text:"metalloid"}
          ],
      correctAnswer:"A",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0036",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Identify the elements that have the smallest first ionization energy:",
      options:[
            {label:"A", text:"  P B.   K C.  C D.   Mg"},
          {label:"A", text:"  P"},
          {label:"B", text:"  K"},
          {label:"C", text:" C"},
          {label:"D", text:"  Mg"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0037",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Which of the following will form pale yellow precipitate, slightly soluble in aqueous ammonia upon treatment with trioxonitrate (V) acid followed by silver nitrate?",
      options:[
            {label:"A", text:"Cl-"},
          {label:"B", text:"Br-"},
          {label:"C", text:"I-"},
          {label:"D", text:"F-"}
          ],
      correctAnswer:"B",
      explanation:"Silver bromide (AgBr) forms a cream or pale yellow precipitate when reacted with silver nitrate. This precipitate is characterized by being only slightly soluble in aqueous ammonia.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0038",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The process of preparing hydrogen from red-hot coke and steam is generally called:",
      options:[
            {label:"A", text:"Lane's process"},
          {label:"B", text:"Reforming gas"},
          {label:"C", text:"Linde's process"},
          {label:"D", text:"Bosch process"}
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0039",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"An element which can be detected using Lassaigne's test is:",
      options:[
            {label:"A", text:"Carbon"},
          {label:"B", text:"Hydrogen"},
          {label:"C", text:"Nitrogen"},
          {label:"D", text:"Oxygen"}
          ],
      correctAnswer:"C",
      explanation:"Lassaigne's test (sodium fusion test) is used to detect the presence of nitrogen, sulfur, and halogens in organic compounds by converting them into water-soluble sodium salts.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0040",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"If a radioactive element is placed in an evacuated container, its rate of disintegration:",
      options:[
            {label:"A", text:"will be increased"},
          {label:"B", text:"will be decreased"},
          {label:"C", text:"will change very slightly"},
          {label:"D", text:"will remain unchanged"}
          ],
      correctAnswer:"D",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0041",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"How does a catalyst alter the rate of a reaction?",
      options:[
            {label:"A", text:"By changing the reaction conditions"},
          {label:"B", text:"By lowering the activation energy"},
          {label:"C", text:"By changing the order"},
          {label:"D", text:"By reversing the order"}
          ],
      correctAnswer:"B",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0042",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The 3d metal ions are generally paramagnetic in nature because:",
      options:[
            {label:"A", text:"they form coloured salts"},
          {label:"B", text:"they have one or more unpaired electrons"},
          {label:"C", text:"they have one or more paired s-electrons"},
          {label:"D", text:"they are reducing agents"}
          ],
      correctAnswer:"B",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0043",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Which of the following compounds will show geometrical isomerism?",
      options:[
            {label:"A", text:"1-Butene"},
          {label:"B", text:"2-Butene"},
          {label:"C", text:"Propene"},
          {label:"D", text:"Ethene"}
          ],
      correctAnswer:"B",
      explanation:"2-Butene (CH3-CH=CH-CH3) exhibits geometrical isomerism because each carbon atom of the double bond is attached to two different groups (a hydrogen atom and a methyl group), allowing for cis and trans forms.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0044",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Which of the following is the main structural feature of proteins?",
      options:[
            {label:"A", text:"Peptide linkage B. Glycoside linkage C. Ether linkage D. ester linkage"},
          {label:"A", text:"Peptide linkage"},
          {label:"B", text:"Glycoside linkage"},
          {label:"C", text:"Ether linkage"},
          {label:"D", text:"ester linkage"}
          ],
      difficulty:"medium"
    },
    {
      id:"che-2025-q0045",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The change in hybridization of carbon when two moles of hydrogen gas is passed over ethyne in the presence of platinum is:",
      options:[
            {label:"A", text:"sp2 to sp"},
          {label:"B", text:"sp3 to sp2"},
          {label:"C", text:"sp to sp2"},
          {label:"D", text:"sp to sp3"}
          ],
      correctAnswer:"D",
      explanation:"Ethyne (HC CH) has sp hybridized carbons. When two moles of hydrogen gas are added, the triple bond is reduced to a single bond, forming ethane (CH3-CH3), where the carbons are sp3 hybridized.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0046",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"2.40 g of ethanol was reacted with an excess of aqueous acidified potassium dichromate (VI). The yield of the desired organic product was 70.0%. What mass of the desired product collected?",
      options:[
            {label:"A", text:"2.19 g"},
          {label:"B", text:"3.13 g"},
          {label:"C", text:"1.61 g"},
          {label:"D", text:"2.40 g"}
          ],
      correctAnswer:"A",
      explanation:"Moles of ethanol = 2.40 g / 46 g/mol   0.0522 mol. The oxidation of ethanol produces ethanoic acid (M = 60 g/mol). Theoretical yield = 0.0522 mol * 60 g/mol = 3.13 g. Actual yield = 3.13 g * 70% = 2.19 g.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0047",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"In the reaction between propene and hydrogen chloride, the electrophile that initiates the reaction is:",
      options:[
            {label:"A", text:"Cl-"},
          {label:"B", text:"CH3+"},
          {label:"C", text:"H+"},
          {label:"D", text:"CH3CH+CH3"}
          ],
      correctAnswer:"C",
      explanation:"In the electrophilic addition reaction of HCl to an alkene like propene, the H+ ion acts as the electrophile that attacks the electron-rich pi bond.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0048",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Iodohexane and 2-iodooctane are related as:",
      options:[
            {label:"A", text:"Homologues"},
          {label:"B", text:"Isomers"},
          {label:"C", text:"Functional isomers"},
          {label:"D", text:"Position isomers"}
          ],
      correctAnswer:"A",
      explanation:"Iodohexane and 2-iodooctane both belong to the alkyl halide homologous series, as they share the same functional group and general formula pattern.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0049",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Which of the following has the shortest carbon-carbon bond length?",
      options:[
            {label:"A", text:"Ethane"},
          {label:"B", text:"Ethene"},
          {label:"C", text:"Ethyne"},
          {label:"D", text:"Propene"}
          ],
      correctAnswer:"C",
      explanation:"Bond length decreases as the bond order increases. Ethyne has a triple bond (highest bond order), making its C-C bond shorter than the double bond in ethene or the single bond in ethane.",
      difficulty:"medium"
    },
    {
      id:"che-2025-q0050",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"The properties of organic molecules are related to carbon to carbon bond properties such as: (i) bond length (ii) bond dissociation energy & (iii) bond rotation. Which of these properties revealed the fact that a -bond is weaker than a -bond?",
      options:[
            {label:"A", text:"(i) only"},
          {label:"B", text:"(i) and (ii)"},
          {label:"C", text:"(ii) only"},
          {label:"D", text:"(i), (ii) and (iii)"}
          ],
      correctAnswer:"C",
      explanation:"Bond dissociation energy is the measure of bond strength. The fact that the energy required to break a pi bond is less than that required for a sigma bond reveals that the pi bond is weaker.",
      difficulty:"medium"
    },
    {
      id:"che-2025-p0001",
      subject:"chemistry",
      year:2025,
      category:"practical",
      question:"The product of the polymerization of styrene is: **1(a).** Write the electronic configurations of the elements with the following atomic numbers: (i). 35 (ii). 26 **[1 Mark]** **(b).** Write the designation for the orbital occupied by an electron described by the following quantum numbers: (i). n = 3, l = 1 (ii). n = 4, l = 0 (iii). n = 3, l = 0 (iv). n = 3, l = 0 **[2 Marks]** **(c).** 20 g of a hydrocarbon produced 62.85 g of CO  and 25.57 g of H O when completely combusted in air. (i). Determine the empirical formula of the hydrocarbon. (ii). If the molecular mass of the compound is 252 g/mol, determine the molecular formula of the hydrocarbon. **[4 Marks]** **(d).** Five persons measure the length of a room and obtained the following results: 10.325 m, 10.320 m, 10.315 m and 10.327 m. Determine the: (i). mean deviation (ii). standard deviation **[3 Marks]** **Total = 10 Marks** **2(ai).** What is ionization of atom? **[1 Mark]** **(ii).** An electron for a hydrogen atom is at an infinite excitation and the maximum wavelength of electromagnetic radiation that can completely remove (ionize) the electron from H atom is 1460 nm, what is the initial state of the electron? **[3 Marks]** **(b).** The following equation shows the reaction of phosphine (PH ) with a hydrogen ion, H : PH  + H    PH   (i). Predict the shape and bond angle of phosphine. (ii). State the type of bonds present in PH  . (c). Briefly explain how a mass spectrometer works. (d). Define with a balanced chemical equation, the term \"displacement reaction\". **[2 Marks]** **Total = 10 Marks** **3(ai).** State Hess's law of heat summation. **(ii).** Given the following data: H (g) +  O (g)   H O(l)  H =  285.8 kJ N O (g) + H O(l)   2HNO (l)  H =  76.6 kJ  N (g) +    O (g) +  H (g)   HNO (l) ** H =  174.1 kJ** Calculate the standard enthalpy change,  H, for the reaction: 2N (g) + 5O (g)   2N O (g) **[3 Marks]** **(b).** Calculate the e.m.f of the cell at 25  C for the following electrochemical cell: Cr/Cr  (0.1 M)//Fe  (0.01 M)/Fe Given the following standard reduction potentials: E_Cr  /Cr =  0.74V; E_Fe  /Fe =  0.44V. **(c).** Decomposition of COCl  is a reversible process written as: COCl (g)   CO(g) + Cl (g). When the reaction is at equilibrium, what will be the effect of: (i). adding more of COCl  (ii). adding more of Cl  **[2 Marks]** **Total = 10 Marks** **4(ai).** Define nuclear binding energy. **[1 Mark]** **(ii).** A compound is used in an experiment 6.5 days after it was prepared. If the sample originally contained 0.35 g of phosphorus-32 with a half-life of 15 days. How many grams was used in the experiment? **[2 Marks]** **(b).** Consider the reaction for the combustion of iron: 4Fe(s) + 3O (g)   2Fe O (g) 0.2 mole of Fe, 0.3 mole of O  and 0.4 mole of Fe O  all in 200 mL reaction vessel. (i). Write the equilibrium constant expression for the reaction. (ii). Calculate the values of Kc and Kp for the reaction. **[3 Marks]** **(c).** Balance the redox equation in basic medium: MnO   + C O      MnO  + CO  **[2 Marks]** **(di).** Write an expression for the Ksp of magnesium hydroxide, stating its unit. **[1 Mark]** **(ii).** Given that the numerical value of the Ksp of magnesium hydroxide is 2.0   10   , calculate the concentration of Mg(OH)  in a saturated solution. **[2 Marks]** **Total = 10 Marks** **5(a).** Give a reason for the following: (i). Zn, Cd and Hg are not considered as true transition metals. **[1 Mark]** (ii). Zn   salts are white, while Cu   salts are blue. **[1 Mark]** **(b).** Write the electronic configuration of the following atoms/ions and indicate the magnetic property: (i). V   (ii). Fe   (iii). Ti (iv). Cr  **[4 Marks]** **(c).** The melting points of some oxides of Group IV elements are given below: | Oxide | CO  | SiO  | SnO  | |---|---|---|---| | Melting Point ( C) | -78 | 1610 | 1630 | Describe the bonding and its relation to the melting points of the following oxides: (i). CO  (ii). SiO  (iii). SnO  **[3 Marks]** **(d).** Deduce the hybrid orbitals involved in the bonding molecules of CH  and BCl . **[1 Mark]** **Total = 10 Marks** **6(a).** Arrange the hydroxides and the sulphates of alkaline earth metals in increasing order of solubilities. **[2 Marks]** **(b).** Write the classification of nanostructured materials based on their dimensionality. **[2 Marks]** **(ci).** Na O, Al O , and P O   are oxides of period 3. Explain using balanced equations, what is observed when each compound is reacted with: (I). an alkali (II). an acid **(ii).** Which oxide(s) in (ci) above will give a solution whose pH is higher than 7 in water? **[5 Marks]** **(d).** Justify the placement of hydrogen into groups I and VII of the periodic table. **[1 Mark]** **Total = 10 Marks** **7(a).** HCN reacts with propanal (CH CH CHO) to form compound F. (i). Give the name and structure of the organic product F. (ii). State the type of reaction involved. (iii). Write the formula and name of the product obtained when compound F is hydrolysed in acid (H O/H ). **[3 Marks]** **(b).** The table below is obtained in the fractions obtained from crude petroleum. Fill in the missing components: **[3 Marks]** | Temp. of separation ( C) | No. of C | Fraction | Use | |---|---|---|---| | Under 30 | 2-4 | Petroleum gas | | | 30-180 | 4-9 | | Motor fuel | | 160-230 | 8-16 | Kerosene | Heat, jet fuel | | 200-320 | | Diesel | Motor fuel | | 300-450 | 16-30 | | Heating lubricant | | > 300 Vacuum | > 25 | Petroleum jelly/paraffin wax | | | Residue | | Asphalt | In construction | **(c).** Write equations to illustrate the following reactions: (i). Nitration of bromobenzene. (ii). Bromination of nitrobenzene. **[2 Marks]** **(di).** Write the open chain structures of D-glucose and D-fructose. **[1 Mark]** **(ii).** Explain why Fehling's solution is reduced by glucose and not by fructose. **[1 Mark]** **Total = 10 Marks** **8(ai).** Give the name and structure of the product formed from the reaction of butene and hydrogen bromide in the presence of peroxide. **[2 Marks]** **(ii).** Write three differences between inductive & mesomeric effects. **[1  Marks]** **(b).** Show how the compound formed between atoms X and Y (i.e X-Y) can be subjected to: (i). homolytic fission (ii). heterolytic fission. State the condition(s) that may lead to each type of fission. **[1  Marks]** **(c).** State three uses of polymers. **7(ai).** List three (3) uses of polymers. **[1 Mark]** **(ii).** Provide a structure for the polymer formed between ethane-1,2-diol and parabenzendioic acid. **[1 Mark]** **(b).** Give two examples of each of the following: (i). a free radical (ii). an electrophile (iii). a nucleophile **[3 Marks]** **(c).** Give reasons for the following observations: (i). carboxylic acids are stronger acids than alcohols. (ii). esters are intermediates in boiling points between alkanes and alcohols. (iii). alkynes burn with a sooty flame. (iv). Given the organic reactions below, identify X, Y and Z. **[3 Marks]** **8(a).** Compounds A and B are structural isomers: *(structural diagrams of isomers shown in image)* (i). What is the IUPAC name of each of the isomers? (ii). Write complete reaction equations each for the preparation of compounds A and B from the compound below: **[1 Mark]** **(ci).** Define the term homologous series. **[4 Marks]** **(ii).** A compound X with a molecular formula of C H O exhibits functional isomerism. Provide the structure and name for any two. **[2 Marks]** **(iii).** Draw the structure of penatin-2-one and show the reaction of the product isomerism. **[1 Mark]** **(iv).** Give the structures of geometric isomers of but-2-ene. **[1 Mark]** **Total = 10 Marks** **1(ai).** An oxygen atom has a total of eight electrons in the ground state. Write the four quantum numbers for each of the eight electrons. **[4 Mks]** **(ii).** Differentiate between determinate error and indeterminate error. Three peaks were observed with the properties shown in the following mass spectrometer table: | m/z | 58 | 60 | 62 | |---|---|---|---| | Relative abundance (%) | 69 | 27 | 4 | Determine the relative atomic mass of Ni. **[2 Marks]** **(b).** A sample of nickel was analysed in a mass spectrometer. Three peaks were observed with the properties shown in the following table. **2(ai).** Find the wavelength associated with a particle of mass 4 g and propelled by wind at 20 km/hr. **[5 Marks]** **(ii).** State Aufbau's and Pauli's exclusion principles. **3(ai).** State any four (4) assumptions of kinetic theory of gases. **(ii).** 8.5 g of ammonia was contained in a 5 L flask at 28  ",
      options:[
            {label:"A", text:"polyethylene B. polypropylene C. polystyrene D. toluene"},
          {label:"A", text:"polyethylene"},
          {label:"B", text:"polypropylene"},
          {label:"C", text:"polystyrene"},
          {label:"D", text:"toluene"},
          {label:"C", text:"Calculate the pressure of the gas assuming ideal gas behaviour. Compare this to the pressure..."},
          {label:"C", text:"[3 Marks]"},
          {label:"C", text:"**[1 Mark]**"}
          ],
      correctAnswer:"C",
      difficulty:"medium"
    },
    {
      id:"che-2025-p0002",
      subject:"chemistry",
      year:2025,
      category:"practical",
      question:"P  = 1 bar; V  = 2.5 L; P  = ?; V  = 500/1000 = 0.5 L. From Boyle's law: P V /V ; 1   2.5/2.5   0.5/0.5 = **P  = 5 bar** % Increase in P = (P    P )/P    100 = 5  /1   100 = 400 % **Option B** **14. B 15. C 16. C**",
      difficulty:"medium"
    },
    {
      id:"che-2025-p0003",
      subject:"chemistry",
      year:2025,
      category:"practical",
      question:"The product of the polymerization of styrene is: --- --- **1(a).** Write the electronic configurations of the elements with the following atomic numbers: (i). 35 (ii). 26 **[1 Mark]** **(b).** Write the designation for the orbital occupied by an electron described by the following quantum numbers: (i). n = 3, l = 1 (ii). n = 4, l = 0 (iii). n = 3, l = 0 (iv). n = 3, l = 0 **[2 Marks]** **(c).** 20 g of a hydrocarbon produced 62.85 g of CO  and 25.57 g of H O when completely combusted in air. (i). Determine the empirical formula of the hydrocarbon. (ii). If the molecular mass of the compound is 252 g/mol, determine the molecular formula of the hydrocarbon. **[4 Marks]** **(d).** Five persons measure the length of a room and obtained the following results: 10.325 m, 10.320 m, 10.315 m and 10.327 m. Determine the: (i). mean deviation (ii). standard deviation **[3 Marks]** **Total = 10 Marks** --- **2(ai).** What is ionization of atom? **[1 Mark]** **(ii).** An electron for a hydrogen atom is at an infinite excitation and the maximum wavelength of electromagnetic radiation that can completely remove (ionize) the electron from H atom is 1460 nm, what is the initial state of the electron? **[3 Marks]** **(b).** The following equation shows the reaction of phosphine (PH ) with a hydrogen ion, H : PH  + H    PH   (i). Predict the shape and bond angle of phosphine. (ii). State the type of bonds present in PH  . (c). Briefly explain how a mass spectrometer works. (d). Define with a balanced chemical equation, the term \"displacement reaction\". **[2 Marks]** **Total = 10 Marks** --- **3(ai).** State Hess's law of heat summation. **(ii).** Given the following data: H (g) +  O (g)   H O(l)  H =  285.8 kJ N O (g) + H O(l)   2HNO (l)  H =  76.6 kJ  N (g) +    O (g) +  H (g)   HNO (l) ** H =  174.1 kJ** Calculate the standard enthalpy change,  H, for the reaction: 2N (g) + 5O (g)   2N O (g) **[3 Marks]** **(b).** Calculate the e.m.f of the cell at 25  C for the following electrochemical cell: Cr/Cr  (0.1 M)//Fe  (0.01 M)/Fe Given the following standard reduction potentials: E_Cr  /Cr =  0.74V; E_Fe  /Fe =  0.44V. **(c).** Decomposition of COCl  is a reversible process written as: COCl (g)   CO(g) + Cl (g). When the reaction is at equilibrium, what will be the effect of: (i). adding more of COCl  (ii). adding more of Cl  **[2 Marks]** **Total = 10 Marks** --- **4(ai).** Define nuclear binding energy. **[1 Mark]** **(ii).** A compound is used in an experiment 6.5 days after it was prepared. If the sample originally contained 0.35 g of phosphorus-32 with a half-life of 15 days. How many grams was used in the experiment? **[2 Marks]** **(b).** Consider the reaction for the combustion of iron: 4Fe(s) + 3O (g)   2Fe O (g) 0.2 mole of Fe, 0.3 mole of O  and 0.4 mole of Fe O  all in 200 mL reaction vessel. (i). Write the equilibrium constant expression for the reaction. (ii). Calculate the values of Kc and Kp for the reaction. **[3 Marks]** **(c).** Balance the redox equation in basic medium: MnO   + C O      MnO  + CO  **[2 Marks]** **(di).** Write an expression for the Ksp of magnesium hydroxide, stating its unit. **[1 Mark]** **(ii).** Given that the numerical value of the Ksp of magnesium hydroxide is 2.0   10   , calculate the concentration of Mg(OH)  in a saturated solution. **[2 Marks]** **Total = 10 Marks** --- **5(a).** Give a reason for the following: (i). Zn, Cd and Hg are not considered as true transition metals. **[1 Mark]** (ii). Zn   salts are white, while Cu   salts are blue. **[1 Mark]** **(b).** Write the electronic configuration of the following atoms/ions and indicate the magnetic property: (i). V   (ii). Fe   (iii). Ti (iv). Cr  **[4 Marks]** **(c).** The melting points of some oxides of Group IV elements are given below: | Oxide | CO  | SiO  | SnO  | |---|---|---|---| | Melting Point ( C) | -78 | 1610 | 1630 | Describe the bonding and its relation to the melting points of the following oxides: (i). CO  (ii). SiO  (iii). SnO  **[3 Marks]** **(d).** Deduce the hybrid orbitals involved in the bonding molecules of CH  and BCl . **[1 Mark]** **Total = 10 Marks** --- **6(a).** Arrange the hydroxides and the sulphates of alkaline earth metals in increasing order of solubilities. **[2 Marks]** **(b).** Write the classification of nanostructured materials based on their dimensionality. **[2 Marks]** **(ci).** Na O, Al O , and P O   are oxides of period 3. Explain using balanced equations, what is observed when each compound is reacted with: (I). an alkali (II). an acid **(ii).** Which oxide(s) in (ci) above will give a solution whose pH is higher than 7 in water? **[5 Marks]** **(d).** Justify the placement of hydrogen into groups I and VII of the periodic table. **[1 Mark]** **Total = 10 Marks** --- **7(a).** HCN reacts with propanal (CH CH CHO) to form compound F. (i). Give the name and structure of the organic product F. (ii). State the type of reaction involved. (iii). Write the formula and name of the product obtained when compound F is hydrolysed in acid (H O/H ). **[3 Marks]** **(b).** The table below is obtained in the fractions obtained from crude petroleum. Fill in the missing components: **[3 Marks]** | Temp. of separation ( C) | No. of C | Fraction | Use | |---|---|---|---| | Under 30 | 2-4 | Petroleum gas | | | 30-180 | 4-9 | | Motor fuel | | 160-230 | 8-16 | Kerosene | Heat, jet fuel | | 200-320 | | Diesel | Motor fuel | | 300-450 | 16-30 | | Heating lubricant | | > 300 Vacuum | > 25 | Petroleum jelly/paraffin wax | | | Residue | | Asphalt | In construction | **(c).** Write equations to illustrate the following reactions: (i). Nitration of bromobenzene. (ii). Bromination of nitrobenzene. **[2 Marks]** **(di).** Write the open chain structures of D-glucose and D-fructose. **[1 Mark]** **(ii).** Explain why Fehling's solution is reduced by glucose and not by fructose. **[1 Mark]** **Total = 10 Marks** --- **8(ai).** Give the name and structure of the product formed from the reaction of butene and hydrogen bromide in the presence of peroxide. **[2 Marks]** **(ii).** Write three differences between inductive & mesomeric effects. **[1  Marks]** **(b).** Show how the compound formed between atoms X and Y (i.e X-Y) can be subjected to: (i). homolytic fission (ii). heterolytic fission. State the condition(s) that may lead to each type of fission. **[1  Marks]** **(c).** State three uses of polymers. --- **7(ai).** List three (3) uses of polymers. **[1 Mark]** **(ii).** Provide a structure for the polymer formed between ethane-1,2-diol and parabenzendioic acid. **[1 Mark]** **(b).** Give two examples of each of the following: (i). a free radical (ii). an electrophile (iii). a nucleophile **[3 Marks]** **(c).** Give reasons for the following observations: (i). carboxylic acids are stronger acids than alcohols. (ii). esters are intermediates in boiling points between alkanes and alcohols. (iii). alkynes burn with a sooty flame. (iv). Given the organic reactions below, identify X, Y and Z. **[3 Marks]** --- **8(a).** Compounds A and B are structural isomers: *(structural diagrams of isomers shown in image)* (i). What is the IUPAC name of each of the isomers? (ii). Write complete reaction equations each for the preparation of compounds A and B from the compound below: **[1 Mark]** **(ci).** Define the term homologous series. **[4 Marks]** **(ii).** A compound X with a molecular formula of C H O exhibits functional isomerism. Provide the structure and name for any two. **[2 Marks]** **(iii).** Draw the structure of penatin-2-one and show the reaction of the product isomerism. **[1 Mark]** **(iv).** Give the structures of geometric isomers of but-2-ene. **[1 Mark]** **Total = 10 Marks** --- **1(ai).** An oxygen atom has a total of eight electrons in the ground state. Write the four quantum numbers for each of the eight electrons. **[4 Mks]** **(ii).** Differentiate between determinate error and indeterminate error. Three peaks were observed with the properties shown in the following mass spectrometer table: | m/z | 58 | 60 | 62 | |---|---|---|---| | Relative abundance (%) | 69 | 27 | 4 | Determine the relative atomic mass of Ni. **[2 Marks]** **(b).** A sample of nickel was analysed in a mass spectrometer. Three peaks were observed with the properties shown in the following table. --- **2(ai).** Find the wavelength associated with a particle of mass 4 g and propelled by wind at 20 km/hr. **[5 Marks]** **(ii).** State Aufbau's and Pauli's exclusion principles. --- **3(ai).** State any four (4) assumptions of kinetic theory of gases. **(ii).** 8.5 g of ammonia was contained in a 5 L flask at 28  C. Calculate the pressure of the gas assuming ideal gas behaviour. Compare this to the pressure... --- **1(a).** For each of the following pairs, indicate which one of the two species is larger: (i). N   and F  (ii). Fe   and Fe   **(bi).** List two (2) ways of controlling determinate error. **(ii).** Balance the half reaction below in acidic medium: Cr O      Cr   **(c).** Consider the following ions: Al  , Mg  , Na , S  , Cl . (i). Write down all possible formula of ionic compounds formed between each of the oppositely charged ions of these compounds. (ii). Among the ones with metal to non-metal ratio of 1:1, which of the compounds do you expect to have the highest melting point? **(b).** Consider the reaction: 2NO (g) + F (g)   2NO F (g). Given that the experimental rate law is Rate = k[NO ][F ]. Determine the order of the reaction with respect to each reactant and the overall order. **(ii).** If 25 g of each reactant is present at the beginning of the reaction, which of the reactants is the limiting reactant? [N = 14, O=16, F=19] **(c).** Define the following terms and give an example of each of: (i). Lewis acid (ii). Bronsted-Lowry base **4(ai).** Provide the equilibrium expression for the following reaction: CH NH (aq) + H O(l)   CH NH  (aq) + HO (aq) **[1 Mark]** **(ii).** Identify the acid, base, conjugate acid and base in the following aqueous reaction. Al(H O)    + H O   H O  + Al(H O) (OH)   **[2 Marks]** **(b).** Using kinetic data in the table above for the reaction: 2NO + 2H    N  + 2H O at 700  C | | Initial conc. (mol L  ) | | Initial rate (mol L  ) | |---|---|---|---| | | NO | H  | | | 1 | 0.0250 | 0.010 | 2.4   10   | | 2 | 0.0250 | 0.005 | 2.1   10   | | 3 | 0.0125 | 0.010 | 0.6   10   | (i). Deduce the order of reaction with respect to hydrogen and nitrogen oxide. (ii). Give the empirical rate law for the reaction. (iii). List the four (4) steps of a contact catalyst (heterogeneous catalyst) during catalysis. (ci). Calculate the oxidation potential of a hydrogen electrode at pH of 10 and pH  of 1 atm. **[4 Marks]** --- **5(a).** State the contributions of the following scientists in the elucidation of the structure of the atom: (i). James Chadwick (ii). John Dalton **[2 Marks]** **(bi).** How is the properties of lithium different from that of the other group members? **(ii).** Highlight four (4) diagonal relationships of Li with Mg. **[3 Marks]** **(ci).** State two (2) industrial applications of oxygen. **(ii).** State the equation(s) for the laboratory preparation of oxygen from hydrogen peroxide. **[3 Marks]** --- **5(ai).** List ferromagnetic metals. **(ii).** State three (3) properties that make carbon different from other members of the group. **(b).** Hydrogen forms compounds with elements W, X, Y and Z having atomic numbers 9, 11, 12 and 17 respectively. **(ci).** Explain briefly the general trend in ionization energy of the group 14 elements. **[4 Marks]** **(ii).** Using chemical equations only, describe the production of hydrogen from red hot coke and steam and name the product formed when combined. **[3 Mks]** **6(a).** A gas X was passed through lime water and the limewater turned milky due to the formation of a substance Y. When excess of X was passed through the solution, the solution turns colourless due to the formation of substance Z. (i). Identify X, Y and Z. (ii). Write the chemical equation for the reaction that led to the formation of Y. **(bi).** An element X has the configuration 1s  2s  2p  3s  2p  3s  3p  while element Y has configuration 1s  2s  2p  3s  2p  3s  3p . X and Y can combine chemically. Write chemical equation for the formation of Y. **(di).** Give the reasons for the following observations: (i). What is the major role of ozone layer? (ii). Sulphur can be identified by its physical properties. Give at least four (4) of such physical properties. (iii). Suggest why silicon (IV) oxide is an acidic oxide even though it is insoluble in water. **(b).** Hydrogen is said to be a reducing agent. (a). Hydrogen is not used in filling balloon; **(ii).** Given the following ions: F , Ca  , Fe  , and S  , identify the ion with an unpaired electron and explain your answer. **Total = 10 Marks** --- **7(a).** Give the IUPAC name for the following complex: (i). (CH ) CHCH(CH )  (ii). CH CH CH=CHCH CH  (iii). CH CH CH(CH )  (iv). (CH ) CH(CH ) CH CHO **(b).** During the cracking of petroleum, there was abundance production of a compound whose molecular formula is C H  . The compound has six isomeric carboxylic acid undergoes cleavage? Isomer A forms the most stable carbocation. B can be hydrogenated to n-pentane. C can be hydrolysed to an optical isomer. A forms Isomer A forms the most stable carbocation. B can be hydrolysed to an optical isomer. Provide structures A, B, C, D, E and F Isomer A forms the most stable carbocation. B can be hydrogenated to n-pentane. C can be hydrolysed to an optical isomer. Provide structures A, B, C, D, E and F. Provide structures for isomers A, B and C. **[3 Marks]** **(c).** Arrange the following compounds in increasing order of reactivity toward S_N2 reaction: 2-bromo-2-methylpropane, 1-bromobutane, 2-bromobutane. **[3]** **(d).** Show the compound formed between X and Y (i.e X   Y) can be subjected to: (i). homolytic fission (ii). heterolytic fission. State the condition that leads to each type of fission. **[2 Marks]** **8(a).** Give six (6) differences between inductive and mesomeric effects. **[3]** **(b).** Write a balanced equation for each of the following reactions: (i). Propan-2-one reacting with methylamine. (ii). Benzene reacting with conc. nitric acid in sulphuric acid. (iii). Propanamide heated with lithium aluminium hydride. (iv). Benzene reacting with conc. nitric acid in sulphuric acid. **[4 Marks]** --- **(ci).** Bonding in CO  is pure covalent bond and the molecules are held together by weak intermolecular forces (Van der Waal's forces). The molecule is linear and has zero overall dipole moment. The molecule is non-polar which is why it has a very low melting point of -78  C. **[1 Mark]** **(ii).** Bonding in SiO  is polar covalent. The Si atom is bonded to four oxygen atoms via a strong, three-dimensional network. These several covalent bonds require very high energy to break, hence, SiO  molecule has high molecular structure in which each Si atom is bonded to four oxygen atoms in a strong three-dimensional network. **[1 Mark]** **(iii).** Bonding in SnO  is primarily covalent but has some ionic character as revealed by molecular orbital calculations with high electron density accumulation around the molecule. The molecule thus requires very extensive covalent bonds in the crystal. The molecule which is responsible for high energy to break the intermolecular forces which is responsible for its high melting point. **[1 Mark]** **(d).** The hybrid orbitals in CH  are sp . The hybrid orbitals in BCl  are sp . **[  Mark]** **6(a).** - Be(OH) , Mg(OH) , Ca(OH) , Sr(OH) , Ba(OH)  - BaSO , SrSO , CaSO , MgSO , BeSO  Zero dimensional (0D) nanomaterials: One dimensional (1D) nanomaterials: Two dimensional (2D) nanomaterials: Three dimensional (3D) nanomaterials: **(ci).** 1. Na O does not react with an alkali because it is a strong base. Al O (s) reacts with an alkali to form a soluble complex of NaAl(OH) : Al O (s) + 2NaOH(aq) + 3H O(l)   2NaAl(OH) (aq) **[  Mark]** P O   reacts with an alkali to form phosphate. **II.** Na O reacts with an acid to form salt. E.g Na O(s) + 2HCl(aq)   2NaCl(aq) + H O(l) Al O (s) + 6HCl(aq)   AlCl (aq) + 3H O(l) P O   does not react with an acid because it is acidic. --- **Question SET 1:** You are provided with the following solutions: (i). Solution B contains 4 g of sodium hydroxide, NaOH in 1000 cm  of solution. (ii). Solution A contains 1.5 g of a weak acid, HX (Ka = 1.84   10  ) in 250 cm  of solution. **a). Procedure:** (i). Pipette 25 cm  portion of solution B into a clean conical flask. Add 2 drops of phenolphthalein indicator and titrate against solution A from the burette to a colourless end point. (ii). Repeat the above experiment three times using a fresh portion of solution B. Tabulate your readings. (iii). Calculate the average titre. (iv). Amount (moldm  ) of HX in solution B; (v). Amount (moldm  ) of NaOH titrated; (vi). Number of moles of HX in the average titre; (vii). Number of moles of NaOH in solution A; (viii). Amount (moldm  ) of HX in solution A. Carryout the following exercises on X and Y. Record your observations and identify any gas evolved, and make necessary inference for each test. **Y is a Zn dust.** **X is an inorganic salt.** **Question SET 2:** **a). Procedure:** (i). To the first portion, add NaOH solution in drops and then in excess. (ii). To the second portion, add aqueous ammonia in drops and then in excess; followed by few drops of HCl (2 M). (iii). To the third portion, add few drops of BaCl , and then dilute HCl, excess. **[Total = 10 Marks]** **(b).** Make an aqueous solution of about 10 cm  of another spatula full of X in a boiling tube and divide it into four (4) portions in four different test tubes. (Note: continue with other experiments while waiting to record your observation). (iii). Leave the test tube to cool and record your observation after 10 minutes. (ii). Check for any gas evolved using moist litmus paper. **(ab).** Put a spatula full of X in a test tube and heat strongly. --- **1. A 2. C 3. B 4. B 5. B** **6. C 7. D 8. C 9. B** **10. D 11. B 12. D**",
      options:[
            {label:"A", text:"polyethylene"},
          {label:"B", text:"polypropylene"},
          {label:"C", text:"polystyrene"},
          {label:"D", text:"toluene"}
          ],
      difficulty:"medium"
    },
];

export function getChemistryQuestions(year: number): {
  objective: StudyQuestion[];
  theory: StudyQuestion[];
  practical: StudyQuestion[];
} {
  const objective = chemistryQuestions.filter(q => q.year === year && q.category === "objective");
  const theory = chemistryQuestions.filter(q => q.year === year && q.category === "theory");
  const practical = chemistryQuestions.filter(q => q.year === year && q.category === "practical");
  return { objective, theory, practical };
}
