const {ipcRenderer} = require('electron')

class DataStore {
    get(path, callback) {
        ipcRenderer.invoke('get-pref', path).then((result) => {
            callback(result);
        });
    }

    set(path, val) {
        ipcRenderer.invoke('set-pref', path, val);
    }

    delete(path) {
        ipcRenderer.invoke('delete-pref', path);
    }

    has(path, callback) {
        ipcRenderer.invoke('has-pref', path).then((result) => {
            callback(result);
        });
    }
}

module.exports = DataStore
