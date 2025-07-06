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

profileBtn.addEventListener("click", () => {
  profileMenu.style.display = profileMenu.style.display === "block" ? "none" : "block";
});

document.addEventListener("click", (e) => {
  if (e.target.id === "loginButton") {
    loginBlock.classList.toggle("show");
  }

  if (e.target.id === "profileOpenBtn") {
    openProfileCard();
  }

  if (e.target.classList.contains("category-btn")) {
    loadSubclasses(e.target.dataset.category);
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    loginBlock.classList.remove("show");
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
    showToast("Аккаунт создан!", "success");
    loginBlock.classList.remove("show");
  } catch {
    showToast("Ошибка при регистрации. Email корректен? Пароль не короче 6 символов?", "error");
  }
});

googleLogin.addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await firebase.auth().signInWithPopup(provider);
    loginBlock.classList.remove("show");
    showToast("Вы вошли через Google!", "success");
  } catch (error) {
    showToast("Ошибка Google входа: " + error.message, "error");
  }
});

firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    if (!user.displayName) {
      const shortId = user.uid.slice(-4);
      const defaultName = `User${shortId}`;
      await user.updateProfile({ displayName: defaultName });
      showToast(`Ник установлен: ${defaultName}`, "success");
    }

    profileMenu.innerHTML = `
      <button id="profileOpenBtn">Профиль</button>
      <button>Доп. информация</button>
      <button onclick="firebase.auth().signOut(); showToast('Вы вышли', 'success')">Выйти</button>
    `;

    const avatar = user.photoURL || "img/avamg.png";
    profileBtn.style.backgroundImage = `url(${avatar})`;
    profileBtn.style.backgroundSize = "cover";
    profileBtn.style.backgroundPosition = "center";

    await checkDownloadPermission();
    await loadCategories();
  } else {
    profileMenu.innerHTML = `<button id="loginButton">Войти / Зарегистрироваться</button>`;
    profileBtn.style.backgroundImage = "";
  }
});

async function checkDownloadPermission() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const snapshot = await db.collection("accessRights")
    .where("userId", "==", user.uid)
    .get();

  const btns = document.querySelectorAll(".card-download");

  btns.forEach(btn => {
    if (snapshot.empty) {
      btn.disabled = true;
      btn.textContent = "Недоступно";
      btn.classList.add("locked");
    } else {
      const data = snapshot.docs[0].data();
      const expiresAt = data.expiresAt.toDate();
      if (new Date() < expiresAt) {
        btn.disabled = false;
        btn.textContent = "Скачать";
        btn.classList.remove("locked");
        btn.addEventListener("click", () => {
          const imageUrl = btn.closest(".download-card").querySelector(".card-image").src;
          const link = document.createElement("a");
          link.href = imageUrl;
          link.download = "ui-element.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      } else {
        btn.disabled = true;
        btn.textContent = "Истекло";
        btn.classList.add("locked");
      }
    }
  });
}

async function loadCategories() {
  const container = document.createElement("div");
  container.className = "category-nav";

  const categories = ["Хоррор", "Фэнтези", "Футуризм"];
  categories.forEach(name => {
    const btn = document.createElement("button");
    btn.className = "category-btn";
    btn.dataset.category = name;
    btn.textContent = name;
    container.appendChild(btn);
  });

  document.body.insertBefore(container, document.querySelector(".download-card"));
}

async function loadSubclasses(category) {
  const subclassContainer = document.querySelector(".card-grid") || document.createElement("div");
  subclassContainer.className = "card-grid";
  subclassContainer.innerHTML = "";

  const subclasses = ["Индикаторы", "Фоны", "NN"];
  subclasses.forEach(name => {
    const block = document.createElement("div");
    block.className = "card-subclass";
    block.innerHTML = `
      <div class="subclass-title">${name}</div>
      <div class="card-stack"></div>
    `;
    subclassContainer.appendChild(block);
  });

  document.body.appendChild(subclassContainer);
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
