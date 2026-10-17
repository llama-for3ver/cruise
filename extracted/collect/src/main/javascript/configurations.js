import { getCurrentEnvironment } from './generalUtility'
const uuid = require('uuid/v4')

let configurations = {
  environment: getCurrentEnvironment(),
  mcsId: null,
  tId: uuid(),
  urls: {
    s3Writer: 'https://writer.cardinalcommerce.com'
  },
  usePostMessageCompletion: false,
  version: VERSION,
  useMetaTag: false,
  useS3Push: false,
  fido:{
    key: null,
    referenceId: null,
    vppsBaseUrl: null,
    merchantOrigin: null,
    threeDSTransId: null,
    apn:null,
    frontEndId: null,
    authorizationToken: null,
    authorizationEndpoint: null,
    serviceJwt: null,
    vppsChallengePath: null,
    hasTokenReceived : false,
    initRequestId: null,
    challengeRequestId: null
  }
}

export default configurations
export { configurations }