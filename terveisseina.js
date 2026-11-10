(function () {
  "use strict";

  const form = document.getElementById("guestbook-form");
  const formMessage = document.getElementById("guestbook-form-message");
  const nicknameInput = document.getElementById("guestbook-nickname");
  const messageInput = document.getElementById("guestbook-message");
  const submitButton = document.getElementById("guestbook-submit");
  const messageLists = Array.from(document.querySelectorAll("[data-party-messages]"));
  const status = document.getElementById("guestbook-status");
  if (!messageLists.length) return;

  let loading = false;
  let submitting = false;

  function getChatErrorMessage(error) {
    const details = error && error.message ? error.message : "Tuntematon virhe.";
    if (details.includes("party_messages") || details.includes("post_party_message")) {
      return "Chatin tietokantaa ei ole vielä otettu käyttöön. Ylläpito voi katsoa käyttöönotto-ohjeet.";
    }
    return "Pyyntö epäonnistui: " + details;
  }

  function createMessageItem(message) {
    const item = document.createElement("li");
    item.className = "guestbook-message";
    const header = document.createElement("div");
    header.className = "guestbook-message-header";
    const nickname = document.createElement("strong");
    nickname.textContent = message.nickname;
    const date = new Date(message.created_at);
    const time = document.createElement("time");
    time.dateTime = message.created_at;
    time.textContent = Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
    const body = document.createElement("p");
    body.textContent = message.message;
    header.append(nickname, time);
    item.append(header, body);
    return item;
  }

  function renderMessages(messages) {
    messageLists.forEach(function (list) {
      const maxMessages = Number(list.dataset.limit) || 50;
      const visibleMessages = messages.slice(0, maxMessages);
      list.replaceChildren();
      if (!visibleMessages.length) {
        const empty = document.createElement("li");
        empty.className = "guestbook-empty";
        empty.textContent = "Ei vielä tervehdyksiä — kirjoita illan ensimmäinen viesti!";
        list.append(empty);
        return;
      }
      visibleMessages.forEach(function (message) {
        list.append(createMessageItem(message));
      });
    });
  }

  async function loadMessages() {
    if (loading) return;
    loading = true;
    try {
      const messages = await window.GalleryBackend.loadPartyMessages();
      renderMessages(messages);
      if (status) status.textContent = "Viestit päivittyvät automaattisesti.";
    } catch (error) {
      messageLists.forEach(function (list) {
        const failure = document.createElement("li");
        failure.className = "guestbook-error";
        failure.textContent = getChatErrorMessage(error);
        list.replaceChildren(failure);
      });
      if (status) status.textContent = "Viestiseinä ei ole käytettävissä.";
    } finally {
      loading = false;
    }
  }

  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const nickname = nicknameInput.value.trim();
      const message = messageInput.value.trim();
      if (!nickname || nickname.length > 24 || !message || message.length > 200) {
        formMessage.textContent = "Tarkista nimimerkki ja viesti (enintään 200 merkkiä).";
        formMessage.classList.add("is-error");
        return;
      }

      submitting = true;
      submitButton.disabled = true;
      submitButton.textContent = "Lähetetään…";
      formMessage.classList.remove("is-error");
      formMessage.textContent = "Lähetetään tervehdystä…";
      try {
        await window.GalleryBackend.postPartyMessage(nickname, message);
        messageInput.value = "";
        formMessage.textContent = "Tervehdys lisättiin seinälle!";
        await loadMessages();
      } catch (error) {
        formMessage.textContent = "Viestin lähetys epäonnistui. " + getChatErrorMessage(error);
        formMessage.classList.add("is-error");
      } finally {
        submitting = false;
        submitButton.disabled = false;
        submitButton.textContent = "Lähetä tervehdys »";
      }
    });
  }

  loadMessages();
  window.setInterval(function () {
    if (!submitting) loadMessages();
  }, 10000);
}());
