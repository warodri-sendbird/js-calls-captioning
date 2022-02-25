
////////////////////////////////////////////////////////////////////////////////
// SPEECH RECOGNITION:

// VARIABLES:
var isSpeechRecognitionEnabled = false;
var isSpeechRecognitionInitiated = false;
var isSpeechRecognitionCrashed = false;
var speechRecognitionIndicator = document.getElementById('speechRecognitionIndicator');
var languageSelector = document.getElementById('languageSelector');
var languagesIndex = {
    'de': 0, 'de-DE': 0,
    'en': 1, 'en-AU': 1, 'en-CA': 1, 'en-IN': 1, 'en-NZ': 1, 'en-ZA': 1, 'en-GB': 1, 'en-US': 1,
    'es': 2, 'es-AR': 2, 'es-BO': 2, 'es-CL': 2, 'es-CO': 2, 'es-CR': 2, 'es-EC': 2, 'es-SV': 2, 'es-ES': 2, 'es-US': 2,
    'es-GT': 2, 'es-HN': 2, 'es-MX': 2, 'es-NI': 2, 'es-PA': 2, 'es-PY': 2, 'es-PE': 2, 'es-PR': 2, 'es-DO': 2, 'es-UY': 2,
    'es-VE': 2,
    'fr': 3, 'fr-FR': 3,
    'it': 4, 'it-IT': 4, 'it-CH': 4,
    'hu': 5, 'hu-HU': 5,
    'no': 6, 'no-NO': 6,
    'nb': 6, 'nb-NO': 6,
    'pl': 7, 'pl-PL': 7,
    'pt': 8, 'pt-BR': 8, 'pt-PT': 8,
    'sv': 9, 'sv-SE': 9,
    'ar': 10,
    'cmn': 11,
    'cmn-Hans': 11, 'cmn-Hans-CN': 11, 'cmn-Hans-HK': 11,
    'cmn-Hant': 11, 'cmn-Hant-TW': 11,
    'yue': 11, 'yue-Hant': 11, 'yue-Hant-HK': 11,
    'he': 12, 'he-IL': 12,
    'iw': 12, 'iw-IL': 12,
    'ja': 13, 'ja-JP': 13,
    'ko': 14, 'ko-KR': 14,
    'ru': 15, 'ru-RU': 15
};

// EXECUTION

// Language initialization -  Tests if the user's browser language is supported
console.log('>> CLIENT: User\'s browser language is', navigator.language);
if (languagesIndex[navigator.language] === undefined) {
    languageSelector.options.selectedIndex = 0;
    console.log('>> CLIENT: User\'s browser language is not supported. Setting local language to English');
} else {
    languageSelector.options.selectedIndex = languagesIndex[navigator.language];
    console.log('>> CLIENT: Setting local language to', languageSelector.selectedOptions[0].text);
}

// Speech recognition initialization
if (('webkitSpeechRecognition' in window)) {
    var recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true; // Draft transcription enabled
    recognition.lang = languageSelector.selectedOptions[0].value;
    console.log('RECOGNITION INIT - webkitSpeechRecognition');
    recognition.onstart = function () {
        console.log('RECOGNITION STARTED');
        speechRecognitionIndicator.classList.remove('speechRecognitionIndicatorOff');
        speechRecognitionIndicator.classList.add('speechRecognitionIndicatorOn');
        isSpeechRecognitionEnabled = true;
        sendSubtitle({ text: ' ', isFinal: false }); // For clearing the previous subtitles
        // Speech recognition initiation so no later permissions are required
        if (isSpeechRecognitionInitiated === false) {
            recognition.stop();
            isSpeechRecognitionInitiated = true;
        }
    };
    recognition.onresult = function (event) {
        console.log('RECOGNITION RESULT');
        var transcription = '';
        for (var i = event.resultIndex; i < event.results.length; ++i) {
            transcription += event.results[i][0].transcript;
        }
        sendSubtitle({ text: transcription, isFinal: event.results[event.results.length - 1].isFinal });
        if (isTranscriptionStorageEnabled === true && event.results[event.results.length - 1].isFinal) {
            saveTranscription(transcription, username);
        }
    };
    recognition.onerror = function (error) {
        console.error('>> CLIENT: Speech recognition error:', error);
        if (error.error === 'aborted') {
            isSpeechRecognitionCrashed = true;
            alert('Speech recognition aborted. Only one instance per client is supported.');
            window.location = '/error.html';
        }
    };
    recognition.onend = function () {
        speechRecognitionIndicator.classList.add('speechRecognitionIndicatorOff');
        speechRecognitionIndicator.classList.remove('speechRecognitionIndicatorOn');
        isSpeechRecognitionEnabled = false;
        keepSpeechRecognitionAliveIfNeeded();
    };
}

/**
 * Keeps the speech recognition alive while the subtitles are required
 */
function keepSpeechRecognitionAliveIfNeeded() {
    if (!isSpeechRecognitionCrashed) {
        if (isSpeechRecognitionEnabled === false && isTranscriptionStorageEnabled === true) {
            recognition.start();
            console.log('>> CLIENT: Keeping speech recognition alive');
        } else if (isSpeechRecognitionEnabled === false) {
            for (var user in dataChannels) {
                if (dataChannels[user].isRemoteUserRequestingSubtitles) {
                    recognition.start();
                    console.log('>> CLIENT: Keeping speech recognition alive');
                }
            }
        }
    }
}
/**
 * Updates the local user's language
 */
function updateLanguage() {
    recognition.lang = languageSelector.selectedOptions[0].value;
    recognition.stop();
    console.log('>> CLIENT: Language changed to', languageSelector.selectedOptions[0].text);
    for (var user in dataChannels) {
        if (dataChannels[user].isLocalUserRequestingTranslatedSubtitles) {
            socket.emit('subtitles request', 'start', user, languageSelector.selectedOptions[0].value);
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// SPEECH SYNTHESIS:

var isSpeechSynthesisEnabled = false;
var speechSyntesisIndex = {
    'en': 0,
    'es': 3,
    'fr': 4,
    'it': 5,
    'de': 6,
    'ja': 7,
    'ko': 8,
    'cmn': 9
};

function speak(text) {
    if (speechSyntesisIndex[languageSelector.selectedOptions[0].value] !== undefined) {
        var msg = new SpeechSynthesisUtterance();
        var voices = window.speechSynthesis.getVoices();
        msg.voice = voices[speechSyntesisIndex[languageSelector.selectedOptions[0].value]];
        msg.text = text;

        speechSynthesis.speak(msg);
    }
}
