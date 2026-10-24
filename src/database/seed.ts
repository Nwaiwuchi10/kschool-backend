import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://admin:qeU63hsXQITTHfmQ@nchrys.gpcjv.mongodb.net/OddyseySchool';

async function seedDatabase() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected successfully.');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection object not ready');
  }

  // 1. Seed / Upsert Users (Admin & Student)
  const usersCollection = db.collection('users');
  const hashedPasswordAdmin = await bcrypt.hash('AdminPassword123!', 10);
  const hashedPasswordStudent = await bcrypt.hash('StudentPassword123!', 10);

  const adminUser = await usersCollection.findOneAndUpdate(
    { email: 'admin@kschoolmate.com' },
    {
      $set: {
        firstName: 'Admin',
        lastName: 'KSchool',
        email: 'admin@kschoolmate.com',
        password: hashedPasswordAdmin,
        phoneNumber: '+2348011223344',
        class: 'Admin',
        school: 'KSCHOOLMATE Back Office',
        role: 'admin',
        completedLessons: [],
        attendedTopics: [],
        freeTrialUsed: false,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const studentUser = await usersCollection.findOneAndUpdate(
    { email: 'student@kschoolmate.com' },
    {
      $set: {
        firstName: 'Chioma',
        lastName: 'Adeyemi',
        email: 'student@kschoolmate.com',
        password: hashedPasswordStudent,
        phoneNumber: '+2348099887766',
        class: 'JSS 1',
        school: 'Odyssey Academy',
        role: 'student',
        completedLessons: [],
        attendedTopics: [],
        freeTrialUsed: false,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  console.log('Users seeded: admin@kschoolmate.com, student@kschoolmate.com');

  // 2. Seed / Upsert Classes
  const classesCollection = db.collection('classes');
  const classList = [
    { name: 'Primary 1', code: 'primary-1', category: 'Primary', order: 1, isActive: true },
    { name: 'Primary 2', code: 'primary-2', category: 'Primary', order: 2, isActive: true },
    { name: 'Primary 3', code: 'primary-3', category: 'Primary', order: 3, isActive: true },
    { name: 'Primary 4', code: 'primary-4', category: 'Primary', order: 4, isActive: true },
    { name: 'Primary 5', code: 'primary-5', category: 'Primary', order: 5, isActive: true },
    { name: 'Primary 6', code: 'primary-6', category: 'Primary', order: 6, isActive: true },
    { name: 'JSS 1', code: 'jss-1', category: 'Junior Secondary', order: 7, isActive: true },
    { name: 'JSS 2', code: 'jss-2', category: 'Junior Secondary', order: 8, isActive: true },
    { name: 'JSS 3', code: 'jss-3', category: 'Junior Secondary', order: 9, isActive: true },
    { name: 'SSS 1', code: 'sss-1', category: 'Senior Secondary', order: 10, isActive: true },
    { name: 'SSS 2', code: 'sss-2', category: 'Senior Secondary', order: 11, isActive: true },
    { name: 'SSS 3', code: 'sss-3', category: 'Senior Secondary', order: 12, isActive: true },
  ];

  for (const c of classList) {
    await classesCollection.updateOne(
      { code: c.code },
      { $set: { ...c, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
  }
  console.log(`Classes seeded: ${classList.length} school classes`);

  // 3. Seed / Upsert Subscription Packages
  const packagesCollection = db.collection('subscriptionpackages');
  const packageList = [
    {
      name: 'JSS 1 Learning Package',
      academicSession: '2026/2027',
      price: 25000,
      features: [
        'Full access to all JSS 1 subjects',
        'Interactive lessons and practice quizzes',
        'Progress tracking throughout the session',
        'New learning content as it is released',
      ],
    },
    {
      name: 'JSS 2 Learning Package',
      academicSession: '2026/2027',
      price: 25000,
      features: [
        'Full access to all JSS 2 subjects',
        'Interactive lessons and practice quizzes',
        'Progress tracking throughout the session',
        'New learning content as it is released',
      ],
    },
    {
      name: 'JSS 3 Learning Package',
      academicSession: '2026/2027',
      price: 25000,
      features: [
        'Full access to all JSS 3 subjects',
        'BECE Exam preparation past questions',
        'Interactive lessons and practice quizzes',
        'Progress tracking throughout the session',
      ],
    },
    {
      name: 'SSS 1 Learning Package',
      academicSession: '2026/2027',
      price: 25000,
      features: [
        'Full access to all SSS 1 subjects',
        'Science, Arts, and Commercial tracks',
        'Interactive lessons and practice quizzes',
        'Progress tracking throughout the session',
      ],
    },
  ];

  for (const p of packageList) {
    await packagesCollection.updateOne(
      { name: p.name, academicSession: p.academicSession },
      { $set: { ...p, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
  }
  console.log(`Subscription Packages seeded: ${packageList.length} packages`);

  // 4. Seed Subjects, Topics, Lessons, and Quizzes
  const subjectsCollection = db.collection('subjects');
  const topicsCollection = db.collection('topics');
  const lessonsCollection = db.collection('lessons');
  const quizzesCollection = db.collection('quizzes');

  // === SUBJECT 1: JSS 1 Mathematics ===
  const jss1Math = await subjectsCollection.findOneAndUpdate(
    { name: 'Mathematics', classLevel: 'JSS 1' },
    {
      $set: {
        name: 'Mathematics',
        classLevel: 'JSS 1',
        description: 'Core junior secondary mathematics covering arithmetic, number bases, algebra, and geometry.',
        progress: 72,
        topics: [],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const jss1MathId = jss1Math._id;

  // Topic 1: Number Bases (with Mathematics & Binary Arithmetic)
  const numberBasesTopic = await topicsCollection.findOneAndUpdate(
    { subject: jss1MathId, title: 'Number Bases' },
    {
      $set: {
        title: 'Number Bases',
        subject: jss1MathId,
        description: 'Discover how we count in groups of tens, twos, and other bases. Perfect foundation for understanding binary code and computer logic!',
        order: 1,
        status: 'published',
        maxLessons: 4,
        maxQuizQuestions: 4,
        lessons: [],
        quizzes: [],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const nbTopicId = numberBasesTopic._id;

  // Lessons for Number Bases
  const mathLesson1Content = `In the decimal system (Base 10), each digit's value depends on its place value represented by powers of 10:\n\nFor example, the number 3,452 can be expanded as:\n3,452 = (3 × 10³) + (4 × 10²) + (5 × 10¹) + (2 × 10⁰)\n3,452 = (3 × 1,000) + (4 × 100) + (5 × 10) + (2 × 1) = 3,000 + 400 + 50 + 2 = 3,452\n\nNotice that any non-zero number raised to power 0 equals 1 (i.e. 10⁰ = 1, 2⁰ = 1). In base ten, the available digits are 0, 1, 2, 3, 4, 5, 6, 7, 8, 9.`;
  const mathLesson2Content = `Binary arithmetic operates with only two digits: 0 and 1. Each position represents increasing powers of 2 (2⁰=1, 2¹=2, 2²=4, 2³=8, 2⁴=16, 2⁵=32).\n\nLet us convert binary 1101₂ to decimal:\n1101₂ = (1 × 2³) + (1 × 2²) + (0 × 2¹) + (1 × 2⁰)\n1101₂ = (1 × 8) + (1 × 4) + (0 × 2) + (1 × 1)\n1101₂ = 8 + 4 + 0 + 1 = 13₁₀\n\nAddition rules in binary arithmetic:\n0 + 0 = 0\n0 + 1 = 1\n1 + 0 = 1\n1 + 1 = 10₂ (0 carry 1 to the next left column)\n1 + 1 + 1 = 11₂ (1 carry 1).`;
  const mathLesson3Content = `To convert a decimal integer to binary, apply repeated division by 2, recording each remainder from bottom to top:\n\nConvert 25₁₀ to Base 2:\n25 ÷ 2 = 12 remainder 1\n12 ÷ 2 = 6 remainder 0\n6 ÷ 2 = 3 remainder 0\n3 ÷ 2 = 1 remainder 1\n1 ÷ 2 = 0 remainder 1\n\nReading the remainders from last to first gives: 25₁₀ = 11001₂.\n\nVerification:\n11001₂ = (1 × 2⁴) + (1 × 2³) + (0 × 2²) + (0 × 2¹) + (1 × 2⁰)\n= 16 + 8 + 0 + 0 + 1 = 25₁₀. Correct!`;
  const mathLesson4Content = `Let us evaluate binary addition:\nSolve 101₂ + 110₂:\n  1 0 1₂  (5₁₀)\n+ 1 1 0₂  (6₁₀)\n-------\n1 0 1 1₂  (11₁₀)\n\nCalculation steps:\nColumn 1: 1 + 0 = 1\nColumn 2: 0 + 1 = 1\nColumn 3: 1 + 1 = 10₂ (write 0, carry 1)\nTotal: 1011₂.\n\nVerification: 1011₂ = (1×8) + (0×4) + (1×2) + (1×1) = 8 + 0 + 2 + 1 = 11₁₀. Correct!`;

  const mathLessonsData = [
    {
      title: 'Introduction to Base Ten and Positional Notation',
      content: mathLesson1Content,
      duration: '8 mins',
      order: 1,
    },
    {
      title: 'Counting in Base Two (Binary Numbers)',
      content: mathLesson2Content,
      duration: '12 mins',
      order: 2,
    },
    {
      title: 'Converting Bases (Base Ten to Base Two)',
      content: mathLesson3Content,
      duration: '10 mins',
      order: 3,
    },
    {
      title: 'Converting Bases (Two to Ten and Binary Addition)',
      content: mathLesson4Content,
      duration: '15 mins',
      order: 4,
    },
  ];

  const mathLessonIds: any[] = [];
  for (const l of mathLessonsData) {
    const hash = crypto.createHash('sha256').update(l.content).digest('hex');
    const lessonDoc = await lessonsCollection.findOneAndUpdate(
      { topic: nbTopicId, title: l.title },
      {
        $set: {
          ...l,
          topic: nbTopicId,
          status: 'published',
          audioUrl: 'https://res.cloudinary.com/kbgidkub/video/upload/v1792362000/audio/sample_lesson_math.mp3',
          audioDuration: 480,
          audioStatus: 'ready',
          audioVoice: 'en-US-Neural2-F',
          audioGeneratedAt: new Date(),
          audioVersion: 1,
          contentHash: hash,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' },
    );
    mathLessonIds.push(lessonDoc._id);
  }

  // Quiz for Number Bases
  const mathQuiz = await quizzesCollection.findOneAndUpdate(
    { topic: nbTopicId, title: 'Number Bases Knowledge Assessment' },
    {
      $set: {
        title: 'Number Bases Knowledge Assessment',
        topic: nbTopicId,
        questions: [
          {
            questionText: 'What is the value of binary 1101₂ converted to decimal (base 10)?',
            options: ['11', '13', '15', '9'],
            correctOptionIndex: 1,
          },
          {
            questionText: 'Express the decimal number 25₁₀ in binary form (base two):',
            options: ['11001₂', '10101₂', '11100₂', '10011₂'],
            correctOptionIndex: 0,
          },
          {
            questionText: 'Calculate the sum of binary numbers: 10₂ + 11₂',
            options: ['100₂', '101₂', '110₂', '111₂'],
            correctOptionIndex: 1,
          },
          {
            questionText: 'What is 10⁰ + 2⁰ equal to in basic arithmetic?',
            options: ['0', '1', '2', '12'],
            correctOptionIndex: 2,
          },
        ],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  // Update Topic with Lessons and Quiz
  await topicsCollection.updateOne(
    { _id: nbTopicId },
    { $set: { lessons: mathLessonIds, quizzes: [mathQuiz._id] } },
  );

  // Second Topic for JSS 1 Math (Fractions)
  const fractionsTopic = await topicsCollection.findOneAndUpdate(
    { subject: jss1MathId, title: 'Fractions, Decimals, and Percentages' },
    {
      $set: {
        title: 'Fractions, Decimals, and Percentages',
        subject: jss1MathId,
        description: 'Understand equivalent fractions, arithmetic operations (+, -, ×, ÷), and real-world percentage calculations.',
        order: 2,
        status: 'published',
        maxLessons: 2,
        maxQuizQuestions: 2,
        lessons: [],
        quizzes: [],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  // Link topics to Subject
  await subjectsCollection.updateOne(
    { _id: jss1MathId },
    { $set: { topics: [nbTopicId, fractionsTopic._id] } },
  );
  console.log('JSS 1 Mathematics, Number Bases topic, 4 lessons, and quiz seeded.');

  // === SUBJECT 2: JSS 1 English Language ===
  const jss1English = await subjectsCollection.findOneAndUpdate(
    { name: 'English Language', classLevel: 'JSS 1' },
    {
      $set: {
        name: 'English Language',
        classLevel: 'JSS 1',
        description: 'Comprehensive junior English covering grammar, parts of speech, vocabulary, and composition.',
        progress: 45,
        topics: [],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const jss1EngId = jss1English._id;

  // Topic 1: Verbs
  const verbsTopic = await topicsCollection.findOneAndUpdate(
    { subject: jss1EngId, title: 'Verbs' },
    {
      $set: {
        title: 'Verbs',
        subject: jss1EngId,
        description: 'Master action verbs, state of being, linking verbs, and standard sentence structure.',
        order: 1,
        status: 'published',
        maxLessons: 3,
        maxQuizQuestions: 3,
        lessons: [],
        quizzes: [],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const verbsTopicId = verbsTopic._id;

  const engLesson1Content = `A verb is a word that describes an action, state, or occurrence. Verbs are one of the most important parts of speech because they tell us what the subject of a sentence is doing.\n\nAction verbs describe physical or mental actions. Examples include: run, jump, think, believe, eat, and write.\n\nEvery complete sentence must contain at least one verb. The verb works together with the subject to form the core of a sentence.`;
  const engLesson2Content = `Verbs are categorized into three main types:\n1. Action Verbs: Express physical activity (e.g. 'The athlete runs fast') or mental activity (e.g. 'She understands mathematics').\n2. Linking Verbs: Connect the subject to a subject complement without showing action (e.g. 'He is a student', 'The soup tastes delicious').\n3. Helping/Auxiliary Verbs: Assist the main verb to indicate tense, mood, or voice (e.g. 'She has finished her homework', 'They will travel tomorrow').`;
  const engLesson3Content = `Regular verbs form their past tense and past participle simply by adding '-ed' or '-d':\n• play → played\n• walk → walked\n• study → studied\n\nIrregular verbs do not follow this rule and change completely:\n• write → wrote → written\n• go → went → gone\n• see → saw → seen\n• eat → ate → eaten`;

  const engLessonsData = [
    { title: 'Introduction to Verbs', content: engLesson1Content, duration: '8 mins', order: 1 },
    { title: 'Types of Verbs (Action, Linking, Helping)', content: engLesson2Content, duration: '10 mins', order: 2 },
    { title: 'Regular and Irregular Past Tense Verbs', content: engLesson3Content, duration: '12 mins', order: 3 },
  ];

  const engLessonIds: any[] = [];
  for (const l of engLessonsData) {
    const hash = crypto.createHash('sha256').update(l.content).digest('hex');
    const lessonDoc = await lessonsCollection.findOneAndUpdate(
      { topic: verbsTopicId, title: l.title },
      {
        $set: {
          ...l,
          topic: verbsTopicId,
          status: 'published',
          audioUrl: 'https://res.cloudinary.com/kbgidkub/video/upload/v1792362000/audio/sample_lesson_verbs.mp3',
          audioDuration: 360,
          audioStatus: 'ready',
          audioVoice: 'en-US-Journey-F',
          audioGeneratedAt: new Date(),
          audioVersion: 1,
          contentHash: hash,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' },
    );
    engLessonIds.push(lessonDoc._id);
  }

  // Quiz for Verbs
  const engQuiz = await quizzesCollection.findOneAndUpdate(
    { topic: verbsTopicId, title: 'Verb Mastery Assessment' },
    {
      $set: {
        title: 'Verb Mastery Assessment',
        topic: verbsTopicId,
        questions: [
          {
            questionText: 'What is the past tense of "write"?',
            options: ['writes', 'wrote', 'written', 'writing'],
            correctOptionIndex: 1,
          },
          {
            questionText: 'Which of the following is an action verb?',
            options: ['Beautiful', 'Quickly', 'Run', 'Happiness'],
            correctOptionIndex: 2,
          },
          {
            questionText: 'Choose the correct form: She _____ to school yesterday.',
            options: ['go', 'goes', 'went', 'gone'],
            correctOptionIndex: 2,
          },
        ],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  await topicsCollection.updateOne(
    { _id: verbsTopicId },
    { $set: { lessons: engLessonIds, quizzes: [engQuiz._id] } },
  );

  // Second Topic for English (Nouns)
  const nounsTopic = await topicsCollection.findOneAndUpdate(
    { subject: jss1EngId, title: 'Nouns and Pronouns' },
    {
      $set: {
        title: 'Nouns and Pronouns',
        subject: jss1EngId,
        description: 'Explore proper, common, abstract nouns, and personal pronouns.',
        order: 2,
        status: 'published',
        maxLessons: 2,
        maxQuizQuestions: 2,
        lessons: [],
        quizzes: [],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  await subjectsCollection.updateOne(
    { _id: jss1EngId },
    { $set: { topics: [verbsTopicId, nounsTopic._id] } },
  );
  console.log('JSS 1 English Language, Verbs topic, 3 lessons, and quiz seeded.');

  // === SUBJECT 3: SSS 1 Physics ===
  const sss1Physics = await subjectsCollection.findOneAndUpdate(
    { name: 'Physics', classLevel: 'SSS 1' },
    {
      $set: {
        name: 'Physics',
        classLevel: 'SSS 1',
        description: 'Senior secondary physics focusing on mechanics, motion, vectors, forces, and energy transformations.',
        progress: 35,
        topics: [],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const physicsId = sss1Physics._id;

  const motionTopic = await topicsCollection.findOneAndUpdate(
    { subject: physicsId, title: 'Introduction to Motion' },
    {
      $set: {
        title: 'Introduction to Motion',
        subject: physicsId,
        description: 'Understanding displacement, velocity, acceleration, and Newton\'s laws of motion through mathematical equations and practical physical examples.',
        order: 1,
        status: 'published',
        maxLessons: 3,
        maxQuizQuestions: 3,
        lessons: [],
        quizzes: [],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const motionTopicId = motionTopic._id;

  const physLesson1Content = `In linear mechanics, the fundamental equations of motion with constant acceleration 'a' are:\n\n1) v = u + at\n2) s = ut + ½at²\n3) v² = u² + 2as\n\nWhere:\n• u = initial velocity (m/s)\n• v = final velocity (m/s)\n• a = acceleration (m/s²)\n• t = time elapsed (s)\n• s = distance / displacement (m)\n\nExample problem:\nA sports car starts from rest (u = 0 m/s) and accelerates uniformly at a = 4 m/s² for t = 5 s. Calculate its final velocity:\nv = u + at = 0 + (4 × 5) = 20 m/s.\n\nDistance covered:\ns = ut + ½at² = 0 + ½(4)(5²) = ½(4)(25) = 50 m.`;
  const physLesson2Content = `Newton's Second Law states that the rate of change of momentum of a body is directly proportional to the applied resultant force and takes place in the direction of the force:\n\nFormula: F = ma\nWhere:\n• F = resultant force in Newtons (N = kg·m/s²)\n• m = mass of body (kg)\n• a = acceleration (m/s²)\n\nLinear Momentum formula: p = mv (kg·m/s)\n\nExample problem:\nDetermine the net force required to give a 1,200 kg vehicle an acceleration of 2.5 m/s²:\nF = ma = 1,200 kg × 2.5 m/s² = 3,000 N.`;
  const physLesson3Content = `Mechanical work is defined as the product of force and distance moved in the direction of the force:\nW = F × s (Joules, J)\n\nKinetic Energy: E_k = ½mv²\nPotential Energy: E_p = mgh (where g = 9.8 m/s² or 10 m/s²)\nPower: P = W / t (Watts, W = J/s)\n\nExample:\nA crane lifts a 500 kg concrete slab vertically through a height of h = 20 m in t = 10 s (take g = 10 m/s²):\nWork done = mgh = 500 × 10 × 20 = 100,000 J (100 kJ)\nPower output = W / t = 100,000 J / 10 s = 10,000 W (10 kW).`;

  const physLessonsData = [
    { title: 'Speed, Velocity, and Uniform Acceleration', content: physLesson1Content, duration: '12 mins', order: 1 },
    { title: 'Newton\'s Second Law of Motion and Momentum', content: physLesson2Content, duration: '15 mins', order: 2 },
    { title: 'Work, Energy, and Power', content: physLesson3Content, duration: '14 mins', order: 3 },
  ];

  const physLessonIds: any[] = [];
  for (const l of physLessonsData) {
    const hash = crypto.createHash('sha256').update(l.content).digest('hex');
    const lessonDoc = await lessonsCollection.findOneAndUpdate(
      { topic: motionTopicId, title: l.title },
      {
        $set: {
          ...l,
          topic: motionTopicId,
          status: 'published',
          audioUrl: 'https://res.cloudinary.com/kbgidkub/video/upload/v1792362000/audio/sample_lesson_physics.mp3',
          audioDuration: 540,
          audioStatus: 'ready',
          audioVoice: 'en-US-Neural2-D',
          audioGeneratedAt: new Date(),
          audioVersion: 1,
          contentHash: hash,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' },
    );
    physLessonIds.push(lessonDoc._id);
  }

  // Quiz for Physics Motion
  const physicsQuiz = await quizzesCollection.findOneAndUpdate(
    { topic: motionTopicId, title: 'Physics Motion Assessment' },
    {
      $set: {
        title: 'Physics Motion Assessment',
        topic: motionTopicId,
        questions: [
          {
            questionText: 'A vehicle accelerates from rest (u = 0 m/s) at 2 m/s² for 5 s. Using v = u + at, what is its final velocity?',
            options: ['5 m/s', '7 m/s', '10 m/s', '25 m/s'],
            correctOptionIndex: 2,
          },
          {
            questionText: 'Calculate the net force (F = ma) needed to accelerate a 5 kg object at 3 m/s²:',
            options: ['1.67 N', '8 N', '15 N', '25 N'],
            correctOptionIndex: 2,
          },
          {
            questionText: 'What is the Kinetic Energy (E_k = ½mv²) of a 4 kg sphere rolling at v = 3 m/s?',
            options: ['6 J', '12 J', '18 J', '36 J'],
            correctOptionIndex: 2,
          },
        ],
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );

  await topicsCollection.updateOne(
    { _id: motionTopicId },
    { $set: { lessons: physLessonIds, quizzes: [physicsQuiz._id] } },
  );

  // Link to SSS 1 Physics
  await subjectsCollection.updateOne(
    { _id: physicsId },
    { $set: { topics: [motionTopicId] } },
  );
  console.log('SSS 1 Physics, Introduction to Motion, 3 lessons, and quiz seeded.');

  console.log('Database seeding finished successfully!');
  await mongoose.disconnect();
}

seedDatabase().catch((err) => {
  console.error('Database seeding failed:', err);
  process.exit(1);
});
