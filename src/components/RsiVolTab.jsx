import React, { useMemo, useState } from 'react';
import { calculateRSI } from '../utils/ichimoku';
import ChartWidget from './ChartWidget';

const fmt = (v) => Math.round(v).toLocaleString('vi-VN');
const fmtVol = (v) => Math.round(v).toLocaleString('vi-VN');

// ── Tính MA20 từ mảng volumes (loại trừ phiên cuối) ──────────────────────────
function ma20Vol(volumes) {
    const hist = volumes.slice(0, -1); // bỏ phiên hiện tại
    if (hist.length < 20) return null;
    const slice = hist.slice(-20);
    return slice.reduce((a, b) => a + b, 0) / 20;
}

// ── Gauge dạng cung tròn nhỏ cho RSI ─────────────────────────────────────────
function RsiGauge({ value }) {
    const clamp = Math.min(100, Math.max(0, value));
    // màu: <30 đỏ, 30-40 cam, 40-50 vàng
    const color = clamp < 30 ? '#FF3366' : clamp < 40 ? '#FF8C00' : '#FFD700';
    const barW = `${clamp}%`;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
                width: 80, height: 6, borderRadius: 3,
                background: 'rgba(255,255,255,0.1)', overflow: 'hidden'
            }}>
                <div style={{ width: barW, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }} />
            </div>
            <span style={{ color, fontWeight: 600, fontSize: '0.9rem', minWidth: 36 }}>
                {value.toFixed(1)}
            </span>
        </div>
    );
}

// ── Chip % so với MA20 ────────────────────────────────────────────────────────
function VolChip({ pct }) {
    const color = pct < 15 ? '#FF3366' : pct < 25 ? '#FF8C00' : '#FFD700';
    return (
        <span style={{
            background: color + '22', color, border: `1px solid ${color}`,
            borderRadius: 12, padding: '2px 8px', fontSize: '0.78rem', fontWeight: 600
        }}>
            {pct.toFixed(1)}%
        </span>
    );
}

