import React from "react";
import { Mic, Image as ImageIcon, Video, FileText, Sticker } from "lucide-react";

export type MediaKind = "audio" | "image" | "video" | "document" | "sticker";

const MARKER_MAP: Record<string, MediaKind> = {
  "[audio]": "audio",
  "[áudio]": "audio",
  "[image]": "image",
  "[imagem]": "image",
  "[foto]": "image",
  "[video]": "video",
  "[vídeo]": "video",
  "[document]": "document",
  "[documento]": "document",
  "[sticker]": "sticker",
  "[figurinha]": "sticker",
};

export function detectMediaKind(
  text?: string | null,
  mediaType?: string | null
): MediaKind | null {
  if (mediaType) {
    const mt = mediaType.toLowerCase();
    if (mt === "audio" || mt === "voice") return "audio";
    if (mt === "image" || mt === "photo") return "image";
    if (mt === "video") return "video";
    if (mt === "document" || mt === "file") return "document";
    if (mt === "sticker") return "sticker";
  }
  if (!text) return null;
  const key = text.trim().toLowerCase();
  return MARKER_MAP[key] ?? null;
}

const LABEL: Record<MediaKind, string> = {
  audio: "Áudio",
  image: "Foto",
  video: "Vídeo",
  document: "Documento",
  sticker: "Figurinha",
};

const ICON: Record<MediaKind, React.ComponentType<{ className?: string }>> = {
  audio: Mic,
  image: ImageIcon,
  video: Video,
  document: FileText,
  sticker: Sticker,
};

export const MediaPreviewInline: React.FC<{
  kind: MediaKind;
  className?: string;
}> = ({ kind, className = "" }) => {
  const Icon = ICON[kind];
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{LABEL[kind]}</span>
    </span>
  );
};
