import { Fragment, jsxDEV as baseJsxDEV } from "react/jsx-dev-runtime";
import { translateProps } from "./runtime";

export { Fragment };

export function jsxDEV(
  type: any,
  props: any,
  key: any,
  isStaticChildren: boolean,
  source: any,
  self: any,
) {
  return baseJsxDEV(type, translateProps(type, props), key, isStaticChildren, source, self);
}
