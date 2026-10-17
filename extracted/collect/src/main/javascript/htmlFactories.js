import { isStringEmpty } from './generalUtility'
import { CardinalLogger } from './logger'

const log = CardinalLogger.getInstance("HtmlFactories")

const now = new Date()
const defaultCollectionIframeId = "collector-" + now.getTime()
const defaultCollectionFormId = "collectorForm"
const defaultCollectionWrapperId = "collectionWrapper"

/**
 *  
 * @param {string} dfUrl 
 * @param {string=} wrapperId 
 * @param {string=} frameOnloadCallback 
 * @param {string} binValue 
 * @param {string} nonceValue 
 * @param {string} cardTypeValue
 * @param {Object=} iframeOptions
 */
function collectionFrameAsPost(dfUrl, wrapperId, frameOnloadCallback, binValue, nonceValue, cardTypeValue, iframeOptions) {
  if (dfUrl == undefined || dfUrl.length < 1) {
    throw new TypeError("dfUrl is a required argument")
  }
  let wrapper = collectionFrameAsGet('about:blank', wrapperId, frameOnloadCallback, iframeOptions)
  let form = collectionForm(dfUrl, defaultCollectionFormId, defaultCollectionIframeId, binValue, nonceValue, cardTypeValue)
  wrapper.appendChild(form)

  return wrapper
}

/**
 * 
 * @param {string} dfUrl 
 * @param {string=} wrapperId 
 * @param {string=} frameOnloadCallback
 * @param {Object=} iframeOptions
 */
function collectionFrameAsGet(dfUrl, wrapperId, frameOnloadCallback, iframeOptions) {
  if (dfUrl == undefined || dfUrl.length < 1) {
    throw new TypeError("dfUrl is a required argument")
  }
  wrapperId = wrapperId === undefined ? defaultCollectionWrapperId : wrapperId
  let wrapper = document.createElement("div")
  wrapper.id = wrapperId
  let iframe = hiddenIframe(defaultCollectionIframeId, dfUrl, frameOnloadCallback, iframeOptions)
  wrapper.appendChild(iframe)
  return wrapper
}

/**
 * Creates a form that posts input fields to /Browser/Render endpoint on DFWeb
 * @param {string} dfUrl 
 * @param {string=} binValue 
 * @param {string=} nonceValue 
 * @param {string=} cardTypeValue 
 */
function collectionForm(dfUrl, formId, iframeId, binValue, nonceValue, cardTypeValue) {
  let formElement = form(dfUrl, 'POST')
  formElement.id = formId === undefined ? defaultCollectionFormId : formId

  if (!isStringEmpty(binValue)) {
    formElement.appendChild(input('bin', binValue, 'hidden'))
  }
  if (!isStringEmpty(nonceValue)) {
    formElement.appendChild(input('nonce', nonceValue, 'hidden'))
  }
  if (!isStringEmpty(cardTypeValue)) {
    formElement.appendChild(input('cardType', cardTypeValue, 'hidden'))
  }

  formElement.target = iframeId

  return formElement;
}

/**
 * Creates a generic iframe dom element
 * @param {string} id - The html id of the iframe
 * @param {string=} src - The src attribute the iframe should be created with
 * @param {string | number=} height - The height of the iframe element
 * @param {string | number=} width - The width of the iframe element
 * @param {Object=} options - Optional EMVCo 3DS iframe attribute options
 * @param {boolean=} options.sandboxEnabled - When true, applies sandbox tokens per EMVCo 3DS 2.3.1.1 Table A.24
 * @param {boolean=} options.allowEnabled - When true, applies the allow attribute per EMVCo 3DS 2.3.1.1 Table A.23:
 *   payment *; publickey-credentials-get *; publickey-credentials-create *
 * @param {boolean=} options.isMethodFrame - When true, uses the 3DS Method iframe sandbox token set (no allow-pointer-lock
 *   per Table A.24 note). When false/undefined, uses the challenge iframe sandbox token set (includes allow-pointer-lock).
 * @returns {Object} Newly created iframe DOM element
 */
function iframe(id, src, height, width, options) {
  var iframe = document.createElement('iframe');

  iframe.id = id;
  iframe.src = src === undefined ? 'about:blank' : src
  if (height !== undefined) {
    iframe.height = height
  }
  if (width !== undefined) {
    iframe.width = width
  }
  iframe.border = 0;
  iframe.frameBorder = 0; // IE Fix to remove border
  iframe.name = id

  if (options) {
    if (options.sandboxEnabled) {
        iframe.setAttribute('sandbox',
          'allow-forms allow-scripts allow-same-origin allow-pointer-lock allow-popups');
        log.debug('sandbox attribute set on iframe [' + id + ']')
    }
    else{
        log.debug('sandbox attribute not set on iframe [' + id + ']')
    }

    if (options.allowEnabled) {
      iframe.setAttribute('allow',
        'payment *; publickey-credentials-get *; publickey-credentials-create *');
      log.debug('allow attribute set on iframe [' + id + ']')
    }
    else{
        log.debug('sandbox attribute not set on iframe [' + id + ']')
    }
  }

  return iframe;
}

