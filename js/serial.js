// serial.js
// serial device connection utils
// Jan 2018 sanc909 connects to an ESP12F via Serial port
// Install driver to allow serial connection (depends on your board).
// Adds listener and utility functions for webapp - manual or slack control.
// See Slack.js for Slack connectivity 



// move data through serial port using ArrayBuffer containers /////{{{
// Interprets an ArrayBuffer as UTF-8 encoded string data.
var ab2str = function(buf) {
    var bufView = new Uint8Array(buf)
    var encodedString = String.fromCharCode.apply(null, bufView)
    return decodeURIComponent(escape(encodedString))
}

// Converts a string to UTF-8 encoding in a Uint8Array returns the array buffer.
var str2ab = function(str) {
    var encodedString = unescape(encodeURIComponent(str))
    var bytes = new Uint8Array(encodedString.length)
    for (var i = 0; i < encodedString.length; ++i) {
        bytes[i] = encodedString.charCodeAt(i)
    }
    return bytes.buffer
}
//}}}

//// SerialConnection interface object //////{{{
var SerialConnection = function() {
    this.connectionId = -1
    this.lineBuffer = ""
    this.boundOnReceive = this.onReceive.bind(this)
    this.boundOnReceiveError = this.onReceiveError.bind(this)
    this.onConnect = new chrome.Event()
    this.onReadLine = new chrome.Event()
    this.onError = new chrome.Event()
}

SerialConnection.prototype.onConnectComplete = function(connectionInfo) {
    if (!connectionInfo) {
        statusBar("Connection failed.")
        return
    }
    this.connectionId = connectionInfo.connectionId
    chrome.serial.onReceive.addListener(this.boundOnReceive)
    chrome.serial.onReceiveError.addListener(this.boundOnReceiveError)
    this.onConnect.dispatch()
}

SerialConnection.prototype.onReceive = function(receiveInfo) {
    if (receiveInfo.connectionId !== this.connectionId) {
        return
    }
    this.lineBuffer += ab2str(receiveInfo.data)
    var index
    while ((index = this.lineBuffer.indexOf('\n')) >= 0) {
        var line = this.lineBuffer.substr(0, index + 1)
        this.onReadLine.dispatch(line)
        this.lineBuffer = this.lineBuffer.substr(index + 1)
    }
}

SerialConnection.prototype.onReceiveError = function(errorInfo) {
    if (errorInfo.connectionId === this.connectionId) {
        this.onError.dispatch(errorInfo.error)
    }
}

SerialConnection.prototype.getDevices = function(callback) {
    chrome.serial.getDevices(callback)
}

SerialConnection.prototype.connect = function(path) {

    chrome.serial.connect(path, {bitrate:115200}, this.onConnectComplete.bind(this))
    
}

SerialConnection.prototype.send = function(msg) {
    if (this.connectionId < 0) {
        throw 'Invalid connection'
    }
    chrome.serial.send(this.connectionId, str2ab(msg), function(){})
}

SerialConnection.prototype.disconnect = function() {
    if (this.connectionId < 0) {
        throw 'Invalid connection'
    }

    chrome.serial.disconnect(this.connectionId, function(){});
    
}
//}}}

//// FUNCTIONS //////{{{
function log(msg) {
    var buffer = document.querySelector('#textAreaId')
    buffer.value += msg
}
function statusBar(msg) {
    var bar = document.querySelector('output')
    bar.innerHTML = msg
}//}}}

function myFunction(x) {
    x.classList.toggle("change");
} 

//// instance of serial connection object ////
var connection = new SerialConnection()

connection.onConnect.addListener(function() {
    connect_button.disabled = false
})

// capture incoming serial data and put it somewhere
connection.onReadLine.addListener(function(line) {
        log(line)
})

// Populate the list of available devices//{{{
function populateDeviceList() {
    connection.getDevices(function(ports) {
        dropDown.innerHTML = ""
        ports.forEach(function (port) {
            var displayName = port["displayName"]
            if (!displayName) {
                displayName = port.path
            }
            var newOption = document.createElement("option")
            newOption.text = port.path+"   "+displayName
            newOption.value = port.path
            dropDown.appendChild(newOption)
        })
    })
    statusBar("port list refreshed.")
}
// Populate the list when the app loads
populateDeviceList()//}}}

// Get stored values 
chrome.storage.sync.get(['url','token','slackuserID'], function(items) {
      if (!chrome.runtime.error && (typeof items.url != 'undefined')) { 
         console.log('Settings retrieved', items.url);
         document.getElementById("url").value=items.url;
         document.getElementById("token").value=items.token;
         document.getElementById("slackUserID").value=items.slackuserID;
        }
//Show config screen if no values retrieved - user needs to add them...        
     if ( document.getElementById("url").value.length == 0 ||                    
         document.getElementById("token").value.length == 0 ){
         document.getElementById("hamburgerMenu").click();        
         return;
    }     
    });


