/**
 * Babel recurre a `createElement` del `jsxImportSource` cuando un elemento
 * declara `key` después de un spread de props. Se traduce igual que el resto.
 */
import { createElement as reactCreateElement } from 'react';

import { translateElementProps } from '@/lib/i18n/translateElementProps';
import { translateText } from '@/lib/i18n/translateText';

export function createElement(
  ...[type, props, ...children]: Parameters<typeof reactCreateElement>
) {
  return reactCreateElement(
    type,
    translateElementProps(props),
    ...children.map((child) =>
      typeof child === 'string' ? translateText(child) : child,
    ),
  );
}
