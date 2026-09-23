
# PIN & TELL — Web Administration System

**PIN & TELL Web Admin** is the administrative and moderation platform for the **PIN & TELL** mobile application.

It provides administrators with tools for managing users, reviewing reported content, monitoring pins, handling automated content violations, applying enforcement actions, managing platform settings, and maintaining an auditable record of administrative activity.

> The Web Admin and Android application use the **same Supabase backend and database**. :chatgpt-content-reference{index="1"}

---

## Overview

PIN & TELL is an interactive map-based social platform centered around location-based community information and vehicle-related tracking.

### Main Platform Features

- Interactive map-based pins
- Pin and Post functionality
- Mileage tracking
- Fuel monitoring
- Eco-driving insights
- Social interactions
- User reputation
- Reports and moderation
- Administrative management

### Web Admin Focus

- Content moderation
- User management
- Pin management
- Reports management
- Automated content violations
- Ban management
- Platform configuration
- Administrative auditing

---

# Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| UI Icons | Lucide React |
| Backend | Next.js Server Actions, Route Handlers |
| Database | PostgreSQL |
| Backend Platform | Supabase |
| Mobile Authentication | Supabase Auth |
| Admin Authentication | Custom `public.admins` authentication/session system |

---

# System Architecture

```text
PIN & TELL
│
├── Android Application
│   ├── Supabase Auth
│   ├── Map Pins
│   ├── Social Features
│   ├── Mileage Tracking
│   ├── Fuel Monitoring
│   └── Eco-Driving
│
├── Next.js Web Admin
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
    ├── PostgreSQL Database
    ├── Supabase Auth
    ├── Storage
    └── Shared Application Data
```

Both the Android application and Web Admin operate on the same backend data.

---

# Core Administrative Features

## Dashboard

The administrative dashboard provides an overview of system activity and moderation information.

It can display statistics related to:

- Users
- Pins
- Reports
- Moderation activity
- Platform activity

---

# User Management

Administrators can inspect registered user accounts and associated information.

User information is primarily resolved from:

```text
profiles
```

When profile information is incomplete, the administrative backend may use **Supabase Auth** as an identity fallback.

This reduces cases where a valid user is incorrectly displayed as:

```text
Unknown user
```

The identity resolution priority is:

```text
Full Name
   ↓
Username
   ↓
Email
```

---

# Pin Management

The **Pins** page provides administrators with a centralized view of location-based content.

Each pin may display:

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

Administrators can open an individual pin through a detailed side drawer.

---

## Pin Details Drawer

The drawer includes:

- Pin information
- Pin photo
- Category and subcategory
- Description
- Engagement statistics
- Creator information
- User profile link
- Coordinates
- Google Maps link
- Moderation status
- Record information

---

# Administrator Pin Flagging

Administrators can manually flag a pin for moderation.

Pins without an active moderation case display:

```text
Flag
```

Administrators can select a report type and provide a reason.

### Supported Report Types

- Spam
- Harassment
- Inappropriate
- Copyright
- Misinformation
- Other

An optional additional-details field is also available.

---

## Admin Flagging Workflow

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

A successfully flagged pin creates a new moderation case inside:

```text
reports
```

with:

```text
status = pending
```

The case then becomes available on the Reports page. :chatgpt-content-reference{index="2"}

---

## Duplicate Report Protection

Administrators cannot create another flag when a pin already has an open report with either:

```text
pending
```

or:

```text
reviewing
```

status.

Instead, the administrator is directed to the existing moderation case.

This prevents duplicate active reports for the same pin.

---

# Reports Management

The **Reports** page serves as the centralized moderation queue.

Reports can target:

- Pins
- Comments
- Chat messages
- Users

### Report Types

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

```text
pending
reviewing
resolved
dismissed
suspended
outdated
```

### Primary Workflow

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

Administrators can open a report to inspect the moderation case.

The review drawer includes:

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

The Reports system distinguishes between several reporter sources.

---

## User Reports

Reports created by application users are associated with:

```text
reports.reporter_id
```

which references the user's Supabase Auth account.

The administrative system first attempts to resolve identity through:

```text
profiles
```

If the profile does not contain enough information, the system may use Supabase Auth as a fallback.

Example:

**Reported By**

> Lean Joshua Aclan  
> `@lean`

---

## Administrator Reports

Administrator-created pin flags display the actual administrator who created the report.

Example:

**Reported By**

> Ashley Antones `ADMIN`  
> admin@example.com

Administrator IDs are **not** placed in:

```text
reports.reporter_id
```

because that field belongs to application users.

Instead, the administrator identity is recorded through the audit log:

```text
logs
  ↓
admin_pin_flagged
  ↓
logs.user_id
  ↓
admins
```

This preserves correct database relationships while maintaining administrator accountability. :chatgpt-content-reference{index="3"}

---

