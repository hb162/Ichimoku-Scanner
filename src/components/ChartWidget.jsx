import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { calculateKijunSen, calculateFullIchimoku, calculateSMA } from '../utils/ichimoku';

export default function ChartWidget({ data, height = 280, toggles = { kijun129: true, cloud: false, chikou: false } }) {
    const chartContainerRef = useRef();
    const tooltipRef = useRef();

    useEffect(() => {
        if (!data || data.length === 0) return;

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#94A3B8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: height,
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: false,
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
        });

        // Nến
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#00FF87',
            downColor: '#FF3366',
            borderVisible: false,
            wickUpColor: '#00FF87',
            wickDownColor: '#FF3366',
        });
        candlestickSeries.setData(data);

        // === Ichimoku chuẩn (Mây + Chikou) ===
        if (toggles.cloud || toggles.chikou) {
            const ichimoku = calculateFullIchimoku(data);
            
            if (toggles.cloud) {
                // Senkou Span A (viền trên mây) — xanh mint pastel
                const senkouASeries = chart.addLineSeries({
                    color: '#9AD4BB',
                    lineWidth: 1,
                    title: '',
                    lastValueVisible: false,
                    priceLineVisible: false,
                });
                senkouASeries.setData(ichimoku.senkouA);

                // Senkou Span B (viền dưới mây) — đỏ nhạt pastel
                const senkouBSeries = chart.addLineSeries({
                    color: '#E9A8A5',
                    lineWidth: 1,
                    title: '',
                    lastValueVisible: false,
                    priceLineVisible: false,
                });
                senkouBSeries.setData(ichimoku.senkouB);
            }

            // Chikou Span (Đường trễ) — xanh lá
            if (toggles.chikou && ichimoku.chikou.length > 0) {
                const chikouSeries = chart.addLineSeries({
                    color: '#4CAF50',
                    lineWidth: 1,
                    title: '',
                    lastValueVisible: false,
                    priceLineVisible: false,
                });
                chikouSeries.setData(ichimoku.chikou);
            }
        }


        // === Đường Kijun 129 — MÀU ĐỎ ĐẬM ===
        if (toggles.kijun129) {
            const kijunData = calculateKijunSen(data, 129)
                .filter(item => item.value !== null)
                .map(item => ({ time: item.time, value: item.value }));

            if (kijunData.length > 0) {
                const lineSeries = chart.addLineSeries({
                    color: '#9F1919',
                    lineWidth: 2,
                    title: '',
                });
                lineSeries.setData(kijunData);
            }
        }

        // === Đường MA20 Volume ===
        const ma20Data = calculateSMA(data, 20, 'volume')
            .filter(item => item.value !== null)
            .map(item => ({ time: item.time, value: item.value }));

        if (ma20Data.length > 0) {
            const maSeries = chart.addLineSeries({
                color: '#1E90FF', // DodgerBlue
                lineWidth: 1.5,
                title: 'MA20 Vol',
                priceScaleId: 'volume',
                lastValueVisible: false,
                priceLineVisible: false,
            });
            maSeries.setData(ma20Data);
        }

        // Biểu đồ cột Khối lượng (Volume)
        const volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
            title: '',
        });
        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });
        const volumeData = data.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? 'rgba(0, 255, 135, 0.3)' : 'rgba(255, 51, 102, 0.3)',
        }));
        volumeSeries.setData(volumeData);

        const formatP = (p) => p.toLocaleString('vi-VN');
        const updateTooltip = (candleData) => {
            if (!tooltipRef.current || !candleData) return;
            tooltipRef.current.style.display = 'flex';
            tooltipRef.current.innerHTML = `
                <span style="color:var(--text-secondary)">O:</span> ${formatP(candleData.open)}&nbsp;&nbsp;
                <span style="color:var(--text-secondary)">H:</span> ${formatP(candleData.high)}&nbsp;&nbsp;
                <span style="color:var(--text-secondary)">L:</span> ${formatP(candleData.low)}&nbsp;&nbsp;
                <span style="color:var(--text-secondary)">C:</span> ${formatP(candleData.close)}
            `;
        };

        // Khởi tạo hiển thị mặc định của nến cuối cùng
        const lastCandle = data[data.length - 1];
        updateTooltip(lastCandle);

        // Tooltip hiện giá liên kết với điểm trỏ chuột
        chart.subscribeCrosshairMove(param => {
            if (
                param.point === undefined ||
                !param.time ||
                param.point.x < 0 ||
                param.point.y < 0
            ) {
                // Trả về mặc định nến cuối
                updateTooltip(lastCandle);
            } else {
                const candleData = param.seriesData.get(candlestickSeries);
                if (candleData) {
                    updateTooltip(candleData);
                } else {
                    updateTooltip(lastCandle);
                }
            }
        });

        window.addEventListener('resize', handleResize);
        chart.timeScale().fitContent();

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, toggles]);

    return (
        <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
            <div 
                ref={tooltipRef}
                className="mono"
                style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 100,
                    fontSize: '0.85rem',
                    color: '#fff',
                    display: 'flex',
                    gap: '4px',
                    pointerEvents: 'none',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '4px 8px',
                    borderRadius: '4px'
                }}
            />
            <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
