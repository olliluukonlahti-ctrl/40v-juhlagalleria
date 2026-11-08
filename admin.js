(function () {
  "use strict";

  const form = document.getElementById("admin-password-form");
  const passwordInput = document.getElementById("admin-password");
  const message = document.getElementById("admin-message");
  const profilesContainer = document.getElementById("admin-profiles");
  const photosContainer = document.getElementById("admin-photos");
  const reloadButton = document.getElementById("admin-reload");
  let busy = false;
  let verified = false;

  reloadButton.disabled = true;

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle("is-error", Boolean(isError));
  }

  function button(label, className, action) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = label;
    element.addEventListener("click", action);
    return element;
  }

  function confirmDelete(itemName) {
    return window.confirm("Poistetaanko " + itemName + " pysyvästi juhlagalleriasta?");
  }

  async function removeProfile(profile) {
    if (busy || !confirmDelete("nimimerkki " + profile.nickname + " ja sen profiilikuvat")) return;
    busy = true;
    try {
      await window.GalleryBackend.deleteProfile(profile.id, passwordInput.value);
      setMessage("Profiili ja siihen liittyvät kuvat poistettiin.", false);
      await loadItems();
    } catch (error) {
      setMessage("Poisto epäonnistui: " + error.message, true);
    } finally {
      busy = false;
    }
  }

  async function removePhoto(photo) {
    if (busy || !confirmDelete("tämä juhlakuv")) return;
    busy = true;
    try {
      await window.GalleryBackend.deletePartyPhoto(photo.id, passwordInput.value);
      setMessage("Juhlakuvan poisto onnistui.", false);
      await loadItems();
    } catch (error) {
      setMessage("Poisto epäonnistui: " + error.message, true);
    } finally {
      busy = false;
    }
  }

  function createItem(imagePath, title, caption, deleteLabel, onDelete) {
    const item = document.createElement("article");
    item.className = "admin-item";
    const image = document.createElement("img");
    image.src = window.GalleryBackend.getPhotoUrl(imagePath);
    image.alt = title;
    image.loading = "lazy";
    const details = document.createElement("div");
    details.className = "admin-item-details";
    const heading = document.createElement("strong");
    heading.textContent = title;
    const note = document.createElement("span");
    note.textContent = caption;
    const removeButton = button(deleteLabel, "admin-delete-button", onDelete);
    details.append(heading, note, removeButton);
    item.append(image, details);
    return item;
  }

  async function loadItems() {
    if (!verified) return;
    reloadButton.disabled = true;
    try {
      const results = await Promise.all([
        window.GalleryBackend.loadProfiles(),
        window.GalleryBackend.loadPhotos()
      ]);
      const profiles = results[0];
      const photos = results[1];
      profilesContainer.replaceChildren();
      photosContainer.replaceChildren();
      if (!profiles.length) {
        profilesContainer.textContent = "Profiileja ei ole vielä.";
      } else {
        profiles.forEach(function (profile) {
          profilesContainer.appendChild(createItem(
            profile.photo_path,
            profile.nickname,
            "Profiili ja kaikki sen kuvat poistetaan.",
            "Poista profiili",
            function () { removeProfile(profile); }
          ));
        });
      }

      const partyPhotos = photos.filter(function (photo) { return !photo.profile_id; });
      if (!partyPhotos.length) {
        photosContainer.textContent = "Nimettömiä juhlakuvia ei ole vielä.";
      } else {
        partyPhotos.forEach(function (photo) {
          const date = new Date(photo.created_at);
          const caption = Number.isNaN(date.getTime())
            ? "Juhlakuvan lataus"
            : "Lisätty " + date.toLocaleString("fi-FI");
          photosContainer.appendChild(createItem(
            photo.photo_path,
            "Juhlatunnelmia",
            caption,
            "Poista kuva",
            function () { removePhoto(photo); }
          ));
        });
      }
      setMessage("Kuvat päivitetty.", false);
    } catch (error) {
      setMessage("Kuvien lataus epäonnistui: " + error.message, true);
    } finally {
      reloadButton.disabled = false;
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (passwordInput.value.length < 16) {
      setMessage("Ylläpitäjän salasanan pitää olla vähintään 16 merkkiä.", true);
      return;
    }
    reloadButton.disabled = true;
    setMessage("Tarkistetaan salasanaa…", false);
    window.GalleryBackend.verifyAdminPassword(passwordInput.value)
      .then(function () {
        verified = true;
        return loadItems();
      })
      .catch(function (error) {
        verified = false;
        setMessage("Ylläpitäjän salasana ei kelpaa: " + error.message, true);
      });
  });
  reloadButton.addEventListener("click", function () {
    if (verified) loadItems();
  });
}());
