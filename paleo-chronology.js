/* Dated events and rates behind the "how the valleys were cut" layer. Ages are years before present.
   Every entry names its sources; work/paleo_units.py uses the same keys for the surface ages. */
window.PALEO_REFS = {
  kawachi1977: {short: '河内 1977', cite: '河内晋平（1977）八ヶ岳地域の地質．地域地質研究報告（5万分の1地質図幅），地質調査所', url: 'https://www.gsj.jp/data/50KGM/PDF/GSJ_MAP_G050_08035_1977_D.pdf'},
  oishi2004: {short: '大石・鈴木 2004', cite: '大石雅之・鈴木毅彦（2004）八ヶ岳火山を起源とする新期テフラ群の層序と噴火史．火山，49(1)，1–12', url: 'https://www.jstage.jst.go.jp/article/kazan/49/1/49_KJ00002524702/_pdf'},
  nishiki2007: {short: '西来ほか 2007', cite: '西来邦章・松本哲一・宇都浩三・高橋康・三宅康幸（2007）中部日本，八ヶ岳地域の火山活動期の再検討．地質学雑誌，113(5)', url: 'https://www.jstage.jst.go.jp/article/geosoc/113/5/113_5_193/_pdf'},
  inokuchi1989: {short: '井口 1989', cite: '井口隆（1989）八ヶ岳火山における山体崩壊と岩屑流．国立防災科学技術センター研究報告，43', url: 'https://dil-opac.bosai.go.jp/publication/nrcdp/nrcdp_report/PDF/43/43inokuchi.pdf'},
  bunka: {short: '文化遺産オンライン', cite: '文化遺産オンライン「七里岩」（文化庁）', url: 'https://online.bunka.go.jp/heritages/detail/282073'},
  itoshizu2015: {short: '地震本部 2015', cite: '地震調査研究推進本部 地震調査委員会（2015）糸魚川－静岡構造線断層帯の長期評価（第二版）', url: 'https://www.jishin.go.jp/main/chousa/katsudansou_pdf/41_42_44_itoigawa-shizuoka_2.pdf'},
  yamanaka2023: {short: '山中・後藤 2023', cite: '山中蛍・後藤秀昭（2023）糸魚川–静岡構造線活断層系白州断層の平均変位速度と完新世後半の古地震．地理学評論，96(4)', url: 'https://www.jstage.jst.go.jp/article/grj/96/4/96_960401/_article/-char/ja/'},
  miura2004: {short: '三浦ほか 2004', cite: '三浦大助ほか（2004）糸魚川－静岡構造線活断層系南部，白州断層の活動履歴の再検討．地質学雑誌，110(5)，255–270', url: 'https://www.jstage.jst.go.jp/article/geosoc/110/5/110_5_255/_article/-char/ja/'},
  gsj_seamless: {short: 'シームレス地質図', cite: '産総研地質調査総合センター 20万分の1日本シームレス地質図V2（CC BY 4.0）', url: 'https://gbank.gsj.jp/seamless/'},
  fujimi2024: {short: '富士見町 2024', cite: '富士見町（2024）新井戸尻考古館基本計画', url: 'https://www.town.fujimi.lg.jp/uploaded/life/70649_88026_misc.pdf'},
  gsi_alps: {short: '国土地理院', cite: '国土地理院 地理地殻活動研究センター「日本アルプスの隆起運動に関する研究」（壇原1971の水準測量を引用）', url: 'https://www.gsi.go.jp/common/000055256.pdf'}
};

window.PALEO_EVENTS = [
  {age: 200000, text: '新八ヶ岳期の火山活動が始まる（南八ヶ岳の火山活動は約50万年前から）', refs: ['oishi2004', 'nishiki2007']},
  {age: 200000, text: '韮崎岩屑なだれ：八ヶ岳南部の山体が崩れ、約10km³の土砂が釜無川沿いを埋めて七里岩の台地をつくる（約20万年前。少なくとも約10万年前の御岳第1軽石より古い）', refs: ['bunka', 'inokuchi1989', 'kawachi1977']},
  {age: 171000, text: '八ヶ岳の軽石噴火（Yt-Kw）', refs: ['oishi2004']},
  {age: 160000, text: '編笠山の溶岩ドームができる（16±2万年前）', refs: ['nishiki2007']},
  {age: 100000, text: '御岳山の軽石（御岳第1軽石）が山麓に降る。富士見・原村の広い原野の面は、この頃までにできあがっていた', refs: ['kawachi1977', 'oishi2004']},
  {age: 66000, text: '八ヶ岳の軽石噴火（Yt-Pm2、約6.6万年前。続いてYt-Pm3が約5.6万年前）', refs: ['oishi2004']},
  {age: 29000, text: '八ヶ岳の軽石（Yt-Pm4）と、九州・姶良カルデラの火山灰（AT）が降る（約2.9万年前）', refs: ['oishi2004', 'miura2004']},
  {age: 10500, text: '約1万年前から、ローム層をのせない低い段丘ができる（立場川沿いの比高5〜15m、尾白川のL1面は約9千年前）。釜無山断層群ではこの頃から6回の大地震', refs: ['kawachi1977', 'yamanaka2023', 'itoshizu2015']},
  {age: 5000, text: '縄文時代中期・井戸尻文化。三里原・広原の台地の上に集落が集まる', refs: ['kawachi1977', 'fujimi2024']},
  {age: 1900, text: '白州断層の最新の大地震（約2,110〜1,640年前、上下に約1mずれる）', refs: ['yamanaka2023', 'itoshizu2015']},
  {age: 1100, text: '釜無山断層群（中南部区間）の最新の大地震（約1,300〜900年前。762年か841年の地震の可能性）', refs: ['itoshizu2015']},
  {age: 0, text: 'の地形（標高は2013年以降の航空レーザ測量などによる）', refs: []}
];

// Long-term rates, metres per 1000 years (== mm/yr). Shown as offsets accumulated since the selected time.
window.PALEO_RATES = [
  {name: '釜無山断層群（富士見を通る）', kind: '左横ずれ', lo: 5, hi: 6, refs: ['itoshizu2015']},
  {name: '白州断層', kind: '上下', lo: 0.56, hi: 1.2, refs: ['yamanaka2023', 'itoshizu2015']},
  {name: '赤石山脈（南アルプス）', kind: '隆起（水準測量）', lo: 4, hi: 4, refs: ['gsi_alps']}
];