## Automated Moderation Reports

Automatically generated moderation cases are displayed separately.

Example:

**Reported By**

> PIN & TELL Moderation `SYSTEM`  
> Automated moderation

This prevents automated cases from appearing as unknown or ordinary users.

---

# Automated Content Moderation

PIN & TELL includes automated moderation for newly submitted pin content.

The moderation engine evaluates:

- Pin title
- Pin description

before the pin is accepted.

The Android application submits pin creation through:

```http
POST /api/pins
```

rather than inserting moderated content directly into Supabase.

---

# Moderated Content Categories

The moderation system detects patterns associated with:

- Profanity
- Harassment
- Abusive language
- Serious threats

Current moderation includes English and Filipino language patterns.

Examples of internal categories include:

```text
profanity
harassment
threat
```

The moderation system also determines severity information used by enforcement logic.

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

Moderated content is rejected before the pin is inserted into the database. :chatgpt-content-reference{index="4"}

---

# Moderation Strike System

Content violations use a rolling:

> **90-day active strike window**

Enforcement begins with warnings and progressively escalates for repeated violations.

| Strike | Enforcement |
|---:|---|
| 1 | Warning |
| 2 | Warning |
| 3 | Strong Warning |
| 4 | Final Warning |
| 5 | **3-Day Suspension** |
| 6 | Strong Warning |
| 7 | Final Escalation Warning |
| 8 | **7-Day Suspension** |
| 9 | Final Warning |
| 10 | **30-Day Suspension** |
| 11+ | **Administrator Review** |

The system does **not automatically issue a permanent ban** after repeated strikes.

At Strike 11 and beyond, the account is escalated for administrator review so enforcement remains subject to human moderation. :chatgpt-content-reference{index="5"}

---

# Serious Threat Handling

Certain serious threats can bypass the normal warning progression and immediately create an administrator-review case.

This allows potentially serious content to be reviewed without waiting for the account to accumulate multiple ordinary strikes.

---

# Duplicate Violation Protection

Submitting the exact same blocked content repeatedly within approximately:

```text
120 seconds
```

does not continuously add new strikes.

This protects users from accidental strike inflation caused by repeated submission attempts.

---

# Moderation Logging

Automated moderation activity is recorded through:

```text
logs
```

Content violations use an action type such as:

```text
content_policy_violation
```

Moderation logs can retain useful metadata while avoiding the unnecessary storage of complete rejected content in ordinary audit records.

---

# Moderation Violators

The Reports page also includes a section for users who have triggered automated moderation rules.

### Summary Metrics

- Violators
- Active Strikes
- Suspended
- Needs Review

### Violations Table

| Column | Description |
|---|---|
| User | Account associated with the violations |
| Active Strikes | Violations inside the active strike window |
| Severity | Latest/highest moderation severity |
| Last Violation | Most recent violation time |
| Account Status | Active, suspended, or banned |
| Enforcement | Current moderation action |
| Action | View detailed violation history |

---

## Violation Details

Selecting a moderation violator can display:

- User identity
- Account status
- Active strikes
- Total moderation history
- Latest violation
- Severity
- Violation categories
- Current suspension
- Suspension expiration
- Related moderation reports
- Moderation timeline

---

# Ban Management

Account enforcement is stored separately from report workflow state.

Ban records are stored inside:

```text
user_bans
```

This allows:

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

```text
temp
permanent
temp_ip
```

## Supported Duration Types

```text
hours
days
weeks
months
permanent
```

---

# Account Status

Account status is stored through:

```text
profiles.status
```

Supported states include:

```text
active
suspended
banned
```

---

# Audit Logging

Administrative and automated activity is recorded through:

```text
logs
```

Examples include:

```text
admin_pin_flagged
admin_report_status_changed
content_policy_violation
```

Audit logging provides traceability for moderation and administrative actions.

---

# Important Database Tables

| Table | Purpose |
|---|---|
| `admins` | Administrator accounts |
| `admin_sessions` | Administrative sessions |
| `profiles` | User profiles |
| `pins` | Map-based content |
| `reports` | Moderation cases |
| `logs` | User/admin/system audit activity |
| `user_bans` | Account enforcement |
| `comments` | Pin comments |
| `chats` | Chat messages |
| `platform_settings` | Administrative platform configuration |

No separate moderation database is required.

---

# Important Database Relationships

## Pin Creator

```text
pins.creator_id
       │
       ▼
auth.users.id
```

## Report Creator

```text
reports.reporter_id
       │
       ▼
auth.users.id
```

## Reported User

```text
reports.reported_user_id
       │
       ▼
auth.users.id
```

## Report Reviewer

```text
reports.reviewed_by
       │
       ▼
admins.id
```

## Administrator Flag Identity

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

Administrator IDs are intentionally not placed inside `reports.reporter_id`.

---

# API

