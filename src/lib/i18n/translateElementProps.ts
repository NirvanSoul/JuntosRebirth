import { getAppLanguage } from '@/lib/i18n/i18n';
import { translateText } from '@/lib/i18n/translateText';

/** Props que llegan a la pantalla o al lector de pantalla como texto. */
const textProps = [
  'accessibilityLabel',
  'accessibilityHint',
  'placeholder',
] as const;

const isPrimitiveText = (value: unknown): value is string | number =>
  typeof value === 'string' || typeof value === 'number';

function translateChildren(children: unknown): unknown {
  if (typeof children === 'string') return translateText(children);
  if (!Array.isArray(children)) return children;

  // `Hola {nombre}, ¿qué tal?` llega troceado: se traduce la frase entera.
  // Sigue siendo un array porque `jsxs` exige hijos estáticos en array.
  if (
    children.every(isPrimitiveText) &&
    children.some((c) => typeof c === 'string')
  ) {
    const sentence = children.join('');
    const translated = translateText(sentence);
    return translated === sentence ? children : [translated];
  }

  let changed = false;
  const next = children.map((child) => {
    if (typeof child !== 'string') return child;
    const translated = translateText(child);
    if (translated !== child) changed = true;
    return translated;
  });
  return changed ? next : children;
}

/**
 * Traduce los textos visibles de un elemento JSX. En español devuelve las
 * mismas props sin copiarlas, para no tener coste en el idioma de referencia.
 */
export function translateElementProps<P>(input: P): P {
  if (!input || typeof input !== 'object' || getAppLanguage() === 'es') {
    return input;
  }
  const props = input as Record<string, unknown>;

  let next: Record<string, unknown> | null = null;
  const set = (key: string, value: unknown) => {
    next ??= { ...props };
    next[key] = value;
  };

  if ('children' in props) {
    const children = translateChildren(props.children);
    if (children !== props.children) set('children', children);
  }
  for (const key of textProps) {
    const value = props[key];
    if (typeof value === 'string') {
      const translated = translateText(value);
      if (translated !== value) set(key, translated);
    }
  }
  return (next ?? props) as P;
}
