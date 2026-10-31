import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { NativeAd } from 'react-native-google-mobile-ads';

import { Text } from '@/components/ui/Text/Text';
import { loadHomeNativeAd } from '@/services/ads/mobileAds';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/useTheme';

type NativeAdViews = Pick<
  typeof import('react-native-google-mobile-ads'),
  'NativeAdView' | 'NativeAsset' | 'NativeAssetType' | 'NativeMediaView'
>;

function loadNativeAdViews(): NativeAdViews {
  // Solo se llega aquí con un anuncio cargado, así que el módulo nativo existe.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-google-mobile-ads') as NativeAdViews;
}

/**
 * Tarjeta de anuncio nativo de Inicio. No ocupa espacio hasta que hay un
 * anuncio cargado y desaparece si AdMob no está disponible o falla.
 */
export function HomeNativeAdCard() {
  const { colors } = useTheme();
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    let active = true;
    let loadedAd: NativeAd | null = null;
    void loadHomeNativeAd().then((ad) => {
      if (!active) {
        ad?.destroy();
        return;
      }
      loadedAd = ad;
      setNativeAd(ad);
    });
    return () => {
      active = false;
      loadedAd?.destroy();
    };
  }, []);

  if (!nativeAd) return null;

  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } =
    loadNativeAdViews();

  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      testID="home-native-ad"
    >
      <View style={styles.header}>
        {nativeAd.icon ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        ) : null}
        <View style={styles.headerText}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text numberOfLines={1} variant="bodyStrong">
              {nativeAd.headline}
            </Text>
          </NativeAsset>
          {nativeAd.advertiser ? (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text numberOfLines={1} tone="secondary" variant="caption">
                {nativeAd.advertiser}
              </Text>
            </NativeAsset>
          ) : null}
        </View>
        <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
          <Text tone="secondary" variant="overline">
            Anuncio
          </Text>
        </View>
      </View>
      {nativeAd.mediaContent ? (
        <NativeMediaView resizeMode="cover" style={styles.media} />
      ) : null}
      <NativeAsset assetType={NativeAssetType.BODY}>
        <Text numberOfLines={2} tone="secondary" variant="footnote">
          {nativeAd.body}
        </Text>
      </NativeAsset>
      {nativeAd.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text
            align="center"
            style={[styles.cta, { backgroundColor: colors.brandSoft }]}
            variant="label"
          >
            {nativeAd.callToAction}
          </Text>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  headerText: { flex: 1 },
  icon: { borderRadius: radii.sm, height: 40, width: 40 },
  badge: {
    borderRadius: radii.round,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  media: { borderRadius: radii.sm, overflow: 'hidden', width: '100%' },
  cta: {
    borderRadius: radii.round,
    overflow: 'hidden',
    paddingVertical: spacing.sm,
  },
});
