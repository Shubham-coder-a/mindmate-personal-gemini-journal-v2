import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { Conversation, ChatMessage, JournalEntry } from '../types';
import { getAuthHeader } from '../lib/firebase';
import {
  MessageSquareHeart,
  Send,
  Sparkles,
  Plus,
  Trash2,
  BookOpen,
  Bot,
  User as UserIcon,
  CheckCircle2,
  Check,
  RotateCcw,
  Clock,
  Shield,
  Layers
} from 'lucide-react';

interface ChatViewProps {
  user: User;
  conversations: Conversation[];
  entries: JournalEntry[];
  activeConversation: Conversation | null;
  setActiveConversation: (convo: Conversation | null) => void;
  onSaveConversation: (convo: {
    id?: string;
    title: string;
    messages: ChatMessage[];
    relatedEntryId?: string;
  }) => Promise<string>;
  onDeleteConversation: (convoId: string) => Promise<void>;
  pinnedEntry: JournalEntry | null;
  setPinnedEntry: (entry: JournalEntry | null) => void;
}

const STARTER_PROMPTS = [
  'Help me reflect on my most recent journal entry.',
  'What recurring emotional patterns or themes do you notice in my thoughts?',
  'I feel a bit overwhelmed today. Can you guide me through a gentle perspective shift?',
  'Help me cultivate more gratitude for the small things in my life right now.',
];

