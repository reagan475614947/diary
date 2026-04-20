"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SectionCard } from "@/components/shared/section-card";
import { formatDisplayDate, getTodayDateValue } from "@/lib/date";
import {
  getAudioFileExtension,
  getSupportedAudioMimeType,
  isMediaRecordingSupported,
  requestMicrophoneStream,
} from "@/lib/audio-recorder";
import { fileToDataUrl, getEntryByDate, getSettings } from "@/lib/diary-db";
import {
  DEFAULT_SETTINGS_ID,
  getResolvedLanguage,
  getTranscriptionLanguageCode,
  mergeSettings,
} from "@/lib/settings";
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  type SpeechField,
} from "@/lib/speech";
import type { DiaryEntry, DiarySettings } from "@/types/diary";
import { PhotoPicker } from "./photo-picker";
import { QuestionField } from "./question-field";

type TodayEntryPageProps = {
  initialEntry?: DiaryEntry | null;
  initialSettings?: DiarySettings | null;
  saveAction: (formData: FormData) => Promise<void>;
  errorCode?: string;
  userName?: string;
  isAdmin?: boolean;
};

export function TodayEntryPage({
  initialEntry = null,
  initialSettings = null,
  saveAction,
  errorCode = "",
  userName,
  isAdmin,
}: TodayEntryPageProps) {
  const todayDate = getTodayDateValue();
  const mergedInitialSettings = mergeSettings(initialSettings);
  const hasInitialEntry = initialEntry !== null;

  const [weather, setWeather] = useState(initialEntry?.weather_manual || initialEntry?.weather_auto || "");
  const [autoWeather, setAutoWeather] = useState(initialEntry?.weather_auto ?? "");
  const [happyText, setHappyText] = useState(initialEntry?.happy_text ?? "");
  const [sadText, setSadText] = useState(initialEntry?.sad_text ?? "");
  const [confusedText, setConfusedText] = useState(initialEntry?.confused_text ?? "");
  const [voiceTranscriptHappy, setVoiceTranscriptHappy] = useState(initialEntry?.voice_transcript_happy ?? "");
  const [voiceTranscriptSad, setVoiceTranscriptSad] = useState(initialEntry?.voice_transcript_sad ?? "");
  const [voiceTranscriptConfused, setVoiceTranscriptConfused] = useState(initialEntry?.voice_transcript_confused ?? "");
  const [photoDataUrl, setPhotoDataUrl] = useState(initialEntry?.photo_local_path ?? "");
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(initialEntry?.photo_local_path ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState(
    mergedInitialSettings.preferred_language ?? "zh-CN",
  );
  const [isAiEnabled, setIsAiEnabled] = useState(Boolean(mergedInitialSettings.ai_enabled));
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [recordingField, setRecordingField] = useState<SpeechField | null>(null);
  const [errorMessage, setErrorMessage] = useState(
    errorCode === "empty" ? "至少填写一项文字内容，或上传一张照片后再保存。" : "",
  );
  const [statusMessage, setStatusMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const objectPreviewUrlRef = useRef("");
  const hasAttemptedAutoWeatherRef = useRef(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [mediaRecordingSupported, setMediaRecordingSupported] = useState(false);
  const canUseSpeechInput = speechSupported || mediaRecordingSupported;

  const detectWeather = useCallback(async (isAutomaticAttempt = false, currentWeather = "") => {
    setErrorMessage("");

    try {
      if (!navigator.geolocation) {
        throw new Error("当前浏览器不支持定位，所以无法自动识别天气。");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              reject(new Error("你还没有允许定位权限，所以无法自动识别天气。"));
              return;
            }

            if (error.code === error.TIMEOUT) {
              reject(new Error("定位超时，请检查网络或稍后再试。"));
              return;
            }

            reject(new Error("定位失败，请确认系统和浏览器的定位权限已开启。"));
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 10 * 60 * 1000,
          },
        );
      });

      const response = await fetch(
        `/api/weather/current?lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
      );
      const result = (await response.json()) as {
        summary?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "天气自动识别失败。");
      }

      setAutoWeather(result.summary ?? "");

      if (!currentWeather.trim()) {
        setWeather(result.summary ?? "");
      }
    } catch (error) {
      if (!isAutomaticAttempt) {
        setErrorMessage(
          error instanceof Error ? error.message : "天气自动识别失败，请稍后重试。",
        );
      }
    }
  }, []);

  useEffect(() => {
    if (hasInitialEntry && initialSettings !== null) {
      if (!hasAttemptedAutoWeatherRef.current) {
        hasAttemptedAutoWeatherRef.current = true;
        void detectWeather(true, initialEntry?.weather_manual ?? "");
      }

      return;
    }

    let isMounted = true;

    async function loadTodayEntry() {
      if (isMounted) {
        setIsLoading(true);
      }

      try {
        const [existingEntry, storedSettings] = await Promise.all([
          getEntryByDate(todayDate),
          getSettings(DEFAULT_SETTINGS_ID),
        ]);

        if (!isMounted) {
          return;
        }

        const mergedSettings = mergeSettings(storedSettings);
        setPreferredLanguage(mergedSettings.preferred_language ?? "zh-CN");
        setIsAiEnabled(Boolean(mergedSettings.ai_enabled));

        if (existingEntry) {
          setWeather(existingEntry.weather_manual || existingEntry.weather_auto || "");
          setAutoWeather(existingEntry.weather_auto ?? "");
          setHappyText(existingEntry.happy_text ?? "");
          setSadText(existingEntry.sad_text ?? "");
          setConfusedText(existingEntry.confused_text ?? "");
          setVoiceTranscriptHappy(existingEntry.voice_transcript_happy ?? "");
          setVoiceTranscriptSad(existingEntry.voice_transcript_sad ?? "");
          setVoiceTranscriptConfused(existingEntry.voice_transcript_confused ?? "");
          setPhotoDataUrl(existingEntry.photo_local_path ?? "");
          setPhotoPreviewUrl(existingEntry.photo_local_path ?? "");
        }

        if (!hasAttemptedAutoWeatherRef.current) {
          hasAttemptedAutoWeatherRef.current = true;
          void detectWeather(true, existingEntry?.weather_manual ?? "");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTodayEntry();

    return () => {
      isMounted = false;
    };
  }, [detectWeather, hasInitialEntry, initialEntry, initialSettings, mergedInitialSettings.weather_auto_enabled, todayDate]);

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
    setMediaRecordingSupported(isMediaRecordingSupported());
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      if (objectPreviewUrlRef.current) {
        URL.revokeObjectURL(objectPreviewUrlRef.current);
      }
    };
  }, []);

  async function handlePhotoSelected(file: File) {
    setIsUploading(true);
    setErrorMessage("");
    setStatusMessage("");

    if (objectPreviewUrlRef.current) {
      URL.revokeObjectURL(objectPreviewUrlRef.current);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    objectPreviewUrlRef.current = nextPreviewUrl;
    setPhotoPreviewUrl(nextPreviewUrl);

    try {
      const dataUrl = await fileToDataUrl(file);
      setPhotoDataUrl(dataUrl);
      setPhotoPreviewUrl(dataUrl);

      if (objectPreviewUrlRef.current) {
        URL.revokeObjectURL(objectPreviewUrlRef.current);
        objectPreviewUrlRef.current = "";
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "照片处理失败，请重试一次。");
    } finally {
      setIsUploading(false);
    }
  }

  function setFieldValue(field: SpeechField, value: string) {
    if (field === "happy") {
      setHappyText(value);
      setVoiceTranscriptHappy(value);
      return;
    }

    if (field === "sad") {
      setSadText(value);
      setVoiceTranscriptSad(value);
      return;
    }

    setConfusedText(value);
    setVoiceTranscriptConfused(value);
  }

  function getFieldValue(field: SpeechField) {
    if (field === "happy") {
      return happyText;
    }

    if (field === "sad") {
      return sadText;
    }

    return confusedText;
  }

  function handleVoiceToggle(field: SpeechField) {
    setErrorMessage("");
    setStatusMessage("");

    if (recordingField === field) {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      return;
    }

    if (speechSupported && !isAiEnabled) {
      startNativeSpeechRecognition(field);
      return;
    }

    if (mediaRecordingSupported) {
      void startRecordedTranscription(field);
      return;
    }

    setErrorMessage("当前浏览器不支持语音输入。推荐使用 Chrome，或配置 AI 转写后使用录音转写。");
  }

  function startNativeSpeechRecognition(field: SpeechField) {
    recognitionRef.current?.stop();
    const recognition = createSpeechRecognition(getResolvedLanguage(preferredLanguage));

    if (!recognition) {
      setErrorMessage("语音识别初始化失败。");
      return;
    }

    recognitionRef.current = recognition;
    recognition.onstart = () => {
      setRecordingField(field);
      setStatusMessage("正在录音，请直接说话。");
    };
    recognition.onend = () => {
      setRecordingField((currentField) => (currentField === field ? null : currentField));
    };
    recognition.onerror = (event) => {
      setRecordingField(null);
      const knownErrors: Record<string, string> = {
        "network": "语音识别需要连接 Google 服务，当前网络无法访问。如已配置 OPENAI_API_KEY，可尝试关闭浏览器原生语音识别权限以切换到录音转写模式。",
        "not-allowed": "麦克风权限被拒绝。请点击浏览器地址栏左侧的锁形图标允许麦克风权限，并确认系统「隐私与安全性 → 麦克风」中也已授权该浏览器。",
        "no-speech": "未检测到声音，请确认麦克风正常工作后重试。",
        "audio-capture": "无法捕获麦克风音频，请检查麦克风是否正确连接。",
        "aborted": "语音输入已取消。",
      };
      setErrorMessage(knownErrors[event.error] ?? `语音识别失败（${event.error}），请重试。`);
    };
    recognition.onresult = (event) => {
      const results = Array.from(event.results);
      const lastResult = results[results.length - 1];
      if (!lastResult?.isFinal) return;

      const transcript = results
        .filter((r) => r.isFinal)
        .map((r) => r[0]?.transcript ?? "")
        .join("")
        .trim();

      if (!transcript) return;

      const currentValue = getFieldValue(field);
      const nextValue = currentValue ? `${currentValue}\n${transcript}` : transcript;
      setFieldValue(field, nextValue);
    };

    try {
      recognition.start();
    } catch (error) {
      setRecordingField(null);
      setErrorMessage(error instanceof Error ? `语音识别启动失败：${error.message}` : "语音识别启动失败，请稍后重试。");
    }
  }

  async function startRecordedTranscription(field: SpeechField) {
    try {
      const stream = await requestMicrophoneStream();
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.onstart = () => {
        setRecordingField(field);
        setStatusMessage("正在录音，请直接说话。再次点击按钮即可停止并转写。");
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecordingField(null);
        setErrorMessage("录音失败，请检查麦克风权限。");
      };

      recorder.onstop = async () => {
        setRecordingField(null);
        setIsProcessingVoice(true);
        setStatusMessage("录音结束，正在转写...");

        try {
          const audioMimeType = mimeType || recorder.mimeType || "audio/webm";
          const audioBlob = new Blob(audioChunksRef.current, { type: audioMimeType });
          const extension = getAudioFileExtension(audioMimeType);
          const audioFile = new File([audioBlob], `voice-note.${extension}`, {
            type: audioMimeType,
          });
          const formData = new FormData();
          formData.append("file", audioFile);
          const languageCode = getTranscriptionLanguageCode(preferredLanguage);

          if (languageCode) {
            formData.append("language", languageCode);
          }

          const response = await fetch("/api/ai/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = (await response.json()) as {
            transcript?: string;
            error?: string;
          };

          if (!response.ok) {
            throw new Error(data.error ?? "语音转写失败。");
          }

          const transcript = data.transcript?.trim();

          if (!transcript) {
            throw new Error("这段录音没有转写出有效内容。");
          }

          const currentValue = getFieldValue(field);
          const nextValue = currentValue ? `${currentValue}\n${transcript}` : transcript;
          setFieldValue(field, nextValue);
          setStatusMessage("语音转写完成，已自动写入输入框。");
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : "语音转写失败，请稍后重试。",
          );
        } finally {
          setIsProcessingVoice(false);
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
        }
      };

      recorder.start();
    } catch (error) {
      setRecordingField(null);
      setErrorMessage(
        error instanceof Error ? error.message : "无法开始录音，请检查浏览器麦克风权限。",
      );
    }
  }

  return (
    <AppShell title="今天" userName={userName} isAdmin={isAdmin}>
      <form action={saveAction} className="contents">
        <input type="hidden" name="weather_auto" value={autoWeather} />
        <input type="hidden" name="photo_local_path" value={photoDataUrl} />
        <input type="hidden" name="voice_transcript_happy" value={voiceTranscriptHappy} />
        <input type="hidden" name="voice_transcript_sad" value={voiceTranscriptSad} />
        <input type="hidden" name="voice_transcript_confused" value={voiceTranscriptConfused} />

        <SectionCard title="日期·天气">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] bg-card-strong p-5">
              {/* <p className="text-sm font-medium text-muted">日期 · 时间</p> */}
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {formatDisplayDate(todayDate)}
              </p>
              {/* <p className="mt-1 text-lg font-medium text-foreground">
                {currentTime || "——"}
              </p> */}
            </div>
            <div className="rounded-[22px] bg-card-strong p-5">
              <input
                id="weather"
                name="weather_manual"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                placeholder={autoWeather || "比如：晴天、阴天、小雨"}
                className="w-full rounded-[18px] border border-border bg-white px-4 py-3 text-sm text-foreground focus:border-accent"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="三个问题">
          <div className="grid gap-4">
            <QuestionField
              fieldId="happy-text"
              name="happy_text"
              label="今天最开心的一件事"
              placeholder="哪怕只是一件很小的好事，也可以写下来。"
              value={happyText}
              onChange={setHappyText}
              onVoiceToggle={canUseSpeechInput ? () => handleVoiceToggle("happy") : undefined}
              isRecording={recordingField === "happy"}

            />
            <QuestionField
              fieldId="sad-text"
              name="sad_text"
              label="今天最难过的一件事"
              placeholder="可以是情绪，也可以是具体发生的事件。"
              value={sadText}
              onChange={setSadText}
              onVoiceToggle={canUseSpeechInput ? () => handleVoiceToggle("sad") : undefined}
              isRecording={recordingField === "sad"}

            />
            <QuestionField
              fieldId="confused-text"
              name="confused_text"
              label="今天最困惑的一件事"
              placeholder="写下正在卡住你的问题，后面做阶段总结时会很有价值。"
              value={confusedText}
              onChange={setConfusedText}
              onVoiceToggle={canUseSpeechInput ? () => handleVoiceToggle("confused") : undefined}
              isRecording={recordingField === "confused"}

            />
          </div>
        </SectionCard>

        <SectionCard title="一张照片">
          <PhotoPicker
            previewUrl={photoPreviewUrl}
            onFileSelected={handlePhotoSelected}
            onRemove={() => {
              if (objectPreviewUrlRef.current) {
                URL.revokeObjectURL(objectPreviewUrlRef.current);
                objectPreviewUrlRef.current = "";
              }

              setPhotoDataUrl("");
              setPhotoPreviewUrl("");
            }}
            isUploading={isUploading}
          />

          {photoPreviewUrl ? (
            <label className="mt-4 flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                name="remove_photo"
                value="1"
                className="h-4 w-4 rounded border-border"
              />
              保存时删除当前照片
            </label>
          ) : null}
        </SectionCard>

        <SectionCard title="保存这条记录">
          {statusMessage ? <p className="text-sm font-medium text-[#51674b]">{statusMessage}</p> : null}
          {errorMessage ? <p className="mt-4 text-sm font-medium text-[#9d4a39]">{errorMessage}</p> : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isLoading || isUploading || isProcessingVoice}
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(201,117,80,0.28)] hover:bg-accent-strong disabled:opacity-60"
            >
              保存今天的记录
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-muted hover:bg-white"
            >
              返回首页
            </Link>
          </div>
        </SectionCard>
      </form>
    </AppShell>
  );
}
