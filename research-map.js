const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const knownGroup=L.layerGroup().addTo(map),observedGroup=L.layerGroup().addTo(map),gridGroup=L.layerGroup();
const knownMarkers={},observationMarkers={};
for(const s of RESEARCH.sites){
  const m=L.circleMarker([s.lat,s.lon],{radius:5.5,color:s.positionCheck?'#b36b17':'#fff',weight:2,fillColor:'#1d70a5',fillOpacity:.94,bubblingMouseEvents:false}).addTo(knownGroup);
  m.bindTooltip(s.name,{direction:'top'});
  m.bindPopup(`<div class="record-popup"><h3>${esc(s.name)}</h3><p>公開資料で確認された記録<br>時代：${esc(s.period)||'抄録に記載なし'}<br>主な遺構：${esc(s.features)||'抄録に記載なし'}</p><p class="${s.positionCheck?'warning':''}">${esc(s.coordinateNote)}</p><p>北緯 ${s.lat.toFixed(6)}° ／ 東経 ${s.lon.toFixed(6)}°</p><a target="_blank" rel="noopener" href="${s.source}">根拠の報告書・抄録を開く ↗</a></div>`,{maxWidth:320});knownMarkers[s.id]=m;
}
for(const o of RESEARCH.observations){
  const color=o.id==='T01'?'#bc781c':'#778277';
  const m=L.circleMarker([o.lat,o.lon],{radius:8,color:'#fff',weight:2,fillColor:color,fillOpacity:1,bubblingMouseEvents:false}).addTo(observedGroup);
  m.bindTooltip(o.id,{permanent:true,direction:'right',className:'observation-label'});
  m.bindPopup(`<div class="record-popup"><h3>${o.id} ${esc(o.title)}</h3><p class="warning">${esc(o.decision)}</p><p>${esc(o.reason)}</p><p>${esc(o.next)}</p><a target="_blank" rel="noopener" href="details/${o.id}-comparison.jpg"><img src="details/${o.id}-comparison.jpg" alt="CS立体図と航空写真の比較">比較画像を拡大 ↗</a><p>${o.lat.toFixed(6)}, ${o.lon.toFixed(6)}</p></div>`,{maxWidth:340});observationMarkers[o.id]=m;
}
for(const t of RESEARCH.tiles){L.rectangle(t.bounds,{color:'#55635d',weight:1,fill:false,dashArray:'5 5',bubblingMouseEvents:false}).addTo(gridGroup).bindPopup(`<strong>${esc(t.name)}</strong><p>概観確認済み。画像あり：約${t.validAreaKm2.toFixed(2)}km²</p><p>${esc(t.note)}</p><a href="atlas/${t.name}.jpg" target="_blank" rel="noopener">概観画像を見る ↗</a>`);}
const Legend=L.Control.extend({options:{position:'bottomleft'},onAdd(){const box=L.DomUtil.create('div','research-legend');box.innerHTML='<strong>公開遺跡と調査記録</strong><label><input id="hakushu-toggle" type="checkbox" checked><i class="legend-dot" style="background:#8051a0"></i>白州の公開遺跡 11地点</label><button id="hakushu-legend-extent">白州の11地点へ移動</button><label><input id="known-toggle" type="checkbox" checked><i class="legend-dot" style="background:#1d70a5"></i>富士見の公開遺跡 32記録</label><label><input id="observation-toggle" type="checkbox" checked><i class="legend-dot" style="background:#bc781c"></i>富士見の地形観察 3地点</label><label><input id="grid-toggle" type="checkbox">富士見で確認した28図郭の枠</label><p>点は代表位置。遺跡の範囲ではありません。<br>空白＝遺跡なし、ではありません。</p>';L.DomEvent.disableClickPropagation(box);L.DomEvent.disableScrollPropagation(box);return box;}});new Legend().addTo(map);
for(const [id,group] of [['known-toggle',knownGroup],['observation-toggle',observedGroup],['grid-toggle',gridGroup]])document.getElementById(id).onchange=e=>e.target.checked?map.addLayer(group):map.removeLayer(group);
const dialog=document.getElementById('research-dialog');document.getElementById('results').onclick=()=>dialog.showModal();document.getElementById('close-results').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function focusResult(type,id){const group=type==='site'?knownGroup:observedGroup;const marker=(type==='site'?knownMarkers:observationMarkers)[id];if(!marker)return;map.addLayer(group);document.getElementById(type==='site'?'known-toggle':'observation-toggle').checked=true;dialog.close();map.setView(marker.getLatLng(),type==='site'?16:17,{animate:false});marker.openPopup();}
const list=document.getElementById('observations-list');for(const o of RESEARCH.observations){const b=document.createElement('button');b.className='observation-row';b.innerHTML=`<strong>${o.id} ${esc(o.title)}</strong><small>${esc(o.decision)} → 地図で確認</small>`;b.onclick=()=>focusResult('observation',o.id);list.append(b);}
const jump=document.getElementById('site-jump');for(const s of [...RESEARCH.sites].sort((a,b)=>a.name.localeCompare(b.name,'ja'))){const option=document.createElement('option');option.value=s.id;option.textContent=s.name+' ／ 報告書 '+s.source.split('/').pop();jump.append(option);}jump.onchange=()=>{if(jump.value)focusResult('site',jump.value);};
function readHash(){const h=new URLSearchParams(location.hash.slice(1));if(h.has('site'))focusResult('site',h.get('site'));else if(h.has('observation'))focusResult('observation',h.get('observation'));}window.addEventListener('hashchange',readHash);readHash();
map.on('popupopen',e=>{const p=e.popup;for(const img of p.getElement().querySelectorAll('img')){if(!img.complete)img.addEventListener('load',()=>p.update(),{once:true});}p.update();});
map.invalidateSize();

