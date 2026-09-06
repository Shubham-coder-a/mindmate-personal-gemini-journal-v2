import React from 'react';
import { User } from 'firebase/auth';
import { JournalEntry, ReflectionSummary, Conversation, NavigationTab } from '../types';
import {
  BookOpen,
  Brain,
  MessageSquareHeart,
  PlusCircle,
  Sparkles,
  Calendar,
  Smile,
  ArrowRight,
  TrendingUp,
  Tag,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface DashboardViewProps {
  user: User;
  entries: JournalEntry[];
  reflections: ReflectionSummary[];
  conversations: Conversation[];
  onNavigate: (tab: NavigationTab) => void;
  onOpenNewEntry: () => void;
  onSelectEntry: (entry: JournalEntry) => void;
  onChatAboutEntry: (entry: JournalEntry) => void;
  onGenerateReflection: () => void;
  isReflecting: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  entries,
  reflections,
  conversations,
  onNavigate,
  onOpenNewEntry,
  onSelectEntry,
  onChatAboutEntry,
  onGenerateReflection,
  isReflecting,
}) => {
  const latestReflection = reflections.length > 0 ? reflections[0] : null;
  const recentEntries = entries.slice(0, 4);
  const recentConversations = conversations.slice(0, 3);

  // Compute stats
  const totalEntries = entries.length;
  const latestMood = entries.length > 0 && entries[0].mood ? entries[0].mood : 'Not set';

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Welcome & Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-stone-700 text-xs font-medium uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <span>{todayFormatted}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Welcome back, {user.displayName || user.email?.split('@')[0] || 'Friend'}
          </h1>
          <p className="text-stone-700 text-sm mt-1 max-w-xl">
            {user.email ? `Logged in as ${user.email}. ` : ''}Your journal entries and Gemini chats are stored privately under <code className="bg-stone-200/70 px-1 py-0.5 rounded text-[11px] font-mono text-emerald-800">users/{user.uid.substring(0, 8)}...</code>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            id="dashboard-new-entry-btn"
            onClick={onOpenNewEntry}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Journal Entry</span>
          </button>

          <button
            id="dashboard-start-chat-btn"
            onClick={() => onNavigate('chat')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <MessageSquareHeart className="w-4 h-4 text-emerald-400" />
            <span>Talk to Gemini</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-700">Journal Entries</span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">{totalEntries}</p>
          <p className="text-[11px] text-stone-700 mt-0.5">Isolated under your UID</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-700">Latest Logged Mood</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100/70 flex items-center justify-center text-emerald-800">
              <Smile className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-stone-900 mt-2 truncate">{latestMood}</p>
          <p className="text-[11px] text-stone-700 mt-0.5">From recent entry</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-700">Gemini Reflections</span>
            <div className="w-8 h-8 rounded-lg bg-teal-100/70 flex items-center justify-center text-teal-800">
              <Brain className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">{reflections.length}</p>
          <p className="text-[11px] text-stone-700 mt-0.5">Synthesized summaries</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-700">Active Conversations</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100/70 flex items-center justify-center text-indigo-800">
              <MessageSquareHeart className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 mt-2">{conversations.length}</p>
          <p className="text-[11px] text-stone-700 mt-0.5">Private multi-turn chats</p>
        </div>
      </div>

      {/* Latest AI Reflection Summary Hero */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Brain className="w-64 h-64 text-emerald-400" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-300">
                Latest Mood & Reflection Summary
              </h2>
            </div>

            {latestReflection && (
              <span className="text-xs text-stone-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(latestReflection.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          {latestReflection ? (
            <div className="space-y-4 max-w-3xl">
              {/* Mood Badge & Score */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 text-xs font-semibold">
                  Detected Mood: {latestReflection.detectedMood}
                </div>
                <div className="text-xs text-stone-300 bg-stone-800/80 px-2.5 py-1 rounded-full">
                  Mood Score: <strong className="text-white">{latestReflection.moodScore}/10</strong>
                </div>
                <div className="text-xs text-stone-400">
                  Based on {latestReflection.entryCountAnalyzed} journal {latestReflection.entryCountAnalyzed === 1 ? 'entry' : 'entries'}
                </div>
              </div>

              {/* Reflection Prose */}
              <p className="text-stone-200 text-sm sm:text-base leading-relaxed line-clamp-3 font-light">
                {latestReflection.shortReflection}
              </p>

              {/* Themes preview */}
              {latestReflection.keyThemes && latestReflection.keyThemes.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-xs text-stone-400">Key Themes:</span>
                  {latestReflection.keyThemes.slice(0, 4).map((theme, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700/60"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={() => onNavigate('reflect')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer group"
                >
                  <span>View Full Analysis & Breakdown</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={onGenerateReflection}
                  disabled={isReflecting || entries.length === 0}
                  className="text-xs text-stone-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isReflecting ? 'Analyzing...' : 'Refresh Summary'}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-3 max-w-xl">
              <p className="text-stone-300 text-sm leading-relaxed">
                {entries.length === 0
                  ? "Write your first journal entry to unlock Gemini's emotional mood analysis, key thematic highlights, and mindful reflections."
                  : `You have ${entries.length} journal ${entries.length === 1 ? 'entry' : 'entries'} logged. Let Gemini synthesize your thoughts into a holistic reflection.`}
              </p>

              <div className="pt-2">
                {entries.length === 0 ? (
                  <button
                    onClick={onOpenNewEntry}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Write First Entry</span>
                  </button>
                ) : (
                  <button
                    onClick={onGenerateReflection}
                    disabled={isReflecting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isReflecting ? 'Analyzing thoughts with Gemini...' : 'Generate Reflection Summary'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Grid: Recent Journal Entries & Conversations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Recent Journal Entries */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-800" />
              <h2 className="font-serif text-xl font-bold text-stone-900">Recent Journal Entries</h2>
            </div>

            <button
              onClick={() => onNavigate('journal')}
              className="text-xs font-medium text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              <span>View all ({totalEntries})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentEntries.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-800">Your journal is currently empty</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  Express how you feel today, record a gratitude, or untangle a challenge.
                </p>
              </div>
              <button
                onClick={onOpenNewEntry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create First Entry</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  id={`dashboard-entry-${entry.id}`}
                  className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] text-stone-700">
                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {entry.mood && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium">
                          {entry.mood}
                        </span>
                      )}
                    </div>

                    <h3
                      onClick={() => onSelectEntry(entry)}
                      className="font-serif text-base font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors cursor-pointer line-clamp-1"
                    >
                      {entry.title}
                    </h3>

                    <p className="text-stone-700 text-xs mt-1.5 line-clamp-3 leading-relaxed">
                      {entry.content}
                    </p>
                  </div>

                  <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={() => onSelectEntry(entry)}
                      className="text-xs text-stone-700 hover:text-stone-900 font-medium cursor-pointer"
                    >
                      Read & Edit
                    </button>

                    <button
                      onClick={() => onChatAboutEntry(entry)}
                      className="flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-900 font-medium cursor-pointer"
                      title="Discuss this entry with Gemini"
                    >
                      <MessageSquareHeart className="w-3.5 h-3.5" />
                      <span>Chat with Gemini</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Conversation Threads */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquareHeart className="w-5 h-5 text-teal-800" />
              <h2 className="font-serif text-xl font-bold text-stone-900">Conversations</h2>
            </div>

            <button
              onClick={() => onNavigate('chat')}
              className="text-xs font-medium text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Open Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs space-y-3">
            {recentConversations.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-stone-500">No previous conversations yet.</p>
                <button
                  onClick={() => onNavigate('chat')}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              recentConversations.map((convo) => (
                <div
                  key={convo.id}
                  onClick={() => onNavigate('chat')}
                  className="p-3 rounded-xl bg-stone-50 hover:bg-emerald-50/60 border border-stone-100 hover:border-emerald-200 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-stone-900 group-hover:text-emerald-800 truncate max-w-[170px]">
                      {convo.title}
                    </span>
                    <span className="text-[10px] text-stone-600">
                      {new Date(convo.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 line-clamp-1">
                    {convo.messages.length > 0
                      ? convo.messages[convo.messages.length - 1].content
                      : 'No messages yet'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
