```markdown
# PIN & TELL — Web Administration System

PIN & TELL Web Admin is the administrative and moderation platform for the **PIN & TELL** mobile application.

The system provides administrators with tools for managing users, reviewing reported content, monitoring pins, handling moderation violations, applying enforcement actions, managing platform settings, and maintaining an auditable record of administrative activity.

The web administration system uses the **same Supabase backend and database** as the PIN & TELL Android application.

---

## Overview

PIN & TELL is an interactive map-based social platform designed around location-based community information and vehicle-related tracking.

The platform includes:

- Interactive map-based pins
- Pin and post functionality
- Mileage tracking
- Fuel monitoring
- Eco-driving insights
- Social interactions
- User reputation
- Reports and moderation
- Administrative management

The Web Admin system focuses primarily on:

- Content moderation
- User management
- Reports
- Pin management
- Automated content violations
- Ban management
- Platform configuration
- Administrative auditing

---

# Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React

## Backend

- Next.js Server Actions
- Next.js Route Handlers
- Supabase
- PostgreSQL

## Authentication

### Mobile Users

Mobile application users authenticate using:

```text
Supabase Auth
```

### Administrators

Administrators use a separate administrative authentication system backed by:

```text
public.admins
```

and the application's administrative session system.

Administrator authentication is intentionally separated from the mobile application's Supabase Auth user authentication.

---

# Project Architecture

```text
PIN & TELL
│
├── Android Application
│   │
│   ├── Supabase Auth
│   ├── Map Pins
│   ├── Social Features
│   ├── Mileage Tracking
│   ├── Fuel Monitoring
│   └── Eco-Driving
│
├── Next.js Web Admin
│   │
│   ├── Dashboard
│   ├── User Management
│   ├── Pin Management
│   ├── Reports
│   ├── Content Moderation
│   ├── Ban Management
│   ├── Platform Settings
│   └── Audit Logs
│
└── Supabase
    │
    ├── PostgreSQL Database
    ├── Supabase Auth
    ├── Storage
    └── Shared Application Data
```

Both applications operate on the same backend data.

---

# Core Administrative Features

## Dashboard

The administrative dashboard provides an overview of system activity and moderation information.

The dashboard can surface information such as:

- Users
- Pins
- Reports
- Moderation activity
- Platform statistics

---

# User Management

Administrators can inspect user accounts and associated information.

User information is primarily resolved from:

```text
profiles
```

When necessary, the administrative backend may use Supabase Auth as a fallback for account identity information.

This prevents valid users from unnecessarily appearing as:

```text
Unknown user
```

when profile information is incomplete.

---

# Pin Management

The Pins page provides administrators with a centralized view of map content.

Each pin can display:

- Pin title
- Category
- Subcategory
- Creator
- Coordinates
- Photo
- Description
- Likes
- Comments
- Vouches
- Open reports
- Creation date

Administrators can inspect a pin using the detailed side drawer.

---

## Pin Details

The pin drawer includes:

- Pin information
- Pin photo
- Category
- Description
- Engagement information
- Creator
- User link
- Coordinates
- Google Maps link
- Moderation information
- Record information

---

# Administrator Pin Flagging

Administrators can manually flag a pin for moderation.

Pins that do not currently have an open moderation case display:

```text
Flag
```

After selecting the action, the administrator can choose a report category and provide a reason.

Supported report types include:

- Spam
- Harassment
- Inappropriate
- Copyright
- Misinformation
- Other

Administrators can also provide optional additional details.

---

## Flagging Workflow

```text
Administrator
      │
      ▼
Pins Page
      │
      ▼
Flag Pin
      │
      ▼
Select Report Type
      │
      ▼
Enter Reason
      │
      ▼
Create Report
      │
      ▼
Reports Moderation Queue
```

A successful administrator flag creates a normal moderation case inside:

```text
reports
```

with:

```text
status = pending
```

The pin is then available for review through the Reports page.

---

## Duplicate Report Protection

The administrator cannot create another moderation case when the pin already has an open report with either:

```text
pending
```

or:

```text
reviewing
```

status.

Instead, the administrator is directed to the existing moderation case.

This prevents unnecessary duplicate moderation records.

---

# Reports Management

The Reports page provides administrators with a centralized moderation queue.

Reports can target:

- Pins
- Comments
- Chat messages
- Users

Supported report types include:

```text
spam
harassment
inappropriate
copyright
misinformation
other
```

---

## Report Statuses

Reports may use the following workflow statuses:

```text
pending
reviewing
resolved
dismissed
suspended
outdated
```

The primary moderation workflow is:

```text
Pending
   │
   ▼
Under Review
   │
   ├───────────────┐
   ▼               ▼
