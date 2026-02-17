import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Send, BrainCircuit, RefreshCw, Wand2, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import useSpeechToText from '../../hooks/useSpeechToText'; // Adjust path if needed
import { formatCurrency } from '../../utils/helpers'; // Adjust path

const CFOAgent = ({ onAnalyze, isLoading, result, userLocation }) => {
    const [input, setInput] = useState('');
    const {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript
    } = useSpeechToText({ continuous: false });

    useEffect(() => {
        if (transcript) setInput(transcript);
    }, [transcript]);

    const handleSend = () => {
        if (!input.trim()) return;
        onAnalyze(input);
        // Don't clear input immediately so user accepts what they asked, or clear it? 
        // Let's clear it for proper flow
        // setInput(''); 
        resetTranscript();
    };

    const handleMicClick = () => {
        if (isListening) stopListening();
        else startListening();
    };

    return (
        <div className="view cfo-view">
            <div className="cfo-container">
                {/* Header */}
                <div className="cfo-header">
                    <div className="cfo-icon-wrapper">
                        <BrainCircuit size={48} className="cfo-logo" />
                    </div>
                    <h1>Personal CFO Agent</h1>
                    <p>Ask me "Can I afford..." or "What if..." to simulate your financial future.</p>
                </div>

                {/* Input Section */}
                <div className="cfo-input-section">
                    <div className={`cfo-mic-wrapper ${isListening ? 'listening' : ''}`}>
                        <button className="cfo-mic-btn" onClick={handleMicClick}>
                            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                        </button>
                        {isListening && <div className="cfo-ripple"></div>}
                    </div>

                    <div className="cfo-text-input">
                        <input
                            type="text"
                            value={isListening ? (interimTranscript || "Listening...") : input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="e.g. Can I afford a trip to Goa for ₹20k?"
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={isListening || isLoading}
                        />
                        <button onClick={handleSend} disabled={!input || isLoading} className="cfo-send-btn">
                            {isLoading ? <RefreshCw className="spinner-sm" /> : <Send size={20} />}
                        </button>
                    </div>
                </div>

                {/* Result Dashboard */}
                {result && (
                    <div className="cfo-dashboard fade-in">
                        <div className={`cfo-verdict-card verdict-${result.verdict.verdict.toLowerCase().replace(' ', '-')}`}>
                            <div className="cfo-verdict-header">
                                <span className="cfo-verdict-badge">
                                    {result.verdict.verdict === 'SAFE' && <><CheckCircle size={18} /> SAFE</>}
                                    {result.verdict.verdict === 'RISKY' && <><AlertTriangle size={18} /> RISKY</>}
                                    {result.verdict.verdict === 'NOT_RECOMMENDED' && <><XCircle size={18} /> NOT RECOMMENDED</>}
                                    {result.verdict.verdict === 'ONLY_IF' && <><AlertTriangle size={18} /> ONLY IF...</>}
                                </span>
                            </div>

                            <div className="cfo-verdict-reason">
                                <h3>The Strategy</h3>
                                <p>{result.response}</p>
                            </div>

                            {/* Impact Analysis */}
                            <div className="cfo-impact-grid">
                                <div className="cfo-impact-item">
                                    <label>Scenario Cost</label>
                                    <span>{formatCurrency(result.scenario.amount)}</span>
                                </div>
                                <div className="cfo-impact-item">
                                    <label>Future Balance</label>
                                    <span className={result.simulation.postPurchaseBalance < 0 ? 'text-danger' : 'text-success'}>
                                        {formatCurrency(result.simulation.postPurchaseBalance)}
                                    </span>
                                </div>
                                <div className="cfo-impact-item">
                                    <label>Emergency Fund</label>
                                    <span className={result.simulation.newEmergencyMonths < 3 ? 'text-warning' : ''}>
                                        {result.simulation.newEmergencyMonths.toFixed(1)} Months
                                    </span>
                                </div>
                            </div>

                            {/* Actionable Alternatives if risky */}
                            {result.alternatives && result.alternatives.length > 0 && (
                                <div className="cfo-alternatives">
                                    <h4><Wand2 size={16} /> Better Moves</h4>
                                    <ul>
                                        {result.alternatives.map((alt, i) => (
                                            <li key={i}>{alt}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!result && !isLoading && (
                    <div className="cfo-suggestions">
                        <p>Try asking:</p>
                        <div className="chip-container">
                            <button onClick={() => setInput("Can I afford a MacBook Pro?")}>💻 Buy MacBook</button>
                            <button onClick={() => setInput("Safe to invest ₹10k in Stocks?")}>📈 Invest ₹10k</button>
                            <button onClick={() => setInput("What if I spend ₹50,000 this month?")}>💸 Spend ₹50k</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CFOAgent;
