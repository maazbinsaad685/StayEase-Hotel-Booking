import {
  el,
  field,
  button,
  link,
  $,
  busy,
  toast,
  hashPassword,
  emailValue,
  passwordValid
} from './utils.js';
import {
  addUser,
  getUserByEmail,
  currentUser,
  startSession
} from './db.js';
export function logout() {
  localStorage.removeItem('se-session');
  sessionStorage.removeItem('se-session');
  location.replace('index.html');
}
export async function requireAuth() {
  const user = await currentUser();
  if (!user) {
    location.replace('index.html');
    return null;
  }
  return user;
}

function passwordField(label, name, auto) {
  const wrapper = field(label, name, 'password', '', {
    required: true,
    minlength: 12,
    maxlength: 128,
    autocomplete: auto
  });
  wrapper.classList.add('password-field');
  wrapper.append(button('Show', e => {
    const input = $('input', wrapper);
    const shown = input.type === 'password';
    input.type = shown ? 'text' : 'password';
    e.currentTarget.textContent = shown ? 'Hide' : 'Show';
    e.currentTarget.setAttribute('aria-pressed', String(shown));
  }, 'password-toggle', {
    'aria-label': `Show or hide ${label.toLowerCase()}`,
    'aria-pressed': 'false'
  }));
  return wrapper;
}
// UX cooldown only. Real rate limiting must run on a trusted server.
function attemptState(email) {
  try {
    return JSON.parse(localStorage.getItem(`se-attempt:${email}`)) || {
      count: 0,
      until: 0
    };
  } catch {
    return {
      count: 0,
      until: 0
    };
  }
}
export async function renderAuth(root) {
  if (await currentUser()) {
    location.replace('home.html');
    return;
  }
  let signup = false;
  const mount = el('div', {
    class: 'auth-form-mount'
  });
  const tabs = el('div', {
    class: 'auth-tabs',
    'aria-label': 'Account action'
  });

  function render() {
    tabs.replaceChildren(...['Sign in', 'Create account'].map((t, i) => button(t, () => {
      signup = !!i;
      render();
    }, !i === !signup ? 'active' : '', {
      'aria-pressed': String(!!i === signup)
    })));
    const form = el('form', {
      class: 'auth-form'
    }, el('div', {}, el('p', {
      class: 'eyebrow'
    }, signup ? 'YOUR NEXT CHAPTER' : 'GOOD TO SEE YOU'), el('h1', {}, signup ?
      'A world of possibilities.' : 'Welcome back.'), el('p', {
      class: 'muted'
    }, signup ? 'Find your place, wherever you go.' : 'Your next great stay is waiting for you.')));
    if (signup) form.append(field('Full name', 'name', 'text', '', {
      required: true,
      minlength: 2,
      maxlength: 70,
      autocomplete: 'name'
    }));
    form.append(field('Email address', 'email', 'email', '', {
      required: true,
      maxlength: 254,
      autocomplete: 'email',
      placeholder: 'you@example.com'
    }), passwordField('Password', 'password', signup ? 'new-password' : 'current-password'));
    if (signup) form.append(passwordField('Confirm password', 'confirm', 'new-password'), el('small', {
      class: 'muted'
    }, 'Use 12–128 characters. Please use a demo-only password.'));
    form.append(el('label', {
      class: 'check'
    }, el('input', {
      type: 'checkbox',
      name: 'remember'
    }), 'Remember me for 7 days'), el('p', {
      class: 'form-error',
      role: 'alert'
    }), el('button', {
      class: 'btn full',
      type: 'submit'
    }, signup ? 'Create account →' : 'Sign in →'));
    form.addEventListener('submit', e => {
      e.preventDefault();
      busy(form, async () => {
        const data = new FormData(form);
        const email = emailValue(data.get('email'));
        const password = passwordValid(data.get('password'));
        let user;
        if (signup) {
          if (password !== data.get('confirm')) {
            $('#confirm-error').textContent = 'Passwords do not match.';
            $('#confirm').setAttribute('aria-invalid', 'true');
            throw Error('Passwords do not match.');
          }
          user = await addUser({
            name: data.get('name'),
            email,
            password
          });
        } else {
          let attempt = attemptState(email);
          if (attempt.until > Date.now()) throw Error(
            'Too many attempts. Please try again in 5 minutes.');
          if (attempt.until && attempt.until <= Date.now()) attempt = {
            count: 0,
            until: 0
          };
          user = await getUserByEmail(email);
          const candidate = await hashPassword(password, user?.credentials.salt ||
            '00000000000000000000000000000000');
          if (!user || candidate.hash !== user.credentials.hash) {
            attempt.count++;
            if (attempt.count >= 5) attempt.until = Date.now() + 300000;
            localStorage.setItem(`se-attempt:${email}`, JSON.stringify(attempt));
            throw Error('Email or password is incorrect.');
          }
          localStorage.removeItem(`se-attempt:${email}`);
        }
        await startSession(user, data.has('remember'));
        toast(signup ? 'Account created. Welcome to StayEase!' : 'Welcome back!');
        location.assign('home.html');
      });
    });
    mount.replaceChildren(form, el('div', {
        class: 'demo-box'
      }, el('strong', {}, 'Take a look around'), el('p', {}, 'Try our demo account. No signup needed.'),
      button('Fill demo credentials', () => {
        if (signup) {
          signup = false;
          render();
        }
        $('#email').value = 'demo@stayease.com';
        $('#password').value = 'StayEaseDemo2026!';
      }, 'text-btn')), el('p', {
        class: 'auth-note'
      },
      'Portfolio demo • Accounts and reservations stay in this browser. No real bookings or payments.'));
  }
  root.className = 'auth-page';
  root.append(el('section', {
    class: 'auth-visual'
  }, el('a', {
    class: 'brand inverse',
    href: 'index.html'
  }, el('span', {
    class: 'brand-mark'
  }, 's'), 'StayEase', el('span', {
    class: 'brand-dot'
  }, '.')), el('div', {
    class: 'auth-story'
  }, el('span', {
    class: 'glass-tag'
  }, 'FOR THE PLACES THAT STAY WITH YOU'), el('h2', {}, 'Somewhere new.', el('br'), 'Something ',
    el('em', {}, 'you.')), el('p', {}, 'Extraordinary stays. Thoughtfully discovered.'), el('div', {
    class: 'auth-location'
  }, '◉  Ubud, Bali', el('span', {}, '8 destinations. Endless possibilities.')))), el('section', {
    class: 'auth-panel'
  }, el('div', {
    class: 'auth-top'
  }, link('← Back to StayEase', 'index.html'), button('◐', () => document.dispatchEvent(new Event(
    'theme-toggle')), 'icon-btn', {
    'aria-label': 'Toggle color theme'
  })), tabs, mount, el('p', {
    class: 'auth-bottom'
  }, 'A little less searching. A lot more discovering.')));
  render();
}
