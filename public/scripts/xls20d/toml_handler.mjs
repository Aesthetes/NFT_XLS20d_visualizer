import {
  isUndefinedOrNull, fetchWithTimeout
} from "./utils.mjs";

export const extractObjectsFromTOML = async function(toml_text){
  const parsed_toml = toml_bundle.parseTOML(toml_text);  
  return parsed_toml;
}

export const getTomlFile = async function(toml_file_url){
  const _prefix = "getTomlFile(): ";
  if(isUndefinedOrNull(toml_file_url) || toml_file_url.length === 0){
    return null;
  }
  
  var toml_text = null;
  try{
    const response = await fetchWithTimeout(toml_file_url, { timeout: 8 * 1000 });
    if(!response.ok){
      throw new Error("fetch response is not ok");
    }
    
    toml_text = response.text();
  }
  catch(error){
    //throw error;
  }
  
  return toml_text;
}

export const verifyAccountDomain = function(extracted_accounts, _address, _network){
  if(isUndefinedOrNull(extracted_accounts) || extracted_accounts.length === 0){
    return false;
  }
  
  for(let i = 0; i < extracted_accounts.length; i++){ //for each account extracted from the TOML
    if(extracted_accounts[i].address === _address){ //if it's the interested account
      if(!isUndefinedOrNull(extracted_accounts[i].network)){ //if the network attribute is defined
        let extracted_account_address = extracted_accounts[i].network;
        if(_network === "Mainnet" && extracted_account_address === "main" ||
          _network === "Testnet" && extracted_account_address === "testnet" ||
          _network === "XLS20d" && extracted_account_address === "XLS20d"
        ){ //if the network of the interested account is the same one we are using
          return true;
        }
        //if the network is different
        continue; //then it's not verified
      }
      
      //If the network attribute is not defined, clients SHOULD assume that the account is claimed on the production XRP Ledger
      //and possibly other network chains.
      return true;
    }
  }
  
  return false;
}
