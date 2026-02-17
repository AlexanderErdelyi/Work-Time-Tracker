import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Play, CheckSquare, Clock, FileDown, X, Zap } from 'lucide-react';
import { useQuickActions } from '../hooks/useQuickActions';
import { useStartTimer } from '../hooks/useTimeEntries';
import '../styles/command-palette.css';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { data: quickActions, isLoading } = useQuickActions();
  const startTimer = useStartTimer();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onClose]);

  const handleAction = async (actionType: string, taskId?: number) => {
    switch (actionType) {
      case 'StartTimer':
        startTimer.mutate({ taskId: null, notes: null });
        break;
      case 'StartTimerWithTask':
        if (taskId) {
          startTimer.mutate({ taskId, notes: null });
        }
        break;
      case 'CheckIn':
        // TODO: Implement check-in
        console.log('Check-in action');
        break;
      case 'StartBreak':
        // TODO: Implement break
        console.log('Start break action');
        break;
      case 'ExportToday':
        window.open('/api/export/today/xlsx', '_blank');
        break;
    }
    onClose();
  };

  const getIcon = (actionType: string) => {
    switch (actionType) {
      case 'StartTimer':
      case 'StartTimerWithTask':
        return <Play className="w-4 h-4" />;
      case 'CheckIn':
        return <CheckSquare className="w-4 h-4" />;
      case 'StartBreak':
        return <Clock className="w-4 h-4" />;
      case 'ExportToday':
        return <FileDown className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  if (!open) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-container" onClick={(e) => e.stopPropagation()}>
        <Command className="command-root">
          <div className="command-header">
            <Command.Input
              placeholder="Type a command or search..."
              value={search}
              onValueChange={setSearch}
              className="command-input"
            />
            <button onClick={onClose} className="command-close">
              <X className="w-4 h-4" />
            </button>
          </div>

          <Command.List className="command-list">
            {isLoading && (
              <Command.Loading>Loading actions...</Command.Loading>
            )}

            <Command.Empty>No actions found.</Command.Empty>

            <Command.Group heading="Quick Actions" className="command-group">
              {quickActions?.map((action) => (
                <Command.Item
                  key={action.id}
                  onSelect={() => handleAction(action.actionType, action.taskId)}
                  className="command-item"
                >
                  <span className="command-item-icon">
                    {getIcon(action.actionType)}
                  </span>
                  <span className="command-item-text">
                    {action.name}
                    {action.task && (
                      <span className="command-item-subtitle">
                        {action.task.customerName} - {action.task.projectName} - {action.task.name}
                      </span>
                    )}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="command-footer">
            <kbd>Esc</kbd> to close  <kbd>Ctrl/Cmd+K</kbd> to toggle
          </div>
        </Command>
      </div>
    </div>
  );
}
