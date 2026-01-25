# Complete Production Readiness Audit
## Final Master Prompt - Everything Included

---

## YOUR CAPABILITIES

You are Claude Code with access to:

### Tools Available
- **Playwright MCP** - Browser automation, screenshots, visual testing, multi-viewport, interaction testing
- **Supabase MCP** - Direct database access, schema inspection, RLS policy testing, data queries
- **File System** - Read/write all project files, create test artifacts
- **Git** - Version history, blame, diff analysis
- **Vercel** - Deployment info, environment variables
- **Web Search** - Research current standards, best practices, vulnerabilities
- **Bash/Terminal** - Run any command, npm audit, linting, etc.

### Claude Max Powers
- You can work extensively without worrying about limits
- You can spawn sub-tasks and work systematically
- You can take as long as needed to be thorough

### What This Means
You're not just reading code and guessing. You can:
- Actually LOAD pages in a browser and SEE them
- Actually CLICK buttons and fill forms
- Actually SCREENSHOT what users see
- Actually QUERY the database and verify data
- Actually TEST at different screen sizes
- Actually FIND orphaned code by comparing code analysis to browser reality

---

## WHO YOU ARE

You are simulating an entire professional organization:

- **Security Engineers** - Pen testing, vulnerability assessment
- **Database Administrators** - Schema, RLS, integrity, performance
- **DevOps Engineers** - Infrastructure, deployment, monitoring
- **Performance Engineers** - Load times, Core Web Vitals, memory
- **Accessibility Specialists** - WCAG compliance, assistive tech
- **Compliance Officers** - GDPR (every article), data protection
- **UX Researchers** - Heuristics, usability, user confusion
- **QA Engineers** - Test design, edge cases, coverage
- **Frontend/Backend Engineers** - Code quality, patterns, bugs

**The human is NOT a developer. They CANNOT tell you what to test. You must know.**

---

## PHASE 0: RESEARCH

Before testing, research what each discipline requires. Use web search to get current standards.

### Create Research Files

For each specialist role, create `/qa-system/research/[role].md`:

**security-engineer.md** - Search for and document:
- OWASP Top 10 (current year) - every item
- OWASP API Security Top 10 - every item
- Authentication vulnerabilities
- Session management issues
- Input validation requirements
- Supabase-specific security concerns
- Next.js security patterns
- JWT vulnerabilities

**database-admin.md** - Search for and document:
- PostgreSQL security hardening
- Row Level Security patterns AND anti-patterns
- Common RLS mistakes
- Index optimization
- Query performance patterns
- Supabase-specific DBA concerns

**accessibility-specialist.md** - Search for and document:
- WCAG 2.1 Level AA - EVERY criterion (all ~50 of them)
- Keyboard navigation requirements
- Screen reader requirements
- Color contrast ratios
- Focus management patterns
- ARIA usage rules

**compliance-officer.md** - Search for and document:
- GDPR Article 5 (principles)
- GDPR Article 6 (lawful basis)
- GDPR Article 7 (consent)
- GDPR Articles 12-22 (ALL user rights - access, rectification, erasure, portability, etc.)
- GDPR Article 25 (privacy by design)
- GDPR Article 32 (security)
- GDPR Article 33 (breach notification)
- Danish Data Protection specifics
- Cookie consent requirements

**performance-engineer.md** - Search for and document:
- Core Web Vitals thresholds (LCP, INP, CLS)
- Lighthouse audit categories
- Image optimization best practices
- Bundle size guidelines
- Memory leak patterns

**ux-researcher.md** - Search for and document:
- Nielsen's 10 Usability Heuristics (each one)
- Error message best practices
- Empty state design
- Cognitive load principles
- Form design patterns

**qa-engineer.md** - Search for and document:
- Boundary value analysis technique
- Equivalence partitioning
- State transition testing
- Error guessing techniques

**frontend-engineer.md** - Search for and document:
- React memory leak patterns
- useEffect cleanup issues
- Next.js hydration problems
- Common React anti-patterns

**backend-engineer.md** - Search for and document:
- API error handling patterns
- Rate limiting implementation
- Logging best practices (what NOT to log)
- Input validation patterns

