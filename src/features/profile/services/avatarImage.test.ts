import {
  AvatarError,
  avatarMaxBytes,
  avatarQualitiesBelow,
  avatarQualitySteps,
  avatarTargetDimension,
  avatarTargetMaxBytes,
  buildAvatarCacheFileName,
  resolveAvatarCrop,
  resolveAvatarOutputDimension,
  validateAvatarSource,
} from '@/features/profile/services/avatarImage';

describe('resolveAvatarCrop', () => {
  it('recorta el centro de una foto apaisada', () => {
    // 1200x800 debe dar 800x800 tomados del centro, no un estirado a 512x512.
    expect(resolveAvatarCrop(1200, 800)).toEqual({
      originX: 200,
      originY: 0,
      width: 800,
      height: 800,
    });
  });

  it('recorta el centro de una foto vertical', () => {
    expect(resolveAvatarCrop(800, 1200)).toEqual({
      originX: 0,
      originY: 200,
      width: 800,
      height: 800,
    });
  });

  it('no desplaza ni deforma una foto ya cuadrada', () => {
    expect(resolveAvatarCrop(900, 900)).toEqual({
      originX: 0,
      originY: 0,
      width: 900,
      height: 900,
    });
  });

  it('produce siempre un rectángulo cuadrado dentro de la imagen', () => {
    for (const [width, height] of [
      [1023, 64],
      [64, 1023],
      [513, 512],
      [4032, 3024],
    ]) {
      const crop = resolveAvatarCrop(width!, height!);
      expect(crop.width).toBe(crop.height);
      expect(crop.originX + crop.width).toBeLessThanOrEqual(width!);
      expect(crop.originY + crop.height).toBeLessThanOrEqual(height!);
    }
  });
});

describe('resolveAvatarOutputDimension', () => {
  it('sube a 512 cualquier foto de origen mayor', () => {
    expect(resolveAvatarOutputDimension(3024)).toBe(avatarTargetDimension);
    expect(resolveAvatarOutputDimension(512)).toBe(avatarTargetDimension);
  });

  it('no agranda una foto más pequeña que el objetivo', () => {
    // Agrandarla no añade detalle y sí bytes.
    expect(resolveAvatarOutputDimension(200)).toBe(200);
  });
});

describe('validateAvatarSource', () => {
  it('rechaza una imagen por debajo del mínimo del backend antes de tocarla', () => {
    // 32x32 escalado a 512x512 pasaría la validación del servidor y dejaría un
    // avatar ilegible: el rechazo tiene que ocurrir aquí.
    expect(() => validateAvatarSource(32, 32)).toThrow(AvatarError);
    try {
      validateAvatarSource(32, 32);
    } catch (error) {
      expect((error as AvatarError).code).toBe('AVATAR_TOO_SMALL');
    }
  });

  it('rechaza el lado corto aunque el largo sea suficiente', () => {
    expect(() => validateAvatarSource(2000, 40)).toThrow(AvatarError);
  });

  it('acepta justo el mínimo documentado por el backend', () => {
    expect(() => validateAvatarSource(64, 64)).not.toThrow();
  });

  it('marca como formato inválido unas dimensiones ilegibles', () => {
    try {
      validateAvatarSource(Number.NaN, 512);
    } catch (error) {
      expect((error as AvatarError).code).toBe('AVATAR_INVALID_FORMAT');
    }
  });
});

describe('escalera de calidad', () => {
  it('empieza en la calidad documentada por el backend y baja acotada', () => {
    expect(avatarQualitySteps[0]).toBe(0.8);
    expect([...avatarQualitySteps]).toEqual(
      [...avatarQualitySteps].sort((a, b) => b - a),
    );
    expect(Math.min(...avatarQualitySteps)).toBeGreaterThanOrEqual(0.4);
  });

  it('solo ofrece calidades estrictamente menores, de modo que el bucle termina', () => {
    expect(avatarQualitiesBelow(0.8)).toEqual([0.7, 0.6, 0.5, 0.4]);
    expect(avatarQualitiesBelow(0.4)).toEqual([]);
  });

  it('deja margen entre el objetivo local y el tope duro del backend', () => {
    expect(avatarMaxBytes).toBe(256 * 1024);
    expect(avatarTargetMaxBytes).toBeLessThan(avatarMaxBytes);
  });
});

describe('buildAvatarCacheFileName', () => {
  it('cambia de clave cuando cambia avatarUpdatedAt', () => {
    const first = buildAvatarCacheFileName(
      'uuid-ana',
      '2026-08-30T10:14:38.971Z',
    );
    const second = buildAvatarCacheFileName(
      'uuid-ana',
      '2026-08-30T11:02:11.004Z',
    );

    expect(first).not.toBe(second);
    // Sin esto, la ruta remota fija dejaría la foto anterior en pantalla.
    expect(first).toContain('uuid-ana');
  });

  it('es estable para el mismo sello, de modo que no redescarga', () => {
    expect(
      buildAvatarCacheFileName('uuid-ana', '2026-08-30T10:14:38.971Z'),
    ).toBe(buildAvatarCacheFileName('uuid-ana', '2026-08-30T10:14:38.971Z'));
  });
});
