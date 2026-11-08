const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function jsonResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: corsHeaders,
  });
}

function matchesSecret(candidate: string, secret: string): boolean {
  const encoder = new TextEncoder();
  const candidateBytes = encoder.encode(candidate);
  const secretBytes = encoder.encode(secret);
  let difference = candidateBytes.length ^ secretBytes.length;
  const length = Math.max(candidateBytes.length, secretBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (candidateBytes[index] ?? 0) ^ (secretBytes[index] ?? 0);
  }
  return difference === 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse(405, "Vain POST-pyyntö on sallittu.");
  }

  const configuredPassword = Deno.env.get("ADMIN_PASSWORD");
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!configuredPassword || configuredPassword.length < 16 || !projectUrl || !serviceKey) {
    return jsonResponse(503, "Ylläpidon poistopalvelua ei ole vielä määritetty.");
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 4096) {
    return jsonResponse(413, "Pyyntö on liian suuri.");
  }

  let body: { password?: unknown; type?: unknown; id?: unknown };
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > 4096) {
      return jsonResponse(413, "Pyyntö on liian suuri.");
    }
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse(400, "Pyyntö ei ole kelvollista JSON-muotoa.");
  }

  if (typeof body.password !== "string" || !matchesSecret(body.password, configuredPassword)) {
    return jsonResponse(401, "Ylläpitäjän salasana ei kelpaa.");
  }
  if (body.type === "verify") {
    return jsonResponse(200, "Ylläpitäjän salasana hyväksytty.");
  }
  if (!isUuid(body.id) || (body.type !== "photo" && body.type !== "profile")) {
    return jsonResponse(400, "Poistettava kohde ei kelpaa.");
  }

  const baseUrl = projectUrl.replace(/\/+$/, "");
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
  const restRequest = (path: string, init?: RequestInit) =>
    fetch(`${baseUrl}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  const removeObjects = async (paths: string[]) => {
    const uniquePaths = [...new Set(paths.filter(Boolean))];
    if (!uniquePaths.length) return;
    const response = await fetch(`${baseUrl}/storage/v1/object/party-photos`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ prefixes: uniquePaths }),
    });
    if (!response.ok) throw new Error("Kuvatiedostojen poisto epäonnistui.");
  };

  try {
    if (body.type === "photo") {
      const result = await restRequest(
        `profile_photos?select=id,profile_id,photo_path&id=eq.${body.id}&limit=1`,
      );
      if (!result.ok) return jsonResponse(502, "Kuvan tietojen haku epäonnistui.");
      const rows = await result.json();
      const photo = rows[0];
      if (!photo) return jsonResponse(404, "Kuvaa ei löytynyt.");
      if (photo.profile_id) {
        return jsonResponse(400, "Profiilikuva poistetaan poistamalla koko profiili.");
      }
      await removeObjects([photo.photo_path]);
      const deleted = await restRequest(`profile_photos?id=eq.${photo.id}`, {
        method: "DELETE",
      });
      if (!deleted.ok) return jsonResponse(502, "Kuva poistettiin tallennustilasta, mutta tietokannan päivitys epäonnistui.");
      return jsonResponse(200, "Juhlakuvan poisto onnistui.");
    }

    const profileResult = await restRequest(
      `profiles?select=id,photo_path&id=eq.${body.id}&limit=1`,
    );
    if (!profileResult.ok) return jsonResponse(502, "Profiilin tietojen haku epäonnistui.");
    const profiles = await profileResult.json();
    const profile = profiles[0];
    if (!profile) return jsonResponse(404, "Profiilia ei löytynyt.");

    const photosResult = await restRequest(
      `profile_photos?select=photo_path&profile_id=eq.${profile.id}`,
    );
    if (!photosResult.ok) return jsonResponse(502, "Profiilin kuvien haku epäonnistui.");
    const profilePhotos = await photosResult.json();
    await removeObjects([profile.photo_path, ...profilePhotos.map((photo: { photo_path: string }) => photo.photo_path)]);
    const deleted = await restRequest(`profiles?id=eq.${profile.id}`, {
      method: "DELETE",
    });
    if (!deleted.ok) return jsonResponse(502, "Kuvat poistettiin tallennustilasta, mutta profiilin poisto epäonnistui.");
    return jsonResponse(200, "Profiili ja kuvat poistettu.");
  } catch (error) {
    console.error("Admin image deletion failed:", error);
    return jsonResponse(502, error instanceof Error ? error.message : "Poisto epäonnistui.");
  }
});
