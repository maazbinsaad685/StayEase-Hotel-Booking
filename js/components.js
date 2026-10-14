import {
  el,
  button,
  link,
  field,
  money,
  toast,
  today,
  validateDates,
  query,
  stayParams
} from './utils.js';
import {
  cities
} from './data.js';
import {
  toggleWishlist
} from './db.js';
export function hotelCard(hotel, wishlist = [], stay = {}) {
  const saved = wishlist.includes(hotel.id);
  const heart = button(saved ? '♥' : '♡', async e => {
    const target = e.currentTarget;
    target.disabled = true;
    try {
      const state = await toggleWishlist(hotel.id);
      target.textContent = state ? '♥' : '♡';
      target.setAttribute('aria-pressed', String(state));
      const index = wishlist.indexOf(hotel.id);
      if (state && index === -1) wishlist.push(hotel.id);
      if (!state && index !== -1) wishlist.splice(index, 1);
      target.dispatchEvent(new CustomEvent('wishlist-change', {
        bubbles: true,
        detail: {
          saved: state
        }
      }));
      toast(state ? 'Saved to your wishlist.' : 'Removed from your wishlist.');
    } catch (error) {
      toast(error.message, true);
    } finally {
      target.disabled = false;
    }
  }, 'heart', {
    'aria-label': `Save ${hotel.name}`,
    'aria-pressed': String(saved)
  });
  return el('article', {
    class: 'hotel-card reveal'
  }, el('div', {
    class: 'card-photo'
  }, link(el('img', {
    src: hotel.images[0],
    alt: `${hotel.name} property`,
    loading: 'lazy'
  }), `hotel.html?${query({id:hotel.id,...stay})}`), el('span', {
    class: 'photo-tag'
  }, hotel.type), heart), el('div', {
    class: 'card-body'
  }, el('div', {
    class: 'card-location'
  }, `${hotel.area}, ${hotel.city}`, el('span', {
    class: 'stars',
    'aria-label': `${hotel.stars} stars`
  }, '★'.repeat(hotel.stars))), link(el('h3', {}, hotel.name),
    `hotel.html?${query({id:hotel.id,...stay})}`), el('div', {
    class: 'review-line'
  }, el('span', {
    class: 'score'
  }, hotel.score.toFixed(1)), el('strong', {}, 'Wonderful'), el('span', {
    class: 'muted'
  }, `${hotel.reviewCount} curated ratings`)), el('p', {
    class: 'amenity-line'
  }, hotel.amenities.slice(0, 3).join(' · ')), el('div', {
    class: 'card-bottom'
  }, el('div', {}, el('span', {
    class: 'muted small'
  }, 'From '), el('strong', {
    class: 'price'
  }, money(hotel.rooms[0].price)), el('span', {
    class: 'muted small'
  }, ' / night')), link('View deal ↗', `hotel.html?${query({id:hotel.id,...stay})}`, 'text-btn'))));
}
export function searchForm(values = {}, compact = false) {
  const defaults = {
    ...stayParams(),
    ...values
  };
  const form = el('form', {
    class: `search-card ${compact?'compact':''}`,
    role: 'search',
    'aria-label': 'Find a stay'
  });
  const city = field('Where to?', 'destination', 'text', values.city || '', {
    list: 'destinations',
    placeholder: 'City or destination',
    maxlength: 70,
    autocomplete: 'off'
  });
  city.append(el('datalist', {
    id: 'destinations'
  }, cities.map(c => el('option', {
    value: c.name
  }, c.country))));
  const start = field('Check-in', 'start', 'date', defaults.start, {
    min: today(),
    required: true
  });
  const end = field('Check-out', 'end', 'date', defaults.end, {
    min: defaults.start,
    required: true
  });
  const guest = el('label', {
    class: 'field'
  }, el('span', {}, 'Guests & rooms'), el('div', {
    class: 'guest-pickers'
  }, el('select', {
    name: 'guests',
    'aria-label': 'Guests'
  }, Array.from({
    length: 12
  }, (_, i) => el('option', {
    value: i + 1,
    selected: i + 1 === Number(defaults.guests) ? 'selected' : null
  }, `${i+1} guest${i?'s':''}`))), el('select', {
    name: 'count',
    'aria-label': 'Rooms'
  }, [1, 2, 3].map(n => el('option', {
    value: n,
    selected: n === Number(defaults.count) ? 'selected' : null
  }, `${n} room${n>1?'s':''}`)))));
  form.append(city, start, end, guest, el('button', {
    type: 'submit',
    class: 'btn'
  }, 'Search stays ↗'));
  start.querySelector('input').addEventListener('change', e => {
    end.querySelector('input').min = e.target.value;
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      validateDates(data.start, data.end);
      location.assign(`search.html?${query({...data,city:data.destination.trim()})}`);
    } catch (error) {
      toast(error.message, true);
    }
  });
  return form;
}
export function pageHeading(kicker, title, description) {
  return el('div', {
    class: 'page-heading'
  }, el('p', {
    class: 'eyebrow'
  }, kicker), el('h1', {}, title), el('p', {
    class: 'muted'
  }, description));
}