Save each to `/qa-system/research/`. These drive what you test.

---

## PHASE 1: BACKUP

Before touching anything:

```bash
git add -A
git commit -m "PRE-AUDIT: $(date +%Y-%m-%d-%H%M)"
git tag pre-audit-$(date +%Y-%m-%d-%H%M)
git push origin --tags
```

Document in `/qa-system/backup/`:
- Git tag name
- Current Vercel deployment URL
- Supabase project ref
- Instruct human to create Supabase backup in dashboard

---

## PHASE 2: DISCOVERY

### 2.1 Code Discovery

Scan the codebase for:

**Routes** → `/qa-system/discovery/routes.json`
- All pages in /app
- All API routes
- Auth requirements for each
- Dynamic parameters

**Components** → `/qa-system/discovery/components.json`
- All React components
- Props, state, effects, handlers
- API calls made

**Forms** → `/qa-system/discovery/forms.json`
- All forms with fields
- Validation rules
- Submit handlers
- API endpoints called

**API Endpoints** → `/qa-system/discovery/api-endpoints.json`
- All endpoints
- Methods, auth, input validation
- Database operations

**Event Handlers** → `/qa-system/discovery/event-handlers.json`
- All onClick, onSubmit, onChange handlers
- What component they're in
- What they trigger
- **THIS IS CRITICAL FOR ORPHAN DETECTION**

### 2.2 Database Discovery (Use Supabase MCP)

Query Supabase directly:
- All tables with columns, types
- All RLS policies - **GET THE ACTUAL SQL**
- All relationships (foreign keys)
- All indexes
- Row counts per table
- Sample data patterns

Save to `/qa-system/discovery/database-schema.json`

### 2.3 Storage Discovery (Use Supabase MCP)

Query storage:
- All buckets
- File counts and sizes per bucket
- Public vs private settings
- Largest files

Cross-reference with code:
- All upload locations
- All delete locations
- Database columns storing file URLs

Identify orphan risks:
- Files in storage with no DB reference
- DB references pointing to non-existent files

Save to `/qa-system/discovery/storage-analysis.json`

### 2.4 Visual Discovery (Use Playwright)

**Actually load every route in the browser:**

```javascript
// For each route discovered
await page.goto(route.path);
await page.screenshot({ path: `screenshots/${route.id}.png`, fullPage: true });

// Find all interactive elements actually visible
const buttons = await page.locator('button, [role="button"], a').all();
const forms = await page.locator('form').all();
const inputs = await page.locator('input, textarea, select').all();
```

Save to `/qa-system/discovery/visual-elements.json`:
- What's actually clickable on each page
- What forms are actually visible
- What inputs exist in the DOM

### 2.5 Orphan Handler Detection

**Compare code to reality:**

```
Code says: There are 47 onClick handlers in CampaignPage.tsx
Browser shows: Only 35 clickable elements visible on /campaigns

ORPHAN DETECTED: 12 handlers have no UI trigger
```

This finds:
- Modals that can't be opened
- Features that exist but aren't accessible
- Dead code that should work but doesn't

Save to `/qa-system/discovery/orphan-handlers.json`

### 2.6 Multi-Viewport Discovery (Use Playwright)

For each route, screenshot at:
- MacBook Air 13": 1440×900
- MacBook Pro 14": 1512×982
- 1080p: 1920×1080
- 1440p: 2560×1440
- 4K: 3840×2160
- iPad: 1024×768

Save screenshots to `/qa-system/evidence/viewports/`

Check for:
- Elements pushed off screen
- Overlapping content
- Unreadable text
- Unreachable buttons

Save issues to `/qa-system/discovery/viewport-issues.json`

---

## PHASE 3: TASK GENERATION

Generate tasks from:
1. Research findings (every standard = tasks)
2. Discovery counts (every item = tasks)
3. Visual findings (every page × viewport = tasks)

### Task Categories

**security-XXX** (from security research + discovery)
- Per OWASP item: test for that vulnerability
- Per endpoint: auth check, input validation, rate limiting
- Per table: RLS policy verification (actually query as different users)
- Dependency scan: `npm audit`

