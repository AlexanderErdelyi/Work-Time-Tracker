---
name: review-and-merge-pr
description: >
  Full PR review-and-merge workflow. Use this when asked to check, review, or
  handle a GitHub issue and its pull request: fetch the issue, fetch the linked
  PR, review the implementation for correctness, apply any needed fixes,
  interactively confirm, commit, optionally create a PR, and optionally merge
  and delete the branch.
---

# PR Review & Merge Workflow

Follow every step below in order. Pause and ask the user at each decision point before moving on.

---

## Step 1 — Fetch the issue

1. Identify the issue number from the user's prompt.
2. Fetch the GitHub issue (`owner/repo` from the current workspace's git remote).
3. Extract:
   - **Title & description** – what problem it reports or what feature it requests.
   - **Category / severity** – bug, feature, etc.
   - **Expected behaviour** – what should work after the fix.

---

## Step 2 — Find the linked PR

Search for open (and recently closed) PRs that reference the issue number:
- Look for `Fixes #NNN`, `Closes #NNN`, or `Resolves #NNN` in PR bodies.
- Also look for PRs whose branch name matches a Copilot-generated pattern like `copilot/fix-…`.

If **no PR exists** → skip to **Step 6** (generate PR).

---

## Step 3 — Review the PR's changes

For every changed file in the PR:

1. Load both the **PR branch version** (from GitHub) and the **current local version** of each file.
2. Understand the intent of each change in the context of the issue.
3. Verify:
   - The root cause described in the issue is actually addressed.
   - The solution is complete — check whether identical patterns exist elsewhere in the codebase that also need the same fix (use grep/semantic search).
   - The change does not break unrelated functionality.
   - Security / authorization constraints are respected.
   - Code style matches the surrounding file.

4. Summarise your findings in a concise review report:
   - **What the PR does** (1–2 sentences).
   - **Verdict**: ✅ Correct and complete / ⚠️ Partially correct / ❌ Incorrect.
   - **Issues found** (if any): list each gap with a short explanation.
   - **Additional locations** that need the same fix (if found).

---

## Step 4 — Ask the user whether to apply changes

Present the review report to the user.

**If no changes are needed:**
> "Everything looks correct and complete — no additional changes are needed. The PR is ready to merge on GitHub: `https://github.com/<owner>/<repo>/pull/<number>`"

Stop here (skip to Step 8 to tell the user to merge manually).

**If changes are needed**, clearly list each one, then ask:

> "I found the following issues that need to be fixed:
> 1. …
> 2. …
>
> Shall I apply these fixes now? (yes / no)"

- If **no**: stop here and summarise what was reviewed.
- If **yes**: continue to Step 5.

---

## Step 5 — Apply fixes on the PR branch

1. Check out the PR branch locally (`git fetch origin <branch>; git checkout <branch>`).
2. Apply all required changes to the local files.
3. Run any available linters or build steps to confirm no compilation errors.
4. Show the user a diff summary of everything that was changed.

Ask:

> "Here is a summary of the changes I made. Does everything look correct? (yes / no / show full diff)"

- If **no** or corrections requested: revise and re-show.
- If **yes**: continue to Step 6 — Commit.

---

## Step 6 — Commit

1. Stage the modified files.
2. Write a descriptive commit message following the Conventional Commits format:
   - `fix(<scope>): <short summary>` for bug fixes.
   - `feat(<scope>): <short summary>` for features.
   - Include a body that explains *why* the change was needed.
3. Commit and push to the remote branch.

Confirm to the user: "Changes committed and pushed to `<branch>`."

---

## Step 7 — Create a Pull Request (if none exists)

> ⚠️ The agent does not have API permission to create or merge PRs. The user must do these steps manually on GitHub.

If a PR for this branch does not yet exist, tell the user:

> "No PR exists for this branch yet. Please create one manually on GitHub:
> - Base: `main` (or the repo's default branch)
> - Head: `<branch>`
> - Title: derived from the issue title
> - Body: reference the issue with `Fixes #NNN`, summarise the changes, and include a short test plan."

Then wait for the user to confirm the PR has been created before continuing.

---

## Step 8 — Merge the PR

Tell the user:

> "Please merge the PR on GitHub when you are ready. Use squash merge to keep a clean history.
> PR URL: `https://github.com/<owner>/<repo>/pull/<number>`
>
> Once you have merged it, let me know and I will clean up the branch."

Wait for the user to confirm the PR has been merged.

---

## Step 9 — Delete the branch

After the user confirms the merge, ask:

> "Shall I delete the `<branch>` branch (remote + local)? (yes / no)"

- If **yes**:
  1. Delete the remote branch: `git push origin --delete <branch>`
  2. Delete the local branch: `git branch -D <branch>` (use `-D` because squash merges are not recognised as merged by git)
  3. Check out `main` (or the repo's default branch).
  4. Pull the latest changes: `git pull`.
- If **no**: leave the branch in place.

---

## Notes

- Always pause and wait for explicit user confirmation at Steps 4, 5 (after diff), 8, and 9.
- If at any step the user says "stop" or "cancel", abort gracefully and summarise what was completed.
- When searching for additional fix locations, use both `grep_search` and `semantic_search` to cover exact string matches and conceptually similar code.
- Authorization attributes (e.g. `[Authorize(...)]`) and React state/effect patterns (race conditions, stale closures) are common sources of incompleteness — always check for these specifically.
