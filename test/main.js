'use strict';

const {app, BrowserWindow, globalShortcut} = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({width: 1366, height: 570});
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  mainWindow.setMenu(null);
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
  globalShortcut.register('F5', () => {
    BrowserWindow.getFocusedWindow().webContents.reloadIgnoringCache();
  });
  globalShortcut.register('F12', () => {
    mainWindow.toggleDevTools();
  });
}

app.on('ready', createWindow);
app.on('window-all-closed', function() {
  app.quit();
});
app.on('activate', function() {
  if (mainWindow === null) {
    createWindow();
  }
});
