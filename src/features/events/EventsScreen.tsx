/**
 * Events tab — create and delete persisted events (single or recurring).
 * All calendar tabs render from this store.
 */
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  addDays,
  type CalendarEvent,
  type RecurrenceFreq,
  startOfDay,
  useEventsStore,
} from '@/calendar-core'

const PALETTE = ['#596840', '#E08011', '#3B82F6', '#DC2626', '#7C3AED', '#0D9488']
const FREQ_OPTIONS: { key: RecurrenceFreq | 'none'; label: string }[] = [
  { key: 'none', label: 'Once' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
]

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function PickerField({
  value,
  mode,
  onChange,
}: {
  value: Date
  mode: 'date' | 'time'
  onChange: (next: Date) => void
}) {
  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        display="compact"
        mode={mode}
        onChange={(_event, date) => date && onChange(date)}
        value={value}
      />
    )
  }
  return (
    <Pressable
      onPress={() =>
        DateTimePickerAndroid.open({
          mode,
          onChange: (_event, date) => date && onChange(date),
          value,
        })
      }
      style={styles.androidPickerButton}>
      <Text style={styles.androidPickerText}>{mode === 'date' ? formatDate(value) : formatTime(value)}</Text>
    </Pressable>
  )
}

function defaultStart(): Date {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  now.setHours(now.getHours() + 1)
  return now
}

function describeEvent(event: CalendarEvent): string {
  const start = new Date(event.startAt)
  const end = new Date(event.endAt)
  const when = event.allDay
    ? `${formatDate(start)} → ${formatDate(new Date(end.getTime() - 1))} (all day)`
    : `${formatDate(start)} ${formatTime(start)}–${formatTime(end)}`
  if (!event.recurrence) return when
  const untilPart = event.recurrence.until ? ` until ${formatDate(new Date(event.recurrence.until))}` : ''
  return `${when} · ${event.recurrence.freq}${untilPart}`
}

