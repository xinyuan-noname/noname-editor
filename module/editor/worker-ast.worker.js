import { AST } from "./data-ast.mjs";
const ROOT_PATH = new URL(import.meta.url).origin;
const resolvePath = (basePath, ...paths) => {
    try {
        basePath = new URL(basePath).href;
    } catch (err) {
        paths.unshift(basePath);
        basePath = ROOT_PATH;
    }
    const resultPath = paths.reduce((acc, path) => {
        return acc.endsWith("/") ? acc + path : acc + "/" + path;
    }, basePath);
    return new URL(resultPath).href;
}
const astObject = new AST();
const createNewCharacterExpressionParamNode = (info, pattern = "object") => {
    switch (pattern) {
        case "object": {
            return astObject.$createNode(info);
        }
        case "array": {
            //因为lib中有worker环境不支持的函数 而且Character类的定义文件中也有对lib的引用 只能强行迁移
            const character = {
                ...info,
                get 0() {
                    return this.sex;
                },
                get 1() {
                    return this.group;
                },
                get 2() {
                    if (this.hujia > 0) return `${this.hp}/${this.maxHp}/${this.hujia}`;
                    if (this.hp !== this.maxHp) return `${this.hp}/${this.maxHp}`;
                    return this.hp;
                },
                get 3() {
                    return this.skills;
                },
                get 4() {
                    const trashes = [],
                        character = this;
                    if (character.groupInGuozhan) {
                        trashes.push(`gzgroup:${character.groupInGuozhan}`);
                    }
                    if (character.isZhugong) {
                        trashes.push("zhu");
                    }
                    if (character.isUnseen) {
                        trashes.push("unseen");
                    }
                    if (character.isMinskin) {
                        trashes.push("minskin");
                    }
                    if (character.hasSkinInGuozhan) {
                        trashes.push("gzskin");
                    }
                    if (character.isBoss) {
                        trashes.push("boss");
                    }
                    if (character.isChessBoss) {
                        trashes.push("chessboss");
                    }
                    if (character.isJiangeBoss) {
                        trashes.push("jiangeboss");
                    }
                    if (character.isJiangeMech) {
                        trashes.push("jiangemech");
                    }
                    if (character.isBossAllowed) {
                        trashes.push("bossallowed");
                    }
                    if (character.isHiddenBoss) {
                        trashes.push("hiddenboss");
                    }
                    if (character.isAiForbidden) {
                        trashes.push("forbidai");
                    }
                    if (character.isFellowInStoneMode) {
                        trashes.push("stone");
                    }
                    if (character.isHiddenInStoneMode) {
                        trashes.push("stonehidden");
                    }
                    if (character.isSpecialInStoneMode) {
                        trashes.push("stonespecial");
                    }
                    if (character.hasHiddenSkill) {
                        trashes.push("hiddenSkill");
                    }
                    if (character.groupBorder) {
                        trashes.push(`border:${character.groupBorder}`);
                    }
                    if (character.dualSideCharacter) {
                        trashes.push(`duaslside:${character.dualSideCharacter}`);
                    }
                    if (character.doubleGroup?.length > 0) {
                        trashes.push(`doublegroup:${character.doubleGroup.join(":")}`);
                    }
                    if (character.clans?.length > 0) {
                        character.clans.forEach(item => trashes.push(`clan:${item}`));
                    }
                    if (character.initFilters?.length > 0) {
                        trashes.push(`InitFilters:${character.initFilters.join(":")}`);
                    }
                    if (character.img) {
                        trashes.push(`img:${character.img}`);
                    }
                    if (character.dieAudios?.length > 0) {
                        character.dieAudios.forEach(item => trashes.push(`die:${item}`));
                    }
                    if (character.tempname?.length > 0) {
                        trashes.push(`tempname:${character.tempname.join(":")}`);
                    }
                    return trashes.concat(character.trashBin);
                },
                get 5() {
                    return this.extraModeData;
                }
            };
            if (typeof character.maxHp !== "number") character.maxHp = character.hp;
            const { "0": $0, "1": $1, "2": $2, "3": $3, "4": $4, "5": $5 } = character;
            return astObject.$createNode([$0, $1, $2, $3, $4, $5]);
        }
    }
}
const createTranslateAssignmentExpression = (en, cn) => {
    return astObject.template("%%left%% = %%cn%%;")({
        left: astObject.$createMemberExpression("lib", "translate", en),
        cn: astObject.$createNode(cn)
    });
}
const genCharacterCode = (characterInfo, pattern) => {
    const { extension, packageId, id, intro, pinyin, dieAudioText, name, ...basicInfo } = characterInfo;
    const statements = [];
    if (packageId) {
        const createCharacter = astObject.template("%%left%% = new lib.element.Character(%%basicInfo%%);")({
            left: astObject.$createMemberExpression("lib", "characterPack", packageId, id),
            basicInfo: createNewCharacterExpressionParamNode(basicInfo, pattern)
        });
        const pushCharacter = astObject.createIfStatement(
            astObject.$createCallMethodExpression(["lib", "config", "characters", "includes"], [packageId]),
            [astObject.createLeftRightExpressionStatement(
                astObject.$createMemberExpression("lib", "character", id),
                "=",
                astObject.$createMemberExpression("lib", "characterPack", packageId, id)
            )]
        );
        statements.push(createCharacter, pushCharacter);
    } else {
        const createCharacter = astObject.template("%%left%% = new lib.element.Character(%%basicInfo%%);")({
            left: astObject.$createMemberExpression("lib", "character", id),
            basicInfo: createNewCharacterExpressionParamNode(basicInfo, pattern)
        });
        statements.push(createCharacter)
    }
    statements.push(createTranslateAssignmentExpression(id, name));
    if (intro) statements.push(astObject.createLeftRightExpressionStatement(
        astObject.$createMemberExpression("lib", "characterIntro", id),
        "=",
        astObject.$createNode(intro)
    ));
    if (pinyin) statements.push(astObject.createLeftRightExpressionStatement(
        astObject.$createMemberExpression("lib", "pinyins", id),
        "=",
        astObject.$createNode(pinyin)
    ))
    const ast = astObject.packStatementAsProgram(...statements);
    return astObject.generateCode(ast);
}
const genCharacterSortCode = (characterSortInfo, packageExistence) => {
    const { id, characterSort, characterSortName, packageId } = characterSortInfo;
    const statements = [];
    if (packageExistence === false) {
        statements.push(astObject.createLeftRightExpressionStatement(
            astObject.$createMemberExpression("lib", "characterSort", packageId),
            "=",
            astObject.$createNode({})
        ))
    }
    if (characterSortName) {
        statements.push(astObject.createLeftRightExpressionStatement(
            astObject.$createMemberExpression("lib", "characterSort", packageId, characterSort),
            "=",
            astObject.$createNode([])
        ));
        createTranslateAssignmentExpression(characterSort, characterSortName);
    }
    statements.push(
        astObject.$createCallMethodExpressionStatement(
            ["lib", "characterSort", packageId, characterSort, "push"],
            [id]
        )
    );
    const ast = astObject.packStatementAsProgram(...statements);
    return astObject.generateCode(ast);
}
const getExtensionAllPackage = async (extensionName) => {
    const packageInfo = {
        extension: [],
        character: [],
        card: []
    }
    const moduleList = [];
    const importInfoMap = new Map();
    try {
        const rootFilePath = resolvePath("extension", extensionName, "extension.js")
        const rootFileDirPath = resolvePath(`extension/${extensionName}/`);
        const extensionAst = await astObject.parseFile(rootFilePath);
        let currentFilePath = rootFilePath;
        let currentDirPath = rootFileDirPath; const pathCheck = (path) => {
            return !moduleList.includes(path) && path.includes(rootFileDirPath);
        }
        const getImportInfo = (path) => {
            if (!importInfoMap.has(path)) {
                const importedList = {
                    specifiers: {},
                    files: []
                }
                importInfoMap.set(path, importedList);
                return importedList;
            } else {
                return importInfoMap.get(path);
            }
        }
        const CallExpression = (path) => {
            const callee = path.get('callee')
            if (callee.matchesPattern('game.import')) {
                const type = path.get("arguments.0");
                const content = path.get("arguments.1");
                const returnValuePaths = astObject.getReturnValues(content);
                returnValuePaths.forEach((returnValuePath) => {
                    let configObjectExpressionPath;
                    if (returnValuePath.isObjectExpression()) {
                        configObjectExpressionPath = returnValuePath;
                    } else if (returnValuePath.isIdentifier()) {
                        const binding = returnValuePath.scope.getBinding(returnValuePath.node.name);
                        if (!binding) return;
                        configObjectExpressionPath = binding.path.get("init");
                    }
                    if (!configObjectExpressionPath) return;
                    let packageId;
                    const valuePath = astObject.getValueOfObject(configObjectExpressionPath, "name")
                    if (valuePath?.isStringLiteral()) {
                        packageId = valuePath.node.value;
                    }
                    packageInfo[type.node.value].push({
                        packageId,
                        file: currentFilePath
                    });
                })
            } else if (callee.matchesPattern("lib.init.js") || callee.matchesPattern("lib.init.promises.js")) {
                const requestJSDirPath = path.get("arguments.0");
                const requestJSFileNamePath = path.get("arguments.1");
                let jsDir, jsName;
                //这里暂时只分析字符串 如果是标识符 其情况则比较复杂
                if (requestJSDirPath.isStringLiteral()) {
                    jsDir = requestJSDirPath.node.value;
                }
                if (jsDir.startsWith("http")) return;
                if (requestJSFileNamePath.isStringLiteral()) {
                    jsName = requestJSDirPath.node.value;
                }
                if (jsDir && jsName) {
                    const absolutePath = resolvePath(requestJSDirPath.node.value, requestJSFileNamePath.node.value + ".js");
                    if (pathCheck(absolutePath)) {
                        moduleList.push(absolutePath);
                    }
                }
            }
        }
        const ImportDeclaration = (path) => {
            const infoList = astObject.getImportInfoList(path);
            const currentImportInfoList = getImportInfo(currentFilePath);
            const absolutePath = resolvePath(currentDirPath, path.node.source.value);
            if (pathCheck(absolutePath)) moduleList.push(absolutePath);
            infoList.length ? infoList.forEach(info => {
                delete info.specifier;
                currentImportInfoList.specifiers[info.local] = info;
            }) : currentImportInfoList.files.push(path.node.source.value);
        }
        astObject.traverseAST(extensionAst, {
            ImportDeclaration,
            CallExpression,
            ExportDefaultDeclaration(path) {
                const exportTypePath = [].concat(path.getAllPrevSiblings(), path.getAllNextSiblings()).find((sibling) => {
                    if (!sibling.isExportNamedDeclaration()) return false;
                    const declaration = sibling.get("declaration");
                    if (!declaration?.isVariableDeclaration?.()) return false;
                    const { init, id } = declaration.get("declarations.0").node;
                    if (id.name !== "type" || init.value !== "extension") return false;
                    return true;
                });
                if (!exportTypePath) return;
                const content = path.get("declaration");
                const returnValuePaths = astObject.getReturnValues(content);
                returnValuePaths.forEach((returnValuePath) => {
                    let configObjectExpressionPath;
                    if (returnValuePath.isObjectExpression()) {
                        configObjectExpressionPath = returnValuePath;
                    } else if (returnValuePath.isIdentifier()) {
                        const binding = returnValuePath.scope.getBinding(returnValuePath.node.name);
                        if (!binding) return;
                        configObjectExpressionPath = binding.path.get("init");
                    }
                    if (!configObjectExpressionPath) return;
                    let packageId;
                    const valuePath = astObject.getValueOfObject(configObjectExpressionPath, "name")
                    if (valuePath?.isStringLiteral?.()) {
                        packageId = valuePath.node.value;
                    }
                    packageInfo.extension.push({
                        packageId,
                        file: currentFilePath
                    });
                })
            }
        });
        //实际上 这个set会随着遍历不断变长 我们可以依次遍历完 全部的module
        for (const filePath of moduleList) {
            const fileDirPath = resolvePath(filePath, "..");
            const ast = await astObject.parseFile(filePath);
            currentFilePath = filePath; currentDirPath = fileDirPath;
            astObject.traverseAST(ast, {
                ImportDeclaration,
                CallExpression,
            });
        }
        return {
            ok: true,
            moduleList,
            packageInfo,
            importInfoMap: Array.from(importInfoMap)
        };
    } catch (err) {
        console.error(err);
        return {
            ok: false,
            moduleList,
            packageInfo,
            importInfoMap: Array.from(importInfoMap)
        }
    }
}
const modifyCharacterClassInfo = (characterSetting, characterId, basicInfo, importType) => {
    let pattern = "object";
    const targetProperty = astObject.getValueOfObject(characterSetting, characterId);
    if (importType === "extension") {
        pattern = "array"
    } else {
        if (characterSetting.get("properties")?.[0]?.get?.("value")?.isArrayExpression?.()) {
            pattern = "array";
        }
    }
    if (targetProperty) {
        targetProperty.replaceWith(createNewCharacterExpressionParamNode(basicInfo, pattern));
    } else {
        characterSetting.pushContainer(
            "properties",
            astObject.types.ObjectProperty(
                astObject.$createIdentifierLiteralAuto(characterId),
                createNewCharacterExpressionParamNode(basicInfo, pattern)
            )
        )
    }
}
const getTargetPackageConfigPath = (ast, packageId, importType) => {
    let targetPackage;
    astObject.traverseAST(ast, {
        CallExpression: (path) => {
            const callee = path.get('callee')
            if (callee.matchesPattern('game.import')) {
                const type = path.get("arguments.0");
                if (type.node.value !== importType) return;
                const content = path.get("arguments.1");
                let configObjectExpressionPath = null;
                astObject.getReturnValues(content).forEach(returnValuePath => {
                    if (returnValuePath.isObjectExpression()) {
                        configObjectExpressionPath = returnValuePath;
                    } else if (returnValuePath.isIdentifier()) {
                        const binding = returnValuePath.scope.getBinding(returnValuePath.node.name);
                        if (!binding) return;
                        configObjectExpressionPath = binding.path.get("init");
                    }
                    const valuePath = astObject.getValueOfObject(configObjectExpressionPath, "name")
                    if (valuePath?.isStringLiteral?.() && packageId === valuePath?.node?.value) return true;
                    configObjectExpressionPath = null;
                });
                if (!configObjectExpressionPath) return;
                targetPackage = configObjectExpressionPath;
                path.stop();
            }
        },
        ExportDefaultDeclaration: (path) => {
            const exportTypePath = [].concat(path.getAllPrevSiblings(), path.getAllNextSiblings()).find((sibling) => {
                if (!sibling.isExportNamedDeclaration()) return false;
                const declaration = sibling.get("declaration");
                if (!declaration?.isVariableDeclaration?.()) return false;
                const { init, id } = declaration.get("declarations.0").node;
                if (id.name !== "type" || init.value !== "extension") return false;
                return true;
            });
            if (!exportTypePath) return;
            const content = path.get("declaration");
            const returnValuePaths = astObject.getReturnValues(content);
            returnValuePaths.forEach((returnValuePath) => {
                let configObjectExpressionPath;
                if (returnValuePath.isObjectExpression()) {
                    configObjectExpressionPath = returnValuePath;
                } else if (returnValuePath.isIdentifier()) {
                    const binding = returnValuePath.scope.getBinding(returnValuePath.node.name);
                    if (!binding) return;
                    configObjectExpressionPath = binding.path.get("init");
                }
                if (!configObjectExpressionPath) return;
                const valuePath = astObject.getValueOfObject(configObjectExpressionPath, "name")
                if (valuePath?.node?.value === packageId) {
                    targetPackage = configObjectExpressionPath;
                    path.stop();
                }
            })
        }
    })
    return targetPackage;
}
const modifyCharacterPackageCode = async (dataList, extensionModuleConfig) => {
    let importType;
    const { importInfoMap, packageInfo } = extensionModuleConfig;
    const {
        id: characterId,
        characterSort, characterSortName, packageId, extension,
        intro, pinyin, dieAudioText, name: characterName, ...basicInfo
    } = dataList;
    //注意：intro / pinyin / dieAudioText 被显式剔出 basicInfo，但本函数只写入了 character 与 translate 两处，
    //即 intro、pinyin、dieAudioText 目前不会随「一键导出」写回目标文件（仅存于编辑器草稿）。
    const modifedFileContentMap = {};
    //找到对应武将包路径
    const { file: filePath } = packageInfo.character.find(content => {
        if (content.packageId === packageId) {
            importType = "character";
            return true;
        }
    }) || packageInfo.extension.find((content) => {
        if (content.packageId === packageId) {
            importType = "extension";
            return true;
        }
    }) || {};
    if (filePath) {
        const modifedFileContentMapSet = (path, val) => {
            modifedFileContentMap[decodeURI(path.replace(origin, ""))] = val;
        }
        let currentFilePath = filePath;
        let currentDirPath = resolvePath(filePath, "..");
        const ast = await astObject.parseFile(filePath);
        const configObjectExpressionPath = getTargetPackageConfigPath(ast, packageId, importType);
        const characterConfigObject = importType === "character" ? configObjectExpressionPath : (() => {
            const temp = astObject.$ensureProperty(configObjectExpressionPath, "package", {});
            return astObject.$ensureProperty(temp, "character", {});
        })();
        const characterSetting = astObject.$ensureProperty(characterConfigObject, "character", {});
        if (characterSetting.isObjectExpression()) {
            modifyCharacterClassInfo(characterSetting, characterId, basicInfo, importType);
            modifedFileContentMapSet(filePath, { ast });
        }
        if (characterName) {
            const characterTranslate = astObject.$ensureProperty(characterConfigObject, "translate", {});
            if (characterTranslate.isObjectExpression()) {
                astObject.$replaceValueOfObject(characterTranslate, characterId, characterName);
            }
        }
        if (characterSort) {
            //尚未实现：characterSort / characterSortName 在解构时已被剔出 basicInfo，
            //这里也没有把它们写入目标文件的 characterSort 配置，
            //因此「一键导出」目前不会更新分包排序（分包/排序仅停留在编辑器草稿里）。
        }
        for (let k in modifedFileContentMap) {
            modifedFileContentMap[k].content = await astObject.generateCode(modifedFileContentMap[k].ast);
            delete modifedFileContentMap[k].ast;
        }
    }
    return modifedFileContentMap;
}
addEventListener("message", async ({ data: { order, data } }) => {
    switch (order) {
        case "getExtensionAllPackage": {
            const result = await getExtensionAllPackage(...data);
            postMessage(result);
        }; break;
        case "genCharacterCode": {
            postMessage(genCharacterCode(...data));
        }; break;
        case "genCharacterSortCode": {
            postMessage(genCharacterSortCode(...data));
        }; break;
        case "modifyCharacterPackageCode": {
            const result = await modifyCharacterPackageCode(...data)
            postMessage(result)
        }; break;
        default: {
            postMessage(null);
        }
    }
})