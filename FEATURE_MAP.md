# APP FEATURE MAP

## Auth — Route: `/auth`

**Purpose:** Log in, sign up, reset password, or complete multi-factor authentication

**How user gets here:** Redirected from `ProtectedRoute` when not logged in; or user navigates to `/auth` directly

### Sections

#### Login Form (default mode)
Shown when user first arrives. Email + password login with optional "remember me" behavior via session persistence.

#### Sign Up Form
Toggle from login. Creates new account via Supabase Auth. Auto-creates profile row via `handle_new_user` DB trigger, then auto-sends welcome DM from StudyBot system user in a new conversation.

#### Forgot Password Flow
Email input → "Check your email" confirmation screen with instructions to reset via magic link.

#### MFA Verification
OTP input (6 digits) shown when user has two-factor authentication enabled. Smartphone icon header.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Text input | Email | Type email address | Populates credential field |
| Text input | Password | Type password | Populates credential field |
| Button (eye icon) | Show/Hide password | Toggles password visibility | Reveals or masks typed password |
| Button (link) | Forgot password? | Switches to forgot-password mode | User can reset password via email |
| Button (submit) | Log In / Sign Up / Reset Password | Submits the current form | Authenticates user and redirects to home, or sends reset email |
| Button (link) | Don't have an account? / Already have an account? | Toggles between login and signup | Switches form mode |
| OTP Input | MFA code (6 digits) | Accepts one digit per slot | Completes MFA challenge |
| Button | Verify | Submits MFA code | Authenticates user and redirects to home |
| Button | Cancel | Cancels MFA flow | Returns to login form |
| Button | Try again | Retries forgot-password | Sends another reset email |
| Button | Back to login | Returns to login from forgot mode | Abandons password reset |
| Button | Download App | Navigates to `/download` | Shows PWA install instructions |

---

## Home — Route: `/`

**Purpose:** Main dashboard — start studying, view progress, access all features from one place

**How user gets here:** Default route after login; tap Home in bottom nav

### Sections

#### Header
App logo ("Rutex JUPEB Master"), user avatar (tappable → HamburgerMenu), greeting based on time of day.

#### Quick Stats Row
Cards showing streak (🔥 N days), total questions answered, subjects studied, syllabus day count. Animated counters on first load.

#### Achievement Popup
Overlay that appears when a new achievement is unlocked. Shows achievement name + description + confetti animation. Auto-dismisses or tap to close.

#### Subject Cards Grid (4 cards)
Physics, Chemistry, Biology, Mathematics. Each card shows icon, subject name, description, question count, estimated study time. Biology and Math show lock overlay with countdown timer (24h from first activation, bypassed for admin). Staggered entrance animation.

#### Study Progress Ring
Radial progress chart showing overall study completion percentage.

#### CTA Button Row
Three action buttons side by side: "📋 30-Day Syllabus Plan" / "Continue" (resume existing), "⚡ Quick Quiz" (random 10-question), "📝 Past Questions" (navigate to /past-questions).

#### Quick Quiz Per Subject
Four `motion.button` elements below the subject cards, one per subject. "Quick Quiz — [Subject]" — starts a 10-question quiz filtered to that subject.

#### Upload Textbook Button
"📤 Upload Textbook" — opens file picker for uploading a PDF or image as a custom study question.

#### Achievements Panel
Expandable section showing recently earned achievement badges and progress toward locked ones.

#### Streak Display
Shows current streak count, today's study status (completed / not yet), and a motivational message.

#### Leaderboard Panel (Preview)
Top 5 leaderboard rows with user avatars, names, scores. "View Full Leaderboard" link → `/leaderboard`.

#### Session List View
When a 30-day syllabus plan is active, shows session cards with day number, progress bar, and continue button.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Button | 📋 30-Day Syllabus Plan / Continue | Creates new or resumes existing 30-day study plan | Opens SyllabusSetup overlay to choose subject combination |
| Button | ⚡ Quick Quiz | Starts a 10-question mixed-subject quiz | Opens QuizSetup → QuizMode |
| Button | 📝 Past Questions | Navigates to `/past-questions` | Full past questions viewer |
| Subject Card (×4) | [Subject name] | Tap card | Opens StudyView for that subject |
| Button | Quick Quiz — [Subject] (×4) | Starts subject-filtered 10-question quiz | Opens QuizSetup → QuizMode with preset subject |
| Button | 📤 Upload Textbook | Opens file picker | Creates a custom question from uploaded content |
| Achievement Popup | [Achievement name] | Auto-dismiss / tap to close | Shows newly earned achievement details |
| Link | View Full Leaderboard | Navigates to `/leaderboard` | Opens leaderboard page |
| Session card | [Day N] / Continue | Resumes syllabus session | Opens that day's task list in session view |

---

## Past Questions — Route: `/past-questions`

**Purpose:** Browse and practice JUPEB past questions by subject, year, and category (Objective, Theory, Practical)

