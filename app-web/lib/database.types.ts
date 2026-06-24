// Tipos do banco PDFinder — espelham o schema em supabase/migrations/001_baseline_schema.sql
// Pode regenerar com: supabase gen types typescript --project-id <id> > lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type NotificacaoStatus = 'pendente' | 'enviado' | 'erro' | 'ignorado'

export type Database = {
  public: {
    Tables: {
      produtos: {
        Row: {
          id: string
          user_id: string
          nome: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          created_at?: string
        }
      }
      contatos: {
        Row: {
          id: string
          user_id: string
          nome: string
          telefone: string
          opt_in: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nome: string
          telefone: string
          opt_in?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nome?: string
          telefone?: string
          opt_in?: boolean
          created_at?: string
        }
      }
      wishlist: {
        Row: {
          id: string
          user_id: string
          contato_id: string
          produto_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contato_id: string
          produto_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contato_id?: string
          produto_id?: string
          created_at?: string
        }
      }
      notificacoes: {
        Row: {
          id: string
          user_id: string
          contato_id: string | null
          produto_id: string | null
          pdf_origem: string | null
          status: NotificacaoStatus
          erro: string | null
          enviado_em: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contato_id?: string | null
          produto_id?: string | null
          pdf_origem?: string | null
          status?: NotificacaoStatus
          erro?: string | null
          enviado_em?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          contato_id?: string | null
          produto_id?: string | null
          pdf_origem?: string | null
          status?: NotificacaoStatus
          erro?: string | null
          enviado_em?: string | null
          created_at?: string
        }
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
  }
}
