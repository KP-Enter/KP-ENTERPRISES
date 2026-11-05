// KPE Billing — Windows desktop app for K.P. Enterprises.
// Opens the live billing web app full-screen. All data stays in Supabase, so every
// computer, phone and this app see the same bills.
const { app, BrowserWindow, shell, Menu, session, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_URL = 'https://kp-enter.github.io/KP-ENTERPRISES/';
const APP_ORIGIN = new URL(APP_URL).origin;
let win = null;
let retryTimer = null;

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.setAppUserModelId('in.kpenterprises.billing');

function createWindow() {
  win = new BrowserWindow({
    width: 1366, height: 820, minWidth: 900, minHeight: 600,
    fullscreen: true,
    backgroundColor: '#0d1a15',
    title: 'KPE Billing',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, spellcheck: true },
  });
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => win.show());
  win.loadURL(APP_URL);

  // Links to other sites (WhatsApp, Supabase emails…) open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file:')) return;
    if (new URL(url).origin !== APP_ORIGIN) { e.preventDefault(); shell.openExternal(url); }
  });

  // No internet -> friendly screen that keeps retrying
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = aborted (normal during navigation)
    win.loadFile(path.join(__dirname, 'offline.html'));
    clearInterval(retryTimer);
    retryTimer = setInterval(() => tryOnline(), 10000);
  });

  // Keyboard: F11 full screen, Ctrl+R reload, Ctrl+P print, Ctrl +/- zoom
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const k = input.key.toLowerCase();
    if (k === 'f11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (k === 'escape' && win.isFullScreen() && input.shift) { win.setFullScreen(false); e.preventDefault(); }
    else if ((input.control && k === 'r') || k === 'f5') { reload(); e.preventDefault(); }
    else if (input.control && k === 'p') { win.webContents.print(); e.preventDefault(); }
    else if (input.control && (k === '=' || k === '+')) { win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5); e.preventDefault(); }
    else if (input.control && k === '-') { win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5); e.preventDefault(); }
    else if (input.control && k === '0') { win.webContents.setZoomLevel(0); e.preventDefault(); }
  });

  // Right-click: cut / copy / paste
  win.webContents.on('context-menu', (_e, p) => {
    const items = [];
    if (p.isEditable) items.push({ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { type: 'separator' }, { role: 'selectAll' });
    else if (p.selectionText) items.push({ role: 'copy' });
    items.push({ type: 'separator' }, { label: 'Reload', click: reload },
      { label: win.isFullScreen() ? 'Exit full screen (F11)' : 'Full screen (F11)', click: () => win.setFullScreen(!win.isFullScreen()) });
    Menu.buildFromTemplate(items).popup({ window: win });
  });

  win.on('closed', () => { win = null; clearInterval(retryTimer); });
}

function reload() {
  if (!win) return;
  const cur = win.webContents.getURL();
  if (!cur || cur.startsWith('file:')) win.loadURL(APP_URL); else win.webContents.reloadIgnoringCache();
}
function tryOnline() {
  if (!win) return;
  if (!win.webContents.getURL().startsWith('file:')) { clearInterval(retryTimer); return; }
  win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  // Downloaded bill PDFs go straight to Downloads\KPE Bills and open automatically
  session.defaultSession.on('will-download', (_e, item) => {
    const dir = path.join(app.getPath('downloads'), 'KPE Bills');
    fs.mkdirSync(dir, { recursive: true });
    let file = path.join(dir, item.getFilename());
    const { name, ext } = path.parse(file);
    for (let n = 2; fs.existsSync(file); n++) file = path.join(dir, `${name} (${n})${ext}`);
    item.setSavePath(file);
    item.once('done', (_ev, state) => {
      if (state !== 'completed') { dialog.showErrorBox('Download failed', 'The PDF could not be saved. Please try again.'); return; }
      if (Notification.isSupported()) {
        const n = new Notification({ title: 'Bill saved', body: `${path.basename(file)} — saved in Downloads\\KPE Bills`, icon: path.join(__dirname, 'build', 'icon.ico') });
        n.on('click', () => shell.showItemInFolder(file));
        n.show();
      }
      shell.openPath(file);
    });
  });

  createWindow();
});

app.on('window-all-closed', () => app.quit());
