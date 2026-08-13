import type { LinkingOptions } from '@react-navigation/native';

import type { RootDrawerParamList } from '@/navigation/types';

export const linking: LinkingOptions<RootDrawerParamList> = {
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
