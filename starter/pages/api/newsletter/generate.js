import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const LENGTH_GUIDE = {
  short: '300–450 words, 3 sections, 1 list',
  medium: '550–800 words, 4 sections, 2 lists',
  long: '900–1400 words, 5 sections, 2–3 lists',
};

/** Ensure the model always returns at least one list & one h2. */
function enforceMinimumStructure(html) {
  const hasH2 = /<h2[\s>]/i.test(html);
  const hasList = /<(ul|ol)[\s>]/i.test(html);
  // If the model ignored structure, we let the admin see it and edit —
  // but at least log so we can tighten the prompt later.
  if (!hasH2 || !hasList) {
    console.warn('[NEWSLETTER_GENERATE] Model returned weak structure', {
      hasH2,
      hasList,
    });
  }
  return html;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      topic,
      tone = 'professional',
      audience = 'general',
      length = 'medium',
      keywords = [],
      advertisementIds = [],
      additionalInstructions = '',
    } = req.body || {};

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ success: false, error: 'Topic is required' });
    }

    // ---- Load ads that the admin chose to consider ----
    let ads = [];
    if (Array.isArray(advertisementIds) && advertisementIds.length > 0) {
      const { data, error } = await supabase
        .from('advertisements')
        .select(
          'id, title, company_name, category, description, image_url, image_urls'
        )
        .in('id', advertisementIds)
        .eq('is_active', true);

      if (error) throw error;
      ads = data || [];
    }

    const adBrief = ads.length
      ? ads
          .map(
            (ad, i) =>
              `Slot {{AD_${i + 1}}} → "${ad.title || ad.company_name || 'Advertisement'}"` +
              (ad.category ? ` (category: ${String(ad.category).replace(/_/g, ' ')})` : '') +
              (ad.description ? `\n   About: ${ad.description}` : '')
          )
          .join('\n')
      : '';

    const systemPrompt = `You are a senior newsletter copywriter for Dosnine Limited, a Jamaican real-estate and property platform. You write polished, scannable HTML newsletter bodies that render beautifully in Gmail, Apple Mail, and Outlook. You always return strict JSON only — no prose, no markdown fences, no <html>/<head>/<body> wrappers.`;

    const userPrompt = `Write a newsletter issue.

Topic: ${topic}
Tone: ${tone}
Audience: ${audience}
Length: ${LENGTH_GUIDE[length] || LENGTH_GUIDE.medium}
Keywords to weave in naturally: ${Array.isArray(keywords) && keywords.length ? keywords.join(', ') : 'none'}
${additionalInstructions ? `Extra instructions: ${additionalInstructions}` : ''}

## Personalization tokens

You may use these exact tokens in the subject, previewText, and bodyHtml. They are replaced with each recipient's values when the email is sent:
{{first_name}}, {{last_name}}, {{parish}}, {{request_type}}, {{property_type}}, {{location}}, {{budget_min}}, {{budget_max}}, {{bedrooms}}, {{bathrooms}}, {{request_description}}

- Use relevant tokens naturally when they make the message more personal. For buyer-focused emails, prefer {{first_name}} and relevant request details such as {{property_type}}, {{location}}, and budget.
- Preserve token spelling exactly, including double braces. Never invent other tokens.
- Do not include request-specific tokens in generic copy unless they fit the requested audience/topic; values may be blank for recipients without a matching request.

## Structure rules — these are STRICT

- Open with a 1–2 sentence hook inside a <p>.
- Break the body into 3–5 sections. Each section starts with a short <h2> (max 6 words, title case).
- At least ONE section must contain a <ul> with 3–6 <li> items.
- At least ONE section must contain an <ol> with 3–5 numbered steps (use it when the topic involves a process; otherwise use a second <ul>).
- Use <strong> to highlight 1–3 key phrases per section. Do not over-use it.
- Include exactly ONE <blockquote> with a short quotable tip, stat, or takeaway.
- Close with a final <p> takeaway (1–2 sentences).
- Result: roughly 4–8 paragraphs, 2 lists, 3–5 <h2>s.

## Allowed tags — nothing else

<h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a href="...">, <blockquote>

## Forbidden

- Inline style="" attributes (the email template handles styling)
- <div>, <section>, <span>, <table>, <br>, <hr>
- Emojis
- A signature, footer, or unsubscribe text — those are added by the template

${
  ads.length
    ? `## Ad placement

For each of the following ads, choose the MOST natural place in the body (usually right after a related paragraph or at the end of a section). Insert the token on its own line inside its own <p>, e.g. a line that reads exactly:
<p>{{AD_1}}</p>
Each token must appear exactly once. Never wrap the token in other tags.

${adBrief}`
    : '## Ad placement\nThere are no ads to place.'
}

## Output format — strict JSON

{
  "subject": "under 80 chars, no emoji",
  "previewText": "under 120 chars",
  "bodyHtml": "HTML fragment only"
}`;

    const aiResponse = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_NEWSLETTER_MODEL || 'gpt-4o-mini',
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      throw new Error(`AI request failed: ${aiResponse.status} ${text}`);
    }

    const aiJson = await aiResponse.json();
    const raw = aiJson.choices?.[0]?.message?.content || '{}';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('AI returned invalid JSON');
    }

    const bodyHtml = enforceMinimumStructure(
      String(parsed.bodyHtml || '').trim()
    );

    const adSlots = ads.map((ad, i) => ({
      token: `{{AD_${i + 1}}}`,
      advertisementId: ad.id,
    }));

    return res.status(200).json({
      success: true,
      data: {
        subject: parsed.subject || topic,
        previewText: parsed.previewText || '',
        bodyHtml,
        adSlots,
      },
    });
  } catch (error) {
    console.error('[NEWSLETTER_GENERATE]', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to generate newsletter',
    });
  }
}