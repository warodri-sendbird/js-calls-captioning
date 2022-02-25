
var sb;
var currentCall;
var callsInit = false;
const UNIQUE_HANDLER_ID = 'ANY-IDENTIFIER-HERE-123';

/**
* Connect to Sendbird SDK
*/
function connect() {
    connectCalls();
    updateUI('ShowMainPanel');
    toggleVisibility('btnConnect', false);
}

/**
 * Calls - Connects with Sendbird Calls
 */
function connectCalls() {
    SendBirdCall.init(getAppId());
    askBrowserPermission();
    authorizeSignedUser();
}

/**
 * When this is called, Browser will ask for Audio and Video permission
 */
function askBrowserPermission() {
    SendBirdCall.useMedia({ audio: true, video: true });
}

/**
 * Calls - Authorize signed user
 */
function authorizeSignedUser() {
    const authOption = {
        userId: getUserId()
    };
    SendBirdCall.authenticate(authOption, (res, error) => {
        if (error) {
            updateUI('LogError', "Calls Authentication failed: " + error);
        } else {
            updateUI('LogSuccess', 'Calls authorized');
            /**
             * Establishing websocket connection
             */
            SendBirdCall.connectWebSocket().then(() => {
                updateUI('LogSuccess', 'Connected to Socket server');
                toggleVisibility('makeCallPanel', true);
                toggleVisibility('connectCallPanel', false);
                connectToSocket();
            }).catch(() => {
                updateUI('LogError', 'Failed to connect to Socket server');
            });
        }
    });
}


var isTranscriptionStorageEnabled = false;
var AUDIO_CONSTRAINT = true; // true -> Activates audio
var ENABLE_DRAFT_TRANSLATION = true; // false -> Add delay but save characters
var PC_CONFIG_CHROME = {};
var PC_CONFIG_FIREFOX = {};
var PC_CONFIG_OTHER = {};
var DATACHANNEL_CONFIG = {
    ordered: true // Ordered and reliable by default in most browsers
};
var localStream;
var pc = {}; // Peer connections container
var socket;

/**
 * Socket to send voice
 */
function connectToSocket() {
    socket = io.connect('http://localhost:3000', {
        transports: ['websocket'],
        withCredentials: true,
        extraHeaders: {
            "my-custom-header": "abcd"
        }
    });
    socket.on('room created', function (room) {
        console.log('>> SOCKET: Room', room, 'created');
        recognition.start();
    });

    socket.on('room joined', function (room, userlist) {
        console.log('>> SERVER: This user has joined room', room);
        for (var i = 0; i < userlist.length; i++) {
            pc[userlist[i]] = 'no init';
        }
        if (!isSpeechRecognitionInitiated) {
            recognition.start();
        }
    });
}

/**
 * Get the stream from Sendbird Calls
 */
function startGetUserMedia() {
    var constraints = { video: true, audio: true };
    navigator.getUserMedia(constraints, (stream) => {
        localStream = stream;
        for (var user in pc) {
            if (pc[user] === 'no init') {
                createPeerConnection(user);
                createDataChannel(user);
            }
        }
    }, () => {
        console.log('ERROR INTERCEPTING SENDBIRD MEDIA')
    });
}

function createPeerConnection(user) {
    try {
        pc[user] = new RTCPeerConnection(pc_config, pc_constraints);
        console.log(
            '>> CLIENT: Created RTCPeerConnnection for user', user,
            'with:\n', '  config:', JSON.stringify(pc_config),
            '\n   constraints:', JSON.stringify(pc_constraints));
    } catch (e) {
        console.error(
            '>> CLIENT: Failed to create PeerConnection for user',
            user, ', exception:', e.message);
        window.location = '/error.html';
    }
    pc[user].onaddstream = handleRemoteStreamAdded;
    pc[user].onremovestream = handleRemoteStreamRemoved;
    pc[user].onicecandidate = handleICECandidate;
    pc[user].ondatachannel = handleDataChannel;
    pc[user].addStream(localStream);

    /**
     * Don't need these handlers since Sendbird 
     * calls is managing WebRTC
     */
    function handleRemoteStreamAdded(event) {}
    function handleRemoteStreamRemoved(event) {}
    function handleICECandidate(event) {}

    function handleDataChannel(event) {
        dataChannels[user] = event.channel;
        setDataChannelEvents(user);
        dataChannels[user].isRemoteUserRequestingSubtitles = false;
        dataChannels[user].remoteLanguage = '';
        dataChannels[user].isLocalUserRequestingSubtitles = false;
        dataChannels[user].isLocalUserRequestingTranslatedSubtitles = false;
    }
}


