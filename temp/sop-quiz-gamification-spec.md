# Specification: Casa Luma SOP & Menu Quiz System ("Luma Academy")

This document defines the final, customized specification for the Luma Academy, incorporating direct decisions on database design, question generation, delivery mechanisms, staff authentication, and management controls.

---

## 1. Product Vision & Architecture

The system is designed as an integrated training, testing, and feedback platform. It operates under a **hybrid push-pull model**:
* **Push (Direct Delivery)**: Staff are sent direct, unique quiz/question links via WhatsApp or Telegram. The links encode their employee ID, enabling instant, frictionless authentication with no passwords.
* **Pull (Management Hub)**: Managers access a dedicated **Quiz Manager** tool within the internal tools dashboard (`/tools/quiz-manager`) to generate questions, monitor performance, and analyze results.

---

## 2. Frictionless Staff Authentication & Links

To prevent password fatigue and login friction, staff do not log into an app interface.

### The Link Structure:
Quizzes are dispatched as pre-configured URLs sent directly to the employee's messaging app (WhatsApp/Telegram):

```
https://casaluma.com/tools/quiz?e=[employee_id]&q=[question_id_1,question_id_2]&t=[quiz_type]
```

### Authentication Flow:
1. When the page loads at `/tools/quiz`, the server parses the query parameters:
   - `e`: Employee ID (Relation to the `Employees` Notion database).
   - `q`: List of Question IDs (determines exactly which questions are served).
   - `t`: Quiz Type (`SOP`, `Food Menu`, `Bar Menu`, etc.).
2. The server loads the corresponding Employee record and verifies that they are `Active` or `Onboarding`.
3. The server serves the beautiful, lightweight Svelte interactive card carousel containing only those specific questions.
4. If `q` is omitted, the server dynamically retrieves active, unanswered questions appropriate for the employee's role/department.

---

## 3. Database Schema Design (Notion Property-Only Optimization)

To maximize query speed and avoid block-rendering delays, **we will store all data strictly in database properties**. We will not insert or parse page blocks/content.

### Database 1: `SOP Quiz Questions` (The Question Bank)
This database holds all pre-generated questions.
* **Question (Title)**: The question text (e.g. *"What is the correct price of the Salmon Salad?"*).
* **SOP/Category (Relation)**: Relation to the existing `SOP Catalog` database (or plain text category).
* **Target Roles (Relation)**: Relation to the existing `Roles` database (determines who is tested on this).
* **Option A (Rich Text)**: Text for option A.
* **Option B (Rich Text)**: Text for option B.
* **Option C (Rich Text)**: Text for option C.
* **Option D (Rich Text)**: Text for option D.
* **Correct Option (Select)**: `A`, `B`, `C`, or `D`.
* **Explanation (Rich Text)**: Direct educational feedback shown to the employee after answering.
* **Status (Select)**: `Draft`, `Active`, `Archived`.
* **Type (Select)**: `SOP`, `Food Menu`, `Bar Menu`, `Close Shift`, `Accounting`.

### Database 2: `SOP Quiz Submissions` (Performance Tracking)
Every quiz attempt is saved here as a single row.
* **Submission ID (Title)**: Generated identifier (`[Nickname] - [Quiz Type] - [Date]`).
* **Employee (Relation)**: Relation to the existing `Employees` database.
* **Role (Relation)**: Relation to the `Roles` database.
* **Date (Date)**: Timestamp.
* **Quiz Type (Select)**: `SOP`, `Food Menu`, `Bar Menu`, `Close Shift`, `Accounting`, `Daily Challenge`.
* **Score (Number)**: Answering percentage (e.g., `80` for 4/5).
* **Answers JSON (Rich Text)**: A compact JSON array storing the question IDs and whether they were answered correctly (e.g. `[{"id":"q1","correct":true},{"id":"q2","correct":false}]`).
* **Passed (Checkbox)**: True if the score meets the role threshold (e.g., `80%`).

---

