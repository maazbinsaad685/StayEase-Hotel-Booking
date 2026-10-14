// All text is inserted as text nodes; user content is never parsed as HTML.
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'checked' || key === 'disabled' || key === 'hidden') node[key] = !!value;
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity))
    if (child != null) node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return node;
}
export const $ = (s, root = document) => root.querySelector(s);
export const money = amount => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
}).format(amount);
export function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function nights(start, end) {
  return Math.round((Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000);
}
export function validateDates(start, end) {
  for (const d of [start, end])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(
        0, 10) !== d) throw Error('Choose valid check-in and check-out dates.');
  if (start < today()) throw Error('Check-in cannot be in the past.');
  const days = nights(start, end);
  if (days < 1 || days > 30) throw Error('Choose a stay between 1 and 30 nights.');
  return days;
}
export function quote(room, start, end, count = 1) {
  const days = validateDates(start, end);
  const subtotal = Math.round(room.price * days * count * 100) / 100;
  const tax = Math.round(subtotal * 12) / 100;
  return {
    nights: days,
    subtotal,
    tax,
    total: Math.round((subtotal + tax) * 100) / 100
  };
}
export const overlaps = (a, b, c, d) => a < d && c < b;
export function textValue(value, label, min = 2, max = 100) {
  const v = String(value ?? '').trim();
  if (v.length < min || v.length > max) throw Error(`${label} must be ${min}–${max} characters.`);
  return v;
}
export function emailValue(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (v.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw Error('Enter a valid email address.');
  return v;
}
export function passwordValid(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) throw Error(
    'Use a password with 12–128 characters.');
  return value;
}
export async function hashPassword(password, salt) {
  passwordValid(password);
  if (!crypto.subtle) throw Error('Use HTTPS or localhost for secure password support.');
  const bytes = salt ? Uint8Array.from(salt.match(/.{2}/g), b => parseInt(b, 16)) : crypto.getRandomValues(
    new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits'
  ]);
  const hash = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: bytes,
    iterations: 600000,
    hash: 'SHA-256'
  }, key, 256);
  const hex = b => Array.from(new Uint8Array(b), n => n.toString(16).padStart(2, '0')).join('');
  return {
    salt: hex(bytes),
    hash: hex(hash),
    iterations: 600000
  };
}
export function toast(message, error = false) {
  let region = $('#toasts');
  if (!region) {
    region = el('div', {
      id: 'toasts',
      'aria-live': 'polite'
    });
    document.body.append(region);
  }
  const item = el('div', {
    class: `toast ${error?'error':''}`,
    role: error ? 'alert' : 'status'
  }, message);
  region.append(item);
  setTimeout(() => item.remove(), 5000);
}
export function field(label, name, type = 'text', value = '', attrs = {}) {
  const input = el('input', {
    id: name,
    name,
    type,
    value,
    ...attrs
  });
  const error = el('small', {
    id: `${name}-error`,
    class: 'field-error'
  });
  input.setAttribute('aria-describedby', error.id);
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    error.textContent = '';
  });
  input.addEventListener('invalid', () => {
    input.setAttribute('aria-invalid', 'true');
    error.textContent = input.validationMessage;
  });
  return el('label', {
    class: 'field',
    for: name
  }, el('span', {}, label), input, error);
}
export function button(label, action, className = 'btn', attrs = {}) {
  return el('button', {
    type: 'button',
    class: className,
    onClick: action,
    ...attrs
  }, label);
}
export function link(label, href, className = '') {
  return el('a', {
    href,
    class: className
  }, label);
}
export function empty(title, copy, href = 'search.html', label = 'Explore stays') {
  return el('div', {
    class: 'empty'
  }, el('div', {
    class: 'empty-icon',
    'aria-hidden': 'true'
  }, '⌁'), el('h2', {}, title), el('p', {}, copy), link(label, href, 'btn'));
}
export async function busy(form, fn) {
  const btn = form.querySelector('[type=submit]');
  if (btn.disabled) return;
  const text = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Just a moment…';
  const error = form.querySelector('.form-error');
  if (error) error.textContent = '';
  try {
    await fn();
  } catch (e) {
    if (error) error.textContent = e.message;
    toast(e.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = text;
  }
}
export function modal(title, content) {
  const d = el('dialog', {
    class: 'modal',
    'aria-label': title
  }, el('div', {
    class: 'section-head'
  }, el('h2', {}, title), button('✕', () => d.close(), 'icon-btn', {
    'aria-label': 'Close dialog'
  })), content);
  document.body.append(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', e => {
    if (e.target === d) d.close();
  });
  d.showModal();
  return d;
}
export const params = () => new URLSearchParams(location.search);
export function stayParams() {
  const p = params();
  return {
    start: p.get('start') || today(1),
    end: p.get('end') || today(3),
    guests: Math.max(1, Math.min(12, Number(p.get('guests')) || 2)),
    count: Math.max(1, Math.min(3, Number(p.get('count')) || 1))
  };
}
export const query = obj => new URLSearchParams(obj).toString();
