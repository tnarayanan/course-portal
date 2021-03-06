const {app, ipcMain, BrowserWindow, shell, TouchBar, dialog} = require('electron')
const {TouchBarButton} = TouchBar
const Store = require('electron-store');

const store = new Store();

function saveWindowBounds(win) {
    let {x, y, width, height} = win.getBounds();
    store.set('windowBounds', {x, y, width, height});
}

function createTouchBar() {
    const meetingLink = store.get('courses.' + store.get('lastSelectedCourse') + '.meeting_link');
    const discMeetingLink = store.get('courses.' + store.get('lastSelectedCourse') + '.disc_meeting_link');

    let buttons = []

    if (meetingLink !== "") {
        const meetingButton = new TouchBarButton({
            label: 'Join Lecture',
            backgroundColor: '#327af2',
            click: () => {
                shell.openExternal(meetingLink)
            }
        });
        buttons.push(meetingButton);
    }

    if (discMeetingLink !== "") {
        const discMeetingButton = new TouchBarButton({
            label: 'Join Discussion',
            backgroundColor: '#327af2',
            click: () => {
                shell.openExternal(discMeetingLink)
            }
        });
        buttons.push(discMeetingButton);
    }


    const touchBar = new TouchBar({
        items: buttons
    });
    return touchBar;
}

function createWindow() {
    if (!store.has('windowBounds')) {
        store.set('windowBounds', {
            x: -1,
            y: -1,
            width: 1280,
            height: 800,
        });
    }
    let {x, y, width, height} = store.get('windowBounds');

    var options = {
        width: width,
        height: height,
        minWidth: 886,
        webPreferences: {
            nodeIntegration: true
        },
        titleBarStyle: "hidden"
    }

    if (x !== -1) options.x = x;
    if (y !== -1) options.y = y;

    const win = new BrowserWindow(options);

    win.on('resize', () => {
        saveWindowBounds(win);
    });

    win.on('move', () => {
        saveWindowBounds(win)
    })


    // store.set('lastSelectedCourse', 'cs106b')
    if (!store.has('courses')) {
        store.set('courses', {})
    }
    win.loadFile('index.html');
    win.setTouchBar(createTouchBar())

    ipcMain.handle('get-pref', async (event, path) => {
        return store.get(path);
    });

    ipcMain.handle('set-pref', async (event, path, val) => {
        store.set(path, val);
    });

    ipcMain.handle('delete-pref', async (event, path) => {
        store.delete(path);
    });

    ipcMain.handle('has-pref', async (event, path) => {
        return store.has(path);
    })

    ipcMain.handle('open-folder-picker', async (event) => {
        return dialog.showOpenDialogSync(win, {
            properties: ['openDirectory', 'createDirectory', 'promptToCreate']
        });
    });

    ipcMain.handle('get-app-data-path', async (event) => {
        return app.getPath('userData');
    });

    ipcMain.handle('update-touch-bar', async (event) => {
        win.setTouchBar(createTouchBar());
    });

    ipcMain.handle('clear-touch-bar', async (event) => {
        win.setTouchBar();
    });

    // ipcMain.on('set-pref', (event, path, val) => {
    //     store.set(path, val);
    //     console.log('db: ' + path + " set as " + val);
    // })

}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    // if(process.platform !== 'darwin') {
    app.quit();
    // }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
})
