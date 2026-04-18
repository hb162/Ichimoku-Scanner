// src/data/mockData.js
// Lấy dữ liệu giá thực từ API VPS (histdatafeed.vps.com.vn)

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

function parseVPSData(json) {
    const data = [];
    if (!json || json.s !== 'ok' || !json.t) return data;

    for (let i = 0; i < json.t.length; i++) {
        // Bỏ qua ngày không giao dịch (volume = 0) — nhất quán với scan script
        if (!json.v[i] || json.v[i] === 0) continue;

        // Chuyển unix timestamp (giây) sang định dạng YYYY-MM-DD
        const date = new Date(json.t[i] * 1000);
        const timeStr = date.toISOString().split('T')[0];

        data.push({
            time: timeStr,
            open: json.o[i] * 1000,   // VPS trả giá theo đơn vị nghìn, nhân 1000 ra đồng
            high: json.h[i] * 1000,
            low: json.l[i] * 1000,
            close: json.c[i] * 1000,
            volume: json.v[i],
        });
    }
    return data;
}

export async function fetchStockData(ticker, countBack = 250) {
    const now = Math.floor(Date.now() / 1000);
    const from = now - countBack * 24 * 60 * 60 * 1.5; // lấy dư để bù ngày nghỉ
    const url = `https://histdatafeed.vps.com.vn/tradingview/history?symbol=${ticker}&resolution=D&from=${Math.floor(from)}&to=${now}`;

    try {
        const response = await fetch(url);
        const json = await response.json();
        return parseVPSData(json);
    } catch (error) {
        console.error(`Lỗi khi lấy dữ liệu ${ticker}:`, error);
        return [];
    }
}

export async function fetchAllStocks(onProgress) {
    const results = {};
    const BATCH_SIZE = 20;
    let done = 0;

    for (let i = 0; i < TICKERS.length; i += BATCH_SIZE) {
        const batch = TICKERS.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (ticker) => {
            const data = await fetchStockData(ticker);
            if (data.length > 0) {
                results[ticker] = data;
            }
            done++;
            if (onProgress) onProgress(done, TICKERS.length);
        });
        await Promise.all(promises);
        // Delay nhỏ giữa các batch để tránh bị chặn
        if (i + BATCH_SIZE < TICKERS.length) {
            await new Promise(r => setTimeout(r, 200));
        }
    }
    return results;
}

export { TICKERS };
