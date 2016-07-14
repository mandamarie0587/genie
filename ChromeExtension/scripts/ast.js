"use strict";
var $action = $action || {};
(function ($action) {
    class ASTAnalyzer {
        // Format of abstract syntax tree follows: https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API
        constructor() {}

        static searchAST(ast, visitor) {
            if (ast.type == "Program") {
                if (!visitor.scopes) {
                    visitor.scopes = [];
                }

                if (visitor.within == "Program") {
                    visitor.collect = true;
                }

                for (var i = 0; i < ast.body.length; i++) {
                    this.searchNode(ast.body[i], visitor);
                }

                visitor.collect = false;
                delete visitor.scopes;
            } else {
                console.log("Not a valid AST");
            }

            // Searching for any identifiers referenced within the If statement conditional and return their names as dependencies
            // Search for any function calls found within the handlers and return their names 
        }

        static searchNode(node, visitor) {
            var collect = visitor.collect;
            var hasProp = visitor.property != undefined;
            if (visitor.within.indexOf(node.type) > -1 && !hasProp && !collect) {
                visitor.collect = true;
            }

            if (visitor.collect && visitor.lookFor.indexOf(node.type) > -1) {
                visitor.items.push(node);
            }

            switch (node.type) {
            case "Identifier":
                this.searchIdentifier(node, visitor);
                break;
            case "BlockStatement":
                this.searchBlockStatement(node, visitor);
                break;
            case "ExpressionStatement":
                this.searchNode(node.expression, visitor);
                break;
            case "IfStatement" || "ConditionalExpression":
                this.searchIfStatement(node, visitor);
                break;
            case "LabeledStatement":
                this.searchLabeledStatement(node, visitor);
                break;
            case "BreakStatement" || "ContinueStatement":
                this.searchBreakStatement(node, visitor);
                break;
            case "WithStatement":
                this.searchWithStatement(node, visitor);
                break;
            case "SwitchStatement":
                this.searchSwitchStatement(node, visitor);
                break;
            case "ReturnStatement" || "ThrowStatement":
                this.searchReturnStatement(statement.argument, visitor);
                break;
            case "TryStatement":
                this.searchTryStatement(statement);
                break;
            case "WhileStatement" || "DoWhileStatement":
                this.searchWhileStatement(node, visitor);
                break;
            case "ForStatement":
                this.searchForStatement(node, visitor);
                break;
            case "ForInStatement" || "ForOfStatement":
                this.searchForInStatement(node, visitor);
                break;
            case "LetStatement":
                this.searchLetStatement(node, visitor);
                break;
            case "DebuggerStatement":
                this.searchDebuggerStatement(node, visitor);
                break;
            case "EmptyStatement":
                // TBD 
                break;
            case "FunctionDeclaration":
                this.searchFunctionDeclaration(node, visitor);
                break;
            case "VariableDeclaration":
                this.searchVariableDeclaration(node, visitor);
                break;
            case "Identifier":
                this.searchIdentifier(node, visitor);
                break;
            case "ThisExpression":
                this.searchThisExpression(node, visitor);
                break;
            case "ArrayExpression":
                this.searchArrayExpression(node, visitor);
                break;
            case "ObjectExpression":
                this.searchObjectExpression(node, visitor);
                break;
            case "FunctionExpression" || "ArrowExpression":
                this.searchFunctionExpression(node, visitor)
                break;
            case "SequenceExpression":
                this.searchSequenceExpression(node, visitor);
                break;
            case "UnaryExpression":
                this.searchUnaryExpression(node, visitor);
                break;
            case "BinaryExpression":
                this.searchBinaryExpression(node, visitor);
                break;
            case "AssignmentExpression":
                this.searchAssignmentExpression(node, visitor);
                break;
            case "UpdateExpression":
                this.searchUpdateExpression(node, visitor);
                break;
            case "LogicalExpression":
                this.searchLogicalExpression(node, visitor);
                break;
            case "NewExpression":
                this.searchNewExpression(node, visitor);
                break;
            case "CallExpression":
                this.searchCallExpression(node, visitor);
                break;
            case "MemberExpression" || "StaticMemberExpression" || "ComputedMemberExpression":
                this.searchMemberExpression(node, visitor);
                break;
            case "YieldExpression":
                this.searchYieldExpression(node, visitor);
                break;
            case "ComprehensionExpression":
                this.searchComprehensionExpression(node, visitor);
                break;
            case "LetExpression":
                this.searchLetExpression(node, visitor);
                break;
            case "VariableDeclaration":
                this.searchVariableDeclaration(node, visitor);
                break;
            case "VariableDeclarator":
                this.searchVariableDeclarator(node, visitor);
                break;
                // Clauses
            case "CatchClause":
                this.searchCatchClause(node, visitor);
                break;
            case "SwitchCase":
                this.searchSwitchCase(node, visitor);
                break;
                // Operators
            case "BinaryOperator" || "UnaryOperator":
                this.searchOperator(node, visitor);
                break;
                // Patterns
            case "ObjectPattern":
                this.searchObjectPattern(node, visitor);
                break;
            case "ArrayPattern":
                this.searchArrayPattern(node, visitor);
            case "Property":
                this.searchProperty(node, visitor);
            default:
                break;
                // Not supported in ECMAScript
                // ComprehensionExpression
                // GEneratorExpression
                // GraphExpression
                // GraphIndexExpression
                // ComprehensionBlock
                // ComprehensionIf
            }

            if (!collect) {
                visitor.collect = false;
            }
        }

        // Statements 
        static searchForStatement(statement, visitor) {
            if (statement.init) {
                this.searchNode(statement.init, visitor);
            }

            if (statement.test) {
                this.searchNode(statement.test, visitor);
            }

            if (statement.update) {
                this.searchNode(statement.update, visitor);
            }

            this.searchNode(statement.body, visitor);
        }

        static searchForInStatement(statement, visitor) {
            // if statement.each is true, it is a for each/in instead of a for/in
            // If statement.each is undefined, it is a for/of statement
            this.searchNode(this.left, visitor);
            this.searchNode(this.right, visitor);
            this.searchNode(this.body, visitor);
        }

        static searchWhileStatement(statement, visitor) {
            this.searchNode(statement.test, visitor);
            this.searchNode(statement.body, visitor);
        }

        static searchTryStatement(statement, visitor) {
            this.searchNode(statement.block, visitor);
            if (statement.handler) {
                this.searchNode(statement.handler, visitor);
            }

            for (var i = 0; i < statement.guardedHandlers.length; i++) {
                this.searchNode(statement.handler, visitor);
            }

            if (statement.finalizer) {
                this.searchNode(statement.finalizer, visitor);
            }
        }

        static searchBreakStatement(statement, visitor) {
            if (statement.label) {
                this.searchNode(statement.label, visitor);
            }
        }

        static searchWithStatement(statement, visitor) {
            // Not handling this case for scoping
            // With statement use is not recommended
            this.searchNode(statement.object, visitor);
            this.searchNode(statement.body, visitor);
        }

        static searchSwitchStatement(statement, visitor) {
            var collect = visitor.collect;
            if (visitor.property == "discriminant") {
                visitor.collect = true;
            }

            this.searchNode(statement.discriminant, visitor);

            if (!collect) {
                visitor.collect = false;
            }

            for (var i = 0; i < statement.cases.length; i++) {
                this.searchNode(statement.cases[i], visitor);
            }

            // lexical - does it contain any unnested let declarations
        }

        static searchBlockStatement(statement, visitor) {
            // Push the node onto the scope whenever a new block statement is reached
            // Consider only new block statements as new scopes
            visitor.scopes.push(new Scope(statement));

            var statements = statement.body;
            for (var i = 0; i < statements.length; i++) {
                var stmt = statements[i];
                this.searchNode(stmt, visitor);
            }

            visitor.scopes.pop();
        }

        static searchIfStatement(statement, visitor) {
            // scope
            //   Identifier -> AssignmentExpression
            //   Identifier -> VariableDeclaration 
            var props = ["test", "consequent", "alternate"];
            var hasProp = visitor.property != undefined;
            for (var i = 0; i < props.length; i++) {
                var setCollect = hasProp && visitor.property == props[i];
                if (setCollect) {
                    visitor.collect = true;
                }

                if (statement[props[i]]) {
                    this.searchNode(statement[props[i]], visitor);
                }

                if (setCollect) {
                    visitor.collect = false;
                }
            }
        }

        static searchLetStatement(statement) {
            for (var i = 0; i < statement.head.length; i++) {
                this.searchNode(statement.head, visitor);
            }
            this.searchNode(statement.body, visitor);
        }

        static searchDebuggerStatement(statement, visitor) {
            // Do nothing? 
        }

        static searchLabeledStatement(statement, visitor) {
            this.searchNode(statement.label, visitor);
            this.searchNode(statement.body, visitor);
        }

        static searchFunctionDeclaration(statement, visitor) {
            if (statement.id) {
                this.searchNode(statement.id, visitor);
            }

            for (var i = 0; i < statement.params.length; i++) {
                this.searchNode(statement.params[i], visitor);
            }

            if (statement.defaults) {
                for (var j = 0; j < statement.defaults.length; j++) {
                    this.searchNode(statement.defaults[j], visitor);
                }
            }

            if (statement.rest) {
                this.searchNode(statement.rest, visitor);
            }

            this.searchNode(statement.body, visitor);

            //  generator
            // expression
        }

        static searchThisExpression(expression, visitor) {
            // Do nothing!
        }

        static searchBinaryExpression(expression, visitor) {
            // Parse left and right hand sides
            this.searchNode(expression.left, visitor);
            this.searchNode(expression.operator, visitor);
            this.searchNode(expression.right, visitor);
        }

        static searchAssignmentExpression(expression, visitor) {
            // The left property contains a Pattern node. 
            // Currently, just look for Identifier types. Other options are ArrayPattern & ObjectPattern
            if (expression.left.type == "Identifier" && visitor.scopes && visitor.scopes.length) {
                var scope = visitor.scopes[visitor.scopes.length - 1]; // The closest scope is the last on the stack
                scope.addAssignment(expression.left.name, expression.right);
            }

            this.searchNode(expression.left, visitor);
            this.searchNode(expression.operator, visitor);
            this.searchNode(expression.right, visitor);
        }

        static searchUpdateExpression(expression, visitor) {
            this.searchNode(expression.operator, visitor);
            this.searchNode(expression.argument, visitor);
        }

        static searchLogicalExpression(expression, visitor) {
            // Parse left and right hand sides
            this.searchNode(expression.left, visitor);
            this.searchNode(expression.operator, visitor);
            this.searchNode(expression.right, visitor);
        }

        static searchNewExpression(expression, visitor) {
            this.searchNode(expression.callee, visitor);
            for (var i = 0; i < expression.arguments.length; i++) {
                this.searchNode(expression.arguments[i], visitor);
            }
        }

        static searchCallExpression(expression, visitor) {
            this.searchNode(expression.callee, visitor);
            for (var i = 0; i < expression.arguments.length; i++) {
                this.searchNode(expression.arguments[i], visitor);
            }
        }

        static searchMemberExpression(expression, visitor) {
            this.searchNode(expression.object, visitor);
            this.searchNode(expression.property, visitor);
        }

        static searchYieldExpression(expression, visitor) {
            if (expression.argument) {
                this.searchNode(expression.argument, visitor);
            }
        }

        static searchComprehensionExpression(expression, visitor) {
            // Not supported in ECMAScript standard
        }

        static searchLetExpression(expression, visitor) {
            for (var i = 0; i < expression.head.length; i++) {
                this.searchNode(expression.head[i], visitor);
            }

            this.searchNode(expression.body, visitor);
        }

        static searchArrayExpression(expression, visitor) {
            if (expression.elements && expression.elements.length) {
                for (var i = 0; i < expression.elements.length; i++) {
                    var expr = expression.elements[i];
                    if (expr) {
                        this.searchNode(expr, visitor);
                    }
                }
            }
        }

        static searchObjectExpression(expression, visitor) {
            for (var i = 0; i < expression.properties.length; i++) {
                this.searchNode(expression.properties[i], visitor);
            }
        }

        static searchFunctionExpression(expression, visitor) {
            if (expression.id) {
                this.searchNode(expression.id, visitor);
            }

            if (expression.params) {
                for (var i = 0; i < expression.params.length; i++) {
                    this.searchNode(expression.params[i], visitor);
                }
            }

            if (expression.defaults) {
                for (var j = 0; j < expression.defaults.length; j++) {
                    this.searchNode(expression.defaults[j], visitor);
                }
            }

            // rest
            if (expression.rest) {
                this.searchNode(expression.rest, visitor);
            }

            // BlockStatement or Expression
            this.searchNode(expression.body, visitor);

            // generator
            // expression
        }

        static searchSequenceExpression(expression, visitor) {
            for (var i = 0; i < expression.expressions.length; i++) {
                this.searchNode(expression.expressions[i], visitor);
            }
        }

        static searchUnaryExpression(expression, visitor) {
            this.searchNode(expression.operator, visitor);
            this.searchNode(expression.argument, visitor);
        }

        // Clauses
        static searchSwitchCase(switchCase, visitor) {
            if (switchCase.test) {
                this.searchNode(switchCase.test, visitor);
            }

            for (var i = 0; i < switchCase.consequent.length; i++) {
                this.searchNode(switchCase.consequent[i], visitor);
            }
        }

        static searchCatchClause(catchClause, visitor) {
            this.searchNode(catchClause.param, visitor);
            if (catchClause.guard) {
                this.searchNode(catchClause.guard, visitor);
            }

            this.searchNode(catchClause.body, visitor);
        }

        static searchObjectPattern(pattern, visitor) {
            for (var i = 0; i < pattern.properties; i++) {
                var p = patterns.properties[i];
                var key = p.key;
                var value = p.value;
                this.searchNode(key, visitor);
                this.searchNode(value, visitor);
            }
        }

        static searchArrayPattern(pattern, visitor) {
            for (var i = 0; i < pattern.elements.length; i++) {
                if (pattern.elements[i]) {
                    this.searchNode(pattern.elements[i], visitor);
                }
            }
        }

        // Miscellaneous
        static searchIdentifier(identifier, visitor) {
            if (!identifier.lastAssigned) {
                // Locate the reference where the identifier was last assigned, either a AssignmentExpression
                // or a VariableDeclaration node
                identifier.lastAssigned = this.findLastAssigned(identifier, visitor);
            }

            if (!identifier.lastDeclared) {
                identifier.lastDeclared = this.findLastDeclared(identifier, visitor);
            }
        }

        static searchLiteral(literal, visitor) {
            // value : string | boolean | null | number | RegExp
        }

        static searchOperator(operator, visitor) {
            /// I don't really care what the operator is right now so leaving this empty!
            // UnaryOperator
            // "-" | "+" | "!" | "~" | "typeof" | "void" | "delete"
            // BinaryOperator
            // "==" | "!=" | "===" | "!=="
            // | "<" | "<=" | ">" | ">="
            // | "<<" | ">>" | ">>>"
            // | "+" | "-" | "*" | "/" | "%"
            // | "|" | "^" | "&" | "in"
            // | "instanceof" | ".."
            // LogicalOperator
            // "||" | "&&"
            // AssignmentOperator
            //  "=" | "+=" | "-=" | "*=" | "/=" | "%="
            // | "<<=" | ">>=" | ">>>="
            // | "|=" | "^=" | "&="
            // UpdateOperator
            //  "++" | "--"
        }

        static searchProperty(property, visitor) {
            // Only supported by object expressions
            this.searchNode(property.key, visitor)
            this.searchNode(property.value, visitor);

            //property.kind contains the kind "init" for ordinary property initializers. 
            // "get" and "set" are the kind values for getters and setters
        }

        static searchVariableDeclarator(declarator, visitor) {
            // The left property contains a Pattern node. 
            // Currently, just look for Identifier types. Other options are ArrayPattern & ObjectPattern
            if (declarator.id.type == "Identifier" && visitor.scopes && visitor.scopes.length) {
                var scope = visitor.scopes[visitor.scopes.length - 1]; // The closest scope is the last on the stack
                scope.addDeclaration(declarator.id.name, declarator.init);
            }

            this.searchNode(declarator.id, visitor);
            if (declarator.init) {

                // If the init is a function expression, assign the referenceID on the node to the 
                // identifier of the VariableDeclarator that the function is being assigned to
                if (declarator.init.type == "FunctionExpression") {
                    declarator.init.referenceID = declarator.id.name; 
                    // TODO: This won't work for ObjectPattern or ArrayPattern node types. decorator.id is a Pattern node.
                }

                this.searchNode(declarator.init, visitor);
            }
        }

        static searchVariableDeclaration(declaration, visitor) {
            for (var i = 0; i < declaration.declarations.length; i++) {
                this.searchNode(declaration.declarations[i], visitor);
            }

            // kind "var" | "let" | "const"
        }

        static findLastAssigned(identifier, visitor) {
            if (visitor.scopes)
                for (var i = visitor.scopes.length - 1; i >= 0; i--) {
                    var scope = visitor.scopes[i]; // The last element is the closest scope to the reference
                    var assignment = scope.Assignments[identifier.name];
                    if (assignment) {
                        return assignment;
                    }
                }
        }

        static findLastDeclared(identifier, visitor) {
            if (visitor.scopes)
                for (var i = visitor.scopes.length - 1; i >= 0; i--) {
                    var scope = visitor.scopes[i]; // The last element is the closest scope to the reference
                    var declaration = scope.Declarations[identifier.name];
                    if (declaration) {
                        return declaration;
                    }
                }
        }
    }

    // Represents the information held by the current scope
    // - Which variables are assigned and defined
    // - With function definiteions are in scope // TODO later
    class Scope {
        constructor(statement) {
            this._statement = statement;
            this._assignments = {} // A map between identifiers & AssignmentExpression/VariableDeclaration nodes
            this._declarations = {};
        }

        get Assignments() {
            return this._assignments;
        }

        get Declarations() {
            return this._declarations;
        }

        addAssignment(identifierName, expression) {
            // Only keep the most recent assignment or variable declaration for this identifer
            this._assignments[identifierName] = expression;
        }

        addDeclaration(identifierName, expression) {
            this._declarations[identifierName] = expression;
        }
    }

    $action.ASTAnalyzer = ASTAnalyzer;
})($action);