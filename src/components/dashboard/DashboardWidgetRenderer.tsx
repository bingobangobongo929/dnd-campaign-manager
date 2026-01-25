'use client'

import { ReactNode } from 'react'
import type { DmWidgetId, PlayerWidgetId } from '@/hooks/useDashboardPreferences'

interface DashboardWidgetRendererProps {
  widgetOrder: readonly (DmWidgetId | PlayerWidgetId)[]
  visibleWidgets: readonly (DmWidgetId | PlayerWidgetId)[]
  renderWidget: (widgetId: DmWidgetId | PlayerWidgetId) => ReactNode | null
}

// Group widgets that should be rendered together in rows
const DM_WIDGET_GROUPS: { [key: string]: DmWidgetId[] } = {
  row1: ['quickActions', 'latestSession', 'campaignStats'],
  row2: ['recentEvents', 'recentSessions'],
  row3: ['intelligenceStatus', 'dmToolbox'],
}

const PLAYER_WIDGET_GROUPS: { [key: string]: PlayerWidgetId[] } = {
  row1: ['quickActions', 'recentSessions'],
}

export function DashboardWidgetRenderer({
  widgetOrder,
  visibleWidgets,
  renderWidget,
}: DashboardWidgetRendererProps) {
  // Filter to only visible widgets and maintain order
  const orderedVisibleWidgets = widgetOrder.filter(w =>
    visibleWidgets.includes(w)
  )

  return (
    <div className="space-y-6">
      {orderedVisibleWidgets.map(widgetId => {
        const rendered = renderWidget(widgetId)
        if (!rendered) return null
        return <div key={widgetId}>{rendered}</div>
      })}
    </div>
  )
}

// Simpler renderer that just renders in order
export function SimpleWidgetRenderer({
  widgetOrder,
  visibleWidgets,
  widgets,
}: {
  widgetOrder: readonly string[]
  visibleWidgets: readonly string[]
  widgets: { [key: string]: ReactNode }
}) {
  // Filter to only visible widgets and maintain order
  const orderedVisibleWidgets = widgetOrder.filter(w =>
    visibleWidgets.includes(w) && widgets[w]
  )

  return (
    <>
      {orderedVisibleWidgets.map(widgetId => (
        <div key={widgetId}>{widgets[widgetId]}</div>
      ))}
    </>
  )
}
