
chrome.app.runtime.onLaunched.addListener(function(launchData){ 
  chrome.app.window.create( 
  'index.html',
  { id:'slackLeds', 'innerBounds': {'width': 507, 'height': 612},'resizable':false},
  function(win) 
      { 
      win.contentWindow.launchData = launchData ;
      chrome.app.window.get('slackLeds').onClosed.addListener(function(win) {
        // disconnect from serial and slack closed when window is closed. 
        console.log("1Serial Connection ID is ",chrome.app.window.get('slackLeds').contentWindow.connection.connectionId);
        chrome.serial.disconnect(chrome.app.window.get('slackLeds').contentWindow.connection.connectionId, function(){});
        console.log("2 connected to Slack is ",chrome.app.window.get('slackLeds').contentWindow.ConnectToSlackToggle.checked);
        chrome.app.window.get('slackLeds').contentWindow.ConnectToSlackToggle.checked=false;
        });
      }
  );

 
})  