## Create Pin

```http
POST /api/pins
```

The endpoint performs:

1. Bearer-token validation
2. Supabase Auth user lookup
3. Account-status validation
4. Active-ban validation
5. Content moderation
6. Strike enforcement
7. Pin creation
8. Audit logging

---

## Unsupported GET

A GET request to the pin-creation endpoint returns:

```json
{
  "success": false,
  "error": "Method not supported by this endpoint.",
  "code": "METHOD_NOT_ALLOWED"
}
```

---

# Project Structure

```text
src/
│
├── app/
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
│   └── admin/
│       ├── pins/
│       ├── reports/
│       ├── bans/
│       └── settings/
│
└── lib/
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

Example:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Additional variables required by the custom administrator session implementation should also be configured.

> **Never commit production credentials or your Supabase service-role key to GitHub.**

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

Admin pages are available under:

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

Recommended verification workflow:

```bash
npm run lint
npm run build
npm run dev
```

---

# Testing

## Automated Moderation Test

1. Sign in through the Android application.
2. Attempt to create a pin containing moderated content.
3. Submit the pin.
4. Confirm that the pin is rejected.
5. Confirm that the moderation warning appears.
6. Confirm that the violation appears in administrative moderation data.

---

## Clean Pin Test

1. Create a normal pin.
2. Submit the pin.
3. Confirm the API accepts the request.
4. Confirm the pin appears in Supabase.
5. Confirm the pin appears on the Admin Pins page.

---

## Admin Flag Test

Open:

```text
/admin/pins
```

Select a pin without an active report and click:

```text
Flag
```

Choose a report type, enter a reason, and submit.

### Expected Result

```text
Pin Reports Count +1
Flag → Review
New Pending Report Created
Administrator Identity Recorded
Audit Log Created
```

Opening the resulting case should display:

**Reported By**

> Administrator Name `ADMIN`

instead of:

```text
Unknown user
```

---

## User Reporter Test

A report submitted by an ordinary application user should display:

**Reported By**

> Full Name  
> `@username`

If the user's profile information is incomplete, account information from Supabase Auth may be used as a fallback.

---

## Report Workflow Test

Test:

```text
Pending
   ↓
Under Review
   ↓
Resolved
```

Then:

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

The Web Admin uses privileged Supabase server-side access.

The Supabase service-role key must:

- Remain server-side
- Never be exposed in client components
- Never be committed to Git
- Never be bundled into browser JavaScript

Administrative actions must verify a valid authenticated administrator before performing privileged operations.

---

# Moderation Design Principles

## Progressive Enforcement

Ordinary violations escalate gradually instead of immediately causing permanent account enforcement.

## Human Review

Permanent enforcement is not automatically applied by the strike system.

Repeated or serious violations can instead be escalated to administrators.

## Auditability

Reports, bans, administrator actions, and automated moderation events remain separately auditable.

## Shared Backend

The Android application and Web Admin operate on the same Supabase backend.

## No Silent Fallback

If `/api/pins` rejects a pin because of moderation, the Android application must **not bypass the moderation endpoint by directly inserting the pin into Supabase**. :chatgpt-content-reference{index="6"}

---

# Known Technical Considerations

## Temporary Ban Expiration

Temporary moderation bans require synchronization between:

```text
user_bans.status
```

and:

```text
profiles.status
```

An expired automated suspension should reactivate the account only when:

- No other active ban remains
- No manual suspension remains
- The expired enforcement was created by automated moderation

This prevents automated expiration logic from accidentally overriding a manual administrative suspension.

---

## Concurrent Violations

Strike calculation currently involves reading moderation history before recording the next violation.

Multiple simultaneous requests may therefore require transactional protection if strict strike sequencing becomes necessary.

---

## Large Moderation Histories

Some moderation statistics currently use practical query limits.

For larger production datasets, these queries may eventually be moved to:

- Database aggregation
- Pagination
- PostgreSQL RPC functions
- Materialized moderation statistics

---

# Moderation Flow Summary

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
       ┌─────┴─────┐
       │           │
     Clean      Violation
       │           │
       ▼           ▼
  Insert Pin   Record Strike
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
   Review │  Dismiss
          │
       Resolve
          │
          └──────────► Optional Ban
```

---

# Repository

**GitHub:**  
`https://github.com/Ki-oshi/pin-and-tell-webadmin`

---

# Project

## PIN & TELL

**Interactive Map-Based Social Platform with Mileage Tracking, Eco-Driving, and Fuel Consumption Monitoring**

---

# Development Status

> **Active Development**

The application is currently under development.

Features, moderation rules, administrative workflows, and interfaces may continue to change as the system is tested and refined.

---

# License

This project was developed for **academic and project-development purposes**.

Third-party libraries, frameworks, APIs, media, and external services remain subject to their respective licenses and terms of use.
