import url from "./url.mjs"
export class UniqueChoiceManager {
    get chosenIndex() {
        return this.indexOf(this.chosen);
    }
    /**
     * @type {HTMLElement[]}
     */
    nodeList = [];
    listenerList = [];
    /**
     * @type {string}
     */
    listenerType
    /**
     * @type {function(Event)}
     */
    listenerFilter
    /**
     * @type {HTMLElement}
     */
    chosen;
    /**
     * @type {boolean}
     */
    revocable;
    /**
     * @type {this}
     */
    proxy;
    /**
     * @type {function(HTMLElement,HTMLElement):void}
     */
    callback;
    /**
     * @param  {...HTMLElement} nodes 
     */
    constructor(...nodes) {
        this.nodeList.push(...nodes);
        this.proxy = new Proxy(this, {
            set(target, p, val) {
                if (p === "chosen") {
                    if (target.chosen === val) {
                        if (target.revocable) {
                            target.choose(null);
                            return true;
                        }
                    }
                    else {
                        target.callback?.(target.chosen, val);
                    }
                }
                return Reflect.set(target, p, val);
            }
        })
    }
    setRevocable(bool) {
        this.revocable = Boolean(bool);
        return this;
    }
    /**
     * @param  {...string} classNames 
     * @returns {this}
     */
    forClass(...classNames) {
        classNames = classNames.filter(Boolean);
        if (classNames) this.callback = ((last, now) => {
            last?.classList?.remove?.(...classNames);
            now?.classList?.add?.(...classNames);
        })
        return this;
    }
    /**
     * @param {WeakMap<HTMLElement,HTMLElement>} nodeMap 
     * @param  {...string} classNames 
     * @returns {this}
     */
    forClassByNodeMap(nodeMap, ...classNames) {
        this.callback = ((last, now) => {
            nodeMap.get(last)?.classList?.remove?.(...classNames);
            nodeMap.get(now)?.classList?.add?.(...classNames);
        })
        return this;
    }
    /**
     * @param {WeakMap<HTMLElement,Map<HTMLElement,string[]>>} nodeClassMap 
     * @returns 
     */
    forClassByNodeClassMap(nodeClassMap) {
        this.callback = ((last, now) => {
            nodeClassMap.get(last)?.forEach?.((classNames, node) => {
                node?.classList?.remove(...classNames);
            })
            nodeClassMap.get(now)?.forEach?.((classNames, node) => {
                node?.classList?.add(...classNames);
            })
        })
        return this;
    }
    /**
     * @param {function(HTMLElement,HTMLElement,{forClass:function(...string),forClassByNodeMap:function(WeakMap<HTMLElement,HTMLElement>,...string),forClassByNodeClassMap:function(WeakMap<HTMLElement,Map<HTMLElement,string[]>>)})} callback 
     * @returns {this}
     */
    setCallback(callback) {
        this.callback = (last, now) => {
            callback(last, now, {
                forClass: (...classNames) => {
                    last?.classList?.remove?.(...classNames);
                    now?.classList?.add?.(...classNames);
                },
                forClassByNodeMap: (nodeMap, ...classNames) => {
                    nodeMap.get(last)?.classList?.remove?.(...classNames);
                    nodeMap.get(now)?.classList?.add?.(...classNames);
                },
                forClassByNodeClassMap: (nodeClassMap) => {
                    nodeClassMap.get(last)?.forEach?.((classNames, node) => {
                        node?.classList?.remove(...classNames);
                    })
                    nodeClassMap.get(now)?.forEach?.((classNames, node) => {
                        node?.classList?.add(...classNames);
                    })
                }
            }, this)
        };
        return this;
    }
    /**
     * @param {keyof HTMLElementEventMap} type 
     * @param {function(Event,HTMLElement):boolean} filter 
     * @returns {this}
     */
    listenAllNodes(type, filter) {
        this.listenerType = type;
        this.listenerFilter = filter;
        this.nodeList.forEach(node => {
            const listener = (e) => {
                if (!filter || filter?.(e, node)) this.choose(node);
            }
            node.addEventListener(type, listener);
            this.listenerList.push([node, type, listener]);
        })
        return this;
    }
    /**
    * @param {keyof HTMLElementEventMap} type 
    * @param {function(Event,HTMLElement):boolean} filter 
    * @returns {this}
    */
    listenSiblings(type, filter) {
        const commonParentNode = this.nodeList[0].parentNode
        if (this.nodeList.some(node => node.parentNode != commonParentNode)) throw new Error("The nodes must be siblings");
        this.commonParentNode = commonParentNode;
        this.listenerType = type;
        this.listenerFilter = filter;
        const listener = (e) => {
            if (!this.nodeList.includes(e.target)) return;
            if (!filter || filter?.(e, e.target)) this.choose(e.target);
        }
        commonParentNode.addEventListener(type, listener);
        this.listenerList.push([commonParentNode, type, listener]);
        return this;
    }
    indexOf(node) {
        return this.nodeList.indexOf(node);
    }
    /**
     * @param {HTMLElement|null|number|selector} feature 
     * @returns {this}
     */
    choose(feature) {
        if (feature instanceof HTMLElement || feature == null) {
            this.proxy.chosen = feature;
        } else if (typeof feature === "number") {
            const index = feature
            this.proxy.chosen = this.nodeList[index];
        } else if (typeof feature === "string") {
            const selector = feature;
            this.proxy.chosen = this.nodeList.find(node => node.matches(selector));
        }
        return this;
    }
    chooseFirst() {
        this.proxy.chosen = this.nodeList[0];
        return this;
    }
    append(...nodes) {
        this.nodeList.push(...nodes);
        if (!this.commonParentNode) {
            if (this.listenerType) {
                const type = this.listenerType
                const filter = this.listenerFilter;
                nodes.forEach((node) => {
                    const listener = (e) => {
                        if (!filter || filter?.(e, node)) this.choose(node);
                    }
                    node.addEventListener(type, listener);
                    this.listenerList.push([node, type, listener]);
                })
            }
        } else if (this.commonParentNode) {
            if (this.listenerType) {
                const type = this.listenerType;
                const filter = this.listenerFilter;
                nodes.forEach((node) => {
                    if (this.commonParentNode.contains(node)) {
                        return;
                    }
                    const listener = (e) => {
                        if (!filter || filter?.(e, node)) this.choose(node);
                    }
                    node.addEventListener(type, listener);
                    this.listenerList.push([node, type, listener]);
                })
            }
        }
    }
    remove(...nodes) {
        let i, j;
        for (i = 0, j = 0; i < this.nodeList.length; i++) {
            const node = this.nodeList[i];
            if (!nodes.includes(node)) this.nodeList[j++] = node;
        }
        this.nodeList.length = j;
    }
    disconnect() {
        this.listenerList.forEach(([node, type, listener]) => {
            node.removeEventListener(type, listener);
        })
        this.commonParentNode = null;
        this.nodeList.length = 0;
        this.callback = null;
        this.chosen = null;
    }
}
export class MultipleChoiceManager {
    listenerList = [];
    /**
     * @type {string}
     */
    listenerType
    /**
     * @type {function(Event)}
     */
    listenerFilter
    /**
     * @type {HTMLElement[]}
     */
    nodeList = [];
    /**
     * @type {HTMLElement[]}
     */
    #chosenList = [];
    /**
     * @type {[]}
     */
    collectedInfo = [];
    /**
     * @type {function(string,HTMLElement,HTMLElement[]):void}
     */
    callback;
    /**
     * @type {function(HTMLElement,HTMLElement[]):void}
     */
    getInfoMethod;
    /**
     * @type {function(HTMLElement,HTMLElement[]):void}
     */
    collectFilter;
    /**
     * @type {function(HTMLElement,HTMLElement[]):void}
     */
    destoryFilter;
    /**
     * @param  {...HTMLElement} nodes 
     */
    constructor(...nodes) {
        this.nodeList.push(...nodes);
    }
    setGetInfoMethod(func) {
        this.getInfoMethod = func;
        return this;
    }
    setCollectFilter(func) {
        this.collectFilter = func;
        return this;
    }
    setDestoryFilter(func) {
        this.destoryFilter = func;
        return this;
    }
    setCapicity(num) {
        this.capacity = num;
        return this;
    }
    collect(target, chosenList, filter) {
        if (this.getInfoMethod && (!filter || filter?.(node, chosenList))) {
            this.collectedInfo.push({ source: target, info: this.getInfoMethod(target, chosenList) })
        }
        if (this.capacity != null && this.collectedInfo.length > this.capacity) {
            this.unselect(this.collectedInfo[0].source);
        }
    }
    destroy(node, chosenList, filter) {
        let i, j;
        for (i = 0, j = 0; i < this.collectedInfo.length; i++) {
            const info = this.collectedInfo[i];
            if (info?.source !== node && (!filter || filter?.(node, chosenList))) {
                this.collectedInfo[j++] = info;
            }
        }
        this.collectedInfo.length = j;
    }
    /**
     * @param  {...string} classNames 
     * @returns {this}
     */
    forClass(...classNames) {
        classNames = classNames.filter(Boolean)
        if (classNames.length) this.callback = ((type, item) => {
            if (type === "add") {
                item?.classList?.add?.(...classNames);
            } else if (type === "delete") {
                item?.classList?.remove?.(...classNames);
            }
        })
        return this;
    }
    /**
     * @param {WeakMap<HTMLElement,HTMLElement>} nodeMap 
     * @param  {...string} classNames 
     * @returns {this}
     */
    forClassByNodeMap(nodeMap, ...classNames) {
        this.callback = ((type, item) => {
            if (type === "add") {
                nodeMap.get(item)?.classList?.add?.(...classNames);
            } else if (type === "delete") {
                nodeMap.get(item)?.classList?.remove?.(...classNames);
            }
        })
        return this;
    }
    /**
     * @param {WeakMap<HTMLElement,Map<HTMLElement,string[]>>} nodeClassMap 
     * @returns 
     */
    forClassByNodeClassMap(nodeClassMap) {
        this.callback = ((type, item) => {
            if (type === "add") {
                nodeClassMap.get(item)?.forEach?.((classNames, node) => {
                    node?.classList?.add(...classNames);
                })
            } else if (type === "delete") {
                nodeClassMap.get(item)?.forEach?.((classNames, node) => {
                    node?.classList?.remove(...classNames);
                })
            }
        })
        return this;
    }
    /**
     * @param {function("add"|"delete",HTMLElement,{forClass:function(...string),forClassByNodeMap:function(WeakMap<HTMLElement,HTMLElement>,...string),forClassByNodeClassMap:function(WeakMap<HTMLElement,Map<HTMLElement,string[]>>)})} callback 
     * @returns {this}
     */
    setCallback(callback) {
        this.callback = (type, item) => {
            callback(type, item, {
                forClass: (...classNames) => {
                    if (type === "add") {
                        item?.classList?.add?.(...classNames);
                    } else if (type === "delete") {
                        item?.classList?.remove?.(...classNames);
                    }
                },
                forClassByNodeMap: (nodeMap, ...classNames) => {
                    if (type === "add") {
                        nodeMap.get(item)?.classList?.add?.(...classNames);
                    } else if (type === "delete") {
                        nodeMap.get(item)?.classList?.remove?.(...classNames);
                    }
                },
                forClassByNodeClassMap: (nodeClassMap) => {
                    if (type === "add") {
                        nodeClassMap.get(item)?.forEach?.((classNames, node) => {
                            node?.classList?.add(...classNames);
                        })
                    } else if (type === "delete") {
                        nodeClassMap.get(item)?.forEach?.((classNames, node) => {
                            node?.classList?.remove(...classNames);
                        })
                    }
                }
            })
        };
        return this;
    }
    /**
     * @param {keyof HTMLElementEventMap} type 
     * @param {function(Event,HTMLElement):boolean} filter 
     * @returns {this}
     */
    listenAllNodes(type, filter, method = "toggle") {
        if (!["select", "unselect", "toggle"].includes(method)) throw new Error(`${method}必须是"select","unselect","toggle"中的一个`)
        this.listenerType = type;
        this.listenerFilter = filter;
        this.nodeList.forEach(node => {
            const listener = (e) => {
                if (!filter || filter?.(e, node)) this[method](node);
            }
            node.addEventListener(type, listener)
            this.listenerList.push([node, type, listener]);
        })
        return this;
    }
    /**
    * @param {keyof HTMLElementEventMap} type 
    * @param {function(Event,HTMLElement):boolean} filter 
    * @returns {this}
    */
    listenSiblings(type, filter, method = "toggle") {
        if (!["select", "unselect", "toggle"].includes(method)) throw new Error(`${method}必须是"select","unselect","toggle"中的一个`)
        const commonParentNode = this.nodeList[0].parentNode
        if (this.nodeList.some(node => node.parentNode != commonParentNode)) throw new Error("The nodes must be siblings");
        this.commonParentNode = commonParentNode;
        this.listenerType = type;
        this.listenerFilter = filter;
        const listener = (e) => {
            if (!this.nodeList.includes(e.target)) return;
            if (!filter || filter?.(e, e.target)) this[method](e.target);
        }
        commonParentNode.addEventListener(type, listener);
        this.listenerList.push([commonParentNode, type, listener]);
        return this;
    }
    /**
     * @param {HTMLElement} target 
     * @returns {this}
     */
    select(target) {
        this.#chosenList.push(target);
        this.collect(target, this.#chosenList, this.collectFilter);
        this.callback?.("add", target, this.#chosenList);
    }
    unselect(target) {
        const i = this.#chosenList.indexOf(target);
        if (i === -1) return this;
        this.#chosenList.splice(i, 1);
        this.destroy(target, this.#chosenList, this.destoryFilter);
        this.callback?.("delete", target, this.#chosenList);
    }
    toggle(target) {
        if (this.#chosenList.includes(target)) {
            this.unselect(target);
        } else {
            this.select(target);
        }
    }
    selectByFind(filter) {
        this.select(this.nodeList.find(node => filter(node)))
    }
    unselectByFind(filter) {
        this.unselect(this.nodeList.find(node => filter(node)))
    }
    toggleByFind(filter) {
        this.toggle(this.nodeList.find(node => filter(node)))
    }
    reset() {
        for (const target of this.#chosenList.slice()) {
            this.unselect(target);
        }
    }
    append(...nodes) {
        this.nodeList.push(...nodes);
        if (!this.commonParentNode) {
            if (this.listenerType) {
                const type = this.listenerType
                const filter = this.listenerFilter;
                nodes.forEach((node) => {
                    const listener = (e) => {
                        if (!filter || filter?.(e, node)) this.select(node);
                    }
                    node.addEventListener(type, listener);
                    this.listenerList.push([node, type, listener]);
                })
            }
        } else if (this.commonParentNode) {
            if (this.listenerType) {
                const type = this.listenerType;
                const filter = this.listenerFilter;
                nodes.forEach((node) => {
                    if (this.commonParentNode.contains(node)) {
                        return;
                    }
                    const listener = (e) => {
                        if (!filter || filter?.(e, node)) this.select(node);
                    }
                    node.addEventListener(type, listener);
                    this.listenerList.push([node, type, listener]);
                })
            }
        }
    }
    remove(...nodes) {
        let i, j
        for (i = 0, j = 0; i < this.nodeList.length; i++) {
            const node = this.nodeList[i];
            if (!nodes.includes(node)) this.nodeList[j++] = node;
        }
        this.nodeList.length = j;
    }
    /**
     * @param {number|HTMLElement} query 
     * @returns {any|any[]}
     */
    getInfo(query) {
        if (typeof query === "number") {
            return this.collectedInfo?.[query]?.info;
        } else if (query instanceof HTMLElement) {
            return this.collectedInfo.find(infoObject => {
                if (infoObject?.source === query) return infoObject?.info;
            })
        }
    }
    getAllInfo() {
        return this.collectedInfo.map(infoObject => infoObject?.info);
    }
    getLastestInfo() {
        return this.collectedInfo?.[this.collectedInfo.length - 1]?.info;
    }
}
export class EditableElementManager {
    /**
     * @type {HTMLElement}
     */
    node;
    min;
    max;
    value;
    changeValueRewrite;
    listenerMap = new Map();
    constructor(node) {
        this.node = node;
    }
    inputNumber({ min, max, value, offset = 1, wheelCallback, blurCallback, enterBlur, enterCallback, supportInfinity, commonCallback, isInteger } = {}) {
        const changeValue = (val) => {
            if (this.node.textContent !== val || this.value !== val) {
                if (supportInfinity && (val === "无穷" || val === "∞" || val == Infinity)) {
                    this.value = Infinity; this.node.textContent = "∞";
                } else {
                    const numericVal = isInteger ? Math.round(val) : Number(val);
                    this.node.textContent = this.value = isNaN(numericVal) ? this.min : numericVal;
                }
                if (!this.node.textContent.length || this.value < this.min) {
                    this.node.textContent = this.value = this.min;
                }
                if (this.value > this.max) {
                    this.node.textContent = this.value = this.max;
                }
            }
            return Number(this.value);
        }
        const wheelListener = (e) => {
            const lastValue = this.value;
            const value = changeValue(e.deltaY < 0 ? this.value + offset : this.value - offset);
            commonCallback?.(e, value, lastValue);
            wheelCallback?.(e, value, lastValue);
        }
        const blurListener = (e) => {
            const lastValue = this.value;
            const value = changeValue(this.node.textContent);
            commonCallback?.(e, value, lastValue);
            blurCallback?.(e, value, lastValue);
        }
        this.recordListener("wheel", wheelListener);
        this.recordListener("blur", blurListener);
        this.node.addEventListener("wheel", wheelListener, { passive: true })
        this.node.addEventListener("blur", blurListener)
        if (commonCallback || blurCallback) {
            this.preventEnter(enterBlur, (e) => {
                const lastValue = this.value;
                const value = changeValue(this.node.textContent);
                commonCallback?.(e, value, lastValue);
                enterCallback?.(e, value, lastValue);
            })
        } else {
            this.preventEnter(enterBlur);
        };
        if (value != void 0) changeValue(value);
        if (min != void 0) this.min = min;
        if (max != void 0) this.max = max;
        this.rewriteChangeValue(changeValue);
        return this;
    }
    /**
     * @param {{
     *      commonCallback:function(Event):void
     *      blurCallback:function(Event):void
     *      enterCallback:function(Event):void
     *      searchCallback:function(Event,{keyWords:string[],filter:string[]}):void
     *      associated:{
     *          element:HTMLElement
     *          listenerType:keyof HTMLElementEventMap
     *          callback:function(Event,function):void
     *          useCommonCallback:boolean     
     *      }
     * }} param0 
     */
    inputSearch({ commonCallback, blurCallback, enterCallback, enterBlur, searchCallback, associated }) {
        const getSearchRequest = () => {
            const request = { keyWords: [], filter: [] };
            if (!this.node.textContent.length) return request;
            this.node.textContent.split(" ").forEach((word, index) => {
                if (!word.length) return;
                else if (index >= 1 && word.startsWith("-") && word.length > 1) {
                    const slicedWord = word.slice(1);
                    if (!request.filter.includes(slicedWord)) request.filter.push(slicedWord);
                } else {
                    if (!request.keyWords.includes(word)) request.keyWords.push(word);
                }
            })
            return request;
        }
        const blurListener = (e) => {
            commonCallback?.(e);
            searchCallback?.(e, getSearchRequest());
            blurCallback?.(e);
        }
        this.recordListener("blur", blurListener);
        this.node.addEventListener("blur", blurListener);
        if (typeof associated === "object") {
            const { element, listenerType, callback, useCommonCallback } = associated;
            if (element, listenerType) {
                const listener = e => {
                    if (useCommonCallback) commonCallback?.(e);
                    searchCallback?.(e, getSearchRequest());
                    callback?.(e, listener);
                }
                element.addEventListener(listenerType, listener);
            }
        }
        if (commonCallback || blurCallback) {
            this.preventEnter(enterBlur, (e) => {
                commonCallback?.(e);
                enterCallback?.(e);
            })
        } else {
            this.preventEnter(enterBlur);
        };
    }
    rewriteChangeValue(func) {
        this.changeValueRewrite = func
    }
    changeValue(val) {
        if (!this.changeValueRewrite) this.node.innerText = this.value = val;
        else this.changeValueRewrite(val);
    }
    preventEnter(blur = true, callback) {
        const listener = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                blur && this.node.blur();
                callback?.(e);
            }
        }
        this.recordListener("keydown", listener)
        this.node.addEventListener("keydown", listener);
        return this;
    }
    recordListener(type, listener) {
        if (!this.listenerMap.has(type)) this.listenerMap.set(type, []);
        this.listenerMap.get(type).push(listener);
        return this;
    }
}
export class DragManager {
    /**
     * @type {HTMLElement}
     */
    draggableTargetsParentNode;
    draggableTargets = [];
    dragStatus = new Proxy({
        isDragging: false,
        draggingNode: null,
        canDrag: false,
        preX: 0,
        preY: 0,
        preTop: 0,
        preLeft: 0,
        frame: null,
        armed: false,
        startX: 0,
        startY: 0,
        pendingX: 0,
        pendingY: 0,
        limitX: 0,
        limitY: 0,
        lastX: null,
        lastY: null    }, {
        set: (target, p, val) => {
            if (p === "canDrag" && val === true) {
                this.eventMap.forEach((func, type) => {
                    this.draggableTargetsParentNode.addEventListener(type, func);
                })
            } else if (p === "canDrag" && val === false) {
                this.eventMap.forEach((func, type) => {
                    this.draggableTargetsParentNode.removeEventListener(type, func);
                })
            }
            if (p === "isDragging" && val === true) {
                this.draggableTargetsParentNode.classList.add("xy-ED-high-z-index");
            } else if (p === "isDragging" && val === false) {
                this.draggableTargetsParentNode.classList.remove("xy-ED-high-z-index");
            }
            return Reflect.set(target, p, val);
        }
    })
    eventMap = new Map([
        ["pointerdown", e => {
            if (this.dragStatus.isDragging) return;
            if (!this.draggableTargets.includes(e.target)) return;
            if (typeof e.button === "number" && e.button !== 0) return;
            const st = this.dragStatus, node = e.target, parent = this.draggableTargetsParentNode;
            // 首次拖动时把当前视觉位置固化为内联 left/top，避免读到空值导致起手跳位
            if (!node.style.left) {
                const pRect = parent.getBoundingClientRect();
                const nRect = node.getBoundingClientRect();
                node.style.left = `${nRect.left - pRect.left}px`;
                node.style.top = `${nRect.top - pRect.top}px`;
            }
            st.draggingNode = node;
            st.preLeft = parseFloat(node.style.left) || 0;
            st.preTop = parseFloat(node.style.top) || 0;
            st.startX = e.clientX;
            st.startY = e.clientY;
            st.pendingX = 0;
            st.pendingY = 0;
            st.armed = true;
            node.setPointerCapture?.(e.pointerId);
        }],
        ["pointermove", e => {
            const st = this.dragStatus;
            if (!st.armed || st.draggingNode !== e.target) return;
            const dx = e.clientX - st.startX, dy = e.clientY - st.startY;
            if (!st.isDragging) {
                // 3px 阈值：既能区分点击与拖动，又无需长按等待，起手立刻跟手
                if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
                this.beginDrag();
            }
            st.pendingX = dx;
            st.pendingY = dy;
            if (!st.frame) st.frame = requestAnimationFrame(() => this.flushDrag());
        }],
        ["pointerup", e => this.endDrag(e)],
        ["pointercancel", e => this.endDrag(e)]
    ]);
    /**
     * 起手：一次性量取边界，拖动全过程不再读取布局，避免逐帧重排
     */
    beginDrag() {
        const st = this.dragStatus, node = st.draggingNode, parent = this.draggableTargetsParentNode;
        st.limitX = Math.max(0, parent.clientWidth - node.offsetWidth);
        st.limitY = Math.max(0, parent.clientHeight - node.offsetHeight);
        node.classList.add("xy-ED-dragging");
        st.isDragging = true;
    }
    /**
     * 每帧只写 transform，位移交给合成层
     */
    flushDrag() {
        const st = this.dragStatus, node = st.draggingNode;
        st.frame = null;
        if (!node) return;
        const x = Math.min(Math.max(st.preLeft + st.pendingX, 0), st.limitX);
        const y = Math.min(Math.max(st.preTop + st.pendingY, 0), st.limitY);
        st.lastX = x;
        st.lastY = y;
        node.style.transform = `translate3d(${x - st.preLeft}px, ${y - st.preTop}px, 0)`;
    }
    /**
     * 收手：把最终位移写回 left/top，保持与最小化/展开逻辑的既有约定一致
     */
    endDrag(e) {
        const st = this.dragStatus, node = st.draggingNode;
        st.armed = false;
        if (st.frame) {
            cancelAnimationFrame(st.frame);
            st.frame = null;
        }
        if (node) {
            try {
                if (e && node.hasPointerCapture?.(e.pointerId)) node.releasePointerCapture(e.pointerId);
            } catch (err) { }
            if (st.isDragging) {
                node.style.transform = "";
                node.style.left = `${st.lastX ?? st.preLeft}px`;
                node.style.top = `${st.lastY ?? st.preTop}px`;
                node.classList.remove("xy-ED-dragging");
            }
        }
        st.isDragging = false;
        st.draggingNode = null;
    }    beDraggable() {
        this.dragStatus.canDrag = true;
        return this;
    }
    constructor(parentNode, ...draggableTargets) {
        this.draggableTargetsParentNode = parentNode;
        this.draggableTargets.push(...draggableTargets);
    }
}
export class URLManager {
    /**
     * @type {Map<string,string[]>}
     */
    urlLabelMap = new Map();
    add(label, url) {
        if (!this.urlLabelMap.get(label)) this.urlLabelMap.set(label, []);
        this.urlLabelMap.get(label).push(url);
    }
    addFromBlob(label, blob) {
        if (!(blob instanceof Blob)){
            throw new Error(blob + "必须为一个Blob");
        } 
        if (!this.urlLabelMap.get(label)) this.urlLabelMap.set(label, []);
        const url = URL.createObjectURL(blob);
        this.urlLabelMap.get(label).push(url);
    }
    remove(...args) {
        if (args.length === 2) {
            const [label, url] = args
            const urlList = this.urlLabelMap.get(label);
            const i = urlList.indexOf(url);
            URL.revokeObjectURL(urlList[i])
            if (i !== -1) urlList.splice(i, 1);
        }
        if (args.length === 1) {
            this.urlLabelMap.forEach((urlList) => {
                const [url] = args;
                const i = urlList.indexOf(url);
                URL.revokeObjectURL(urlList[i])
                if (i !== -1) urlList.splice(i, 1);
            })
        }
    }
    clear(label) {
        if (label === void 0 || label === null) {
            this.urlLabelMap.forEach(urls => {
                urls.forEach(url => URL.revokeObjectURL(url));
            })
            this.urlLabelMap.clear();
        } else {
            const urlList = this.urlLabelMap.get(label);
            if (urlList) {
                urlList.forEach(url => {
                    URL.revokeObjectURL(url);
                })
                urlList.length = 0;
            }
        }
    }
    getLastest(label) {
        const urlList = this.urlLabelMap.get(label)
        return urlList[urlList.length - 1]
    }
    removeLastest(label) {
        const urlList = this.urlLabelMap.get(label);
        const lastest = urlList[urlList.length - 1];
        urlList.splice(-1, 1);
        URL.revokeObjectURL(lastest);
    }
    getURLGroup(label) {
        return this.urlLabelMap.get(label) || [];
    }
}
/**
 * @param {HTMLElement} node
 * @param  {...string} classNames 
 * @returns 
 */
export const toggleMultiClass = (node, ...classNames) => {
    return {
        single: (p) => {
            let targetClassName
            if (p in classNames) targetClassName = classNames[p];
            else if (classNames.includes(p)) targetClassName = p;
            if (targetClassName) {
                for (let i = 0; i < classNames.length; i++) {
                    const className = classNames[i];
                    if (targetClassName === className) {
                        if (!node.classList.contains(className)) node.classList.add(className);
                        continue;
                    }
                    if (node.classList.contains(className)) node.classList.remove(className);
                }
            }
        }
    }

}
export const preventEnter = (...nodes) => {
    nodes.forEach(node => {
        node.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                node.blur();
            }
        });
    })
}
export const loadCss = (name, { root = document.head, baseURL = `./${url}/style` } = {}) => {
    if (baseURL.endsWith("/")) baseURL = baseURL.slice(0, -1);
    let style;
    const href = `${baseURL}/${name}.css`
    if (!(style = root.querySelector(`link[href="${href}"]`))) {
        style = document.createElement("link");
        style.rel = "stylesheet";
        style.href = href
        style.addEventListener("error", e => console.error(e.error));
        root.appendChild(style);
    }
    return style;
}