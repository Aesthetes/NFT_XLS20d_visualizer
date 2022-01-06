import { attachEvent, getRadioButtonValue, getElementValue, setInnerHTML, getLinkHTML,
  isUndefinedOrNull, showImageSrc, hideImage, JSONBeautify
} from "./utils.mjs";
import { getNFTInfo
} from "./NFT_handler.mjs";

const ipfs_gateway_url = "https://gateway.pinata.cloud/ipfs/";

function displayErrorInfo(_error, error_mode){
  setInnerHTML(error_mode, _error.message);
}
/*
function displayMetadata(nft_metadata){
  const ripple_network = getRadioButtonValue("ripple_network");
  const blockchain_explorer_url = "https://" + 
    ((ripple_network === "Testnet") ? "test." : "") + "bithomp.com/explorer/";
  
  var HTML_to_print = "<h3>NFT INFORMATIONS</h3>";
  if(!isUndefinedOrNull(nft_metadata.name)){
    HTML_to_print += "<b>Name:</b> " + nft_metadata.name + "<br><br>";
  }
  if(!isUndefinedOrNull(nft_metadata.author)){
    HTML_to_print += "<b>Author:</b> " + nft_metadata.author + "<br><br>";
  }
  if(!isUndefinedOrNull(nft_metadata.description)){
    HTML_to_print += "<b>Description:</b> " + nft_metadata.description + "<br><br>";
  }
  if(!isUndefinedOrNull(nft_metadata.metadata_cid)){
    HTML_to_print += "Link to the NFT metadata: " + getLinkHTML(ipfs_gateway_url + nft_metadata.metadata_cid) + "<br>";
  }
  if(!isUndefinedOrNull(nft_metadata.actual_nft_owner)){
    HTML_to_print += "Link to the owner account: " + getLinkHTML(blockchain_explorer_url + nft_metadata.actual_nft_owner) + "<br>";
  }
  if(!isUndefinedOrNull(nft_metadata.metadata_tx_hash)){
    HTML_to_print += "Link to the Tx containing the metadata: " + getLinkHTML(blockchain_explorer_url + nft_metadata.metadata_tx_hash);
  }
  if(!isUndefinedOrNull(nft_metadata.detected_minter_obj) && !isUndefinedOrNull(nft_metadata.detected_minter_obj.value) &&
    nft_metadata.detected_minter_obj.value.length > 0){
    HTML_to_print += "<br>";
    HTML_to_print += nft_metadata.detected_minter_obj.certified ? "(CERTIFIED)" : "(NOT CERTIFIED)";
    HTML_to_print += " NFT minted by " + nft_metadata.detected_minter_obj.value;
  }
  
  setInnerHTML("nft_info", HTML_to_print);
}
//*/
function displayNFTInfo(nft_info_obj){
  //var HTML_to_print = "<h3>NFT INFORMATIONS</h3>" + JSONBeautify(nft_info_obj).replaceAll('\n', "<br>");
  
  console.log("displayNFTInfo(): nft_info_obj: ", nft_info_obj);
  var HTML_to_print = "<h2>NFT INFORMATIONS</h2>";
  
  const metadata_obj = nft_info_obj["metadata"];
  const author_obj = metadata_obj["author"];
  const name = metadata_obj["name"];
  const author_name = author_obj["name"];
  const description = metadata_obj["description"];
  const issuer = metadata_obj["issuer"];
  const actual_nft_issuer_link = "https://xls20.bithomp.com/explorer/" + issuer;
  const taxon = metadata_obj["taxon"];
  const seqnum = metadata_obj["seqnum"];
  const metadata_link = nft_info_obj["metadata_link"];
  const content_link = nft_info_obj["content_link"];
  const actual_nft_owner = nft_info_obj["actual_nft_owner"];
  const actual_nft_owner_link = "https://xls20.bithomp.com/explorer/" + actual_nft_owner;
  //issuer
  
  HTML_to_print += "Name: " + name + "<br>" +
  "Author: " + author_name + "<br>" +
  "Description: " + description + "<br>" +
  "Taxon: " + taxon + "<br>" +
  "Progressive Number: " + seqnum + "<br>" +
  "link to the Metadata: " + getLinkHTML(metadata_link) + "<br>" +
  "link to the Content: " + getLinkHTML(content_link) + "<br>" + 
  "link to the NFT Issuer: " + getLinkHTML(actual_nft_issuer_link) + "<br>" +
  "link to the NFT Owner: " + getLinkHTML(actual_nft_owner_link);
  
  setInnerHTML("nft_info", HTML_to_print);
}

async function handleVisualizeClick(){
  const _prefix = "handleVisualizeClick(): ";
  hideImage("nft_image");
  setInnerHTML("content_info", "");
  setInnerHTML("nft_info", "Loading...");
  
  const ripple_network = getRadioButtonValue("ripple_network");
  const nft_owner_address = getElementValue("nft_owner_address");
  const nft_id = getElementValue("nft_id");
  
  if(ripple_network !== "XLS20d"){
    console.log("XLS20d exiting...");
    return;
  }
  console.log("XLS20d working...");
  
  var error_mode = "nft_info";
  var links_HTML = "";
  getNFTInfo(nft_owner_address, nft_id, ripple_network)
  .then((nft_info) => {
    if(isUndefinedOrNull(nft_info)){//if the metadata doesn't exists
      throw new Error("Unable to reach the given NFT");
    }
    //displayMetadata(nft_info);
    displayNFTInfo(nft_info);
    //console.log("nft_info: ", JSONBeautify(nft_info));
    
    error_mode = "content_info";
    
    let content_object_url = nft_info["content_object_url"];
    if(!isUndefinedOrNull(content_object_url)){
      showImageSrc("nft_image", nft_info["content_object_url"]);
    }
    
    return null;
  })
  .catch((error) => {
    displayErrorInfo(error, error_mode);
  });
}

function attachEvents(){
  attachEvent("visualize_button", "click", handleVisualizeClick);
  //attachEvent("show_image", "click", handleImageClick);
}
window.addEventListener('load', (event) => {
  attachEvents();
});
