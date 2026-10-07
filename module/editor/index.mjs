"use script";
import { loadCss } from "./encapsulated.mjs";
import { NonameEditor} from "./nonameEditor.mjs";
export default () => {
    loadCss("index"); loadCss("dynamic"); loadCss("font");
    return new NonameEditor();
}