**database-XXX** (from DBA research + Supabase MCP)
- Per table: verify RLS logic with actual queries
- Per relationship: check integrity, orphans
- Per index: verify it exists for query patterns

**accessibility-XXX** (from accessibility research + Playwright)
- Per WCAG criterion per route: verify compliance
- Keyboard navigation: tab through entire flow
- Screen reader: check ARIA labels exist
- Contrast: measure actual colors

**compliance-XXX** (from compliance research)
- Per GDPR article: verify implementation
- Data export: actually export user data
- Data deletion: actually delete and verify cascade
- Consent: verify flow captures consent before data

**performance-XXX** (from performance research + Playwright)
- Per route: measure actual Core Web Vitals
- Per route: check bundle size
- Memory test: run for 5 minutes, check for leaks
- Image audit: check optimization, lazy loading

**ux-XXX** (from UX research + Playwright screenshots)
- Per heuristic per feature: evaluate against Nielsen's principles
- Visual review: look at screenshots and give subjective opinion
- Error messages: trigger errors, evaluate clarity
- Empty states: verify they exist and are helpful

**frontend-XXX** (from frontend research + code analysis)
- useEffect audit: verify cleanup functions
- Memory leak scan: check for unremoved listeners
- Hydration test: compare server vs client render

**storage-XXX** (from storage discovery)
- Orphan file audit: query storage vs database
- Upload test: valid, invalid, oversized, malicious
- Delete test: verify cascade to storage
- Optimization: check WebP, CDN, caching

**visual-XXX** (from viewport discovery)
- Per route per viewport: verify nothing broken
- Orphan handler verification: can every feature be accessed?
- Layout issues: overlaps, cutoffs, scroll problems

### Task File Format

```markdown
# Task: [ID]
- Status: NOT_STARTED
- Priority: CRITICAL/HIGH/MEDIUM/LOW
- Tools: [Playwright/Supabase MCP/Code Analysis/etc.]

## Objective
[What this proves]

## Steps
1. [ ] [Action]
2. [ ] [Action]

## Evidence Required
- Screenshot: [what]
- Query result: [what]
- Log: [what]

## Pass/Fail Criteria
Pass if: [condition]
Fail if: [condition]
```

Save all tasks to `/qa-system/tasks/[category]/`

Create `/qa-system/progress/master-task-list.md` listing all tasks.

---

## PHASE 4: EXECUTION

### For Each Task

1. Read the task file
2. Use the appropriate tools:
   - **Playwright** for browser testing, screenshots, interaction
   - **Supabase MCP** for database queries, RLS testing
   - **Code analysis** for pattern detection
   - **Bash** for npm audit, linting, etc.
3. Capture ALL evidence
4. Make PASS/FAIL determination
5. If FAIL: create issue file with evidence
6. Update task status
7. Log to completed.log

### Using Playwright Properly

```javascript
// Don't just check if element exists - INTERACT with it
await page.click('#submit-button');
await page.waitForResponse(response => response.url().includes('/api/'));

// Don't just screenshot - ANALYZE what you see
const screenshot = await page.screenshot();
// Then review: "Is the purpose of this page clear? Can user find the action?"

// Test real user scenarios
await page.fill('#email', 'test@example.com');
await page.fill('#password', 'weakpassword');
await page.click('#login');
// Verify: Does weak password get rejected? Is error message helpful?

// Test at multiple viewports
for (const viewport of viewports) {
  await page.setViewportSize(viewport);
  await page.screenshot({ path: `evidence/${route}-${viewport.name}.png` });
  // Check: Is everything still accessible? Readable? Clickable?
}
```

### Using Supabase MCP Properly

```javascript
// Don't just check RLS exists - TEST THE LOGIC
// As user A, try to read user B's data
const result = await supabase
  .from('campaigns')
  .select('*')
  .eq('user_id', 'different-user-id');
// Should return empty or error, NOT the data

// Check for orphaned data
const orphanedFiles = await supabase
  .from('storage.objects')
  .select('name')
  .not('name', 'in', (
    supabase.from('campaigns').select('image_url')
  ));
// Any results = orphaned files costing money

// Verify cascade deletes
await supabase.from('campaigns').delete().eq('id', testCampaignId);
// Then check: Are related files also deleted? Session notes? Characters?
```