export const ChatView: React.FC<ChatViewProps> = ({
  user,
  conversations,
  entries,
  activeConversation,
  setActiveConversation,
  onSaveConversation,
  onDeleteConversation,
  pinnedEntry,
  setPinnedEntry,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [includeJournalContext, setIncludeJournalContext] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with activeConversation
  useEffect(() => {
    if (activeConversation) {
      setMessages(activeConversation.messages || []);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  // If a pinned entry was passed from Journal or Dashboard, insert starter prompt
  useEffect(() => {
    if (pinnedEntry && messages.length === 0) {
      setInputText(`I'd like to discuss my recent journal entry titled "${pinnedEntry.title}". Can you help me reflect on what I wrote?`);
    }
  }, [pinnedEntry]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleStartNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
    setInputText('');
    setPinnedEntry(null);
    setErrorMsg(null);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');

    try {
      setIsLoading(true);

      // Context entries to supply Gemini
      const contextEntries = includeJournalContext
        ? (pinnedEntry ? [pinnedEntry, ...entries.filter(e => e.id !== pinnedEntry.id)] : entries).slice(0, 5)
        : [];

      const headers = await getAuthHeader();
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          contextEntries,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      const modelMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        content: data.reply || 'I am listening and reflecting with you.',
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, modelMsg];
      setMessages(finalMessages);

      // Save to Firestore under users/{uid}/conversations
      const title =
        activeConversation?.title ||
        (textToSend.length > 30 ? textToSend.substring(0, 30) + '...' : textToSend);

      const convoId = await onSaveConversation({
        id: activeConversation?.id,
        title,
        messages: finalMessages,
        relatedEntryId: pinnedEntry?.id,
      });

      if (!activeConversation) {
        setActiveConversation({
          id: convoId,
          userId: '',
          title,
          messages: finalMessages,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          relatedEntryId: pinnedEntry?.id,
        });
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(err.message || 'Unable to get response from Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[780px] bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
        
        {/* Sidebar: Conversation History */}
        <div className="hidden lg:flex flex-col border-r border-stone-200 bg-stone-50/70 p-4 justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="font-serif text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                <span>Conversations</span>
              </span>
              <button
                onClick={handleStartNewChat}
                className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                title="Start New Chat"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-[560px] pr-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-stone-600 p-2 italic text-center">
                  No previous conversations.
                </p>
              ) : (
                conversations.map((convo) => {
                  const isSelected = activeConversation?.id === convo.id;
                  return (
                    <div
                      key={convo.id}
                      onClick={() => setActiveConversation(convo)}
                      className={`group p-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-stone-900 text-white font-medium shadow-xs'
                          : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-200/60'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="truncate">{convo.title}</p>
                        <span
                          className={`text-[10px] ${
                            isSelected ? 'text-stone-300' : 'text-stone-600'
                          }`}
                        >
                          {new Date(convo.updatedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(convo.id);
                          if (activeConversation?.id === convo.id) {
                            handleStartNewChat();
                          }
                        }}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition-opacity ${
                          isSelected ? 'text-stone-300 hover:text-white' : 'text-stone-600 hover:text-rose-600'
                        }`}
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Privacy footer */}
          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-800 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Server-side Gemini 3.8 Flash • Isolated UID</span>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3 flex flex-col h-full bg-white">
          
          {/* Chat Header */}
          <div className="p-4 border-b border-stone-200 flex items-center justify-between flex-wrap gap-3 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 leading-tight">
                  Gemini Reflection Companion
                </h3>
                <p className="text-[11px] text-stone-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                  Attentive • Non-judgmental • Grounded
                </p>
              </div>
            </div>

            {/* Context Toggle & New Chat Button */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer select-none bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200">
                <input
                  type="checkbox"
                  checked={includeJournalContext}
                  onChange={(e) => setIncludeJournalContext(e.target.checked)}
                  className="rounded-sm text-emerald-700 focus:ring-emerald-600/30 w-3.5 h-3.5"
                />
                <span className="text-[11px]">Include journal context ({entries.length} entries)</span>
              </label>

              <button
                onClick={handleStartNewChat}
                className="lg:hidden px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium cursor-pointer"
              >
                New Chat
              </button>
            </div>
          </div>

          {/* Pinned Entry Banner (if discussing specific entry) */}
          {pinnedEntry && (
            <div className="bg-emerald-50/80 px-4 py-2 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 truncate pr-2">
                <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Discussing entry: <strong>"{pinnedEntry.title}"</strong> ({pinnedEntry.mood || 'Reflection'})</span>
              </div>
              <button
                onClick={() => setPinnedEntry(null)}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 underline shrink-0 cursor-pointer"
              >
                Clear attachment
              </button>
            </div>
          )}

          {/* Messages Scroll View */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-stone-50/40">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center">
                  <MessageSquareHeart className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-stone-800">
                    How can I support your thoughts today?
                  </h4>
                  <p className="text-xs text-stone-700 mt-1 leading-relaxed">
                    You can discuss your feelings, untangle an experience from your journal entries, or explore new perspectives.
                  </p>
                </div>

                {/* Starter Prompts */}
                <div className="w-full space-y-2 pt-2">
                  <span className="text-[11px] font-medium text-stone-600 uppercase tracking-wider">
                    Suggested Conversation Starters:
                  </span>
                  <div className="space-y-1.5">
                    {STARTER_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="w-full text-left text-xs p-3 rounded-2xl bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-stone-700 transition-colors shadow-2xs flex items-center justify-between group cursor-pointer"
                      >
                        <span>{prompt}</span>
                        <Send className="w-3 h-3 text-emerald-700 opacity-0 group-hover:opacity-100 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-stone-900 text-white rounded-tr-xs'
                          : 'bg-white text-stone-800 border border-stone-200/80 rounded-tl-xs whitespace-pre-line font-light'
                      }`}
                    >
                      {msg.content}
                      <div
                        className={`text-[10px] mt-1.5 text-right ${
                          isUser ? 'text-stone-300' : 'text-stone-600'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {isUser && (
                      user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-xl object-cover ring-1 ring-stone-300 shrink-0 mt-1"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-stone-800 text-white flex items-center justify-center font-medium text-xs shrink-0 mt-1 shadow-xs">
                          {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                        </div>
                      )
                    )}
                  </div>
                );
              })
            )}

            {/* Thinking indicator */}
            {isLoading && (
              <div className="flex items-start gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-xs p-4 text-xs text-stone-700 flex items-center gap-2 shadow-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>MindMate is reflecting on your thoughts...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-rose-600 hover:text-rose-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input Box */}
          <div className="p-3 sm:p-4 border-t border-stone-200 bg-white">
            <div className="flex items-end gap-2 bg-stone-50 border border-stone-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-emerald-600/30 focus-within:border-emerald-600 transition-all">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Share your thoughts with MindMate... (Press Enter to send)"
                className="flex-1 bg-transparent border-0 focus:outline-hidden p-2 text-sm text-stone-900 resize-none max-h-32 min-h-[40px]"
              />

              <button
                id="send-chat-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-40 transition-all shadow-xs shrink-0 cursor-pointer"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-stone-600 text-center mt-2">
              Gemini provides supportive reflections. For medical or mental health emergencies, please consult licensed healthcare providers.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
