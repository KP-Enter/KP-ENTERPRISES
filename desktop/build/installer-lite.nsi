; KPE Billing (Lite) — tiny Windows installer for K.P. Enterprises.
; Uses Microsoft Edge (built into Windows 10/11) to open the billing app in its own full-screen window.
Unicode true
SetCompressor /SOLID lzma

!define APPNAME "KPE Billing"
!define COMPANY "K.P. Enterprises"
!define VERSION "1.1.0"
!define URL "https://kp-enter.github.io/KP-ENTERPRISES/"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\KPEBilling"

Name "${APPNAME}"
OutFile "KPE-Billing-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"
RequestExecutionLevel user
BrandingText "${COMPANY} · Solar Energy | Sustainability"
VIProductVersion "1.1.0.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${COMPANY}"
VIAddVersionKey "FileDescription" "${APPNAME} Setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "${COMPANY}"

!include "MUI2.nsh"
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "installer-header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "installer-side.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "installer-side.bmp"
!define MUI_WELCOMEPAGE_TITLE "Welcome to KPE Billing"
!define MUI_WELCOMEPAGE_TEXT "This installs the K.P. Enterprises billing app on this computer.$\r$\n$\r$\nIt opens full screen and connects to the same bills, customers and products as every other device. Just log in with your email and password.$\r$\n$\r$\nClick Install to continue."
!define MUI_FINISHPAGE_TITLE "KPE Billing is ready"
!define MUI_FINISHPAGE_TEXT "A KPE Billing shortcut is on your desktop and in the Start menu.$\r$\n$\r$\nTip: press F11 to leave or return to full screen."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "Open KPE Billing now"
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchApp

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Var BROWSER
Var ARGS

; Find Edge (preferred), else Chrome
Function FindBrowser
  StrCpy $BROWSER ""
  IfFileExists "$PROGRAMFILES32\Microsoft\Edge\Application\msedge.exe" 0 +3
    StrCpy $BROWSER "$PROGRAMFILES32\Microsoft\Edge\Application\msedge.exe"
    Return
  IfFileExists "$PROGRAMFILES64\Microsoft\Edge\Application\msedge.exe" 0 +3
    StrCpy $BROWSER "$PROGRAMFILES64\Microsoft\Edge\Application\msedge.exe"
    Return
  IfFileExists "$LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe" 0 +3
    StrCpy $BROWSER "$LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
    Return
  IfFileExists "$PROGRAMFILES64\Google\Chrome\Application\chrome.exe" 0 +3
    StrCpy $BROWSER "$PROGRAMFILES64\Google\Chrome\Application\chrome.exe"
    Return
  IfFileExists "$PROGRAMFILES32\Google\Chrome\Application\chrome.exe" 0 +3
    StrCpy $BROWSER "$PROGRAMFILES32\Google\Chrome\Application\chrome.exe"
    Return
  IfFileExists "$LOCALAPPDATA\Google\Chrome\Application\chrome.exe" 0 +2
    StrCpy $BROWSER "$LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
FunctionEnd

Function LaunchApp
  StrCmp $BROWSER "" 0 +3
    ExecShell "open" "${URL}"
    Return
  Exec '"$BROWSER" $ARGS'
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  File "icon.ico"
  Call FindBrowser
  ; own profile folder -> its own window, stays logged in, honours full screen
  StrCpy $ARGS '--app=${URL} --start-fullscreen --user-data-dir="$LOCALAPPDATA\${APPNAME}\Profile" --no-first-run --no-default-browser-check --disable-features=Translate'

  StrCmp $BROWSER "" nobrowser
    CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$BROWSER" "$ARGS" "$INSTDIR\icon.ico" 0 SW_SHOWMAXIMIZED "" "K.P. Enterprises billing"
    CreateDirectory "$SMPROGRAMS\${APPNAME}"
    CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$BROWSER" "$ARGS" "$INSTDIR\icon.ico" 0 SW_SHOWMAXIMIZED "" "K.P. Enterprises billing"
    Goto shortcutsdone
  nobrowser:
    WriteINIStr "$INSTDIR\${APPNAME}.url" "InternetShortcut" "URL" "${URL}"
    WriteINIStr "$INSTDIR\${APPNAME}.url" "InternetShortcut" "IconFile" "$INSTDIR\icon.ico"
    WriteINIStr "$INSTDIR\${APPNAME}.url" "InternetShortcut" "IconIndex" "0"
    CopyFiles /SILENT "$INSTDIR\${APPNAME}.url" "$DESKTOP\${APPNAME}.url"
    CreateDirectory "$SMPROGRAMS\${APPNAME}"
    CopyFiles /SILENT "$INSTDIR\${APPNAME}.url" "$SMPROGRAMS\${APPNAME}\${APPNAME}.url"
  shortcutsdone:
  CreateShortcut "$SMPROGRAMS\${APPNAME}\Uninstall ${APPNAME}.lnk" "$INSTDIR\Uninstall ${APPNAME}.exe"

  WriteUninstaller "$INSTDIR\Uninstall ${APPNAME}.exe"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTKEY}" "Publisher" "${COMPANY}"
  WriteRegStr HKCU "${UNINSTKEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "${UNINSTKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTKEY}" "UninstallString" '"$INSTDIR\Uninstall ${APPNAME}.exe"'
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNINSTKEY}" "EstimatedSize" 100
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\${APPNAME}.lnk"
  Delete "$DESKTOP\${APPNAME}.url"
  RMDir /r "$SMPROGRAMS\${APPNAME}"
  RMDir /r "$INSTDIR"
  RMDir /r "$LOCALAPPDATA\${APPNAME}"
  DeleteRegKey HKCU "${UNINSTKEY}"
SectionEnd