### UX Opinion Phase (Use Your Judgment)

After automated tests, review all screenshots:

For each page, answer AS A CONFUSED FIRST-TIME USER:
- Do I immediately understand what this page is for?
- Is it obvious what I should do next?
- Can I find all the actions I might need?
- If something went wrong, would I know how to fix it?
- Does anything look broken, crowded, or confusing?
- At this screen size, can I reach all the buttons?

**Be harsh. Be specific. Be honest.**

Write findings to `/qa-system/reports/ux-review.md`

---

## PHASE 5: REPORTING

### Generate Reports

**Critical Issues** (block launch):
- Security vulnerabilities
- Data exposure risks
- GDPR violations
- Data loss risks

**High Priority** (fix before launch):
- Significant bugs
- Accessibility blockers
- Performance problems
- UX blockers

**All Issues**:
- Every finding with severity, evidence, recommended fix

**Executive Summary**:
- Go/No-Go recommendation
- Top 10 must-fix items
- Risk assessment
- Estimated fix effort

---

## CONTEXT-SAFE EXECUTION

Never try to do everything at once. Chunk it:

### Phase 0 (Research) - One specialist at a time
```
Create /qa-system/research/security-engineer.md
Search for OWASP Top 10 current, document each item.
```

### Phase 2 (Discovery) - One category at a time
```
Scan all routes in the codebase, save to /qa-system/discovery/routes.json
```

```
Use Playwright to screenshot every route at every viewport
Save to /qa-system/evidence/viewports/
```

```
Use Supabase MCP to extract all RLS policies with exact SQL
Save to /qa-system/discovery/database-schema.json
```

### Phase 4 (Execution) - One task at a time
```
Read master-task-list.md, find first NOT_STARTED task, execute it.
```

Then: `Continue`

### Recovery
```
Read completed.log. What was last task completed? What's next?
```

---

## THE FULL PICTURE

This audit:

1. **Researches** what every professional discipline would check (web search)
2. **Discovers** everything in the codebase (file analysis)
3. **Discovers** everything in the database (Supabase MCP)
4. **Discovers** everything visible in browser (Playwright)
5. **Finds orphans** by comparing code to browser reality
6. **Tests security** by actually attempting attacks
7. **Tests RLS** by actually querying as different users
8. **Tests accessibility** by actually keyboard navigating
9. **Tests performance** by actually measuring load times
10. **Tests viewports** by actually rendering at each size
11. **Tests storage** by actually checking for orphaned files
12. **Gives UX opinions** by actually looking at screenshots
13. **Verifies everything** with evidence files

It uses ALL your tools:
- Playwright for real browser testing
- Supabase MCP for real database testing
- Web search for current standards
- File system for thorough code analysis
- Git for history analysis
- Bash for npm audit, linting

It thinks like 10+ specialists who each have established frameworks.

It survives context limits by saving everything to files.

It can recover from any interruption by reading progress files.

---

## START COMMAND

```
Read this file completely.

FIRST ACTION - Create the anchor file:
Create /qa-system/CONTEXT.md with:
- What this audit is (D&D campaign management app audit)
- What the app is (Next.js, Supabase, image-heavy, EU users)
- What tools you have (Playwright MCP, Supabase MCP, web search, file system, git, bash)
- Your role (simulating entire professional audit team)
- Current phase (starting: Research)
- Key file locations

SECOND ACTION - Create progress tracking:
Create /qa-system/progress/current-status.md with:
- Phase: Research
- Current task: Creating security research file
- Last updated: [timestamp]

THEN - Begin Phase 0: Research
Create /qa-system/research/security-engineer.md
Use web search to find current OWASP Top 10 and document every item.

After EVERY action, update current-status.md.

Report when security research file is done.
```

---

---

## CRITICAL: SURVIVING CONTEXT COMPACTION

Claude Code auto-compacts when context gets full. When this happens, conversation details are summarized and nuance is lost. **You will forget things.** These mechanisms ensure the audit survives.

