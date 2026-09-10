/**
 * Storage & Quota Synchronization Engine for Dr. Roger POP
 * 
 * Provides:
 * 1. Automatic detection of Firestore quota exhaustion / network unreachability.
 * 2. Local-first caching layer so the application NEVER stops functioning.
 * 3. Offline and fallback persistence in LocalStorage / IndexedDB.
 * 4. Background queue for synchronizing pending writes when cloud quota is renewed.
 * 5. Event dispatching for UI banners and user notifications.
 */

export interface QuotaStatus {
  isExceeded: boolean;
  lastDetected: number | null;
  message: string | null;
  pendingSyncCount: number;
}

export interface PendingSyncItem {
  id: string;
  collectionName: 'drugstores' | 'pops' | 'declarations' | 'customForms' | 'counters';
  docId?: string;
  action: 'set' | 'update' | 'delete' | 'add';
  data?: any;
  timestamp: string;
}

const QUOTA_STATUS_EVENT = 'dr_roger_quota_status_change';
const PENDING_SYNC_STORAGE_KEY = 'dr_roger_pending_sync_queue';
const QUOTA_STATE_STORAGE_KEY = 'dr_roger_quota_state';

/**
 * Checks if an error thrown by Firebase/Firestore is related to quota exhaustion or service unavailability.
 */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const code = (error as any)?.code ? String((error as any).code).toLowerCase() : '';

  return (
    code.includes('resource-exhausted') ||
    code.includes('quota-exceeded') ||
    code.includes('unavailable') ||
    msg.includes('resource_exhausted') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('quota-exceeded') ||
    msg.includes('exceeded quota') ||
    msg.includes('429') ||
    msg.includes('too many requests') ||
    msg.includes('over quota') ||
    msg.includes('insufficient quota') ||
    msg.includes('deadline exceeded')
  );
}

/**
 * Dispatches an event when quota status changes.
 */
function notifyQuotaStatusChange() {
  if (typeof window !== 'undefined') {
    const status = getQuotaStatus();
    window.dispatchEvent(new CustomEvent(QUOTA_STATUS_EVENT, { detail: status }));
  }
}

/**
 * Gets current quota status.
 */
export function getQuotaStatus(): QuotaStatus {
  try {
    const raw = localStorage.getItem(QUOTA_STATE_STORAGE_KEY);
    const queue = getPendingSyncQueue();
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isExceeded: Boolean(parsed.isExceeded),
        lastDetected: parsed.lastDetected || null,
        message: parsed.message || null,
        pendingSyncCount: queue.length
      };
    }
    return {
      isExceeded: false,
      lastDetected: null,
      message: null,
      pendingSyncCount: queue.length
    };
  } catch {
    return { isExceeded: false, lastDetected: null, message: null, pendingSyncCount: 0 };
  }
}

/**
 * Reports that a quota error occurred and sets the system in Local Continuity mode.
 */
