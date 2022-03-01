import { 
  isUndefinedOrNull, fetchMultiple, isNumberIncluded, arrayMatchesAll,
  sortObjectKeys, countGroups, getCurrentTimestamp, deepCopyObject,
  objectToBlob, extractFromObject, writeIntoObject, JSONBeautify
} from "./../utils.mjs";
import { 
  getCorrectXRPLClientObj, connectToAServer, logConnectionStatus,
  getNFToken, getAccountInfo, NFTokenFlagsNumberToFlags
} from "./xrpl_handler.mjs";
import {
  getTomlFile, extractObjectsFromTOML, verifyAccountDomain
} from "./toml_handler.mjs";
import {
  handleFiles as hashfilereaderHandleFiles, clear as hashfilereaderClear
} from "./../external/hashfilereader/index.mjs";

const DEFAULT_DOMAIN = "xrpl.aesthetes.art";
const HASH_URI_FIELD_NAME = "0x64_SHA256";

function generateTOMLURL(_domain){
  return "https://" + _domain + "/.well-known/xrp-ledger.toml";
}

const DEFAULT_TOML_URL = generateTOMLURL(DEFAULT_DOMAIN);
//const DEFAULT_TOML_URL = "./../../.well-known/xrp-ledger.toml";

function extractUrisFromString(uris_string){
  var uris_obj = {};
  const uri_lines = uris_string.match(/[^\r\n]+/g);
  for(let i = 0; i < uri_lines.length; i++){ //for each line of the URI
    let uri_line = uri_lines[i];
    let uri_fieldname_length = uri_line.indexOf(':'); //match the first ':'
    if(uri_fieldname_length < 1){
      continue;
    }
    uris_obj[uri_line.substring(0, uri_fieldname_length)] = uri_line.substring(uri_fieldname_length + 1, uri_line.length);
  }
  
  return uris_obj;
}

function extractUrisFromMetadata(metadata_obj, metadata_uris_field){
  const metadata_content = metadata_obj[metadata_uris_field];
  if(isUndefinedOrNull(metadata_content) || metadata_content.length === 0){
    throw new Error("retrieved metadata does not have content field");
    //return null;
  }
  
  const uris_obj = extractUrisFromString(metadata_content);
  return uris_obj;
}

function hexUriToUrisObj(nftoken_uri_hex){
  var uris_obj = {};
  var remaining_nftoken_uri_hex = nftoken_uri_hex;
  
  while(remaining_nftoken_uri_hex.length > 0){
    if(remaining_nftoken_uri_hex.startsWith(xrpl.convertStringToHex("0x"))){ //if the next field is hex_formatted
      let first_colon_index = remaining_nftoken_uri_hex.indexOf(xrpl.convertStringToHex(':'));
      let key_hex = remaining_nftoken_uri_hex.substring(0, first_colon_index);
      let key = xrpl.convertHexToString(key_hex);
      
      let remaining_key = key.substring(2, key.length);
      let first_key_underscore_index = remaining_key.indexOf('_');
      let value_length = Number(remaining_key.substring(0, first_key_underscore_index));
      if(isNaN(value_length) || value_length < 0){
        throw new Error("Malformed URI");
      }
      
      let value = remaining_nftoken_uri_hex.substring(first_colon_index + 2 , first_colon_index + 2 + value_length);
      
      uris_obj[key] = value;
      remaining_nftoken_uri_hex = remaining_nftoken_uri_hex.substring(
        first_colon_index + 2 + value_length + 2,
        remaining_nftoken_uri_hex.length
      );
    }
    else{ //if the next field is not hex_formatted
      let first_endline_index = remaining_nftoken_uri_hex.indexOf("0A");
      if(first_endline_index < 0){
        first_endline_index = remaining_nftoken_uri_hex.length;
      }
      
      let pair_hex = remaining_nftoken_uri_hex.substring(0, first_endline_index);
      let pair = xrpl.convertHexToString(pair_hex);
      
      let extracted_uris = extractUrisFromString(pair);
      uris_obj = {
        ...uris_obj,
        ...extracted_uris
      };
      
      remaining_nftoken_uri_hex = remaining_nftoken_uri_hex.substring(
        (first_endline_index === remaining_nftoken_uri_hex.length ? 
          first_endline_index :
          first_endline_index + 2),
        remaining_nftoken_uri_hex.length
      );
    }
  }
  
  return uris_obj;
}

