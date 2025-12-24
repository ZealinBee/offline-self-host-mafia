'use client';

import { Howl, Howler } from 'howler';

class AudioManager {
  private sounds: Record<string, Howl> = {};
  private ambient: Howl | null = null;
  private _muted: boolean = false;
  private _initialized: boolean = false;

  get muted(): boolean {
    return this._muted;
  }

  init() {
    if (this._initialized) return;
    this._initialized = true;

    // Pre-load sounds (these will be placeholder paths - users can add their own)
    this.sounds.gunshot = new Howl({
      src: ['/sounds/gunshot.mp3', '/sounds/gunshot.wav'],
      volume: 0.5,
    });

    this.sounds.vote = new Howl({
      src: ['/sounds/vote.mp3', '/sounds/vote.wav'],
      volume: 0.4,
    });

    this.sounds.reveal = new Howl({
      src: ['/sounds/reveal.mp3', '/sounds/reveal.wav'],
      volume: 0.5,
    });

    this.sounds.suspense = new Howl({
      src: ['/sounds/suspense.mp3', '/sounds/suspense.wav'],
      volume: 0.3,
    });

    this.sounds.win = new Howl({
      src: ['/sounds/win.mp3', '/sounds/win.wav'],
      volume: 0.5,
    });

    this.sounds.lose = new Howl({
      src: ['/sounds/lose.mp3', '/sounds/lose.wav'],
      volume: 0.5,
    });

    this.sounds.click = new Howl({
      src: ['/sounds/click.mp3', '/sounds/click.wav'],
      volume: 0.3,
    });

    this.ambient = new Howl({
      src: ['/sounds/ambient.mp3', '/sounds/ambient.wav'],
      volume: 0.2,
      loop: true,
    });
  }

  play(sound: string) {
    if (this._muted) return;
    this.sounds[sound]?.play();
  }

  startAmbient() {
    if (this._muted) return;
    this.ambient?.play();
  }

  stopAmbient() {
    this.ambient?.stop();
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    Howler.mute(this._muted);
    return this._muted;
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    Howler.mute(muted);
  }
}

export const audioManager = new AudioManager();
