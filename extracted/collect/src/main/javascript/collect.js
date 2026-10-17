import Constants from './constants'
import { injectCollectionFrame } from "./deviceFingerprintUtility.js";
import { listen as listenForPostMessage, broadcast as broadcastPostMessage } from './postMessageUtility'
import { CardinalLogger } from './logger'
import sharedConfigurations from './configurations'
import { getHostFromFullUrl, isStringEmpty, fromStringToBoolean, formatServerSideErrorReport } from './generalUtility'
import { ensurePolyfillsLoaded } from './polyfiller'
import { submitForm } from './htmlUtility'
import RSVP from 'rsvp'

// NEXTREV: Currently this loads the polyfill regardless of the browsers need to polyfill or not. Ideally the polyfill should only be delivered to the browser if needed
if (!window.Promise) {
  window.Promise = RSVP.Promise;
}

const log = CardinalLogger.getInstance("Collect");

const collectionFrameWrapperId = "cardinal-collectionWrapper"
let configurations;
let redirectHasBeenSubmitted = false;
let isRedirectEnabled = false;

/**
 * {{dfUrl: string, bin: string, cardType: string}}
 */
function run(initializationSettings) {
  try {
    return ensurePolyfillsLoaded()
      .then(() => {
        CardinalLogger.configure({
          appenders: (initializationSettings && initializationSettings.ddcRemoteLogging) ? ['console', 'ajax'] : ['console']
        });
        log.info("Collection starting up");
        if (initializationSettings !== undefined && typeof initializationSettings === 'object') {
          configurations = initializationSettings;
          if (initializationSettings.mcsId) {
            sharedConfigurations.mcsId = initializationSettings.mcsId;
            CardinalLogger.addMDC({ mcsId: initializationSettings.mcsId });
          }
          if (initializationSettings.orgUnitId) {
            sharedConfigurations.orgUnitId = initializationSettings.orgUnitId;
            CardinalLogger.addMDC({ orgUnitId: initializationSettings.orgUnitId });
          }
          if (configurations.isRedirectEnabled !== undefined) {
            isRedirectEnabled = configurations.isRedirectEnabled;
          }
          if ("dfUrl" in configurations && !isStringEmpty(configurations.dfUrl)) {
            listenForPostMessage(getHostFromFullUrl(configurations.dfUrl), processDfResponse);
            log.debug("Injecting Collection IFrame");
            let dfLoadedCallback = () => {
              log.info("DF page has loaded, profiling should be starting now");
            }
            let binPreloadEnabled = false
            if (configurations.binPreloadEnabled != undefined) {
              binPreloadEnabled = fromStringToBoolean(configurations.binPreloadEnabled);
            }
            log.info('[Collect] iframeVisibilityHidden raw value from server: "' + configurations.iframeVisibilityHidden + '"');
            let iframeOptions = {
              sandboxEnabled: fromStringToBoolean(configurations.iframeSandboxEnabled),
              allowEnabled: fromStringToBoolean(configurations.iframeAllowEnabled),
              visibilityHidden: fromStringToBoolean(configurations.iframeVisibilityHidden),
              isMethodFrame: true
            }
            injectCollectionFrame(configurations.dfUrl, collectionFrameWrapperId, dfLoadedCallback, configurations.bin, configurations.cardType, binPreloadEnabled, iframeOptions)
              .then(function (collectionWrapper) {
                // Detect resource-level load failures on the collection iframe (e.g. network errors, 4xx/5xx).
                // Note: silent sandbox policy violations do NOT fire onerror, but this still captures hard failures.
                var dfIframe = collectionWrapper ? collectionWrapper.querySelector('iframe') : null
                if (dfIframe) {
                  dfIframe.onerror = function () {
                    log.error('Collection iframe load error. iframeSandboxEnabled [' + iframeOptions.sandboxEnabled + '] iframeAllowEnabled [' + iframeOptions.allowEnabled + ']')
                    handleError('IFRAME_LOAD_ERROR: iframeSandboxEnabled=' + iframeOptions.sandboxEnabled + ' iframeAllowEnabled=' + iframeOptions.allowEnabled)
                  }
                }
              })
              ['catch'](function (e) {
                log.error('Failed to set up collection iframe error handler: ' + e)
              })
          } else {
            throw new TypeError("dfUrl is required");
          }
        } else {
          throw new TypeError("Invalid Configuration Object");
        }
      })
    ['catch']((error) => {
      handleError(error.message);
    })
  } catch (error) {
    handleError(error.message);
  }
}

RSVP.on('error', function (reason) {
  handleError(reason);
});

