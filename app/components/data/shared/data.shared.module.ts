import { NgModule } from "@angular/core";

import { commonModules } from "app/common";
import { FileBrowseModule } from "app/components/file/browse";
import { CloudFilePickerComponent, CloudFilePickerDialogComponent } from "./cloud-file-picker";
import { StorageErrorDisplayComponent } from "./errors";
import { FileGroupPickerComponent } from "./file-group-picker";
import { FileGroupsPickerComponent } from "./file-groups-picker";

const components = [
    FileGroupPickerComponent, FileGroupsPickerComponent,
    CloudFilePickerComponent, CloudFilePickerDialogComponent,
    StorageErrorDisplayComponent,
];

@NgModule({
    declarations: components,
    exports: components,
    imports: [
        ...commonModules, FileBrowseModule,
    ],
    entryComponents: [CloudFilePickerDialogComponent],
})
export class DataSharedModule {
}
