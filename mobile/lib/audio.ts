import { Audio } from "expo-av";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const MAX_RECORDING_MS = 60_000;

export type RecorderState = "idle" | "recording" | "transcribing";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function requestMicPermission(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

export async function startRecording(): Promise<Audio.Recording> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording } = await Audio.Recording.createAsync(
    {
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      android: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
        extension: ".m4a",
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
      },
      ios: {
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
        extension: ".m4a",
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
      },
    }
  );

  // Auto-stop after max duration
  setTimeout(async () => {
    try {
      const status = await recording.getStatusAsync();
      if (status.isRecording) {
        await recording.stopAndUnloadAsync();
      }
    } catch {
      // Already stopped
    }
  }, MAX_RECORDING_MS);

  return recording;
}

export async function stopAndTranscribe(
  recording: Audio.Recording,
  locale: string = "fr"
): Promise<string> {
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = recording.getURI();
  if (!uri) throw new Error("No recording URI");

  const authHeaders = await getAuthHeaders();

  // Build multipart form data
  const formData = new FormData();
  formData.append("audio", {
    uri,
    type: Platform.OS === "ios" ? "audio/m4a" : "audio/mp4",
    name: "recording.m4a",
  } as any);
  formData.append("locale", locale);

  const res = await fetch(`${API_URL}/api/audio/transcribe`, {
    method: "POST",
    headers: {
      ...authHeaders,
      // Don't set Content-Type — fetch sets it with boundary for FormData
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Transcription failed: ${res.status}`);
  }

  const { text } = await res.json();
  return text;
}
