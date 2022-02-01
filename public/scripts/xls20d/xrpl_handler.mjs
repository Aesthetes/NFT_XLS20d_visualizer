import { isUndefinedOrNull, fetchWithTimeout, printWithPrefix, JSONBeautify,
  deepCopyObject
} from "./../utils.mjs";

import {
  callRestApi
} from "./../network_handler.mjs"

var xrpl_testnet_obj = {client: null, network: "Testnet", watchdog_timer: null, is_wss: true, server_url: null};
var xrpl_mainnet_obj = {client: null, network: "Mainnet", watchdog_timer: null, is_wss: true, server_url: null};
var xrpl_xls20d_obj = {client: null, network: "XLS20d", watchdog_timer: null, is_wss: true, server_url: null};

const RPC_REQUEST_ENDPOINT = "xrpl_functions-WebApi/doRPCRequest";

export const XRPLStringToHexString = function(_string){
  return xrpl.convertStringToHex(_string);
}

export const getCorrectXRPLClientObj = function(network){
  const _prefix = "getCorrectRippleApiObj: ";
  if(network === "Testnet"){
    return xrpl_testnet_obj;
  }
  else if(network === "Mainnet"){
    return xrpl_mainnet_obj;
  }
  else if(network === "XLS20d"){
    return xrpl_xls20d_obj;
  }
  else{
    throw new Error("unknown network");
  }
}

export const getServersUrls = function(xrpl_network, connection_method){
  if(xrpl_network === "XLS20d"){
    if(connection_method === "wss"){
      return [
        "wss://xls20-sandbox.rippletest.net:51233"
      ];
    }
    else{ //rpc
      return [
        "http://xls20-sandbox.rippletest.net:51234"
      ];
    }
  }
  else if(xrpl_network === "Testnet"){
    if(connection_method === "wss"){
      return [
        "wss://testnet.xrpl-labs.com",
        "wss://s.altnet.rippletest.net"
      ];
    }
    else{ //rpc
      return [
        "https://s.altnet.rippletest.net:51234"
      ];
    }
  }
  else{ //Mainnet
    if(connection_method === "wss"){
      return [
        "wss://xrplcluster.com",
        "wss://xrpl.ws",
        "wss://s1.ripple.com",
        "wss://s2.ripple.com"
      ];
    }
    else{ //rpc
      return [
        "https://xrplcluster.com",
        "https://xrpl.ws",
        "https://s1.ripple.com:51234",
        "https://s2.ripple.com:51234"
      ];
    }
  }
}
export const connectToServer = async function(xrpl_obj, server_url){
  
  xrpl_obj.client = new xrpl.Client(server_url);
  try{
    await xrpl_obj.client.connect();
  } catch(error){
    //
  }
  
  return xrpl_obj.client.isConnected();
}
export const connectToAServer = async function (xrpl_obj, xrpl_network){
  const server_urls = getServersUrls(xrpl_network, "wss");
  
  var is_connected = false;
  for(let i = 0; i < server_urls.length && !is_connected; i++){
    is_connected = await connectToServer(xrpl_obj, server_urls[i]);
  }
  
  if(!is_connected){
    throw new Error("Unable to connect to a rippled server");
  }
  
  setConnectionWatchdogTimer(xrpl_obj);  
}

const timeout_time = 2 * 60 * 1000;
export const tryDisconnect = async function(xrpl_obj, num_tentative = 1){
  var is_connected = xrpl_obj.client.isConnected();
  if(!is_connected){
    return;
  }
  
  await xrpl_obj.client.disconnect();
  is_connected = xrpl_obj.client.isConnected();
  if(is_connected){
    if(num_tentative < 10){
      await tryDisconnect(xrpl_obj, num_tentative + 1);
    }
    else{
      return false;
    }
  }
  else{
    xrpl_obj.client = null;
    return true;
  }
}
function setConnectionWatchdogTimer(xrpl_obj){
  xrpl_obj.watchdog_timer = setTimeout(tryDisconnect, timeout_time, xrpl_obj);
}
function kickConnectionWatchdogTimer(xrpl_obj){
  clearTimeout(xrpl_obj.watchdog_timer);
  setConnectionWatchdogTimer(xrpl_obj);
}

