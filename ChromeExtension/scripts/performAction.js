"use strict";
var $action = $action || {};

$action.ActionableElementsActionFunction = {
    "A": function (element) {
        element.click();
    },
    "INPUT": function (element) {
        element.focus();
    }
}

// Sending and receiving messages from the window object
window.addEventListener("message", receiveMessage, false, false, true);


function performAction(data) {
    var element = document.querySelector("[data-genie-element-id='" + data.elementID + "']");
    if (data.elementID = "document") {
        element = document;
    } else if (data.elementID == "window") {
        element = window;
    }

    if (element) {
        // Execute the action using the trigger or the associated action function
        if (data.event != 'default') {
            var event = data.event;

            // TODO: Verify that all UIEvent types are cancelable and bubble
            if (data.keyboard) {
                var keyboardEvent = document.createEvent('KeyboardEvent');

                // Chromium Hack
                Object.defineProperty(keyboardEvent, 'keyCode', {
                    get: function () {
                        return data.argument;
                    }
                });
                Object.defineProperty(keyboardEvent, 'which', {
                    get: function () {
                        return data.argument;
                    }
                });

                if (keyboardEvent.initKeyboardEvent) {
                    keyboardEvent.initKeyboardEvent(event, true, true, document.defaultView, false, false, false, false, data.argument, data.argument);
                } else {
                    keyboardEvent.initKeyEvent(event, true, true, document.defaultView, false, false, false, false, data.argument, 0);
                }

                keyboardEvent.keyCodeVal = data.argument;
               // console.log(keyboardEvent);
                element.dispatchEvent(keyboardEvent);
            } else if (data.mouse) {
                var eventObj = new MouseEvent(event, {
                    "bubbles": true,
                    "cancelable": false
                });

                element.dispatchEvent(eventObj);
            } else {
                var eventObj = new Event(event, {
                    "bubbles": true,
                    "cancelable": false
                });
                element.dispatchEvent(eventObj);
            }
        } else {
            var actionFunction = $action.ActionableElementsActionFunction[element.tagName];
            if (actionFunction) {
                if (actionFunction) {
                    actionFunction(element);
                }
            }
        }
    }
};

/**
 * Receive a message from the content script to perform the given action
 * @private
 * @method receiveMessage
 * @param {Object} event
 */

// REMINDER: Don't add dependencies on JQuery in here because the webpage may not be using it
function receiveMessage(event) {
    var origin = event.origin || event.originalEvent.origin; // For Chrome, the origin property is in the event.originalEvent object.
    if (event.source != window) {
        return;
    }
    // Handle triggering the evnet
    var data = event.data;
    if (data && data.actions && data.messageType == "performAction") {
        for (var i = 0; i < data.actions.length; i++) {
            performAction(data.actions[i]);
        }
    }

    window.removeEventListener("message", receiveMessage, null, false, true);
};