import { Partial } from "app/utils";

export interface MockedFileAttributes {
    name: string;
    path: string;
    lastModifiedDate: Date;
    type: string;
    webkitRelativePath: string;
    size: number;
}

export class MockedFile implements File {
    public name: string;
    public path: string;
    public lastModifiedDate: Date;
    public type: string;
    public webkitRelativePath: string;
    public size: number;

    constructor(data: Partial<MockedFileAttributes> = {}) {
        Object.assign(this, data);
    }

    public slice(start: number, end: number) {
        return new Blob([end - start]);
    }

    public msClose(): void {
        // does nothing
    }

    public msDetachStream(): any {
        // does nothing
    }
}
