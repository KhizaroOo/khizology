/* Infooo learning layer. It leaves the self-hosted renderer and model format unchanged. */
(() => {
  'use strict';
  const source = 'https://www.nhlbi.nih.gov/health/heart/blood-flow';
  const knowledge = {
    heart: ['A muscular organ that pumps blood.', 'In the chest, between the lungs.', 'Its right side sends blood to the lungs. Its left side sends blood to the body.', 'It links the lung loop and the body loop.'],
    'right lung': ['One of the two lungs.', 'On the right side of the chest.', 'In the lungs, blood releases carbon dioxide and picks up oxygen.', 'This is the handoff between breathing and circulation.'],
    'left lung': ['One of the two lungs.', 'On the left side of the chest.', 'In the lungs, blood releases carbon dioxide and picks up oxygen.', 'This is the handoff between breathing and circulation.'],
    'pulmonary trunk': ['The large vessel leaving the right side of the heart.', 'At the top of the heart.', 'It begins the route from the heart toward the lungs.', 'It shows that an artery is named for moving away from the heart.'],
    'pulmonary vein': ['A vessel that returns blood from the lungs.', 'Between the lungs and the left side of the heart.', 'It returns oxygen-rich blood to the heart.', 'It shows that a vein is named for moving toward the heart.'],
    aorta: ['The body’s main artery.', 'It leaves the left side of the heart and arches through the chest.', 'It carries oxygen-rich blood away from the heart toward the body.', 'It starts the body-wide circulation route.'],
    'superior vena cava': ['One of two large veins that return blood to the heart.', 'Above the heart.', 'It returns blood from the upper body to the right side of the heart.', 'It closes the return route from the body.'],
    'inferior vena cava': ['One of two large veins that return blood to the heart.', 'Below the heart.', 'It returns blood from the lower body to the right side of the heart.', 'It closes the return route from the body.']
  };
  const relations = {
    heart: [['pulmonary trunk', 'Blood leaves the right side of the heart toward the lungs.'], ['pulmonary vein', 'Blood returns from the lungs to the left side of the heart.'], ['aorta', 'Blood leaves the left side of the heart toward the body.'], ['superior vena cava', 'Blood from the upper body returns to the right side of the heart.']],
    'right lung': [['pulmonary trunk', 'This route brings blood from the heart toward the lungs.'], ['pulmonary vein', 'This route carries blood from the lungs back toward the heart.'], ['heart', 'The heart sends blood here, then receives it back.']],
    'left lung': [['pulmonary trunk', 'This route brings blood from the heart toward the lungs.'], ['pulmonary vein', 'This route carries blood from the lungs back toward the heart.'], ['heart', 'The heart sends blood here, then receives it back.']],
    'pulmonary trunk': [['heart', 'It carries blood away from the right side of the heart.'], ['right lung', 'It leads toward the lungs.']],
    'pulmonary vein': [['right lung', 'It carries blood away from the lungs.'], ['heart', 'It returns blood to the left side of the heart.']],
    aorta: [['heart', 'It receives blood from the left side of the heart.'], ['inferior vena cava', 'Blood from the body eventually returns through large veins.']],
    'superior vena cava': [['heart', 'It returns blood from the upper body to the heart.']],
    'inferior vena cava': [['heart', 'It returns blood from the lower body to the heart.']]
  };
  const guide = [
    ['heart', '1. The pump', 'Start at the heart. Its right side sends blood to the lungs; its left side sends blood to the body.'],
    ['pulmonary trunk', '2. Toward the lungs', 'Blood leaves the right side through this route and travels toward the lungs.'],
    ['right lung', '3. The gas exchange', 'In the lungs, blood releases carbon dioxide and picks up oxygen.'],
    ['pulmonary vein', '4. Back to the heart', 'Blood returns from the lungs to the left side of the heart.'],
    ['heart', '5. The second pump', 'Now the left side sends that blood out to the body.'],
    ['aorta', '6. Toward the body', 'The aorta is the main route carrying blood away from the heart.'],
    ['inferior vena cava', '7. The return', 'Large veins return blood from the body to the right side of the heart. The cycle begins again.']
  ];
  // Exact concepts verified against the bundled BodyParts3D catalogue.
  const targets = {
    heart: { id: 'FMA7088', name: 'heart' },
    'pulmonary trunk': { id: 'FMA8612', name: 'pulmonary trunk' },
    'right lung': { id: 'FMA7309', name: 'right lung' },
    'left lung': { id: 'FMA7310', name: 'left lung' },
    'pulmonary vein': { id: 'FMA66643', name: 'pulmonary vein' },
    aorta: { id: 'FMA3734', name: 'aorta' },
    'superior vena cava': { id: 'FMA4720', name: 'superior vena cava' },
    'inferior vena cava': { id: 'FMA10951', name: 'inferior vena cava' },
  };
  let guideIndex = -1;
  let unavailable = false;
  let lastSignature = '';
  let notice;
  const getTitle = () => document.querySelector('.detail-sheet .structure-title')?.textContent?.trim().toLowerCase() || '';
  const getId = () => document.querySelector('.detail-sheet .structure-title')?.dataset.atlasId || '';
  const selectedKey = () => Object.keys(targets).find(key => targets[key].id === getId()) || getTitle();
  function selectStructure(key) {
    const target = targets[key];
    if (!target) return false;
    const request = new CustomEvent('infooo-atlas-select', { detail: target.id, cancelable: true });
    document.dispatchEvent(request);
    return request.defaultPrevented && getId() === target.id;
  }
  function announce(message, error = false) { if (notice) { if (notice.textContent !== message) notice.textContent = message; notice.dataset.error = String(error); } }
  function button(label, className, handler) {
    const control = document.createElement('button'); control.type = 'button'; control.className = `ha-learning-button ${className || ''}`; control.textContent = label; control.addEventListener('click', handler); return control;
  }
  function learningContent(key) {
    const fact = knowledge[key]; if (!fact) return null;
    const section = document.createElement('section'); section.className = 'ha-learning-knowledge'; section.dataset.title = key;
    section.innerHTML = '<div class="ha-learning-heading"><span>SELECTED · Source-backed</span><strong>Understand this structure</strong></div>';
    if (targets[key]?.note) { const note = document.createElement('p'); note.textContent = targets[key].note; section.append(note); }
    const list = document.createElement('dl');
    [['What is it?', fact[0]], ['Where is it?', fact[1]], ['What does it do?', fact[2]], ['Why does it matter?', fact[3]]].forEach(([label, value]) => { const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value; list.append(dt, dd); });
    section.append(list);
    if (relations[key]?.length) {
      const related = document.createElement('div'); related.className = 'ha-relationship-list'; related.innerHTML = '<div class="ha-relationship-heading"><span>SELECTED</span><span>→</span><span>RELATED</span><span>· Keeps your view settings</span></div>';
      relations[key].forEach(([target, explanation]) => { const card = button('', 'ha-relation-card', () => {
        if (!selectStructure(target)) announce(`Could not select ${targets[target]?.name || target}. The Atlas may still be loading or the structure is unavailable. Your selection is unchanged.`, true);
      }); card.innerHTML = `<span class="ha-role">RELATED · Select</span><strong>${targets[target]?.name || target}</strong><span>${explanation}</span>`; related.append(card); }); section.append(related);
    }
    const citation = document.createElement('a'); citation.className = 'ha-learning-source'; citation.href = source; citation.target = '_blank'; citation.rel = 'noreferrer'; citation.textContent = 'Source: NIH blood-flow guide ↗'; section.append(citation);
    return section;
  }
  function guideContent() {
    if (guideIndex < 0) return null;
    const [key, label, copy] = guide[guideIndex], target = targets[key];
    const matches = getId() === target.id && !unavailable;
    const card = document.createElement('section'); card.className = 'ha-guide-card'; card.dataset.step = String(guideIndex + 1);
    card.innerHTML = `<span class="ha-role">FOLLOW THE BLOOD · ${guideIndex + 1} / ${guide.length}</span><h3 id="ha-guide-step" tabindex="-1">${matches ? label : unavailable ? 'Structure unavailable' : 'Guide paused for exploration'}</h3>`;
    const paragraph = document.createElement('p'); paragraph.textContent = matches ? copy : `Current selection: ${getTitle() || 'none'}. ${unavailable ? 'The requested structure could not be selected.' : 'Your selection differs from this guide step.'} Resume to select ${target.name}; your other view settings are kept.`; card.append(paragraph);
    if (matches) {
      // Describe what the renderer actually shows: solid teal target, see-through body for context (or the target alone when isolated).
      const isolated = !!document.querySelector('.detail-sheet.is-isolated');
      const observe = document.createElement('p'); observe.textContent = isolated ? `Observe: the ${target.name} is shown on its own. Use Show surrounding anatomy to see where it sits in the body. ${target.note || ''}` : `Observe: the ${target.name} is solid teal. The rest of the body turns see-through so you can see where it sits. Drag to look around, or use Isolate structure to see it alone. ${target.note || ''}`; card.append(observe);
      if (guideIndex === 3) { const aha = document.createElement('p'); aha.className = 'ha-aha'; aha.textContent = 'Aha: artery and vein names describe direction from or to the heart, not oxygen level.'; card.append(aha); }
      const limit = document.createElement('p'); limit.textContent = 'Static reference anatomy: blood movement and gas exchange are explained, not animated or measured here.'; card.append(limit);
    }
    return card;
  }
  function guideControls(actions) {
    actions.querySelector('.ha-guide-controls')?.remove(); if (guideIndex < 0) return;
    const matches = getId() === targets[guide[guideIndex][0]].id && !unavailable;
    const controls = document.createElement('div'); controls.className = 'ha-guide-controls'; controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', 'Follow the Blood navigation');
    const back = button('Back', 'secondary', () => moveGuide(guideIndex - 1, 'back')); back.dataset.action = 'back'; back.disabled = guideIndex === 0; controls.append(back);
    const next = button(!matches ? 'Resume this step' : guideIndex === guide.length - 1 ? 'Finish guide' : 'Next', 'primary', () => !matches ? moveGuide(guideIndex, 'next') : guideIndex === guide.length - 1 ? finishGuide(true) : moveGuide(guideIndex + 1, 'next')); next.dataset.action = 'next'; controls.append(next);
    const restart = button('Restart guide', 'secondary', () => moveGuide(0, 'restart')); restart.dataset.action = 'restart'; controls.append(restart);
    const exit = button('Exit guide', 'text', () => finishGuide(false)); exit.dataset.action = 'exit'; controls.append(exit);
    // Progress stays beside the controls so it is visible even when the step text scrolls.
    const progress = document.createElement('span'); progress.className = 'ha-guide-progress'; progress.setAttribute('aria-hidden', 'true'); progress.textContent = `Follow the Blood · ${guideIndex + 1} / ${guide.length}`; controls.append(progress);
    if (actions.firstChild) actions.firstChild.before(controls); else actions.append(controls);
  }
  function injectDetails() {
    const title = getTitle(), id = getId(), scroll = document.querySelector('.detail-sheet .detail-scroll'), actions = document.querySelector('.detail-sheet .detail-actions');
    if (!title || !scroll || !actions) return;
    const signature = `${id}:${title}:${guideIndex}:${unavailable}`;
    if (lastSignature === signature && scroll.dataset.haLearning === signature) return;
    lastSignature = signature; scroll.dataset.haLearning = signature;
    scroll.querySelector('.ha-learning-knowledge')?.remove(); scroll.querySelector('.ha-guide-card')?.remove();
    const card = guideContent(), content = learningContent(selectedKey());
    actions.querySelector('.ha-guide-controls')?.remove();
    // Step text may scroll; navigation lives in the sheet's fixed action footer so it never scrolls away.
    if (card) { scroll.prepend(card); guideControls(actions); } if (content) scroll.append(content);
    if (guideIndex >= 0 && !unavailable && id !== targets[guide[guideIndex][0]].id) announce(`Guide paused: you are exploring ${title}. Resume this step to return to the guide target.`);
  }
  function moveGuide(index, fromAction) {
    guideIndex = Math.max(0, Math.min(guide.length - 1, index));
    unavailable = !selectStructure(guide[guideIndex][0]);
    announce(unavailable ? `Could not select ${targets[guide[guideIndex][0]].name}. The Atlas may be loading or the structure is unavailable. Your previous selection is unchanged. Use the guide button to retry.` : `Step ${guideIndex + 1} of ${guide.length}: ${targets[guide[guideIndex][0]].name} selected.`, unavailable);
    injectDetails();
    const scroll = document.querySelector('.detail-sheet .detail-scroll'); if (scroll) scroll.scrollTop = 0;
    // Keyboard users who pressed a guide control keep their place in the footer; the live region announces the step.
    const control = fromAction && document.querySelector(`.ha-guide-controls [data-action="${fromAction}"]:not(:disabled)`);
    (control || (fromAction && document.querySelector('.ha-guide-controls [data-action="next"]')) || document.querySelector('#ha-guide-step'))?.focus({ preventScroll: true });
  }
  function finishGuide(complete) {
    guideIndex = -1; unavailable = false; injectDetails();
    announce(complete ? 'Guide complete: you followed the lung and body circuits. Your view is unchanged; start again whenever you like.' : 'Guide closed. Your selection, layers, isolation and camera are unchanged.');
    document.querySelector('.ha-guide-launch')?.focus({ preventScroll: true });
  }
  // Phones: let the reader collapse the text so the selected anatomy stays visible above the sheet.
  let compact = false;
  function installCompactToggle() {
    const sheet = document.querySelector('.detail-sheet'), header = sheet?.querySelector('.detail-header'); if (!sheet || !header) return;
    if (sheet.dataset.haCompact !== String(compact)) sheet.dataset.haCompact = String(compact);
    let toggle = header.querySelector('.ha-compact-toggle');
    if (!toggle) { toggle = button('', 'ha-compact-toggle', () => { compact = !compact; installCompactToggle(); document.dispatchEvent(new Event('infooo-atlas-layout')); }); header.append(toggle); }
    const label = compact ? 'Show text' : 'Hide text';
    if (toggle.textContent !== label) { toggle.textContent = label; toggle.setAttribute('aria-expanded', String(!compact)); }
  }
  function installLauncher() {
    const actions = document.querySelector('.top-actions'); if (!actions) return;
    if (!actions.querySelector('.ha-guide-launch')) {
      const launch = button('Guide me: Follow the Blood', 'ha-guide-launch', () => moveGuide(guideIndex < 0 ? 0 : guideIndex)); launch.setAttribute('aria-label', 'Start or resume Follow the Blood guide'); actions.prepend(launch);
    }
    if (!notice) { notice = document.createElement('p'); notice.className = 'ha-guide-notice'; notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite'); document.querySelector('.studio')?.append(notice); }
  }
  const styles = document.createElement('style'); styles.textContent = `.ha-guide-launch{border:1px solid #458a85!important;background:#458a85!important;color:#fff!important;font-weight:600!important}.ha-guide-launch:hover{background:#336f6b!important}.ha-learning-knowledge,.ha-guide-card{border-top:1px solid #18253618;padding-top:14px;margin-top:14px}.ha-learning-heading,.ha-relationship-heading{display:flex;flex-direction:column;gap:5px}.ha-learning-heading span,.ha-role{font-size:10px;letter-spacing:.1em;color:#397a76;font-weight:700}.ha-learning-heading strong,.ha-guide-card strong{font-size:15px;color:#263b48}.ha-learning-knowledge dl{display:grid;gap:3px 0;margin:13px 0 0}.ha-learning-knowledge dt{font-size:11px;font-weight:700;color:#536573;margin-top:7px}.ha-learning-knowledge dd{font-size:13px;line-height:1.55;color:#52616e;margin:0}.ha-relationship-list{margin-top:16px}.ha-relationship-heading{font-size:10px;line-height:1.4;color:#71808d}.ha-relationship-heading span:nth-child(1),.ha-relationship-heading span:nth-child(3){font-weight:700;color:#397a76}.ha-relation-card{display:flex;flex-direction:column;align-items:flex-start;text-align:left;width:100%;padding:10px 0;border-bottom:1px solid #18253612!important;color:#52616e!important}.ha-relation-card strong{font-size:13px;color:#304956;margin:2px 0}.ha-relation-card>span:last-child{font-size:12px;line-height:1.45}.ha-learning-source{display:block;font-size:11px;color:#397a76;margin-top:14px}.ha-guide-card{background:#e7f4f2;border:1px solid #b5ded8;border-radius:9px;padding:12px;margin-bottom:13px}.ha-guide-card strong{display:block;margin-top:4px}.ha-guide-card p{font-size:13px;line-height:1.5;color:#405461;margin:7px 0 0}.ha-guide-card .ha-aha{border-left:3px solid #458a85;padding-left:8px;color:#294d4b}.ha-guide-controls{display:grid;grid-template-columns:1fr 1.35fr;gap:6px;border-bottom:1px solid #18253618;padding-bottom:9px;margin-bottom:8px}.ha-learning-button{min-height:38px;border-radius:6px;border:1px solid #263b4840!important;font-size:12px;font-weight:600;padding:8px;color:#263b48!important;background:#fff!important}.ha-learning-button.primary{background:#263b48!important;color:#fff!important}.ha-learning-button.text{grid-column:1/-1;border:0!important;min-height:28px;color:#64727e!important;background:transparent!important}.ha-guide-error{font-size:12px;color:#8c3c32}.detail-scroll .ha-guide-card+.ha-learning-knowledge{margin-top:0}@media(max-width:767px){.ha-guide-launch{font-size:0!important;width:38px!important;height:40px!important;padding:0!important}.ha-guide-launch:after{content:'Guide';font-size:9px}.ha-learning-knowledge dd{font-size:13px}.ha-relation-card{min-height:44px}.ha-guide-controls{position:sticky;bottom:0;background:#fffffff5;z-index:2}.detail-scroll .ha-guide-card{margin-top:0}}`;
  document.head.append(styles);
  new MutationObserver(() => { installLauncher(); installCompactToggle(); injectDetails(); if (guideIndex >= 0 && !unavailable && !getId()) announce('Guide panel closed. Use the guide button to resume this step; your view settings are kept.'); }).observe(document.documentElement, { childList: true, subtree: true });
  installLauncher();
})();
