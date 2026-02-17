import React, { useState, useRef } from 'react';
import { MessageSquare, RefreshCw, Send, Paperclip } from 'lucide-react';
import Papa from 'papaparse';

const ChatAssistant = ({ chatHistory, onSendChat, onUploadCSV, isLoading, userLocation, setUserLocation }) => {
    const [chatInput, setChatInput] = useState('');
    const fileInputRef = useRef(null);

    const handleSend = () => {
        if (!chatInput.trim()) return;
        onSendChat(chatInput);
        setChatInput('');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log('File selected:', file.name);

        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please upload a .csv file');
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                console.log('CSV Parsed:', results.data.length, 'rows');
                onUploadCSV(results.data, file.name);
                // Reset input so the same file can be uploaded again
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            error: (err) => {
                console.error('CSV Parsing Error:', err);
                alert('Error parsing CSV file');
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        });
    };

    return (
        <div className="view">
            <div className="hero">
                <h1>AI Assistant</h1>
                <p>Get personalized financial advice {userLocation && `for ${userLocation}`}</p>
            </div>

            <div className="chat-container">
                {userLocation && (
                    <div style={{ padding: '8px 24px', background: 'rgba(102, 126, 234, 0.1)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="small">📍 Currently in <strong>{userLocation}</strong></span>
                        <button onClick={() => setUserLocation('')} className="btn-link" style={{ fontSize: '12px' }}>Change Location</button>
                    </div>
                )}
                <div className="chat-messages">
                    {chatHistory.length === 0 ? (
                        <div className="chat-empty">
                            <MessageSquare />
                            <p>
                                {userLocation
                                    ? `Ask me about cheap rent in ${userLocation} or upload a CSV!`
                                    : "Ask me anything about your finances or for cheaper alternatives for your expenses!"}
                            </p>
                        </div>
                    ) : (
                        chatHistory.map((msg, i) => (
                            <div key={i} className={`chat-message chat-${msg.role}`}>
                                <div className="chat-bubble">{msg.content}</div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="chat-message chat-assistant">
                            <div className="chat-bubble"><RefreshCw className="spinner-sm" /> Thinking...</div>
                        </div>
                    )}
                </div>
                <div className="chat-input">
                    <button
                        className="upload-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload CSV"
                        type="button"
                        disabled={isLoading}
                    >
                        {isLoading ? <RefreshCw className="spinner-sm" /> : <Paperclip size={20} />}
                    </button>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                    />
                    <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        placeholder={userLocation ? `Ask about ${userLocation}...` : "Ask about your finances..."}
                    />
                    <button onClick={handleSend} disabled={isLoading || !chatInput.trim()} className="btn-primary">
                        <Send />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatAssistant;
