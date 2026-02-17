import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Sparkles, RefreshCw, Target, Plus, FileText, CreditCard, Trash2, EyeOff } from 'lucide-react';
import { formatCurrency, categoryIcons, categoryColors } from '../../utils/helpers';

const Dashboard = ({
    stats,
    analysis,
    goals,
    transactions,
    runAnalysis,
    isLoadingAnalysis,
    setView,
    onAddGoal,
    budgets = [],
    bills = [],
    onDeleteTransaction,
    onToggleHide
}) => {
    // Budget Calculations
    const currentMonth = new Date().toISOString().slice(0, 7);
    const visibleTransactions = transactions.filter(t => !t.hidden);

    const spending = transactions
        .filter(t => (t.type?.toLowerCase() === 'debit' || t.type?.toLowerCase() === 'expense') && t.date.startsWith(currentMonth))
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Math.abs(Number(t.amount));
            return acc;
        }, {});

    // Upcoming Bills
    const upcomingBills = [...bills]
        .filter(b => !b.paid)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 3);

    return (
        <div className="view">
            <div className="hero">
                <h1>Financial Overview</h1>
                <p>Your complete financial picture at a glance</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#10b98120' }}><TrendingUp style={{ color: '#10b981' }} /></div>
                    <div>
                        <div className="stat-value">{formatCurrency(stats.income)}</div>
                        <div className="stat-label">Total Income</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#ef444420' }}><TrendingDown style={{ color: '#ef4444' }} /></div>
                    <div>
                        <div className="stat-value">{formatCurrency(stats.expense)}</div>
                        <div className="stat-label">Total Expenses</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#3b82f620' }}><DollarSign style={{ color: '#3b82f6' }} /></div>
                    <div>
                        <div className="stat-value">{formatCurrency(stats.balance)}</div>
                        <div className="stat-label">Balance • {stats.savingsRate}% Savings</div>
                    </div>
                </div>
            </div>

            <div className="grid">
                {/* Upcoming Bills Widget */}
                <div className="card">
                    <h3><FileText className="icon-yellow" /> Upcoming Bills</h3>
                    {upcomingBills.length > 0 ? (
                        <div className="space-y">
                            {upcomingBills.map(b => (
                                <div key={b.id} className="flex-between">
                                    <span>{b.name}</span>
                                    <span>{formatCurrency(b.amount)} <span className="small">({b.dueDate})</span></span>
                                </div>
                            ))}
                            <button onClick={() => setView('bills')} className="btn-secondary w-full">Manage Bills</button>
                        </div>
                    ) : (
                        <div className="space-y">
                            <p>No upcoming bills!</p>
                            <button onClick={() => setView('bills')} className="btn-secondary w-full">View Bills</button>
                        </div>
                    )}
                </div>

                {/* Budget Widget */}
                <div className="card">
                    <h3><Target className="icon-green" /> Budget Status</h3>
                    {budgets.length > 0 ? (
                        <div className="space-y">
                            {budgets.slice(0, 3).map(b => {
                                const spent = spending[b.category] || 0;
                                const pct = Math.min((spent / b.limit) * 100, 100);
                                const color = spent > b.limit ? '#ef4444' : categoryColors[b.category];
                                return (
                                    <div key={b.category}>
                                        <div className="flex-between">
                                            <span>{b.category}</span>
                                            <span>{Math.round(pct)}%</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div style={{ width: `${pct}%`, background: color }} className="progress-fill"></div>
                                        </div>
                                    </div>
                                );
                            })}
                            <button onClick={() => setView('budget')} className="btn-secondary w-full">View Budgets</button>
                        </div>
                    ) : (
                        <div className="space-y">
                            <p>No budgets set.</p>
                            <button onClick={() => setView('budget')} className="btn-primary w-full">Set Budget</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid">
                <div className="card">
                    <h3><Sparkles className="icon-yellow" /> AI Analysis</h3>
                    {analysis ? (
                        <div className="space-y">
                            <div className="badge">{analysis.personality}</div>
                            <div className="progress-bar">
                                <div style={{ width: `${analysis.healthScore}%` }} className="progress-fill"></div>
                            </div>
                            <p className="small">Health Score: {analysis.healthScore}/100</p>
                            <button onClick={runAnalysis} disabled={isLoadingAnalysis} className="btn-secondary w-full">
                                {isLoadingAnalysis ? <RefreshCw className="spinner-sm" /> : <RefreshCw />} Refresh
                            </button>
                        </div>
                    ) : (
                        <div className="space-y">
                            <p>Get AI-powered insights about your spending habits</p>
                            <button onClick={runAnalysis} disabled={isLoadingAnalysis || !transactions.length} className="btn-primary w-full">
                                {isLoadingAnalysis ? <RefreshCw className="spinner-sm" /> : <Sparkles />} Run Analysis
                            </button>
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3><Target className="icon-green" /> Goals ({goals.length})</h3>
                    {goals.length > 0 ? (
                        <div className="space-y">
                            {goals.slice(0, 2).map(g => {
                                const progress = (g.currentAmount / g.targetAmount * 100).toFixed(0);
                                return (
                                    <div key={g.id}>
                                        <div className="flex-between">
                                            <span>{g.emoji} {g.name}</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div style={{ width: `${Math.min(progress, 100)}%` }} className="progress-fill"></div>
                                        </div>
                                    </div>
                                );
                            })}
                            <button onClick={() => setView('goals')} className="btn-secondary w-full">View All</button>
                        </div>
                    ) : (
                        <div className="space-y">
                            <p>Set financial goals and track your progress</p>
                            <button onClick={onAddGoal} className="btn-primary w-full"><Plus /> Create Goal</button>
                        </div>
                    )}
                </div>
            </div>

            {visibleTransactions.length > 0 && (
                <div className="card">
                    <div className="flex-between">
                        <h3><FileText /> Recent Transactions</h3>
                        <button onClick={() => setView('transactions')} className="btn-link">View All →</button>
                    </div>
                    <div className="txn-list">
                        {visibleTransactions.slice(-5).reverse().map((t, i) => {
                            const Icon = categoryIcons[t.category] || CreditCard;
                            return (
                                <div key={i} className="txn-item">
                                    <div className="txn-icon" style={{ background: categoryColors[t.category] + '20' }}>
                                        <Icon style={{ color: categoryColors[t.category] }} />
                                    </div>
                                    <div className="txn-details">
                                        <div className="txn-desc">{t.description}</div>
                                        <div className="txn-meta">{t.date} • {t.category}</div>
                                    </div>
                                    <div className="flex gap" style={{ marginLeft: 'auto', marginRight: '12px' }}>
                                        <button onClick={() => onToggleHide(t.id)} className="btn-icon" title="Hide"><EyeOff size={14} /></button>
                                        <button onClick={() => onDeleteTransaction(t.id)} className="btn-icon text-danger" title="Delete"><Trash2 size={14} /></button>
                                    </div>
                                    <div className={(t.type?.toLowerCase() === 'credit' || t.type?.toLowerCase() === 'income') ? 'txn-amount-credit' : 'txn-amount-debit'}>
                                        {(t.type?.toLowerCase() === 'credit' || t.type?.toLowerCase() === 'income') ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
