// Slack.js
// handles comms to and from SLACK
// Websockets extended from cankav's example on github. 

// FUNCTIONS 
function getSlackWebSocketURL(){

console.log("after get", document.getElementById("url").value, document.getElementById("token").value);

    


var string = document.getElementById("url").value+document.getElementById("token").value;

//Step 1 get WebSocket address from SLACK via RTM API ((https://api.slack.com/methods/rtm.connect?token=)
var SlackWSURLReq = new XMLHttpRequest();

SlackWSURLReq.open("GET", string,true);            //false means wait for response

SlackWSURLReq.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
        var myArr = JSON.parse(this.responseText);
        connectToSlackWebSocket(myArr.url)         //key value pair url:value    
    }else{
     statusBar("unable to connect to slack - check settings")   
     return;   
    }    

};
SlackWSURLReq.send();
}

//Step 2 Connect to WebSocket
function connectToSlackWebSocket(url){

 ws = new WebSocket(url);
    console.log(url);

    // Web Socket is connected, send data using send()
    ws.onopen = function()
    {
    // Web Socket is connected, send data using send()
    console.log("Websocket OPEN");
    };
    
    ws.onmessage = function (evt) 
    { 
    
    var received_msg = JSON.parse(evt.data);
        if (received_msg.type == "hello"){
            statusBar("Slack Connected");
        }
        else {
          console.log(received_msg);
          console.log(received_msg.type);
          if ((received_msg.type == "user_change") ){ 
            console.log(received_msg.user.id);
            console.log(received_msg.user.profile.status_text);
            console.log((received_msg.type == "user_change"));
            console.log((received_msg.user.id==document.getElementById("slackUserID").value));
            console.log((received_msg.user.profile.status_text==""));
          
             if((received_msg.user.profile.status_text=="In a meeting") && (received_msg.user.id==document.getElementById("slackUserID").value) )  {
             connection.send("brightness25 red ");       // Add a space to ease parsing on ESP12F
             }
             if((received_msg.user.profile.status_text=="") && (received_msg.user.id==document.getElementById("slackUserID").value) )  {
             connection.send("black ");                  // Add a space to ease parsing on ESP12F
             }
          } 
          else{                                           // pass to esp12f for interpretation
          
           statusBar("Slack msg: "+received_msg.content);
           connection.send(received_msg.content+String.fromCharCode(13));       // Add a return to ease parsing on ESP12F
          }
        }
    };

    ws.onclose = function () {
        statusBar("Connection to Slack closed.");  // disable onclose handler first
        ws.close()
    };
}


