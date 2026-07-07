import { SafeAreaView } from 'react-native-safe-area-context'
import FlashMonthlyCalendar from '@/calendars/flash/FlashMonthlyCalendar'

export default function FlashTab() {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFFFFF', flex: 1 }}>
      <FlashMonthlyCalendar />
    </SafeAreaView>
  )
}