## 4. Prior Bulk Question Generation & Admin Tool

Questions are **never generated on the fly** during quiz taking. They are bulk-generated and approved in advance inside the **Quiz Manager** admin tool, which lives under `/tools/quiz-manager` (managerOnly).

### Quiz Manager Features:
1. **Bulk Question Generator (LLM-Assisted)**:
   - Managers select a source SOP (from the `SOP Catalog`), a Menu Section, or a Recipe.
   - An LLM reads the live catalog or menu item data, and drafts a batch of 5–10 multiple-choice questions.
   - The manager reviews, edits, and clicks **"Publish to Question Bank"**, which instantly writes them to the `SOP Quiz Questions` database in Notion.
2. **Manual Question Editor**:
   - Standard CRUD operations (Create, Read, Update, Delete) for any question directly inside SvelteKit, syncing instantly back to Notion properties.
3. **Staff Response Viewer**:
   - A dashboard showing a list of recent submissions, color-coded by performance (green for passed, red for failed).
   - Allows managers to see which questions are missed most often (identifying training gaps in the team).

---

## 5. Gamification, Leaderboard & Alerts

1. **Simple Leaderboard**:
   - Located on the `/tools/quiz-manager` and `/tools/academy` pages.
   - Displays a ranking list of active employees based on:
     - **Pass Rate**: Total quizzes passed / total quizzes taken.
     - **Streak Count**: Number of consecutive correct daily question completions.
2. **Telegram Alerts on Failure**:
   - Integrated with `src/lib/server/alerts/telegram.ts`.
   - When an employee fails a quiz (score below 80%), a direct notification is sent to the manager's Telegram:
     ```
     ⚠️ Luma Academy Failure Alert
     Staff: [Nickname] (Role: [Role])
     Quiz: [Quiz Type] (SOP: [SOP Name])
     Score: [Score]% (Failed)
     Missed Questions:
     - "Question 1" (Selected B, Correct A)
     ```
   - This allows managers to provide immediate, supportive 1-on-1 coaching.

---

## 6. SvelteKit Route Planning

```bash
# SvelteKit Structure
src/routes/tools/
├── quiz/
│   ├── +page.svelte           # Quiz taking client component (Card carousel)
│   ├── +page.server.ts       # Parses query parameters (e & q & t) and loads questions
│   └── submit/
│       └── +server.ts         # Endpoint validating submissions & saving to Notion
└── quiz-manager/
    ├── +page.svelte           # Admin dashboard, leaderboard, bulk generator, and results viewer
    ├── +page.server.ts        # Loads all questions, submissions, and employees
    └── api/
        ├── generate-questions/
        │   └── +server.ts     # Triggers LLM bulk-generation from selected SOPs/menus
        └── crud/
            └── +server.ts     # Creates, updates, and deletes questions in Notion
```

---

## 7. Phase-by-Phase Implementation Plan

### Phase 1: Notion Schema Setup
- [ ] Create `SOP Quiz Questions` and `SOP Quiz Submissions` databases in the Notion workspace.
- [ ] Add database IDs to `notion-sdk.json` and execute `pnpm notion:generate` to produce the typed models.

### Phase 2: Server-Side API & Crud
- [ ] Create the `/tools/quiz-manager` CRUD endpoints to create, edit, and delete questions in Notion.
- [ ] Write the LLM question-generation routine using Claude/Replicate to parse SOP items and produce multiple-choice questions.

### Phase 3: SvelteKit Staff Quiz Page
- [ ] Build the `/tools/quiz` page. Add robust, beautiful, non-template Montessori-style card components.
- [ ] Implement the frictionless link-based parser (reading `e`, `q`, and `t` parameters).
- [ ] Design the submission endpoint which computes the score and writes the submission row.

### Phase 4: Leaderboard & Telegram Integration
- [ ] Create the simple leaderboard logic mapping employees and scores.
- [ ] Bind quiz failures to `src/lib/server/alerts/telegram.ts` to push instant notifications.
