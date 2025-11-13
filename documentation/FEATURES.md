# The Blue Harvest - Features Analysis

## Current Implementation Status

### ✅ Fully Implemented Features

#### 1. User Authentication & Account Management
**Status**: Complete (Frontend + Backend + Database)

**User Capabilities**:
- Create account with email, username, password, first/last name
- Login with username/email and password
- View current user session
- Update profile information (username, first/last name)
- Logout

**Technical Implementation**:
- JWT token-based authentication
- HTTP-only cookies for session management
- Argon2 password hashing
- Form validation (frontend: Zod, backend: express-validator)
- Auth context provider for session state

**Files**:
- Backend: [apps/backend/src/routes/auth.ts](../apps/backend/src/routes/auth.ts)
- Frontend: [apps/frontend/src/app/register/page.tsx](../apps/frontend/src/app/register/page.tsx), [apps/frontend/src/app/profile/page.tsx](../apps/frontend/src/app/profile/page.tsx)
- Database: `accounts`, `user_roles` tables

---

### 🟡 Partially Implemented Features

#### 2. Character/Profile System
**Status**: Database Ready, No Code

**Intended Capabilities**:
- Create multiple profiles per account (character, item, kinship, organization)
- Each profile has a name and flexible JSONB details field
- Attach media to profiles (avatars, images)
- Unique name per account constraint

**Database Schema**:
- ✅ `profiles` table with type system
- ✅ `profile_types` (character, item, kinship, organization)
- ✅ `profile_media` with table inheritance
- ✅ Unique constraint on (account_id, name)

**Missing**:
- ❌ Backend API endpoints (CRUD operations)
- ❌ Frontend UI for profile creation/editing
- ❌ Profile viewing pages
- ❌ Profile listing/discovery

---

#### 3. Posts & Content Creation
**Status**: Database Ready, No Code

**Intended Capabilities**:
- Create posts of different types (story, art, recipe, event, other)
- Flexible JSONB content field for type-specific data
- Multi-author support (collaborative posts)
- Designate primary author
- Attach media to posts

**Database Schema**:
- ✅ `posts` table with JSONB content
- ✅ `post_types` table
- ✅ `authors` junction table (many-to-many posts ↔ profiles)
- ✅ `post_media` table
- ✅ Unique primary author constraint

**Missing**:
- ❌ Backend API endpoints for post CRUD
- ❌ Frontend post creation forms (different types)
- ❌ Post viewing/reading pages
- ❌ Post feed/listing
- ❌ Author management UI

---

#### 4. Comments System
**Status**: Database Ready, No Code

**Intended Capabilities**:
- Comment on posts using character profiles
- Nested/threaded comments (not in current schema)
- Edit/delete comments

**Database Schema**:
- ✅ `comments` table linking posts and profiles
- ✅ Soft delete support

**Missing**:
- ❌ Backend API endpoints
- ❌ Frontend comment components
- ❌ Comment threading (would require parent_comment_id)

---

#### 5. Media & File Management
**Status**: Database Ready, No Code

**Intended Capabilities**:
- Upload images/files for posts, profiles, accounts
- Store in S3 (or similar)
- Track file metadata (size, type, filename)
- Different media types via table inheritance

**Database Schema**:
- ✅ `media` parent table
- ✅ `post_media`, `profile_media`, `account_media` children
- ✅ URL storage for external hosting

**Missing**:
- ❌ File upload API endpoints
- ❌ S3 integration
- ❌ Frontend upload components
- ❌ Image optimization/processing
- ❌ File serving/CDN configuration

---

#### 6. Character Relationships
**Status**: Database Ready, No Code

**Intended Capabilities**:
- Define relationships between character profiles
- Bidirectional types: friend, enemy, ally (mutual)
- Unidirectional types: parent, child, other (directional)
- Enforce relationship consistency

**Database Schema**:
- ✅ `relationships` parent table
- ✅ `bidirectional_relationships` with 'both' direction
- ✅ `unidirectional_relationships` with forward/backward
- ✅ Complex constraints for data integrity
- ✅ Ensures profile_id_1 < profile_id_2

**Missing**:
- ❌ Backend API to create/manage relationships
- ❌ Frontend relationship management UI
- ❌ Relationship visualization (graph/network view?)

---

