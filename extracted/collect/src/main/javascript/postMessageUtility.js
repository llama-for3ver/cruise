import { bind as bindEvent } from "./htmlUtility";
import { CardinalLogger } from "./logger";

const log = CardinalLogger.getInstance("PostMessageUtility");

const postMessageEventsEnabled = window.top !== window.self;

/**
 *
 * @param {string} validDomain The domain we are listening a message from. Currently can only be a single domain
 * @param {function} callback  The function to execute once the message has been received. This function will receive a single argument that is the message data
 * @returns {function} the listener function created to handle the message received. This function must be used to remove a listener
 * @throws TypeError Invalid arguments
 */
function listen(validDomain, callback) {
  if (validDomain == undefined || validDomain.length < 1) {
    throw TypeError("A valid whitelist domain is required");
  }

  if (callback !== undefined && typeof callback !== "function") {
    throw TypeError("callback must be a function");
  }

  let eventCall = (event) => {
    try {
      processReceivedEvent(event, validDomain, callback);
    } catch (error) {
      log.error("Exception while processing postMessage: " + error.message);
    }
  };

  bindEvent("message", window, eventCall);

  return eventCall;
}

/**
 * The function that is triggered when a postMessage event is triggered on the page
 * @param {Object} event The postMessage event object
 * @param {string} whitelist The domain to listen for messages from
 * @param {function} callback The callback event to trigger once a valid postMessage has been received
 * @throws TypeError Invalid arguments
 */
function processReceivedEvent(event, whitelist, callback) {
  if (
    event == undefined ||
    event.data == undefined ||
    event.origin == undefined
  ) {
    throw new TypeError("Invalid event argument");
  }

  if (
    whitelist === undefined ||
    typeof whitelist !== "string" ||
    whitelist.length < 1
  ) {
    throw new TypeError("Invalid whitelist argument");
  }

  if (callback === undefined || typeof callback !== "function") {
    throw new TypeError("Invalid callback argument");
  }

  if (event.origin === whitelist) {
    log.info("received whitelisted domain [" + event.origin + "]");
    callback(event.data);
  } else {
    log.info(
      "received non whitelisted postMessage. Received origin: [" +
        event.origin +
        "] whitelist [" +
        whitelist +
        "]"
    );
  }
}

function broadcast(origin, data) {
  if (postMessageEventsEnabled) {
    if (origin === undefined || origin.length < 1) {
      throw new TypeError("origin is a required field");
    }
    if (data === undefined || data.length < 1) {
      throw new TypeError("data is a required field");
    }

    // INSIGHT - For support on older browsers that support string messaging only we want to enforce sending any object as a string
    let message = typeof data === "object" ? JSON.stringify(data) : data;
    window.parent.postMessage(message, origin);
    return true;
  } else {
    log.info(
      "Window detected to not have a parent to send message to, skipping postMessage event."
    );
    return false;
  }
}

export { listen, broadcast, processReceivedEvent };
