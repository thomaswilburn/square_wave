class LoopWorklet extends AudioWorkletProcessor {
  loop = null;
  buffer = null;
  currentSample = 0;
  recording = false;
  playing = true;

  constructor() {
    super();
    this.port.addEventListener("message", this.onmessage.bind(this));
    this.port.start();
    this.process = this.process.bind(this);
  }

  onmessage(e) {
    var message = e.data;
    if ("record" in message) {
      this.recording = message.record;
      if (message.record) {
        // reset buffer
        this.buffer = [];
      } else {
        // copy the buffer to the loop and reset playback
        this.loop = this.buffer;
        this.buffer = [];
        this.currentSample = 0;
        this.summarize();
      }
    }
    if ("play" in message) {
      this.playing = message.play;
    }
  }

  summarize() {
    var summary = [];
    var slice = (this.loop.length / 100) | 0;
    for (var i = 0; i < this.loop.length; i += slice) {
      var chunk = this.loop.slice(i, i + slice);
      var min = Math.min(...chunk);
      var max = Math.max(...chunk);
      summary.push([min, max]);
    }
    this.port.postMessage({ summary });
  }

  process(inputs, outputs, parameters) {
    // console.log("process");
    var [ input ] = inputs;
    if (this.recording) {
      var [ channel ] = input;
      this.buffer.push(...channel);
    }
    var [ output ] = outputs;
    if (this.loop && this.playing) for (var channel of output) {
      for (var i = 0; i < channel.length; i++) {
        channel[i] = this.loop[this.currentSample++];
        if (this.currentSample >= this.loop.length) this.currentSample = 0;
      }
      this.port.postMessage({ playback: this.currentSample / this.loop.length });
    }
    return true;
  }
}

registerProcessor("loop-worklet", LoopWorklet);