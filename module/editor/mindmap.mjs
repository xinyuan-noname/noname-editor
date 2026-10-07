class CanvasLine {
    fromNode;
    toNode;
    strokeStyle;
    constructor(fromNode, toNode) {
        this.fromNode = fromNode;
        this.toNode = toNode;
    }
    setStyle(strokeStyle, arrowStyle) {
        this.strokeStyle = strokeStyle;
        this.arrowStyle = arrowStyle;
        return this;
    }
    /**
     * 
     * @param {"straight"|"polyline"} type 
     * @returns 
     */
    setType(type) {
        this.type = type;
        return this;
    }
    get centerX() {
        return Math.round((this.fromNode.centerX + this.toNode.centerX) / 2);
    }
    get centerY() {
        return Math.round((this.fromNode.centerY + this.toNode.centerY) / 2);
    }
    get fromX() {
        return this.fromNode.centerX;
    }
    get fromY() {
        return this.fromNode.centerY;
    }
    get toX() {
        return this.toNode.centerX;
    }
    get toY() {
        return this.toNode.centerY;
    }
    get vecX() {
        return this.fromNode.centerX - this.toNode.centerX
    }
    get vecY() {
        return this.fromNode.centerY - this.toNode.centerY
    }
    getAngle(x, y) {
        return Math.atan2(y, x);
    }
    getMod(x, y) {
        return (x ** 2 + y ** 2) ** (1 / 2);
    }
    getDirectionVector() {
        const mod = this.getMod(this.vecX, this.vecY);
        return {
            x: this.vecX,
            y: this.vecY,
            mod
        }
    }
    getNormalVector() {
        const { x: x_d, y: y_d, mod } = this.getDirectionVector();
        return {
            x: -y_d,
            y: x_d,
            mod
        }
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const { fromX, toX, fromY, toY, centerX, centerY, vecX, vecY } = this;
        const { x: x_n, y: y_n, mod } = this.getNormalVector();
        ctx.save();
        ctx.beginPath();
        ctx.globalCompositeOperation = "destination-over";
        ctx.strokeStyle = this.strokeStyle || "#fff";
        switch (this.type) {
            case "lightning": {
                const angle = this.getAngle(vecX, vecY);
                const offset = (this.fromNode.getEdgeLenByAngle(angle) + this.toNode.getEdgeLenByAngle(-angle)) / 8;
                const offsetX = Math.round(x_n / mod * offset), offsetY = Math.round(y_n / mod * offset);
                ctx.moveTo(fromX, fromY);
                ctx.lineTo(centerX + offsetX, centerY + offsetY);
                ctx.lineTo(centerX - offsetX, centerY - offsetY);
                ctx.lineTo(toX, toY);
                ctx.stroke()
            }; break;
            case "curve": {
                const angle = this.getAngle(vecX, vecY);
                const offset = (this.fromNode.getEdgeLenByAngle(angle) + this.toNode.getEdgeLenByAngle(-angle)) / 8;
                const offsetX = Math.round(x_n / mod * offset), offsetY = Math.round(y_n / mod * offset);
                ctx.moveTo(fromX, fromY);
                ctx.bezierCurveTo(centerX + offsetX, centerY + offsetY, centerX - offsetX, centerY - offsetY, toX, toY);
                ctx.stroke()
            }; break;
            default: {
                const unitDVectorX = vecX / mod, unitDVectorY = vecY / mod;
                const unitNVectorX = x_n / mod, unitNVectorY = y_n / mod;
                ctx.moveTo(fromX, fromY);
                ctx.lineTo(toX, toY);
                ctx.moveTo(Math.round(centerX - unitDVectorX * 3), Math.round(centerY - unitDVectorY * 3));
                ctx.lineTo(Math.round(centerX - unitDVectorX * 7 + unitNVectorX * 7), Math.round(centerY - unitDVectorY * 7 + unitNVectorY * 7));
                ctx.lineTo(Math.round(centerX + unitDVectorX * 7), Math.round(centerY + unitDVectorY * 7));
                ctx.lineTo(Math.round(centerX - unitDVectorX * 7 - unitNVectorX * 7), Math.round(centerY - unitDVectorY * 7 - unitNVectorY * 7));
                ctx.lineTo(Math.round(centerX - unitDVectorX * 3), Math.round(centerY - unitDVectorY * 3));
                ctx.stroke();
                ctx.fillStyle = this.arrowStyle || "#fff";
                ctx.fill();
            }; break;
        }
        ctx.closePath();
        ctx.restore();
    }
}
class CanvasNodeTransform {
    /**
     * @type {CanvasNode}
     */
    target;
    style;
    get controlPoint() {
        return {
            top: {
                x: this.target.x + Math.round(this.target.width / 2),
                y: this.target.y
            },
            bottom: {
                x: this.target.x + Math.round(this.target.width / 2),
                y: this.target.y + this.target.height
            },
            left: {
                x: this.target.x,
                y: this.target.y + Math.round(this.target.height / 2)
            },
            right: {
                x: this.target.x + this.target.width,
                y: this.target.y + Math.round(this.target.height / 2)
            },
            center: {
                x: this.target.centerX,
                y: this.target.centerY
            }
        }
    }
    constructor(target) {
        this.target = target;
    }
    setStyle(style) {
        this.style = style;
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = ctx.fillStyle = this.style || "orange";
        for (let k in this.controlPoint) {
            const { x, y } = this.controlPoint[k];
            ctx.moveTo(x, y);
            ctx.arc(x, y, 4, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }
}

class CanvasNode {
    /**
     * @type {MindMap}
    */
    mindmap;
    /**
     * @type {HTMLCanvasElement}
    */
    canvas;
    /**
     * @type {CanvasLine[]}
    */
    lineNodes = [];
    textNodes = [];
    controlNodes = [];
    get centerX() {
        return Math.round(this.x + this.width / 2);
    }
    get centerY() {
        return Math.round(this.y + this.height / 2);
    }
    get range() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height,
        }
    }
    get lastSibling() {
        const i = this.mindmap.nodeList.indexOf(this);
        return this.mindmap.nodeList[i - 1] || null;
    }
    get nextSibling() {
        const i = this.mindmap.nodeList.indexOf(this);
        return this.mindmap.nodeList[i + 1] || null;
    }
    constructor(mindmap, x = 0, y = 0, width, height, radius = 0) {
        this.mindmap = mindmap;
        this.change({ x, y, width, height, radius })
    }
    getEdgeLenByAngle(a) {
        return Math.PI / 4 < a && a < Math.PI * 3 / 4 ? this.width : this.height;
    }
    setStyle(strokeStyle, fillStyle) {
        this.strokeStyle = strokeStyle;
        this.fillStyle = fillStyle;
        return this;
    }
    moveX(x) {
        this.x += x;
        return this;
    }
    moveY(y) {
        this.y += y;
        return this;
    }
    move(x, y) {
        this.x += x;
        this.y += y;
        return this;
    }
    moveXTo(x) {
        this.x = x;
        return this;
    }
    moveYTo(y) {
        this.y = y;
        return this;
    }
    moveTo(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    change({ x, y, width, height, radius } = {}) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.radius = radius;
        return this;
    }
    inRange(x, y) {
        const { left, right, top, bottom } = this.range;
        return left <= x && x <= right && top <= y && y <= bottom;
    }
    /**
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        const { x, y, height, width, radius } = this;
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = this.strokeStyle || "#fff";
        ctx.fillStyle = this.fillStyle;
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.stroke();
        if (this.fillStyle) ctx.fill();
        ctx.closePath();
        ctx.restore();
        this.controlNodes.forEach(node => {
            node.draw(ctx);
        })
        this.lineNodes.forEach(node => {
            node.draw(ctx);
        });
        this.textNodes.forEach(node => {
            node.draw(ctx);
        });
    }
    clone(x = this.x, y = this.y, width = this.width, height = this.height, radius = this.radius) {
        return new CanvasNode(x, y, width, height, radius);
    }
    link(node, type) {
        const lineNode = new CanvasLine(this, node);
        lineNode.setType(type);
        this.lineNodes.push(lineNode);
    }
    unlink(node, type) {
        if (!node && !type) {
            this.lineNodes.length = 0;
            return;
        }
        let j = 0;
        for (let i = 0; i < this.lineNodes.length; i++) {
            const lineNode = this.lineNodes[i];
            if (node && lineNode.fromNode !== node || type && lineNode.type !== type) this.lineNodes[j++] = lineNode;
        }
        this.lineNodes.length = j;
    }
}

export class MindMap {
    back;
    canvas;
    footer;
    ctx;
    width;
    height;
    grid = {
        row: 0,
        column: 0,
        acc: 0,
        direction: "none"
    }
    nodeList = [];
    dragStatus = new Proxy(
        {
            canDrag: false,
            isDragging: false,
            draggingNode: null,
            startX: 0,
            startY: 0,
            pointerStartX: 0,
            pointerStartY: 0,
        }, {
        set: (target, p, val) => {
            const canvas = this.canvas;
            if (p === "canDrag") {
                const dragControlButton = this.footer.querySelector("button[data-duty=drag]");
                if (val === false) {
                    dragControlButton.classList.remove("xy-ED-skill-mindmap-chosen");
                    for (const [type, listeners] of this.listenerManager.drag) {
                        for (const listen of listeners) {
                            canvas.removeEventListener(type, listen);
                        }
                    }
                } else if (val === true) {
                    dragControlButton.classList.add("xy-ED-skill-mindmap-chosen");
                    for (const [type, listeners] of this.listenerManager.drag) {
                        for (const listen of listeners) {
                            canvas.addEventListener(type, listen);
                        }
                    }
                } else {
                    return false;
                }
            }
            Reflect.set(target, p, val);
            return true;
        }
    })
    controlNodeStatus = new Proxy(
        {
            canControl: false,
            isControlling: false,
            controllingNode: null,
        }, {
        set: (target, p, val) => {
            const canvas = this.canvas;
            if (p === "canControl") {
                const controlNodeControlButton = this.footer.querySelector("button[data-duty=controlNode]");
                if (val === false) {
                    controlNodeControlButton.classList.remove("xy-ED-skill-mindmap-chosen");
                    for (const [type, listeners] of this.listenerManager.controlNode) {
                        for (const listen of listeners) {
                            canvas.removeEventListener(type, listen);
                        }
                    }
                } else if (val === true) {
                    controlNodeControlButton.classList.add("xy-ED-skill-mindmap-chosen");
                    for (const [type, listeners] of this.listenerManager.controlNode) {
                        for (const listen of listeners) {
                            canvas.addEventListener(type, listen);
                        }
                    }
                } else {
                    return false;
                }
            }
            if (p === "controllingNode") {
                const node = Reflect.get(target, p)
                if (node instanceof CanvasNode) node.controlNodes.length = 0;
                if (val instanceof CanvasNode){
                    val.controlNodes.push(new CanvasNodeTransform(val));
                } 
                this.updateFrame();
            }
            Reflect.set(target, p, val);
            return true;
        }
    })
    listenerManager = {
        drag: new Map([
            [
                "pointerdown",
                [e => {
                    if (this.dragStatus.isDragging) return;
                    this.nodeList.forEach(node => {
                        if (node.inRange(e.offsetX, e.offsetY)) {
                            this.dragStatus.draggingNode = node;
                            this.dragStatus.isDragging = true;
                            this.dragStatus.startX = node.x;
                            this.dragStatus.startY = node.y;
                            this.dragStatus.pointerStartX = e.offsetX;
                            this.dragStatus.pointerStartY = e.offsetY;
                        }
                    })
                }]
            ],
            [
                "pointermove",
                [e => {
                    if (!this.dragStatus.isDragging) return;
                    const node = this.dragStatus.draggingNode;
                    node.moveTo(
                        this.dragStatus.startX + e.offsetX - this.dragStatus.pointerStartX,
                        this.dragStatus.startY + e.offsetY - this.dragStatus.pointerStartY
                    );
                    this.updateFrame();
                },
                e => {
                    if (this.dragStatus.isDragging) return;
                    this.canvas.style.cursor = this.nodeList.some(node => node.inRange(e.offsetX, e.offsetY)) ? "grab" : "";
                }]
            ],
            [
                "pointerup",
                [() => {
                    if (!this.dragStatus.isDragging) return;
                    this.dragStatus.draggingNode = null;
                    this.dragStatus.isDragging = false;
                    this.dragStatus.startX = 0;
                    this.dragStatus.startY = 0;
                }]
            ],
            [
                "pointerleave",
                [() => {
                    if (!this.dragStatus.isDragging) return;
                    this.dragStatus.draggingNode = null;
                    this.dragStatus.isDragging = false;
                    this.dragStatus.startX = 0;
                    this.dragStatus.startY = 0;
                }]
            ],
        ]),
        controlNode: new Map([
            [
                "pointerup",
                [e => {
                    const node = this.nodeList.find(node => {
                        return node.inRange(e.offsetX, e.offsetY)
                    })
                    if (node) {
                        this.controlNodeStatus.controllingNode = node;
                        this.controlNodeStatus.isControlling = true;
                    } else if (this.controlNodeStatus.isControlling) {
                        this.controlNodeStatus.controllingNode = null;
                        this.controlNodeStatus.isControlling = false;
                    }
                }]
            ],
            [
                "pointermove",
                [e => {
                    this.canvas.style.cursor = this.nodeList.some(node => node.inRange(e.offsetX, e.offsetY)) ? "pointer" : "";
                }]
            ],
        ])
    }
    constructor() {
        const canvas = document.createElement("canvas");
        canvas.classList.add("xy-ED-skill-mindmap-canvas");
        canvas.width = 1000;
        canvas.height = 500;
        //
        const ctx = canvas.getContext("2d");
        ctx.lineWidth = 3;
        //
        this.width = canvas.width;
        this.height = canvas.height;
        this.canvas = canvas;
        this.ctx = ctx;
    }
    loadUI(father = document.body) {
        const back = document.createElement("div");
        back.classList.add("xy-ED-skill-mindmap-back");
        const canvas = this.canvas;
        //
        const footer = document.createElement("footer");
        footer.classList.add("xy-ED-skill-mindmap-footer");
        footer.innerHTML =
            `<div>
            <button data-duty=clear>清屏</button>
            <button data-duty=reset>重置</button>
            <button data-duty=drag>拖动</button>
            <button data-duty=controlNode>节点</button>
        </div>
        <div>
            <button data-duty=close>关闭</button>
        </div>`
        footer.addEventListener("pointerdown", e => {
            switch (e.target.dataset.duty) {
                case "clear": {
                    this.clear();
                }; break;
                case "reset": {
                    this.reset();
                }; break;
                case "drag": {
                    this.toggleDraggable();
                }; break;
                case "controlNode": {
                    this.toggleNodeControllable();
                }; break;
                case "close": {
                    this.close();
                }; break;
            }
        })
        this.createNode();
        this.updateFrame();
        //
        back.append(canvas, footer);
        father.appendChild(back);
        this.back = back;
        this.footer = footer;
        return this;
    }
    close() {
        this.back.remove();
    }
    reset() {
        this.nodeList.length = 0;
        this.grid.acc = 0;
        this.createNode();
        this.updateFrame();
    }
    clear() {
        this.nodeList.length = 0;
        this.grid.acc = 0;
        this.updateFrame();
    }
    beDraggable() {
        this.dragStatus.canDrag = true;
        return this;
    }
    beUndraggable() {
        this.dragStatus.canDrag = false;
        return this;
    }
    toggleDraggable() {
        this.dragStatus.canDrag = !this.dragStatus.canDrag;
        return false;
    }
    beNodeControllable() {
        this.controlNodeStatus.canControl = true;
        return this;
    };
    beNodeUncontrollable() {
        this.controlNodeStatus.canControl = false;
        return this;
    };
    toggleNodeControllable() {
        this.controlNodeStatus.canControl = !this.controlNodeStatus.canControl;
        return this;
    };
    setGrid(row = 100, column = 50, direction = "row") {
        this.grid.column = column;
        this.grid.row = row;
        this.grid.direction = direction;
    }
    createNodeByGrid(width, height, radius, offsetX = 0, offsetY = 0) {
        if (this.grid.direction === "row") {
            const rowLen = this.grid.row * this.grid.acc;
            this.createNode(rowLen % this.width + offsetX, this.grid.column * Math.floor(rowLen / this.width) + offsetY, width, height, radius);
        } else if (this.grid.direction === "column") {
            const columnLen = this.grid.column * this.grid.acc
            this.createNode(this.grid.row * Math.floor(columnLen / this.height) + offsetX, columnLen % this.height + offsetY, width, height, radius);
        }
        this.grid.acc++;
    }
    createNode(x = 20, y = 200, width = 180, height = 100, radius = 10, strokeStyle = "#fff", fillStyle = "#fff") {
        const node = new CanvasNode(this, x, y, width, height, radius);
        node.setStyle(strokeStyle, fillStyle);
        this.nodeList.push(node);
        return node;
    }
    clearCanvas() {
        const { canvas, ctx } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return this;
    }
    updateFrame() {
        this.clearCanvas();
        this.nodeList.forEach(node => node.draw(this.ctx));
        return this;
    }
}