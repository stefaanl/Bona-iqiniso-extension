/**
* Global variables */
var API_POST_URL = "http://localhost:9000/dom/insert"; //"http://back.bona-iqiniso.com/dom/insert";
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
       url: API_POST_URL,
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
  info("Getting cookies from " + COOKIE_URL_PATTERN);

  chrome.cookies.getAll({ url : COOKIE_URL_PATTERN}, function (response){
    for (var i in COOKIE_CHECK) {
      for (var j in response) {
        if(COOKIE_CHECK[i] == response[j].name){
          COOKIES[response[j].name] = response[j].value;
        }
      }
    }

    if(Object.keys(COOKIES).length == COOKIE_CHECK.length){
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
    $("#login-pane").hide();
    $("#capture-pane").show();
  }else{
    // cookies missing. need to login
    $("#login-pane").show();
    $("#capture-pane").hide();
    $("#connecting").hide();
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
