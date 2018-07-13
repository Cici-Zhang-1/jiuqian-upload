if (require('electron-squirrel-startup')) return;
// Modules to control application life and create native browser window
const electron = require('electron')
const {app, BrowserWindow, ipcMain, Tray, session, Notification} = electron

// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require('child_process');
  const path = require('path');

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {}

    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      app.quit();
      return true;
  }
};


const {host} = require('./env.js')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let tray
let configs = {
  sourceFolder: '',
  desFolder: 'd:\\',
  name: '',
  password: ''
}
const RETURN_OK = 0
const RETURN_ERROR = 1

function createWindow () {
  let chokidar = require('chokidar');
  let watcher
  const fs = require('fs')
  const path = require('path')
  /**
   * 监听SourceFolder
   * @param  {[type]} arg [description]
   * @return {[type]}     [description]
   */
  function watchSource (arg) {
    watcher = chokidar.watch(arg, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    }).on('add', (fileName) => {
      fs.stat(fileName, (err, stats) => {
        if (stats.isFile()) {
          readSawFile(fileName).then( (res) => {
            contents.send('upload', { data: {mat: res, batch_num: path.basename(fileName).replace(path.extname(fileName), '')}, fileName: fileName })
          }).catch(error => {
            let n = new Notification({
              title: '文件读取错误!',
              body: error
            })
            n.show()
          })
        } else {
          let n = new Notification({
            title: '文件读取错误!',
            body: fileName + '不是文件'
          })
          n.show()
        }
      })
    }).on('error', (fileName) => {

    })
  }
  getConfigs().then((res) => {
    configs = res
  })
  const { x, y, width, height } = electron.screen.getPrimaryDisplay().workArea
  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: "九千定制U",
    icon: "upload.ico",
    autoHideMenuBar: true,
    width: 500,
    height: 180,
    x: width - 500,
    y: height -  300
  })

  // and load the index.html of the app.
  // mainWindow.loadURL('http://localhost:8080')
  mainWindow.loadFile('index.html')

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null
  })
  let contents = mainWindow.webContents
  let flag = true
  contents.on('did-finish-load', (event) => {
    if (flag) {
      session.defaultSession.cookies.get({url: host, name: 'uid'}, (error, cookies) => {
        if (cookies.length == 0) {
          contents.loadFile('signin.html')
          flag = false
        } else {
          watcher && watcher.close()
          configs['sourceFolder'] != '' && watchSource(configs['sourceFolder'])
        }
      })
    } else {
      flag = true
    }
  })

  ipcMain.on('source-folder', (event, arg) => { // 监听Source Folder事件
    watcher && watcher.close()
    if (arg != '') {
      watchSource(arg)
    }
    configs['sourceFolder'] = arg
    setConfigs(configs)
    event.returnValue = RETURN_OK
  })
  ipcMain.on('des-folder', (event, arg) => { // 监听Des Folder事件
    configs['desFolder'] = arg
    setConfigs(configs)
    event.returnValue = RETURN_OK
  })
  ipcMain.on('remove-saw-file', (event, arg) => {
    moveSawFile(arg)
  })
  ipcMain.on('configs', (event, arg) => { // 监听获取configs事件
    event.sender.send('configs-reply', { name: arg, value: configs[arg] || ''})
  })
  ipcMain.on('set-configs', (event, arg) => { // 监听 Set Configs事件
    configs[arg.name] = arg.value
    setConfigs(configs)
    event.returnValue = 'received'
  })
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)
// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
/**
 * 移动SaFile
 * @param  {[type]} fileName [description]
 * @return {[type]}          [description]
 */
let moveSawFile = function (fileName) {
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  fs.stat(configs['desFolder'], (err, stats) => {
    if (stats.isDirectory()) {
      fs.rename(fileName, configs['desFolder'] + '\\' + path.basename(fileName), (res) => {})
    } else {
      let n = new Notification({
        title: '目标文件夹不存在!',
        body: error
      })
      n.show()
    }
  })
}

let readSawFile = function (fileName) {
  // const readline = require('readline')
  const iconv = require('iconv-lite')
  const fs = require('fs')
  const os = require('os')
  const board = []
  var res = fs.createReadStream(fileName)

  var chunks = []
  var size = 0
  res.on('data', function(chunk) {
      chunks.push(chunk)
      size += chunk.length
  })
  return new Promise(function (resolve, reject) {
    res.on('end',function() {
      let buf = Buffer.concat(chunks,size)
      let board = iconv.decode(buf, 'gbk')
      board = board.split('\r\n').filter(__ => {
        return __.match(/^MAT2.*$/)
      }).map(__ => {
        return __.replace(/,/g, '____')
      })
      if (board.length == 0) {
        reject(new Error(fileName + '中没有可用数据'))
      } else {
        resolve(board)
      }
    })
  })
}

let setConfigs = function (configs) {
  const fs = require('fs');
  fs.readFile(__dirname + '/configs.json',function(err,data){
    if(err) {
      mainWindow.webContents.executeJavaScript('alert("' + err + '")')
    } else {
      var str = JSON.stringify(configs);
      fs.writeFile(__dirname + '/configs.json', str, function(err){
        if(err){
          mainWindow.webContents.executeJavaScript('alert("' + err + '")')
        }
      })
    }
  })
}
let getConfigs = function (name="") {
  const fs = require('fs')
  return new Promise(function (resolve, reject) {
    fs.readFile( __dirname + '/configs.json',function(err,data){
      if (err) {
        mainWindow.webContents.executeJavaScript('alert("' + err + '")')
        reject(new Error(err))
      } else {
        var configs = data.toString()
        configs = JSON.parse(configs)
        resolve(configs)
      }
    })
  })
}
