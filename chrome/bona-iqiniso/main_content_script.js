/**
* Global variables */
var API_POST_URL = "http://localhost:9000/dom/insert";
var COOKIE_URL_PATTERN = "http://*.bona-iqiniso.com";
var LOGIN_URL = "http://front.bona-iqiniso.com/login";
var MAPPING_ITEM_URL_TEMPLATE = "http://front.bona-iqiniso.com/mapping/{id}";
var CURRENT_MAPPING_URL = "";
var CURRENT_URL = "";
var COOKIES_AVAILABLE = false;
var COOKIE_CHECK = ["userName", "organization", "sessionId"];
var COOKIES = {};

/**
* Initially load the current tab URL */
chrome.tabs.query({"active": true, "lastFocusedWindow": true}, function (tabs) {
    CURRENT_URL = tabs[0].url;
    info("Setting current URL [" + CURRENT_URL + "]");
});

/**
* Bind capture page button event  */
document.getElementById("capture").addEventListener("click", () => {
  info("Executing DOM loader");

  chrome.tabs.captureVisibleTab(null, {}, function (image) {
     // Generates the screenshot
     info("Generated screenshot");
     var imgElement = document.createElement("img");
     imgElement.setAttribute("src", image);
     imgElement.setAttribute("width", "300");
     document.getElementById("image-wrapper").appendChild(imgElement);
  });

  // inject code to dom and fetch the dom as string
  chrome.tabs.executeScript({
    code: "document.documentElement.innerHTML"
  }, domResponse);
});

/**
* Bind login button event  */
document.getElementById("login").addEventListener("click", () => {
  // launch a new browser tab
  createTab(LOGIN_URL);
});

/**
* DOM response callback method */
function domResponse(response){
  info("DOM response received");

  var domHTML = response[0];

  if(domHTML == ""){
    error("DOM is empty");
  }else{
    info("DOM received successfully");
    var blob = new Blob([domHTML], {type: "text/plain"});

    // upload the DOM as text file
    uploadFile(blob);
  }
}

/**
* Upload blob to server via XHR */
function uploadFile(file){
  info("Upload starting");

  // creating form data for upload
  var formData = new FormData();
  info("Setting query param [url = " + CURRENT_URL + "]");
  info("Setting form data [dom = FILE]");
  formData.append("dom", file);

  // creating XMLHttpRequest for filr upload
  info("Uploading DOM to server");
  var xhr = new XMLHttpRequest();
  xhr.open("POST", API_POST_URL + "?url=" + CURRENT_URL + "&" + getAuthString(), true);
  //xhr.setRequestHeader("Content-Type","multipart/form-data");
  xhr.addEventListener("readystatechange", function (evt) {
    info("xhr state changed [readyState: " + xhr.readyState + " : Status: " + xhr.status + "]");

    if (xhr.readyState == 4){
      if(xhr.status == 200) {
        info("Uploaded successfully");
        var response = JSON.parse(this.responseText);
        info("Parsed DOM with [" + response.parsedElementCount + "] xpath elements");
        info("Created object ID [" + response.id + "]");
        openMappingOnUI(response.id);
      }else{
        error("Uploaded error");
        error("Response with status [" + xhr.status + "]");
      }
    }
  });

  xhr.send(formData);
}

/**
* Open UI if returned with a new id */
function openMappingOnUI(id){
  if(id != ""){
    CURRENT_MAPPING_URL = MAPPING_ITEM_URL_TEMPLATE.replace("{id}", id);
    show("launch-pane");
    // binding a new event to launch click
    document.getElementById("launch").addEventListener("click", () => {
      info("Launch mapping clicked");
      createTab(CURRENT_MAPPING_URL);
    });
  }else{
    hide("launch-pane");
  }
}

/**
* Creates a new tab with given url */
function createTab(url){
    info("Launching " + url);
    chrome.tabs.create({ url: url});
}

/**
* Create auth query string with expected cookies */
function getAuthString(){
  var qsArray = [];
  var keys = Object.keys(COOKIES);
  for (var i in keys) {
    if(COOKIES[keys[i]])
      qsArray.push(keys[i] + "=" + COOKIES[keys[i]]);
  }

  return qsArray.join("&");
}

/**
* Retrieves cookies from the COOKIE_URL_PATTERN url */
var getCookies = function(){
  info("Getting cookies from " + COOKIE_URL_PATTERN);

  var matchedCount = 0;
  chrome.cookies.getAll({ url : COOKIE_URL_PATTERN}, function (response){
    for (var i in COOKIE_CHECK) {
      for (var j in response) {
        if(COOKIE_CHECK[i] == response[j].name){
          COOKIES[response[j].name] = response[j].value;
          matchedCount++;
        }
      }
    }

    if(matchedCount == COOKIE_CHECK.length){
      info("Found " + COOKIE_CHECK.length + " cookie(s)");
      COOKIES_AVAILABLE = true;
    }else{
      error("Cookies missing. Need to login");
    }

    cookieAvailableCheck();
  })
}()

/**
* Show or hide login depending on the cookie availability */
function cookieAvailableCheck(){
  if(COOKIES_AVAILABLE){
    // cookies are available
    hide("login-pane");
    show("capture-pane");
  }else{
    // cookies missing. need to login
    show("login-pane");
    hide("capture-pane");
    hide("connecting");
  }
}

/**
* Logging util for info messages */
function info(text){
  var time = "<span style='color:gray'>" + new Date().toLocaleTimeString() + "</span> ";
  var el = document.getElementById("log");
  el.innerHTML = el.innerHTML + "\n" + time + "" + "<span style='color:darkcyan'>" + text + "</span>";
  console.log("info : " + text);
}

/**
* Logging util for error messages */
function error(text){
  var time = "<span style='color:gray'>" + new Date().toLocaleTimeString() + "</span> ";
  var el = document.getElementById("log");
  el.innerHTML = el.innerHTML + "\n" + time + "" + "<span style='color:red'>" + text + "</span>";
  console.log("error : " + text);
}

/**
* Show element by id */
function show(id){
  var el = document.getElementById(id);
  if(el)
    el.style.display = "block";
}

/**
* Hide element by id */
function hide(id){
  var el = document.getElementById(id);
  if(el)
    el.style.display = "none";
}