export const logConnectionStatus = function(_xrpl_obj, _progressive_number){
  if(isUndefinedOrNull(_xrpl_obj)){
    printWithPrefix("_xrpl_obj is null", "logConnectionStatus: ");
    return;
  }
  
  const _prefix = "logConnectionStatus: #" + _progressive_number + ": " + _xrpl_obj.network + ": ";
  const _xrpl_client = _xrpl_obj.client;
  printWithPrefix("isUndefinedOrNull(ripple_api): " + (isUndefinedOrNull(_xrpl_client)), _prefix);
  
  if(isUndefinedOrNull(_xrpl_client)){
    return;
  }
  printWithPrefix("!_xrpl_client.isConnected(): " + !_xrpl_client.isConnected(), _prefix);
}

async function doRPCRequest(request_obj, xrpl_obj){
  //TODO ADJUST server_url FOR VISUALIZER
  const server_url = xrpl_obj.server_url;
  
  var response = null;
  try{
    let wrapped_req_obj = {
      server_url: server_url,
      request_obj: request_obj
    };
    response = await callRestApi("POST", RPC_REQUEST_ENDPOINT, wrapped_req_obj);
  }
  catch(error){
    console.log("error: ", error);
  }
  
  if(isUndefinedOrNull(response)){
    throw new Error("The RPC request gave no response");
  }
  else if(response.status != 200){
    throw new Error("RPC response status is not 200: " + response.data.error);
  }
  else{
    //console.log("response: " + JSONBeautify(response["data"]));
    return response;
  }
}

async function doRequest(request, xrpl_obj){
  let response_data = null;
  if(xrpl_obj.is_wss){ //wss
    if(!xrpl_obj.client.isConnected()){
      throw new Error("xrpl_handler.doRequest(): XRPL client is not connected");
    }
    let response = await xrpl_obj.client.request(request);
    response_data = response.result;
    
    kickConnectionWatchdogTimer(xrpl_obj); //TODO: UNTESTED
  }
  else{ //rpc    
    let param_obj = deepCopyObject(request);
    delete param_obj["command"];
    
    let rpc_request = {
      method: request["command"],
      params: [param_obj]
    };
  
    let response = await doRPCRequest(rpc_request, xrpl_obj);
    response_data = response.data.data.result;
    
    if(response_data.status === "error"){
      throw new Error(response_data.error_message);
    }
  }
  
  return response_data;
}

async function findInPaginated(request_obj, data_field_name, searching_fields, xrpl_obj){
  var marker = null;
  var has_finished = false;
  var to_return = null;
  while(!has_finished){
    let current_request = request_obj;
    if(marker !== null){
      current_request = {
        ...current_request,
        "marker": marker
      };
    }
    
    var response_data = await doRequest(current_request, xrpl_obj);
    var objects_list = response_data[data_field_name];
    
    for(let i = 0; i < objects_list.length; i++){
      let found = true;
      for(let j = 0; j < searching_fields.length; j++){
        if(searching_fields[j]["value"] !== objects_list[i][searching_fields[j]["key"]]){
          found = false;
          break;
        }     
      }
      
      if(found){
        has_finished = true;
        to_return = objects_list[i];
        break;
      }
    }
    
    if(!isUndefinedOrNull(response_data["marker"])){
      marker = response_data["marker"];
    }
    else{
      has_finished = true;
    }
  }
  
  return to_return;
}

export const getNFToken = async function(nft_owner_address, nft_id, xrpl_obj){
  const request_obj = {
    command: "account_nfts",
    account: nft_owner_address
  };
  
  const searching_fields = [
    {key: "TokenID", value: nft_id}
  ];
  
  return findInPaginated(request_obj, "account_nfts", searching_fields, xrpl_obj);
}

