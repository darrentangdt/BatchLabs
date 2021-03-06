import { ComponentType } from "@angular/cdk/portal";
import { Injectable } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material";
import { PromptDialogComponent } from "app/components/base/dialogs";
import { Observable } from "rxjs";
import { ConfirmationDialogComponent } from "./confirmation-dialog.component";

export interface ConfirmOptions {
    description?: string;
    yes: () => Observable<any>;
}

export interface PromptOptions {
    description?: string;
    prompt: (value: string) => Observable<any>;
}

/**
 * Dialog service is a service to help open commonly used dialog such as a confirmation dialog.
 * It can also open a dialog the same way material does so you only need to inject this service and not the MatDialog
 */
@Injectable()
export class DialogService {
    constructor(private matDialog: MatDialog) { }

    public confirm(title: string = "Are you sure?", options: ConfirmOptions) {
        const ref = this.matDialog.open(ConfirmationDialogComponent);
        const component = ref.componentInstance;
        component.title = title;
        component.description = options.description;
        component.execute = options.yes;
    }

    public prompt(title: string = "Are you sure?", options: PromptOptions) {
        const ref = this.matDialog.open(PromptDialogComponent);
        const component = ref.componentInstance;
        component.title = title;
        component.description = options.description;
        component.execute = options.prompt;
    }

    public open<T>(type: ComponentType<T>, config?: MatDialogConfig): MatDialogRef<T> {
        return this.matDialog.open(type, config);
    }
}
