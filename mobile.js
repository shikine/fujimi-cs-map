/* Phone layout: header controls and legends move into one bottom sheet, opened from a map button. */
(() => {
  'use strict';
  const small = matchMedia('(max-width:730px)');
  const research = document.querySelector('.research-legend');
  const hydro = document.querySelector('.hydro-legend');
  if (research) {
    const title = research.querySelector('strong');
    research.classList.add('legend-collapsible');
    title.setAttribute('role', 'button');
    title.tabIndex = 0;
    const toggle = () => research.classList.toggle('collapsed');
    title.onclick = toggle;
    title.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
  }

  // Bottom sheet. Moved nodes keep their own event handlers and go back on wider screens.
  const sheet = document.createElement('section');
  sheet.className = 'm-sheet';
  sheet.id = 'm-sheet';
  sheet.setAttribute('aria-label', '表示とレイヤー');
  sheet.hidden = true;
  sheet.innerHTML = `<div class="m-sheet-head"><strong>表示とレイヤー</strong><button type="button" class="m-sheet-close" aria-label="閉じる">閉じる</button></div>
    <div class="m-sheet-body">
      <div class="m-sec" data-sec="view"><h2>地図</h2></div>
      <div class="m-sec" data-sec="lidar"></div>
      <div class="m-sec" data-sec="old"></div>
      <div class="m-sec" data-sec="water"></div>
      <div class="m-sec" data-sec="sites"></div>
      <div class="m-sec m-links"><a href="データ出典.html" target="_blank" rel="noopener">データの出典・範囲 ↗</a><a href="利用案内.txt" target="_blank" rel="noopener">使い方 ↗</a></div>
    </div>`;
  document.body.append(sheet);
  L.DomEvent.disableClickPropagation(sheet);
  L.DomEvent.disableScrollPropagation(sheet);

  const moves = [
    ['.controls', 'view'], ['.lidar-panel', 'lidar'], ['.oldmap-panel', 'old'], ['.hydro-legend', 'water'], ['.research-legend', 'sites']
  ].map(([sel, sec]) => {
    const node = document.querySelector(sel);
    return node && {node, home: node.parentNode, next: node.nextSibling, target: sheet.querySelector(`[data-sec="${sec}"]`)};
  }).filter(Boolean);

  let fab;
  const Fab = L.Control.extend({options: {position: 'bottomright'}, onAdd() {
    fab = L.DomUtil.create('button', 'm-fab');
    fab.type = 'button';
    fab.setAttribute('aria-controls', 'm-sheet');
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = '<span aria-hidden="true">☰</span> 表示・レイヤー';
    L.DomEvent.disableClickPropagation(fab);
    fab.onclick = () => openSheet(sheet.hidden);
    return fab;
  }});
  new Fab().addTo(map);

  function openSheet(open) {
    sheet.hidden = !open;
    document.body.classList.toggle('sheet-open', open);
    fab.setAttribute('aria-expanded', String(open));
  }
  sheet.querySelector('.m-sheet-close').onclick = () => openSheet(false);
  // Actions that move the map or open another panel close the sheet so the result is visible.
  sheet.addEventListener('click', e => {
    if (e.target.closest('#extent,#fujimi,#hakushu,#results,#export3d,#hakushu-legend-extent')) openSheet(false);
  });
  map.on('click', () => { if (small.matches) openSheet(false); });

  const attribution = map.attributionControl && map.attributionControl.getContainer();
  if (attribution) {
    attribution.addEventListener('click', e => {
      if (small.matches && !e.target.closest('a')) attribution.classList.toggle('open');
    });
  }

  const apply = () => {
    const phone = small.matches;
    for (const m of moves) {
      if (phone) m.target.append(m.node);
      else m.home.insertBefore(m.node, m.next && m.next.parentNode === m.home ? m.next : null);
    }
    if (phone) {
      if (research) research.classList.remove('collapsed');
      if (hydro) hydro.open = true;
    } else {
      openSheet(false);
    }
    document.body.classList.toggle('phone', phone);
    map.invalidateSize();
  };
  small.addEventListener('change', apply);
  apply();

  // Keep the current view in the URL, so a bookmark / home-screen icon reopens here.
  // Coordinates stay in the viewer's own bookmark, never in the published files.
  let ready = false;
  setTimeout(() => { ready = true; }, 800);
  map.on('moveend', () => {
    if (!ready) return;
    const c = map.getCenter();
    history.replaceState(null, '', '#view=' + c.lat.toFixed(5) + ',' + c.lng.toFixed(5) + ',' + map.getZoom());
  });

  // Current location (GPS). Needs https or localhost.
  let here = null;
  const Locate = L.Control.extend({options: {position: 'topleft'}, onAdd() {
    const b = L.DomUtil.create('button', 'locate-button');
    b.type = 'button'; b.title = '現在地へ移動'; b.setAttribute('aria-label', '現在地へ移動'); b.textContent = '📍';
    L.DomEvent.disableClickPropagation(b);
    b.onclick = () => {
      if (!navigator.geolocation) { alert('この端末では現在地を取得できません。'); return; }
      b.classList.add('busy');
      navigator.geolocation.getCurrentPosition(p => {
        b.classList.remove('busy');
        const ll = [p.coords.latitude, p.coords.longitude];
        if (here) map.removeLayer(here);
        here = L.layerGroup([
          L.circle(ll, {radius: p.coords.accuracy, color: '#2a7fff', weight: 1, fillOpacity: .12, interactive: false}),
          L.circleMarker(ll, {radius: 7, color: '#fff', weight: 3, fillColor: '#2a7fff', fillOpacity: 1, interactive: false})
        ]).addTo(map);
        map.setView(ll, Math.max(map.getZoom(), 16), {animate: false});
      }, e => {
        b.classList.remove('busy');
        alert(e.code === 1 ? '位置情報の利用が許可されていません。ブラウザの設定で許可してください。' : '現在地を取得できませんでした。');
      }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 30000});
    };
    return b;
  }});
  new Locate().addTo(map);
})();
