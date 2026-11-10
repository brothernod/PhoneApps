/* CPTD Domain 3 metadata: Impacting Organizational Capability (35% of the exam).
 * Areas follow the shards in research/scope.md. Statement labels paraphrase the
 * 2025 CPTD handbook's Detailed Content Outline and keep every named example;
 * numbers are the TDBoK numbers, as in Domains 1 and 2 (3.1.A = 3.1.7, 3.1.B = 3.1.6).
 * The content itself lives in content-d3-<area>.js, one file per area.
 */
window.CPTD_PARTS = window.CPTD_PARTS || [];
window.CPTD_PARTS.push({
  domain: { id: 'd3', num: 3, name: 'Impacting Organizational Capability', short: 'Organizational', weight: 35 },

  areas: [
    { id: 'biz', name: 'Business insight & consulting', stmts: ['3.1.6', '3.1.7', '3.2.1', '3.2.2', '3.2.5', '3.2.8'], tab: '#FFD1A9', icon: '💼' },
    { id: 'od', name: 'Organization development & culture', stmts: ['3.3.2', '3.3.3', '3.3.4', '3.3.8', '3.3.11', '3.3.12'], tab: '#B5E48C', icon: '🏛️' },
    { id: 'strategy', name: 'Talent strategy & management', stmts: ['3.4.3', '3.4.4', '3.4.5', '3.4.16'], tab: '#9BB8FF', icon: '🧭' },
    { id: 'market', name: 'Marketing & communicating TD', stmts: ['3.4.6', '3.4.7', '3.4.8', '3.4.9'], tab: '#F7A072', icon: '📣' },
    { id: 'perf', name: 'Performance improvement', stmts: ['3.5.1', '3.5.4', '3.5.5', '3.5.6', '3.5.7'], tab: '#E8B4F8', icon: '🎯' },
    { id: 'data', name: 'Data & analytics', stmts: ['3.7.2', '3.7.3', '3.7.4', '3.7.6'], tab: '#8EC5C2', icon: '📈' },
    { id: 'change', name: 'Change management & future readiness', stmts: ['3.6.1', '3.8.1', '3.8.3'], tab: '#F6BD60', icon: '🔄' },
  ],

  // Paraphrased from the CPTD content outline, keeping every named example.
  statements: {
    '3.1.6': 'Managing budgets and resources',
    '3.1.7': 'Creating business cases for talent development initiatives using economic, financial, and organizational data',
    '3.2.1': 'Establishing and managing organizational and/or business partnerships and relationships',
    '3.2.2': 'Partnering with other organizational units to provide guidance on departmental or organizational talent requirements',
    '3.2.5': 'Synthesizing information to formulate recommendations or a course of action to gain agreement, support, and/or buy-in from stakeholders',
    '3.2.8': 'Identifying, minimizing, and overcoming organizational barriers to implementing talent development solutions and/or strategies',
    '3.3.2': 'Designing and implementing organizational development strategy',
    '3.3.3': 'Theories and frameworks for the design, interaction, and operation of social, organizational, and informational systems, for example systems thinking, open systems theory, chaos and complexity theory, network theory, and action research',
    '3.3.4': 'Identifying formal and informal relationships, hierarchies, and power dynamics in an organization',
    '3.3.8': 'Creating a culture that encourages and/or creates opportunities for dialogue and feedback between individuals and groups, for example designing collaborative work practices and/or spaces, and role-modeling effective feedback techniques',
    '3.3.11': 'Assessing and evaluating employee engagement',
    '3.3.12': 'Designing and implementing employee engagement strategy',
    '3.4.3': 'Developing a talent strategy that aligns to organizational strategy to influence organizational outcomes in a positive direction',
    '3.4.4': 'Designing and implementing strategic plans for talent development projects, programs, and/or functions',
    '3.4.5': 'Identifying anticipated constraints or problems affecting talent development initiatives, for example resource deficiencies or lack of support',
    '3.4.6': 'Establishing and executing a marketing strategy to promote talent development',
    '3.4.7': 'Designing and implementing communication strategy to drive talent management objectives',
    '3.4.8': 'Communicating how talent development strategies and solutions support the achievement of targeted business/organizational results',
    '3.4.9': 'Communicating the value of lifelong learning and professional development',
    '3.4.16': 'Designing and implementing performance management strategy',
    '3.5.1': 'Theories, models, and principles of human performance improvement',
    '3.5.4': 'Conducting performance analysis to identify goals, gaps, or opportunities',
    '3.5.5': 'Designing and developing performance improvement solutions to address performance gaps',
    '3.5.6': 'Designing and implementing performance support systems and tools, for example instructional resources, data, process models, job aids, and expert advice',
    '3.5.7': 'Conducting analysis of systems to improve human performance, for example determining how organizations learn, closing knowledge or skill gaps, and addressing human factors issues',
    '3.6.1': 'Change management theories and models, for example Lewin, Kotter, Bridges’ transition model, the Kübler-Ross change curve, and appreciative inquiry',
    '3.7.2': 'Gathering and organizing data from internal and/or external sources in logical and/or practical ways to support retrieval and manipulation',
    '3.7.3': 'Identifying stakeholders’ needs, goals, requirements, questions, and objectives to develop a framework and/or plan for data analysis',
    '3.7.4': 'Analyzing and interpreting results of data analyses to identify patterns, trends, and relationships among variables',
    '3.7.6': 'Selecting and/or using data visualization techniques, for example flow charts, graphs, plots, word clouds, and heat maps',
    '3.8.1': 'Internal and external factors that influence talent development, for example organizational/business strategies, availability of labor, developments in other industries, societal trends, and technological advances',
    '3.8.3': 'Techniques to promote, support, and/or generate innovation and creativity, for example design thinking, brainstorming, and ideation',
  },

  // Related models across Domain 3's areas and the earlier domains (overlapping steps or items,
  // or one list inside another). "Which model?" never offers a kin model as a wrong answer.
  kin: [
    { all: ['od-phases', 'block-phases', 'sb-phases', 'perf-consulting-process'] },
    { hub: 'action-research', with: ['od-phases', 'lewin-change', 'data-analysis-steps'] },
    { all: ['french-raven', 'mendelow-grid'] },
    { all: ['open-systems', 'hpi-systems-view', 'rummler-levels'] },
    { all: ['q12-levels', 'maslow'] },
    { all: ['td-factors', 'data-int-ext'] },
    { all: ['atd-hpi-model', 'addie'] },
    { hub: 'perf-support-examples', with: ['job-aid-candidates', 'job-aid-formats'] },
    { all: ['five-moments', 'mle'] },
    { hub: 'td-barriers', with: ['gilbert-bem', 'constraints-named'] },
    { all: ['invest-metrics', 'roi-formulas'] },
    { all: ['scale-align', 'perf-gap-analysis'] },
    { all: ['stakeholder-steps', 'mendelow-grid', 'data-stakeholder-segments', 'data-framing', 'labin-audiences'] },
    { all: ['corr-causation', 'roi-isolate'] },
    { all: ['data-qual-quant', 'phillips-hard-data'] },
    { all: ['data-prim-sec', 'data-int-ext'] },
    { all: ['data-cleaning', 'data-practices'] },
    { all: ['interpret-pitfalls', 'biases'] },
  ],

  exam: {
    facts: [
      ['This domain', 'About 32 of the 90 multiple-choice questions (35% of the exam), plus a matching share of case steps, drawn from 32 statements across eight capabilities: Business Insight (3.1), Consulting & Business Partnering (3.2), Organization Development & Culture (3.3), Talent Strategy & Management (3.4), Performance Improvement (3.5), Change Management (3.6), Data & Analytics (3.7), and Future Readiness (3.8).'],
    ],
    tips: [
      'Domain 3 has many statements but few questions per statement, and most are “skill in” statements. Expect applied scenarios: what should a TD leader do first, or which approach fits the situation.',
      'The statements that name models are the safest bets for recall questions: 3.3.3 (systems theories and action research), 3.5.1 (human performance improvement models), and 3.6.1 (Lewin, Kotter, Bridges, Kübler-Ross, appreciative inquiry). Learn their stages in order.',
    ],
  },
  version: '2026-11-09',
});
