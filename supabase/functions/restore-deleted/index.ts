import { createClient } from "npm:@supabase/supabase-js@2.95.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

const SUPER_ADMIN_EMAILS = [
  "matheuscarneiro004@gmail.com",
  "matheuss-s@hotmail.com",
];

// Mapeia entity_type -> nome real da tabela
const ENTITY_TABLE_MAP: Record<string, string> = {
  carregamento: "carregamentos_dia",
  movimentacao: "movimentacoes_portaria",
  cliente: "clientes",
  produto: "produtos",
  motorista: "motoristas",
  caminhao: "caminhoes",
  vendedor: "vendedores",
  veiculo_esperado: "veiculos_esperados",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validar usuário
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = (claims.claims.email as string | undefined)?.toLowerCase().trim();
    if (!userEmail || !SUPER_ADMIN_EMAILS.includes(userEmail)) {
      return new Response(JSON.stringify({ error: "Apenas Super Admins podem restaurar registros" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const auditLogId = body?.audit_log_id as string | undefined;
    if (!auditLogId) {
      return new Response(JSON.stringify({ error: "audit_log_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar log com service role
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: log, error: logErr } = await admin
      .from("audit_log")
      .select("*")
      .eq("id", auditLogId)
      .maybeSingle();

    if (logErr || !log) {
      return new Response(JSON.stringify({ error: "Log não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (log.action !== "excluido") {
      return new Response(JSON.stringify({ error: "Esse log não é uma exclusão" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deletedRow = (log.changes as any)?.deleted_row;
    if (!deletedRow || typeof deletedRow !== "object") {
      return new Response(JSON.stringify({ error: "Esse log não tem snapshot completo (registro antigo, sem possibilidade de restaurar)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tableName = ENTITY_TABLE_MAP[log.entity_type];
    if (!tableName) {
      return new Response(JSON.stringify({ error: `Tipo desconhecido: ${log.entity_type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tentar inserir com o mesmo ID; se já existe, tentar sem ID (gera novo)
    const insertPayload = { ...deletedRow };

    // Verificar se ID já existe na tabela
    const { data: existing } = await admin
      .from(tableName)
      .select("id")
      .eq("id", deletedRow.id)
      .maybeSingle();

    let restoredId = deletedRow.id;
    let restoredRow: any;

    if (existing) {
      // ID ocupado — gera novo
      delete insertPayload.id;
      const { data, error } = await admin.from(tableName).insert(insertPayload).select().single();
      if (error) throw error;
      restoredRow = data;
      restoredId = data.id;
    } else {
      const { data, error } = await admin.from(tableName).insert(insertPayload).select().single();
      if (error) throw error;
      restoredRow = data;
    }

    // Registrar evento de restauração no audit_log
    await admin.from("audit_log").insert({
      entity_type: log.entity_type,
      entity_id: String(restoredId),
      action: "restaurado",
      user_id: claims.claims.sub,
      user_email: userEmail,
      changes: {
        restored_from_log: auditLogId,
        original_id: deletedRow.id,
        new_id: restoredId,
      },
    });

    return new Response(
      JSON.stringify({ success: true, restored: restoredRow, new_id: restoredId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[restore-deleted] error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});