export const getAccountInfo = async function(address, xrpl_obj){  
  const request_obj = {
    command: "account_info",
    account: address,
    strict: true,
    ledger_index: "current",
    queue: false
  };
  
  const response_data = await doRequest(request_obj, xrpl_obj);  
  return response_data["account_data"];
}
export const getAccountNFTs = async function(address, xrpl_obj){  
  const request_obj = {
    command: "account_nfts",
    account: address
  };
  
  const response_data = await doRequest(request_obj, xrpl_obj);
  return response_data["account_nfts"];
}

export const generateWallet = async function(xrpl_obj, faucet = false){
  if(faucet){ //if it has to be funded
    if(xrpl_obj.is_wss){ //if you are connected through wss
      let { wallet, balance } = await xrpl_obj.client.fundWallet();
      return wallet;
    }
    else{ //if you are connected through wss
      //do not fund it, return an unfunded one
      console.log("unable to fund the account, you are not connected through wss");
      let wallet = xrpl.Wallet.generate();
      return wallet;
    }
  }
  else{
    let wallet = xrpl.Wallet.generate();
    return wallet;
  }
}

export const getServerInfo = async function(xrpl_obj){  
  const request_obj = {
    command: "server_info"
  };  
  
  const response_data = await doRequest(request_obj, xrpl_obj);  
  return response_data["info"];
}

async function collectTxMissingFields(address, xrpl_obj){
  const account_info = await getAccountInfo(address, xrpl_obj);
  const account_seq = account_info.Sequence;
  
  const server_info = await getServerInfo(xrpl_obj);
  const base_fee_drops = (server_info["validated_ledger"]["base_fee_xrp"] * 1000000).toFixed(0);
  const ledger_seq = server_info["validated_ledger"]["seq"];
  
  return {
    account_seq: account_seq,
    base_fee_drops: base_fee_drops,
    ledger_seq: ledger_seq
  };
}
async function fillSignSubmitTx(tx_obj, tx_missing_fields_obj, wallet, xrpl_obj){
  const filled_tx_obj = deepCopyObject(tx_obj);
  filled_tx_obj["Sequence"] = tx_missing_fields_obj.account_seq,
  filled_tx_obj["Fee"] = String(tx_missing_fields_obj.base_fee_drops * 10),
  filled_tx_obj["LastLedgerSequence"] = tx_missing_fields_obj.ledger_seq + 1000
  console.log("filled_tx_obj: ", filled_tx_obj);
  
  const {tx_hash, tx_blob} = wallet.sign(filled_tx_obj);
  
  const request_obj = {
    command: "submit",
    tx_blob: tx_blob
  };
  
  return await doRequest(request_obj, xrpl_obj);
}
async function sendTx(tx_obj, wallet, xrpl_obj){
  var return_data = null;
  if(xrpl_obj.is_wss){ //wss
    let prepared_tx = await xrpl_obj.client.autofill(tx_obj);
    console.log("prepared_tx: ", prepared_tx);
    
    let {tx_hash, tx_blob} = wallet.sign(prepared_tx);
    
    let tx_result = await xrpl_obj.client.submitAndWait(tx_blob);
    return_data = tx_result;
  }
  else{ //rpc
    let tx_missing_fields_obj = await collectTxMissingFields(wallet.classicAddress, xrpl_obj);
    return_data = await fillSignSubmitTx(tx_obj, tx_missing_fields_obj, wallet, xrpl_obj);
  }
  
  return return_data;
}

/*
tx_obj = {
  tx_obj Object a well-formed tx,
  source_wallet: {
    sk string
  }
};
//*/
export const sendTxWrapper = async function(wrapped_tx_obj, xrpl_obj){
  console.log("wrapped_tx_obj: ", wrapped_tx_obj);
  
  const wallet = xrpl.Wallet.fromSecret(wrapped_tx_obj["source_wallet"]["sk"]);
  const tx_obj = wrapped_tx_obj["tx_obj"];
  
  const return_data = await sendTx(tx_obj, wallet, xrpl_obj);
  
  return return_data;
}

