window.addEventListener("message", receiveMessage, false);
var $action = $action || {};

/**
 * Description for injectScript
 * @private
 * @method injectScript
 * @param {Object} script
 */
function injectScript(script) {
    var s = document.createElement('script');
    s.src = chrome.extension.getURL(script);
    s.type = "text/javascript";

    s.onload = function () {
        this.parentNode.removeChild(this);
    };

    var header = document.head || document.documentElement;
    header.appendChild(s);
};

/**
 * Description for injectMonitorScript
 * @private
 * @method injectMonitorScript
 */
function injectMonitorScript() {
    // Inject the getActions.js script into the page
    var header = document.head || document.documentElement;
    var monitorScript = $action.getScript();
    var script = $(header).children("script").first();
    header.insertBefore(monitorScript, script[0]);
};

/**
 * Takes the data object passed in and returns a new object with the instrumented handler
 * @private
 * @method instrumentHandler
 * @param {Object} data
 */
function instrumentHandler(data) {
    var instrumented = $action.getInstrumentedHandler(data.handler);
    data.handler = instrumented;
    data.messageType = 'eventInstrumented';
    return data;
}

/**
 * Receive the message from the getActions script and update the dialog with the new actions
 * @private
 * @property undefined
 * @param {Object} event
 */
function receiveMessage(event) {
    if (event.source != window) {
        return;
    }

    // Check the type of the message returned, and add or remove the command from the dialog accordingly
    if (event.data) {
        if (event.data.messageType == 'eventAdded') {
            var elementPath = event.data.path;
            if (elementPath && elementPath.length) {
                var element = $(elementPath);
                if (element && element.length) {
                    $action.commandManager.addCommand(element[0], event.data);
                }
            }

            var instrumented = instrumentHandler(event.data);
            window.postMessage(instrumented, "*");
        }

        if (event.data.messageType == 'eventRemoved') {
            var elementPath = event.data.path;
            if (elementPath && elementPath.length) {
                var element = $(elementPath);
                if (element && element.length) {
                    $action.commandManager.removeCommand(element[0], event.data);
                }
            }
        }
        
        if (event.data.messageType == 'updateCommandStates'){
            var newStates = event.data.commandStates; 
            console.log("Updated command states received"); 
            
            var keys = Object.keys(newStates); 
            for(var i=0; i<keys.length; i++){
                var value = newStates[keys[i]];
                console.log("id: " + keys[i] + " state: " + value);
            }
            
            // TODO: update the state of the commands in the UI
          //  $action.commandManager.updateCommandStates(newStates);
        }
    }
};

/**
* Post a message to the window object to get the updated command states
* @private
* @method getCommandStates
*/
function getCommandStates() {
    window.postMessage({ messageType: 'getCommandStates' }, "*");
    setTimeout(getCommandStates, 1000);
}

/**
 * Listen for messages from the background script and return the requested information
 * @private
 * @method undefined
 * @param {Object} function (msg
 * @param {Object} sender
 * @param {Object} sendResponse
 */
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.text === 'open') {
        $action.interface.show();
    }

    if (msg.text === 'close') {
        $action.interface.hide();
    }

    if (msg.text === 'scriptReceived') {
        var data = msg.data;
        var url = msg.url;
        if (data && data.length) {
            if (!$action.scriptManager) {
                $action.scriptManager = new $action.ScriptManager();
            }

            $action.scriptManager.addScript(url, data);
        }
    }
});

$(document).ready(function () {
    $action.interface = new $action.KeyboardUI(); // Instantiate a new type of interface 
    // For other types of interfaces, they could be instantiated here or through a setting?
    // Initialize the script manager if not already initialized
    if (!$action.scriptManager) {
        $action.scriptManager = new $action.ScriptManager();
    }

    // Create a new instance of the command manager with this instance of the UI
    $action.commandManager = new $action.CommandManager($action.interface, $action.scriptManager);

    injectMonitorScript();

    // Add an observer to watch when new elements are added to the page
    var mutationObserver = new $action.MutationWatcher();
    mutationObserver.init();

    // Parse all script tags in the page and add them as scripts
    var scripts = $('script').not('#genie_monitor_script');
    for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        if (!script.attributes.src) {
            var innerHTML = script.innerHTML;
            $action.scriptManager.addScript("page", innerHTML);
        }
    }
    
    // Begin polling to update command states
    setTimeout(getCommandStates, 1000);
});