function extractUrisFromNFToken(NFToken_obj){
  //console.log("extractUrisFromNFToken(): NFToken_obj: ", NFToken_obj);
  var uris_obj = {};
  uris_obj["Issuer"] = NFToken_obj["Issuer"];
  uris_obj["TokenTaxon"] = Number(NFToken_obj["TokenTaxon"]);
  uris_obj["TokenSeq"] = Number(NFToken_obj["TokenID"].substring(NFToken_obj["TokenID"].length - 8, NFToken_obj["TokenID"].length));
  uris_obj["TokenID"] = NFToken_obj["TokenID"];
  
  //parse the uri field
  const nftoken_uri_hex = NFToken_obj.URI;
  if(!isUndefinedOrNull(nftoken_uri_hex) && nftoken_uri_hex.length > 0){ //if the URI field is present
    let extracted_uris_obj = hexUriToUrisObj(nftoken_uri_hex);
    
    uris_obj = {
      ...uris_obj,
      ...extracted_uris_obj
    };
  }
  return uris_obj;
}

function composeLinks(extracted_toml_objects, uris_obj){
  //get the uri resolution list from the toml file
  const uri_resolution_list = extracted_toml_objects["URI_RESOLUTION"]["list"];
  
  //compose the complete links
  var composed_links = [];
  for(let i = 0; i < uri_resolution_list.length; i++){ //for each uri resolution link
    let uri_types_matched = uri_resolution_list[i].match(/\{\:([^:]+)\:\}/g); //match all the methods used
    if(isUndefinedOrNull(uri_types_matched) || uri_types_matched.length < 1){ //if no methods are used
      composed_links.push(uri_resolution_list[i]); //then the link is already complete
      continue; //so skip the resolution procedure for this link
    }
    
    //delete duplicates among the matched uri resolution methods
    uri_types_matched.sort();
    for(let j = 0; j < uri_types_matched.length - 1; j++){
      if(uri_types_matched[j] === uri_types_matched[j + 1]){
        uri_types_matched.splice(j, 1);
        j--;
      }
    }
    
    //compose the complete link
    let has_been_composed = true;
    let composing_link = uri_resolution_list[i];
    for(let j = 0; j < uri_types_matched.length; j++){ //for each of the resolution methods matched in the incomplete link
      let uri_type = uri_types_matched[j].substring(2, uri_types_matched[j].length - 2);
      if(isUndefinedOrNull(uris_obj[uri_type])){ //if the resolution method has not been provided by the URI
        if(uri_type === "path"){ //if the resolution method is 'path'
          uris_obj[uri_type] = ""; //then it's good, act like it was specified as void
        }
        else{ //if the resolution method is not 'path'
          has_been_composed = false; //the composition failed
          break; //then stop doing that
        }
      }
      //if the resolution method has been provided by the URI
      
      //replace all the occurrence of the resolution method type with the resolution method value got from the URI
      composing_link = composing_link.replaceAll(uri_types_matched[j], uris_obj[uri_type]);
    }
    
    if(has_been_composed){ //if the composition went good
      composed_links.push(composing_link); //add this complete link
    }
  }
  
  return composed_links;
}

export const calculateSHA256OfFile = function(file, callback, callback_data = {}){
  hashfilereaderClear();
  
  var _promise = new Promise((resolve, reject) => {
    var _callback = function(_SHA_256_hash, _callback_data){
      callback(_SHA_256_hash, _callback_data);
      resolve();
    }
    hashfilereaderHandleFiles(file, _callback, callback_data);
  });
  
  return _promise;
}

