import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Calendar, Clock, LogIn, LogOut, Filter, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkDays, useUpdateWorkDay, useDeleteWorkDay } from '../hooks/useWorkDays';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { formatDate, formatTime, formatDateForInput } from '../lib/dateUtils';
import { WorkDay } from '../api/workDays';

const WORKDAY_BREAK_SORT_KEY = 'timekeeper_workday_break_sort_order';

const formatDateForDisplay = (date: Date) => {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const formatDateForIso = (date: Date) => {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

const parseSmartDateInput = (raw: string): Date | null => {
  const value = raw.trim().toLowerCase();
  if (!value) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (value === 'h' || value === 't' || value === 'today') {
    return now;
  }

  if (/^[+-]\d{1,3}$/.test(value)) {
    const deltaDays = Number(value);
    const parsed = new Date(now);
    parsed.setDate(parsed.getDate() + deltaDays);
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  if (/^\d{1,2}$/.test(value)) {
    const day = Number(value);
    if (day < 1 || day > 31) return null;
    const parsed = new Date(now.getFullYear(), now.getMonth(), day);
    if (parsed.getMonth() !== now.getMonth()) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  const parts = value.split(/[.\/-]/).filter(Boolean);
  if (parts.length >= 2 && parts.length <= 3) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    let year = parts.length === 3 ? Number(parts[2]) : now.getFullYear();

    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
      return null;
    }

    if (year < 100) {
      year = 2000 + year;
    }

    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  return null;
};

export function WorkDays() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [startDateInput, setStartDateInput] = useState<string>('');
  const [endDateInput, setEndDateInput] = useState<string>('');
  const [filterApplied, setFilterApplied] = useState(false);
  const [editingWorkDay, setEditingWorkDay] = useState<WorkDay | null>(null);
  const [expandedBreakDays, setExpandedBreakDays] = useState<Record<number, boolean>>({});
  const [breakSortOrder, setBreakSortOrder] = useState<'newest' | 'oldest'>(() => {
    const saved = localStorage.getItem(WORKDAY_BREAK_SORT_KEY);
    return saved === 'oldest' ? 'oldest' : 'newest';
  });
  const [editForm, setEditForm] = useState({ checkInTime: '', checkOutTime: '', notes: '' });

  useEffect(() => {
    localStorage.setItem(WORKDAY_BREAK_SORT_KEY, breakSortOrder);
  }, [breakSortOrder]);
  
  const { data: workDays = [], isLoading, error } = useWorkDays(
    filterApplied ? startDate : undefined,
    filterApplied ? endDate : undefined
  );
  
  const updateWorkDay = useUpdateWorkDay();
  const deleteWorkDay = useDeleteWorkDay();
  const { data: timeEntries = [] } = useTimeEntries({});
  
  console.log('[WorkDays] workDays:', workDays, 'count:', workDays?.length, 'isLoading:', isLoading);

  const applySmartDate = (value: string, target: 'start' | 'end', showError: boolean = false) => {
    if (!value.trim()) {
      if (target === 'start') {
        setStartDate('');
        setStartDateInput('');
      } else {
        setEndDate('');
        setEndDateInput('');
      }
      return true;
    }

    const parsed = parseSmartDateInput(value);
    if (!parsed) {
      if (showError) {
        alert(`Invalid ${target === 'start' ? 'start' : 'end'} date. Use for example: h, -1, +7, 24, 24.02, 24.02.2026`);
      }
      return false;
    }

    const formattedDisplay = formatDateForDisplay(parsed);
    const formattedIso = formatDateForIso(parsed);

    if (target === 'start') {
      setStartDate(formattedIso);
      setStartDateInput(formattedDisplay);
    } else {
      setEndDate(formattedIso);
      setEndDateInput(formattedDisplay);
    }
    return true;
  };

  const handleApplyFilter = () => {
    const startOk = applySmartDate(startDateInput, 'start', true);
    const endOk = applySmartDate(endDateInput, 'end', true);
    if (!startOk || !endOk) {
      return;
    }
    setFilterApplied(true);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setStartDateInput('');
    setEndDateInput('');
    setFilterApplied(false);
  };

  const toggleBreakDetails = (workDayId: number) => {
    setExpandedBreakDays((prev) => ({
      ...prev,
      [workDayId]: !prev[workDayId],
    }));
  };

  const handleEdit = (workDay: WorkDay) => {
    setEditingWorkDay(workDay);
    setEditForm({
      checkInTime: workDay.checkInTime ? formatDateForInput(workDay.checkInTime) : '',
      checkOutTime: workDay.checkOutTime ? formatDateForInput(workDay.checkOutTime) : '',
      notes: workDay.notes || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingWorkDay) return;
    
    try {
      await updateWorkDay.mutateAsync({
        id: editingWorkDay.id,
        data: {
          checkInTime: editForm.checkInTime || undefined,
          checkOutTime: editForm.checkOutTime || undefined,
          notes: editForm.notes || undefined
        }
      });
      setEditingWorkDay(null);
    } catch (error) {
      console.error('Failed to update work day:', error);
      alert('Failed to update work day. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingWorkDay(null);
    setEditForm({ checkInTime: '', checkOutTime: '', notes: '' });
  };

  const handleDelete = async (workDay: WorkDay) => {
    const hasAssociatedData = workDay.breaks.length > 0;
    
    let confirmMessage = `Are you sure you want to delete the work day for ${formatDate(workDay.date, 'MMMM d, yyyy')}?`;
    if (hasAssociatedData) {
      confirmMessage += `\n\nThis work day has ${workDay.breaks.length} break(s) that will also be deleted.`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    try {
      // Try normal delete first
      await deleteWorkDay.mutateAsync({ id: workDay.id, cascade: false });
    } catch (error) {
      console.error('Failed to delete work day:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // If it failed due to associated records, offer force delete
      if (errorMessage.includes('time entries') || errorMessage.includes('breaks')) {
        const forceDelete = confirm(
          `${errorMessage}\n\nDo you want to FORCE DELETE this work day and all associated records?\n\nWARNING: This will permanently delete all time entries and breaks for this day. This action cannot be undone.`
        );
        
        if (forceDelete) {
          try {
            await deleteWorkDay.mutateAsync({ id: workDay.id, cascade: true });
          } catch (cascadeError) {
            console.error('Failed to force delete:', cascadeError);
            const cascadeErrorMessage = cascadeError instanceof Error ? cascadeError.message : 'Unknown error';
            alert(`Failed to force delete work day: ${cascadeErrorMessage}`);
          }
        }
      } else {
        alert(`Failed to delete work day: ${errorMessage}`);
      }
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const toLocalDateKey = (value: string) => {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const billedHoursByDate = useMemo(() => {
    return timeEntries.reduce((acc, entry) => {
      const key = toLocalDateKey(entry.startTime);
      acc[key] = (acc[key] || 0) + (entry.billedHours || 0);
      return acc;
    }, {} as Record<string, number>);
  }, [timeEntries]);

  const getWorkedMinutesExcludingBreaks = (workDay: WorkDay) => {
    if (!workDay.checkInTime) {
      return 0;
    }

    const start = new Date(workDay.checkInTime);
    const end = workDay.checkOutTime ? new Date(workDay.checkOutTime) : new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return 0;
    }

    const spanMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    return Math.max(0, spanMinutes - (workDay.totalBreakMinutes || 0));
  };

  const getBreakDurationMinutes = (startTime: string, endTime?: string, durationMinutes?: number) => {
    if (typeof durationMinutes === 'number') {
      return Math.max(0, durationMinutes);
    }

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Work Days</h1>
        <p className="text-muted-foreground">
          View your work day history and attendance
        </p>
      </div>

      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Work Days
          </CardTitle>
          <CardDescription>
            Filter by date range (leave empty to show all)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">
                Start Date
              </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    onBlur={(e) => {
                      applySmartDate(e.target.value, 'start');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applySmartDate((e.target as HTMLInputElement).value, 'start');
                      }
                    }}
                    placeholder="h, -1, +7, 24, 24.02, 24.02.2026"
                    className="pl-9"
                  />
                </div>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">
                End Date
              </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={endDateInput}
                    onChange={(e) => setEndDateInput(e.target.value)}
                    onBlur={(e) => {
                      applySmartDate(e.target.value, 'end');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applySmartDate((e.target as HTMLInputElement).value, 'end');
                      }
                    }}
                    placeholder="h, -1, +7, 24, 24.02, 24.02.2026"
                    className="pl-9"
                  />
                </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplyFilter}>
                Apply Filter
              </Button>
              {filterApplied && (
                <Button variant="outline" onClick={handleClearFilter}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Days List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Work Day History</CardTitle>
              <CardDescription>
                Your check-in and check-out records
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {workDays.length} {workDays.length === 1 ? 'day' : 'days'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading work days...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              Error loading work days: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          ) : workDays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No work days found. Start tracking by checking in!
            </div>
          ) : (
            <div className="space-y-3">
              {workDays.map((workDay) => (
                <div
                  key={workDay.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatDate(workDay.date, 'EEEE, MMMM d, yyyy')}
                        </span>
                        {workDay.isCheckedIn && (
                          <Badge variant="default" className="ml-2">
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                              Active
                            </span>
                          </Badge>
                        )}
                      </div>

                      {/* Check In/Out Times */}
                      <div className="flex flex-wrap gap-6 text-sm">
                        {workDay.checkInTime && (
                          <div className="flex items-center gap-2">
                            <LogIn className="h-4 w-4 text-green-600" />
                            <span className="text-muted-foreground">Check In:</span>
                            <span className="font-medium">
                              {formatTime(workDay.checkInTime)}
                            </span>
                          </div>
                        )}
                        {workDay.checkOutTime && (
                          <div className="flex items-center gap-2">
                            <LogOut className="h-4 w-4 text-red-600" />
                            <span className="text-muted-foreground">Check Out:</span>
                            <span className="font-medium">
                              {formatTime(workDay.checkOutTime)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {workDay.notes && (
                        <div className="text-sm text-muted-foreground italic">
                          {workDay.notes}
                        </div>
                      )}
                      
                      {/* Associated Data */}
                      {workDay.breaks.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {workDay.breaks.length} {workDay.breaks.length === 1 ? 'break' : 'breaks'}
                          </Badge>
                          {workDay.totalBreakMinutes > 0 && (
                            <span>Total break: {formatDuration(workDay.totalBreakMinutes)}</span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleBreakDetails(workDay.id)}
                            className="h-6 px-2 text-xs"
                          >
                            {expandedBreakDays[workDay.id] ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                                Hide breaks
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                Show breaks
                              </>
                            )}
                          </Button>
                          </div>

                          {expandedBreakDays[workDay.id] && (
                            <div className="rounded-md border bg-muted/20 p-2 space-y-2">
                              <div className="flex items-center justify-between border-b pb-2">
                                <span className="text-xs font-medium text-muted-foreground">Break details</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => setBreakSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                                >
                                  {breakSortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
                                </Button>
                              </div>

                              {[...workDay.breaks]
                                .sort((a, b) => {
                                  const aTime = new Date(a.startTime).getTime();
                                  const bTime = new Date(b.startTime).getTime();
                                  return breakSortOrder === 'newest' ? bTime - aTime : aTime - bTime;
                                })
                                .map((breakItem, index) => {
                                const breakMinutes = getBreakDurationMinutes(
                                  breakItem.startTime,
                                  breakItem.endTime,
                                  breakItem.durationMinutes
                                );

                                return (
                                  <div key={breakItem.id} className="text-xs flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-medium">
                                        Break {index + 1}
                                        {breakItem.isActive && (
                                          <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">Active</Badge>
                                        )}
                                      </div>
                                      <div className="text-muted-foreground">
                                        {formatTime(breakItem.startTime)}
                                        {' - '}
                                        {breakItem.endTime ? formatTime(breakItem.endTime) : 'Now'}
                                      </div>
                                      {breakItem.notes && (
                                        <div className="text-muted-foreground italic">{breakItem.notes}</div>
                                      )}
                                    </div>
                                    <div className="font-medium whitespace-nowrap">{formatDuration(breakMinutes)}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Total Hours and Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-end gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-2xl font-bold leading-none">
                                {formatDuration(getWorkedMinutesExcludingBreaks(workDay))}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Total Worked (excluding breaks)
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Break Time: <span className="font-medium text-foreground">{formatDuration(workDay.totalBreakMinutes || 0)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <span title="Sum of billed hours from all time entries that started on this day.">Billed Hours:</span>{' '}
                            <span className="font-medium text-foreground">{(billedHoursByDate[toLocalDateKey(workDay.date)] || 0).toFixed(2)}h</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(workDay)}
                          className="h-8 px-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(workDay)}
                          className="h-8 px-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingWorkDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle>Edit Work Day</CardTitle>
              <CardDescription>
                Update times and notes for {formatDate(editingWorkDay.date, 'MMMM d, yyyy')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Check In Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={editForm.checkInTime}
                    onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Check Out Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={editForm.checkOutTime}
                    onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Notes
                  </label>
                  <Input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Optional notes..."
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEdit} disabled={updateWorkDay.isPending}>
                    {updateWorkDay.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