Resolved        Dismissed
```

---

# Report Review Drawer

Administrators can open a report to inspect the entire moderation case.

The drawer contains:

- Report ID
- Report type
- Submission date
- Reason
- Additional details
- Reported content
- Reporter
- Reported user
- Previous report count
- Assigned administrator
- Review date
- Moderation actions
- Ban action

---

# Reporter Identification

The system distinguishes between multiple reporter sources.

## User Reports

Reports submitted by application users are resolved using:

```text
reporter_id
```

The system attempts to resolve the reporter through:

```text
profiles
```

If the profile does not contain enough identity information, the backend can use Supabase Auth as a fallback.

The interface prioritizes:

```text
Full Name
↓
Username
↓
Email
```

Example:

```text
Lean Joshua Aclan
@lean
```

---

## Administrator Reports

Administrator-created pin flags are displayed using the administrator's actual identity.

Example:

```text
Ashley Antones    ADMIN
admin@example.com
```

Because:

```text
reports.reporter_id
```

references application users, an administrator-created flag does not impersonate a mobile user account.

Instead, the administrator identity is recorded in the audit log.

The report can then resolve the administrator from:

```text
logs
        ↓
admin_pin_flagged
        ↓
logs.user_id
        ↓
admins
```

This keeps the database relationships valid while preserving administrator accountability.

---

## Automated Moderation Reports

Cases generated automatically by the content moderation system are identified separately.

Example:

```text
PIN & TELL Moderation    SYSTEM
Automated moderation
```

This prevents automated cases from being incorrectly displayed as user reports.

---

# Automated Content Moderation

PIN & TELL includes automated moderation for newly submitted pin content.

The moderation system evaluates:

- Pin title
- Pin description

before the pin is accepted.

The Android application sends pin creation requests through:

```text
POST /api/pins
```

instead of inserting moderated pin content directly into the database.

---

# Moderated Content Categories

The moderation engine detects patterns associated with:

- Profanity
- Harassment
- Abusive language
- Serious threats

The moderation logic currently includes English and Filipino language patterns.

Examples of content categories may include:

```text
profanity
harassment
threat
```

The moderation system also assigns severity information that can be used by enforcement logic.

---

# Content Moderation Pipeline

```text
Android User
      │
      ▼
Create Pin
      │
      ▼
POST /api/pins
      │
      ▼
Authenticate User
      │
      ▼
Check Account Status
      │
      ▼
Moderate Title + Description
      │
      ├── Clean
      │      │
      │      ▼
      │   Insert Pin
      │
      └── Violation
             │
             ▼
        Record Strike
             │
             ▼
      Apply Enforcement
             │
             ▼
      Reject Pin Creation
```

Moderated content is rejected before the pin is inserted.

---

# Moderation Strike System

Content violations use a rolling:

```text
90-day active strike window
```

The progression is designed to begin with warnings and escalate after repeated violations.

---

## Strike 1

```text
Warning
```

The user receives an initial warning.

---

## Strike 2

```text
Warning
```

A second violation results in another warning.

---

## Strike 3

```text
Strong Warning
```

The user is informed that continued violations may result in account restrictions.

---

## Strike 4

```text
Final Warning
```

The user receives a final warning before temporary enforcement begins.

---

## Strike 5

```text
3-Day Suspension
```

Repeated violations result in a temporary three-day suspension.

---

## Strike 6

```text
Strong Warning
```

After returning from suspension, another violation generates another strong warning.

---

## Strike 7

```text
Final Escalation Warning
```

The user is warned again before a longer suspension.

---

## Strike 8

```text
7-Day Suspension
```

The account receives a seven-day temporary suspension.

---

## Strike 9

```text
Final Warning
```

The account receives another final warning.

---

## Strike 10

```text
30-Day Suspension
```

A thirty-day temporary suspension is applied.

---

## Strike 11+

```text
Administrator Review
```

The system does not automatically apply a permanent ban.

Instead, the user is escalated to the administrative moderation queue for manual review.

Administrators determine whether additional enforcement is appropriate.

---

# Serious Threat Handling

Certain serious threats can bypass the normal warning sequence and immediately create a moderation review case.

This allows administrators to inspect potentially high-risk content without waiting for the account to accumulate multiple ordinary strikes.

---

# Duplicate Violation Protection

Repeated submission of the exact same rejected content within approximately:

```text
120 seconds
```

does not continuously generate additional strikes.

This helps prevent accidental strike inflation caused by repeated submission attempts.

---

# Moderation Logging

Automated content moderation activity is recorded through the existing:

```text
logs
```

table.

Content policy violations use an action type similar to:

```text
content_policy_violation
```

The logging system can retain moderation metadata without storing the entire rejected message in ordinary audit logs.

---

# Moderation Violators Dashboard

The Reports page includes a section for users with automated moderation violations.

The section can display:

- Violators
- Active strikes
- Suspended users
- Users requiring review

The violations table can include:

```text
User
Active Strikes
Severity
Last Violation
Account Status
Enforcement
Action
```

---

## Violation Details

Selecting a moderation violator can show:

- User identity
- Account status
- Active strikes
- Violation history
- Latest violation
- Severity
- Violation categories
- Current suspension
- Suspension expiration
- Related moderation reports
- Moderation timeline

---

# Ban Management

Administrative enforcement is maintained separately from report workflow state.

Ban records are stored inside:

```text
user_bans
```

This separation allows:

```text
Report Moderation
```

and:

```text
Account Enforcement
```

to remain independently auditable.

---

## Supported Ban Types

The current database supports:

```text
temp
permanent
temp_ip
```

---

## Duration Types

Ban durations may use:

```text
hours
days
weeks
months
permanent
```

---

# Account Status

User account status is maintained through:

```text
profiles.status
```

Supported application statuses include:

```text
active
suspended
banned
```

---

# Audit Logging

Administrative and automated system activity is logged using:

```text
logs
```

Examples include:

```text
admin_pin_flagged
admin_report_status_changed
content_policy_violation
```

Audit logging helps maintain accountability for moderation and administrative actions.

---

# Database Tables Used

The moderation and administrative system works with the existing PIN & TELL database.

Important tables include:

```text
admins
admin_sessions
profiles
pins
reports
logs
user_bans
comments
chats
platform_settings
```

Additional PIN & TELL tables support the wider application.

No separate moderation database is required.

---

# Important Database Relationships

## Pins

```text
pins.creator_id
        │
        ▼
