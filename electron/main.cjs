const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, '../public/icons/icon.png'),
    title: '幻影引擎 - MirroVerse Engine',
    show: false
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Try multiple possible paths for the dist folder
    const possiblePaths = [
      path.join(__dirname, '../dist/index.html'),
      path.join(process.resourcesPath, 'dist/index.html'),
      path.join(__dirname, '../../dist/index.html'),
      path.join(process.resourcesPath, '../dist/index.html'),
      path.join(app.getAppPath(), 'dist/index.html')
    ];
    
    let loaded = false;
    for (const filePath of possiblePaths) {
      try {
        if (require('fs').existsSync(filePath)) {
          console.log(`Loading from: ${filePath}`);
          mainWindow.loadFile(filePath);
          loaded = true;
          break;
        } else {
          console.log(`Path not found: ${filePath}`);
        }
      } catch (error) {
        console.log(`Failed to load from ${filePath}:`, error);
      }
    }
    
    if (!loaded) {
      console.error('Could not find index.html in any expected location');
      console.log('Available paths checked:', possiblePaths);
      mainWindow.loadURL('data:text/html,<h1>Error: Could not load application</h1>');
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    app.quit();
  });

  return mainWindow;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});
