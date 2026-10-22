export const motion = {
  loadingBarDuration: 700,
  loadingBarCrawlDuration: 4000,
  loadingCompletionDuration: 160,
  loadingTransitionDuration: 260,
  /** Transición ligera de icono y píldora al cambiar la pestaña activa. */
  mainTabSelectionDuration: 180,
  /** Muelle de la píldora que se desliza hasta el espacio elegido. */
  spaceSelectionSpring: {
    damping: 22,
    mass: 0.7,
    stiffness: 260,
  },
  /** Cambio de color del texto de la fila mientras llega la píldora. */
  spaceSelectionContentDuration: 160,
  /** Lo que tarda la píldora en asentarse; entonces se cierra el menú. */
  spaceSelectionDuration: 260,
  startupRevealDuration: 480,
  startupRevealStagger: 36,
  startupRevealMaxDelay: 216,
  startupRevealTravel: 16,
  categoryPageIndicatorSpring: {
    dampingRatio: 0.62,
    duration: 680,
  },
  calendarResetFadeInDuration: 300,
  calendarResetFadeOutDuration: 200,
  calendarMonthNavigationFadeInDuration: 160,
  calendarMonthNavigationFadeOutDuration: 100,
  compactPreviewMarqueeDelay: 1200,
  compactPreviewMarqueeMinimumDuration: 2400,
  compactPreviewMarqueePixelsPerSecond: 24,
  categoryAmountTransitionDuration: 350,
  categoryAmountSwitchInterval: 8000,
  calendarContentMaxDelay: 120,
  calendarContentStagger: 12,
  /** Cruce vertical de «entregas» y «recibes» al cambiar de compra a venta. */
  currencySwapDuration: 260,
  /** Media vuelta de la flecha de intercambio: sale rápida y frena al final. */
  currencySwapIconDuration: 200,
  categoryViewTransitionDuration: 180,
  categoryViewTransitionTravel: 28,
  chartContentEnterDelay: 300,
  chartContentExitDuration: 300,
  chartContentFadeDuration: 180,
  chartContentStagger: 64,
  chartContentTravel: 56,
  chartModeSpring: {
    damping: 16,
    mass: 0.68,
    stiffness: 155,
  },
  chartRevealDuration: 620,
  chartRevealStagger: 55,
  disclosureExitDuration: 160,
  disclosureItemStagger: 56,
  disclosureRevealDuration: 240,
  floatingButtonVisibilityDuration: 280,
  inputPulseDuration: 48,
  authSuccessAutoContinueDelay: 1600,
  stepProgressFillDuration: 540,
  stickyHeaderTransitionDuration: 240,
  stickySummaryPulseDuration: 90,
  transactionTypeSpring: {
    damping: 14,
    mass: 0.55,
    stiffness: 260,
  },
  toastTransitionDuration: 260,
  toastVisibleDuration: 3200,
  /** Un aviso con acción espera a que la persona pueda leerlo y pulsar. */
  toastActionVisibleDuration: 8000,
  disclosureSpring: {
    damping: 18,
    mass: 0.72,
    stiffness: 170,
  },
  /**
   * Muelle de las hojas en iOS: el mismo de `@gorhom/bottom-sheet`, pero se da
   * por terminado cuando le falta ~1 px. Con el umbral por defecto de
   * Reanimated, `onDismiss` llegaba ~680 ms después de cerrar, cuando la hoja
   * llevaba ~200 ms sin moverse de forma visible, y cada hoja encadenada
   * esperaba ese tiempo. Android usa el `timing` de 250 ms de la librería.
   */
  sheetSpring: {
    damping: 500,
    energyThreshold: 1e-5,
    mass: 3,
    overshootClamping: true,
    stiffness: 1000,
  },
} as const;