function SHA256CalculationCallback(SHA_256_hash, sha_256_obj){
  if(isUndefinedOrNull(sha_256_obj)){
    throw new Error("SHA256CalculationCallback(): sha_256_obj is "+ sha_256_obj);
  }
  
  sha_256_obj["sha_256"] = SHA_256_hash;
}

async function doCalculateSHA256Tee(metadata_blob, file_type){
  const metadata_file_to_hash = new File([metadata_blob], "name");
  const sha_256_obj = {
    file_type: file_type
  };
  await calculateSHA256OfFile(metadata_file_to_hash, SHA256CalculationCallback, sha_256_obj);
  const calculated_sha_256 = sha_256_obj["sha_256"];
  
  //retrieve the JSON-formatted content of the file
  const metadata_object_url = URL.createObjectURL(metadata_blob);
  const metadata_obj_2 = await fetchMultiple([metadata_object_url], {timeout: 10 * 1000});
  if(isUndefinedOrNull(metadata_obj_2) || isUndefinedOrNull(metadata_obj_2.response)){ //if no metadata file was retrieved
    throw new Error("Unable to retrieve " + file_type);
  }
  
  var return_obj = {
    metadata_obj: metadata_obj_2,
    sha_256: calculated_sha_256
  };
  return return_obj;
}

/*
...
//*/

/*
...
//*/

/*
...
//*/

/*
...
//*/

/*
...
//*/

function checkAuthorInMetadataObj(author_obj){
  /*
  ...
  //*/
  
  return true;
}

/*
...
//*/

function checkContentMetadataObj(content_metadata_obj){
  const collection = content_metadata_obj["collection"];
  if(isUndefinedOrNull(collection)){ //if there's no collection defined
    //check if issuer address is valid
    let issuer_address = content_metadata_obj["issuer"];
    if(!xrpl.isValidAddress(issuer_address)){ //if the issuer address is not valid
      throw new Error("The inserted issuer address is invalid");
    }
    
    //check if seqnum is a number and is inside the allowed range, 0 <= seqnum < 2147483648
    const seqnum = Number(content_metadata_obj["seqnum"]);
    if(isNaN(seqnum) || seqnum < 0 || seqnum > 4294967295){
      throw new Error("The inserted seqnum is invalid");
    }
  }
  
  const author_obj = content_metadata_obj["author"];
  const is_author_ok = checkAuthorInMetadataObj(author_obj);
  if(!is_author_ok){
    throw new Error("Something's wrong with the author");
  }
  
  return true;
}

