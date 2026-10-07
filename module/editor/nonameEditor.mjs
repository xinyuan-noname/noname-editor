"use script";

import { NonameEditorData } from "./nonameEditorData.mjs";
import { NonameEditorView } from "./nonameEditorView.mjs";

export class NonameEditor {
    view;
    data;
    constructor() {
        const view = new NonameEditorView();
        const data = new NonameEditorData();
        this.view = view;
        this.data = data;
        view.serveFor = this;
        data.serveFor = this;
    }
    init(parentNode) {
        this.view.init(parentNode);
    }
}