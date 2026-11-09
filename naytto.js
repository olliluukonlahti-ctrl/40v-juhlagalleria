(function () {
  "use strict";

  const image = document.getElementById("slideshow-photo");
  const profileGrid = document.getElementById("profile-grid");
  const empty = document.getElementById("slideshow-empty");
  const photoWrap = document.getElementById("slideshow-photo-wrap");
  const nickname = document.getElementById("slideshow-nickname");
  const count = document.getElementById("slide-count");
  const status = document.getElementById("slideshow-status");
  const profileQr = document.getElementById("profile-qr");
  const profileQrLink = document.getElementById("profile-qr-link");
  const profileQrFallback = document.getElementById("profile-qr-fallback");
  const slideDurationMs = 6000;
  const overviewDurationMs = 8000;
  const photoRefreshMs = 2000;
  let photos = [];
  let current = 0;
  let currentId = "";
  let gridSignature = "";
  let presentationMode = "overview";
  let presentationStarted = false;
  let presentationTimer = 0;
  let refreshInProgress = false;

  function setQrCode(image, link, fallback, targetUrl) {
    link.href = targetUrl;
    image.src = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=4&data=" + encodeURIComponent(targetUrl);
    image.addEventListener("error", function () {
      image.hidden = true;
      fallback.hidden = false;
    });
  }

  setQrCode(
    profileQr,
    profileQrLink,
    profileQrFallback,
    new URL("index.html#oma-profiili", window.location.href).href
  );

  function displayPhoto(index) {
    if (!photos.length) {
      window.clearTimeout(presentationTimer);
      presentationTimer = 0;
      presentationMode = "empty";
      photoWrap.classList.remove("is-overview");
      profileGrid.hidden = true;
      image.hidden = true;
      empty.hidden = false;
      nickname.textContent = "Juhlakuvat";
      count.textContent = "0 / 0";
      return;
    }
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    currentId = photo.id;
    presentationMode = "focus";
    photoWrap.classList.remove("is-overview");
    image.src = window.GalleryBackend.getPhotoUrl(photo.photo_path);
    image.alt = photo.nickname
      ? "Nimimerkin " + photo.nickname + " juhlaprofiilikuva"
      : "Juhlissa otettu yhteinen kuva";
    image.hidden = false;
    empty.hidden = true;
    profileGrid.hidden = true;
    image.classList.remove("photo-focus-in");
    void image.offsetWidth;
    image.classList.add("photo-focus-in");
    nickname.textContent = photo.nickname || "Juhlatunnelmia";
    count.textContent = (current + 1) + " / " + photos.length;
    window.clearTimeout(presentationTimer);
    presentationTimer = window.setTimeout(function () {
      displayPhoto(current + 1);
    }, slideDurationMs);
  }

  function displayOverview() {
    if (!photos.length) {
      displayPhoto(0);
      return;
    }
    presentationMode = "overview";
    photoWrap.classList.add("is-overview");
    profileGrid.hidden = false;
    image.hidden = true;
    empty.hidden = true;
    nickname.textContent = "Juhlaprofiilit";
    count.textContent = photos.length + (photos.length === 1 ? " profiili" : " profiilia");
    window.clearTimeout(presentationTimer);
    presentationTimer = window.setTimeout(function () {
      displayPhoto(current);
    }, overviewDurationMs);
  }

  function renderProfileGrid() {
    const signature = photos.map(function (photo) {
      return [photo.id, photo.nickname, photo.photo_path].join(":");
    }).join("|");
    if (signature === gridSignature) return;
    gridSignature = signature;
    profileGrid.replaceChildren();
    photos.forEach(function (photo, index) {
      const tile = document.createElement("div");
      tile.className = "profile-tile";
      tile.style.setProperty("--tile-index", index);
      const tileImage = document.createElement("img");
      tileImage.src = window.GalleryBackend.getPhotoUrl(photo.photo_path);
      tileImage.alt = "";
      tileImage.loading = "eager";
      const tileName = document.createElement("span");
      tileName.textContent = photo.nickname || "Juhlatunnelmia";
      tile.append(tileImage, tileName);
      profileGrid.append(tile);
    });
  }

  async function loadSlideshowPhotos() {
    if (refreshInProgress) return;
    refreshInProgress = true;
    try {
      const latest = await window.GalleryBackend.loadProfilePhotos();
      const index = latest.findIndex(function (photo) { return photo.id === currentId; });
      photos = latest;
      if (latest.length) {
        renderProfileGrid();
        if (index >= 0) {
          current = index;
          if (presentationMode === "focus") {
            count.textContent = (current + 1) + " / " + photos.length;
          } else if (presentationMode === "overview") {
            count.textContent = photos.length + (photos.length === 1 ? " profiili" : " profiilia");
          }
        } else if (currentId) {
          current = 0;
          if (presentationMode === "focus") displayPhoto(0);
          else if (presentationMode === "overview" && presentationStarted) displayOverview();
        }
        if (!presentationStarted || presentationMode === "empty") {
          presentationStarted = true;
          current = 0;
          displayOverview();
        }
        status.textContent = "Kaikki profiilit näkyvät ensin yhdessä. Sen jälkeen kuvat vaihtuvat 6 sekunnin välein, ja uudet profiilikuvat tulevat mukaan automaattisesti.";
      } else {
        gridSignature = "";
        displayPhoto(0);
        status.textContent = "Galleria odottaa ensimmäisiä profiileja. Luo profiili QR-koodilla tai ota kuva ovikameralla.";
      }
    } catch (error) {
      status.textContent = "Kuvien lataus epäonnistui: " + error.message;
    } finally {
      refreshInProgress = false;
    }
  }

  document.getElementById("previous-slide").addEventListener("click", function () {
    if (photos.length) displayPhoto(current - 1);
  });
  document.getElementById("next-slide").addEventListener("click", function () {
    if (photos.length) displayPhoto(current + 1);
  });
  document.getElementById("fullscreen-button").addEventListener("click", async function () {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      status.textContent = "Kokoruututilaa ei voitu avata tässä selaimessa: " + error.message;
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft" && photos.length) displayPhoto(current - 1);
    if (event.key === "ArrowRight" && photos.length) displayPhoto(current + 1);
  });

  document.getElementById("slideshow-photo-wrap").addEventListener("click", function (event) {
    if (presentationMode === "overview" && !event.target.closest(".slide-arrow") && photos.length) {
      displayPhoto(current);
    }
  });

  loadSlideshowPhotos();
  window.setInterval(loadSlideshowPhotos, photoRefreshMs);
}());
