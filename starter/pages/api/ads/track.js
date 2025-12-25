import { supabase } from '@/lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { adId, type } = req.body

  if (!adId || !['click', 'impression'].includes(type)) {
    return res.status(400).json({ error: 'Invalid payload' })
  }

  const column = type === 'click' ? 'clicks' : 'impressions'

  try {
    await supabase.rpc('increment_ad_counter', {
      ad_id: adId,
      column_name: column
    })

    await supabase.from('ad_events').insert({
      advertisement_id: adId,
      event_type: type
    })

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Tracking failed' })
  }
}
