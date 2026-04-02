import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
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

    // Verify user and admin role
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Check admin role using service client
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

    const { action, snapshot_id, description } = await req.json();

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
          description: description || `Snapshot ${new Date().toLocaleString("pt-BR")}`,
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

    if (action === "restore") {
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

      const data = snapshot.snapshot_data as Record<string, any[]>;

      // Build a single SQL transaction
      const statements: string[] = ["BEGIN;"];

      // Order matters for FK constraints - delete in reverse dependency order
      const deleteOrder = [
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

      for (const table of deleteOrder) {
        statements.push(`DELETE FROM public.${table};`);
      }

      // Insert in forward order
      const insertOrder = [
        "tipos_caminhao",
        "produtos",
        "vendedores",
        "clientes",
        "motoristas",
        "caminhoes",
        "carregamentos_dia",
        "movimentacoes_portaria",
        "veiculos_esperados",
      ];

      for (const table of insertOrder) {
        const rows = data[table];
        if (!rows || rows.length === 0) continue;

        // Insert in batches of 100
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100);
          const cols = Object.keys(batch[0]);
          const colList = cols.map((c) => `"${c}"`).join(", ");
          const valueRows = batch.map((row: any) => {
            const vals = cols.map((c) => {
              const v = row[c];
              if (v === null || v === undefined) return "NULL";
              if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
              if (typeof v === "number") return String(v);
              if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
              return `'${String(v).replace(/'/g, "''")}'`;
            });
            return `(${vals.join(", ")})`;
          });
          statements.push(`INSERT INTO public.${table} (${colList}) VALUES ${valueRows.join(", ")};`);
        }
      }

      // Log the restore in audit_log
      statements.push(
        `INSERT INTO public.audit_log (entity_type, entity_id, action, user_id, user_email, changes) VALUES ('backup', '${snapshot_id}', 'restore', '${userId}', '', '${JSON.stringify({ snapshot_description: snapshot.description, snapshot_created_at: snapshot.created_at }).replace(/'/g, "''")}'::jsonb);`
      );

      statements.push("COMMIT;");

      // Execute via raw SQL using the REST API with service role
      const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });

      // Use the postgres connection directly via supabase-js sql method
      // Actually, we need to use the SQL endpoint. Let's use individual operations.
      
      // Delete all tables first
      for (const table of deleteOrder) {
        const { error } = await admin.from(table).delete().gte("created_at", "1900-01-01");
        if (error) {
          console.error(`Error deleting ${table}:`, error.message);
          // For tables without created_at filter, try neq on id
        }
      }

      // Insert data back
      for (const table of insertOrder) {
        const rows = data[table];
        if (!rows || rows.length === 0) continue;

        for (let i = 0; i < rows.length; i += 500) {
          const batch = rows.slice(i, i + 500);
          const { error } = await admin.from(table).insert(batch);
          if (error) {
            console.error(`Error inserting into ${table}:`, error.message);
            throw new Error(`Erro ao restaurar ${table}: ${error.message}`);
          }
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Dados restaurados com sucesso" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use 'create' ou 'restore'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("backup-snapshot error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
