import React, { useState, useRef, useEffect } from 'react';
import { uploadMediaAttachment } from '../../lib/api';
import { Mic, Video, Square, Play, Pause, RotateCcw, Trash2, Check, AlertCircle, Volume2 } from 'lucide-react';

interface RecordingStudioProps {
  mediaType: 'VOICE' | 'VIDEO';
  paymentId: string;
  recipientName: string;
  onComplete: (result: {
    mediaType: 'VOICE' | 'VIDEO';
    storageKey: string;
    durationSeconds: number;
    previewUrl: string;
  }) => void;
  onCancel?: () => void;
}

export const RecordingStudio: React.FC<RecordingStudioProps> = ({
  mediaType,
  paymentId,
  recipientName,
  onComplete,
  onCancel,
}) => {
  // Max recording duration: Voice = 5 min (300s), Video = 3 min (180s)
  const MAX_SECONDS = mediaType === 'VOICE' ? 300 : 180;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'recorded' | 'playing'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>(mediaType === 'VIDEO' ? 'video/webm' : 'audio/webm');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Format seconds as mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Request hardware media stream upon component mount
  const requestMediaAccess = async () => {
    try {
      setPermissionError(null);
      let mediaStream: MediaStream;

      if (mediaType === 'VIDEO') {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });
      } else {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      setStream(mediaStream);
      setPermissionState('granted');

      // Bind to live preview if video
      if (mediaType === 'VIDEO' && liveVideoRef.current) {
        liveVideoRef.current.srcObject = mediaStream;
        liveVideoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.error('[RecordingStudio] Media permission error:', err);
      setPermissionState('denied');
      const deviceName = mediaType === 'VIDEO' ? 'Camera and microphone' : 'Microphone';
      setPermissionError(
        `${deviceName} permission is required to record your personal message. Please allow access in your browser settings to continue.`
      );
    }
  };

  useEffect(() => {
    requestMediaAccess();

    return () => {
      // Clean up hardware streams and timers when leaving
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [mediaType]);

  // Keep live video element bound to stream
  useEffect(() => {
    if (mediaType === 'VIDEO' && liveVideoRef.current && stream && recordingState !== 'recorded') {
      liveVideoRef.current.srcObject = stream;
      liveVideoRef.current.play().catch(() => {});
    }
  }, [stream, mediaType, recordingState]);

  // Start live recording
  const handleStartRecording = () => {
    if (!stream) {
      requestMediaAccess();
      return;
    }

    try {
      audioChunksRef.current = [];
      const supportedMime = mediaType === 'VIDEO'
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus'
            : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : 'video/mp4')
        : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/mp4');

      setMimeType(supportedMime);

      const recorder = new MediaRecorder(stream, { mimeType: supportedMime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: supportedMime });
        setRecordedBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setRecordedUrl(url);
        setRecordingState('recorded');
      };

      recorder.start(250); // Slice data every 250ms for reliability
      setRecordingState('recording');
      setSeconds(0);

      // Start timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev + 1 >= MAX_SECONDS) {
            handleStopRecording();
            return MAX_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('[RecordingStudio] Recorder start failure:', err);
      setUploadError('Failed to initialize media recorder on your device. Please try again.');
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Re-record / discard
  const handleReRecord = () => {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setRecordedBlob(null);
    setSeconds(0);
    setRecordingState('idle');
    setUploadError(null);

    // Reconnect live stream preview if video
    if (mediaType === 'VIDEO' && liveVideoRef.current && stream) {
      liveVideoRef.current.srcObject = stream;
      liveVideoRef.current.play().catch(() => {});
    }
  };

  // Toggle playback
  const handleTogglePlayback = () => {
    if (mediaType === 'VIDEO') {
      if (playbackVideoRef.current) {
        if (playbackVideoRef.current.paused) {
          playbackVideoRef.current.play();
          setRecordingState('playing');
        } else {
          playbackVideoRef.current.pause();
          setRecordingState('recorded');
        }
      }
    } else {
      if (playbackAudioRef.current) {
        if (playbackAudioRef.current.paused) {
          playbackAudioRef.current.play();
          setRecordingState('playing');
        } else {
          playbackAudioRef.current.pause();
          setRecordingState('recorded');
        }
      }
    }
  };

  // Confirm and upload media to backend
  const handleConfirmAndAttach = async () => {
    if (!recordedBlob) {
      setUploadError('No recorded message available to attach.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      // Convert Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(recordedBlob);
      });

      const base64Data = await base64Promise;

      const result = await uploadMediaAttachment(paymentId, {
        data: base64Data,
        mimeType,
        durationSeconds: seconds,
      });

      // Stop media stream tracks now that recording is finalized
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      onComplete({
        mediaType,
        storageKey: result.storageKey,
        durationSeconds: seconds,
        previewUrl: recordedUrl || '',
      });
    } catch (err: any) {
      console.error('[RecordingStudio] Upload failed:', err);
      setUploadError(err.message || 'Failed to save recording to the postal vault.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white border border-[#eae4da] shadow-paper-lg rounded-xs overflow-hidden select-none animate-fade-in">
      {/* Postal Header Bar */}
      <div className="bg-[#faf9f7] px-6 py-4 border-b border-[#eae4da] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-teal-900 font-serif text-lg">❦</span>
          <span className="text-xs font-mono tracking-widest uppercase text-stone-700 font-semibold">
            {mediaType === 'VOICE' ? 'VOICE RECORDING STUDIO' : 'VIDEO RECORDING STUDIO'}
          </span>
          <span className="text-stone-300">·</span>
          <span className="text-[11px] font-mono text-teal-900 bg-teal-50 px-2 py-0.5 rounded-xs border border-teal-200">
            PAYMENT CONFIRMED: ₹{mediaType === 'VOICE' ? '99' : '149'}
          </span>
        </div>

        {onCancel && recordingState === 'idle' && (
          <button
            type="button"
            onClick={onCancel}
            className="text-stone-400 hover:text-stone-700 text-xs font-mono uppercase cursor-pointer"
          >
            ✕ Discard
          </button>
        )}
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Recipient Notice */}
        <div className="flex items-center justify-between text-xs font-serif text-stone-600 border-b border-stone-100 pb-3">
          <span>
            Recording personal message for <strong>{recipientName || 'Recipient'}</strong>
          </span>
          <span className="font-mono text-[11px] text-stone-400">
            LIMIT: {mediaType === 'VOICE' ? '5 MINUTES' : '3 MINUTES'}
          </span>
        </div>

        {/* Permission Denied Banner */}
        {permissionState === 'denied' && (
          <div className="p-5 bg-rose-50 border border-rose-200 rounded-xs space-y-3 animate-fade-in">
            <div className="flex items-start gap-3 text-rose-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="space-y-1">
                <h4 className="font-sans font-semibold text-xs uppercase tracking-wider">
                  Hardware Access Required
                </h4>
                <p className="font-serif text-xs leading-relaxed text-rose-900">
                  {permissionError ||
                    'Microphone and camera permissions are required to record your personal message. Please allow access in your browser settings to continue.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={requestMediaAccess}
              className="w-full py-2 bg-rose-800 hover:bg-rose-700 text-white font-sans text-xs uppercase tracking-wider rounded-xs cursor-pointer shadow-xs transition-colors"
            >
              Retry Device Permission
            </button>
          </div>
        )}

        {/* Live Video / Waveform Studio Display */}
        {permissionState === 'granted' && (
          <div className="relative rounded-xs overflow-hidden border border-stone-200 bg-stone-900 shadow-inner flex flex-col items-center justify-center min-h-[260px] sm:min-h-[320px]">
            {mediaType === 'VIDEO' ? (
              <>
                {/* Live Preview Feed */}
                {recordingState !== 'recorded' && (
                  <video
                    ref={liveVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover max-h-[360px]"
                  />
                )}

                {/* Recorded Review Playback */}
                {recordingState === 'recorded' && recordedUrl && (
                  <video
                    ref={playbackVideoRef}
                    src={recordedUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover max-h-[360px]"
                    onEnded={() => setRecordingState('recorded')}
                  />
                )}
              </>
            ) : (
              /* VOICE Studio Visualizer */
              <div className="w-full py-12 px-6 flex flex-col items-center justify-center space-y-6 text-center bg-gradient-to-b from-stone-900 to-stone-950">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center border transition-all duration-500 ${
                    recordingState === 'recording'
                      ? 'bg-rose-950/60 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.35)] scale-110'
                      : recordingState === 'recorded'
                      ? 'bg-teal-950/60 border-teal-500'
                      : 'bg-stone-800/80 border-stone-700'
                  }`}
                >
                  {recordingState === 'recording' ? (
                    <Mic className="w-10 h-10 text-rose-400 animate-pulse" />
                  ) : recordingState === 'recorded' ? (
                    <Volume2 className="w-10 h-10 text-teal-400" />
                  ) : (
                    <Mic className="w-10 h-10 text-stone-400" />
                  )}
                </div>

                {/* Subtle Voice Waveform Bars */}
                {recordingState === 'recording' && (
                  <div className="flex items-center gap-1.5 h-8">
                    {[12, 24, 36, 18, 30, 42, 28, 16, 32, 20, 38, 22].map((height, i) => (
                      <div
                        key={i}
                        className="w-1 bg-rose-400 rounded-full animate-pulse"
                        style={{
                          height: `${height}px`,
                          animationDelay: `${i * 80}ms`,
                          animationDuration: '600ms',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Audio Playback Element when recorded */}
                {recordingState === 'recorded' && recordedUrl && (
                  <div className="w-full max-w-md pt-2">
                    <audio
                      ref={playbackAudioRef}
                      src={recordedUrl}
                      controls
                      className="w-full"
                      onEnded={() => setRecordingState('recorded')}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Live Recording HUD Overlay */}
            {recordingState === 'recording' && (
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-white drop-shadow-md pointer-events-none">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full border border-rose-500/40">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="uppercase tracking-widest text-[11px] font-semibold text-rose-300">
                    RECORDING LIVE
                  </span>
                </div>

                <div className="bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full border border-stone-600 font-bold tracking-wider">
                  {formatTime(seconds)} / {formatTime(MAX_SECONDS)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Studio Timer & Status Info */}
        <div className="flex items-center justify-between text-xs font-mono text-stone-600 bg-[#faf9f7] p-3 rounded-xs border border-stone-200">
          <div>
            STATUS:{' '}
            <strong className="text-teal-900 uppercase">
              {recordingState === 'idle'
                ? 'READY TO INSCRIBE'
                : recordingState === 'recording'
                ? 'INSCRIBING MEDIA...'
                : 'RECORDING COMPLETE'}
            </strong>
          </div>
          <div>
            ELAPSED: <strong className="text-stone-900">{formatTime(seconds)}</strong>
          </div>
        </div>

        {uploadError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xs font-mono">
            {uploadError}
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 border-t border-[#eae4da] flex flex-wrap items-center justify-between gap-4">
          {recordingState === 'idle' && (
            <button
              type="button"
              disabled={permissionState !== 'granted'}
              onClick={handleStartRecording}
              className="w-full sm:w-auto px-8 py-3.5 bg-rose-800 hover:bg-rose-700 disabled:bg-stone-300 text-white font-sans text-xs uppercase tracking-widest font-semibold rounded-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {mediaType === 'VOICE' ? <Mic className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              <span>START RECORDING</span>
            </button>
          )}

          {recordingState === 'recording' && (
            <button
              type="button"
              onClick={handleStopRecording}
              className="w-full sm:w-auto px-8 py-3.5 bg-stone-900 hover:bg-stone-800 text-white font-sans text-xs uppercase tracking-widest font-semibold rounded-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span>STOP RECORDING ({formatTime(seconds)})</span>
            </button>
          )}

          {recordingState === 'recorded' && (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReRecord}
                  disabled={isUploading}
                  className="px-4 py-2.5 bg-white border border-stone-300 hover:border-stone-500 text-stone-700 text-xs font-sans rounded-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-record</span>
                </button>
                <button
                  type="button"
                  onClick={handleReRecord}
                  disabled={isUploading}
                  className="px-3 py-2.5 text-stone-400 hover:text-rose-700 text-xs font-sans rounded-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <button
                type="button"
                disabled={isUploading}
                onClick={handleConfirmAndAttach}
                className="w-full sm:w-auto px-8 py-3.5 bg-teal-900 hover:bg-teal-800 disabled:bg-stone-400 text-white font-sans text-xs uppercase tracking-widest font-semibold rounded-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isUploading ? (
                  <span>SEALING TO VAULT...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-teal-300" />
                    <span>CONFIRM & ATTACH ENCLOSURE →</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
