import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";

interface WhatsAppAudioPlayerProps {
  src: string;
  isSent?: boolean;
  fillContainer?: boolean;
}

const WhatsAppAudioPlayer: React.FC<WhatsAppAudioPlayerProps> = ({
  src,
  isSent = false,
  fillContainer = false,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const BARS = 36;
  const bars = useMemo(
    () => Array.from({ length: BARS }, () => 0.22 + Math.random() * 0.68),
    [src]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };
    const onEnded = () => { setPlaying(false); setProgress(0); setCurrentTime(0); };
    const onLoaded = () => setDuration(audio.duration);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || !audio.duration) return;
    const rect = track.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = p * audio.duration;
    setProgress(p);
  };

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const playedColor = isSent ? "hsl(var(--primary))" : "#53bdeb";
  const unplayedColor = isSent ? "hsl(var(--muted-foreground) / 0.35)" : "rgba(139,195,74,0.45)";

  return (
    <div className={`flex items-center gap-2 w-full min-w-[200px] ${fillContainer ? "" : "max-w-[320px]"} py-1`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors"
        style={{ color: playedColor }}
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6,3 20,12 6,21" />
          </svg>
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          ref={trackRef}
          onClick={handleSeek}
          className="relative flex items-center gap-[1.5px] h-[26px] cursor-pointer"
        >
          {bars.map((v, i) => {
            const isPlayed = i / bars.length < progress;
            return (
              <div
                key={i}
                className="rounded-full transition-colors duration-150"
                style={{
                  ...(fillContainer ? { flex: 1, minWidth: 2 } : { width: 2.5, flexShrink: 0 }),
                  height: `${Math.max(14, v * 100)}%`,
                  backgroundColor: isPlayed ? playedColor : unplayedColor,
                }}
              />
            );
          })}
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full shadow-sm pointer-events-none"
            style={{
              width: 10,
              height: 10,
              backgroundColor: playedColor,
              left: `calc(${progress * 100}% - 5px)`,
              transition: "left 0.1s linear",
            }}
          />
        </div>
        <span className="text-[10px] leading-none" style={{ color: "hsl(var(--muted-foreground))" }}>
          {currentTime > 0 ? fmt(currentTime) : fmt(duration)}
        </span>
      </div>
    </div>
  );
};

export default WhatsAppAudioPlayer;
