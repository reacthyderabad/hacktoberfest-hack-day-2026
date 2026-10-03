import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Sparkles, CornerDownLeft, HelpCircle } from 'lucide-react';

export default function AIChatDrawer({
  isOpen,
  onClose,
  issue,
  repository,
  contextFiles = []
}) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm your open-source mentor for issue #${issue?.number || ''}. I've loaded the repository structure and relevant files into context. Ask me anything about how the code works, where to start, or what to test!`
    }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const samplePrompts = [
    `Why is ${contextFiles[0]?.path || 'this file'} relevant?`,
    'What should I test first for this issue?',
    'Which concept should I learn before coding?',
    'What are the common pitfalls for this kind of change?'
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query || !query.trim() || isSending) return;

    const userMsg = { role: 'user', content: query.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query.trim(),
          history: messages,
          issue,
          repository,
          contextFiles
        })
      });
      const data = await res.json();

      if (data.success && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Sorry, I had trouble analyzing that query with the current repository context.'
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error connecting to AI chat service: ${err.message}`
      }]);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0d1117] border-l border-slate-800 shadow-2xl flex flex-col animate-slideLeft">
      {/* Drawer Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Ask About This Issue</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Context-Aware
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Grounded in {repository?.name} code & discussion
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notice Banner */}
      <div className="px-4 py-2 bg-emerald-950/20 border-b border-emerald-500/20 text-[10px] text-emerald-300 flex items-center space-x-1.5">
        <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
        <span>AI answers are based on the repository context loaded for this issue.</span>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-2.5 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white font-medium rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none whitespace-pre-line'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
        {isSending && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs pl-8">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
            <span>Consulting repository files...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Suggestions */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/60 overflow-x-auto">
        <p className="text-[10px] text-slate-400 mb-1.5 font-medium">Quick questions:</p>
        <div className="flex items-center gap-1.5 pb-1">
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={isSending}
              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-emerald-300 whitespace-nowrap cursor-pointer transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3 bg-slate-900 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            placeholder="Ask about this issue or file..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
