import { Promise } from 'rsvp'
import { CardinalLogger } from "./logger"

const log = CardinalLogger.getInstance("Polyfiller")

function ensurePolyfillsLoaded() {
  let polyfills = []

  if (typeof Object.assign !== 'function') {
    log.debug('polyfilling Object.assign')
    polyfills.push(import(/* webpackChunkName: "objectAssignPolyfill" */ './polyfills/objectAssign'))
  }

  if(!String.prototype.includes){
    log.debug('polyfilling String.includes')
    polyfills.push(import(/* webpackChunkName: "includesPolyfill" */ './polyfills/stringIncludes'))
  }

  return Promise.all(polyfills)
}

export { ensurePolyfillsLoaded }