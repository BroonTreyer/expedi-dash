import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPER_ADMIN_EMAILS = [
  "matheuscarneiro004@gmail.com",
  "matheuss-s@hotmail.com",
];

const TABLES = [
  "carregamentos_dia",
  "produtos",
  "clientes",
  "vendedores",
  "motoristas",
  "caminhoes",
  "movimentacoes_portaria",
  "veiculos_esperados",
  "tipos_caminhao",
];

// Order for delete (children first) and insert (parents first)
const DELETE_ORDER = [
  "veiculos_esperados",
  "movimentacoes_portaria",
  "carregamentos_dia",
  "caminhoes",
  "motoristas",
  "clientes",
  "vendedores",
  "produtos",
  "tipos_caminhao",
];
const INSERT_ORDER = [...DELETE_ORDER].reverse();

async function fetchAllRows(supabase: any, table: string) {
  const rows: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Erro ao ler ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function deleteAllRows(supabase: any, table: string) {
  // Delete all by matching id != impossible value (supabase needs a filter)
  const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(`Erro ao limpar ${table}: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Super-admin email gate (mirrors UI <SuperAdminRoute>)
    const userEmail = user.email?.toLowerCase().trim();
    if (!userEmail || !SUPER_ADMIN_EMAILS.includes(userEmail)) {
      return new Response(JSON.stringify({ error: "Acesso restrito a Super Admins" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ── CREATE SNAPSHOT ──
    if (action === "create") {
      const snapshotData: Record<string, any[]> = {};
      const recordCounts: Record<string, number> = {};

      for (const table of TABLES) {
        const rows = await fetchAllRows(admin, table);
        snapshotData[table] = rows;
        recordCounts[table] = rows.length;
      }

      const { data: inserted, error: insertErr } = await admin
        .from("data_snapshots")
        .insert({
          description: body.description || `Snapshot ${new Date().toLocaleString("pt-BR")}`,
          created_by: userId,
          snapshot_data: snapshotData,
          record_counts: recordCounts,
        })
        .select("id, created_at, description, record_counts")
        .single();

      if (insertErr) throw new Error(`Erro ao salvar snapshot: ${insertErr.message}`);

      return new Response(JSON.stringify({ success: true, snapshot: inserted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── RESTORE SNAPSHOT ──
    if (action === "restore") {
      const { snapshot_id } = body;
      if (!snapshot_id) {
        return new Response(JSON.stringify({ error: "snapshot_id obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: snapshot, error: fetchErr } = await admin
        .from("data_snapshots")
        .select("*")
        .eq("id", snapshot_id)
        .single();

      if (fetchErr || !snapshot) {
        return new Response(JSON.stringify({ error: "Snapshot não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const snapData = snapshot.snapshot_data as Record<string, any[]>;

      // 1) Delete all data (children first)
      for (const table of DELETE_ORDER) {
        await deleteAllRows(admin, table);
      }

      // 2) Insert snapshot data (parents first)
      for (const table of INSERT_ORDER) {
        const rows = snapData[table];
        if (!rows || rows.length === 0) continue;

        for (let i = 0; i < rows.length; i += 500) {
          const batch = rows.slice(i, i + 500);
          const { error } = await admin.from(table).insert(batch);
          if (error) {
            throw new Error(`Erro ao restaurar ${table} (batch ${i}): ${error.message}`);
          }
        }
      }

      // 3) Audit log
      await admin.from("audit_log").insert({
        entity_type: "backup",
        entity_id: snapshot_id,
        action: "restore",
        user_id: userId,
        user_email: "",
        changes: {
          snapshot_description: snapshot.description,
          snapshot_created_at: snapshot.created_at,
        },
      });

      return new Response(JSON.stringify({ success: true, message: "Dados restaurados com sucesso" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── WIPE ORDERS ──
    if (action === "wipe_orders") {
      // Count before delete
      const { count, error: countErr } = await admin
        .from("carregamentos_dia")
        .select("*", { count: "exact", head: true });
      if (countErr) throw new Error(`Erro ao contar pedidos: ${countErr.message}`);

      const { error: delErr } = await admin
        .from("carregamentos_dia")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (delErr) throw new Error(`Erro ao apagar pedidos: ${delErr.message}`);

      await admin.from("audit_log").insert({
        entity_type: "backup",
        entity_id: "wipe_orders",
        action: "wipe_orders",
        user_id: userId,
        user_email: "",
        changes: { deleted_count: count },
      });

      return new Response(JSON.stringify({ success: true, deleted: count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SYNC CLIENTS ──
    if (action === "sync_clients") {
      const { data: result, error: rpcErr } = await admin.rpc("sync_clients_to_orders");
      if (rpcErr) throw new Error(`Erro ao sincronizar: ${rpcErr.message}`);

      const updatedCount = result?.updated ?? 0;

      await admin.from("audit_log").insert({
        entity_type: "backup",
        entity_id: "sync_clients",
        action: "sync_clients",
        user_id: userId,
        user_email: "",
        changes: { updated_count: updatedCount },
      });

      return new Response(JSON.stringify({ success: true, updated: updatedCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("backup-snapshot error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
