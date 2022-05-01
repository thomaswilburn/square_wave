export default class Synth {
  constructor() {
    this.context = new AudioContext();

    var noiseSamples = this.context.sampleRate * 3;
    var noise = new Array(noiseSamples).fill(0);
    for (var i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;
    this.noiseBuffer = new AudioBuffer({
      length: noiseSamples,
      sampleRate: this.context.sampleRate
    });
    this.noiseBuffer.copyToChannel(new Float32Array(noise), 0);

    this.amp = new GainNode(this.context);
    this.eq = new BiquadFilterNode(this.context, { Q: 1 });
    this.voice = null;
    this.amp.connect(this.eq);
    this.eq.connect(this.context.destination);
    this.echoBox = new Array(5).fill(0).map(_ => new DelayNode(this.context, { maxDelayTime: 20 }));
    for (var echo of this.echoBox) {
      this.amp.connect(echo);
      echo.amp = new GainNode(this.context);
      echo.connect(echo.amp);
      echo.amp.connect(this.eq);
    }

    this.patchOut = new GainNode(this.context);
    this.patchIn = new GainNode(this.context);

    this.eq.connect(this.patchOut);
    this.patchIn.connect(this.eq);

    this.setDelay(0, 0);
    this.setFilter(false);
    this.setGain(1);
  }

  noteOn(frequency) {
    if (this.voice) {
      return this.voice.frequency.value = frequency;
    }
    var type = "square";
    this.voice = new OscillatorNode(this.context, { frequency, type });
    this.voice.connect(this.amp);
    this.voice.start();
  }

  noteOff() {
    if (!this.voice) return;
    this.voice.stop();
    this.voice = null;
  }

  noiseOn(playbackRate) {
    if (this.noise) {
      return this.noise.playbackRate.value = playbackRate;
    }
    var buffer = this.noiseBuffer;
    this.noise = new AudioBufferSourceNode(this.context, { buffer, loop: true, playbackRate });
    this.noise.connect(this.amp);
    this.noise.start();
  }

  noiseOff() {
    if (!this.noise) return;
    this.noise.stop();
    this.noise = null;
  }

  setFilter(type, frequency, q) {
    if (type == false) {
      this.eq.type = "lowpass";
      this.eq.frequency.value = 10000;
      this.eq.Q.value = 0;
      return;
    }
    this.eq.type = type;
    this.eq.frequency.value = frequency;
    this.eq.Q.value = q;
    this.eq.gain.value = 2;
  }

  setGain(n) {
    this.amp.gain.value = n;
  }

  setDelay(time, depth) {
    var count = (depth * (this.echoBox.length + 1)) | 0;
    for (var i = 0; i < this.echoBox.length; i++) {
      var echo = this.echoBox[i];
      var gain = i < count ? 1 - (i / this.echoBox.length) : 0;
      var t = time * (i + 1);
      echo.amp.gain.value = gain;
      echo.delayTime.value = t;
    }
  }

}