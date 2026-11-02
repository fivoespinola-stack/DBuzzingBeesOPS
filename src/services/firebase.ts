import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocFromServer,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, Cleaner, StaffUser, CompanySettings, ConfirmationLog } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore with custom database ID
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection verification helper (per Firebase Integration Skill)
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
    return false;
  }
}

// Collections
const TASKS_COLLECTION = 'tasks';
const CONFIRMATION_LOGS_COLLECTION = 'confirmation_logs';
const CLEANERS_COLLECTION = 'cleaners';
const STAFF_COLLECTION = 'staff_users';
const SETTINGS_COLLECTION = 'settings';

// ==========================================
// TASKS (Real-time & Persistent Cloud CRUD)
// ==========================================

export function subscribeToTasks(
  onData: (tasks: Task[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, TASKS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Task[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as Task);
      });
      onData(items);
    },
    (err) => {
      console.error('Firestore tasks snapshot error:', err);
      onError?.(err);
    }
  );
}

export async function fetchTasksFromFirestore(): Promise<Task[]> {
  try {
    const colRef = collection(db, TASKS_COLLECTION);
    const snap = await getDocs(colRef);
    const items: Task[] = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as Task);
    });
    return items;
  } catch (err) {
    console.error('Error fetching tasks from Firestore:', err);
    return [];
  }
}

export async function saveTaskToFirestore(task: Task): Promise<void> {
  try {
    const docRef = doc(db, TASKS_COLLECTION, task.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(task)), { merge: true });
  } catch (err) {
    console.error(`Error saving task ${task.id} to Firestore:`, err);
    throw err;
  }
}

export async function saveTasksBatchToFirestore(tasks: Task[]): Promise<void> {
  if (tasks.length === 0) return;
  try {
    // Process in batches of 450 (Firestore limit is 500)
    const chunkSize = 450;
    for (let i = 0; i < tasks.length; i += chunkSize) {
      const chunk = tasks.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((t) => {
        const ref = doc(db, TASKS_COLLECTION, t.id);
        batch.set(ref, JSON.parse(JSON.stringify(t)), { merge: true });
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('Error batch saving tasks to Firestore:', err);
    throw err;
  }
}

export async function deleteTaskFromFirestore(taskId: string): Promise<void> {
  try {
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Error deleting task ${taskId} from Firestore:`, err);
    throw err;
  }
}

export async function clearAllTasksInFirestore(): Promise<void> {
  try {
    const colRef = collection(db, TASKS_COLLECTION);
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error clearing tasks in Firestore:', err);
    throw err;
  }
}

// ==========================================
// CLEANERS (Real-time & Persistent Cloud CRUD)
// ==========================================

export function subscribeToCleaners(
  onData: (cleaners: Cleaner[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, CLEANERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Cleaner[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as Cleaner);
      });
      onData(items);
    },
    (err) => {
      console.error('Firestore cleaners snapshot error:', err);
      onError?.(err);
    }
  );
}

export async function fetchCleanersFromFirestore(): Promise<Cleaner[]> {
  try {
    const colRef = collection(db, CLEANERS_COLLECTION);
    const snap = await getDocs(colRef);
    const items: Cleaner[] = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as Cleaner);
    });
    return items;
  } catch (err) {
    console.error('Error fetching cleaners from Firestore:', err);
    return [];
  }
}

export async function saveCleanerToFirestore(cleaner: Cleaner): Promise<void> {
  try {
    const docRef = doc(db, CLEANERS_COLLECTION, cleaner.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(cleaner)), { merge: true });
  } catch (err) {
    console.error(`Error saving cleaner ${cleaner.id} to Firestore:`, err);
    throw err;
  }
}

export async function deleteCleanerFromFirestore(cleanerId: string): Promise<void> {
  try {
    const docRef = doc(db, CLEANERS_COLLECTION, cleanerId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Error deleting cleaner ${cleanerId} from Firestore:`, err);
    throw err;
  }
}

export async function clearAllCleanersInFirestore(): Promise<void> {
  try {
    const colRef = collection(db, CLEANERS_COLLECTION);
    const snap = await getDocs(colRef);
    const batch = writeBatch(db);
    snap.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error clearing cleaners in Firestore:', err);
    throw err;
  }
}

// ==========================================
// SETTINGS
// ==========================================

export async function fetchSettingsFromFirestore(): Promise<CompanySettings | null> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'company_settings');
    const snap = await getDocs(collection(db, SETTINGS_COLLECTION));
    let found: CompanySettings | null = null;
    snap.forEach((d) => {
      if (d.id === 'company_settings') {
        found = d.data() as CompanySettings;
      }
    });
    return found;
  } catch (err) {
    console.error('Error loading settings from Firestore:', err);
    return null;
  }
}

export async function saveSettingsToFirestore(settings: CompanySettings): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'company_settings');
    await setDoc(docRef, JSON.parse(JSON.stringify(settings)), { merge: true });
  } catch (err) {
    console.error('Error saving settings to Firestore:', err);
  }
}

// ==========================================
// STAFF USERS
// ==========================================

export async function fetchStaffUsersFromFirestore(): Promise<StaffUser[]> {
  try {
    const colRef = collection(db, STAFF_COLLECTION);
    const snap = await getDocs(colRef);
    const items: StaffUser[] = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as StaffUser);
    });
    return items;
  } catch (err) {
    console.error('Error fetching staff users from Firestore:', err);
    return [];
  }
}

export async function saveStaffUserToFirestore(user: StaffUser): Promise<void> {
  try {
    const docRef = doc(db, STAFF_COLLECTION, user.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(user)), { merge: true });
  } catch (err) {
    console.error(`Error saving staff user ${user.id} to Firestore:`, err);
  }
}

// ==========================================
// CONFIRMATION LOGS (Cloud Audit & History)
// ==========================================

export async function saveConfirmationLogToFirestore(log: ConfirmationLog): Promise<void> {
  try {
    const docRef = doc(db, CONFIRMATION_LOGS_COLLECTION, log.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(log)), { merge: true });
  } catch (err) {
    console.error(`Error saving confirmation log ${log.id} to Firestore:`, err);
  }
}

export async function fetchConfirmationLogsFromFirestore(): Promise<ConfirmationLog[]> {
  try {
    const colRef = collection(db, CONFIRMATION_LOGS_COLLECTION);
    const snap = await getDocs(colRef);
    const items: ConfirmationLog[] = [];
    snap.forEach((d) => {
      items.push({ id: d.id, ...d.data() } as ConfirmationLog);
    });
    // Sort descending by timestamp
    return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (err) {
    console.error('Error fetching confirmation logs from Firestore:', err);
    return [];
  }
}

export function subscribeToConfirmationLogs(
  onData: (logs: ConfirmationLog[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const colRef = collection(db, CONFIRMATION_LOGS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ConfirmationLog[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as ConfirmationLog);
      });
      items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      onData(items);
    },
    (err) => {
      console.error('Firestore confirmation logs snapshot error:', err);
      onError?.(err);
    }
  );
}

