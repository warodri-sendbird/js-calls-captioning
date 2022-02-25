
////////////////////////////////////////////////////////////////////////////////
// PEER CONNECTION:

// VARIABLES:
var remoteStream; // Can be used for managing the stream
var pc_config;
var pc_constraints = {
    'optional': [
        { 'DtlsSrtpKeyAgreement': true }
    ]
};

// EXECUTION:
// Ice servers selection dpending on the browser used
if (webrtcDetectedBrowser === 'chrome') {
    pc_config = PC_CONFIG_CHROME;
} else if (webrtcDetectedBrowser === 'firefox') {
    pc_config = PC_CONFIG_FIREFOX;
} else {
    pc_config = PC_CONFIG_OTHER;
}

// Create peer connections inside the pc element
function createPeerConnection(user) {
    try {
        pc[user] = new RTCPeerConnection(pc_config, pc_constraints);
        console.log('>> BaBL: Created RTCPeerConnnection for user', user,
            'with:\n', '  config:', JSON.stringify(pc_config),
            '\n   constraints:', JSON.stringify(pc_constraints));
    } catch (e) {
        console.error('>> BaBL: Failed to create PeerConnection for user',
            user, ', exception:', e.message);
        alert('Cannot create RTCPeerConnection object');
        window.location = '/error.html';
    }

    // Events definition
    pc[user].onaddstream = handleRemoteStreamAdded;
    pc[user].onremovestream = handleRemoteStreamRemoved;
    pc[user].onicecandidate = handleICECandidate;
    pc[user].ondatachannel = handleDataChannel;

    pc[user].addStream(localStream);

    // HANDLERS:
    // Handles added remote streams
    function handleRemoteStreamAdded(event) {

        // Creates the DOM elements needed for a remote user and attaches the media
        var remoteArea = document.getElementById('remoteArea');

        var remoteUserArea = document.createElement('div');
        remoteUserArea.className = 'remoteUserArea uk-panel uk-panel-box uk-panel-box-primary';
        remoteUserArea.id = 'remoteUserAreaFor' + user;
        remoteArea.appendChild(remoteUserArea);

        var remoteUserTitle = document.createElement('div');
        remoteUserTitle.className = 'remoteUserTitle';
        remoteUserTitle.innerHTML = user;
        remoteUserArea.appendChild(remoteUserTitle);

        var remoteUserOverlay = document.createElement('div');
        remoteUserOverlay.className = 'uk-overlay';
        remoteUserArea.appendChild(remoteUserOverlay);

        var remoteUserVideo = document.createElement('video');
        remoteUserVideo.className = 'remoteUserVideo';
        remoteUserVideo.id = 'remoteUserVideoFor' + user;
        remoteUserVideo.autoplay = 'autoplay';
        remoteUserOverlay.appendChild(remoteUserVideo);
        attachMediaStream(remoteUserVideo, event.stream);
        console.log('>> BaBL: Remote stream added');
        remoteStream = event.stream;

        var remoteUserOverlayArea = document.createElement('div');
        remoteUserOverlayArea.className = 'uk-overlay-area';
        remoteUserOverlay.appendChild(remoteUserOverlayArea);

        var remoteUserOverlayAreaContent = document.createElement('div');
        remoteUserOverlayAreaContent.className = 'uk-overlay-area-content';
        remoteUserOverlayAreaContent.innerHTML = '<p>Subtitles settings:</p>';
        remoteUserOverlayArea.appendChild(remoteUserOverlayAreaContent);

        var subtitlesButtons = document.createElement('div');
        subtitlesButtons.className = 'uk-button-group';
        subtitlesButtons.setAttribute('data-uk-button-radio', '');
        remoteUserOverlayAreaContent.appendChild(subtitlesButtons);

        var subtitlesButtonNone = document.createElement('button');
        subtitlesButtonNone.innerHTML = 'Off';
        subtitlesButtonNone.className = 'uk-button uk-button-primary uk-active';
        subtitlesButtonNone.id = 'subtitlesButtonNoneFor' + user;
        subtitlesButtonNone.setAttribute('data-uk-tooltip', "{pos:'bottom'}");
        subtitlesButtonNone.title = 'No subtitles displayed';
        subtitlesButtons.appendChild(subtitlesButtonNone);

        var subtitlesButtonOriginal = document.createElement('button');
        subtitlesButtonOriginal.innerHTML = 'Original';
        subtitlesButtonOriginal.className = 'uk-button uk-button-primary';
        subtitlesButtonOriginal.id = 'subtitlesButtonOriginalFor' + user;
        subtitlesButtonOriginal.setAttribute('data-uk-tooltip', "{pos:'bottom'}");
        subtitlesButtonOriginal.title = "Subtitles are displayed in " + user + "'s language";
        subtitlesButtons.appendChild(subtitlesButtonOriginal);

        var subtitlesButtonTranslated = document.createElement('button');
        subtitlesButtonTranslated.innerHTML = 'Translated';
        subtitlesButtonTranslated.className = 'uk-button uk-button-primary';
        subtitlesButtonTranslated.id = 'subtitlesButtonTranslatedFor' + user;
        subtitlesButtonTranslated.setAttribute('data-uk-tooltip', "{pos:'bottom'}");
        subtitlesButtonTranslated.title = 'Subtitles are translated to your language';
        subtitlesButtons.appendChild(subtitlesButtonTranslated);

        var subtitlesButtonSpoken = document.createElement('button');
        subtitlesButtonSpoken.innerHTML = 'Spoken';
        subtitlesButtonSpoken.className = 'uk-button uk-button-primary';
        subtitlesButtonSpoken.id = 'subtitlesButtonSpokenFor' + user;
        subtitlesButtonSpoken.setAttribute('data-uk-tooltip', "{pos:'bottom'}");
        subtitlesButtonSpoken.title = 'You can hear ' + user + ' in your own language';
        subtitlesButtons.appendChild(subtitlesButtonSpoken);

        var remoteUserSubtitles = document.createElement('div');
        remoteUserSubtitles.className = 'remoteUserSubtitles uk-overlay-caption';
        remoteUserSubtitles.id = 'remoteUserSubtitlesFor' + user;
        remoteUserSubtitles.style.visibility = 'hidden';
        remoteUserOverlay.appendChild(remoteUserSubtitles);

        // Click handlers for the subtitles settings
        subtitlesButtonNone.onclick = function () {
            if (subtitlesButtonNone.classList.item(2) !== 'uk-active') {
                requestSubtitlesToStop(user);
                isSpeechSynthesisEnabled = false;
            }
        };
        subtitlesButtonOriginal.onclick = function () {
            if (subtitlesButtonOriginal.classList.item(2) !== 'uk-active') {
                requestSubtitlesToStart(user, '', 'visible');
                isSpeechSynthesisEnabled = false;
            }
        };
        subtitlesButtonTranslated.onclick = function () {
            if (subtitlesButtonTranslated.classList.item(2) !== 'uk-active') {
                requestSubtitlesToStart(user, recognition.lang, 'visible');
                isSpeechSynthesisEnabled = false;
            }
        };
        subtitlesButtonSpoken.onclick = function () {
            if (subtitlesButtonSpoken.classList.item(2) !== 'uk-active') {
                requestSubtitlesToStart(user, recognition.lang, 'visible');
                isSpeechSynthesisEnabled = true;
            }
        };

        // Manages the classnames that will adapt the size of the remote user area
        manageRemoteAreasClassNames();
    }

    // Handles removed remote streams removing the associated DOM elements
    function handleRemoteStreamRemoved(event) {
        var remoteArea = document.getElementById('remoteArea');
        var remoteUserArea = document.getElementById('remoteUserAreaFor' + user);
        remoteArea.removeChild(remoteUserArea);
        console.log('>> BaBL: Remote stream removed. Event:', event);
    }

    // Sends ICE candidates
    function handleICECandidate(event) {
        if (event.candidate) {
            sendMessageToUser({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            },
                user);
        } else {
            console.log('>> BaBL: All candidates sent to user', user);
        }
    }

    // Handles data channel
    function handleDataChannel(event) {
        dataChannels[user] = event.channel;
        setDataChannelEvents(user);
        dataChannels[user].isRemoteUserRequestingSubtitles = false;
        dataChannels[user].remoteLanguage = '';
        dataChannels[user].isLocalUserRequestingSubtitles = false;
        dataChannels[user].isLocalUserRequestingTranslatedSubtitles = false;
    }
}