**How user gets here:** Tap "Questions" in bottom nav, tap "📝 Past Questions" on home, or navigate directly

### Sections

#### Search Bar
Top search input with filter chips (subject buttons) below results. Searches across question text, shows count per subject. Clear button to reset.

#### Bookmarks Button
Heart icon button that opens the bookmarked questions panel (slide-over list of saved questions).

#### Admin Shield Button (admin only)
Shield icon button that opens the Admin Question Panel for editing/managing question bank.

#### Study Category Tabs
Three segmented tabs: Objective (MCQ), Theory (written), Practical (lab/experiment). Shows question count per category. Active tab highlighted with gradient animation.

#### Subject Card Grid
2×2 grid of subject cards (Physics, Chemistry, Biology, Math). Shows subject icon, name, description, question count, estimated time, "Start Practice" CTA. Lock overlay on Biology/Math with countdown timer.

#### Year Accordion
Collapsible list of years per subject+category. Each year header shows question count + category breakdown chips. Expand → "View Questions" button and (admin) "Analyze N Questions" button.

#### Question Viewer
Full question display with:
- MCQ options (select → instant correct/wrong feedback with explanation)
- Theory text input via `ImageAnswerInput` (textarea + image uploads + AI marking)
- Practical sub-sections (title, objective, apparatus, procedure, sub-questions)
- Progress bar, question counter, jump-to-grid modal
- Bookmark toggle
- AI Tutor button
- Previous/Next navigation
- "Submit All" to complete and see results

#### Study Timer
Circular SVG timer with preset durations (5/10/15/30 min), custom minute input, pause/resume/stop controls. Color transitions from primary → amber → red as time runs out. "No timer" mode toggle.

#### Results Screen
After submitting all questions: score percentage, per-question correct/wrong feedback, "Try Again" button. Confetti animation if score ≥ 70%.

#### Bookmark List
Slide-over panel showing all bookmarked questions with preview text. Tap to view full question. Remove bookmark button per item.

#### Admin Question Panel (admin only)
Modal for editing/adding questions: drag-to-reorder, image upload with crop, question text editor with Math preview, options editor, correct answer selection, difficulty/topic sorting, explanation field, AI analysis button (auto-fills fields). Previous/Next navigation when editing multiple. Delete with confirmation.

#### Batch Analysis Bar (admin only)
Fixed bottom bar showing AI analysis progress. Minimizable. Shows active item progress, queue status (completed/failed/queued), cancel and "Clear completed" actions.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Input | Search questions | Type query → debounced filter | Filters questions across all subjects |
| Button (chip) | Physics / Chemistry / Biology / Math | Tap subject chip | Filters search results to that subject |
| Button (close) | X | Clears search query | Resets to full question list |
| Button | Bookmarks (heart icon) | Opens bookmark panel | Shows saved questions |
| Button | Admin (shield icon, admin only) | Opens admin panel | Question management interface |
| Category tab | Objective / Theory / Practical | Tap tab | Switches question category |
| Subject card | [Subject] | Tap card | Selects subject, shows year accordion |
| Year header | [Year] (N questions) | Tap to expand | Shows actions for that year |
| Button | View Questions | In expanded year | Opens Question Viewer for that year |
| Button | Analyze (admin) | In expanded year | Triggers batch AI analysis of all questions |
| MCQ option | A / B / C / D | Select answer | Shows correct/wrong feedback + explanation |
| Textarea | Type answer (Theory mode) | Type response | Prepares answer for AI evaluation |
| Button | Submit & Mark | Uploads answer + images | Triggers AI evaluation of theory answer |
| Button | View AI Feedback | Opens feedback panel | Shows AI score + detailed feedback + follow-up chat |
| Button | Try Again | Resets quiz state | Retakes the same set of questions |
| Button | Submit All | Completes quiz | Shows results with score + per-question feedback |
| Timer preset | 5 / 10 / 15 / 30 min | Tap to start timer | Begins countdown with visual progress |
| Button | Pause / Resume / Stop | Timer controls | Pauses, resumes, or stops the study timer |
| Toggle | No timer / Enable Timer | Toggle timer off/on | Study without time pressure |
| Button | Previous / Next | Navigate questions | Moves between questions in the set |
| Button | Jump to [N] (grid) | Opens grid modal | Quick navigation to any question |
| Button | Bookmark toggle (heart) | Toggle bookmark on question | Adds/removes from saved questions |
| Button | AI Tutor | Opens AI tutor panel | AI help with the current question |
| Bookmark item | [Question preview] | Tap to view | Opens that bookmarked question |
| Button | Remove bookmark (X) | In bookmark list | Removes question from bookmarks |
| Drag handle | ☰ (admin) | Drag to reorder | Rearranges question order |
| Image dropzone | Drop image or click (admin) | Upload question image | Adds image to question |
| Button | Analyze with AI (admin) | Auto-fills fields | AI generates question text, options, explanation |
| Button | Save (admin) | Saves changes | Persists question edits to database |
| Button | Cancel (admin) | Closes admin panel | Discards unsaved changes |
| Batch bar | Analyzing... / Analysis complete | Tap to expand/minimize | Shows batch analysis progress |

