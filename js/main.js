(() => {
  const firebaseConfig = window.FIREBASE_CONFIG;
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  const notifier = document.getElementById('notifier');
  const loginBlock = document.getElementById('login');
  const loginOverlay = document.getElementById('loginOverlay');
  const loginForm = document.getElementById('loginForm');
  const registerBtn = document.getElementById('registerBtn');
  const googleLogin = document.getElementById('googleLogin');
  const profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.getElementById('profileMenu');
  const subcategoryPopup = document.getElementById('subcategoryPopup');
  const contentArea = document.getElementById('contentArea');
  let currentUser = null;

  let isProfileLoading = false;
  let isLoadingImages = false;

  const showToast = (msg, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    notifier.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const debounce = (fn, delay = 300) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const closeLoginModal = () => {
    loginBlock.classList.remove('show');
    loginOverlay.classList.remove('active');
    document.body.classList.remove('no-scroll');
  };

  const getAccess = async uid => {
    const doc = await db.collection('accessRights').doc(uid).get();
    const data = doc.data() || {};
    const now = new Date();
    let expires = data.expiresAt;
    if (expires?.toDate) expires = expires.toDate();
    return data.canDownload === true && expires && now < expires && !data.frozen;
  };

  const getFavorites = async uid => {
    const snap = await db.collection('users').doc(uid).collection('favorites').get();
    return new Set(snap.docs.map(d => d.id));
  };

  const clearPopup = () => {
    subcategoryPopup.style.display = 'none';
    subcategoryPopup.classList.remove('animate');
    subcategoryPopup.removeAttribute('data-theme');
  };

  const loadImages = async (theme = null, sub = null) => {
    if (isLoadingImages) return;
    isLoadingImages = true;

    contentArea.innerHTML = ''; 
    try {
      const user = currentUser;
      const [hasAccess, favorites] = await Promise.all([
        user ? getAccess(user.uid) : Promise.resolve(false),
        user ? getFavorites(user.uid) : Promise.resolve(new Set())
      ]);

      let query = db.collection('images').where('visible', '==', true);
      if (theme) query = query.where('theme', '==', theme);
      if (sub)   query = query.where('subcategory', '==', sub);
      const snap = await query.get();

      if (snap.empty) {
        contentArea.innerHTML = `<p class='empty'>${theme||sub?'Нет изображений в этой категории.':'Пока нет изображений.'}</p>`;
        return;
      }

      const used = new Set();
      snap.forEach(doc => {
        const data = doc.data();
        if (used.has(data.url)) return;
        used.add(data.url);

        const card = document.createElement('div');
        card.className = 'ui-card';
        card.dataset.id = doc.id;
        card.innerHTML = `
          <div class='image-wrapper'>
            <img class='card-image' src='${data.url}' alt='UI' draggable='false'/>
          </div>
          <div class='card-footer'>
            <div class='card-fav ${favorites.has(doc.id)?'active':''}'>★</div>
            <div class='card-meta-right'>
              <span class='card-type'>Тип: ${data.theme} / ${data.subcategory}</span>
              <button class='card-download' ${hasAccess?'':'disabled'}>${hasAccess?'Скачать':'Недоступно'}</button>
            </div>
          </div>`;

        card.querySelector('.card-fav')
            .addEventListener('click', debounce(() => toggleFavorite(doc.id, card, data), 200));
        if (hasAccess) {
          card.querySelector('.card-download')
              .addEventListener('click', () => downloadImage(data.url));
        }
        contentArea.appendChild(card);
      });
    } catch {
      contentArea.innerHTML = `<p class='error'>Ошибка загрузки изображений.</p>`;
    } finally {
      isLoadingImages = false;
    }
  };

  const downloadImage = async url => {
    try {
      const res = await fetch(url, {mode:'cors'});
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'ui-element.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showToast('Не удалось скачать файл','error');
    }
  };

  const toggleFavorite = async (id, card, data) => {
    if (!currentUser) {
      showToast('Только для авторизованных пользователей','error');
      return;
    }
    const ref = db.collection('users').doc(currentUser.uid)
                  .collection('favorites').doc(id);
    const exists = (await ref.get()).exists;
    const star = card.querySelector('.card-fav');
    star.classList.toggle('active', !exists);
    if (exists) await ref.delete();
    else await ref.set(data);
    if (card.closest('.downloads-block') && exists) card.remove();
  };

  const openPopup = btn => {
    const theme = btn.dataset.theme;
    const rect = btn.getBoundingClientRect();
    subcategoryPopup.style.display = 'flex';
    subcategoryPopup.style.top = `${rect.bottom + window.scrollY + 6}px`;
    subcategoryPopup.style.left = `${rect.left}px`;
    subcategoryPopup.setAttribute('data-theme', theme);
    subcategoryPopup.classList.remove('animate');
    void subcategoryPopup.offsetWidth;
    subcategoryPopup.classList.add('animate');
  };

  const initUI = () => {
    document.addEventListener('contextmenu', e => {
      if (e.target.classList.contains('card-image')) e.preventDefault();
    });
    document.addEventListener('dragstart', e => {
      if (e.target.classList.contains('card-image')) e.preventDefault();
    });

document.addEventListener('click', e => {
  if (!e.target.closest('#loginForm') && e.target.id !== 'loginButton') {
    closeLoginModal();
  }
  if (!e.target.closest('#profileBtn') && !e.target.closest('#profileMenu')) {
    profileMenu.style.display = 'none';
  }
  const profileOverlay = document.getElementById('profileOverlay');
  if (
    profileOverlay.style.display === 'flex' &&
    !e.target.closest('#profileOverlay .profile-card') &&
    e.target.id !== 'profileOpenBtn'
  ) {
    profileOverlay.style.display = 'none';
  }
  if (!e.target.closest('.category-btn') && !e.target.closest('#subcategoryPopup')) {
    clearPopup();
  }
  if (e.target.id === 'loginButton') {
    loginBlock.classList.add('show');
    loginOverlay.classList.add('active');
    document.body.classList.add('no-scroll');
  }
  if (e.target.id === 'profileBtn') {
    profileMenu.style.display =
      profileMenu.style.display === 'block' ? 'none' : 'block';
  }
  if (e.target.id === 'moreInfoBtn') {
    window.open('Allhtml/policy.html', '_self');
  }
});


    document.querySelectorAll('.category-btn').forEach(btn =>
      btn.addEventListener('click', e => {
        e.stopPropagation();
        clearPopup();
        openPopup(btn);
      })
    );

    document.querySelectorAll('.subcategory-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const theme = subcategoryPopup.getAttribute('data-theme');
        const sub = btn.dataset.sub;
        clearPopup();
        loadImages(theme, sub);
      })
    );

    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email = loginForm.username.value;
      const pass = loginForm.password.value;
      try {
        await firebase.auth().signInWithEmailAndPassword(email, pass);
        closeLoginModal();
        showToast('Вход выполнен!');
      } catch {
        showToast('Ошибка входа','error');
      }
    });

    registerBtn.addEventListener('click', async () => {
      const email = loginForm.username.value;
      const pass = loginForm.password.value;
      try {
        await firebase.auth().createUserWithEmailAndPassword(email, pass);
        closeLoginModal();
        showToast('Аккаунт создан!');
      } catch {
        showToast('Ошибка регистрации','error');
      }
    });

    document.querySelector('.forgot-password').addEventListener('click', async () => {
      const email = loginForm.username.value.trim();
      if (!email) {
        showToast('Введите Email','error');
        return;
      }
      try {
        await firebase.auth().sendPasswordResetEmail(email);
        showToast('Письмо для сброса отправлено');
      } catch {
        showToast('Ошибка сброса','error');
      }
    });

    googleLogin.addEventListener('click', async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
        await firebase.auth().signInWithPopup(provider);
        closeLoginModal();
        showToast('Вы вошли через Google!');
      } catch(e) {
        showToast(e.message,'error');
      }
    });

    document.getElementById('closeProfile').addEventListener('click', () => {
      document.getElementById('profileOverlay').style.display = 'none';
    });
  };

  const renderProfileCard = async user => {
    if (isProfileLoading) return;
    isProfileLoading = true;

    const overlay = document.getElementById('profileOverlay');
    // Показываем оверлей сразу
    overlay.style.display = 'flex';

    const image = document.getElementById('profileImage');
    const nickInput = document.getElementById('nicknameInput').cloneNode(true);
    document.getElementById('nicknameInput').replaceWith(nickInput);
    nickInput.value = user.displayName;
    nickInput.addEventListener('change', () =>
      user.updateProfile({ displayName: nickInput.value })
          .then(() => showToast('Ник обновлён!'))
    );

    document.getElementById('userIdInput').value = user.uid;
    document.getElementById('copyIdBtn')
            .addEventListener('click', () =>
              navigator.clipboard.writeText(user.uid)
                       .then(() => showToast('ID скопирован!'))
            );

    image.src = user.photoURL || 'img/avamg.png';

    const [accessDoc, favSnap] = await Promise.all([
      db.collection('accessRights').doc(user.uid).get(),
      db.collection('users').doc(user.uid).collection('favorites').get()
    ]);

    const expiresRaw = accessDoc.data()?.expiresAt;
    let expiresDate = null;
    if (expiresRaw?.toDate) expiresDate = expiresRaw.toDate();
    else if (typeof expiresRaw === 'string' || expiresRaw instanceof Date)
      expiresDate = new Date(expiresRaw);

    let expiresText;
    if (expiresDate) {
      const datePart = expiresDate.toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
      const timePart = expiresDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit'
      });
      expiresText = `Активно до ${datePart} ${timePart}`;
    } else {
      expiresText = 'Аккаунт активирован';
    }

    const card = document.querySelector('#profileOverlay .profile-card');
    const oldRibbon = card.querySelector('.profile-ribbon');
    if (oldRibbon) oldRibbon.remove();
    const ribbon = document.createElement('div');
    ribbon.className = 'profile-ribbon';
    ribbon.innerHTML = `<span>${expiresText}</span>`;
    card.appendChild(ribbon);

    const block = document.querySelector('.downloads-block');
    block.innerHTML = '';
    if (favSnap.empty) {
      block.innerHTML = "<p class='empty'>Нет избранного.</p>";
    } else {
      favSnap.docs.forEach(d => {
        const data = d.data();
        const favCard = document.createElement('div');
        favCard.className = 'ui-card';
        favCard.innerHTML = `
          <div class='image-wrapper'>
            <img class='card-image' src='${data.url}' alt='UI' draggable='false'/>
          </div>
          <div class='card-footer'>
            <div class='card-fav active'>★</div>
            <div class='card-meta-right'>
              <span class='card-type'>${data.theme}/${data.subcategory}</span>
            </div>
          </div>`;
        favCard.querySelector('.card-fav')
               .addEventListener('click', () => toggleFavorite(d.id, favCard, data));
        block.appendChild(favCard);
      });
    }

    isProfileLoading = false;
  };

  const checkPrivacyAgreement = async user => {
    const refUser = db.collection('users').doc(user.uid);
    const data = (await refUser.get()).data() || {};
    if (!data.acceptedPrivacy) {
      const overlay = document.getElementById('privacyOverlay');
      overlay.style.display = 'flex';
      document.getElementById('acceptPrivacy').onclick = async () => {
        await refUser.set({ acceptedPrivacy: true }, { merge: true });
        overlay.style.display = 'none';
        showToast('Политика принята');
      };
      document.getElementById('declinePrivacy').onclick = async () => {
        await firebase.auth().signOut();
        showToast('Доступ закрыт','error');
        setTimeout(() => location.reload(), 1500);
      };
    }
  };

  firebase.auth().onAuthStateChanged(async user => {
    currentUser = user;
    if (user) closeLoginModal();

    if (!user) {
      profileMenu.innerHTML = "<button id='loginButton'>Войти / Зарегистрироваться</button>";
      profileBtn.style.backgroundImage = '';
      loadImages();
      return;
    }

    const configDoc = await db.collection('appData').doc('adminConfig').get().catch(() => null);
    const admins = (configDoc && configDoc.data()?.adminUIDs) || [];
    const isAdmin = admins.includes(user.uid);

    profileMenu.innerHTML = `
      <button id='profileOpenBtn'>Профиль</button>
      <button id='moreInfoBtn'>Доп. информация</button>
      <button id='supportBtn'>${isAdmin?'Админ-поддержка 🛡️':'Поддержка'}</button>
      <button id='signOutBtn'>Выйти</button>
    `;
    document.getElementById('signOutBtn')
            .addEventListener('click', () =>
              firebase.auth().signOut().then(() => showToast('Вы вышли'))
            );
    document.getElementById('profileOpenBtn')
            .addEventListener('click', () => renderProfileCard(user));
    document.getElementById('supportBtn')
            .addEventListener('click', () =>
              window.open('https://funpay.com/users/5299159/','_blank')
            );

    if (!user.displayName) {
      await user.updateProfile({ displayName: `User${user.uid.slice(-4)}` });
    }
    await db.collection('accessRights')
            .doc(user.uid)
            .set({ canDownload: false, expiresAt: null }, { merge: true });

    profileBtn.style.backgroundImage = `url(${user.photoURL||'img/avamg.png'})`;
    profileBtn.style.backgroundSize = 'cover';
    profileBtn.style.backgroundPosition = 'center';

    loadImages();
    checkPrivacyAgreement(user);
  });

  document.addEventListener('DOMContentLoaded', initUI);
})();
