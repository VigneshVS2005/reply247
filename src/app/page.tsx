"use client";

// Triggering auto Vercel redeploy to activate connected KV Database
import { useState, useEffect } from 'react';

interface Contact {
  id: string;
  name: string;
  email: string;
}

interface SentLog {
  id: string;
  to: string;
  subject: string;
  text: string;
  date: string;
}

export default function Home() {
  // Authentication states
  const [accessCode, setAccessCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // Email form states
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Local storage states
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sentLogs, setSentLogs] = useState<SentLog[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);

  // Tab state for desktop/preview split
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // DB connection status
  const [dbStatus, setDbStatus] = useState<{ status: string; type: string } | null>(null);

  // Timezone choice for displaying logs
  const [timezoneChoice, setTimezoneChoice] = useState<'local' | 'ist' | 'utc'>('local');

  // Shared secure board states
  const [boardText, setBoardText] = useState('');
  const [boardUpdatedAt, setBoardUpdatedAt] = useState('');
  const [boardSaveStatus, setBoardSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copiedBoard, setCopiedBoard] = useState(false);

  // Expandable log states
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  const formatLogDate = (dateString: string) => {
    try {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) return dateString;
      
      if (timezoneChoice === 'ist') {
        return dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + ' IST';
      } else if (timezoneChoice === 'utc') {
        return dateObj.toUTCString().replace('GMT', 'UTC');
      } else {
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    } catch (e) {
      return dateString;
    }
  };

  // Load database data from API routes
  const loadData = async (code: string) => {
    try {
      const headers = { Authorization: `Bearer ${code}` };
      
      const contactsRes = await fetch('/api/contacts', { headers });
      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(data.contacts || []);
      } else if (contactsRes.status === 401) {
        handleLogout();
        return;
      }
      
      const logsRes = await fetch('/api/logs', { headers });
      if (logsRes.ok) {
        const data = await logsRes.json();
        setSentLogs(data.logs || []);
      } else if (logsRes.status === 401) {
        handleLogout();
        return;
      }

      const boardRes = await fetch('/api/board', { headers });
      if (boardRes.ok) {
        const data = await boardRes.json();
        setBoardText(data.board?.text || '');
        setBoardUpdatedAt(data.board?.updatedAt || '');
      } else if (boardRes.status === 401) {
        handleLogout();
        return;
      }

      // Check DB connection status
      const statusRes = await fetch('/api/db-status');
      if (statusRes.ok) {
        const data = await statusRes.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.error('Failed to load database data:', err);
    }
  };

  // Check auth and load database data on mount
  useEffect(() => {
    const savedCode = localStorage.getItem('reply247_access_code');
    if (savedCode) {
      setAccessCode(savedCode);
      setIsAuthenticated(true);
      loadData(savedCode);
    }
  }, []);

  // Handle access code validation via server auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setAuthError('Please enter the access code.');
      return;
    }
    
    setAuthError('');
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: accessCode }),
      });
      
      if (!response.ok) {
        setAuthError('Invalid access code.');
        return;
      }
      
      localStorage.setItem('reply247_access_code', accessCode);
      setIsAuthenticated(true);
      loadData(accessCode);
    } catch (err) {
      setAuthError('Authentication failed. Server could not verify passcode.');
    }
  };

  // Logout/clear code
  const handleLogout = () => {
    localStorage.removeItem('reply247_access_code');
    setAccessCode('');
    setIsAuthenticated(false);
  };

  // Add a new contact and sync with DB
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactEmail.trim()) return;

    const newContact: Contact = {
      id: Date.now().toString(),
      name: newContactName,
      email: newContactEmail,
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    setNewContactName('');
    setNewContactEmail('');
    setShowAddContact(false);

    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessCode}`,
        },
        body: JSON.stringify({ contacts: updated }),
      });
    } catch (err) {
      console.error('Failed to sync contacts with database:', err);
    }
  };

  // Delete a contact and sync with DB
  const handleDeleteContact = async (id: string) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);

    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessCode}`,
        },
        body: JSON.stringify({ contacts: updated }),
      });
    } catch (err) {
      console.error('Failed to sync contacts with database:', err);
    }
  };

  // Clear sent logs and sync with DB
  const handleClearLogs = async () => {
    setSentLogs([]);
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessCode}`,
        },
        body: JSON.stringify({ logs: [] }),
      });
    } catch (err) {
      console.error('Failed to sync logs with database:', err);
    }
  };

  // Send Email function
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !text.trim()) {
      setErrorMessage('Please fill in recipient and message content.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          text,
          accessCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Authentication failed on server
          localStorage.removeItem('reply247_access_code');
          setIsAuthenticated(false);
          setAuthError('Your access code is incorrect. Please re-authenticate.');
          throw new Error('Invalid access code.');
        }
        throw new Error(data.error || 'Failed to send email.');
      }

      // Success
      setStatus('success');
      
      // Update history log
      const newLog: SentLog = {
        id: Date.now().toString(),
        to,
        subject,
        text,
        date: new Date().toISOString(),
      };
      const updatedLogs = [newLog, ...sentLogs].slice(0, 50); // limit to 50 logs
      setSentLogs(updatedLogs);

      try {
        await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessCode}`,
          },
          body: JSON.stringify({ logs: updatedLogs }),
        });
      } catch (err) {
        console.error('Failed to sync logs with database:', err);
      }

      // Reset form fields except recipient (in case they want to email again)
      setSubject('');
      setText('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'An unexpected error occurred while sending.');
      setStatus('error');
    }
  };

  // Secure Board Actions
  const handleSaveBoard = async () => {
    setBoardSaveStatus('saving');
    try {
      const nowStr = new Date().toISOString();
      const response = await fetch('/api/board', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessCode}`,
        },
        body: JSON.stringify({
          board: {
            text: boardText,
            updatedAt: nowStr,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to save board to database');

      setBoardUpdatedAt(nowStr);
      setBoardSaveStatus('saved');
      setTimeout(() => setBoardSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Failed to save board:', err);
      setBoardSaveStatus('error');
    }
  };

  const handleCopyBoard = () => {
    navigator.clipboard.writeText(boardText);
    setCopiedBoard(true);
    setTimeout(() => setCopiedBoard(false), 2000);
  };

  const handleClearBoard = () => {
    setBoardText('');
  };

  const handleCopyLogText = (logText: string, logId: string) => {
    navigator.clipboard.writeText(logText);
    setCopiedLogId(logId);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  // Render a live preview of the wrapped HTML email template
  const getPreviewHTML = () => {
    const formattedText = text.replace(/\n/g, '<br/>') || '[Your message content will appear here]';
    const emailSubject = subject || '[Your Subject]';
    return `
      <html>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f9fafb;margin:0;padding:20px;color:#111827;">
          <div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);border:1px solid #e5e7eb;">
            <div style="background:linear-gradient(135deg,#1e1b4b 0%,#311042 100%);padding:25px;border-bottom:3px solid #8b5cf6;">
              <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0;letter-spacing:0.05em;">reply247</h1>
              <p style="color:#a78bfa;font-size:11px;margin:5px 0 0 0;text-transform:uppercase;letter-spacing:0.1em;">Secure Communication Portal</p>
            </div>
            <div style="padding:30px;line-height:1.6;font-size:15px;color:#374151;">
              <div style="display:inline-block;padding:2px 10px;background-color:#e0e7ff;color:#4338ca;border-radius:9999px;font-size:10px;font-weight:600;margin-bottom:15px;">Official Message</div>
              <div style="font-size:13px;color:#6b7280;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #f3f4f6;">
                <strong>From:</strong> monkeykokkikumar@gmail.com<br>
                <strong>Subject:</strong> ${emailSubject}
              </div>
              <div style="min-height:80px;white-space:pre-wrap;">${formattedText}</div>
            </div>
            <div style="background-color:#f3f4f6;padding:15px;text-align:center;font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;">
              This message was sent securely via <a href="#" style="color:#6366f1;text-decoration:none;">reply247</a>.<br>
              Reply directly to this email to get in touch.
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // ----------------------------------------------------
  // RENDER: LOGIN / PASSCODE SCREEN
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <main className="flex-1 flex items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-md p-8 rounded-2xl glass-panel relative overflow-hidden">
          {/* Subtle neon glowing details */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-600 rounded-full blur-3xl opacity-20"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-pink-600 rounded-full blur-3xl opacity-20"></div>

          <div className="text-center mb-8 relative z-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 text-glow">
              reply<span className="text-purple-400">247</span>
            </h1>
            <p className="text-sm text-zinc-400">
              Authorized access only. Enter secret portal key.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div>
              <label htmlFor="passcode" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Secret Access Code
              </label>
              <input
                id="passcode"
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter access code..."
                className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 glow-input"
                autoFocus
              />
              {authError && (
                <p className="text-xs text-rose-500 mt-2 font-medium flex items-center">
                  ⚠️ {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold rounded-xl transition duration-200 shadow-lg shadow-purple-600/20 active:scale-[0.98]"
            >
              Enter Portal
            </button>
          </form>

          <footer className="mt-8 text-center text-xs text-zinc-500 relative z-10">
            Shared private utility for registered users.
          </footer>
        </div>
      </main>
    );
  }

  // ----------------------------------------------------
  // RENDER: DASHBOARD SCREEN
  // ----------------------------------------------------
  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-4 md:p-8 space-y-6 min-h-screen">
      
      {/* Header bar */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 rounded-2xl glass-panel relative overflow-hidden space-y-4 sm:space-y-0">
        <div className="absolute -top-12 left-1/4 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-10"></div>
        <div>
          <h1 className="text-3xl font-extrabold text-white text-glow">
            reply<span className="text-purple-400">247</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            Sender Active: <span className="text-zinc-200 font-mono ml-1">monkeykokkikumar@gmail.com</span>
          </p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          {dbStatus && (
            <span className={`text-xs px-3 py-1 rounded-full border ${
              dbStatus.status === 'connected' 
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50' 
                : 'bg-amber-950/40 text-amber-300 border-amber-900/50'
            }`} title={dbStatus.type === 'Vercel KV' ? 'Database connected securely' : 'Warning: Filesystem is read-only on Vercel. Connect KV database to persist.'}>
              DB: {dbStatus.type}
            </span>
          )}
          <span className="text-xs px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
            Private Node
          </span>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 bg-rose-950/40 text-rose-300 border border-rose-900/50 hover:bg-rose-900/60 hover:text-white rounded-lg transition duration-200"
          >
            Lock Terminal
          </button>
        </div>
      </header>

      {/* Main workspace layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        
        {/* LEFT COLUMN: Compose and Form */}
        <section className="lg:col-span-2 glass-panel rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <h2 className="text-xl font-bold text-white">Compose Secure Mail</h2>
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold transition ${
                  activeTab === 'edit' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold transition ${
                  activeTab === 'preview' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                HTML Preview
              </button>
            </div>
          </div>

          {activeTab === 'edit' ? (
            <form onSubmit={handleSendEmail} className="space-y-5">
              <div>
                <label htmlFor="to" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Recipient Email
                </label>
                <div className="relative">
                  <input
                    id="to"
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 glow-input"
                    required
                  />
                  {to && (
                    <button
                      type="button"
                      onClick={() => setTo('')}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Email Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject line..."
                  className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 glow-input"
                />
              </div>

              <div>
                <label htmlFor="text" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Message Body
                </label>
                <textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your professional email message here..."
                  rows={8}
                  className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 glow-input resize-y font-sans"
                  required
                />
              </div>

              {/* Status Display */}
              {status === 'sending' && (
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/50 flex items-center space-x-3 text-purple-300">
                  <svg className="animate-spin h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">Encrypting and routing via monkeykokkikumar@gmail.com...</span>
                </div>
              )}

              {status === 'success' && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 flex items-center space-x-3 text-emerald-300">
                  <span className="text-xl">✓</span>
                  <span className="text-sm font-medium">Email dispatched successfully! Recipient will receive it in professional layout.</span>
                </div>
              )}

              {status === 'error' && (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/50 flex flex-col text-rose-300">
                  <span className="text-sm font-semibold flex items-center">
                    <span className="text-xl mr-2">✕</span> Send Action Failed
                  </span>
                  <span className="text-xs text-rose-400 mt-1">{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className={`w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold rounded-xl transition duration-200 shadow-lg shadow-purple-600/10 active:scale-[0.99] flex items-center justify-center space-x-2 ${
                  status === 'sending' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <span>Dispatch Professional Email</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                This is a live mockup showing how your email will be compiled into the professional HTML template.
              </p>
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 p-2">
                <iframe
                  srcDoc={getPreviewHTML()}
                  title="Email Template Live Preview"
                  className="w-full h-[450px] bg-white rounded-lg"
                />
              </div>
            </div>
          )}
        </section>

        {/* Shared Secure Board */}
        <section className="lg:col-span-2 glass-panel rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-600 rounded-full blur-3xl opacity-10"></div>
          
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                🔒 Shared Secure Board
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Whatever is written here is securely shared with anyone who has the access passcode.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <textarea
              value={boardText}
              onChange={(e) => setBoardText(e.target.value)}
              placeholder="Type private notes, credentials, or secret messages here to share securely with your friend..."
              rows={6}
              className="w-full px-4 py-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-white placeholder-zinc-750 glow-input resize-y font-mono text-sm leading-relaxed"
            />

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="text-xs text-zinc-500 font-medium">
                {boardUpdatedAt ? (
                  <span>Last updated: <span className="text-zinc-400">{new Date(boardUpdatedAt).toLocaleString()}</span></span>
                ) : (
                  <span>No message saved yet.</span>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleClearBoard}
                  disabled={!boardText.trim()}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border transition duration-200 bg-rose-950/40 text-rose-300 border-rose-900/50 hover:bg-rose-900/60 active:scale-[0.98] ${!boardText.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  🗑️ Clear Board
                </button>
                
                <button
                  type="button"
                  onClick={handleCopyBoard}
                  disabled={!boardText.trim()}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg border transition duration-200 ${
                    copiedBoard 
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50' 
                      : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 active:scale-[0.98]'
                  } ${!boardText.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {copiedBoard ? '✓ Copied' : '📋 Copy Text'}
                </button>
                
                <button
                  type="button"
                  onClick={handleSaveBoard}
                  disabled={boardSaveStatus === 'saving'}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition duration-200 flex items-center space-x-2 active:scale-[0.98] ${
                    boardSaveStatus === 'saving' 
                      ? 'bg-purple-650/50 text-white cursor-not-allowed' 
                      : boardSaveStatus === 'saved'
                      ? 'bg-emerald-600 text-white shadow shadow-emerald-600/10'
                      : boardSaveStatus === 'error'
                      ? 'bg-rose-600 text-white'
                      : 'bg-purple-650 hover:bg-purple-750 text-white shadow shadow-purple-600/10'
                   }`}
                >
                  <span>
                    {boardSaveStatus === 'saving' ? 'Saving...' : boardSaveStatus === 'saved' ? '✓ Saved' : boardSaveStatus === 'error' ? '✕ Failed' : '💾 Save Board'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Contacts and Logs */}
        <div className="space-y-6">
          
          {/* Quick Contacts */}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center">
                👤 Quick Recipient List
              </h3>
              <button
                onClick={() => setShowAddContact(!showAddContact)}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
              >
                {showAddContact ? 'Cancel' : '+ Add New'}
              </button>
            </div>

            {showAddContact && (
              <form onSubmit={handleAddContact} className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-850 space-y-3">
                <input
                  type="text"
                  placeholder="Contact Name (e.g. Boss)"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                  required
                />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-purple-650 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg"
                >
                  Save Recipient
                </button>
              </form>
            )}

            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {contacts.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No recipients saved yet.</p>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex justify-between items-center p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-purple-900/40 hover:bg-purple-950/5 transition cursor-pointer"
                    onClick={() => setTo(contact.email)}
                  >
                    <div className="overflow-hidden mr-2">
                      <div className="text-xs font-bold text-white truncate">{contact.name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate">{contact.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteContact(contact.id);
                      }}
                      className="text-zinc-500 hover:text-rose-400 p-1 text-xs"
                      title="Delete contact"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Session Logs (Privacy First) */}
          <section className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-3 gap-2">
              <h3 className="text-base font-bold text-white flex items-center">
                📋 Sent Logs
              </h3>
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex bg-zinc-950 p-0.5 rounded border border-zinc-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setTimezoneChoice('local')}
                    className={`px-1.5 py-0.5 rounded ${timezoneChoice === 'local' ? 'bg-purple-650 text-white font-semibold' : 'text-zinc-500 hover:text-zinc-350'}`}
                  >
                    Local
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimezoneChoice('ist')}
                    className={`px-1.5 py-0.5 rounded ${timezoneChoice === 'ist' ? 'bg-purple-650 text-white font-semibold' : 'text-zinc-500 hover:text-zinc-305'}`}
                  >
                    IST
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimezoneChoice('utc')}
                    className={`px-1.5 py-0.5 rounded ${timezoneChoice === 'utc' ? 'bg-purple-650 text-white font-semibold' : 'text-zinc-500 hover:text-zinc-305'}`}
                  >
                    UTC
                  </button>
                </div>
                {sentLogs.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {sentLogs.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No records found.</p>
              ) : (
                sentLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <div
                      key={log.id}
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className={`p-3 rounded-lg border transition text-left cursor-pointer ${
                        isExpanded
                          ? 'bg-zinc-900/80 border-purple-900/60 shadow-lg shadow-purple-950/10'
                          : 'bg-zinc-900/30 border-zinc-850 hover:bg-zinc-900/50 hover:border-zinc-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-purple-400 font-semibold truncate max-w-[140px]">
                          To: {log.to}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono" title={new Date(log.date).toLocaleString()}>
                          {formatLogDate(log.date)}
                        </span>
                      </div>
                      <p className={`text-xs font-medium text-white mt-1 ${isExpanded ? '' : 'truncate'}`}>
                        {log.subject}
                      </p>
                      
                      {isExpanded && (
                        <div 
                          className="mt-3 pt-3 border-t border-zinc-850 space-y-3 cursor-default"
                          onClick={(e) => e.stopPropagation()} // Prevent collapse when clicking details
                        >
                          <div className="text-[11px] text-zinc-400 whitespace-pre-wrap bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-900 max-h-40 overflow-y-auto font-sans leading-relaxed">
                            {log.text || <span className="text-zinc-650 italic">(No message content saved)</span>}
                          </div>
                          
                          {log.text && (
                            <button
                              type="button"
                              onClick={() => handleCopyLogText(log.text, log.id)}
                              className={`w-full py-1.5 text-[10px] font-semibold rounded transition duration-150 ${
                                copiedLogId === log.id
                                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/50'
                                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800'
                              }`}
                            >
                              {copiedLogId === log.id ? '✓ Message Copied' : '📋 Copy Message'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <p className="text-[9px] text-zinc-500 text-center leading-normal">
              🛡️ Privacy Note: Sent logs are saved securely in your connected database.
            </p>
          </section>

        </div>

      </div>

    </div>
  );
}
