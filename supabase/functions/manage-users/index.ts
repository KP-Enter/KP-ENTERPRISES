// K.P. ENTERPRISES — team management (runs on Supabase Edge Functions).
// Only signed-in admins can call it. Uses the service-role key, which never leaves Supabase.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserByEmail(email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => (x.email || "").toLowerCase() === email);
    if (u) return u;
    if (data.users.length < 200) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // --- who is calling? ---
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not signed in" }, 401);
    const { data: who, error: whoErr } = await admin.auth.getUser(token);
    if (whoErr || !who?.user?.email) return json({ error: "Session expired — please log in again" }, 401);
    const me = who.user.email.toLowerCase();
    const { data: meRow } = await admin.from("allowed_users").select("role").ilike("email", me).maybeSingle();
    if (meRow?.role !== "admin") return json({ error: "Only an admin can manage the team" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const email = String(body.email || "").trim().toLowerCase();
    const role = body.role === "admin" ? "admin" : "staff";

    const adminCount = async () =>
      (await admin.from("allowed_users").select("email", { count: "exact", head: true }).eq("role", "admin")).count ?? 0;

    if (action === "list") {
      const { data: rows, error } = await admin.from("allowed_users").select("*").order("created_at");
      if (error) throw error;
      const out = [];
      for (const r of rows || []) {
        const u = await findUserByEmail(r.email.toLowerCase());
        out.push({ ...r, last_sign_in_at: u?.last_sign_in_at || null, has_login: !!u, is_me: r.email.toLowerCase() === me });
      }
      return json({ users: out });
    }

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter a valid email" }, 400);

    if (action === "create") {
      const password = String(body.password || "");
      if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
      const existing = await findUserByEmail(email);
      if (existing) {
        const { error } = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
        if (error) throw error;
      } else {
        const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: body.full_name || "" } });
        if (error) throw error;
      }
      const { error: e2 } = await admin.from("allowed_users").upsert({ email, role, full_name: body.full_name || null }, { onConflict: "email" });
      if (e2) throw e2;
      return json({ ok: true });
    }

    if (action === "set_password") {
      const password = String(body.password || "");
      if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
      const u = await findUserByEmail(email);
      if (!u) return json({ error: "No login found for this email" }, 404);
      const { error } = await admin.auth.admin.updateUserById(u.id, { password });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "set_role") {
      if (email === me && role !== "admin") return json({ error: "You can't remove your own admin rights" }, 400);
      const { error } = await admin.from("allowed_users").update({ role }).eq("email", email);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "remove") {
      if (email === me) return json({ error: "You can't remove yourself" }, 400);
      const { data: row } = await admin.from("allowed_users").select("role").eq("email", email).maybeSingle();
      if (row?.role === "admin" && (await adminCount()) <= 1) return json({ error: "At least one admin must remain" }, 400);
      await admin.from("allowed_users").delete().eq("email", email);
      const u = await findUserByEmail(email);
      if (u) { const { error } = await admin.auth.admin.deleteUser(u.id); if (error) throw error; }
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 500);
  }
});
