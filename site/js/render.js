const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function localized(obj, lang) {
  return obj?.[lang] ?? obj?.es ?? {};
}

export function safeUrl(url) {
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
}

function mediaHTML(media, lang) {
  if (media?.type === 'img') {
    const size = media.width && media.height ? ` width="${Number(media.width)}" height="${Number(media.height)}"` : '';
    return `<img class="proj__media" src="${escapeHTML(media.src)}" alt="${escapeHTML(media[lang] ?? media.es ?? '')}" loading="lazy"${size}>`;
  }
  if (media?.type === 'code') return `<pre class="proj__media proj__code"><code>${escapeHTML(media.text)}</code></pre>`;
  return '';
}

export function projectCardHTML(project, lang, index, repoLabel) {
  const t = localized(project, lang);
  const num = String(index + 1).padStart(2, '0');
  const tags = (project.tags ?? []).map((tag) => `<li class="tag">${escapeHTML(tag)}</li>`).join('');
  const url = safeUrl(project.repo);
  const link = url
    ? `<a class="proj__link" href="${escapeHTML(url)}" target="_blank" rel="noopener">${escapeHTML(repoLabel)}</a>`
    : '';
  const learned = t.learned ? `<p class="proj__learned">${escapeHTML(t.learned)}</p>` : '';
  return `<article class="box proj">
  ${mediaHTML(project.media, lang)}
  <span class="proj__cat">#${num} · ${escapeHTML(t.category)}</span>
  <h3 class="proj__title">${escapeHTML(t.title)}</h3>
  <p class="proj__desc">${escapeHTML(t.desc)}</p>
  ${learned}
  <ul class="proj__tags">${tags}</ul>
  ${link}
</article>`;
}

export function timelineRowHTML(entry, lang) {
  const t = localized(entry, lang);
  const led = entry.led ? '<span class="led" aria-hidden="true"></span> ' : '';
  const detail = t.detail ? `<span class="timeline__detail">${escapeHTML(t.detail)}</span>` : '';
  return `<tr>
  <td class="timeline__period">${escapeHTML(t.period ?? entry.period)}</td>
  <td class="timeline__text"><span class="timeline__title">${escapeHTML(t.text)}</span>${detail}</td>
  <td class="timeline__type">${led}${escapeHTML(t.type)}</td>
</tr>`;
}

export function pickCv(cv, lang) {
  return cv?.[lang] ?? cv?.es ?? cv?.en ?? null;
}

export function serviceCardHTML(service, lang) {
  const t = localized(service, lang);
  return `<article class="box svc">
  <span class="svc__role">${escapeHTML(t.role)}</span>
  <h3 class="svc__name"><span class="led" aria-hidden="true"></span> ${escapeHTML(t.name)}</h3>
  <p class="svc__desc">${escapeHTML(t.desc)}</p>
</article>`;
}

export function stepHTML(step, lang, index) {
  const t = localized(step, lang);
  return `<li class="box step">
  <span class="step__num">${String(index + 1).padStart(2, '0')}</span>
  <h3 class="step__title">${escapeHTML(t.title)}</h3>
  <p class="step__text">${escapeHTML(t.text)}</p>
</li>`;
}

export function storageRowHTML(disk, lang) {
  return `<tr><td class="storage__name">${escapeHTML(disk.name)}</td><td class="storage__use">${escapeHTML(disk[lang] ?? disk.es)}</td></tr>`;
}

export function stackGroupHTML(group, lang) {
  const items = (group.items ?? []).map((item) => `<li class="tag">${escapeHTML(item)}</li>`).join('');
  return `<div class="box stack-group">
  <h3 class="stack-group__name">${escapeHTML(group[lang] ?? group.es)}</h3>
  <ul class="proj__tags">${items}</ul>
</div>`;
}

// Años completos desde un mes de inicio (month: 1-12)
export function yearsSince(year, month, now = new Date()) {
  const months = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  return Math.floor(months / 12);
}
