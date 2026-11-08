(function () {
  "use strict";

  const form = document.getElementById("party-photo-form");
  if (!form) return;
  const input = document.getElementById("party-photo-input");
  const message = document.getElementById("party-photo-message");
  const submit = document.getElementById("party-photo-submit");
  const selectedPhotos = document.getElementById("selected-photos");
  let previewUrls = [];

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle("is-error", Boolean(isError));
  }

  function clearPreviews() {
    previewUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    previewUrls = [];
    selectedPhotos.replaceChildren();
  }

  input.addEventListener("change", function () {
    clearPreviews();
    const files = Array.from(input.files || []);
    if (!files.length) {
      const hint = document.createElement("span");
      hint.textContent = "Valitse yksi tai useampi juhlatunnelma!";
      selectedPhotos.appendChild(hint);
      return;
    }
    files.slice(0, 6).forEach(function (file) {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      image.src = url;
      image.alt = "";
      const caption = document.createElement("figcaption");
      caption.textContent = file.name;
      figure.append(image, caption);
      selectedPhotos.appendChild(figure);
    });
    if (files.length > 6) {
      const more = document.createElement("span");
      more.className = "photo-count-extra";
      more.textContent = "+ " + (files.length - 6) + " muuta kuvaa";
      selectedPhotos.appendChild(more);
    }
    setMessage(files.length + (files.length === 1 ? " kuva valittu." : " kuvaa valittu."), false);
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const files = Array.from(input.files || []);
    if (!files.length) {
      setMessage("Valitse ensin puhelimesta vähintään yksi kuva.", true);
      return;
    }
    submit.disabled = true;
    input.disabled = true;
    let uploaded = 0;
    const errors = [];
    for (let index = 0; index < files.length; index += 1) {
      setMessage("Ladataan kuvaa " + (index + 1) + " / " + files.length + "…", false);
      try {
        await window.GalleryBackend.addPartyPhoto(files[index]);
        uploaded += 1;
      } catch (error) {
        errors.push(files[index].name + ": " + error.message);
      }
    }
    input.disabled = false;
    submit.disabled = false;
    if (uploaded) {
      input.value = "";
      clearPreviews();
      const complete = uploaded === files.length;
      setMessage(
        uploaded + (uploaded === 1 ? " kuva lisätty juhlanäyttöön." : " kuvaa lisätty juhlanäyttöön.")
          + (errors.length ? " " + errors.length + " kuvan lataus epäonnistui." : " Kiitos, kuva näkyy pian!"),
        !complete
      );
    } else {
      setMessage("Kuvia ei saatu ladattua. " + errors.join(" "), true);
    }
  });
}());