export const getNFTInfo = async function(nft_owner_address, nft_id, network){
  const _prefix = "getNFTInfo(): ";  
  var obj_to_return = {
    type: "XLS20d",
    warnings: []
  };
  
  var xrpl_obj = getCorrectXRPLClientObj(network);
  xrpl_obj.is_wss = true;
  
  if(xrpl_obj.is_wss){ //if it's a wss connection
    if(isUndefinedOrNull(xrpl_obj.client) || !xrpl_obj.client.isConnected()){//if we're not connected to a rippled server (for this network)
      await connectToAServer(xrpl_obj, network); //connect to one
    }
  }
  
  if(!xrpl.isValidAddress(nft_owner_address)){ //if the owner address is not valid
    throw new Error("The inserted address is invalid");
  }
  
  //get the NFToken from XRPL
  const NFToken_obj = await getNFToken(nft_owner_address, nft_id, xrpl_obj);
  if(isUndefinedOrNull(NFToken_obj)){
    throw new Error("NFT not found");
  }
  
  /*
  ...
  //*/
  
  //extract the issuer address from the NFToken
  const issuer_address = NFToken_obj["Issuer"];
  if(isUndefinedOrNull(issuer_address)){
    throw new Error("NFT has no issuer");
  }
  
  //extract the sequence number from the NFToken
  const seqnum = NFToken_obj["nft_serial"];
  if(isUndefinedOrNull(seqnum)){
    throw new Error("NFT has no sequence number");
  }
  
  //extract the taxon from the NFToken
  const taxon = NFToken_obj["TokenTaxon"];
  if(isUndefinedOrNull(taxon)){
    throw new Error("NFT has no taxon");
  }
  
  //extract the flags from the NFToken
  const flags = NFToken_obj["Flags"];
  if(isUndefinedOrNull(flags)){
    throw new Error("NFT has no flags");
  }
  const flags_obj = NFTokenFlagsNumberToFlags(flags);
  
  //get issuer's account_info from XRPL
  const issuer_account_info = await getAccountInfo(issuer_address, xrpl_obj);
  if(isUndefinedOrNull(issuer_account_info)){
    throw new Error("Issuer info not found");
  }
  
  //get the domain
  const issuer_account_domain_hex = issuer_account_info.Domain;
  var issuer_account_domain = null;
  var is_default_TOML = false;
  if(isUndefinedOrNull(issuer_account_domain_hex)){
    obj_to_return.warnings.push("NoIssuerDomain");
  }
  else{
    issuer_account_domain = xrpl.convertHexToString(issuer_account_domain_hex);
    obj_to_return["issuer_domain"] = issuer_account_domain;
  }
  
  var toml_file_url = null;
  var issuer_toml_text = null;
  if(!isUndefinedOrNull(issuer_account_domain)){ //if the issuer address has a domain specified
    //get the TOML file
    toml_file_url = generateTOMLURL(issuer_account_domain);
    issuer_toml_text = await getTomlFile(toml_file_url);
  }
  
  if(issuer_toml_text === null){ //if the toml file or the domain is not present
    //try fetching the default one
    toml_file_url = DEFAULT_TOML_URL;
    issuer_toml_text = await getTomlFile(toml_file_url);
    if(issuer_toml_text === null){ //if neither the default one is present
      throw new Error("Unable to retrieve a valid TOML file");
    }
    
    //if the default TOML has been fetched
    is_default_TOML = true;
  }
  
  //after finally fetching a valid TOML file  
  var extracted_toml_objects = await extractObjectsFromTOML(issuer_toml_text);
  
  //perform issuer account verification  
  if(is_default_TOML ||
    isUndefinedOrNull(extracted_toml_objects) ||
    isUndefinedOrNull(extracted_toml_objects["ACCOUNTS"]) ||
    extracted_toml_objects["ACCOUNTS"].length === 0
  ){ //if there's no TOML file OR there's no account list inside the issuer's TOML file
    obj_to_return["warnings"].push("IssuerNotVerified"); //produce a warning
  }
  else{ //if there's an account list inside the issuer's TOML file
    //see if it's verified
    let is_verified = verifyAccountDomain(extracted_toml_objects["ACCOUNTS"], issuer_address, network);
    if(!is_verified){ //if it's not verified
      obj_to_return["warnings"].push("IssuerNotVerified"); //produce a warning
    }
  }
  
  //try to fetch a valid URI resolution list
  if(isUndefinedOrNull(extracted_toml_objects) ||
    isUndefinedOrNull(extracted_toml_objects["URI_RESOLUTION"]) ||
    isUndefinedOrNull(extracted_toml_objects["URI_RESOLUTION"]["list"]) ||
    extracted_toml_objects["URI_RESOLUTION"]["list"].length == 0
  ){ //if the TOML file does not contain any URI resolution list
    if(is_default_TOML){ //if it's the default one
      throw new Error("Unable to retrieve a valid TOML file with an URI resolution list");
    }
    
    //if it's not the default one, try with it
    toml_file_url = DEFAULT_TOML_URL;
    issuer_toml_text = await getTomlFile(toml_file_url);
    if(issuer_toml_text === null){ //if neither the default one is present
      throw new Error("Unable to retrieve a valid TOML file");
    }    
    //if the default TOML has been fetched
    
    is_default_TOML = true;
    
    //extract the fields from it
    extracted_toml_objects = await extractObjectsFromTOML(issuer_toml_text); 
    if(isUndefinedOrNull(extracted_toml_objects) ||
      isUndefinedOrNull(extracted_toml_objects["URI_RESOLUTION"]) ||
      isUndefinedOrNull(extracted_toml_objects["URI_RESOLUTION"]["list"]) ||
      extracted_toml_objects["URI_RESOLUTION"]["list"].length == 0
    ){ //if neither the default one contains any URI resolution list
      throw new Error("Unable to retrieve a valid TOML file with an URI resolution list");
    }
  }
  
  //after finally fetching a valid URI resolution list
  //fetch the metadata
  const NFToken_uris_obj = extractUrisFromNFToken(NFToken_obj);
  const composed_metadata_links = composeLinks(extracted_toml_objects, NFToken_uris_obj);
  const metadata_obj = await fetchMultiple(composed_metadata_links, {timeout: 10 * 1000});
  if(isUndefinedOrNull(metadata_obj) || isUndefinedOrNull(metadata_obj.response)){ //if no metadata file was retrieved
    throw new Error("Unable to retrieve the content metadata");
  }
  //if a metadata file was retrieved
  
  var used_unchecked_resolution_links = [];
  
  const metadata_SHA256 = NFToken_uris_obj[HASH_URI_FIELD_NAME];
  var _metadata_obj = null;
  if(!isUndefinedOrNull(metadata_SHA256)){ //if SHA256 is present in the URI
    //calculate the SHA256 hash of the metadata file    
    let file_type = "content_metadata";
    let metadata_blob = await metadata_obj.response.blob();
    let sha_256_obj = await doCalculateSHA256Tee(metadata_blob, file_type);
    let calculated_sha_256 = sha_256_obj["sha_256"];
    if(metadata_SHA256 !== calculated_sha_256){
      throw new Error("The SHA256 of " + file_type + " is different than the claimed one");
    }
    
    _metadata_obj = sha_256_obj["metadata_obj"];
  }
  else{ //if SHA256 is not present in the URI
    //update the list of used unchecked sources for data retrieval
    let metadata_resolution_link = extracted_toml_objects["URI_RESOLUTION"]["list"][metadata_obj.resource_index];
    used_unchecked_resolution_links.push(metadata_resolution_link);
    
    _metadata_obj = metadata_obj;
  }
  
  const metadata_json = await _metadata_obj.response.json();
  
  /*
  ...
  //*/
  
  //get the author of the content's metadata
  obj_to_return["author_links"] = [];
  const metadata_author_obj = metadata_json["author"];
  if(isUndefinedOrNull(metadata_author_obj)){ //if the content's metadata has no author field
    throw new Error("The content's metadata has no author field");
  }
  var metadata_author_type = metadata_author_obj["type"];
  if(isUndefinedOrNull(metadata_author_type)){ //if the content's metadata has no author.type field
    metadata_author_type = "Simple";
  }
  
  /*
  ...
  //*/
  
  //backward-compatibility for "image" field
  if(isUndefinedOrNull(metadata_json["content"])){ //if the "content" field is not defined
    if(!isUndefinedOrNull(metadata_json["image"])){ //if the "image" field is defined
      metadata_json["content"] = metadata_json["image"]; //rename it with "content"
      delete metadata_json["image"];
    }
    else{
      throw new Error("The retrieved content metadata has no content URI");
    }
  }
  
  let is_content_metadata_ok = checkContentMetadataObj(metadata_json);
  if(!is_content_metadata_ok){
    throw new Error("Something's wrong with the content metadata");
  }
  
  obj_to_return["NFToken_obj"] = NFToken_obj;
  obj_to_return["NFToken_flags"] = flags_obj;
  obj_to_return["NFToken_uris_obj"] = NFToken_uris_obj;
  obj_to_return["metadata"] = metadata_json; //name, author, description
  obj_to_return["metadata_link"] = metadata_obj.url;
  obj_to_return["actual_nft_owner"] = nft_owner_address;
  
  /*
  ...
  //*/
  
  const issuer_content_metadata = metadata_json["issuer"];
  const taxon_content_metadata = Number(metadata_json["taxon"] || 0); //if taxon is not defined in the metadata, then it's 0
  const seqnum_content_metadata = Number(metadata_json["seqnum"]);
  if(issuer_content_metadata !== issuer_address ||
    taxon_content_metadata !== taxon ||
    seqnum_content_metadata !== seqnum){ //if the NFToken info doesn't match those in the content metadata
    throw new Error("The NFToken issuer address, taxon and sequence number doesn't match those found in the content metadata");
  }
  //if the NFToken info matches those in the content metadata 
  
  //fetch the content
  const content_uris_obj = extractUrisFromMetadata(metadata_json, "content");
  const composed_content_links = composeLinks(extracted_toml_objects, content_uris_obj);
  const content_obj = await fetchMultiple(composed_content_links, {timeout: 10 * 1000});
  if(isUndefinedOrNull(content_obj) || isUndefinedOrNull(content_obj.response)){ //if no content file was retrieved
    throw new Error("Unable to retrieve the content");
  }
  //if a content file was retrieved
  
  //retrieve the blob content of the file
  const content_blob = await content_obj.response.blob();
  const content_object_url = URL.createObjectURL(content_blob);
  
  const content_SHA256 = content_uris_obj[HASH_URI_FIELD_NAME];
  if(!isUndefinedOrNull(content_SHA256)){ //if SHA256 is present in the URI
    //calculate the SHA256 hash of the content file
    let file_type = "content";
    let sha_256_obj = await doCalculateSHA256Tee(content_blob, file_type);
    let calculated_sha_256 = sha_256_obj["sha_256"];
    if(content_SHA256 !== calculated_sha_256){
      throw new Error("The SHA256 of " + file_type + " is different than the claimed one");
    }
  }
  else{ //if SHA256 is not present in the URI
    //update the list of used sources for data retrieval
    const content_resolution_link = extracted_toml_objects["URI_RESOLUTION"]["list"][content_obj.resource_index];
    used_unchecked_resolution_links.push(content_resolution_link);
  }
  
  obj_to_return["content_object_url"] = content_object_url;
  obj_to_return["content_link"] = content_obj.url;
  
  //fetch the list of trusted immutable sources from the default TOML
  var immutable_sources = null;
  var toml_text = issuer_toml_text;
  if(!is_default_TOML){ //if the default TOML has not been fetched before
    //fetch the default TOML file
    toml_file_url = DEFAULT_TOML_URL;
    toml_text = await getTomlFile(toml_file_url);
    is_default_TOML = true;
  }
  
  //extract the fields from it
  extracted_toml_objects = await extractObjectsFromTOML(toml_text);
  
  //see if there's a list of trusted immutable sources
  if(!isUndefinedOrNull(extracted_toml_objects) &&
  !isUndefinedOrNull(extracted_toml_objects["IMMUTABLE_SOURCES"]) &&
  !isUndefinedOrNull(extracted_toml_objects["IMMUTABLE_SOURCES"]["list"])
  ){ //if there's a list of trusted immutable sources, get that
    immutable_sources = extracted_toml_objects["IMMUTABLE_SOURCES"]["list"];
  }
  
  //perform the immutability check
  if(isUndefinedOrNull(immutable_sources)){ //if the list of trusted immutable sources is unretrievable
    //we cannot verify anything about immutability
    obj_to_return["warnings"].push("ImmutabilityNotVerified"); //produce a warning
  }
  else{ //if the list of trusted immutable sources has been retrieved
    //check that all the retrieved files either come from trusted immutable sources
    //or its SHA256 checksum has been checked
    let is_immutable = (used_unchecked_resolution_links.length === 0 ||
      arrayMatchesAll(immutable_sources, used_unchecked_resolution_links));
    if(!is_immutable){ //if it's not immutable
      obj_to_return["warnings"].push("NotImmutable"); //produce a warning
    }
  }
  
  return obj_to_return;
}

/*
...
//*/

