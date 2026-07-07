import { SafeAreaView } from 'react-native-safe-area-context'
import WixMonthlyCalendar from '@/calendars/wix/WixMonthlyCalendar'

export default function WixTab() {
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFFFFF', flex: 1 }}>
      <WixMonthlyCalendar />
    </SafeAreaView>
  )
}
