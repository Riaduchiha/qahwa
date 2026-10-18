type Tone = { freq: number; at: number; dur: number; vol: number };

function playTones(tones: Tone[]) {
  try {
    const AudioClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioClass) return;

    const ctx = new AudioClass();
    const now = ctx.currentTime;
    let end = 0;

    tones.forEach(({ freq, at, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + at;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.01);
      end = Math.max(end, at + dur);
    });

    window.setTimeout(() => void ctx.close(), (end + 0.3) * 1000);
  } catch {
    // Le navigateur peut bloquer le son : ce n'est pas bloquant.
  }
}

export const playCashSound = () =>
  playTones([
    { freq: 1046.5, at: 0, dur: 0.35, vol: 0.2 },
    { freq: 1568, at: 0.09, dur: 0.35, vol: 0.2 },
  ]);

export const playAlertSound = () =>
  playTones([{ freq: 880, at: 0, dur: 0.2, vol: 0.12 }]);