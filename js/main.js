const firebaseConfig = window.FIREBASE_CONFIG;
firebase.initializeApp(firebaseConfig);

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
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    loginBlock.classList.remove("show");
    showToast("Вход выполнен!", "success");
  } catch (error) {
    showToast("Ошибка входа: " + error.message, "error");
  }
});

registerBtn.addEventListener("click", async () => {
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    await firebase.auth().createUserWithEmailAndPassword(email, password);
    showToast("Аккаунт создан!", "success");
    loginBlock.classList.remove("show");
  } catch (error) {
    showToast("Ошибка регистрации: " + error.message, "error");
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

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    profileMenu.innerHTML = `
      <button id="profileOpenBtn">Профиль</button>
      <button>Доп. информация</button>
      <button onclick="firebase.auth().signOut(); showToast('Вы вышли', 'success')">Выйти</button>
    `;

    if (user.photoURL) {
      profileBtn.style.backgroundImage = `url(${user.photoURL})`;
      profileBtn.style.backgroundSize = "cover";
      profileBtn.style.backgroundPosition = "center";
    }
  } else {
    profileMenu.innerHTML = `<button id="loginButton">Войти / Зарегистрироваться</button>`;
    profileBtn.style.backgroundImage = "";
  }
});

function openProfileCard() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  document.getElementById("profileOverlay").style.display = "flex";
  renderProfileCard(user);
}

function renderProfileCard(user) {
  const downloadsBlock = document.querySelector(".downloads-block");
  const profileImage = document.getElementById("profileImage");
  const avatarUpload = document.getElementById("avatarUpload");

  if (user.photoURL) {
    profileImage.src = user.photoURL;
  } else {
    profileImage.src = "default-avatar.png";
  }

  const newNicknameInput = document.getElementById("nicknameInput").cloneNode(true);
  document.getElementById("nicknameInput").replaceWith(newNicknameInput);
  newNicknameInput.id = "nicknameInput";

  const nicknameInput = newNicknameInput;
  nicknameInput.value = user.displayName || "";
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

  avatarUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      profileImage.src = event.target.result;
      const profileBtn = document.getElementById("profileBtn");
      profileBtn.style.backgroundImage = `url(${event.target.result})`;
      profileBtn.style.backgroundSize = "cover";
      profileBtn.style.backgroundPosition = "center";
    };
    reader.readAsDataURL(file);

    const storageRef = firebase.storage().ref();
    const avatarRef = storageRef.child(`avatars/${user.uid}.png`);
    avatarRef.put(file).then(() => {
      avatarRef.getDownloadURL().then((url) => {
        user.updateProfile({ photoURL: url }).then(() => {
          showToast("Аватарка обновлена!", "success");
        });
      });
    });
  });

  const downloaded = [];
  downloadsBlock.innerHTML = "";

  if (downloaded.length === 0) {
    downloadsBlock.textContent = "тут появятся скаченные вами изображения.";
  } else {
    downloaded.forEach(img => {
      const image = document.createElement("img");
      image.src = `path/to/${img}`;
      image.style.width = "60px";
      image.style.margin = "4px";
      downloadsBlock.appendChild(image);
    });
  }
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
