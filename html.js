export default function html(name, attrs = {}, children = []) {
  var [tag, ...classes] = name.split(".");
  var element = document.createElement(tag);
  for (var c of classes) element.classList.add(c);

  if (typeof attrs == "string" || attrs instanceof Array) {
    children = attrs;
    attrs = {};
  }

  for (var k in attrs) element.setAttribute(k, attrs[k]);
  if (typeof children == "string") children = [children];
  element.append(...children);
  return element;
}