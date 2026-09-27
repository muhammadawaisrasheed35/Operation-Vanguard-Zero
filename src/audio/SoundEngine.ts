import { EnvironmentType, WeaponId } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private ambientSource: AudioNode | null = null;
  private masterVolume = 0.8;
  private sfxVolume = 0.85;
  private ambientVolume = 0.45;
  private isMuted = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolumes(master: number, sfx: number, ambient: number) {
    this.masterVolume = Math.max(0, Math.min(1, master));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.ambientVolume = Math.max(0, Math.min(1, ambient));
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.masterVolume * this.ambientVolume * 0.18,
        this.ctx.currentTime,
        0.1
      );
    }
  }

  private getEffectiveSfxGain(): number {
    if (this.isMuted) return 0;
    return this.masterVolume * this.sfxVolume;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playWeaponFire(weaponId: WeaponId) {
    const ctx = this.ensureContext();
    const gainLevel = this.getEffectiveSfxGain();
    if (!ctx || gainLevel <= 0.001) return;

    const now = ctx.currentTime;

    if (weaponId === 'pistol') {
      // Suppressed tactical pistol "thwip-clack"
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 0.12);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(1.8, now);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.35 * gainLevel, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(65, now + 0.07);

      noise.connect(filter);
      filter.connect(env);
      osc.connect(env);
      env.connect(ctx.destination);

      noise.start(now);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (weaponId === 'assault_rifle') {
      // Crisp 5.56mm tactical carbine crack + punch
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 0.24);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(380, now + 0.22);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.55 * gainLevel, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      const punch = ctx.createOscillator();
      punch.type = 'sawtooth';
      punch.frequency.setValueAtTime(150, now);
      punch.frequency.exponentialRampToValueAtTime(42, now + 0.09);

      const punchGain = ctx.createGain();
      punchGain.gain.setValueAtTime(0.45 * gainLevel, now);
      punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      noise.connect(filter);
      filter.connect(env);
      env.connect(ctx.destination);

      punch.connect(punchGain);
      punchGain.connect(ctx.destination);

      noise.start(now);
      punch.start(now);
      punch.stop(now + 0.1);
    } else if (weaponId === 'shotgun') {
      // Heavy 12-gauge boom + pump rack
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 0.42);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.frequency.exponentialRampToValueAtTime(190, now + 0.4);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.75 * gainLevel, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(110, now);
      sub.frequency.exponentialRampToValueAtTime(28, now + 0.22);

      noise.connect(filter);
      filter.connect(env);
      sub.connect(env);
      env.connect(ctx.destination);

      noise.start(now);
      sub.start(now);
      sub.stop(now + 0.24);
    } else if (weaponId === 'sniper_rifle') {
      // High-caliber .338 supersonic crack + long canyon tail
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 0.65);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(4500, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.62);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.82 * gainLevel, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.63);

      const crack = ctx.createOscillator();
      crack.type = 'sawtooth';
      crack.frequency.setValueAtTime(420, now);
      crack.frequency.exponentialRampToValueAtTime(35, now + 0.18);

      noise.connect(filter);
      filter.connect(env);
      crack.connect(env);
      env.connect(ctx.destination);

      noise.start(now);
      crack.start(now);
      crack.stop(now + 0.2);
    }
  }

  public playEnemyGunshot(distance: number) {
    const ctx = this.ensureContext();
    const gainLevel = this.getEffectiveSfxGain();
    if (!ctx || gainLevel <= 0.001) return;

    const attenuation = Math.max(0.06, Math.min(1, 1 - distance / 130));
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(950 * attenuation + 250, now);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.38 * gainLevel * attenuation, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    noise.connect(filter);
    filter.connect(env);
    env.connect(ctx.destination);
    noise.start(now);
  }

  public playReload() {
    const ctx = this.ensureContext();
    const gainLevel = this.getEffectiveSfxGain();
    if (!ctx || gainLevel <= 0.001) return;

    const now = ctx.currentTime;
    const offsets = [0.05, 0.45, 0.95];
    const freqs = [520, 680, 920];

    offsets.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freqs[idx], now + offset);
      osc.frequency.exponentialRampToValueAtTime(220, now + offset + 0.045);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.18 * gainLevel, now + offset);
      env.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.05);

      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.055);
    });
  }

  public playFootstep(envType: EnvironmentType, isCrouching: boolean, isRunning: boolean) {
    const ctx = this.ensureContext();
    const gainLevel = this.getEffectiveSfxGain();
    if (!ctx || gainLevel <= 0.001) return;

    const now = ctx.currentTime;
    const volumeScale = isCrouching ? 0.06 : isRunning ? 0.22 : 0.13;

    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.08);

    const filter = ctx.createBiquadFilter();
    if (envType === 'snow') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
    } else if (envType === 'desert') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
    } else if (envType === 'industrial') {
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(850, now);
    } else {
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);
    }

    const env = ctx.createGain();
    env.gain.setValueAtTime(volumeScale * gainLevel, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    noise.connect(filter);
    filter.connect(env);
    env.connect(ctx.destination);
    noise.start(now);
  }

  public playExplosion(type: 'frag' | 'flashbang' | 'smoke' | 'breach') {
    const ctx = this.ensureContext();
    const gainLevel = this.getEffectiveSfxGain();
    if (!ctx || gainLevel <= 0.001) return;

    const now = ctx.currentTime;

    if (type === 'smoke') {
      // Sustained canister hiss
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 1.4);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.28 * gainLevel, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 1.35);
      noise.connect(filter);
      filter.connect(env);
      env.connect(ctx.destination);
      noise.start(now);
      return;
    }

    if (type === 'flashbang') {
      // Sharp concussion bang + subtle high ring
      const noise = ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(ctx, 0.45);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.65 * gainLevel, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
      noise.connect(env);
      env.connect(ctx.destination);
      noise.start(now);

      const ring = ctx.createOscillator();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(3100, now);
      const ringGain = ctx.createGain();
      ringGain.gain.setValueAtTime(0.12 * gainLevel, now);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      ring.connect(ringGain);
      ringGain.connect(ctx.destination);
      ring.start(now);
      ring.stop(now + 1.15);
      return;
    }

    // Heavy Frag or Breach explosion
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.95);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.9);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.85 * gainLevel, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.92);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(95, now);
    sub.frequency.exponentialRampToValueAtTime(22, now + 0.55);

    noise.connect(filter);
    filter.connect(env);
    sub.connect(env);
    env.connect(ctx.destination);

    noise.start(now);
    sub.start(now);
    sub.stop(now + 0.6);
  }

  public playHitMarker(isHeadshot: boolean) {
    const ctx = this.ensureContext();
    const gainLevel = this.getEffectiveSfxGain();
    if (!ctx || gainLevel <= 0.001) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHeadshot ? 1650 : 1050, now);
    osc.frequency.exponentialRampToValueAtTime(isHeadshot ? 880 : 420, now + 0.045);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.25 * gainLevel, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playRadioBeep(type: 'intel' | 'alert' | 'objective' | 'heal') {
    const ctx = this.ensureContext();
    const gainLevel = this.getEffectiveSfxGain();
    if (!ctx || gainLevel <= 0.001) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    if (type === 'objective') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.09);
      env.gain.setValueAtTime(0.22 * gainLevel, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (type === 'alert') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.linearRampToValueAtTime(380, now + 0.16);
      env.gain.setValueAtTime(0.18 * gainLevel, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    } else if (type === 'heal') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.22);
      env.gain.setValueAtTime(0.22 * gainLevel, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      env.gain.setValueAtTime(0.14 * gainLevel, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  }

  public startAmbient(envType: EnvironmentType) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopAmbient();

    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    if (envType === 'snow') {
      filter.type = 'bandpass';
      filter.frequency.value = 480;
      filter.Q.value = 2.2;
    } else if (envType === 'desert') {
      filter.type = 'bandpass';
      filter.frequency.value = 340;
      filter.Q.value = 1.5;
    } else if (envType === 'industrial') {
      filter.type = 'lowpass';
      filter.frequency.value = 160;
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 260;
    }

    const gain = ctx.createGain();
    gain.gain.value = this.isMuted ? 0 : this.masterVolume * this.ambientVolume * 0.14;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    this.ambientSource = noise;
    this.ambientGain = gain;
  }

  public stopAmbient() {
    if (this.ambientSource) {
      try {
        (this.ambientSource as AudioBufferSourceNode).stop();
        this.ambientSource.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.ambientSource = null;
    }
    this.ambientGain = null;
  }
}

export const soundEngine = new SoundEngine();
