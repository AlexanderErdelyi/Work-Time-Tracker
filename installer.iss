; Timekeeper Installer Script for Inno Setup
; This creates a Windows installer with install/uninstall capability

#define MyAppName "Timekeeper"
#define MyAppVersion GetEnv("APP_VERSION")
#define MyAppPublisher "Alexander Erdelyi"
#define MyAppURL "https://github.com/AlexanderErdelyi/Work-Time-Tracker"
#define MyAppExeName "Timekeeper.TrayApp.exe"
#define MyAppApiExeName "Timekeeper.Api.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application. Do not use the same AppId value in installers for other applications.
AppId={{8F9E3A2D-1B4C-4E5F-9A8B-3C2D1E0F4A5B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; LicenseFile=LICENSE  ; Uncomment if LICENSE file exists
OutputDir=Release
OutputBaseFilename=Timekeeper-v{#MyAppVersion}-win-x64-installer
; SetupIconFile=installer-icon.ico  ; Uncomment if icon file exists
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "Release\Timekeeper-v{#MyAppVersion}-win-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: files; Name: "{app}\timekeeper.db"
Type: files; Name: "{app}\timekeeper.db-shm"
Type: files; Name: "{app}\timekeeper.db-wal"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
  if MsgBox('This will install Timekeeper Time Tracker on your computer.' + #13#10 + #13#10 +
            'No .NET Runtime installation is required - everything is included!' + #13#10 + #13#10 +
            'Continue with installation?', 
            mbConfirmation, MB_YESNO) = IDNO then
    Result := False;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DbPath: String;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    DbPath := ExpandConstant('{app}\timekeeper.db');
    if FileExists(DbPath) then
    begin
      if MsgBox('Do you want to keep your time tracking data (timekeeper.db)?' + #13#10 + #13#10 +
                'Select YES to keep your data for future use.' + #13#10 +
                'Select NO to permanently delete all data.', 
                mbConfirmation, MB_YESNO or MB_DEFBUTTON1) = IDNO then
      begin
        DeleteFile(DbPath);
        DeleteFile(ExpandConstant('{app}\timekeeper.db-shm'));
        DeleteFile(ExpandConstant('{app}\timekeeper.db-wal'));
      end;
    end;
  end;
end;
