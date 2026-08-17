import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { PortalHost } from '@rn-primitives/portal'

import "./global.css";
import HomeScreen from "./screens/HomeScreen";
import { NAV_THEME } from "./lib/theme";
import { useEffect } from 'react';

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
    SplashScreen.hideAsync()
  }, []);

  return (
    <>
      <Navigation theme={colorScheme === 'dark' ? NAV_THEME.dark : NAV_THEME.light} />
      <PortalHost />
    </>
  );
}
