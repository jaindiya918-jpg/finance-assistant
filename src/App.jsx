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

import { useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';

export default function App() {
    const { user, loading } = useAuth();

    if (loading) return null; // Or a loading spinner
    if (!user) return <Login />;

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
    const [userLocation, setUserLocation] = useLocalStorage('userLocation', '');

    // Modals
    const [showExpense, setShowExpense] = useState(false);
    const [showGoal, setShowGoal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAnalysisLoading, setShowAnalysisLoading] = useState(false);
    const [chatLoading, setChatLoading] = useState(false);

    // Notification tracking
    const notifiedBills = React.useRef(new Set());
    const notifiedRecurring = React.useRef(new Set());
    const [activeNotification, setActiveNotification] = useState(null);
    const [budgetAlert, setBudgetAlert] = useState(null);
    const [recurringAlert, setRecurringAlert] = useState(null);

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

    // Check for recurring transactions due in the next 3 days
    useEffect(() => {
        if (!recurring.length || recurringAlert) return;

        const checkRecurring = () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const dueItem = recurring.find(item => {
                const dueDate = new Date(item.nextDueDate);
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 3 && !notifiedRecurring.current.has(item.id);
            });

            if (dueItem) {
                const dueDate = new Date(dueItem.nextDueDate);
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                setRecurringAlert({ ...dueItem, daysLeft: diffDays });
                notifiedRecurring.current.add(dueItem.id);
            }
        };

        checkRecurring();
    }, [recurring, recurringAlert]);

    // Add expense
    const addExpense = async (e) => {
        e.preventDefault();
        if (!expense.description || !expense.amount) return showToast('Fill all fields', 'error');

        const cleanedAmount = String(expense.amount).replace(/[^0-9.-]/g, '');
        const amount = parseFloat(cleanedAmount);
        if (isNaN(amount)) return showToast('Invalid amount', 'error');

        const newTxn = {
            ...expense,
            amount: expense.type === 'credit' ? Math.abs(amount) : -Math.abs(amount),
            id: Date.now()
        };

        setTransactions(prev => {
            const newTransactions = [...prev, newTxn];

            // Budget notification logic moved here to use latest transactions
            const budget = budgets.find(b => b.category === expense.category);
            if (budget) {
                const currentMonth = new Date().toISOString().slice(0, 7);
                const spent = newTransactions
                    .filter(t => (t.type === 'debit' || t.type === 'expense') && t.category === expense.category && t.date.startsWith(currentMonth))
                    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
                const remaining = budget.limit - spent;

                setBudgetAlert({
                    category: expense.category,
                    remaining,
                    isOver: remaining < 0
                });
            }
            return newTransactions;
        });

        showToast(`Transaction added!`);
        setShowExpense(false);
        setExpense({ date: new Date().toISOString().split('T')[0], description: '', amount: '', type: 'debit', category: 'Other' });
    };

    // Delete transaction
    const deleteTransaction = (id) => {
        if (!window.confirm('Are you sure you want to delete this transaction?')) return;
        setTransactions(prev => prev.filter(t => t.id !== id));
        showToast('Transaction deleted');
    };

    // Toggle hide transaction
    const toggleHideTransaction = (id) => {
        setTransactions(prev => prev.map(t => t.id === id ? { ...t, hidden: !t.hidden } : t));
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
            amount: -Math.abs(Number(bill.amount)),
            type: 'debit',
            category: 'Bills',
            isRecurring: false
        };

        setTransactions(prev => {
            const updatedTransactions = [...prev, newTransaction];
            const budget = budgets.find(b => b.category === 'Bills');
            if (budget) {
                const currentMonth = new Date().toISOString().slice(0, 7);
                const spent = updatedTransactions
                    .filter(t => (t.type === 'debit' || t.type === 'expense') && t.category === 'Bills' && t.date.startsWith(currentMonth))
                    .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
                const remaining = budget.limit - spent;

                setBudgetAlert({
                    category: 'Bills',
                    remaining,
                    isOver: remaining < 0
                });
            }
            return updatedTransactions;
        });

        setBills(prev => prev.map(b => b.id === bill.id ? { ...b, paid: true } : b));
        showToast(`Paid ${bill.name} successfully!`);
    };

    // Handle recurring payment approval
    const handlePayRecurring = (item) => {
        const newTransaction = {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            description: `Recurring: ${item.description}`,
            amount: item.type === 'debit' ? -Math.abs(item.amount) : Math.abs(item.amount),
            type: item.type,
            category: item.category,
            isRecurring: true
        };

        const updatedTransactions = [...transactions, newTransaction];
        setTransactions(updatedTransactions);

        // Update next due date
        const date = new Date(item.nextDueDate);
        if (item.frequency === 'daily') date.setDate(date.getDate() + 1);
        if (item.frequency === 'weekly') date.setDate(date.getDate() + 7);
        if (item.frequency === 'monthly') date.setMonth(date.getMonth() + 1);
        if (item.frequency === 'yearly') date.setFullYear(date.getFullYear() + 1);

        setRecurring(prev => prev.map(r => r.id === item.id ? { ...r, nextDueDate: date.toISOString().split('T')[0] } : r));

        // Budget Check
        const budget = budgets.find(b => b.category === item.category);
        if (budget) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const spent = updatedTransactions
                .filter(t => t.type === 'debit' && t.category === item.category && t.date.startsWith(currentMonth))
                .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
            const remaining = budget.limit - spent;

            setBudgetAlert({
                category: item.category,
                remaining,
                isOver: remaining < 0
            });
        }

        showToast(`Paid ${item.description} successfully!`);
        setRecurringAlert(null);
    };
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
        const income = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
        const totalExpense = Math.abs(transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0));
        const categorySpending = {};
        transactions.filter(t => t.type === 'debit').forEach(t => {
            categorySpending[t.category] = (categorySpending[t.category] || 0) + Math.abs(Number(t.amount));
        });

        const prompt = `Analyze financial data and return ONLY valid JSON:
Income: ₹${income}
Expenses: ₹${totalExpense}
Savings: ${((income - totalExpense) / income * 100).toFixed(1)}%
User Location: ${userLocation || 'Unknown (Ask user if high rent/food detected)'}

Categories:
${Object.entries(categorySpending).map(([c, a]) => `${c}: ₹${a}`).join('\n')}

For categories where spending is high (like Rent, Food, or Shopping), suggest specific cheaper alternatives or actionable savings tips.
If Rent is high, mention typical lower-rent areas or housing alternatives based on general market knowledge.
If Food is high, suggest specific affordable restaurants or messes nearby.

Return JSON with: {
    "personality": "Saver/Spender/Balanced", 
    "topCategories": [{"category": "name", "amount": 1000, "insight": "text"}], 
    "anomalies": ["text"], 
    "recommendations": ["General tip"], 
    "alternatives": [{"category": "name", "suggestion": "Try X instead of Y", "estimatedSavings": "₹1000", "source": "Google/Search"}],
    "savingsPotential": 5000, 
    "healthScore": 75,
    "rentHigh": boolean,  // true if rent > 30% of income
    "foodHigh": boolean, // true if Food > 20% of income
    "needsLocation": boolean, // true if (rentHigh or foodHigh) and userLocation is missing
    "housingRecommendations": [{"area": "Area Name", "price": "₹10k-15k", "notes": "Commute/Vibe details", "mapsQuery": "rent 1bhk in Area Name, ${userLocation || 'City'}"}],
    "diningRecommendations": [{"name": "Place Name", "cuisine": "Type", "price": "₹200/person", "mapsQuery": "Place Name, ${userLocation || 'City'}"}]
}`;

        try {
            const responseText = await callAI(prompt);
            let result = JSON.parse(responseText.match(/\{[\s\S]*\}/)[0]);
            result = {
                ...result,
                income,
                expense: totalExpense,
                savingsRate: ((income - totalExpense) / income * 100).toFixed(1),
                categorySpending,
                needsLocation: (result.rentHigh || result.foodHigh) && !userLocation
            };

            setAnalysis(result);
            showToast('Analysis complete!');
        } catch (err) {
            console.error('Detailed Analysis Error:', err);
            showToast(`Analysis failed: ${err.message}`, 'error');
        } finally {
            setShowAnalysisLoading(false);
        }
    };

    // Event listener for location updates from Analysis component
    useEffect(() => {
        const handleSetLocation = (e) => {
            const loc = e.detail;
            setUserLocation(loc);
            showToast(`Location set to ${loc}!`);

            // If analysis was waiting for location, refresh it
            if (analysis?.needsLocation) {
                runAnalysis();
            }
        };
        window.addEventListener('set-location', handleSetLocation);
        return () => window.removeEventListener('set-location', handleSetLocation);
    }, [analysis, setUserLocation, runAnalysis]);

    // Chat
    const sendChat = async (msg) => {
        if (!apiKey) {
            showToast('Set API key in settings', 'error');
            return setShowSettings(true);
        }

        const newHistory = [...chatHistory, { role: 'user', content: msg }];
        setChatHistory(newHistory);
        setChatLoading(true);

        // Check if user is providing location
        const locationMatch = msg.match(/(?:my location is|i am in|i live in|at)\s+([a-zA-Z\s]+)/i);
        if (locationMatch && !userLocation) {
            setUserLocation(locationMatch[1].trim());
        }

        // Check for pending transactions logic...
        const lastAssistantMsg = chatHistory[chatHistory.length - 1];
        const hasPending = lastAssistantMsg?.role === 'assistant' && lastAssistantMsg.pendingTransactions?.length > 0;
        const isConfirming = msg.toLowerCase().match(/yes|add|confirm|do it|ok|okay/);

        if (hasPending && isConfirming) {
            const pendingTxns = lastAssistantMsg.pendingTransactions.map(t => {
                const cleanedAmount = String(t.amount).replace(/[^0-9.-]/g, '');
                const amt = parseFloat(cleanedAmount);
                return {
                    ...t,
                    amount: t.type === 'credit' ? Math.abs(amt) : -Math.abs(amt),
                    id: Date.now() + Math.random(),
                    date: t.date || new Date().toISOString().split('T')[0]
                };
            });

            setTransactions(prev => [...prev, ...pendingTxns]);
            showToast(`Added ${pendingTxns.length} transactions!`);

            const updated = [...newHistory, { role: 'assistant', content: `Great! I've added those ${pendingTxns.length} transactions to your records. You can see them in the Transactions tab.` }];
            setChatHistory(updated);
            setChatLoading(false);
            return;
        }

        const context = `Financial context: ${transactions.length} transactions, ${goals.length} goals${analysis ? `, ${analysis.personality} personality, ₹${analysis.income} income, ₹${analysis.expense} expenses, ${analysis.savingsRate}% savings` : ''}. 
        User Location: ${userLocation || 'Unknown'}.
        Question: ${msg}
        
        If the user asks for rental recommendations and location is known, provide a structured list of 3-5 nearby neighborhoods with specific rent ranges (e.g., "₹10k-15k for 1BHK") and commute notes. Do not give generic advice.`;

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

    const handleUploadCSV = async (data, fileName) => {
        if (!apiKey) {
            showToast('Set API key in settings', 'error');
            return setShowSettings(true);
        }

        if (!data || data.length === 0) {
            showToast('CSV file is empty or invalid', 'error');
            return;
        }

        const newHistory = [...chatHistory, { role: 'user', content: `Uploaded CSV: ${fileName}` }];
        setChatHistory(newHistory);
        setChatLoading(true);

        // Take first 20 rows to avoid context limits
        const sampleData = data.slice(0, 20);
        const csvString = JSON.stringify(sampleData);

        const prompt = `I have uploaded a CSV file named "${fileName}". Here is a sample of the data (first 20 rows):
${csvString}

Please analyze this data and return a JSON response with two parts:
1. "summary": A brief text summary of what you found (total transactions, date range, etc.).
2. "transactions": A list of transaction objects mapping the CSV columns to our app's format: {"date": "YYYY-MM-DD", "description": "text", "amount": number, "type": "debit"|"credit", "category": "category_name"}.

Available categories: Food & Dining, Shopping, Transportation, Entertainment, Utilities, Healthcare, Travel, Education, Rent, Investment, Salary, Other.

Format the response as: 
SUMMARY: [your text summary]
DATA: [JSON array of transactions]

If the user wants to add these, I will use this data.`;

        try {
            const reply = await callAI(prompt, true);

            // Extract summary and data
            const summaryMatch = reply.match(/SUMMARY:\s*([\s\S]*?)(?=DATA:|$)/i);
            const dataMatch = reply.match(/DATA:\s*(\[[\s\S]*\])/i);

            const summary = summaryMatch ? summaryMatch[1].trim() : "I've analyzed the CSV.";
            const assistantMsg = `${summary}\n\nShould I add these transactions to your records?`;

            setChatHistory([...newHistory, { role: 'assistant', content: assistantMsg, pendingTransactions: dataMatch ? JSON.parse(dataMatch[1]) : [] }]);
        } catch (err) {
            console.error('CSV AI Error:', err);
            setChatHistory([...newHistory, { role: 'assistant', content: 'Error analyzing CSV. Please check formatting.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const stats = {
        income: transactions.filter(t => t.type?.toLowerCase() === 'credit' || t.type?.toLowerCase() === 'income').reduce((s, t) => s + Math.abs(Number(t.amount)), 0),
        expense: transactions.filter(t => t.type?.toLowerCase() === 'debit' || t.type?.toLowerCase() === 'expense').reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    };
    stats.balance = stats.income - stats.expense;
    stats.savingsRate = stats.income > 0 ? ((stats.balance / stats.income) * 100).toFixed(1) : 0;

    return (
        <Layout currentView={view} setView={setView} setShowSettings={setShowSettings}>
            {toast && <div className={`toast toast-${toast.type}`}>{toast.type === 'success' ? <CheckCircle /> : <XCircle />}<span>{toast.msg}</span></div>}

            <SettingsModal
                show={showSettings}
                onClose={() => setShowSettings(false)}
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

            {/* Recurring Subscription Alert Modal */}
            {recurringAlert && (
                <div className="modal" style={{ zIndex: 11500 }}>
                    <div className="modal-content notification-modal" style={{ borderTop: '6px solid var(--danger)' }}>
                        <div className="icon-wrapper" style={{ background: '#fee2e2' }}>
                            <RefreshCw size={48} color="#ef4444" />
                        </div>
                        <h2 style={{ color: 'var(--danger)' }}>Subscription Reminder!</h2>
                        <p>
                            <strong>{recurringAlert.description}</strong> is due {recurringAlert.daysLeft <= 0 ? 'today' : (recurringAlert.daysLeft === 1 ? 'tomorrow' : `in ${recurringAlert.daysLeft} days`)} ({formatCurrency(recurringAlert.amount)}).
                        </p>
                        <div className="notification-actions">
                            <button
                                className="btn-secondary"
                                onClick={() => setRecurringAlert(null)}
                            >
                                Pay Later
                            </button>
                            <button
                                className="btn-primary"
                                style={{ background: 'var(--danger)' }}
                                onClick={() => handlePayRecurring(recurringAlert)}
                            >
                                Pay Now
                            </button>
                        </div>
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
                    onDeleteTransaction={deleteTransaction}
                    onToggleHide={toggleHideTransaction}
                />
            )}

            {view === 'transactions' && (
                <TransactionList
                    transactions={transactions}
                    onAddTransaction={() => setShowExpense(true)}
                    onDeleteTransaction={deleteTransaction}
                    onToggleHide={toggleHideTransaction}
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
                    onUploadCSV={handleUploadCSV}
                    isLoading={chatLoading}
                    userLocation={userLocation}
                    setUserLocation={setUserLocation}
                />
            )}
        </Layout>
    );
}
