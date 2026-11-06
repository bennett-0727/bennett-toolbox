import { getLanguage, translate } from "./messages";

const TEXT_PROPS = ["title", "placeholder", "alt", "aria-label", "aria-description"];
const SKIP_TYPES = new Set(["pre", "code", "textarea"]);

function translateChildren(children: any): any {
  if (typeof children === "string") {
    return translate(getLanguage(), children);
  }
  if (Array.isArray(children)) {
    const flat = children.every(
      (child) => typeof child === "string" || typeof child === "number",
    );
    if (flat) {
      const text = children.map(String).join("");
      const translated = translate(getLanguage(), text);
      if (translated !== text) return translated;
    }
    let changed = false;
    const next = children.map((child) => {
      if (typeof child === "string") {
        const translated = translate(getLanguage(), child);
        if (translated !== child) {
          changed = true;
          return translated;
        }
      }
      return child;
    });
    return changed ? next : children;
  }
  return children;
}

export function translateProps(type: any, props: any) {
  if (!props) return props;
  let changed = false;
  const next = { ...props };

  if (!SKIP_TYPES.has(type) && props.children !== undefined) {
    const children = translateChildren(props.children);
    if (children !== props.children) {
      next.children = children;
      changed = true;
    }
  }

  for (const key of TEXT_PROPS) {
    if (typeof props[key] === "string") {
      const translated = translate(getLanguage(), props[key]);
      if (translated !== props[key]) {
        next[key] = translated;
        changed = true;
      }
    }
  }

  return changed ? next : props;
}