export function reportQuotaExceeded(error?: unknown, context?: string) {
  const errorMsg = error instanceof Error ? error.message : String(error || 'Cota do servidor temporariamente atingida');
  console.warn(`[Storage Engine] Cloud quota/availability threshold reached in "${context || 'operation'}". Local Continuity mode activated.`, error);

  try {
    const state = {
      isExceeded: true,
      lastDetected: Date.now(),
      message: errorMsg
    };
    localStorage.setItem(QUOTA_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving quota state to localStorage:', e);
  }

  notifyQuotaStatusChange();
}

/**
 * Clears the quota exceeded flag (e.g., after successful sync).
 */
export function clearQuotaExceeded() {
  try {
    localStorage.removeItem(QUOTA_STATE_STORAGE_KEY);
  } catch (e) {
    console.error('Error clearing quota state:', e);
  }
  notifyQuotaStatusChange();
}

/**
 * Subscribes to quota status updates.
 */
export function subscribeQuotaStatus(callback: (status: QuotaStatus) => void): () => void {
  const handler = () => callback(getQuotaStatus());
  window.addEventListener(QUOTA_STATUS_EVENT, handler);
  // Initial call
  callback(getQuotaStatus());
  return () => window.removeEventListener(QUOTA_STATUS_EVENT, handler);
}

// -----------------------------------------------------------------------------------
// PENDING SYNC QUEUE MANAGEMENT
// -----------------------------------------------------------------------------------

export function getPendingSyncQueue(): PendingSyncItem[] {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToPendingSyncQueue(item: Omit<PendingSyncItem, 'id' | 'timestamp'>) {
  try {
    const queue = getPendingSyncQueue();
    const newItem: PendingSyncItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    // Replace previous queued action on same doc if any
    const filtered = queue.filter(q => !(q.collectionName === item.collectionName && q.docId && q.docId === item.docId));
    filtered.push(newItem);

    localStorage.setItem(PENDING_SYNC_STORAGE_KEY, JSON.stringify(filtered));
    notifyQuotaStatusChange();
  } catch (e) {
    console.error('Error adding to sync queue:', e);
  }
}

export function removeFromPendingSyncQueue(id: string) {
  try {
    const queue = getPendingSyncQueue().filter(q => q.id !== id);
    localStorage.setItem(PENDING_SYNC_STORAGE_KEY, JSON.stringify(queue));
    notifyQuotaStatusChange();
  } catch (e) {
    console.error('Error removing from sync queue:', e);
  }
}

// -----------------------------------------------------------------------------------
// LOCAL-FIRST PERSISTENCE HELPERS
// -----------------------------------------------------------------------------------

const DRUGSTORE_STORAGE_KEY = 'dr_roger_drugstore_profile';
const POPS_STORAGE_KEY = 'dr_roger_local_pops';
const DECLARATIONS_STORAGE_KEY = 'dr_roger_local_declarations';
const CUSTOM_FORMS_STORAGE_KEY = 'dr_roger_local_custom_forms';

/**
 * Saves Drugstore profile to local storage cache.
 */
export function saveLocalDrugstore(data: any) {
  try {
    if (!data) return;
    localStorage.setItem(DRUGSTORE_STORAGE_KEY, JSON.stringify({
      ...data,
      _locallySavedAt: new Date().toISOString()
    }));
  } catch (e) {
    console.error('Error caching drugstore profile:', e);
  }
}

/**
 * Gets cached Drugstore profile.
 */
export function getLocalDrugstore(userId?: string): any | null {
  try {
    const raw = localStorage.getItem(DRUGSTORE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (userId && parsed.ownerId && parsed.ownerId !== userId && parsed.id !== userId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Saves a POP to local cache.
 */
export function saveLocalPop(pop: any) {
  try {
    if (!pop) return;
    const pops = getLocalPopsMap();
    const id = pop.id || `local_pop_${Date.now()}`;
    const cleanPop = { ...pop, id, _locallySavedAt: new Date().toISOString() };
    pops[id] = cleanPop;
    localStorage.setItem(POPS_STORAGE_KEY, JSON.stringify(pops));
    return cleanPop;
  } catch (e) {
    console.error('Error saving POP to local cache:', e);
    return pop;
  }
}

function getLocalPopsMap(): Record<string, any> {
  try {
    const raw = localStorage.getItem(POPS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Gets all locally saved POPs as an array.
 */
export function getLocalPops(drugstoreId?: string): any[] {
  try {
    const map = getLocalPopsMap();
    const list = Object.values(map);
    if (!drugstoreId) return list;
    return list.filter((p: any) => !p.drugstoreId || p.drugstoreId === drugstoreId || p.ownerId === drugstoreId);
  } catch {
    return [];
  }
}

/**
 * Gets a single POP by ID from local cache.
 */
export function getLocalPopById(id: string): any | null {
  try {
    const map = getLocalPopsMap();
    return map[id] || null;
  } catch {
    return null;
  }
}

/**
 * Deletes a POP from local cache.
 */
export function deleteLocalPop(id: string) {
  try {
    const map = getLocalPopsMap();
    delete map[id];
    localStorage.setItem(POPS_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Error deleting local POP:', e);
  }
}

/**
 * Saves a declaration to local storage.
 */
export function saveLocalDeclaration(declaration: any) {
  try {
    const list = getLocalDeclarations();
    const id = declaration.id || `dec_${Date.now()}`;
    const item = { ...declaration, id, _locallySavedAt: new Date().toISOString() };
    
    // Check if exists
    const index = list.findIndex(d => d.id === id || (d.sequenceNumber && d.sequenceNumber === item.sequenceNumber));
    if (index >= 0) {
      list[index] = item;
    } else {
      list.unshift(item);
    }

    // Keep max 100 recent local declarations
    const trimmed = list.slice(0, 100);
    localStorage.setItem(DECLARATIONS_STORAGE_KEY, JSON.stringify(trimmed));
    return item;
  } catch (e) {
    console.error('Error saving declaration locally:', e);
    return declaration;
  }
}

/**
 * Gets all locally saved declarations.
 */
export function getLocalDeclarations(drugstoreId?: string): any[] {
  try {
    const raw = localStorage.getItem(DECLARATIONS_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!drugstoreId) return list;
    return list.filter((d: any) => !d.drugstoreId || d.drugstoreId === drugstoreId);
  } catch {
    return [];
  }
}

/**
 * Saves a Custom Form to local cache.
 */
export function saveLocalCustomForm(form: any) {
  try {
    const raw = localStorage.getItem(CUSTOM_FORMS_STORAGE_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const id = form.id || `form_${Date.now()}`;
    const item = { ...form, id, _locallySavedAt: new Date().toISOString() };

    const index = list.findIndex(f => f.id === id);
    if (index >= 0) {
      list[index] = item;
    } else {
      list.unshift(item);
    }

    localStorage.setItem(CUSTOM_FORMS_STORAGE_KEY, JSON.stringify(list));
    return item;
  } catch (e) {
    console.error('Error saving custom form locally:', e);
    return form;
  }
}

/**
 * Gets all locally saved Custom Forms.
 */
export function getLocalCustomForms(drugstoreId?: string): any[] {
  try {
    const raw = localStorage.getItem(CUSTOM_FORMS_STORAGE_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    if (!drugstoreId) return list;
    return list.filter((f: any) => !f.drugstoreId || f.drugstoreId === drugstoreId);
  } catch {
    return [];
  }
}

/**
 * Deletes a custom form from local cache.
 */
export function deleteLocalCustomForm(id: string) {
  try {
    const raw = localStorage.getItem(CUSTOM_FORMS_STORAGE_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(f => f.id !== id);
    localStorage.setItem(CUSTOM_FORMS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error deleting local custom form:', e);
  }
}

/**
 * Exports a full JSON backup of all data saved locally for complete peace of mind.
 */
export function exportFullLocalBackup(): void {
  try {
    const backup = {
      exportDate: new Date().toISOString(),
      app: 'Dr. Roger POP',
      drugstore: getLocalDrugstore(),
      pops: getLocalPops(),
      declarations: getLocalDeclarations(),
      customForms: getLocalCustomForms(),
      pendingSyncQueue: getPendingSyncQueue()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `backup_dr_roger_pop_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (e) {
    console.error('Failed to export local backup:', e);
    alert('Erro ao exportar backup local.');
  }
}