auth.users.id
```

---

## User Reports

```text
reports.reporter_id
        │
        ▼
auth.users.id
```

---

## Reported User

```text
reports.reported_user_id
        │
        ▼
auth.users.id
```

---

## Report Reviewer

```text
reports.reviewed_by
        │
        ▼
admins.id
```

---

## Administrator Flag Identity

Administrator flags intentionally use an audit trail rather than placing an administrator UUID in:

```text
reports.reporter_id
```

because that field belongs to application users.

The relationship is therefore:

```text
Report
   │
   ▼
Audit Log
   │
   ▼
Admin ID
   │
   ▼
admins
```

---

# API

## Create Pin

```http
POST /api/pins
```

The endpoint handles:

1. Bearer token validation
2. Supabase Auth user lookup
3. Account status validation
4. Active ban validation
5. Content moderation
6. Strike enforcement
7. Pin creation
8. Audit logging

---

## Unsupported GET Request

A GET request to the pin creation endpoint returns a method error.

Example:

```json
{
  "success": false,
  "error": "Method not supported by this endpoint.",
  "code": "METHOD_NOT_ALLOWED"
}
```

---

# Suggested Project Structure

```text
src/
│
├── app/
│   │
│   ├── admin/
│   │   └── (protected)/
│   │       ├── pins/
│   │       ├── reports/
│   │       ├── users/
│   │       └── settings/
│   │
│   └── api/
│       └── pins/
│           └── route.ts
│
├── components/
│   │
│   └── admin/
│       ├── pins/
│       ├── reports/
│       ├── bans/
│       └── settings/
│
└── lib/
    │
    ├── admin/
    │   ├── pins.ts
    │   ├── reports.ts
    │   └── content-violations.ts
    │
    ├── moderation/
    │   ├── content-moderation.ts
    │   └── enforcement.ts
    │
    ├── auth/
    │   └── session.ts
    │
    └── supabase/
        └── admin.ts
```

---

# Installation

Clone the repository:

```bash
git clone https://github.com/Ki-oshi/pin-and-tell-webadmin.git
```

Open the project:

```bash
cd pin-and-tell-webadmin
```

Install dependencies:

```bash
npm install
```

---

# Environment Configuration

Create:

```text
.env.local
```

Configure the required Supabase and application environment variables.

Example structure:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Additional environment variables required by your authentication/session implementation should also be configured.

> Never commit production credentials or service-role keys to GitHub.

---

# Development

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Administrative pages are available under:

```text
/admin
```

---

# Code Quality

Run ESLint:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

The recommended workflow after major changes is:

```bash
npm run lint
npm run build
npm run dev
```

---

# Moderation Testing

## Automated Moderation Test

1. Sign in through the Android application.
2. Attempt to create a pin containing moderated content.
3. Submit the pin.
4. Confirm the pin is rejected.
5. Confirm the warning is displayed.
6. Confirm the violation appears in administrative moderation data.

---

## Clean Pin Test

1. Create a normal pin.
2. Submit the pin.
3. Confirm the API accepts the request.
4. Confirm the pin appears in the database.
5. Confirm the pin appears on the Admin Pins page.

---

# Admin Flag Test

1. Open:

```text
/admin/pins
```

2. Select a pin with no active report.

3. Click:

```text
Flag
```

4. Select a report type.

5. Enter a reason.

6. Submit the flag.

Expected result:

```text
Pin Reports Count +1
Flag → Review
New Pending Report Created
Administrator Identity Recorded
Audit Log Created
```

7. Open the report.

The Reports page should display:

```text
Reported By
Administrator Name
ADMIN
```

instead of:

```text
Unknown user
```

---

# User Report Identity Test

For an application-generated user report, the Reports page should attempt to display:

```text
Full Name
@username
```

If profile identity is incomplete, the backend may fall back to account information from Supabase Auth.

---

# Report Workflow Test

Test:

```text
Pending
   ↓