#### 7. User Roles & Permissions
**Status**: Database Schema Only

**Database Schema**:
- ✅ `user_roles` table (user, admin, moderator)
- ✅ Foreign key in `accounts` table

**Missing**:
- ❌ Role-based access control (RBAC) middleware
- ❌ Permission checks in API endpoints
- ❌ Admin/moderator UI features
- ❌ Role assignment interface

---

#### 8. Soft Delete System
**Status**: Database Schema, No Logic

**Database Schema**:
- ✅ `deleted` boolean on all major tables

**Missing**:
- ❌ Backend filters to exclude deleted records
- ❌ Admin UI to view/restore deleted items
- ❌ Permanent deletion logic
- ❌ Deletion audit trail

---

### 🔵 Frontend UI Only (Not Connected)

#### 9. Events Calendar
**Status**: Static Frontend Component

**Current State**:
- Right sidebar calendar display
- Hardcoded events (Elven Festival, Hall & Fire Workshop, etc.)

**Missing**:
- ❌ Backend event storage
- ❌ Event CRUD operations
- ❌ RSVP system
- ❌ Event notifications

---

#### 10. Activity Feed
**Status**: Static Frontend Component

**Current State**:
- Right sidebar showing user activities
- Hardcoded sample data

**Missing**:
- ❌ Activity tracking system
- ❌ Real-time updates
- ❌ Activity types and storage

---

#### 11. Site Navigation
**Status**: UI Shell Only

**Current State**:
- Left sidebar with navigation links
- Search input box (non-functional)
- Links: Home, News, Writing, Art, Characters, Kinships, About, Rules, Discord

**Missing**:
- ❌ Actual pages for each section
- ❌ Search functionality
- ❌ Content categorization

---

#### 12. Featured Content
**Status**: Static Frontend Component

**Current State**:
- Homepage featured locations (Prancing Pony, Rivendell, Minas Tirith)
- Hardcoded data

**Missing**:
- ❌ Admin interface to feature content
- ❌ Dynamic content rotation
- ❌ Featured post/character system

---

## Critical Feature Analysis

### What's Missing from Current Setup?

#### High-Priority Gaps

1. **Profile/Character System Implementation**
   - Core to RP platform
   - Database ready, needs full implementation
   - Most critical missing feature

2. **Content Creation & Sharing**
   - Posts/stories are the heart of the community
   - Need creation, editing, viewing, listing
   - Multiple post types require different UIs

3. **Media Upload & Management**
   - Essential for character avatars
   - Important for art posts
   - Requires infrastructure setup (S3)

4. **Search & Discovery**
   - Users need to find characters, posts, events
   - Critical for community engagement
   - Not in current schema

5. **Notifications System**
   - Alert users to comments, mentions, events
   - Not in current schema or implementation
   - Essential for engagement

---

## Additional Feature Ideas to Consider

### Community & Social Features

#### 1. Direct Messaging / Private Messages
**Purpose**: Private communication between users

**Requirements**:
- New `messages` table
- Conversation threading
- Read/unread status
- Message notifications

**Priority**: Medium (nice-to-have for community building)

---

#### 2. Following/Subscribers System
**Purpose**: Users follow characters or other users to see their content

**Requirements**:
- `followers` junction table
- Follow/unfollow actions
- Personalized feed based on follows
- Follower count display

**Priority**: Medium-High (improves content discovery)

---

#### 3. Reactions/Likes
**Purpose**: Quick engagement with posts and comments

**Requirements**:
- `reactions` table (could support multiple reaction types)
- Reaction counts
- "Who reacted" display
- Unlike functionality

**Priority**: Medium (enhances engagement)

---

#### 4. Tags/Categories System
**Purpose**: Organize and discover content by topics

**Requirements**:
- `tags` table
- `post_tags` junction table
- `profile_tags` for character traits/categories
- Tag-based search and filtering
- Tag cloud/popular tags

**Priority**: High (critical for content discovery)

---

#### 5. Bookmarks/Favorites
**Purpose**: Users save posts/characters for later

**Requirements**:
- `bookmarks` table linking users to posts/profiles
- Collections/folders for organization
- Bookmark feed page

**Priority**: Low-Medium (quality of life)

---

### Content & Creation Features

