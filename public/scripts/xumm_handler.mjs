import { 
   isUndefinedOrNull, retrieveUrlParameters
} from "./utils.mjs";

var xumm_parameters = null;
var payload_uuid = null;
var user_token = null;

export const isXumm = function(){
  if(/xumm/i.test(navigator.userAgent)){
    if(xumm_parameters === null){ //if xumm_parameters has not been already initialized
      extractXappParameters();
      //console.log("isXumm(): xumm_parameters: ", xumm_parameters)
    }
    return true;
  }
  
  return false;
}

function postXUMMCommand(XUMM_command_obj){
  if(typeof window.ReactNativeWebView !== "undefined"){
    window.ReactNativeWebView.postMessage(JSON.stringify(XUMM_command_obj));
  }
}
export const handleXUMMRedirection = function(_url){
  if(isUndefinedOrNull(_url) || _url.length === 0){
    return;
  }
  
  const XUMM_command_obj = {
    "command": "openBrowser",
    "url": _url
  };
  
  postXUMMCommand(XUMM_command_obj);
}
export const handleXUMMSignFlow = function(payload_uuid){
  const XUMM_command_obj = {
    "command": "openSignRequest",
    "uuid": payload_uuid
  };
  
  postXUMMCommand(XUMM_command_obj);
}

async function callRestApiWrapper(axios_handler, method, endpoint_url, data = {}){
  const x_app_token = xumm_parameters["xAppToken"];
  
  const _data = {
    ...data,
    "xAppToken": x_app_token
  };
  return axios_handler.callRestApi(method, endpoint_url, _data);  
}

export const extractXappParameters = function(){
  const url_parameters = retrieveUrlParameters();
  
  const xAppToken_array = url_parameters["xAppToken"];
  if(isUndefinedOrNull(xAppToken_array) || xAppToken_array.length === 0){
    return false;
  }
  xumm_parameters["xAppToken"] = xAppToken_array[0];
  
  const xAppStyle_array = url_parameters["xAppStyle"];
  if(isUndefinedOrNull(xAppStyle_array) || xAppStyle_array.length === 0){
    xumm_parameters["xAppStyle"] = "LIGHT"; //LIGHT is the default
    return true;
  }
  xumm_parameters["xAppStyle"] = xAppStyle_array[0];
  
  return true;
}


