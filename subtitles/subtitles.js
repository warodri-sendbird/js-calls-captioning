
////////////////////////////////////////////////////////////////////////////////
// SUBTITLES:
// Received subtitles are handled in the dataChannels[user].onmessage event
////////////////////////////////////////////////////////////////////////////////

/**
 * Function for sending subtitles to the users that are requesting them
 */
function sendSubtitle(subtitle) {
    console.log('SEND SUBTITLE', dataChannels);
    for (var user in dataChannels) {
        // If no translation is needed the interim subtitles go through the data channel
        if (dataChannels[user].remoteUserLanguage === '' || dataChannels[user].remoteUserLanguage === recognition.lang) {
            // Sends the subtitle along with its isFinal property
            dataChannels[user].send(JSON.stringify(subtitle));
            // If translation is needed the final subtitles go through the server
        } else if (subtitle.isFinal || ENABLE_DRAFT_TRANSLATION) {
            if (subtitle.text !== ' ') {
                var fromLanguage = 'en'; //recognition.lang;
                var toLanguage = 'es'; //dataChannels[user].remoteUserLanguage;
                // Microsoft and Google have different language code for Chinese
                if (fromLanguage === 'cmn') {
                    fromLanguage = 'zh-CHS';
                }
                if (toLanguage === 'cmn') {
                    toLanguage = 'zh-CHS';
                }
                socket.emit('translation request', subtitle, fromLanguage, toLanguage, user);
            }
        }
    }
}

/**
 * Request another user to start broadcasting subtitles. 
 * The signaling goes through the server
 */
function requestSubtitlesToStart(user, language, visibility) {
    if (visibility === 'visible') {
        var remoteUserSubtitles = document.getElementById('remoteUserSubtitlesFor' + user);
        if (remoteUserSubtitles) {
            remoteUserSubtitles.style.visibility = visibility;
        }
        dataChannels[user].isLocalUserRequestingSubtitles = true;
    }
    socket.emit('subtitles request', 'start', user, language);
    if (language === '') {
        console.log('>> CLIENT: Requesting subtitles from user', user);
    } else {
        console.log('>> CLIENT: Requesting translated subtitles from user', user);
        dataChannels[user].isLocalUserRequestingTranslatedSubtitles = true;
    }
}

/**
 * Request another user to stop broadcasting subtitles. The signaling goes through the server
 */
function requestSubtitlesToStop(user) {
    var remoteUserSubtitles = document.getElementById('remoteUserSubtitlesFor' + user);
    if (remoteUserSubtitles) {
        remoteUserSubtitles.style.visibility = 'visible';
    }
    dataChannels[user].isLocalUserRequestingSubtitles = false;
    dataChannels[user].isLocalUserRequestingTranslatedSubtitles = false;
    if (!isTranscriptionStorageEnabled) {
        socket.emit('subtitles request', 'stop', user);
        console.log('>> CLIENT: Stopping subtitles from user', user);
    }
}