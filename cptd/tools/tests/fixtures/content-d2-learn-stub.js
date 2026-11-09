/* Test fixture: a tiny Domain 2 `learn` area (one ordered model, one set with
 * decoys and groups, two questions, one case). domain_test.py serves it in place of
 * the real content-d2-learn.js so multi-domain behavior is tested while Domain 2's
 * area files are still empty. Not study content: don't load it in index.html.
 */
window.CPTD_PARTS = window.CPTD_PARTS || [];
window.CPTD_PARTS.push({
  domain: 'd2',
  models: [
    {
      id: 'stub-kolb', area: 'learn', stmts: ['2.1.3'], tag: 'extra',
      name: 'Stub experiential learning cycle', short: 'Stub cycle', who: 'Test fixture', kind: 'ordered', unit: 'stages',
      items: [
        { t: 'Concrete experience', d: 'Doing something new.' },
        { t: 'Reflective observation', d: 'Looking back at what happened.' },
        { t: 'Abstract conceptualization', d: 'Forming a general idea from it.' },
        { t: 'Active experimentation', d: 'Trying the idea out.' },
      ],
      orderNote: 'around the cycle, starting from the experience',
      hook: 'Do, review, conclude, plan.', exam: 'Stub exam text.', src: 'Test fixture',
    },
    {
      id: 'stub-found', area: 'learn', stmts: ['2.1.1'], tag: 'extra',
      name: 'Stub foundational theories', short: 'Stub theories', who: 'Test fixture', kind: 'set', unit: 'theories',
      items: [
        { t: 'Behaviorism', d: 'Learning shows as observable change after reinforcement.' },
        { t: 'Cognitivism', d: 'Learning is mental processing and memory.' },
        { t: 'Constructivism', d: 'Learners build meaning from experience.' },
      ],
      decoys: ['Connectivism', 'Andragogy', 'Heutagogy'],
      groups: [
        { t: 'Outside the mind', m: ['Behaviorism'] },
        { t: 'Inside the mind', m: ['Cognitivism', 'Constructivism'] },
      ],
      hook: 'Behave, think, build.', exam: 'Stub exam text.', note: 'Stub note.', src: 'Test fixture',
    },
  ],
  kin: [],
  questions: [
    { id: 'stub-q-1', stmt: '2.1.3', model: 'stub-kolb', q: 'Stub: which stage comes right after concrete experience?',
      o: ['Reflective observation', 'Active experimentation', 'Abstract conceptualization', 'Goal setting'], a: 0, why: 'Stub why one.' },
    { id: 'stub-q-2', stmt: '2.1.1', model: 'stub-found', q: 'Stub: which theory centers on reinforcement?',
      o: ['Cognitivism', 'Behaviorism', 'Constructivism', 'Connectivism'], a: 1, why: 'Stub why two.' },
  ],
  cases: [
    { id: 'stub-case', title: 'Stub case', stmts: ['2.1.3'], setup: 'Stub setup.',
      steps: [
        { text: 'Stub step one: pick the sound moves.', options: [['Right one', true], ['Wrong one', false], ['Right two', true]], why: 'Stub step why.' },
      ] },
  ],
});
