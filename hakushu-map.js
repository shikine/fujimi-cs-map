(() => {
  'use strict';
  const group = L.featureGroup().addTo(map);
  const markers = new Map();
  const toggle = document.getElementById('hakushu-toggle');
  const picker = document.getElementById('hakushu-site-jump');
  const enable = () => { group.addTo(map); toggle.checked = true; };
  const fullExtent = () => {
    enable(); dialog.close(); map.closePopup();
    map.fitBounds(group.getBounds(), {paddingTopLeft:[35,35], paddingBottomRight:[35,35], maxZoom:14, animate:false});
  };
  const focus = id => {
    const marker = markers.get(id);
    if (!marker) return;
    enable(); dialog.close();
    map.setView(marker.getLatLng(), 16, {animate:false});
    marker.openPopup();
  };
  for (const s of HAKUSHU.sites) {
    const marker = L.circleMarker([s.lat,s.lon], {
      radius:6.5, color:s.positionCheck?'#c9861f':'#fff', weight:s.positionCheck?3:2,
      fillColor:'#8051a0', fillOpacity:.98, bubblingMouseEvents:false
    }).addTo(group);
    marker.bindTooltip(s.name+(s.positionCheck?'（位置要確認）':''), {direction:'top'});
    marker.bindPopup(`<div class="record-popup hakushu-popup"><div class="record-region">白州の公開記録${s.positionCheck?' · 位置要確認':''}</div><h3>${esc(s.name)}</h3>
      <p>時代：${esc(s.period)||'抄録に記載なし'}<br>種別：${esc(s.kind)||'抄録に記載なし'}<br>遺構等（抄録表記）：${esc(s.features)||'記載なし'}</p>
      ${s.editorNote?`<p>${esc(s.editorNote)}</p>`:''}
      <p class="${s.positionCheck?'warning':''}">${esc(s.coordinateNote)}</p>
      <p>北緯 ${esc(s.coordinateText[0])}° ／ 東経 ${esc(s.coordinateText[1])}°</p>
      <p>報告書『${esc(s.reportTitle)}』${esc(s.published.slice(0,4))}年</p>
      <a href="白州の遺跡記録.html#${esc(s.id)}" target="_blank" rel="noopener">遺物・所在地などの詳細 ↗</a><br>
      <a href="${esc(s.source)}" target="_blank" rel="noopener">出典の報告書・抄録 ↗</a>
      ${s.alternateSource?`<br><a href="${esc(s.alternateSource)}" target="_blank" rel="noopener">位置差のある別資料 ↗</a>`:''}</div>`, {maxWidth:340});
    markers.set(s.id, marker);
  }
  for (const s of [...HAKUSHU.sites].sort((a,b)=>a.reading.localeCompare(b.reading,'ja'))) {
    const option = document.createElement('option');
    option.value=s.id; option.textContent=s.name+(s.positionCheck?'（位置要確認）':'')+' ／ '+s.period;
    picker.append(option);
  }
  toggle.onchange = () => toggle.checked ? group.addTo(map) : map.removeLayer(group);
  picker.onchange = () => { if (picker.value) { focus(picker.value); picker.value=''; } };
  document.getElementById('hakushu-sites-extent').onclick=fullExtent;
  document.getElementById('hakushu-legend-extent').onclick=fullExtent;
  const readHash = () => {
    const id = new URLSearchParams(location.hash.slice(1)).get('hakushu');
    if (id === 'all') fullExtent(); else if (id) focus(id);
  };
  window.addEventListener('hashchange', readHash);
  readHash();
})();
