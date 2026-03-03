# Dashboard Component Refactoring

This document describes the refactoring of the Dashboard.tsx component to improve maintainability and testability.

## Overview

The Dashboard.tsx file was refactored from **1,652 lines to 660 lines** (60% reduction) by extracting five major components into separate files under `src/components/Dashboard/`.

## Extracted Components

### 1. StatsPanel
**File:** `src/components/Dashboard/StatsPanel.tsx`

Displays 5 stat cards showing:
- Today's worked hours vs 8h target
- This week's worked hours vs 40h target  
- Active project count
- Break time today
- Billed hours today (if billing enabled)

**Props:**
- `todayWorkedMinutes: number` - Minutes worked today
- `thisWeekWorkedMinutes: number` - Minutes worked this week
- `activeProjectCount: number` - Count of active projects
- `totalBreakMinutesToday: number` - Total break minutes
- `todayBilledHours: number` - Billed hours today
- `isBillingEnabled: boolean` - Whether billing feature is enabled

### 2. TimerControls
**File:** `src/components/Dashboard/TimerControls.tsx`

Manages the timer control interface including:
- Quick Start button (no task assignment)
- Start with Task button (opens task selection dialog)
- Pause/Resume/Stop buttons (when timer running)
- Notes editing for running timer
- Task assignment/change for running timer

**Props:**
- `runningTimer: RunningTimer | null | undefined` - Current running timer
- `tasks: TaskItem[]` - Available tasks
- `onStartTimer: (taskId: number, notes: string) => void` - Start timer callback
- `onQuickStart: () => void` - Quick start callback
- `onStopTimer: () => void` - Stop timer callback
- `onPauseTimer: (id: number) => void` - Pause timer callback
- `onResumeFromPause: (id: number) => void` - Resume timer callback
- `onUpdateRunningNotes: (notes: string) => void` - Update notes callback
- `onAssignTaskToRunningTimer: (taskId: number | undefined, notes: string) => void` - Assign task callback
- `isStartTimerPending?: boolean` - Start pending state
- `isStopTimerPending?: boolean` - Stop pending state
- `isPauseTimerPending?: boolean` - Pause pending state
- `isResumeFromPausePending?: boolean` - Resume pending state
- `isUpdateTimerPending?: boolean` - Update pending state

**Internal State:**
- Manages task selection dialog state
- Manages notes editing state
- Manages search term for task filtering

### 3. ManualEntryDialog
**File:** `src/components/Dashboard/ManualEntryDialog.tsx`

Dialog for creating manual time entries with:
- Two entry modes: timeRange (start + end) or billedOnly (start + billed hours)
- Optional task assignment with search
- Start/End datetime inputs
- Notes textarea
- Validation for times and billed hours

**Props:**
- `open: boolean` - Dialog open state
- `onOpenChange: (open: boolean) => void` - Dialog state change callback
- `tasks: TaskItem[]` - Available tasks
- `onCreateEntry: (data: EntryData) => void` - Create entry callback
- `isCreating?: boolean` - Creation pending state

**Internal State:**
- Manages all form fields and validation
- Resets form on open
- Handles two entry modes

### 4. EditEntryDialog
**File:** `src/components/Dashboard/EditEntryDialog.tsx`

Dialog for editing existing time entries with:
- Task assignment with search (can be set to "No task")
- Start datetime (required)
- End datetime (optional)
- Billed hours (if billing enabled)
- Notes textarea
- Validation for all fields

**Props:**
- `open: boolean` - Dialog open state
- `onOpenChange: (open: boolean) => void` - Dialog state change callback
- `tasks: TaskItem[]` - Available tasks
- `entry: TimeEntry | null` - Entry to edit
- `onSaveEntry: (data: EntryData) => void` - Save entry callback
- `isSaving?: boolean` - Save pending state
- `isBillingEnabled: boolean` - Whether billing is enabled

**Internal State:**
- Manages all form fields and validation
- Populates fields from entry prop
- Converts ISO timestamps to datetime-local format

### 5. RecentEntriesList
**File:** `src/components/Dashboard/RecentEntriesList.tsx`

Displays list of recent time entries with:
- Two display modes: scroll or pagination
- Entry cards showing task, project, duration, notes
- Edit, Delete, and Restart buttons for each entry
- Double-click to restart timer
- Pagination controls (when in pagination mode)

**Props:**
- `entries: TimeEntry[]` - Entries to display
- `mode: 'scroll' | 'pagination'` - Display mode
- `currentPage: number` - Current page number
- `totalPages: number` - Total page count
- `isBillingEnabled: boolean` - Whether billing is enabled
- `onModeChange: (mode: RecentEntriesMode) => void` - Mode change callback
- `onPageChange: (page: number) => void` - Page change callback
- `onEditEntry: (entry: TimeEntry) => void` - Edit entry callback
- `onDeleteEntry: (id: number) => void` - Delete entry callback
- `onRestartTimer: (id: number) => void` - Restart timer callback
- `isDeleting?: boolean` - Delete pending state

## Benefits of Refactoring

### Maintainability
- Each component has a single responsibility
- Easier to locate and fix bugs
- Smaller files are easier to understand
- Clear component boundaries

### Testability
- Each component can be tested in isolation
- Props provide clear test boundaries
- State is localized to each component

### Reusability
- Components can be reused in other contexts if needed
- Dialog components follow consistent patterns

### Performance
- Components can be memoized independently
- State changes are more localized
- Reduced re-renders in parent component

## Migration Notes

### No Behavioral Changes
This refactoring is purely structural. All existing functionality remains unchanged:
- Timer start/stop/pause/resume
- Manual entry creation
- Entry editing
- Recent entries display
- All validations
- All error handling

### State Management
- Dashboard.tsx remains the orchestrator
- Handlers are passed down as props
- Local state is managed within each component
- React Query state remains in hooks

### Type Safety
- All components are fully typed with TypeScript
- Props interfaces are exported
- No `any` types used

## Future Improvements

Potential next steps:
1. Extract a `useDashboard` hook for shared logic
2. Add unit tests for each extracted component
3. Consider further extraction of timer display logic
4. Add Storybook stories for component documentation
