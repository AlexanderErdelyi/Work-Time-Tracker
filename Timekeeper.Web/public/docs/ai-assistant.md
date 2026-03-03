# AI Assistant

The AI Assistant lets you track time using natural language. Instead of navigating menus, just describe what you want — the assistant finds the right task, confirms with you, and takes action.

---

## Getting Started

The AI Assistant appears in the sidebar as **AI Assistant** once an administrator has enabled it in Settings. If you don't see it, contact your workspace admin.

To open it: click **AI Assistant** in the left sidebar.

---

## What You Can Do

### Ask About Your Work

Get a quick summary of your day or recent activity:

- *"What did I work on today?"*
- *"Show me the last 5 days"*
- *"How many hours did I log this week?"*
- *"Is there a timer currently running?"*

### Start a Timer

Describe the task — even partially or with a typo — and the assistant will find it:

- *"Start a timer for the weekly meeting"*
- *"Start timer for CLS team weekly"*
- *"Begin tracking Team-Weekly Cosmo"*

The assistant searches all tasks across all projects and customers, then confirms the match before starting. If multiple tasks match, it will list them and ask you to choose.

### Log a Time Entry

Create a completed entry with optional time and notes:

- *"Log 2 hours on Team-Weekly, ended 30 minutes ago"*
- *"Add an entry for yesterday afternoon on the CLS project, about 1.5h"*
- *"Log a 45-minute standup on project CLS this morning"*

The assistant always confirms the task name, duration, and time before creating anything.

### Browse Tasks and Projects

- *"What tasks are available for customer Cosmo?"*
- *"List all active projects"*
- *"What customers do we have?"*

---

## How It Works

1. **You type a message** in the chat box and press Enter (or Shift+Enter for a new line).
2. The assistant **searches your workspace data** — tasks, projects, customers, time entries — using real-time tools.
3. It **fuzzy-matches** your words against task names, project names, and customer names, so partial names and typos work.
4. It **confirms before acting** — it will always tell you what it found and what it's about to do before creating or starting anything.
5. You **confirm or correct** — say "yes", "go ahead", or "actually use the other one" and it adjusts.

The assistant remembers the context of your current conversation (session), so follow-up messages work naturally:

- *"Start timer for Team-Weekly"* → assistant confirms match
- *"Yes, start it"* → timer starts
- *"Actually, log it as finished an hour ago"* → converts to a completed entry

---

## Quick Reference

| Goal | What to say |
|------|-------------|
| Start timer fast | *"start [partial task name]"* |
| Log past work | *"log [duration] on [task] [when]"* |
| Check current timer | *"what's running?"* |
| Today's summary | *"summary today"* |
| Recent history | *"last 7 days"* |
| Browse all tasks | *"list tasks"* |

**Tips:**
- You can be vague — "weekly meeting", "team call", "CLS" — the assistant looks it up.
- Partial customer or project names work — "start timer Cosmo weekly" is enough.
- The assistant won't act without confirmation. It will always name the task before starting or logging.
- Use the **trash icon** in the chat to clear the session and start fresh.

---

## Administrator Setup

To enable the AI Assistant for your workspace:

1. Go to **Settings** (bottom of the sidebar).
2. Scroll to the **AI Assistant** section (visible to Admins only).
3. Paste a **GitHub Classic PAT** (Personal Access Token) — generate one at [github.com/settings/tokens](https://github.com/settings/tokens). No specific scopes are required; your GitHub account must have an active **GitHub Copilot** subscription.
4. Click **Save Token**.
5. Check **Enable AI Assistant for all users in this workspace**.
6. Click **Test Connection** to verify the token works.

Once enabled, all users will see the **AI Assistant** entry in the sidebar.

The token is stored encrypted in the workspace database. Alternatively, set the `COPILOT__GITHUBTOKEN` environment variable on the server to configure it globally without storing it in the database.

---

## Privacy & Data

- Your time entry data, task names, project names, and customer names are sent to the **GitHub Models API** (powered by GitHub Copilot) to answer your questions.
- No data is stored externally — the API processes each request and returns a response.
- Session history is kept **in memory only** and is cleared when you clear the chat or when the server restarts.
- The AI cannot access data from other workspaces.
