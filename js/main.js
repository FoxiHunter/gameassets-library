// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCk1ektdWkzHnnbMuWDJDSKkclzkltdKqZk",
  authDomain: "gameassets-library.firebaseapp.com",
  projectId: "gameassets-library",
  storageBucket: "gameassets-library.appspot.com",
  messagingSenderId: "297984510726",
  appId: "1:297984510726:web:1134bc38eeacb43947ac87",
  measurementId: "G-HZC53QFM8M"
};

firebase.initializeApp(firebaseConfig);

// Элементы
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");
const loginButton = document.getElementById("loginButton");
const loginBlock = document.getElementById("login");
const loginForm = document.getElementById("loginForm");
const registerBtn = document.getElementById("registerBtn");
const googleLogin = document.getElementById("googleLogin");

// Открытие/закрытие меню профиля
profileBtn.addEventListener("click", () => {
  profileMenu.style.display = (profileMenu.style.display === "block" ? "none" : "block");
});

// Открытие формы входа
document.addEventListener("click", (e) => {
  if (e.target.id === "loginButton") {
    loginBlock.classList.toggle("show");
  }
});

// Вход через email
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    loginBlock.classList.remove("show");
  } catch (error) {
    alert("Ошибка входа: " + error.message);
  }
});

// Регистрация
registerBtn.addEventListener("click", async () => {
  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  try {
    await firebase.auth().createUserWithEmailAndPassword(email, password);
    alert("Аккаунт создан!");
    loginBlock.classList.remove("show");
  } catch (error) {
    alert("Ошибка регистрации: " + error.message);
  }
});

// Вход через Google
googleLogin.addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await firebase.auth().signInWithPopup(provider);
    loginBlock.classList.remove("show");
  } catch (error) {
    alert("Ошибка Google входа: " + error.message);
  }
});

// Обработка состояния пользователя
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    profileMenu.innerHTML = `
      <button>Профиль</button>
      <button>Доп. информация</button>
      <button onclick="firebase.auth().signOut()">Выйти</button>
      <button onclick="deleteAccount()" style="color: #ff8888;">Удалить аккаунт</button>
    `;
  } else {
    profileMenu.innerHTML = `<button id="loginButton">Войти / Зарегистрироваться</button>`;
  }
});

// Удаление аккаунта
function deleteAccount() {
  const user = firebase.auth().currentUser;
  if (user && confirm("Удалить аккаунт?")) {
    user.delete().then(() => alert("Аккаунт удалён"));
  }
}

// Анимация "резинки"
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
