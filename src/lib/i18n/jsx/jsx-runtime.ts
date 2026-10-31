/**
 * Runtime JSX de la app (ver `babel.config.js`, `jsxImportSource`): delega en
 * el de React y antes traduce los textos visibles al idioma activo. Así los
 * componentes conservan sus textos en español sin cambiar su código.
 */
import {
  Fragment,
  jsx as reactJsx,
  jsxs as reactJsxs,
} from 'react/jsx-runtime';

import { translateElementProps } from '@/lib/i18n/translateElementProps';

type JsxArgs = Parameters<typeof reactJsx>;

export { Fragment };

export function jsx(type: JsxArgs[0], props: JsxArgs[1], key?: JsxArgs[2]) {
  return reactJsx(type, translateElementProps(props), key);
}

export function jsxs(type: JsxArgs[0], props: JsxArgs[1], key?: JsxArgs[2]) {
  return reactJsxs(type, translateElementProps(props), key);
}
