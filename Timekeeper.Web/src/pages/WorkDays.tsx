import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Calendar, Clock, LogIn, LogOut, Filter, Edit, Trash2 } from 'lucide-react';
import { useWorkDays, useUpdateWorkDay, useDeleteWorkDay } from '../hooks/useWorkDays';
import { formatDate, formatTime, formatDateForInput } from '../lib/dateUtils';
import { WorkDay } from '../api/workDays';

export function WorkDays() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filterApplied, setFilterApplied] = useState(false);
  const [editingWorkDay, setEditingWorkDay] = useState<WorkDay | null>(null);
  const [editForm, setEditForm] = useState({ checkInTime: '', checkOutTime: '', notes: '' });
  
  const { data: workDays = [], isLoading, error } = useWorkDays(
    filterApplied ? startDate : undefined,
    filterApplied ? endDate : undefined
  );
  
  const updateWorkDay = useUpdateWorkDay();
  const deleteWorkDay = useDeleteWorkDay();
  
  console.log('[WorkDays] workDays:', workDays, 'count:', workDays?.length, 'isLoading:', isLoading);

  const handleApplyFilter = () => {
    setFilterApplied(true);
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setFilterApplied(false);
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
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {workDay.breaks.length} {workDay.breaks.length === 1 ? 'break' : 'breaks'}
                          </Badge>
                          {workDay.totalBreakMinutes > 0 && (
                            <span>({formatDuration(workDay.totalBreakMinutes)} break time)</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Total Hours and Actions */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-2xl font-bold">
                              {formatDuration(workDay.totalWorkedMinutes)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total Worked
                            </div>
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
