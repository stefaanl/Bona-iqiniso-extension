/**
* Global variables */
var API_POST_URL = "http://back.bona-iqiniso.com/v1.0"; //"http://localhost:9000/v1.0"; //"http://back.bona-iqiniso.com/v1.0";
var MAPPING_ITEM_URL_TEMPLATE = "http://front.bona-iqiniso.com/mapping/{id}";
var CURRENT_MAPPING_URL = "";
var CURRENT_URL = "";
var COOKIES = {};
var FULLSCREEN = null;

/**
* Initially load the current tab URL */
chrome.tabs.query({"active": true, "lastFocusedWindow": true}, function (tabs) {
    CURRENT_URL = tabs[0].url;
    $("#page-title").text(tabs[0].title);
    info("Setting current URL [" + CURRENT_URL + "]");
});

function aliveCheck() {
    var auth = getAuthObject();
    var sessionId = auth['sessionId'];
    if(!sessionId){
        return;
    }

    $.ajax({
        type: "GET",
        url: getApiURL("/me/check"),
        headers : {
          Authorization : "Bearer " + sessionId
        },
        cache: false,
        dataType: 'json',
        contentType: "application/json",
        success: function (data) {
            info("Alive check success")
            setTimeout(aliveCheck, 15000);
        },
        error: function (e) {
            // handle error
            error(JSON.stringify(e))
            error("Health check returned false");
            logout();
        }
    });
};

function startCollectingDom(blob) {
    if(blob)
        info("Screenshot created")

    $("#img").attr("src", URL.createObjectURL(blob));
    $("#img").show();

    FULLSCREEN = blob;

    // inject code to dom and fetch the dom as string
    chrome.tabs.executeScript({
        code: "document.documentElement.innerHTML"
    }, domResponse);
}

function displayCaptures(filenames) {
    if(filenames && filenames.length > 0)
        startCollectingDom(filenames[0]);
}

function errorHandler(reason) {
    error(reason);
}

function progress(complete) {
    $("#upload").text("Preparing " + Math.ceil(complete * 100) + "%")
}

/**
* Bind capture page button event  */
$("#capture").on("click", () => {
    info("Executing DOM loader");

    chrome.tabs.setZoom(null, 1.0, function () {

    });


    chrome.tabs.executeScript({
        code: "window.scrollTo(0,0)"
    });

    /**
    * Initially takes a screenshot and Add bounding box to all elements*/
    setTimeout(function() {
        chrome.tabs.executeScript({
            code: "document.querySelectorAll('*').forEach(function(node) { node.setAttribute('bi--box', node.getBoundingClientRect().x + ':' + node.getBoundingClientRect().y + ':' + node.getBoundingClientRect().width + ':' + node.getBoundingClientRect().height) });"
        }, function () {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                var tab = tabs[0];
                CaptureAPI.captureToBlobs(tab, displayCaptures, errorHandler, progress, function(){});
            });
        });

    }, 1000);
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
  formData.append("screenshot", FULLSCREEN);
  info("Setting form data [dom = FILE]");
  formData.append("pageName", $("#page-name").val());
  info("Setting form data [pageName = " + $("#page-name").val() + "]");
  formData.append("url", CURRENT_URL);
  info("Setting form data [url = " + CURRENT_URL + "]");
  var auth = getAuthObject();
  var sessionId = auth['sessionId'];

  info("Processing");

  $.ajax({
       type: "POST",
       url: getApiURL("/mappings"),
       data: formData,
       cache: false,
       contentType: false,
       processData: false,
       headers : {
           Authorization : "Bearer " + sessionId
       },
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
                    $("#upload").text("Uploading " + percent + "%");
                }, false);
            }
            return xhr;
        },
       success: function (data) {
            info("Uploaded successfully");
            info("Parsed DOM with [" + data.parsedElementCount + "] xpath elements");
            info("Created object ID [" + data.id + "]");
            //openMappingOnUI(data.id);
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
  return COOKIES;
}

/**
* Retrieves cookies from the COOKIE_URL_PATTERN url */
(function(){
  info("Getting session data");
  getSessionId(aliveCheck);
})();

function setSessionData(data) {
    setUsernameUi(data.userName);
    COOKIES['sessionId'] = data.sessionId;
    chrome.storage.local.set({'sessionId': data.sessionId}, function() {});
    chrome.storage.local.set({'userName': data.userName}, function() {});
}

function setUsernameUi(username) {
    $("#user").text(username);
}

function getSessionId(callback) {
    chrome.storage.local.get(['sessionId', 'userName'], function(data) {
        if(data.sessionId){
            setUsernameUi(data.userName);
            COOKIES['sessionId'] = data.sessionId;
            if(callback && typeof callback === "function") callback(data.sessionId);
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
            error("Login error");
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



var dimensions = {};
dimensions.top = -window.scrollY;
dimensions.left = -window.scrollX;
dimensions.width = 100;
dimensions.height = 200;

function capture(tabId, dimensions) {
    var canvas = null;
    chrome.tabs.captureVisibleTab(tabId, { format: "png" }, function(dataUrl) {
        if (!canvas) {
            canvas = document.createElement("canvas");
            document.body.appendChild(canvas);
        }
        var image = new Image();

        image.onload = function() {
            canvas.width = dimensions.width;
            canvas.height = dimensions.height;
            var context = canvas.getContext("2d");
            context.drawImage(image,
                dimensions.left, dimensions.top,
                dimensions.width, dimensions.height,
                0, 0,
                dimensions.width, dimensions.height
            );
            var croppedDataUrl = canvas.toDataURL("image/png");
            chrome.tabs.create({
                url: croppedDataUrl,
                windowId: tabId
            });
        }
        image.src = dataUrl;
    });
};