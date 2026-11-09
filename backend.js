(function () {
  "use strict";

  const config = window.GALLERY_CONFIG || {};
  const apiUrl = (config.supabaseUrl || "").replace(/\/+$/, "");
  const apiKey = config.supabaseAnonKey || "";
  const maxPhotoBytes = 5 * 1024 * 1024;
  const maxInputPhotoBytes = 20 * 1024 * 1024;
  const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif", "image/gif", "image/bmp"];

  function request(path, options) {
    if (!apiUrl || !apiKey) throw new Error("Galleriaa ei ole yhdistetty tietokantaan. Ylläpitäjä: tarkista config.js.");
    const requestOptions = options || {};
    return fetch(apiUrl + path, Object.assign({}, requestOptions, {
      headers: Object.assign({
        apikey: apiKey
      }, requestOptions.headers || {})
    }));
  }

  async function checkResponse(response) {
    if (response.ok) return response;
    const body = await response.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed.message || parsed.error_description || parsed.error || body;
    } catch (_) {
      // The response body itself is shown when the service returns non-JSON.
    }
    throw new Error(message || "Pyyntö ei onnistunut. Yritä uudelleen.");
  }

  async function preparePhoto(file) {
    if (!supportedTypes.includes(file.type)) throw new Error("Valitse puhelimesta tuettu kuvatiedosto.");
    if (file.size > maxInputPhotoBytes) throw new Error("Kuvan enimmäiskoko on 20 Mt.");

    return new Promise(function (resolve, reject) {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = function () {
        URL.revokeObjectURL(objectUrl);
        if (!image.naturalWidth || !image.naturalHeight) {
          reject(new Error("Kuvan kokoa ei voitu tunnistaa."));
          return;
        }
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Kuvan käsittely ei onnistu tässä selaimessa."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error("Kuvan muuntaminen epäonnistui. Valitse toinen kuva."));
            return;
          }
          if (blob.size > maxPhotoBytes) {
            reject(new Error("Kuva on liian suuri vielä pakkauksen jälkeen. Valitse pienempi kuva."));
            return;
          }
          resolve(new File([blob], "juhlagalleria.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.82);
      };
      image.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Kuvaa ei voi avata tässä selaimessa. Valitse JPG-, PNG- tai WebP-kuva."));
      };
      image.src = objectUrl;
    });
  }

  async function uploadPhoto(file) {
    const compressedPhoto = await preparePhoto(file);
    const path = window.crypto.randomUUID() + ".jpg";
    await checkResponse(await request("/storage/v1/object/party-photos/" + path, {
      method: "POST",
      headers: { "Content-Type": compressedPhoto.type, "x-upsert": "false" },
      body: compressedPhoto
    }));
    return path;
  }

  async function loadProfiles() {
    const response = await request("/rest/v1/profiles?select=id,nickname,photo_path,created_at&order=created_at.desc&limit=100");
    return checkResponse(response).then(function (result) { return result.json(); });
  }

  async function loadPhotos() {
    const response = await request("/rest/v1/profile_photos?select=id,profile_id,nickname,photo_path,created_at&order=created_at.desc,id.desc&limit=1000", {
      cache: "no-store"
    });
    return checkResponse(response).then(function (result) { return result.json(); });
  }

  async function loadProfilePhotos() {
    const response = await request("/rest/v1/profile_photos?select=id,profile_id,nickname,photo_path,created_at&profile_id=not.is.null&order=created_at.desc,id.desc&limit=1000", {
      cache: "no-store"
    });
    return checkResponse(response).then(function (result) { return result.json(); });
  }

  async function createProfile(nickname, photoPath) {
    const response = await request("/rest/v1/rpc/create_guest_profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_nickname: nickname, p_photo_path: photoPath })
    });
    const result = await checkResponse(response).then(function (item) { return item.json(); });
    return typeof result === "string" ? result : result.id;
  }

  async function deletePartyPhoto(photoId, password) {
    const response = await request("/functions/v1/admin-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "photo", id: photoId, password: password })
    });
    return checkResponse(response).then(function (result) { return result.json(); });
  }

  async function verifyAdminPassword(password) {
    const response = await request("/functions/v1/admin-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "verify", password: password })
    });
    return checkResponse(response).then(function (result) { return result.json(); });
  }

  async function deleteProfile(profileId, password) {
    const response = await request("/functions/v1/admin-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "profile", id: profileId, password: password })
    });
    return checkResponse(response).then(function (result) { return result.json(); });
  }

  function getPhotoUrl(path) {
    if (!apiUrl) return "";
    return apiUrl + "/storage/v1/object/public/party-photos/" + path.split("/").map(encodeURIComponent).join("/");
  }

  window.GalleryBackend = {
    createProfile: createProfile,
    deletePartyPhoto: deletePartyPhoto,
    deleteProfile: deleteProfile,
    verifyAdminPassword: verifyAdminPassword,
    getPhotoUrl: getPhotoUrl,
    loadPhotos: loadPhotos,
    loadProfilePhotos: loadProfilePhotos,
    loadProfiles: loadProfiles,
    request: request,
    uploadPhoto: uploadPhoto
  };
}());
