import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserAccount, UserSession } from '../types';
import { recordFailedLoginAttempt, resetFailedLoginAttempts } from './securityService';

const USERS_COLLECTION = 'users';

// Helper to normalize email
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// 1. Send OTP via backend server (using user's Gmail SMTP croex.otp@gmail.com)
export async function sendOtpEmail(
  email: string,
  purpose: 'signup' | 'forgot_password'
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = normalizeEmail(email);

  try {
    const response = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, purpose }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'OTP bhejne mein masla pesh aya.');
    }

    return {
      success: true,
      message: data.message || 'OTP aapke Gmail par bhej diya gaya hai.',
    };
  } catch (error: any) {
    console.warn('sendOtpEmail notice:', error.message);
    throw new Error(
      error.message || 'OTP bhejne mein masla pesh aya. Internet check karein.'
    );
  }
}

// 2. Verify OTP via backend server
export async function verifyOtpCode(
  email: string,
  otp: string,
  purpose: 'signup' | 'forgot_password'
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = normalizeEmail(email);
  const cleanOtp = String(otp || '').replace(/\D/g, '').trim();

  try {
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, purpose }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Galat OTP code!');
    }

    return {
      success: true,
      message: data.message || 'OTP kamyabi se verify ho gaya!',
    };
  } catch (error: any) {
    console.warn('verifyOtpCode validation notice:', error.message);
    throw new Error(error.message || 'Galat OTP code ya expire ho chuka hai.');
  }
}

// Helper: Get local user cache
function getLocalUsersCache(): Record<string, UserAccount> {
  try {
    const cached = localStorage.getItem('mvc_registered_users');
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function saveUserToLocalCache(user: UserAccount) {
  try {
    const cache = getLocalUsersCache();
    cache[user.email] = user;
    localStorage.setItem('mvc_registered_users', JSON.stringify(cache));
  } catch {
    // ignore
  }
}

// 3. Register a new user in Firestore and local storage
export async function registerNewUser(
  name: string,
  email: string,
  password: string
): Promise<UserSession> {
  const cleanEmail = normalizeEmail(email);
  const cleanName = name.trim();
  const cleanPass = password.trim();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Baraye meharbani durust Gmail darj karein.');
  }
  if (!cleanPass || cleanPass.length < 4) {
    throw new Error('Password kam az kam 4 characters ka hona chahiye.');
  }

  // Check if user already exists
  try {
    const userDocRef = doc(db, USERS_COLLECTION, cleanEmail);
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap.exists()) {
      throw new Error('Yeh Gmail pehle se registered hai! Baraye meharbani Login karein.');
    }
  } catch (err: any) {
    if (err.message && err.message.includes('pehle se registered')) {
      throw err;
    }
    // Firestore might be offline, check local cache
    const localCache = getLocalUsersCache();
    if (localCache[cleanEmail]) {
      throw new Error('Yeh Gmail pehle se registered hai! Baraye meharbani Login karein.');
    }
  }

  const isRuntimeAdmin = cleanEmail === 'notattidie@gmail.com';

  const newAccount: UserAccount = {
    id: 'user_' + cleanEmail.replace(/[^a-z0-9]/g, '_'),
    name: cleanName || cleanEmail.split('@')[0],
    email: cleanEmail,
    password: cleanPass,
    isAdmin: isRuntimeAdmin,
    createdAt: new Date().toISOString(),
  };

  // Save to Firestore
  try {
    const userDocRef = doc(db, USERS_COLLECTION, cleanEmail);
    await setDoc(userDocRef, newAccount);
  } catch (err) {
    console.warn('Could not save to firestore, saving to local cache:', err);
  }

  // Save to local cache
  saveUserToLocalCache(newAccount);

  const session: UserSession = {
    id: newAccount.id,
    name: newAccount.name,
    email: newAccount.email,
    isAdmin: isRuntimeAdmin,
  };

  localStorage.setItem('mvc_user_session', JSON.stringify(session));
  return session;
}

