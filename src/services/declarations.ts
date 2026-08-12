import { doc, getDoc, runTransaction, collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';

export async function getNextSequenceNumber(drugstoreId: string): Promise<number> {
  if (!auth.currentUser) return 1;
  const counterRef = doc(db, 'counters', `drugstore_${drugstoreId}_declarations`);
  try {
    const counterDoc = await getDoc(counterRef);
    if (counterDoc.exists()) {
      return (counterDoc.data().value || 0) + 1;
    }
    return 1;
  } catch (error) {
    console.error('Error fetching next sequence number:', error);
    return 1;
  }
}

export async function saveDeclarationAndGetSequence(
  drugstoreId: string, 
  data: any,
  customSequence?: number
): Promise<number> {
  if (!auth.currentUser) throw new Error('User not authenticated');
  
  const counterRef = doc(db, 'counters', `drugstore_${drugstoreId}_declarations`);
  
  try {
    const sequenceNumber = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let currentVal = counterDoc.exists() ? (counterDoc.data().value || 0) : 0;
      let newSequence = customSequence && customSequence > currentVal ? customSequence : currentVal + 1;
      
      transaction.set(counterRef, { value: newSequence }, { merge: true });
      return newSequence;
    });

    const declarationData = {
      sequenceNumber,
      patient: data.patient,
      servicesIncluded: data.servicesIncluded,
      glicemia: data.glicemia,
      pressao: data.pressao,
      temperatura: data.temperatura,
      injetaveis: data.injetaveis,
      drugstoreId,
      authorId: auth.currentUser.uid,
      createdAt: serverTimestamp()
    };

    const declarationsRef = collection(db, 'declarations');
    await addDoc(declarationsRef, declarationData);

    return sequenceNumber;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'declarations');
    throw error;
  }
}

export async function getRecentDeclarations(drugstoreId: string) {
  if (!auth.currentUser) return [];
  try {
    const q = query(
      collection(db, 'declarations'),
      where('drugstoreId', '==', drugstoreId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching declarations list:', error);
    return [];
  }
}
