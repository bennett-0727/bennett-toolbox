import { Fragment, jsx as baseJsx, jsxs as baseJsxs } from "react/jsx-runtime";
import { translateProps } from "./runtime";

export { Fragment };

export function jsx(type: any, props: any, key?: any) {
  return baseJsx(type, translateProps(type, props), key);
}

export function jsxs(type: any, props: any, key?: any) {
  return baseJsxs(type, translateProps(type, props), key);
}