function NFTokenFlagsToNumber(flags){
  var number_to_return = 0x80000000;
  
  const tfBurnable = flags["tfBurnable"];
  if(!isUndefinedOrNull(tfBurnable) && tfBurnable){
    number_to_return += 0x00000001;
  }
  const tfOnlyXRP = flags["tfOnlyXRP"];
  if(!isUndefinedOrNull(tfOnlyXRP) && tfOnlyXRP){
    number_to_return += 0x00000002;
  }
  const tfTrustLine = flags["tfTrustLine"];
  if(!isUndefinedOrNull(tfTrustLine) && tfTrustLine){
    number_to_return += 0x00000004;
  }
  const tfTransferable = flags["tfTransferable"];
  if(!isUndefinedOrNull(tfTransferable) && tfTransferable){
    number_to_return += 0x00000008;
  }
  
  return number_to_return;
}

export const NFTokenFlagsNumberToFlags = function(flags_number){
  var flags = {
    "tfBurnable": false,
    "tfOnlyXRP": false,
    "tfTrustLine": false,
    "tfTransferable": false
  };
  
  if((flags_number & 0x00000001) !== 0){
    flags["tfBurnable"] = true;
  }
  if((flags_number & 0x00000002) >> 1 !== 0){
    flags["tfOnlyXRP"] = true;
  }
  if((flags_number & 0x00000004) >> 2 !== 0){
    flags["tfTrustLine"] = true;
  }
  if((flags_number & 0x00000008) >> 3 !== 0){
    flags["tfTransferable"] = true;
  }
  
  return flags;
}

/*
minting_obj = {
    taxon String,
    transfer_fee String,
    uri String,
    flags: {
      tfBurnable boolean
      tfOnlyXRP boolean,
      tfTrustLine boolean,
      tfTransferable boolean
    },
    source_wallet: {
      type String -> "issuing" or "minting",
      sk String,
      pk String
    }
  }
//*/
export const mintNFToken = async function(minting_obj, xrpl_obj){
  const source_wallet_obj = minting_obj["source_wallet"];
  const wallet = xrpl.Wallet.fromSecret(source_wallet_obj["sk"]);
  
  const wallet_type = source_wallet_obj["type"];
  var accounts_obj_to_unroll = {
    Account: wallet.classicAddress
  };
  if(wallet_type === "issuing"){ //if it's coming from the issuing wallet
    //
  }
  else if(wallet_type === "minting"){ //if it's coming from the minting wallet
    //accounts_obj_to_unroll["Issuer"] = source_wallet_obj["issuing_wallet_pk"];
    accounts_obj_to_unroll["Issuer"] = source_wallet_obj["pk"];
  }
  else{ //catch-all
    throw new Error("mintNFToken(): unknown wallet_type");
  }
  
  const flags_obj = minting_obj["flags"];
  const flags_number = NFTokenFlagsToNumber(flags_obj);
  
  const uri = minting_obj["uri"];
  const uri_hex_string = XRPLStringToHexString(uri);
  
  const tx_obj = {
    ...accounts_obj_to_unroll,
    TransactionType: "NFTokenMint",
    Flags: flags_number,
    TokenTaxon: Number(minting_obj["taxon"]),
    TransferFee: Number(minting_obj["transfer_fee"]),
    URI: uri_hex_string
  };
  console.log("mintNFToken(): tx_obj: ", tx_obj);
  
  const return_data = await sendTx(tx_obj, wallet, xrpl_obj);
  
  return return_data;
}

