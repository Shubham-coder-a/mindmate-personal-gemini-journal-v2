import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { getAuthHeader } from '../lib/firebase';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  Calendar,
  Sparkles,
  Tag,
  Smile,
  X,
  MessageSquareHeart,
  Check,
  AlertCircle
} from 'lucide-react';

interface JournalViewProps {
  entries: JournalEntry[];
  onCreateEntry: (entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onChatAboutEntry: (entry: JournalEntry) => void;
  isEditorOpen: boolean;
  setIsEditorOpen: (open: boolean) => void;
  editingEntry: JournalEntry | null;
  setEditingEntry: (entry: JournalEntry | null) => void;
}

const MOOD_OPTIONS = [
  { label: 'Grateful', emoji: '🌸', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { label: 'Peaceful', emoji: '🌿', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { label: 'Energized', emoji: '⚡', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { label: 'Contemplative', emoji: '🌊', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  { label: 'Hopeful', emoji: '🌅', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { label: 'Anxious', emoji: '🍃', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { label: 'Overwhelmed', emoji: '🌪️', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { label: 'Fatigued', emoji: '🌙', color: 'bg-stone-200 text-stone-700 border-stone-300' },
  { label: 'Inspired', emoji: '✨', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
];

export const JournalView: React.FC<JournalViewProps> = ({
  entries,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onChatAboutEntry,
  isEditorOpen,
  setIsEditorOpen,
  editingEntry,
  setEditingEntry,
}) => {
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('Contemplative');
  const [moodScore, setMoodScore] = useState(6);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Spark inspiration prompts state
  const [isSparksLoading, setIsSparksLoading] = useState(false);
  const [sparkPrompts, setSparkPrompts] = useState<string[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Viewing detail modal
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

  // Initialize or open editor
  const handleOpenCreate = () => {
    setEditingEntry(null);
    setTitle('');
    setContent('');
    setMood('Contemplative');
    setMoodScore(6);
    setTags([]);
    setErrorMsg(null);
    setSparkPrompts([]);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood || 'Contemplative');
    setMoodScore(entry.moodScore ?? 6);
    setTags(entry.tags || []);
    setErrorMsg(null);
    setSparkPrompts([]);
    setIsEditorOpen(true);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Fetch AI prompt sparks from server
  const handleFetchSparks = async () => {
    try {
      setIsSparksLoading(true);
      const headers = await getAuthHeader();
      const res = await fetch('/api/gemini/prompt-spark', {
        method: 'POST',
        headers,
        body: JSON.stringify({ recentMood: mood }),
      });
      const data = await res.json();
      if (data.prompts && Array.isArray(data.prompts)) {
        setSparkPrompts(data.prompts);
      }
    } catch (err) {
      console.error('Failed to get spark prompts:', err);
    } finally {
      setIsSparksLoading(false);
    }
  };

  const handleInsertPrompt = (promptText: string) => {
    setContent((prev) => {
      if (!prev.trim()) return `Prompt: ${promptText}\n\n`;
      return `${prev}\n\nPrompt: ${promptText}\n`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg('Please write something in your journal entry.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      if (editingEntry) {
        await onUpdateEntry(editingEntry.id, {
          title: title.trim() || 'Untitled Reflection',
          content: content.trim(),
          mood,
          moodScore,
          tags,
        });
      } else {
        await onCreateEntry({
          title: title.trim() || 'Untitled Reflection',
          content: content.trim(),
          mood,
          moodScore,
          tags,
        });
      }

      setIsEditorOpen(false);
      setEditingEntry(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return;
    try {
      await onDeleteEntry(entryToDelete.id);
      setEntryToDelete(null);
      if (viewingEntry?.id === entryToDelete.id) {
        setViewingEntry(null);
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  // Filter & sort logic
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMood = selectedMoodFilter === 'ALL' || entry.mood === selectedMoodFilter;

    return matchesSearch && matchesMood;
  });

  const sortedEntries = [...filteredEntries].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
            Personal Journal
          </h1>
          <p className="text-stone-700 text-sm mt-0.5">
            {entries.length} {entries.length === 1 ? 'reflection' : 'reflections'} stored securely in your private cloud vault.
          </p>
        </div>

        <button
          id="journal-write-new-btn"
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium shadow-sm hover:shadow transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Write New Entry</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reflections, keywords, or #tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-700 whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="text-xs py-2 px-3 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Mood filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-stone-100">
          <span className="text-xs text-stone-700 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Mood:
          </span>
          <button
            onClick={() => setSelectedMoodFilter('ALL')}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              selectedMoodFilter === 'ALL'
                ? 'bg-stone-900 text-white font-medium'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Moods
          </button>
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m.label}
              onClick={() => setSelectedMoodFilter(m.label)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                selectedMoodFilter === m.label
                  ? 'bg-emerald-800 text-white font-medium'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      {sortedEntries.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-stone-300 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="font-serif text-lg font-semibold text-stone-800">
            {searchQuery || selectedMoodFilter !== 'ALL'
              ? 'No matching journal entries found'
              : 'Your journal awaits your first reflection'}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
            {searchQuery || selectedMoodFilter !== 'ALL'
              ? 'Try adjusting your search query or mood filters to see other entries.'
              : 'Writing regular reflections helps you notice thoughts, clarify emotions, and cultivate clarity.'}
          </p>
          {(searchQuery || selectedMoodFilter !== 'ALL') ? (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedMoodFilter('ALL');
              }}
              className="text-xs text-emerald-800 font-medium hover:underline cursor-pointer"
            >
              Reset filters
            </button>
          ) : (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Write First Entry</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedEntries.map((entry) => {
            const moodMeta = MOOD_OPTIONS.find((m) => m.label === entry.mood);

            return (
              <div
                key={entry.id}
                id={`journal-entry-card-${entry.id}`}
                className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:shadow-sm hover:border-stone-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card top bar */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-stone-700">
                      <Calendar className="w-3.5 h-3.5 text-stone-600" />
                      <span>
                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {entry.mood && (
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 border ${
                          moodMeta?.color || 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        <span>{moodMeta?.emoji || '•'}</span>
                        <span>{entry.mood}</span>
                        {entry.moodScore && (
                          <span className="opacity-75 text-[10px]">({entry.moodScore}/10)</span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setViewingEntry(entry)}
                    className="font-serif text-lg font-semibold text-stone-900 hover:text-emerald-800 transition-colors cursor-pointer line-clamp-1"
                  >
                    {entry.title}
                  </h3>

                  {/* Snippet */}
                  <p
                    onClick={() => setViewingEntry(entry)}
                    className="text-stone-700 text-sm mt-2 line-clamp-3 leading-relaxed cursor-pointer font-light"
                  >
                    {entry.content}
                  </p>

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2">
                      {entry.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(entry)}
                      className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Entry"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEntryToDelete(entry)}
                      className="p-1.5 text-stone-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => onChatAboutEntry(entry)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <MessageSquareHeart className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Chat with Gemini</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal (Create / Edit) */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-2xl shadow-2xl p-6 sm:p-8 relative my-8">
            <button
              onClick={() => setIsEditorOpen(false)}
              className="absolute top-5 right-5 p-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                {editingEntry ? 'Edit Reflection' : 'New Journal Entry'}
              </span>
              <h2 className="font-serif text-2xl font-bold text-stone-900 mt-1">
                {editingEntry ? 'Revise your thoughts' : 'What is on your mind?'}
              </h2>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Entry Title</label>
                <input
                  type="text"
                  placeholder="e.g., An evening walk in stillness, Thoughts on career shifts..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                />
              </div>

              {/* Mood Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-stone-700">How are you feeling right now?</label>
                  <span className="text-xs text-stone-600">Intensity: {moodScore}/10</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                  {MOOD_OPTIONS.map((m) => {
                    const isSelected = mood === m.label;
                    return (
                      <button
                        key={m.label}
                        type="button"
                        onClick={() => setMood(m.label)}
                        className={`text-xs px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-stone-900 text-white border-stone-900 font-medium scale-105'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span>{m.emoji}</span>
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                <input
                  type="range"
                  min={1}
                  max={10}
                  value={moodScore}
                  onChange={(e) => setMoodScore(Number(e.target.value))}
                  className="w-full accent-emerald-700 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
                />
              </div>

              {/* Spark Prompts Assistant */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-stone-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Gemini Prompt Spark</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleFetchSparks}
                    disabled={isSparksLoading}
                    className="text-[11px] text-emerald-800 hover:text-emerald-900 font-medium cursor-pointer"
                  >
                    {isSparksLoading ? 'Generating inspiration...' : 'Get 3 reflective questions'}
                  </button>
                </div>

                {sparkPrompts.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {sparkPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleInsertPrompt(prompt)}
                        className="w-full text-left text-xs p-2 rounded-xl bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-stone-700 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <span className="line-clamp-1">{prompt}</span>
                        <span className="text-[10px] text-emerald-700 opacity-0 group-hover:opacity-100 font-medium shrink-0 ml-2">
                          + Insert
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Content Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-stone-700">Your Reflection & Thoughts</label>
                  <span className="text-[11px] text-stone-600">
                    {content.trim() ? `${content.trim().split(/\s+/).length} words` : '0 words'}
                  </span>
                </div>
                <textarea
                  rows={8}
                  required
                  placeholder="Write freely. Express what happened, how your body feels, thoughts that passed through your mind, or intentions you want to set..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-4 text-sm bg-stone-50 border border-stone-200 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 leading-relaxed"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Tags</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add tag (e.g. mindfulness, work, gratitude) and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 text-xs bg-stone-200 hover:bg-stone-300 rounded-xl font-medium text-stone-800 cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-rose-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs hover:shadow cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving to Cloud Vault...' : editingEntry ? 'Save Changes' : 'Save Entry'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* View Entry Detail Modal */}
      {viewingEntry && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-2xl shadow-2xl p-6 sm:p-8 relative my-8">
            <button
              onClick={() => setViewingEntry(null)}
              className="absolute top-5 right-5 p-2 text-stone-600 hover:text-stone-900 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs text-stone-700 mb-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>
                {new Date(viewingEntry.createdAt).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              {viewingEntry.mood && (
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                  {viewingEntry.mood}
                </span>
              )}
            </div>

            <h2 className="font-serif text-2xl font-bold text-stone-900 mb-4">
              {viewingEntry.title}
            </h2>

            <div className="prose prose-stone max-w-none text-stone-800 text-sm leading-relaxed whitespace-pre-line bg-stone-50/70 p-5 rounded-2xl border border-stone-100 mb-6">
              {viewingEntry.content}
            </div>

            {viewingEntry.tags && viewingEntry.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-6">
                {viewingEntry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded-md bg-stone-100 text-stone-700 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const entry = viewingEntry;
                    setViewingEntry(null);
                    handleOpenEdit(entry);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    const entry = viewingEntry;
                    setEntryToDelete(entry);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                onClick={() => {
                  const entry = viewingEntry;
                  setViewingEntry(null);
                  onChatAboutEntry(entry);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquareHeart className="w-3.5 h-3.5" />
                <span>Discuss with Gemini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-stone-900">Delete this journal entry?</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              "{entryToDelete.title}" will be permanently removed from your isolated Firestore vault. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg cursor-pointer"
              >
                Keep Entry
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
