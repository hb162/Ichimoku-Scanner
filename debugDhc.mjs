// Node 18+ có built-in fetch

const now = Math.floor(Date.now() / 1000);
const from = now - 250 * 24 * 60 * 60 * 1.5;
const url = `https://histdatafeed.vps.com.vn/tradingview/history?symbol=DHC&resolution=D&from=${Math.floor(from)}&to=${now}`;

const r = await fetch(url);
const j = await r.json();

const vols = [], times = [];
for (let i = 0; i < j.t.length; i++) {
    if (j.v[i] > 0) { vols.push(j.v[i]); times.push(j.t[i]); }
}

const n = vols.length - 1;

// MA20 scan: 20 bar trước, không gồm hiện tại
const prev20 = vols.slice(n - 20, n);
const ma20_scan = prev20.reduce((a, b) => a + b, 0) / 20;

// MA20 gồm cả hiện tại
const cur20 = vols.slice(n - 19, n + 1);
const ma20_incl = cur20.reduce((a, b) => a + b, 0) / 20;

const date = new Date(times[n] * 1000).toISOString().split('T')[0];
console.log('Tổng số phiên data:', vols.length);
console.log('Ngày cuối (hôm nay):', date, '| Vol:', vols[n].toLocaleString('vi-VN'));
console.log('\n=== 20 phiên được dùng tính MA20 (scan) ===');
for (let i = n - 20; i < n; i++) {
    const d = new Date(times[i] * 1000).toISOString().split('T')[0];
    console.log(`  [${i - (n - 20) + 1}] ${d} : ${vols[i].toLocaleString('vi-VN')}`);
}
console.log(`\nMA20 (20 phiên trước, khớp scan) : ${Math.round(ma20_scan).toLocaleString('vi-VN')}`);
console.log(`MA20 (gồm phiên hiện tại)        : ${Math.round(ma20_incl).toLocaleString('vi-VN')}`);
console.log(`Giá trị user kỳ vọng             : 266.410`);

