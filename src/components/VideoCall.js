import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Video, VideoOff, Mic, MicOff, PhoneOff, ShieldCheck } from 'lucide-react';

const VideoCall = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef();
  const peerRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const localStreamRef = useRef();

  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [status, setStatus] = useState('Initializing Device...');

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  const createPeer = useCallback(() => {
    const peer = new RTCPeerConnection(iceServers);

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          room: roomId
        });
      }
    };

    peer.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setStatus('Connection Established');
      }
    };

    localStreamRef.current.getTracks().forEach(track => {
      peer.addTrack(track, localStreamRef.current);
    });

    return peer;
  }, [roomId]);

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Get User Media
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Connect Signaling
        socketRef.current = io((process.env.REACT_APP_API_URL || 'http://localhost:5000'));
        socketRef.current.emit('join', { room: roomId });
        setStatus('Waiting for other participant...');

        // 3. Listen for Signaling
        socketRef.current.on('offer', async (data) => {
          setStatus('Connecting...');
          peerRef.current = createPeer();
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await peerRef.current.createAnswer();
          await peerRef.current.setLocalDescription(answer);
          socketRef.current.emit('answer', { answer, room: roomId });
        });

        socketRef.current.on('answer', async (data) => {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        });

        socketRef.current.on('ice-candidate', async (data) => {
          if (peerRef.current) {
            try {
              await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
              console.error('Error adding received ice candidate', e);
            }
          }
        });

        // 4. Initiate Call (if we're first)
        // Note: Simple logic - let's wait a bit or just send offer
        const startCall = async () => {
          peerRef.current = createPeer();
          const offer = await peerRef.current.createOffer();
          await peerRef.current.setLocalDescription(offer);
          socketRef.current.emit('offer', { offer, room: roomId });
        };
        
        // Timer to handle who starts
        const timer = setTimeout(startCall, 1000);
        return () => clearTimeout(timer);

      } catch (err) {
        console.error(err);
        setStatus('Media Error: ' + err.message);
      }
    };

    init();
    return cleanup;
  }, [roomId, createPeer, cleanup]);

  const toggleMic = () => {
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    setMicActive(audioTrack.enabled);
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    setVideoActive(videoTrack.enabled);
  };

  const leaveCall = () => {
    cleanup();
    navigate(-1);
  };

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      background: '#0a0a0a', 
      color: 'white',
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Remote Video (Main) */}
      <div style={{ 
        flex: 1, 
        position: 'relative', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#111'
      }}>
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover' 
          }} 
        />
        
        {status !== 'Connection Established' && (
          <div style={{ 
            position: 'absolute', 
            textAlign: 'center',
            padding: '20px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{status}</h3>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
              Room ID: {roomId}
            </p>
          </div>
        )}

        {/* Local Video (Overlay) */}
        <div style={{ 
          position: 'absolute', 
          bottom: '100px', 
          right: '30px', 
          width: '240px', 
          height: '160px', 
          borderRadius: '12px', 
          overflow: 'hidden', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          border: '2px solid rgba(255,255,255,0.1)',
          background: '#222'
        }}>
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
          {!videoActive && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
              <VideoOff size={40} color="rgba(255,255,255,0.2)" />
            </div>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div style={{ 
        height: '80px', 
        background: 'rgba(20,20,20,0.95)', 
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '24px',
        zIndex: 10
      }}>
        <button 
          onClick={toggleMic}
          style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '50%', 
            border: 'none', 
            background: micActive ? 'rgba(255,255,255,0.1)' : '#ef4444', 
            color: 'white', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          {micActive ? <Mic size={22} /> : <MicOff size={22} />}
        </button>

        <button 
          onClick={toggleVideo}
          style={{ 
            width: '50px', 
            height: '50px', 
            borderRadius: '50%', 
            border: 'none', 
            background: videoActive ? 'rgba(255,255,255,0.1)' : '#ef4444', 
            color: 'white', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          {videoActive ? <Video size={22} /> : <VideoOff size={22} />}
        </button>

        <button 
          onClick={leaveCall}
          style={{ 
            padding: '0 30px', 
            height: '50px', 
            borderRadius: '25px', 
            border: 'none', 
            background: '#ef4444', 
            color: 'white', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: '600',
            fontSize: '1rem',
            transition: 'all 0.2s ease'
          }}
        >
          <PhoneOff size={22} /> End Call
        </button>
      </div>

      {/* Security Tip */}
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        background: 'rgba(0,0,0,0.5)', 
        padding: '8px 16px', 
        borderRadius: '20px', 
        fontSize: '0.8rem',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        color: '#10b981'
      }}>
        <ShieldCheck size={16} />
        Encrypted P2P Session
      </div>
    </div>
  );
};

export default VideoCall;
