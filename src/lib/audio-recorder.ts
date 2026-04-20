type MediaRecorderWithMimeType = typeof MediaRecorder;

const preferredMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
];

export function isMediaRecordingSupported() {
  return (
    typeof window !== "undefined" &&
    "MediaRecorder" in window &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function getSupportedAudioMimeType() {
  if (typeof window === "undefined" || !("MediaRecorder" in window)) {
    return "";
  }

  const MediaRecorderConstructor = window.MediaRecorder as MediaRecorderWithMimeType;

  return preferredMimeTypes.find((mimeType) => MediaRecorderConstructor.isTypeSupported(mimeType)) ?? "";
}

export function getAudioFileExtension(mimeType: string) {
  if (mimeType.includes("mp4")) {
    return "m4a";
  }

  if (mimeType.includes("mpeg")) {
    return "mp3";
  }

  return "webm";
}

export async function requestMicrophoneStream() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("当前浏览器不支持录音。");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: true,
  });
}
