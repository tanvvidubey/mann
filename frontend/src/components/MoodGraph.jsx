import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

const moodColor = (mood) => {
  const map = {
    happy: '#f59e0b',
    sad: '#64748b',
    anxious: '#e11d48',
    calm: '#0ea5e9',
    angry: '#dc2626',
    confused: '#7c3aed',
    grateful: '#059669',
    excited: '#ea580c',
  }
  return map[mood] || '#6B5B4F'
}

export default function MoodGraph({ data, days = 7 }) {
  const sliced = (data?.entries || []).slice(-days)
  const chartData = sliced.map((d) => ({
    date: d.date,
    score: d.mood_score,
    mood: d.mood,
    fill: moodColor(d.mood),
  }))

  if (chartData.length === 0) {
    return (
      <div className="h-64 rounded-2xl bg-warm/40 flex items-center justify-center text-muted">
        No entries in this period. Record your first entry to see your mood over time.
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {chartData.map((entry, i) => (
              <linearGradient key={i} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={entry.fill} stopOpacity={0.4} />
                <stop offset="100%" stopColor={entry.fill} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F5EDE4" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#6B5B4F' }}
            tickFormatter={(v) => v.slice(5) || v}
          />
          <YAxis domain={[1, 10]} tick={{ fontSize: 11, fill: '#6B5B4F' }} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #F5EDE4' }}
            formatter={(value, name, props) => [`${value} — ${props.payload.mood}`, 'Mood score']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#C47B5B"
            strokeWidth={2}
            fill="url(#gradient-0)"
            dot={{ fill: '#C47B5B', strokeWidth: 0 }}
            activeDot={{ r: 4, fill: '#A85C3C' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
