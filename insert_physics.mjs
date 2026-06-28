import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const SUPABASE_URL = 'https://gzyczwoqqywesqhqqpdi.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6eWN6b3dxcXl3ZXNxaHFxcGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg2NDQ4NSwiZXhwIjoyMDk0NDQwNDg1fQ.cAG525LzzPnPKm-gjWulXVHwccn0hN9XDTOB4FW7KvM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function parseFile(content, year) {
  const lines = content.split('\n');
  const questions = {};
  let currentNum = null;
  let currentOptions = {};
  let correctAnswer = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Match "**N.**" pattern
    const numMatch = line.match(/^\*\*(\d+)\.\*\*/);
    if (numMatch) {
      // Save previous question
      if (currentNum !== null && Object.keys(currentOptions).length > 0) {
        questions[currentNum] = { options: { ...currentOptions }, correctAnswer };
      }
      currentNum = parseInt(numMatch[1]);
      currentOptions = {};
      correctAnswer = null;
      continue;
    }

    // Match "A. text", "B. text", etc.
    const optMatch = line.match(/^([A-D])\.\s+(.+)/);
    if (optMatch && currentNum !== null) {
      const label = optMatch[1];
      let text = optMatch[2].trim();
      // Check for ✓ mark
      if (text.endsWith('✓')) {
        correctAnswer = label;
        text = text.slice(0, -1).trim();
      }
      // Also check for ✓ in the middle (like "B. text ✓" pattern)
      const tickIdx = text.indexOf('✓');
      if (tickIdx > -1) {
        correctAnswer = label;
        text = text.replace('✓', '').trim();
      }
      currentOptions[label] = text;
    }
  }
  // Save last question
  if (currentNum !== null && Object.keys(currentOptions).length > 0) {
    questions[currentNum] = { options: { ...currentOptions }, correctAnswer };
  }

  return questions;
}