---

## Chat — Route: `/chat`

**Purpose:** Real-time messaging with other users — DM, group chats, file sharing, voice notes

**How user gets here:** Tap Chat in bottom nav; tap "Message" on another user's profile; link with `?dm=userId` from any page

### Sections

#### Sidebar (Conversation List)
Shows all conversations sorted by most recent message. Each row: user avatar, display name, last message preview, timestamp, unread badge. Active conversation highlighted.

#### Sidebar (Friends Tab)
Dual-tab layout: Chats | Friends. Friends tab shows friend list with online indicators and "Message" button per friend.

#### Friend Request Section
Incoming requests at top with Accept/Decline buttons per request. Outgoing requests section with Cancel button.

#### Chat Area (Active Conversation)
Message thread with:
- Messages rendered as bubbles (own vs other alignment)
- Text, image, file, voice note message types
- Reactions (emoji picker on long-press/hover)
- Reply preview when replying to a message
- Edited / deleted message indicators
- Typing indicators
- Date separators for multi-day conversations

#### Chat Input Bar
Text input, image upload button, file upload button, voice note button, send button. Supports pasting images from clipboard.

#### Voice Recorder
Hold-to-record interface with waveform visualization, recording duration, lock-to-continue gesture, send/cancel after recording.

#### User Search / Add Friend
Search input at top with results showing avatar + name + "Add" button. Debounced search against all users.

#### User Profile Dialog
Slide-over profile card when tapping another user's avatar or name. Shows avatar, display name, mutual friends count, bio, message/unfriend/add buttons.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Tab button | Chats / Friends | Switch tab | Toggles conversation list vs friend list |
| Conversation row | [User] [last message] | Tap | Opens that conversation in Chat Area |
| Input | Search users | Type query → debounced | Shows matching users with Add button |
| Button | Add | On search result | Sends friend request |
| Button | Accept | On incoming request | Confirms friend request |
| Button | Decline | On incoming request | Rejects friend request |
| Button | Cancel | On outgoing request | Withdraws request |
| Button | Message | On friend row | Opens DM with that friend |
| Button | Send (paper plane) | In chat input | Sends typed message |
| Button | Image attach (image icon) | Opens file picker | Selects and sends an image |
| Button | File attach (file icon) | Opens file picker | Selects and sends a file |
| Button | Voice note (mic icon) | Starts voice recording | Records audio message |
| Message bubble | [Message content] | Long-press/hover | Opens reaction picker |
| Reactions | [Emoji] | Tap on reaction picker | Adds reaction to message |
| Reply | Reply preview | Tap reply preview | Scrolls to original message |
| Edited indicator | (edited) | Tap | Shows edit history (if available) |
| User avatar | [Avatar] | Tap | Opens UserProfileDialog |
| Button | Unfriend (in profile) | Confirms unfriend | Removes friend connection |
| Input | Message text | Type message content | Composes a text message |
| Voice button (locked) | Slide to lock | Swipe up while recording | Locks recording without holding |
| Button | Send (voice) | After recording | Sends voice message |
| Button | Cancel (voice) | During/after recording | Discards voice message |

---

## Leaderboard — Route: `/leaderboard`

**Purpose:** Weekly competitive ranking — see how you stack up against other students

**How user gets here:** Tap Leaderboard in bottom nav; tap "View Full Leaderboard" on home

### Sections

#### My Rank Card
At top: shows user's current rank (with crown icon for #1), score, and "Share" button. If unranked: "Start studying to earn points" with "Go Study Now" CTA.

#### Weekly Countdown
Shows time remaining in current leaderboard week (resets every Monday).

#### Leaderboard Rows
Ranked list of users: rank number, avatar, display name, score. Current user's row labeled "You". Tap any row to view that user's achievement preview dialog.

#### Past Champions Section
Collapsible section below the leaderboard. Shows previous weekly winners with date ranges. Only appears when past champion data exists.

