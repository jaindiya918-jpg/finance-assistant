/**
 * Financial Simulation Engine
 * Projects cashflow and assesses health based on transactions and goals.
 */

// Helpers
const getAverageMonthlyStats = (transactions) => {
    const today = new Date();
    // Look back 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    const relevantTxns = transactions.filter(t => new Date(t.date) >= threeMonthsAgo);

    // Group by month
    const monthlyStats = {};
    relevantTxns.forEach(t => {
        const monthKey = t.date.substring(0, 7); // YYYY-MM
        if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { income: 0, expense: 0 };

        const amount = Math.abs(Number(t.amount));
        if (t.type === 'credit' || t.type === 'income') {
            monthlyStats[monthKey].income += amount;
        } else {
            monthlyStats[monthKey].expense += amount;
        }
    });

    const months = Object.keys(monthlyStats).length || 1;
    const totalIncome = Object.values(monthlyStats).reduce((acc, m) => acc + m.income, 0);
    const totalExpense = Object.values(monthlyStats).reduce((acc, m) => acc + m.expense, 0);

    return {
        avgIncome: totalIncome / months,
        avgExpense: totalExpense / months,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) : 0
    };
};

export const analyzeFinancialHealth = (transactions, goals, currentBalance = 0) => {
    const { avgIncome, avgExpense } = getAverageMonthlyStats(transactions);
    const monthlySurplus = avgIncome - avgExpense;
    const emergencyFundMonths = avgExpense > 0 ? currentBalance / avgExpense : 0;

    return {
        monthlyIncome: avgIncome,
        monthlyExpense: avgExpense,
        monthlySurplus,
        currentBalance,
        emergencyFundMonths,
        goals
    };
};

export const simulateScenario = (currentHealth, scenario) => {
    // Scenario: { type: 'expense' | 'investment', amount: number, date: 'YYYY-MM-DD', label: string }
    const { monthlyIncome, monthlyExpense, currentBalance, goals } = currentHealth;

    // Default projection: 6 months
    const projection = [];
    let runningBalance = currentBalance;
    const today = new Date();

    // Risks detected
    const risks = [];
    const impacts = [];

    // Scenario Amount
    const scenarioAmount = Math.abs(Number(scenario.amount));

    // Check Immediate Impact (this month)
    if (scenario.date && new Date(scenario.date).getMonth() === today.getMonth()) {
        runningBalance -= scenarioAmount;
        if (runningBalance < 0) {
            risks.push({
                type: 'NEGATIVE_BALANCE',
                message: `This purchase will put you in negative balance (₹${runningBalance.toFixed(0)}) immediately.`
            });
        }
    }

    // Project 6 months
    for (let i = 0; i < 6; i++) {
        const monthDate = new Date();
        monthDate.setMonth(today.getMonth() + i);
        const monthLabel = monthDate.toLocaleString('default', { month: 'short' });

        // Add monthly surplus
        runningBalance += (monthlyIncome - monthlyExpense);

        // If scenario happens in this month (future)
        if (scenario.date) {
            const scenDate = new Date(scenario.date);
            if (scenDate.getMonth() === monthDate.getMonth() && scenDate.getFullYear() === monthDate.getFullYear()) {
                runningBalance -= scenarioAmount;
            }
        }
        // If recurring expense? (Not handling sophisticated recurring for now, just simple one-off simulation)

        // Check Goals
        // Simple logic: If balance < goal target by deadline, it's impacted
        // But for "delays", we check if we have enough cash at deadline

        projection.push({ month: monthLabel, balance: runningBalance });

        // Check risk again
        if (runningBalance < 0) {
            // Avoid duplicate risk messages
            if (!risks.find(r => r.type === 'NEGATIVE_BALANCE')) {
                risks.push({
                    type: 'NEGATIVE_BALANCE',
                    message: `You are projected to have negative balance in ${monthLabel}.`
                });
            }
        }
    }

    // Check Emergency Fund Impact (After immediate purchase)
    const postPurchaseBalance = currentBalance - scenarioAmount;
    const newEmergencyMonths = monthlyExpense > 0 ? postPurchaseBalance / monthlyExpense : 0;

    if (newEmergencyMonths < 3) {
        if (currentHealth.emergencyFundMonths >= 3) {
            risks.push({
                type: 'EMERGENCY_FUND_RISK',
                message: `This drops your emergency fund to ${newEmergencyMonths.toFixed(1)} months (recommended: 3+).`
            });
        } else if (newEmergencyMonths < 1) {
            risks.push({
                type: 'CRITICAL_RISK',
                message: `This is somewhat dangerous. You will have less than 1 month of expenses left.`
            });
        }
    }

    return {
        params: scenario,
        risks,
        projection,
        postPurchaseBalance,
        newEmergencyMonths
    };
};
