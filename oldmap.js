/* Prewar 1:50,000 topographic maps (1929-31 revisions) as a switchable overlay. */
(() => {
  'use strict';
  if (!window.OLDMAP) return;
  const D = window.OLDMAP, el = id => document.getElementById(id);
  const STANFORD = 'https://library.stanford.edu/';
  const LICENSE = 'https://creativecommons.org/licenses/by-nc/3.0/deed.ja';
  const WARPER = 'https://mapwarper.h-gis.jp/';
  const credit = `戦前の地形図：<a href="${STANFORD}" target="_blank" rel="noopener">Stanford University Libraries</a>（<a href="${LICENSE}" target="_blank" rel="noopener">CC BY-NC 3.0</a>）・位置合わせ <a href="${WARPER}" target="_blank" rel="noopener">日本版Map Warper</a>`;

  const available = new Set(D.tiles);
  const blank = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  const OldLayer = L.TileLayer.extend({getTileUrl(c) { const k = c.z + '/' + c.x + '/' + c.y; return available.has(k) ? 'oldmap-tiles/' + k + '.webp' : blank; }});
  // Above both CS layers (zIndex 2-3), below the water-estimate panes.
  const layer = new OldLayer('', {minZoom: 10, maxNativeZoom: D.maxNativeZoom, maxZoom: 20, bounds: D.bounds, zIndex: 4, opacity: .7, attribution: credit});

  const sheets = D.sheets.map(s => s.name).join('・');
  const Panel = L.Control.extend({options: {position: 'topright'}, onAdd() {
    const box = L.DomUtil.create('section', 'oldmap-panel');
    box.setAttribute('aria-label', '戦前の地形図');
    box.innerHTML = `<label class="oldmap-toggle"><input type="checkbox" id="oldmap-on">戦前の地形図（1929〜31年）</label>
      <div class="oldmap-body" id="oldmap-body" hidden>
        <label class="oldmap-slider">濃さ<input type="range" id="oldmap-opacity" min="0" max="100" value="70" aria-label="戦前の地形図の濃さ"><output id="oldmap-pct">70%</output></label>
        <p class="oldmap-desc">5万分1地形図「${sheets}」（明治43年測図・昭和4〜6年修正）。位置は数十m程度ずれることがあります。</p>
        <p>画像：<a href="${STANFORD}" target="_blank" rel="noopener">Stanford University Libraries</a>、<a href="${LICENSE}" target="_blank" rel="noopener">CC BY-NC 3.0</a>（非営利）。位置合わせ：<a href="${WARPER}" target="_blank" rel="noopener">日本版Map Warper</a>。<a href="データ出典.html#oldmap" target="_blank" rel="noopener">図幅と出典 ↗</a></p>
      </div>`;
    L.DomEvent.disableClickPropagation(box); L.DomEvent.disableScrollPropagation(box);
    return box;
  }});
  new Panel().addTo(map);

  el('oldmap-on').onchange = e => {
    el('oldmap-body').hidden = !e.target.checked;
    e.target.checked ? layer.addTo(map) : map.removeLayer(layer);
  };
  el('oldmap-opacity').oninput = e => { layer.setOpacity(+e.target.value / 100); el('oldmap-pct').textContent = e.target.value + '%'; };
})();
