import html from "./html.js";

var style = `
.grid {
  font-family: monospace;
  font-weight: bold;
  text-transform: uppercase;
  display: grid;
  grid-template-columns: 1fr 4fr;
  aspect-ratio: 5 / 4;
  min-height: 0;
}

canvas {
  background: #F8F8F8;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.modes {
  display: flex;
  flex-direction: column;
}

.toggle { flex: 1 }

.toggle label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  background: #EEE;
}

.toggle input:checked + label {
  background: black;
  color: white;
}

input {
  position: absolute;
  opacity: 0;
  left: -1000px;
  width: 1px;
  height: 1px;
}
`;

var modes = {
  note: ["gain", "frequency"],
  noise: ["gain", "rate"],
  lowpass: ["q", "frequency"],
  chorus: ["depth", "rate"],
  delay: ["depth", "time"]
}

class TouchPad extends HTMLElement {
  mode = "note";

  constructor() {
    super();
    var root = this.attachShadow({ mode: "open" });
    this.canvas = html("canvas", { width: 255, height: 255 });
    var contents = html("div.grid", [
      html("div.modes", Object.keys(modes).map(d => html("div.toggle", [
        html("input", { id: "toggle-" + d, name: "vertical", type: "radio", value: d }),
        html("label", { for: "toggle-" + d }, d)
      ]))),
      this.canvas
    ]);
    root.append(html("style", style));
    root.append(contents);

    this.addEventListener("input", this.toggledCallback.bind(this));
    var p = this.pointerEventCallback = this.pointerEventCallback.bind(this);
    this.canvas.addEventListener("pointerdown", p);
    this.canvas.addEventListener("pointerup", p);
    this.canvas.addEventListener("pointermove", p);

    this.context = this.canvas.getContext("2d");

    this.shadowRoot.querySelector(`#toggle-note`).checked = true;
  }

  toggledCallback(e) {
    var target = e.originalTarget || e.path[0];
    this.mode = target.value;
  }

  pointerEventCallback(e) {
    if (e.type == "pointerup") {
      this.dispatch("padup");
    }

    if (e.buttons == 0) return;

    var { canvas, context } = this;
    var bounds = canvas.getBoundingClientRect();
    // get current coordinates
    var x = e.clientX - bounds.left;
    var y = e.clientY - bounds.top;
    x = x / bounds.width;
    y = y / bounds.height;

    // draw the lines
    var dx = (x * this.canvas.width) | 0;
    var dy = (y * this.canvas.height) | 0;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillRect(dx, 0, 1, this.canvas.height);
    this.context.fillRect(0, dy, this.canvas.width, 1);
    this.context.fillRect(dx - 8, dy - 8, 16, 16);
    this.context.clearRect(dx - 8, dy - 4, 16, 8);
    this.context.clearRect(dx - 4, dy - 8, 8, 16);
    this.context.clearRect(dx - 7, dy - 7, 14, 14);

    // dispatch combined event with either noteon or paramchange type
    var { mode } = this;
    var [xParam, yParam] = modes[mode];
    y = 1 - y;
    var data = {
      mode,
      xParam, x,
      yParam, y
    }
    this.dispatch(e.type == "pointerdown" ? "paddown" : "padmotion", data);
  }

  dispatch(type, data) {
    var event = new CustomEvent(type, { bubbles: true, composed: true });
    event.data = data;
    this.dispatchEvent(event);
  }
}

try {
  window.customElements.define("touch-pad", TouchPad);
} catch (err) {
  // swallow errors
}