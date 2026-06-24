import type { Database, NotificacaoStatus } from '@/lib/database.types'

export type Produto = Database['public']['Tables']['produtos']['Row']
export type Contato = Database['public']['Tables']['contatos']['Row']
export type WishlistItem = Database['public']['Tables']['wishlist']['Row']
export type Notificacao = Database['public']['Tables']['notificacoes']['Row']

export type { NotificacaoStatus }

// contato com os produtos que ele deseja (join wishlist -> produtos)
export type ContatoComDesejos = Contato & {
  desejos: Produto[]
}
