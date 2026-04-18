import pkg from 'technicalindicators';
const { RSI } = pkg;

const TICKERS = [
    "AAA", "ACB", "AGG", "AGR", "ANV", "APG", "ASM", "BAF", "BCG", "BCM", "BFC", "BID", "BMI", "BSI", "BSR", "BVH",
    "CII", "CMG", "CRC", "CSM", "CSV", "CTD", "CTG", "CTI", "CTR", "CTS", "DBC", "DCL", "DCM", "DGC", "DGW", "DHC",
    "DIG", "DLG", "DPM", "DPR", "DRC", "DRH", "DSE", "DXG", "DXS", "E1VFVN30", "EIB", "ELC", "EVF", "EVG", "FCN",
    "FIR", "FIT", "FPT", "FRT", "FTS", "FUEVFVND", "GAS", "GEE", "GEG", "GEL", "GEX", "GIL", "GMD", "GSP", "GVR",
    "HAG", "HAH", "HAX", "HCM", "HDB", "HDC", "HDG", "HHP", "HHS", "HHV", "HID", "HPG", "HPX", "HQC", "HSG", "HSL",
    "HT1", "HVN", "IDI", "IJC", "KBC", "KDH", "KHG", "KLB", "KOS", "KSB", "LCG", "LDG", "LPB", "MBB", "MCH", "MSB",
    "MSH", "MSN", "MWG", "NAB", "NAF", "NKG", "NLG", "NT2", "NTL", "NVL", "OCB", "OGC", "PAC", "PAN", "PC1", "PDR",
    "PET", "PGC", "PHR", "PLX", "PNJ", "POW", "PPC", "PVD", "PVP", "PVT", "QCG", "REE", "SAB", "SBT", "SCR", "SCS",
    "SHB", "SHI", "SIP", "SSB", "SSI", "STB", "SZC", "TAL", "TCB", "TCD", "TCH", "TCM", "TCO", "TCX", "TPB", "TTA",
    "TTF", "TV2", "VAB", "VCB", "VCG", "VCI", "VCK", "VDS", "VGC", "VHC", "VHM", "VIB", "VIC", "VIP", "VIX", "VJC",
    "VND", "VNM", "VOS", "VPB", "VPI", "VPL", "VPX", "VRE", "VSC", "VTO", "VTP", "YEG", "AAV", "AMV", "APS", "BVS",
    "C69", "CEO", "DDG", "DL1", "DST", "DTD", "DVM", "DXP", "GKM", "HUT", "IDC", "IDJ", "LAS", "MBS", "MST", "NBC",
    "NRC", "PLC", "PSI", "PVB", "PVC", "PVG", "PVS", "SHS", "SRA", "TD6", "TIG", "TNG", "TVD", "VC3", "VFS", "VGS",
    "VTZ", "AAH", "AAS", "ABB", "ACM", "ACV", "BCR", "BGE", "BIG", "BOT", "BVB", "C4G", "CVN", "DAG", "DCS", "DDV",
    "DFF", "DRI", "FOX", "G36", "HBC", "HNG", "HNM", "HTP", "ITA", "KPF", "LMH", "MSR", "MZG", "OIL", "PHP", "POM",
    "PSB", "PSH", "PVX", "QBS", "QTP", "RDP", "SBS", "TVN", "VEA", "VGI", "VGT"
];

async function fetchRaw(ticker) {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 750 * 24 * 60 * 60 * 1.5;
    const url = `https://histdatafeed.vps.com.vn/tradingview/history?symbol=${ticker}&resolution=D&from=${Math.floor(from)}&to=${now}`;
    try {
        const r = await fetch(url);
        const j = await r.json();
        if (!j || j.s !== 'ok' || !j.t) return null;
        const closes = [];
        for (let i = 0; i < j.t.length; i++) {
            if (j.v[i] > 0) closes.push(j.c[i]);
        }
        const lastDate = new Date(j.t[j.t.length - 1] * 1000).toISOString().split('T')[0];
        const lastPrice = j.c[j.c.length - 1];
        return { closes, lastDate, lastPrice };
    } catch { return null; }
}

async function main() {
    console.log(`Scanning ${TICKERS.length} stocks - Wilder RSI(14), V>0 filter...\n`);
    const results = [];
    const BATCH = 10;

    for (let i = 0; i < TICKERS.length; i += BATCH) {
        const batch = TICKERS.slice(i, i + BATCH);
        await Promise.all(batch.map(async (ticker) => {
            const d = await fetchRaw(ticker);
            if (!d || d.closes.length < 50) return;
            const rsi = RSI.calculate({ values: d.closes, period: 14 }).pop();
            if (rsi !== undefined && rsi >= 28 && rsi <= 33) {
                results.push({ ticker, rsi: +rsi.toFixed(2), price: d.lastPrice, lastDate: d.lastDate });
            }
        }));
        process.stdout.write(`\rProgress: ${Math.min(i + BATCH, TICKERS.length)}/${TICKERS.length}`);
    }

    results.sort((a, b) => a.rsi - b.rsi);
    console.log("\n\n=== Wilder RSI(14) from 28 to 33 ===");
    for (const r of results) {
        console.log(`${r.ticker.padEnd(10)} RSI: ${r.rsi.toFixed(2).padStart(6)} | Price: ${(r.lastPrice * 1000).toLocaleString().padStart(10)} | ${r.lastDate}`);
    }
    console.log(`\nTotal: ${results.length} stocks`);
}

main();
