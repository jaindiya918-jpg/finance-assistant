import React, { useState } from 'react';
import { PieChart, Plus, Edit2, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { formatCurrency, categoryColors } from '../../utils/helpers';

const BudgetManager = ({ budgets, setBudgets, transactions }) => {
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);

    // Calculate spending per category
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const spending = transactions
        .filter(t => t.type === 'debit' && t.date.startsWith(currentMonth))
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
            return acc;
        }, {});

    const handleSaveBudget = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const category = formData.get('category');
        const amount = parseFloat(formData.get('amount'));

        const newBudget = { category, limit: amount };

        // Remove existing budget for this category if exists
        const updated = budgets.filter(b => b.category !== category);
        setBudgets([...updated, newBudget]);

        setShowBudgetModal(false);
        setEditingBudget(null);
    };

    const categories = Object.keys(categoryColors).filter(c => c !== 'Salary' && c !== 'Investment');

    return (
        <div className="view">
            <div className="hero">
                <h1>Monthly Budget</h1>
                <p>Track your spending limits for {new Date().toLocaleString('default', { month: 'long' })}</p>
            </div>

            <button onClick={() => { setEditingBudget(null); setShowBudgetModal(true); }} className="btn-primary fab"><Plus /> Set Budget</button>

            <div className="grid">
                {budgets.map(budget => {
                    const spent = spending[budget.category] || 0;
                    const percentage = Math.min((spent / budget.limit) * 100, 100);
                    const isOver = spent > budget.limit;
                    const color = isOver ? '#ef4444' : percentage > 80 ? '#f59e0b' : categoryColors[budget.category];

                    return (
                        <div key={budget.category} className="card">
                            <div className="flex-between">
                                <h3 style={{ color: categoryColors[budget.category] }}>{budget.category}</h3>
                                <button className="btn-icon" onClick={() => {
                                    setEditingBudget(budget);
                                    setShowBudgetModal(true);
                                }}><Edit2 size={16} /></button>
                            </div>

                            <div className="flex-between" style={{ marginBottom: '8px' }}>
                                <span>{formatCurrency(spent)} <span className="small">spent</span></span>
                                <span>{formatCurrency(budget.limit)} <span className="small">limit</span></span>
                            </div>

                            <div className="progress-bar">
                                <div
                                    style={{ width: `${percentage}%`, background: color }}
                                    className="progress-fill"
                                ></div>
                            </div>

                            <div className="flex-between" style={{ marginTop: '12px' }}>
                                <div className="space-y-xs">
                                    <div className="small">{percentage.toFixed(0)}% used</div>
                                    <div style={{
                                        fontWeight: '700',
                                        color: isOver ? 'var(--danger)' : 'var(--success)',
                                        fontSize: '14px'
                                    }}>
                                        {isOver ? 'Over by ' : ''}{formatCurrency(Math.abs(budget.limit - spent))} {isOver ? '' : 'left'}
                                    </div>
                                </div>
                                {isOver && <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold' }}><AlertTriangle size={12} /> Limit Exceeded</span>}
                            </div>
                        </div>
                    );
                })}

                {budgets.length === 0 && (
                    <div className="card empty">
                        <PieChart />
                        <p>No budgets set yet.</p>
                        <button onClick={() => setShowBudgetModal(true)} className="btn-primary">Set First Budget</button>
                    </div>
                )}
            </div>

            {showBudgetModal && (
                <div className="modal" onClick={() => setShowBudgetModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingBudget ? 'Edit' : 'Set'} Budget</h2>
                            <button onClick={() => setShowBudgetModal(false)}><X /></button>
                        </div>
                        <form className="modal-body" onSubmit={handleSaveBudget}>
                            <label>Category</label>
                            <select name="category" defaultValue={editingBudget?.category || categories[0]}>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            <label>Monthly Limit (₹)</label>
                            <input name="amount" type="number" defaultValue={editingBudget?.limit || ''} placeholder="5000" required />

                            <button type="submit" className="btn-primary">Save Budget</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetManager;
