import { getDbClient, requireDbUser } from '@/lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resolved = await requireDbUser(req, res);
  if (!resolved) return;

  try {
    const db = getDbClient();
    const {
      parish = 'ALL',
      bedrooms = 'any',
      bathrooms = 'any',
      budgetMin = '',
      budgetMax = '',
      selectedAreas = '',
    } = req.query;

    const areaList = String(selectedAreas)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    let srQuery = db
      .from('service_requests')
      .select('id, request_type, property_type, location, parish, bedrooms, bathrooms, budget_min, budget_max, description, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    let veQuery = db
      .from('visitor_emails')
      .select('id, intent, bedrooms, parish, area, budget_min, created_at')
      .eq('email_status', 'not_contacted')
      .order('created_at', { ascending: false });

    if (parish !== 'ALL') {
      srQuery = srQuery.or(`parish.eq.${parish},location.ilike.%${parish}%,description.ilike.%${parish}%`);
      veQuery = veQuery.or(`parish.eq.${parish},area.ilike.%${parish}%`);
    }

    if (areaList.length > 0) {
      srQuery = srQuery.in('location', areaList);
      veQuery = veQuery.in('area', areaList);
    }

    if (bedrooms !== 'any') {
      srQuery = srQuery.gte('bedrooms', Number(bedrooms));
      veQuery = veQuery.gte('bedrooms', Number(bedrooms));
    }

    if (bathrooms !== 'any') {
      srQuery = srQuery.gte('bathrooms', Number(bathrooms));
    }

    if (budgetMin) {
      srQuery = srQuery.gte('budget_max', Number(budgetMin));
      veQuery = veQuery.gte('budget_min', Number(budgetMin));
    }

    if (budgetMax) {
      srQuery = srQuery.lte('budget_min', Number(budgetMax));
      veQuery = veQuery.lte('budget_min', Number(budgetMax));
    }

    const [srRes, veRes] = await Promise.all([srQuery, veQuery]);
    if (srRes.error) throw srRes.error;
    if (veRes.error) throw veRes.error;

    const serviceData = (srRes.data || []).map((request) => {
      if (!request.description) return request;

      const extracted = {};
      const bedroomsMatch = request.description.match(/Bedrooms:\s*(\d+)/i);
      if (bedroomsMatch) extracted.bedrooms = parseInt(bedroomsMatch[1], 10);

      const parishMatch = request.description.match(/Parish:\s*([\w\s.-]+)/i);
      if (parishMatch) extracted.parish = parishMatch[1].trim().replace(/,$/, '').trim();

      const areaMatch = request.description.match(/Area:\s*([\w\s.-]+)/i);
      if (areaMatch) extracted.area = areaMatch[1].trim().replace(/,$/, '').trim();

      const budgetMatch = request.description.match(/Budget:\s*JMD\s*([\d,]+)/i);
      if (budgetMatch) extracted.budget_min = parseInt(budgetMatch[1].replace(/,/g, ''), 10);

      const location = request.location && request.location.trim() !== ''
        ? request.location
        : extracted.area
          ? `${extracted.area}, ${extracted.parish || ''}`.replace(/, $/, '').trim()
          : request.location;

      return {
        ...request,
        bedrooms: request.bedrooms ?? extracted.bedrooms,
        parish: request.parish ?? extracted.parish,
        location,
        budget_min: request.budget_min ?? extracted.budget_min,
      };
    });

    const visitorData = (veRes.data || []).map((visitor) => ({
      id: visitor.id,
      is_visitor: true,
      request_type: visitor.intent || 'rent',
      property_type: 'Property',
      location: visitor.area ? `${visitor.area}, ${visitor.parish || ''}` : visitor.parish || 'Unknown',
      bedrooms: visitor.bedrooms,
      bathrooms: null,
      budget_min: visitor.budget_min,
      budget_max: null,
      description: '',
      created_at: visitor.created_at,
    }));

    const requests = [...serviceData, ...visitorData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const areasSet = new Set();
    (srRes.data || []).forEach((request) => request.location && areasSet.add(request.location));
    (veRes.data || []).forEach((visitor) => visitor.area && areasSet.add(visitor.area));

    return res.status(200).json({
      success: true,
      requests,
      areas: [...areasSet].sort(),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load parish requests' });
  }
}
