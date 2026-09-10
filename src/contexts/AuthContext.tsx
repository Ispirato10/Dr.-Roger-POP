import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getLocalDrugstore, saveLocalDrugstore } from '../lib/storageSync';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  drugstore: any | null;
  refreshDrugstore: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  drugstore: null,
  refreshDrugstore: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Start with locally cached drugstore to render immediately without blocking reads
  const [drugstore, setDrugstore] = useState<any | null>(() => getLocalDrugstore());

  const fetchDrugstore = async (uid: string) => {
    // 1. Try local cache first
    const cached = getLocalDrugstore(uid);
    if (cached) {
      setDrugstore(cached);
    }

    // 2. Fetch from Firestore (will use local IndexedDB cache or server)
    try {
      const q = doc(db, 'drugstores', uid);
      const docSnap = await getDoc(q);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setDrugstore(data);
        saveLocalDrugstore(data);
      } else if (!cached) {
        setDrugstore(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `drugstores/${uid}`);
      // If Firestore fails (quota exceeded / offline), keep using the local cached copy!
      if (!cached) {
        setDrugstore(null);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchDrugstore(currentUser.uid);
      } else {
        setDrugstore(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshDrugstore = async () => {
    if (user) await fetchDrugstore(user.uid);
  };

  return (
    <AuthContext.Provider value={{ user, loading, drugstore, refreshDrugstore }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
