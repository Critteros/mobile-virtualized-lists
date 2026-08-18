import { useColorScheme } from 'react-native';
import { createStaticNavigation, type StaticParamList } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';

import './global.css';

import { useEffect } from 'react';

import { DbProvider, useDb } from '@/chat/DbProvider';
import { NAV_THEME } from '@/lib/theme';
import ChatScreen from '@/screens/ChatScreen';
import HomeScreen from '@/screens/HomeScreen';
import SeedingScreen from '@/screens/SeedingScreen';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: { screen: HomeScreen, options: { title: 'List comparison' } },
    Chat: ChatScreen,
  },
});

type RootStackParamList = StaticParamList<typeof RootStack>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const Navigation = createStaticNavigation(RootStack);

SplashScreen.preventAutoHideAsync();

function Root() {
  const colorScheme = useColorScheme();
  const { progress, ready } = useDb();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (!ready) {
    return <SeedingScreen done={progress.done} total={progress.total} />;
  }

  return <Navigation theme={colorScheme === 'dark' ? NAV_THEME.dark : NAV_THEME.light} />;
}

export default function App() {
  return (
    <DbProvider>
      <Root />
      <PortalHost />
    </DbProvider>
  );
}
