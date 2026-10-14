import {
  el,
  field,
  busy,
  toast,
  button
} from './utils.js';
import {
  updateUser
} from './db.js';
import {
  pageHeading
} from './components.js';
export async function renderProfile(root, user) {
  root.className = 'container section profile-page';
  const form = el('form', {
    class: 'profile-form'
  }, el('h2', {}, 'The essentials'), el('p', {
    class: 'muted'
  }, 'Keep your travel profile up to date.'), field('Full name', 'name', 'text', user.name, {
    required: true,
    minlength: 2,
    maxlength: 70,
    autocomplete: 'name'
  }), field('Email address', 'email', 'email', user.email, {
    required: true,
    maxlength: 254,
    autocomplete: 'email'
  }), el('hr'), el('h2', {}, 'Account security'), field('Current password', 'currentPassword',
    'password', '', {
      required: true,
      minlength: 12,
      maxlength: 128,
      autocomplete: 'current-password'
    }), field('New password (optional)', 'newPassword', 'password', '', {
    minlength: 12,
    maxlength: 128,
    autocomplete: 'new-password'
  }), field('Confirm new password', 'confirmPassword', 'password', '', {
    minlength: 12,
    maxlength: 128,
    autocomplete: 'new-password'
  }), el('p', {
      class: 'small muted'
    },
    'Use 12–128 characters. Saving requires your current password and signs you out of all demo sessions.'
    ), el('p', {
    class: 'form-error',
    role: 'alert'
  }), el('button', {
    type: 'submit',
    class: 'btn'
  }, 'Save changes'));
  form.addEventListener('submit', e => {
    e.preventDefault();
    busy(form, async () => {
      const d = Object.fromEntries(new FormData(form));
      if (d.newPassword !== d.confirmPassword) throw Error('New passwords do not match.');
      await updateUser(d);
      toast('Profile updated. Please sign in again.');
      location.assign('index.html');
    });
  });
  root.append(pageHeading('A LITTLE ABOUT YOU', 'Your profile.',
    'Your details, just the way you like them.'), el('div', {
    class: 'profile-layout'
  }, el('aside', {
    class: 'profile-aside'
  }, el('span', {
    class: 'avatar large'
  }, user.name.slice(0, 1)), el('h2', {}, user.name), el('p', {
    class: 'muted'
  }, user.email), el('span', {
    class: 'status'
  }, 'StayEase explorer'), el('p', {
      class: 'small muted'
    },
    'This profile is stored on this browser only. Use fictional details and a password you do not use elsewhere.'
    )), form));
}