//// Interact with elements on the page //////{{{
var dropDown = document.querySelector('#port_list')
var listDevicesButton = document.querySelector('#listDevices_button')//}}}
var connectButton = document.querySelector('#connect_button')
var disconnectButton = document.querySelector('#disconnect_button')
var LedsToggle = document.querySelector('#LedsToggle')
var ZebraToggle = document.querySelector('#ZebraModeToggle')
var RedButton = document.querySelector('#redButton');
var numcolours = document.getElementsByName('colour');
var ConnectToSlackToggle = document.querySelector('#ConnectToSlackToggle')//}}}
var SlackButton = document.querySelector('#SlackButton')//}}}
var Brightness = document.getElementById("brightness");
var hamburgerMenu = document.getElementById("hamburgerMenu");
var middleBar  = document.getElementById("middleBar");
var settingsOverlay = document.getElementById("settingsOverlay");
var submitButton  = document.getElementById("submit");

//}}}


// Opens or closes Slack Settings form - stores slack info
hamburgerMenu.addEventListener('click', function() {               
  // Open Overlay // 
  this.classList.toggle("change");   
  var opacity = getComputedStyle(document.getElementById("middleBar")).getPropertyValue("opacity");
  statusBar(opacity); 
  if (opacity == "1") {
  settingsOverlay.style.width = "90%";
  settingsOverlay.style.left  = "5%";
  settingsOverlay.style.right  = "5%";
  }
  else{
  settingsOverlay.style.width = "0%";
  settingsOverlay.style.left  = "100%";
  }
})


// List Devices Button //{{{
listDevices_button.addEventListener('click', function() {
    populateDeviceList()
    statusBar("refreshing port list")
})
dropDown.addEventListener('change', function() {
    statusBar("selected " + dropDown.options[dropDown.selectedIndex].value)
})//}}}

// Disconnect//{{{
disconnectButton.addEventListener('click', function() {
    var devicePath = dropDown.options[dropDown.selectedIndex].value
    console.log("Trying to disconnect from " + devicePath)
    statusBar("disconnecting from " + devicePath)
    try{
    connection.disconnect(devicePath)
    }
    catch (error){
    statusBar("Unable to disconnect from " + devicePath)       
    }
    connectButton.disabled        = false
    connectButton.className       = "button"
    
        
    disconnectButton.disabled     = true
    disconnectButton.className       = "button disabled"
    
    ZebraModeToggle.disabled      = true
    connectToSlackToggle.disabled = true
    connectToSlackToggle.disabled = true
    brightness.disabled           = true
    for (var i=0, len=numcolours.length; i<len; i++) {
       numcolours[i].disabled = true;
    };
    
    
});
   
// Connect to the chosen device//{{{
connectButton.addEventListener('click', function() {
    var devicePath = dropDown.options[dropDown.selectedIndex].value
    console.log("Trying to connect to " + devicePath)
    try{

    connection.connect(devicePath)
    statusBar("connecting to " + devicePath)
    }
    catch(error){
    statusBar("Unable to connect to " + devicePath)       
    }
    connectButton.disabled        = true
    connectButton.className       = "button disabled" 
    
    disconnectButton.disabled     = false
    disconnectButton.className    = "button"
    
    ZebraModeToggle.disabled      = false
    connectToSlackToggle.disabled = false
    brightness.disabled           = false
    for (var i=0, len=numcolours.length; i<len; i++) {
       numcolours[i].disabled = false;
    };
    statusBar("connected to " + devicePath)
})//}}}

brightness.addEventListener('change', function() {
    
    connection.send((ZebraToggle.checked ? "zebra ": " ")+"brightness"+brightness.value+" "+document.querySelector('input[name = "colour"]:checked').value+" "+String.fromCharCode(13));
    statusBar((ZebraToggle.checked ? "zebra ": " ")+"brightness "+brightness.value+" "+document.querySelector('input[name = "colour"]:checked').value+" "+String.fromCharCode(13))
    
})

// Add a listener for each radio button 
// loop through list
for (var i=0, len=numcolours.length; i<len; i++) {
    numcolours[i].onclick = function() { // assign onclick handler function to each
        // put clicked radio button's value in total field
        connection.send((ZebraToggle.checked ? "zebra ": " ")+"brightness"+brightness.value+" "+this.value+" "+String.fromCharCode(13));
        statusBar((ZebraToggle.checked ? "zebra ": " ")+"brightness"+brightness.value+" "+this.value+" "+String.fromCharCode(13));
    };
}

// Slack Button  - Open or close the socket
ConnectToSlackToggle.addEventListener('click', function() {
    
    if ( ConnectToSlackToggle.checked ) {
        var url = getSlackWebSocketURL();             
    }
    else {
        ws.close();     
    }
    
})//
// Store the slack variables in local storage 
submitButton.addEventListener('click', function() {

    var urlvalue     = document.getElementById("url").value;
    var tokenvalue   = document.getElementById("token").value;
    var userID       = document.getElementById("slackUserID").value;
    chrome.storage.sync.set({'url': urlvalue,'token':tokenvalue,'slackuserID':userID}, function() {
    statusBar('Settings saved');
    console.log('Settings saved');
    });
})//




