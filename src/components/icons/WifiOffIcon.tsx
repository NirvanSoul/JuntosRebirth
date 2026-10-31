import Svg, { Path } from 'react-native-svg';

type WifiOffIconProps = {
  color: string;
  size: number;
  testID?: string;
};

/** Wifi tachado (trazo de Feather, MIT): Ionicons no incluye esta variante. */
export function WifiOffIcon({ color, size, testID }: WifiOffIconProps) {
  return (
    <Svg
      fill="none"
      height={size}
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      testID={testID}
      viewBox="0 0 24 24"
      width={size}
    >
      <Path d="M1 1l22 22" />
      <Path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <Path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <Path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <Path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <Path d="M12 20h.01" />
    </Svg>
  );
}
