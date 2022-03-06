import io from 'socket.io-client';

const SOCKET_SERVER_URL = "hhtp//192.168.1.242:8080"

const pc_config: RTCConfiguration = {
    iceServers: [
        // {
        //   urls: 'stun:[STUN_IP]:[PORT]',
        //   'credentials': '[YOR CREDENTIALS]',
        //   'username': '[USERNAME]'
        // },
        {
          urls: "stun:stun.l.google.com:19302",
        },
    ],
};

const pc: RTCPeerConnection = new RTCPeerConnection(pc_config);
const socket: SocketIOClient.Socket = io.connect(SOCKET_SERVER_URL);

let localVideo: HTMLVideoElement;

const setVideoTracks = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        if(localVideo) localVideo.srcObject = stream;
        if(!(pc && socket)) return;

        stream.getTracks().forEach((track) => {
            console.log("Adding local media track");
            if(!pc) return;
            pc.addTrack(track, stream)
        });

        pc.onicecandidate = (e) => {
            if(e.candidate) {
                if(!socket) return;
                console.log("onicecandidate");
                socket.emit("candidate", e.candidate);
            }
        };
        const stats = await pc.getStats();
        console.dir(stats);
        socket.emit("join_room", {
            room: "VID_STREAM_1"
        });
    } catch(e) {
        console.log(e);
    }
};

    const createOffer = async () => {
        console.log("create offer");
        if(!(pc && socket)) return;
        try {
          const sdp = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await pc.setLocalDescription(new RTCSessionDescription(sdp));
          socket.emit("offer", sdp)
        } catch(e) {
          console.error(e);
        }
      };

      const createAnswer = async (sdp: RTCSessionDescription) => {
        if(!(pc && socket)) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log("answer set remote description success");
          const mySdp = await pc.createAnswer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true,
          });
          console.log("create answer");
          await pc.setLocalDescription( new RTCSessionDescription(mySdp));
          socket.emit("answer", mySdp);
        } catch(e) {
          console.log(e);
        }
      };

      socket.on("all_users", (allUsers: Array<{id:string}>) => {
        if(allUsers.length > 0) {
          createOffer();
        } else {
            pc.close();
            socket.close();
        }
        console.log("all_users")
      });

      socket.on("getOffer", (sdp: RTCSessionDescription) => {
        console.log("get offer")
        createAnswer(sdp);
      });

      socket.on("getAnswer", (sdp: RTCSessionDescription) => {
        console.log("get answer");
        if(!pc) return;
        pc.setRemoteDescription(sdp);
      });

      socket.on("getCandidate", async (candidate: RTCIceCandidate) => {
        if(!pc) return;
        try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("Candidate add success")
        } catch(error) {
          console.error(error);
        }
      });    

      setVideoTracks();