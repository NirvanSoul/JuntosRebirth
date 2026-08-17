import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Activity:
    | {
        requestId: number;
        section: 'accounts' | 'categories' | 'movements';
      }
    | undefined;
  Map: undefined;
};

export type RootDrawerParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Settings: undefined;
  AcceptInvitation: { token: string };
};
