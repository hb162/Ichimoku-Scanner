import React, { useState, useMemo, useEffect } from 'react';
import SignalCard from './SignalCard';
import ChartWidget from './ChartWidget';
import { fetchAllStocks } from '../data/mockData';
import { analyzeBuySignal } from '../utils/ichimoku';

export default function Dashboard() {
    const [filter, setFilter] = useState('BUY');
    const [tickersData, setTickersData] = useState({});
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [expandedTicker, setExpandedTicker] = useState(null);
    const [toggles, setToggles] = useState({
        kijun129: true,
        cloud: false,
        chikou: false
    });

    useEffect(() => {
        const loadData = (showLoading = true) => {
            const cachedData = localStorage.getItem('ichimoku_data');
            const cachedTime = localStorage.getItem('ichimoku_data_time');
            const now = Date.now();
            
            // Nếu có cache và chưa quá 1 tiếng (3600000ms), dùng luôn, không fetch lại
            if (cachedData && cachedTime && (now - parseInt(cachedTime) < 3600000)) {
                setTickersData(JSON.parse(cachedData));
                if (showLoading) setLoading(false);
                return; // Nhờ return nên sẽ KHÔNG gọi API nữa
            }

            if (showLoading) setLoading(true);
            fetchAllStocks((done, total) => {
                if (showLoading) setProgress({ done, total });
            }).then((data) => {
                setTickersData(data);
                
                // Lưu vào cache
                try {
                    localStorage.setItem('ichimoku_data', JSON.stringify(data));
                    localStorage.setItem('ichimoku_data_time', Date.now().toString());
                } catch (e) {
                    // Xử lý trường hợp QuotaExceededError nếu data quá lớn
                    console.warn("Storage is full, couldn't cache data.", e);
                }

                if (showLoading) setLoading(false);
            });
        };

        // Lần đầu tải: sẽ lấy từ mạc định (Load từ cache hoặc API)
        loadData(true);

        const checkAndUpdate = () => {
            const now = new Date();
            const day = now.getDay();
            const hours = now.getHours();
            const minutes = now.getMinutes();

            // Thứ 2 đến Thứ 6 (0 là Chủ nhật, 6 là Thứ bảy)
            const isWeekday = day >= 1 && day <= 5;
            const currentTotalMinutes = hours * 60 + minutes;
            const startMinutes = 9 * 60 + 15; // 9h15
            const endMinutes = 15 * 60 + 15;  // 15h15

            if (isWeekday && currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes) {
                // Cập nhật ngầm không làm gián đoạn UI
                loadData(false);
            }
        };

        // Thiết lập lặp 1 tiếng (3600000 milliseconds) gọi 1 lần
        const intervalId = setInterval(checkAndUpdate, 60 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setExpandedTicker(null);
        };
        if (expandedTicker) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [expandedTicker]);

    const boardData = useMemo(() => {
        return Object.keys(tickersData).map(ticker => {
            const data = tickersData[ticker];
            const analysis = analyzeBuySignal(data);
            return { ticker, data, analysis };
        }).sort((a, b) => {
            const getScore = (sig) => sig === 'BUY' ? 3 : sig === 'WATCHLIST' ? 2 : sig === 'WAIT' ? 1 : 0;
            return getScore(b.analysis.signal) - getScore(a.analysis.signal);
        });
    }, [tickersData]);

    const filteredData = useMemo(() => {
        if (filter === 'ALL') return boardData;
        return boardData.filter(item => item.analysis.signal === filter);
    }, [boardData, filter]);

    const signalCounts = useMemo(() => {
        const counts = { ALL: boardData.length, BUY: 0, WATCHLIST: 0, WAIT: 0, SELL: 0 };
        boardData.forEach(item => {
            counts[item.analysis.signal] = (counts[item.analysis.signal] || 0) + 1;
        });
        return counts;
    }, [boardData]);

    if (loading) {
        const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={{ color: 'var(--text-primary)', marginTop: '20px', fontSize: '1.1rem' }}>
                    Đang quét {progress.done}/{progress.total} mã chứng khoán...
                </p>
                <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${pct}%` }}></div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h1 style={{ margin: 0, color: 'var(--accent-neon-green)' }}>
                    ⛩️ Ichimoku 129 Scanner
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                    Phát hiện điểm mua tiêu chuẩn với Kijun-sen 129 · Dữ liệu Real-time từ HOSE
                </p>
            </header>

            <div style={styles.filterBar}>
                {['ALL', 'BUY', 'WATCHLIST', 'WAIT', 'SELL'].map(f => (
                    <button 
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            ...styles.btn,
                            background: filter === f ? 'var(--border-color)' : 'transparent',
                            color: filter === f ? '#FFF' : 'var(--text-secondary)'
                        }}
                    >
                        {f} <span style={styles.count}>({signalCounts[f] || 0})</span>
                    </button>
                ))}
            </div>

            <div style={styles.toggleBar}>
                <label style={styles.toggleLabel}>
                    <input type="checkbox" checked={toggles.kijun129} onChange={() => setToggles({...toggles, kijun129: !toggles.kijun129})} />
                    Đường 129
                </label>
                <label style={styles.toggleLabel}>
                    <input type="checkbox" checked={toggles.cloud} onChange={() => setToggles({...toggles, cloud: !toggles.cloud})} />
                    Mây Kumo
                </label>
                <label style={styles.toggleLabel}>
                    <input type="checkbox" checked={toggles.chikou} onChange={() => setToggles({...toggles, chikou: !toggles.chikou})} />
                    Đường Trễ
                </label>
            </div>

            <div style={styles.grid}>
                {filteredData.map(item => (
                    <SignalCard 
                        key={item.ticker} 
                        ticker={item.ticker} 
                        data={item.data} 
                        analysis={item.analysis} 
                        onExpand={setExpandedTicker}
                        toggles={toggles}
                    />
                ))}
            </div>
            
            {filteredData.length === 0 && (
                <div style={styles.empty}>Không có mã nào thoả mãn bộ lọc hiện tại.</div>
            )}

            {expandedTicker && (
                <div style={styles.modalOverlay} onClick={() => setExpandedTicker(null)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2>{expandedTicker} - Biểu đồ chi tiết</h2>
                            <div style={styles.modalToggleBar}>
                                <label style={styles.toggleLabel}>
                                    <input type="checkbox" checked={toggles.kijun129} onChange={() => setToggles({...toggles, kijun129: !toggles.kijun129})} />
                                    Đường 129
                                </label>
                                <label style={styles.toggleLabel}>
                                    <input type="checkbox" checked={toggles.cloud} onChange={() => setToggles({...toggles, cloud: !toggles.cloud})} />
                                    Mây Kumo
                                </label>
                                <label style={styles.toggleLabel}>
                                    <input type="checkbox" checked={toggles.chikou} onChange={() => setToggles({...toggles, chikou: !toggles.chikou})} />
                                    Đường Trễ
                                </label>
                            </div>
                            <button style={styles.closeBtn} onClick={() => setExpandedTicker(null)}>✕</button>
                        </div>
                        <ChartWidget data={tickersData[expandedTicker]} height={500} toggles={toggles} />
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
    },
    header: {
        textAlign: 'center',
        marginBottom: '40px'
    },
    filterBar: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        marginBottom: '30px',
        flexWrap: 'wrap',
    },
    btn: {
        border: '1px solid var(--border-color)',
        padding: '8px 20px',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'all 0.2s',
        outline: 'none'
    },
    toggleBar: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '20px',
    },
    modalToggleBar: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        padding: '5px 15px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px'
    },
    toggleLabel: {
        color: 'var(--text-secondary)',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        cursor: 'pointer'
    },
    count: {
        opacity: 0.6,
        fontSize: '0.8rem'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '25px',
    },
    empty: {
        textAlign: 'center',
        color: 'var(--text-secondary)',
        padding: '50px 0',
        fontSize: '1.1rem'
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid var(--border-color)',
        borderTop: '3px solid var(--accent-neon-green)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    progressBar: {
        width: '300px',
        height: '6px',
        background: 'var(--border-color)',
        borderRadius: '3px',
        marginTop: '15px',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        background: 'var(--accent-neon-green)',
        borderRadius: '3px',
        transition: 'width 0.3s ease',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(5px)',
    },
    modalContent: {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '1000px',
        padding: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        color: '#FFF',
    },
    closeBtn: {
        background: 'transparent',
        border: 'none',
        color: '#FFF',
        fontSize: '1.5rem',
        cursor: 'pointer',
    }
}
