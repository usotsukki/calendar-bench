import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  useFonts,
} from '@expo-google-fonts/poppins'
import { Tabs } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Aliases match RN styles; Skia resolves the registered family "Poppins"
    // through the system font manager on iOS and a TypefaceFontProvider on Android.
    Poppins: Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
  })

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#596840',
          tabBarLabelStyle: { fontFamily: 'Poppins-Medium', fontSize: 12 },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Tailtime' }} />
        <Tabs.Screen name="wix" options={{ title: 'Wix' }} />
        <Tabs.Screen name="flash" options={{ title: 'Flash' }} />
        <Tabs.Screen name="events" options={{ title: 'Events' }} />
      </Tabs>
    </>
  )
}
