import React from 'react';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';

const Analysis = ({ analysis, transactions, runAnalysis, isLoading }) => {
    return (
        <div className="view">
            <div className="hero">
                <h1>AI Analysis</h1>
                <p>Deep insights powered by AI</p>
            </div>

            {!analysis ? (
                <div className="card empty">
                    <Sparkles />
                    <p>Run AI analysis to get personalized insights</p>
                    <button onClick={runAnalysis} disabled={isLoading || !transactions.length} className="btn-primary">
                        {isLoading ? <RefreshCw className="spinner-sm" /> : <Sparkles />} Run Analysis
                    </button>
                </div>
            ) : (
                <div className="space-y">
                    {analysis.needsLocation && (
                        <div className="card" style={{ border: '2px solid var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
                            <div className="flex gap">
                                <AlertTriangle className="icon-yellow" />
                                <div>
                                    <h3 style={{ margin: 0 }}>High Rent Detected!</h3>
                                    <p>I can suggest cheaper places to stay, but I need your current location (City) first.</p>
                                    <div className="flex gap" style={{ marginTop: '12px' }}>
                                        <input
                                            type="text"
                                            placeholder="Enter your city (e.g., Bangalore, Mumbai)"
                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', flex: 1 }}
                                            onKeyPress={e => {
                                                if (e.key === 'Enter' && e.target.value) {
                                                    // This will be handled in App.jsx as it updates the state
                                                    window.dispatchEvent(new CustomEvent('set-location', { detail: e.target.value }));
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="stats-grid">
                        <div className="card">
                            <h4>Personality</h4>
                            <div className="badge-lg">{analysis.personality}</div>
                        </div>
                        <div className="card">
                            <h4>Health Score</h4>
                            <div className="score">{analysis.healthScore}/100</div>
                            <div className="progress-bar">
                                <div style={{ width: `${analysis.healthScore}%` }} className="progress-fill"></div>
                            </div>
                        </div>
                        <div className="card">
                            <h4>Savings Potential</h4>
                            <div className="score">{formatCurrency(analysis.savingsPotential)}</div>
                            <p className="small">Additional monthly savings possible</p>
                        </div>
                    </div>

                    <div className="card">
                        <h3>Top Spending Categories</h3>
                        <div className="space-y">
                            {analysis.topCategories?.map((cat, i) => (
                                <div key={i}>
                                    <div className="flex-between">
                                        <span>{cat.category}</span>
                                        <span>{formatCurrency(cat.amount)}</span>
                                    </div>
                                    <p className="small">{cat.insight}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <h3><AlertTriangle className="icon-yellow" /> Anomalies Detected</h3>
                        <ul>
                            {analysis.anomalies?.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                    </div>

                    <div className="card">
                        <h3><CheckCircle className="icon-green" /> Recommendations</h3>
                        <ul>
                            {analysis.recommendations?.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    </div>

                    {analysis.alternatives && analysis.alternatives.length > 0 && (
                        <div className="card" style={{ borderLeft: '4px solid var(--primary-solid)' }}>
                            <h3><Sparkles style={{ color: 'var(--primary-solid)' }} /> Cheaper Alternatives</h3>
                            <div className="txn-list">
                                {analysis.alternatives.map((alt, i) => (
                                    <div key={i} className="txn-item" style={{ background: 'rgba(102, 126, 234, 0.05)' }}>
                                        <div className="txn-icon" style={{ background: 'var(--primary)' }}>
                                            <TrendingDown color="white" />
                                        </div>
                                        <div className="txn-details">
                                            <div className="txn-desc">{alt.suggestion}</div>
                                            <div className="txn-meta">{alt.category} | Source: {alt.source}</div>
                                        </div>
                                        <div className="txn-amount-credit">
                                            Save {alt.estimatedSavings}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button onClick={runAnalysis} disabled={isLoading} className="btn-secondary">
                        {isLoading ? <RefreshCw className="spinner-sm" /> : <RefreshCw />} Refresh Analysis
                    </button>
                </div>
            )}
        </div>
    );
};

export default Analysis;