function processDfResponse(data) {
  try {
    if (configurations && configurations.ddcDetailedLogging) {
      try {
        log.info('nucleus_visibility Collect - Post Message Triggered: ' + JSON.stringify(data));
      } catch(e) {
        log.info('nucleus_visibility Collect - Post Message Triggered: [unserializable]');
      }
    }

    if (data !== undefined) {
      data = typeof data === 'string' ? JSON.parse(data) : data;

      if (data.MessageType !== undefined) {
        switch (data.MessageType) {
          case 'profile.complete':
            if (configurations && configurations.ddcDetailedLogging) {
              try {
                log.info('nucleus_visibility [PROFILE-COMPLETE] dfReferenceId=' + (configurations.referenceId || '') +
                  ' orgUnitId=' + (configurations.orgUnitId || '') +
                  ' results=' + JSON.stringify(data.Results || []));
                const dfResultsEl = document.getElementById('dfResults');
                if (dfResultsEl && data.Results) {
                  dfResultsEl.value = JSON.stringify(data.Results);
                }
              } catch(e) {
                log.warn('nucleus_visibility [PROFILE-COMPLETE] failed to serialize results');
              }
            }
            let postMessageData;
            if (configurations.responseVersion !== undefined && configurations.responseVersion === 2) {
              postMessageData = generateV2Result(data);
            } else {
              postMessageData = {
                MessageType: Constants.EVENTS.COLLECT.PROFILE_COMPLETE,
                SessionId: configurations.referenceId,
                Status: true
              }
            }
            notifyMerchant(postMessageData);
            break;
          case 'profile.error':
            log.error("Profiling returned an error, failing.");
            if (configurations && configurations.ddcDetailedLogging) {
              log.error('nucleus_visibility [PROFILE-ERROR] dfReferenceId=' + (configurations.referenceId || '') +
                ' orgUnitId=' + (configurations.orgUnitId || '') +
                ' reason=profile.error — MDCWeb reported a profiling error, profile.complete will NOT be sent.');
            }
            handleError();
            break;
          default:
            log.error('Unknown MessageType found [' + data.MessageType + ']');
            if (configurations && configurations.ddcDetailedLogging) {
              log.error('nucleus_visibility [PROFILE-ERROR] dfReferenceId=' + (configurations.referenceId || '') +
                ' orgUnitId=' + (configurations.orgUnitId || '') +
                ' reason=unexpected_message_type messageType=' + data.MessageType +
                ' — unexpected postMessage from MDCWeb, profile.complete will NOT be sent.');
            }
            handleError();
            break;
        }
      } else {
        log.warn("invalid data found: " + data);
      }
    } else {
      log.warn('invalid data found: ' + data);
    }
  } catch (error) {
    log.error('Exception while processing DF Response: ' + error);
  }
}

function generateV2Result(dfResponse) {
  let response = {
    MessageType: Constants.EVENTS.COLLECT.PROFILE_COMPLETE,
    Payload: {
      ActionCode: Constants.ACTION_CODES.SUCCESS,
      SessionId: configurations.referenceId,
      DataSources: {
        CardinalData: {
          Attempted: false,
          Completed: false
        },
        MethodUrl: {
          Attempted: false,
          Completed: false
        }
      }
    }
  }

  if (dfResponse !== undefined && dfResponse.Results !== undefined && dfResponse.Results instanceof Array && dfResponse.Results.length > 0) {
    dfResponse.Results.forEach(entry => {
      // INSIGHT - DFWeb can send back a negative time to indicate that the process was not attempted
      if ((entry.DataSource == 'CardinalData' || entry.DataSource == 'MethodURL') && entry.ElapsedTime > -1 && entry.Status !== undefined) {
        let entryKey = entry.DataSource === 'MethodURL' ? 'MethodUrl' : entry.DataSource
        response.Payload.DataSources[entryKey].Attempted = true
        response.Payload.DataSources[entryKey].Completed = entry.Status
      }
    });
  }

  return response
}

function handleError(errorMessage) {
  let referenceId = '';
  let responseVersion = 1;
  if (configurations !== undefined && typeof configurations === 'object') {
    referenceId = (configurations.referenceId != undefined && configurations.referenceId.length > 0) ? configurations.referenceId : '';
    responseVersion = (configurations.responseVersion != undefined && !isNaN(configurations.responseVersion)) ? configurations.responseVersion : 1;
  }

  if (configurations && configurations.ddcDetailedLogging) {
    log.error('nucleus_visibility [PROFILE-ERROR] dfReferenceId=' + referenceId +
      ' orgUnitId=' + (configurations.orgUnitId || '') +
      ' errorMessage=' + (errorMessage || 'none') +
      ' — DDC error handler invoked, collectRedirect will fire with ERROR actionCode, no profiling timings available.');
  }

  let postMessageData;

  if (responseVersion === 2) {
    postMessageData = generateV2Result();
    postMessageData.Payload.ActionCode = Constants.ACTION_CODES.ERROR;
  } else {
    postMessageData = {
      MessageType: Constants.EVENTS.COLLECT.PROFILE_COMPLETE,
      SessionId: referenceId,
      Status: false
    }
  }

  if (errorMessage !== undefined && errorMessage.length > 0) {
    errorMessage = formatServerSideErrorReport(errorMessage);
    document.getElementById('error').value = errorMessage;
  }

  notifyMerchant(postMessageData);
}

function notifyMerchant(postMessageData) {
  broadcastPostMessage('*', postMessageData);
  log.debug('Notifying merchant of completion.');

  if (isRedirectEnabled && !redirectHasBeenSubmitted) {
    if (configurations.responseVersion == 2) {
      document.getElementById('state').value = JSON.stringify(postMessageData.Payload.DataSources);
      document.getElementById('actionCode').value = postMessageData.Payload.ActionCode;
    } else {
      document.getElementById('state').value = postMessageData.Status;
    }

    submitForm(document.getElementById('redirectionForm'));
    redirectHasBeenSubmitted = true;
  }
}

export { run, collectionFrameWrapperId, handleError, processDfResponse, generateV2Result }