"use strict";

var $action = $action || {};
(function ($action) {

    class CommandManager {
        constructor(ui, scriptManager) {
            this._commands = {};
            this._commandCount = 0;
            this._ui = ui; // The instance of UI that is creating this instance
            this._scriptManager = scriptManager;
            this.init();

            this._posTagger = new POSTagger();
            this._parser = new $action.Parser();
        }

        get Commands() {
            return this._commands;
        }

        init() {
            // Initialize a static list of all default computed style values so that command computed styles can be filtered to only non-default values for comparison later
            var element = document.createElement("div");
            $('html').append(element);
            var computed = window.getComputedStyle(element);
            this._defaultComputedStyles = JSON.parse(JSON.stringify(computed)); // Clone computed styles list
            $(element).remove();
        }

        hasCommand(commandID) {
            return this._commands[commandID] != undefined;
        }

        findDuplicate(command) {
            // Filter duplicates by comparing whether two handlers are the same
            // TODO: Make smarter
            if (command.eventType != 'default') {
                var keys = Object.keys(this._commands);
                for (var i = 0; i < keys.length; i++) {
                    let cmd = this._commands[keys[i]];
                    if (cmd.Handler == command.handler) {
                        return true;
                    }
                }
            }
        }

        addCommand(command) {
            // let duplicate = this.findDuplicate(command); // Look for duplicate commands
            // TODO: Fix this later
            if (command.global) {
                command.eventType = $action.GlobalEventHandlersMap[command.eventType];
            }
            if ((command.eventType == 'default' || $action.UserInvokeableEvents.indexOf(command.eventType) > -1 || $action.GlobalEventHandlers.indexOf(command.eventType) > -1)) {
                var element = $action.getElementFromID(command.elementID);
                var newCommand = new $action.Command(command.id, command.elementID, command.eventType, command.handler)
                this.initMetadata(newCommand);

                if (command.commandArguments) {
                    if (command.commandArguments instanceof Array) {
                        for (var i = 0; i < command.commandArguments.length; i++) {
                            let arg = command.commandArguments[i];
                            this.addArgumentToMetadata(newCommand, arg);
                        }
                    } else {
                        this.addArgumentToMetadata(newCommand, command.commandArguments);
                    }
                }

                this.createArgumentsMap(newCommand);
                //  console.log("adding new command " + command.eventType + " " + command.handler + " " + command.elementID);

                this._commandCount++;

                // Add the command to the command map
                this._commands[command.id] = newCommand;
                return true;
            }
            return false; // Returns whether the command was successfully added
        };


        removeCommand(command) {
            var storedCommand = this._commands[command.id];
            if (storedCommand) {
                this._commandCount--;
                this._ui.removeCommand(storedCommand, this._commandCount);
            }
        };

        organizeCommands() {
            var organizer = this._ui.Organizer;
            if (organizer) {
                var commandOrder = organizer(this._commands);
                for (var i = 0; i < commandOrder.length; i++) {
                    let containerLabel = commandOrder[i].container;
                    let cmds = commandOrder[i].commands;
                    this._ui.appendCommandGroup(containerLabel, cmds);
                }
            }
        };

        updateCommandEnabledStates(commandStates) {
            var keys = Object.keys(commandStates);
            for (var i = 0; i < keys.length; i++) {
                let commandState = commandStates[keys[i]];
                let command = this._commands[keys[i]];
                if (command.DataDependent != commandState) {
                    command.DataDependent = commandState;
                    this._ui.updateCommandEnabledState(command, commandState);
                }
            }
        }

        updateVisibleCommands() {
            var keys = Object.keys(this._commands);
            for (var i = 0; i < keys.length; i++) {
                let command = this._commands[keys[i]];
                this._ui.updateCommandVisibleState(command, command.visible());
            }
        }

        linkFunctionCalls(ast) {
            // Look for any function calls (side-effects)
            var callList = {
                lookFor: "CallExpression",
                within: "Program",
                items: []
            }

            $action.ASTAnalyzer.searchAST(ast, callList);

            // Go through the returned list of function expressions and link them to those with the same name in the script cache
            for (var i = 0; i < callList.items.length; i++) {
                var call = callList.items[i];
                var name = this.getCallReference(call);
                // Search through the stored list of functions
                if (name && name.length) {
                    var referencedFunc = this._scriptManager.Functions[name];
                    if (referencedFunc) {
                        call.referencedFunction = referencedFunc;
                    }
                }
            }
        };

        linkAssignments(ast) {
            // Look for any function calls (side-effects)
            var assignmentExpressionsInProgram = {
                lookFor: "AssignmentExpression",
                within: "Program",
                items: []
            }

            $action.ASTAnalyzer.searchAST(ast, assignmentExpressionsInProgram);

            var variableDeclaratorsInProgram = {
                lookFor: "VariableDeclarator",
                within: "Program",
                items: []
            }

            $action.ASTAnalyzer.searchAST(ast, variableDeclaratorsInProgram);
            var declaratorMap = {};
            for (let i = 0; i < variableDeclaratorsInProgram.items.length; i++) {
                let declarator = variableDeclaratorsInProgram.items[i];
                if (declarator && declarator.id && declarator.id.name) {
                    declaratorMap[declarator.id.name] = declarator;
                }
            }

            for (var i = 0; i < assignmentExpressionsInProgram.items.length; i++) {
                var assignment = assignmentExpressionsInProgram.items[i];
                var name = this.getAssignmentReference(assignment);
                // Search through the stored list of functions
                if (name && name.length) {
                    var referencedIdentifier = this._scriptManager.Declarations[name];
                    if (referencedIdentifier) {
                        // The assigned variable was originally declared elsewhere in the function
                        assignment.referencedIdentifier = referencedIdentifier;
                    } else {
                        var referencedFunction = this._scriptManager.Functions[name];
                        if (referencedFunction) {
                            assignment.referencedIdentifier = referencedFunction;
                        } else {
                            // The assigned variable was originally declared in the handler
                            var variableDeclarator = declaratorMap[name];
                            if (variableDeclarator) {
                                assignment.referencedIdentifier = variableDeclarator;
                            }
                        }
                    }
                }
            }

            // Find UpdateExpressions as well
        };

        // Can be FunctionExpression, FunctionDefinition, or ArrowExpression
        getFunctionName(functionExpr) {
            var fnName = "";
            if (functionExpr.id && functionExpr.id.type == "Identifier") {
                fnName = functionExpr.id.name;
            } else if (functionExpr.id) {
                fnName = functionExpr.id;
            }
            return fnName;
        }

        // Can be FunctionExpression, FunctionDefinition, or ArrowExpression
        getCallReference(callExpr) {
            var callRef = "";
            if (callExpr.callee.type == "Identifier") {
                callRef = callExpr.callee.name;
            } else if (callExpr.callee.type == "MemberExpression") {
                if (callExpr.callee.property.type == "Identifier") {
                    callRef = callExpr.callee.property.name;
                }
            }

            return callRef;
        }

        // Can be AssignmentExpression
        getAssignmentReference(assignmentExpr) {
            // types of expressions that can be on the left hand side of teh assignment
            // Left --
            // Identifier - Look for identifier.name in the list of declarations
            // StaticMemberExpression (el.x) - Find the object name,call recursively if left hand is another static member or computed)
            // ComputedMemberExpression - Same as above
            // ThisExpression - Ignore
            // ArrayExpression - Ignore
            // ObjectExpressoin - Ignore
            // FunctionExpression - Ignore
            // Arrow Expression - Ignore
            // Sequence Expression - Ignore
            var assignmentRef = "";
            if (assignmentExpr.left) {
                if (assignmentExpr.left.type == "Identifier") {
                    assignmentRef = assignmentExpr.left.name;
                } else if (assignmentExpr.left.type == "MemberExpression") {
                    assignmentRef = this.getBaseMemberExpressionReference(assignmentExpr.left);
                }
            }
            // TODO: more advanced calls later
            return assignmentRef;
        }

        /**
         * Gets the base reference of an object. For example, for 'myObj.property.test = true', it would return 'myObj'
         * @private
         * @property undefined
         */
        getBaseMemberExpressionReference(expression) {
            if (expression.object && expression.object.type == "Identifier" && expression.object.name) {
                return expression.object.name;
            } else {
                if (expression.type == "CallExpression") {
                    return this.getBaseMemberExpressionReference(expression.callee);
                } else {
                    return this.getBaseMemberExpressionReference(expression.object);
                }
            }
        }

        filterTagNodes(text) {
            // Look for opening and closing brackets. Assume this is a text node that is also a tag
            var first = text.substring(0, 1);
            var last = text.substring(text.length - 1, text.length);
            if (first == "<" && last == ">") {
                return false;
            }

            return true;
        }

        parsePhrase(labelMetadata, phrase) {
            var toLower = phrase.toLowerCase();
            var tagged = this._parser.parse(phrase);
            var split = this._parser.split(phrase);
            if (split && split.length > 1 && !tagged.nonEnglish.length) {
                let first = split[0].toLowerCase();
                var sentence = split.toString().replace(/\,/g, " ").toLowerCase();
                sentence = _.upperFirst(sentence);
                if (tagged.verbs.indexOf(first) > -1) {
                    labelMetadata.imperativePhrases.push(sentence);
                } else {
                    labelMetadata.phrases.push(sentence);
                }
            } else {
                // Not a phrase
                // Find verbs and nouns
                // Convert 
                labelMetadata.verbs = labelMetadata.verbs.concat(tagged.verbs);
                labelMetadata.nouns = labelMetadata.nouns.concat(tagged.nouns);
                labelMetadata.other = labelMetadata.other.concat(tagged.other);
            }
        }

        parseURL(labelMetadata, labelString) {
            var chunks = labelString.split(/\//);
            if (chunks && chunks.length) {
                for (var i = 0; i < chunks.length; i++) {
                    this.parsePhrase(labelMetadata, chunks[i]);
                }
            }
        }

        parseLabel(labelMetadata, labelString) {
            var sentences = labelString.split(/\.|\?|!/);
            var split = [];

            if (sentences.length > 1) {
                for (var i = 0; i < sentences.length; i++) {
                    this.parsePhrase(labelMetadata, sentences[i].toLowerCase());
                }
            } else {
                let sentence = sentences[0].trim();
                this.parsePhrase(labelMetadata, sentence);
            }
        }

        parseLabelFor(command, element) {
            // Check if the element has an ID 
            if (!element.attrributes) {
                return;
            }

            var id = element.attributes.id;
            if (id) {
                // Look for a label element with for attribute matching this ID
                var label = $("[for='" + id.value + "']");
                if (label && label.length && label[0].textContent.length) {
                    this.parseLabel(command.LabelMetadata.elementLabels, label[0].textContent);
                }
            }
        }

        parseElement(command, element) {
            // Find all of the tags
            // After searching text nodes, search attributes for imperative labels
            // First, look in global attributes 
            // Then look in attributes specific to that tag name
            // Should we search in any particular order? 
            if (!element.attributes) {
                return; // Document & Window do not have inline attributes
            }

            var globalAttrs = $action.LabelAttributes.GLOBAL;
            if (globalAttrs.length) {
                for (var i = 0; i < globalAttrs.length; i++) {
                    let globalAttr = globalAttrs[i];
                    let attr = element.attributes[globalAttr];
                    if (attr) {
                        let attrValue = attr.value;
                        if (attrValue && attrValue.length) {
                            this.parseLabel(command.LabelMetadata.elementLabels, attrValue);
                        }
                    }
                }
            }

            var nonGlobalAttrs = $action.LabelAttributes[element.tagName];
            if (nonGlobalAttrs) {
                for (var j = 0; j < nonGlobalAttrs.length; j++) {
                    let nonGlobalAttr = element.attributes[nonGlobalAttrs[j]];
                    if (nonGlobalAttr) {
                        let nonGlobalVal = nonGlobalAttr.value;
                        if (nonGlobalVal && nonGlobalVal.length) {
                            if ($action.LabelURLAttributes.indexOf(nonGlobalAttrs[j]) > -1) {
                                this.parseURL(command.LabelMetadata.elementLabels, nonGlobalVal);
                            } else {
                                this.parseLabel(command.LabelMetadata.elementLabels, nonGlobalVal);
                            }
                        }
                    }
                }
            }
        }

        initComputedStyles(command, element) {
            var computedStyles = window.getComputedStyle(element);
            var keys = Object.keys(computedStyles);
            var result = {};
            for (var i = 0; i < keys.length; i++) {
                // If the computed style is not equal to the default value, store it
                var style = computedStyles[keys[i]];
                var defaultStyle = this._defaultComputedStyles[keys[i]];
                if (style != defaultStyle) {
                    result[keys[i]] = style;
                }
            }

            command.ComputedStyles = result;
        }

        /**
         * Initialize all of the command  metadata
         * @private
         * @property undefined
         */
        initMetadata(command) {
            // Get labels
            // Retrieve all of the Text nodes on the element
            // Tag them with the parts of speech. 
            var element = command.Element;
            if (element && !(element instanceof Window) && !(element instanceof Document) &&
                !(element.tagName == "BODY")) {
                var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
                var node = walker.nextNode();
                while (node) {
                    if (node.parentNode && node.parentNode.tagName != "SCRIPT") {
                        // split the string by space separators
                        var trimmed = node.textContent.replace(/\s/g, ' ').trim();
                        if (trimmed && trimmed.length && this.filterTagNodes(trimmed)) {
                            this.parseLabel(command.LabelMetadata.elementLabels, trimmed);
                        }
                    }

                    node = walker.nextNode();
                }

                this.parseElement(command, element);
                this.parseLabelFor(command, element);

                // Search descendants for potential tags
                var desc = $(element).find("*");
                for (var k = 0; k < desc.length; k++) {
                    this.parseElement(command, desc[k]);
                }
            }

            if (command.EventType != 'default') {
                this.parseHandler(command);
            }
        };

        parseFunctionCallsOutsideConditionals(command, ast) {
            var findFunctionCallExpressionsOutsideConditionals = {
                outside: ["IfStatement", "ConditionalExpression", "WhileStatement", "DoWhileStatement", "ForStatement", "ForInStatement", "ForOfStatement", "SwitchStatement"],
                lookFor: ["CallExpression"],
                items: []
            }

            $action.ASTAnalyzer.searchAST(ast, findFunctionCallExpressionsOutsideConditionals);

            // Visitor for searching identifiers within a node
            var findIdentifiersInNode = {
                lookFor: ["Identifier", "Literal"],
                items: []
            }

            // Within the call expressions that have a referenced function, find and parse the identifiers
            for (var i = 0; i < findFunctionCallExpressionsOutsideConditionals.items.length; i++) {
                let item = findFunctionCallExpressionsOutsideConditionals.items[i];
                if (item && item.referencedFunction) {
                    $action.ASTAnalyzer.searchAST(item, findIdentifiersInNode);
                }
            }

            // Parse the located identifiers
            this.parseIdentifiers(command.LabelMetadata.expressionCalls, findIdentifiersInNode.items);
        }

        parseFunctionCallsInsideConditional(command, keyCodes, dependency, conditional) {
            // Find all function call expressions inside conditionals
            var findFunctionCallExpressionsInsideConditionals = {
                outside: ["IfStatement", "ConditionalExpression", "WhileStatement", "DoWhileStatement", "ForStatement", "ForInStatement", "ForOfStatement", "SwitchStatement"],
                lookFor: ["CallExpression"],
                items: []
            }

            $action.ASTAnalyzer.searchAST(conditional, findFunctionCallExpressionsInsideConditionals);

            // Visitor for searching identifiers within a node
            var findIdentifiersInNode = {
                lookFor: ["Identifier", "Literal"],
                items: []
            }

            // Within the call expressions that have a referenced function, find and parse the identifiers
            for (var i = 0; i < findFunctionCallExpressionsInsideConditionals.items.length; i++) {
                let item = findFunctionCallExpressionsInsideConditionals.items[i];
                if (item && item.referencedFunction) {
                    $action.ASTAnalyzer.searchAST(item, findIdentifiersInNode);
                }
            }

            // Object to hold the data
            if (findIdentifiersInNode.items.length) {
                var data = { // For each conditional expression
                    keyCodeValues: keyCodes,
                    pathCondition: dependency,
                    phrases: [],
                    imperativePhrases: [],
                    nouns: [],
                    verbs: [],
                    other: []
                }

                command.LabelMetadata.conditionals.expressionCalls.push(data);
                this.parseIdentifiers(data, findIdentifiersInNode.items);
            }
        }


        parseAssignmentExpressionsOutsideConditionals(command, ast) {
            var findAssignmentExpressionsOutsideConditionals = {
                lookFor: ["AssignmentExpression"],
                outside: ["IfStatement", "ConditionalExpression", "WhileStatement", "DoWhileStatement", "ForStatement", "ForInStatement", "ForOfStatement", "SwitchStatement"],
                items: []
            }

            $action.ASTAnalyzer.searchAST(ast, findAssignmentExpressionsOutsideConditionals);

            // Within the assignment expressions that have a referenced identifier, find and parse the identifiers
            for (var i = 0; i < findAssignmentExpressionsOutsideConditionals.items.length; i++) {
                let item = findAssignmentExpressionsOutsideConditionals.items[i];
                var findIdentifiersInNode = {
                    lookFor: ["Identifier", "Literal"],
                    items: []
                }

                if (item && item.referencedIdentifier) {
                    $action.ASTAnalyzer.searchAST(item, findIdentifiersInNode);

                    // Then parse all the identifers found within the collection of items
                    this.parseIdentifiers(command.LabelMetadata.assignments, findIdentifiersInNode.items);
                }
            }
        }

        parseAssignmentExpressionsInsideConditional(command, keyCodes, dependency, conditional) {
            var findAssignmentExpressionsInsideConditionals = {
                lookFor: ["AssignmentExpression"],
                outside: ["IfStatement", "ConditionalExpression", "WhileStatement", "DoWhileStatement", "ForStatement", "ForInStatement", "ForOfStatement", "SwitchStatement"],
                items: []
            }


            $action.ASTAnalyzer.searchAST(conditional, findAssignmentExpressionsInsideConditionals);

            // Within the assignment expressions that have a referenced identifier, find and parse the identifiers
            for (var i = 0; i < findAssignmentExpressionsInsideConditionals.items.length; i++) {
                let item = findAssignmentExpressionsInsideConditionals.items[i];
                var findIdentifiersInNode = {
                    lookFor: ["Identifier", "Literal"],
                    items: []
                }

                if (item && item.referencedIdentifier) {
                    $action.ASTAnalyzer.searchAST(item.left, findIdentifiersInNode);
                    $action.ASTAnalyzer.searchAST(item.right, findIdentifiersInNode);

                    if (findIdentifiersInNode.items.length) {
                        var data = { // For each conditional expression
                            keyCodeValues: keyCodes,
                            pathCondition: dependency,
                            phrases: [],
                            imperativePhrases: [],
                            nouns: [],
                            verbs: [],
                            other: []
                        }

                        command.LabelMetadata.conditionals.assignments.push(data);

                        // Then parse all the identifers found within the collection of items
                        this.parseIdentifiers(data, findIdentifiersInNode.items);
                    }
                }
            }
        }

        parseExpressionStatementsOutsideConditionals(command, ast) {
            var findExpressionStatementsOutsideConditionals = {
                lookFor: ["ExpressionStatement"],
                outside: ["IfStatement", "ConditionalExpression", "WhileStatement", "DoWhileStatement", "ForStatement", "ForInStatement", "ForOfStatement", "SwitchStatement"],
                items: []
            }

            $action.ASTAnalyzer.searchAST(ast, findExpressionStatementsOutsideConditionals);
            this.parseComments(command.LabelMetadata.expressionComments, findExpressionStatementsOutsideConditionals.items);
        }

        parseExpressionStatementsInsideConditional(command, keyCodes, dependency, conditional) {
            var findExpressionStatementsInsideConditionals = {
                lookFor: ["ExpressionStatement"],
                outside: ["IfStatement", "ConditionalExpression", "WhileStatement", "DoWhileStatement", "ForStatement", "ForInStatement", "ForOfStatement", "SwitchStatement"],
                items: []
            }

            $action.ASTAnalyzer.searchAST(conditional, findExpressionStatementsInsideConditionals);

            // Object to hold the data
            if (findExpressionStatementsInsideConditionals.items.length) {
                var data = { // For each conditional expression
                    keyCodeValues: keyCodes,
                    pathCondition: dependency,
                    phrases: [],
                    imperativePhrases: [],
                    nouns: [],
                    verbs: [],
                    other: []
                }

                var added = false;
                for (var i = 0; i < findExpressionStatementsInsideConditionals.items.length; i++) {
                    if (findExpressionStatementsInsideConditionals.items[i].leadingComments) {
                        if (!added) {
                            added = true;
                            command.LabelMetadata.conditionals.expressionComments.push(data);
                        }
                        this.parseComment(data, findExpressionStatementsInsideConditionals.items[i]);
                    }
                }
            }
        }


        parseHandler(command) {
            // Parse the handler and get function names
            var ast = esprima.parse(command.Handler, {
                tolerant: true,
                comment: true,
                attachComment: true
            });

            // Function name
            if (ast.body.length == 1) { // Handler should have at least one statement
                this.linkFunctionCalls(ast);
                this.linkAssignments(ast);

                // Comments before handler function
                // Need to link with function call in script first

                // Function name
                let identifier = ast.body[0].id;
                if (identifier) {
                    this.parseLabel(command.LabelMetadata.handlerName, identifier.name);
                }

                //TODO:  Find comments on the handler function

                // DOM APIs
                // Later
                // Differentiate between statements & function calls?

                this.parseOutsideConditionals(command, ast);
                this.parseConditionals(command, ast);
            }
        };

        createArgumentsMap(command) {
            var types = ["assignments", "expressionCalls", "expressionComments"];
            var labelTypes = ["imperativePhrases", "phrases", "verbs", "nouns", "other"];
            for (var i = 0; i < types.length; i++) {
                var type = command.LabelMetadata.conditionals[types[i]];
                for (var j = 0; j < type.length; j++) {
                    var obj = type[j];
                    var condition = obj.pathCondition;
                    var labelsString = "";
                    for (var k = 0; k < labelTypes.length; k++) {
                        var labelNode = obj[labelTypes[k]];
                        if (labelNode.length) {
                            labelsString = labelsString + labelNode.toString() + ",";
                        }
                    }
                    labelsString = labelsString.substring(0, labelsString.length - 1);
                    for (var k = 0; k < obj.keyCodeValues.length; k++) {
                        var keyCodeValueString = $action.KeyCodes[obj.keyCodeValues[k]];
                        if (!command.ArgumentsMap[keyCodeValueString]) {
                            command.ArgumentsMap[keyCodeValueString] = labelsString;
                        } else {
                            command.ArgumentsMap[keyCodeValueString] = command.ArgumentsMap[keyCodeValueString] + ", " + labelsString;
                        }
                    }
                }
            }
        }

        addArgumentToMetadata(command, arg) {
            var keyCode = $action.KeyCodesReverseMap[arg];
            var types = ["assignments", "expressionCalls", "expressionComments"];
            for (var i = 0; i < types.length; i++) {
                let metadata = command.LabelMetadata.conditionals[types[i]];
                for (var j = 0; j < metadata.length; j++) {
                    let item = metadata[j];
                    item.keyCodeValues.push(keyCode);
                }
            }
        }

        convertKeyCodesToString(keyCodesArray) {
            var keyCodeString = "";
            for (var i = 0; i < keyCodesArray.length; i++) {
                keyCodeString = keyCodeString + $action.KeyCodes[keyCodesArray[i]];
                if (i < keyCodesArray.length - 1) {
                    keyCodeString = keyCodeString + ", ";
                }
            }

            return keyCodeString;
        }

        parseOutsideConditionals(command, ast) {
            this.parseFunctionCallsOutsideConditionals(command, ast);
            this.parseAssignmentExpressionsOutsideConditionals(command, ast);
            this.parseExpressionStatementsOutsideConditionals(command, ast);
        }

        parseConditionals(command, ast) {
            // Find functions called outside conditionals and assume they are side effects
            var findConditionals = {
                within: "Program",
                lookFor: [
                    "IfStatement",
                    "ConditionalExpression"],
                items: [] // Will contain the collection of requested elements you are looking for
            }

            $action.ASTAnalyzer.searchAST(ast, findConditionals);

            for (var i = 0; i < findConditionals.items.length; i++) {
                var dependency = this.getDependency(findConditionals.items[i]);

                // Function calls
                var keyCodes = this.parseKeyCodeInputs(command, ast, findConditionals.items[i]);
                this.parseFunctionCallsInsideConditional(command, keyCodes, dependency, findConditionals.items[i].consequent);
                this.parseAssignmentExpressionsInsideConditional(command, keyCodes, dependency, findConditionals.items[i].consequent);
                this.parseExpressionStatementsInsideConditional(command, keyCodes, dependency, findConditionals.items[i].consequent);

                if (findConditionals.items[i].alternate) {
                    dependency = this.getDependency(findConditionals.items[i], true);
                    this.parseFunctionCallsInsideConditional(command, [], dependency, findConditionals.items[i].alternate);
                    this.parseAssignmentExpressionsInsideConditional(command, [], dependency, findConditionals.items[i].alternate);
                    this.parseExpressionStatementsInsideConditional(command, [], dependency, findConditionals.items[i].alternate);
                }
            }
        }

        getDependency(conditional, alternate) {
            var dependency = "";
            if (conditional.pathConditionString) {
                dependency = dependency + conditional.pathConditionString;
            }
            if (conditional.pathConditionString && conditional.testConditionString) {
                dependency = dependency + " && ";
            }
            if (conditional.testConditionString) {
                if (alternate) {
                    dependency = dependency + "!(" + conditional.testConditionString + ")";
                } else {
                    dependency = dependency + "(" + conditional.testConditionString + ")";
                }
            }
            return dependency;
        }

        parseKeyCodeInputs(command, ast, conditional) {
            // First, look for any MemberExpressions outside of conditionals that have references to keycodes
            // These references should be found in any assignment expression
            // TOOD: maybe this really should be just outiside because they could be nested
            var findKeyCodesReferencedOutsideConditionals = {
                lookFor: ["AssignmentExpression", "VariableDeclarator"],
                outside: ["IfStatement", "ConditionalExpression", "WhileStatement", "DoWhileStatement", "ForStatement", "ForInStatement", "ForOfStatement", "SwitchStatement"],
                items: []
            }

            $action.ASTAnalyzer.searchAST(ast, findKeyCodesReferencedOutsideConditionals);

            var keyCodeExpressions = []; // Locate any variables that will have a stored reference to a keyCode
            for (var k = 0; k < findKeyCodesReferencedOutsideConditionals.length; k++) {
                var expression = findKeyCodesReferencedOutsideConditionals[k];
                if (expression.type == "AssignmentExpression") {
                    if (expression.right.type == "MemberExpression" && expression.right.property.type == "Identifier" && expression.right.property.name == "keyCode") {
                        keyCodeExpressions.push(expression.left);
                    }
                } else if (expression.type == "VariableDeclarator") {
                    if (expression.init.type == "MemberExpression" && expression.init.property.type == "Identifier" && expression.init.property.name == "keyCode") {
                        keyCodeExpressions.push(expression.id);
                    }
                }
            }

            // Go through each path condition and look for referenced keycodes
            var keyCodeValues = [];
            if (conditional.pathConditions) {
                for (var i = 0; i < conditional.pathConditions.length; i++) {
                    var pathCondition = conditional.pathConditions[i];
                    if (pathCondition.type == "BinaryExpression") {
                        keyCodeValues = this.parseTestExpressionForKeyCodes(pathCondition, keyCodeValues, keyCodeExpressions);
                    }
                }
            }

            if (conditional.testCondition) {
                keyCodeValues = this.parseTestExpressionForKeyCodes(conditional.testCondition, keyCodeValues, keyCodeExpressions);
            }

            return keyCodeValues;
        }

        parseTestExpressionForKeyCodes(item, keyCodeValues, keyCodeExpressions) {
            if (item.type == "BinaryExpression") {
                if (item.left.type == "MemberExpression" && item.right.type == "Literal") {
                    if (item.left.property && item.left.property.type == "Identifier" && item.left.property.name == "keyCode") {
                        keyCodeValues.push(item.right.raw);
                    }
                } else if (item.left.type == "Literal" && item.right.type == "MemberExpression") {
                    if (item.right.property && item.right.property.type == "Identifier" && item.right.property.name == "keyCode") {
                        keyCodeValues.push(item.left.raw);
                    }
                }

                if ((item.left.type == "MemberExpression" || item.left.type == "Identifier") && item.right.type == "Literal") {
                    for (var m = 0; m < keyCodeExpressions.length; m++) {
                        if (item.left.stringRepresentation === keyCodeExpressions[m].stringRepresentation) {
                            keyCodeValues.push(item.right.raw);
                        }
                    }
                } else if (item.left.type == "Literal" && (item.right.type == "MemberExpression" || item.right.type == "Identifier")) {
                    for (var m = 0; m < keyCodeExpressions.length; m++) {
                        if (item.right.stringRepresentation === keyCodeExpressions[m].stringRepresentation) {
                            keyCodeValues.push(item.left.raw);
                        }
                    }
                }
            } else if (item.type == "LogicalExpression") {
                this.parseTestExpressionForKeyCodes(item.left, keyCodeValues, keyCodeExpressions);
                this.parseTestExpressionForKeyCodes(item.right, keyCodeValues, keyCodeExpressions);
            }
            return keyCodeValues;
        }

        parseComments(labelMetadata, expressionStatements) {
            for (let i = 0; i < expressionStatements.length; i++) {
                let comments = expressionStatements[i].leadingComments;
                if (comments) {
                    for (let j = 0; j < comments.length; j++) {
                        this.parseLabel(labelMetadata, comments[j].value);
                    }
                }
            }
        }

        parseComment(labelMetadata, statement) {
            let comments = statement.leadingComments;
            if (comments) {
                for (let j = 0; j < comments.length; j++) {
                    this.parseLabel(labelMetadata, comments[j].value);
                }
            }
        }

        parseIdentifiers(labelMetadata, identifiers) {
            for (let i = 0; i < identifiers.length; i++) {
                if (identifiers[i].name) {
                    this.parseLabel(labelMetadata, identifiers[i].name);
                } else if (identifiers[i].value) {
                    this.parseLabel(labelMetadata, identifiers[i].value.toString());
                }
            }
        }

        parseIdentifiersAsPhrase(labelMetadata, identifiers) {
            let phraseString = "";
            for (let i = 0; i < identifiers.length; i++) {
                if (identifiers[i].name) {
                    phraseString = phraseString + " " + identifiers[i].name;
                } else if (identifiers[i].stringRepresentation) {
                    phraseString = phraseString + " " + identifiers[i].stringRepresentation;
                }
            }

            this.parsePhrase(labelMetadata, phraseString);
        }

        /**
         * Get all of the commands metadata to use for visual clustering organization
         * @private
         * @property undefined
         */
        getVisualMetadata() {
            var visualData = {};
            var commandKeys = Object.keys(this._commands);
            for (var i = 0; i < commandKeys.length; i++) {
                visualData[commandKeys[i]] = this._commands[commandKeys[i]].ComputedStyles;
            }

            return visualData;
        }

        getCommandsByID(commandIDs) {
            var cmds = [];
            for (var i = 0; i < commandIDs.length; i++) {
                cmds.push(this._commands[commandIDs[i]]);
            }

            return cmds;
        }

        updateVisualCommandGroups(groups) {
            for (var i = 0; i < groups.length; i++) {
                let container = groups[i].container;
                let cmds = groups[i].commands;
                let labels = $(container).siblings('h1,h2,h3,h4,h5,h6').first();
                let label = "";

                try {
                    if (labels.length) {
                        label = labels[0].innerHTML;
                    } else {
                        // Search the parent elements for the first header that we can find
                        labels = $(container).parents().first().siblings('h1,h2,h3,h4,h5,h6').first();
                        if (labels.length) {
                            label = labels[0].innerHTML;
                        } else {

                            // Search for any text nodes above the element
                            var textNodes = $(container).siblings().contents().filter(function () {
                                return this.nodeType == 3;
                            });

                            if (textNodes.length) {
                                label = textNodes[0].textContent;
                            } else {
                                // Search for any text nodes above the element
                                var parentTextNodes = $(container).parents().first().siblings().contents().filter(function () {
                                    return this.nodeType == 3;
                                });

                                if (parentTextNodes.length) {
                                    label = parentTextNodes[0].textContent;
                                }

                            }
                        }
                    }
                } catch (e) {
                    label = "";
                }


                let cmdObjects = this.getCommandsByID(cmds);
                this._ui.appendCommandGroup(label, cmdObjects);
            }
        }
    };

    $action.CommandManager = CommandManager;
})($action);