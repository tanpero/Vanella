let globalContext = {
    filePath: '',
    dirPath: '',
}

export const getGlobalFilePath = () => globalContext.filePath
export const setGlobalFilePath = filePath => globalContext.filePath = filePath

export const getGlobalDirPath = () => globalContext.dirPath
export const setGlobalDirPath = dirPath => globalContext.dirPath = dirPath
