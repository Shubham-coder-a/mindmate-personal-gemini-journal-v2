import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { JournalView } from './components/JournalView';
import { ReflectionView } from './components/ReflectionView';
import { ChatView } from './components/ChatView';
import {
  JournalEntry,
  ReflectionSummary,
  Conversation,
  NavigationTab
} from './types';
import {
  subscribeJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  subscribeConversations,
  saveConversation,
  deleteConversation,
  subscribeReflections,
  saveReflectionSummary,
  deleteReflectionSummary,
} from './services/firestore';
import { getAuthHeader } from './lib/firebase';
import { Feather, CheckCircle2, AlertCircle } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');

  // Firestore Real-time Data
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [reflections, setReflections] = useState<ReflectionSummary[]>([]);

  // UI Interactive States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [pinnedEntryForChat, setPinnedEntryForChat] = useState<JournalEntry | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isReflecting, setIsReflecting] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Subscribe to Firestore collections isolated under users/{uid}
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setConversations([]);
      setReflections([]);
      return;
    }

    const unsubEntries = subscribeJournalEntries(user.uid, (data) => {
      setEntries(data);
    });

    const unsubConvos = subscribeConversations(user.uid, (data) => {
      setConversations(data);
    });

    const unsubReflections = subscribeReflections(user.uid, (data) => {
      setReflections(data);
    });

    return () => {
      unsubEntries();
      unsubConvos();
      unsubReflections();
    };
  }, [user]);

  // Handle Journal CRUD
  const handleCreateEntry = async (
    entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!user) return;
    try {
      await createJournalEntry(user.uid, entry);
      showToast('Journal entry saved securely in your private vault.');
    } catch (err: any) {
      showToast(err.message || 'Failed to save entry', 'error');
      throw err;
    }
  };

  const handleUpdateEntry = async (id: string, updates: Partial<JournalEntry>) => {
    if (!user) return;
    try {
      await updateJournalEntry(user.uid, id, updates);
      showToast('Journal entry updated successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to update entry', 'error');
      throw err;
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!user) return;
    try {
      await deleteJournalEntry(user.uid, id);
      showToast('Journal entry removed.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete entry', 'error');
      throw err;
    }
  };

  // Handle Conversations CRUD
  const handleSaveConversation = async (convo: {
    id?: string;
    title: string;
    messages: Conversation['messages'];
    relatedEntryId?: string;
  }) => {
    if (!user) return '';
    return await saveConversation(user.uid, convo);
  };

  const handleDeleteConversation = async (convoId: string) => {
    if (!user) return;
    try {
      await deleteConversation(user.uid, convoId);
      showToast('Conversation deleted.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete conversation', 'error');
    }
  };

  // Handle Mood & Reflection Summary Generation
  const handleGenerateReflection = async () => {
    if (!user) return;
    if (entries.length === 0) {
      showToast('Please write at least one journal entry first.', 'error');
      return;
    }

    try {
      setIsReflecting(true);
      const recentToAnalyze = entries.slice(0, 10);
      const headers = await getAuthHeader();

      const res = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          entries: recentToAnalyze.map((e) => ({
            title: e.title,
            content: e.content,
            mood: e.mood,
            createdAt: e.createdAt,
          })),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const summary = await res.json();

      // Persist to user's isolated reflections collection
      await saveReflectionSummary(user.uid, {
        detectedMood: summary.detectedMood || 'Reflective',
        moodScore: summary.moodScore ?? 7,
        moodColor: summary.moodColor || '#059669',
        keyThemes: summary.keyThemes || [],
        positiveHighlights: summary.positiveHighlights || [],
        areasOfConcern: summary.areasOfConcern || [],
        shortReflection: summary.shortReflection || '',
        mindfulPrompt: summary.mindfulPrompt || '',
        entryCountAnalyzed: summary.entryCountAnalyzed || recentToAnalyze.length,
      });

      showToast('New Mood & Reflection Summary generated with Gemini!');
      setCurrentTab('reflect');
    } catch (err: any) {
      console.error('Reflection error:', err);
      showToast(err.message || 'Failed to generate reflection summary.', 'error');
    } finally {
      setIsReflecting(false);
    }
  };

  const handleDeleteReflection = async (id: string) => {
    if (!user) return;
    try {
      await deleteReflectionSummary(user.uid, id);
      showToast('Reflection record removed.');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete reflection record', 'error');
    }
  };

  // Cross-component actions
  const handleChatAboutEntry = (entry: JournalEntry) => {
    setPinnedEntryForChat(entry);
    setCurrentTab('chat');
  };

  const handleSelectPromptToWrite = (prompt: string) => {
    setEditingEntry(null);
    setIsEditorOpen(true);
    setCurrentTab('journal');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md animate-pulse">
          <Feather className="w-7 h-7" />
        </div>
        <p className="font-serif text-lg font-medium text-stone-800">
          Entering MindMate Sanctuary...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-100 via-stone-50 to-stone-100 text-stone-900 font-sans flex flex-col selection:bg-emerald-200 selection:text-emerald-900">
      
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        entryCount={entries.length}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl bg-stone-900 text-white text-xs font-medium border border-stone-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {!user ? (
          <AuthModal />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                user={user}
                entries={entries}
                reflections={reflections}
                conversations={conversations}
                onNavigate={setCurrentTab}
                onOpenNewEntry={() => {
                  setEditingEntry(null);
                  setIsEditorOpen(true);
                  setCurrentTab('journal');
                }}
                onSelectEntry={(entry) => {
                  setEditingEntry(entry);
                  setIsEditorOpen(true);
                  setCurrentTab('journal');
                }}
                onChatAboutEntry={handleChatAboutEntry}
                onGenerateReflection={handleGenerateReflection}
                isReflecting={isReflecting}
              />
            )}

            {currentTab === 'journal' && (
              <JournalView
                entries={entries}
                onCreateEntry={handleCreateEntry}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
                onChatAboutEntry={handleChatAboutEntry}
                isEditorOpen={isEditorOpen}
                setIsEditorOpen={setIsEditorOpen}
                editingEntry={editingEntry}
                setEditingEntry={setEditingEntry}
              />
            )}

            {currentTab === 'reflect' && (
              <ReflectionView
                entries={entries}
                reflections={reflections}
                onGenerateReflection={handleGenerateReflection}
                isReflecting={isReflecting}
                onSelectPromptToWrite={handleSelectPromptToWrite}
                onDeleteReflection={handleDeleteReflection}
              />
            )}

            {currentTab === 'chat' && (
              <ChatView
                user={user}
                conversations={conversations}
                entries={entries}
                activeConversation={activeConversation}
                setActiveConversation={setActiveConversation}
                onSaveConversation={handleSaveConversation}
                onDeleteConversation={handleDeleteConversation}
                pinnedEntry={pinnedEntryForChat}
                setPinnedEntry={setPinnedEntryForChat}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-serif">MindMate – Personal Gemini Journal</p>
          <p className="text-[11px] text-stone-600">
            Powered by Google Cloud Firestore, Firebase Auth, and server-side Gemini 3.8 Flash.
          </p>
        </div>
      </footer>

    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
