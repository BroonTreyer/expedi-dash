export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      carregamentos_dia: {
        Row: {
          carga_id: string | null
          cidade: string | null
          cliente: string | null
          codigo_cliente: string | null
          codigo_produto: string | null
          created_at: string
          data: string
          etapa: string
          horario_fim: string | null
          horario_inicio: string | null
          horario_previsto: string | null
          id: string
          motorista: string | null
          nome_produto: string | null
          numero_pedido: number | null
          observacoes: string | null
          ordem_entrega: number | null
          peso: number | null
          placa: string | null
          quantidade: number | null
          ruptura: boolean
          status: string
          tipo_caminhao: string | null
          tipo_frete: string | null
          transportadora: string | null
          uf: string | null
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          carga_id?: string | null
          cidade?: string | null
          cliente?: string | null
          codigo_cliente?: string | null
          codigo_produto?: string | null
          created_at?: string
          data?: string
          etapa?: string
          horario_fim?: string | null
          horario_inicio?: string | null
          horario_previsto?: string | null
          id?: string
          motorista?: string | null
          nome_produto?: string | null
          numero_pedido?: number | null
          observacoes?: string | null
          ordem_entrega?: number | null
          peso?: number | null
          placa?: string | null
          quantidade?: number | null
          ruptura?: boolean
          status?: string
          tipo_caminhao?: string | null
          tipo_frete?: string | null
          transportadora?: string | null
          uf?: string | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          carga_id?: string | null
          cidade?: string | null
          cliente?: string | null
          codigo_cliente?: string | null
          codigo_produto?: string | null
          created_at?: string
          data?: string
          etapa?: string
          horario_fim?: string | null
          horario_inicio?: string | null
          horario_previsto?: string | null
          id?: string
          motorista?: string | null
          nome_produto?: string | null
          numero_pedido?: number | null
          observacoes?: string | null
          ordem_entrega?: number | null
          peso?: number | null
          placa?: string | null
          quantidade?: number | null
          ruptura?: boolean
          status?: string
          tipo_caminhao?: string | null
          tipo_frete?: string | null
          transportadora?: string | null
          uf?: string | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carregamentos_dia_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_carregamentos_codigo_cliente"
            columns: ["codigo_cliente"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["codigo_cliente"]
          },
          {
            foreignKeyName: "fk_carregamentos_codigo_produto"
            columns: ["codigo_produto"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["codigo_produto"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          cidade: string | null
          codigo_cliente: string
          created_at: string
          id: string
          nome_cliente: string
          uf: string | null
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          codigo_cliente: string
          created_at?: string
          id?: string
          nome_cliente: string
          uf?: string | null
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          codigo_cliente?: string
          created_at?: string
          id?: string
          nome_cliente?: string
          uf?: string | null
        }
        Relationships: []
      }
      movimentacoes_portaria: {
        Row: {
          apelido: string | null
          carga_id: string | null
          categoria: string
          conferente: string | null
          confianca_placa: number | null
          created_at: string
          data_hora: string
          descricao: string | null
          destino_setor: string | null
          doca_setor: string | null
          documento: string | null
          empresa: string | null
          foto_documento_url: string | null
          foto_nota_url: string | null
          foto_painel_url: string | null
          foto_placa_url: string | null
          horario_previsto_saida: string | null
          horario_real_retorno: string | null
          horario_real_saida: string | null
          id: string
          km_final: number | null
          km_inicial: number | null
          km_rodado: number | null
          km_rota: number | null
          motivo: string | null
          motivo_visita: string | null
          motorista: string | null
          movimento_vinculado_id: string | null
          nome_completo: string | null
          nota_fiscal: string | null
          numero_lacre: string | null
          observacoes: string | null
          ocorrencia: string | null
          peso: number | null
          pessoa_visitada: string | null
          placa: string | null
          placa_confirmada: string | null
          qtd_entregas: number | null
          responsavel_interno: string | null
          rota: string | null
          servico_executar: string | null
          telefone: string | null
          texto_placa_lido: string | null
          tipo_carga: string | null
          tipo_movimento: string
          tipo_operacao: string | null
          usuario_id: string | null
        }
        Insert: {
          apelido?: string | null
          carga_id?: string | null
          categoria?: string
          conferente?: string | null
          confianca_placa?: number | null
          created_at?: string
          data_hora?: string
          descricao?: string | null
          destino_setor?: string | null
          doca_setor?: string | null
          documento?: string | null
          empresa?: string | null
          foto_documento_url?: string | null
          foto_nota_url?: string | null
          foto_painel_url?: string | null
          foto_placa_url?: string | null
          horario_previsto_saida?: string | null
          horario_real_retorno?: string | null
          horario_real_saida?: string | null
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          km_rodado?: number | null
          km_rota?: number | null
          motivo?: string | null
          motivo_visita?: string | null
          motorista?: string | null
          movimento_vinculado_id?: string | null
          nome_completo?: string | null
          nota_fiscal?: string | null
          numero_lacre?: string | null
          observacoes?: string | null
          ocorrencia?: string | null
          peso?: number | null
          pessoa_visitada?: string | null
          placa?: string | null
          placa_confirmada?: string | null
          qtd_entregas?: number | null
          responsavel_interno?: string | null
          rota?: string | null
          servico_executar?: string | null
          telefone?: string | null
          texto_placa_lido?: string | null
          tipo_carga?: string | null
          tipo_movimento: string
          tipo_operacao?: string | null
          usuario_id?: string | null
        }
        Update: {
          apelido?: string | null
          carga_id?: string | null
          categoria?: string
          conferente?: string | null
          confianca_placa?: number | null
          created_at?: string
          data_hora?: string
          descricao?: string | null
          destino_setor?: string | null
          doca_setor?: string | null
          documento?: string | null
          empresa?: string | null
          foto_documento_url?: string | null
          foto_nota_url?: string | null
          foto_painel_url?: string | null
          foto_placa_url?: string | null
          horario_previsto_saida?: string | null
          horario_real_retorno?: string | null
          horario_real_saida?: string | null
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          km_rodado?: number | null
          km_rota?: number | null
          motivo?: string | null
          motivo_visita?: string | null
          motorista?: string | null
          movimento_vinculado_id?: string | null
          nome_completo?: string | null
          nota_fiscal?: string | null
          numero_lacre?: string | null
          observacoes?: string | null
          ocorrencia?: string | null
          peso?: number | null
          pessoa_visitada?: string | null
          placa?: string | null
          placa_confirmada?: string | null
          qtd_entregas?: number | null
          responsavel_interno?: string | null
          rota?: string | null
          servico_executar?: string | null
          telefone?: string | null
          texto_placa_lido?: string | null
          tipo_carga?: string | null
          tipo_movimento?: string
          tipo_operacao?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_portaria_movimento_vinculado_id_fkey"
            columns: ["movimento_vinculado_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes_portaria"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          codigo_produto: string
          created_at: string
          id: string
          nome_produto: string
          peso_padrao: number | null
        }
        Insert: {
          ativo?: boolean
          codigo_produto: string
          created_at?: string
          id?: string
          nome_produto: string
          peso_padrao?: number | null
        }
        Update: {
          ativo?: boolean
          codigo_produto?: string
          created_at?: string
          id?: string
          nome_produto?: string
          peso_padrao?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          email?: string
          id: string
          nome?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      registros_portaria: {
        Row: {
          carga_id: string
          confianca_km: number | null
          confianca_placa: number | null
          created_at: string
          divergencia_km: boolean | null
          divergencia_placa: boolean | null
          foto_km_url: string | null
          foto_placa_url: string | null
          id: string
          km_confirmado: number | null
          km_lido: number | null
          km_rodado_real: number | null
          leitura_modo: string | null
          placa_confirmada: string | null
          placa_prevista: string | null
          status_validacao: string
          texto_placa_lido: string | null
          tipo_registro: string
          usuario_id: string | null
        }
        Insert: {
          carga_id: string
          confianca_km?: number | null
          confianca_placa?: number | null
          created_at?: string
          divergencia_km?: boolean | null
          divergencia_placa?: boolean | null
          foto_km_url?: string | null
          foto_placa_url?: string | null
          id?: string
          km_confirmado?: number | null
          km_lido?: number | null
          km_rodado_real?: number | null
          leitura_modo?: string | null
          placa_confirmada?: string | null
          placa_prevista?: string | null
          status_validacao?: string
          texto_placa_lido?: string | null
          tipo_registro: string
          usuario_id?: string | null
        }
        Update: {
          carga_id?: string
          confianca_km?: number | null
          confianca_placa?: number | null
          created_at?: string
          divergencia_km?: boolean | null
          divergencia_placa?: boolean | null
          foto_km_url?: string | null
          foto_placa_url?: string | null
          id?: string
          km_confirmado?: number | null
          km_lido?: number | null
          km_rodado_real?: number | null
          leitura_modo?: string | null
          placa_confirmada?: string | null
          placa_prevista?: string | null
          status_validacao?: string
          texto_placa_lido?: string | null
          tipo_registro?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      tipos_caminhao: {
        Row: {
          created_at: string
          id: string
          nome_tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_tipo?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendedores: {
        Row: {
          ativo: boolean
          codigo_vendedor: string
          created_at: string
          id: string
          nome_vendedor: string
        }
        Insert: {
          ativo?: boolean
          codigo_vendedor: string
          created_at?: string
          id?: string
          nome_vendedor: string
        }
        Update: {
          ativo?: boolean
          codigo_vendedor?: string
          created_at?: string
          id?: string
          nome_vendedor?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_numero_pedido: { Args: { _data: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "logistica" | "faturamento"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "logistica", "faturamento"],
    },
  },
} as const
