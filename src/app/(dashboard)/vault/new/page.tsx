import { CharacterEditor } from '@/components/vault/CharacterEditor'
import { cookies } from 'next/headers'

// Force dynamic by using cookies (server-side function)
export default async function NewVaultCharacterPage() {
  // This forces the page to be dynamic
  await cookies()

  return <CharacterEditor mode="create" />
}
