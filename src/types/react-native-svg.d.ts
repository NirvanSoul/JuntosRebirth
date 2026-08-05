import 'react-native-svg';

declare module 'react-native-svg' {
  /**
   * Phosphor acepta `className` como prop opcional del SVG. La versión de
   * `react-native-svg` fijada por Expo SDK 54 aún no la declara, aunque la prop
   * se reenvía de forma segura en tiempo de ejecución.
   */
  interface SvgProps {
    className?: string;
  }
}
