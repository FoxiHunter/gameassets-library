const firebaseConfig = window.FIREBASE_CONFIG;
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function showToast(message, type = "success") {
  const notifier = document.getElementById("notifier");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  notifier.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");
const loginBlock = document.getElementById("login");
const loginForm = document.getElementById("loginForm");
const registerBtn = document.getElementById("registerBtn");
const googleLogin = document.getElementById("googleLogin");

const subcategoryPopup = document.getElementById("subcategoryPopup");
const loginOverlay = document.getElementById("loginOverlay");
let currentTheme = null;

document.addEventListener("click", (e) => {
  const isCategoryBtn = e.target.classList.contains("category-btn");
  const clickedTheme = isCategoryBtn ? e.target.dataset.theme : null;
  const clickedInsidePopup = e.target.closest("#subcategoryPopup");

  // Открытие/закрытие меню профиля
  if (e.target.id === "profileBtn") {
    profileMenu.style.display = profileMenu.style.display === "block" ? "none" : "block";
    return;
  }

  // Открытие формы логина
  if (e.target.id === "loginButton") {
    loginBlock.classList.add("show");
    loginOverlay.classList.add("active");
    document.body.classList.add("no-scroll");
    return;
  }

  // Закрытие формы логина при клике вне
  if (!e.target.closest("#loginForm") && !e.target.closest("#profileMenu")) {
    loginBlock.classList.remove("show");
    loginOverlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
  }

  // Категории
  if (isCategoryBtn) {
    const rect = e.target.getBoundingClientRect();

    if (clickedTheme === currentTheme && subcategoryPopup.classList.contains("animate")) {
      subcategoryPopup.classList.remove("animate");
      currentTheme = null;
      return;
    }

    subcategoryPopup.classList.remove("animate");
    void subcategoryPopup.offsetWidth;

    subcategoryPopup.setAttribute("data-theme", clickedTheme);
    subcategoryPopup.style.top = `${rect.bottom + window.scrollY}px`;
    subcategoryPopup.style.left = `${rect.left + window.scrollX}px`;
    subcategoryPopup.classList.add("animate");
    currentTheme = clickedTheme;
  } else if (!clickedInsidePopup) {
    subcategoryPopup.classList.remove("animate");
    currentTheme = null;
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    loginBlock.classList.remove("show");
    loginOverlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
    showToast("Вход выполнен!", "success");
  } catch {
    showToast("Ошибка входа. Проверьте email и пароль.", "error");
  }
});

registerBtn.addEventListener("click", async () => {
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    await firebase.auth().createUserWithEmailAndPassword(email, password);
    loginBlock.classList.remove("show");
    loginOverlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
    showToast("Аккаунт создан!", "success");
  } catch {
    showToast("Ошибка при регистрации. Email корректен? Пароль не короче 6 символов?", "error");
  }
});

googleLogin.addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await firebase.auth().signInWithPopup(provider);
    loginBlock.classList.remove("show");
    loginOverlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
    showToast("Вы вошли через Google!", "success");
  } catch (error) {
    showToast("Ошибка Google входа: " + error.message, "error");
  }
});

firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    profileMenu.innerHTML = `<button id="loginButton">Войти / Зарегистрироваться</button>`;
    profileBtn.style.backgroundImage = "";
    return;
  }

  // Установка ника, если не установлен
  if (!user.displayName) {
    const shortId = user.uid.slice(-4);
    const defaultName = `User${shortId}`;
    await user.updateProfile({ displayName: defaultName });
    showToast(`Ник установлен: ${defaultName}`, "success");
  }

  // ✅ Проверка и создание документа accessRights
  const docRef = db.collection("accessRights").doc(user.uid);
  const accessDoc = await docRef.get();

  if (!accessDoc.exists) {
    await docRef.set({
      canDownload: false,
      expiresAt: null
    });
  }

  // Отображение меню
  profileMenu.innerHTML = `
    <button id="profileOpenBtn">Профиль</button>
    <button>Доп. информация</button>
    <button onclick="firebase.auth().signOut(); showToast('Вы вышли', 'success')">Выйти</button>
  `;
document.getElementById("profileOpenBtn").addEventListener("click", openProfileCard);

  const avatar = user.photoURL || "img/avamg.png";
  profileBtn.style.backgroundImage = `url(${avatar})`;
  profileBtn.style.backgroundSize = "cover";
  profileBtn.style.backgroundPosition = "center";

  await checkDownloadPermission();
});


