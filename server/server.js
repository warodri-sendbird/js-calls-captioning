var http = require('http');

var rooms = {};

const express = require('express');
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
        origin: "http://localhost:8080",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
      }
})

io.sockets.on('connection', function(socket) {

    var clientAddress = socket.handshake.address;
    console.log('>> SERVER:', new Date(), '- Client connected: {', socket.id, '} @', clientAddress);

    socket.on('request to join', function(username, room) {
        if (!username || !room) {
            console.log('>> SERVER:', new Date(), '- BAD PARAMS FROM SOCKET ID', socket.id);
            socket.disconnect();
        } else {
            console.log('>> SERVER:', new Date(), '- User', username, 'requests to join room', room);
            if (rooms[room] === undefined) {
                rooms[room] = {};
                socket.join(room);
                socket.socketID = username + '@' + room;
                socket.emit('room created', room);
                rooms[room][username] = socket;
                console.log('>> SERVER:', new Date(), '- Room', room, 'created by user', username);
                io.sockets.in(room).emit('new user joined', username, room);
                socket.join(room);
                socket.socketID = username + '@' + room;
                socket.emit('room joined', room, Object.keys(rooms[room]));
                rooms[room][username] = socket;
                console.log('>> SERVER:', new Date(), '- Username', username, 'joined room', room);
            } else if (Object.keys(rooms[room]).indexOf(username) !== -1) {
                console.log('>> SERVER:', new Date(), '- Username', username, 'already in use in room', room);
                log('Username', username, 'already in use in room', room);
                socket.emit('username in use', username, room);
                socket.disconnect();
                //Connect to the room
            } else {
                // Let the other users know that this user has joined
                io.sockets.in(room).emit('new user joined', username, room);
                socket.join(room);
                socket.socketID = username + '@' + room;
                // Previous userlist is attached for peer connection creation
                socket.emit('room joined', room, Object.keys(rooms[room]));
                rooms[room][username] = socket;
                console.log('>> SERVER:', new Date(), '- Username', username, 'joined room', room);
            }
        }
    });

    socket.on('disconnect', function() {
        var username;
        var room;
        if (socket && socket.socketID && socket.socketID.toString().indexOf('@') > -1) {
            username = socket.socketID.split('@')[0];
            room = socket.socketID.split('@')[1];
            delete rooms[room][username];
            if (Object.keys(rooms[room]).length === 0) {
                delete rooms[room];
            }
            socket.leave(room);
            console.log('>> SERVER:', new Date(), '- User', username, 'left room', room);
            socket.broadcast.to(room).emit('user disconnected', username);
        }
        var clientAddress = socket.handshake.address;
        console.log('>> SERVER:', new Date(), '- Client disconnected: {', socket.id, '} @', clientAddress);
    });

    socket.on('subtitles request', function(message, toUser, language) {
        console.log('>> SERVER:', new Date(), ' SUBTITLES REQUESTED');
        var fromUser = socket.socketID.split('@')[0];
        var room = socket.socketID.split('@')[1];
        if (typeof (rooms[room][toUser]) !== 'undefined') {
            rooms[room][toUser].emit('subtitles request', message, fromUser, language);
            console.log('SUBTITLE MESSAGE', message);
        } else {
            console.log('>> SERVER:', new Date(), '- BAD PARAMS FROM SOCKET ID', socket.id);
            socket.disconnect();
        }
    });

    socket.on('translation request', function(subtitleToTranslate, fromLanguage, toLanguage, toUser) {
        console.log('>> SERVER:', new Date(), ' TRANSLATION REQUESTED');
        if (!subtitleToTranslate.text) {
            console.log('>> SERVER:', new Date(), '- BAD PARAMS FROM SOCKET ID', socket.id);
            socket.disconnect();
        } else {
            var translationRequest = {
                text: subtitleToTranslate.text,
                from: fromLanguage,
                to: toLanguage
            };
            var fromUser = socket.socketID.split('@')[0];
            var room = socket.socketID.split('@')[1];
            charactersTranslated += subtitleToTranslate.text.length;
            console.log('>> SERVER:', new Date(), '-', charactersTranslated, 'characters translated since last server start');
            console.log('charactersTranslated', subtitleToTranslate.text);
            client.translate(translationRequest, function(err, data) {
                if (typeof (rooms[room][toUser]) !== 'undefined') {
                    rooms[room][toUser].emit('translation', data, fromUser, subtitleToTranslate.isFinal);
                } else {
                    console.log('>> SERVER:', new Date(), '- BAD PARAMS FROM SOCKET ID', socket.id);
                    socket.disconnect();
                }
            });
        }
    });

    socket.on('message to room', function(message) {
        var fromUser = socket.socketID.split('@')[0];
        var toRoom = socket.socketID.split('@')[1];
        socket.broadcast.to(toRoom).emit('message', message, fromUser);
    });

    socket.on('message to user', function(message, toUser) {
        var fromUser = socket.socketID.split('@')[0];
        var room = socket.socketID.split('@')[1];
        if (typeof (rooms[room][toUser]) !== 'undefined') {
            rooms[room][toUser].emit('message', message, fromUser);
        }
    });

    // Function for sending messages to the client's console
    function log() {
        var array = ['>> SERVER server message:'];
        for (var i = 0; i < arguments.length; i++) {
            array.push(arguments[i]);
        }
        socket.emit('log', array);
    }
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

/////////////////////////////////////////////
//TRANSLATION SERVICE:
/////////////////////////////////////////////
/**
 * Get your key from Microsoft
 * https://portal.azure.com/?quickstart=true#@4e9adcfa-89b0-4bf4-b003-aef3f716b297/resource/subscriptions/7a9aeda3-c9a9-48fa-a269-0dadafaf2b16/resourceGroups/mygroup/providers/Microsoft.CognitiveServices/accounts/waltertest/cskeys
 */
var MsTranslator = require('mstranslator');
var client = new MsTranslator({
    client_id: 'waltertest', 
    client_secret: 'faa399e303774df091c1efcf3b6a529b', 
    api_key: 'faa399e303774df091c1efcf3b6a529b'
});
var charactersTranslated = 0;
client.initialize_token();
console.log('>> SERVER:', new Date(), '- Translation service initialized');
