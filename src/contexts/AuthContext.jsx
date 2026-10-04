import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { auth, db, isFirebaseReady } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  updateProfile as fbUpdateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

const AuthContext = createContext(null);
const STORAGE_KEY = 'pitlane_user_v1';

function loadUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}
function saveUser(u) {
  if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  else localStorage.removeItem(STORAGE_KEY);
}

async function hashPassword(password) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function makeAvatar(name) {
  return (name || 'F')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

async function fbUserToApp(fbUser) {
  const base = {
    id: fbUser.uid,
    email: fbUser.email,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Kullanıcı',
    avatar: makeAvatar(fbUser.displayName || fbUser.email),
    joinedAt: fbUser.metadata?.creationTime || new Date().toISOString(),
    isGoogle: fbUser.providerData?.[0]?.providerId === 'google.com',
  };

  if (db) {
    try {
      const snap = await getDoc(doc(db, 'users', fbUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        return { ...base, ...data, id: fbUser.uid, email: fbUser.email };
      }
    } catch (e) {
      console.error('Firestore load error:', e);
      // Okuma başarısızsa boş profille yerel veriyi ezme; önbellekteki profili koru.
      const cached = loadUser();
      if (cached?.id === fbUser.uid)
        return { ...base, ...cached, id: fbUser.uid, email: fbUser.email };
    }
  }

  return { ...base, favDrivers: [], favTeams: [], fantasyTeam: null };
}

async function saveToFirestore(uid, data) {
  if (!db) return;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, data);
    } else {
      await setDoc(ref, { ...data, joinedAt: new Date().toISOString() });
    }
  } catch (e) {
    console.error('Firestore save error:', e);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);
  const userRef = useRef(user);
  userRef.current = user;
  const [authModal, setAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseReady() || !auth) {
      setLoading(false);
      return;
    }

    // Check redirect result for mobile Google login
    getRedirectResult(auth)
      .then(async result => {
        if (result?.user) {
          const appUser = await fbUserToApp(result.user);
          setUser(appUser);
          saveUser(appUser);
        }
      })
      .catch(err => console.error('Redirect result error:', err));

    const unsub = onAuthStateChanged(auth, async fbUser => {
      if (fbUser) {
        const appUser = await fbUserToApp(fbUser);
        setUser(appUser);
        saveUser(appUser);
      } else {
        const local = loadUser();
        if (!local?.id || local.id.startsWith('google_')) {
          setUser(null);
          saveUser(null);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const login = useCallback(async (email, password) => {
    if (isFirebaseReady() && auth) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const appUser = await fbUserToApp(cred.user);
      setUser(appUser);
      saveUser(appUser);
      return appUser;
    }
    const existing = JSON.parse(localStorage.getItem(`pl_acc_${email}`) || 'null');
    if (existing) {
      const pHash = await hashPassword(password);
      if (existing.pHash !== pHash) throw new Error('Şifre yanlış');
      const u = { ...existing };
      delete u.pHash;
      setUser(u);
      saveUser(u);
      return u;
    }
    throw new Error('Hesap bulunamadı. Kayıt olun.');
  }, []);

  const register = useCallback(async (email, password, name) => {
    if (isFirebaseReady() && auth) {
      // Check for nickname uniqueness
      if (name && db) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('name', '==', name));
        const snap = await getDocs(q);
        if (!snap.empty) {
          throw new Error('Bu kullanıcı adı (nick) zaten alınmış, lütfen başka bir tane seçin.');
        }
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await fbUpdateProfile(cred.user, { displayName: name });
      const appUser = await fbUserToApp(cred.user);
      appUser.name = name || appUser.name;
      appUser.avatar = makeAvatar(name || email);
      appUser.favDrivers = [];
      appUser.favTeams = [];
      appUser.fantasyTeam = null;
      await saveToFirestore(cred.user.uid, {
        name: appUser.name,
        avatar: appUser.avatar,
        favDrivers: [],
        favTeams: [],
        fantasyTeam: null,
      });
      setUser(appUser);
      saveUser(appUser);
      return appUser;
    }
    const existing = JSON.parse(localStorage.getItem(`pl_acc_${email}`) || 'null');
    if (existing) throw new Error('Bu e-posta zaten kayıtlı.');
    const u = {
      id: Date.now().toString(),
      email,
      name: name || email.split('@')[0],
      avatar: makeAvatar(name || email),
      favDrivers: [],
      favTeams: [],
      fantasyTeam: null,
      joinedAt: new Date().toISOString(),
    };
    const pHash = await hashPassword(password);
    localStorage.setItem(`pl_acc_${email}`, JSON.stringify({ ...u, pHash }));
    setUser(u);
    saveUser(u);
    return u;
  }, []);

  const googleLogin = useCallback(async () => {
    if (isFirebaseReady() && auth) {
      const provider = new GoogleAuthProvider();
      // Mobile detection for smooth Google Sign In
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        try {
          const cred = await signInWithPopup(auth, provider);
          const appUser = await fbUserToApp(cred.user);
          await saveToFirestore(cred.user.uid, {
            name: appUser.name,
            avatar: appUser.avatar,
            favDrivers: appUser.favDrivers || [],
            favTeams: appUser.favTeams || [],
          });
          setUser(appUser);
          saveUser(appUser);
          return appUser;
        } catch (e) {
          // Fallback to redirect if popup fails or gets blocked
          await signInWithRedirect(auth, provider);
        }
      }
      return;
    }
    // Fallback
    const email = 'google_user@gmail.com';
    const existing = JSON.parse(localStorage.getItem(`pl_acc_${email}`) || 'null');
    const u = existing
      ? { ...existing }
      : {
          id: 'google_' + Date.now(),
          email,
          name: 'Google Kullanici',
          avatar: 'GK',
          favDrivers: [],
          favTeams: [],
          fantasyTeam: null,
          joinedAt: new Date().toISOString(),
          isGoogle: true,
        };
    if (u.password) delete u.password;
    if (!existing) localStorage.setItem(`pl_acc_${email}`, JSON.stringify({ ...u }));
    setUser(u);
    saveUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    if (isFirebaseReady() && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    setUser(null);
    saveUser(null);
  }, []);

  const updateProfile = useCallback(patch => {
    const prev = userRef.current;
    if (!prev) return;
    const next = { ...prev, ...patch };
    userRef.current = next;
    setUser(next);
    saveUser(next);
    try {
      const stored = JSON.parse(localStorage.getItem(`pl_acc_${prev.email}`) || '{}');
      localStorage.setItem(`pl_acc_${prev.email}`, JSON.stringify({ ...stored, ...patch }));
    } catch (e) {
      console.error('Local save error:', e);
    }
    if (prev.id && isFirebaseReady()) {
      // Firestore undefined değerleri reddeder
      saveToFirestore(prev.id, JSON.parse(JSON.stringify(patch)));
    }
  }, []);

  const openAuth = useCallback(() => setAuthModal(true), []);
  const closeAuth = useCallback(() => setAuthModal(false), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        googleLogin,
        logout,
        updateProfile,
        authModal,
        openAuth,
        closeAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
