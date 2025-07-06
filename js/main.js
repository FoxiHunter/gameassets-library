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
  profileMenu.style.display = (profileMenu.style.display === "block" ? "none" : "block");
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
  } else {
    profileMenu.innerHTML = `<button id="loginButton">Войти / Зарегистрироваться</button>`;
  }
});

function openProfileCard() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal profile-card">
      <div class="avatar-container">
        <div class="avatar-circle" id="avatarCircle"></div>
        <input type="file" id="avatarUpload" style="display: none;" />
        <button id="changeAvatarBtn">Сменить</button>
      </div>
      <div class="profile-info">
        <div class="info-line"><b>ID:</b> <span id="userId">${user.uid}</span> <button onclick="navigator.clipboard.writeText('${user.uid}')">📋</button></div>
        <div class="info-line">
          <b>Ник:</b> <input type="text" id="displayName" value="${user.displayName || 'Без ника'}" />
        </div>
        <div class="info-line date">
          <b>Регистрация:</b> ${new Date(user.metadata.creationTime).toLocaleDateString()}
        </div>
        <button onclick="document.body.removeChild(this.closest('.modal-overlay'))">Закрыть</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("changeAvatarBtn").addEventListener("click", () => {
    document.getElementById("avatarUpload").click();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target.className === "modal-overlay") {
      overlay.remove();
    }
  });
}

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
