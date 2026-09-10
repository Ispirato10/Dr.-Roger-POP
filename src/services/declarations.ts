import { 
  doc, 
  getDoc, 
  runTransaction, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  saveLocalDeclaration, 
  getLocalDeclarations, 
  reportQuotaExceeded, 
  isQuotaExceededError,
  addToPendingSyncQueue
} from '../lib/storageSync';

export async function getNextSequenceNumber(drugstoreId: string): Promise<number> {
  const localList = getLocalDeclarations(drugstoreId);
  const maxLocalSeq = localList.reduce((max, d) => Math.max(max, d.sequenceNumber || 0), 0);

  if (!auth.currentUser) return maxLocalSeq + 1 || 1;

  const counterRef = doc(db, 'counters', `drugstore_${drugstoreId}_declarations`);
  try {
    const counterDoc = await getDoc(counterRef);
    if (counterDoc.exists()) {
      const serverVal = counterDoc.data().value || 0;
      return Math.max(serverVal, maxLocalSeq) + 1;
    }
    return maxLocalSeq + 1 || 1;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      reportQuotaExceeded(error, 'getNextSequenceNumber');
    }
    console.warn('Fallback sequence number to local calculations:', error);
    return maxLocalSeq + 1 || 1;
  }
}

export async function saveDeclarationAndGetSequence(
  drugstoreId: string, 
  data: any,
  customSequence?: number
): Promise<number> {
  const currentUserId = auth.currentUser?.uid || drugstoreId;
  const localList = getLocalDeclarations(drugstoreId);
  const maxLocalSeq = localList.reduce((max, d) => Math.max(max, d.sequenceNumber || 0), 0);

  // Compute calculated sequence
  let sequenceNumber = customSequence && customSequence > maxLocalSeq ? customSequence : maxLocalSeq + 1;

  const declarationPayload = {
    sequenceNumber,
    patient: data.patient,
    servicesIncluded: data.servicesIncluded,
    glicemia: data.glicemia,
    pressao: data.pressao,
    temperatura: data.temperatura,
    injetaveis: data.injetaveis,
    drugstoreId,
    authorId: currentUserId,
    createdAt: new Date().toISOString()
  };

  // 1. Always save in Local Storage first!
  saveLocalDeclaration(declarationPayload);

  // 2. Attempt Firestore Cloud Sync
  if (auth.currentUser) {
    const counterRef = doc(db, 'counters', `drugstore_${drugstoreId}_declarations`);
    try {
      sequenceNumber = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentVal = counterDoc.exists() ? (counterDoc.data().value || 0) : 0;
        let newSeq = customSequence && customSequence > currentVal ? customSequence : Math.max(currentVal, maxLocalSeq) + 1;
        transaction.set(counterRef, { value: newSeq }, { merge: true });
        return newSeq;
      });

      const declarationsRef = collection(db, 'declarations');
      const docRef = await addDoc(declarationsRef, {
        ...declarationPayload,
        sequenceNumber,
        createdAt: serverTimestamp()
      });

      // Update local item with Firestore ID and final sequence
      saveLocalDeclaration({ ...declarationPayload, id: docRef.id, sequenceNumber });
    } catch (error: any) {
      console.warn('Cloud sync of declaration deferred to local:', error);
      if (isQuotaExceededError(error)) {
        reportQuotaExceeded(error, 'saveDeclaration');
        addToPendingSyncQueue({
          collectionName: 'declarations',
          action: 'add',
          data: declarationPayload
        });
      } else {
        handleFirestoreError(error, OperationType.WRITE, 'declarations');
      }
    }
  }

  return sequenceNumber;
}

export async function getRecentDeclarations(drugstoreId: string) {
  const localList = getLocalDeclarations(drugstoreId);

  if (!auth.currentUser) return localList;

  try {
    const q = query(
      collection(db, 'declarations'),
      where('drugstoreId', '==', drugstoreId),
      orderBy('createdAt', 'desc'),
      limit(25)
    );
    const snapshot = await getDocs(q);
    const cloudDocs: any[] = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    // Merge cloud + local deduplicating by id or sequenceNumber
    const combinedMap = new Map<string | number, any>();
    
    // Add local first
    localList.forEach(item => {
      const key = item.id || `seq_${item.sequenceNumber}`;
      combinedMap.set(key, item);
    });

    // Merge cloud
    cloudDocs.forEach(item => {
      const key = item.id || `seq_${item.sequenceNumber}`;
      combinedMap.set(key, item);
    });

    return Array.from(combinedMap.values()).sort((a, b) => (b.sequenceNumber || 0) - (a.sequenceNumber || 0));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      reportQuotaExceeded(error, 'getRecentDeclarations');
    }
    console.warn('Using local declarations list due to cloud error:', error);
    return localList;
  }
}
