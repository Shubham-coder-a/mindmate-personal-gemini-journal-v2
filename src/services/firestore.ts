import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { JournalEntry, Conversation, ReflectionSummary } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

  const path = `users/${userId}/journalEntries`;
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
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (structuredError: any) {
        if (onError) onError(structuredError);
      }
    }
  );
}

export async function createJournalEntry(
  userId: string,
  entry: Omit<JournalEntry, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  if (!userId) throw new Error('Authentication required to create journal entry');

  const path = `users/${userId}/journalEntries`;
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

  try {
    await setDoc(newDocRef, payload);
    return newDocRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateJournalEntry(
  userId: string,
  entryId: string,
  updates: Partial<Pick<JournalEntry, 'title' | 'content' | 'mood' | 'moodScore' | 'tags'>>
): Promise<void> {
  if (!userId || !entryId) throw new Error('User ID and Entry ID are required');

  const path = `users/${userId}/journalEntries/${entryId}`;
  const docRef = doc(db, 'users', userId, 'journalEntries', entryId);
  try {
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) throw new Error('User ID and Entry ID are required');
  const path = `users/${userId}/journalEntries/${entryId}`;
  const docRef = doc(db, 'users', userId, 'journalEntries', entryId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
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

  const path = `users/${userId}/conversations`;
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
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (structuredError: any) {
        if (onError) onError(structuredError);
      }
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
  const path = `users/${userId}/conversations/${convoDocRef.id}`;
  const now = new Date().toISOString();

  const payload = {
    title: convo.title.trim() || 'Gemini Reflection Chat',
    messages: convo.messages,
    updatedAt: now,
    ...(convo.id ? {} : { createdAt: now }),
    ...(convo.relatedEntryId ? { relatedEntryId: convo.relatedEntryId } : {}),
  };

  try {
    await setDoc(convoDocRef, payload, { merge: true });
    return convoDocRef.id;
  } catch (err) {
    handleFirestoreError(err, convo.id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteConversation(userId: string, convoId: string): Promise<void> {
  if (!userId || !convoId) throw new Error('User ID and Conversation ID required');
  const path = `users/${userId}/conversations/${convoId}`;
  const docRef = doc(db, 'users', userId, 'conversations', convoId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
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

  const path = `users/${userId}/reflections`;
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
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (structuredError: any) {
        if (onError) onError(structuredError);
      }
    }
  );
}

export async function saveReflectionSummary(
  userId: string,
  summary: Omit<ReflectionSummary, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  if (!userId) throw new Error('Authentication required to save reflection');

  const path = `users/${userId}/reflections`;
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

  try {
    await setDoc(newDocRef, payload);
    return newDocRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteReflectionSummary(userId: string, reflectionId: string): Promise<void> {
  if (!userId || !reflectionId) throw new Error('User ID and Reflection ID required');
  const path = `users/${userId}/reflections/${reflectionId}`;
  const docRef = doc(db, 'users', userId, 'reflections', reflectionId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