/*
payment_obj = {
  source_address String.
  destination_address String,
  destination_tag? String,
  amount String or Object,
  flags? Number,
  memos? Object[]
};
//*/
function buildPaymentTx(payment_obj){
  const source_address = payment_obj["source_address"];
  const destination_address = payment_obj["destination_address"];
  const amount = payment_obj["amount"];
  if(isUndefinedOrNull(source_address) || isUndefinedOrNull(destination_address) || isUndefinedOrNull(amount)){
    throw new Error("buildPaymentTx(): malformed payment_obj");
  }
  
  const destination_tag = payment_obj["destination_tag"];
  const flags = payment_obj["flags"];
  const memos = payment_obj["memos"];
  
  var tx_obj = {
    TransactionType: "Payment",
    Account: source_address,
    Destination: destination_address,
    Amount: amount,
  };
  
  //DestinationTag
  if(!isUndefinedOrNull(destination_tag)){
    tx_obj["DestinationTag"] = destination_tag;
  }
  
  //Flags
  if(isUndefinedOrNull(flags)){
    tx_obj["Flags"] = 2147483648;
  }
  else{
    tx_obj["Flags"] = flags;
  }
  
  //Memos
  if(!isUndefinedOrNull(memos)){
    tx_obj["Memos"] = memos;
  }
  
  /*
  "Memos": [
        {
            "Memo": {
                "MemoData": "405852505F50726F64756374696F6E73",
                "MemoFormat": "746578742F706C61696E",
                "MemoType": "417574686F72"
            }
        }
    ]
  //*/
  
  return tx_obj;
}

/*
payment_obj = {
    destination_address String,
    destination_tag String,
    amount String,
    source_wallet: {
      sk String
    }
  };
//*/
export const sendXRPPayment = async function(payment_obj, xrpl_obj){
  //generate the sending wallet
  const source_wallet_obj = payment_obj["source_wallet"];
  if(isUndefinedOrNull(source_wallet_obj)){
    throw new Error("sendXRPPayment(): malformed payment_obj");
  }  
  const source_wallet_sk = source_wallet_obj["sk"];
  if(isUndefinedOrNull(source_wallet_sk)){
    throw new Error("sendXRPPayment(): malformed payment_obj");
  }
  const wallet = xrpl.Wallet.fromSecret(source_wallet_sk);
  
  //get the destination address, required
  const destination_address = payment_obj["destination_address"];
  if(isUndefinedOrNull(destination_address)){
    throw new Error("sendXRPPayment(): malformed payment_obj");
  }
  
  //get the destination tag, optional
  const destination_tag = payment_obj["destination_tag"];
  
  //get the amount, required
  const amount = payment_obj["amount"];
  if(isUndefinedOrNull(amount)){
    throw new Error("sendXRPPayment(): malformed payment_obj");
  }
  const xrp_amount = Number(payment_obj["amount"]);
  const drops_amount_string = String(xrpl.xrpToDrops(xrp_amount));
  
  const _payment_obj = {
    source_address: wallet.classicAddress,
    destination_address: destination_address,
    amount: drops_amount_string
  }  
  if(!isUndefinedOrNull(destination_tag)){
    _payment_obj["destination_tag"] = Number(destination_tag);
  }
  
  const tx_obj = buildPaymentTx(_payment_obj);
  const return_data = await sendTx(tx_obj, wallet, xrpl_obj);
  
  return return_data;
}

/*
subscription_obj = {
  type String -> "accounts" or,
  accounts? String[]
}
//*/
export const subscribeToEvent = async function(subscription_obj, xrpl_obj){ //UNTESTED
  if(!xrpl_obj.is_wss){ //if you are not connected through wss
    throw new Error("Subscription is available only with a wss connection");
  }
  
  var request_obj = {
    command: "subscribe"
  };
  
  const type = subscription_obj["type"];
  if(type === "accounts"){
    request_obj["accounts"] = subscription_obj["accounts"]
  }
  else{
    throw new Error("Unknown subscription type");
  }
  
  const response_data = await doRequest(request_obj, xrpl_obj);  
  return response_data;
}

export const subscribeToAccounts = async function(accounts_list, xrpl_obj){ //UNTESTED
  const subscription_obj = {
    "type": "accounts",
    "accounts": accounts_list
  };
  
  const response_data = await subscribeToEvent(subscription_obj, xrpl_obj);
  
  return response_data;
}















