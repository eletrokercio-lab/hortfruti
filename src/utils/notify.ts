// Alerta sonoro de notificações (Web Audio — sem arquivos externos)
let audioCtx: AudioContext | null = null;

// IDs de notificações criadas nesta sessão (para não apitar pela própria ação)
const selfCreatedIds = new Set<string>();

export const markNotificationSeen = (id: string) => {
  selfCreatedIds.add(id);
};

export const playNotificationSound = () => {
  try {
    const AC: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const tones = [
      { freq: 880, at: 0 },
      { freq: 1174.66, at: 0.16 },
    ];
    for (const { freq, at } of tones) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.22, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.32);
    }
  } catch {
    // silencioso: som é opcional
  }
};

export const isSelfNotification = (id: string) => selfCreatedIds.has(id);
