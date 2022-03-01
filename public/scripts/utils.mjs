export const getObjectHTML = function(_object){
  const _prefix = "getObjectHTML: ";
  
  const _object_fields = Object.getOwnPropertyNames(_object);
  
  var _date;
  var _obj;
  var HTML_to_return = "";
  for(let i = 0; i < _object_fields.length; i++){
    const _field = _object_fields[i];
    const _field_value = _object[_field];
    if(isUndefinedOrNull(_field_value)){
      continue;
    }
    
    HTML_to_return += _field + ": ";
    if(_field.startsWith("ts_")){//if it's a timestamp field
      _date = firebaseTimestampToDate(_field_value);
      HTML_to_return += _date.toString();
    }
    if(_field.startsWith("obj_")){//if it's an object field <-- !!! UNTESTED !!!
      HTML_to_return += getObjectHTML(_field_value);
    }
    else{//if it's a normal field
      HTML_to_return += _field_value;
    }
    HTML_to_return += "<br>";
  }
  
  return HTML_to_return;
}

export const getRadioButtonValue = function(_radio_buttons_name){
  const _radio_buttons = document.getElementsByName(_radio_buttons_name);
  for (let i = 0; i < _radio_buttons.length; i++) {
    if(_radio_buttons[i].checked === true){
      return _radio_buttons[i].value;
    }
  }
  return null;
}
export const restoreRadioButton = function(_radio_buttons_name, value_to_restore){
  const _radio_buttons = document.getElementsByName(_radio_buttons_name);
  for (let i = 0; i < _radio_buttons.length; i++) {
    if(value_to_restore == _radio_buttons[i].value){
      _radio_buttons[i].checked = true;
    }
  }
}

export const getElementValue = function(_element_id){
  const _element = document.getElementById(_element_id);
  return _element.value;
}
export const setElementValue = function(_element_id, _value){
  document.getElementById(_element_id).value = _value;
}

export const setInnerHTML = function(_element_id, HTML_to_insert){
  const _element = document.getElementById(_element_id);
  _element.innerHTML = HTML_to_insert;
}

export const showImageSrc = function(_element_id, _src_url){
  const nft_image = document.getElementById(_element_id);
  nft_image.src = _src_url;
  nft_image.hidden = false;
}

export const hideImage = function(_element_id){
  const nft_image = document.getElementById(_element_id);
  nft_image.src = "";
  nft_image.hidden = true;
}

export const getLinkHTML = function(_url){
  return "<a href=\"" + _url + "\">" + _url + "</a>";
}

export const attachEvent = function(_element_id, _event, _event_handling_function){
  const _element = document.getElementById(_element_id);
  _element.addEventListener(_event, _event_handling_function);
}

export const attachEventToNames = function(_elements_name, _event, _event_handling_function){
  const _elements = document.getElementsByName(_elements_name);
  for(let i = 0; i < _elements.length; i++){
    _elements[i].addEventListener(_event, _event_handling_function);
  }
}

export const printWithPrefix = function(to_print, _prefix){
  console.log(_prefix + to_print);
}

export const printErrorWithPrefix = function(error, _prefix){
  if(error.code){
    printWithPrefix("error.code: " + error.code, _prefix);
  }
  if(error.message){
    printWithPrefix("error.message: " + error.message, _prefix);
  }
  if(error.data){
    console.log(_prefix + "error.data: ", error.data);
  }
}

export const isUndefinedOrNull = function(_value){
  return _value === undefined || _value === null;
}