// 4. Login user with explicit error messages
export async function loginUser(
  emailOrUsername: string,
  password: string
): Promise<{ session: UserSession; redirectToAdmin?: boolean }> {
  const cleanInput = emailOrUsername.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanInput) {
    throw new Error('User name / Email darj karein.');
  }
  if (!cleanPass) {
    throw new Error('Password darj karein.');
  }

  // 1. Check Super Admin credentials
  const isAdmin =
    cleanInput === 'mudasir.voting.centar.pk' ||
    cleanInput === 'mudasir.voting.center.pk' ||
    cleanInput === 'mudasir.voting.centar.pk@gmail.com' ||
    cleanInput === 'mudasir.voting.center@gmail.com' ||
    cleanInput === 'mudasir.voting.center.com' ||
    cleanInput === 'mudasir' ||
    cleanInput === 'notattidie@gmail.com';

  if (isAdmin) {
    if (cleanPass === 'Mudasir2211@@' || cleanPass === 'Mudasir2211@') {
      resetFailedLoginAttempts();
      const adminSession: UserSession = {
        id: 'admin_mudasir',
        name: cleanInput === 'notattidie@gmail.com' ? 'Mudasir (Super Admin)' : 'Mudasir (Super Admin)',
        email: cleanInput === 'mudasir' ? 'Mudasir.Voting.Centar.pk' : cleanInput,
        isAdmin: true,
      };
      localStorage.setItem('mvc_user_session', JSON.stringify(adminSession));
      return { session: adminSession, redirectToAdmin: true };
    } else {
      // Security Shield: Log unauthorized brute-force attempt targeting Super Admin
      recordFailedLoginAttempt(cleanInput, true);
      // Explicit requirement: "Aghar password Galat hu tou bataya password Galat hyy"
      throw new Error('Password galat hai! Baraye meharbani durust password darj karein.');
    }
  }

  // 2. Regular User check
  let foundAccount: UserAccount | null = null;

  // Try direct lookup by email in Firestore
  try {
    const userDocRef = doc(db, USERS_COLLECTION, cleanInput);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      foundAccount = snap.data() as UserAccount;
    }
  } catch {
    // continue to query or cache
  }

  // If not found by doc id (e.g. if user logged in by username/name)
  if (!foundAccount) {
    try {
      const q = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', cleanInput)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        foundAccount = querySnap.docs[0].data() as UserAccount;
      } else {
        // Try searching by name/username
        const qName = query(
          collection(db, USERS_COLLECTION),
          where('name', '==', cleanInput)
        );
        const nameSnap = await getDocs(qName);
        if (!nameSnap.empty) {
          foundAccount = nameSnap.docs[0].data() as UserAccount;
        }
      }
    } catch {
      // ignore
    }
  }

  // Fallback check in local cache
  if (!foundAccount) {
    const cache = getLocalUsersCache();
    if (cache[cleanInput]) {
      foundAccount = cache[cleanInput];
    } else {
      // check by username
      const matched = Object.values(cache).find(
        (u) =>
          u.name.toLowerCase() === cleanInput ||
          u.email.toLowerCase() === cleanInput
      );
      if (matched) {
        foundAccount = matched;
      }
    }
  }

  // Explicit requirement: "Aghar login mai user name wrong hu tou system banatay name Galat hyy"
  if (!foundAccount) {
    throw new Error('User name galat hai! (Account mojood nahi hai)');
  }

  // Explicit requirement: "Aghar password Galat hu tou bataya password Galat hyy"
  if (foundAccount.password !== cleanPass) {
    recordFailedLoginAttempt(cleanInput, false);
    throw new Error('Password galat hai! Baraye meharbani durust password darj karein.');
  }

  // Both match! Clear failed attempts
  resetFailedLoginAttempts();

  // Create session

  const session: UserSession = {
    id: foundAccount.id,
    name: foundAccount.name,
    email: foundAccount.email,
    isAdmin: false,
    phone: foundAccount.phone || '',
    photo: foundAccount.photo || '',
    avatar: foundAccount.photo || '',
    bio: foundAccount.bio || '',
    city: foundAccount.city || '',
  };

  localStorage.setItem('mvc_user_session', JSON.stringify(session));
  return { session, redirectToAdmin: false };
}

// 5. Reset Password after OTP verification
export async function resetUserPassword(
  email: string,
  newPassword: string
): Promise<void> {
  const cleanEmail = normalizeEmail(email);
  const cleanPass = newPassword.trim();

  if (!cleanPass || cleanPass.length < 4) {
    throw new Error('Naya password kam az kam 4 characters ka hona chahiye.');
  }

  let userFound = false;

  try {
    const userDocRef = doc(db, USERS_COLLECTION, cleanEmail);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      await updateDoc(userDocRef, { password: cleanPass });
      userFound = true;
    }
  } catch {
    // continue
  }

  // Also update local cache
  const cache = getLocalUsersCache();
  if (cache[cleanEmail]) {
    cache[cleanEmail].password = cleanPass;
    localStorage.setItem('mvc_registered_users', JSON.stringify(cache));
    userFound = true;
  }

  if (!userFound) {
    // Create or update record in cache
    const fallbackUser: UserAccount = {
      id: 'user_' + cleanEmail.replace(/[^a-z0-9]/g, '_'),
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      password: cleanPass,
      createdAt: new Date().toISOString(),
    };
    try {
      const userDocRef = doc(db, USERS_COLLECTION, cleanEmail);
      await setDoc(userDocRef, fallbackUser, { merge: true });
    } catch {}
    saveUserToLocalCache(fallbackUser);
  }
}

