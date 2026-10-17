/**
 * Given a fully qualified URL this function will extract the host value including the protocol and dropping the path
 * @param {string} url The full URL to pull the host from
 * @returns {string} host value including protocol
 */
function getHostFromFullUrl(url) {
  if (url == undefined) {
    throw new TypeError('Url is a required argument')
  }

  let urlParts = url.split('/')
  if (urlParts.length > 2) {
    return urlParts[0] + '//' + urlParts[2]
  } else {
    throw new TypeError('Input was not a valid URL')
  }
}

/**
 * Gets the current domain that the JavaScript is being servered from
 * @returns {string} current domain including protocol
 */
function getCurrentDomain() {
  if (window.location.origin !== undefined) {
    return window.location.origin;
  } else {
    return window.location.protocol + '//' + window.location.host;
  }
}

/**
 * Derive the currect active environment based on the URL the JavaScript is being served up from
 * @returns {string} The shorthand environment
 */
function getCurrentEnvironment() {
  let domainParts = getCurrentDomain().split('/')

  if (domainParts.length === 3) {
    let host = domainParts[2]
    let hostParts = host.split('.')
    if (hostParts.length === 3) {
      let subDomain = hostParts[0]

      switch (subDomain) {
        default:
        case 'centinelapi':
          return 'prod'
        case 'centinelapistag':
          return 'stag'
        case 'centinelapiqa':
          return 'qa'
        case 'centinelapidev':
          return 'dev'
      }
    }
  }

  return 'stag'
}

/**
 * Converts a string boolean into a actual boolean. This function is needed to convert boolean values passed from the Java tier and
 * properly escaped to the JavaScript tier.
 * @param {string} value 
 * @return {boolean}
 */
function fromStringToBoolean(value) {
  if (value === 'true') {
    return true
  }
  return false
}

/**
 * Checkes to see if a string has a value. Due to how data is passed from the Java tier it considers the string value 'null' to 
 * be empty.
 * @param {string} input value to check
 * @returns {boolean}
 */
function isStringEmpty(input) {
  if ((input == undefined || input === 'null') || input.length < 1) {
    return true
  } else {
    return false
  }
}

/**
 * Converts the string value 'null' from the Java layer to a JavaScript undefined
 * @param {string} input value to format
 * @returns {undefined || input}
 */
function fromNullToUndefined(input) {
  if (input === 'null') {
    return undefined
  }
  return input
}

function formatServerSideErrorReport(errorMessage) {
  if (errorMessage == undefined) {
    errorMessage = 'Unknown error encountered, no details passed'
  } else if (typeof errorMessage === 'object') {
    errorMessage = JSON.stringify(errorMessage)
  }
  return errorMessage += " from UserAgent [" + window.navigator.userAgent + "]"
}

export { getHostFromFullUrl, getCurrentDomain, getCurrentEnvironment, fromStringToBoolean, isStringEmpty, formatServerSideErrorReport, fromNullToUndefined }

