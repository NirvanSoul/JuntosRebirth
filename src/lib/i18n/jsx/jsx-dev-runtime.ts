/** Variante de desarrollo del runtime JSX traducido (ver `jsx-runtime.ts`). */
import { Fragment, jsxDEV as reactJsxDEV } from 'react/jsx-dev-runtime';

import { translateElementProps } from '@/lib/i18n/translateElementProps';

type JsxDevArgs = Parameters<typeof reactJsxDEV>;

export { Fragment };

export function jsxDEV(
  type: JsxDevArgs[0],
  props: JsxDevArgs[1],
  key: JsxDevArgs[2],
  isStatic: JsxDevArgs[3],
  source: JsxDevArgs[4],
  self: JsxDevArgs[5],
) {
  return reactJsxDEV(
    type,
    translateElementProps(props),
    key,
    isStatic,
    source,
    self,
  );
}
