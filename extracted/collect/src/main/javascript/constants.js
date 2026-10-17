const constants = {

  EVENTS: {
    STEP_UP: {
      ACS_REDIRECTION: 'stepUp.acsRedirection',
      COMPLETED: 'stepUp.completion',
      ERROR: 'stepUp.error'
    },
    COLLECT: {
      PROFILE_COMPLETE: 'profile.completed'
    },
  },
  FIDO: {
    EVENTS: {
      FIDO_INIT: 'fido.init',
      ERROR: 'fido.error'
    },
    COMMAND_TYPE:{
      INITIALIZATION: 'INITIALIZATION',
      AUTHORIZATION_REQUEST: 'AUTHORIZATION_REQUEST'
    },
    DUMMY_PROOF_VERIFIER: "dGhRcy1UpcyShLwHr1Iw15IXBySb29KmLXIZlcNmlmG",
    LOCAL_STORAGE_KEY: 'cardinalSessionContextObject',
    TYPE_LOCAL_STORAGE : 'localStorage',
    PRODUCT_CODE: 'CRD',
    SOURCE: 'VDI',
    IFRAME_ID: 'fidoIframeView',
    INITIALIZATION_IFRAME_STYLE: 'visibility: hidden; position: absolute; width:0px; height:0px; border:0px; display: none; top: -10px; left: -10px;',
    BINDING_IFRAME_STYLE: 'position: absolute; top:0px; left:0px; width:100%; height:100%; border:0px;',
    B2CIAM_PATH: '/oauth2/authorization/request/hub#msg=',
    REQUEST_TIMEOUTS: {
      INIT: 12000,
      CHALLENGE: 480000
    },
    SUBMIT_FLOW: {
      AUTOMATIC: 'AUTOMATIC',
      CONTINUE_BUTTON: 'CONTINUE_BUTTON'
    }
  },
  ACTION_CODES: {
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR'
  },
  DF_ORIGIN_KEY: 'origin',
  HEIGHT: 600,
  WIDTH: 500,
  DF_ORIGIN_VALUE: 'CruiseAPI',
}

export default constants