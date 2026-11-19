const form = document.querySelector('#login-form');
const email = document.querySelector('#email');
const password = document.querySelector('#password');
const loginButton = document.querySelector('#login-button');
const logoutButton = document.querySelector('#logout-button');
const account = document.querySelector('#account');
const accountEmail = document.querySelector('#account-email');
const status = document.querySelector('#status');

async function setupLogin() {
  const [{ app }, { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut }] =
    await Promise.all([
      import('./firebase.js'),
      import('https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js')
    ]);

  const auth = getAuth(app);
  const adminLink = document.querySelector('#admin-link');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginButton.disabled = true;
    status.textContent = 'Signing in…';
    try {
      await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
      form.reset();
    } catch (error) {
      const messages = {
        'auth/network-request-failed': 'Check your connection and try again.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/operation-not-allowed': 'Email sign-in is currently unavailable. Contact support.'
      };
      status.textContent = messages[error.code] ?? 'Unable to sign in. Check your email and password.';
    } finally {
      loginButton.disabled = false;
    }
  });

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    try {
      await signOut(auth);
    } catch {
      status.textContent = 'Unable to sign out. Please try again.';
    } finally {
      logoutButton.disabled = false;
    }
  });

  onAuthStateChanged(auth, (user) => {
    adminLink.hidden = true;
    if (user) {
      user.getIdTokenResult().then(({ claims }) => {
        if (auth.currentUser === user) adminLink.hidden = claims.jasAdmin !== true;
      }).catch(() => {});
    }
    form.hidden = Boolean(user);
    account.hidden = !user;
    accountEmail.textContent = user?.email ?? '';
    loginButton.disabled = false;
    status.textContent = user ? '' : 'Enter your account email and password.';
  });
}

setupLogin().catch(() => {
  status.textContent = 'Sign-in could not load. Check your connection and reload the page.';
});
