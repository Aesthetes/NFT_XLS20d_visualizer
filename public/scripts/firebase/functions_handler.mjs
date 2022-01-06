import { app } from "./config.mjs";

import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/9.0.2/firebase-functions.js";

const functions = getFunctions(app);
connectFunctionsEmulator(functions, "localhost", 5001);

const FUNCTIONS_ENDPOINT_URL = "http://localhost:5001/fedefeggio2021091700/europe-west1/";
//europe-west1
//us-central1

export const callHttpsCallable = async function(callable_name, data){
  const _callable = httpsCallable(functions, callable_name);
  return _callable(data);
}

export const callRestApi = async function(method, endpoint_url, data = {}){
  const function_endpoint_url = FUNCTIONS_ENDPOINT_URL + endpoint_url;
  
  if(method === "GET"){
    return axios.get(function_endpoint_url);
  }
  else if(method === "POST"){
    return axios.post(function_endpoint_url, data);
  }
  else{
    return null;
  }
}
