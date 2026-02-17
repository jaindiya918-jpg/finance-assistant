import React, { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const SettingsModal = ({ show, onClose, apiProvider, setApiProvider, apiKey, setApiKey, onSave }) => {
    if (!show) return null;

    const { theme, toggleTheme } = useTheme();

    return (
        <div className="modal" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2><Settings /> Settings</h2>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="modal-body">
                    <label>Theme</label>
                    <div className="flex-between" style={{ marginBottom: '1rem' }}>
                        <span>Dark Mode</span>
                        <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                    </div>

                    <label>AI Provider</label>
                    <select value={apiProvider} onChange={e => setApiProvider(e.target.value)}>
                        <option value="gemini">🆓 Google Gemini (Free)</option>
                        <option value="groq">🆓 Groq (Free & Fast)</option>
                        <option value="anthropic">💳 Anthropic Claude</option>
                    </select>

                    <label>API Key</label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder={apiProvider === 'gemini' ? 'AIza...' : apiProvider === 'groq' ? 'gsk_...' : 'sk-ant-...'}
                    />

                    {apiProvider === 'gemini' && (
                        <p className="help">Get FREE key at <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener">Google AI Studio</a></p>
                    )}
                    {apiProvider === 'groq' && (
                        <p className="help">Get FREE key at <a href="https://console.groq.com" target="_blank" rel="noopener">Groq Console</a></p>
                    )}
                    {apiProvider === 'anthropic' && (
                        <p className="help">Get key at <a href="https://console.anthropic.com" target="_blank" rel="noopener">Anthropic Console</a> (requires payment)</p>
                    )}

                    <button className="btn-primary" onClick={onSave}>Save Settings</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
