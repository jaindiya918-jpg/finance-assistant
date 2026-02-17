import React, { useState } from 'react';
import { FileText, CreditCard, Plus, Download, Trash2, Eye, EyeOff } from 'lucide-react';
import { formatCurrency, categoryIcons, categoryColors } from '../../utils/helpers';
import { exportToCSV } from '../../utils/csvExport';

const TransactionList = ({ transactions, onAddTransaction, onDeleteTransaction, onToggleHide }) => {
    const [showHidden, setShowHidden] = useState(false);

    const filteredTransactions = transactions.filter(t => showHidden || !t.hidden);

    return (
        <div className="view">
            <div className="hero">
                <h1>Transactions</h1>
                <div className="flex-between">
                    <p>{transactions.length} transactions tracked</p>
                    <button
                        onClick={() => setShowHidden(!showHidden)}
                        className="btn-link"
                        style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        {showHidden ? <Eye /> : <EyeOff />} {showHidden ? 'Hide Hidden' : 'Show Hidden'}
                    </button>
                </div>
            </div>
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', gap: '12px', zIndex: 100 }}>
                <button onClick={() => exportToCSV(transactions)} className="btn-secondary" title="Export CSV"><Download /></button>
                <button onClick={onAddTransaction} className="btn-primary"><Plus /> Add Transaction</button>
            </div>

            <div className="card">
                <div className="txn-list">
                    {filteredTransactions.length === 0 ? (
                        <div className="empty">
                            <FileText />
                            <p>{showHidden ? 'No transactions yet' : 'No visible transactions'}</p>
                            {!showHidden && transactions.some(t => t.hidden) && <button onClick={() => setShowHidden(true)} className="btn-link">Show Hidden Items</button>}
                        </div>
                    ) : (
                        filteredTransactions.slice().reverse().map((t, i) => {
                            const Icon = categoryIcons[t.category] || CreditCard;
                            return (
                                <div key={i} className={`txn-item ${t.hidden ? 'txn-hidden' : ''}`} style={t.hidden ? { opacity: 0.6, background: 'rgba(0,0,0,0.02)' } : {}}>
                                    <div className="txn-icon" style={{ background: categoryColors[t.category] + '20' }}>
                                        <Icon style={{ color: categoryColors[t.category] }} />
                                    </div>
                                    <div className="txn-details">
                                        <div className="txn-desc">
                                            {t.description} {t.hidden && <span className="badge-sm">Hidden</span>}
                                        </div>
                                        <div className="txn-meta">{t.date} • {t.category}</div>
                                    </div>
                                    <div className="flex gap" style={{ marginLeft: 'auto', marginRight: '16px' }}>
                                        <button
                                            onClick={() => onToggleHide(t.id)}
                                            className="btn-icon"
                                            title={t.hidden ? "Show" : "Hide"}
                                        >
                                            {t.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                                        </button>
                                        <button
                                            onClick={() => onDeleteTransaction(t.id)}
                                            className="btn-icon text-danger"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className={(t.type?.toLowerCase() === 'credit' || t.type?.toLowerCase() === 'income') ? 'txn-amount-credit' : 'txn-amount-debit'}>
                                        {(t.type?.toLowerCase() === 'credit' || t.type?.toLowerCase() === 'income') ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionList;
