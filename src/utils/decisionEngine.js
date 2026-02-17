/**
 * Decision Engine
 * Takes simulation results and generates a verdict and conversational response.
 */

export const generateVerdict = (simulationResult, scenario) => {
    const { risks, newEmergencyMonths, postPurchaseBalance } = simulationResult;

    let verdict = 'SAFE'; // SAFE, RISKY, NOT_RECOMMENDED, ONLY_IF
    let reason = "Your finances look healthy enough for this.";

    // Logic Chain
    if (risks.some(r => r.type === 'NEGATIVE_BALANCE')) {
        verdict = 'NOT_RECOMMENDED';
        reason = "This will cause a cashflow crunch (negative balance).";
    } else if (risks.some(r => r.type === 'CRITICAL_RISK')) {
        verdict = 'NOT_RECOMMENDED';
        reason = "It leaves you with dangerously low savings.";
    } else if (risks.some(r => r.type === 'EMERGENCY_FUND_RISK')) {
        verdict = 'RISKY';
        reason = "It eats into your emergency buffer.";
    } else if (newEmergencyMonths < 6 && scenario.amount > 50000) {
        // High value purchase with moderate savings
        verdict = 'ONLY_IF';
        reason = "It's a large expense. Recommended only if strictly necessary.";
    }

    return { verdict, reason, risks: risks.map(r => r.message) };
};

export const generateAlternatives = (scenario, simulationResult) => {
    const alts = [];
    const amount = Number(scenario.amount);

    if (simulationResult.risks.length > 0) {
        // Suggest waiting
        alts.push(`Wait 2 months to save up an extra ₹${(amount * 0.5).toFixed(0)}.`);

        // Suggest EMI if amount is high
        if (amount > 5000) {
            alts.push(`Consider a 6-month EMI of ~₹${(amount / 6 * 1.05).toFixed(0)}/mo.`);
        }

        // Suggest reducing amount
        alts.push(`Can you find a cheaper option around ₹${(amount * 0.7).toFixed(0)}?`);
    }

    return alts;
};

export const formatCFOResponse = (verdictData, alternatives, scenario) => {
    const { verdict, reason } = verdictData;

    let intro = "";
    switch (verdict) {
        case 'SAFE': intro = "✅ Yes, you can afford this."; break;
        case 'RISKY': intro = "⚠️ It's a bit risky."; break;
        case 'NOT_RECOMMENDED': intro = "❌ I wouldn't recommend this right now."; break;
        case 'ONLY_IF': intro = "🟡 You can, but be careful."; break;
        default: intro = "Here is my analysis.";
    }

    let response = `${intro} ${reason}`;

    if (alternatives.length > 0) {
        response += `\n\n💡 Safer options:\n• ${alternatives.join('\n• ')}`;
    }

    return response;
};
