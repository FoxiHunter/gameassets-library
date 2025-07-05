const firebaseConfig = {
  apiKey: "AIzaSyB2LQsJuE0-vqD80Rcqqpav-jxlapYrcpg",
  authDomain: "gameassets-library-f1f0d.firebaseapp.com",
  projectId: "gameassets-library-f1f0d",
  storageBucket: "gameassets-library-f1f0d.firebasestorage.app",
  messagingSenderId: "33160635214",
  appId: "1:33160635214:web:a7b6873dae71dc3e73f41f",
  measurementId: "G-MFQLQ60PQV"
};

firebase.initializeApp(firebaseConfig);

function showToast(message, type = "success") {
  const notifier = document.getElementById("notifier");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  notifier.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove());
  }, 2500);
}


const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");
const loginButton = document.getElementById("loginButton");
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
      <button>Профиль</button>
      <button>Доп. информация</button>
      <button onclick="firebase.auth().signOut(); showToast('Вы вышли', 'success')">Выйти</button>
      <button onclick="deleteAccount()" style="color: #ff8888;">Удалить аккаунт</button>
    `;
  } else {
    profileMenu.innerHTML = `<button id="loginButton">Войти / Зарегистрироваться</button>`;
  }
});

function deleteAccount() {
  const user = firebase.auth().currentUser;
  const notifier = document.getElementById("notifier");

  const toast = document.createElement("div");
  toast.className = "toast confirm";
  toast.innerHTML = `
    <div>Удалить аккаунт?</div>
    <div class="notify-btns">
      <button id="confirmDelete">Да</button>
      <button id="cancelDelete">Нет</button>
    </div>
  `;
  notifier.appendChild(toast);

  document.getElementById("confirmDelete").addEventListener("click", async () => {
    toast.remove();
    try {
      const email = user.email;
      const password = prompt("Введите пароль повторно для подтверждения:");
      if (!password) return showToast("Удаление отменено", "error");

      const credential = firebase.auth.EmailAuthProvider.credential(email, password);
      await user.reauthenticateWithCredential(credential);
      await user.delete();
      showToast("Аккаунт удалён", "success");
    } catch (err) {
      showToast("Ошибка: " + err.message, "error");
    }
  });

  document.getElementById("cancelDelete").addEventListener("click", () => {
    toast.remove();
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
