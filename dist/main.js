var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main.ts
var import_electron = require("electron");
var import_path = require("path");
var fs2 = __toESM(require("fs"));

// src/html-generator.ts
var generateHTML = (title, input, withStyle = false) => {
  const lines = input.split("\n");
  const htmlHeader = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${withStyle ? insertStyle() : ""}
  </head>
  <body>
  <div class="container">`;
  const htmlFooter = "\n</div>\n</body>\n</html>\n";
  const formattedHTML = `${htmlHeader}
${lines.join("\n")}${htmlFooter}
`;
  return formattedHTML;
};
var insertStyle = () => String.raw`
  <style>

    body {
        background-color: black;
        display: flex;
        justify-content: center;
    }
    .container {
        color: white;
        width: 75%;
        filter: revert(0.862745) hue-rotate(180deg);
    }
    
    table{width:100%;border-collapse:collapse;border:3px solid #fff}table th,table td{border:1px solid #fff;padding:10px;vertical-align:middle;background-color:transparent;color:#fff}table th{background-color:#33333385;color:#fff}table thead{border-collapse:collapse;border-spacing:0}table thead td{height:0}table thead th{display:none;height:0;border:0}table thead th:first-child{border-left:0}table thead th:last-child{border-right:0}table thead th:not(:first-child):not(:last-child){border-left:0;border-right:0}table thead th:first-child:nth-last-child(2),table thead th:first-child:nth-last-child(2)~th{border-bottom:3px solid}table tbody tr>*{border:1px solid #fff;padding:5px;background-color:transparent}table tbody tr table,table tbody tr ul,table tbody tr ol,table tbody tr blockquote,table tbody tr img,table tbody tr svg{width:100%;margin:0;padding:0}table tbody tr table{border:1px solid #fff;margin-top:5px;margin-bottom:5px}table tbody tr ul,table tbody tr ol{list-style:none;padding-left:10px;margin-top:5px;margin-bottom:5px}table tbody tr blockquote{border-left:4px solid #333;padding:10px;margin:5px 0}table tbody tr img,table tbody tr svg{max-width:100%;height:auto}pre{position:relative}pre code{display:block;position:relative;border-radius:4px;font-family:Consolas,Monaco,monospace;overflow-x:auto}pre .filename{position:absolute;top:0;left:0;background:#f0f0f0;padding:.2em .5em;font-size:.8em;color:#666;border-bottom-right-radius:.3em}pre .language{position:absolute;top:0;left:0;background:#e0e0e0;padding:.2em .5em;font-size:.8em;color:#333;border-bottom-right-radius:.3em}pre .file-name,pre .language-name{padding:4px 8px;margin-bottom:4px;display:inline-block}pre .file-name{background-color:#eef;color:#007acc;border-radius:4px}pre .language-name{background-color:#efe;color:#282;border-radius:4px}h1,h2,h3,h4,h5,h6{margin-top:15px;box-sizing:border-box;color:#dedede}h1:empty,h2:empty,h3:empty,h4:empty,h5:empty,h6:empty{display:none}h1{padding-top:20px;padding-bottom:10px;margin-bottom:10px;border-bottom-color:#cbcbcb;border-bottom-style:solid;border-bottom-width:1px;font-size:2.5rem}h2{padding-top:15px;padding-bottom:5px;margin-bottom:8px;border-bottom-color:#aaa;border-bottom-style:solid;border-bottom-width:1px;font-size:1.8rem}h3{padding-top:10px;padding-bottom:5px;font-size:1.4rem}h4{padding-top:8px;margin-bottom:0;font-size:1.2rem}h5{margin-bottom:0;font-size:1.1rem}h6{margin-bottom:0;font-size:1rem}.container>h1:first-child,.container>h2:first-child,.container>h3:first-child,.container>h4:first-child,.container>h5:first-child,.container>h6:first-child{margin-top:30px}p{text-indent:2em;margin-bottom:1.326em;white-space:break-spaces;word-wrap:break-word;word-break:break-all;line-height:2.7em}a{text-decoration:underline;color:#14e692}a:active,a:hover{color:#14cae6}a:active,a:hover{cursor:pointer}.dropcap{color:red;float:left;font-size:5rem;line-height:3.5rem;margin:0;padding:.5rem}.invisible{clip:rect(1px,1px,1px,1px);height:1px;overflow:hidden;position:absolute;top:auto;white-space:nowrap;width:1px;display:none}img{max-width:80%;max-height:80%;margin:auto;display:block}ul{list-style-type:none;padding-left:2em;margin:0}ul>li{position:relative;padding-left:1em;margin-bottom:.5em;line-height:1.5}ul>li:before{content:"\2022";position:absolute;left:-1em;color:#7d8a9f}ol{list-style-type:none;counter-reset:li;padding-left:2em;margin:0}ol>li{position:relative;padding-left:1em;margin-bottom:.5em;line-height:1.5}ol>li:before{content:counter(li) ". ";counter-increment:li;position:absolute;left:-2em;width:2em;text-align:right;color:#7d8a9f}blockquote{display:block;clear:both;font-size:1em;font-style:normal;line-height:1.8;text-indent:0;border:none;color:#c1d5b9;margin-block-start:1em;margin-block-end:1em;margin-inline-start:40px;margin-inline-end:40px;position:relative;padding-top:20px;padding-bottom:20px}blockquote:before{content:"\201c";left:0;top:0;transform:translateY(-100%) translate(-100%);color:#e0e0e0;font-size:4em;font-family:Arial,serif;line-height:1em;font-weight:700;position:absolute;margin-top:1em;margin-bottom:1em}blockquote:after{content:"\201d";right:0;bottom:0;transform:translateY(100%) translate(100%);color:#e0e0e0;font-size:4em;font-family:Arial,serif;line-height:1em;font-weight:700;position:absolute;margin-top:1em;margin-bottom:1em}ul[name=user-content-table-of-contents]{list-style-type:none;padding-left:2em;margin:0}ul[name=user-content-table-of-contents] p{text-indent:0;margin:0;padding:0}ul[name=user-content-table-of-contents]>li{position:relative;padding-left:1em;margin-bottom:.3em}ul[name=user-content-table-of-contents]>li:before{display:none}ul[name=user-content-table-of-contents]>li ul{list-style-type:none;padding-left:2em}ul[name=user-content-table-of-contents]>li ul>li{position:relative;padding-left:1em;margin-bottom:.3em}ul[name=user-content-table-of-contents]>li ul>li:before{display:none}ul[name=user-content-table-of-contents]>li ul>li ul{padding-left:4em}pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}.hljs{background:#272822;color:#ddd}.hljs-tag,.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-strong,.hljs-name{color:#f92672}.hljs-code{color:#66d9ef}.hljs-attribute,.hljs-symbol,.hljs-regexp,.hljs-link{color:#bf79db}.hljs-string,.hljs-bullet,.hljs-subst,.hljs-title,.hljs-section,.hljs-emphasis,.hljs-type,.hljs-built_in,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-addition,.hljs-variable,.hljs-template-tag,.hljs-template-variable{color:#a6e22e}.hljs-title.class_,.hljs-class .hljs-title{color:#fff}.hljs-comment,.hljs-quote,.hljs-deletion,.hljs-meta{color:#75715e}.hljs-keyword,.hljs-selector-tag,.hljs-literal,.hljs-doctag,.hljs-title,.hljs-section,.hljs-type,.hljs-selector-id{font-weight:700}
    
  </style>`;

// src/directory-tree.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
function isHidden(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.mode & 511) === 0;
}
var availableExt = [".md", ".markdown", ".txt"];
function isAvailableFile(filePath) {
  return availableExt.includes(path.extname(filePath).toLocaleLowerCase());
}
var generateDirectoryTree = (directoryPath, parentId = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const contents = fs.readdirSync(directoryPath);
      let fileCount = 0;
      const children = [];
      await contents.forEach(async (content, index) => {
        const fullPath = path.join(directoryPath, content);
        const stats = await fs.statSync(fullPath);
        const node = {
          id: index + 1,
          name: content,
          fullPath,
          parentId,
          fileCount: 0
        };
        if (!isHidden(fullPath) && !content.startsWith(".")) {
          if (stats.isDirectory()) {
            const subTree = await generateDirectoryTree(fullPath, node.id);
            node.children = subTree.children;
            node.fileCount = subTree.fileCount;
            children.push(node);
          } else if (isAvailableFile(content)) {
            node.fileCount = 1;
            fileCount++;
            children.push(node);
          }
        }
      });
      const sortedChildren = await children.sort((a, b) => {
        if (a.children && !b.children)
          return -1;
        if (!a.children && b.children)
          return 1;
        return a.name.localeCompare(b.name);
      });
      const tree = {
        id: parentId !== null ? parentId : 1,
        name: path.basename(directoryPath),
        parentId,
        fileCount,
        children: sortedChildren
      };
      resolve(tree);
    } catch (error) {
      reject(error);
    }
  });
};
var generateDirectoryTreeView = (childs) => {
  let html = "";
  childs.forEach((el) => {
    html += `<details>
<summary><span class="tree-item" title="${el.name}" data-id="${el.id}" ${el.fullPath ? `onclick="switchFile('${el.fullPath.replaceAll("\\", "\\\\")}')" ` : ""}>${el.name}</span></summary>`;
    if (el.children && el.children.length) {
      html += generateDirectoryTreeView(el.children);
    }
    html += `</details>`;
  });
  return html;
};
var generateCurrentDirectoryTree = async (filePath) => await generateDirectoryTree(path.dirname(filePath));
var generateTreeHTML = async (filePath) => await generateDirectoryTreeView((await generateCurrentDirectoryTree(filePath)).children);

// src/main.ts
var main = () => {
  onReady();
  appListens();
};
var onReady = () => {
  import_electron.app.whenReady().then(() => {
    const mainWindow = createWindow();
    mainWindowListens(mainWindow);
    import_electron.globalShortcut.register("CommandOrControl+-", () => {
    });
    import_electron.globalShortcut.register("CommandOrControl+Shift+=", () => {
    });
  });
};
var lastDirPath = "";
var toGenerateTreeView = (event, filePath) => {
  setTimeout(() => {
    if (!lastDirPath || !(0, import_path.dirname)(filePath).startsWith(lastDirPath)) {
      generateTreeHTML(filePath).then((data) => event.reply("generated-directory-tree-view", data)).then(() => lastDirPath = (0, import_path.dirname)(filePath));
    }
  }, 500);
};
var mainWindowListens = (mainWindow) => {
  mainWindow.webContents.on("did-finish-load", (event, args) => {
    mainWindow.webContents.setZoomFactor(1);
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1);
  });
  import_electron.ipcMain.on("minimize", () => mainWindow.minimize());
  import_electron.ipcMain.on("maximize", () => mainWindow.maximize());
  import_electron.ipcMain.on("unmaximize", () => mainWindow.unmaximize());
  import_electron.ipcMain.on("close", () => mainWindow.close());
  import_electron.ipcMain.on("to-close", (event) => event.reply("to-check-if-be-saved"));
  import_electron.ipcMain.on("open-file-dialog", async (event) => {
    try {
      const result = await import_electron.dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Markdown Files", extensions: ["md", "markdown"] }]
      });
      event.reply("open-file-dialog-reply", result);
    } catch (error) {
      console.error("Error opening file dialog:", error);
      event.reply("open-file-dialog-reply", { error: error.message });
    }
  });
  import_electron.ipcMain.on("open-file", async (event, filePath) => {
    try {
      toGenerateTreeView(event, filePath);
      const fileContent = await fs2.promises.readFile(filePath, "utf-8");
      event.reply("file-content", filePath, (0, import_path.dirname)(filePath), fileContent);
    } catch (error) {
      event.reply("file-error", error.message);
    }
  });
  import_electron.ipcMain.on("save-file-dialog", async (event, contentToSave) => {
    try {
      const result = await import_electron.dialog.showSaveDialog({
        properties: ["createDirectory"],
        filters: [{ name: "Markdown Files", extensions: ["md", "markdown"] }]
      });
      if (!result.canceled) {
        await fs2.promises.writeFile(result.filePath, contentToSave, "utf-8");
        event.reply("save-file-dialog-reply", { filePath: result.filePath });
        toGenerateTreeView(event, result.filePath);
      } else {
        event.reply("save-file-dialog-reply", { canceled: true });
      }
    } catch (error) {
      console.error("Error saving file:", error);
      event.reply("save-file-dialog-reply", { error: error.message });
    }
  });
  import_electron.ipcMain.on("save-file", async (event, { filePath, contentToSave }) => {
    try {
      await fs2.promises.writeFile(filePath, contentToSave, "utf-8");
      event.reply("file-saved", filePath, (0, import_path.dirname)(filePath));
    } catch (error) {
      console.error("Error saving file:", error);
      event.reply("file-save-error", { error: error.message });
    }
  });
  import_electron.ipcMain.on("save-as-file-dialog", async (event, contentToSave) => {
    try {
      const result = await import_electron.dialog.showSaveDialog({
        properties: ["createDirectory"],
        filters: [{ name: "Markdown Files", extensions: ["md", "markdown"] }]
      });
      if (!result.canceled) {
        await fs2.promises.writeFile(result.filePath, contentToSave, "utf-8");
        event.reply("save-as-file-dialog-reply", { filePath: result.filePath });
        toGenerateTreeView(event, result.filePath);
      } else {
        event.reply("save-as-file-dialog-reply", { canceled: true });
      }
    } catch (error) {
      console.error("Error saving file as:", error);
      event.reply("save-as-file-dialog-reply", { error: error.message });
    }
  });
  import_electron.ipcMain.on("to-generate-html", async (event, { filePath, contentToExport }) => {
    const baseName = (0, import_path.basename)(filePath, (0, import_path.extname)(filePath));
    try {
      await fs2.promises.writeFile(
        (0, import_path.join)((0, import_path.dirname)(filePath), baseName + ".html"),
        await generateHTML(baseName, contentToExport, true)
      );
    } catch (error) {
      console.error("Error exporting HTML:", error);
    }
  });
  import_electron.ipcMain.handle("read-file-as-base64", async (event, { filePath }) => {
    let result = fs2.readFileSync(filePath).toString("base64");
    try {
      return result;
    } catch (error) {
      console.log(error);
    }
  });
};
var createWindow = () => {
  const win = new import_electron.BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    resizable: true,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      preload: (0, import_path.join)(__dirname, "preload.js"),
      experimentalFeatures: true
    }
  });
  const path2 = (0, import_path.join)(__dirname, "app", "index.html");
  win.loadFile(path2);
  return win;
};
var appListens = () => {
  import_electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
      import_electron.app.quit();
  });
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0)
      createWindow();
  });
  import_electron.app.on("web-contents-created", (e, webContents) => {
    webContents.on("will-navigate", (event, url) => {
      event.preventDefault();
      import_electron.shell.openExternal(url);
    });
  });
};
main();
//# sourceMappingURL=main.js.map
