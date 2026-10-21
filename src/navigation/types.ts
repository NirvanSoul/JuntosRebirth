import type { NavigatorScreenParams } from '@react-navigation/native';
import type { CurrencyCode } from '@/lib/currency/currencyCatalog';

export type CategoryDetailRequest = {
  categoryId: string;
  displayCurrency: CurrencyCode;
};

export type MainTabParamList = {
  Home: undefined;
  Activity:
    | {
        requestId: number;
        section: 'accounts' | 'categories' | 'movements';
      }
    | undefined;
  Map: undefined;
  ComingSoon: undefined;
};

export type RootDrawerParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Settings: undefined;
  AcceptInvitation: { token: string };
};
