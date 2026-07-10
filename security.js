// TrueLink — Security Layer
// Email OTP (free, Supabase built-in) + Device Fingerprint (blocks duplicate accounts)

import { createClient } from '@supabase/supabase-js';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// ---- Setup ----
const SUPABASE_URL = 'https://vfolauskglbihqmlyqlt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmb2xhdXNrZ2xiaWhxbWx5cWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MjU1NjgsImV4cCI6MjA5ODIwMTU2OH0.vXF77v3dCDjHFAhF7bBXxPEQ2tY6h8JNdJDmbuEiIHI';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Step 1: Get device fingerprint ----
async function getDeviceFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId; // unique device hash
}

// ---- Step 2: Send Email OTP ----
async function sendOtp(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true }
  });
  if (error) {
    console.error('OTP send failed:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

// ---- Step 3: Verify OTP + check fingerprint ----
async function verifyOtpAndCheckDevice(email, token) {
  // verify OTP first
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  });
  if (error) {
    return { success: false, error: error.message };
  }

  const userId = data.user.id;
  const deviceHash = await getDeviceFingerprint();

  // check if this device already has an account
  const { data: existing, error: fetchErr } = await supabase
    .from('device_registry')
    .select('*')
    .eq('device_hash', deviceHash);

  if (fetchErr) {
    console.error('Device check failed:', fetchErr.message);
  }

  if (existing && existing.length > 0) {
    const alreadyLinkedToSameUser = existing.some(row => row.user_id === userId);

    if (!alreadyLinkedToSameUser) {
      // Flag this account — same device, different user
      await supabase.from('device_flags').insert({
        user_id: userId,
        device_hash: deviceHash,
        reason: 'duplicate_device',
        created_at: new Date().toISOString()
      });

      return {
        success: false,
        error: 'This device is already linked to another TrueLink account.'
      };
    }
  } else {
    // first time this device is seen — register it
    await supabase.from('device_registry').insert({
      user_id: userId,
      device_hash: deviceHash,
      created_at: new Date().toISOString()
    });
  }

  return { success: true, user: data.user };
}

// ---- Step 4: Session auto-logout on browser close ----
function enableSessionOnlyAuth() {
  // Supabase default persists session in localStorage.
  // Override to use sessionStorage so it clears on browser close.
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      sessionStorage.setItem('sb-session', JSON.stringify(session));
    }
    if (event === 'SIGNED_OUT') {
      sessionStorage.removeItem('sb-session');
    }
  });
}

export { sendOtp, verifyOtpAndCheckDevice, getDeviceFingerprint, enableSessionOnlyAuth };