// 6. Update User Profile (Photo, Phone, Bio, Name, City)
export async function updateUserProfile(
  email: string,
  updates: Partial<UserAccount>
): Promise<UserSession> {
  const cleanEmail = normalizeEmail(email);
  const userDocRef = doc(db, USERS_COLLECTION, cleanEmail);

  // Filter out undefined values
  const payload: Record<string, any> = {};
  if (updates.name !== undefined) payload.name = updates.name.trim();
  if (updates.phone !== undefined) payload.phone = updates.phone.trim();
  if (updates.photo !== undefined) payload.photo = updates.photo;
  if (updates.bio !== undefined) payload.bio = updates.bio.trim();
  if (updates.city !== undefined) payload.city = updates.city.trim();

  try {
    await updateDoc(userDocRef, payload);
  } catch (e) {
    // If doc didn't exist or offline, setDoc with merge
    try {
      await setDoc(userDocRef, payload, { merge: true });
    } catch (err2) {
      console.warn('Firestore update profile warning:', err2);
    }
  }

  // Update local cache
  const cache = getLocalUsersCache();
  if (cache[cleanEmail]) {
    cache[cleanEmail] = { ...cache[cleanEmail], ...payload };
    localStorage.setItem('mvc_registered_users', JSON.stringify(cache));
  }

  // Update current session
  let currentSession: UserSession = {
    id: 'user_' + cleanEmail.replace(/[^a-z0-9]/g, '_'),
    name: updates.name || cleanEmail.split('@')[0],
    email: cleanEmail,
    isAdmin: false,
  };

  try {
    const raw = localStorage.getItem('mvc_user_session');
    if (raw) {
      currentSession = JSON.parse(raw);
    }
  } catch {}

  const newSession: UserSession = {
    ...currentSession,
    name: payload.name !== undefined ? payload.name : currentSession.name,
    phone: payload.phone !== undefined ? payload.phone : currentSession.phone,
    photo: payload.photo !== undefined ? payload.photo : currentSession.photo,
    avatar: payload.photo !== undefined ? payload.photo : currentSession.avatar,
    bio: payload.bio !== undefined ? payload.bio : currentSession.bio,
    city: payload.city !== undefined ? payload.city : currentSession.city,
  };

  localStorage.setItem('mvc_user_session', JSON.stringify(newSession));
  return newSession;
}

// 7. Get User Profile Detail
export async function getUserProfile(email: string): Promise<UserAccount | null> {
  const cleanEmail = normalizeEmail(email);
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, cleanEmail));
    if (snap.exists()) {
      return snap.data() as UserAccount;
    }
  } catch {}

  const cache = getLocalUsersCache();
  return cache[cleanEmail] || null;
}

// 8. Admin function: Get all registered users from Firestore and cache
export async function getAllRegisteredUsers(): Promise<UserAccount[]> {
  const usersMap = new Map<string, UserAccount>();

  // 1. First add from local cache
  const localCache = getLocalUsersCache();
  Object.values(localCache).forEach((u) => {
    usersMap.set(u.email, u);
  });

  // 2. Fetch from Firestore
  try {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    snap.forEach((docSnap) => {
      const data = docSnap.data() as UserAccount;
      if (data && data.email) {
        usersMap.set(data.email, {
          ...data,
          status: data.status || 'active',
        });
      }
    });
  } catch (err) {
    console.warn('Could not fetch all users from Firestore (using cache):', err);
  }

  return Array.from(usersMap.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

// 9. Admin function: Update user status or reset credentials
export async function adminUpdateUser(
  email: string,
  updates: Partial<UserAccount>
): Promise<void> {
  const cleanEmail = normalizeEmail(email);
  try {
    const userDocRef = doc(db, USERS_COLLECTION, cleanEmail);
    await updateDoc(userDocRef, updates);
  } catch (err) {
    console.warn('Could not update user in Firestore:', err);
  }

  const cache = getLocalUsersCache();
  if (cache[cleanEmail]) {
    cache[cleanEmail] = { ...cache[cleanEmail], ...updates };
    localStorage.setItem('mvc_registered_users', JSON.stringify(cache));
  }
}

// 10. Admin function: Delete all users except Super Admin
export async function deleteAllUsersExceptAdmin(): Promise<{ deletedCount: number }> {
  let deletedCount = 0;
  const adminEmails = ['notattidie@gmail.com', 'mudasir.voting.centar.pk'];

  // 1. Delete from Firestore users collection
  try {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    const deletePromises: Promise<any>[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as UserAccount;
      const email = (data.email || docSnap.id || '').toLowerCase().trim();
      if (!adminEmails.includes(email) && !data.isAdmin) {
        deletePromises.push(deleteDoc(docSnap.ref));
        deletedCount++;
      }
    });
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Could not delete all users from Firestore:', err);
  }

  // 2. Clear from local storage cache
  try {
    const localCache = getLocalUsersCache();
    const newCache: Record<string, UserAccount> = {};
    for (const [email, user] of Object.entries(localCache)) {
      if (adminEmails.includes(email.toLowerCase().trim()) || user.isAdmin) {
        newCache[email] = user;
      }
    }
    localStorage.setItem('mvc_registered_users', JSON.stringify(newCache));

    const currentSession = localStorage.getItem('mvc_user_session');
    if (currentSession) {
      try {
        const parsed = JSON.parse(currentSession);
        if (!parsed.isAdmin && !adminEmails.includes((parsed.email || '').toLowerCase().trim())) {
          localStorage.removeItem('mvc_user_session');
        }
      } catch {}
    }
  } catch (err) {
    console.warn('Error clearing local user cache:', err);
  }

  return { deletedCount };
}

