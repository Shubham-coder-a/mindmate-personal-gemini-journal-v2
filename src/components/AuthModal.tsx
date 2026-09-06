import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Feather, Shield, Sparkles, Lock, AlertCircle, RefreshCw } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { signInWithGoogle, error, clearError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setLocalError(null);
      clearError();
      await signInWithGoogle();
    } catch (err: any) {
      setLocalError(err.message || 'Unable to complete Google sign-in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        
        {/* Main Card */}
        <div id="auth-welcome-card" className="bg-white rounded-3xl border border-stone-200/80 p-8 shadow-xl shadow-stone-200/50 relative overflow-hidden">
          
          {/* Subtle serene top accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700" />
          
          {/* Brand header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 mb-4">
              <Feather className="w-7 h-7" />
            </div>
            
            <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
              MindMate
            </h1>
            <p className="text-sm text-emerald-800 font-medium mt-1">
              Personal Gemini Journal & Reflection Sanctuary
            </p>
            <p className="text-sm text-stone-600 mt-2 max-w-xs leading-relaxed">
              Sign in with your Google account to access your private journal entries, multi-turn Gemini reflections, and personalized mood summaries.
            </p>
          </div>

          {/* Privacy & Cloud Architecture Highlights */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 mb-6 space-y-2.5">
            <div className="flex items-start gap-2.5 text-xs text-stone-600">
              <Shield className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <span>
                <strong className="text-stone-900 font-semibold">100% UID-Isolated Storage:</strong> Your private entries and conversations are scoped under <code className="bg-stone-200/70 px-1 py-0.5 rounded text-[11px]">users/&#123;uid&#125;</code> in Cloud Firestore.
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-stone-600">
              <Sparkles className="w-4 h-4 text-teal-700 mt-0.5 shrink-0" />
              <span>
                <strong className="text-stone-900 font-semibold">Server-Side Gemini 3.8 Flash:</strong> AI inferences occur on the backend; your API key is never exposed to the browser.
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-stone-600">
              <Lock className="w-4 h-4 text-stone-700 mt-0.5 shrink-0" />
              <span>
                <strong className="text-stone-900 font-semibold">Zero-Trust Rules:</strong> Authenticated users can only read, write, and delete their own documents.
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {displayError && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 leading-relaxed">{displayError}</div>
            </div>
          )}

          {/* Authentication Action */}
          <div className="space-y-3">
            <button
              id="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm transition-all duration-150 shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isSigningIn ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                /* Google Colored 'G' Icon */
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isSigningIn ? 'Opening Google Sign-In...' : 'Sign in with Google'}</span>
            </button>
          </div>

          {/* Footer note */}
          <p className="text-[11px] text-center text-stone-500 mt-6">
            Authentication is required to unlock your private cloud journal. Your credentials and documents are safeguarded by Google Cloud.
          </p>
        </div>

      </div>
    </div>
  );
};
