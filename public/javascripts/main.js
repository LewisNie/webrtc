'use strict';

var isInitiator;
var isChannelReady = false;
var isStarted = false; //is started video call;
var localStream;
var pc;
var remoteStream;
var turnReady;

var pcConfig = {
    'iceServers':[
        {url:'stun:stun01.sipphone.com'},
        {url:'stun:stun.ekiga.net'},
        {url:'stun:stun.fwdnet.net'},
        {url:'stun:stun.ideasip.com'},
        {url:'stun:stun.iptel.org'},
        {url:'stun:stun.rixtelecom.se'},
        {url:'stun:stun.schlund.de'},
        {url:'stun:stun.l.google.com:19302'},
        {url:'stun:stun1.l.google.com:19302'},
        {url:'stun:stun2.l.google.com:19302'},
        {url:'stun:stun3.l.google.com:19302'},
        {url:'stun:stun4.l.google.com:19302'},
        {url:'stun:stunserver.org'},
        {url:'stun:stun.softjoys.com'},
        {url:'stun:stun.voiparound.com'},
        {url:'stun:stun.voipbuster.com'},
        {url:'stun:stun.voipstunt.com'},
        {url:'stun:stun.voxgratia.org'},
        {url:'stun:stun.xten.com'},
        {
            url: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=udp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        },
        {
            url: 'turn:192.158.29.39:3478?transport=tcp',
            credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            username: '28224511:1379330808'
        }
    ]
};

var sdpConstraints = {
    offerToReceiveAudio:true,
    offerToReceiveVideo:true
};

var room = 'foo';
//window.room = prompt("Enter room name: ");

var socket = io.connect();

if(room !== ""){
    console.log("Message from client: Asking to join room "+ room);
    socket.emit('create or join', room);
}

socket.on("full", function (room) {
    console.log('Message from client: Room '+ room+ 'is full: ^(');
});

socket.on("created", function (room, clientId) {
    console.log('created room '+ room);
    isInitiator = true;
});

socket.on("ipaddr", function (ipaddr) {
    console.log("Message from client: Server IP address is "+ ipaddr);
});

socket.on('joined', function (room, clientId) {
    console.log('joined: ' + room);
    isInitiator = false;
});

socket.on('log', function (array) {
    console.log.apply(console, array);
});

function sendMessage(message) {
    console.log('Client sending message: ', message);
    socket.emit('message', message);
}

socket.on('message', function (message) {
    console.log('Client received message: ', message);
    if(message === "got user media"){

    }else if(message.type == "candidate" && isStarted){
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
    }else if(message.type === 'offer'){
        if(!isInitiator && !isStarted){
            maybeStart();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
    } else if(message.type === 'answer' && isStarted){
        pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if(message === 'bye' && isStarted){
        handleRemoteHangup();
    }
});

var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");

navigator.mediaDevices.getUserMedia({
    audio:false,
    video:true
}).then(function (stream) {
    console.log('Adding local stream. ');
    localVideo.src = window.URL.createObjectURL(stream);
    localStream = stream;
    sendMessage('got user media');
    if(isInitiator){
        maybeStart();
    }
}).catch(function (reason) {
    alert('getUserMedia() error: ' + reason.name);
});

var constraints = {
    video: true
};

console.log('Getting user media with constraints', constraints);

if(location.hostname !== 'localhost'){
    requestTurn("https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913");
}

function maybeStart() {
    console.log('>>>>>>> mybeStart() ', isStarted, localStream, isChannelReady);
    if(!isStarted && typeof localStream !== 'undefined' && isChannelReady){
        console.log('>>>>>>> creating peer connecting');
        createPeerConnection();
        pc.addStream(localStream);
        isStarted = true;
        console.log('isInitiator: ', isInitiator);
        if(isInitiator){
            doCall();
        }
    }
}

function createPeerConnection() {
    try{
        pc = new RTCPeerConnection(null);
        pc.onicecandidate = handleIceCandidate;
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnection');
    } catch (e){
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}

function handleIceCandidate(event) {
    console.log('icecandidate event: ', event);
    if(event.candidate){
        // pc.addIceCandidate(event.candidate)
        sendMessage({
            type:'candidate',
            label: event.candidate.sdpMLineIndex,
            id:event.candidate.sdpMid,
            candidate: event.candidate.candidate
        });
    } else {
      console.log('End of candidate');
    }
}

function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    remoteVideo.src = window.URL.createObjectURL(event.stream);
    remoteStream = event.stream;
}

function handleRemoteStreamRemoved() {
    console.log('Remote stream removed. Event: ', event);
}

function doCall() {
    console.log('Sending offer to peer.');
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError)
}

function setLocalAndSendMessage(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMessage(sessionDescription);
}

function doAnswer() {
    console.log('Sending answer to peer');
    pc.createAnswer().then(
        setLocalAndSendMessage, onCreateSessionDescriptionError
    )
}

function handleCreateOfferError(error) {
    console.log('createoffer() error: ', error);
}

function onCreateSessionDescriptionError(error) {
    console.log('Failed to create session description: ' + error.toString());
}

function handleRemoteHangup() {
    console.log('Session terminated.');
    stop();
    isInitiator = false;
}

function stop() {
    isStarted = false;
    pc.close();
    pc = null;
}

function requestTurn(turnURL) {
    var turnExists = false;
    for(var i in pcConfig.iceServers){
        if(pcConfig.iceServers[i].url.substr(0,5) === 'turn:'){
            turnExists = true;
            turnReady = true;
            break;
        }
    }
    if(!turnExists){
        console.log("Getting turn server from ", turnURL);
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function (ev) {
            if(xhr.readyState === 4 && xhr.status === 200){
                var turnServer = JSON.parse(xhr.responseText);
                console.log('Got TURN server: ', turnServer);
                pcConfig.iceServers.push({
                    'url':'turn:'+turnServer.username+'@'+turnServer.turn,
                    'credential': turnServer.password
                });
                turnReady = true;
            }
        };
        xhr.open('GET', turnURL, true);
        xhr.send();
    }
}
