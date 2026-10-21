/* Terrain-derived water estimate: predicted channels, losing reaches, spring candidates, wetness. */
(() => {
  'use strict';
  if (!window.HYDRO_DATA) return;
  const D = window.HYDRO_DATA, el = id => document.getElementById(id);
  const fmt = (n, d = 2) => Number(n).toLocaleString('ja-JP', {maximumFractionDigits: d});
  const CLASS = {
    1: {name: '地表を流れやすい', color: '#1660b8', dash: null},
    2: {name: '中間（季節で伏流することも）', color: '#4b93d6', dash: null},
    3: {name: '伏流しやすい（谷が浅い）', color: '#8a4fc8', dash: '5 5'}
  };
  for (const [id, z] of [['hydroWet', 380], ['hydroLines', 420]]) map.createPane(id).style.zIndex = z;
  const renderer = L.canvas({pane: 'hydroLines', tolerance: 6});

  const available = new Set(window.HYDRO_TILES || []);
  const blank = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  const WetLayer = L.TileLayer.extend({getTileUrl(c) { const k = c.z + '/' + c.x + '/' + c.y; return available.has(k) ? 'hydro-tiles/' + k + '.webp' : blank; }});
  const wet = new WetLayer('', {pane: 'hydroWet', minZoom: 10, maxNativeZoom: 14, maxZoom: 20, bounds: D.meta.bounds, opacity: .85});

  // Lines are grouped by order so small gullies appear only when zoomed in.
  const byOrder = new Map(), sinkByOrder = new Map();
  const popup = (l, latlng) => {
    const c = CLASS[l[1]];
    return `<div class="hydro-popup"><div class="hydro-kind" style="color:${c.color}">予想川筋 · ${c.name}</div>
      <p>集水面積 約${fmt(l[2])} km² ／ 次数 ${l[0]}<br>周囲からの切れ込み 平均 約${fmt(l[3], 1)} m</p>
      <p class="hydro-note">${l[1] === 3 ? '谷がほとんど刻まれていない区間。水は地表より地下（礫層・溶岩の隙間）を流れやすいと推定。' : l[1] === 1 ? '谷が刻まれ、地下水が谷へ出てきやすい区間。' : '雨の後や雪解け期に表流水が出る程度と推定。'}</p>
      <p class="hydro-note">地形だけからの推定です。実際の水の有無・流れは未確認。</p>
      <a href="https://maps.gsi.go.jp/#17/${latlng.lat.toFixed(6)}/${latlng.lng.toFixed(6)}/" target="_blank" rel="noopener">地理院地図で見る ↗</a></div>`;
  };
  for (const l of D.lines) {
    const pts = [];
    for (let i = 0; i < l[4].length; i += 2) pts.push([l[4][i + 1], l[4][i]]);
    const c = CLASS[l[1]], w = Math.min(5, .9 + l[0] * .6);
    const line = L.polyline(pts, {renderer, color: c.color, weight: w, opacity: l[1] === 2 ? .75 : .95, dashArray: c.dash, lineCap: 'round', bubblingMouseEvents: false});
    line.on('click', e => L.popup({maxWidth: 300}).setLatLng(e.latlng).setContent(popup(l, e.latlng)).openOn(map));
    const target = l[1] === 3 ? sinkByOrder : byOrder, key = Math.min(l[0], 3);
    if (!target.has(key)) target.set(key, L.layerGroup());
    target.get(key).addLayer(line);
  }

  const springs = L.layerGroup();
  for (const s of D.springs) {
    const reappear = s[2] === 'reappear';
    L.circleMarker([s[1], s[0]], {
      // Hollow rings, so they are not confused with the filled site markers.
      radius: reappear ? 6 : 4.5, color: '#0b8794', weight: reappear ? 3 : 2, fillColor: '#e6fbfd', fillOpacity: .9, bubblingMouseEvents: false
    }).bindTooltip(reappear ? '再湧出の候補' : '谷頭湧水の候補', {direction: 'top'})
      .bindPopup(`<div class="hydro-popup"><div class="hydro-kind" style="color:#0b8794">${reappear ? '再湧出の候補（伏流→地表）' : '谷頭湧水の候補'}</div>
        <p>標高 約${fmt(s[5], 0)} m ／ 集水面積 約${fmt(s[3])} km²<br>周囲からの切れ込み 約${fmt(s[4], 1)} m</p>
        <p class="hydro-note">${reappear ? '浅い谷（伏流しやすい区間）から急に深い谷へ変わる地点。地下を流れた水が出てきやすい位置。' : '流路の始まりがすでに斜面へ切れ込んでいる谷頭。湧水が谷を削った地形の可能性。'}</p>
        <p class="hydro-note">地形だけからの候補です。湧水を確認したものではありません。</p>
        <a href="https://maps.gsi.go.jp/#17/${s[1]}/${s[0]}/" target="_blank" rel="noopener">地理院地図で見る ↗</a></div>`, {maxWidth: 300})
      .addTo(springs);
  }

  const state = {lines: true, sink: true, springs: true, wet: false};
  const minOrder = () => { const z = map.getZoom(); return z >= 14 ? 1 : z >= 13 ? 2 : 3; };
  function refresh() {
    const m = minOrder();
    for (const [groups, on] of [[byOrder, state.lines], [sinkByOrder, state.sink]])
      for (const [order, g] of groups) (on && order >= m) ? g.addTo(map) : map.removeLayer(g);
    state.springs && map.getZoom() >= 12 ? springs.addTo(map) : map.removeLayer(springs);
    state.wet ? wet.addTo(map) : map.removeLayer(wet);
    const hint = el('hydro-zoom-hint');
    if (hint) hint.textContent = m === 1 ? 'すべての細い沢を表示中' : `拡大すると細い沢も表示（いまは次数${m}以上）`;
  }

  const counts = {reappear: D.springs.filter(s => s[2] === 'reappear').length, head: D.springs.filter(s => s[2] === 'head').length};
  const Panel = L.Control.extend({options: {position: 'bottomright'}, onAdd() {
    const box = L.DomUtil.create('details', 'hydro-legend');
    box.open = true;
    box.innerHTML = `<summary>水の推定（地形から）</summary>
      <label><input type="checkbox" id="hydro-lines" checked><i class="hydro-swatch" style="background:#1660b8"></i>予想川筋（地表）</label>
      <label><input type="checkbox" id="hydro-sink" checked><i class="hydro-swatch dashed"></i>伏流しやすい区間</label>
      <label><input type="checkbox" id="hydro-springs" checked><i class="hydro-ring"></i>再湧出の候補 ${counts.reappear}</label>
      <span class="hydro-sub"><i class="hydro-ring small"></i>谷頭湧水の候補 ${counts.head}</span>
      <label><input type="checkbox" id="hydro-wet"><i class="hydro-swatch wet"></i>湿りやすさ（TWI）</label>
      <p id="hydro-zoom-hint"></p>
      <p>約${fmt(D.meta.cellMetres, 1)}m格子の標高から計算。地質・井戸・観測は未使用。<a href="利用案内.txt" target="_blank" rel="noopener">考え方 ↗</a></p>`;
    L.DomEvent.disableClickPropagation(box); L.DomEvent.disableScrollPropagation(box);
    return box;
  }});
  new Panel().addTo(map);
  for (const k of ['lines', 'sink', 'springs', 'wet']) el('hydro-' + k).onchange = e => { state[k] = e.target.checked; refresh(); };
  map.on('zoomend', refresh);
  refresh();
})();