function makeCall() {
    var toUserId = prompt('Sendbird User ID to call?');
    if (!toUserId) {
        return;
    }
    const dialParams = {
        userId: toUserId,
        isVideoCall: true,
        callOption: {
            localMediaView: getVideoObjectCaller(),
            remoteMediaView: getVideoObjectCallee(),
            videoEnabled: true,
            audioEnabled: true
        },
        sendBirdChatOptions: {
            channelUrl: 'historytest'
        }
    };
    /**
     * If you want to set local and remote video in a lazy way:
     * ==========================================================
     * call.setLocalMediaView(document.getElementById('local_video_element_id'));
     * call.setRemoteMediaView(document.getElementById('remote_video_element_id'));
     */
    const call = SendBirdCall.dial(dialParams, (call, error) => {
        if (error) {
            updateUI('LogError', 'Dial Failed!');
        } else {
            updateUI('LogSuccess', 'Dial Success');
        }
    });
    call.onEstablished = (call) => {
        currentCall = call;
        updateUIMakeCallEstablished();
    };
    call.onConnected = (call) => {
        startGetUserMedia();
        socket.emit('request to join', getUserId(), '1')
        updateUIMakeCallCallConnected();
    };
    call.onEnded = (call) => {
        currentCall = null;
        updateUIMakeCallEnded();
    };
    call.onRemoteAudioSettingsChanged = (call) => {
        console.log('Remote user changed audio settings');
    };
    call.onRemoteVideoSettingsChanged = (call) => {
        console.log('Remote user changed video settings');
    };
}

/**
 * End your call
 */
function endCall() {
    if (currentCall) {
        currentCall.end();
    }
}

/**
 * UI Helper functions
 */
function getElement(id) {
    return $('#' + id);
}
function getElementValue(id) {
    return document.getElementById(id).value;
}
function getAppId() {
    return getElementValue('app_id');
}
function setAppId(appId) {
    document.getElementById('app_id').value = appId;
}
function getUserId() {
    return getElementValue('user_id');
}
function setUserId(userId) {
    document.getElementById('user_id').value = userId;
}
function setUserNickname(nickname) {
    document.getElementById('nickname').value = nickname;
}
function getMainMenuPanel() {
    return getElement('mainMenu');
}
function getVideoObjectCaller() {
    return document.getElementById('local_video_element_id');
}
function getVideoObjectCallee() {
    return document.getElementById('remote_video_element_id');
}
function updateUI(action, text = '') {
    console.log(action + '=>' + text);
    if (action === 'ShowMainPanel') {
        toggleVisibility('mainMenu', true);
    } else if (action === 'LogError') {
        getElement('logError').html(text);
    } else if (action === 'LogSuccess') {
        getElement('logSuccess').html(text);
    }
}
function updateUIWhenAcceptingCall() {
    updateUI('LogSuccess', 'Ringing. Press the ACCEPT CALL button');
    toggleVisibility('butMakeCall', false);
}
function updateUIWhenendingCall() {
    updateUI('LogSuccess', 'Call ended');
    toggleVisibility('makeCallPanel', true);
    toggleVisibility('butMakeCall', true);
    toggleVisibility('butEndCall', false);
}
function updateUIWhenCallEstablished() {
    updateUI('LogSuccess', 'Wait for call - Call established');
    toggleVisibility('makeCallPanel', false);
}
function updateUIMakeCallEstablished() {
    updateUI('LogSuccess', 'Make Call - Call established');
    toggleVisibility('butMakeCall', false);
    toggleVisibility('butEndCall', true);
}
function updateUIMakeCallEnded() {
    updateUI('LogSuccess', 'Call ended');
    toggleVisibility('butMakeCall', true);
    toggleVisibility('butEndCall', false);
}
function updateUIMakeCallCallEnded() {
    console('LogSuccess', 'Call ended');
}
function updateUIMakeCallCallConnected() {
    updateUI('LogSuccess', 'Call connected');
}
function toggleVisibility(id, show) {
    show ? getElement(id).show() : getElement(id).hide();
}

