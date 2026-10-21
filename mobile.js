/* Phone layout: both legends start folded and only one is open at a time. */
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
    const toggle = () => {
      research.classList.toggle('collapsed');
      if (small.matches && !research.classList.contains('collapsed') && hydro) hydro.open = false;
    };
    title.onclick = toggle;
    title.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
  }
  if (hydro) hydro.addEventListener('toggle', () => { if (small.matches && hydro.open && research) research.classList.add('collapsed'); });
  const apply = () => {
    if (research) research.classList.toggle('collapsed', small.matches);
    if (hydro) hydro.open = !small.matches;
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