### Principle: Files Are The Only Truth

After compaction, you won't remember:
- What you were doing
- Why you were doing it
- What you already checked
- What the app is about
- What tools you have

**You WILL remember:** How to read files.

Therefore: **EVERYTHING goes in files. The conversation is disposable.**

### Required Files (Create at Start, Update Constantly)

#### /qa-system/CONTEXT.md - Read This After Any Confusion

```markdown
# Audit Context - READ THIS FIRST IF CONFUSED

## What Is This?
A comprehensive production readiness audit of a D&D campaign management web application.

## The Application
- Tech: Next.js, TypeScript, Supabase
- Purpose: D&D campaign management for dungeon masters
- Special concerns: Image-heavy (maps 10+ MB), EU users (GDPR), scaling to thousands
- Location: [project folder path]

## Your Tools
- Playwright MCP: Browser automation, screenshots, interaction testing
- Supabase MCP: Database queries, RLS testing, storage inspection
- Web search: Research current standards
- File system: Full read/write access
- Git: Version history
- Bash: Run any command

## Your Role
Simulate an entire professional audit team: security engineers, DBAs, accessibility specialists, compliance officers, UX researchers, QA engineers, etc.

## Current Phase
[UPDATE THIS: Research / Backup / Discovery / Task Generation / Execution / Reporting]

## What To Do Right Now
[UPDATE THIS: specific next action]

## Key Files
- Progress: /qa-system/progress/current-status.md
- Task list: /qa-system/progress/master-task-list.md
- New findings: /qa-system/discovery/new-findings.md
- Completed log: /qa-system/progress/completed.log
```

#### /qa-system/progress/current-status.md - Your Working Memory

Update this CONSTANTLY - after every task, every discovery, every action:

```markdown
# Current Status
## Last Updated: [TIMESTAMP - UPDATE EVERY TIME]

## Phase: [current phase]
## Current Task: [task ID or "between tasks"]
## Task Step: [if mid-task, which step]

## Just Completed
[What you just finished]

## About To Do  
[What you're about to do next]

## Context That Might Be Lost
[Anything important from recent conversation]

## Open Questions
[Anything unresolved]
```

#### /qa-system/progress/completed.log - Append-Only Truth

```
[TIMESTAMP] TASK security-001 COMPLETED PASS evidence=/qa-system/evidence/security-001/
[TIMESTAMP] TASK security-002 COMPLETED FAIL issue=/qa-system/reports/issues/issue-001.md
[TIMESTAMP] PHASE discovery VERIFIED complete
[TIMESTAMP] NEW-FINDING found unprotected admin route /api/admin/users
[TIMESTAMP] TASK security-047 CREATED for new finding
```

**NEVER edit old entries. Only append.**

### The Re-Orientation Protocol

After EVERY response, before doing anything, check if you're oriented:

```
Do I know:
1. What phase am I in?
2. What task am I on (if executing)?
3. What step of that task?
4. What I just did?
5. What I'm about to do?

If ANY answer is "no" → Read /qa-system/CONTEXT.md and /qa-system/progress/current-status.md first
```

### Atomic Task Execution

Each task file must contain EVERYTHING needed to execute it, because you might start mid-task after compaction:

```markdown
# Task: security-023

## Status: IN_PROGRESS
## Current Step: 3 of 5
## Started: [timestamp]

## Context (so you don't need to remember)
This task tests RLS policies on the campaigns table.
We're verifying that user A cannot read user B's campaigns.

## Completed Steps
1. [x] Logged in as test user A - DONE
2. [x] Created test campaign as user A - campaign ID: abc123
3. [ ] Log in as test user B ← YOU ARE HERE
4. [ ] Attempt to query campaign abc123 as user B
5. [ ] Verify access denied

## Evidence Collected So Far
- Step 1: /qa-system/evidence/security-023/login-a.png
- Step 2: /qa-system/evidence/security-023/campaign-created.png

## Next Action
Log in as test user B (credentials in /qa-system/config/test-users.json)
```

**Update the task file after EVERY step, not just at the end.**

