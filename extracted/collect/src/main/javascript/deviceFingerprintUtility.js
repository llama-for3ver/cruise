import { collectionFrameAsGet, collectionFrameAsPost } from './htmlFactories.js'
import { CardinalLogger } from "./logger"
import Constants from './constants'
import { isStringEmpty } from './generalUtility.js'
import {submitForm} from "./htmlUtility";

const uuid = require('uuid/v4')
const RSVP = require('rsvp')

const log = CardinalLogger.getInstance("DFUtility")

/**
 * 
 * @param {string} dfUrl 
 * @param {string} collectionFrameWrapperId 
 * @param {function} frameOnloadCallback
 * @param {string=} binValue 
 * @param {string=} cardTypeValue 
 * @param {boolean} forcePost
 * @param {Object=} iframeOptions - Optional EMVCo 3DS iframe attribute options (see htmlFactories.iframe)
 */
function injectCollectionFrame(dfUrl, collectionFrameWrapperId, frameOnloadCallback, binValue, cardTypeValue, forcePost, iframeOptions) {
  return new RSVP.Promise(function (resolve, reject) {
    try {
      // INSIGHT - To keep the DOM clean, make sure we haven't already run this call once. With the addition of Bin based detection its possible this call could be triggered multiple times per page load.
      let oldCollectionWrapper = document.getElementById(collectionFrameWrapperId)
      if (oldCollectionWrapper !== null) {
        document.body.removeChild(oldCollectionWrapper);
        log.debug('removing existing collection iframe')
      }

      dfUrl = addOriginToDFUrl(dfUrl)

      let collectionWrapper
      // If we have a bin value we need to post that in a form
      if (!isStringEmpty(binValue) || forcePost) {
        log.debug('Bin Value or force post enabled')
        collectionWrapper = collectionFrameAsPost(dfUrl, collectionFrameWrapperId, frameOnloadCallback, binValue, uuid(), cardTypeValue, iframeOptions)

        log.debug('injecting POST collection frame')
        document.body.appendChild(collectionWrapper)

        log.debug('submitting POST form')
        submitForm(collectionWrapper.querySelector('form'))
      } else {
        log.debug("No bin value detected")
        // otherwise we can simply use the iframe src to do a get
        collectionWrapper = collectionFrameAsGet(dfUrl, collectionFrameWrapperId, frameOnloadCallback, iframeOptions)

        log.debug('injecting GET collection frame')
        document.body.appendChild(collectionWrapper)
      }

      resolve(collectionWrapper, 'injectCollectionFrame');

    } catch (error) {
      log.error('Failed while attempting to create DF window: ' + error);
      reject(error);
    }
  })
}

function addOriginToDFUrl(dfUrl) {
  if (dfUrl !== undefined && dfUrl.includes('?')) {
    dfUrl += '&' + Constants.DF_ORIGIN_KEY + '=' + Constants.DF_ORIGIN_VALUE
  }
  return dfUrl
}

export { injectCollectionFrame, addOriginToDFUrl }