Under Review
   ↓
Resolved
```

Then test:

```text
Pending
   ↓
Dismissed
```

Confirm that:

- Status changes are saved
- Administrator assignment is recorded
- Review timestamps are recorded
- Audit logs are created
- Administrative pages refresh correctly

---

# Security Considerations

The project uses privileged Supabase access on the server.

The Supabase service-role key must:

- Remain server-side
- Never be exposed in client components
- Never be committed to Git
- Never be bundled into browser JavaScript

Administrative actions must always verify an authenticated administrator before performing privileged database operations.

---

# Moderation Design Principles

The moderation system follows several important principles.

## Progressive Enforcement

Ordinary violations escalate gradually rather than immediately applying permanent account enforcement.

## Human Review

Permanent account enforcement is not automatically applied by the strike system.

Serious or repeated violations can instead be escalated for administrator review.

## Auditability

Administrative actions, automated moderation activity, reports, and bans are kept separately auditable.

## Shared Backend

The Android application and Web Admin operate on the same Supabase database to avoid synchronization problems between separate moderation systems.

## No Silent Fallback

When the API rejects pin creation because of moderation, the Android application should not bypass the moderation API by inserting the pin directly into Supabase.

---

# Known Technical Considerations

## Temporary Ban Expiration

Temporary automated moderation bans require careful synchronization between:

```text
user_bans.status
```

and:

```text
profiles.status
```

An expired automated ban should only reactivate a user when no other active enforcement or manual suspension remains.

This logic must avoid accidentally overriding a manually suspended account.

---

## Concurrent Violations

Strike calculation currently involves reading the user's moderation history and then recording the next violation.

Multiple simultaneous requests from the same account may therefore require additional transactional protection if strict strike sequencing is required at high concurrency.

---

## Large Moderation History Queries

Some moderation statistics currently place practical query limits on historical data.

For very large production datasets, these queries should eventually move toward:

- Database aggregation
- Pagination
- RPC functions
- Materialized moderation statistics

---

# Current Moderation Flow Summary

```text
                    PIN & TELL
                        │
             ┌──────────┴──────────┐
             │                     │
          Android              Web Admin
             │                     │
             │                     ├── Pins
             │                     ├── Reports
             │                     ├── Users
             │                     ├── Bans
             │                     └── Settings
             │
        Create Pin
             │
             ▼
        /api/pins
             │
             ▼
     Authentication Check
             │
             ▼
       Account Check
             │
             ▼
     Content Moderation
             │
      ┌──────┴──────┐
      │             │
    Clean        Violation
      │             │
      ▼             ▼
 Insert Pin      Record Strike
                    │
                    ▼
                 Warning
                    │
                    ▼
                Suspension
                    │
                    ▼
              Admin Escalation
                    │
                    ▼
                 Reports
```

---

# Administrative Moderation Flow

```text
Pins Page
   │
   ├── View Pin
   │
   └── Flag Pin
          │
          ▼
    Pending Report
          │
          ▼
     Reports Page
          │
          ▼
      Admin Review
          │
     ┌────┼────┐
     │    │    │
 Review Resolve Dismiss
     │
     └───────────────► Optional Ban
```

---

# Repository

```text
https://github.com/Ki-oshi/pin-and-tell-webadmin
```

---

# Project

**PIN & TELL**

Interactive Map-Based Social Platform with Mileage Tracking, Eco-Driving, and Fuel Consumption Monitoring.

---

# Development Notes

The application is actively under development.

Features, moderation rules, administrative workflows, and interfaces may continue to change as the system is tested and refined.

---

# License

This project was developed for academic and project-development purposes.

Third-party libraries, frameworks, APIs, media, and services remain subject to their respective licenses and terms of use.
```

This README covers the flow from **automated profanity/abuse warnings → strike escalation → temporary suspensions → moderation violators → admin pin flagging → Reports → reporter/admin identity resolution → manual review and bans**.
