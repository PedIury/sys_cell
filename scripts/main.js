const STORAGE_KEYS = {
  ordens: 'celfix_ordens',
  nextId: 'celfix_nextid',
  cfg: 'celfix_cfg',
};

const DEFAULT_CFG = {
  empresa: 'SoftTech Assistencia Tecnica',
  cnpj: '',
  end: '',
  cidade: '',
  tel: '',
  rodape: 'Obrigado pela preferencia!',
};

const STATUS_CLASSES = {
  aguardando: 'badge-aguardando',
  andamento: 'badge-andamento',
  pronto: 'badge-pronto',
  entregue: 'badge-entregue',
};

const STATUS_LABELS = {
  aguardando: 'Aguardando',
  andamento: 'Em andamento',
  pronto: 'Pronto',
  entregue: 'Entregue',
};

const STATUS_RECIBO = {
  aguardando: 'Aguardando analise',
  andamento: 'Em andamento',
  pronto: 'Pronto p/ retirada',
  entregue: 'Entregue',
};

let ordens = JSON.parse(localStorage.getItem(STORAGE_KEYS.ordens) || '[]');
let nextId = parseInt(localStorage.getItem(STORAGE_KEYS.nextId) || '1', 10);
let cfg = JSON.parse(localStorage.getItem(STORAGE_KEYS.cfg) || JSON.stringify(DEFAULT_CFG));

let configPreviewBound = false;

function byId(id) {
  return document.getElementById(id);
}

function v(id) {
  return byId(id).value.trim();
}

function save() {
  localStorage.setItem(STORAGE_KEYS.ordens, JSON.stringify(ordens));
  localStorage.setItem(STORAGE_KEYS.nextId, String(nextId));
}

function saveCfg() {
  localStorage.setItem(STORAGE_KEYS.cfg, JSON.stringify(cfg));
}

function maskPhone(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (v.length > 6) {
    v = v.replace(/^(\d{2})(\d{4})(\d*)$/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d*)$/, '($1) $2');
  }
  el.value = v;
}