// Question texts from physics.ts (extracted manually to ensure accuracy)
const questionTexts = {
  2014: {
    1: "A concave spherical mirror has radius of curvature 20cm. Nature of image of object placed 10cm in front is:",
    2: "Person walks into room with two flat mirrors on opposite walls. When she is 5m from right wall, the first three images from her in the mirror on the left are at distances:",
    3: "Critical angle for air and water (refractive indices 1.00 and 1.33 respectively) boundary is:",
    4: "For a medium transmitting a longitudinal wave, areas of the medium where the wave transmits are called:",
    5: "A grating ruled with 300 lines/mm. What is the angular deviation of the second order bright fringe?",
    6: "When you move away from a fixed source of sound, the frequency you hear:",
    7: "Object placed 30.0cm from a thin converging lens along the axis. The lens has focal length 10.0cm. What is the distance from the lens to the image?",
    8: "A far-sighted person cannot see clearly objects closer than 75cm. What focal length of contact lens will enable this person to see an object at distance 25cm?",
    9: "The part of the eye that contains specialized cells that convert light signal into electrical signal is:",
    10: "A slide projector is used with a lens 6m from the screen. The projected image is 1.5m square on the screen. The focal length of the lens is:",
    11: "A particle moves in simple harmonic motion given by x=2cos(50t), x in meters, t in seconds. The maximum velocity in m/s is:",
    12: "Sinusoidal water waves are generated in a large container. Adjacent crests are 5.0cm apart and travel at 20cm/s. The time required for each new whole cycle is:",
    13: "A projectile is launched from the top of a 20m high cliff with initial velocity 50m/s at 15.30hrs. Calculate the time it should have been launched:",
    14: "Which of the following is NOT true of Newton's law of motion? I. Body in uniform motion can move on circle with uniform speed. II. Action and reaction forces act on different bodies. III. For body to be in equilibrium, no forces must act on it. IV. Newton's first law is definition of certain special frames.",
    15: "A flywheel rolls from rest with constant angular acceleration of 2 rad/s². Its angular speed and angular displacement at t=1.5s are:",
    16: "The force applied to a rocket gives it an upward acceleration equal to 2× the weight of gravity. The magnitude of the force is equal to:",
    17: "In projectile motion:",
    18: "A catapult is stretched 0.2cm. Its stiffness constant is 250N/m. A stone of mass 20g when released has speed:",
    19: "The volume of a gas is held constant and the temperature is raised. The pressure increases because:",
    20: "The coefficient of linear expansion of aluminum is 23×10⁻⁶/°C. A circular hole in an aluminum plate is 2.725cm in diameter at 0°C. What is its diameter at 100°C?",
    21: "550g of water at 75°C is poured into an 855g aluminum container with initial temperature 11°C. Specific heat of aluminum is 900 J/kg·K. How much heat flows from water to aluminum?",
    22: "Two different objects are in thermal contact with different temperatures. The temperature of the two objects determines:",
    23: "10kg of ice at 0°C is added to 2kg of steam at 100°C. The temperature of the resulting mixture (latent heat of fusion of ice = 335kJ/kg, vaporization of water = 2260kJ/kg) is:",
    24: "The buoyancy experienced by a body in a fluid is equivalent to all EXCEPT:",
    25: "Water rises to a height of 10cm in a capillary tube whose contact angle is zero and surface tension is 0.05N/m (g=10m/s²). The radius of the tube is:",
    26: "Water flows along a horizontal pipe of cross-sectional area 40cm² with a constriction of cross-sectional area 10cm² at one point. The speed at the constriction is 4m/s and the pressure is 9.0×10⁴Pa. The pressure in the wider section (density of water = 1000kg/m³) is:",
    27: "The terminal velocity of a brass ball of 1mm diameter falling in a glycerine tank (density of brass = 8g/cm³, glycerine = 1.32g/cm³, viscosity of glycerine = 8.3 poise, g=10m/s²) is:",
    28: "A rubber cord catapult has cross-sectional area 1cm², initial length 0.2m, stretched to 0.24m. An object of mass 10g is projected. The initial velocity when leaving the catapult (Young's modulus for rubber = 6.0×10⁸Pa) is:",
    29: "A steel ball of radius r, density p, falling in glycerine of density p¹. Its velocity when the acceleration is half that of freely falling is:",
    30: "Electric field strength at a point may be defined as:",
    31: "Which correctly identifies the mass and momentum of a photon?",
    32: "The energy spectra of alpha, beta and gamma radiation respectively are:",
    33: "Newton's second law F=Δp/Δt. The condition for F=ma is:",
    34: "In Newton's universal law of gravitation, masses are assumed to be:",
    35: "A neutron exists in a light atomic nucleus. Which also exists?",
    36: "Which accurately describes an atom? I. Atoms of all elements are identical. II. Atom contains nucleus and electrons. III. Due to electrons, atom is negatively charged. IV. Electrons move in circular orbits round nucleus.",
    37: "Given modulus of elasticity E and density p. The speed of an elastic wave is:",
    38: "A copper plate is irradiated with ultraviolet light of wavelength 0.25μm. The work function of copper is 4.5eV. Calculate the stopping potential V:",
    39: "A circular arc conductor of radius 30cm carries a current. Calculate the angle subtended by the arc if B=10⁻⁵T:",
    40: "At a location on the earth's surface, the north, east, and horizontal components of the earth's magnetic field are 2nT, 2nT, 4nT respectively. The total intensity of the earth's magnetic field at that location is:",
    41: "Given the location on the earth's surface, the north, east, horizontal components of the earth's field are 2nT, 2nT, 4nT. The relationship between magnetic inclination D and magnetic declination I is:",
    42: "Two parallel conductors each of length L=60cm are separated by d=2m. The same current flows through both. The force is F=0.01N. Find the current:",
    43: "The minimum height of a vertical flat mirror for a man 1.84m in height to see his full image is:",
    44: "A Christmas tree ornament is a silver sphere of diameter 9.0cm. Where should an object be placed so that the image is one-fourth the size of the object?",
    45: "A student standing still hears the horn of an ambulance bus producing a pure 1000Hz tone. The ambulance approaches the student at a speed of 13m/s. The frequency heard by the student is: (Speed of sound in air at 20°C = 343m/s)",
    46: "Which of the following describes an atom in an excited state?",
    47: "Which of the following can be used to accelerate electrons?",
    48: "Which of the following statements about the photoelectric effect are correct? I. It demonstrates the particle nature of light. II. The kinetic energy of emitted electrons depends on the frequency of light. III. The number of emitted electrons depends on the intensity of light. IV. The effect is instantaneous.",
    49: "What accelerating potential is needed to produce an X-ray tube current?",
    50: "The intensity I of a wave is related to its amplitude A by:"
  },
  2015: {
    1: "Which of the following particles is stable? (A particle with rest mass m moving with speed. Its kinetic energy is:)",
    2: "A nuclear reaction yields energy equivalent to 0.22mc². What is the kinetic energy released?",
    3: "To travel at constant speed, a car engine performs 1200J of work each cycle. The driving force on the car is 600N. At what speed does it travel?",
    4: "A pure semiconductor at room temperature has:",
    5: "The proper time between two events is measured by clocks in the reference frame in which the two events occur:",
    6: "A handbag weighing 162N is carried by two students, each holding a handle of the bag. If each handle is inclined at 60° to the arm, find the force on each student's arm:",
    7: "A rope is used to pull a mass of 10kg vertically upward. Determine the tension on the rope if the mass acquires a velocity of 4ms⁻¹ in 8s (g=10ms⁻²):",
    8: "A boy observes a piece of stone at the bottom of a river 6.0m deep. If he looks vertically from the surface of the river, how far does the stone appear from him? (Refractive index of water = 4/3):",
    9: "A cell has internal resistance of 0.01Ω. The instrument that can accurately measure the resistance is:",
    10: "A conductor of length 2m carries a current of 4A while kept in a magnetic field of density 0.5T. The maximum force acting on it is:",
    11: "The bond that forms a semiconductor is:",
    12: "The photoelectric nature of light is demonstrated by:",
    13: "A spaceship NICX travelling through the galaxy sends out a smaller explorer craft that travels to a nearby planet and signals its findings back. The proper time for the trip to the planet is measured:",
    14: "If the temperature of a patient is 40°C, the temperature on the Fahrenheit scale is:",
    15: "Light enters water from air. The angle of refraction will be:",
    16: "A Carnot engine has a low temperature reservoir at 17°C and efficiency of 40%. By how much should the temperature of the high temperature reservoir be increased to achieve 50% efficiency?",
    17: "A convex mirror has a radius of curvature of 0.55m. An object is 10cm from the mirror. The position of the image is:",
    18: "The critical angle of light passing from a material of refractive index n₁=1.33 to another material of refractive index n₂=1.33 is:",
    19: "Projectile 'C' is fired at an angle of 50° above the horizontal; projectile 'D' is fired at the same speed at an angle of 40° above the horizontal. Assuming level ground, which is true?",
    20: "The distance S moved by a particle in metres is given by S(t)=4t²−3t. Evaluate the speed after 2 seconds:",
    21: "A spaceship is approaching a source of light at speed 0.5c (c=speed of light) as seen by a person in the spaceship. The distance from one maximum to the next maximum is:",
    22: "The distance from one displacement maximum of a wave to the next maximum is called:",
    23: "Both longitudinal and transverse waves can be:",
    24: "Heat is supplied uniformly at a rate of 100W to 1.0×10⁻²kg of liquid for 20 seconds. The temperature of the liquid rises by 5°C. The specific heat capacity of the liquid is:",
    25: "What is the dimension of power?",
    26: "Which of the following are derived units? I. metres II. Coulomb III. Kilogram IV. Ampere V. Joule",
    27: "The dimension of power is:",
    28: "Which of the following has the same unit as kilowatt-hour?",
    29: "An elastic string of length 20cm extends to 24cm when supporting a weight of 50N. The energy stored is:",
    30: "Which radiations can pass through a sheet of paper? I. Alpha rays II. Beta rays III. Gamma rays",
    31: "A metal having work function 5.76eV is illuminated with radiation of energy 7.88eV. The kinetic energy of the electrons emitted is:",
    32: "The energy associated with an X-ray of wavelength 9×10⁻¹⁰m (Planck's constant = 6.6×10⁻³⁴Js, velocity of light = 3×10⁸m/s) is:",
    33: "Two football players of masses 75kg and 100kg run toward each other at 8m/s and 8m/s respectively. Their combined speed just after collision is:",
    34: "The velocity of sound in a gas is given by vs=√(γP/ρ). What is the new value of vs if the pressure is reduced by 5%?",
    35: "Which statement(s) is/are true about the superposition of two or more waves? I. Result of superposition of two or more waves. II. Can be explained using wave nature of light. III. Can be explained using corpuscular nature of light. IV. Only wave-particle duality can explain interference. V. Produces bright and dark fringes.",
    36: "The resistance of a material depends on:",
    37: "An X-ray tube has a current of 7.0mA and potential difference of 80kV. The power dissipated is:",
    38: "Which of the following best describes the fission process?",
    39: "When ³²P decays to ³²S, what particles are emitted?",
    40: "Which of the following defines the Heisenberg uncertainty principle for position and momentum?",
    41: "Which electromagnetic radiation has photons with the greatest energy?",
    42: "Substance A has a decay constant 3 times that of substance B. The ratio of the half-life of A to the half-life of B is:",
    43: "A ²³⁸U nucleus absorbs a neutron. What type of emission follows?",
    44: "The difference in mass between a ²³⁸U nucleus and its constituent nucleons is 1.88482u. The binding energy per nucleon of uranium-238 is:",
    45: "Two forces of magnitudes 10N and 20N act at a point. The resultant force is 10√2N at 45°E. What is the angle between the forces?",
    46: "Heat transfer from the Sun to the Earth occurs by:",
    47: "Three resistors of 2Ω, 3Ω, and 6Ω are connected in parallel. The effective resistance is:",
    48: "A household electric iron is rated 230V, 5A. The power consumed is:",
    49: "An AC circuit has a frequency of 50Hz. The angular frequency in rad/s is:",
    50: "Which of the following has the greatest penetrating power?"
  }
};