export const getFieldValues = function(ids_list){
  var values_list = [];
  
  for(let i = 0; i < ids_list.length; i++){
    let _element = null;
    
    if(ids_list[i].startsWith("radio_")){ //input type radio
      let radio_button_value = getRadioButtonValue(ids_list[i]);
      if(radio_button_value === null){
        console.log("getFieldValues(): " + ids_list[i] + " has no radio selected");
        return null;
      }      
      values_list.push(radio_button_value);
      continue;
    }
    else if(ids_list[i].startsWith("check_")){ //input type check
      let checkbox_element = document.getElementById(ids_list[i]);
      values_list.push(checkbox_element.checked);
      continue;
    }
    
    //if it's not a radio
    //fetch the element by id
    _element = document.getElementById(ids_list[i]);
    if(isUndefinedOrNull(_element)){
      console.log("getFieldValues(): " + ids_list[i] + " is empty");
      return null;
    }
    
    if(ids_list[i].startsWith("file_")){ //input type file
      if(_element.files.length == 0){
        console.log("getFieldValues(): " + ids_list[i] + " has no files");
        return null;
      }
      values_list.push(_element.files[0]);
    }
    else{
      if(_element.value.length == 0){
        console.log("getFieldValues(): " + ids_list[i] + " is empty");
        return null;
      }
      values_list.push(_element.value);
    }
  }
  
  return values_list;
}

var text_files = [];
var text_files_index = 0;
const TEXT_FILES_NUM = 10;
export function createTextFile(text){
  var data = new Blob([text], {type: 'text/plain'});
  
  if(text_files_index < text_files.length){ //if the wanted file slot has already been created (2nd+ run of the array)
    //if we are replacing a previously generated file we need to manually revoke the object URL to avoid memory leaks
    window.URL.revokeObjectURL(text_files[text_files_index]);
  }
  
  let _text_file = window.URL.createObjectURL(data);
  
  if(text_files_index >= text_files.length){ //if the wanted file slot has not yet been created (1st run of the array)
    text_files.push(_text_file);
  }
  else{ //if the wanted file slot has already been created (2nd+ run of the array)
    text_files[text_files_index] = _text_file;
  }
  
  text_files_index = (text_files_index + 1) % TEXT_FILES_NUM;
  
  // returns a URL you can use as a href
  return _text_file;
}
export var parsed_obj = null;
export function deserializeFile(file_type , _file, callback, callback_data){
  var reader = new FileReader();
  reader.onload = function(progress_event){
    parsed_obj = null;
    if(file_type === "JSON"){
      parsed_obj = JSON.parse(this.result);
    }
    else{
      parsed_obj = this.result;
    }
    
    //console.log("deserializeFile(): parsed_obj: ", parsed_obj);
    callback(callback_data);
  }
  
  if(file_type === "JSON" || file_type === "text"){
    reader.readAsText(_file);
  }
  else{
    reader.readAsBinaryString(_file);
  }
}

export const bytesToHex = function(_bytes) {
  return Array.from(
    _bytes,
    byte => byte.toString(16).padStart(2, "0")
  ).join("");
}
export const stringToUTF8Bytes = function(_string) {
  return new TextEncoder().encode(_string);
}

export const hexToAscii = function(hex_str){
  var str = "";
  for (let i = 0; i < hex_str.length; i += 2) {
    str += String.fromCharCode(parseInt(hex_str.substr(i, 2), 16));
  }
  return str;
}
export const hexToInt = function(hex_str){
  return parseInt(hex_str, 16);
}
export const hexToBigInt = function(hex_str){
  return BigInt("0x" + hex_str);
}
export const intToHexString = function(int_to_convert){
  return int_to_convert.toString(16).toUpperCase();
}
/*
export const stringToHexString = function(string_to_convert){
  return Buffer.from(string_to_convert, "utf8").toString("hex").toUpperCase();
}
//*/

export const getFirst4BitsFromHexString = function(hex_str){
  const first_4_bits = hex_str.substring(0,1);
  return hexToInt(first_4_bits);
}

