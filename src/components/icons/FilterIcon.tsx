import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/theme/useTheme';

type FilterIconProps = {
  size: number;
};

export function FilterIcon({ size }: FilterIconProps) {
  const { colors } = useTheme();

  return (
    <Svg
      color={colors.textPrimary}
      height={size * (19 / 21)}
      testID="activity-filter-icon"
      viewBox="0 0 21 19"
      width={size}
    >
      <Path
        d="M12.4502 10.2402C14.2169 10.2403 15.7129 11.4002 16.2178 13H20C20.5523 13 21 13.4477 21 14C21 14.5523 20.5523 15 20 15H16.3164C15.9428 16.793 14.3541 18.1405 12.4502 18.1406C10.2687 18.1406 8.50011 16.3719 8.5 14.1904C8.5 12.0089 10.2687 10.2402 12.4502 10.2402ZM6 13C6.55228 13 7 13.4477 7 14C7 14.5523 6.55228 15 6 15H1C0.447715 15 0 14.5523 0 14C0 13.4477 0.447715 13 1 13H6ZM8.4502 0C10.6316 0.000105396 12.4004 1.76874 12.4004 3.9502C12.4003 6.13157 10.6316 7.90029 8.4502 7.90039C6.63228 7.90039 5.10149 6.67179 4.6416 5H1C0.447715 5 0 4.55228 0 4C0 3.44772 0.447715 3 1 3H4.61523C5.04057 1.27737 6.5962 0 8.4502 0ZM20 3C20.5523 3 21 3.44772 21 4C21 4.55228 20.5523 5 20 5H15C14.4477 5 14 4.55228 14 4C14 3.44772 14.4477 3 15 3H20Z"
        fill="currentColor"
      />
    </Svg>
  );
}
