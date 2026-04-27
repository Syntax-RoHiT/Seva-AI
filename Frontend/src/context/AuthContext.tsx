import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  signInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRole } from '../types';
import { registerFCMToken } from '../services/fcmService';


interface AuthContextType {
  user: User | null;
  role: UserRole;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsDemo: (role: UserRole) => void;
  signOut: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole>((localStorage.getItem('user_role') as UserRole) || 'NGO_ADMIN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Handle demo roles
        const demoRole = localStorage.getItem('demo_role') as UserRole;
        if (user.isAnonymous && demoRole) {
          setRoleState(demoRole);
          localStorage.setItem('user_role', demoRole);
          localStorage.removeItem('demo_role');
          
          // Sync demo user to Firestore
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: 'demo@sevaai.com',
            displayName: 'Seva Operator',
            role: demoRole,
            isDemo: true,
            createdAt: new Date().toISOString()
          }, { merge: true });
          
          setLoading(false);

          // Register for FCM push notifications
          registerFCMToken(user.uid).catch(console.warn);
          return;

        }

        // Fetch role from Firestore for regular users
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role) {
            setRoleState(userData.role);
            localStorage.setItem('user_role', userData.role);
          }
        } else {
          // Default role for new users if not set
          const defaultRole = (localStorage.getItem('user_role') as UserRole) || 'NGO_ADMIN';
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: defaultRole,
            createdAt: new Date().toISOString()
          });
          setRoleState(defaultRole);
        }
      } else {
        // Fallback for mock demo session (if Firebase Anonymous Auth is disabled)
        const savedRole = localStorage.getItem('user_role') as UserRole;
        const isMockDemo = localStorage.getItem('is_mock_demo');
        
        if (isMockDemo && savedRole) {
          setUser({
            uid: 'MOCK-JUDGE-' + savedRole,
            displayName: 'Seva Atithi (Judge)',
            email: 'judge@sevaai.com',
            isAnonymous: true
          } as User);
          setRoleState(savedRole);
        } else {
          setUser(null);
          // Keep the previous role or default instead of null to avoid UI errors before redirection
          if (!localStorage.getItem('user_role')) {
            setRoleState('NGO_ADMIN');
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signInAsDemo = async (demoRole: UserRole) => {
    try {
      localStorage.setItem('demo_role', demoRole);
      localStorage.removeItem('is_mock_demo');
      await signInAnonymously(auth);
    } catch (error) {
      console.warn("Firebase Anonymous Auth disabled. Falling back to Mock Session for Judges.", error);
      localStorage.removeItem('demo_role');
      localStorage.setItem('is_mock_demo', 'true');
      localStorage.setItem('user_role', demoRole);
      
      setUser({
        uid: 'MOCK-JUDGE-' + demoRole,
        displayName: 'Seva Atithi (Judge)',
        email: 'judge@sevaai.com',
        isAnonymous: true
      } as User);
      setRoleState(demoRole);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem('user_role');
    localStorage.removeItem('is_mock_demo');
    setUser(null);
    setRoleState('NGO_ADMIN');
  };

  const updateRole = async (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('user_role', newRole);
    if (user) {
      await setDoc(doc(db, 'users', user.uid), { role: newRole }, { merge: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signInWithGoogle, signInAsDemo, signOut, setRole: updateRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