export default function EventsScreen() {
  const events = useEventsStore(state => state.events)
  const addEvent = useEventsStore(state => state.addEvent)
  const removeEvent = useEventsStore(state => state.removeEvent)
  const clearAll = useEventsStore(state => state.clearAll)

  const [title, setTitle] = useState('')
  const [color, setColor] = useState(PALETTE[0]!)
  const [allDay, setAllDay] = useState(false)
  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(() => new Date(defaultStart().getTime() + 60 * 60 * 1000))
  const [freq, setFreq] = useState<RecurrenceFreq | 'none'>('none')
  const [hasUntil, setHasUntil] = useState(false)
  const [until, setUntil] = useState(() => addDays(new Date(), 90))

  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [events],
  )

  const handleAdd = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) {
      Alert.alert('Missing title', 'Give the event a title.')
      return
    }

    let startAt: Date
    let endAt: Date
    if (allDay) {
      // All-day events store an exclusive end at the midnight after the last day.
      startAt = startOfDay(start)
      endAt = addDays(startOfDay(end), 1)
      if (endAt.getTime() <= startAt.getTime()) {
        Alert.alert('Invalid range', 'The end day must not be before the start day.')
        return
      }
    } else {
      startAt = new Date(start)
      endAt = new Date(end)
      if (endAt.getTime() <= startAt.getTime()) {
        Alert.alert('Invalid range', 'The end must be after the start.')
        return
      }
    }

    addEvent({
      title: trimmed,
      color,
      allDay,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      recurrence:
        freq === 'none'
          ? null
          : {
              freq,
              interval: 1,
              until: hasUntil ? startOfDay(addDays(until, 1)).toISOString() : null,
            },
    })
    setTitle('')
  }, [addEvent, allDay, color, end, freq, hasUntil, start, title, until])

  const handleSeed = useCallback(() => {
    const monday = addDays(startOfDay(new Date()), ((8 - new Date().getDay()) % 7) + 1)
    const at = (base: Date, h: number, m = 0) => {
      const d = new Date(base)
      d.setHours(h, m, 0, 0)
      return d
    }
    const samples: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'Standup',
        color: '#3B82F6',
        allDay: false,
        startAt: at(monday, 9).toISOString(),
        endAt: at(monday, 9, 30).toISOString(),
        recurrence: { freq: 'daily', interval: 1, until: addDays(monday, 60).toISOString() },
      },
      {
        title: 'Gym',
        color: '#596840',
        allDay: false,
        startAt: at(addDays(monday, 1), 18).toISOString(),
        endAt: at(addDays(monday, 1), 19).toISOString(),
        recurrence: { freq: 'weekly', interval: 1, until: null },
      },
      {
        title: 'Conference',
        color: '#7C3AED',
        allDay: true,
        startAt: startOfDay(addDays(monday, 9)).toISOString(),
        endAt: startOfDay(addDays(monday, 12)).toISOString(),
        recurrence: null,
      },
      {
        title: 'Rent',
        color: '#DC2626',
        allDay: true,
        startAt: startOfDay(addDays(monday, 3)).toISOString(),
        endAt: startOfDay(addDays(monday, 4)).toISOString(),
        recurrence: { freq: 'monthly', interval: 1, until: null },
      },
      {
        title: 'Review',
        color: '#0D9488',
        allDay: false,
        startAt: at(monday, 14).toISOString(),
        endAt: at(monday, 15).toISOString(),
        recurrence: null,
      },
      {
        title: 'Deep work',
        color: '#E08011',
        allDay: false,
        startAt: at(monday, 10).toISOString(),
        endAt: at(monday, 12).toISOString(),
        recurrence: { freq: 'weekly', interval: 1, until: null },
      },
    ]
    samples.forEach(addEvent)
  }, [addEvent])

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.root}>
      <Text style={styles.heading}>New event</Text>

      <TextInput
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor="#A1A1A1"
        style={styles.input}
        value={title}
      />

      <View style={styles.swatchRow}>
        {PALETTE.map(hex => (
          <Pressable
            key={hex}
            onPress={() => setColor(hex)}
            style={[styles.swatch, { backgroundColor: hex }, color === hex && styles.swatchSelected]}
          />
        ))}
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>All day</Text>
        <Switch onValueChange={setAllDay} value={allDay} />
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Starts</Text>
        <View style={styles.pickerGroup}>
          <PickerField mode="date" onChange={setStart} value={start} />
          {!allDay ? <PickerField mode="time" onChange={setStart} value={start} /> : null}
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>{allDay ? 'Last day' : 'Ends'}</Text>
        <View style={styles.pickerGroup}>
          <PickerField mode="date" onChange={setEnd} value={end} />
          {!allDay ? <PickerField mode="time" onChange={setEnd} value={end} /> : null}
        </View>
      </View>

      <View style={styles.freqRow}>
        {FREQ_OPTIONS.map(option => (
          <Pressable
            key={option.key}
            onPress={() => setFreq(option.key)}
            style={[styles.freqButton, freq === option.key && styles.freqButtonActive]}>
            <Text style={[styles.freqLabel, freq === option.key && styles.freqLabelActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {freq !== 'none' ? (
        <View style={styles.row}>
          <View style={styles.untilToggle}>
            <Text style={styles.rowLabel}>Until</Text>
            <Switch onValueChange={setHasUntil} value={hasUntil} />
          </View>
          {hasUntil ? <PickerField mode="date" onChange={setUntil} value={until} /> : null}
        </View>
      ) : null}

      <Pressable onPress={handleAdd} style={styles.addButton}>
        <Text style={styles.addButtonLabel}>Add event</Text>
      </Pressable>

      <View style={styles.listHeader}>
        <Text style={styles.heading}>Events ({sorted.length})</Text>
        <View style={styles.listHeaderActions}>
          <Pressable onPress={handleSeed}>
            <Text style={styles.linkLabel}>Add samples</Text>
          </Pressable>
          {sorted.length > 0 ? (
            <Pressable
              onPress={() =>
                Alert.alert('Clear all events?', undefined, [
                  { style: 'cancel', text: 'Cancel' },
                  { onPress: clearAll, style: 'destructive', text: 'Clear' },
                ])
              }>
              <Text style={[styles.linkLabel, styles.destructiveLabel]}>Clear all</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {sorted.map(event => (
        <View key={event.id} style={styles.eventRow}>
          <View style={[styles.eventDot, { backgroundColor: event.color }]} />
          <View style={styles.eventBody}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventMeta}>{describeEvent(event)}</Text>
          </View>
          <Pressable hitSlop={8} onPress={() => removeEvent(event.id)}>
            <Text style={styles.destructiveLabel}>Delete</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#FFFFFF', flex: 1 },
  content: { gap: 12, padding: 16, paddingBottom: 48 },
  heading: { fontFamily: 'Poppins-Medium', fontSize: 16, lineHeight: 24, color: '#262626' },
  input: {
    borderColor: '#E5E5E5',
    borderRadius: 8,
    borderWidth: 1,
    fontFamily: 'Poppins',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  swatchRow: { flexDirection: 'row', gap: 10 },
  swatch: { borderRadius: 14, height: 28, width: 28 },
  swatchSelected: { borderColor: '#262626', borderWidth: 2 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 36 },
  rowLabel: { fontFamily: 'Poppins', fontSize: 14, color: '#262626' },
  pickerGroup: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  untilToggle: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  freqRow: { flexDirection: 'row', gap: 8 },
  freqButton: {
    borderColor: '#E5E5E5',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  freqButtonActive: { backgroundColor: '#596840', borderColor: '#596840' },
  freqLabel: { fontFamily: 'Poppins', fontSize: 13, color: '#262626' },
  freqLabelActive: { color: '#FFFFFF' },
  addButton: {
    alignItems: 'center',
    backgroundColor: '#596840',
    borderRadius: 10,
    marginTop: 4,
    paddingVertical: 12,
  },
  addButtonLabel: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 15 },
  listHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  listHeaderActions: { flexDirection: 'row', gap: 16 },
  linkLabel: { color: '#596840', fontFamily: 'Poppins-Medium', fontSize: 13 },
  destructiveLabel: { color: '#DC2626', fontFamily: 'Poppins-Medium', fontSize: 13 },
  eventRow: {
    alignItems: 'center',
    borderColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  eventDot: { borderRadius: 6, height: 12, width: 12 },
  eventBody: { flex: 1 },
  eventTitle: { fontFamily: 'Poppins-Medium', fontSize: 14, color: '#262626' },
  eventMeta: { color: '#737373', fontFamily: 'Poppins', fontSize: 12 },
  androidPickerButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  androidPickerText: { fontFamily: 'Poppins', fontSize: 13, color: '#262626' },
})
