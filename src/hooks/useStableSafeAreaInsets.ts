import { Platform } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Conserva márgenes seguros desde el primer render, incluso dentro de un Modal.
 * Algunos modales nativos informan temporalmente cero antes de terminar de abrirse.
 */
export function useStableSafeAreaInsets() {
  const insets = useSafeAreaInsets();
  const initial = initialWindowMetrics?.insets;
  const measuredTop = Math.max(insets.top, initial?.top ?? 0);

  return {
    top: measuredTop > 0 ? measuredTop : Platform.OS === 'ios' ? 44 : 0,
    right: Math.max(insets.right, initial?.right ?? 0),
    bottom: Math.max(insets.bottom, initial?.bottom ?? 0),
    left: Math.max(insets.left, initial?.left ?? 0),
  };
}
