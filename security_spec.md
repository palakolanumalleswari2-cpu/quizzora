# Quizzora Security Specification & Data Invariants

## 1. Data Invariants
- **Access Code & Answer Key Secrecy**: The correct answers to quiz questions and the quiz access verification secrets must never be exposed to clients or students via public Firestore rules or public API routes.
- **Single Attempt Rule**: A student identified by a normalized Roll Number can only have one active/finalized quiz attempt per quiz ID. Duplicate attempts are rejected.
- **Timer Immutability**: The quiz attempt `deadline` and `startTime` are established upon quiz initialization by the trusted backend. Students cannot alter `startTime` or extend `deadline` through client updates.
- **Result Integrity**: Quiz scores, percentages, correct counts, and marks cannot be written or modified directly by students. Only server-side evaluation produces finalized `QuizResult` records.
- **Student PII & Result Isolation**: Individual students may only read their own registration, attempt, and verified result record. Bulk listing or scraping of other students' scores is forbidden.
- **Admin Privilege Enforcement**: Only verified administrators on the allowlist (including `palakolanumalleswari2@gmail.com` and records in `/admins/{adminUid}`) can view aggregate metrics, export CSV reports, mutate quiz settings, reset attempts, or write audit logs.

## 2. The "Dirty Dozen" Threat Payloads (Must be blocked)
1. **Direct Answer Key Scrape**: Attempting to read question answer documents from client SDK. (Blocked by default-deny).
2. **Self-Awarded Score Injection**: Student sends a `QuizResult` write setting `score: 30`, `percentage: 100`. (Blocked by rules forbidding student writes to `quizResults`).
3. **Timer Extension Attack**: Student attempts to send an update to `QuizAttempt` extending `deadline` by 60 minutes. (Blocked by affectedKeys check and server timestamp constraints).
4. **Duplicate Roll Number Registration Hijack**: Attacker registers with someone else's roll number to override their test. (Blocked by existence check on rollNumber document ID).
5. **Access Code Brute Force / Bypass**: Attacker tries to start a quiz without verifying the organizer access code. (Backend enforces rate-limited verification token).
6. **Result Snoop Attack**: Student A attempts to `get` `/quizResults/student_B` or list all documents in `/quizResults`. (Blocked by identity matching rule).
7. **Privilege Escalation**: Non-admin user tries to write a document into `/admins/{uid}` claiming admin role. (Blocked: only existing admins can modify `/admins`).
8. **Quiz State Sabotage**: Unauthenticated or student client attempts to set `quizSettings.isActive = false`. (Blocked: writes to `quizSettings` restricted to `isAdmin()`).
9. **Shadow Fields Attack**: Payload includes ghost properties such as `isAdmin: true` or `bypassed: true`. (Blocked by `isValidEntity` and strict key allowlists).
10. **Terminal State Tampering**: Student attempts to update answers after status has transitioned to `submitted`. (Blocked by terminal state lock).
11. **Email Spoofing Attack**: Attacker claims admin email with `email_verified == false`. (Blocked by strict `request.auth.token.email_verified == true`).
12. **Denial of Wallet Oversized Payload**: Injecting a 5MB payload into student answers. (Blocked by size limits).

## 3. Test Runner Invariant Checks
All operations violating the above policies must return `PERMISSION_DENIED`.
