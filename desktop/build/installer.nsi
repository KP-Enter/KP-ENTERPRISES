; KPE Billing — Windows installer for K.P. Enterprises
Unicode true
SetCompressor /SOLID lzma
SetCompressorDictSize 64

!define APPNAME "KPE Billing"
!define COMPANY "K.P. Enterprises"
!define VERSION "1.0.0"
!define EXENAME "KPE Billing.exe"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\KPEBilling"
!define SRC "..\dist\win-unpacked"

Name "${APPNAME}"
OutFile "..\dist\KPE-Billing-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\${APPNAME}"
InstallDirRegKey HKCU "${UNINSTKEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "${COMPANY} · Solar Energy | Sustainability"
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "CompanyName" "${COMPANY}"
VIAddVersionKey "FileDescription" "${APPNAME} Setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "${COMPANY}"

!include "MUI2.nsh"
!include "FileFunc.nsh"
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "installer-header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "installer-side.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "installer-side.bmp"
!define MUI_WELCOMEPAGE_TITLE "Welcome to KPE Billing"
!define MUI_WELCOMEPAGE_TEXT "This will install the K.P. Enterprises billing app on this computer.$\r$\n$\r$\nIt opens full screen and connects to the same bills, customers and products as every other device — just log in with your email and password.$\r$\n$\r$\nClick Next to continue."
!define MUI_FINISHPAGE_TITLE "KPE Billing is ready"
!define MUI_FINISHPAGE_TEXT "A KPE Billing shortcut has been added to your desktop and Start menu.$\r$\n$\r$\nTip: press F11 to leave or return to full screen."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXENAME}"
!define MUI_FINISHPAGE_RUN_TEXT "Open KPE Billing now"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ; close a running copy so files can be replaced on update
  nsExec::Exec 'taskkill /F /IM "${EXENAME}"'
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR\resources"
  File /r "${SRC}\*.*"
  File "icon.ico"

  CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${EXENAME}" "" "$INSTDIR\icon.ico" 0
  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\${EXENAME}" "" "$INSTDIR\icon.ico" 0
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
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "${UNINSTKEY}" "EstimatedSize" "$0"
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM "${EXENAME}"'
  Delete "$DESKTOP\${APPNAME}.lnk"
  RMDir /r "$SMPROGRAMS\${APPNAME}"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNINSTKEY}"
SectionEnd