/**
 * Creates a hidden iframe
 * @param {string} iframeId An override id for the iframe
 * @param {string} iframeSrc The URL to use as the iframe 'src', this should be the DFUrl with query params on a standard DF call and empty during a bin POST.
 * @param {function} onloadCallback An optional function to run when the iframe `window.onload` event is triggered
 * @param {Object=} iframeOptions - Optional EMVCo 3DS iframe attribute options (see iframe())
 * @returns iframe - The iframe that was created and injected into the page
 */
function hiddenIframe(iframeId, iframeSrc, onloadCallback, iframeOptions) {
  // We have a url - build iframe to inject into page
  let iframeElement = iframe(iframeId, iframeSrc, 1, 1, iframeOptions)

  if (onloadCallback !== undefined && typeof onloadCallback === 'function') {
    iframeElement.onload = onloadCallback
  }

  // Hide iframe and push off of page view
  // INSIGHT - According to MDN docs Opera .style.PROP is read only - so we must
  // modify the values indirectly: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style      
  let iframeStyles = iframeElement.style;
  if (iframeOptions && iframeOptions.visibilityHidden) {
    iframeStyles.visibility = 'hidden';
  } else {
    iframeStyles.display = 'none';
  }
  iframeStyles.position = 'absolute';
  iframeStyles.top = '-1000px';
  iframeStyles.left = '-1000px';

  return iframeElement
}

/**
 * Creates a generic form element
 * @param {string} url The url the form should sumbit to
 * @param {string=} method=get The method the form should use
 * @param {string=} id The HTML ID of the element
 * @returns {Object} newly created form DOM element
 */
function form(url, method, id) {
  if (url != undefined) {
    var form = document.createElement('form');
    method = method == undefined ? 'get' : method

    form.action = url;
    form.method = method;

    if (id !== undefined) {
      form.id = id
    }

    return form;
  } else {
    throw new TypeError("URL is required to create a form")
  }
}

/**
 * 
 * @param {string=} id 
 * @param {string} source 
 * @param {string=} altText 
 */
function image(id, source, altText) {
  var image = document.createElement('img')

  image.id = id || ''
  image.src = source
  image.alt = altText || ''

  return image
}

/**
 * Creates a generic input element
 * @param {string} name - The name attribute of the input field
 * @param {string} value - The value attribute of the input field
 * @param {string} type - The type attribute of the input field
 * @returns {Object} Newly created input field DOM element
 */
function input(name, value, type) {
  if (name !== undefined) {
    let input = document.createElement('input');

    type = type == undefined ? 'hidden' : type

    input.name = name;
    input.type = type;

    if (value != undefined) {
      input.value = value;
    }

    return input;
  } else {
    throw new TypeError("Name is required to create an input")
  }
}

function stepUpFormV1(url, payload, sessionId, termUrl, iframeId) {
  let formElement = form(url, "POST")

  formElement.appendChild(input('PaReq', payload, 'hidden'))
  formElement.appendChild(input('MD', sessionId, 'hidden'))
  formElement.appendChild(input('TermUrl', termUrl, 'hidden'))
  formElement.appendChild(submitButton(undefined, 'hide outOfView'))

  formElement.target = iframeId

  return formElement;
}

function stepUpFormV2(url, payload, sessionId, iframeId) {
  let formElement = form(url, "POST")

  formElement.appendChild(input('creq', payload, 'hidden'))
  formElement.appendChild(input('threeDSSessionData', sessionId, 'hidden'))
  formElement.appendChild(submitButton(undefined, 'hide outOfView'))

  formElement.target = iframeId

  return formElement;
}

/**
 * Creates a generic script tag
 * @param {string=} source - The src attribute of the script tag
 * @returns {Object} Newly created script tag DOM element
 */
function script(source, id) {
  var script = document.createElement('script');

  script.id = id || '';
  script.src = source;
  script.type = 'text/javascript';
  script.async = true;

  return script;
}

function submitButton(id, classList) {
  let button = document.createElement('button')
  button.type = 'submit'
  button.id = id || ''

  if (classList !== undefined && classList.length > 0) {
    button.className += classList
  }

  return button
}

export { collectionForm, collectionFrameAsGet, collectionFrameAsPost, defaultCollectionIframeId, defaultCollectionFormId, defaultCollectionWrapperId, iframe, hiddenIframe, form, image, input, stepUpFormV1, stepUpFormV2, script, submitButton }