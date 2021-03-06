/**
* Genie Command class
*/
"use strict";
var $genie = $genie || {};
(function ($genie) {
    /* $genie.CommandInputs = {
         "cut": ["ctrl", "x", "" "", "ctrl", "x"]
     };*/

    class Command {
        constructor(id, elementID, eventType, handler) {
            this._id = id;
            this._elementID = elementID;
            this._eventType = eventType;
            this._domElement = $genie.getElementFromID(elementID);

            this._handler = handler;
            this._dependencies = [ /* { keyCode: "", dependencyString: "" } */ ];
            this._isEnabled = true;
            this._isVisible = true;
            this._computedStyles = {};

            // Collection of possible command arguments (inputs)
            this._argumentsMap = {};

            // Data structure to collect this commands labeling metadata 
            this._labelMetadata = {
                elementLabels: {
                    phrases: [],
                    imperativePhrases: [],
                    nouns: [],
                    verbs: [],
                    other: [], 
                    numbers: []
                },
                handlerName: {
                    phrases: [],
                    imperativePhrases: [],
                    nouns: [],
                    verbs: [],
                    other: [], 
                    numbers: []
                },
                handlerComments: {
                    phrases: [],
                    imperativePhrases: [],
                    nouns: [],
                    verbs: [],
                    other: [],
                    numbers: []
                },
                expressionCalls: {
                    phrases: [],
                    imperativePhrases: [],
                    nouns: [],
                    verbs: [],
                    other: [], 
                    numbers: []
                },
                expressionComments: {
                    phrases: [],
                    imperativePhrases: [],
                    nouns: [],
                    verbs: [],
                    other: [], 
                    numbers: []
                },
                assignments: {
                    phrases: [],
                    imperativePhrases: [],
                    nouns: [],
                    verbs: [],
                    other: [], 
                    numbers: []
                },
                conditionals: {
                    assignments: [],
                    expressionComments: [],
                    expressionCalls: []
                        /*                    { // For each conditional expression
                                                keyCodeValues: "",
                                                pathCondition: "",
                                                phrases: [],
                                                imperativePhrases: [],
                                                nouns: [],
                                                verbs: [],
                                                other: []
                                            }*/
                }
            }

            this.postCommands = [];
        }

        // Getters & Setters
        get ID() {
            return this._id;
        }

        get ElementID() {
            return this._elementID;
        }

        get Element() {
            return this._domElement;
        }

        get EventType() {
            return this._eventType;
        };

        get CommandItem() {
            return this._commandItem;
        }

        set CommandItem(item) {
            this._commandItem = item;
        }

        get PostCommands() {
            return this._postCommands;
        };

        get IsEnabled() {
            return this._isEnabled;
        }

        set IsEnabled(state) {
            this._isEnabled = state;
        }
        
        get IsVisible() {
            return this._isVisible;
        }
        
        set IsVisible(state){
            this._isVisible = state;
        }

        set ComputedStyles(styles) {
            this._computedStyles = styles;
        }

        get ComputedStyles() {
            return this._computedStyles;
        }

        get LabelMetadata() {
                return this._labelMetadata;
            }
            /**
             * Returns a string representing the source code of the associated event handler
             * @private
             * @property Handler
             */
        get Handler() {
            return this._handler;
        }

        get ElementSelector() {
            if (this._domElement instanceof Window) {
                return "body";
            } else if (this._domElement instanceof Document) {
                return "body";
            } else {
                return "[data-genie-element-id='" + this._domElement.getAttribute("data-genie-element-id") + "']";
            }
        }

        set ArgumentsMap(argumentsMap) {
            this._argumentsMap = argumentsMap;
        }

        get ArgumentsMap() {
            return this._argumentsMap;
        }

        get RequiresInput() {
            if (this.EventType == "default") {
                if ($genie.ActionableElementsRequiresInput.indexOf(this.Element.tagName) > -1) {
                    return true;
                }
            }
            return false;
        }

        /**
         * Return whether the command requires any arguments (the event needs arguments such as a keyCode)
         */
        hasArguments() {
            return this._argumentsMap && Object.keys(this._argumentsMap).length;
        }

        /**
         * Adds a command to the list of post commands that must be executed directly after this command
         * @private
         * @property undefined
         * @param {Object} command
         */
        addPostCommand(command) {
            this._postCommands.push(command);
        }

        /**
         * Return whether the command can be invoked by a user 
         * @private
         * @property undefined
         */
        userInvokeable() {
            // Ways that a command can not be available
            // 1. Command is not visible
            //    - Display set to None
            //    - Visibility set to hidden
            //    - Height or width too small
            //    - Opaque (opacity)
            //    - Offscreen
            //    - Hidden attribute
            //    - Z-index is hiding it behind something else
            if (!this.visible()) {
                return false;
            }

            // 2. Command is disabled 
            if (!this.enabled()) {
                return false;
            }

            // 3. Command results in no effect because of input guards or conditions in the code
            if (!this.IsEnabled) {
                return false;
            }

            // Future things to check for 

            // 4. Command is not yet in the DOM (Hovering over a menu adds menu items with commands to DOM)
            // If it isn't in the DOM yet, we shouldn't find any event handlers for it in which case it won't make it here??

            // 5. Command is not clickable (there is a transparent div or element above it preventing it from being clicked)

            // If the command cannot be invoked, it should still remain in the list of commands, but not be shown in the UI


            // 6. Command is not available yet because other commands need to be executed first based on the nature of the device
            /*if (this.commandDependencies()) {
                return false;
            }
            */
            return true;
        }

        /**
         * The set of data dependencies that the command has (control dependencies)
         * Example: enabled state of another element, etc. 
         */
        dataDependencies() {

        };

        /**
         * Returns whether the command is currently enabled (can be performed)
         */
        enabled() {
            // Look for disabled attribute on the element
            if (this._domElement instanceof Window || this._domElement instanceof Document) {
                return true;
            }

            if (this._domElement) {
                var tagName = this._domElement.tagName;
                var hasDisabled = $genie.DisabledAttributeElements[tagName.toLowerCase()];
                if (hasDisabled) {
                    let disabled = this._domElement.attributes.disabled;
                    if (disabled && disabled.value == "disabled") {
                        return false;
                    }
                }

                return true;
            }
        };

        /**
         * Returns whether the command is currently visible on the screen
         * Checks for several reasonable properties that can affect visibility of an element
         * @private
         */
        visible() {

            if (this._domElement instanceof Window || this._domElement instanceof Document) {
                return true;
            }

            var element = $(this._domElement);
            var displayed = element.css('display') != "none";
            var visibility = element.css('visibility') != "hidden";
            var heightBigEnough = element.outerHeight() > 10;
            var widthBigEnough = element.outerWidth() > 10;
            var notClear = element.css('opacity') != "0" && element.css('opacity') != "0.0";
            var offLeftRight = (element.offset().left >= window.innerWidth) || ((element.offset().left + element.offsetWidth) <= 0);
            var hidden = element.attr('type') == 'hidden';
            var visible = element.is(':visible');

            if (heightBigEnough && widthBigEnough && visible && displayed && visibility && notClear && !offLeftRight && !hidden) {
                return true;
            }

            return false;
        }

        /**
         * Command or set of commands that the command is dependent on being executed before it can be executed
         */
        commandDependencies() {
            // Not show the command 
            var preDep = this.preDeviceDependencies();
            if (preDep && preDep.length) {
                return true;
            }

            var dataDep = this.dataDependencies();
            if (dataDep && dataDep.length) {
                return true;
            }
        };

        /**
         * The set of commands that must be performed directly before this command
         * @private
         */
        preDeviceDependencies() {
            if (!this._cachedPreDeviceDependences) {
                // If this command were executed, which commands would need to be executed first
                var mouseOrder = $genie.MouseOrders[this.EventType];
                if (mouseOrder) {
                    var index = mouseOrder.indexOf(this.EventType);
                    if (index > -1) {
                        this._cachedPreDeviceDependencies = _.slice(mouseOrder, 0, index);
                    }
                } else {
                    var keyboardOrder = $genie.KeyboardOrders[this.EventType];
                    if (keyboardOrder) {
                        var index = keyboardOrder.indexOf(this.EventType);
                        if (index > -1) {
                            this._cachedPreDeviceDependencies = _.slice(keyboardOrder, 0, index);
                        }
                    }
                }
            }

            return this._cachedPreDeviceDependencies;
        };

        /**
         * The set of events that need to be executed directly after this command
         * @private
         */
        postDeviceDependencies() {
            if (!this._cachedPostDeviceDependencies) {
                // If this command were executed, which commands would need to be executed first
                var mouseOrder = $genie.MouseOrders[this.EventType];
                if (mouseOrder) {
                    var index = mouseOrder.indexOf(this.EventType);
                    if (index > -1) {
                        // Cache the dependencies once computed
                        this._cachedPostDeviceDependencies = _.slice(mouseOrder, index + 1, mouseOrder.length);
                    }
                } else {
                    // If this command were executed, which commands would need to be executed first
                    var keyboardOrder = $genie.KeyboardOrders[this.EventType];
                    if (keyboardOrder) {
                        var index = keyboardOrder.indexOf(this.EventType);
                        if (index > -1) {
                            this._cachedPostDeviceDependencies = _.slice(keyboardOrder, index + 1, keyboardOrder.length);
                        }
                    }
                }
            }

            return this._cachedPostDeviceDependencies;
        };

        /**
         * Attach this callback to the keystrokes or action that you want to execute the command
         * Injects a script into the pages to perform the action.. This is necessary becauuse
         * content scripts do not have access to any events nor can trigger events in the associated page. 
         */
        executeCallback() {
            var self = this;
            return function (evt) {
                evt.preventDefault();
                evt.stopPropagation();

                self.execute();
            };
        };

      /**
       * If the construct an object for a command with a default action (link or other non JS event)
       */
        getDefaultAction(arg1Value) {
            var data = {};
            data.messageType = 'performAction';
            var actions = [];
            var action = {};
            action.event = this.EventType;
            action.elementID = this.ElementID;
            action.input = arg1Value; 
            actions.push(action);
           
            data.actions = actions;
            return data;
        }

      /**
       * Constructs an object to send to the page representing the element to perform the event on, 
       * and associated event, and event argumemnts
       */
        getActionsToPerform(arg1Value, arg2Value) {
            var data = {};
            data.messageType = 'performAction';
            var actions = [];

            var preActions = this.preDeviceDependencies();
            if (preActions) {
                for (var i = 0; i < preActions.length; i++) {
                    var preAction = {
                        event: preActions[i],
                        elementID: this.ElementID
                    }

                    if ($genie.isKeyboardEvent(preActions[i])) {
                        preAction.specialKey = $genie.SpecialKeys[arg1Value];
                        preAction.keyString = _.upperFirst(arg1Value);
                        preAction.argument = $genie.KeyCodesReverseMap[arg1Value];
                        preAction.keyboard = true;
                    } else if ($genie.isMouseEvent(preActions[i])) {
                        preAction.mouseButton = arg1Value;
                        preAction.mousePosition = arg2Value;
                        preAction.mouse = true;
                    }

                    actions.push(preAction);
                }
            }

            var action = {};
            action.event = this.EventType;
            action.elementID = this.ElementID;
            if ($genie.isKeyboardEvent(this.EventType)) {
                action.specialKey = $genie.SpecialKeys[arg1Value];
                action.keyString = _.upperFirst(arg1Value);
                action.argument = $genie.KeyCodesReverseMap[arg1Value];
                action.keyboard = true;
            } else if ($genie.isMouseEvent(this.EventType)) {
                action.mouseButton = arg1Value;
                action.mousePosition = arg2Value;
                action.mouse = true;
            }
            actions.push(action);

            var postActions = this.postDeviceDependencies();
            if (postActions) {
                for (var j = 0; j < postActions.length; j++) {
                    var postAction = {
                        event: postActions[j],
                        elementID: this.ElementID
                    }

                    if ($genie.isKeyboardEvent(postActions[j])) {
                        postAction.specialKey = $genie.SpecialKeys[arg1Value];
                        postAction.keyString = _.upperFirst(arg1Value);
                        postAction.argument = $genie.KeyCodesReverseMap[arg1Value];
                        postAction.keyboard = true;
                    } else if ($genie.isMouseEvent(postActions[j])) {
                        postAction.mouseButton = arg1Value;
                        postAction.mousePosition = arg2Value;
                        postAction.mouse = true;
                    }

                    actions.push(postAction);
                }
            }

            data.actions = actions;
            return data;
        }

      /**
       * Execute a command by sending a message to the page to create the event object and trigger
       * the corresponding event for the command
       * @param  argument1 (mouseButton or keyCode to press)
       * @param argument2 (mousePosition {x: , y: })
       */
        execute(argument1, argument2) {
            // Perform the action
            var actions = {};
            if ($genie.isKeyboardEvent(this.EventType)) {
                actions = this.getActionsToPerform(argument1, undefined);
            } else if ($genie.isMouseEvent(this.EventType)) {
                if (!argument2) {
                    argument2 = {
                        x: 200000,
                        y: 200000
                    };
                }

                if (!argument1) {
                    argument1 = "0";
                }
                actions = this.getActionsToPerform(argument1, argument2);
            } else if (this.EventType == 'default') {
                actions = this.getDefaultAction(argument1);
            }

            window.postMessage(actions, "*");
        }


      /**
       * Search the AST for several types of labeling metadata to use for commands
       */
        labelMetadata() {
            var completeLabel = "";
            // Constructs a desired label for the command based on the command metadata available
            var nodeTypes = ["elementLabels", "handlerComments", "expressionComments", "expressionCalls", "assignments", "handlerName"];
            var phraseTypes = ["phrases", "imperativePhrases", "nouns", "verbs", "other", "numbers"];
            for (var i = 0; i < nodeTypes.length; i++) {
                for (var j = 0; j < phraseTypes.length; j++) {
                    var labelSet = this.LabelMetadata[nodeTypes[i]][phraseTypes[j]];
                    for (var k = 0; k < labelSet.length; k++) {
                        completeLabel = completeLabel + _.upperFirst(labelSet[k]) + ", ";
                    }
                }
            }

            var conditionalTypes = ["assignments", "expressionCalls", "expressionComments"];
            for (var i = 0; i < conditionalTypes.length; i++) {
                var conditionalType = this.LabelMetadata.conditionals[conditionalTypes[i]];
                for (var j = 0; j < conditionalType.length; j++) {
                    var item = conditionalType[j];
                    for (var k = 0; k < phraseTypes.length; k++) {
                        if (item[phraseTypes[k]].length) {
                            completeLabel = completeLabel + _.upperFirst(item[phraseTypes[k]]) + ", ";
                        }
                    }
                }
            }

            return completeLabel.substring(0, completeLabel.length - 2);
        }
    };

    $genie.Command = Command;
})($genie);