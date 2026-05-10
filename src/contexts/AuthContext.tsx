import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  const [drugstore, setDrugstore] = useState<any | null>(null);

  const fetchDrugstore = async (uid: string) => {
    try {
      const q = doc(db, 'drugstores', uid);
      const docSnap = await getDoc(q);
      if (docSnap.exists()) {
        setDrugstore({ id: docSnap.id, ...docSnap.data() });
      } else {
        setDrugstore(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `drugstores/${uid}`);
      setDrugstore(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchDrugstore(user.uid);
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
