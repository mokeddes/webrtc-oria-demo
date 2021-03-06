const HOST = location.origin.replace(/^http/, "ws");

const ws = new WebSocket(HOST);

ws.onopen = () => {
  console.log("Connected to the signaling server");
};

ws.onerror = err => {
  console.error(err);
};

ws.onmessage = msg => {
  console.log("Got message", msg.data);

  const data = JSON.parse(msg.data);

  switch (data.type) {
    case "login":
      handleLogin(data.success);
      break;
    case "offer":
      handleOffer(data.offer, data.username);
      break;
    case "answer":
      handleAnswer(data.answer);
      break;
    case "candidate":
      handleCandidate(data.candidate);
      break;
    case "close":
      handleClose();
      break;
    default:
      break;
  }
};

let connection = null;
let name = null;
let otherUsername = null;

const sendMessage = message => {
  if (otherUsername) {
    message.otherUsername = otherUsername;
  }

  ws.send(JSON.stringify(message));
};

document.querySelector("div#call").style.display = "none";

document.querySelector("button#login").addEventListener("click", event => {
  username = document.querySelector("input#username").value;

  if (username.length < 0) {
    alert("Please enter a username 🙂");
    return;
  }

  sendMessage({
    type: "login",
    username: username
  });
});

const handleLogin = async success => {
  if (success === false) {
    alert("😞 Username already taken");
  } else {
    document.querySelector("div#login").style.display = "none";
    document.querySelector("div#call").style.display = "block";

    let localStream;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
          googAutoGainControl: true,
          googEchoCancellation: true,
          googNoiseSuppression: true
        }
      });
    } catch (error) {
      alert(`${error.name}`);
      console.error(error);
    }
    document.querySelector("video#local").srcObject = localStream;

    document.querySelector("video#local").muted = true;
    document.querySelector("video#local").volume = 0;

    const configuration = {
      iceServers: [
        { url: "stun:stun2.1.google.com:19302" },
        { url: "stun:stun.stunprotocol.org" },
        { url: "stun:stun01.sipphone.com" },
        { url: "stun:stun.ekiga.net" },
        { url: "stun:stun.fwdnet.net" },
        { url: "stun:stun.ideasip.com" },
        { url: "stun:stun.iptel.org" },
        { url: "stun:stun.rixtelecom.se" },
        { url: "stun:stun.schlund.de" },
        { url: "stun:stun.l.google.com:19302" },
        { url: "stun:stun1.l.google.com:19302" },
        { url: "stun:stun2.l.google.com:19302" },
        { url: "stun:stun3.l.google.com:19302" },
        { url: "stun:stun4.l.google.com:19302" },
        { url: "stun:stunserver.org" },
        { url: "stun:stun.softjoys.com" },
        { url: "stun:stun.voiparound.com" },
        { url: "stun:stun.voipbuster.com" },
        { url: "stun:stun.voipstunt.com" },
        { url: "stun:stun.voxgratia.org" },
        { url: "stun:stun.xten.com" },
        {
          url: "turn:numb.viagenie.ca",
          username: "dojame2690@mailrunner.net",
          credential: "password"
        }
      ]
    };

    connection = new RTCPeerConnection(configuration);

    connection.addStream(localStream);

    connection.onaddstream = event => {
      document.querySelector("video#remote").srcObject = event.stream;
    };

    connection.onicecandidate = event => {
      if (event.candidate) {
        sendMessage({
          type: "candidate",
          candidate: event.candidate
        });
      }
    };
  }
};

document.querySelector("button#call").addEventListener("click", () => {
  const callToUsername = document.querySelector("input#username-to-call").value;

  if (callToUsername.length === 0) {
    alert("Enter a username 😉");
    return;
  }

  otherUsername = callToUsername;

  connection.createOffer(
    offer => {
      sendMessage({
        type: "offer",
        offer: offer
      });

      connection.setLocalDescription(offer);
    },
    error => {
      alert("Error when creating an offer");
      console.error(error);
    }
  );
});

const handleOffer = (offer, username) => {
  otherUsername = username;
  connection.setRemoteDescription(new RTCSessionDescription(offer));
  connection.createAnswer(
    answer => {
      connection.setLocalDescription(answer);
      sendMessage({
        type: "answer",
        answer: answer
      });
    },
    error => {
      alert("Error when creating an answer");
      console.error(error);
    }
  );
};

const handleAnswer = answer => {
  connection.setRemoteDescription(new RTCSessionDescription(answer));
};

const handleCandidate = candidate => {
  connection.addIceCandidate(new RTCIceCandidate(candidate));
};

document.querySelector("button#close-call").addEventListener("click", () => {
  sendMessage({
    type: "close"
  });
  handleClose();
});

const handleClose = () => {
  otherUsername = null;
  document.querySelector("video#remote").src = null;
  connection.close();
  connection.onicecandidate = null;
  connection.onaddstream = null;
};
