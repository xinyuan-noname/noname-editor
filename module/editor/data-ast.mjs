import "./libs/babel/standalone/babel.min.js";
import "./libs/prettier/standalone.js";
export class AST {
    static #ast = {
        Babel,
    }
    get babel() {
        return AST.#ast.Babel;
    }
    get Babel() {
        return AST.#ast.Babel;
    }
    get parser() {
        return this.Babel?.packages?.parser;
    }
    get generator() {
        return this.Babel?.packages?.generator;
    }
    get traverse() {
        return this.Babel?.packages?.traverse?.default;
    }
    get types() {
        return this.Babel?.packages?.types;
    }
    get template() {
        return this.Babel?.packages?.template.default;
    }
    parseCode(code, configs = {}) {
        return this.parser.parse(code, {
            sourceType: 'module',
            retainLines: true,
            comments: true,
            tokens: true,
            ...configs
        });
    }
    async parseFile(path, configs) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(response.status + ' ' + response.statusText);
        }
        const code = await response.text();
        return this.parseCode(code, configs);
    }

    traverseAST(ast, config) {
        this.traverse(ast, config);
    }
    //get系列语句 返回值为path/pathList/带path的object 以方便操作
    getReturnValues(fucntionPath) {
        if (!fucntionPath.isFunction()) {
            return [];
        }
        const container = [];
        const body = fucntionPath.get("body");
        if (body.isBlockStatement()) {
            fucntionPath.traverse({
                ReturnStatement: (path) => {
                    if (path.scope === fucntionPath.scope) {
                        container.push(path.get("argument"));
                    }
                }
            });
        } else {
            container.push(body);
        }
        return container;
    }
    getValueOfObject(objectExpressionPath, key) {
        if (!objectExpressionPath.isObjectExpression()) {
            throw new Error('Expected an ObjectExpression path');
        }
        let result = null;
        objectExpressionPath.get('properties').forEach(propertyPath => {
            if (propertyPath.isObjectProperty() || propertyPath.isObjectMethod()) {
                const keyPath = propertyPath.get('key');
                if (keyPath.isIdentifier() && keyPath.node.name === key) {
                    result = propertyPath.get('value');
                }
                else if (keyPath.isStringLiteral() && keyPath.node.value === key) {
                    result = propertyPath.get('value');
                }
            }
        });
        return result;
    }
    getImportInfoList(importDeclarationPath) {
        const results = [];
        const source = importDeclarationPath.node.source.value;
        importDeclarationPath.node.specifiers.forEach(specifier => {
            if (specifier.type === 'ImportDefaultSpecifier') {
                results.push({
                    type: 'default',
                    imported: 'default',
                    local: specifier.local.name,
                    source,
                    specifier
                });
            }
            if (specifier.type === 'ImportSpecifier') {
                const importedName = specifier.imported.name;
                const localName = specifier.local.name;
                results.push({
                    type: importedName === localName ? 'original' : 'renamed',
                    imported: importedName,
                    local: localName,
                    renamed: importedName !== localName,
                    source,
                    specifier
                });
            }
        });
        return results;
    }
    getAppointedExport(filePath, ...names) {
        const result = {};
        const ast = this.parseFile(filePath);
        const config = {};
        if (names.includes("default")) {
            config.ExportDefaultDeclaration = (path) => {
                result.default = path;
            }
        }
        if (names.filter(name => name === "defualt").length >= 1) {
            config.ExportNamedDeclaration = (path) => {
                console.log(path);
            }
        }
        this.traverseAST(ast, config);
    }
    //
    packStatementAsProgram(...statements) {
        return this.types.Program(statements);
    }
    //$ensure系列函数 尝试寻找属性 找不到 则根据指定的值创建一个返回
    $ensureProperty(objectExpressionPath, propertyName, initialValue) {
        const target = this.getValueOfObject(objectExpressionPath, propertyName);
        if (target) return target;
        const container = this.$pushProperty(objectExpressionPath, propertyName, initialValue);
        return container[container.length - 1];
    }
    //$is系列函数 通过给定的值来判断当前path是否满足条件
    $isLiteral(path, literal) {
        switch (true) {
            case (literal instanceof RegExp):
                return path.isRegExpLiteral({
                    pattern: literal.source,
                    flags: literal.flags
                });
            case (typeof literal === "bigint"):
                return path.isBigIntLiteral({
                    value: literal.toString()
                });
            case (typeof literal === "string"):
                return path.isStringLiteral({
                    value: literal
                });
            case (typeof literal === "number"):
                return path.isNumericLiteral({
                    value: literal
                });
            case (typeof literal === "boolean"):
                return path.isBooleanLiteral({
                    value: literal
                });
            case (literal === null):
                return path.isNullLiteral();
            default:
                return false;
        }
    }
    //$replace(With)系列函数 从给定的值直接替换对应的AST节点
    $replaceWithNode(path, val) {
        path.replaceWith(this.$createNode(val));
    }
    $replaceWithLiteral(path, literal) {
        let literalPath = this.$createLiteral(literal);
        if (literalPath) path.replaceWith(literalPath);
    }
    $replaceValueOfObject(path, key, val) {
        const valuePath = this.getValueOfObject(path, key);
        if (valuePath) {
            valuePath.replaceWith(this.$createNode(val));
        } else {
            this.$pushProperty(path, key, val)
        }
    }
    //$push系列函数 从给定的值直接插入对应AST节点
    $pushProperty(path, key, value) {
        return path.pushContainer("properties", this.$createObjectProperty(key, value))
    }
    $pushElement(path, element) {
        return path.pushContainer("")
    }
    //$create系列函数 从给定的值中创建对应的AST节点
    $createNode(val) {
        let node;
        if (Array.isArray(val)) {
            node = this.$createArrayExpression(val);
        } else if (typeof val === "object" && val !== null) {
            node = this.$createObjectExpression(val);
        } else {
            node = this.$createLiteral(val);
        }
        return node;
    }
    $createLiteral(literal) {
        let literalPath;
        const { types } = this;
        switch (true) {
            case (literal instanceof RegExp): {
                literalPath = types.RegExpLiteral(literal.source, literal.flags);
            }; break;
            case (typeof literal === "bigint"): {
                literalPath = types.BigIntLiteral(literal.toString());
            }; break;
            case (typeof literal === "string"): {
                literalPath = types.StringLiteral(literal);
            }; break;
            case (typeof literal === "number"): {
                literalPath = types.NumericLiteral(literal);
            }; break;
            case (typeof literal === "boolean"): {
                literalPath = types.BooleanLiteral(literal);
            }; break;
            case (literal === null): {
                literalPath = types.NullLiteral();
            }; break;
        }
        return literalPath;
    }

    $createArrayExpression(array) {
        const { types } = this;
        return types.ArrayExpression(array.map(element => this.$createNode(element)).filter(Boolean));
    }
    $createFunction(func) {
        return this.parser.parseExpression(func.toString());
    }
    $createIdentifierLiteralAuto(identifier) {
        const { types } = this;
        return this.checkIdentifierValid(identifier) ? types.identifier(identifier) : types.StringLiteral(identifier);
    }
    $createObjectProperty(key, val) {
        let keyPath, valuePath;
        if (typeof key === "string") {
            valuePath = this.$createNode(val);
            if (valuePath) {
                keyPath = this.$createIdentifierLiteralAuto(key)
                return this.types.ObjectProperty(keyPath, valuePath);
            }
        }
    }
    $createObjectMethod(name, func) {
        const { types } = this;
        let namePath, funcPath;
        if (typeof name === "string") {
            funcPath = this.$createFunction(func);
            if (funcPath) {
                namePath = this.checkIdentifierValid(name) ? types.identifier(name) : types.StringLiteral(name);
                return this.types.ObjectMethod("method", namePath, funcPath);
            }
        }
    }
    $createObjectExpression(object) {
        const { types } = this;
        const objectExpression = types.ObjectExpression([])
        for (const k in object) {
            if (object.hasOwnProperty(k)) {
                if (typeof object[k] !== "function") {
                    const property = this.$createObjectProperty(k, object[k]);
                    if (property) objectExpression.properties.push(property);
                } else {
                    const method = this.$createObjectMethod(k, object[k]);
                    if (method) objectExpression.properties.push(method);
                }
            }
        }
        return objectExpression;
    }
    $createMemberExpression(...propertiesOrOptionalOperations) {
        const { types } = this;
        const container = [];
        let flag;
        for (let i = 0; i < propertiesOrOptionalOperations.length; i++) {
            const now = propertiesOrOptionalOperations[i];
            if (now === "?.") {
                flag = true;
            } else {
                container.push(this.checkIdentifierValid(now) ? types.identifier(now) : types.StringLiteral(now));
            }
            if (container.length === 2) {
                container.splice(0, 2,
                    flag ? types.OptionalMemberExpression(container[0], container[1], container[1].type === "StringLiteral", true) :
                        types.MemberExpression(container[0], container[1], container[1].type === "StringLiteral")
                )
                flag = false;
            }
        }
        return container[0];

    }
    $createCallMethodExpression(propertiesOrOptionalOperations, args) {
        return this.types.CallExpression(
            this.$createMemberExpression(...propertiesOrOptionalOperations),
            args.map(arg => this.$createNode(arg))
        )
    }
    $createCallMethodExpressionStatement(propertiesOrOptionalOperations, args) {
        return this.types.ExpressionStatement(
            this.$createCallMethodExpression(propertiesOrOptionalOperations, args)
        )
    }
    $createExpression(expression) {
        return this.parser.parseExpression(String(expression));
    }
    //create系列函数 表示直接从node创建语句 是一个简单的封装
    createIfStatement(condition, consequent) {
        const { types } = this;
        return Array.isArray(consequent) ?
            types.ifStatement(condition, types.BlockStatement(consequent)) :
            types.ifStatement(condition, consequent)
    }
    createLeftRightExpressionStatement(leftNode, operator, rightNode) {
        const { types } = this;
        operator = operator.trim();
        if (['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '|=', '^=', '&='].includes(operator)) {
            return types.ExpressionStatement(types.AssignmentExpression(operator, leftNode, rightNode));
        } else if (['==', '===', '!=', '!==', '<', '<=', '>', '>=', '<<', '>>', '>>>', '+', '-', '*', '/', '%', '**', '|', '^', '&', 'in', 'instanceof'].includes(operator)) {
            return types.ExpressionStatement(types.BinaryExpression(operator, leftNode, rightNode));
        } else if (['&&', '||', '??'].includes(operator)) {
            return types.ExpressionStatement(types.LogicalExpression(operator, leftNode, rightNode));
        }
        return null;
    }
    //
    checkIdentifierValid(identifier) {
        try {
            this.parseCode(`var ${identifier};`);
            return true;
        } catch (err) {
            return false;
        }
    }
    generateCode(ast, configs) {
        const { generator } = this;
        const {code} = generator.generate(ast, {
            //在中文环境中 为了确保不转为unicode 这个选项通常是必要的
            jsescOption: {
                minimal: true,
                escapeOnly: false,
            },
            ...configs
        });
        return code;
    }
    async generateFormattedCode(ast, config = {}, formatConfig = {}) {
        const { generator } = this;
        const { code } = generator.generate(ast, {
            jsescOption: {
                minimal: true,
                escapeOnly: false,
            },
            ...config
        });
        const formatedCode = await prettier.format(code, {
            tabWidth: 4,
            ...formatConfig
        });
        return formatedCode;
    }
}