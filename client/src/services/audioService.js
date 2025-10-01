import { useAudioStore } from "@/stores/audioStore";

// Pinia store subscription handle
let _unsubscribe = null;

// Simple audio service using HTMLAudioElement with fade helpers
const active = {
  audio: null,
  fadeInterval: null,
};

function _getEffectiveVolume() {
  const audioStore = useAudioStore();
  // use musicFraction getter (master*music) to compute effective music volume
  // musicFraction is 0.0-1.0
  return Math.max(0, Math.min(1, audioStore.musicFraction || 0));
}

export default {
  async fadeIn(src, { duration = 2000, loop = true } = {}) {
    // stop previous audio if any
    this.stop();


    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = 0;
    audio.preload = "auto";

    active.audio = audio;

    // subscribe to store updates so we can update active audio volume in real-time
    try {
      const audioStore = useAudioStore();
      if (_unsubscribe && typeof _unsubscribe === "function") {
        _unsubscribe();
        _unsubscribe = null;
      }
      // Pinia provides $subscribe on the store instance
      if (audioStore && typeof audioStore.$subscribe === "function") {
        _unsubscribe = audioStore.$subscribe(() => {
          if (active.audio) {
            const vol = _getEffectiveVolume();
            // Respect immediate changes outside of fade (if fading, the fade loop still samples target)
            active.audio.volume = Math.max(0, Math.min(1, vol));
          }
        });
      }
    } catch (err) {
      // no-op if subscribe isn't available for some reason
      console.warn("audioService subscribe failed", err);
    }

    try {
      await audio.play();
    } catch (e) {
      // play may be blocked by browser autoplay policies; still keep audio object
      // caller can attempt to resume on user interaction
      console.warn("audio play blocked", e);
    }

    // Fade from 0 to target volume over duration ms
  const start = Date.now();
  const from = 0;

    if (active.fadeInterval) {
      clearInterval(active.fadeInterval);
      active.fadeInterval = null;
    }

    // fade interval will sample current store fraction each tick so changes in
    // master/music sliders affect the target while fading.
    active.fadeInterval = setInterval(() => {
      if (!active.audio) return clearInterval(active.fadeInterval);
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      // sample current target volume
      const currentTarget = _getEffectiveVolume();
      active.audio.volume = from + (currentTarget - from) * t;
      if (t >= 1) {
        clearInterval(active.fadeInterval);
        active.fadeInterval = null;
      }
    }, 100);

    return {
      stop: () => this.stop(),
      audio,
    };
  },

  stop({ fadeOut = 500 } = {}) {
    if (!active.audio) return;
    const audio = active.audio;
    if (active.fadeInterval) {
      clearInterval(active.fadeInterval);
      active.fadeInterval = null;
    }

    // unsubscribe from store updates when stopping
    if (_unsubscribe && typeof _unsubscribe === "function") {
      try {
        _unsubscribe();
      } catch (e) {
        // ignore
      }
      _unsubscribe = null;
    }

    if (fadeOut > 0) {
      const startVol = audio.volume;
      const start = Date.now();
      active.fadeInterval = setInterval(() => {
        const elapsed = Date.now() - start;
        const t = Math.min(1, elapsed / fadeOut);
        audio.volume = Math.max(0, startVol * (1 - t));
        if (t >= 1) {
          clearInterval(active.fadeInterval);
          active.fadeInterval = null;
          audio.pause();
          audio.currentTime = 0;
          active.audio = null;
        }
      }, 50);
    } else {
      audio.pause();
      audio.currentTime = 0;
      active.audio = null;
    }
  },
};
