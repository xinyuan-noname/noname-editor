const urlObject = new URL(import.meta.url);
const dirPath = urlObject.pathname.replace("url.mjs", "").slice(1, -1);
const extPath = dirPath.replace("extension", "ext:");
export default dirPath;
export { extPath };