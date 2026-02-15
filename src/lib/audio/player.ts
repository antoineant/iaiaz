/**
 * Audio playback manager for text-to-speech.
 * Ensures only one message plays at a time.
 */

export type PlayerState = "idle" | "loading" | "playing";

type StateChangeCallback = (state: PlayerState) => void;

interface AudioPlayer {
  play(audioUrl: string): Promise<void>;
  stop(): void;
  getState(): PlayerState;
  onStateChange(cb: StateChangeCallback): void;
  destroy(): void;
}

export function createAudioPlayer(): AudioPlayer {
  let audio: HTMLAudioElement | null = null;
  let state: PlayerState = "idle";
  let stateCallback: StateChangeCallback | null = null;
  let objectUrl: string | null = null;

  function setState(newState: PlayerState) {
    state = newState;
    stateCallback?.(newState);
  }

  function cleanupAudio() {
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  }

  return {
    async play(audioUrl: string) {
      // Stop any currently playing audio
      cleanupAudio();

      setState("loading");

      try {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error("Failed to fetch audio");

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        audio = new Audio(objectUrl);

        audio.onended = () => {
          cleanupAudio();
          setState("idle");
        };

        audio.onerror = () => {
          cleanupAudio();
          setState("idle");
        };

        await audio.play();
        setState("playing");
      } catch {
        cleanupAudio();
        setState("idle");
        throw new Error("Playback failed");
      }
    },

    stop() {
      cleanupAudio();
      setState("idle");
    },

    getState() {
      return state;
    },

    onStateChange(cb: StateChangeCallback) {
      stateCallback = cb;
    },

    destroy() {
      cleanupAudio();
      stateCallback = null;
    },
  };
}
