
import React, {FC, useEffect, useRef} from 'react';
import io from 'socket.io-client'

import './App.css';

const SOCKET_SERVER_URL = "http://192.168.1.242:8080"

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

const App: FC = () => {

const socketRef = useRef<SocketIOClient.Socket>();
const pcRef = useRef<RTCPeerConnection>();

let localVideoRef = useRef<HTMLVideoElement>(null);
let remoteVideoRef = useRef<HTMLVideoElement>(null);

const setVideoTracks = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    if(localVideoRef.current) localVideoRef.current.srcObject = stream;
    if(!(pcRef.current && socketRef.current)) return;

    stream.getTracks().forEach((track) => {
      console.log("Adding local video")
      if(!pcRef.current) return;
      pcRef.current.addTrack(track, stream);
    });

    pcRef.current.onicecandidate = (e) => {
      if(e.candidate) {
        if(!socketRef.current) return;
        console.log("onicecanditate");
        socketRef.current.emit("candidate", e.candidate);
      }
    };

    pcRef.current.ontrack = (ev) => {
      console.log("add remote track success");
      if(remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = ev.streams[0];
      }
    };
    const stats = await pcRef.current.getStats();
    console.dir(stats);
    socketRef.current.emit("join_room", {
      room: "VID_STREAM_1"
    });
  } catch(e) {
    console.error(e)
  }
};

const createOffer = async () => {
  console.log("create offer");
  if(!(pcRef.current && socketRef.current)) return;
  try {
    const sdp = await pcRef.current.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await pcRef.current.setLocalDescription(new RTCSessionDescription(sdp));
    socketRef.current.emit("offer", sdp)
  } catch(e) {
    console.error(e);
  }
};

const createAnswer = async (sdp: RTCSessionDescription) => {
  if(!(pcRef.current && socketRef.current)) return;
  try {
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    console.log("answer set remote description success");
    const mySdp = await pcRef.current.createAnswer({
      offerToReceiveVideo: true,
      offerToReceiveAudio: true,
    });
    console.log("create answer");
    await pcRef.current.setLocalDescription( new RTCSessionDescription(mySdp));
    socketRef.current.emit("answer", mySdp);
  } catch(e) {
    console.log(e);
  }
}

useEffect(() => {
  socketRef.current = io.connect(SOCKET_SERVER_URL);
  pcRef.current = new RTCPeerConnection(pc_config);
  console.log(`Client connected: ${socketRef.current.connected}`)

  socketRef.current.on("all_users", (allUsers: Array<{id:string}>) => {
    if(allUsers.length > 0) {
      createOffer();
    }
    console.log("all_users")
  })

  socketRef.current.on("getOffer", (sdp: RTCSessionDescription) => {
    console.log("get offer")
    createAnswer(sdp);
  });

  socketRef.current.on("getAnswer", (sdp: RTCSessionDescription) => {
    console.log("get answer");
    if(!pcRef.current) return;
    pcRef.current.setRemoteDescription(sdp);
  });

  socketRef.current.on("getCandidate", async (candidate: RTCIceCandidate) => {
    if(!pcRef.current) return;
    try {
    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    console.log("Candidate add success")
    } catch(error) {
      console.error(error);
    }
  })

  setVideoTracks();

  return() => {
    if(socketRef.current) {
      console.log(`Close socket ref: ${socketRef.current}`)
      socketRef.current.disconnect();
    }
    if(pcRef.current) {
      console.log(`Close pc ref: ${pcRef.current}`)
      pcRef.current.close();
    }
  };
}, []);

  return (
    <div>
      <video
     
      style={{
        width: 240,
          height: 240,
          margin: 5,
          backgroundColor: "black",
      }}
      muted
        ref={localVideoRef}
        autoPlay
      />
      <video
        id="remotevideo"
        style={{
          width: 240,
          height: 240,
          margin: 5,
          backgroundColor: "black",
        }}
        ref={remoteVideoRef}
        autoPlay
      />
    </div>
  );
}

export default App;
