// Entrega ao navegador a URL e a chave PÚBLICA (anon) do Supabase.
// A anon key é pública por design; a proteção dos dados é feita pelo RLS.
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  return res.status(200).json({
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  });
};