export default function RsiVolTab({ tickersData, toggles }) {
    const [expandedTicker, setExpandedTicker] = useState(null);
    const [sortKey, setSortKey] = useState('rsi');
    const [sortDir, setSortDir] = useState(1); // 1 = asc, -1 = desc

    // ── Tính toán danh sách ──────────────────────────────────────────────────
    const results = useMemo(() => {
        const out = [];
        for (const [ticker, data] of Object.entries(tickersData)) {
            if (!data || data.length < 50) continue;

            const closes = data.map(d => d.close);
            const volumes = data.map(d => d.volume);

            const rsi = calculateRSI(closes, 14);
            if (rsi === null || rsi >= 40) continue;

            const ma20 = ma20Vol(volumes);
            if (!ma20 || ma20 === 0) continue;

            const lastVol = volumes[volumes.length - 1];
            const volPct = (lastVol / ma20) * 100;
            if (volPct >= 30) continue;

            const last = data[data.length - 1];
            const prev = data[data.length - 2] ?? last;
            const chg = last.close - prev.close;
            const chgPct = prev.close !== 0 ? (chg / prev.close) * 100 : 0;

            out.push({
                ticker,
                rsi,
                price: last.close,
                chgPct,
                lastVol,
                ma20Vol: ma20,
                volPct,
                lastDate: last.time,
            });
        }

        return out.sort((a, b) => {
            const va = a[sortKey], vb = b[sortKey];
            if (typeof va === 'string') return va.localeCompare(vb) * sortDir;
            return (va - vb) * sortDir;
        });
    }, [tickersData, sortKey, sortDir]);

    function handleSort(key) {
        if (sortKey === key) setSortDir(d => d * -1);
        else { setSortKey(key); setSortDir(1); }
    }

    function Th({ col, label }) {
        const active = sortKey === col;
        return (
            <th
                onClick={() => handleSort(col)}
                style={{
                    ...thStyle,
                    color: active ? '#00FF87' : 'var(--text-secondary)',
                    cursor: 'pointer', userSelect: 'none',
                    whiteSpace: 'nowrap',
                }}
            >
                {label} {active ? (sortDir === 1 ? '↑' : '↓') : ''}
            </th>
        );
    }

    return (
        <div>
            {/* ── Banner ──────────────────────────────────────────────── */}
            <div style={bannerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.4rem' }}>🔍</span>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                            RSI &lt; 40 &nbsp;·&nbsp; Khối lượng &lt; 30% MA20
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 2 }}>
                            Lọc mã đang oversold + giao dịch thấp bất thường — tiềm năng tích lũy
                        </div>
                    </div>
                </div>
                <div style={badgeCountStyle}>
                    {results.length} mã
                </div>
            </div>

            {/* ── Bảng ────────────────────────────────────────────────── */}
            {results.length === 0 ? (
                <div style={emptyStyle}>
                    ✅ Không có mã nào thỏa điều kiện trong dữ liệu hiện tại.
                </div>
            ) : (
                <div style={tableWrapper}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <Th col="ticker"  label="Mã" />
                                <Th col="rsi"     label="RSI(14)" />
                                <Th col="price"   label="Giá" />
                                <Th col="chgPct"  label="Thay đổi" />
                                <Th col="lastVol" label="KL phiên" />
                                <Th col="ma20Vol" label="MA20 KL" />
                                <Th col="volPct"  label="KL/MA20" />
                                <Th col="lastDate" label="Ngày" />
                                <th style={thStyle} />
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => {
                                const isUp = r.chgPct >= 0;
                                const chgColor = isUp ? '#00FF87' : '#FF3366';
                                const isExpanded = expandedTicker === r.ticker;
                                const rowBg = i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
                                return (
                                    <React.Fragment key={r.ticker}>
                                        <tr
                                            style={{ background: isExpanded ? 'rgba(0,255,135,0.05)' : rowBg, transition: 'background .2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            onMouseLeave={e => e.currentTarget.style.background = isExpanded ? 'rgba(0,255,135,0.05)' : rowBg}
                                        >
                                            <td style={{ ...tdStyle, fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                                                {r.ticker}
                                            </td>
                                            <td style={tdStyle}>
                                                <RsiGauge value={r.rsi} />
                                            </td>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                                {fmt(r.price)}
                                            </td>
                                            <td style={{ ...tdStyle, color: chgColor, fontWeight: 600 }}>
                                                {isUp ? '+' : ''}{r.chgPct.toFixed(2)}%
                                            </td>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                                {fmtVol(r.lastVol)}
                                            </td>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                                {fmtVol(r.ma20Vol)}
                                            </td>
                                            <td style={tdStyle}>
                                                <VolChip pct={r.volPct} />
                                            </td>
                                            <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                                {r.lastDate}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <button
                                                    style={expandBtnStyle}
                                                    onClick={() => setExpandedTicker(isExpanded ? null : r.ticker)}
                                                    title={isExpanded ? 'Thu gọn' : 'Xem biểu đồ'}
                                                >
                                                    {isExpanded ? '▲' : '▼'}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* ── Inline chart ─────────────────── */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={9} style={{ padding: '0 12px 16px', background: 'rgba(0,255,135,0.03)' }}>
                                                    <div style={{
                                                        borderRadius: 10, overflow: 'hidden',
                                                        border: '1px solid rgba(0,255,135,0.15)',
                                                        marginTop: 6,
                                                    }}>
                                                        <ChartWidget
                                                            data={tickersData[r.ticker]}
                                                            height={300}
                                                            toggles={toggles}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const bannerStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'rgba(0,255,135,0.06)',
    border: '1px solid rgba(0,255,135,0.2)',
    borderRadius: 12, padding: '14px 20px', marginBottom: 24,
};

const badgeCountStyle = {
    background: 'rgba(0,255,135,0.15)',
    color: '#00FF87', border: '1px solid rgba(0,255,135,0.3)',
    borderRadius: 20, padding: '4px 16px',
    fontWeight: 700, fontSize: '0.9rem',
};

const emptyStyle = {
    textAlign: 'center', color: 'var(--text-secondary)',
    padding: '50px 0', fontSize: '1rem',
};

const tableWrapper = {
    overflowX: 'auto',
    borderRadius: 10,
    border: '1px solid var(--border-color)',
};

const tableStyle = {
    width: '100%', borderCollapse: 'collapse',
    fontSize: '0.9rem',
};

const thStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-color)',
    textAlign: 'left',
    fontSize: '0.78rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    background: 'var(--bg-card)',
};

const tdStyle = {
    padding: '11px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const expandBtnStyle = {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    borderRadius: 4, cursor: 'pointer',
    padding: '2px 8px', fontSize: '0.8rem',
    transition: 'all .2s',
};
