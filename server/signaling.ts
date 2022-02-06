import * as socketio from 'socket.io';
import * as http from 'http'
import * as express from 'express'
import * as cors from 'cors'
import { stringify } from 'querystring';


const app = express();
const server = http.createServer(app);

app.use(cors());

const io = socketio.listen(server);

let users: any = {};
let socketToRoom: any = {};
const maximum = 2;

io.on('connection', socket => {
    console.log("Socket up")
    socket.on('join_room', (data: any) => {
        console.log("Join room");
        if(users[data.room]) {
            const length = users[data.room].length;
            if(length === maximum) {
                socket.to(socket.id).emit('room_full');
                return;
            }
            users[data.room].push({id: socket.id, displayName: data.displayName})
        } else {
            users[data.room] = [{id: socket.id, displayName: data.displayName}]
        }
        socketToRoom[socket.id] = data.room;

        socket.join(data.room);
        console.log(`${socketToRoom[socket.id]}: ${socket.id} enter`)

        const userInThisRoom = users[data.room].filter((user: { id: string; }) => user.id !== socket.id);
        console.log(`User in room: ${userInThisRoom}`);

        io.sockets.to(socket.id).emit('all_users', userInThisRoom);
    });

    socket.on('offer', sdp => {
        console.log(`offer: ${socket.id}`);
        socket.broadcast.emit('getOffer', sdp)
    });

    socket.on('candidate', candidate => {
        console.log('candidate ' + socket.id);
        socket.broadcast.emit('getCandidate', candidate);
    })

    socket.on('disconnect', () => {
        console.log(`${socketToRoom[socket.id]}: ${socket.id} exit`);
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if(room) {
            room = room.filter((user: { id: string; }) => user.id !== socket.id)
            users[roomID] = room;
            console.log("Room" + room);
        }
        socket.broadcast.to(room).emit('user_exit', {id: socket.id});
        console.dir(`Users in room: ${stringify(users)}`);
    })
});
server.listen(8080, () => {
    console.log("server is running on port 8080");
});

