/* Test fixture: a tiny Domain 2 `learn` area whose items clash with Domain 1 on purpose.
 * kin_test.py serves it in place of content-d2-learn.js and empties the other Domain 2
 * area files, so Domain 2's "which model?" cards need decoys from Domain 1.
 * "Quiet storming" shares a stem with Tuckman's "Storming" (an item clash, on its second word so only the strict test catches it), and
 * "Situational awareness" with the model name "Situational leadership" (a name clash):
 * neither model may be offered as a decoy for those items. Item uniqueness is only
 * checked within a domain, so both items still get "which model?" cards.
 * Not study content: don't load it in index.html.
 */
window.CPTD_PARTS = window.CPTD_PARTS || [];
window.CPTD_PARTS.push({
  domain: 'd2',
  models: [
    {
      id: 'xstub-a', area: 'learn', stmts: ['2.1.1'], tag: 'extra',
      name: 'Stub clash model', short: 'Stub clash', who: 'Test fixture', kind: 'set', unit: 'parts',
      items: [
        { t: 'Quiet storming', d: 'Arguing in low voices.' },
        { t: 'Situational awareness', d: 'Knowing what goes on around you.' },
        { t: 'Zebra crossing', d: 'A striped place to cross.' },
      ],
      hook: 'Stub hook.', exam: 'Stub exam text.', src: 'Test fixture',
    },
    {
      id: 'xstub-b', area: 'learn', stmts: ['2.1.3'], tag: 'extra',
      name: 'Stub plain model', short: 'Stub plain', who: 'Test fixture', kind: 'set', unit: 'parts',
      items: [
        { t: 'Quartz pebble', d: 'A small clear rock.' },
        { t: 'Velvet ribbon', d: 'A soft strip of cloth.' },
        { t: 'Walnut shell', d: 'The hard outside of a nut.' },
      ],
      hook: 'Stub hook.', exam: 'Stub exam text.', src: 'Test fixture',
    },
  ],
  kin: [],
  questions: [],
  cases: [],
});
