(function () {
  "use strict";

  const image = document.getElementById("slideshow-photo");
  const empty = document.getElementById("slideshow-empty");
  const nickname = document.getElementById("slideshow-nickname");
  const count = document.getElementById("slide-count");
  const status = document.getElementById("slideshow-status");
  const profileQr = document.getElementById("profile-qr");
  const profileQrLink = document.getElementById("profile-qr-link");
  const profileQrFallback = document.getElementById("profile-qr-fallback");
  const qr = document.getElementById("upload-qr");
  const qrLink = document.getElementById("upload-qr-link");
  const qrFallback = document.getElementById("qr-fallback");
  const slideDurationMs = 6000;
  const photoRefreshMs = 2000;
  let photos = [];
  let current = 0;
  let currentId = "";
  let hasDisplayedPhoto = false;
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
  setQrCode(qr, qrLink, qrFallback, new URL("lataa.html", window.location.href).href);

  function displayPhoto(index) {
    if (!photos.length) {
      image.hidden = true;
      empty.hidden = false;
      nickname.textContent = "Juhlakuvat";
      count.textContent = "0 / 0";
      return;
    }
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    currentId = photo.id;
    hasDisplayedPhoto = true;
    image.src = window.GalleryBackend.getPhotoUrl(photo.photo_path);
    image.alt = photo.nickname
      ? "Nimimerkin " + photo.nickname + " juhlaprofiilikuva"
      : "Juhlissa otettu yhteinen kuva";
    image.hidden = false;
    empty.hidden = true;
    nickname.textContent = photo.nickname || "Juhlatunnelmia";
    count.textContent = (current + 1) + " / " + photos.length;
  }

  async function loadSlideshowPhotos() {
    if (refreshInProgress) return;
    refreshInProgress = true;
    try {
      const latest = await window.GalleryBackend.loadPhotos();
      const index = latest.findIndex(function (photo) { return photo.id === currentId; });
      photos = latest;
      if (latest.length) {
        if (index >= 0) {
          current = index;
          count.textContent = (current + 1) + " / " + photos.length;
          if (!hasDisplayedPhoto) displayPhoto(current);
        } else {
          displayPhoto(0);
        }
        status.textContent = "Skannaa QR-koodi ja lisää juhlakuvasi! Kuvat vaihtuvat 6 sekunnin välein, ja uudet kuvat lisätään jonoon automaattisesti.";
      } else {
        displayPhoto(0);
        status.textContent = "Galleria odottaa ensimmäisiä kuvia. Skannaa QR-koodi ja lähetä kuva!";
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

  loadSlideshowPhotos();
  window.setInterval(function () {
    if (photos.length) displayPhoto(current + 1);
  }, slideDurationMs);
  window.setInterval(loadSlideshowPhotos, photoRefreshMs);
}());
