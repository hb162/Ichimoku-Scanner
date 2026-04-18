// src/utils/ichimoku.js

/**
 * Tính toán mảng SMA (Simple Moving Average) cho trường dữ liệu bất kỳ.
 */
export function calculateSMA(data, period = 20, field = 'close') {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            sma.push({ time: data[i].time, value: null });
        } else {
            let sum = 0;
            for (let j = i - period + 1; j <= i; j++) {
                sum += data[j][field];
            }
            sma.push({ time: data[i].time, value: sum / period });
        }
    }
    return sma;
}
/**
 * Tính toán mảng Kijun-sen (Base Line) dựa trên chu kỳ.
 * Công thức: (Lowest Low + Highest High) / 2 trong `period` phiên gần nhất.
 */
export function calculateKijunSen(data, period = 129) {
    const kijun = [];
    
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            kijun.push({ time: data[i].time, value: null });
            continue;
        }
        
        let highestHigh = -Infinity;
        let lowestLow = Infinity;
        
        for (let j = i - period + 1; j <= i; j++) {
            if (data[j].high > highestHigh) highestHigh = data[j].high;
            if (data[j].low < lowestLow) lowestLow = data[j].low;
        }
        
        kijun.push({ time: data[i].time, value: (highestHigh + lowestLow) / 2 });
    }
    
    return kijun;
}

/**
 * Tính toán toàn bộ hệ thống Ichimoku chuẩn (Tenkan 9, Kijun 26, Senkou A/B, Chikou).
 */
export function calculateFullIchimoku(data) {
    const tenkanPeriod = 9;
    const kijunPeriod = 26;
    const senkouBPeriod = 52;
    const displacement = 26;

    function highLow(start, end) {
        let hh = -Infinity, ll = Infinity;
        for (let i = start; i <= end; i++) {
            if (data[i].high > hh) hh = data[i].high;
            if (data[i].low < ll) ll = data[i].low;
        }
        return (hh + ll) / 2;
    }

    const tenkan = [];
    const kijun = [];
    const senkouA = [];
    const senkouB = [];
    const chikou = [];

    for (let i = 0; i < data.length; i++) {
        // Tenkan-sen (9)
        const tVal = i >= tenkanPeriod - 1 ? highLow(i - tenkanPeriod + 1, i) : null;
        tenkan.push({ time: data[i].time, value: tVal });

        // Kijun-sen (26)
        const kVal = i >= kijunPeriod - 1 ? highLow(i - kijunPeriod + 1, i) : null;
        kijun.push({ time: data[i].time, value: kVal });

        // Senkou Span B (52) — sẽ được dịch về phía trước 26 phiên
        const sbVal = i >= senkouBPeriod - 1 ? highLow(i - senkouBPeriod + 1, i) : null;
        senkouB.push(sbVal);

        // Chikou Span: giá đóng cửa hiện tại, lùi về sau 26 phiên
        if (i >= displacement) {
            chikou.push({ time: data[i - displacement].time, value: data[i].close });
        }
    }

    // Senkou Span A & B: dịch về phía trước 26 phiên
    const senkouAFinal = [];
    const senkouBFinal = [];
    for (let i = 0; i < data.length; i++) {
        const tVal = tenkan[i].value;
        const kVal = kijun[i].value;
        const saVal = (tVal !== null && kVal !== null) ? (tVal + kVal) / 2 : null;
        
        // Dịch 26 phiên về phía trước: lấy time từ data[i + displacement] nếu có
        if (i + displacement < data.length) {
            const futureTime = data[i + displacement].time;
            if (saVal !== null) senkouAFinal.push({ time: futureTime, value: saVal });
            if (senkouB[i] !== null) senkouBFinal.push({ time: futureTime, value: senkouB[i] });
        }
    }

    return {
        tenkan: tenkan.filter(d => d.value !== null),
        kijun: kijun.filter(d => d.value !== null),
        senkouA: senkouAFinal,
        senkouB: senkouBFinal,
        chikou,
    };
}

/**
 * Phân tích và kiểm tra xem một mã chứng khoán có đạt điều kiện Điểm Mua hay không.
 * Điều kiện:
 * 1. Giá hiện tại nằm trên đường Kijun-sen 129.
 * 2. Khoảng cách từ giá hiện tại tới đường 129 không quá 15%.
 * 3. Xét 40 phiên gần nhất, Kijun-sen 129 phải đang đi ngang và hướng lên (hoặc trước đó hướng lên rồi đang đi ngang).
 *    (Tức là không có phiên nào trong 40 phiên này mà giá trị Kijun 129 bị sụt giảm).
 */
