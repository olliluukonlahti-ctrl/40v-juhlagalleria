(function () {
  "use strict";

  const form = document.getElementById("door-form");
  const nicknameInput = document.getElementById("door-nickname");
  const video = document.getElementById("door-video");
  const preview = document.getElementById("door-preview");
  const placeholder = document.getElementById("door-placeholder");
  const countdown = document.getElementById("door-countdown");
  const startButton = document.getElementById("start-camera");
  const captureButton = document.getElementById("take-photo");
  const retakeButton = document.getElementById("retake-photo");
  const publishButton = document.getElementById("publish-photo");
  const message = document.getElementById("door-message");
  let stream = null;
  let capturedPhoto = null;
  let previewUrl = "";
  let countdownTimer = 0;

  function setMessage(text, kind) {
    message.textContent = text;
    message.classList.toggle("is-error", kind === "error");
    message.classList.toggle("is-success", kind === "success");
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(function (track) { track.stop(); });
      stream = null;
    }
    video.srcObject = null;
  }

  function resetCapture() {
    window.clearTimeout(countdownTimer);
    countdownTimer = 0;
    countdown.hidden = true;
    countdown.textContent = "";
    capturedPhoto = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = "";
    }
    preview.removeAttribute("src");
    preview.hidden = true;
    video.hidden = true;
    placeholder.hidden = false;
    captureButton.hidden = true;
    retakeButton.hidden = true;
    publishButton.hidden = true;
  }

  function capturePhoto() {
    if (!stream || !video.videoWidth || !video.videoHeight) {
      setMessage("Kamera ei ole vielä valmis. Yritä hetken kuluttua uudelleen.", "error");
      captureButton.disabled = false;
      return;
    }
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      setMessage("Kuvaa ei voitu käsitellä tässä selaimessa.", "error");
      captureButton.disabled = false;
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(function (blob) {
      if (!blob) {
        setMessage("Kuvan ottaminen epäonnistui. Yritä uudelleen.", "error");
        captureButton.disabled = false;
        return;
      }
      capturedPhoto = new File([blob], "ovikuva.jpg", { type: "image/jpeg" });
      previewUrl = URL.createObjectURL(capturedPhoto);
      preview.src = previewUrl;
      preview.hidden = false;
      video.hidden = true;
      placeholder.hidden = true;
      captureButton.hidden = true;
      captureButton.disabled = false;
      retakeButton.hidden = false;
      publishButton.hidden = false;
      stopCamera();
      setMessage("Tarkista kuva ja nimimerkki. Mitään ei julkaista ennen Julkaise profiili -painallusta.", "");
    }, "image/jpeg", 0.9);
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Kamera vaatii HTTPS-yhteyden ja selaimen, joka tukee kameran käyttöä.");
    }
    stopCamera();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user" }
    });
    video.srcObject = stream;
    video.hidden = false;
    placeholder.hidden = true;
    await video.play();
    startButton.hidden = true;
    captureButton.hidden = false;
    retakeButton.hidden = true;
    setMessage("Kamera on valmis. Ota kuva, kun vieras on valmiina.", "");
  }

  startButton.addEventListener("click", async function () {
    startButton.disabled = true;
    setMessage("Pyydetään kameran käyttöoikeutta…", "");
    try {
      await startCamera();
    } catch (error) {
      stopCamera();
      video.hidden = true;
      placeholder.hidden = false;
      setMessage(error.message || "Kameraa ei voitu käynnistää.", "error");
    } finally {
      startButton.disabled = false;
    }
  });

  captureButton.addEventListener("click", async function () {
    captureButton.disabled = true;
    countdown.hidden = false;
    for (const number of ["3…", "2…", "1…"]) {
      countdown.textContent = number;
      await new Promise(function (resolve) {
        countdownTimer = window.setTimeout(resolve, 900);
      });
    }
    countdown.textContent = "📸";
    await new Promise(function (resolve) {
      countdownTimer = window.setTimeout(resolve, 250);
    });
    countdown.hidden = true;
    countdown.textContent = "";
    countdownTimer = 0;
    capturePhoto();
  });

  retakeButton.addEventListener("click", async function () {
    resetCapture();
    retakeButton.hidden = false;
    startButton.hidden = true;
    startButton.disabled = true;
    setMessage("Käynnistetään kamera uudelleen…", "");
    try {
      await startCamera();
    } catch (error) {
      stopCamera();
      startButton.hidden = false;
      retakeButton.hidden = true;
      placeholder.hidden = false;
      setMessage(error.message || "Kameraa ei voitu käynnistää.", "error");
    } finally {
      startButton.disabled = false;
    }
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const nickname = nicknameInput.value.trim();
    if (!nickname || !capturedPhoto || !document.getElementById("door-consent").checked) {
      setMessage("Kirjoita nimimerkki, ota kuva ja varmista vieraan lupa ennen julkaisua.", "error");
      return;
    }
    publishButton.disabled = true;
    retakeButton.disabled = true;
    publishButton.textContent = "Julkaistaan…";
    try {
      const profiles = await window.GalleryBackend.loadProfiles();
      if (profiles.some(function (profile) {
        return profile.nickname.toLocaleLowerCase("fi") === nickname.toLocaleLowerCase("fi");
      })) {
        throw new Error("Nimimerkki on jo käytössä. Valitse uusi nimimerkki.");
      }
      const photoPath = await window.GalleryBackend.uploadPhoto(capturedPhoto);
      await window.GalleryBackend.createProfile(nickname, photoPath);
      form.reset();
      resetCapture();
      startButton.hidden = false;
      setMessage("Profiili julkaistiin! Se näkyy nyt juhlagalleriassa.", "success");
    } catch (error) {
      setMessage("Julkaisu epäonnistui: " + error.message, "error");
    } finally {
      publishButton.disabled = false;
      retakeButton.disabled = false;
      publishButton.textContent = "Julkaise profiili";
    }
  });

  window.addEventListener("pagehide", stopCamera);
}());
