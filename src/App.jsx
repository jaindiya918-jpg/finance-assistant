import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, Plus, X, Target, AlertCircle, AlertTriangle } from 'lucide-react';
import './App.css';
import useLocalStorage from './hooks/useLocalStorage';
import { formatCurrency } from './utils/helpers';

// Components
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import TransactionList from './components/Transactions/TransactionList';
import GoalList from './components/Goals/GoalList';
import Analysis from './components/Analysis/Analysis';
import ChatAssistant from './components/Assistant/ChatAssistant';
import SettingsModal from './components/Settings/SettingsModal';

import BudgetManager from './components/Budget/BudgetManager';
import RecurringManager from './components/Transactions/RecurringManager';
import BillReminders from './components/Bills/BillReminders';

export default function App() {
    // State
    const [view, setView] = useLocalStorage('currentView', 'dashboard');
    const [transactions, setTransactions] = useLocalStorage('transactions', []);
    const [goals, setGoals] = useLocalStorage('goals', []);
    const [budgets, setBudgets] = useLocalStorage('budgets', []);
    const [recurring, setRecurring] = useLocalStorage('recurring', []);
    const [bills, setBills] = useLocalStorage('bills', []);
    const [analysis, setAnalysis] = useLocalStorage('analysis', null);
    const [chatHistory, setChatHistory] = useLocalStorage('chatHistory', []);
    const [apiKey, setApiKey] = useLocalStorage('apiKey', import.meta.env.VITE_GROQ_API_KEY || '');
    const [apiProvider, setApiProvider] = useLocalStorage('apiProvider', 'groq');

    // Modals
    const [showExpense, setShowExpense] = useState(false);
    const [showGoal, setShowGoal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAnalysisLoading, setShowAnalysisLoading] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);

    // Notification tracking
    const notifiedBills = React.useRef(new Set());
    const [activeNotification, setActiveNotification] = useState(null);
    const [budgetAlert, setBudgetAlert] = useState(null);

    // Forms
    const [expense, setExpense] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: '', type: 'debit', category: 'Other' });
    const [goal, setGoal] = useState({ name: '', targetAmount: '', deadline: '', emoji: '🎯' });
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Check for bills due tomorrow
    useEffect(() => {
        const checkBills = () => {
            if (activeNotification) return; // Don't overwrite existing notification

            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            const billDue = bills.find(bill => !bill.paid && bill.dueDate === tomorrowStr && !notifiedBills.current.has(bill.id));

            if (billDue) {
                setActiveNotification(billDue);
                notifiedBills.current.add(billDue.id);
            }
        };
        checkBills();
    }, [bills, activeNotification]);

    // Process recurring transactions
    useEffect(() => {
        if (!recurring.length) return;

        const processRecurring = () => {
            const today = new Date().toISOString().split('T')[0];
            let updatedRecurring = [...recurring];
            let newTransactions = [];
            let changed = false;

            updatedRecurring = updatedRecurring.map(item => {
                if (item.nextDueDate <= today) {
                    changed = true;
                    // Add transaction
                    newTransactions.push({
                        id: Date.now() + Math.random(),
                        date: item.nextDueDate,
                        description: item.description,
                        amount: item.type === 'debit' ? -Math.abs(item.amount) : Math.abs(item.amount),
                        type: item.type,
                        category: item.category,
                        isRecurring: true
                    });

                    // Calculate next date
                    const date = new Date(item.nextDueDate);
                    if (item.frequency === 'daily') date.setDate(date.getDate() + 1);
                    if (item.frequency === 'weekly') date.setDate(date.getDate() + 7);
                    if (item.frequency === 'monthly') date.setMonth(date.getMonth() + 1);
                    if (item.frequency === 'yearly') date.setFullYear(date.getFullYear() + 1);

                    return { ...item, nextDueDate: date.toISOString().split('T')[0] };
                }
                return item;
            });

            if (changed) {
                setRecurring(updatedRecurring);
                setTransactions(prev => [...prev, ...newTransactions]);
                showToast(`${newTransactions.length} recurring transactions processed`);
            }
        };

        processRecurring();
    }, [recurring, setTransactions, setRecurring]);

    // Add expense
    const addExpense = async (e) => {
        e.preventDefault();
        if (!expense.description || !expense.amount) return showToast('Fill all fields', 'error');

        const newTxn = {
            ...expense,
            amount: expense.type === 'credit' ? parseFloat(expense.amount) : -parseFloat(expense.amount),
            id: Date.now()
        };

        const newTransactions = [...transactions, newTxn];
        setTransactions(newTransactions);

        let budgetMsg = '';
        const budget = budgets.find(b => b.category === expense.category);
        if (budget) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const spent = newTransactions
                .filter(t => t.type === 'debit' && t.category === expense.category && t.date.startsWith(currentMonth))
                .reduce((s, t) => s + Math.abs(t.amount), 0);
            const remaining = budget.limit - spent;

            setBudgetAlert({
                category: expense.category,
                remaining,
                isOver: remaining < 0
            });
        }

        showToast(`Transaction added!`);
        setShowExpense(false);
        setExpense({ date: new Date().toISOString().split('T')[0], description: '', amount: '', type: 'debit', category: 'Other' });
    };

    // Add goal
    const addGoal = async (e) => {
        e.preventDefault();
        if (!goal.name || !goal.targetAmount || !goal.deadline) return showToast('Fill all fields', 'error');

        const newGoal = { ...goal, id: Date.now(), currentAmount: 0, targetAmount: parseFloat(goal.targetAmount) };
        setGoals(prev => [...prev, newGoal]);
        showToast('Goal created!');
        setShowGoal(false);
        setGoal({ name: '', targetAmount: '', deadline: '', emoji: '🎯' });
    };

    // Update goal
    const updateGoal = (id, amount) => {
        setGoals(prev => prev.map(g => g.id === id ? { ...g, currentAmount: Math.max(0, g.currentAmount + parseFloat(amount)) } : g));
        showToast('Goal updated!');
    };

    // Delete goal
    const deleteGoal = (id) => {
        setGoals(prev => prev.filter(g => g.id !== id));
        showToast('Goal deleted');
    };

    // Handle bill payment
    const handlePayBill = (bill) => {
        const newTransaction = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            description: `Bill Payment: ${bill.name}`,
            amount: -Math.abs(bill.amount),
            type: 'debit',
            category: 'Bills',
            isRecurring: false
        };
        const updatedTransactions = [...transactions, newTransaction];
        setTransactions(updatedTransactions);
        setBills(prev => prev.map(b => b.id === bill.id ? { ...b, paid: true } : b));

        const budget = budgets.find(b => b.category === 'Bills');
        if (budget) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const spent = updatedTransactions
                .filter(t => t.type === 'debit' && t.category === 'Bills' && t.date.startsWith(currentMonth))
                .reduce((s, t) => s + Math.abs(t.amount), 0);
            const remaining = budget.limit - spent;

            setBudgetAlert({
                category: 'Bills',
                remaining,
                isOver: remaining < 0
            });
        }

        showToast(`Paid ${bill.name} successfully!`);
    };

    // AI API call helper
    const callAI = async (prompt, isChat = false) => {
        try {
            if (apiProvider === 'anthropic') {
                const res = await fetch('/api/anthropic/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                    body: JSON.stringify({ model: 'claude-3-5-sonnet-20240620', max_tokens: isChat ? 1500 : 2000, messages: [{ role: 'user', content: prompt }] })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || `Anthropic Error: ${res.status}`);
                return data.content[0].text;
            } else if (apiProvider === 'gemini') {
                const res = await fetch(`/api/gemini/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || `Gemini Error: ${res.status}`);
                return data.candidates[0].content.parts[0].text;
            } else if (apiProvider === 'groq') {
                const res = await fetch('/api/groq/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: isChat ? 1500 : 2000 })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error?.message || `Groq Error: ${res.status}`);
                return data.choices[0].message.content;
            }
        } catch (error) {
            console.error('AI Call failed:', error);
            throw error;
        }
    };

    // Run AI Analysis
    const runAnalysis = async () => {
        if (!transactions.length) return showToast('No transactions to analyze', 'error');
        if (!apiKey) {
            showToast('Set API key in settings', 'error');
            return setShowSettings(true);
        }

        setShowAnalysisLoading(true);
        const income = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
        const totalExpense = Math.abs(transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0));
        const categorySpending = {};
        transactions.filter(t => t.type === 'debit').forEach(t => {
            categorySpending[t.category] = (categorySpending[t.category] || 0) + Math.abs(t.amount);
        });

        const prompt = `Analyze financial data and return ONLY valid JSON:
Income: ₹${income}
Expenses: ₹${totalExpense}
Savings: ${((income - totalExpense) / income * 100).toFixed(1)}%

Categories:
${Object.entries(categorySpending).map(([c, a]) => `${c}: ₹${a}`).join('\n')}

Return JSON with: {"personality": "Saver/Spender/Balanced", "topCategories": [{"category": "name", "amount": 1000, "insight": "text"}], "anomalies": ["text"], "recommendations": ["tip1", "tip2", "tip3"], "savingsPotential": 5000, "healthScore": 75}`;

        try {
            const responseText = await callAI(prompt);
            let result = JSON.parse(responseText.match(/\{[\s\S]*\}/)[0]);
            result = { ...result, income, expense: totalExpense, savingsRate: ((income - totalExpense) / income * 100).toFixed(1), categorySpending };

            setAnalysis(result);
            showToast('Analysis complete!');
        } catch (err) {
            console.error('Detailed Analysis Error:', err);
            showToast(`Analysis failed: ${err.message}`, 'error');
        } finally {
            setShowAnalysisLoading(false);
        }
    };

    // Chat
    const sendChat = async (msg) => {
        if (!apiKey) {
            showToast('Set API key in settings', 'error');
            return setShowSettings(true);
        }

        const newHistory = [...chatHistory, { role: 'user', content: msg }];
        setChatHistory(newHistory);
        setChatLoading(true);

        const context = `Financial context: ${transactions.length} transactions, ${goals.length} goals${analysis ? `, ${analysis.personality} personality, ₹${analysis.income} income, ₹${analysis.expense} expenses, ${analysis.savingsRate}% savings` : ''}. Question: ${msg}`;

        try {
            const reply = await callAI(context, true);
            const updated = [...newHistory, { role: 'assistant', content: reply }];
            setChatHistory(updated);
        } catch (err) {
            setChatHistory([...newHistory, { role: 'assistant', content: 'Error. Check API key.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const stats = {
        income: transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
        expense: Math.abs(transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0))
    };
    stats.balance = stats.income - stats.expense;
    stats.savingsRate = stats.income > 0 ? ((stats.balance / stats.income) * 100).toFixed(1) : 0;

    return (
        <Layout currentView={view} setView={setView} setShowSettings={setShowSettings}>
            {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? <CheckCircle /> : <XCircle />}<span>{toast.msg}</span></div>}

            <SettingsModal
                show={showSettings}
                onClose={() => setShowSettings(false)}
                apiProvider={apiProvider}
                setApiProvider={setApiProvider}
                apiKey={apiKey}
                setApiKey={setApiKey}
                onSave={() => {
                    showToast('Settings saved!');
                    setShowSettings(false);
                }}
            />

            {/* Budget Alert Modal */}
            {budgetAlert && (
                <div className="modal" style={{ zIndex: 12000 }}>
                    <div className="modal-content notification-modal">
                        <div className="icon-wrapper" style={{ background: '#fee2e2' }}>
                            <AlertTriangle size={48} color="#ef4444" />
                        </div>
                        <h2 style={{ color: 'var(--danger)' }}>Budget Alert!</h2>
                        <p style={{ fontSize: '18px', fontWeight: '500' }}>
                            <strong>{budgetAlert.category}</strong> status:
                        </p>
                        <p style={{ fontSize: '16px' }}>
                            {budgetAlert.isOver ? (
                                <span style={{ color: 'var(--danger)', fontWeight: '700' }}>
                                    EXCEEDED by {formatCurrency(Math.abs(budgetAlert.remaining))}!
                                </span>
                            ) : (
                                <span style={{ color: 'var(--success)', fontWeight: '700' }}>
                                    {formatCurrency(budgetAlert.remaining)} left in budget.
                                </span>
                            )}
                        </p>
                        <button
                            className="btn-primary"
                            style={{ width: '100%', marginTop: '16px', background: 'var(--danger)' }}
                            onClick={() => setBudgetAlert(null)}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            {/* Bill Notification Modal */}
            {activeNotification && (
                <div className="modal" style={{ zIndex: 11000 }}>
                    <div className="modal-content notification-modal">
                        <div className="icon-wrapper">
                            <AlertCircle size={48} color="#ef4444" />
                        </div>
                        <h2>Bill Due Tomorrow!</h2>
                        <p>{activeNotification.name} is due tomorrow ({formatCurrency(activeNotification.amount)}).</p>
                        <div className="notification-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setActiveNotification(null)}
                            >
                                Pay Later
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    handlePayBill(activeNotification);
                                    setActiveNotification(null);
                                }}
                            >
                                Pay Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Expense Modal */}
            {showExpense && (
                <div className="modal" onClick={() => setShowExpense(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><Plus /> Add Transaction</h2>
                            <button onClick={() => setShowExpense(false)}><X /></button>
                        </div>
                        <form className="modal-body" onSubmit={addExpense}>
                            <label>Date</label>
                            <input type="date" value={expense.date} onChange={e => setExpense({ ...expense, date: e.target.value })} required />

                            <label>Description</label>
                            <input type="text" value={expense.description} onChange={e => setExpense({ ...expense, description: e.target.value })} placeholder="e.g., Coffee at Starbucks" required />

                            <label>Amount (₹)</label>
                            <input type="number" value={expense.amount} onChange={e => setExpense({ ...expense, amount: e.target.value })} placeholder="100" required />

                            <label>Type</label>
                            <select value={expense.type} onChange={e => setExpense({ ...expense, type: e.target.value })}>
                                <option value="debit">Expense</option>
                                <option value="credit">Income</option>
                            </select>

                            <label>Category</label>
                            <select value={expense.category} onChange={e => setExpense({ ...expense, category: e.target.value })}>
                                <option value="Food & Dining">Food & Dining</option>
                                <option value="Shopping">Shopping</option>
                                <option value="Transportation">Transportation</option>
                                <option value="Entertainment">Entertainment</option>
                                <option value="Utilities">Utilities</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Travel">Travel</option>
                                <option value="Education">Education</option>
                                <option value="Rent">Rent</option>
                                <option value="Investment">Investment</option>
                                <option value="Salary">Salary</option>
                                <option value="Other">Other</option>
                            </select>

                            <button type="submit" className="btn-primary">Add Transaction</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Goal Modal */}
            {showGoal && (
                <div className="modal" onClick={() => setShowGoal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2><Target /> Create Goal</h2>
                            <button onClick={() => setShowGoal(false)}><X /></button>
                        </div>
                        <form className="modal-body" onSubmit={addGoal}>
                            <label>Goal Name</label>
                            <input type="text" value={goal.name} onChange={e => setGoal({ ...goal, name: e.target.value })} placeholder="e.g., New Laptop" required />

                            <label>Target Amount (₹)</label>
                            <input type="number" value={goal.targetAmount} onChange={e => setGoal({ ...goal, targetAmount: e.target.value })} placeholder="50000" required />

                            <label>Deadline</label>
                            <input type="date" value={goal.deadline} onChange={e => setGoal({ ...goal, deadline: e.target.value })} required />

                            <label>Emoji</label>
                            <input type="text" value={goal.emoji} onChange={e => setGoal({ ...goal, emoji: e.target.value })} maxLength="2" />

                            <button type="submit" className="btn-primary">Create Goal</button>
                        </form>
                    </div>
                </div>
            )}

            {view === 'dashboard' && (
                <Dashboard
                    stats={stats}
                    analysis={analysis}
                    goals={goals}
                    transactions={transactions}
                    runAnalysis={runAnalysis}
                    isLoadingAnalysis={showAnalysisLoading}
                    setView={setView}
                    onAddGoal={() => setShowGoal(true)}
                    budgets={budgets}
                    bills={bills}
                />
            )}

            {view === 'transactions' && (
                <TransactionList
                    transactions={transactions}
                    onAddTransaction={() => setShowExpense(true)}
                />
            )}

            {view === 'analysis' && (
                <Analysis
                    analysis={analysis}
                    transactions={transactions}
                    runAnalysis={runAnalysis}
                    isLoading={showAnalysisLoading}
                />
            )}

            {view === 'budget' && (
                <BudgetManager
                    budgets={budgets}
                    setBudgets={setBudgets}
                    transactions={transactions}
                />
            )}

            {view === 'recurring' && (
                <RecurringManager
                    recurring={recurring}
                    setRecurring={setRecurring}
                />
            )}

            {view === 'bills' && (
                <BillReminders
                    bills={bills}
                    setBills={setBills}
                    onPayBill={handlePayBill}
                />
            )}

            {view === 'goals' && (
                <GoalList
                    goals={goals}
                    onAddGoal={() => setShowGoal(true)}
                    onDeleteGoal={deleteGoal}
                    onUpdateGoal={updateGoal}
                />
            )}

            {view === 'assistant' && (
                <ChatAssistant
                    chatHistory={chatHistory}
                    onSendChat={sendChat}
                    isLoading={chatLoading}
                />
            )}
        </Layout>
    );
}