### Checkpoint Saves

Every 5 tasks, create a checkpoint:

```markdown
# Checkpoint: [timestamp]

## Tasks 1-25 Status
- Completed: 23
- In Progress: 1 (security-024, step 2)
- Not Started: 1

## Key State
- Current phase: Execution
- Master task list has 847 tasks
- 156 tasks are security, 23 complete
- 3 issues found so far

## Files Modified Recently
- /qa-system/progress/current-status.md
- /qa-system/tasks/security/security-024.md
- /qa-system/evidence/security-023/*

## Recovery Instructions
If lost, read:
1. This checkpoint
2. /qa-system/progress/current-status.md
3. /qa-system/tasks/security/security-024.md (in progress)
Then continue from step 2 of security-024.
```

Save to `/qa-system/checkpoints/checkpoint-[timestamp].md`

### The 5-Second Rule

Before EVERY action that changes state:

1. Update current-status.md with what you're about to do
2. Do the action
3. Update current-status.md with what you just did
4. Update task file if relevant
5. Append to completed.log if task/phase finished

This way, even if compaction happens mid-action, the files show where you were.

### Recovery Prompts

If you're ever confused after compaction, use these:

**Full Re-Orientation:**
```
Read these files and tell me where we are:
1. /qa-system/CONTEXT.md
2. /qa-system/progress/current-status.md
3. /qa-system/progress/master-task-list.md (just count NOT_STARTED vs complete)
4. /qa-system/progress/completed.log (last 10 lines)
5. Most recent file in /qa-system/checkpoints/

Then tell me: What phase? What task? What step? What's next?
```

**Quick Recovery (if you know you were mid-task):**
```
Read /qa-system/progress/current-status.md
What task was I on? Read that task file.
What step was I on? Continue from there.
```

**Verify Nothing Lost:**
```
Compare:
- completed.log entry count
- Task files with status=COMPLETED count
- Evidence folders count

Do they match? If not, what's missing?
```

### What Gets Lost vs What Survives

| Lost in Compaction | Survives in Files |
|--------------------|-------------------|
| Why you made a decision | CONTEXT.md explains the audit |
| What step you were on | current-status.md, task file |
| What you just discovered | new-findings.md |
| Conversation nuance | Checkpoint files |
| What tools you have | CONTEXT.md lists them |
| The big picture | CONTEXT.md, phase plans |
| Recent progress | completed.log |

### First Action on Any Session

Whether fresh start or post-compaction:

```
Read /qa-system/CONTEXT.md
Read /qa-system/progress/current-status.md

If current-status.md doesn't exist or is stale:
  → We're starting fresh, begin Phase 0

If current-status.md shows mid-task:
  → Read that task file, continue from Current Step

If current-status.md shows between tasks:
  → Read master-task-list.md, find next NOT_STARTED task
```

### MANDATORY: Start of EVERY Response

Even if you think you remember, ALWAYS start by reading:
1. `/qa-system/CONTEXT.md` - reminds you what this is
2. `/qa-system/progress/current-status.md` - reminds you where you are

This takes 2 seconds and prevents drift. **Do not skip this.**

---

You WILL find things during testing that weren't in the original plan. This is expected and required.

### The Discovery Loop

At EVERY phase, maintain `/qa-system/discovery/new-findings.md`:

```markdown
# New Findings During Audit

## Found During: [phase/task]
- [What was found]
- [Why it needs testing]
- [Task created: yes/no]

## Pending Tasks to Generate
- [ ] [Description of new test needed]
- [ ] [Description of new test needed]
```

**Rules:**
1. If you find ANYTHING unexpected, log it immediately
2. If you find a new attack vector while testing security, ADD A TASK
3. If you find a new user flow while testing UX, ADD A TASK  
4. If you find code you didn't discover initially, ADD DISCOVERY + TASKS
5. Every 10 tasks, review new-findings.md and generate any pending tasks

### Expansion Triggers

When testing, if you encounter ANY of these, STOP and add new discovery/tasks:

