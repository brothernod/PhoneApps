/* CPTD Domain 2 metadata: Developing Professional Capability (45% of the exam).
 * Areas follow the shards in research/scope.md. Statement labels paraphrase the
 * 2025 CPTD handbook's Detailed Content Outline and keep every named example;
 * numbers are the TDBoK numbers, as in Domain 1.
 * The content itself lives in content-d2-<area>.js, one file per area.
 */
window.CPTD_PARTS = window.CPTD_PARTS || [];
window.CPTD_PARTS.push({
  domain: { id: 'd2', num: 2, name: 'Developing Professional Capability', short: 'Professional', weight: 45 },

  areas: [
    { id: 'learn', name: 'Learning sciences & facilitation', stmts: ['2.1.1', '2.1.3', '2.3.3'], tab: '#5ED6C6', icon: '🧠' },
    { id: 'design', name: 'Instructional design', stmts: ['2.2.4', '2.2.6', '2.2.11', '2.2.12'], tab: '#FF8A8A', icon: '📐' },
    { id: 'techkm', name: 'Technology & knowledge management', stmts: ['2.4.1', '2.4.4', '2.5.3', '2.5.7'], tab: '#D4E86A', icon: '💻' },
    { id: 'people', name: 'Leadership development & coaching', stmts: ['2.6.6', '2.6.8', '2.7.2', '2.7.3'], tab: '#AFC0D4', icon: '🌱' },
    { id: 'eval', name: 'Evaluating impact', stmts: ['2.8.1', '2.8.3', '2.8.4'], tab: '#D9C2A0', icon: '📊' },
  ],

  // Paraphrased from the CPTD content outline, keeping every named example.
  statements: {
    '2.1.1': 'Foundational learning theories of behaviorism, cognitivism, and constructivism',
    '2.1.3': 'Theories and models of adult learning, such as Knowles’ Adult Learning Theory, Bloom’s Taxonomy, Gagne’s Nine Levels of Learning, Mager’s Criterion-Referenced Instruction Approach, social and collaborative learning, and experiential learning',
    '2.2.4': 'Developing learning and behavioral outcome statements',
    '2.2.6': 'Designing blueprints, schematics, and/or other visual representations of learning and development solutions, such as wireframes, storyboards, and mock-ups',
    '2.2.11': 'Selecting and aligning delivery options and media for training and/or learning events to the desired learning or behavioral outcomes',
    '2.2.12': 'Designing and/or developing learning assets, such as role plays, self-assessments, training manuals, job aids, and visual aids, that align to a desired learning or behavioral outcome',
    '2.3.3': 'Facilitation methods and techniques',
    '2.4.1': 'Selecting, integrating, managing, and maintaining learning platforms, such as learning management, knowledge management, and performance management systems',
    '2.4.4': 'Identifying, selecting, and implementing learning technologies, such as using evaluative criteria and identifying appropriate applications in an instructional environment',
    '2.5.3': 'Designing and implementing knowledge management strategy',
    '2.5.7': 'Curating instructional content, tools, and resources, such as researching, evaluating, selecting, and assembling publicly available online courseware',
    '2.6.6': 'Developing and implementing qualification programs',
    '2.6.8': 'Sourcing, designing, building, and evaluating leadership development experiences',
    '2.7.2': 'Helping individuals or teams identify goals, develop realistic action plans, seek development opportunities, and monitor progress and accountability',
    '2.7.3': 'Coaching supervisors and managers on methods and approaches for supporting employee development',
    '2.8.1': 'Models and methods to evaluate the impact of learning and talent development solutions',
    '2.8.3': 'Identifying and defining individual and organizational outcome metrics based on evaluation strategy and business objectives',
    '2.8.4': 'Creating data collection tools, such as questionnaires, surveys, and structured interviews',
  },

  exam: {
    facts: [
      ['This domain', 'About 40 questions’ worth (45% of the exam), drawn from 18 statements: 2.1.1, 2.1.3, 2.2.4, 2.2.6, 2.2.11, 2.2.12, 2.3.3, 2.4.1, 2.4.4, 2.5.3, 2.5.7, 2.6.6, 2.6.8, 2.7.2, 2.7.3, 2.8.1, 2.8.3, and 2.8.4.'],
    ],
    tips: [
      'This is the biggest domain. Adult learning theories (2.1.3) and evaluation models (2.8.1) carry the most named models: learn who each one comes from and its levels or steps in order.',
      'Expect applied questions: which theory, design choice, technology, or evaluation level fits the scenario.',
    ],
  },
});