export function analyzeBuySignal(data) {
    const kijun129Data = calculateKijunSen(data, 129);
    
    if (data.length < 129 + 40) return { signal: 'WAIT', reason: 'Không đủ dữ liệu lịch sử.' };
    
    const lastPrice = data[data.length - 1].close;
    const lastKijunItem = kijun129Data[kijun129Data.length - 1];
    
    if (lastKijunItem.value === null) return { signal: 'WAIT', reason: 'Chưa đủ phiên vẽ Kijun 129.' };
    
    const currentKijun = lastKijunItem.value;
    
    const result = { kijun129: currentKijun };
    
    // Điều kiện 1: Giá hiện tại phải nằm trên đường Kijun 129
    if (lastPrice < currentKijun) {
        return { ...result, signal: 'WAIT', reason: 'Giá đang nằm dưới đường Kijun 129.' };
    }
    
    // Điều kiện 2: Khoảng cách từ giá tới Kijun 129 không quá 15% (tránh mua đuổi)
    const distancePercent = (lastPrice - currentKijun) / currentKijun;
    if (distancePercent > 0.15) {
        return { ...result, signal: 'WAIT', reason: 'Giá đã tăng quá xa đường Kijun 129.' };
    }
    
    // Điều kiện 3: Xu hướng Kijun 129 trong 40 phiên gần nhất
    const trendLookback = 40;
    const kijunHistory = kijun129Data.slice(-trendLookback);
    
    let isMonotonic = true; // Không bao giờ giảm
    let hasGoneUp = false;  // Có nhịp báo tăng không
    
    for (let i = 1; i < kijunHistory.length; i++) {
        const diff = kijunHistory[i].value - kijunHistory[i - 1].value;
        if (diff < 0) {
            isMonotonic = false;
            break;
        }
        if (diff > 0) {
            hasGoneUp = true;
        }
    }
    
    if (!isMonotonic) {
        return { ...result, signal: 'SELL', reason: 'Kijun 129 đang có dấu hiệu cắm đầu đi xuống trong 40 phiên qua.' };
    }
    
    if (!hasGoneUp) {
        return { ...result, signal: 'WATCHLIST', reason: 'Đường Kijun 129 đi ngang thuần túy trong 40 phiên. Đợi Breakout.' };
    }
    
    // Nếu pass tất cả
    return { ...result, signal: 'BUY', reason: 'Giá nằm sát vùng an toàn, Kijun 129 đang đi ngang / hướng lên.' };
}

/**
 * Tính RSI theo phương pháp Wilder (EMA smoothing).
 * @param {number[]} closes - Mảng giá đóng cửa
 * @param {number} period   - Chu kỳ (mặc định 14)
 * @returns {number|null}   - Giá trị RSI cuối cùng hoặc null nếu không đủ dữ liệu
 */
export function calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return null;

    const changes = [];
    for (let i = 1; i < closes.length; i++) {
        changes.push(closes[i] - closes[i - 1]);
    }

    let avgGain = 0, avgLoss = 0;
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) avgGain += changes[i];
        else avgLoss += Math.abs(changes[i]);
    }
    avgGain /= period;
    avgLoss /= period;

    for (let i = period; i < changes.length; i++) {
        const gain = changes[i] > 0 ? changes[i] : 0;
        const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + avgGain / avgLoss));
}


/**
 * Phân tích Vol Spike: kiểm tra 3 phiên gần nhất có KL >= 1.5x MA20 hay không.
 *
 * Convention MA20 nhất quán với toàn project:
 *   MA20 = trung bình volume của 20 phiên TRƯỚC 3 phiên đang xét
 *   (index n-23 đến n-4, không gồm 3 phiên cuối)
 *
 * @param {Array}  data      - Mảng [{time, open, high, low, close, volume}, ...]
 * @param {number} threshold - Ngưỡng tỷ lệ (mặc định 1.5)
 * @returns {{ qualifies, ma20, vol3, ratios, minRatio, lastPrice, chgPct, lastDate }}
 */
export function analyzeVolSpike(data, threshold = 1.5) {
    const n = data.length;

    // Cần ít nhất 23 phiên: 20 phiên tính MA + 3 phiên kiểm tra
    if (n < 23) return { qualifies: false };

    // 20 phiên tính MA20: data[n-23] → data[n-4]
    let maSum = 0;
    for (let i = n - 23; i <= n - 4; i++) {
        maSum += data[i].volume;
    }
    const ma20 = maSum / 20;

    if (ma20 === 0) return { qualifies: false };

    // 3 phiên gần nhất
    const vol3 = [
        data[n - 3].volume,
        data[n - 2].volume,
        data[n - 1].volume,
    ];
    const ratios = vol3.map(v => v / ma20);
    const minRatio = Math.min(...ratios);

    if (ratios.some(r => r < threshold)) return { qualifies: false };

    // Thông tin giá phiên cuối
    const last = data[n - 1];
    const prev = data[n - 2];
    const chgPct = prev.close !== 0 ? ((last.close - prev.close) / prev.close) * 100 : 0;

    return {
        qualifies: true,
        ma20,
        vol3,
        ratios,
        minRatio,
        lastPrice: last.close,
        chgPct,
        lastDate: last.time,
    };
}
