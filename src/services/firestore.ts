import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { JournalEntry, Conversation, ReflectionSummary } from '../types';

// ==========================================
// 1. Journal Entries Service (Isolated by UID)
// Path: users/{uid}/journalEntries/{entryId}
// ==========================================

export function subscribeJournalEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (error: Error) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const entriesRef = collection(db, 'users', userId, 'journalEntries');
  const q = query(entriesRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        entries.push({
          id: docSnap.id,
          userId,
          title: data.title || 'Untitled Entry',
          content: data.content || '',
          mood: data.mood || 'Reflective',
          moodScore: data.moodScore ?? 5,
          tags: Array.isArray(data.tags) ? data.tags : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      onUpdate(entries);
    },
    (err) => {
      console.error('Error fetching journal entries from Firestore:', err);
      if (onError) onError(err);
    }
  );
}

export async function createJournalEntry(
  userId: string,
  entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!userId) throw new Error('Authentication required to create journal entry');

  const entriesRef = collection(db, 'users', userId, 'journalEntries');
  const newDocRef = doc(entriesRef);
  const now = new Date().toISOString();

  const payload = {
    title: entry.title.trim() || 'Untitled Reflection',
    content: entry.content.trim(),
    mood: entry.mood || 'Reflective',
    moodScore: entry.moodScore ?? 5,
    tags: entry.tags || [],
    createdAt: now,
    updatedAt: now,
    serverCreated: serverTimestamp(),
  };

  await setDoc(newDocRef, payload);
  return newDocRef.id;
}

export async function updateJournalEntry(
  userId: string,
  entryId: string,
  updates: Partial<Pick<JournalEntry, 'title' | 'content' | 'mood' | 'moodScore' | 'tags'>>
): Promise<void> {
  if (!userId || !entryId) throw new Error('User ID and Entry ID are required');

  const docRef = doc(db, 'users', userId, 'journalEntries', entryId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) throw new Error('User ID and Entry ID are required');
  const docRef = doc(db, 'users', userId, 'journalEntries', entryId);
  await deleteDoc(docRef);
}

// ==========================================
// 2. Chat Conversations Service (Isolated by UID)
// Path: users/{uid}/conversations/{convoId}
// ==========================================

export function subscribeConversations(
  userId: string,
  onUpdate: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const convosRef = collection(db, 'users', userId, 'conversations');
  const q = query(convosRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const convos: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        convos.push({
          id: docSnap.id,
          userId,
          title: data.title || 'Gemini Reflection Chat',
          messages: Array.isArray(data.messages) ? data.messages : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          relatedEntryId: data.relatedEntryId,
        });
      });
      onUpdate(convos);
    },
    (err) => {
      console.error('Error fetching conversations from Firestore:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveConversation(
  userId: string,
  convo: {
    id?: string;
    title: string;
    messages: Conversation['messages'];
    relatedEntryId?: string;
  }
): Promise<string> {
  if (!userId) throw new Error('Authentication required to save conversation');

  const convosRef = collection(db, 'users', userId, 'conversations');
  const convoDocRef = convo.id ? doc(convosRef, convo.id) : doc(convosRef);
  const now = new Date().toISOString();

  const payload = {
    title: convo.title.trim() || 'Gemini Reflection Chat',
    messages: convo.messages,
    updatedAt: now,
    ...(convo.id ? {} : { createdAt: now }),
    ...(convo.relatedEntryId ? { relatedEntryId: convo.relatedEntryId } : {}),
  };

  await setDoc(convoDocRef, payload, { merge: true });
  return convoDocRef.id;
}

export async function deleteConversation(userId: string, convoId: string): Promise<void> {
  if (!userId || !convoId) throw new Error('User ID and Conversation ID required');
  const docRef = doc(db, 'users', userId, 'conversations', convoId);
  await deleteDoc(docRef);
}

// ==========================================
// 3. Reflection Summaries Service (Isolated by UID)
// Path: users/{uid}/reflections/{reflectionId}
// ==========================================

export function subscribeReflections(
  userId: string,
  onUpdate: (reflections: ReflectionSummary[]) => void,
  onError?: (error: Error) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const reflRef = collection(db, 'users', userId, 'reflections');
  const q = query(reflRef, orderBy('createdAt', 'desc'), limit(20));

  return onSnapshot(
    q,
    (snapshot) => {
      const reflections: ReflectionSummary[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        reflections.push({
          id: docSnap.id,
          userId,
          detectedMood: data.detectedMood || 'Reflective',
          moodScore: data.moodScore ?? 7,
          moodColor: data.moodColor || '#0ea5e9',
          keyThemes: Array.isArray(data.keyThemes) ? data.keyThemes : [],
          positiveHighlights: Array.isArray(data.positiveHighlights) ? data.positiveHighlights : [],
          areasOfConcern: Array.isArray(data.areasOfConcern) ? data.areasOfConcern : [],
          shortReflection: data.shortReflection || '',
          mindfulPrompt: data.mindfulPrompt || '',
          entryCountAnalyzed: data.entryCountAnalyzed || 0,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      onUpdate(reflections);
    },
    (err) => {
      console.error('Error fetching reflections from Firestore:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveReflectionSummary(
  userId: string,
  summary: Omit<ReflectionSummary, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  if (!userId) throw new Error('Authentication required to save reflection');

  const reflRef = collection(db, 'users', userId, 'reflections');
  const newDocRef = doc(reflRef);
  const now = new Date().toISOString();

  const payload = {
    detectedMood: summary.detectedMood,
    moodScore: summary.moodScore,
    moodColor: summary.moodColor || '#059669',
    keyThemes: summary.keyThemes,
    positiveHighlights: summary.positiveHighlights,
    areasOfConcern: summary.areasOfConcern,
    shortReflection: summary.shortReflection,
    mindfulPrompt: summary.mindfulPrompt,
    entryCountAnalyzed: summary.entryCountAnalyzed,
    createdAt: now,
  };

  await setDoc(newDocRef, payload);
  return newDocRef.id;
}

export async function deleteReflectionSummary(userId: string, reflectionId: string): Promise<void> {
  if (!userId || !reflectionId) throw new Error('User ID and Reflection ID required');
  const docRef = doc(db, 'users', userId, 'reflections', reflectionId);
  await deleteDoc(docRef);
}
