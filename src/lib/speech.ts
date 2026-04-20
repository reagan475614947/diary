export type SpeechField = "happy" | "sad" | "confused";

type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    start(): void;
    stop(): void;
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
  }
}

export function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionConstructor());
}

export function createSpeechRecognition(language: string) {
  const SpeechRecognitionConstructor = getSpeechRecognitionConstructor();

  if (!SpeechRecognitionConstructor) {
    return null;
  }

  const recognition = new SpeechRecognitionConstructor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = language;

  return recognition;
}

export function getTranscriptFromEvent(event: SpeechRecognitionEvent) {
  let transcript = "";

  for (const result of Array.from(event.results)) {
    transcript += result[0]?.transcript ?? "";
  }

  return transcript.trim();
}
