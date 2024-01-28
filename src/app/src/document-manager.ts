export enum DocumentStatus {
    New = "new",
    UnsavedChanges = "unsavedChanges",
    Saved = "saved"
}

export interface DocumentState {
    status: DocumentStatus
    filePath?: string
    directoryPath?: string
}

export class DocumentManager {
    private state: DocumentState

    constructor() {
        this.state = {
            status: DocumentStatus.New,
            filePath: '',
            directoryPath: '',
        }
    }

    public modify(): void {
        if (this.state.status === DocumentStatus.Saved) {
            this.state.status = DocumentStatus.UnsavedChanges
        }
    }

    public openDocument(filePath: string, directoryPath: string): void {
        this.state = {
            status: DocumentStatus.Saved,
            filePath,
            directoryPath
        }
    }

    public saveDocument(): void {
        switch (this.state.status) {
            case DocumentStatus.New:
            case DocumentStatus.UnsavedChanges:
                this.state.status = DocumentStatus.Saved
                break
            default:
                break
        }
    }

    public saveDocumentAs(filePath: string, directoryPath: string): void {
        this.state = {
            status: DocumentStatus.Saved,
            filePath,
            directoryPath
        }
    }

    public getStatus(): DocumentStatus {
        return this.state.status
    }

    public getFilePath(): string | undefined {
        return this.state.filePath
    }

    public getDirectoryPath(): string | undefined {
        return this.state.directoryPath
    }
}
