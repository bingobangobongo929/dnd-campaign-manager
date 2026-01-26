'use client'

import React, { ReactNode } from 'react'
import { ContentContext, useContentLoader, ContentType } from '@/hooks/useContent'

interface ContentProviderProps {
  children: ReactNode
  contentId: string
  contentType: ContentType
}

/**
 * ContentProvider wraps pages/components that need access to unified content (campaign or oneshot).
 *
 * Usage:
 * ```tsx
 * <ContentProvider contentId={id} contentType="campaign">
 *   <MyComponent />
 * </ContentProvider>
 * ```
 *
 * Then in child components:
 * ```tsx
 * const { content, campaignId, oneshotId, isOwner } = useContent()
 * ```
 */
export function ContentProvider({ children, contentId, contentType }: ContentProviderProps) {
  const value = useContentLoader(contentId, contentType)

  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  )
}

/**
 * Higher-order component for wrapping page components with ContentProvider.
 *
 * Usage:
 * ```tsx
 * function MyPage({ params }: { params: { id: string } }) {
 *   return <div>...</div>
 * }
 *
 * export default withContent(MyPage, 'campaign')
 * ```
 */
export function withContent<P extends { params: { id: string } }>(
  Component: React.ComponentType<P>,
  contentType: ContentType
) {
  return function WithContentWrapper(props: P) {
    const contentId = props.params.id

    return (
      <ContentProvider contentId={contentId} contentType={contentType}>
        <Component {...props} />
      </ContentProvider>
    )
  }
}

export default ContentProvider