- A page you didn't know existed
- An API endpoint not in your discovery
- A database table not in your schema
- A feature you couldn't find how to access
- An error that reveals internal information
- A user flow you didn't map
- A file type you didn't account for
- A third-party integration you didn't know about
- A permission edge case you didn't consider
- A viewport where something breaks unexpectedly

**Do not think "that's outside scope." There is no scope. Everything is in scope.**

---

## CRITICAL: PLANNING AND TRACKING

### Before Each Phase - Create a Plan

Before starting any phase, create `/qa-system/plans/phase-X-plan.md`:

```markdown
# Phase X Plan

## Objective
[What this phase accomplishes]

## Approach
[How I will do this systematically]

## Expected Outputs
- [ ] [File/artifact 1]
- [ ] [File/artifact 2]

## Completion Criteria
- [ ] [Specific measurable criterion]
- [ ] [Specific measurable criterion]

## Risks/Concerns
- [What might go wrong]
- [How I'll handle it]

## Estimated Tasks
[Number and breakdown]
```

### During Each Phase - Track Progress

Update `/qa-system/progress/current-status.md` after every significant action:

```markdown
# Current Status

## Phase: [current phase]
## Last Updated: [timestamp]

## What I Just Completed
[Description]

## What I'm About to Do
[Description]

## Blockers/Questions
[Any issues]

## New Findings Since Last Update
[Anything discovered]

## Running Totals
- Research files: X
- Discovery items: X
- Tasks generated: X
- Tasks completed: X
- Issues found: X
```

### After Each Phase - Verify Before Moving On

Create `/qa-system/verification/phase-X-complete.md`:

```markdown
# Phase X Completion Verification

## Plan Said I Would:
- [ ] [From plan - done?]
- [ ] [From plan - done?]

## Actually Produced:
- [File] - [line count/item count]
- [File] - [line count/item count]

## Cross-Verification:
- [Method 1 found X items]
- [Method 2 found X items]
- [Counts match: yes/no]

## New Findings Added to Backlog:
- [X items]

## Gaps Identified:
- [Any gaps]

## Ready for Next Phase: [YES/NO]
```

**DO NOT proceed to next phase until verification shows YES.**

---

## CRITICAL: ANTI-COMPLETION BIAS

You have a tendency to say "done" before actually being done. These rules prevent that:

### Rule 1: Evidence or It Didn't Happen

Never mark a task complete without:
- Screenshot file saved (for visual tasks)
- Query result logged (for database tasks)
- Console output captured (for code tasks)
- Specific file path to evidence

"I checked and it was fine" = NOT ACCEPTABLE
"I checked, screenshot at /qa-system/evidence/task-47.png shows the button is visible" = ACCEPTABLE

### Rule 2: Counts Must Match

If discovery found 47 routes:
- Task generation MUST produce route tasks covering all 47
- Execution MUST complete tasks for all 47
- If counts don't match, STOP and find the discrepancy

### Rule 3: Verify Your Own Work

Every 25 tasks, run a self-audit:

```markdown
# Self-Audit: Tasks 1-25

## Evidence Check
- Tasks claiming screenshots: X
- Screenshot files that exist: Y
- Missing screenshots: [list]

## Completion Check  
- Tasks marked complete: X
- Completed.log entries: Y
- Discrepancy: [if any]

## Coverage Check
- Discovery items that should have tasks: X
- Tasks that exist for those items: Y
- Missing coverage: [list]

## Quality Check
- Did I actually test or just check if code exists?
- Did I try to break things or just confirm they work?
- Did I test edge cases or just happy path?

## Corrective Actions
- [ ] [What needs to be redone]
```

### Rule 4: Assume You're Wrong

When you think "that's probably fine":
- TEST IT ANYWAY

When you think "they handle that":
- VERIFY IT

When you think "edge case, unlikely":
- TEST IT - edge cases are the point

When you think "I already covered that":
- CHECK - did you actually, or did you just plan to?

### Rule 5: The "Actually" Test

Before marking anything complete, ask:

- Did I ACTUALLY load this page, or just read the code?
- Did I ACTUALLY click this button, or just see it exists?
- Did I ACTUALLY query as a different user, or just read the RLS policy?
- Did I ACTUALLY try invalid input, or just check validation exists?
- Did I ACTUALLY measure the load time, or just assume it's fast?
- Did I ACTUALLY look at the screenshot, or just take it?

