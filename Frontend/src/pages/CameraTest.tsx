import './CameraTest.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronLeft,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
} from 'lucide-react';

type CameraStatus = 'idle' | 'starting' | 'live' | 'error';

const getCameraErrorMessage = (error: unknown) => {
  if (!(error instanceof DOMException)) {
    return 'Hindi mabuksan ang camera. Pakitingnan ang browser at camera connection.';
  }

  switch (error.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Naka-block ang camera permission. I-allow ang Camera sa browser settings at subukan ulit.';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Walang camera na nakita. Ikabit muna ang USB/CSI camera at i-refresh ang page.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Ginagamit ng ibang app ang camera o hindi ito mabasa ng system.';
    case 'OverconstrainedError':
      return 'Hindi suportado ng napiling camera ang requested video settings.';
    default:
      return `Camera error: ${error.message || error.name}`;
  }
};

export const CameraTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [message, setMessage] = useState('Pindutin ang Start Camera para magsimula.');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [resolution, setResolution] = useState('—');
  const [snapshot, setSnapshot] = useState<string | null>(null);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const cameras = allDevices.filter((device) => device.kind === 'videoinput');
    setDevices(cameras);
    setSelectedDeviceId((current) => (
      current && cameras.some((camera) => camera.deviceId === current)
        ? current
        : cameras[0]?.deviceId || ''
    ));
  }, []);

  const stopStream = useCallback((updateStatus = true) => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setResolution('—');
    if (updateStatus) {
      setStatus('idle');
      setMessage('Naka-stop ang camera.');
    }
  }, []);

  const startCamera = useCallback(async (deviceId = selectedDeviceId) => {
    if (!window.isSecureContext) {
      setStatus('error');
      setMessage('Kailangan ng HTTPS o localhost para payagan ng browser ang camera.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setMessage('Hindi supported ng browser na ito ang camera access. Gumamit ng updated Chrome o Chromium.');
      return;
    }

    setStatus('starting');
    setMessage('Hinihintay ang camera permission…');
    stopStream(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      setResolution(settings.width && settings.height ? `${settings.width} × ${settings.height}` : 'Live');
      setStatus('live');
      setMessage('Camera is working. Gumalaw sa harap nito para tingnan kung tuloy-tuloy ang video.');
      await refreshDevices();
    } catch (error) {
      stopStream(false);
      setStatus('error');
      setMessage(getCameraErrorMessage(error));
    }
  }, [refreshDevices, selectedDeviceId, stopStream]);

  const captureSnapshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL('image/jpeg', 0.9));
  };

  const leaveCameraTest = () => {
    stopStream(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('camera-test');
    window.location.assign(`${url.pathname}${url.search}${url.hash}`);
  };

  useEffect(() => {
    void refreshDevices();
    const onDeviceChange = () => void refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [refreshDevices]);

  const statusIcon = status === 'live'
    ? <CheckCircle2 />
    : status === 'error'
      ? <AlertTriangle />
      : <Camera />;

  return (
    <main className="camera-test">
      <header className="camera-test__header">
        <button type="button" className="camera-test__back" onClick={leaveCameraTest}>
          <ChevronLeft />
          <span>Back to iCart</span>
        </button>
        <div className="camera-test__brand"><Camera /><strong>Camera Diagnostic</strong></div>
        <span className="camera-test__local-note">Local preview only</span>
      </header>

      <section className="camera-test__content">
        <div className="camera-test__intro">
          <div>
            <span className="camera-test__eyebrow">HARDWARE TEST</span>
            <h1>Subukan ang cart camera</h1>
            <p>Live preview muna ito. Wala pang product o non-product detection at walang video na ina-upload.</p>
          </div>
          <div className={`camera-test__status camera-test__status--${status}`} role="status">
            {statusIcon}
            <div><strong>{status === 'live' ? 'Camera ready' : status === 'error' ? 'May problema' : status === 'starting' ? 'Starting…' : 'Camera off'}</strong><span>{message}</span></div>
          </div>
        </div>

        <div className="camera-test__workspace">
          <section className="camera-test__preview-card" aria-label="Camera preview">
            <div className="camera-test__preview">
              <video ref={videoRef} autoPlay playsInline muted />
              {status !== 'live' && (
                <div className="camera-test__placeholder">
                  <CameraOff />
                  <strong>Walang live video</strong>
                  <span>I-start ang camera para makita ang basket area.</span>
                </div>
              )}
              {status === 'live' && <span className="camera-test__live-badge"><i /> LIVE</span>}
              <div className="camera-test__guide" aria-hidden="true"><span>Basket detection area</span></div>
            </div>

            <div className="camera-test__controls">
              {status === 'live' ? (
                <button type="button" className="camera-test__button camera-test__button--danger" onClick={() => stopStream()}><CameraOff /> Stop Camera</button>
              ) : (
                <button type="button" className="camera-test__button camera-test__button--primary" onClick={() => void startCamera()} disabled={status === 'starting'}><Camera /> {status === 'starting' ? 'Starting…' : 'Start Camera'}</button>
              )}
              <button type="button" className="camera-test__button camera-test__button--secondary" onClick={captureSnapshot} disabled={status !== 'live'}><ImageIcon /> Test Snapshot</button>
              <button type="button" className="camera-test__icon-button" onClick={() => void refreshDevices()} title="Refresh camera list" aria-label="Refresh camera list"><RefreshCw /></button>
            </div>
          </section>

          <aside className="camera-test__panel">
            <label htmlFor="camera-device">Camera device</label>
            <select
              id="camera-device"
              value={selectedDeviceId}
              onChange={(event) => {
                const nextDeviceId = event.target.value;
                setSelectedDeviceId(nextDeviceId);
                if (status === 'live') void startCamera(nextDeviceId);
              }}
              disabled={devices.length === 0}
            >
              {devices.length === 0 && <option value="">No camera detected</option>}
              {devices.map((device, index) => <option key={device.deviceId || index} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
            </select>

            <dl className="camera-test__details">
              <div><dt>Detected cameras</dt><dd>{devices.length}</dd></div>
              <div><dt>Video resolution</dt><dd>{resolution}</dd></div>
              <div><dt>Connection</dt><dd>{status === 'live' ? 'Active' : 'Inactive'}</dd></div>
            </dl>

            <div className="camera-test__checklist">
              <h2>Quick check</h2>
              <ol>
                <li>Payagan ang camera permission.</li>
                <li>Itutok sa buong basket, hindi lang sa barcode.</li>
                <li>Maglagay at mag-alis ng item para tingnan ang angle at linaw.</li>
                <li>Kumuha ng test snapshot para makita ang actual frame.</li>
              </ol>
            </div>
          </aside>
        </div>

        {snapshot && (
          <section className="camera-test__snapshot" aria-label="Captured test snapshot">
            <div><span>TEST SNAPSHOT</span><strong>Malinaw ba ang buong basket at mga bagay sa loob?</strong></div>
            <img src={snapshot} alt="Test snapshot captured from the cart camera" />
            <button type="button" onClick={() => setSnapshot(null)}><Trash2 /> Clear snapshot</button>
          </section>
        )}
      </section>
    </main>
  );
};
