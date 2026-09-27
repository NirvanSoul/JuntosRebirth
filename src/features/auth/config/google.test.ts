import { googleAuthConfig } from '@/features/auth/config/google';

describe('googleAuthConfig', () => {
  it('usa el cliente OAuth web para los tokens nativos y lo separa del cliente iOS', () => {
    expect(googleAuthConfig.webClientId).toBe(
      '518884531876-rskanqcmci8cakfg5ben0kn7str91jsq.apps.googleusercontent.com',
    );
    expect(googleAuthConfig.webClientId).not.toBe(googleAuthConfig.iosClientId);
  });
});
