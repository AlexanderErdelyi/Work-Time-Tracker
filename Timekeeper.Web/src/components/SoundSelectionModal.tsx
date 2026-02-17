import React, { useState, useEffect } from 'react';
import { Play, Volume2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/Dialog';
import { Button } from './ui/Button';
import { soundsApi, SoundFile } from '../api/sounds';

interface SoundSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSound: string;
  onSoundSelect: (soundFileName: string) => void;
}

const SoundSelectionModal: React.FC<SoundSelectionModalProps> = ({
  isOpen,
  onClose,
  currentSound,
  onSoundSelect,
}) => {
  const [sounds, setSounds] = useState<SoundFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSound, setSelectedSound] = useState(currentSound);
  const [playingSound, setPlayingSound] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSounds();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedSound(currentSound);
  }, [currentSound]);

  const fetchSounds = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await soundsApi.getAll();
      setSounds(data);
    } catch (err) {
      console.error('Error fetching sounds:', err);
      setError('Failed to load available sounds. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySound = async (fileName: string) => {
    try {
      setPlayingSound(fileName);
      
      if (fileName === 'default') {
        // Play default beep
        playFallbackBeep();
      } else {
        // Play custom sound
        const audio = new Audio(`/sounds/${fileName}`);
        audio.volume = 0.5;
        await audio.play();
      }
      
      // Reset playing state after a short delay
      setTimeout(() => setPlayingSound(null), 1000);
    } catch (err) {
      console.error('Error playing sound:', err);
      setPlayingSound(null);
    }
  };

  const playFallbackBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
      console.error('Error playing fallback beep:', err);
    }
  };

  const handleSelect = (fileName: string) => {
    setSelectedSound(fileName);
  };

  const handleSave = () => {
    onSoundSelect(selectedSound);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Select Notification Sound
          </DialogTitle>
          <DialogDescription>
            Choose a sound for your notifications
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-4">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading sounds...</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Default Beep Option */}
              <div
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedSound === 'default'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                }`}
                onClick={() => handleSelect('default')}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedSound === 'default'
                        ? 'border-primary bg-primary'
                        : 'border-input'
                    }`}
                  >
                    {selectedSound === 'default' && (
                      <Check className="w-3 h-3 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">Default Beep</div>
                    <div className="text-sm text-muted-foreground">Simple notification tone</div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant={playingSound === 'default' ? 'default' : 'outline'}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySound('default');
                  }}
                  className="gap-1"
                >
                  <Play className="w-4 h-4" />
                  Play
                </Button>
              </div>

              {/* Custom Sound Files */}
              {sounds.length === 0 ? (
                <div className="text-center py-8 px-4 border-2 border-dashed border-border rounded-lg">
                  <Volume2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-2">No custom sounds found</p>
                  <p className="text-sm text-muted-foreground">
                    Add .mp3, .wav, or .ogg files to:
                  </p>
                  <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                    Timekeeper.Web\public\sounds\
                  </code>
                </div>
              ) : (
                sounds.map((sound) => (
                  <div
                    key={sound.fileName}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedSound === sound.fileName
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-accent'
                    }`}
                    onClick={() => handleSelect(sound.fileName)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedSound === sound.fileName
                            ? 'border-primary bg-primary'
                            : 'border-input'
                        }`}
                      >
                        {selectedSound === sound.fileName && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{sound.displayName}</div>
                        <div className="text-sm text-muted-foreground">
                          {sound.extension.toUpperCase()} • {sound.sizeFormatted}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant={playingSound === sound.fileName ? 'default' : 'outline'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySound(sound.fileName);
                      }}
                      className="gap-1"
                    >
                      <Play className="w-4 h-4" />
                      Play
                    </Button>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading}>
            Save Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SoundSelectionModal;
