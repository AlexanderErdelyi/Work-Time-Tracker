# Notification Sounds

This folder contains notification sound files for Timekeeper.

## How to Add Your Own Sounds

1. Copy your sound files (.mp3, .wav, or .ogg) into this folder
2. Rename them to match the options in Settings:
   - `notification1.mp3`
   - `notification2.mp3`
   - `notification3.mp3`

## Supported Formats

- MP3 (.mp3)
- WAV (.wav)
- OGG (.ogg)

## Finding Good Notification Sounds

**Free Sound Libraries:**
- **Notification Sounds**: https://notificationsounds.com/
- **FreeSounds**: https://freesound.org/search/?q=notification
- **Zapsplat**: https://www.zapsplat.com/sound-effect-category/notification-sounds/

**Using Windows Sounds:**
Windows notification sounds are located in `C:\Windows\Media\`. You can copy any of these:
- `Windows Notify System Generic.wav`
- `Windows Notify Calendar.wav`
- `Windows Notify Email.wav`
- `Windows Notify Messaging.wav`

## Example Command (PowerShell)

```powershell
# Copy a Windows notification sound
Copy-Item "C:\Windows\Media\Windows Notify System Generic.wav" "notification1.mp3"
```

## Current Files

Place your sound files here and they will appear in Settings > Notifications > Notification Sound
