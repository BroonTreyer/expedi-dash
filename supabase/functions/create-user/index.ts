import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_ROLES = ["admin", "logistica", "faturamento", "portaria", "vendedor", "expedicao"];

const isValidEmail = (s: unknown) => typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;

    // Check admin role
    const { data: isAdmin } = await anonClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* ignore */ }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const nome = typeof body.nome === "string" ? body.nome.trim() : "";
    const role = typeof body.role === "string" ? body.role : "";
    const vendedor_id = body.vendedor_id;

    const errors: string[] = [];
    if (!isValidEmail(email)) errors.push("email inválido");
    if (!password || password.length < 6) errors.push("senha deve ter pelo menos 6 caracteres");
    if (!nome || nome.length < 2 || nome.length > 100) errors.push("nome inválido (2-100 caracteres)");
    if (!VALID_ROLES.includes(role)) errors.push(`role inválida (permitidas: ${VALID_ROLES.join(", ")})`);
    if (role === "vendedor" && !isUuid(vendedor_id)) errors.push("vendedor_id obrigatório para role 'vendedor'");

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: errors.join("; ") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with service role (auto-confirms email)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: role === "vendedor" ? { nome, role, vendedor_id } : { nome },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = newUser.user.id;

    // Pós-criação: garantir role correta + vínculo vendedor. Em caso de erro, ROLLBACK do auth.users.
    try {
      const { error: roleErr } = await serviceClient
        .from("user_roles")
        .upsert({ user_id: newUserId, role }, { onConflict: "user_id,role" });
      if (roleErr) throw roleErr;

      if (role !== "logistica") {
        await serviceClient
          .from("user_roles")
          .delete()
          .eq("user_id", newUserId)
          .eq("role", "logistica");
      }

      if (role === "vendedor" && vendedor_id) {
        const { error: linkErr } = await serviceClient
          .from("vendedor_users")
          .upsert({ user_id: newUserId, vendedor_id }, { onConflict: "user_id" });
        if (linkErr) throw linkErr;
      }

      return new Response(
        JSON.stringify({ success: true, user_id: newUserId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (postErr) {
      // Rollback: usuário ficou criado em auth.users mas sem perfil válido — apaga
      try { await serviceClient.auth.admin.deleteUser(newUserId); } catch { /* swallow */ }
      const msg = postErr instanceof Error ? postErr.message : String(postErr);
      return new Response(
        JSON.stringify({ error: `Falha ao configurar perfil; usuário revertido. Detalhes: ${msg}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
