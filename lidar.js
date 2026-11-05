/* LiDAR comparison: relief renderings and canopy height from Nagano's airborne laser surveys,
   one at a time over the CS map, with an optional left/right swipe against what is underneath. */
(() => {
  'use strict';
  const D = window.LIDAR || {};
  const el = id => document.getElementById(id);
  const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  const blank = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  const CKAN = 'https://www.geospatial.jp/ckan/dataset/';
  const CCBY = link('https://creativecommons.org/licenses/by/4.0/deed.ja', 'CC BY');
  // Canopy height colour stops (m) — must match CHM_STOPS in work/build_lidar.py.
  const CHM = [[0, '#f7f5eb'], [2, '#e6eec8'], [5, '#b8db8c'], [10, '#74bb62'], [15, '#3a944a'], [20, '#186c40'], [25, '#0c4c3e'], [30, '#28325a'], [40, '#5a286e']];

  const Local = L.TileLayer.extend({getTileUrl(c) {
    const k = c.z + '/' + c.x + '/' + c.y;
    return this.options.available.has(k) ? 'lidar-tiles/' + this.options.dir + '/' + k + '.webp' : blank;
  }});
  const local = (dir, attribution) => D[dir] && new Local('', {dir, available: new Set(D[dir].tiles), bounds: D[dir].bounds,
    minZoom: 10, maxNativeZoom: D[dir].maxNativeZoom, maxZoom: 20, zIndex: 4, attribution});

  const layers = [
    D.inyou && {id: 'inyou', label: '陰陽図（2021年計測）',
      layer: local('inyou', `陰陽図：${link(CKAN + 'nagaoken-inyouzu-r4', '長野県林務部')}（${CCBY}）。この地図は朝日航洋（株）提供の陰陽図メーカーを用いて作成しました`),
      desc: '尾根・高まりが明るく、谷・くぼみが暗く表れる微地形表現図（1m）。土塁・平坦面・古道・段差を読み取りやすい表現です。',
      credit: '長野県林務部（CC BY）・朝日航洋（株）の陰陽図メーカーで作成。富士見町のみ。'},
    D.shade && {id: 'shade', label: '陰影起伏図・50cm DEM（2021年）',
      layer: local('shade', `陰影起伏図：${link(CKAN + 'r3-4-50cmdem', '長野県林務部 R3・4計測 50cmDEM')}（${CCBY}）を加工`),
      desc: '0.5m間隔の地表の標高から、4方向の光で陰影を付けた図。色の付かない素の起伏で、小さな段差や溝まで見えます。',
      credit: '長野県林務部の50cm DEM（CC BY）からこの地図で陰影を計算。富士見町のみ。'},
    D.dchm && {id: 'dchm', label: '樹冠高（2021年計測）',
      layer: local('dchm', `樹冠高：${link(CKAN + 'r3_dchm', '長野県林務部 R3_DCHM')}（${CCBY}）を加工`),
      desc: '地表から木のてっぺん（建物は屋根）までの高さ。高い森ほど濃い緑で、1m未満は薄く表示します。建物・電柱なども高さとして表れます。',
      credit: '長野県林務部のR3_DCHM（CC BY）をこの地図で色分け。富士見町のみ。',
      legend: true},
    {id: 'cs2013', label: 'CS立体図（2013年計測・森林のみ）',
      layer: L.tileLayer('https://rinya-tiles.geospatial.jp/csmap_067_2025/{z}/{x}/{y}.webp', {minZoom: 10, maxNativeZoom: 18, maxZoom: 20, zIndex: 4,
        bounds: [[35.70, 138.0], [36.02, 138.40]],
        attribution: `CS立体図2013：${link(CKAN + 'inatani_067', '長野県・CS立体図マップタイル（長野県林務部長承認（承認番号７森政第51-2号）に基づき林野庁作成）')}`}),
      desc: '2013年の航空レーザから林野庁が作ったCS立体図（民有林のみ、田畑・集落はなし）。いまのCS立体図（2021年計測）と並べると、8年間の造成や崩れが見つかることがあります。',
      credit: '林野庁作成（長野県林務部長承認 ７森政第51-2号）。オンライン表示。'}
  ].filter(l => l && l.layer);
  if (!layers.length) return;

  let current = null, opacity = 1, swipe = false, ratio = .5;

  const Panel = L.Control.extend({options: {position: 'topright'}, onAdd() {
    const box = L.DomUtil.create('section', 'lidar-panel');
    box.setAttribute('aria-label', 'LiDARの見え方を比べる');
    box.innerHTML = `<strong class="lidar-title">LiDAR（航空レーザ）で比べる</strong>
      <div class="lidar-list" role="radiogroup" aria-label="重ねるLiDARレイヤー">
        <label><input type="radio" name="lidar-layer" value="" checked>重ねない（CS立体図）</label>
        ${layers.map(l => `<label><input type="radio" name="lidar-layer" value="${l.id}">${l.label}</label>`).join('')}
      </div>
      <div class="lidar-body" id="lidar-body" hidden>
        <label class="lidar-row"><input type="checkbox" id="lidar-swipe">左右に分けて比べる（左＝下の地図）</label>
        <label class="lidar-row lidar-slider">濃さ<input type="range" id="lidar-opacity" min="0" max="100" value="100" aria-label="LiDARレイヤーの濃さ"><output id="lidar-pct">100%</output></label>
        <div class="lidar-legend" id="lidar-legend" hidden>
          <div class="lidar-ramp" style="background:linear-gradient(90deg,${CHM.map(([h, c]) => `${c} ${h / 40 * 100}%`).join(',')})"></div>
          <div class="lidar-ticks">${[0, 10, 20, 30, 40].map(h => `<span style="left:${h / 40 * 100}%">${h}${h === 40 ? 'm' : ''}</span>`).join('')}</div>
        </div>
        <p class="lidar-desc" id="lidar-desc"></p>
        <p class="lidar-credit"><span id="lidar-credit"></span> ${link('データ出典.html#lidar', '出典と範囲 ↗')}</p>
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

  function clip() {
    if (!current) return;
    const box = current.layer.getContainer && current.layer.getContainer();
    if (!box) return;
    if (!swipe) { box.style.clip = ''; return; }
    const size = map.getSize();
    const x = Math.round(size.x * ratio);
    const nw = map.containerPointToLayerPoint([0, 0]);
    const se = map.containerPointToLayerPoint(size);
    box.style.clip = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${nw.x + x}px)`;
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

  const select = id => {
    if (current) { const b = current.layer.getContainer && current.layer.getContainer(); if (b) b.style.clip = ''; map.removeLayer(current.layer); }
    current = layers.find(l => l.id === id) || null;
    el('lidar-body').hidden = !current;
    if (!current) { setSwipe(false); return; }
    current.layer.setOpacity(opacity).addTo(map);
    el('lidar-desc').textContent = current.desc;
    el('lidar-credit').textContent = current.credit;
    el('lidar-legend').hidden = !current.legend;
    el('lidar-side-r').textContent = current.label.replace(/（.*$/, '');
    setSwipe(el('lidar-swipe').checked);
  };
  document.querySelectorAll('input[name="lidar-layer"]').forEach(r => { r.onchange = () => select(r.value); });
  el('lidar-swipe').onchange = e => setSwipe(e.target.checked);
  el('lidar-opacity').oninput = e => {
    opacity = +e.target.value / 100;
    if (current) current.layer.setOpacity(opacity);
    el('lidar-pct').textContent = e.target.value + '%';
  };
})();