#### 6. Drafts System
**Purpose**: Save work-in-progress posts

**Requirements**:
- `is_published` boolean on posts
- Draft visibility (private to author)
- Publish/unpublish actions
- Auto-save functionality

**Priority**: Medium (quality of life for writers)

---

#### 7. Post Revisions/Edit History
**Purpose**: Track changes to posts over time

**Requirements**:
- `post_revisions` table
- Diff viewing
- Restore previous version
- Edit attribution

**Priority**: Low (advanced feature)

---

#### 8. Rich Text Editor
**Purpose**: Better content creation experience

**Requirements**:
- Markdown or WYSIWYG editor
- Image embedding
- Link previews
- Formatting tools

**Priority**: High (user experience)

---

#### 9. Collaborative Writing Tools
**Purpose**: Multiple authors working on same post

**Requirements**:
- Already supported by `authors` table!
- Need UI for inviting co-authors
- Contribution tracking
- Simultaneous editing (conflict resolution)

**Priority**: Medium (unique RP feature)

---

#### 10. Content Moderation
**Purpose**: Report inappropriate content, admin review

**Requirements**:
- `reports` table
- Report reasons
- Moderation queue for moderators
- Ban/suspension system
- Content flagging

**Priority**: High (essential for community safety)

---

### Events & Scheduling

#### 11. Structured Events System
**Purpose**: Beyond static calendar, full event management

**Requirements**:
- `events` table (separate from posts)
- Event types (RP session, OOC gathering, contest, etc.)
- Date/time with timezone support
- RSVP system (`event_attendees` table)
- Event reminders/notifications
- Recurring events

**Priority**: High (core to "Prancing Pony" gatherings concept)

---

#### 12. Calendar Integration
**Purpose**: Export events to external calendars

**Requirements**:
- iCal feed generation
- Google Calendar integration
- Timezone handling

**Priority**: Low (nice-to-have)

---

### Character & RP Specific

#### 13. Character Sheets/Templates
**Purpose**: Structured character information

**Requirements**:
- Predefined fields for character profiles
- Custom fields support (already via JSONB!)
- Character sheet templates (race, class, backstory, etc.)
- Visual character sheet display

**Priority**: Medium-High (RP-specific value)

---

#### 14. Character Journals/Diaries
**Purpose**: In-character blog/journal entries

**Requirements**:
- Could be a post type (already supported!)
- Chronological display
- Character-specific post feed
- Privacy settings (public/private/followers-only)

**Priority**: Medium (unique RP feature)

---

#### 15. RP Session Logs
**Purpose**: Record and archive RP sessions

**Requirements**:
- Session transcript format
- Participant tracking
- Session tagging
- Search within sessions

**Priority**: Low-Medium (archival feature)

---

#### 16. Kinship/Guild Management
**Purpose**: Manage organizations with members, ranks, etc.

**Requirements**:
- Already have `kinship` profile type!
- `kinship_members` junction table
- Rank/role system within kinship
- Kinship posts/announcements
- Recruitment system

**Priority**: Medium (community building)

---

### Discovery & Engagement

#### 17. Trending/Popular Content
**Purpose**: Surface popular posts and characters

**Requirements**:
- Engagement metrics (views, comments, likes)
- Trending algorithm
- "Hot" vs "New" sorting
- Time-based trending (today, this week, all time)

**Priority**: Medium (improves discovery)

---

#### 18. User Profiles & Stats
**Purpose**: Public user pages with activity

**Requirements**:
- User profile pages (separate from character profiles)
- Activity stats (posts, comments, characters)
- Join date, badges, achievements
- User bio

**Priority**: Medium (community identity)

---

#### 19. Advanced Search
**Purpose**: Find specific content/characters

**Requirements**:
- Full-text search (PostgreSQL `tsvector`)
- Filter by type, date, author, tags
- Character attribute search
- Search suggestions/autocomplete

**Priority**: High (essential as content grows)

---

#### 20. Recommendations
**Purpose**: Suggest relevant content to users

**Requirements**:
- "Similar characters" based on attributes
- "You might like" posts based on history
- Related content suggestions

**Priority**: Low (advanced feature)

---

### Technical & Admin

#### 21. Audit Logs
**Purpose**: Track system changes for security/debugging

