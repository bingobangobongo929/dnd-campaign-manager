/**
 * Unified Components
 *
 * These components work for both campaigns AND oneshots using the unified content system.
 *
 * Pattern:
 * 1. Wrap with ContentProvider: <ContentProvider contentId={id} contentType="campaign">
 * 2. Use useContent() for content data
 * 3. Use useContentQuery() for building database queries
 * 4. Use useContentPermissions() for permission checks
 */

export { UnifiedCharacterList } from './UnifiedCharacterList'
