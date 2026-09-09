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
  let guideIndex = -1;
  let lastTitle = '';
  const getTitle = () => document.querySelector('.detail-sheet .structure-title')?.textContent?.trim().toLowerCase() || '';
  const text = (element) => element?.textContent?.trim() || '';
  const waitFor = (test, timeout = 2600) => new Promise((resolve) => {
    const started = performance.now();
    const tick = () => { const result = test(); if (result || performance.now() - started > timeout) resolve(result || null); else requestAnimationFrame(tick); };
    tick();
  });
  const setInput = (input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  async function selectStructure(name) {
    document.querySelector('[aria-label="Search anatomy"]')?.click();
    const input = await waitFor(() => document.querySelector('[aria-label="Search named anatomical structures"]'));
    if (!input) return false;
    setInput(input, name);
    const item = await waitFor(() => [...document.querySelectorAll('[role="option"], [data-slot="combobox-item"]')].find((candidate) => text(candidate).toLowerCase().startsWith(name)));
    if (!item) return false;
    item.click();
    return Boolean(await waitFor(() => getTitle() === name));
  }
  function button(label, className, handler) {
    const control = document.createElement('button'); control.type = 'button'; control.className = `ha-learning-button ${className || ''}`; control.textContent = label; control.addEventListener('click', handler); return control;
  }
  function learningContent(title) {
    const fact = knowledge[title]; if (!fact) return null;
    const section = document.createElement('section'); section.className = 'ha-learning-knowledge'; section.dataset.title = title;
    section.innerHTML = '<div class="ha-learning-heading"><span>SELECTED · Source-backed</span><strong>Understand this structure</strong></div>';
    const list = document.createElement('dl');
    [['What is it?', fact[0]], ['Where is it?', fact[1]], ['What does it do?', fact[2]], ['Why does it matter?', fact[3]]].forEach(([label, value]) => { const dt = document.createElement('dt'); dt.textContent = label; const dd = document.createElement('dd'); dd.textContent = value; list.append(dt, dd); });
    section.append(list);
    if (relations[title]?.length) {
      const related = document.createElement('div'); related.className = 'ha-relationship-list'; related.innerHTML = '<div class="ha-relationship-heading"><span>SELECTED</span><span>→</span><span>RELATED</span><span>· Other anatomy stays visible</span></div>';
      relations[title].forEach(([target, explanation]) => { const card = button('', 'ha-relation-card', () => selectStructure(target)); card.innerHTML = `<span class="ha-role">RELATED · Select</span><strong>${target}</strong><span>${explanation}</span>`; related.append(card); }); section.append(related);
    }
    const citation = document.createElement('a'); citation.className = 'ha-learning-source'; citation.href = source; citation.target = '_blank'; citation.rel = 'noreferrer'; citation.textContent = 'Source: NIH blood-flow guide ↗'; section.append(citation);
    return section;
  }
  function guideContent() {
    if (guideIndex < 0) return null;
    const [, label, copy] = guide[guideIndex]; const card = document.createElement('section'); card.className = 'ha-guide-card';
    card.innerHTML = `<span class="ha-role">FOLLOW THE BLOOD · ${guideIndex + 1} / ${guide.length}</span><strong>${label}</strong><p>${copy}</p>${guideIndex === 3 ? '<p class="ha-aha"><b>Aha:</b> artery and vein names describe direction from or to the heart — not oxygen level.</p>' : ''}`;
    return card;
  }
  function guideControls(actions) {
    actions.querySelector('.ha-guide-controls')?.remove(); if (guideIndex < 0) return;
    const controls = document.createElement('div'); controls.className = 'ha-guide-controls';
    controls.append(button('Back', 'secondary', () => moveGuide(-1)));
    controls.append(button(guideIndex === guide.length - 1 ? 'Finish & reset' : 'Next', 'primary', () => guideIndex === guide.length - 1 ? finishGuide() : moveGuide(1)));
    controls.append(button('Exit guide', 'text', finishGuide)); actions.prepend(controls);
  }
  function injectDetails() {
    const title = getTitle(), scroll = document.querySelector('.detail-sheet .detail-scroll'), actions = document.querySelector('.detail-sheet .detail-actions');
    if (!title || !scroll || !actions) return;
    const old = scroll.querySelector('.ha-learning-knowledge'); if (old?.dataset.title !== title) old?.remove();
    scroll.querySelector('.ha-guide-card')?.remove();
    const card = guideContent(), content = scroll.querySelector('.ha-learning-knowledge') ? null : learningContent(title);
    if (card) scroll.prepend(card); if (content) scroll.append(content);
    guideControls(actions); lastTitle = title;
  }
  async function moveGuide(delta) {
    guideIndex = Math.max(0, Math.min(guide.length - 1, guideIndex + delta));
    const selected = await selectStructure(guide[guideIndex][0]);
    if (!selected) { const scroll = document.querySelector('.detail-sheet .detail-scroll'); if (scroll) scroll.prepend(Object.assign(document.createElement('p'), { className: 'ha-guide-error', textContent: 'This step could not be focused. Use Find to continue.' })); }
    injectDetails();
  }
  function finishGuide() { guideIndex = -1; document.querySelector('[aria-label="Assemble and reset"]')?.click(); document.querySelector('.detail-sheet [data-slot="sheet-close"]')?.click(); }
  function installLauncher() {
    const actions = document.querySelector('.top-actions'); if (!actions || actions.querySelector('.ha-guide-launch')) return;
    const launch = button('Guide me: Follow the Blood', 'ha-guide-launch', () => { guideIndex = 0; moveGuide(0); }); launch.setAttribute('aria-label', 'Start Follow the Blood guide'); actions.prepend(launch);
  }
  const styles = document.createElement('style'); styles.textContent = `.ha-guide-launch{border:1px solid #458a85!important;background:#458a85!important;color:#fff!important;font-weight:600!important}.ha-guide-launch:hover{background:#336f6b!important}.ha-learning-knowledge,.ha-guide-card{border-top:1px solid #18253618;padding-top:14px;margin-top:14px}.ha-learning-heading,.ha-relationship-heading{display:flex;flex-direction:column;gap:5px}.ha-learning-heading span,.ha-role{font-size:10px;letter-spacing:.1em;color:#397a76;font-weight:700}.ha-learning-heading strong,.ha-guide-card strong{font-size:15px;color:#263b48}.ha-learning-knowledge dl{display:grid;gap:3px 0;margin:13px 0 0}.ha-learning-knowledge dt{font-size:11px;font-weight:700;color:#536573;margin-top:7px}.ha-learning-knowledge dd{font-size:13px;line-height:1.55;color:#52616e;margin:0}.ha-relationship-list{margin-top:16px}.ha-relationship-heading{font-size:10px;line-height:1.4;color:#71808d}.ha-relationship-heading span:nth-child(1),.ha-relationship-heading span:nth-child(3){font-weight:700;color:#397a76}.ha-relation-card{display:flex;flex-direction:column;align-items:flex-start;text-align:left;width:100%;padding:10px 0;border-bottom:1px solid #18253612!important;color:#52616e!important}.ha-relation-card strong{font-size:13px;color:#304956;margin:2px 0}.ha-relation-card>span:last-child{font-size:12px;line-height:1.45}.ha-learning-source{display:block;font-size:11px;color:#397a76;margin-top:14px}.ha-guide-card{background:#e7f4f2;border:1px solid #b5ded8;border-radius:9px;padding:12px;margin-bottom:13px}.ha-guide-card strong{display:block;margin-top:4px}.ha-guide-card p{font-size:13px;line-height:1.5;color:#405461;margin:7px 0 0}.ha-guide-card .ha-aha{border-left:3px solid #458a85;padding-left:8px;color:#294d4b}.ha-guide-controls{display:grid;grid-template-columns:1fr 1.35fr;gap:6px;border-bottom:1px solid #18253618;padding-bottom:9px;margin-bottom:8px}.ha-learning-button{min-height:38px;border-radius:6px;border:1px solid #263b4840!important;font-size:12px;font-weight:600;padding:8px;color:#263b48!important;background:#fff!important}.ha-learning-button.primary{background:#263b48!important;color:#fff!important}.ha-learning-button.text{grid-column:1/-1;border:0!important;min-height:28px;color:#64727e!important;background:transparent!important}.ha-guide-error{font-size:12px;color:#8c3c32}.detail-scroll .ha-guide-card+.ha-learning-knowledge{margin-top:0}@media(max-width:767px){.ha-guide-launch{font-size:0!important;width:38px!important;height:40px!important;padding:0!important}.ha-guide-launch:after{content:'Guide';font-size:9px}.ha-learning-knowledge dd{font-size:13px}.ha-relation-card{min-height:44px}.ha-guide-controls{position:sticky;bottom:0;background:#fffffff5;z-index:2}.detail-scroll .ha-guide-card{margin-top:0}}`;
  document.head.append(styles);
  new MutationObserver(() => { installLauncher(); const title = getTitle(); if (title && (title !== lastTitle || !document.querySelector('.detail-sheet .ha-learning-knowledge'))) injectDetails(); }).observe(document.documentElement, { childList: true, subtree: true });
  installLauncher();
})();
