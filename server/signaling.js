"use strict";
exports.__esModule = true;
var socketio = require("socket.io");
var http = require("http");
var express = require("express");
var cors = require("cors");
var querystring_1 = require("querystring");
var app = express();
var server = http.createServer(app);
app.use(cors());
var io = socketio.listen(server);
var users = {};
var socketToRoom = {};
var maximum = 2;
io.on('connection', function (socket) {
    console.log("Socket up");
    socket.on('join_room', function (data) {
        console.log("Join room");
        if (users[data.room]) {
            var length_1 = users[data.room].length;
            if (length_1 === maximum) {
                socket.to(socket.id).emit('room_full');
                return;
            }
            users[data.room].push({ id: socket.id, displayName: data.displayName });
        }
        else {
            users[data.room] = [{ id: socket.id, displayName: data.displayName }];
        }
        socketToRoom[socket.id] = data.room;
        socket.join(data.room);
        console.log(socketToRoom[socket.id] + ": " + socket.id + " enter");
        var userInThisRoom = users[data.room].filter(function (user) { return user.id !== socket.id; });
        console.log("User in room: " + userInThisRoom);
        io.sockets.to(socket.id).emit('all_users', userInThisRoom);
    });
    socket.on('offer', function (sdp) {
        console.log('offer' + socket.id);
        socket.broadcast.emit('getOffer', sdp);
    });
    socket.on('candidate', function (candidate) {
        console.log('candidate' + socket.id);
        socket.broadcast.emit('getCandidate', candidate);
    });
    socket.on('disconnect', function () {
        console.log(socketToRoom[socket.id] + ": " + socket.id + " exit");
        var roomID = socketToRoom[socket.id];
        var room = users[roomID];
        if (room) {
            room = room.filter(function (user) { return user.id !== socket.id; });
            users[roomID] = room;
            console.log("Room" + room);
        }
        socket.broadcast.to(room).emit('user_exit', { id: socket.id });
        console.dir("Users in room: " + querystring_1.stringify(users));
    });
});
server.listen(8080, function () {
    console.log("server is running on port 8080");
});
