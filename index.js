import "./touch-pad.js";
import "./looper.js";
import html from "./html.js";
import Synth from "./synth.js";

var css = `
.column {
  display: flex;
  flex-direction: column;
  height: 100%;
}

touch-pad {
  flex: 1;
}
`

class SquareWave extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    var style = html("style", css);
    var looper = html("loop-pedal");
    var pad = html("touch-pad");
    this.shadowRoot.append(html("div.column", [ style, looper, pad ]));

    this.noteCallback = this.noteCallback.bind(this);

    pad.addEventListener("paddown", this.noteCallback);
    pad.addEventListener("padup", this.noteCallback);
    pad.addEventListener("padmotion", this.noteCallback);

    var screen = html("div.screen", "START");
    screen.style.position = "fixed";
    screen.style.display = "flex";
    screen.style.alignItems = "center";
    screen.style.top = 0;
    screen.style.left = 0;
    screen.style.width = "100%";
    screen.style.height = "100%";
    screen.style.background = "#FFF9";
    screen.style.justifyContent = "center";
    screen.style.fontFamily = "monospace";
    this.synth = new Synth();
    looper.connect(this.synth.context, this.synth.patchOut, this.synth.patchIn);
    screen.onclick = () => {
      this.synth.context.resume();
      screen.remove();
    }
    this.shadowRoot.append(screen);
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
      this.synth.setFilter(false);
      return;
    }

    var { data } = e;
    var { mode, x, y } = data;

    switch (mode) {
      case "note":
        var f = this.numberToFrequency(y);
        this.synth.setGain(x);
        this.synth.noteOn(f);
        break;

      case "notch":
        this.synth.setFilter("notch", y * 3000 + 100, x * 100 + 10);
        break;

      case "noise":
        var r = (this.numberToFrequency(y) / 440) ** 3;
        this.synth.setGain(x);
        this.synth.noiseOn(y ** 2);
        break;

      case "lowpass":
        this.synth.setFilter("lowpass", y * 3000 + 160, x * 30);
        break;

      case "bandpass":
        this.synth.setFilter("bandpass", y * 2000 + 80, x * 30);
        break;

      case "chorus":
        this.synth.setFilter(false);
        this.synth.setDelay(y * .03, x);
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