/* Old maps and photos by era: prewar 1:50,000 sheets (1929-31) and GSI aerial photos (1974-78). */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  const blank = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  const eras = [];

  if (window.OLDMAP) {
    const D = window.OLDMAP, available = new Set(D.tiles);
    const STANFORD = 'https://library.stanford.edu/', LICENSE = 'https://creativecommons.org/licenses/by-nc/3.0/deed.ja', WARPER = 'https://mapwarper.h-gis.jp/';
    const OldLayer = L.TileLayer.extend({getTileUrl(c) { const k = c.z + '/' + c.x + '/' + c.y; return available.has(k) ? 'oldmap-tiles/' + k + '.webp' : blank; }});
    eras.push({
      id: 'map1930', label: '地形図 1929〜31年',
      // Above both CS layers (zIndex 2-3), below the water-estimate panes.
      layer: new OldLayer('', {minZoom: 10, maxNativeZoom: D.maxNativeZoom, maxZoom: 20, bounds: D.bounds, zIndex: 4,
        attribution: `戦前の地形図：${link(STANFORD, 'Stanford University Libraries')}（${link(LICENSE, 'CC BY-NC 3.0')}）・位置合わせ ${link(WARPER, '日本版Map Warper')}`}),
      desc: `5万分1地形図「${D.sheets.map(s => s.name).join('・')}」（明治43年測図・昭和4〜6年修正）。位置は数十m程度ずれることがあります。`,
      credit: `画像：${link(STANFORD, 'Stanford University Libraries')}、${link(LICENSE, 'CC BY-NC 3.0')}（非営利）。位置合わせ：${link(WARPER, '日本版Map Warper')}。`
    });
  }
  const GSI = 'https://maps.gsi.go.jp/development/ichiran.html';
  eras.push({
    id: 'photo1975', label: '空中写真 1974〜78年',
    layer: L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/gazo1/{z}/{x}/{y}.jpg', {minZoom: 10, maxNativeZoom: 17, maxZoom: 20, zIndex: 4,
      attribution: `空中写真（1974〜1978年）：${link(GSI, '国土地理院')}`}),
    desc: '国土地理院が昭和49〜53年に撮影したカラー空中写真。開発前の田畑・森林・集落の様子が分かります。',
    credit: `出典：${link(GSI, '国土地理院 地理院タイル（1974年〜1978年の空中写真）')}。インターネット接続が必要です。`
  });
  if (!eras.length) return;

  let current = null, opacity = .7;
  const Panel = L.Control.extend({options: {position: 'topright'}, onAdd() {
    const box = L.DomUtil.create('section', 'oldmap-panel');
    box.setAttribute('aria-label', '昔の地図・写真');
    box.innerHTML = `<strong class="oldmap-title">昔の地図・写真</strong>
      <div class="oldmap-eras" role="radiogroup" aria-label="表示する年代">
        <label><input type="radio" name="oldmap-era" value="" checked>表示しない</label>
        ${eras.map(e => `<label><input type="radio" name="oldmap-era" value="${e.id}">${e.label}</label>`).join('')}
      </div>
      <div class="oldmap-body" id="oldmap-body" hidden>
        <label class="oldmap-slider">濃さ<input type="range" id="oldmap-opacity" min="0" max="100" value="70" aria-label="昔の地図・写真の濃さ"><output id="oldmap-pct">70%</output></label>
        <p class="oldmap-desc" id="oldmap-desc"></p>
        <p class="oldmap-credit" id="oldmap-credit"></p>
        <p class="oldmap-credit">${link('データ出典.html#oldmap', '年代別の出典と範囲 ↗')}</p>
      </div>`;
    L.DomEvent.disableClickPropagation(box); L.DomEvent.disableScrollPropagation(box);
    return box;
  }});
  new Panel().addTo(map);

  const select = id => {
    if (current) map.removeLayer(current.layer);
    current = eras.find(e => e.id === id) || null;
    el('oldmap-body').hidden = !current;
    if (!current) return;
    current.layer.setOpacity(opacity).addTo(map);
    el('oldmap-desc').textContent = current.desc;
    el('oldmap-credit').innerHTML = current.credit;
  };
  document.querySelectorAll('input[name="oldmap-era"]').forEach(r => { r.onchange = () => select(r.value); });
  el('oldmap-opacity').oninput = e => {
    opacity = +e.target.value / 100;
    if (current) current.layer.setOpacity(opacity);
    el('oldmap-pct').textContent = e.target.value + '%';
  };
})();
