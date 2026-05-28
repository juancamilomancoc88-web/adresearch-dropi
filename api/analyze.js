export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, imageType, productName, productPrice, country, metaToken } = req.body;
    const countryNames = { CR:'Costa Rica', GT:'Guatemala', CO:'Colombia', MX:'México', PA:'Panamá', ALL:'Latinoamérica' };
    const countriesParam = country === 'ALL' ? '"CR","GT","CO","MX","PA"' : `"${country}"`;

    const prompt = `Eres experto en análisis competitivo de dropshipping para Latinoamérica. Analiza este producto de Dropi evaluando la competencia en Meta Ad Library.

CRITERIOS para el veredicto:
- TESTEAR: menos de 5 competidores activos Y al menos uno lleva 7+ días pautando
- PRECAUCION: 5-8 competidores O competidores con menos de 7 días
- NO_TESTEAR: más de 8 competidores O producto completamente saturado

Producto para analizar en ${countryNames[country] || country}.
${productName ? `Nombre visible: ${productName}` : 'Identifica el nombre desde la imagen.'}
${productPrice ? `Precio en Dropi: ${productPrice}` : ''}
${metaToken ? `Token Meta Ad Library: ${metaToken}
Endpoint: https://graph.facebook.com/v19.0/ads_archive?access_token=${metaToken}&ad_type=ALL&ad_reached_countries=[${countriesParam}]&search_terms=PRODUCTO&fields=id,ad_creation_time,ad_delivery_start_time,page_name,ad_snapshot_url&limit=25` : ''}

Si el token Meta no funciona, usa tu conocimiento del mercado LATAM.

Responde SOLO con JSON válido sin backticks:
{"product_identified":"string","verdict":"TESTEAR|PRECAUCION|NO_TESTEAR","verdict_reason":"string","competitors_count":0,"max_days_active":0,"competitors":[{"name":"string","days_active":0,"url":"string"}],"landing_links":["url"],"angle_suggestion":"string","price_assessment":"COMPETITIVO|ALTO|BAJO","price_analysis":"string","price_range":"string","countries_active":["CR"],"trend_analysis":"string","trend_tags":["tag"],"extra_insights":"string"}`;

    const payload = {
      contents: [{ parts: [
        { inline_data: { mime_type: imageType || 'image/jpeg', data: imageBase64 } },
        { text: prompt }
      ]}],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );

    const data = await geminiRes.json();
    if (!geminiRes.ok) return res.status(geminiRes.status).json({ error: data.error?.message || 'Gemini error' });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
