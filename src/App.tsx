import { useColorScheme } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';

import './global.css';

import { useEffect } from 'react';

import { NAV_THEME } from './lib/theme';
import HomeScreen from './screens/HomeScreen';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

SplashScreen.preventAutoHideAsync();

export default function App() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <Navigation theme={colorScheme === 'dark' ? NAV_THEME.dark : NAV_THEME.light} />
      <PortalHost />
    </>
  );
}
