import { CardinalLogger } from "./logger"

const log = CardinalLogger.getInstance("HtmlUtility")

function injectFormIntoIframe(form, iframe) {
  if (form !== undefined && iframe !== undefined) {

    var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

    // INSIGHT - In IE we may not have a body present even though the template includes a body. In this case we need to add the body manually before we can inject our form into it.
    if (iframeDocument.body === undefined || iframeDocument.body === null) {
      iframeDocument.open();
      iframeDocument.write('<body></body>');
      iframeDocument.close();
    }
    iframeDocument.body.appendChild(form);
    return true;
  } else {
    return false
  }
}

/**
 * Execute a function when an event is triggered on a dom element
 * @param {string} event - The trigger event
 * @param {Object} element - The element to bind the event trigger to
 * @param {function} callback - The function to call when the event is triggered
 */
function bind(event, element, callback) {
  var el = element || document;

  if (el.addEventListener) {
    el.addEventListener(event, callback, false);
  } else if (el.attachEvent) {
    el.attachEvent('on' + event, callback);
  }

  log.debug('Event listener attached to event [' + event + '] to [' + element + ']');
}

function unbind(event, element, functionToRemove) {
  var el = element || document;

  if (el.removeEventListener) {
    el.removeEventListener(event, functionToRemove, false);
  } else if (el.detachEvent) {
    el.detachEvent('on' + event, functionToRemove);
  }

  log.debug('Event listener attached to event [' + event + '] to [' + element + ']');
}


function submitForm(form) {
  if (form !== undefined && form !== null) {
    // Post form and redirect back to the merchant page
    log.debug("Using new automated form submission");
    form.submit()
  } else {
    log.error('form is invalid [' + form + '] unable to auto submit')
  }
}

export { injectFormIntoIframe, bind, unbind, submitForm }

// Export all the things
export default {
  injectFormIntoIframe: injectFormIntoIframe,
}