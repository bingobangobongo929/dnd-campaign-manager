import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignPage({ params }: PageProps) {
  const { id } = await params
  redirect(`/campaigns/${id}/dashboard`)
}