**Requirements**:
- `audit_log` table
- Track CRUD operations
- User action history
- Admin access logs

**Priority**: Medium (security/compliance)

---

#### 22. Analytics Dashboard
**Purpose**: Insights for admins

**Requirements**:
- User growth metrics
- Content creation trends
- Engagement statistics
- Active users tracking

**Priority**: Low (admin tool)

---

#### 23. Email System
**Purpose**: Transactional and notification emails

**Requirements**:
- Email verification for signup
- Password reset emails
- Notification emails (configurable)
- Email templates
- Email service integration (SendGrid, etc.)

**Priority**: High (account security)

---

#### 24. API Rate Limiting
**Purpose**: Prevent abuse

**Requirements**:
- Already have express-rate-limit package!
- Configure limits per endpoint
- User-based rate limits
- IP-based limits

**Priority**: Medium (security)

---

#### 25. Two-Factor Authentication
**Purpose**: Enhanced account security

**Requirements**:
- TOTP implementation
- Backup codes
- 2FA setup UI
- Recovery process

**Priority**: Low-Medium (security enhancement)

---

### Mobile & Accessibility

#### 26. Progressive Web App (PWA)
**Purpose**: Mobile app experience

**Requirements**:
- Service worker
- Offline support
- Install prompt
- Push notifications

**Priority**: Low-Medium (mobile experience)

---

#### 27. Accessibility Features
**Purpose**: WCAG compliance

**Requirements**:
- Screen reader optimization
- Keyboard navigation
- High contrast mode
- Alt text requirements for images

**Priority**: High (inclusive design)

---

### Content Types & Extensions

#### 28. Art Gallery System
**Purpose**: Special handling for art posts

**Requirements**:
- Grid/gallery view
- Lightbox for viewing
- Art-specific metadata (medium, size, etc.)
- Commission info

**Priority**: Medium (content type specific)

---

#### 29. Recipe System
**Purpose**: Structured recipe posts

**Requirements**:
- Ingredients list
- Instructions steps
- Prep/cook time
- Servings
- Photo gallery

**Priority**: Low (niche feature)

---

#### 30. External Link Sharing
**Purpose**: Share external content

**Requirements**:
- Link post type
- URL preview/metadata fetch
- Link validation

**Priority**: Low (nice-to-have)

---

## Feature Prioritization Framework

### Must-Have (MVP)
1. ✅ User authentication
2. Profile/Character system (database ready)
3. Post creation & viewing (basic)
4. Media upload (at least for avatars)
5. Basic search
6. Email verification
7. Content moderation basics

### Should-Have (Post-MVP)
1. Comments system
2. Character relationships
3. Tags/categories
4. Events system with RSVP
5. Notifications
6. Following system
7. Reactions/likes
8. Rich text editor
9. Role-based permissions

### Nice-to-Have (Future)
1. Direct messaging
2. Drafts system
3. Kinship management
4. Character journals
5. Trending content
6. Advanced search
7. Analytics
8. 2FA
9. PWA features

### Advanced (Long-term)
1. Collaborative editing
2. Recommendations
3. Post revisions
4. RP session logs
5. External calendar integration

---

## Next Steps: Feature Discussion

**Questions to Consider**:

1. **Core Identity**: What makes this platform different from Discord or general social networks?
2. **Target Users**: Casual RP fans vs. serious writers vs. event organizers?
3. **Content Focus**: Story-driven? Art-focused? Event-centric? Mix?
4. **Privacy Needs**: Public by default? Private groups? Granular permissions?
5. **Moderation Philosophy**: Heavy moderation? Community-driven? Self-policed?
6. **Monetization**: Free forever? Premium features? Donations?
7. **Scale Expectations**: Small community (100s)? Large platform (1000s+)?

---

## Feature Combinations & Synergies

Some features work better together:

- **Character System + Relationships + Journals** = Rich character development
- **Events + RSVP + Calendar + Notifications** = Active community engagement
- **Posts + Tags + Search + Recommendations** = Content discovery
- **Following + Notifications + Activity Feed** = Social engagement loop
- **Kinships + Events + Posts** = Group activities and coordination
- **Collaborative Authoring + Rich Text + Drafts** = Team storytelling
- **Moderation + Reports + User Roles** = Safe community

Choose feature sets that reinforce each other!
