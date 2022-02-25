
////////////////////////////////////////////////////////////////////////////////
// DATA CHANNEL:
// Also look pc[user].ondatachannel

// VARIABLES:
var dataChannels = {};

// EXECUTION:
// Creates a data channel for an specific user
function createDataChannel(user) {
    try {
        dataChannels[user] = pc[user].createDataChannel('dataChannelFor' + user, DATACHANNEL_CONFIG);
        setDataChannelEvents(user);
        dataChannels[user].isRemoteUserRequestingSubtitles = false;
        dataChannels[user].remoteLanguage = '';
        dataChannels[user].isLocalUserRequestingSubtitles = false;
        dataChannels[user].isLocalUserRequestingTranslatedSubtitles = false;
    } catch (e) {
        alert('Failed to create data channel');
        window.location = '/error.html';
    }
}

// Sets the data channel events
function setDataChannelEvents(user) {
    dataChannels[user].onopen = function () {
        console.log('>> BaBL: Data channel established with user', user);
    };
    dataChannels[user].onclose = function () {
        console.log('>> BaBL: Data channel with user', user, 'closed');
    };
    dataChannels[user].onerror = function (error) {
        console.error('>> BaBL:', user, 'data channel error:', error);
    };

    // Only subtitles are being sent through the data channel
    dataChannels[user].onmessage = function (event) {
        var subtitle = JSON.parse(event.data);
        var remoteUserSubtitles = document.getElementById('remoteUserSubtitlesFor' + user);
        remoteUserSubtitles.innerText = subtitle.text;
        // Save the transcription if needed
        if (subtitle.isFinal && isTranscriptionStorageEnabled) {
            saveTranscription(subtitle.text, user);
        }
    };
}