#### Achievement Preview Dialog
Modal overlay showing a user's unlocked achievements (filtered by rarity). Shows badge, name, description per achievement.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Button | Share | Opens share sheet | Shares your rank and score |
| Button | View My Achievements | Opens achievement preview | Shows your own unlocked achievements |
| Button | Go Study Now | Navigates to home | Encourages studying to earn points |
| Button | Past Champions | Toggle expand/collapse | Shows/hides past winners |
| Leaderboard row | [User] [rank] [score] | Tap row | Opens that user's achievement preview |
| Button | Chat (on other user's row) | Opens DM | Starts a chat with that user |
| Button | My Achievements (on own row) | Opens own preview | Shows your achievements |

---

## Profile — Route: `/profile`

**Purpose:** View and manage your profile; view other users' profiles when navigated to from elsewhere

**How user gets here:** Tap Profile in bottom nav; tap user avatar/name elsewhere in the app (routes with `?user=userId`)

### Sections (Own Profile)

#### Avatar + Header
Profile picture (tappable for large view), display name, email, joined date. Camera button to upload new avatar.

#### Quick Stats Row
Cards for streak, study time, questions answered, achievements count.

#### Achievements Section
Grid of unlocked achievement badges sorted by rarity. "View all X achievements" link → `/achievements`. Elite section for Legendary/Epic items.

#### Account Actions
Settings button → `/settings/profile`. Sign Out button (with confirmation). Delete Account button (with "DELETE" confirmation text input to prevent accidents).

#### Support Section
Admin email link, WhatsApp contact link for activation code purchases.

### Sections (Other User Profile)

#### Avatar + Header
Profile picture, display name, bio (if public), joined date.

#### Action Buttons
Context-dependent: Add Friend / Cancel Request (pending) / Accept + Decline (incoming) / Message + Unfriend (already friends).

#### Achievements Section (public)
Grid of that user's unlocked achievements (if privacy allows).

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Button | Camera icon | Opens file picker | Uploads new avatar |
| Input | Display name | Edit and save | Updates display name |
| Button | Save changes | Saves profile edits | Persists name to database |
| Button | Settings (gear icon) | Navigates to `/settings/profile` | Opens profile settings |
| Button | Sign Out | Signs out | Returns to login |
| Button | View all X achievements | Navigates to `/achievements` | Full achievements page |
| Link | [Admin email] | Opens mailto | Contact support |
| Link | WhatsApp | Opens WhatsApp | Contact via WhatsApp |
| Button | Delete Account | Opens confirmation dialog | Starts account deletion flow |
| Button (confirm) | Type "DELETE" + Confirm | Deletes account | Permanently removes user data |
| Button | Message | On other user | Opens DM with that user |
| Button | Add Friend | On other user | Sends friend request |
| Button | Unfriend | On friend | Removes friend connection |
| Button | Accept / Decline | On incoming request | Responds to friend request |
| Button | Cancel Request | On pending outgoing | Withdraws request |

---

## Settings: Profile — Route: `/settings/profile`

**Purpose:** Edit personal profile settings, avatar, display name, bio, theme, privacy controls

**How user gets here:** Tap Settings on Profile page; also accessible via chat settings button

### Sections

#### Avatar Editor
AvatarCropper component: click to upload image, crop with aspect ratio controls, save. Shows current avatar preview.

#### Display Name
Text input pre-filled with current name. Save button persists to database.

#### Bio
Textarea for short personal description. Saved with Save button.

#### Theme Toggle
Sun/Moon icon buttons for light/dark mode. Uses `next-themes`.

#### Security
Navigation link → `/settings/security` with chevron-right indicator.

#### Privacy Settings
Dropdown selects per privacy field: who can view online status, achievements, study stats, syllabus progress, friend list. Options: Everybody / Friends / Nobody.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Button | Avatar area | Opens file picker | Uploads new profile picture |
| Button | Cropper presets (Free, 1:1, 4:3, etc.) | Changes crop aspect ratio | Adjusts crop bounds |
| Button | Use Original | Skips cropping | Keeps original image |
| Button | Apply Crop | Crops and saves | Updates avatar |
| Button | Cancel (cropper) | Closes cropper | Discards crop |
| Input | Display name | Edit text | Changes display name |
| Textarea | Bio | Edit text | Changes profile bio |
| Button | Save (disk icon) | Saves all changes | Persists edits |
| Button | Dark mode (moon) | Toggle theme | Applies dark theme |
| Button | Light mode (sun) | Toggle theme | Applies light theme |
| Link | Security | Navigates to `/settings/security` | Opens security settings |
| Select | Privacy: Online Status | Choose option | Sets who can see online status |
| Select | Privacy: Achievements | Choose option | Sets who can see achievements |
| Select | Privacy: Study Stats | Choose option | Sets who can see stats |
| Select | Privacy: Syllabus Progress | Choose option | Sets who can see syllabus progress |
| Select | Privacy: Friend List | Choose option | Sets who can see friend list |

---

## Settings: Security — Route: `/settings/security`

**Purpose:** Manage two-factor authentication (MFA) for account security

**How user gets here:** Tap "Security" link from Settings/Profile page

### Sections

#### MFA Status Card
Shows current MFA status: Active (with green checkmark) or Inactive (with red X).

#### Enroll Flow (when inactive)
"Enable Two-Factor Authentication" button → shows QR code / secret key for authenticator app setup → OTP verification input → enrolls and shows "Active" status.

#### Disable Flow (when active)
"Disable Two-Factor Authentication" button (destructive styling) → immediately removes MFA.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Button | Enable Two-Factor Authentication | Starts MFA enrollment | Shows QR code + secret key |
| Button | Copy (secret key) | Copies to clipboard | Pastes into authenticator app |
| OTP Input | Verification code (6 digits) | Type digits | Verifies authenticator setup |
| Button | Verify | Submits OTP | Completes MFA enrollment |
| Button | Cancel | Cancels enrollment | Returns to idle state |
| Button | Disable Two-Factor Authentication | Confirms disable | Removes MFA from account |

---

## Friends — Route: `/friends`

**Purpose:** Manage your friend list, see who's online, view and respond to requests

**How user gets here:** Tap Friends link in HamburgerMenu; also managed inline on Chat page

### Sections

#### Search / Filter
Search input to filter friends by display name.

#### Friend List
Grid/list of friends with avatar, display name, online indicator (green dot). Tap to view profile or Message button.

#### Incoming Requests
Section at top (only when pending). Shows requester avatar + name + Accept/Decline buttons.

#### Outgoing Requests
Section (only when pending). Shows requested user avatar + name + Cancel button.

#### Empty State
When no friends yet: illustration + message encouraging friend discovery.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Input | Search friends | Type to filter | Filters friend list |
| Friend row | [Avatar + Name] | Tap | Opens UserProfileDialog |
| Button | Message | On friend row | Opens DM with that friend |
| Button | Accept | On incoming request | Confirms friend request |
| Button | Decline | On incoming request | Rejects friend request |
| Button | Cancel | On outgoing request | Withdraws request |

---

## Achievements — Route: `/achievements`

**Purpose:** Browse all achievements, see which are unlocked/locked, filter by rarity

**How user gets here:** Tap Achievements link in HamburgerMenu; tap "View all" on Profile

### Sections

#### Stats Header
Shows total unlocked count and per-rarity breakdown.

#### Search + Filter Bar
Search input to filter by achievement name. Rarity filter pills: All, Common, Rare, Epic, Legendary. Color-coded pills.

#### Achievement Grid
Card-style grid showing achievement badge, name, description, rarity color. Locked ones shown in grayscale with lock icon. Unlocked ones in full color.

#### Empty State
"No achievements match your filters" with "Clear filters" button (when search/filter yields no results).

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Input | Search achievements | Type to filter | Filters grid by name |
| Button (pill) | All / Common / Rare / Epic / Legendary | Tap filter | Shows only that rarity |
| Button | Clear filters | Resets all filters | Shows full achievement list |
| Achievement card | [Achievement name] | Tap | (Visual only — shows details) |

---

## Study Stats — Route: `/stats`

**Purpose:** Visual dashboard of study performance, progress, and streaks

**How user gets here:** Tap Study Stats link in HamburgerMenu

### Sections

#### Overview Cards
Four stat cards: Total Questions, Current Streak, Subjects Studied, Mastery (percentage of learned questions). Animated value counters.

#### Weekly Score Chart
Bar chart (recharts) showing total score points earned per week for the last 12 weeks. Empty state: "Start studying to see your progress."

#### Subject Breakdown
Per-subject stats: questions studied, correct rate, mastery progress. Color-coded by subject.

#### Recent Activity
Timeline of recent score events with reason icons (quiz, streak, achievement, etc.).

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Button | Back (arrow) | Navigate back | Returns to previous page |

---

## Discover — Route: `/discover`

**Purpose:** Find and connect with other students, see top scorers

**How user gets here:** Tap Discover link in HamburgerMenu

### Sections

#### Search Input
Search users by display name (debounced).

#### Online Now Section
Horizontal scrollable row of currently online users (avatars + names). Only shown when users are online.

#### Top Scorers
List of top 20 users by total lifetime score. Shows rank, avatar, display name, score. Tap to view profile or "View Profile" button. Hidden during active search.

#### Search Results
Filtered user list when searching. Each result shows avatar, name, score, "View Profile" button. Empty state when no match.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Input | Search users | Type to filter | Shows matching users |
| User row | [Avatar + Name] | Tap | Opens user's profile |
| Button | View Profile | On user row | Opens user's profile |

---

## Syllabus — Route: `/syllabus`

**Purpose:** Browse the JUPEB syllabus by subject — topics and subtopics for all subjects

**How user gets here:** Tap Syllabus link in HamburgerMenu

### Sections

#### Search Input
Filters subjects and topics by keywords. Real-time filtering.

#### Subject Accordion
Collapsible sections per subject (Physics, Chemistry, Biology, Math). Each expanded subject shows its topic list with expandable subtopics. Count of topics per subject shown in header.

#### Topic Content
Each topic expands to show subtopics as indented list items.

#### Empty State
"No results found for [query]" when search yields no matches.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Input | Search syllabus | Type to filter | Filters visible subjects/topics |
| Subject header | [Subject name] (N topics) | Tap to expand | Shows topic list |
| Topic header | [Topic name] | Tap to expand | Shows subtopics |

---

## Download App — Route: `/download`

**Purpose:** Install the PWA or get download instructions for native app

**How user gets here:** Tap "Get App" in HamburgerMenu; "Download App" button on Auth page

### Sections

#### Install Instructions (Android)
Shows "Install App" button if PWA install prompt available. Otherwise shows step-by-step: Chrome menu → "Add to Home screen".

#### Install Instructions (iOS)
Manual instructions: Share button → "Add to Home Screen" via Safari.

#### QR Code (Desktop)
QR code linking to the app URL for mobile scanning. Only shown on non-mobile devices.

#### Already Installed State
When running in standalone mode (display-mode: standalone), shows "App Installed" message.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Button | Install App | Triggers PWA install prompt | Installs app to home screen |
| Link | Open Web App | Navigates to `/` | Opens the web app |
| Link | Back to home | Navigates to `/` | Returns to home |

---

## Admin Dashboard — Route: `/admin`

**Purpose:** Administrative hub — manage activation codes, view platform stats, configure API keys

**How user gets here:** Tap Admin link in HamburgerMenu (only visible to admin users); also `AdminRoute` guard

### Sections

#### Section Tabs
Toggle between "Admin" (dashboard) and "API Key Vault" tabs.

#### Dashboard Tab
- **Stat Cards**: animated counters for total users, active users, total codes, revenue, codes used today
- **Charts**: User Growth (area chart, last 30 days), Plan Distribution (pie chart), Revenue Trend (bar chart), Recent Activations (timeline list)
- **Code Generator**: quantity selector (1/5/10/25/50/100 buttons), plan type select (Basic/Premium/Lifetime), Generate button
- **Generated Codes**: list of new codes with Copy button per code, "Copy all" button, "Clear" button
- **Codes Table**: sortable table of all existing codes showing code, plan, status (used/available), created date, used by, used at
- **Export CSV**: downloads all codes as CSV file

#### API Key Vault Tab
[AIKeyVault component] Interface for managing AI API keys. Shows current key status, allows adding/rotating keys.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Button | Refresh | Reloads dashboard data | Updates all stats and tables |
| Button | Codes (nav) | Navigates to `/admin/codes` | Dedicated codes management page |
| Button | Sign Out | Signs out | Returns to login |
| Button (tab) | Admin / API Key Vault | Switch section | Toggles dashboard vs key vault |
| Quantity button | 1 / 5 / 10 / 25 / 50 / 100 | Select quantity | Sets codes to generate |
| Select | Basic / Premium / Lifetime | Choose plan type | Sets plan for generated codes |
| Button | Generate | Creates codes | Inserts codes into database |
| Button | Copy (clipboard) | Per generated code | Copies single code |
| Button | Copy all | Copies all generated codes | Bulk copy |
| Button | Clear | Clears generated list | Removes displayed codes |
| Button | Copy (in codes table) | Per existing code | Copies code to clipboard |
| Button | Export CSV | Downloads CSV | All codes as spreadsheet |

---

## Activation Codes (Admin) — Route: `/admin/codes`

**Purpose:** Dedicated page for activation code management (subset of Admin Dashboard)

**How user gets here:** Navigate from Admin Dashboard "Codes" button

### Sections

#### Code Generator
Same as dashboard: quantity selector + plan type + Generate button.

#### Generated Codes List
Shows newly generated codes with individual and bulk copy.

#### Codes Table
Full table of existing codes: code, plan, status, created date, used by, used at timestamps.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Button | Refresh | Reloads data | Updates codes table |
| Button | Sign Out | Signs out | Returns to login |
| Quantity button | 1 / 5 / 10 / 25 / 50 / 100 | Select quantity | Sets codes to generate |
| Select | Basic / Premium / Lifetime | Choose plan type | Sets plan for generated codes |
| Button | Generate | Creates codes | Inserts codes into database |
| Button | Copy (per code) | Copies code | Individual copy |
| Button | Copy all | Copies all generated | Bulk copy |

---

## NotFound — Route: `*` (catch-all)

**Purpose:** 404 page for unknown routes

**How user gets here:** Navigate to any URL that doesn't match a defined route

### Sections

#### Error Message
"Page not found" heading with description.

#### Return Link
Button linking back to home.

### Interactive Elements

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Button | Return to Home | Navigates to `/` | Returns to home page |

---

## GLOBAL COMPONENTS

### Bottom Navigation (`BottomNav.tsx`)

Fixed at bottom of screen on all authenticated pages. Five tabs + Menu button:

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Tab | Home (house icon) | Navigates to `/` | Go to dashboard |
| Tab | Questions (book icon) | Navigates to `/past-questions` | Browse past questions |
| Tab | Chat (speech bubble icon) | Navigates to `/chat` | Open messaging |
| Tab | Leaderboard (trophy icon) | Navigates to `/leaderboard` | See rankings |
| Tab | Profile (user icon) | Navigates to `/profile` | View profile |
| Button | Menu (hamburger icon) | Opens HamburgerMenu drawer | Full navigation sidebar |

Active tab highlighted with indicator dot. Chat tab shows unread count badge with "stale" dashed border indicator.

### Hamburger Menu (`HamburgerMenu.tsx`)

Slide-in drawer from left. Opens via Menu button in BottomNav. Contains:

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Header | User avatar + display name | Tap avatar | Opens profile |
| NotificationBell | NotificationCenter component | Shows notification count | Quick access to notifications |
| Link | Home | Navigates to `/` | Dashboard |
| Link | Past Questions | Navigates to `/past-questions` | Study past questions |
| Link | Study Chat | Navigates to `/chat` | Messaging |
| Link | Friends | Navigates to `/friends` | Manage friends |
| Link | Leaderboard | Navigates to `/leaderboard` | Rankings |
| Link | Achievements | Navigates to `/achievements` | Achievements list |
| Link | Study Stats | Navigates to `/stats` | Performance dashboard |
| Link | Syllabus | Navigates to `/syllabus` | Browse syllabus |
| Link | Discover | Navigates to `/discover` | Find users |
| Link | Profile | Navigates to `/profile` | Edit profile |
| Link | Get App | Navigates to `/download` | Install PWA |
| Link | Admin (admin only) | Navigates to `/admin` | Admin dashboard |
| Button | Sign Out (at bottom) | Signs out | Returns to login |

Staggered entrance animation on links. Escape key or backdrop tap to dismiss.

### Floating AI Tutor (`FloatingAITutor.tsx`)

Draggable FAB (floating action button) visible on all authenticated pages. Opens a full chat panel:

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| FAB | AI icon | Tap to open | Opens AI tutor chat panel |
| Panel | Chat area | Shows conversation history | View AI tutor responses |
| Input | Ask anything... | Type a question | AI answers with context |
| Button | Send | Submits question | AI generates response with streaming |
| Button | Quick prompts | Tap preset questions | Quick AI interactions |
| Button | File attach | Uploads file for context | AI reads file content |
| Button | New Chat | Starts fresh conversation | Resets chat context |
| Chat history | Previous chats | Switch between conversations | Access past AI sessions |
| Button | Delete chat | Removes conversation | Clears chat history |

FAB is draggable with snap-to-corner physics. Panel resizable.

### In-App Notification Bar (`InAppNotificationBar.tsx`)

Fixed top bar that slides in for real-time notifications (active on all pages):

| Event | Trigger | Content | Action |
|-------|---------|---------|--------|
| New chat message | `chat-new-message` custom event | Avatar + "New message from [name]" + preview | "View" / "Reply" buttons |
| Friend request | Realtime `friend_requests` INSERT | Avatar + "[name] sent you a friend request" | "View" button |
| New conversation | Realtime `conversation_participants` INSERT | Avatar + notification | "View" button |

Auto-dismisses after 5 seconds. Animated with spring physics. Tracks dismissed IDs to avoid repeats.

### Feature Tour (`FeatureTour.tsx`)

Onboarding overlay available from any page via a FAB:

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| FAB | Tour (compass icon) | Tap to start | Opens tour intro |
| Spotlight cutout | Highlighted element | Shows explanation below | Contextual walkthrough |
| Navigation dots | Step indicators | Tap to navigate | Jump between tour steps |
| Button | Next / Got it | Advance tour | Progress to next step |
| Button | Skip | End tour | Dismisses overlay |
| Bottom sheet | Tour content | Shows step title + description + benefit | Educational onboarding |

Pages covered in tour order: Home → Past Questions → Study View → Quiz → Chat → Leaderboard → Achievements → Profile → Syllabus → Discover.

### PWA Install Prompt (`InstallPrompt.tsx`)

Auto-shown bottom card on first visits (dismissible, remembers dismissal):

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| Card | Install prompt | Shows app icon + description + install button | Prompts PWA installation |
| Button | Install | Triggers browser install prompt | Adds to home screen |
| Button | Not now | Dismisses | Hides until next visit |

### Push Notifications Setup (`usePushNotifications.ts`)

Background hook that subscribes to Web Push via VAPID:

| Element | Label | Action | Result/Benefit |
|---------|-------|--------|----------------|
| (auto) | Browser permission prompt | First time push is triggered | "Allow" / "Block" |
| (auto) | Subscribe to push | After permission granted | Saves push subscription to `notification_subscriptions` table |

Triggers: achievements unlocked, streak milestones, new chat messages (when app is backgrounded).

---

## NAVIGATION FLOW

### Screen-to-Screen Movement Map

```
[Auth] ──login/signup──► [Home]
  │                         │
  │                         ├──► [Past Questions] (tap "📝 Past Questions" or BottomNav Questions tab)
  │                         │       ├──► [Study View] (select subject + year)
  │                         │       │       ├──► [Question Viewer] (MCQ / Theory / Practical)
  │                         │       │       │       ├──► [Results] (submit all)
  │                         │       │       │       └──► [AI Tutor] (tap AI button)
  │                         │       │       └──► [Admin Panel] (admin only, shield button)
  │                         │       ├──► [Syllabus] (from hamburger menu)
  │                         │       └──► [Bookmarks] (from heart button overlay)
  │                         │
  │                         ├──► [Chat] (tap "Chat" BottomNav or Message button on profiles)
  │                         │       ├──► [User Profile Dialog] (tap avatar/name)
  │                         │       │       └──► [Profile] (tap "View Profile")
  │                         │       ├──► [Voice Recorder] (tap mic in chat input)
  │                         │       └──► [Settings/Profile] (tap gear icon)
  │                         │
  │                         ├──► [Leaderboard] (tap "Leaderboard" BottomNav)
  │                         │       └──► [Achievement Preview] (tap a row)
  │                         │
  │                         ├──► [Profile] (tap "Profile" BottomNav)
  │                         │       ├──► [Settings/Profile] (tap gear)
  │                         │       │       ├──► [Settings/Security] (tap "Security")
  │                         │       │       └──► [Privacy Settings] (dropdowns)
  │                         │       ├──► [Achievements] (tap "View all")
  │                         │       ├──► [Delete Account] (danger zone)
  │                         │       └──► [Other User Profile] (via `?user=userId`)
  │                         │
  │                         ├──► [Quiz Mode] (tap "⚡ Quick Quiz" or per-subject quiz)
  │                         │       └──► [Quiz Setup] (configure quiz options)
  │                         │
  │                         ├──► [Syllabus Setup] (tap "30-Day Syllabus Plan")
  │                         │       └──► [Session List] (active plan → day tasks)
  │                         │
  │                         └──► [HamburgerMenu] (tap menu icon in BottomNav)
  │                               ├──► [Friends]
  │                               ├──► [Achievements]
  │                               ├──► [Study Stats]
  │                               ├──► [Syllabus]
  │                               ├──► [Discover]
  │                               ├──► [Download App]
  │                               └──► [Admin Dashboard] (admin only)
  │                                       └──► [Activation Codes]
  │
  ├──► [Discover] ──view profile──► [Profile (other user)]
  ├──► [Friends] ──message──► [Chat]
  ├──► [Download App] ──install──► [Home Screen (standalone)]
  └──► [NotFound] ──go home──► [Home]
```

### New User Journey (First Open to Full Usage)

1. **First Open** → `/` redirects to `/auth` (not logged in)
2. **Sign Up** → Create account (email + password) → Auto-creates profile
3. **Welcome DM** → StudyBot system user sends welcome message → New conversation created
4. **Activation Gate** → Must enter activation code to proceed. Can purchase via WhatsApp/email.
5. **Home (activated)** → Dashboard with empty stats, 4 subject cards, CTA buttons
6. **First Study** → Tap "30-Day Syllabus Plan" → Choose subject combination → Start Day 1 tasks
   - OR tap subject card → StudyView with flashcards
   - OR tap "⚡ Quick Quiz" → Answer 10 questions → See score + streak starts
7. **Notifications** → Browser asks for notification permission → "Allow"
8. **Chat** → Tap Chat → See StudyBot's welcome message in conversation list → Reply
9. **Leaderboard** → After earning points, check rank → Share with friends
10. **Friends** → Discover → Find users → Send friend request → Accept → Chat
11. **Streak** → Study daily → 3-day streak unlocks first achievement (confetti + push notification)
12. **Syllabus** → Start 30-day plans → Complete days → Track progress
13. **Profile Setup** → Upload avatar → Set display name → Configure privacy → Enable MFA
14. **Advanced** → Upload textbooks for custom questions → Bookmark hard questions → Use AI tutor
15. **Admin (if admin)** → Generate activation codes → Monitor stats → Export CSV → Manage API keys

### Key Transition Triggers

| Trigger | From | To |
|---------|------|----|
| Not logged in | Any protected route | `/auth` |
| Login success | `/auth` | `/` |
| Tap BottomNav tab | Current page | Tab's route |
| Tap hamburger menu link | Current page | Link's route |
| Tap subject card on home | `/` | Subject StudyView |
| Tap "Quick Quiz" | `/` | QuizSetup |
| Tap "Message" on user | Any profile | `/chat?dm=userId` |
| Tap user avatar/name | Chat, Discover, Friends, Leaderboard | UserProfileDialog overlay |
| Tap "View Profile" | UserProfileDialog | `/profile?user=userId` |
| Achievement unlocked | Any page (auto-trigger) | AchievementPopup overlay |
| New chat message (backgrounded) | Any page | Push notification → tap opens chat |
| New AI features unlocked | Study session completion | Achievement popup + push notification |
| Admin dashboard nav | Admin link in HamburgerMenu | `/admin` |
