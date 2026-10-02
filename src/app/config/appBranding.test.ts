const appConfig = require('../../../app.json') as {
  expo: {
    name: string;
    plugins: unknown[];
  };
};

describe('marca visible de la aplicación', () => {
  it('expone Juntos como nombre nativo', () => {
    expect(appConfig.expo.name).toBe('Juntos');
  });
});
