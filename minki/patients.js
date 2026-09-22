/* ============================================================
   MediShield AI – Patient Dataset (1000 patients)
   Deterministic dummy data – no randomness at runtime
   ============================================================ */

(function() {
  'use strict';

  const firstNames = [
    'James','Maria','Robert','Susan','Michael','Linda','David','Jennifer','William','Patricia',
    'Richard','Barbara','Joseph','Elizabeth','Thomas','Dorothy','Charles','Margaret','Christopher','Lisa',
    'Daniel','Nancy','Matthew','Karen','Anthony','Betty','Mark','Helen','Donald','Sandra',
    'Steven','Donna','Paul','Carol','Andrew','Ruth','Joshua','Sharon','Kenneth','Michelle',
    'Kevin','Laura','Brian','Sarah','George','Kimberly','Timothy','Deborah','Ronald','Jessica',
    'Edward','Shirley','Jason','Cynthia','Jeffrey','Angela','Ryan','Melissa','Jacob','Brenda',
    'Gary','Amy','Nicholas','Anna','Eric','Rebecca','Jonathan','Virginia','Stephen','Kathleen',
    'Larry','Pamela','Justin','Martha','Scott','Debra','Brandon','Amanda','Benjamin','Stephanie',
    'Samuel','Carolyn','Raymond','Christine','Gregory','Marie','Frank','Janet','Alexander','Catherine',
    'Patrick','Frances','Jack','Ann','Dennis','Joyce','Jerry','Diane','Tyler','Alice',
    'Aaron','Julie','Jose','Heather','Adam','Teresa','Nathan','Doris','Henry','Gloria',
    'Douglas','Evelyn','Zachary','Cheryl','Peter','Mildred','Kyle','Katherine','Walter','Joan',
    'Ethan','Ashley','Jeremy','Dora','Harold','Lori','Terry','Madison','Sean','Brittany',
    'Gerald','Samantha','Carl','Diana','Keith','Natalie','Roger','Grace','Arthur','Amber'
  ];

  const lastNames = [
    'Wilson','Garcia','Chen','Taylor','Brown','Anderson','Martinez','Davis','Johnson','Smith',
    'Williams','Jones','Miller','Moore','Jackson','Lee','Thompson','White','Harris','Martin',
    'Young','Walker','Hall','Allen','King','Scott','Green','Baker','Adams','Nelson',
    'Carter','Mitchell','Perez','Robinson','Lewis','Roberts','Turner','Phillips','Campbell','Evans',
    'Edwards','Collins','Stewart','Sanchez','Morris','Rogers','Reed','Cook','Morgan','Bell',
    'Murphy','Bailey','Rivera','Cooper','Richardson','Cox','Howard','Ward','Torres','Peterson',
    'Gray','Ramirez','James','Watson','Brooks','Kelly','Sanders','Price','Bennett','Wood',
    'Barnes','Ross','Henderson','Coleman','Jenkins','Perry','Powell','Long','Patterson','Hughes',
    'Flores','Washington','Butler','Simmons','Foster','Gonzales','Bryant','Alexander','Russell','Griffin',
    'Diaz','Hayes','Myers','Ford','Hamilton','Graham','Sullivan','Wallace','Woods','Cole',
    'West','Jordan','Owens','Reynolds','Fisher','Ellis','Harrison','Gibson','Mcdonald','Cruz',
    'Marshall','Ortiz','Gomez','Murray','Freeman','Wells','Webb','Simpson','Stevens','Tucker',
    'Porter','Hunter','Hicks','Crawford','Henry','Boyd','Mason','Morales','Kennedy','Warren',
    'Dixon','Ramos','Reyes','Burns','Gordon','Shaw','Holmes','Rice','Robertson','Hunt'
  ];

  const diagnoses = [
    'Sepsis','UTI','Pneumonia','Post-op Infection','MRSA','SSI','ARDS','HAI – UTI',
    'Carbapenem-Resistant Klebsiella','Ventilator-Associated Pneumonia','Bacteremia',
    'Clostridium difficile Infection','Central Line-Associated BSI','Surgical Site Infection',
    'Hospital-Acquired Pneumonia','Urinary Catheter Infection','ESBL E. coli',
    'Methicillin-Resistant S. aureus','Vancomycin-Resistant Enterococcus','COVID-19',
    'Influenza A','Tuberculosis','Endocarditis','Meningitis','Peritonitis',
    'Cellulitis','Osteomyelitis','Empyema','Pyelonephritis','Colitis',
    'Appendicitis','Cholecystitis','Pancreatitis','Diverticulitis','Abscess',
    'Soft Tissue Infection','Wound Infection','Respiratory Syncytial Virus',
    'Multidrug-Resistant Acinetobacter','Pseudomonas Aeruginosa Infection'
  ];

  const wards = [
    'ICU-1','ICU-2','ICU-3','MED-1','MED-2','MED-3','MED-4',
    'SUR-1','SUR-2','ISO-1','ISO-2','ISO-3','GEN-1','GEN-2',
    'GEN-3','NEU-1','CAR-1','ONC-1','PED-1','EMG-1'
  ];

  const bloodGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

  const statuses = ['Critical','Stable','Improving','Under Observation','Discharged'];
  const statusWeights = [0.10, 0.35, 0.25, 0.20, 0.10];

  const risks = ['high','medium','low'];
  const riskWeights = [0.20, 0.45, 0.35];

  const antibiotics = [
    'Meropenem','Vancomycin','Piperacillin-Tazobactam','Ceftriaxone','Ciprofloxacin',
    'Metronidazole','Amoxicillin-Clavulanate','Doxycycline','Azithromycin','Linezolid',
    'Colistin','Tigecycline','Imipenem','Cefepime','None'
  ];

  const comorbidities = [
    'Diabetes Mellitus','Hypertension','Chronic Kidney Disease','COPD','Heart Failure',
    'Immunosuppression','Cirrhosis','Malignancy','HIV','Obesity','None','Asthma',
    'Coronary Artery Disease','Rheumatoid Arthritis','Hypothyroidism'
  ];

  const organisms = [
    'E. coli','Klebsiella pneumoniae','Staphylococcus aureus','Pseudomonas aeruginosa',
    'Acinetobacter baumannii','Enterococcus faecium','Streptococcus pneumoniae',
    'Candida albicans','Clostridium difficile','SARS-CoV-2','None identified'
  ];

  const doctors = [
    'Dr. Sarah Kim','Dr. Raj Patel','Dr. Emily Chen','Dr. Carlos Rivera',
    'Dr. James Okafor','Dr. Priya Nair','Dr. Thomas Walsh','Dr. Fatima Al-Hassan',
    'Dr. Michael Torres','Dr. Lisa Wang','Dr. Ahmed Hassan','Dr. Julia Roberts'
  ];

  // Seeded pseudo-random (deterministic)
  function seeded(seed) {
    let s = seed;
    return function() {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 4294967295;
    };
  }

  function pickWeighted(arr, weights, rng) {
    const r = rng();
    let cumulative = 0;
    for (let i = 0; i < arr.length; i++) {
      cumulative += weights[i];
      if (r <= cumulative) return arr[i];
    }
    return arr[arr.length - 1];
  }

  function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function randInt(min, max, rng) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function genDate(startDay, rng) {
    const base = new Date('2024-03-01');
    const offset = Math.floor(rng() * startDay);
    base.setDate(base.getDate() + offset);
    return base.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }

  function genVitals(risk, rng) {
    if (risk === 'high') {
      return {
        bp:   `${randInt(70,95,rng)}/${randInt(40,60,rng)}`,
        hr:   randInt(100,140,rng),
        rr:   randInt(22,35,rng),
        spo2: randInt(82,92,rng),
        temp: (36.5 + rng() * 3.0).toFixed(1),
        gcs:  randInt(6,12,rng),
      };
    } else if (risk === 'medium') {
      return {
        bp:   `${randInt(100,130,rng)}/${randInt(60,85,rng)}`,
        hr:   randInt(80,110,rng),
        rr:   randInt(16,22,rng),
        spo2: randInt(92,97,rng),
        temp: (36.0 + rng() * 2.5).toFixed(1),
        gcs:  randInt(12,15,rng),
      };
    } else {
      return {
        bp:   `${randInt(110,135,rng)}/${randInt(65,90,rng)}`,
        hr:   randInt(60,90,rng),
        rr:   randInt(12,18,rng),
        spo2: randInt(96,100,rng),
        temp: (36.0 + rng() * 1.5).toFixed(1),
        gcs:  15,
      };
    }
  }

  function pickMultiple(arr, count, rng) {
    const shuffled = [...arr].sort(() => rng() - 0.5);
    return shuffled.slice(0, count).join(', ');
  }

  const rng = seeded(42);  // Fixed seed → same 1000 patients every time

  const PATIENTS = [];

  for (let i = 0; i < 1000; i++) {
    const id = `P-${4500 + i}`;
    const firstName = pick(firstNames, rng);
    const lastName  = pick(lastNames, rng);
    const name      = `${firstName} ${lastName}`;
    const age       = randInt(18, 92, rng);
    const gender    = rng() > 0.5 ? 'Male' : 'Female';
    const ward      = pick(wards, rng);
    const diag      = pick(diagnoses, rng);
    const risk      = pickWeighted(risks, riskWeights, rng);
    const status    = pickWeighted(statuses, statusWeights, rng);
    const adm       = genDate(76, rng);   // within ~76 days before 16 May 2024
    const vitals    = genVitals(risk, rng);
    const blood     = pick(bloodGroups, rng);
    const antibiotic= pick(antibiotics, rng);
    const comorbid  = pickMultiple(comorbidities, randInt(1,3,rng), rng);
    const organism  = pick(organisms, rng);
    const doctor    = pick(doctors, rng);
    const los       = randInt(1, 45, rng);  // length of stay (days)
    const ventilator= risk === 'high' && rng() > 0.5;
    const isolation = rng() > 0.6;
    const sofa      = risk === 'high' ? randInt(8,15,rng) : risk === 'medium' ? randInt(4,8,rng) : randInt(0,4,rng);
    const news2     = risk === 'high' ? randInt(7,20,rng) : risk === 'medium' ? randInt(3,7,rng) : randInt(0,3,rng);
    const infectionSite = (['Blood','Urine','Respiratory','Wound','CSF','Unknown'])[Math.floor(rng() * 6)];
    const roomNo    = `${pick(['A','B','C','D'],rng)}${randInt(101,420,rng)}`;

    PATIENTS.push({
      id, name, firstName, lastName, age, gender, ward, diag, risk, status,
      adm, blood, antibiotic, comorbid, organism, doctor, los,
      ventilator, isolation, sofa, news2, infectionSite, roomNo,
      vitals,
    });
  }

  // Expose globally
  window.PATIENTS_DB = PATIENTS;
})();
