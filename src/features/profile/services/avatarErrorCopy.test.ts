import { getAvatarErrorCopy } from '@/features/profile/services/avatarErrorCopy';
import { AvatarError } from '@/features/profile/services/avatarImage';
import { ApiError } from '@/services/api/client';

function apiError(code: string, message = 'texto del servidor') {
  return new ApiError({ status: 400, code, message });
}

describe('getAvatarErrorCopy', () => {
  it('traduce AVATAR_TOO_LARGE', () => {
    expect(getAvatarErrorCopy(apiError('AVATAR_TOO_LARGE'))).toEqual({
      title: 'La imagen es demasiado grande',
      message: 'Estamos intentando optimizarla.',
    });
  });

  it('traduce AVATAR_TOO_SMALL', () => {
    expect(getAvatarErrorCopy(apiError('AVATAR_TOO_SMALL'))).toEqual({
      title: 'Esta imagen tiene una resolución demasiado baja',
      message: 'Elige otra foto.',
    });
  });

  it('traduce AVATAR_INVALID_FORMAT', () => {
    expect(getAvatarErrorCopy(apiError('AVATAR_INVALID_FORMAT'))).toEqual({
      title: 'No pudimos procesar esta imagen',
      message: 'Elige otra foto.',
    });
  });

  it('da el mismo texto tanto si rechaza el móvil como si rechaza la API', () => {
    expect(
      getAvatarErrorCopy(new AvatarError('AVATAR_TOO_SMALL', 'da igual')),
    ).toEqual(getAvatarErrorCopy(apiError('AVATAR_TOO_SMALL')));
  });

  it('ramifica por el código y no por el mensaje', () => {
    // Un mensaje que "suena a" demasiado grande pero cuyo código dice otra
    // cosa debe seguir al código.
    const copy = getAvatarErrorCopy(
      apiError('AVATAR_INVALID_FORMAT', 'Avatar is too large'),
    );

    expect(copy.title).toBe('No pudimos procesar esta imagen');
  });

  it('cae en un texto genérico ante un fallo sin código', () => {
    expect(getAvatarErrorCopy(new Error('boom')).title).toBe(
      'No se pudo actualizar tu foto',
    );
  });
});
