(() => {
  const firebaseConfig = window.FIREBASE_CONFIG;
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  const notifier       = document.getElementById('notifier');
  const loginBlock     = document.getElementById('login');
  const loginOverlay   = document.getElementById('loginOverlay');
  const loginForm      = document.getElementById('loginForm');
  const registerBtn    = document.getElementById('registerBtn');
  const googleLogin    = document.getElementById('googleLogin');
  const profileBtn     = document.getElementById('profileBtn');
  const profileMenu    = document.getElementById('profileMenu');
  const subcategoryPopup = document.getElementById('subcategoryPopup');
  const contentArea    = document.getElementById('contentArea');

  let currentUser     = null;
  let isProfileLoading= false;
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
  let expires = data.expireAt;
  if (expires?.toDate) expires = expires.toDate();
  else if (typeof expires === 'string' || expires instanceof Date)
    expires = new Date(expires);

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

      if (!user) {
        contentArea.innerHTML = `<p class='error'>Необходимо зарегистрироваться, чтобы получить доступ.</p>`;
        return;
      }

     if (!hasAccess) {
       const accessDoc = await db.collection('accessRights').doc(user.uid).get();
        const accessData = accessDoc.data() || {};

             if (accessData.frozen) {
                contentArea.innerHTML = `<p class='error'>Ваш аккаунт заморожен. Обратитесь: <a href="https://funpay.com/users/5299159/" target="_blank">сюда</a>.</p>`;
               } else {
             contentArea.innerHTML = `<p class='error'>Необходимо активировать аккаунт: <a href="https://funpay.com/users/5299159/" target="_blank">сделать это тут</a>.</p>`;
             }
              return;
         }


      let query = db.collection('images').where('visible', '==', true);
      if (theme) query = query.where('theme', '==', theme);
      if (sub)   query = query.where('subcategory', '==', sub);
      const snap = await query.get();

      if (snap.empty) {
        contentArea.innerHTML = `<p class='empty'>${theme||sub ? 'Нет изображений в этой категории.' : 'Пока нет изображений.'}</p>`;
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
            <div class='card-fav ${favorites.has(doc.id) ? 'active' : ''}'>★</div>
            <div class='card-meta-right'>
              <span class='card-type'>Тип: ${data.theme} / ${data.subcategory}</span>
              <button class='card-download'>Скачать</button>
            </div>
          </div>`;
         const img = card.querySelector('.card-image');
             img.addEventListener('click', () => {
                const modal = document.getElementById('imageModal');
                   const modalImg = document.getElementById('modalImage');
              modalImg.src = data.url;
              modal.style.display = 'flex';
          });

            img.addEventListener('mouseenter', () => {
             const preview = document.getElementById('hoverPreview');
             preview.querySelector('img').src = data.url;
              preview.style.display = 'block';
            });

img.addEventListener('mouseleave', () => {
  document.getElementById('hoverPreview').style.display = 'none';
});

        card.querySelector('.card-fav')
            .addEventListener('click', debounce(() => toggleFavorite(doc.id, card, data), 200));
        card.querySelector('.card-download')
            .addEventListener('click', () => downloadImage(data.url));

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
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'ui-element.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      showToast('Не удалось скачать файл', 'error');
    }
  };

  const toggleFavorite = async (id, card, data) => {
    if (!currentUser) {
      showToast('Только для авторизованных пользователей', 'error');
      return;
    }
    const ref = db.collection('users').doc(currentUser.uid).collection('favorites').doc(id);
    const exists = (await ref.get()).exists;
    const star = card.querySelector('.card-fav');
    star.classList.toggle('active', !exists);
    if (exists) await ref.delete();
    else       await ref.set(data);
    if (card.closest('.downloads-block') && exists) card.remove();
  };

  const openPopup = btn => {
    const theme = btn.dataset.theme;
    const rect  = btn.getBoundingClientRect();
    subcategoryPopup.style.display = 'flex';
    subcategoryPopup.style.top    = `${rect.bottom + window.scrollY + 6}px`;
    subcategoryPopup.style.left   = `${rect.left}px`;
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
      if (!e.target.closest('#loginForm') && e.target.id !== 'loginButton')
        closeLoginModal();

      if (!e.target.closest('#profileBtn') && !e.target.closest('#profileMenu'))
        profileMenu.style.display = 'none';

      const profileOverlay = document.getElementById('profileOverlay');
      if (
        profileOverlay.style.display === 'flex' &&
        !e.target.closest('#profileOverlay .profile-card') &&
        e.target.id !== 'profileOpenBtn'
      ) profileOverlay.style.display = 'none';

      if (!e.target.closest('.category-btn') && !e.target.closest('#subcategoryPopup'))
        clearPopup();

      if (e.target.id === 'loginButton') {
        loginBlock.classList.add('show');
        loginOverlay.classList.add('active');
        document.body.classList.add('no-scroll');
      }
    if (e.target.id === 'profileBtn') {
    profileMenu.style.display =
    profileMenu.style.display === 'block' ? 'none' : 'block';
  } else if (e.target.closest('#profileMenu')) {
  profileMenu.style.display = 'none';
}

      if (e.target.id === 'moreInfoBtn')
        window.open('Allhtml/policy.html', '_self');
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
        const sub   = btn.dataset.sub;
        clearPopup();
        loadImages(theme, sub);
      })
    );

    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        await firebase.auth().signInWithEmailAndPassword(
          loginForm.username.value,
          loginForm.password.value
        );
        closeLoginModal();
        showToast('Вход выполнен!');
      } catch {
        showToast('Ошибка входа', 'error');
      }
    });

    registerBtn.addEventListener('click', async () => {
      try {
        await firebase.auth().createUserWithEmailAndPassword(
          loginForm.username.value,
          loginForm.password.value
        );
        closeLoginModal();
        showToast('Аккаунт создан!');
      } catch {
        showToast('Ошибка регистрации', 'error');
      }
    });

    document.querySelector('.forgot-password').addEventListener('click', async () => {
      const email = loginForm.username.value.trim();
      if (!email) {
        showToast('Введите Email', 'error');
        return;
      }
      try {
        await firebase.auth().sendPasswordResetEmail(email);
        showToast('Письмо для сброса отправлено');
      } catch {
        showToast('Ошибка сброса', 'error');
      }
    });

    googleLogin.addEventListener('click', async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      try {
        await firebase.auth().signInWithPopup(provider);
        closeLoginModal();
        showToast('Вы вошли через Google!');
      } catch(e) {
        showToast(e.message, 'error');
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
  
  overlay.style.display = 'flex';

  const image = document.getElementById('profileImage');
  const nickInput = document.getElementById('nicknameInput').cloneNode(true);
  document.getElementById('nicknameInput').replaceWith(nickInput);
  nickInput.value = user.displayName;
  nickInput.addEventListener('change', () =>
    user.updateProfile({ displayName: nickInput.value }).then(() => showToast('Ник обновлён!'))
  );

  document.getElementById('userIdInput').value = user.uid;

  const oldCopyBtn = document.getElementById('copyIdBtn');
  const newCopyBtn = oldCopyBtn.cloneNode(true);
  oldCopyBtn.replaceWith(newCopyBtn);
  newCopyBtn.addEventListener('click', () =>
    navigator.clipboard.writeText(user.uid).then(() => showToast('ID скопирован!'))
  );


    image.src = user.photoURL || 'img/avamg.png';

const accessPromise = db.collection('accessRights').doc(user.uid).get();
const favPromise    = db.collection('users').doc(user.uid).collection('favorites').get();

const [accessDoc, favSnap] = await Promise.all([accessPromise, favPromise]);

const accessData = accessDoc.data() || {};
const now = new Date();
let expiresDate = null;

if (accessData.expireAt?.toDate) {
  expiresDate = accessData.expireAt.toDate();
} else if (typeof accessData.expireAt === 'string' || accessData.expireAt instanceof Date) {
  expiresDate = new Date(accessData.expireAt);
}

const hasAccess = accessData.canDownload === true && expiresDate && now < expiresDate && !accessData.frozen;


let expiresText;
console.log("accessData:", accessData);
console.log("expiresDate:", expiresDate);
console.log("now:", new Date());
console.log("isFrozen:", accessData.frozen);

if (accessData.canDownload === true && expiresDate && new Date() < expiresDate && !accessData.frozen) {
  const datePart = expiresDate.toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const timePart = expiresDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit'
  });
  expiresText = `Активно до ${datePart} ${timePart}`;
} else {
  expiresText = null;
}

const card = document.querySelector('#profileOverlay .profile-card');
const oldRibbon = card.querySelector('.profile-ribbon');
if (oldRibbon) oldRibbon.remove();

if (expiresText) {
  const ribbon = document.createElement('div');
  ribbon.className = 'profile-ribbon';
  ribbon.innerHTML = `<span>${expiresText}</span>`;
  card.appendChild(ribbon);
}


const block = document.querySelector('.downloads-block');
block.innerHTML = '';

if (!hasAccess) {
  block.innerHTML = `<p class='error'>🔒 До момента активации аккаунта избранные изображения будут скрыты.</p>`;
} else if (favSnap.empty) {
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

  const initAfterLogin = async user => {
    const configDoc = await db.collection('appData').doc('adminConfig').get().catch(() => null);
    const admins    = (configDoc && configDoc.data()?.adminUIDs) || [];
    const isAdmin   = admins.includes(user.uid);

    profileMenu.innerHTML = `
      <button id='profileOpenBtn'>Профиль</button>
      <button id='moreInfoBtn'>Доп. информация</button>
      <button id='supportBtn'>${isAdmin ? 'Админ-поддержка 🛡️' : 'Поддержка'}</button>
      <button id='signOutBtn'>Выйти</button>
    `;
    document.getElementById('signOutBtn')
            .addEventListener('click', () => firebase.auth().signOut().then(() => showToast('Вы вышли')));
    document.getElementById('profileOpenBtn')
            .addEventListener('click', () => renderProfileCard(user));
    document.getElementById('supportBtn')
            .addEventListener('click', () => window.open('https://funpay.com/users/5299159/', '_blank'));

    if (!user.displayName)
      await user.updateProfile({ displayName: `User${user.uid.slice(-4)}` });

const accessRef = db.collection('accessRights').doc(user.uid);
const accessSnap = await accessRef.get();

if (!accessSnap.exists) {
  await accessRef.set({ canDownload: false, expireAt: null, frozen: false });
}


let currentAccess = null;

accessRef.onSnapshot(doc => {
  const data = doc.data() || {};
  const now = new Date();
  let expires = data.expireAt;

  if (expires?.toDate) expires = expires.toDate();
  else if (typeof expires === 'string' || expires instanceof Date)
    expires = new Date(expires);

  const hasAccess = data.canDownload === true && expires && now < expires && !data.frozen;

  if (hasAccess !== currentAccess) {
    currentAccess = hasAccess;
    loadImages();
  }
});




    profileBtn.style.backgroundImage = `url(${user.photoURL || 'img/avamg.png'})`;
    profileBtn.style.backgroundSize  = 'cover';
    profileBtn.style.backgroundPosition = 'center';
  };

  const checkPrivacyAgreement = async user => {
    const refUser = db.collection('users').doc(user.uid);
    const doc     = await refUser.get();
    const data    = doc.exists ? doc.data() : {};

    if (!data.acceptedPrivacy) {
      await refUser.set({ acceptedPrivacy: false }, { merge: true });

      const overlay = document.getElementById('privacyOverlay');
      overlay.style.display = 'flex';
      document.body.classList.add('no-scroll');
      overlay.onclick = e => e.stopPropagation();

      document.getElementById('acceptPrivacy').onclick = async () => {
        await refUser.set({ acceptedPrivacy: true }, { merge: true });
        overlay.style.display = 'none';
        document.body.classList.remove('no-scroll');
        showToast('Политика принята');
        await initAfterLogin(user);
      };

      document.getElementById('declinePrivacy').onclick = async () => {
        await firebase.auth().signOut();
        showToast('Доступ закрыт', 'error');
        setTimeout(() => location.reload(), 1500);
      };

      return false;
    }

    return true;
  };

  firebase.auth().onAuthStateChanged(async user => {
    currentUser = user;
    if (user) closeLoginModal();

if (!user) {
  profileMenu.innerHTML = "<button id='loginButton'>Войти / Зарегистрироваться</button>";
  profileBtn.style.backgroundImage = '';
  contentArea.innerHTML = `<p class='error'>Необходимо войти, чтобы получить доступ.</p>`;
  return;
}


    const agreed = await checkPrivacyAgreement(user);
    if (agreed) await initAfterLogin(user);
  });

document.addEventListener('DOMContentLoaded', () => {
  initUI();

  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('imageModal').style.display = 'none';
  });

  document.getElementById('imageModal').addEventListener('click', e => {
    if (e.target.id === 'imageModal') {
      e.currentTarget.style.display = 'none';
    }
  });
});

document.addEventListener('mousemove', e => {
  const preview = document.getElementById('hoverPreview');
  if (preview.style.display !== 'none') {
    const previewWidth  = preview.offsetWidth;
    const previewHeight = preview.offsetHeight;
    const margin = 20;

    let left = e.pageX + margin;
    let top  = e.pageY + margin;

    if (left + previewWidth > window.innerWidth) {
      left = e.pageX - previewWidth - margin;
    }
    if (top + previewHeight > window.innerHeight) {
      top = e.pageY - previewHeight - margin;
    }

    preview.style.left = `${left}px`;
    preview.style.top  = `${top}px`;
  }
});


})();