async function main() {
  const supabaseUrl = SUPABASE_URL;
  const supabaseKey = SUPABASE_SERVICE_KEY;

  // Parse files
  const content2014 = readFileSync('C:/Users/HP/Downloads/2014.txt', 'utf-8');
  const content2015 = readFileSync('C:/Users/HP/Downloads/2015.txt', 'utf-8');

  const parsed2014 = parseFile(content2014, 2014);
  const parsed2015 = parseFile(content2015, 2015);

  console.log('2014 questions parsed:', Object.keys(parsed2014).length);
  console.log('2015 questions parsed:', Object.keys(parsed2015).length);

  // Build and insert records
  const allRecords = [];

  // Process 2014
  for (let n = 1; n <= 50; n++) {
    const q = parsed2014[n];
    if (!q) {
      console.log(`WARNING: 2014 question ${n} missing`);
      continue;
    }
    const id = `physics-2014-objective-${String(n).padStart(3, '0')}`;
    const options = ['A', 'B', 'C', 'D']
      .filter(label => q.options[label])
      .map(label => ({ label, text: q.options[label] }));

    allRecords.push({
      id,
      subject: 'physics',
      year: 2014,
      category: 'objective',
      question: questionTexts[2014][n] || `JUPEB Physics 2014 Question ${n}`,
      options: JSON.stringify(options),
      correct_answer: q.correctAnswer || 'TBD',
      difficulty: 'medium',
      sort_order: n
    });
  }

  // Process 2015
  for (let n = 1; n <= 50; n++) {
    const q = parsed2015[n];
    if (!q) {
      console.log(`WARNING: 2015 question ${n} missing`);
      continue;
    }
    const id = `physics-2015-objective-${String(n).padStart(3, '0')}`;
    const options = ['A', 'B', 'C', 'D']
      .filter(label => q.options[label])
      .map(label => ({ label, text: q.options[label] }));

    allRecords.push({
      id,
      subject: 'physics',
      year: 2015,
      category: 'objective',
      question: questionTexts[2015][n] || `JUPEB Physics 2015 Question ${n}`,
      options: JSON.stringify(options),
      correct_answer: q.correctAnswer || 'TBD',
      difficulty: 'medium',
      sort_order: n
    });
  }

  console.log(`Total records to insert/upsert: ${allRecords.length}`);

  // Delete existing records for these years first
  for (const year of [2014, 2015]) {
    console.log(`Deleting existing physics ${year} objective questions...`);
    const { error: delErr } = await supabase
      .from('study_questions')
      .delete()
      .eq('subject', 'physics')
      .eq('year', year)
      .eq('category', 'objective');
    if (delErr) {
      console.error(`Delete error for ${year}:`, delErr);
    } else {
      console.log(`Deleted existing physics ${year} objective records`);
    }
  }

  // Insert in batches of 20
  const batchSize = 20;
  for (let i = 0; i < allRecords.length; i += batchSize) {
    const batch = allRecords.slice(i, i + batchSize);
    console.log(`Inserting batch ${Math.floor(i/batchSize) + 1} (${batch.length} records)...`);
    
    const { data, error } = await supabase
      .from('study_questions')
      .insert(batch)
      .select('id, correct_answer');

    if (error) {
      console.error('Insert error:', error);
      // Try upsert instead
      console.log('Trying upsert...');
      for (const record of batch) {
        const { error: upsertErr } = await supabase
          .from('study_questions')
          .upsert(record, { onConflict: 'id' });
        if (upsertErr) {
          console.error(`Upsert error for ${record.id}:`, upsertErr);
        } else {
          console.log(`  ✓ ${record.id} -> ${record.correct_answer}`);
        }
      }
    } else {
      console.log(`  ✓ Batch ${Math.floor(i/batchSize) + 1} inserted:`, data?.length || batch.length, 'records');
      for (const d of data || []) {
        console.log(`  ✓ ${d.id} -> ${d.correct_answer}`);
      }
    }
  }

  // Verify
  console.log('\n=== VERIFICATION ===');
  for (const year of [2014, 2015]) {
    const { data, error } = await supabase
      .from('study_questions')
      .select('id, correct_answer')
      .eq('subject', 'physics')
      .eq('year', year)
      .eq('category', 'objective')
      .order('sort_order');

    if (error) {
      console.error(`Verify error for ${year}:`, error);
    } else {
      console.log(`\nPhysics ${year} objective: ${data.length} questions`);
      for (const d of data) {
        console.log(`  ${d.id} -> ${d.correct_answer}`);
      }
    }
  }
}

main().catch(console.error);
