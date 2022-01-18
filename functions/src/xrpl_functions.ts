export {};

const functions = require("firebase-functions");

const express = require("express");
const cors = require("cors");

const axios = require("axios");
const utils = require("./utils.js");

const _express = express();
var corsOptions = {
  origin: true
};
_express.use(cors(corsOptions));
//
interface RPCRequestBody {
  method: string,
  params: any
}

interface RequestBody {
    server_url: string,
    request_obj: RPCRequestBody
}

interface RequestObject {
  body: RequestBody
}

async function doRPCRequest(server_url: string, request_obj: RPCRequestBody){
  var response = null;
  try{
    response = await axios.post(server_url, request_obj);
  }
  catch(error){
    //
  }
  
  if(utils.isUndefinedOrNull(response)){
    //console.log("axios error");
    return null;
  }
  else{
    //console.log("response: " + JSONBeautify(response["data"]));
    return response["data"];
  }
}

function isRequestAllowed(server_url: string, request_obj: RPCRequestBody){
  console.log("isRequestAllowed(): START");
  console.log("isRequestAllowed(): server_url = " + server_url + ", request_obj: ", request_obj);

  //check request malformation
  if(utils.isUndefinedOrNull(request_obj)){
    console.log("isRequestAllowed(): CHECKPOINT #0.1");
    return false;
  }
  if(utils.isUndefinedOrNull(server_url)){
    console.log("isRequestAllowed(): CHECKPOINT #0.2");
    return false;
  }
  var req_method : string = request_obj.method;
  if(utils.isUndefinedOrNull(req_method)){ //if has no "method" field
    console.log("isRequestAllowed(): CHECKPOINT #0.3");
    return false;
  }
  var req_params : any[] = request_obj.params;
  if(utils.isUndefinedOrNull(req_params) || req_params.length !== 1){ //if has no "params" field or it's void or has too much params
    console.log("isRequestAllowed(): CHECKPOINT #0.4");
    return false;
  }
  console.log("isRequestAllowed(): CHECKPOINT #1");
  
  //check the RPC request's server url
  //TODO ADD ALL THE OTHER PUBLIC SERVERS
  const allowed_server_urls : string[] = [
    "http://xls20-sandbox.rippletest.net:51234",
    "https://s.altnet.rippletest.net:51234",
    "https://xrplcluster.com",
    "https://xrpl.ws",
    "https://s1.ripple.com:51234",
    "https://s2.ripple.com:51234"
  ];
  var server_url_index : Number = allowed_server_urls.indexOf(server_url);
  if(server_url_index < 0){ //if the server is not an allowed one
    return false;
  }
  console.log("isRequestAllowed(): CHECKPOINT #2");
  
  //check the RPC request's method
  const allowed_methods : string[] = [
    "account_nfts",
    "account_info",
    "submit",
    "server_info"
  ];
  var req_method_index : Number = allowed_methods.indexOf(request_obj.method);
  if(req_method_index < 0){ //if it's not an allowed method
    return false;
  }
  console.log("isRequestAllowed(): CHECKPOINT #3");
  
  //check each method specifically
  var needed_params : string[] = [];
  var allowed_params : string[] = [];
  if(req_method === "account_nfts"){
    needed_params = [
      "account"
    ];
  }
  else if(req_method === "account_info"){
    needed_params = [
      "account"
    ];
    allowed_params = [
      "strict",
      "ledger_index",
      "queue"
    ];
  }
  else if(req_method === "submit"){
    needed_params = [
      "tx_blob"
    ];
  }
  else if(req_method === "server_info"){
    //
  }
  else{ //catch-all
    return false;
  }
  console.log("isRequestAllowed(): CHECKPOINT #4");
  
  //check if all the needed params are present
  for(let i = 0; i < needed_params.length; i++){ //for each needed param
    let needed_param_value : any = req_params[0][needed_params[i]];
    if(utils.isUndefinedOrNull(needed_param_value)){ //if it's not present in the request
      return false;
    }
  }
  console.log("isRequestAllowed(): CHECKPOINT #5");
  
  //check if all the params in the request are allowed
  var req_params_keys : string[] = Object.keys(req_params[0]);
  for(let i = 0; i < req_params_keys.length; i++){ //for each param in the request
    let req_params_key_index : Number = needed_params.indexOf(req_params_keys[i]);
    if(req_params_key_index >= 0){ //if it's a needed one
      continue; //then it's ok
    }
    
    //if it's not a needed one, check if it's allowed
    req_params_key_index = allowed_params.indexOf(req_params_keys[i]);
    if(req_params_key_index < 0){ //if it's not an allowed one
      return false;
    }
  }
  console.log("isRequestAllowed(): CHECKPOINT #6");
  
  return true;
}

_express.post("/doRPCRequest", async (req: RequestObject, res: any) => {
  try {
    console.log("doRPCRequest started!");
    const request_body : RequestBody = req.body;
    const RPC_request_obj : RPCRequestBody = request_body.request_obj;
    const RPC_request_server_url : string = request_body.server_url;
    
    const is_request_allowed = isRequestAllowed(RPC_request_server_url, RPC_request_obj);
    if(!is_request_allowed){
      throw new Error("request not allowed");
    }
    console.log("request is allowed");
    
    console.log("sending the request...");
    const response_obj = await doRPCRequest(RPC_request_server_url, RPC_request_obj);
    if(utils.isUndefinedOrNull(response_obj)){
      throw new Error("RPC request does not succeded");
    }
    console.log("response received!");
    
    res.status(200).json({ data: response_obj, error: null });
  } catch (e) {
    res.status(201).json({ data: null, error: e.message});
  }
});

exports.WebApi = functions.region("europe-west1").https.onRequest(_express);
