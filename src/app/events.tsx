import { SafeAreaView } from 'react-native-safe-area-context'
import EventsScreen from '@/features/events/EventsScreen'

export default function EventsTab() {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFFFFF', flex: 1 }}>
      <EventsScreen />
    </SafeAreaView>
  )
}
