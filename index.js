import "./touch-pad.js";
import "./looper.js";
import html from "./html.js";
import Synth from "./synth.js";

class SquareWave extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    var looper = html("loop-pedal");
    var pad = html("touch-pad");
    this.shadowRoot.append(looper, pad);

    this.noteCallback = this.noteCallback.bind(this);

    pad.addEventListener("paddown", this.noteCallback);
    pad.addEventListener("padup", this.noteCallback);
    pad.addEventListener("padmotion", this.noteCallback);

    this.synth = new Synth();
    looper.connect(this.synth.context, this.synth.patchOut, this.synth.patchIn);
  }

  numberToFrequency(n) {
    var key = Math.floor(n * 24) + 69;
    return this.midiToFrequency(key);
  }

  // notes are expressed as MIDI
  midiToFrequency(note) {
    var semitones = note - (69 + 24);
    var frequency = Math.pow(2, semitones/12) * 440;
    return frequency;
  }

  noteCallback(e) {
    if (e.type == "padup") {
      this.synth.noteOff();
      this.synth.noiseOff();
      return;
    }

    var { data } = e;
    var { mode, x, y } = data;

    switch (mode) {
      case "note":
        var f = this.numberToFrequency(y);
        this.synth.noteOn(f);
        this.synth.setGain(x);
        break;

      case "notch":
        this.synth.setFilter("notch", y * 3000 + 100, x * 100 + 10);
        break;

      case "noise":
        var r = (this.numberToFrequency(y) / 440) ** 3;
        this.synth.noiseOn(r);
        this.synth.setGain(x);
        break;

      case "lowpass":
        this.synth.setFilter("lowpass", y * 5000 + 160, x * 10);
        break;

      case "chorus":
        this.synth.setFilter(false);
        this.synth.setDelay(y * .05, x);
        break;

      case "delay":
        this.synth.setFilter(false);
        this.synth.setDelay(y * 3, x);
        break;
    }
    
  }
}

try {
  window.customElements.define("square-wave", SquareWave);
} catch (err) {
  // this is fine
}