import { useState } from 'react';
import { LetterData } from '../types';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Users,
  Compass,
} from 'lucide-react';

interface LiveMeetingRoomProps {
  letterData: LetterData;
  onExit: () => void;
}

export function LiveMeetingRoom({ letterData, onExit }: LiveMeetingRoomProps) {
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<string[]>([
    "Lokesh: I'm so glad you received the letter. How was the unsealing?",
  ]);
  const [newMsg, setNewMsg] = useState('');

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setChatMessages([...chatMessages, `You: ${newMsg.trim()}`]);
    setNewMsg('');
  };

  return (
    <div className="min-h-screen bg-[#191411] text-[#FAF8F5] flex flex-col justify-between p-4 sm:p-8 animate-fade-in">
      {/* Top Header: Parlor Dispatch metadata */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="space-y-0.5">
            <h1 className="font-serif text-xl sm:text-2xl text-amber-100 font-medium">
              OLD-LETTERS Parlor • Private Sanctuary
            </h1>
            <span className="text-[10px] font-mono tracking-widest text-stone-400 uppercase">
              ENCRYPTED CANDLELIT LIVE LINK // DISPATCH #{letterData.trackingCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="p-2 rounded bg-stone-800 text-stone-300 hover:text-white"
            title="Toggle parlor whisper chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={onExit}
            className="px-4 py-2 rounded bg-[#5A2528] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#733034]"
          >
            Leave Parlor
          </button>
        </div>
      </div>

      {/* Center: Video Call Stage */}
      <div className="max-w-6xl mx-auto w-full my-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Main Stage: Sender's Video Feed (Simulated atmospheric study) */}
        <div className={`relative rounded-xl overflow-hidden bg-stone-900 border border-stone-700 shadow-2xl h-[420px] sm:h-[500px] flex flex-col justify-between p-6 ${chatOpen ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
          {/* Video Background Image (Atmospheric Study) */}
          <div
            className="absolute inset-0 bg-cover bg-center filter contrast-110 brightness-90"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1507842229451-7f01be7f7a26?auto=format&fit=crop&w=1200&q=80')`,
            }}
          />

          {/* Warm fireplace/lamp glow gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60 pointer-events-none" />

          {/* Status badge top left */}
          <div className="relative z-10 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#5A2528]/80 text-amber-100 text-[10px] font-mono tracking-widest uppercase backdrop-blur-xs">
              LIVE IN THE STUDY
            </span>
            <span className="text-xs font-serif text-stone-300 italic">
              {letterData.fromName || 'Lokesh'} is waiting for you...
            </span>
          </div>

          {/* Self Camera Miniature (Bottom Right Picture-in-Picture) */}
          <div className="relative z-10 self-end w-36 sm:w-48 h-28 sm:h-36 rounded-lg overflow-hidden border-2 border-stone-600 bg-stone-950 shadow-xl flex flex-col justify-between p-2">
            <div className="text-[9px] font-mono text-stone-400">
              YOU ({letterData.toName || 'Ananya'})
            </div>
            {cameraActive ? (
              <div className="text-center font-serif text-xs text-amber-200/80 italic my-auto">
                Camera Active
              </div>
            ) : (
              <div className="text-center font-mono text-xs text-stone-500 my-auto">
                Camera Off
              </div>
            )}
            <div className="flex justify-between items-center text-[9px] font-mono text-stone-500">
              <span>{micActive ? 'MIC ON' : 'MUTED'}</span>
            </div>
          </div>

          {/* Sender bottom name tag */}
          <div className="relative z-10 font-serif text-xl text-amber-100 font-medium">
            {letterData.fromName || 'Lokesh'}
            <span className="block text-xs font-mono text-stone-400 font-normal">
              Connecting from Copenhagen Postal Station
            </span>
          </div>
        </div>

        {/* Optional Whisper Chat Sidebar */}
        {chatOpen && (
          <div className="lg:col-span-4 bg-stone-900 border border-stone-800 rounded-xl p-4 h-[420px] sm:h-[500px] flex flex-col justify-between">
            <div className="border-b border-stone-800 pb-2 mb-3">
              <span className="text-xs font-mono tracking-widest text-[#A88955] uppercase">
                PARLOR WHISPERS
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs font-serif">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="p-2.5 rounded bg-stone-950/70 border border-stone-800">
                  {msg}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="mt-3 pt-3 border-t border-stone-800 flex gap-2">
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Whisper a reply..."
                className="flex-1 bg-stone-950 px-3 py-1.5 rounded border border-stone-800 text-xs text-stone-200 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#5A2528] rounded text-xs font-mono uppercase"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="max-w-md mx-auto w-full bg-stone-900 border border-stone-800 rounded-full px-6 py-3 flex items-center justify-around shadow-xl">
        {/* Toggle Mic */}
        <button
          onClick={() => setMicActive(!micActive)}
          className={`p-3 rounded-full transition-colors ${
            micActive ? 'bg-stone-800 hover:bg-stone-700 text-stone-200' : 'bg-rose-900/60 text-rose-300'
          }`}
          title={micActive ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Toggle Camera */}
        <button
          onClick={() => setCameraActive(!cameraActive)}
          className={`p-3 rounded-full transition-colors ${
            cameraActive ? 'bg-stone-800 hover:bg-stone-700 text-stone-200' : 'bg-rose-900/60 text-rose-300'
          }`}
          title={cameraActive ? 'Turn off video' : 'Turn on video'}
        >
          {cameraActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* End Call / Exit to OLD-LETTERS */}
        <button
          onClick={onExit}
          className="p-3 rounded-full bg-[#5A2528] hover:bg-[#733034] text-white shadow"
          title="Leave the OLD-LETTERS Parlor"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
