/**
 * A very small element builder.
 *
 * Everything is built with `textContent`, never `innerHTML`: a CSV row can
 * carry an account holder's name, and nothing from the file is ever parsed as
 * markup.
 */

type Attributes = Record<string, string | number | boolean | undefined>;
export type Child = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  applyAttributes(node, attributes);
  append(node, children);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  children: Child[] = [],
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  applyAttributes(node, attributes);
  append(node, children);
  return node;
}

function applyAttributes(node: Element, attributes: Attributes): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
}

function append(node: Element, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** Remove every child, so a container can be re-rendered from scratch. */
export function clear(node: Element): void {
  while (node.firstChild) node.firstChild.remove();
}

/** `el('div', …)` for text nodes that need no wrapper of their own. */
export function text(value: string): Text {
  return document.createTextNode(value);
}
