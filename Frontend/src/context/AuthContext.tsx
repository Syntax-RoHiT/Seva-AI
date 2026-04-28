import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRole } from '../types';
import { registerFCMToken } from '../services/fcmService';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  approved: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, role: UserRole, organization?: string, skills?: string[]) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInAsDemo: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Super Admin Credentials (hardcoded for production) ────────────────────────
// The SUPER_ADMIN is seeded directly in Firestore via the Firebase Console.
// Email: admin@sevaai.com | Password: set via Firebase Console
const SUPER_ADMIN_UID_PLACEHOLDER = 'SUPER_ADMIN'; // replaced by real UID after first login

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole>('NGO_ADMIN');
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Demo / anonymous session
        const demoRole = localStorage.getItem('demo_role') as UserRole | null;
        if (firebaseUser.isAnonymous && demoRole) {
          setRoleState(demoRole);
          setApproved(true);
          localStorage.removeItem('demo_role');

          await setDoc(doc(db, 'users', firebaseUser.uid), {
            uid: firebaseUser.uid,
            email: 'demo@sevaai.com',
            displayName: demoRole === 'NGO_ADMIN' ? 'Demo NGO Admin' : 'Demo Volunteer',
            role: demoRole,
            approved: true,
            isDemo: true,
            createdAt: new Date().toISOString(),
          }, { merge: true });

          setLoading(false);
          registerFCMToken(firebaseUser.uid).catch(console.warn);
          return;
        }

        // Real user — fetch from Firestore
        const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setRoleState(data.role as UserRole || 'NGO_ADMIN');
          setApproved(!!data.approved);
          registerFCMToken(firebaseUser.uid).catch(console.warn);
        } else {
          // New Google sign-in without prior signup — treat as pending
          setRoleState('NGO_ADMIN');
          setApproved(false);
        }
      } else {
        // Mock demo fallback (if Firebase Anonymous Auth is disabled)
        const isMockDemo = localStorage.getItem('is_mock_demo');
        const savedRole = localStorage.getItem('user_role') as UserRole | null;
        if (isMockDemo && savedRole) {
          setUser({
            uid: 'MOCK-JUDGE-' + savedRole,
            displayName: savedRole === 'NGO_ADMIN' ? 'Demo NGO Admin' : 'Demo Volunteer',
            email: 'judge@sevaai.com',
            isAnonymous: true,
          } as User);
          setRoleState(savedRole);
          setApproved(true);
        } else {
          setUser(null);
          setApproved(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ─── Email/Password Sign Up ────────────────────────────────────────────────
  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    organization?: string,
    skills?: string[],
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    // Write to pendingUsers — awaiting admin approval
    await setDoc(doc(db, 'pendingUsers', cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName: name,
      role,
      organization: organization || '',
      skills: skills || [],
      status: 'PENDING_APPROVAL',
      approved: false,
      createdAt: new Date().toISOString(),
    });

    // Also create users doc (not approved yet)
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName: name,
      role,
      organization: organization || '',
      skills: skills || [],
      approved: false,
      online: false,
      currentMissionId: null,
      createdAt: new Date().toISOString(),
    });

    setRoleState(role);
    setApproved(false);
  };

  // ─── Email/Password Sign In ────────────────────────────────────────────────
  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle loading the user doc
  };

  // ─── Google Sign In ────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);

    // Check if user already exists in Firestore
    const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
    if (!userSnap.exists()) {
      // First-time Google sign-in — create pending record
      await setDoc(doc(db, 'pendingUsers', cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
        role: 'NGO_ADMIN', // default; admin can change
        organization: '',
        status: 'PENDING_APPROVAL',
        approved: false,
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
        role: 'NGO_ADMIN',
        approved: false,
        createdAt: new Date().toISOString(),
      });
      setApproved(false);
    }
  };

  // ─── Demo Login (for judges) ───────────────────────────────────────────────
  const signInAsDemo = async (demoRole: UserRole) => {
    try {
      localStorage.setItem('demo_role', demoRole);
      localStorage.removeItem('is_mock_demo');
      await signInAnonymously(auth);
    } catch {
      // Firebase Anonymous Auth disabled — mock session fallback
      localStorage.removeItem('demo_role');
      localStorage.setItem('is_mock_demo', 'true');
      localStorage.setItem('user_role', demoRole);
      setUser({
        uid: 'MOCK-JUDGE-' + demoRole,
        displayName: demoRole === 'NGO_ADMIN' ? 'Demo NGO Admin' : 'Demo Volunteer',
        email: 'judge@sevaai.com',
        isAnonymous: true,
      } as User);
      setRoleState(demoRole);
      setApproved(true);
    }
  };

  // ─── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem('user_role');
    localStorage.removeItem('is_mock_demo');
    setUser(null);
    setApproved(false);
  };

  return (
    <AuthContext.Provider value={{
      user, role, approved, loading,
      signInWithGoogle, signUpWithEmail, signInWithEmail, signInAsDemo, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
