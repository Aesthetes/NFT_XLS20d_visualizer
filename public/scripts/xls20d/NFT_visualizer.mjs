import { attachEvent, getRadioButtonValue, getElementValue, setInnerHTML, getLinkHTML,
  isUndefinedOrNull, showImageSrc, hideImage, JSONBeautify
} from "./../utils.mjs";
import { getNFTInfo
} from "./NFT_handler.mjs";
import {
  isXumm, handleXUMMRedirection
} from "./../xumm_handler.mjs"

const ipfs_gateway_url = "https://gateway.pinata.cloud/ipfs/";
var is_xapp = null;

function displayErrorInfo(_error, error_mode){
  setInnerHTML(error_mode, _error.message);
}

function displayNFTInfo(nft_info_obj){
  //var HTML_to_print = "<h3>NFT INFORMATIONS</h3>" + JSONBeautify(nft_info_obj).replaceAll('\n', "<br>");
  
  var HTML_to_print = "<h2>NFT INFORMATIONS</h2>";
  
  const metadata_obj = nft_info_obj["metadata"];
  const author_obj = metadata_obj["author"];
  const name = metadata_obj["name"];
  const author_name = author_obj["name"];
  const description = metadata_obj["description"];
  const NFToken_obj = nft_info_obj["NFToken_obj"];
  const issuer = NFToken_obj["Issuer"];
  const actual_nft_issuer_link = "https://xls20.bithomp.com/explorer/" + issuer;
  const taxon = NFToken_obj["TokenTaxon"];
  const seqnum = NFToken_obj["nft_serial"];
  const metadata_link = nft_info_obj["metadata_link"];
  const content_link = nft_info_obj["content_link"];
  const actual_nft_owner = nft_info_obj["actual_nft_owner"];
  const actual_nft_owner_link = "https://xls20.bithomp.com/explorer/" + actual_nft_owner;
  
  HTML_to_print += "Name: " + name + "<br>" +
  "Author: " + author_name + "<br>" +
  "Description: " + description + "<br>" +
  "Taxon: " + taxon + "<br>" +
  "Progressive Number: " + seqnum + "<br>" +
  "link to the Metadata: " + getLinkHTML(metadata_link) + "<br>" +
  "link to the Content: " + getLinkHTML(content_link) + "<br>" + 
  "link to the NFT Issuer: " + getLinkHTML(actual_nft_issuer_link) + "<br>" +
  "link to the NFT Owner: " + getLinkHTML(actual_nft_owner_link);
  
  const warnings = nft_info_obj["warnings"];
  if(!warnings.includes("NoIssuerDomain")){
    let issuer_domain = nft_info_obj["issuer_domain"];
    HTML_to_print += "<br>" +
    "Domain: " + issuer_domain;
    
    if(!warnings.includes("IssuerNotVerified")){
      HTML_to_print += " VERIFIED";
      
      if(
        issuer_domain === "aesthetes.art" ||
        issuer_domain.endsWith(".aesthetes.art")
      ){
        HTML_to_print += "<br>AESTHETES CERTIFIED";
      }
    }
    HTML_to_print += "<br>";
  }
  
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
    //console.log("XLS20d exiting...");
    return;
  }
  //console.log("XLS20d working...");
  
  var error_mode = "nft_info";
  var links_HTML = "";
  getNFTInfo(nft_owner_address, nft_id, ripple_network)
  .then((nft_info) => {
    if(isUndefinedOrNull(nft_info)){//if the metadata doesn't exists
      throw new Error("Unable to reach the given NFT");
    }
    //displayMetadata(nft_info);
    displayNFTInfo(nft_info);
    console.log("nft_info: ", nft_info);
    
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
  is_xapp = isXumm();
  attachEvents();
});
