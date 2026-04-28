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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changes: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          logical_entity_id: string | null
          logical_entity_type: string | null
          operation_id: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          logical_entity_id?: string | null
          logical_entity_type?: string | null
          operation_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          logical_entity_id?: string | null
          logical_entity_type?: string | null
          operation_id?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      caminhoes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          motorista_id: string | null
          placa: string
          renavam: string | null
          tipo_caminhao: string | null
          transportadora: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          motorista_id?: string | null
          placa: string
          renavam?: string | null
          tipo_caminhao?: string | null
          transportadora?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          motorista_id?: string | null
          placa?: string
          renavam?: string | null
          tipo_caminhao?: string | null
          transportadora?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "caminhoes_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
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
          motivo_ruptura: string | null
          motorista: string | null
          nome_carga: string | null
          nome_produto: string | null
          numero_pedido: number | null
          observacoes: string | null
          operation_id: string | null
          ordem_entrega: number | null
          peso: number | null
          peso_manual: boolean
          peso_original: number | null
          placa: string | null
          preco_total: number | null
          preco_unitario: number | null
          quantidade: number | null
          quantidade_original: number | null
          row_op_key: string | null
          ruptura: boolean
          ruptura_sinalizada: boolean
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
          motivo_ruptura?: string | null
          motorista?: string | null
          nome_carga?: string | null
          nome_produto?: string | null
          numero_pedido?: number | null
          observacoes?: string | null
          operation_id?: string | null
          ordem_entrega?: number | null
          peso?: number | null
          peso_manual?: boolean
          peso_original?: number | null
          placa?: string | null
          preco_total?: number | null
          preco_unitario?: number | null
          quantidade?: number | null
          quantidade_original?: number | null
          row_op_key?: string | null
          ruptura?: boolean
          ruptura_sinalizada?: boolean
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
          motivo_ruptura?: string | null
          motorista?: string | null
          nome_carga?: string | null
          nome_produto?: string | null
          numero_pedido?: number | null
          observacoes?: string | null
          operation_id?: string | null
          ordem_entrega?: number | null
          peso?: number | null
          peso_manual?: boolean
          peso_original?: number | null
          placa?: string | null
          preco_total?: number | null
          preco_unitario?: number | null
          quantidade?: number | null
          quantidade_original?: number | null
          row_op_key?: string | null
          ruptura?: boolean
          ruptura_sinalizada?: boolean
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
      cep_cache: {
        Row: {
          cep: string
          cidade: string
          uf: string
          updated_at: string
        }
        Insert: {
          cep: string
          cidade: string
          uf: string
          updated_at?: string
        }
        Update: {
          cep?: string
          cidade?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          codigo_cliente: string
          created_at: string
          id: string
          nome_cliente: string
          uf: string | null
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          codigo_cliente: string
          created_at?: string
          id?: string
          nome_cliente: string
          uf?: string | null
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          codigo_cliente?: string
          created_at?: string
          id?: string
          nome_cliente?: string
          uf?: string | null
        }
        Relationships: []
      }
      data_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          record_counts: Json
          snapshot_data: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          record_counts?: Json
          snapshot_data?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          record_counts?: Json
          snapshot_data?: Json
        }
        Relationships: []
      }
      geocode_cache: {
        Row: {
          cidade: string
          lat: number
          lng: number
          uf: string
        }
        Insert: {
          cidade: string
          lat: number
          lng: number
          uf: string
        }
        Update: {
          cidade?: string
          lat?: number
          lng?: number
          uf?: string
        }
        Relationships: []
      }
      motoristas: {
        Row: {
          ativo: boolean
          cpf: string | null
          created_at: string
          foto_documento_url: string | null
          foto_motorista_url: string | null
          id: string
          nome_completo: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          foto_documento_url?: string | null
          foto_motorista_url?: string | null
          id?: string
          nome_completo: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          foto_documento_url?: string | null
          foto_motorista_url?: string | null
          id?: string
          nome_completo?: string
          telefone?: string | null
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
          etapa_carga_propria: string | null
          etapa_terceirizado: string | null
          foto_documento_url: string | null
          foto_lacre_url: string | null
          foto_nota_url: string | null
          foto_painel_saida_url: string | null
          foto_painel_url: string | null
          foto_placa_url: string | null
          horario_chegada: string | null
          horario_entrada: string | null
          horario_previsto_saida: string | null
          horario_real_retorno: string | null
          horario_real_saida: string | null
          horario_saida_final: string | null
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
          tipo_caminhao: string | null
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
          etapa_carga_propria?: string | null
          etapa_terceirizado?: string | null
          foto_documento_url?: string | null
          foto_lacre_url?: string | null
          foto_nota_url?: string | null
          foto_painel_saida_url?: string | null
          foto_painel_url?: string | null
          foto_placa_url?: string | null
          horario_chegada?: string | null
          horario_entrada?: string | null
          horario_previsto_saida?: string | null
          horario_real_retorno?: string | null
          horario_real_saida?: string | null
          horario_saida_final?: string | null
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
          tipo_caminhao?: string | null
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
          etapa_carga_propria?: string | null
          etapa_terceirizado?: string | null
          foto_documento_url?: string | null
          foto_lacre_url?: string | null
          foto_nota_url?: string | null
          foto_painel_saida_url?: string | null
          foto_painel_url?: string | null
          foto_placa_url?: string | null
          horario_chegada?: string | null
          horario_entrada?: string | null
          horario_previsto_saida?: string | null
          horario_real_retorno?: string | null
          horario_real_saida?: string | null
          horario_saida_final?: string | null
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
          tipo_caminhao?: string | null
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
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      portal_tokens: {
        Row: {
          carga_id: string
          created_at: string
          criado_por: string | null
          expires_at: string
          id: string
          motorista: string | null
          nome_carga: string | null
          placa: string | null
          token: string
          transportadora: string | null
        }
        Insert: {
          carga_id: string
          created_at?: string
          criado_por?: string | null
          expires_at?: string
          id?: string
          motorista?: string | null
          nome_carga?: string | null
          placa?: string | null
          token: string
          transportadora?: string | null
        }
        Update: {
          carga_id?: string
          created_at?: string
          criado_por?: string | null
          expires_at?: string
          id?: string
          motorista?: string | null
          nome_carga?: string | null
          placa?: string | null
          token?: string
          transportadora?: string | null
        }
        Relationships: []
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
      route_cache: {
        Row: {
          cache_key: string
          created_at: string
          destinos: Json
          duracao_min: number | null
          geometry: Json | null
          hit_count: number
          id: string
          km_total: number | null
          last_used_at: string
          ordem_otimizada: Json | null
          origem: string
          provider: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string
          destinos?: Json
          duracao_min?: number | null
          geometry?: Json | null
          hit_count?: number
          id?: string
          km_total?: number | null
          last_used_at?: string
          ordem_otimizada?: Json | null
          origem: string
          provider?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string
          destinos?: Json
          duracao_min?: number | null
          geometry?: Json | null
          hit_count?: number
          id?: string
          km_total?: number | null
          last_used_at?: string
          ordem_otimizada?: Json | null
          origem?: string
          provider?: string | null
        }
        Relationships: []
      }
      route_templates: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          origem: string
          paradas: Json
          times_used: number
          tipo_caminhao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          origem: string
          paradas?: Json
          times_used?: number
          tipo_caminhao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          origem?: string
          paradas?: Json
          times_used?: number
          tipo_caminhao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tipos_caminhao: {
        Row: {
          consumo_km_litro: number | null
          created_at: string
          id: string
          nome_tipo: string
        }
        Insert: {
          consumo_km_litro?: number | null
          created_at?: string
          id?: string
          nome_tipo: string
        }
        Update: {
          consumo_km_litro?: number | null
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
      veiculos_esperados: {
        Row: {
          ajudantes: string | null
          autorizado_em: string | null
          autorizado_por: string | null
          carga_id: string | null
          conferido: boolean
          conferido_em: string | null
          conferido_por: string | null
          created_at: string
          criado_por: string | null
          data_referencia: string
          destino: string | null
          grupo: string
          id: string
          motivo_recusa: string | null
          motorista: string | null
          observacoes: string | null
          peso: number | null
          placa: string
          qtd_entregas: number | null
          status_autorizacao: string
          tipo_veiculo: string | null
          transportadora: string | null
          walk_in: boolean
        }
        Insert: {
          ajudantes?: string | null
          autorizado_em?: string | null
          autorizado_por?: string | null
          carga_id?: string | null
          conferido?: boolean
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string
          criado_por?: string | null
          data_referencia?: string
          destino?: string | null
          grupo?: string
          id?: string
          motivo_recusa?: string | null
          motorista?: string | null
          observacoes?: string | null
          peso?: number | null
          placa: string
          qtd_entregas?: number | null
          status_autorizacao?: string
          tipo_veiculo?: string | null
          transportadora?: string | null
          walk_in?: boolean
        }
        Update: {
          ajudantes?: string | null
          autorizado_em?: string | null
          autorizado_por?: string | null
          carga_id?: string | null
          conferido?: boolean
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string
          criado_por?: string | null
          data_referencia?: string
          destino?: string | null
          grupo?: string
          id?: string
          motivo_recusa?: string | null
          motorista?: string | null
          observacoes?: string | null
          peso?: number | null
          placa?: string
          qtd_entregas?: number | null
          status_autorizacao?: string
          tipo_veiculo?: string | null
          transportadora?: string | null
          walk_in?: boolean
        }
        Relationships: []
      }
      vendedor_users: {
        Row: {
          created_at: string
          user_id: string
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          vendedor_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendedor_users_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: true
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
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
      get_my_vendedor_id: { Args: never; Returns: string }
      get_portal_data_public: { Args: { _token: string }; Returns: Json }
      get_portal_token_public: {
        Args: { _token: string }
        Returns: {
          carga_id: string
          expires_at: string
          motorista: string
          nome_carga: string
          placa: string
          transportadora: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit:
        | {
            Args: {
              _action: string
              _changes?: Json
              _entity_id: string
              _entity_type: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _action: string
              _changes?: Json
              _entity_id: string
              _entity_type: string
              _logical_entity_id?: string
              _logical_entity_type?: string
              _operation_id?: string
            }
            Returns: undefined
          }
      next_numero_pedido: { Args: { _data: string }; Returns: number }
      notify_role: {
        Args: {
          _entity_id?: string
          _entity_type?: string
          _message: string
          _role: Database["public"]["Enums"]["app_role"]
          _title: string
          _type?: string
        }
        Returns: undefined
      }
      sync_clients_to_orders: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "logistica" | "faturamento" | "portaria" | "vendedor"
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
      app_role: ["admin", "logistica", "faturamento", "portaria", "vendedor"],
    },
  },
} as const
