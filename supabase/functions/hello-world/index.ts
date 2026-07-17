// Proves the edge function pipeline end to end: deploy this, call it from the
// browser, get JSON back. Real game mutations (create game, join, claim a
// zone, ...) follow this same shape but use the service role key to write.
Deno.serve(async (req) => {
  const { name } = await req.json().catch(() => ({ name: 'world' }))

  return new Response(JSON.stringify({ message: `Hello ${name}!` }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
