import { supabase } from './supabase';

export async function getSiteSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value');

  if (error) {
    console.error('Failed to load site settings:', error);
    return {};
  }

  const out = {};
  (data || []).forEach(row => {
    try {
      out[row.key] = row.value;
    } catch (e) {
      out[row.key] = row.value;
    }
  });
  return out;
}

export async function upsertSiteSetting(key, value) {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
  return true;
}
