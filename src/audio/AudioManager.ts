// Audio Manager - handles all game sounds

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private masterVolume = 0.5;
  private sfxVolume = 0.7;
  private musicVolume = 0.3;

  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Generate procedural sounds
    this.generateSounds();
  }

  private generateSounds(): void {
    if (!this.audioContext) return;

    // Footstep sounds
    this.sounds.set('footstep_grass', this.createNoise(0.05, 'brown', 80));
    this.sounds.set('footstep_wood', this.createTone(200, 0.08, 'square'));
    this.sounds.set('footstep_stone', this.createTone(300, 0.06, 'square'));
    
    // Transform
    this.sounds.set('transform', this.createTransformSound());
    this.sounds.set('untransform', this.createUntransformSound());
    
    // Hit/Damage
    this.sounds.set('hit_wood', this.createHitSound(150));
    this.sounds.set('hit_metal', this.createHitSound(300));
    this.sounds.set('hit_flesh', this.createHitSound(100));
    
    // UI
    this.sounds.set('ui_click', this.createUISound(800, 0.05));
    this.sounds.set('ui_hover', this.createUISound(600, 0.03));
    this.sounds.set('ui_error', this.createUISound(200, 0.1, 'sawtooth'));
    
    // Game events
    this.sounds.set('phase_start', this.createPhaseSound());
    this.sounds.set('phase_end', this.createPhaseSound(true));
    this.sounds.set('win', this.createWinSound());
    this.sounds.set('lose', this.createLoseSound());
    this.sounds.set('timer_warning', this.createTimerWarning());
    
    // Ambience
    this.sounds.set('ambience_forest', this.createAmbience('forest'));
    this.sounds.set('ambience_indoor', this.createAmbience('indoor'));
  }

  private createNoise(duration: number, type: 'white' | 'pink' | 'brown', frequency: number): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      
      if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      } else if (type === 'brown') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = data[i];
      } else {
        data[i] = white;
      }
      
      // Apply frequency filter (simple)
      data[i] *= Math.sin(2 * Math.PI * frequency * i / sampleRate);
    }
    
    return buffer;
  }

  private createTone(frequency: number, duration: number, type: OscillatorType = 'sine'): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 10);
      let value = 0;
      
      switch (type) {
        case 'sine':
          value = Math.sin(2 * Math.PI * frequency * t);
          break;
        case 'square':
          value = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1;
          break;
        case 'sawtooth':
          value = 2 * (t * frequency - Math.floor(0.5 + t * frequency));
          break;
      }
      
      data[i] = value * envelope * 0.3;
    }
    
    return buffer;
  }

  private createTransformSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const ctx = this.audioContext;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / ctx.sampleRate;
      const freq = 400 + 400 * (1 - t / 0.3);
      const env = Math.exp(-t * 8);
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.2;
    }
    return buffer;
  }

  private createUntransformSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const ctx = this.audioContext;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / ctx.sampleRate;
      const freq = 800 - 400 * (t / 0.2);
      const env = Math.exp(-t * 10);
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.15;
    }
    return buffer;
  }

  private createHitSound(baseFreq: number): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const ctx = this.audioContext;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / ctx.sampleRate;
      const freq = baseFreq * (1 + Math.random() * 0.5);
      const env = Math.exp(-t * 30);
      data[i] = (Math.sin(2 * Math.PI * freq * t) + Math.random() * 0.5 - 0.25) * env * 0.2;
    }
    return buffer;
  }

  private createUISound(freq: number, dur: number, type: OscillatorType = 'sine'): AudioBuffer {
    return this.createTone(freq, dur, type);
  }

  private createPhaseSound(isEnd: boolean = false): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const ctx = this.audioContext;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    const notes = isEnd ? [523.25, 392, 329.63] : [329.63, 392, 523.25];
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / ctx.sampleRate;
      let value = 0;
      notes.forEach((note, idx) => {
        const noteStart = idx * 0.15;
        if (t >= noteStart && t < noteStart + 0.2) {
          const noteT = t - noteStart;
          const env = Math.exp(-noteT * 5);
          value += Math.sin(2 * Math.PI * note * noteT) * env * 0.15;
        }
      });
      data[i] = value;
    }
    return buffer;
  }

  private createWinSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const ctx = this.audioContext;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / ctx.sampleRate;
      let value = 0;
      notes.forEach((note, idx) => {
        const noteStart = idx * 0.25;
        if (t >= noteStart && t < noteStart + 0.4) {
          const noteT = t - noteStart;
          const env = Math.exp(-noteT * 3);
          value += Math.sin(2 * Math.PI * note * noteT) * env * 0.12;
        }
      });
      data[i] = value;
    }
    return buffer;
  }

  private createLoseSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const ctx = this.audioContext;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.0, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / ctx.sampleRate;
      const freq = 300 - 200 * t;
      const env = Math.exp(-t * 2);
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.2;
    }
    return buffer;
  }

  private createTimerWarning(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const ctx = this.audioContext;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / ctx.sampleRate;
      const freq = 1000;
      const env = Math.exp(-t * 10);
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.15;
    }
    return buffer;
  }

  private createAmbience(type: 'forest' | 'indoor'): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const ctx = this.audioContext;
    const duration = 30;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / ctx.sampleRate;
      let value = 0;
      
      if (type === 'forest') {
        // Wind + occasional bird
        value += (Math.random() - 0.5) * 0.02 * Math.sin(t * 0.1);
        if (Math.random() < 0.0001) {
          value += Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-(t % 1) * 10) * 0.1;
        }
      } else {
        // Hum + occasional creak
        value += Math.sin(2 * Math.PI * 60 * t) * 0.01;
        if (Math.random() < 0.00005) {
          value += (Math.random() - 0.5) * 0.1 * Math.exp(-(t % 0.5) * 5);
        }
      }
      
      data[i] = value;
    }
    return buffer;
  }

  play(soundName: string, options: { volume?: number; loop?: boolean; pitch?: number } = {}): AudioBufferSourceNode | null {
    if (!this.audioContext) return null;
    
    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`Sound not found: ${soundName}`);
      return null;
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop || false;
    source.playbackRate.value = options.pitch || 1;
    
    const gain = this.audioContext.createGain();
    gain.gain.value = (options.volume || 1) * this.sfxVolume * this.masterVolume;
    
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    
    source.start(0);
    
    if (!options.loop) {
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
    }
    
    return source;
  }

  playLoop(soundName: string, volume: number = 1): AudioBufferSourceNode | null {
    return this.play(soundName, { volume, loop: true });
  }

  stopLoop(source: AudioBufferSourceNode | null): void {
    if (source) {
      source.stop();
      source.disconnect();
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = clamp(volume, 0, 1);
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = clamp(volume, 0, 1);
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = clamp(volume, 0, 1);
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}