async function checkDownloadPermission() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  try {
    const doc = await db.collection("accessRights").doc(user.uid).get();
    const btns = document.querySelectorAll(".card-download");

    if (!doc.exists) {
      btns.forEach(btn => {
        btn.disabled = true;
        btn.textContent = "Недоступно";
        btn.classList.add("locked");
      });
      return;
    }

    const data = doc.data();
    const canDownload = data.canDownload === true;
    const expireAt = data.expireAt?.toDate?.();

    const isValid = canDownload && expireAt && new Date() < expireAt;

    btns.forEach(btn => {
      if (isValid) {
        btn.disabled = false;
        btn.textContent = "Скачать";
        btn.classList.remove("locked");
        btn.onclick = () => {
          const imageUrl = btn.closest(".download-card").querySelector(".card-image").src;
          const link = document.createElement("a");
          link.href = imageUrl;
          link.download = "ui-element.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
      } else {
        btn.disabled = true;
        btn.textContent = canDownload ? "Истекло" : "Недоступно";
        btn.classList.add("locked");
      }
    });

  } catch (e) {
    console.error("Ошибка доступа:", e);
  }
}




document.querySelectorAll(".subcategory-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const sub = btn.dataset.sub;
    const theme = subcategoryPopup.getAttribute("data-theme");
    loadCards(theme, sub);
    subcategoryPopup.classList.remove("animate");
    currentTheme = null;
  });
});

async function loadCards(theme, sub) {
  const content = document.getElementById("contentArea");
  content.innerHTML = "";

  try {
    const snapshot = await db.collection("images")
      .where("theme", "==", theme)
      .where("subcategory", "==", sub)
      .where("hidden", "==", false)
      .get();

    if (snapshot.empty) {
      content.innerHTML = `<p style="color:#aaa; font-size:18px;">Нет загруженных изображений.</p>`;
      return;
    }

    snapshot.forEach(doc => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "download-card";
      card.innerHTML = `
        <img class="card-image" src="${data.url}" alt="UI" />
        <div class="card-bottom">
          <span class="card-type">${theme} / ${sub}</span>
          <button class="card-download">Скачать</button>
        </div>
      `;
      content.appendChild(card);
    });

    await checkDownloadPermission();
  } catch (e) {
    console.error("Ошибка при загрузке карточек:", e);
    content.innerHTML = `<p style="color:#f66;">Ошибка загрузки данных.</p>`;
  }
}

function openProfileCard() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  document.getElementById("profileOverlay").style.display = "flex";
  renderProfileCard(user);
}

function renderProfileCard(user) {
  const downloadsBlock = document.querySelector(".downloads-block");
  const profileImage = document.getElementById("profileImage");

  const avatar = user.photoURL || "img/avamg.png";
  profileImage.src = avatar;

  const newNicknameInput = document.getElementById("nicknameInput").cloneNode(true);
  document.getElementById("nicknameInput").replaceWith(newNicknameInput);
  newNicknameInput.id = "nicknameInput";

  const nicknameInput = newNicknameInput;
  nicknameInput.value = user.displayName || `User${user.uid.slice(-4)}`;
  nicknameInput.placeholder = "Введите ник";

  nicknameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateNickname(user, nicknameInput.value.trim());
    }
  });

  nicknameInput.addEventListener("blur", () => {
    if (nicknameInput.value.trim() !== user.displayName) {
      updateNickname(user, nicknameInput.value.trim());
    }
  });

  document.getElementById("userIdInput").value = user.uid;

  const copyBtn = document.getElementById("copyIdBtn");
  copyBtn.replaceWith(copyBtn.cloneNode(true));
  document.getElementById("copyIdBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(user.uid)
      .then(() => showToast("ID скопирован!", "success"))
      .catch(() => showToast("Не удалось скопировать ID", "error"));
  });

  downloadsBlock.innerHTML = "тут появятся скаченные вами изображения.";
}

function updateNickname(user, newName) {
  if (!newName || newName === user.displayName) return;
  user.updateProfile({ displayName: newName })
    .then(() => showToast("Ник обновлён!", "success"))
    .catch(() => showToast("Ошибка при обновлении ника", "error"));
}

document.getElementById("closeProfile").addEventListener("click", () => {
  document.getElementById("profileOverlay").style.display = "none";
});

// Анимация кнопок
document.querySelectorAll('.login-form button, .login-form .forgot-password').forEach(btn => {
  let holdTimeout;
  let isHeld = false;

  btn.addEventListener('mousedown', () => {
    isHeld = false;
    holdTimeout = setTimeout(() => {
      btn.classList.add('hold');
      isHeld = true;
    }, 120);
  });

  btn.addEventListener('mouseup', () => {
    clearTimeout(holdTimeout);
    if (isHeld) {
      btn.classList.remove('hold');
      btn.style.animation = 'rubberClick 0.3s ease';
      setTimeout(() => btn.style.animation = '', 300);
    }
  });

  btn.addEventListener('mouseleave', () => {
    clearTimeout(holdTimeout);
    btn.classList.remove('hold');
  });
});
