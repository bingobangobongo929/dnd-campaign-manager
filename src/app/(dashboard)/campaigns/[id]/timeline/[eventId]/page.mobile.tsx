'use client'

import { TimelineEventEditor, type TimelineEventFormData } from '@/components/timeline'
import { AppLayout } from '@/components/layout/app-layout'
import { MobileLayout } from '@/components/mobile'
import { cn } from '@/lib/utils'
import type { Campaign, TimelineEvent, Character, Session } from '@/types/database'

export interface CampaignTimelineEventPageMobileProps {
  campaignId: string
  campaign: Campaign | null
  event: TimelineEvent | null
  characters: Character[]
  sessions: Session[]
  loading: boolean
  formData: TimelineEventFormData
  setFormData: (data: TimelineEventFormData) => void
  status: 'idle' | 'saving' | 'saved'
}

export function CampaignTimelineEventPageMobile({
  campaignId,
  campaign,
  event,
  characters,
  sessions,
  loading,
  formData,
  setFormData,
  status,
}: CampaignTimelineEventPageMobileProps) {
  if (loading || !event) {
    return (
      <AppLayout campaignId={campaignId}>
        <MobileLayout title="Event" showBackButton backHref={`/campaigns/${campaignId}/timeline`}>
          <div className="flex items-center justify-center h-[60vh]">
            <div className="w-10 h-10 border-2 border-[--arcane-purple] border-t-transparent rounded-full spinner" />
          </div>
        </MobileLayout>
      </AppLayout>
    )
  }

  return (
    <AppLayout campaignId={campaignId}>
      <MobileLayout
        title="Edit Event"
        showBackButton
        backHref={`/campaigns/${campaignId}/timeline`}
        actions={
          <span className={cn(
            "text-xs px-2 py-1 rounded transition-opacity",
            status === 'saving' ? 'text-gray-400 bg-white/5' : 'text-gray-500'
          )}>
            {status === 'saving' && 'Saving...'}
            {status === 'saved' && 'Saved'}
            {status === 'idle' && 'Saved'}
          </span>
        }
      >
        <div className="px-4 pb-24">
          {/* Campaign Context */}
          {campaign && (
            <p className="text-xs text-gray-500 mb-4">
              <span className="text-[--arcane-purple]">{campaign.name}</span>
              <span className="mx-2">/</span>
              <span>Timeline Event</span>
            </p>
          )}

          {/* Editor */}
          <TimelineEventEditor
            formData={formData}
            onChange={setFormData}
            characters={characters}
            sessions={sessions}
            mode="full"
          />
        </div>
      </MobileLayout>
    </AppLayout>
  )
}
