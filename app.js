(function () {
  "use strict";

  const form = document.getElementById("profile-form");
  if (!form) return;
  const input = document.getElementById("photo-input");
  const preview = document.getElementById("photo-preview");
  const message = document.getElementById("form-message");
  const submit = document.getElementById("submit-button");
  const gallery = document.getElementById("gallery-grid");
  const count = document.getElementById("profile-count");
  const countCopy = document.getElementById("gallery-count-copy");
  const albumDialog = document.getElementById("album-dialog");
  const albumGrid = document.getElementById("album-photos");
  let selectedPhoto = null;
  let lastSnapshot = "";

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle("is-error", Boolean(isError));
  }

  function renderPhotoAlbum(profile, photos) {
    document.getElementById("album-title").textContent = profile.nickname + " — profiilikuvat";
    document.getElementById("album-description").textContent = "Nimimerkin " + profile.nickname + " profiilikuva.";
    albumGrid.replaceChildren();
    photos.forEach(function (photo) {
      const figure = document.createElement("figure");
      figure.className = "album-photo";
      const image = document.createElement("img");
      image.src = window.GalleryBackend.getPhotoUrl(photo.photo_path);
      image.alt = "Nimimerkin " + profile.nickname + " profiilikuva";
      image.loading = "lazy";
      const caption = document.createElement("figcaption");
      const date = new Date(photo.created_at);
      caption.textContent = Number.isNaN(date.getTime())
        ? "Profiilikuva"
        : date.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
      figure.append(image, caption);
      albumGrid.appendChild(figure);
    });
    albumDialog.showModal();
  }

  function createProfileCard(profile, photos) {
    const card = document.createElement("article");
    card.className = "profile-card";
    const photoWrap = document.createElement("div");
    photoWrap.className = "card-photo-wrap";
    const image = document.createElement("img");
    image.className = "card-photo";
    image.src = window.GalleryBackend.getPhotoUrl(profile.photo_path);
    image.alt = "Nimimerkin " + profile.nickname + " profiilikuva";
    image.loading = "lazy";
    image.onerror = function () {
      image.removeAttribute("src");
      image.alt = "Profiilikuva ei ole saatavilla";
      photoWrap.classList.add("photo-missing");
    };
    photoWrap.appendChild(image);

    const meta = document.createElement("div");
    meta.className = "card-meta";
    const heading = document.createElement("h3");
    heading.textContent = profile.nickname;
    const date = new Date(profile.created_at);
    const time = document.createElement("span");
    time.className = "card-time";
    time.textContent = Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
    meta.append(heading, time);

    const button = document.createElement("button");
    button.className = "album-button";
    button.type = "button";
    button.textContent = "Profiilikuva »";
    button.addEventListener("click", function () { renderPhotoAlbum(profile, photos); });
    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.appendChild(button);
    card.append(photoWrap, meta, actions);
    return card;
  }

  async function loadGallery() {
    try {
      const result = await Promise.all([
        window.GalleryBackend.loadProfiles(),
        window.GalleryBackend.loadPhotos()
      ]);
      const profiles = result[0];
      const photos = result[1];
      const photoGroups = {};
      photos.forEach(function (photo) {
        if (photo.profile_id) {
          if (!photoGroups[photo.profile_id]) photoGroups[photo.profile_id] = [];
          photoGroups[photo.profile_id].push(photo);
        }
      });
      const snapshot = JSON.stringify({ profiles: profiles, photos: photos });
      if (snapshot === lastSnapshot) return;
      lastSnapshot = snapshot;
      gallery.replaceChildren();
      if (!profiles.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        const face = document.createElement("span");
        face.className = "empty-icon";
        face.textContent = ":-)";
        face.setAttribute("aria-hidden", "true");
        const title = document.createElement("strong");
        title.textContent = "Galleria odottaa ensimmäistä juhlijaa!";
        const hint = document.createElement("span");
        hint.textContent = "Lisää nimimerkki ja profiilikuva juhlan aluksi.";
        const link = document.createElement("a");
        link.href = "#oma-profiili";
        link.textContent = "Luo oma profiili »";
        empty.append(face, title, hint, link);
        gallery.appendChild(empty);
      } else {
        profiles.forEach(function (profile) {
          gallery.appendChild(createProfileCard(profile, photoGroups[profile.id] || [{
            id: "profile-" + profile.id,
            photo_path: profile.photo_path,
            created_at: profile.created_at
          }]));
        });
      }
      count.textContent = String(profiles.length);
      countCopy.textContent = String(profiles.length);
    } catch (error) {
      lastSnapshot = "";
      gallery.replaceChildren();
      const failure = document.createElement("div");
      failure.className = "load-error";
      failure.textContent = "Gallerian lataus epäonnistui: " + error.message;
      gallery.appendChild(failure);
      count.textContent = "!";
      countCopy.textContent = "ei saatavilla";
    }
  }

  input.addEventListener("change", function () {
    selectedPhoto = input.files[0] || null;
    preview.replaceChildren();
    preview.classList.toggle("has-photo", Boolean(selectedPhoto));
    if (!selectedPhoto) {
      const plus = document.createElement("span");
      plus.className = "photo-placeholder-icon";
      plus.textContent = "+";
      const label = document.createElement("span");
      label.className = "photo-placeholder-text";
      label.innerHTML = "Valitse kuva<br><small>tai ota uusi</small>";
      preview.append(plus, label);
      return;
    }
    const image = document.createElement("img");
    image.src = URL.createObjectURL(selectedPhoto);
    image.alt = "Valittu profiilikuva";
    preview.appendChild(image);
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const nickname = document.getElementById("nickname").value.trim();
    if (!nickname || !selectedPhoto) {
      setMessage("Lisää nimimerkki ja profiilikuva ennen julkaisua.", true);
      return;
    }
    submit.disabled = true;
    submit.textContent = "Luodaan profiilia…";
    setMessage("Ladataan profiilikuvaa…", false);
    try {
      const existing = await window.GalleryBackend.loadProfiles();
      if (existing.some(function (profile) {
        return profile.nickname.toLocaleLowerCase("fi") === nickname.toLocaleLowerCase("fi");
      })) {
        throw new Error("Nimimerkki on jo käytössä. Valitse toinen.");
      }
      const photoPath = await window.GalleryBackend.uploadPhoto(selectedPhoto);
      await window.GalleryBackend.createProfile(nickname, photoPath);
      form.reset();
      selectedPhoto = null;
      preview.replaceChildren();
      preview.classList.remove("has-photo");
      const plus = document.createElement("span");
      plus.className = "photo-placeholder-icon";
      plus.textContent = "+";
      const label = document.createElement("span");
      label.className = "photo-placeholder-text";
      label.innerHTML = "Valitse kuva<br><small>tai ota uusi</small>";
      preview.append(plus, label);
      setMessage("Nimimerkki luotu ja lisätty galleriaan!", false);
      await loadGallery();
    } catch (error) {
      setMessage("Profiilin luonti epäonnistui: " + error.message, true);
    } finally {
      submit.disabled = false;
      submit.textContent = "Luo profiili »";
    }
  });

  albumDialog.addEventListener("click", function (event) {
    if (event.target === albumDialog) albumDialog.close();
  });

  loadGallery();
  if (window.GALLERY_CONFIG && window.GALLERY_CONFIG.supabaseUrl && window.GALLERY_CONFIG.supabaseAnonKey) {
    window.setInterval(loadGallery, 30000);
  }
}());
