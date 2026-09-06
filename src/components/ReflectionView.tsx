import React, { useState } from 'react';
import { JournalEntry, ReflectionSummary } from '../types';
import {
  Brain,
  Sparkles,
  Sun,
  AlertTriangle,
  Feather,
  Clock,
  Compass,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface ReflectionViewProps {
  entries: JournalEntry[];
  reflections: ReflectionSummary[];
  onGenerateReflection: () => Promise<void>;
  isReflecting: boolean;
  onSelectPromptToWrite: (prompt: string) => void;
  onDeleteReflection: (id: string) => Promise<void>;
}

export const ReflectionView: React.FC<ReflectionViewProps> = ({
  entries,
  reflections,
  onGenerateReflection,
  isReflecting,
  onSelectPromptToWrite,
  onDeleteReflection,
}) => {
  const [selectedReflectionIndex, setSelectedReflectionIndex] = useState<number>(0);

  const activeReflection =
    reflections.length > 0 && selectedReflectionIndex < reflections.length
      ? reflections[selectedReflectionIndex]
      : null;

  return (
    <div className="space-y-8 pb-12">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-1">
            <Brain className="w-4 h-4 text-emerald-700" />
            <span>AI Psychological Synthesis</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
            Mood & Reflection Summary
          </h1>
          <p className="text-stone-700 text-sm mt-1 max-w-xl">
            Gemini scans your recent entries to recognize emotional trends, uncover hidden strengths, and offer compassionate perspective.
          </p>
        </div>

        <button
          id="generate-reflection-btn"
          onClick={onGenerateReflection}
          disabled={isReflecting || entries.length === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className={`w-4 h-4 ${isReflecting ? 'animate-spin' : ''}`} />
          <span>{isReflecting ? 'Synthesizing with Gemini...' : 'Generate New Summary'}</span>
        </button>
      </div>

      {/* Loading state during reflection generation */}
      {isReflecting && (
        <div className="bg-white rounded-3xl border border-emerald-200 p-12 text-center shadow-md space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto animate-pulse">
            <Brain className="w-8 h-8" />
          </div>
          <h3 className="font-serif text-xl font-bold text-stone-900">
            Synthesizing your mindful reflections...
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            Gemini is reading through your private journal entries, detecting underlying emotional tones, mapping themes, and crafting a personalized synthesis.
          </p>
          <div className="w-48 h-1.5 bg-stone-100 rounded-full mx-auto overflow-hidden">
            <div className="w-full h-full bg-emerald-600 animate-indeterminate" />
          </div>
        </div>
      )}

      {/* When no reflections exist yet */}
      {!isReflecting && reflections.length === 0 && (
        <div className="bg-white rounded-3xl border border-dashed border-stone-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <Sparkles className="w-8 h-8 text-stone-400" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-800">
              No Reflection Summaries Yet
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1.5 leading-relaxed">
              {entries.length === 0
                ? 'Begin by writing at least one journal entry in the Journal tab. Once you have logged your reflections, Gemini will generate a full psychological overview.'
                : `You currently have ${entries.length} journal ${entries.length === 1 ? 'entry' : 'entries'}. Click "Generate New Summary" above to have Gemini produce your first synthesis.`}
            </p>
          </div>

          {entries.length > 0 && (
            <button
              onClick={onGenerateReflection}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate First Reflection</span>
            </button>
          )}
        </div>
      )}

      {/* Main Active Reflection Display */}
      {!isReflecting && activeReflection && (
        <div className="space-y-6">
          
          {/* History switcher selector if multiple reflections exist */}
          {reflections.length > 1 && (
            <div className="flex items-center justify-between gap-3 bg-stone-100/80 p-2.5 rounded-2xl border border-stone-200">
              <span className="text-xs font-medium text-stone-600 pl-2">Reflection Timeline:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {reflections.map((refl, idx) => (
                  <button
                    key={refl.id}
                    onClick={() => setSelectedReflectionIndex(idx)}
                    className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                      selectedReflectionIndex === idx
                        ? 'bg-stone-900 text-white font-medium shadow-xs'
                        : 'bg-white text-stone-700 hover:bg-stone-200/70 border border-stone-200'
                    }`}
                  >
                    {idx === 0 ? 'Latest • ' : ''}
                    {new Date(refl.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Core Overview Card */}
          <div className="bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-8 shadow-xs relative overflow-hidden">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Synthesized on{' '}
                    {new Date(activeReflection.createdAt).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span>• {activeReflection.entryCountAnalyzed} entries analyzed</span>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap mt-2">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    <span>Detected Mood: {activeReflection.detectedMood}</span>
                  </div>

                  <div className="px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-medium border border-stone-200">
                    Emotional Score: <strong className="text-emerald-700 font-bold">{activeReflection.moodScore}</strong> / 10
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDeleteReflection(activeReflection.id)}
                className="p-2 text-stone-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors self-end md:self-auto cursor-pointer"
                title="Delete this reflection record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Narrative Short Reflection */}
            <div className="pt-6 space-y-3">
              <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
                <Feather className="w-4 h-4 text-emerald-700" />
                <span>Synthesis & Perspective</span>
              </h3>
              <p className="text-stone-800 text-sm sm:text-base leading-relaxed whitespace-pre-line font-light">
                {activeReflection.shortReflection}
              </p>
            </div>

            {/* Key Themes Badges */}
            {activeReflection.keyThemes && activeReflection.keyThemes.length > 0 && (
              <div className="pt-6 mt-6 border-t border-stone-100">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2.5">
                  Key Identified Themes
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {activeReflection.keyThemes.map((theme, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 text-xs font-medium border border-stone-200"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Two Column Grid: Positive Highlights vs Areas of Concern */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Positive Highlights */}
            <div className="bg-emerald-50/50 rounded-3xl border border-emerald-100 p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-900">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold">Positive Highlights & Strengths</h3>
                  <p className="text-[11px] text-emerald-700">Wins, moments of gratitude, and inner resources</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {activeReflection.positiveHighlights?.length > 0 ? (
                  activeReflection.positiveHighlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white border border-emerald-100/80 text-xs text-stone-800 flex items-start gap-2.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{highlight}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-emerald-800 italic">No specific highlights extracted.</p>
                )}
              </div>
            </div>

            {/* Areas of Concern */}
            <div className="bg-stone-100/60 rounded-3xl border border-stone-200 p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-stone-900">
                <div className="w-8 h-8 rounded-xl bg-stone-200 flex items-center justify-center text-stone-700">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold">Areas of Concern & Gentle Focus</h3>
                  <p className="text-[11px] text-stone-700">Tensions, friction points, or feelings to nurture</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {activeReflection.areasOfConcern?.length > 0 ? (
                  activeReflection.areasOfConcern.map((concern, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white border border-stone-200 text-xs text-stone-800 flex items-start gap-2.5 shadow-xs"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{concern}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-600 italic">No high-concern friction points noted.</p>
                )}
              </div>
            </div>

          </div>

          {/* Mindful Forward Prompt */}
          {activeReflection.mindfulPrompt && (
            <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-xl">
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-300">
                  Mindful Inquiry for Your Next Entry
                </span>
                <p className="font-serif text-lg sm:text-xl italic text-emerald-50">
                  "{activeReflection.mindfulPrompt}"
                </p>
              </div>

              <button
                onClick={() => onSelectPromptToWrite(activeReflection.mindfulPrompt)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-stone-100 text-stone-900 text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span>Write with this Prompt</span>
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