export const convertToHttp = function(url_to_convert){
  if(isUndefinedOrNull(url_to_convert)){
    return null;
  }
  const splitted_url = url_to_convert.split("://");
  if(splitted_url.length < 2){// not a string starting with a protocol
    return null;
  }
  const protocol = splitted_url[0];
  if(protocol === "http" || protocol === "https"){ //if the protocol is already http or https then it's okay
    return url_to_convert;
  }
  if(protocol === "ipfs"){//if the protocol is ipfs then it has to be redirected through a gateway
    const ipfs_gateway_url = "https://ipfs.io/ipfs/";
    return ipfs_gateway_url + splitted_url[1];
  }
  
  return null;
}
export const isValidHttpUrl = function(string) {
  var url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;  
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

export const fetchWithTimeout = async function(resource, options = {}) {
  //const { timeout = 8000 } = options;
  var timeout = 8 * 1000;
  if(!isUndefinedOrNull(options["timeout"])){
    timeout = options["timeout"];
  }
  //console.log("fetchWithTimeout(): timeout = " + timeout + ", resource = " + resource);
  
  const controller = new AbortController();
  const id = setTimeout(() => {
    //console.log("fetch of the resource " + resource + " aborted");
    controller.abort();
  }, timeout);
  
  const request_object = {
    ...options,
    signal: controller.signal,
    //mode: "no-cors"
  };
  
  const response = await fetch(resource, request_object)
  .then((_response) => {
    clearTimeout(id);
    return _response;
  })
  .catch((error) => {
    clearTimeout(id);
    throw error;
  });
  
  return response;
}

const fetchRecursive = async function(resources_list, resource_index, options){
  //console.log("fetchRecursive(): ", resources_list, resource_index, options);
  if(resource_index >= resources_list.length){
    return null;
  }
  
  var response = null;  
  const url = resources_list[resource_index];
  
  try{
    const _response = await fetchWithTimeout(url, options);
    //console.log("fetchRecursive(): _response: ", _response);
    if(!_response.ok){
      //console.log(prefix + " _response.ok = " + _response.ok);
      throw new Error("fetch response is not ok");
    }
    response = _response;
  }
  catch(error){
    //console.log("fetchRecursive(): " + url + " KO");
    return fetchRecursive(resources_list, resource_index + 1, options);
  }
  
  return {
    response: response,
    url: url,
    resource_index: resource_index
  };
}

export const fetchMultiple = async function(resources_list, options = {}){
  //console.log("fetchMultiple(): ", resources_list, options);
  const result_obj = await fetchRecursive(resources_list, 0, options);
  //console.log("fetchMultiple(): returning ", result_obj);
  return result_obj;
}

export const extractCIDFromHashUrl = function(_domain){
  if(!_domain.startsWith("hash:")){
    return null;
  }
  const _domain_splitted = _domain.split(':');
  if(_domain_splitted.length !== 2){
    return null;
  }
  return _domain_splitted[1];
}

export const JSONBeautify = function(_object){
  return JSON.stringify(_object, null, 4);
}

export const JSONBeautifyForHTML = function(_object){
  const _object_beautified = JSON.stringify(_object, null, 4);
  const string_to_return = _object_beautified.replaceAll('\n', "<br>");
  
  return string_to_return;
}

function extractExtremesFromIntervalString(interval_string){
  const interval_string_splitted = interval_string.split('-');
  if(interval_string_splitted.length !== 2){
    throw new Error("malformed interval");
  }
  
  return{
    min: Number(interval_string_splitted[0]),
    max: Number(interval_string_splitted[1])
  };
}
function reduceNumberInterval(number, interval_string, reduceFunction, accumulator_obj){
  //console.log("reduceNumberInterval(): " + interval_string + ", accumulator_obj = " + JSONBeautify(accumulator_obj));
  let index_of_hyphen = interval_string.indexOf('-');
  if(index_of_hyphen < 0){ //if there's only one extreme
    let interval_obj = {
      equal: Number(interval_string)
    };
    return reduceFunction(number, interval_obj, accumulator_obj);
  } 
  
  //if there's more than one extreme 
  //console.log("reduceNumberInterval(): interval_string: ", interval_string);
  let interval_obj = extractExtremesFromIntervalString(interval_string);
  //console.log("reduceNumberInterval(): interval_obj: ", interval_obj);
  return reduceFunction(number, interval_obj, accumulator_obj);
}
function reduceNumberIntervals(number, interval_string, reduceFunction, accumulator_obj){
  //console.log("reduceNumberIntervals(): " + interval_string + ", accumulator_obj = " + JSONBeautify(accumulator_obj));
  let index_of_comma = interval_string.indexOf(',');
  if(index_of_comma < 0){ //if there's only one interval
    return reduceNumberInterval(number, interval_string, reduceFunction, accumulator_obj);
  }
  
  //if there's more than one interval
  let intervals_strings = interval_string.split(',');
  for(let i = 0; i < intervals_strings.length; i++){ //for each interval
    accumulator_obj = reduceNumberInterval(number, intervals_strings[i], reduceFunction, accumulator_obj);
    if(accumulator_obj.exit){ //if the reduction is finished
      break;
    }
  }
  
  return accumulator_obj;
}

function reduceNumberGroups(number, interval_string, reduceFunction, accumulator_obj){
  //console.log("reduceNumberGroups(): " + interval_string + ", accumulator_obj = " + JSONBeautify(accumulator_obj));
  const index_of_slash = interval_string.indexOf('/');
  if(index_of_slash < 0){ //if there's no groups
    return reduceNumberIntervals(number, interval_string, reduceFunction, accumulator_obj);
  }
  
  //if there are groups
  const groups_strings = interval_string.split('/');
  for(let i = 0; i < groups_strings.length; i++){ //for each group
    accumulator_obj = reduceNumberIntervals(number, groups_strings[i], reduceFunction, accumulator_obj);
    if(accumulator_obj.exit){ //if the reduction is finished
      break;
    }
  }
  
  return accumulator_obj;
}

const isNumberIncludedReduce = function(number, interval_obj, accumulator_obj){
  var return_obj = {
    exit: false
  };
  
  const equal = interval_obj["equal"];
  if(!isUndefinedOrNull(equal)){ //if it's a single number
    if(accumulator_obj["previous_max"] < equal && equal >= 0){ //if the actual interval is well formed
      //console.log("isNumberIncludedReduce(): " + number + " === " + equal);
      return_obj["is_included"] = (number === equal) || accumulator_obj["is_included"];
      return_obj["interval_count"] = accumulator_obj["interval_count"] + 1;
      return_obj["previous_max"] = equal;
    }
    else{ //if the actual interval is not greater than the previous
      throw new Error("malformed interval");
    }
  }
  else{
    let min = interval_obj["min"];
    let max = interval_obj["max"];
    if(!isUndefinedOrNull(min) && !isUndefinedOrNull(max)){ //if it's an interval
      if(min < max && accumulator_obj["previous_max"] < min && min >= 0 && max >= 0){ //if the actual interval is well formed
        //console.log("isNumberIncludedReduce(): " + number + " in " + min + "-" + max);
        return_obj["is_included"] = (number >= min && number <= max) || accumulator_obj["is_included"];
        return_obj["interval_count"] = accumulator_obj["interval_count"] + (max - min + 1);
        return_obj["previous_max"] = max;
      }
      else{ //if the actual interval is not greater than the previous
        throw new Error("malformed interval");
      }
    }
    else{ //if it's not an interval, then is unknown
      throw new Error("malformed interval");
    }
  }
  
  return return_obj;
}

export const isNumberIncluded = function(number, interval_string){
  var accumulator_obj = {
    "interval_count": 0,
    "previous_max": -1,
    "is_included": false
  };
  var return_obj = null;
  
  try{
    return_obj = reduceNumberGroups(number, interval_string, isNumberIncludedReduce, accumulator_obj);
    delete return_obj["previous_max"];
  }
  catch(error){
    console.log("isNumberIncluded(): error: ", error);
    return {
      is_included: false,
      interval_count: 0,
      error: error.message
    };
  }
  
  return return_obj;
}

export const countGroups = function(interval_string){
  const index_of_slash = interval_string.indexOf('/');
  if(index_of_slash < 0){ //if there's no groups
    return 0;
  }
  
  //if there are groups
  const groups_strings = interval_string.split('/');
  return groups_strings.length;
}

export const arrayIncludesAll = function(_array, _elements){
  for(let i = 0; i < _elements.length; i++){
    let _element_index = _array.indexOf(_elements[i]);
    if(_element_index < 0){
      return false;
    }
  }
  return true;
}

export const arrayIncludes = function(_array, _element){
  return (_array.indexOf(_element) > 0);
}

export const arrayMatches = function(regex_array, _element){
  for(let i = 0; i < regex_array.length; i++){
    let _reg_exp = new RegExp(regex_array[i]);
    let matched = _reg_exp.test(_element);
    if(matched){
      return true;
    }
  }
  
  return false;
}

export const arrayMatchesAll = function(regex_array, _elements){
  for(let i = 0; i < _elements.length; i++){
    if(!arrayMatches(regex_array, _elements[0])){
      return false;
    }
  }
  
  return true;
}

export const dateToTimestamp = function(_datetime){
  return Date.parse(_datetime) / 1000;
}

export const getCurrentTimestamp = function(){
  return dateToTimestamp(new Date());
}

export const isValidEmail = function(_email_string){
  var regexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  return regexp.test(_email_string);
}

export const sortObjectKeys = function(unordered_object){  
  const ordered_object = Object.keys(unordered_object).sort().reduce(
    (obj, key) => { 
      obj[key] = unordered_object[key]; 
      return obj;
    }, 
    {}
  );
  
  return ordered_object;
}

export const extractFromObject = function(_object, _path){
  const _path_splitted = _path.split('/');
  if(_path_splitted.length <= 0){
    return null;
  }
  
  var field_to_return = _object;
  for(let i = 0; i < _path_splitted.length; i++){
    field_to_return = field_to_return[_path_splitted[i]];
  }
  
  return field_to_return;
}

function writeIntoObjectRecursive(obj_to_write_into, path_array, to_write){
  //console.log("writeIntoObjectRecursive(): obj_to_write_into START: ", obj_to_write_into);
  //console.log("writeIntoObjectRecursive(): path_array START: ", path_array);
  const path_array_0 = path_array[0];
  
  if(path_array.length === 1){ //if you are dealing with the field to update
    if(to_write === null){
      delete obj_to_write_into[path_array_0];
    }
    else{
      obj_to_write_into[path_array_0] = to_write;
    }
    return sortObjectKeys(obj_to_write_into);
  }
  //if you are not dealing with the field to update
  
  const _obj_to_write_into = obj_to_write_into[path_array_0];
  path_array.shift();
  //console.log("writeIntoObjectRecursive(): _obj_to_write_into BEFORE: ", obj_to_write_into);
  //console.log("writeIntoObjectRecursive(): path_array BEFORE: ", path_array);
  
  const updated_subobject = writeIntoObjectRecursive(_obj_to_write_into, path_array, to_write);
  //console.log("writeIntoObjectRecursive(): updated_subobject AFTER: ", updated_subobject);
  
  obj_to_write_into[path_array_0] = updated_subobject;
  return sortObjectKeys(obj_to_write_into);
}
export const writeIntoObject = function(_object, path, to_write){
  const _path_splitted = path.split('/');
  if(_path_splitted.length <= 0){
    return null;
  }
  
  return writeIntoObjectRecursive(_object, _path_splitted, to_write);
}

export const deepCopyObject = function(_object){
  return JSON.parse(JSON.stringify(_object));
}

export const objectToBlob = function(_object){
  //const str = JSON.stringify(_object);
  //const bytes = new TextEncoder().encode(str);
  const blob = new Blob([_object], {
    type: "application/json"
  });
  
  return blob;
}

export const retrieveUrlParameters = function(){
  var qd = {};
  if (location.search){
    location.search.substr(1).split("&").forEach(function(item) {
      var s = item.split("=");
      var k = s[0];
      var v = s[1] && decodeURIComponent(s[1]); //  null-coalescing / short-circuit
      //(k in qd) ? qd[k].push(v) : qd[k] = [v]
      (qd[k] = qd[k] || []).push(v); // null-coalescing / short-circuit
    });
  }
  
  return qd;
}

