import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.55.0/+esm";

const SUPABASE_URL = "https://frrbcgovmxcqanmszosf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6iWBmxvQkPZIjztguYA2ag_WSP_ewHj";
const USER_KEY = "saegyeol_user_v1";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit"
  }
});

function mapUser(user) {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || "",
    name: metadata.full_name || metadata.name || user.email?.split("@")[0] || "새결 회원",
    avatar: metadata.avatar_url || metadata.picture || "",
    provider: user.app_metadata?.provider || "google"
  };
}

function persistUser(user) {
  const mapped = mapUser(user);
  if (mapped) localStorage.setItem(USER_KEY, JSON.stringify(mapped));
  else localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("saegyeol:auth", { detail: { user: mapped } }));
  return mapped;
}

export async function syncAuthSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return persistUser(data.session?.user || null);
}

export async function signInWithGoogle() {
  const redirectTo = window.location.origin;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { prompt: "select_account" }
    }
  });
  if (error) throw error;
  return data;
}

export async function signOutFromSupabase() {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
  persistUser(null);
}

supabase.auth.onAuthStateChange((_event, session) => {
  persistUser(session?.user || null);
});
