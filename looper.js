import html from "./html.js";

var style = `
:host {
  display: block;
  margin-bottom: 16px;
}

.row {
  display: grid;
  grid-template-columns: 1fr 4fr;
  align-items: stretch;
}

.buttons {
  display: flex;
  flex-direction: column;
}

button {
  cursor: pointer;
  background: #EEE;
  border: 1px solid white;
  flex: 1;
  padding: 12px;
}

button:hover {
  background: #CCC;
}

button[aria-pressed="true"] {
  background: black;
  color: white;
}

.sample {
  position: relative;
  flex: 1;
}

canvas {
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  background: #F8F8F8;
}

.playhead {
  position: absolute;
  height: 100%;
  width: 1px;
  background: white;
  top: 0;
  left: 0;
}
`

class LooperElement extends HTMLElement {
  context = null;
  input = null;
  output = null;
  looper = null;
  recording = false;
  playing = true;

  constructor() {
    super();
    var root = this.attachShadow({ mode: "open" });
    root.append(html("style", style));
    this.recButton = html("button", { "aria-pressed": false }, "REC");
    this.playButton = html("button", { "aria-pressed": true }, "PLAY");
    this.canvas = html("canvas", { width: 100, height: 10 });
    this.playhead = html("div.playhead");
    this.context2D = this.canvas.getContext("2d");
    root.append(html("div.row", [
      html("div.buttons", [ this.recButton, this.playButton ]),
      html("div.sample", [this.canvas, this.playhead])
    ]));

    // this.recButton.addEventListener("click", this.toggleRecord.bind(this));
    this.playButton.addEventListener("pointerdown", this.togglePlay.bind(this));
    this.recButton.addEventListener("pointerdown", this.toggleRecord.bind(this));

    window.addEventListener("keydown", this.keyCallback.bind(this));
  }

  async connect(context, input, output) {
    this.context = context;
    this.input = input;
    await context.audioWorklet.addModule("loop-worklet.js");
    this.looper = new AudioWorkletNode(context, "loop-worklet");
    this.output = new GainNode(context);
    this.output.gain.value = .8;
    input.connect(this.looper);
    this.looper.connect(this.output);
    this.looper.port.addEventListener("message", this.onmessage.bind(this));
    this.looper.port.start();
    this.output.connect(output);
    return this.output;
  }

  onmessage(e) {
    var message = e.data;
    if (message.summary) {
      if (!this.context2D) return;
      this.context2D.clearRect(0, 0, this.canvas.width, this.canvas.height);
      var midway = this.canvas.height / 2;
      for (var i = 0; i < message.summary.length; i++) {
        var sample = message.summary[i];
        var [min, max] = sample;
        var y = (max / 2 + .5) * midway;
        var y2 = (min / 2 + .5) * midway + midway;
        var h = y2 - y;
        this.context2D.fillRect(i, y, 1, h);
      }
    }
    if (message.playback) {
      this.playhead.style.left = message.playback * 100 + "%";
    }
  }

  async capturedCallback(e) {
    var data = new Float32Array(await e.data.arrayBuffer());
    console.log(data);
    this.buffer = this.context.createBuffer(1, data.length, this.context.sampleRate);
    this.buffer.copyToChannel(new Float32Array(data), 1, 0);
    if (this.source) {
      this.restart();
    }
  }

  keyCallback(e) {
    if (e.key == "r") {
      this.toggleRecord();
    }

    if (e.key == "p") {
      this.togglePlay();
    }
  }

  toggleRecord(e) {
    if (!this.context) return;
    this.recording = !this.recording;
    this.recButton.setAttribute("aria-pressed", this.recording);
    this.looper.port.postMessage({ record: this.recording });
  }

  togglePlay() {
    if (!this.context) return;
    this.playing = !this.playing;
    this.playButton.setAttribute("aria-pressed", this.playing);
    this.looper.port.postMessage({ play: this.playing });
  }
}

try {
  window.customElements.define("loop-pedal", LooperElement);
} catch (err) {
  // this is fine
}