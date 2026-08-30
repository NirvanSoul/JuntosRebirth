import type { LinkingOptions } from '@react-navigation/native';

import type { RootDrawerParamList } from '@/navigation/types';

export const linking: LinkingOptions<RootDrawerParamList> = {
  // `expo-web-browser` consume este callback para entregar la sesión a Better
  // Auth. React Navigation no debe interpretarlo como una ruta y reiniciar la
  // pantalla visible a Inicio.
  filter: (url) => !url.startsWith('juntoss://oauth/google'),
  prefixes: ['juntoss://'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: '',
          Activity: 'actividad',
          Map: 'mapa',
        },
      },
      Settings: 'ajustes',
      AcceptInvitation: 'invitacion/:token',
    },
  },
};
