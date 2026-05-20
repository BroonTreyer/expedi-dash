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
      adiantamentos_frete: {
        Row: {
          comprovante_pagamento_url: string | null
          comprovante_quitacao_url: string | null
          created_at: string
          created_by: string | null
          id: string
          numero: string
          observacoes: string | null
          ordem_carga: string | null
          pago_em: string | null
          pago_por: string | null
          percentual: number
          peso_total: number
          qtd_ctes: number
          quitado_em: string | null
          quitado_por: string | null
          status: string
          tipo_agrupamento: string
          transportadora: string
          transportadora_id: string | null
          updated_at: string
          valor_adiantamento: number
          valor_saldo: number
          valor_total_ctes: number
        }
        Insert: {
          comprovante_pagamento_url?: string | null
          comprovante_quitacao_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          numero: string
          observacoes?: string | null
          ordem_carga?: string | null
          pago_em?: string | null
          pago_por?: string | null
          percentual?: number
          peso_total?: number
          qtd_ctes?: number
          quitado_em?: string | null
          quitado_por?: string | null
          status?: string
          tipo_agrupamento?: string
          transportadora: string
          transportadora_id?: string | null
          updated_at?: string
          valor_adiantamento?: number
          valor_saldo?: number
          valor_total_ctes?: number
        }
        Update: {
          comprovante_pagamento_url?: string | null
          comprovante_quitacao_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          numero?: string
          observacoes?: string | null
          ordem_carga?: string | null
          pago_em?: string | null
          pago_por?: string | null
          percentual?: number
          peso_total?: number
          qtd_ctes?: number
          quitado_em?: string | null
          quitado_por?: string | null
          status?: string
          tipo_agrupamento?: string
          transportadora?: string
          transportadora_id?: string | null
          updated_at?: string
          valor_adiantamento?: number
          valor_saldo?: number
          valor_total_ctes?: number
        }
        Relationships: [
          {
            foreignKeyName: "adiantamentos_frete_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "transportadoras_financeiro"
            referencedColumns: ["id"]
          },
        ]
      }
      adiantamentos_frete_ctes: {
        Row: {
          adiantamento_id: string
          created_at: string
          cte_id: string
          id: string
          valor_frete: number
        }
        Insert: {
          adiantamento_id: string
          created_at?: string
          cte_id: string
          id?: string
          valor_frete?: number
        }
        Update: {
          adiantamento_id?: string
          created_at?: string
          cte_id?: string
          id?: string
          valor_frete?: number
        }
        Relationships: [
          {
            foreignKeyName: "adiantamentos_frete_ctes_adiantamento_id_fkey"
            columns: ["adiantamento_id"]
            isOneToOne: false
            referencedRelation: "adiantamentos_frete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adiantamentos_frete_ctes_cte_id_fkey"
            columns: ["cte_id"]
            isOneToOne: false
            referencedRelation: "ctes_dacte"
            referencedColumns: ["id"]
          },
        ]
      }
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
          forma_pagamento: string | null
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
          ordem_carga: string | null
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
          forma_pagamento?: string | null
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
          ordem_carga?: string | null
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
          forma_pagamento?: string | null
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
          ordem_carga?: string | null
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
      combustivel_precos: {
        Row: {
          atualizado_em: string
          fonte: string | null
          id: string
          tipo: string
          uf: string
          valor_litro: number
        }
        Insert: {
          atualizado_em?: string
          fonte?: string | null
          id?: string
          tipo?: string
          uf: string
          valor_litro: number
        }
        Update: {
          atualizado_em?: string
          fonte?: string | null
          id?: string
          tipo?: string
          uf?: string
          valor_litro?: number
        }
        Relationships: []
      }
      ctes_dacte: {
        Row: {
          carga_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          destino_cidade: string | null
          destino_uf: string | null
          id: string
          notas_fiscais: Json
          numero_cte: string
          ordem_carga: string | null
          pdf_url: string | null
          peso_total: number | null
          placa: string | null
          raw_extracao: Json | null
          serie: string | null
          status: string
          transportadora: string | null
          updated_at: string
          valor_frete: number
        }
        Insert: {
          carga_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          destino_cidade?: string | null
          destino_uf?: string | null
          id?: string
          notas_fiscais?: Json
          numero_cte: string
          ordem_carga?: string | null
          pdf_url?: string | null
          peso_total?: number | null
          placa?: string | null
          raw_extracao?: Json | null
          serie?: string | null
          status?: string
          transportadora?: string | null
          updated_at?: string
          valor_frete?: number
        }
        Update: {
          carga_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          destino_cidade?: string | null
          destino_uf?: string | null
          id?: string
          notas_fiscais?: Json
          numero_cte?: string
          ordem_carga?: string | null
          pdf_url?: string | null
          peso_total?: number | null
          placa?: string | null
          raw_extracao?: Json | null
          serie?: string | null
          status?: string
          transportadora?: string | null
          updated_at?: string
          valor_frete?: number
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
      mp_fornecedores: {
        Row: {
          ativo: boolean
          cidade: string | null
          cnpj_cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mp_produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo: string | null
          created_at: string
          id: string
          nome: string
          preco_referencia_ton: number
          unidade_padrao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          id?: string
          nome: string
          preco_referencia_ton?: number
          unidade_padrao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          id?: string
          nome?: string
          preco_referencia_ton?: number
          unidade_padrao?: string
          updated_at?: string
        }
        Relationships: []
      }
      mp_recebimento_itens: {
        Row: {
          categoria: string | null
          created_at: string
          id: string
          nome_produto: string
          nota_fiscal: string | null
          ordem: number | null
          peso_confirmado: boolean
          peso_ton: number
          produto_id: string | null
          recebimento_id: string
          updated_at: string
          valor_total_linha: number
          valor_unitario_ton: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          id?: string
          nome_produto: string
          nota_fiscal?: string | null
          ordem?: number | null
          peso_confirmado?: boolean
          peso_ton?: number
          produto_id?: string | null
          recebimento_id: string
          updated_at?: string
          valor_total_linha?: number
          valor_unitario_ton?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          id?: string
          nome_produto?: string
          nota_fiscal?: string | null
          ordem?: number | null
          peso_confirmado?: boolean
          peso_ton?: number
          produto_id?: string | null
          recebimento_id?: string
          updated_at?: string
          valor_total_linha?: number
          valor_unitario_ton?: number
        }
        Relationships: [
          {
            foreignKeyName: "mp_recebimento_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "mp_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mp_recebimento_itens_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "mp_recebimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_recebimentos: {
        Row: {
          comprovante_url: string | null
          conferente: string | null
          cpf: string | null
          created_at: string
          criado_por: string | null
          data_chegada: string
          data_descarga: string | null
          data_recebimento: string | null
          doca_setor: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          foto_nota_url: string | null
          hora_chegada: string | null
          id: string
          mes_fechado: boolean
          motorista: string | null
          observacoes: string | null
          pagamento_status: string
          pago_em: string | null
          pago_por: string | null
          pallets_devolvidos: boolean | null
          pallets_quantidade: number | null
          peso_total_ton: number
          placa: string | null
          recibo_numero: string | null
          status_geral: string
          telefone: string | null
          tipo_veiculo: string | null
          updated_at: string
          valor_total: number
        }
        Insert: {
          comprovante_url?: string | null
          conferente?: string | null
          cpf?: string | null
          created_at?: string
          criado_por?: string | null
          data_chegada?: string
          data_descarga?: string | null
          data_recebimento?: string | null
          doca_setor?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          foto_nota_url?: string | null
          hora_chegada?: string | null
          id?: string
          mes_fechado?: boolean
          motorista?: string | null
          observacoes?: string | null
          pagamento_status?: string
          pago_em?: string | null
          pago_por?: string | null
          pallets_devolvidos?: boolean | null
          pallets_quantidade?: number | null
          peso_total_ton?: number
          placa?: string | null
          recibo_numero?: string | null
          status_geral?: string
          telefone?: string | null
          tipo_veiculo?: string | null
          updated_at?: string
          valor_total?: number
        }
        Update: {
          comprovante_url?: string | null
          conferente?: string | null
          cpf?: string | null
          created_at?: string
          criado_por?: string | null
          data_chegada?: string
          data_descarga?: string | null
          data_recebimento?: string | null
          doca_setor?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          foto_nota_url?: string | null
          hora_chegada?: string | null
          id?: string
          mes_fechado?: boolean
          motorista?: string | null
          observacoes?: string | null
          pagamento_status?: string
          pago_em?: string | null
          pago_por?: string | null
          pallets_devolvidos?: boolean | null
          pallets_quantidade?: number | null
          peso_total_ton?: number
          placa?: string | null
          recibo_numero?: string | null
          status_geral?: string
          telefone?: string | null
          tipo_veiculo?: string | null
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "mp_recebimentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "mp_fornecedores"
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
      ocorrencias_carga: {
        Row: {
          carga_id: string | null
          created_at: string
          data_carga: string | null
          id: string
          motivo: string
          motorista: string | null
          nome_carga: string | null
          observacao: string | null
          peso_total: number | null
          placa: string | null
          qtd_pedidos: number | null
          registrado_por: string | null
          registrado_por_email: string | null
          tipo: string
          transportadora: string | null
        }
        Insert: {
          carga_id?: string | null
          created_at?: string
          data_carga?: string | null
          id?: string
          motivo: string
          motorista?: string | null
          nome_carga?: string | null
          observacao?: string | null
          peso_total?: number | null
          placa?: string | null
          qtd_pedidos?: number | null
          registrado_por?: string | null
          registrado_por_email?: string | null
          tipo?: string
          transportadora?: string | null
        }
        Update: {
          carga_id?: string | null
          created_at?: string
          data_carga?: string | null
          id?: string
          motivo?: string
          motorista?: string | null
          nome_carga?: string | null
          observacao?: string | null
          peso_total?: number | null
          placa?: string | null
          qtd_pedidos?: number | null
          registrado_por?: string | null
          registrado_por_email?: string | null
          tipo?: string
          transportadora?: string | null
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
      rotas_executadas: {
        Row: {
          atualizado_em: string
          carga_id: string
          criado_em: string
          criado_por: string | null
          custo_planejado: number | null
          custo_real: number | null
          data_referencia: string
          duracao_planejada_min: number | null
          duracao_real_min: number | null
          id: string
          km_planejado: number | null
          km_real: number | null
          ordem_planejada: Json | null
          origem: string | null
          provider: string | null
          tipo_caminhao: string | null
        }
        Insert: {
          atualizado_em?: string
          carga_id: string
          criado_em?: string
          criado_por?: string | null
          custo_planejado?: number | null
          custo_real?: number | null
          data_referencia?: string
          duracao_planejada_min?: number | null
          duracao_real_min?: number | null
          id?: string
          km_planejado?: number | null
          km_real?: number | null
          ordem_planejada?: Json | null
          origem?: string | null
          provider?: string | null
          tipo_caminhao?: string | null
        }
        Update: {
          atualizado_em?: string
          carga_id?: string
          criado_em?: string
          criado_por?: string | null
          custo_planejado?: number | null
          custo_real?: number | null
          data_referencia?: string
          duracao_planejada_min?: number | null
          duracao_real_min?: number | null
          id?: string
          km_planejado?: number | null
          km_real?: number | null
          ordem_planejada?: Json | null
          origem?: string | null
          provider?: string | null
          tipo_caminhao?: string | null
        }
        Relationships: []
      }
      route_cache: {
        Row: {
          cache_key: string
          created_at: string
          destinos: Json
          duracao_min: number | null
          duracao_min_real: number | null
          geometry: Json | null
          hit_count: number
          id: string
          km_total: number | null
          last_used_at: string
          ordem_otimizada: Json | null
          origem: string
          pedagios: Json | null
          provider: string | null
        }
        Insert: {
          cache_key: string
          created_at?: string
          destinos?: Json
          duracao_min?: number | null
          duracao_min_real?: number | null
          geometry?: Json | null
          hit_count?: number
          id?: string
          km_total?: number | null
          last_used_at?: string
          ordem_otimizada?: Json | null
          origem: string
          pedagios?: Json | null
          provider?: string | null
        }
        Update: {
          cache_key?: string
          created_at?: string
          destinos?: Json
          duracao_min?: number | null
          duracao_min_real?: number | null
          geometry?: Json | null
          hit_count?: number
          id?: string
          km_total?: number | null
          last_used_at?: string
          ordem_otimizada?: Json | null
          origem?: string
          pedagios?: Json | null
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
      tabela_frete: {
        Row: {
          ativo: boolean
          created_at: string
          destino_cidade: string
          destino_uf: string
          id: string
          tipo_veiculo: string
          updated_at: string
          valor_kg: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          destino_cidade: string
          destino_uf: string
          id?: string
          tipo_veiculo: string
          updated_at?: string
          valor_kg?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          destino_cidade?: string
          destino_uf?: string
          id?: string
          tipo_veiculo?: string
          updated_at?: string
          valor_kg?: number
        }
        Relationships: []
      }
      tabelas_frete: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      tabelas_frete_itens: {
        Row: {
          ativo: boolean
          codigo_cliente: string | null
          created_at: string
          destino_cidade: string | null
          destino_uf: string
          id: string
          tabela_id: string
          updated_at: string
          valor_kg_bitruck: number
          valor_kg_carreta: number
        }
        Insert: {
          ativo?: boolean
          codigo_cliente?: string | null
          created_at?: string
          destino_cidade?: string | null
          destino_uf: string
          id?: string
          tabela_id: string
          updated_at?: string
          valor_kg_bitruck?: number
          valor_kg_carreta?: number
        }
        Update: {
          ativo?: boolean
          codigo_cliente?: string | null
          created_at?: string
          destino_cidade?: string | null
          destino_uf?: string
          id?: string
          tabela_id?: string
          updated_at?: string
          valor_kg_bitruck?: number
          valor_kg_carreta?: number
        }
        Relationships: [
          {
            foreignKeyName: "tabelas_frete_itens_tabela_id_fkey"
            columns: ["tabela_id"]
            isOneToOne: false
            referencedRelation: "tabelas_frete"
            referencedColumns: ["id"]
          },
        ]
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
      transportadoras_financeiro: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string | null
          cnpj: string | null
          codigo: string | null
          conta: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          observacoes: string | null
          percentual_adiantamento_padrao: number
          pix_chave: string | null
          pix_tipo: string | null
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          cnpj?: string | null
          codigo?: string | null
          conta?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          percentual_adiantamento_padrao?: number
          pix_chave?: string | null
          pix_tipo?: string | null
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          cnpj?: string | null
          codigo?: string | null
          conta?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          percentual_adiantamento_padrao?: number
          pix_chave?: string | null
          pix_tipo?: string | null
          updated_at?: string
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
      vendedor_tabelas_frete: {
        Row: {
          created_at: string
          tabela_id: string
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          tabela_id: string
          vendedor_id: string
        }
        Update: {
          created_at?: string
          tabela_id?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendedor_tabelas_frete_tabela_id_fkey"
            columns: ["tabela_id"]
            isOneToOne: false
            referencedRelation: "tabelas_frete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendedor_tabelas_frete_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
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
      mp_compras_mensal_produto: {
        Row: {
          ano: number | null
          categoria: string | null
          mes: string | null
          mes_num: number | null
          preco_medio_ton: number | null
          produto_id: string | null
          produto_nome: string | null
          qtd_descargas: number | null
          qtd_fornecedores: number | null
          ton: number | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_recebimento_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "mp_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_evolucao_preco_produto: {
        Row: {
          dia: string | null
          linhas: number | null
          preco_max_ton: number | null
          preco_medio_ton: number | null
          preco_min_ton: number | null
          produto_id: string | null
          produto_nome: string | null
          ton: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_recebimento_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "mp_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      mp_fechamento_fornecedor: {
        Row: {
          fornecedor_id: string | null
          fornecedor_nome: string | null
          mes: string | null
          qtd_recebimentos: number | null
          ton: number | null
          valor: number | null
          valor_pago: number | null
          valor_pendente: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mp_recebimentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "mp_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
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
      mp_next_recibo: { Args: { _data: string }; Returns: string }
      next_adiantamento_numero: { Args: never; Returns: string }
      next_numero_pedido: { Args: { _data: string }; Returns: number }
      next_recibo_mp: { Args: { _data: string }; Returns: string }
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
      reabrir_como_walk_in: {
        Args: {
          p_categoria_destino?: string
          p_grupo?: string
          p_movimento_id: string
        }
        Returns: undefined
      }
      sync_clients_to_orders: { Args: never; Returns: Json }
    }
    Enums: {
      app_role:
        | "admin"
        | "logistica"
        | "faturamento"
        | "portaria"
        | "vendedor"
        | "expedicao"
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
      app_role: [
        "admin",
        "logistica",
        "faturamento",
        "portaria",
        "vendedor",
        "expedicao",
      ],
    },
  },
} as const
