import {
  el,
  button,
  $,
  money,
  empty,
  params,
  stayParams,
  validateDates
} from './utils.js';
import {
  getHotels,
  getWishlist,
  availability
} from './db.js';
import {
  hotelCard,
  searchForm,
  pageHeading
} from './components.js';
export function filterHotels(hotels, {
  city = '',
  maxPrice = 600,
  stars = [],
  amenities = [],
  type = '',
  rating = 0,
  sort = 'popular'
} = {}) {
  const term = city.trim().toLowerCase();
  const result = hotels.filter(h => (!term || [h.city, h.country, h.name, h.area].some(v => v.toLowerCase()
      .includes(term))) && h.rooms[0].price <= maxPrice && (!stars.length || stars.includes(h.stars)) &&
    amenities.every(a => h.amenities.includes(a)) && (!type || h.type === type) && h.score >= rating);
  return result.sort((a, b) => sort === 'price-asc' ? a.rooms[0].price - b.rooms[0].price : sort ===
    'price-desc' ? b.rooms[0].price - a.rooms[0].price : sort === 'rating' ? b.score - a.score : b
    .popularity - a.popularity);
}
export async function renderSearch(root) {
  root.className = 'container search-page';
  const city = params().get('city') || params().get('destination') || '';
  const stay = stayParams();
  root.append(searchForm({
    city,
    ...stay
  }, true), pageHeading('FIND YOUR SOMEWHERE', city ? `Stays in ${city}` :
    'A stay for every kind of trip.', 'Thoughtfully selected places. All yours to discover.'));
  const grid = el('div', {
    class: 'search-results',
    'aria-live': 'polite',
    'aria-busy': 'true'
  }, Array.from({
    length: 4
  }, () => el('div', {
    class: 'skeleton',
    'aria-hidden': 'true'
  })));
  const resultsCount = el('h2', {
    class: 'results-count'
  }, 'Finding your stays…');
  const filter = el('form', {
    class: 'filter-panel',
    id: 'filters'
  }, el('div', {
    class: 'section-head'
  }, el('h2', {}, 'Filter by'), el('button', {
    type: 'reset',
    class: 'text-btn'
  }, 'Reset')));
  const amount = el('output', {
    for: 'price',
    id: 'price-value'
  }, money(600));
  filter.append(el('fieldset', {}, el('legend', {}, 'Your budget / night'), el('div', {
    class: 'section-head'
  }, el('span', {
    class: 'muted'
  }, 'Up to'), amount), el('label', {
    class: 'sr-only',
    for: 'price'
  }, 'Maximum nightly price'), el('input', {
    type: 'range',
    id: 'price',
    name: 'maxPrice',
    min: 40,
    max: 600,
    value: 600,
    step: 10
  }), el('div', {
    class: 'range-labels'
  }, el('span', {}, '$40'), el('span', {}, '$600'))));
  const checkGroup = (title, name, values) => el('fieldset', {}, el('legend', {}, title), values.map(([
    value, label
  ]) => el('label', {
    class: 'check'
  }, el('input', {
    type: 'checkbox',
    name,
    value
  }), label)));
  filter.append(checkGroup('Property rating', 'stars', [
    [5, '★★★★★  5 stars'],
    [4, '★★★★  4 stars']
  ]), checkGroup('The little extras', 'amenities', ['Wi-Fi', 'Pool', 'Spa', 'Breakfast', 'Gym',
    'Parking'
  ].map(a => [a, a])), el('fieldset', {}, el('legend', {}, 'Property type'), el('select', {
    name: 'type',
    'aria-label': 'Property type'
  }, ['', 'Hotel', 'Boutique hotel', 'Resort'].map(t => el('option', {
    value: t
  }, t || 'All property types')))), el('fieldset', {}, el('legend', {}, 'Guest rating'), el('select', {
    name: 'rating',
    'aria-label': 'Minimum guest rating'
  }, [
    [0, 'Any rating'],
    [9, 'Wonderful: 9+'],
    [9.3, 'Exceptional: 9.3+']
  ].map(([v, t]) => el('option', {
    value: v
  }, t)))));
  const sort = el('select', {
    'aria-label': 'Sort results'
  }, [
    ['popular', 'Our top picks'],
    ['price-asc', 'Price: low to high'],
    ['price-desc', 'Price: high to low'],
    ['rating', 'Guest rating']
  ].map(([v, t]) => el('option', {
    value: v
  }, t)));
  root.append(el('div', {
    class: 'search-layout'
  }, el('aside', {}, button('☷ Filters', e => {
    const state = filter.classList.toggle('filter-open');
    e.currentTarget.setAttribute('aria-expanded', String(state));
  }, 'btn outline filter-toggle', {
    'aria-controls': 'filters',
    'aria-expanded': 'false'
  }), filter, el('div', {
    class: 'filter-note'
  }, el('strong', {}, 'A better kind of getaway'), el('p', {},
    'All prices are per room, per night. A 12% demo tax is added at checkout.'))), el('section', {},
    el('div', {
      class: 'results-toolbar'
    }, resultsCount, sort), grid)));
  const [hotels, wish] = await Promise.all([getHotels(), getWishlist()]);
  let available = hotels;
  try {
    validateDates(stay.start, stay.end);
    const checks = await Promise.all(hotels.map(async h => {
      const valid = await Promise.all(h.rooms.map(async r => (r.capacity * stay.count >= stay
          .guests) && (await availability(h.id, r.id, stay.start, stay.end)).length >= stay
        .count));
      return valid.some(Boolean);
    }));
    available = hotels.filter((_, i) => checks[i]);
  } catch (e) {
    grid.replaceChildren(empty('Check your travel dates.', e.message, 'search.html', 'Reset search'));
    resultsCount.textContent = 'Invalid search dates';
    grid.setAttribute('aria-busy', 'false');
    return;
  }

  function update() {
    const data = new FormData(filter);
    const options = {
      city,
      maxPrice: Number(data.get('maxPrice')),
      stars: data.getAll('stars').map(Number),
      amenities: data.getAll('amenities'),
      type: data.get('type'),
      rating: Number(data.get('rating')),
      sort: sort.value
    };
    amount.textContent = money(options.maxPrice);
    const results = filterHotels(available, options);
    resultsCount.textContent = `${results.length} ${results.length===1?'stay':'stays'} found`;
    grid.setAttribute('aria-busy', 'false');
    grid.replaceChildren(...(results.length ? results.map(h => hotelCard(h, wish, stay)) : [empty(
      'Nothing here just yet.', 'Try a higher budget, fewer filters, or another destination.',
      'search.html', 'Clear all filters')]));
  }
  filter.addEventListener('input', update);
  filter.addEventListener('submit', e => e.preventDefault());
  filter.addEventListener('reset', () => setTimeout(update));
  sort.addEventListener('change', update);
  update();
}
