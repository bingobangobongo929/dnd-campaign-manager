import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params
  const supabase = createAdminClient()

  const { data: character } = await supabase
    .from('vault_characters')
    .select('name, race, class')
    .eq('id', id)
    .single()

  if (!character) {
    return { title: 'Character Not Found' }
  }

  const subtitle = [character.race, character.class].filter(Boolean).join(' ')
  const title = subtitle ? `${character.name} | ${subtitle}` : character.name

  return {
    title,
    description: `Edit and manage ${character.name}'s character sheet, backstory, and more.`,
  }
}

export default function CharacterLayout({ children }: LayoutProps) {
  return <>{children}</>
}
