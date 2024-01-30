// src/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("vanella", {
  minimize() {
    import_electron.ipcRenderer.send("minimize");
  },
  maximize() {
    import_electron.ipcRenderer.send("maximize");
  },
  unmaximize() {
    import_electron.ipcRenderer.send("unmaximize");
  },
  close() {
    import_electron.ipcRenderer.send("close");
  },
  toClose() {
    import_electron.ipcRenderer.send("to-close");
  },
  async openFile() {
    try {
      import_electron.ipcRenderer.send("open-file-dialog");
    } catch (error) {
      console.error("Error sending open-file-dialog:", error);
    }
  },
  async saveFile(contentToSave, filePath, thenWillBeNew = false) {
    if (!filePath) {
      try {
        import_electron.ipcRenderer.send("save-file-dialog", contentToSave);
      } catch (error) {
        console.error("Error sending save-file-dialog:", error);
      }
    } else {
      import_electron.ipcRenderer.send("save-file", {
        filePath,
        contentToSave,
        thenWillBeNew
      });
    }
  },
  async saveAsFile(contentToSave) {
    try {
      import_electron.ipcRenderer.send("save-as-file-dialog", contentToSave);
    } catch (error) {
      console.error("Error sending save-as-file-dialog:", error);
    }
  },
  bindFileManipulation({
    "to-check-if-be-saved": callbackToCheckIfBeSaved,
    "file-content": callbackOfFileContent,
    "file-saved": callbackOfFileSaved,
    "file-save-error": callbackOfFileSaveError
    // TODO...
  }) {
    import_electron.ipcRenderer.on("to-check-if-be-saved", (event) => {
      callbackToCheckIfBeSaved();
    });
    import_electron.ipcRenderer.on("open-file-dialog-reply", (event, result) => {
      if (!result.error && !result.canceled) {
        const filePath = result.filePaths[0];
        import_electron.ipcRenderer.send("open-file", filePath);
      } else {
        console.error("Error opening file dialog:", result.error);
      }
    });
    import_electron.ipcRenderer.on("file-content", (event, filePath, dirPath, fileContent) => {
      callbackOfFileContent(filePath, dirPath, fileContent);
    });
    import_electron.ipcRenderer.on("file-saved", (event, filePath, dirPath) => {
      callbackOfFileSaved(filePath, dirPath);
    });
    import_electron.ipcRenderer.on("save-file-dialog-reply", (event, result) => {
      if (!result.error && !result.canceled) {
        callbackOfFileSaved(result.filePath, result.dirPath);
      } else if (result.canceled) {
        console.info("File save operation canceled by the user.");
      } else {
        callbackOfFileSaveError(result.error);
      }
    });
    import_electron.ipcRenderer.on("save-as-file-dialog-reply", (event, result) => {
      if (!result.error && !result.canceled) {
        callbackOfFileSaved(result.filePath);
      } else if (result.canceled) {
        console.info("File save as operation canceled by the user.");
      } else {
        callbackOfFileSaveError(result.error);
      }
    });
  }
});
//# sourceMappingURL=preload.js.map
