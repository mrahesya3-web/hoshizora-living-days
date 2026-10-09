// Hoshizora Living Days — Cloudflare Workers backend
// Store OPENAI_API_KEY as a Cloudflare Worker secret. Never put it in GitHub.

const MODEL_DEFAULT = "gpt-4.1-mini";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

const VALID_LOCATIONS = [
  "school", "library", "citypark", "conbini", "diner", "busstop", "beach",
  "seasidepark", "aquarium", "harbor", "icecream", "seafood", "station",
  "mall", "arcade", "cinema", "bookstore", "cafe", "karaoke", "sakurapark",
  "shrine", "bakery", "flower", "residential", "hospital", "offices", "hotel",
  "minatorest", "forest", "lake", "hiking", "inn", "home", "street"
];

const INSTRUCTIONS = `Kamu adalah AI Story Director untuk game life-simulation RPG Hoshizora, berlatar kota pesisir Jepang modern. Balas HANYA JSON valid, tanpa markdown, dengan bentuk:
{"minutes":30,"narration":"narasi singkat orang kedua dalam Bahasa Indonesia","npcResponse":"respons NPC bila relevan, jika tidak string kosong","eventTitle":"judul event atau string kosong","choices":["pilihan opsional"],"statChanges":{"academic":0,"athletic":0,"social":0,"charm":0,"confidence":0,"discipline":0,"energy":0,"stress":0},"moneyChange":0,"location":null}
Aturan: jangan memutuskan niat pemain di luar tindakan yang diminta; jangan membuat pemain otomatis dikenal NPC yang belum ditemui; jangan memaksakan romance; NPC punya agensi, rutinitas, batasan, dan ingatan; dunia bereaksi secara masuk akal. Tidak ada plot armor, tetapi jangan menciptakan bahaya ekstrem secara sembarangan. Jangan mengarang hasil uang yang tidak masuk akal. Durasi biasanya 5–60 menit untuk tindakan kecil, lebih lama untuk kegiatan panjang, maksimum 240 menit per respons. Stat changes kecil dan masuk akal, umumnya antara -5 dan +5. moneyChange harus sesuai transaksi yang jelas. location hanya boleh berupa ID lokasi yang ada atau null. Jangan mengubah data selain field respons yang diminta. Jika aksi ambigu, narasikan upaya yang wajar dan berikan satu pertanyaan/opsi lanjutan dalam choices. Selalu jaga kontinuitas berdasarkan data yang diberikan.`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400"
          }
        });
      }

      if (url.pathname === "/api/health" && request.method === "GET") {
        return json({
          ok: true,
          aiConfigured: Boolean(env.OPENAI_API_KEY),
          model: env.OPENAI_MODEL || MODEL_DEFAULT
        });
      }

      if (url.pathname === "/api/turn" && request.method === "POST") {
        if (!env.OPENAI_API_KEY) {
          return json({ error: "OPENAI_API_KEY belum diatur sebagai Secret pada Cloudflare Worker." }, 503);
        }

        let data;
        try {
          data = await request.json();
        } catch {
          return json({ error: "Body permintaan harus berupa JSON yang valid." }, 400);
        }

        const input = {
          action: data.action,
          player: data.player,
          world: data.world,
          npcs: data.npcs,
          recentEvents: data.recentEvents,
          npcId: data.npcId,
          validLocationIds: VALID_LOCATIONS
        };

        try {
          const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: env.OPENAI_MODEL || MODEL_DEFAULT,
              instructions: INSTRUCTIONS,
              input: JSON.stringify(input),
              text: { format: { type: "json_object" } },
              max_output_tokens: 700
            })
          });

          const payload = await response.json();
          if (!response.ok) {
            return json({ error: payload.error?.message || "AI provider error" }, response.status);
          }

          const output = payload.output?.flatMap(item => item.content || []).find(item => item.type === "output_text")?.text;
          if (!output) return json({ error: "AI tidak mengembalikan teks JSON." }, 502);

          let parsed;
          try {
            parsed = JSON.parse(output);
          } catch {
            return json({ error: "Respons AI bukan JSON valid." }, 502);
          }

          // Bound values before returning model-generated values to the game.
          parsed.minutes = Math.max(5, Math.min(240, Number(parsed.minutes) || 30));
          parsed.moneyChange = Math.max(-100000, Math.min(100000, Number(parsed.moneyChange) || 0));
          if (!Array.isArray(parsed.choices)) parsed.choices = [];
          if (!parsed.statChanges || typeof parsed.statChanges !== "object") parsed.statChanges = {};
          if (parsed.location !== null && !VALID_LOCATIONS.includes(parsed.location)) parsed.location = null;
          return json(parsed);
        } catch {
          return json({ error: "Backend gagal menghubungi layanan AI. Coba lagi nanti." }, 502);
        }
      }

      return json({ error: "API endpoint tidak ditemukan." }, 404);
    }

    // Serve the existing index.html and other public files from Cloudflare Assets.
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Static assets binding belum dikonfigurasi.", { status: 500 });
  }
};