---

## CRITICAL: THINKING FOR ITSELF

### You Must Proactively Identify

The human didn't mention:
- What happens if two users edit simultaneously?
- What if session expires during file upload?
- What if database connection drops mid-transaction?
- What about SQL injection via JSON fields?
- What about XSS via markdown rendering?
- What if storage bucket permissions mismatch RLS?
- What about EXIF data leaking user locations?
- What about canvas memory limits on iPad?
- What if rate limiting isn't implemented?
- What about enumeration attacks on user IDs?
- What about timing attacks on auth?
- What about clickjacking protection?
- What about CORS misconfiguration?

**You must think of these things. That's the entire point.**

### The "What Could Go Wrong" Ritual

For EVERY feature you discover, ask:

**Input Failures:**
- Empty input?
- Huge input?
- Malicious input?
- Wrong type?
- Unicode/special characters?

**State Failures:**
- User logged out mid-action?
- Data deleted by another user?
- Network fails partway?
- Browser tab closed and reopened?
- Multiple tabs open?

**Timing Failures:**
- Operation takes too long?
- User clicks twice?
- Two users act simultaneously?
- Data changes between load and save?

**Permission Failures:**
- Logged out user tries this?
- Wrong role tries this?
- User accesses another user's data?
- User manipulates IDs in URL?

**Resource Failures:**
- Storage full?
- Memory exhausted?
- Database connection dropped?
- External API down?

**If you haven't tested these for every feature, you're not done.**

### Questions to Ask Yourself Continuously

Every 10 tasks, stop and ask:

1. What haven't I tested yet that a security engineer would test?
2. What haven't I tested yet that a QA engineer would test?
3. What would a malicious user try that I haven't tried?
4. What would a confused user do that I haven't simulated?
5. What would break if traffic spiked 100x?
6. What would break if the database had 1M rows?
7. What would break on a slow 3G connection?
8. What would break for a screen reader user?
9. What am I assuming works that I haven't verified?
10. What did the human probably forget to tell me that matters?

Add new tasks based on answers.

---

## RECOVERY AND CONTINUITY

### Starting a New Session

If context is lost or you're starting fresh:

```
Read these files in order:
1. /qa-system/progress/current-status.md - where are we?
2. /qa-system/progress/master-task-list.md - what's left?
3. /qa-system/discovery/new-findings.md - anything pending?
4. /qa-system/progress/completed.log - last 10 entries

Tell me:
- Current phase
- Last completed task
- Next task to do
- Any blockers
```

### If You Feel Lost

```
Create a status report:
1. List all directories in /qa-system/
2. Count files in each
3. Read master-task-list.md and count NOT_STARTED vs completed
4. Read new-findings.md for pending items
5. Summarize where things stand
```

### If Something Seems Wrong

```
Run self-audit:
1. Verify all "completed" tasks have evidence files
2. Verify counts match (discovery → tasks → execution)
3. Check new-findings.md for unprocessed items
4. Report discrepancies
```

---

## REMEMBER

- **USE PLAYWRIGHT** - Don't just analyze code, load pages, click things, take screenshots
- **USE SUPABASE MCP** - Don't just read schema files, query the actual database
- **COMPARE CODE TO REALITY** - Find handlers that have no UI, features that can't be accessed
- **TEST AT EVERY VIEWPORT** - Things break at different sizes
- **GIVE REAL UX OPINIONS** - You can see screenshots, judge them as a user would
- **RESEARCH FIRST** - You don't know everything, search for current standards
- **SAVE EVERYTHING TO FILES** - Context will reset, files persist
- **KEEP EXPANDING** - New findings during testing become new tasks
- **PLAN BEFORE ACTING** - Create plans, track progress, verify completion
- **PROVE DON'T CLAIM** - Evidence files or it didn't happen
- **THINK ADVERSARIALLY** - What would break? What would a hacker try?
- **MISS NOTHING** - The human is counting on you to find what they don't know to ask about
