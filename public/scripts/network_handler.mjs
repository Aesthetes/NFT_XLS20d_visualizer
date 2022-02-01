const FUNCTIONS_ENDPOINT_URL = "http://localhost:5001/fedefeggio2021091700/europe-west1/";
//europe-west1
//us-central1
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
