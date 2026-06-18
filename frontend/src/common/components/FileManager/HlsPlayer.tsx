"use client";
import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Spin } from 'antd';

interface HlsPlayerProps {
  url: string;
  type: 'audio' | 'video';
}

const HlsPlayer: React.FC<HlsPlayerProps> = ({ url, type }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = type === 'video' ? videoRef.current : audioRef.current;
    if (!el) return;

    // Reset state when URL changes
    setLoading(true);
    setError(null);

    let hls: Hls | null = null;

    const onCanPlay = () => setLoading(false);
    const onError = (e: any) => {
      const mediaError = e.target?.error;
      console.error("Native play error:", {
        code: mediaError?.code,
        message: mediaError?.message,
        url
      });
      setError(`Failed to load media (Error ${mediaError?.code || 'unknown'})`);
      setLoading(false);
    };

    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('error', onError);

    if (Hls.isSupported() && (url.includes('.m3u8') || url.includes('blob:') || url.includes('/hls/') || url.includes('hls'))) {
      hls = new Hls({
        enableWorker: true,
        xhrSetup: (xhr) => {
          xhr.withCredentials = true; // Support authenticated requests
        },
      });
      hls.loadSource(url);
      hls.attachMedia(el);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
      });

      hls.on(Hls.Events.ERROR, (event: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("Fatal network error encountered, trying to recover");
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("Fatal media error encountered, trying to recover");
              hls?.recoverMediaError();
              break;
            default:
              console.error("Fatal error, cannot recover", data);
              hls?.destroy();
              setError(`Streaming error: ${data.details}`);
              setLoading(false);
              break;
          }
        }
      });
    } else {
      el.src = url;
    }

    return () => {
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('error', onError);
      if (hls) {
        hls.destroy();
      }
    };
  }, [url, type]);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: type === 'video' ? 200 : 50 }}>
      {loading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, textAlign: 'center' }}>
          <Spin />
          <div style={{ marginTop: 8, color: '#1890ff' }}>Loading media...</div>
        </div>
      )}
      
      {error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#ff4d4f', background: '#fff2f0', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {type === 'video' ? (
        <video 
          ref={videoRef} 
          controls 
          crossOrigin="anonymous"
          style={{ width: '100%', maxHeight: '60vh', borderRadius: 8, backgroundColor: '#000', display: error ? 'none' : 'block' }} 
        />
      ) : (
        <audio 
          ref={audioRef} 
          controls 
          crossOrigin="anonymous"
          style={{ width: '100%', display: error ? 'none' : 'block' }} 
        />
      )}
    </div>
  );
};

export default HlsPlayer;