// FUNCTIONS:
// Adapts the width of the remotes areas to the number of users
function manageRemoteAreasClassNames() {
    var remoteUserAreas = document.getElementsByClassName('remoteUserArea');
    if (Object.keys(pc).length === 1) {
        for (var i = 0; i < remoteUserAreas.length; i++) {
            remoteUserAreas[i].classList.add('remoteUserArea1');
            remoteUserAreas[i].classList.remove('remoteUserArea2');
            remoteUserAreas[i].classList.remove('remoteUserArea3');
        }
    } else if (Object.keys(pc).length === 2) {
        for (var i = 0; i < remoteUserAreas.length; i++) {
            remoteUserAreas[i].classList.add('remoteUserArea2');
            remoteUserAreas[i].classList.remove('remoteUserArea1');
            remoteUserAreas[i].classList.remove('remoteUserArea3');
        }
    } else {
        for (var i = 0; i < remoteUserAreas.length; i++) {
            remoteUserAreas[i].classList.add('remoteUserArea3');
            remoteUserAreas[i].classList.remove('remoteUserArea1');
            remoteUserAreas[i].classList.remove('remoteUserArea2');
        }
        var roomBody = document.getElementById('roomBody');
        var roomFooter = document.getElementById('roomFooter');
        if (Object.keys(pc).length > 4) {
            roomBody.classList.add('roomBodyLong');
            roomFooter.classList.add('roomFooterLong');
        } else {
            roomBody.classList.remove('roomBodyLong');
            roomFooter.classList.remove('roomFooterLong');
        }
    }
}
