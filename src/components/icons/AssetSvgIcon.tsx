import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Image } from 'react-native';
import { SvgXml } from 'react-native-svg';

type AssetSvgIconProps = {
  color?: string;
  size: number;
  source: ImageSourcePropType;
};

/** Renderiza y adapta al tema un SVG local empaquetado por Metro. */
export function AssetSvgIcon({ color, size, source }: AssetSvgIconProps) {
  const uri = Image.resolveAssetSource(source).uri;
  const [xml, setXml] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void fetch(uri)
      .then((response) => response.text())
      .then((asset) => {
        if (isMounted) {
          setXml(asset.replaceAll('#171717', 'currentColor'));
        }
      })
      .catch(() => {
        if (isMounted) {
          setXml(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [uri]);

  return <SvgXml color={color} height={size} width={size} xml={xml} />;
}
