import {
  el,
  button,
  link,
  field,
  $,
  money,
  toast,
  empty,
  params,
  stayParams,
  query,
  quote,
  modal,
  today,
  busy
} from './utils.js';
import {
  getHotel,
  getReviews,
  addReview,
  getWishlist,
  toggleWishlist,
  availability
} from './db.js';
export async function renderHotel(root) {
  const h = await getHotel(params().get('id'));
  root.className = 'container hotel-page';
  if (!h) {
    root.append(empty('This stay couldn’t be found.', 'Let’s find you another beautiful place.'));
    return;
  }
  let saved = (await getWishlist()).includes(h.id);
  const heart = button(saved ? '♥ Saved' : '♡ Save this stay', async () => {
    try {
      saved = await toggleWishlist(h.id);
      heart.textContent = saved ? '♥ Saved' : '♡ Save this stay';
      heart.setAttribute('aria-pressed', String(saved));
      toast(saved ? 'Stay saved.' : 'Stay removed.');
    } catch (e) {
      toast(e.message, true);
    }
  }, 'btn outline', {
    'aria-pressed': String(saved)
  });
  root.append(el('div', {
      class: 'breadcrumbs'
    }, link('Discover', 'home.html'), ' / ', link(h.city, `search.html?${query({city:h.city})}`), ' / ',
    h.name), el('div', {
    class: 'section-head hotel-heading'
  }, el('div', {}, el('div', {
    class: 'stars',
    'aria-label': `${h.stars} stars`
  }, '★'.repeat(h.stars)), el('h1', {}, h.name), el('p', {
    class: 'muted'
  }, `◉ ${h.area}, ${h.city}, ${h.country}`)), heart));

  function openGallery(index) {
    let i = index;
    const image = el('img', {
      src: h.images[i],
      alt: `${h.name} gallery photograph ${i+1}`
    });
    const counter = el('span', {}, `${i+1} / ${h.images.length}`);
    const change = direction => {
      i = (i + direction + h.images.length) % h.images.length;
      image.src = h.images[i];
      image.alt = `${h.name} gallery photograph ${i+1}`;
      counter.textContent = `${i+1} / ${h.images.length}`;
    };
    const d = modal('A closer look', el('div', {
      class: 'lightbox'
    }, image, el('div', {
      class: 'lightbox-controls'
    }, button('← Previous', () => change(-1), 'btn outline'), counter, button('Next →', () =>
      change(1), 'btn outline'))));
    d.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') change(-1);
      if (e.key === 'ArrowRight') change(1);
    });
  }
  root.append(el('div', {
    class: 'gallery'
  }, h.images.map((src, i) => button(el('img', {
    src,
    alt: `${h.name}, property view ${i+1}`,
    loading: i ? 'lazy' : 'eager'
  }), () => openGallery(i), `gallery-image gallery-image-${i}`, {
    'aria-label': `Open gallery image ${i+1}`
  }))));
  const form = el('form', {
    class: 'booking-card'
  });
  const stay = stayParams();
  let selected = h.rooms[0];
  const availableText = el('p', {
    class: 'availability',
    'aria-live': 'polite'
  });
  const total = el('div', {
    class: 'price-breakdown',
    'aria-live': 'polite'
  });
  const roomSelect = el('select', {
    name: 'room',
    id: 'room-select'
  }, h.rooms.map(r => el('option', {
    value: r.id
  }, `${r.name} · ${money(r.price)}/night`)));
  form.append(el('div', {
    class: 'booking-price'
  }, el('strong', {}, money(selected.price)), el('span', {
    class: 'muted'
  }, ' / room / night')), el('p', {
    class: 'review-line'
  }, el('span', {
    class: 'score'
  }, h.score.toFixed(1)), 'Wonderful location & comfort'), el('label', {
    class: 'field',
    for: 'room-select'
  }, el('span', {}, 'Choose your room'), roomSelect), el('div', {
    class: 'form-grid'
  }, field('Check-in', 'start', 'date', stay.start, {
    required: true,
    min: today()
  }), field('Check-out', 'end', 'date', stay.end, {
    required: true,
    min: stay.start
  })), el('div', {
    class: 'form-grid'
  }, field('Guests', 'guests', 'number', stay.guests, {
    required: true,
    min: 1,
    max: 12
  }), field('Rooms', 'count', 'number', stay.count, {
    required: true,
    min: 1,
    max: 3
  })), availableText, total, el('p', {
    class: 'form-error',
    role: 'alert'
  }), el('button', {
    type: 'submit',
    class: 'btn full'
  }, 'Reserve your stay →'), el('p', {
    class: 'small muted centered'
  }, 'No real payment. This is a demo reservation.'), el('div', {
    class: 'booking-perks'
  }, '✓ Free cancellation before check-in day', el('br'), '✓ 12% demo tax, no additional fees'));
  let revision = 0;
  async function calculate() {
    const version = ++revision;
    const submit = form.querySelector('[type=submit]');
    submit.disabled = true;
    try {
      const data = Object.fromEntries(new FormData(form));
      selected = h.rooms.find(r => r.id === data.room);
      const count = Number(data.count),
        guests = Number(data.guests);
      if (!Number.isInteger(count) || count < 1 || count > 3 || !Number.isInteger(guests) || guests < 1 ||
        guests > count * selected.capacity) throw Error('Choose enough rooms for your guests.');
      const q = quote(selected, data.start, data.end, count);
      form.querySelector('.booking-price strong').textContent = money(selected.price);
      $('#end', form).min = data.start;
      const units = await availability(h.id, selected.id, data.start, data.end);
      if (version !== revision) return;
      availableText.textContent = units.length >= count ?
        `${units.length} rooms available for your dates` : 'Not available for these dates';
      total.replaceChildren(el('div', {}, el('span', {},
        `${money(selected.price)} × ${q.nights} nights × ${count} rooms`), el('span', {}, money(q
        .subtotal))), el('div', {}, el('span', {}, 'Taxes (12%)'), el('span', {}, money(q.tax))), el(
        'div', {
          class: 'total'
        }, el('strong', {}, 'Total (USD)'), el('strong', {}, money(q.total))));
      submit.disabled = units.length < count;
    } catch (e) {
      if (version === revision) {
        availableText.textContent = e.message;
        total.replaceChildren();
      }
    }
  }
  form.addEventListener('input', calculate);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      quote(selected, data.start, data.end, Number(data.count));
      location.assign(
        `checkout.html?${query({id:h.id,room:data.room,start:data.start,end:data.end,count:data.count,guests:data.guests})}`
        );
    } catch (error) {
      toast(error.message, true);
    }
  });
  const reviews = el('div', {
    class: 'reviews-list'
  });
  async function loadReviews() {
    const list = await getReviews(h.id);
    reviews.replaceChildren(...list.sort((a, b) => b.date.localeCompare(a.date)).map(r => el('article', {
      class: 'review-card'
    }, el('div', {
      class: 'section-head'
    }, el('div', {
      class: 'review-author'
    }, el('span', {
      class: 'avatar'
    }, r.name.slice(0, 1)), el('div', {}, el('strong', {}, r.name), el('small', {
      class: 'muted'
    }, `${r.date}${r.sample?' · Sample review':''}`))), el('span', {
      class: 'stars',
      'aria-label': `${r.rating} out of 5`
    }, '★'.repeat(r.rating))), el('p', {}, r.body))));
  }
  const reviewForm = el('form', {
    class: 'review-form'
  }, el('h3', {}, 'How was your stay?'), el('p', {
    class: 'muted'
  }, 'Guests can leave or update one review after completing a stay.'), el('label', {
    class: 'field'
  }, el('span', {}, 'Your rating'), el('select', {
    name: 'rating',
    required: true
  }, [5, 4, 3, 2, 1].map(n => el('option', {
    value: n
  }, `${n} — ${['','Poor','Fair','Good','Very good','Excellent'][n]}`)))), el('label', {
    class: 'field'
  }, el('span', {}, 'Your review'), el('textarea', {
    name: 'body',
    required: true,
    minlength: 15,
    maxlength: 1000,
    rows: 4,
    placeholder: 'Tell other travelers about your experience.'
  })), el('p', {
    class: 'form-error',
    role: 'alert'
  }), el('button', {
    class: 'btn',
    type: 'submit'
  }, 'Publish review'));
  reviewForm.addEventListener('submit', e => {
    e.preventDefault();
    busy(reviewForm, async () => {
      const d = new FormData(reviewForm);
      await addReview(h.id, Number(d.get('rating')), d.get('body'));
      reviewForm.reset();
      await loadReviews();
      toast('Your review has been saved.');
    });
  });
  root.append(el('div', {
    class: 'detail-layout'
  }, el('div', {}, el('section', {
    class: 'detail-section'
  }, el('p', {
    class: 'eyebrow'
  }, 'SETTLE INTO SOMETHING SPECIAL'), el('h2', {}, 'Your own little escape.'), el('p', {
    class: 'description'
  }, h.description), el('div', {
    class: 'amenities-grid'
  }, h.amenities.map(a => el('span', {}, el('span', {
    'aria-hidden': 'true'
  }, '✓ '), a)))), el('section', {
    class: 'detail-section'
  }, el('h2', {}, 'Room to unwind.'), h.rooms.map((r, i) => el('article', {
    class: 'room-card'
  }, el('img', {
    src: h.images[(i + 1) % 4],
    alt: r.name,
    loading: 'lazy'
  }), el('div', {}, el('h3', {}, r.name), el('p', {
    class: 'muted'
  }, `${r.size} m² · ${r.bed}`), el('p', {
    class: 'muted'
  }, `Sleeps ${r.capacity} · Breakfast included`), el('div', {
    class: 'section-head'
  }, el('strong', {}, `${money(r.price)} / night`), button('Select room', () => {
    roomSelect.value = r.id;
    calculate();
    form.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    roomSelect.focus({
      preventScroll: true
    });
  }, 'btn outline')))))), el('section', {
    class: 'detail-section'
  }, el('h2', {}, 'Good to know.'), el('div', {
    class: 'policy-grid'
  }, el('div', {}, el('strong', {}, 'Check-in & check-out'), el('p', {},
    'Check-in from 3:00 PM. Check-out by 11:00 AM.')), el('div', {}, el('strong', {},
    'Flexible plans'), el('p', {},
    'Cancel before check-in day at no charge. Demo bookings only.')))), el('section', {
    class: 'detail-section'
  }, el('h2', {}, 'Little moments. Lasting impressions.'), el('p', {
      class: 'muted'
    },
    'Displayed property scores and rating counts are curated demo data. Written reviews below are stored separately.'
    ), reviews, reviewForm)), el('aside', {}, form)));
  await Promise.all([calculate(), loadReviews()]);
}