function maskMoney(el) {
  let v = el.value.replace(/\D/g, '');
  if (!v) {
    el.value = '';
    return;
  }

  v = (parseInt(v, 10) / 100)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  el.value = v;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d) {
  if (!d) return '--';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function fmtDateHour() {
  const n = new Date();
  return `${String(n.getDate()).padStart(2, '0')}/${String(n.getMonth() + 1).padStart(2, '0')}/${n.getFullYear()} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

function padOS(n) {
  return 'OS-' + String(n).padStart(4, '0');
}

function badgeHTML(status) {
  return `<span class="badge ${STATUS_CLASSES[status] || ''}">${STATUS_LABELS[status] || status}</span>`;
}

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.panel').forEach((el) => el.classList.remove('active'));

  const tabs = ['dashboard', 'novo', 'lista', 'config'];
  document.querySelectorAll('.tab')[tabs.indexOf(tab)].classList.add('active');
  byId('tab-' + tab).classList.add('active');

  if (tab === 'dashboard') renderDashboard();
  if (tab === 'lista') renderLista();
  if (tab === 'config') loadConfig();
}

function renderDashboard() {
  const total = ordens.length;
  const aguardando = ordens.filter((o) => o.status === 'aguardando').length;
  const andamento = ordens.filter((o) => o.status === 'andamento').length;
  const pronto = ordens.filter((o) => o.status === 'pronto').length;

  byId('stats-grid').innerHTML =
    `<div class="stat"><div class="stat-label">Total de OS</div><div class="stat-value blue">${total}</div></div>` +
    `<div class="stat"><div class="stat-label">Aguardando</div><div class="stat-value amber">${aguardando}</div></div>` +
    `<div class="stat"><div class="stat-label">Em andamento</div><div class="stat-value blue">${andamento}</div></div>` +
    `<div class="stat"><div class="stat-label">Prontos</div><div class="stat-value green">${pronto}</div></div>`;

  const recentes = [...ordens].reverse().slice(0, 6);
  const tbody = byId('recent-body');

  if (!recentes.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhuma OS registrada ainda.</td></tr>';
    return;
  }

  tbody.innerHTML = recentes
    .map(
      (o) =>
        `<tr class="row-clickable" onclick="verDetalhe(${o.id})">` +
        `<td><span class="os-number">${padOS(o.id)}</span></td>` +
        `<td>${o.nome}</td>` +
        `<td>${o.marca} ${o.modelo}</td>` +
        `<td class="cell-problema">${o.problema}</td>` +
        `<td>${badgeHTML(o.status)}</td>` +
        `<td>${fmtDate(o.data)}</td>` +
        '</tr>'
    )
    .join('');
}

function renderLista() {
  const q = (byId('search-input').value || '').toLowerCase();
  const st = byId('filter-status').value;

  let lista = [...ordens].reverse();
  if (q) {
    lista = lista.filter((o) =>
      (o.nome + o.modelo + o.marca + padOS(o.id)).toLowerCase().includes(q)
    );
  }
  if (st) {
    lista = lista.filter((o) => o.status === st);
  }

  const tbody = byId('lista-body');
  if (!lista.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">Nenhuma ordem encontrada.</td></tr>';
    return;
  }

  tbody.innerHTML = lista
    .map(
      (o) =>
        '<tr>' +
        `<td><span class="os-number click-target" onclick="verDetalhe(${o.id})">${padOS(o.id)}</span></td>` +
        `<td>${o.nome}</td>` +
        `<td>${o.tel}</td>` +
        `<td>${o.marca} ${o.modelo}</td>` +
        `<td>${badgeHTML(o.status)}</td>` +
        `<td>${o.valor ? 'R$ ' + o.valor : '--'}</td>` +
        `<td>${fmtDate(o.data)}</td>` +
        `<td class="actions-cell">` +
        `<button class="btn btn-sm btn-print" onclick="imprimirOS(${o.id})">Imprimir</button>` +
        `<button class="btn btn-sm" onclick="editarOS(${o.id})">Editar</button>` +
        `<button class="btn btn-sm btn-danger" onclick="deletarOS(${o.id})">Excluir</button>` +
        '</td>' +
        '</tr>'
    )
    .join('');
}

function salvarOS() {
  if (!v('f-nome') || !v('f-tel') || !v('f-marca') || !v('f-modelo') || !v('f-problema')) {
    showMsg('Preencha todos os campos obrigatorios (*)', true);
    return;
  }

  const editId = byId('edit-id').value;
  const obj = {
    id: editId ? parseInt(editId, 10) : nextId++,
    nome: v('f-nome'),
    tel: v('f-tel'),
    tel2: v('f-tel2'),
    resp: v('f-resp'),
    marca: v('f-marca'),
    modelo: v('f-modelo'),
    cor: v('f-cor'),
    imei: v('f-imei'),
    problema: v('f-problema'),
    obs: v('f-obs'),
    valor: v('f-valor'),
    status: v('f-status'),
    data: v('f-data') || today(),
    previsao: v('f-previsao'),
  };

  if (editId) {
    const idx = ordens.findIndex((o) => o.id === parseInt(editId, 10));
    if (idx >= 0) ordens[idx] = obj;
  } else {
    ordens.push(obj);
  }

  save();
  clearForm();

  showMsg(editId ? 'OS atualizada com sucesso!' : `OS registrada! Numero: ${padOS(obj.id)}`);
  byId('edit-id').value = '';
  byId('form-title').textContent = 'Nova ordem de servico';
}

function clearForm() {
  [
    'f-nome',
    'f-tel',
    'f-tel2',
    'f-resp',
    'f-modelo',
    'f-cor',
    'f-imei',
    'f-problema',
    'f-obs',
    'f-valor',
    'f-data',
    'f-previsao',
  ].forEach((id) => {
    byId(id).value = '';
  });

  byId('f-marca').selectedIndex = 0;
  byId('f-status').selectedIndex = 0;
  byId('edit-id').value = '';
}

function cancelEdit() {
  clearForm();
  byId('form-title').textContent = 'Nova ordem de servico';
  byId('form-msg').style.display = 'none';
  switchTab('lista');
}

function showMsg(txt, err) {
  const el = byId('form-msg');
  el.textContent = txt;
  el.style.display = 'block';
  el.style.background = err ? '#FCEBEB' : '#EAF3DE';
  el.style.color = err ? '#A32D2D' : '#3B6D11';
  if (!err) setTimeout(() => (el.style.display = 'none'), 3500);
}

function editarOS(id) {
  const o = ordens.find((x) => x.id === id);
  if (!o) return;

  switchTab('novo');
  byId('form-title').textContent = 'Editar OS - ' + padOS(id);
  byId('edit-id').value = id;

  const set = (fid, val) => {
    const el = byId(fid);
    if (el) el.value = val || '';
  };

  set('f-nome', o.nome);
  set('f-tel', o.tel);
  set('f-tel2', o.tel2);
  set('f-resp', o.resp);
  set('f-marca', o.marca);
  set('f-modelo', o.modelo);
  set('f-cor', o.cor);
  set('f-imei', o.imei);
  set('f-problema', o.problema);
  set('f-obs', o.obs);
  set('f-valor', o.valor);
  set('f-status', o.status);
  set('f-data', o.data);
  set('f-previsao', o.previsao);
}

function deletarOS(id) {
  if (!confirm(`Deseja excluir a ${padOS(id)}?`)) return;
  ordens = ordens.filter((o) => o.id !== id);
  save();
  renderLista();
}

function verDetalhe(id) {
  const o = ordens.find((x) => x.id === id);
  if (!o) return;

  const modal = byId('modal-content');
  modal.innerHTML =
    `<div class="modal-head"><h2 class="modal-title">${padOS(o.id)} - ${o.nome}</h2><button class="btn btn-sm" onclick="closeModal()">Fechar</button></div>` +
    '<div class="detail-card">' +
    `<div class="detail-row"><span class="detail-label">Status</span>${badgeHTML(o.status)}</div>` +
    `<div class="detail-row"><span class="detail-label">Telefone</span>${o.tel}</div>` +
    (o.tel2 ? `<div class="detail-row"><span class="detail-label">Contato alternativo</span>${o.tel2}</div>` : '') +
    (o.resp ? `<div class="detail-row"><span class="detail-label">Responsavel</span>${o.resp}</div>` : '') +
    `<div class="detail-row"><span class="detail-label">Aparelho</span>${o.marca} ${o.modelo}${o.cor ? ' - ' + o.cor : ''}</div>` +
    (o.imei ? `<div class="detail-row"><span class="detail-label">IMEI</span>${o.imei}</div>` : '') +
    `<div class="detail-row"><span class="detail-label">Entrada</span>${fmtDate(o.data)}</div>` +
    (o.previsao ? `<div class="detail-row"><span class="detail-label">Previsao</span>${fmtDate(o.previsao)}</div>` : '') +
    (o.valor ? `<div class="detail-row"><span class="detail-label">Valor</span>R$ ${o.valor}</div>` : '') +
    '</div>' +
    '<p class="detail-caption">Problema relatado</p>' +
    `<div class="nota-block">${o.problema}</div>` +
    (o.obs
      ? `<p class="detail-caption detail-caption-spaced">Observacoes tecnicas</p><div class="nota-block">${o.obs}</div>`
      : '') +
    '<div class="detail-actions">' +
    `<button class="btn btn-sm btn-danger" onclick="deletarOS(${o.id});closeModal()">Excluir</button>` +
    `<button class="btn btn-sm btn-print" onclick="imprimirOS(${o.id})">Imprimir recibo</button>` +
    `<button class="btn btn-sm btn-primary" onclick="closeModal();editarOS(${o.id})">Editar</button>` +
    '</div>';

  byId('modal-bg').classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === byId('modal-bg')) {
    byId('modal-bg').classList.remove('open');
  }
}

function gerarTextoRecibo(o) {
  const C = 32;

  function separador() {
    return '-'.repeat(C) + '\n';
  }

  function centro(t) {
    const p = Math.max(0, Math.floor((C - t.length) / 2));
    return (' '.repeat(p) + t).slice(0, C) + '\n';
  }

  function par(k, val) {
    const maxV = C - k.length - 1;
    const valStr = String(val || '').slice(0, maxV);
    return k + ' ' + valStr.padStart(C - k.length - 1) + '\n';
  }

  function wrap(label, text) {
    if (!text) return '';

    const lines = [];
    let cur = '';
    text.split(' ').forEach((w) => {
      if ((cur + ' ' + w).trim().length <= C) {
        cur = (cur + ' ' + w).trim();
      } else {
        if (cur) lines.push(cur);
        cur = w;
      }
    });
    if (cur) lines.push(cur);

    return label + ':\n' + lines.map((l) => '  ' + l).join('\n') + '\n';
  }

  let r = '';
  r += centro(cfg.empresa || DEFAULT_CFG.empresa);
  if (cfg.cnpj) r += centro('CNPJ: ' + cfg.cnpj);
  if (cfg.end) r += centro(cfg.end);
  if (cfg.cidade) r += centro(cfg.cidade);
  if (cfg.tel) r += centro('Tel: ' + cfg.tel);
  r += separador();
  r += centro('ORDEM DE SERVICO');
  r += centro(padOS(o.id));
  r += separador();
  r += par('Emissao:', fmtDateHour());
  r += separador();
  r += par('Cliente:', o.nome);
  r += par('Fone:', o.tel);
  if (o.tel2) r += par('Contato:', o.tel2);
  if (o.resp) r += par('Responsavel:', o.resp);
  r += separador();
  r += par('Aparelho:', o.marca + ' ' + o.modelo);
  if (o.cor) r += par('Cor:', o.cor);
  if (o.imei) r += par('IMEI:', o.imei);
  r += separador();
  r += wrap('Problema', o.problema);
  if (o.obs) {
    r += separador();
    r += wrap('Obs. tecnica', o.obs);
  }
  r += separador();
  r += par('Entrada:', fmtDate(o.data));
  if (o.previsao) r += par('Previsao:', fmtDate(o.previsao));
  r += par('Status:', STATUS_RECIBO[o.status] || o.status);
  r += separador();
  if (o.valor) {
    r += par('VALOR:', 'R$ ' + o.valor);
    r += separador();
  }
  r += '\n';
  r += centro('Assinatura do cliente:');
  r += '\n';
  r += centro('_____________________');
  r += '\n\n';
  if (cfg.rodape) r += centro(cfg.rodape);
  r += '\n\n\n';
  return r;
}

function imprimirOS(id) {
  const o = ordens.find((x) => x.id === id);
  if (!o) return;

  const el = byId('recibo-print');
  el.style.display = 'block';
  el.textContent = gerarTextoRecibo(o);

  window.print();
  setTimeout(() => {
    el.style.display = 'none';
  }, 1000);
}

function loadConfig() {
  byId('cfg-empresa').value = cfg.empresa || '';
  byId('cfg-cnpj').value = cfg.cnpj || '';
  byId('cfg-end').value = cfg.end || '';
  byId('cfg-cidade').value = cfg.cidade || '';
  byId('cfg-tel').value = cfg.tel || '';
  byId('cfg-rodape').value = cfg.rodape || '';

  if (!configPreviewBound) {
    ['cfg-empresa', 'cfg-cnpj', 'cfg-end', 'cfg-cidade', 'cfg-tel', 'cfg-rodape'].forEach((id) => {
      byId(id).addEventListener('input', atualizarPrevia);
    });
    configPreviewBound = true;
  }

  atualizarPrevia();
  byId('hdr-nome').textContent = (cfg.empresa || 'SoftTech') + ' - Assistencia tecnica';
}

function atualizarPrevia() {
  const tmpCfg = {
    empresa: byId('cfg-empresa').value || DEFAULT_CFG.empresa,
    cnpj: byId('cfg-cnpj').value,
    end: byId('cfg-end').value,
    cidade: byId('cfg-cidade').value,
    tel: byId('cfg-tel').value,
    rodape: byId('cfg-rodape').value || DEFAULT_CFG.rodape,
  };

  const o =
    ordens.length > 0
      ? ordens[ordens.length - 1]
      : {
          id: 1,
          nome: 'Exemplo Silva',
          tel: '(85) 99999-0000',
          tel2: '',
          resp: '',
          marca: 'Samsung',
          modelo: 'Galaxy A54',
          cor: 'Preto',
          imei: '',
          problema: 'Tela quebrada e nao liga',
          obs: '',
          valor: '250,00',
          status: 'pronto',
          data: today(),
          previsao: '',
        };

  const savedCfg = cfg;
  cfg = tmpCfg;
  byId('recibo-preview').textContent = gerarTextoRecibo(o);
  cfg = savedCfg;
}

function salvarConfig() {
  cfg = {
    empresa: byId('cfg-empresa').value,
    cnpj: byId('cfg-cnpj').value,
    end: byId('cfg-end').value,
    cidade: byId('cfg-cidade').value,
    tel: byId('cfg-tel').value,
    rodape: byId('cfg-rodape').value,
  };

  saveCfg();
  byId('hdr-nome').textContent = (cfg.empresa || 'SoftTech') + ' - Assistencia tecnica';

  const msg = byId('cfg-msg');
  msg.style.display = 'block';
  msg.textContent = 'Configuracoes salvas com sucesso!';
  setTimeout(() => (msg.style.display = 'none'), 3000);
}

function imprimirPreview(size) {
  // size: '58' or '80'
  const texto = byId('recibo-preview').textContent;
  const el = byId('recibo-print');
  if (!el) return;

  el.textContent = texto;
  el.style.display = 'block';
  el.classList.remove('printer-58mm', 'printer-80mm');
  if (size === '80') el.classList.add('printer-80mm');
  else el.classList.add('printer-58mm');

  window.print();
  setTimeout(() => {
    el.style.display = 'none';
  }, 1000);
}

renderDashboard();
