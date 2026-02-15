/**
 * MediaRecorder wrapper for speech-to-text recording.
 * Records audio as WebM (with OGG fallback) for Whisper API compatibility.
 */

const MAX_RECORDING_SECONDS = 60;

export type RecorderState = "idle" | "recording" | "stopping";

interface AudioRecorder {
  start(): Promise<void>;
  stop(): Promise<Blob>;
  isRecording(): boolean;
  getState(): RecorderState;
  onDurationChange(cb: (seconds: number) => void): void;
}

export function createAudioRecorder(): AudioRecorder {
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let state: RecorderState = "idle";
  let durationCallback: ((seconds: number) => void) | null = null;
  let durationInterval: ReturnType<typeof setInterval> | null = null;
  let startTime = 0;
  let autoStopTimeout: ReturnType<typeof setTimeout> | null = null;

  function cleanup() {
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
    if (autoStopTimeout) {
      clearTimeout(autoStopTimeout);
      autoStopTimeout = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    mediaRecorder = null;
    chunks = [];
    state = "idle";
  }

  function getMimeType(): string {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      return "audio/webm;codecs=opus";
    }
    if (MediaRecorder.isTypeSupported("audio/webm")) {
      return "audio/webm";
    }
    if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
      return "audio/ogg;codecs=opus";
    }
    return "";
  }

  return {
    async start() {
      if (state !== "idle") return;

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getMimeType();

      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.start(250); // Collect data every 250ms
      state = "recording";
      startTime = Date.now();

      // Duration timer
      durationInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        durationCallback?.(elapsed);
      }, 1000);

      // Auto-stop after max duration
      autoStopTimeout = setTimeout(() => {
        if (mediaRecorder?.state === "recording") {
          mediaRecorder.stop();
        }
      }, MAX_RECORDING_SECONDS * 1000);
    },

    stop(): Promise<Blob> {
      return new Promise((resolve, reject) => {
        if (!mediaRecorder || state !== "recording") {
          reject(new Error("Not recording"));
          return;
        }

        state = "stopping";

        mediaRecorder.onstop = () => {
          const mimeType = mediaRecorder?.mimeType || "audio/webm";
          const blob = new Blob(chunks, { type: mimeType });
          cleanup();
          resolve(blob);
        };

        mediaRecorder.onerror = () => {
          cleanup();
          reject(new Error("Recording error"));
        };

        mediaRecorder.stop();
      });
    },

    isRecording() {
      return state === "recording";
    },

    getState() {
      return state;
    },

    onDurationChange(cb: (seconds: number) => void) {
      durationCallback = cb;
    },
  };
}
