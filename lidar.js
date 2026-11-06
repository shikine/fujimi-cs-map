/* LiDAR comparison: relief renderings and canopy height from Nagano's airborne laser surveys,
   one at a time over the CS map, with an optional left/right swipe against what is underneath.
   The last entry replays valley cutting on a relative time axis (stages cross-faded). */
(() => {
  'use strict';
  const D = window.LIDAR || {};
  const P = window.PALEO;
  const el = id => document.getElementById(id);
  const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  const blank = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  const CKAN = 'https://www.geospatial.jp/ckan/dataset/';
  const CCBY = link('https://creativecommons.org/licenses/by/4.0/deed.ja', 'CC BY');
  // Canopy height colour stops (m) — must match CHM_STOPS in work/build_lidar.py.
  const CHM = [[0, '#f7f5eb'], [2, '#e6eec8'], [5, '#b8db8c'], [10, '#74bb62'], [15, '#3a944a'], [20, '#186c40'], [25, '#0c4c3e'], [30, '#28325a'], [40, '#5a286e']];

  const Local = L.TileLayer.extend({getTileUrl(c) {
    const k = c.z + '/' + c.x + '/' + c.y;
    return this.options.available.has(k) ? this.options.base + k + '.webp' : blank;
  }});
  const local = (dir, attribution) => D[dir] && [new Local('', {base: 'lidar-tiles/' + dir + '/', available: new Set(D[dir].tiles), bounds: D[dir].bounds,
    minZoom: 10, maxNativeZoom: D[dir].maxNativeZoom, maxZoom: 20, zIndex: 4, attribution})];

  const layers = [
    D.inyou && {id: 'inyou', label: '陰陽図（2021年計測）',
      layers: local('inyou', `陰陽図：${link(CKAN + 'nagaoken-inyouzu-r4', '長野県林務部')}（${CCBY}）。この地図は朝日航洋（株）提供の陰陽図メーカーを用いて作成しました`),
      desc: '尾根・高まりが明るく、谷・くぼみが暗く表れる微地形表現図（1m）。土塁・平坦面・古道・段差を読み取りやすい表現です。',
      credit: '長野県林務部（CC BY）・朝日航洋（株）の陰陽図メーカーで作成。富士見町のみ。'},
    D.shade && {id: 'shade', label: '陰影起伏図・50cm DEM（2021年）',
      layers: local('shade', `陰影起伏図：${link(CKAN + 'r3-4-50cmdem', '長野県林務部 R3・4計測 50cmDEM')}（${CCBY}）を加工`),
      desc: '0.5m間隔の地表の標高から、4方向の光で陰影を付けた図。色の付かない素の起伏で、小さな段差や溝まで見えます。',
      credit: '長野県林務部の50cm DEM（CC BY）からこの地図で陰影を計算。富士見町のみ。'},
    D.dchm && {id: 'dchm', label: '樹冠高（2021年計測）',
      layers: local('dchm', `樹冠高：${link(CKAN + 'r3_dchm', '長野県林務部 R3_DCHM')}（${CCBY}）を加工`),
      desc: '地表から木のてっぺん（建物は屋根）までの高さ。高い森ほど濃い緑で、1m未満は薄く表示します。建物・電柱なども高さとして表れます。',
      credit: '長野県林務部のR3_DCHM（CC BY）をこの地図で色分け。富士見町のみ。',
      legend: true},
    {id: 'cs2013', label: 'CS立体図（2013年計測・森林のみ）',
      layers: [L.tileLayer('https://rinya-tiles.geospatial.jp/csmap_067_2025/{z}/{x}/{y}.webp', {minZoom: 10, maxNativeZoom: 18, maxZoom: 20, zIndex: 4,
        bounds: [[35.70, 138.0], [36.02, 138.40]],
        attribution: `CS立体図2013：${link(CKAN + 'inatani_067', '長野県・CS立体図マップタイル（長野県林務部長承認（承認番号７森政第51-2号）に基づき林野庁作成）')}`})],
      desc: '2013年の航空レーザから林野庁が作ったCS立体図（民有林のみ、田畑・集落はなし）。いまのCS立体図（2021年計測）と並べると、8年間の造成や崩れが見つかることがあります。',
      credit: '林野庁作成（長野県林務部長承認 ７森政第51-2号）。オンライン表示。'},
    P && {id: 'paleo', label: '谷が刻まれた20万年（文献の年代で再現）', time: true,
      layers: P.ages.map((_, s) => new Local('', {base: `paleo-tiles/s${s}/`, available: new Set(P.tiles), bounds: P.bounds,
        minZoom: P.minZoom, maxNativeZoom: P.maxNativeZoom, maxZoom: 20, zIndex: 4,
        attribution: '谷が刻まれた20万年（推定）：標高は産総研シームレス標高タイル・国土地理院、地質は産総研シームレス地質図V2、年代は論文・報告書（データ出典参照）'})),
      desc: '地質図で場所ごとに面のでき方（扇状地・韮崎岩屑なだれ・八ヶ岳の溶岩・段丘）を分け、論文の年代からその面に谷が刻まれ始めたとして、下流から上流へ一定の速さで削られていく様子を再現しました。茶色はその時点から後に削られる部分。南アルプスなどの基盤岩の山地は、隆起と侵食が釣り合うとして今の形のままです。火山や扇状地が積み上がっていく過程は描いていないため、編笠山（約16万年前）なども最初から表示されます。断層の横ずれは地形には描かず、上に数値で示します。',
      credit: '年代：河内1977・大石鈴木2004・西来ほか2007・井口1989・地震本部2015・山中後藤2023ほか。地質：産総研シームレス地質図V2。範囲は富士見全域と白州北部。'}
  ].filter(l => l && l.layers);
  if (!layers.length) return;

  let current = null, opacity = 1, swipe = false, ratio = .5, t = 0, playing = 0;
  // Time axis: slider position t (0..1) -> years ago. Squared so the recent past gets room.
  const OLDEST = P ? P.ages[0] : 200000;
  const ageAt = p => Math.round(OLDEST * (1 - p) ** 2);
  const posOf = age => 1 - Math.sqrt(age / OLDEST);
  const REFS = window.PALEO_REFS || {}, EVENTS = window.PALEO_EVENTS || [], RATES = window.PALEO_RATES || [];
  const yearsText = a => a <= 0 ? '現在' : a >= 10000 ? `約${(a / 10000).toFixed(a >= 100000 ? 0 : 1).replace(/\.0$/, '')}万年前` : `約${Math.round(a / 100) * 100}年前`;
  const cites = keys => keys.map(k => REFS[k] && link(REFS[k].url, REFS[k].short)).filter(Boolean).join('・');
  const faults = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/afm/{z}/{x}/{y}.png', {minZoom: 10, maxNativeZoom: 16, maxZoom: 20, zIndex: 6, opacity: .85,
    attribution: `活断層：${link('https://www.gsi.go.jp/bousaichiri/active_fault.html', '国土地理院 都市圏活断層図')}`});

  const Panel = L.Control.extend({options: {position: 'topright'}, onAdd() {
    const box = L.DomUtil.create('section', 'lidar-panel');
    box.setAttribute('aria-label', 'LiDARの見え方を比べる');
    box.innerHTML = `<strong class="lidar-title">LiDAR（航空レーザ）で比べる</strong>
      <div class="lidar-list" role="radiogroup" aria-label="重ねるLiDARレイヤー">
        <label><input type="radio" name="lidar-layer" value="" checked>重ねない（CS立体図）</label>
        ${layers.map(l => `<label><input type="radio" name="lidar-layer" value="${l.id}">${l.label}</label>`).join('')}
      </div>
      <div class="lidar-body" id="lidar-body" hidden>
        <div class="lidar-time" id="lidar-time" hidden>
          <div class="lidar-row"><button type="button" id="lidar-play" aria-label="再生">▶</button>
            <div class="lidar-track"><input type="range" id="lidar-t" min="0" max="1000" value="0" aria-label="時代（20万年前から現在まで）">
              <div class="lidar-marks">${EVENTS.filter(e => e.age > 0).map(e => `<i style="left:${posOf(e.age) * 100}%" title="${yearsText(e.age)}"></i>`).join('')}</div></div></div>
          <div class="lidar-time-ends"><span>${yearsText(OLDEST)}</span><output id="lidar-phase"></output><span>現在</span></div>
          <p class="lidar-event" id="lidar-event"></p>
          <p class="lidar-offsets" id="lidar-offsets"></p>
          <label class="lidar-row"><input type="checkbox" id="lidar-faults">活断層の線を重ねる（国土地理院）</label>
        </div>
        <label class="lidar-row"><input type="checkbox" id="lidar-swipe">左右に分けて比べる（左＝下の地図）</label>
        <label class="lidar-row lidar-slider">濃さ<input type="range" id="lidar-opacity" min="0" max="100" value="100" aria-label="LiDARレイヤーの濃さ"><output id="lidar-pct">100%</output></label>
        <div class="lidar-legend" id="lidar-legend" hidden>
          <div class="lidar-ramp" style="background:linear-gradient(90deg,${CHM.map(([h, c]) => `${c} ${h / 40 * 100}%`).join(',')})"></div>
          <div class="lidar-ticks">${[0, 10, 20, 30, 40].map(h => `<span style="left:${h / 40 * 100}%">${h}${h === 40 ? 'm' : ''}</span>`).join('')}</div>
        </div>
        <details class="lidar-more"><summary>説明と出典</summary>
          <p class="lidar-desc" id="lidar-desc"></p>
          <p class="lidar-credit"><span id="lidar-credit"></span> <a id="lidar-source" href="データ出典.html#lidar" target="_blank" rel="noopener">出典と範囲 ↗</a></p>
        </details>
      </div>`;
    L.DomEvent.disableClickPropagation(box); L.DomEvent.disableScrollPropagation(box);
    return box;
  }});
  new Panel().addTo(map);

  // Swipe divider over the map. The selected layer is clipped to the right of it.
  const container = map.getContainer();
  const divider = L.DomUtil.create('div', 'lidar-divider', container);
  divider.hidden = true;
  divider.innerHTML = `<span class="lidar-side lidar-side-l">下の地図</span><span class="lidar-side lidar-side-r" id="lidar-side-r"></span>
    <button type="button" class="lidar-handle" aria-label="比較の境目を左右に動かす">◀▶</button>`;
  L.DomEvent.disableClickPropagation(divider); L.DomEvent.disableScrollPropagation(divider);
  const handle = divider.querySelector('.lidar-handle');
  const boxes = () => current ? current.layers.map(l => l.getContainer && l.getContainer()).filter(Boolean) : [];

  function clip() {
    if (!current) return;
    if (!swipe) { boxes().forEach(b => { b.style.clip = ''; }); return; }
    const size = map.getSize();
    const x = Math.round(size.x * ratio);
    const nw = map.containerPointToLayerPoint([0, 0]);
    const se = map.containerPointToLayerPoint(size);
    boxes().forEach(b => { b.style.clip = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${nw.x + x}px)`; });
    divider.style.left = x + 'px';
  }
  map.on('move zoom zoomend resize viewreset', clip);

  let dragging = false;
  handle.addEventListener('pointerdown', e => {
    dragging = true; handle.setPointerCapture(e.pointerId); map.dragging.disable(); e.preventDefault();
  });
  handle.addEventListener('pointermove', e => {
    if (!dragging) return;
    const r = container.getBoundingClientRect();
    ratio = Math.min(.97, Math.max(.03, (e.clientX - r.left) / r.width));
    clip();
  });
  const stop = () => { if (dragging) { dragging = false; map.dragging.enable(); } };
  handle.addEventListener('pointerup', stop); handle.addEventListener('pointercancel', stop);
  handle.addEventListener('keydown', e => {
    const step = e.key === 'ArrowLeft' ? -.05 : e.key === 'ArrowRight' ? .05 : 0;
    if (step) { ratio = Math.min(.97, Math.max(.03, ratio + step)); clip(); e.preventDefault(); }
  });

  function setSwipe(on) {
    swipe = on && !!current;
    divider.hidden = !swipe;
    container.classList.toggle('lidar-swiping', swipe);
    clip();
  }

  // Time axis: frame k (older) shows fully, frame k+1 (younger) fades in above it.
  function paint() {
    if (!current) return;
    if (!current.time) { current.layers[0].setOpacity(opacity); return; }
    const ages = P.ages, age = ageAt(t);
    let k = 0;
    while (k < ages.length - 2 && age < ages[k + 1]) k++;
    const f = Math.min(1, Math.max(0, (ages[k] - age) / (ages[k] - ages[k + 1])));
    current.layers.forEach((l, i) => l.setOpacity(i === k ? opacity : i === k + 1 ? opacity * f : 0));
    el('lidar-t').value = Math.round(t * 1000);
    el('lidar-phase').textContent = yearsText(age);
    // The latest dated event at or before the selected time.
    const ev = EVENTS.filter(e => e.age >= age).sort((a, b) => a.age - b.age)[0];
    el('lidar-event').innerHTML = ev ? `<b>${yearsText(ev.age)}</b> ${ev.text}${ev.refs.length ? `（${cites(ev.refs)}）` : ''}` : '';
    el('lidar-offsets').innerHTML = age > 0 ? 'この時から現在までの動き（年平均の値から）：' + RATES.map(r => {
      const lo = r.lo * age / 1000, hi = r.hi * age / 1000, m = v => v >= 1000 ? (v / 1000).toFixed(1) + 'km' : Math.round(v) + 'm';
      return `${r.name} ${r.kind} ${lo === hi ? '約' + m(lo) : `${m(lo)}〜${m(hi)}`}（${cites(r.refs)}）`;
    }).join('／') : '';
  }
  function setPlaying(on) {
    if (playing) cancelAnimationFrame(playing);
    playing = 0;
    el('lidar-play').textContent = on ? '❚❚' : '▶';
    el('lidar-play').setAttribute('aria-label', on ? '一時停止' : '再生');
    if (!on) return;
    if (t >= 1) t = 0;
    let last = performance.now();
    const tick = now => {
      t = Math.min(1, t + (now - last) / 15000); last = now;  // whole replay in ~15 s
      paint();
      if (t >= 1) { setPlaying(false); return; }
      playing = requestAnimationFrame(tick);
    };
    playing = requestAnimationFrame(tick);
  }

  const select = id => {
    setPlaying(false);
    map.removeLayer(faults); el('lidar-faults').checked = false;
    if (current) { boxes().forEach(b => { b.style.clip = ''; }); current.layers.forEach(l => map.removeLayer(l)); }
    current = layers.find(l => l.id === id) || null;
    el('lidar-body').hidden = !current;
    if (!current) { setSwipe(false); return; }
    // Every stage is added up front (hidden ones at opacity 0) so playback does not wait on tiles.
    current.layers.forEach(l => l.setOpacity(0).addTo(map));
    el('lidar-time').hidden = !current.time;
    paint();
    el('lidar-desc').textContent = current.desc;
    el('lidar-credit').textContent = current.credit;
    el('lidar-source').href = 'データ出典.html#' + (current.time ? 'paleo' : 'lidar');
    el('lidar-legend').hidden = !current.legend;
    el('lidar-side-r').textContent = current.label.replace(/（.*$/, '');
    setSwipe(el('lidar-swipe').checked);
    // On short desktop screens the open water legend (bottom right) would cover this panel: fold it.
    const water = document.querySelector('.hydro-legend');
    if (water && water.open && !water.closest('.m-sheet') &&
        el('lidar-body').getBoundingClientRect().bottom > water.getBoundingClientRect().top) water.open = false;
  };
  document.querySelectorAll('input[name="lidar-layer"]').forEach(r => { r.onchange = () => select(r.value); });
  el('lidar-swipe').onchange = e => setSwipe(e.target.checked);
  el('lidar-opacity').oninput = e => {
    opacity = +e.target.value / 100;
    paint();
    el('lidar-pct').textContent = e.target.value + '%';
  };
  el('lidar-t').oninput = e => { setPlaying(false); t = +e.target.value / 1000; paint(); };
  el('lidar-play').onclick = () => setPlaying(!playing);
  el('lidar-faults').onchange = e => { if (e.target.checked) faults.addTo(map); else map.removeLayer(faults); };
})();
