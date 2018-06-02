/**
* Global variables */
var API_POST_URL = "http://back.bona-iqiniso.com/v1.0"; //"http://localhost:9000/v1.0"; //"http://back.bona-iqiniso.com/v1.0";
var MAPPING_ITEM_URL_TEMPLATE = "http://front.bona-iqiniso.com/mapping/{id}";
var CURRENT_MAPPING_URL = "";
var CURRENT_URL = "";
var COOKIES_AVAILABLE = false;
var COOKIES = {};

/**
* Initially load the current tab URL */
chrome.tabs.query({"active": true, "lastFocusedWindow": true}, function (tabs) {
    CURRENT_URL = tabs[0].url;
    $("#page-title").text(tabs[0].title);
    info("Setting current URL [" + CURRENT_URL + "]");
});

/**
* Initially takes a screenshot */
chrome.tabs.captureVisibleTab(null, {}, function (image) {
   // Generates the screenshot
   info("Generated screenshot");
   var imgElement = document.createElement("img");
   imgElement.setAttribute("src", image);
   imgElement.setAttribute("width", "300");
   document.getElementById("image-wrapper").appendChild(imgElement);
});

/**
* Bind capture page button event  */
$("#capture").on("click", () => {
  info("Executing DOM loader");

  // inject code to dom and fetch the dom as string
  chrome.tabs.executeScript({
    code: "document.documentElement.innerHTML"
  }, domResponse);
});

/**
* Bind login button event  */
$("#login").on("click", () => {
  login();
});

/**
 * Bind logout button event  */
$("#logout").on("click", () => {
    logout();
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
* Upload blob to server via jQuery XHR */
function uploadFile(file){
  info("Upload starting");

  // creating form data for upload
  var formData = new FormData();

  formData.append("dom", file);
  info("Setting form data [dom = FILE]");
  formData.append("pageName", $("#page-name").val());
  info("Setting form data [pageName = " + $("#page-name").val() + "]");
  formData.append("url", CURRENT_URL);
  info("Setting form data [url = " + CURRENT_URL + "]");
  var auth = getAuthObject();
  for(var i in auth){
    formData.append(i, auth[i]);
    info("Setting form data [" + i + " = " + auth[i] + "]");
  }

  info("Processing");

  $.ajax({
       type: "POST",
       url: getApiURL("/mappings"),
       data: formData,
       cache: false,
       contentType: false,
       processData: false,
       xhr: function () {
            var xhr = $.ajaxSettings.xhr();
            if (xhr.upload) {
                xhr.upload.addEventListener('progress', function (event) {
                    var percent = 0;
                    var position = event.loaded || event.position;
                    var total = event.total;
                    if (event.lengthComputable) {
                        percent = Math.ceil(position / total * 100);
                    }
                    $("#upload").text(percent + "%");
                }, false);
            }
            return xhr;
        },
       success: function (data) {
            info("Uploaded successfully");
            info("Parsed DOM with [" + data.parsedElementCount + "] xpath elements");
            info("Created object ID [" + data.id + "]");
            openMappingOnUI(data.id);
       },
       error: function (e) {
           // handle error
           error("Uploaded error");
           error("Response with status [" + e.status + "]");
           if(e.status == "401"){
               logout();
           }
       }
  });
}

/**
* Open UI if returned with a new id */
function openMappingOnUI(id){
  if(id != ""){
    CURRENT_MAPPING_URL = MAPPING_ITEM_URL_TEMPLATE.replace("{id}", id);
    $("#launch-pane").show();
    // binding a new event to launch click
    $("#launch").on("click", () => {
      info("Launch mapping clicked");
      createTab(CURRENT_MAPPING_URL);
    });
  }else{
    $("#launch-pane").hide();
  }
}

/**
* Creates a new tab with given url */
function createTab(url){
    info("Launching " + url);
    chrome.tabs.create({ url: url});
}

/**
* Create auth properties in cookies */
function getAuthObject(){
  var qsObject = {};
  var keys = Object.keys(COOKIES);
  for (var i in keys) {
    if(COOKIES[keys[i]])
      qsObject[keys[i]] = COOKIES[keys[i]];
  }

  return qsObject;
}

/**
* Retrieves cookies from the COOKIE_URL_PATTERN url */
var getCookies = function(){
  info("Getting session data");
  getSessionId();
}();

function setSessionData(data) {
    setUsernameUi(data.userName);
    COOKIES['sessionId'] = data.sessionId;
    chrome.storage.local.set({'sessionId': data.sessionId}, function() {});
    chrome.storage.local.set({'userName': data.userName}, function() {});
}

function setUsernameUi(username) {
    $("#user").text(username);
}

function getSessionId() {
    chrome.storage.local.get(['sessionId', 'userName'], function(data) {
        if(data.sessionId){
            setUsernameUi(data.userName);
            COOKIES['sessionId'] = data.sessionId;
            $("#login-pane").hide();
            $("#capture-pane").show();
            $("#user-pane").show();
        }else{
            $("#login-pane").show();
            $("#capture-pane").hide();
            $("#connecting").hide();
            $("#user-pane").hide();
            error("Need to login");
        }
    });
}

function login() {
    var username = $("#username").val();
    var password = $("#password").val();
    var formData = {
        userName : username,
        password : password
    }

    $.ajax({
        type: "POST",
        url: getApiURL("/users/" + username + "/login"),
        data: JSON.stringify(formData),
        cache: false,
        dataType: 'json',
        contentType: "application/json",
        success: function (data) {
            setSessionData(data);
            getSessionId();
        },
        error: function (e) {
            // handle error
            error("Uploaded error");
        }
    });
}


function logout() {
    chrome.storage.local.remove('sessionId');
    getSessionId();
}


function getApiURL(endpoint){
  return API_POST_URL + endpoint;
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
