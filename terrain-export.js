/* Rectangle selection, measured elevation sampling, and local 3D model export. */
(() => {
  'use strict';
  const core=window.TerrainCore, selectionGeometry=window.TerrainSelection, R=6378137, TAU=Math.PI*2;
  const el=id=>document.getElementById(id);
  const fmt=(n,d=1)=>Number(n).toLocaleString('ja-JP',{maximumFractionDigits:d});
  let selecting=false, firstCorner=null, selected=null, rectangle=null, handles=[], rotationHandle=null, rotationStem=null, activeHandle=null, controller=null, result=null;
  const button=document.createElement('button');button.id='export3d';button.textContent='四角く切り出す・3D';
  el('results').after(button);
  const Panel=L.Control.extend({options:{position:'topright'},onAdd(){
    const box=L.DomUtil.create('section','export-panel');box.id='export-panel';box.hidden=true;box.setAttribute('aria-label','地形の切り出し');
    box.innerHTML=`<button class="export-close" id="export-close" aria-label="切り出しを閉じる">×</button>
      <h2>四角く切り出す</h2><p id="selection-help">地図上の対角の2点をクリックして範囲を選びます。</p>
      <div class="export-actions"><button id="select-rectangle">範囲を選ぶ</button><button id="select-center">画面中央を選ぶ</button></div>
      <div id="selection-metric" class="metric">範囲はまだ選ばれていません</div>
      <div class="export-rotation">
      <label class="field">範囲の回転<span><input id="selection-angle" type="number" value="0" min="0" max="360" step="0.1" aria-label="切り取り角度" disabled> °</span></label>
      <input id="selection-angle-slider" type="range" min="0" max="360" step="1" value="0" aria-label="範囲の回転角度" disabled>
      <div class="rotation-caption"><span>0°で北が上・時計回り</span><button id="reset-selection-angle" disabled>北を上に戻す</button></div>
      <p class="hint">青い丸をドラッグしても回転できます。</p></div>
      <div class="export-settings">
      <label class="field">細かさ<select id="model-spacing"><option value="0.5">0.5m（小範囲向け）</option><option value="1">1m</option><option value="2" selected>2m</option><option value="5">5m</option><option value="10">10m</option><option value="20">20m</option></select></label>
      <p class="hint" id="grid-estimate">広い範囲は、長辺400分割までに自動調整します。</p>
      <label class="field">模型の横幅<input id="model-width" type="number" value="150" min="20" max="1000" step="1" aria-label="模型の横幅 mm"> mm</label>
      <label class="field">高さの強調<select id="model-exaggeration"><option value="1" selected>1倍（実際の比率）</option><option value="1.5">1.5倍</option><option value="2">2倍</option><option value="3">3倍</option><option value="5">5倍</option></select></label>
      <label class="field">土台の厚さ<input id="model-base" type="number" value="3" min="0.5" max="50" step="0.5" aria-label="土台の厚さ mm"> mm</label>
      <label class="field">高さのデータ<select id="model-source"><option value="detailed">県の詳細標高を優先</option><option value="gsi">国土地理院のみ</option></select></label>
      <button id="generate-model" class="primary" disabled>立体を作って確認</button></div>
      <div id="model-progress" hidden><progress id="model-progress-bar"></progress><p id="model-progress-text" role="status"></p><button id="cancel-model">中止</button></div>
      <p id="model-error" class="error" role="alert"></p>
      <div class="export-details"><p class="hint">高さのある標高データから、側面と底を閉じた模型を作ります。CS画像の色は付きません。</p><p class="hint">県の0.5m標高を優先し、欠ける部分は国土地理院の1～10m標高で補います。実際に使ったデータは完成後に表示します。通信が必要です。</p><a href="データ出典.html#model3d" target="_blank" rel="noopener">立体データの出典と読み方 ↗</a></div>`;
    L.DomEvent.disableClickPropagation(box);L.DomEvent.disableScrollPropagation(box);return box;
  }});new Panel().addTo(map);
  const panel=el('export-panel');
  const dialog=document.createElement('dialog');dialog.className='terrain-dialog';dialog.id='terrain-preview';
  dialog.innerHTML=`<button id="close-model-preview" class="export-close" aria-label="立体の確認を閉じる">閉じる ×</button><h2>切り出した地形</h2>
    <p class="hint" id="model-orientation">ドラッグで模型を回して確認できます。</p><canvas id="terrain-canvas" width="1000" height="480" aria-label="回転できる地形の立体プレビュー"></canvas>
    <div class="preview-help"><span>プレビューは表示を軽くしています。保存時は選んだ細かさで出力します。</span><button id="reset-model-view">向きを戻す</button></div>
    <div id="model-summary" class="summary"></div><div class="download-row"><select id="model-format" aria-label="保存形式"><option value="both">STL ＋ OBJ（両方）</option><option value="stl">STL（3Dプリント・CAD）</option><option value="obj">OBJ（3Dソフト）</option></select><button id="save-model" class="primary">立体データを保存（ZIP）</button></div>
    <p class="hint">単位は mm。出典・座標・縮尺を書いた説明を同梱します。読み込み先でも mm を指定してください。</p><p id="model-save-status" role="status"></p>`;
  document.body.append(dialog);
  window.TerrainExport={isSelecting:()=>selecting};
  function dimensions(selection){return selectionGeometry.dimensions(selection);}
  function estimate(){
    panel.querySelectorAll('.export-rotation input,.export-rotation button').forEach(e=>e.disabled=!selected||selecting||!!controller);
    if(!selected){el('generate-model').disabled=true;return;}const d=dimensions(selected);
    const valid=Number.isFinite(d.widthMetres)&&Number.isFinite(d.heightMetres)&&d.widthMetres>=5&&d.heightMetres>=5&&Math.max(d.widthMetres,d.heightMetres)<=10000;
    el('selection-metric').textContent=`横 ${fmt(d.widthMetres)}m × 縦 ${fmt(d.heightMetres)}m ／ 回転 ${fmt(selected.angleDegrees)}°\n白い角で大きさ、青い丸で向きを調整できます。`;
    el('generate-model').disabled=!valid||selecting||!!controller;el('model-error').textContent=valid?'':'1辺5m～10kmの範囲を選んでください。拡大すると小さく選べます。';
    if(!valid){el('grid-estimate').textContent='広い範囲は、長辺400分割までに自動調整します。';return;}
    const g=core.gridSize(d.widthMetres,d.heightMetres,+el('model-spacing').value);
    el('grid-estimate').textContent=`出力間隔 約${fmt(g.spacingX,2)} × ${fmt(g.spacingY,2)}m ／ ${g.cols} × ${g.rows}点。元データより細かい設定では凹凸は増えません。`;
  }
  const latLng=p=>L.latLng(p.lat,p.lon);
  const corners=s=>selectionGeometry.corners(s).map(latLng);
  const selectionFromBounds=b=>selectionGeometry.fromBounds({south:b.getSouth(),west:b.getWest(),north:b.getNorth(),east:b.getEast()});
  function clearHandles(){
    handles.forEach(h=>map.removeLayer(h));handles=[];
    if(rotationHandle)map.removeLayer(rotationHandle);if(rotationStem)map.removeLayer(rotationStem);
    rotationHandle=null;rotationStem=null;activeHandle=null;
  }
  function drawOutline(s){
    if(!rectangle)rectangle=L.polygon(corners(s),{color:'#bf7428',weight:2,fillColor:'#eebd54',fillOpacity:.09,interactive:false}).addTo(map);
    else rectangle.setLatLngs(corners(s));
  }
  function updateRotationHandle(){
    if(!selected||!rotationHandle)return;
    const top=latLng(selectionGeometry.point(selected,.5,0)),p=map.latLngToLayerPoint(top),a=selected.angleDegrees*Math.PI/180;
    const end=map.layerPointToLatLng(L.point(p.x+Math.sin(a)*36,p.y-Math.cos(a)*36));
    if(activeHandle!==rotationHandle)rotationHandle.setLatLng(end);
    rotationStem.setLatLngs([top,activeHandle===rotationHandle?rotationHandle.getLatLng():end]);
  }
  function setSelection(s,rebuild=true){
    selected={...s};drawOutline(selected);
    if(rebuild){
      clearHandles();
      corners(selected).forEach((c,i)=>{
        const handle=L.marker(c,{draggable:true,autoPan:true,bubblingMouseEvents:false,title:`切り取り範囲の角 ${i+1}`,icon:L.divIcon({className:'export-selection-handle',iconSize:[14,14],iconAnchor:[7,7]})}).addTo(map);
        let start;handle.on('dragstart',()=>{start={...selected};activeHandle=handle;});
        handle.on('drag',()=>{const p=handle.getLatLng();setSelection(selectionGeometry.resize(start,i,selectionGeometry.project({lat:p.lat,lon:p.lng})),false);});
        handle.on('dragend',()=>{activeHandle=null;setSelection(selected);});handles.push(handle);
      });
      rotationStem=L.polyline([],{color:'#287da0',weight:2,dashArray:'4 3',interactive:false}).addTo(map);
      rotationHandle=L.marker(latLng(selectionGeometry.point(selected,.5,0)),{draggable:true,autoPan:true,bubblingMouseEvents:false,title:'範囲を回転',icon:L.divIcon({className:'export-rotation-handle',html:'↻',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map);
      rotationHandle.bindTooltip('ドラッグして範囲を回転',{direction:'top'});
      rotationHandle.on('dragstart',()=>{activeHandle=rotationHandle;map.closePopup();});
      rotationHandle.on('drag',()=>{const p=rotationHandle.getLatLng(),angle=selectionGeometry.bearing(selected,selectionGeometry.project({lat:p.lat,lon:p.lng}));setSelection(selectionGeometry.rotate(selected,Math.round(angle*10)/10),false);});
      rotationHandle.on('dragend',()=>{activeHandle=null;updateRotationHandle();});
    }else corners(selected).forEach((c,i)=>{if(handles[i]&&handles[i]!==activeHandle)handles[i].setLatLng(c);});
    updateRotationHandle();
    if(document.activeElement!==el('selection-angle'))el('selection-angle').value=Number(selected.angleDegrees.toFixed(1));el('selection-angle-slider').value=selected.angleDegrees;
    estimate();
  }
  map.on('zoomend moveend',updateRotationHandle);
  function stopSelecting(){selecting=false;firstCorner=null;panel.classList.remove('selecting');el('map').classList.remove('export-selecting');el('select-rectangle').textContent='範囲を選び直す';el('selection-help').textContent='白い角で大きさ、青い丸や角度で向きを調整できます。';}
  function startSelecting(){
    selecting=true;firstCorner=null;panel.classList.add('selecting');el('map').classList.add('export-selecting');map.closePopup();
    el('generate-model').disabled=true;
    clearHandles();el('selection-help').textContent='四角の一つ目の角をクリックしてください。';el('select-rectangle').textContent='選択をやめる';estimate();
  }
  map.on('click',e=>{if(!selecting)return;if(!firstCorner){firstCorner=e.latlng;el('selection-help').textContent='対角のもう一つの角をクリックしてください。';}else{const b=L.latLngBounds(firstCorner,e.latlng);stopSelecting();setSelection(selectionFromBounds(b));}});
  map.on('mousemove',e=>{if(selecting&&firstCorner)drawOutline(selectionFromBounds(L.latLngBounds(firstCorner,e.latlng)));});
  el('select-rectangle').onclick=()=>{if(selecting){stopSelecting();if(selected)setSelection(selected);else if(rectangle){map.removeLayer(rectangle);rectangle=null;}}else startSelecting();};
  el('select-center').onclick=()=>{stopSelecting();const s=map.getSize(),w=s.x*.5,h=s.y*.55;setSelection(selectionFromBounds(L.latLngBounds(map.containerPointToLatLng([(s.x-w)/2,(s.y-h)/2]),map.containerPointToLatLng([(s.x+w)/2,(s.y+h)/2]))));};
  button.onclick=()=>{panel.hidden=false;map.closePopup();};
  el('export-close').onclick=()=>{controller?.abort();stopSelecting();panel.hidden=true;if(rectangle){map.removeLayer(rectangle);rectangle=null;}clearHandles();selected=null;el('selection-metric').textContent='範囲はまだ選ばれていません';el('selection-angle').value=el('selection-angle-slider').value=0;estimate();};
  const rotateSelection=value=>{if(!selected||selecting||controller||!Number.isFinite(value))return;setSelection(selectionGeometry.rotate(selected,value),false);};
  el('selection-angle-slider').oninput=e=>rotateSelection(+e.target.value);
  el('selection-angle').oninput=e=>{if(e.target.value.trim()!==''&&e.target.validity.valid)rotateSelection(+e.target.value);};
  el('selection-angle').onchange=e=>{if(e.target.value.trim()!==''&&e.target.validity.valid)rotateSelection(+e.target.value);else if(selected)e.target.value=Number(selected.angleDegrees.toFixed(1));};
  el('reset-selection-angle').onclick=()=>rotateSelection(0);
  el('model-spacing').onchange=estimate;
  el('cancel-model').onclick=()=>controller?.abort();
  el('close-model-preview').onclick=()=>dialog.close();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selecting){stopSelecting();if(selected)setSelection(selected);else if(rectangle){map.removeLayer(rectangle);rectangle=null;}estimate();}});

  // Use the named source layers so coarse fallbacks are disclosed per sample.
  const sources=[
    {id:'yamanashi',name:'山梨県・0.5m由来（産総研配信）',native:0.5,size:512,maxZoom:17,offset:0,type:'gsj',bounds:[35.168384,138.180542,35.971707,139.134255],credit:'産総研シームレス標高タイル（原データ：山梨県・林野庁）'},
    {id:'nagano',name:'長野県林業総合センター・0.5m由来（産総研配信）',native:0.5,size:512,maxZoom:17,offset:0,type:'gsj',bounds:[35.196256,137.438965,37.024484,138.729859],credit:'産総研シームレス標高タイル（原データ：長野県林業総合センター）'},
    {id:'nagano2',name:'長野県砂防課・0.5m由来（産総研配信）',native:0.5,size:512,maxZoom:17,offset:0,type:'gsj',bounds:[35.196256,137.543335,36.916961,138.738099],credit:'産総研シームレス標高タイル（原データ：長野県建設部砂防課）'},
    ...[['dem1a_png','国土地理院・1m',1,17],['dem5a_png','国土地理院・5m（航空レーザ）',5,15],['dem5b_png','国土地理院・5m（写真測量B）',5,15],['dem5c_png','国土地理院・5m（写真測量C）',5,15],['dem_png','国土地理院・10m',10,14]].map(([id,name,native,maxZoom])=>({id,name,native,maxZoom,size:256,offset:.5,type:'gsi',credit:'国土地理院・地理院タイル'}))
  ];
  const cache=new Map();
  async function tile(source,z,x,y,signal,errors){
    const url=source.type==='gsj'?`https://gbank.gsj.jp/seamless/elev2/${source.id}/${z}/${x}/${y}.webp`:`https://cyberjapandata.gsi.go.jp/xyz/${source.id}/${z}/${x}/${y}.png`;
    if(cache.has(url))return cache.get(url);
    let timer;const local=new AbortController(),onAbort=()=>local.abort();signal.addEventListener('abort',onAbort,{once:true});
    try{
      signal.throwIfAborted();timer=setTimeout(()=>local.abort(),18000);
      const response=await fetch(url,{signal:local.signal,mode:'cors'});
      if(response.status===404||response.status===204){cache.set(url,null);return null;}
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const image=await createImageBitmap(await response.blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
      if(image.width!==source.size||image.height!==source.size){image.close();throw new Error('標高画像の寸法が一致しません');}
      const canvas=document.createElement('canvas');canvas.width=canvas.height=source.size;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);image.close();const rgba=ctx.getImageData(0,0,source.size,source.size).data;
      const heights=new Float32Array(source.size*source.size);
      for(let i=0;i<heights.length;i++)heights[i]=rgba[i*4+3]===255?core.decodeGSI(rgba[i*4],rgba[i*4+1],rgba[i*4+2]):NaN;
      cache.set(url,heights);while(cache.size>80)cache.delete(cache.keys().next().value);return heights;
    }catch(error){if(signal.aborted)throw error;errors.count++;return null;}finally{clearTimeout(timer);signal.removeEventListener('abort',onAbort);}
  }
  async function sample(selection,grid,sourceMode,signal,progress){
    const d=dimensions(selection),n=grid.cols*grid.rows,heights=new Float64Array(n).fill(NaN),sourceIds=new Uint8Array(n).fill(255);
    const extent=selectionGeometry.bounds(selection),bounds=L.latLngBounds([[extent.south,extent.west],[extent.north,extent.east]]);
    const positions=Array.from({length:n},(_,index)=>selectionGeometry.point(selection,index%grid.cols/(grid.cols-1),Math.floor(index/grid.cols)/(grid.rows-1)));
    const counts=[],errors={count:0};let remaining=n;
    for(let si=0;si<sources.length&&remaining;si++){
      const s=sources[si];if(sourceMode==='gsi'&&s.type==='gsj')continue;
      if(s.bounds&&!L.latLngBounds([[s.bounds[0],s.bounds[1]],[s.bounds[2],s.bounds[3]]]).intersects(bounds))continue;
      signal.throwIfAborted();const z=Math.max(0,Math.min(s.maxZoom,Math.ceil(Math.log2(TAU*R*d.cos/(s.size*Math.min(grid.spacingX,grid.spacingY))))));
      const total=s.size*2**z,points=[],keys=new Map();
      for(let row=0;row<grid.rows;row++)for(let col=0;col<grid.cols;col++){
        const index=row*grid.cols+col;if(Number.isFinite(heights[index]))continue;
        const px=(positions[index].x/(TAU*R)+.5)*total-s.offset;
        const py=(.5-positions[index].y/(TAU*R))*total-s.offset;
        const x=Math.floor(px),y=Math.floor(py);points.push({index,x,y,dx:px-x,dy:py-y});
        for(const [xx,yy] of [[x,y],[x+1,y],[x,y+1],[x+1,y+1]]){const tx=Math.floor(xx/s.size),ty=Math.floor(yy/s.size);keys.set(`${tx}/${ty}`,[tx,ty]);}
      }
      const list=[...keys],tiles=new Map();let next=0,done=0;
      progress(`${s.name}を取得中…`,n-remaining,n);
      await Promise.all(Array.from({length:Math.min(5,list.length)},async()=>{while(next<list.length){signal.throwIfAborted();const [key,[tx,ty]]=list[next++];tiles.set(key,await tile(s,z,tx,ty,signal,errors));done++;progress(`${s.name}：${done}/${list.length}枚`,n-remaining,n);}}));
      const get=(x,y)=>{const a=tiles.get(`${Math.floor(x/s.size)}/${Math.floor(y/s.size)}`);return a?a[(y%s.size+s.size)%s.size*s.size+(x%s.size+s.size)%s.size]:NaN;};
      let used=0;
      for(const p of points){const samples=[[p.x,p.y,(1-p.dx)*(1-p.dy)],[p.x+1,p.y,p.dx*(1-p.dy)],[p.x,p.y+1,(1-p.dx)*p.dy],[p.x+1,p.y+1,p.dx*p.dy]];let h=0,valid=true;
        for(const [x,y,w] of samples){if(w<1e-10)continue;const v=get(x,y);if(!Number.isFinite(v)){valid=false;break;}h+=v*w;}
        if(valid){heights[p.index]=h;sourceIds[p.index]=si;used++;remaining--;}
      }
      if(used)counts.push({id:s.id,name:s.name,nativeSpacingMetres:s.native,points:used,percent:100*used/n,tileZoom:z,tileSize:s.size,tileSpacingMetres:TAU*R*d.cos/(s.size*2**z),credit:s.credit});
      progress(`標高を確認：${fmt(n-remaining,0)} / ${fmt(n,0)}点`,n-remaining,n);
    }
    if(remaining)throw new Error(`${fmt(remaining,0)}点の標高を取得できませんでした。穴を埋めて作らず、中止しました。範囲を狭めるか、通信を確認して再実行してください。`);
    return {heights,sourceIds,counts,failedRequests:errors.count};
  }
  function busy(value){panel.querySelectorAll('.export-settings input,.export-settings select,.export-settings button,.export-actions button,.export-rotation input,.export-rotation button').forEach(e=>e.disabled=value);[...handles,rotationHandle].filter(Boolean).forEach(h=>value?h.dragging.disable():h.dragging.enable());el('model-progress').hidden=!value;if(!value)estimate();}
  el('generate-model').onclick=async()=>{
    if(!selected||selecting||controller)return;
    const selection={...selected},d=dimensions(selection);
    if(d.widthMetres<5||d.heightMetres<5||Math.max(d.widthMetres,d.heightMetres)>10000)return;
    const options={modelWidthMm:+el('model-width').value,verticalExaggeration:+el('model-exaggeration').value,baseMm:+el('model-base').value};
    if(!(options.modelWidthMm>=20&&options.modelWidthMm<=1000&&options.baseMm>=.5&&options.baseMm<=50)){el('model-error').textContent='横幅は20～1000mm、土台は0.5～50mmで入力してください。';return;}
    const grid=core.gridSize(d.widthMetres,d.heightMetres,+el('model-spacing').value),mode=el('model-source').value;
    controller=new AbortController();const current=controller;busy(true);el('model-error').textContent='';
    try{
      const elevation=await sample(selection,grid,mode,current.signal,(text,done,total)=>{el('model-progress-text').textContent=text;el('model-progress-bar').max=total;el('model-progress-bar').value=done;});
      current.signal.throwIfAborted();el('model-progress-text').textContent='地形の表面・側面・底面を組み立てています…';
      const input={...grid,...d,angleDegrees:selection.angleDegrees,heights:elevation.heights};const mesh=core.buildMesh(input,options);
      result={mesh,grid:input,options,elevation,selection,bounds:selectionGeometry.bounds(selection),createdAt:new Date().toISOString()};
      showPreview();
    }catch(error){el('model-error').textContent=current.signal.aborted?'作成を中止しました。':error.message;}finally{controller=null;busy(false);}
  };

  let previewMesh=null,yaw=-.6,tilt=.85,zoom=1,drag=null;
  const canvas=el('terrain-canvas'),ctx=canvas.getContext('2d');
  function showPreview(){
    const {mesh,grid,options,elevation}=result,m=mesh.metadata;
    const coarse=core.gridSize(grid.widthMetres,grid.heightMetres,Math.max(grid.widthMetres,grid.heightMetres)/64,64),h=new Float64Array(coarse.cols*coarse.rows);
    for(let r=0;r<coarse.rows;r++)for(let c=0;c<coarse.cols;c++)h[r*coarse.cols+c]=grid.heights[Math.round(r/(coarse.rows-1)*(grid.rows-1))*grid.cols+Math.round(c/(coarse.cols-1)*(grid.cols-1))];
    previewMesh=core.buildMesh({...coarse,widthMetres:grid.widthMetres,heightMetres:grid.heightMetres,angleDegrees:grid.angleDegrees,heights:h},options);
    el('model-summary').replaceChildren();
    const line=text=>{const p=document.createElement('div');p.textContent=text;el('model-summary').append(p);};
    line(`実際の範囲：横 ${fmt(grid.widthMetres)}m × 縦 ${fmt(grid.heightMetres)}m ／ 切り取り角度 ${fmt(grid.angleDegrees)}° ／ 標高 ${fmt(m.minHeight)}～${fmt(m.maxHeight)}m`);
    el('model-orientation').textContent=`ドラッグで模型を回して確認。選択範囲の上が模型の奥（+Y）です。+Yの方位は北から時計回り ${fmt(grid.angleDegrees)}°。`;
    line(`模型：${fmt(m.modelDimensions.widthMm)} × ${fmt(m.modelDimensions.depthMm)} × ${fmt(m.modelDimensions.heightMm)}mm ／ 高さ ${options.verticalExaggeration}倍 ／ 土台 ${options.baseMm}mm`);
    line(`出力間隔：約${fmt(grid.spacingX,2)} × ${fmt(grid.spacingY,2)}m ／ ${fmt(m.triangleCount,0)}面`);
    for(const s of elevation.counts)line(`使用標高：${s.name} ${fmt(s.percent)}%`);
    if(elevation.failedRequests)line('一部の配信に接続できず、取得できた別の標高データで補っています。');
    if(elevation.counts.some(s=>s.id==='nagano'))line('長野県林業総合センターの標高は平成25～26年作成。表示中のCS画像とは時期が異なります。');
    line('標高の異なる資料をつなぐ境界では段差が出る場合があります。色付きCS画像を立体化したものではありません。');
    el('model-save-status').textContent='';yaw=-.6;tilt=.85;zoom=1;dialog.showModal();drawPreview();
  }
  function drawPreview(){
    if(!previewMesh)return;const {positions:p,indices}=previewMesh,m=previewMesh.metadata;
    const width=canvas.width,height=canvas.height,span=Math.max(m.modelDimensions.widthMm,m.modelDimensions.depthMm,m.modelDimensions.heightMm)*1.55;
    const scale=Math.min(width,height)/span*zoom,cy=Math.cos(yaw),sy=Math.sin(yaw),ct=Math.cos(tilt),st=Math.sin(tilt),vertices=[];
    for(let i=0;i<p.length;i+=3){const x=p[i]*cy-p[i+1]*sy,y=p[i]*sy+p[i+1]*cy,z=p[i+2]-m.modelDimensions.heightMm/2;vertices.push([width/2+x*scale,height/2-(y*ct+z*st)*scale,-y*st+z*ct]);}
    const faces=[];for(let i=0;i<indices.length;i+=3){const ia=indices[i],ib=indices[i+1],ic=indices[i+2],a=vertices[ia],b=vertices[ib],c=vertices[ic];
      // Screen y increases down; visible outward faces have a negative signed area.
      if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>=0)continue;
      const ax=p[ib*3]-p[ia*3],ay=p[ib*3+1]-p[ia*3+1],az=p[ib*3+2]-p[ia*3+2],bx=p[ic*3]-p[ia*3],by=p[ic*3+1]-p[ia*3+1],bz=p[ic*3+2]-p[ia*3+2];
      const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,len=Math.hypot(nx,ny,nz)||1;
      const light=.5+.5*Math.max(0,(-.35*nx-.45*ny+.82*nz)/len),top=nz>0;
      faces.push({a,b,c,depth:(a[2]+b[2]+c[2])/3,color:top?`rgb(${Math.round(158*light)},${Math.round(184*light)},${Math.round(141*light)})`:`rgb(${Math.round(184*light)},${Math.round(162*light)},${Math.round(123*light)})`});
    }
    ctx.fillStyle='#edf2ec';ctx.fillRect(0,0,width,height);faces.sort((a,b)=>a.depth-b.depth);
    for(const f of faces){ctx.beginPath();ctx.moveTo(f.a[0],f.a[1]);ctx.lineTo(f.b[0],f.b[1]);ctx.lineTo(f.c[0],f.c[1]);ctx.closePath();ctx.fillStyle=f.color;ctx.fill();}
    ctx.fillStyle='#395343';ctx.font='16px sans-serif';ctx.fillText('実標高から作成 ／ 単位 mm',20,height-20);
  }
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,yaw,tilt};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.008;tilt=Math.max(.15,Math.min(1.5,drag.tilt+(e.clientY-drag.y)*.006));drawPreview();});
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.6,Math.min(3,zoom*Math.exp(-e.deltaY*.001)));drawPreview();},{passive:false});
  el('reset-model-view').onclick=()=>{yaw=-.6;tilt=.85;zoom=1;drawPreview();};
  el('save-model').onclick=async()=>{
    if(!result)return;const save=el('save-model');save.disabled=true;el('model-save-status').textContent='保存用ファイルを作っています…';
    try{
      const r=result,format=el('model-format').value,footprint=selectionGeometry.corners(r.selection).map(p=>[p.lon,p.lat]),angleRadians=r.selection.angleDegrees*Math.PI/180;
      const metadata={version:2,createdAt:r.createdAt,boundsWGS84:r.bounds,...r.mesh.metadata,
        boundsDefinition:'Axis-aligned envelope of the selected rotated rectangle; use footprintWGS84 for the actual cutout.',
        footprintWGS84:{type:'Polygon',coordinates:[[...footprint,footprint[0]]]},
        selection:{...r.selection,projection:'EPSG:3857',angleConvention:'Model +Y clockwise from geographic north',centerWGS84:selectionGeometry.unproject({x:r.selection.centerX,y:r.selection.centerY}),northVectorInModelXY:[-Math.sin(angleRadians),Math.cos(angleRadians)]},
        horizontalCoordinates:'Rectangle-local XY, centered, Web Mercator scaled by cos(center latitude). Model +Y bearing = selectionAngleDegrees clockwise from north; +X bearing = angle + 90. Approximate ground metres; not a survey CRS.',
        heightTransform:'z_mm = baseMm + (elevation_m - minHeight) * scaleMmPerMetre * verticalExaggeration',
        interpolation:'Bilinear interpolation; GSJ values at pixel NW corners, GSI at pixel centres. All missing samples must be resolved before export.',
        sources:r.elevation.counts,failedTileRequests:r.elevation.failedRequests,
        sourceDocumentation:['https://tiles.gsj.jp/tiles/elev2/index.html','https://maps.gsi.go.jp/development/demtile.html'],
        licensing:['https://gbank.gsj.jp/seamless/elev/','https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html']};
      const readme=`切り出した地形模型\n\nSTL/OBJの座標単位は mm です。読み込み先で mm を指定してください。\n選択矩形の右：+X ／ 選択矩形の上：+Y ／ 上空：+Z。平らな底が z=0 です。\n切り取り角度は北から時計回り ${fmt(r.selection.angleDegrees)}°。+Yの方位は ${fmt(r.selection.angleDegrees)}°、+Xの方位は ${fmt((r.selection.angleDegrees+90)%360)}°です。\n回転した矩形の内側だけを標高サンプリングし、模型の辺をX/Y軸に揃えています。\n四隅の経緯度は metadata.json の footprintWGS84 に収録。boundsWGS84 は外接範囲で、実際の切り取り形状ではありません。\n最小標高を引き、土台の厚さを加えています。実際の標高・座標・縮尺は metadata.json を参照してください。\n\n${el('model-summary').innerText}\n\n出典：\n${r.elevation.counts.map(s=>s.credit+'を加工').join('\n')}\nhttps://tiles.gsj.jp/tiles/elev2/index.html\nhttps://maps.gsi.go.jp/development/ichiran.html\n\n標高を補間・間引きし、模型寸法へ縮尺変換、指定の高さ強調と土台を付加しました。\nCS立体図画像の色やテクスチャは含みません。元資料の計測年・細かさ・接合差の影響があります。\n形状や色だけから遺跡と判定するためのデータではありません。\n`;
      const entries=[{name:'README.txt',data:readme},{name:'metadata.json',data:JSON.stringify(metadata,null,2)}];
      if(format==='both'||format==='stl')entries.push({name:'terrain.stl',data:new Uint8Array(core.makeSTL(r.mesh))});
      if(format==='both'||format==='obj')entries.push({name:'terrain.obj',data:core.makeOBJ(r.mesh)});
      const bytes=core.makeZip(entries),blob=new Blob([bytes],{type:'application/zip'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=`terrain-${((r.bounds.north+r.bounds.south)/2).toFixed(5)}-${((r.bounds.east+r.bounds.west)/2).toFixed(5)}.zip`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      el('model-save-status').textContent=`ZIP（${fmt(bytes.byteLength/1024/1024,2)}MB）の保存を開始しました。`;
    }catch(error){el('model-save-status').textContent=`保存できませんでした：${error.message}`;}finally{save.disabled=false;}
  };
})();
