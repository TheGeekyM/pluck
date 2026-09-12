const { app, BrowserWindow, dialog, shell, Menu } = require('electron');
const server = require('./server');

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'editMenu' }, { role: 'viewMenu' }]));
  const ctx = Menu.buildFromTemplate([{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { type: 'separator' }, { role: 'selectAll' }]);
  server.pickFolder = async () => (await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })).filePaths[0];
  const srv = server.listen(0, '127.0.0.1', () => {
    const win = new BrowserWindow({
      width: 960, height: 680, minWidth: 640, minHeight: 400,
      backgroundColor: '#0f1115', autoHideMenuBar: true, title: 'Pluck', icon: require('path').join(__dirname, 'build/icon.png'),
    });
    win.loadURL(`http://127.0.0.1:${srv.address().port}`);
    win.webContents.on('context-menu', () => ctx.popup());
    // ponytail: match physical key (KeyV) not the layout's char, so Ctrl+V works on Arabic/any layout
    const keys = { KeyV: 'paste', KeyC: 'copy', KeyX: 'cut', KeyA: 'selectAll' };
    win.webContents.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown' && (input.control || input.meta) && keys[input.code]) { e.preventDefault(); win.webContents[keys[input.code]](); }
    });
    win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  });
});
app.on('window-all-closed', () => app.quit());
