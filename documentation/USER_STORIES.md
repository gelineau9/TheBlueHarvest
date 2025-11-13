# User Stories - The Blue Harvest

## Overview

Comprehensive user stories for all features with acceptance criteria in Given/When/Then format. Stories are organized by feature area and user type.

**User Types**:
- **Visitor** - Not logged in, browsing the site
- **User** - Registered account holder
- **Moderator** - Community moderator with elevated permissions
- **Admin** - System administrator with full access

---

## Table of Contents
1. [Authentication & Account Management](#1-authentication--account-management)
2. [Character/Profile System](#2-characterprofile-system)
3. [Posts & Content Creation](#3-posts--content-creation)
4. [Comments System](#4-comments-system)
5. [Media & File Management](#5-media--file-management)
6. [Character Relationships](#6-character-relationships)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [Events System](#8-events-system)
9. [Activity Feed & Notifications](#9-activity-feed--notifications)
10. [Search & Discovery](#10-search--discovery)
11. [Social Features](#11-social-features)
12. [Content Moderation](#12-content-moderation)
13. [Email System](#13-email-system)
14. [Character-Specific Features](#14-character-specific-features)
15. [Kinship/Guild Management](#15-kinshipguild-management)
16. [Content Organization](#16-content-organization)
17. [Advanced Features](#17-advanced-features)
18. [Admin & Analytics](#18-admin--analytics)
19. [Accessibility & Mobile](#19-accessibility--mobile)
20. [Missing Features Identified](#20-missing-features-identified)

---

# 1. Authentication & Account Management

## US-1.1: User Registration

**As a** visitor
**I want to** create an account with my email, username, and password
**So that** I can access the platform and create content

**Acceptance Criteria**:

**Given** I am on the registration page
**When** I enter a valid email, unique username, and strong password
**Then** my account is created and I am logged in automatically

**Given** I am on the registration page
**When** I enter an email that already exists
**Then** I see an error message "Email already registered"

**Given** I am on the registration page
**When** I enter a username that already exists
**Then** I see an error message "Username already taken"

**Given** I am on the registration page
**When** I enter a weak password (less than 8 characters)
**Then** I see an error message "Password must be at least 8 characters with uppercase, lowercase, number, and special character"

**Given** I am on the registration page
**When** I successfully register
**Then** I receive a verification email to confirm my address

---

## US-1.2: Email Verification

**As a** user
**I want to** verify my email address
**So that** I can prove account ownership and receive notifications

**Acceptance Criteria**:

**Given** I have just registered
**When** I check my email inbox
**Then** I receive a verification email with a unique link

**Given** I receive a verification email
**When** I click the verification link
**Then** my email is marked as verified and I see a success message

**Given** my email is not verified
**When** I try to post content
**Then** I see a message prompting me to verify my email first

**Given** my verification link has expired (24 hours)
**When** I click the link
**Then** I see an error and option to resend verification email

---

## US-1.3: User Login

**As a** user
**I want to** log in with my username/email and password
**So that** I can access my account and content

**Acceptance Criteria**:

**Given** I am on the login page
**When** I enter valid credentials
**Then** I am logged in and redirected to the homepage

**Given** I am on the login page
**When** I enter incorrect credentials
**Then** I see an error message "Invalid credentials" (no specifics for security)

**Given** I have failed to login 5 times
**When** I attempt a 6th login
**Then** my IP is temporarily blocked for 15 minutes

**Given** I am logged in
**When** I close the browser and return later
**Then** I am still logged in (remember me functionality)

---

## US-1.4: Password Reset

**As a** user
**I want to** reset my password if I forget it
**So that** I can regain access to my account

**Acceptance Criteria**:

**Given** I am on the login page
**When** I click "Forgot Password"
**Then** I am taken to a password reset request page

**Given** I am on the password reset page
**When** I enter my email address
**Then** I receive a password reset email with a secure link

**Given** I receive a password reset email
**When** I click the reset link and enter a new password
**Then** my password is updated and I can log in with the new password

**Given** a password reset link has expired (1 hour)
**When** I click the link
**Then** I see an error and can request a new reset link

---

## US-1.5: Profile Management

**As a** user
**I want to** update my account information
**So that** I can keep my profile current

**Acceptance Criteria**:

**Given** I am logged in
**When** I navigate to my account settings
**Then** I can view and edit my username, first name, last name, and email

**Given** I am editing my username
**When** I try to use a username already taken
**Then** I see an error message "Username already taken"

**Given** I am editing my email
**When** I change it to a new email
**Then** I receive a verification email at the new address

**Given** I am viewing my account settings
**When** I want to change my password
**Then** I must enter my current password before setting a new one

---

## US-1.6: Account Deletion

**As a** user
**I want to** delete my account
**So that** I can remove my data from the platform

**Acceptance Criteria**:

**Given** I am logged in
**When** I request to delete my account
**Then** I am asked to confirm and enter my password

**Given** I confirm account deletion
**When** the deletion is processed
**Then** my account is soft-deleted and I am logged out

**Given** my account is deleted
**When** I try to log in
**Then** I see a message "Account has been deleted"

**Given** I am an admin
**When** viewing deleted accounts
**Then** I can see deleted accounts and permanently remove them after 30 days

---

# 2. Character/Profile System

## US-2.1: Create Character Profile

**As a** user
**I want to** create a character profile
**So that** I can roleplay in the Middle-earth community

**Acceptance Criteria**:

**Given** I am logged in
**When** I navigate to "Create Profile"
**Then** I can choose profile type (character, item, kinship, organization)

**Given** I am creating a character profile
**When** I enter a name and details
**Then** the profile is created and I am taken to the profile page

**Given** I already have a profile named "Gandalf"
**When** I try to create another profile with the same name
**Then** I see an error "You already have a profile with this name"

**Given** I am creating a character
**When** I save the profile
**Then** I can add custom fields like race, age, backstory, appearance using JSONB

---

## US-2.2: View Character Profiles

**As a** visitor
**I want to** view character profiles
**So that** I can learn about characters in the community

**Acceptance Criteria**:

**Given** I am on the site
**When** I navigate to the Characters page
**Then** I see a list of all public character profiles

**Given** I am viewing the character list
**When** I click on a character
**Then** I see the full character profile with all details

**Given** I am viewing a character profile
**When** the character has an avatar image
**Then** I see the avatar displayed prominently

**Given** I am viewing a character profile
**When** the character has relationships
**Then** I see a section showing related characters

---

## US-2.3: Edit Character Profile

**As a** user
**I want to** edit my character profiles
**So that** I can update character development over time

**Acceptance Criteria**:

**Given** I am logged in and own a character
**When** I navigate to the character profile
**Then** I see an "Edit" button

**Given** I am editing a character
**When** I update any fields
**Then** changes are saved and the updated_at timestamp is updated

**Given** I am editing a character
**When** I try to leave the page with unsaved changes
**Then** I see a warning "You have unsaved changes"

**Given** I don't own a character
**When** I view the profile
**Then** I don't see an "Edit" button

---

## US-2.4: Delete Character Profile

**As a** user
**I want to** delete my character profiles
**So that** I can remove characters I no longer use

**Acceptance Criteria**:

**Given** I own a character
**When** I click "Delete Profile"
**Then** I am asked to confirm deletion

**Given** I confirm character deletion
**When** the deletion is processed
**Then** the character is soft-deleted (not visible but recoverable)

**Given** a character has posts/comments
**When** I delete the character
**Then** I am warned that posts/comments will be preserved

---

## US-2.5: Profile Discovery

**As a** visitor
**I want to** browse and filter character profiles
**So that** I can find interesting characters to read about

**Acceptance Criteria**:

**Given** I am on the Characters page
**When** the page loads
**Then** I see profiles sorted by recently created

**Given** I am viewing the character list
**When** I apply filters (race, type, etc.)
**Then** the list updates to show only matching profiles

**Given** I am viewing the character list
**When** I search by name
**Then** I see matching character profiles

**Given** I am browsing characters
**When** I reach the bottom of the page
**Then** more characters load automatically (infinite scroll)

---

## US-2.6: Item Profiles

**As a** user
**I want to** create item profiles (swords, rings, artifacts)
**So that** I can document important objects in my stories

**Acceptance Criteria**:

**Given** I am creating a profile
**When** I select "Item" as the type
**Then** I see item-specific fields (description, owner, history, powers)

**Given** I have an item profile
**When** I want to link it to a character
**Then** I can establish a relationship showing ownership

---

## US-2.7: Kinship Profiles

**As a** user
**I want to** create kinship/guild profiles
**So that** I can represent organizations in Middle-earth

**Acceptance Criteria**:

**Given** I am creating a profile
**When** I select "Kinship" as the type
**Then** I see kinship-specific fields (motto, colors, headquarters, history)

**Given** I have a kinship profile
**When** other users view it
**Then** they can see member lists and apply to join

---

# 3. Posts & Content Creation

## US-3.1: Create Story Post

**As a** user
**I want to** create a story post
**So that** I can share my Middle-earth narratives

**Acceptance Criteria**:

**Given** I am logged in
**When** I click "Create Post" and select "Story"
**Then** I see a form with title, body, and tags fields

**Given** I am creating a story
**When** I submit the form
**Then** the post is created and I am redirected to the post page

**Given** I am creating a story
**When** I select a character profile as the author
**Then** the post is attributed to that character, not my user account

**Given** I am writing a story
**When** I use the rich text editor
**Then** I can format text, add links, and embed images

---

## US-3.2: Multi-Author Posts

**As a** user
**I want to** add co-authors to my posts
**So that** we can collaborate on stories together

**Acceptance Criteria**:

**Given** I am creating a post
**When** I invite another profile as co-author
**Then** they receive a notification to accept/decline

**Given** I accept a co-author invitation
**When** the invitation is accepted
**Then** I can edit the post and am listed as an author

**Given** I am the primary author
**When** I want to designate a co-author
**Then** I can mark one author as primary (the original creator)

**Given** there are multiple authors
**When** someone views the post
**Then** all authors are displayed with the primary author highlighted

---

## US-3.3: Create Art Post

**As a** user
**I want to** create an art post
**So that** I can share my Middle-earth artwork

**Acceptance Criteria**:

**Given** I am creating an art post
**When** I fill in the form
**Then** I see art-specific fields (medium, size, tools used, commission info)

**Given** I am creating an art post
**When** I upload images
**Then** multiple images can be uploaded for a gallery view

**Given** I am viewing an art post
**When** I click on an image
**Then** it opens in a lightbox for full-screen viewing

---

## US-3.4: Create Event Post

**As a** user
**I want to** create an event post
**So that** I can announce upcoming RP sessions or gatherings

**Acceptance Criteria**:

**Given** I am creating an event post
**When** I fill in the form
**Then** I see event-specific fields (date, time, location, duration, max attendees)

**Given** I am creating an event
**When** I set a date and time
**Then** I can specify the timezone

**Given** I am viewing an event post
**When** the event date is in the future
**Then** I see an RSVP button

**Given** I RSVP to an event
**When** the event date approaches
**Then** I receive reminder notifications

---

## US-3.5: Create Recipe Post

**As a** user
**I want to** create recipe posts
**So that** I can share Middle-earth inspired cooking

**Acceptance Criteria**:

**Given** I am creating a recipe post
**When** I fill in the form
**Then** I see structured fields (ingredients list, instructions, prep time, cook time, servings)

**Given** I am viewing a recipe
**When** the page loads
**Then** I see ingredients in a bulleted list and instructions in numbered steps

---

## US-3.6: View Posts Feed

**As a** visitor
**I want to** view a feed of recent posts
**So that** I can see what's happening in the community

**Acceptance Criteria**:

**Given** I am on the homepage
**When** the page loads
**Then** I see the latest posts across all types

**Given** I am viewing the feed
**When** I want to filter by type
**Then** I can select "Stories", "Art", "Events", etc.

**Given** I am viewing the feed
**When** I scroll to the bottom
**Then** older posts load automatically

**Given** I am viewing the feed
**When** I click on a post
**Then** I am taken to the full post page

---

## US-3.7: Edit Posts

**As a** user
**I want to** edit my posts
**So that** I can fix typos or update content

**Acceptance Criteria**:

**Given** I am the author of a post
**When** I view my post
**Then** I see an "Edit" button

**Given** I am editing a post
**When** I save changes
**Then** the post is updated and shows "(edited)" indicator

**Given** I am editing a post
**When** I save changes
**Then** the updated_at timestamp is updated

**Given** I am not the author
**When** I view a post
**Then** I don't see an "Edit" button

---

## US-3.8: Delete Posts

**As a** user
**I want to** delete my posts
**So that** I can remove content I no longer want public

**Acceptance Criteria**:

**Given** I am the author of a post
**When** I click "Delete"
**Then** I am asked to confirm deletion

**Given** I confirm deletion
**When** the deletion is processed
**Then** the post is soft-deleted and no longer visible to others

**Given** I am a moderator
**When** I view any post
**Then** I can delete it with a reason logged

---

## US-3.9: Draft Posts

**As a** user
**I want to** save posts as drafts
**So that** I can work on them over time before publishing

**Acceptance Criteria**:

**Given** I am creating a post
**When** I click "Save as Draft"
**Then** the post is saved but not published

**Given** I have draft posts
**When** I navigate to "My Drafts"
**Then** I see a list of all my unpublished posts

**Given** I am editing a draft
**When** I click "Publish"
**Then** the post becomes public and appears in feeds

**Given** I am writing a post
**When** I don't interact for 30 seconds
**Then** the draft is auto-saved

---

# 4. Comments System

## US-4.1: Add Comment

**As a** user
**I want to** comment on posts
**So that** I can engage with content and provide feedback

**Acceptance Criteria**:

**Given** I am logged in and viewing a post
**When** I write a comment and submit
**Then** the comment appears below the post

**Given** I am adding a comment
**When** I select a character profile
**Then** the comment is attributed to that character

**Given** I am not logged in
**When** I view a post
**Then** I see existing comments but no option to add one

---

## US-4.2: Edit Comment

**As a** user
**I want to** edit my comments
**So that** I can fix mistakes

**Acceptance Criteria**:

**Given** I authored a comment
**When** I click "Edit"
**Then** I can modify the comment text

**Given** I save an edited comment
**When** it updates
**Then** it shows "(edited)" indicator

**Given** a comment is older than 24 hours
**When** I try to edit it
**Then** I see a message "Comments can only be edited within 24 hours"

---

## US-4.3: Delete Comment

**As a** user
**I want to** delete my comments
**So that** I can remove comments I regret

**Acceptance Criteria**:

**Given** I authored a comment
**When** I click "Delete"
**Then** I am asked to confirm

**Given** I confirm deletion
**When** processed
**Then** the comment is soft-deleted and shows "[deleted]"

---

## US-4.4: Threaded Comments

**As a** user
**I want to** reply to specific comments
**So that** I can have focused conversations

**Acceptance Criteria**:

**Given** I am viewing a comment
**When** I click "Reply"
**Then** my comment appears as a nested reply

**Given** there are nested replies
**When** I view comments
**Then** they are visually indented to show the thread structure

**Given** a thread is deeply nested (5+ levels)
**When** viewing it
**Then** very deep replies show "continue thread" link

---

## US-4.5: Comment Notifications

**As a** user
**I want to** be notified when someone comments on my post
**So that** I can respond to engagement

**Acceptance Criteria**:

**Given** someone comments on my post
**When** the comment is submitted
**Then** I receive a notification

**Given** someone replies to my comment
**When** the reply is submitted
**Then** I receive a notification

**Given** I am mentioned in a comment
**When** the comment is submitted
**Then** I receive a notification

---

# 5. Media & File Management

## US-5.1: Upload Profile Avatar

**As a** user
**I want to** upload an avatar for my character
**So that** my profile is visually represented

**Acceptance Criteria**:

**Given** I am editing a profile
**When** I click "Upload Avatar"
**Then** I can select an image from my device

**Given** I select an image
**When** it uploads
**Then** it is resized to 400x400px and optimized

**Given** I upload an image larger than 5MB
**When** I try to submit
**Then** I see an error "Image must be under 5MB"

**Given** I upload a non-image file
**When** I try to submit
**Then** I see an error "Only image files allowed (JPG, PNG, GIF, WEBP)"

---

## US-5.2: Upload Post Images

**As a** user
**I want to** upload images to my posts
**So that** I can illustrate my stories and share art

**Acceptance Criteria**:

**Given** I am creating a post
**When** I upload images
**Then** they are stored in S3 and URLs are saved to the database

**Given** I upload multiple images
**When** the upload completes
**Then** I can reorder images by dragging

**Given** I am creating an art post
**When** I upload images
**Then** I can set one as the featured/cover image

---

## US-5.3: Image Optimization

**As a** user
**I want to** my uploaded images to be optimized
**So that** pages load quickly

**Acceptance Criteria**:

**Given** I upload a large image
**When** it's processed
**Then** multiple sizes are generated (thumbnail, medium, large, original)

**Given** images are served
**When** viewed on the site
**Then** the appropriate size is used based on context (thumbnail in list, full in lightbox)

**Given** I upload a PNG
**When** it's processed
**Then** a WebP version is also generated for modern browsers

---

## US-5.4: Delete Media

**As a** user
**I want to** delete uploaded images
**So that** I can remove unwanted files

**Acceptance Criteria**:

**Given** I own a profile with an avatar
**When** I click "Remove Avatar"
**Then** the image is soft-deleted from the database

**Given** an image is deleted
**When** no posts reference it
**Then** it is permanently removed from S3 after 30 days

---

## US-5.5: CDN Delivery

**As a** visitor
**I want to** images to load quickly
**So that** I have a smooth browsing experience

**Acceptance Criteria**:

**Given** images are stored in S3
**When** they are served
**Then** they are delivered via CloudFront CDN

**Given** images are requested
**When** served via CDN
**Then** they have appropriate cache headers (1 month)

---

# 6. Character Relationships

## US-6.1: Create Relationship

**As a** user
**I want to** define relationships between my characters
**So that** I can show character connections

**Acceptance Criteria**:

**Given** I own two characters
**When** I navigate to one character's relationships tab
**Then** I can add a relationship to the other character

**Given** I am adding a relationship
**When** I select relationship type
**Then** I can choose from bidirectional types (friend, enemy, ally) or unidirectional (parent, child, other)

**Given** I create a "friend" relationship
**When** it's saved
**Then** both characters show each other as friends

**Given** I create a "parent" relationship
**When** it's saved
**Then** one character shows as parent, the other as child

---

## US-6.2: Relationship Requests

**As a** user
**I want to** request relationships with others' characters
**So that** we can establish connections between our characters

**Acceptance Criteria**:

**Given** I want to relate my character to someone else's
**When** I send a relationship request
**Then** the other user receives a notification

**Given** I receive a relationship request
**When** I accept it
**Then** the relationship is established

**Given** I receive a relationship request
**When** I decline it
**Then** the request is removed

---

## US-6.3: View Relationship Network

**As a** visitor
**I want to** see a character's relationships
**So that** I can understand their connections

**Acceptance Criteria**:

**Given** I am viewing a character
**When** I navigate to the relationships tab
**Then** I see all related characters organized by type

**Given** a character has many relationships
**When** viewing the relationships
**Then** I can see a visual network graph (optional advanced feature)

---

## US-6.4: Edit/Delete Relationships

**As a** user
**I want to** modify or remove relationships
**So that** I can keep character connections current

**Acceptance Criteria**:

**Given** I have an established relationship
**When** I click "Edit Relationship"
**Then** I can change the relationship type

**Given** I want to remove a relationship
**When** I click "Remove"
**Then** the relationship is deleted for both characters

---

# 7. User Roles & Permissions

## US-7.1: Role-Based Access

**As an** admin
**I want to** assign roles to users
**So that** I can grant appropriate permissions

**Acceptance Criteria**:

**Given** I am an admin
**When** I view a user's account
**Then** I can change their role (user, moderator, admin)

**Given** a user becomes a moderator
**When** they log in
**Then** they see moderator-specific UI elements and can access moderation tools

---

## US-7.2: Moderator Permissions

**As a** moderator
**I want to** moderate content
**So that** I can keep the community safe

**Acceptance Criteria**:

**Given** I am a moderator
**When** I view any post or comment
**Then** I can edit or delete it

**Given** I delete content as moderator
**When** the deletion occurs
**Then** the reason is logged in the audit trail

**Given** I am a moderator
**When** I view the moderation queue
**Then** I see reported content requiring review

---

## US-7.3: Admin Permissions

**As an** admin
**I want to** have full system access
**So that** I can manage the platform

**Acceptance Criteria**:

**Given** I am an admin
**When** I access the admin panel
**Then** I can view analytics, manage users, configure settings

**Given** I am an admin
**When** I view deleted content
**Then** I can restore or permanently delete it

---

# 8. Events System

## US-8.1: Create Event

**As a** user
**I want to** create structured events
**So that** I can organize RP sessions and gatherings

**Acceptance Criteria**:

**Given** I am logged in
**When** I create an event
**Then** I fill in title, description, date, time, timezone, location, max attendees

**Given** I am creating an event
**When** I set it as recurring
**Then** I can specify recurrence pattern (weekly, monthly)

**Given** I create an event
**When** it's saved
**Then** it appears on the events calendar

---

## US-8.2: RSVP to Event

**As a** user
**I want to** RSVP to events
**So that** organizers know I'm attending

**Acceptance Criteria**:

**Given** I am viewing an upcoming event
**When** I click "RSVP"
**Then** I am added to the attendees list

**Given** an event has max attendees
**When** I RSVP and it's full
**Then** I am added to a waitlist

**Given** I have RSVP'd
**When** I change my mind
**Then** I can cancel my RSVP

---

## US-8.3: Event Reminders

**As a** user
**I want to** receive reminders for events I've RSVP'd to
**So that** I don't forget to attend

**Acceptance Criteria**:

**Given** I have RSVP'd to an event
**When** the event is 24 hours away
**Then** I receive a reminder notification

**Given** I have RSVP'd to an event
**When** the event is 1 hour away
**Then** I receive another reminder notification

---

## US-8.4: Event Calendar

**As a** visitor
**I want to** view upcoming events on a calendar
**So that** I can see what's happening

**Acceptance Criteria**:

**Given** I am on the events page
**When** the page loads
**Then** I see a calendar view with events marked

**Given** I am viewing the calendar
**When** I click on a date with events
**Then** I see all events for that day

**Given** I am viewing the calendar
**When** I want to see only certain event types
**Then** I can filter (RP sessions, OOC gatherings, contests)

---

## US-8.5: Export Event to Calendar

**As a** user
**I want to** export events to my personal calendar
**So that** I have them in my scheduling system

**Acceptance Criteria**:

**Given** I am viewing an event
**When** I click "Add to Calendar"
**Then** I can download an .ics file

**Given** I download the .ics file
**When** I open it
**Then** it works with Google Calendar, Outlook, Apple Calendar

---

# 9. Activity Feed & Notifications

## US-9.1: View Activity Feed

**As a** user
**I want to** see recent activity from people I follow
**So that** I stay updated on their content

**Acceptance Criteria**:

**Given** I am logged in
**When** I view my activity feed
**Then** I see recent posts, comments, and actions from followed users

**Given** I am viewing my activity feed
**When** new activity occurs
**Then** the feed updates automatically (real-time or refresh)

---

## US-9.2: Receive Notifications

**As a** user
**I want to** receive notifications for important events
**So that** I can stay engaged with the community

**Acceptance Criteria**:

**Given** someone comments on my post
**When** the comment is made
**Then** I receive a notification

**Given** someone mentions me in a post or comment
**When** the mention is made
**Then** I receive a notification

**Given** I receive a notification
**When** I click on it
**Then** I am taken to the relevant content

**Given** I am viewing notifications
**When** I click "Mark all as read"
**Then** all notifications are marked as read

---

## US-9.3: Notification Preferences

**As a** user
**I want to** configure my notification settings
**So that** I only receive notifications I care about

**Acceptance Criteria**:

**Given** I am in notification settings
**When** I view the options
**Then** I can toggle email notifications, push notifications per type

**Given** I disable email notifications
**When** an event occurs
**Then** I only receive in-app notifications

---

## US-9.4: Real-time Activity

**As a** user
**I want to** see activity updates in real-time
**So that** the site feels dynamic and alive

**Acceptance Criteria**:

**Given** I am viewing the activity feed
**When** new activity occurs
**Then** a banner appears with "New activity available - Click to refresh"

**Given** I click the refresh banner
**When** it loads
**Then** new activity is prepended to the feed

---

# 10. Search & Discovery

## US-10.1: Basic Search

**As a** visitor
**I want to** search for content
**So that** I can find specific posts or characters

**Acceptance Criteria**:

**Given** I am on any page
**When** I enter a search query
**Then** I see results matching posts, characters, and users

**Given** I search for a term
**When** results load
**Then** they are ranked by relevance

**Given** I search for a term
**When** there are no results
**Then** I see "No results found" with suggestions

---

## US-10.2: Advanced Search

**As a** user
**I want to** use advanced search filters
**So that** I can narrow down results

**Acceptance Criteria**:

**Given** I am searching
**When** I access advanced filters
**Then** I can filter by type, date range, author, tags

**Given** I filter by character race
**When** searching characters
**Then** only characters of that race appear

**Given** I filter by post type "Art"
**When** searching posts
**Then** only art posts appear

---

## US-10.3: Search Autocomplete

**As a** user
**I want to** see search suggestions as I type
**So that** I can find what I'm looking for faster

**Acceptance Criteria**:

**Given** I start typing in the search box
**When** I've entered 3+ characters
**Then** I see autocomplete suggestions

**Given** I see autocomplete suggestions
**When** I click one
**Then** I am taken directly to that result

---

## US-10.4: Tag-based Discovery

**As a** visitor
**I want to** browse content by tags
**So that** I can find related content on topics I like

**Acceptance Criteria**:

**Given** I am viewing a post with tags
**When** I click a tag
**Then** I see all posts with that tag

**Given** I am on the tags page
**When** the page loads
**Then** I see popular tags with usage counts

**Given** I am browsing by tag
**When** viewing results
**Then** I can sort by recent, popular, or top-rated

---

# 11. Social Features

## US-11.1: Follow Users/Characters

**As a** user
**I want to** follow other users or characters
**So that** I can see their content in my feed

**Acceptance Criteria**:

**Given** I am viewing a user or character
**When** I click "Follow"
**Then** I start following them

**Given** I follow a user
**When** they create new content
**Then** it appears in my activity feed

**Given** I am following someone
**When** I click "Unfollow"
**Then** I stop seeing their content in my feed

---

## US-11.2: Like/React to Posts

**As a** user
**I want to** react to posts
**So that** I can show appreciation quickly

**Acceptance Criteria**:

**Given** I am viewing a post
**When** I click the like button
**Then** the like count increases

**Given** I have liked a post
**When** I click the like button again
**Then** I unlike the post

**Given** I am viewing a post
**When** I click "See who liked this"
**Then** I see a list of users who reacted

---

## US-11.3: Bookmarks

**As a** user
**I want to** bookmark posts
**So that** I can save content for later reading

**Acceptance Criteria**:

**Given** I am viewing a post
**When** I click "Bookmark"
**Then** the post is added to my bookmarks

**Given** I navigate to "My Bookmarks"
**When** the page loads
**Then** I see all my bookmarked posts

**Given** I have bookmarks
**When** I want to organize them
**Then** I can create collections/folders

---

## US-11.4: Direct Messaging

**As a** user
**I want to** send private messages to other users
**So that** I can have private conversations

**Acceptance Criteria**:

**Given** I am viewing a user's profile
**When** I click "Send Message"
**Then** a message composition window opens

**Given** I send a message
**When** the other user logs in
**Then** they receive a notification

**Given** I am in a conversation
**When** I view message history
**Then** I see all messages in chronological order

**Given** I receive a message
**When** I want to block the sender
**Then** I can block them to prevent further messages

---

# 12. Content Moderation

## US-12.1: Report Content

**As a** user
**I want to** report inappropriate content
**So that** moderators can review it

**Acceptance Criteria**:

**Given** I am viewing a post or comment
**When** I click "Report"
**Then** I see a form to select reason and add details

**Given** I submit a report
**When** it's processed
**Then** moderators are notified and it enters the review queue

**Given** I report content
**When** moderators take action
**Then** I receive a notification about the outcome

---

## US-12.2: Moderation Queue

**As a** moderator
**I want to** review reported content
**So that** I can take appropriate action

**Acceptance Criteria**:

**Given** I am a moderator
**When** I access the moderation queue
**Then** I see all reported content with report reasons

**Given** I am reviewing a report
**When** I take action (approve, remove, warn user)
**Then** the action is logged and the reporter is notified

**Given** I am reviewing a report
**When** I need more context
**Then** I can view the reporter's details and content history

---

## US-12.3: User Warnings

**As a** moderator
**I want to** warn users for rule violations
**So that** they can correct behavior without being banned

**Acceptance Criteria**:

**Given** I am reviewing a violation
**When** I issue a warning
**Then** the user receives a notification with the reason

**Given** a user receives 3 warnings
**When** the 3rd warning is issued
**Then** their account is automatically suspended for review

---

## US-12.4: Ban/Suspend Users

**As a** moderator
**I want to** suspend or ban users
**So that** I can remove bad actors from the community

**Acceptance Criteria**:

**Given** I am reviewing a user's violations
**When** I suspend their account
**Then** they can't create content but can view the site (temporary)

**Given** I am reviewing serious violations
**When** I ban a user
**Then** they can't access the site at all (permanent)

**Given** a user is banned
**When** they try to log in
**Then** they see a message explaining the ban

---

# 13. Email System

## US-13.1: Email Verification

**As a** user
**I want to** verify my email address
**So that** I can prove account ownership

*(Covered in US-1.2)*

---

## US-13.2: Password Reset Email

**As a** user
**I want to** receive password reset emails
**So that** I can regain access to my account

*(Covered in US-1.4)*

---

## US-13.3: Notification Emails

**As a** user
**I want to** receive email notifications
**So that** I stay updated even when not on the site

**Acceptance Criteria**:

**Given** I have email notifications enabled
**When** I receive a comment on my post
**Then** I get an email notification

**Given** I receive multiple notifications
**When** they occur within a short time
**Then** they are batched into a digest email (not one email per notification)

**Given** I want to unsubscribe
**When** I click unsubscribe in any email
**Then** I am taken to notification settings

---

## US-13.4: Email Templates

**As an** admin
**I want to** email templates to be well-designed
**So that** emails represent the brand well

**Acceptance Criteria**:

**Given** any email is sent
**When** a user receives it
**Then** it has consistent branding, is mobile-responsive, and has clear calls-to-action

---

# 14. Character-Specific Features

## US-14.1: Character Sheets

**As a** user
**I want to** use structured character sheet templates
**So that** my characters have consistent information

**Acceptance Criteria**:

**Given** I am creating a character
**When** I select "Use template"
**Then** I can choose from templates (D&D-style, LOTR-specific, freeform)

**Given** I use a template
**When** filling in the form
**Then** I see predefined fields (race, class, alignment, stats, backstory)

**Given** I am viewing a character with a template
**When** the page loads
**Then** information is displayed in a formatted character sheet layout

---

## US-14.2: Character Journals

**As a** user
**I want to** write in-character journal entries
**So that** I can document my character's journey

**Acceptance Criteria**:

**Given** I am viewing my character profile
**When** I click "Journal Entry"
**Then** I can write a post attributed to that character

**Given** I am viewing a character
**When** I navigate to the journal tab
**Then** I see all journal entries in chronological order

**Given** I create a journal entry
**When** setting privacy
**Then** I can make it public, followers-only, or private

---

## US-14.3: RP Session Logs

**As a** user
**I want to** record RP session transcripts
**So that** I can preserve memorable RP moments

**Acceptance Criteria**:

**Given** I am creating a session log
**When** I fill in the form
**Then** I can paste dialogue, tag participants, add date/location

**Given** I am viewing a session log
**When** the page loads
**Then** dialogue is formatted with character names highlighted

**Given** I participated in a session
**When** someone posts the log
**Then** I can edit my character's lines if needed (before approval)

---

## US-14.4: Character Galleries

**As a** user
**I want to** create image galleries for my characters
**So that** I can showcase art and reference images

**Acceptance Criteria**:

**Given** I am editing a character
**When** I navigate to the gallery tab
**Then** I can upload multiple images

**Given** I have a character gallery
**When** others view my character
**Then** they see a gallery view of all images

**Given** I upload art I didn't create
**When** adding the image
**Then** I can credit the artist

---

# 15. Kinship/Guild Management

## US-15.1: Create Kinship

**As a** user
**I want to** create a kinship profile
**So that** I can form a guild or organization

*(Partially covered in US-2.7)*

**Acceptance Criteria**:

**Given** I create a kinship profile
**When** setting it up
**Then** I am automatically the founder/leader with full permissions

---

## US-15.2: Kinship Membership

**As a** user
**I want to** join kinships
**So that** I can be part of a group

**Acceptance Criteria**:

**Given** I am viewing a kinship
**When** applications are open
**Then** I can click "Apply to Join"

**Given** I submit an application
**When** a kinship leader reviews it
**Then** they can approve or deny

**Given** my application is approved
**When** I log in
**Then** I am listed as a member of the kinship

**Given** I am a kinship member
**When** I want to leave
**Then** I can leave the kinship (unless I'm the last leader)

---

## US-15.3: Kinship Ranks

**As a** kinship leader
**I want to** assign ranks to members
**So that** I can organize the hierarchy

**Acceptance Criteria**:

**Given** I am a kinship leader
**When** I access member management
**Then** I can create custom ranks (Officer, Member, Recruit, etc.)

**Given** I have defined ranks
**When** I assign them to members
**Then** ranks display on member profiles

**Given** I create a rank
**When** setting permissions
**Then** I can control what that rank can do (invite members, post announcements, etc.)

---

## US-15.4: Kinship Announcements

**As a** kinship officer
**I want to** post announcements
**So that** I can communicate with members

**Acceptance Criteria**:

**Given** I have announcement permissions
**When** I create a kinship post
**Then** all members receive a notification

**Given** I am a kinship member
**When** I log in
**Then** I see recent kinship announcements in my feed

---

## US-15.5: Kinship Events

**As a** kinship officer
**I want to** organize kinship-specific events
**So that** members can participate together

**Acceptance Criteria**:

**Given** I am creating an event
**When** I mark it as a kinship event
**Then** only kinship members can RSVP

**Given** a kinship event is created
**When** it's saved
**Then** all members receive a notification

---

# 16. Content Organization

## US-16.1: Tagging System

**As a** user
**I want to** add tags to my posts
**So that** content is organized and discoverable

**Acceptance Criteria**:

**Given** I am creating a post
**When** I add tags
**Then** I can select from existing tags or create new ones

**Given** I am adding tags
**When** I start typing
**Then** I see autocomplete suggestions

**Given** a tag is used on a post
**When** others search for that tag
**Then** the post appears in results

---

## US-16.2: Categories/Collections

**As a** user
**I want to** organize my posts into collections
**So that** I can group related content

**Acceptance Criteria**:

**Given** I have multiple posts
**When** I create a collection
**Then** I can add posts to it

**Given** I have a collection
**When** others view my profile
**Then** they can browse my collections

**Example**: "Tales of the Shire" collection containing all posts about a specific story arc

---

## US-16.3: Series/Story Arcs

**As a** user
**I want to** link posts in a series
**So that** readers can follow ongoing stories

**Acceptance Criteria**:

**Given** I am creating a post
**When** it's part of a series
**Then** I can add it to an existing series or create a new one

**Given** a post is in a series
**When** viewing it
**Then** I see "Previous" and "Next" navigation links

**Given** I am viewing a series
**When** on the series page
**Then** I see all posts in chronological order

---

# 17. Advanced Features

## US-17.1: Collaborative Editing

**As a** user
**I want to** simultaneously edit a post with co-authors
**So that** we can write together in real-time

**Acceptance Criteria**:

**Given** I have co-authors on a post
**When** we edit simultaneously
**Then** changes appear in real-time for all editors

**Given** we both edit the same paragraph
**When** a conflict occurs
**Then** we are prompted to merge or choose a version

---

## US-17.2: Content Recommendations

**As a** user
**I want to** see recommended content
**So that** I discover new posts and characters I might like

**Acceptance Criteria**:

**Given** I am viewing a post
**When** I scroll to the bottom
**Then** I see "Similar posts you might like"

**Given** I view a character
**When** on the profile
**Then** I see "Similar characters"

**Given** I am on the homepage
**When** logged in
**Then** I see personalized recommendations based on my activity

---

## US-17.3: Trending Content

**As a** visitor
**I want to** see what's trending
**So that** I can find popular content

**Acceptance Criteria**:

**Given** I am on the homepage
**When** I navigate to "Trending"
**Then** I see posts with high engagement (views, comments, likes)

**Given** I am viewing trending content
**When** I want different timeframes
**Then** I can filter by today, this week, this month, all time

---

## US-17.4: Post Revisions

**As a** user
**I want to** see edit history of posts
**So that** I can track changes over time

**Acceptance Criteria**:

**Given** a post has been edited
**When** I click "View edit history"
**Then** I see all previous versions with timestamps

**Given** I am viewing edit history
**When** comparing versions
**Then** I see a diff showing what changed

**Given** I am the author
**When** viewing history
**Then** I can restore a previous version

---

# 18. Admin & Analytics

## US-18.1: Analytics Dashboard

**As an** admin
**I want to** view platform analytics
**So that** I can understand growth and engagement

**Acceptance Criteria**:

**Given** I am an admin
**When** I access the analytics dashboard
**Then** I see metrics for users, posts, engagement, active users

**Given** I am viewing analytics
**When** looking at trends
**Then** I see graphs for daily/weekly/monthly growth

**Given** I am viewing analytics
**When** I want to export data
**Then** I can download CSV reports

---

## US-18.2: Audit Logs

**As an** admin
**I want to** view audit logs
**So that** I can track important system actions

**Acceptance Criteria**:

**Given** I am an admin
**When** I access audit logs
**Then** I see all role changes, bans, content deletions with timestamps and actors

**Given** I am reviewing audit logs
**When** I want to find specific actions
**Then** I can filter by action type, user, date range

---

## US-18.3: System Configuration

**As an** admin
**I want to** configure system settings
**So that** I can customize the platform

**Acceptance Criteria**:

**Given** I am an admin
**When** I access settings
**Then** I can configure site name, description, logo, theme colors

**Given** I am configuring settings
**When** I enable/disable features
**Then** changes take effect immediately (e.g., disable registrations)

---

# 19. Accessibility & Mobile

## US-19.1: Keyboard Navigation

**As a** user with mobility impairments
**I want to** navigate the site with keyboard only
**So that** I can use the platform without a mouse

**Acceptance Criteria**:

**Given** I am navigating with keyboard
**When** I press Tab
**Then** focus moves to the next interactive element

**Given** I am on any page
**When** I press Escape
**Then** any open modal/dialog closes

**Given** I am in a form
**When** I use Tab to navigate fields
**Then** the tab order is logical and intuitive

---

## US-19.2: Screen Reader Support

**As a** user with visual impairments
**I want to** use a screen reader
**So that** I can access all content

**Acceptance Criteria**:

**Given** I am using a screen reader
**When** navigating the site
**Then** all images have descriptive alt text

**Given** I am using a screen reader
**When** interactive elements are encountered
**Then** their purpose is clearly announced

**Given** I am using a screen reader
**When** navigating forms
**Then** labels and error messages are properly associated

---

## US-19.3: Mobile Responsiveness

**As a** mobile user
**I want to** access the site on my phone
**So that** I can use it on the go

**Acceptance Criteria**:

**Given** I am on a mobile device
**When** I visit the site
**Then** the layout adapts to my screen size

**Given** I am on mobile
**When** I tap interactive elements
**Then** they are large enough to tap accurately (44x44px minimum)

**Given** I am on mobile
**When** viewing images
**Then** they scale appropriately and don't cause horizontal scrolling

---

## US-19.4: Progressive Web App

**As a** mobile user
**I want to** install the site as an app
**So that** I can access it like a native app

**Acceptance Criteria**:

**Given** I am on mobile
**When** I visit the site
**Then** I see an "Add to Home Screen" prompt

**Given** I install the PWA
**When** I open it
**Then** it launches in fullscreen without browser UI

**Given** I am using the PWA
**When** I go offline
**Then** I can still view cached content

---

## US-19.5: High Contrast Mode

**As a** user with visual impairments
**I want to** enable high contrast mode
**So that** text is easier to read

**Acceptance Criteria**:

**Given** I am in accessibility settings
**When** I enable high contrast mode
**Then** all text has at least 7:1 contrast ratio

**Given** I have enabled high contrast
**When** viewing the site
**Then** decorative elements that reduce contrast are removed

---

# 20. Missing Features Identified

## Critical Gaps Found

### US-20.1: Content Privacy Controls

**As a** user
**I want to** control who can see my content
**So that** I can share selectively

**Current Gap**: No privacy settings in database schema

**Acceptance Criteria**:

**Given** I am creating a post
**When** I set privacy
**Then** I can choose: Public, Followers Only, Kinship Only, Private

**Given** I set a post to "Followers Only"
**When** a non-follower tries to view it
**Then** they see "This post is only visible to followers"

---

### US-20.2: Blocking Users

**As a** user
**I want to** block other users
**So that** I don't see their content or interactions

**Current Gap**: No blocking mechanism in database

**Acceptance Criteria**:

**Given** I am viewing a user's profile
**When** I click "Block User"
**Then** I no longer see their posts, comments, or messages

**Given** I block a user
**When** they try to view my profile
**Then** they see "This profile is unavailable"

**Database Requirements**: New `blocked_users` table needed

---

### US-20.3: Content Flagging (Pre-Moderation)

**As a** user
**I want to** flag my content with warnings
**So that** sensitive content is properly labeled

**Current Gap**: No content warning system

**Acceptance Criteria**:

**Given** I am creating a post
**When** it contains sensitive content
**Then** I can add content warnings (violence, adult themes, spoilers)

**Given** a post has content warnings
**When** someone views it
**Then** warnings are displayed and content is hidden until they click "Show content"

**Database Requirements**: Add `content_warnings` JSONB field to posts

---

### US-20.4: Character Import/Export

**As a** user
**I want to** export my character data
**So that** I can back it up or move to another platform

**Current Gap**: No data portability features

**Acceptance Criteria**:

**Given** I own a character
**When** I click "Export Character"
**Then** I receive a JSON file with all character data

**Given** I have an exported character
**When** I upload it to create a new character
**Then** all fields are populated from the file

---

### US-20.5: Character Ownership Transfer

**As a** user
**I want to** transfer character ownership to another user
**So that** I can give away characters I no longer use

**Current Gap**: No ownership transfer mechanism

**Acceptance Criteria**:

**Given** I own a character
**When** I initiate a transfer
**Then** the recipient receives a request to accept

**Given** I accept a character transfer
**When** confirmed
**Then** the character's account_id changes to mine

**Database Requirements**: Transfer needs audit trail

---

### US-20.6: Read Status Tracking

**As a** user
**I want to** see which posts I've already read
**So that** I can easily find new content

**Current Gap**: No read tracking

**Acceptance Criteria**:

**Given** I am viewing posts
**When** I've already viewed one
**Then** it is visually marked as read (faded, different color)

**Given** I am viewing my feed
**When** I want to hide read posts
**Then** I can filter to show only unread

**Database Requirements**: New `post_views` table with (account_id, post_id, viewed_at)

---

### US-20.7: Character Death/Retirement

**As a** user
**I want to** mark characters as deceased or retired
**So that** their status is clear without deleting them

**Current Gap**: No character status field

**Acceptance Criteria**:

**Given** I own a character
**When** I mark them as deceased
**Then** their profile shows "Deceased" and they can't author new posts

**Given** a character is retired
**When** viewing their profile
**Then** it shows "Retired" and they appear in archived sections

**Database Requirements**: Add `status` ENUM (active, deceased, retired) to profiles

---

### US-20.8: Mention/Tagging System

**As a** user
**I want to** mention other users or characters in posts
**So that** they are notified and linked

**Current Gap**: No mention system

**Acceptance Criteria**:

**Given** I am writing a post or comment
**When** I type @username
**Then** I see autocomplete suggestions

**Given** I mention someone
**When** the post is published
**Then** the mentioned user receives a notification

**Given** a post mentions a character
**When** viewing the post
**Then** the mention is a clickable link to that character

**Database Requirements**: Parse mentions from content, store in `mentions` table

---

### US-20.9: Content Scheduling

**As a** user
**I want to** schedule posts for future publication
**So that** I can prepare content in advance

**Current Gap**: No scheduling system

**Acceptance Criteria**:

**Given** I am creating a post
**When** I set a publish date in the future
**Then** the post is saved but not published until that time

**Given** I have scheduled posts
**When** viewing my drafts
**Then** I see scheduled posts with their publish times

**Database Requirements**: Add `scheduled_publish_at` TIMESTAMPTZ to posts

---

### US-20.10: Multi-language Support

**As a** user speaking a different language
**I want to** use the site in my language
**So that** I can understand the interface

**Current Gap**: English only

**Acceptance Criteria**:

**Given** I am in settings
**When** I select a language
**Then** all UI text changes to that language

**Given** I create content
**When** I write in my language
**Then** it displays correctly (RTL support for Arabic, etc.)

**Database Requirements**: i18n implementation, content locale field

---

### US-20.11: Image Attribution & Copyright

**As a** user
**I want to** properly attribute uploaded images
**So that** artists receive credit

**Current Gap**: No attribution system in media table

**Acceptance Criteria**:

**Given** I upload an image I didn't create
**When** adding it
**Then** I can specify artist name, source URL, and license

**Given** an image has attribution
**When** viewing it
**Then** artist credit is displayed below the image

**Database Requirements**: Add `artist_name`, `source_url`, `license` to media tables

---

### US-20.12: Featured/Pinned Content

**As an** admin
**I want to** feature or pin content
**So that** important posts are highlighted

**Current Gap**: No featured content system

**Acceptance Criteria**:

**Given** I am an admin
**When** I feature a post
**Then** it appears in a "Featured" section on the homepage

**Given** I am a kinship leader
**When** I pin an announcement
**Then** it stays at the top of the kinship feed

**Database Requirements**: Add `is_featured`, `is_pinned`, `pinned_until` to posts

---

### US-20.13: API Rate Limiting Per User

**As the** system
**I want to** rate limit users individually
**So that** abuse is prevented while not affecting normal users

**Current Gap**: IP-based rate limiting only (planned)

**Acceptance Criteria**:

**Given** a user is making many requests
**When** they exceed 100 requests/minute
**Then** they receive 429 Too Many Requests

**Given** a user is rate limited
**When** they wait for the window to reset
**Then** they can make requests again

---

### US-20.14: Account Recovery Options

**As a** user
**I want to** set up account recovery methods
**So that** I can regain access if I forget my password

**Current Gap**: Email-only recovery

**Acceptance Criteria**:

**Given** I am in security settings
**When** I set up recovery
**Then** I can add security questions or backup email

**Given** I forget my password and email
**When** I request recovery
**Then** I can use security questions to verify identity

---

### US-20.15: Activity History/Timeline

**As a** user
**I want to** view my account activity history
**So that** I can review my actions

**Current Gap**: No activity logging for users

**Acceptance Criteria**:

**Given** I am logged in
**When** I view my activity history
**Then** I see login times, posts created, comments made

**Given** I see suspicious activity
**When** reviewing history
**Then** I can revoke sessions or change my password

**Database Requirements**: New `user_activity_log` table

---

## Feature Completeness Analysis

### ✅ Well-Covered Areas:
- Authentication & account management
- Character/profile creation
- Post creation (multiple types)
- Comments system
- Media uploads
- Character relationships
- Events & calendar
- Moderation tools
- Search & discovery
- Social features (following, reactions)

### ⚠️ Partially Covered:
- Privacy controls (needs expansion)
- Notifications (basic structure, needs detail)
- Email system (needs templates)
- Admin tools (needs more features)

### ❌ Missing/Underdeveloped:
- **Blocking system** (critical for user safety)
- **Content warnings** (important for community)
- **Character status tracking** (deceased, retired)
- **Mention system** (@username tagging)
- **Privacy levels** (public, followers-only, private)
- **Content scheduling** (publish later)
- **Multi-language support** (internationalization)
- **Image attribution** (artist credit)
- **Featured content** (admin curation)
- **User activity logs** (security/transparency)
- **Data portability** (export characters)
- **Read status tracking** (mark posts as read)
- **Content collections/series** (organize posts)
- **Ownership transfer** (character handoff)
- **Recovery options** (beyond email)

---

## Recommendations

### Priority 1 (Add Immediately):
1. **Blocking system** - Essential for user safety
2. **Content privacy controls** - Public/followers/private
3. **Mention system** - Core social feature
4. **Content warnings** - Community safety

### Priority 2 (Add Soon):
1. **Character status** (deceased, retired)
2. **Image attribution** - Respect artists
3. **Featured content** - Admin curation
4. **Read tracking** - User experience

### Priority 3 (Future):
1. **Content scheduling**
2. **Multi-language support**
3. **Data export**
4. **Activity logs**
5. **Collections/series**

---

## Total User Stories: 150+

This comprehensive set covers all mentioned features plus 15 critical missing features identified through analysis.
