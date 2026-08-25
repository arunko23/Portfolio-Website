interface Env {
  DB: D1Database;
  // ImageKit credentials — configured as Cloudflare Pages secrets (never in source code)
  IMAGEKIT_PRIVATE_KEY: string;
  IMAGEKIT_PUBLIC_KEY: string;
  IMAGEKIT_URL_ENDPOINT: string;
}

/**
 * Upload a file to ImageKit using their server-side upload REST API.
 * Docs: https://docs.imagekit.io/api-reference/upload-file-api/server-side-file-upload
 *
 * ImageKit expects a multipart/form-data POST to https://upload.imagekit.io/api/v1/files/upload
 * with HTTP Basic Auth where the username is the private key and the password is empty.
 */
async function uploadToImageKit(
  file: File,
  fileName: string,
  privateKey: string,
  folder: string = "maplocate"
): Promise<string> {
  const body = new FormData();
  body.append("file", file, fileName);
  body.append("fileName", fileName);
  body.append("folder", folder);
  body.append("useUniqueFileName", "false"); // we already generate a unique name ourselves

  // ImageKit uses HTTP Basic Auth: privateKey as username, empty string as password
  const credentials = btoa(`${privateKey}:`);

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ImageKit upload failed (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as { url: string };
  return result.url; // full public HTTPS URL, e.g. https://ik.imagekit.io/<your-id>/maplocate/...
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const formData = await request.formData();

    // 1. Extract and validate required fields
    const sector        = formData.get("sector") as string;
    const lat           = parseFloat(formData.get("lat") as string);
    const lng           = parseFloat(formData.get("lng") as string);
    const pic           = formData.get("pic") as string;
    const obstacleRiskId = parseInt(formData.get("obstacle_risk_id") as string);
    const burnoutRiskId  = parseInt(formData.get("burnout_risk_id") as string);
    const animalRiskId   = parseInt(formData.get("animal_risk_id") as string);
    const securityRiskId = parseInt(formData.get("security_risk_id") as string);
    const sizeRiskId     = parseInt(formData.get("size_risk_id") as string);
    const remarks        = formData.get("remarks") as string;
    const photo          = formData.get("photo") as File | null;

    if (
      !sector ||
      isNaN(lat) || isNaN(lng) ||
      !pic ||
      isNaN(obstacleRiskId) || isNaN(burnoutRiskId) || isNaN(animalRiskId) || isNaN(securityRiskId) || isNaN(sizeRiskId)
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let imageUrl: string | null = null;

    // 2. Validate & upload photo to ImageKit (optional — submission still works without a photo)
    if (photo && photo.size > 0) {
      if (photo.size > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Image exceeds 5MB limit" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const type = photo.type;
      if (type !== "image/jpeg" && type !== "image/png") {
        return new Response(
          JSON.stringify({ error: "Only JPG and PNG images are allowed" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const fileExtension = type === "image/jpeg" ? "jpg" : "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

      imageUrl = await uploadToImageKit(
        photo,
        fileName,
        env.IMAGEKIT_PRIVATE_KEY
      );
    }

    // 3. Insert location into D1
    const locationInsert = await env.DB.prepare(
      "INSERT INTO locations (name, lat, lng) VALUES (?, ?, ?) RETURNING id"
    )
      .bind(sector, lat, lng)
      .first<{ id: number }>();

    const locationId = locationInsert!.id;

    // 4. Insert submission into D1 (image_url is the full ImageKit HTTPS URL, or null)
    await env.DB.prepare(
      `INSERT INTO submissions
        (location_id, pic, obstacle_risk_id, burnout_risk_id, animal_risk_id, security_risk_id, size_risk_id, remarks, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(locationId, pic, obstacleRiskId, burnoutRiskId, animalRiskId, securityRiskId, sizeRiskId, remarks || null, imageUrl)
      .run();

    // 5. Return the same response format as before
    return new Response(
      JSON.stringify({ success: true, message: "Submission saved" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: "Failed to process submission" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
