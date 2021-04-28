import {readFiles, markFilesChange} from './storage';
import event from '../../js/event';
import {EVENT, ROOT, FILE_TYPE, FILE_NONE} from '../../js/constant';
import {globalFileAttr, JXFile, JXDir} from './file';
import {initUnsaveEvent} from './file-save-status';
import {formatEditorByFileId} from '../js/editor-pool';
import {autoFormat} from '../../js/status';

export let files = null;

export let idFiles = {};
export function getCurrentFile () {
    return idFiles[globalFileAttr.openedId];
}
window.idFiles = idFiles;
export function clearFiles () {
    files.splice(0, files.length);
    idFiles = {};
}

export function writeIDFiles (id, item) {
    idFiles[id] = item;
}

export const FILE_HEIGHT = 30;


export function initFileSystem () {
    if (!files) {
        files = readFiles();
        switchOpenFile(globalFileAttr.openedId, FILE_NONE);
        initUnsaveEvent();
    }

    window.files = files;
    return files;
}

export function supportUploadDir () {
    return typeof document.createElement('input').webkitdirectory === 'boolean';
}

export function switchOpenFile (newId, oldId) {
    console.log(newId, oldId);
    // if (isValidId(oldId)) {
    //     event.emit(EVENT.USE_CODE, (code) => {
    //         idFiles[oldId].unsavedContent = code;
    //         // console.log('oldId', code);
    //         markFilesChange();
    //     });
    // }
    
    if (isValidId(newId)) {
        // const file = idFiles[newId];
        // event.emit(EVENT.SET_CODE, file.unsave ? file.unsavedContent : file.content);
        event.emit(EVENT.ON_FILE_OPEN, idFiles[newId]);
        // console.log('newId', file.content);
    }
}

function isValidId (id) {
    return (typeof id === 'number' && id !== FILE_NONE);
}

export function saveFile (id) {
    const save = () => {
        console.log(id);
        const file = idFiles[id];
        file.unsave = false;
        console.log('file.content', file.content, file.unsavedContent);
        file.content = file.unsavedContent;
        file.unsavedContent = '';
        markFilesChange();
    };
    if (autoFormat.get()) {
        formatEditorByFileId(id, () => {
            save();
        });
    } else {
        save();
    }
}
export function unsaveFile (id, code) {
    const file = idFiles[id];
    file.unsave = true;
    // console.log('file.unsavedContent', code);
    file.unsavedContent = code;
}
export function createNewFile (name = '', parentId = getCurrentParentId()) {
    createBase(JXFile, name, parentId);
}
export function createNewDir (name = '', parentId = getCurrentParentId()) {
    createBase(JXDir, name, parentId);
}
function createBase (JXClass, name, parentId) {
    const children = getParentChildren(parentId);
    const file = new JXClass({
        parentId,
        name,
        path: getParentPath(parentId)
    });
    if (file.type === FILE_TYPE.DIR) {
        children.unshift(file);
    } else {
        for (let i = 0; i < children.length; i++) {
            if (children[i].type === FILE_TYPE.FILE) {
                children.splice(i, 0, file);
                return;
            }
        }
        children.push(file);
    }
}
window.createNewFile = createNewFile;
window.createNewDir = createNewDir;

function getCurrentParentId () {
    const cid = globalFileAttr.contentId;
    if (cid === FILE_NONE || typeof cid !== 'number' ) {
        return ROOT;
    }
    const file = idFiles[cid];
    if (file.type === FILE_TYPE.DIR) {
        file.open();
        return file.id;
    }
    return file.parentId;
}

function getParentPath (parentId) {
    return parentId === ROOT ? '' : idFiles[parentId].path;
}

export function getParentChildren (parentId) {
    if (parentId === ROOT) {return files;}
    if (idFiles[parentId].type === FILE_TYPE.FILE) {
        return getParentChildren(idFiles[parentId].parentId);
    }
    return idFiles[parentId].children;
}

export function openAllFolder () {
    folderCommon('open');
}

export function closeAllFolder () {
    folderCommon('close');
}

function folderCommon (func) {
    for (const k in idFiles) {
        const file = idFiles[k];
        if (file.type === FILE_TYPE.DIR) {
            file[func]();
        }
    }
    markFilesChange();
}

export function sortFiles (parentId = ROOT) {
    const children = getParentChildren(parentId);
    children.sort((a, b) => {
        if (a.type === FILE_TYPE.DIR && b.type === FILE_TYPE.FILE) {
            return FILE_NONE;
        }
        if (a.type === FILE_TYPE.FILE && b.type === FILE_TYPE.DIR) {
            return 1;
        }
        let index = 0;
        const num = () => {
            return a.name.charCodeAt(index) - b.name.charCodeAt(index);
        };
        let d = num();
        while (d === 0) {
            index ++;
            if (index === a.name.length) {
                return FILE_NONE;
            }
            if (index === b.name.length) {
                return 1;
            }
            d = num();
        }
        return d;
    });
}

export function copyFile (id = globalFileAttr.menuFileId) {
    checkLastCutFile();
    globalFileAttr.copyFileId = id;
    globalFileAttr.cutFileId = FILE_NONE;
    event.emit(EVENT.PASTE_FILE_CHANGE, true);
}

export function cutFile (id = globalFileAttr.menuFileId) {
    // console.log('cutFile', id, globalFileAttr.menuFileId);
    checkLastCutFile();
    globalFileAttr.copyFileId = FILE_NONE;
    globalFileAttr.cutFileId = id;
    event.emit(EVENT.PASTE_FILE_CHANGE, true);

    idFiles[id].cut();
}

function checkLastCutFile () {
    if (globalFileAttr.cutFileId !== FILE_NONE) {
        idFiles[globalFileAttr.cutFileId].cutEnd();
    }
}

export function pasteFile (id = globalFileAttr.menuFileId) {
    const parentId = id === FILE_NONE ? ROOT : id;
    if (globalFileAttr.copyFileId === FILE_NONE && globalFileAttr.cutFileId === FILE_NONE) {
        return;
    }
    let isCopy, cid;
    if (globalFileAttr.copyFileId !== FILE_NONE) {
        cid = globalFileAttr.copyFileId;
        isCopy = true;
    } else {
        cid = globalFileAttr.cutFileId;
        isCopy = false;
    }
    const file = idFiles[cid];
    
    if (isCopy) {
        file.copyTo(parentId);
    } else {
        file.cutTo(parentId);
        idFiles[globalFileAttr.cutFileId].cutEnd();
    }
    // 打开目标文件夹
    if (parentId !== ROOT && idFiles[parentId].type === FILE_TYPE.DIR) {
        idFiles[parentId].open();
    }
    globalFileAttr.copyFileId = FILE_NONE;
    globalFileAttr.cutFileId = FILE_NONE;
    event.emit(EVENT.PASTE_FILE_CHANGE, false);
}

window.sortFiles = sortFiles;