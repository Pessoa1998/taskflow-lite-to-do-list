// app.js
'use strict';

/*
  app.js - Gerenciador de demandas
  Mantém a mesma estrutura/IDs do HTML fornecido.
*/

// ---------- Config ----------
const STORAGE_KEY = 'gabrielDemands';
// Horário comercial (ajuste se quiser)
const WORK_START = { h: 7, m: 12 };
const WORK_END   = { h: 17, m: 30 };

// ---------- Estado ----------
let demands = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let nextId = demands.length ? Math.max(...demands.map(d => d.id)) + 1 : 1;
let currentFilter = 'all';
let editingId = null;
let pendingCompleteId = null;

// Chart references
let chartStatus = null, chartType = null, chartHours = null;

// ---------- Utilitários ----------
function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(demands));
  updateAll();
}

/**
 * Calcula horas úteis entre startIso e endIso considerando WORK_START/END e só dias úteis (segunda a sexta).
 * Retorna número de horas (float).
 */
function calculateWorkHours(startIso, endIso){
  if(!startIso || !endIso) return 0;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start) || isNaN(end) || end <= start) return 0;

  let totalMs = 0;
  // itera por dias
  let cursor = new Date(start);
  cursor.setHours(0,0,0,0);
  const endDay = new Date(end);
  endDay.setHours(0,0,0,0);

  while(cursor <= endDay){
    const dayOfWeek = cursor.getDay(); // 0 domingo, 6 sábado
    if(dayOfWeek >= 1 && dayOfWeek <= 5){
      // construir intervalos de trabalho para esse dia
      const workStart = new Date(cursor);
      workStart.setHours(WORK_START.h, WORK_START.m, 0, 0);
      const workEnd = new Date(cursor);
      workEnd.setHours(WORK_END.h, WORK_END.m, 0, 0);

      // escolha início (s) e fim (e) do período a considerar neste dia
      const s = (sameDay(start, cursor) && start > workStart) ? start : workStart;
      const e = (sameDay(end, cursor) && end < workEnd) ? end : workEnd;

      if(s < e){
        totalMs += (e - s);
      }
    }
    // próximo dia
    cursor.setDate(cursor.getDate() + 1);
  }
  return totalMs / (1000 * 60 * 60); // converte ms -> horas
}

function sameDay(dateA, dayRef){
  return new Date(dateA).toDateString() === new Date(dayRef).toDateString();
}

function formatDateTime(iso){
  if(!iso) return '-';
  try{
    return new Date(iso).toLocaleString('pt-BR');
  }catch(e){ return iso; }
}

function escapeHtml(str){
  return String(str || '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

// ---------- Renders ----------
function renderList(){
  const grid = document.getElementById('grid');
  if(!grid) return;
  grid.innerHTML = '';

  const filtered = demands.filter(d=>{
    if(currentFilter === 'all') return true;
    if(currentFilter === 'pending') return !d.completedDate;
    if(currentFilter === 'completed') return !!d.completedDate;
    if(currentFilter === 'rotina') return d.type === 'rotina';
    if(currentFilter === 'esporadica') return d.type === 'esporadica';
    return true;
  });

  // ordenar por receivedDate desc (mais recentes primeiro)
  filtered.sort((a,b)=> new Date(b.receivedDate) - new Date(a.receivedDate));

  for(const d of filtered){
    const div = document.createElement('div');
    div.className = 'task';
    const isDone = !!d.completedDate;
    const hours = calculateWorkHours(d.receivedDate, d.completedDate || new Date());
    div.innerHTML = `
      <div>
        <h3>${escapeHtml(d.title)}</h3>
        <div class="meta"><strong>Tipo:</strong> ${d.type === 'rotina' ? 'Rotina Diária' : 'Esporádica'} • <strong>Chegada:</strong> ${formatDateTime(d.receivedDate)}</div>
        ${ isDone ? `<div class="meta"><strong>Concluído:</strong> ${formatDateTime(d.completedDate)}</div>` : '' }
        ${ d.comment ? `<div class="meta"><strong>Comentário:</strong> ${escapeHtml(d.comment)}</div>` : '' }
        <div style="margin-top:8px"><strong>Horas úteis:</strong> ${hours.toFixed(2)}h</div>
      </div>
      <div>
        <div style="margin-bottom:8px"><span class="status ${isDone ? 'done' : 'pending'}">${isDone ? 'Concluída' : 'Em andamento'}</span></div>
        <div class="actions">
          ${ !isDone ? `<button class="complete" data-id="${d.id}">Finalizar</button>` : '' }
          <button class="edit" data-id="${d.id}">Editar</button>
          <button class="delete" data-id="${d.id}">Excluir</button>
        </div>
      </div>
    `;
    grid.appendChild(div);
  }
}

// ---------- Event delegation (grid buttons) ----------
function attachGridListener(){
  const grid = document.getElementById('grid');
  if(!grid) return;

  grid.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('button');
    if(!btn) return;
    const id = Number(btn.dataset.id);
    if(btn.classList.contains('delete')){
      if(confirm('Deseja realmente excluir esta demanda?')){
        demands = demands.filter(x=>x.id !== id);
        save();
      }
      return;
    }
    if(btn.classList.contains('edit')){
      const d = demands.find(x=>x.id === id);
      if(!d) return;
      // preencher formulário para editar
      document.getElementById('title').value = d.title;
      document.getElementById('description').value = d.description;
      document.getElementById('type').value = d.type;
      // convert iso to local datetime-local format (slice 0,16)
      const v = d.receivedDate ? d.receivedDate.slice(0,16) : '';
      document.getElementById('received').value = v;
      editingId = id;
      const submitBtn = document.querySelector('#demandForm button[type="submit"]');
      if(submitBtn) submitBtn.textContent = 'Salvar alterações';
      document.getElementById('cancelEditBtn').style.display = 'inline-block';
      return;
    }
    if(btn.classList.contains('complete')){
      // abrir modal para comentário
      pendingCompleteId = id;
      openModal();
      return;
    }
  });
}

// ---------- Form submit (create / update) ----------
function attachFormHandlers(){
  const form = document.getElementById('demandForm');
  if(!form) return;

  form.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const type = document.getElementById('type').value;
    const received = document.getElementById('received').value;

    if(!title || !description || !received){
      alert('Preencha todos os campos.');
      return;
    }

    if(editingId){
      const d = demands.find(x=>x.id === editingId);
      if(d){
        d.title = title;
        d.description = description;
        d.type = type;
        d.receivedDate = received;
        // não alteramos comment/completedDate aqui
      }
      editingId = null;
      const submitBtn = document.querySelector('#demandForm button[type="submit"]');
      if(submitBtn) submitBtn.textContent = 'Adicionar';
      document.getElementById('cancelEditBtn').style.display = 'none';
    } else {
      const newD = {
        id: nextId++,
        title,
        description,
        type,
        receivedDate: received,
        completedDate: null,
        comment: ''
      };
      demands.push(newD);
    }

    save();
    ev.target.reset();
  });

  // cancelar edição
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  if(cancelEditBtn){
    cancelEditBtn.addEventListener('click', ()=>{
      editingId = null;
      const submitBtn = document.querySelector('#demandForm button[type="submit"]');
      if(submitBtn) submitBtn.textContent = 'Adicionar';
      document.getElementById('demandForm').reset();
      cancelEditBtn.style.display = 'none';
    });
  }
}

// ---------- Filters ----------
function attachFilters(){
  const filters = document.getElementById('filters');
  if(!filters) return;

  filters.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('button');
    if(!btn) return;
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('#filters .filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderList();
  });
}

// ---------- Modal (conclusão) ----------
const overlay = document.getElementById('overlay');

function openModal(){
  const txt = document.getElementById('completeComment');
  if(txt) txt.value = '';
  if(overlay) {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
  }
  if(txt) txt.focus();
}

function closeModal(){
  if(overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
  }
  pendingCompleteId = null;
}

function attachModalHandlers(){
  const cancelComplete = document.getElementById('cancelComplete');
  const confirmComplete = document.getElementById('confirmComplete');

  if(cancelComplete) cancelComplete.addEventListener('click', closeModal);

  if(confirmComplete) confirmComplete.addEventListener('click', ()=>{
    const comment = document.getElementById('completeComment').value.trim();
    if(!comment){
      alert('Comentário obrigatório para finalizar a tarefa.');
      return;
    }
    const d = demands.find(x=>x.id === pendingCompleteId);
    if(!d){
      closeModal();
      return;
    }
    d.completedDate = new Date().toISOString();
    d.comment = comment;
    save();
    closeModal();
  });

  // fechar modal ao clicar fora (opcional)
  if(overlay){
    overlay.addEventListener('click', (ev)=>{
      if(ev.target === overlay) closeModal();
    });
  }
}

// ---------- View switching ----------
const appView = document.getElementById('appView');
const dashboardView = document.getElementById('dashboardView');
const openDashboardBtn = document.getElementById('openDashboardBtn');
const openAppBtn = document.getElementById('openAppBtn');

function showView(name){
  if(name === 'dashboard'){
    if(appView) appView.classList.remove('active');
    if(dashboardView) dashboardView.classList.add('active');
    if(!chartStatus) initCharts();
    updateCharts();
  } else {
    if(dashboardView) dashboardView.classList.remove('active');
    if(appView) appView.classList.add('active');
  }
}

if(openDashboardBtn) openDashboardBtn.addEventListener('click', ()=> showView('dashboard'));
if(openAppBtn) openAppBtn.addEventListener('click', ()=> showView('app'));

// ---------- Charts ----------
function initCharts(){
  // Proteção caso Chart não esteja carregado
  if(typeof Chart === 'undefined') return;

  if(!chartStatus){
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    chartStatus = new Chart(ctxStatus, {
      type:'doughnut',
      data:{
        labels:['Concluídas','Pendentes'],
        datasets:[{data:[0,0], backgroundColor:['#4CAF50','#FFC107']}]
      },
      options:{responsive:true,plugins:{legend:{position:'bottom'}}}
    });
  }

  if(!chartType){
    const ctxType = document.getElementById('typeChart').getContext('2d');
    chartType = new Chart(ctxType, {
      type:'pie',
      data:{
        labels:['Rotina','Esporádica'],
        datasets:[{data:[0,0], backgroundColor:['#2196F3','#FF9800']}]
      },
      options:{responsive:true,plugins:{legend:{position:'bottom'}}}
    });
  }

  if(!chartHours){
    const ctxHours = document.getElementById('hoursChart').getContext('2d');
    chartHours = new Chart(ctxHours, {
      type:'bar',
      data:{
        labels:['Rotina','Esporádica'],
        datasets:[{label:'Horas totais',data:[0,0], backgroundColor:['#673AB7','#3F51B5']}]
      },
      options:{responsive:true,scales:{y:{beginAtZero:true}}}
    });
  }
}

function updateCharts(){
  // atualiza somente se charts inicializados
  if(chartStatus && chartType && chartHours){
    // status
    const completed = demands.filter(d=>d.completedDate).length;
    const pending = demands.length - completed;

    chartStatus.data.datasets[0].data = [completed, pending];
    chartStatus.update();

    // type counts
    const rotina = demands.filter(d=>d.type === 'rotina').length;
    const esporadica = demands.filter(d=>d.type === 'esporadica').length;
    chartType.data.datasets[0].data = [rotina, esporadica];
    chartType.update();

    // hours per type
    let hoursRotina = 0, hoursEspo = 0;
    for(const d of demands){
      const h = calculateWorkHours(d.receivedDate, d.completedDate || new Date());
      if(d.type === 'rotina') hoursRotina += h;
      else hoursEspo += h;
    }
    chartHours.data.datasets[0].data = [Number(hoursRotina.toFixed(2)), Number(hoursEspo.toFixed(2))];
    chartHours.update();
  }

  // total count (sempre atualiza)
  const elTotal = document.getElementById('totalCount');
  if(elTotal) elTotal.textContent = demands.length;
}

// ---------- Routine recreation (once per load) ----------
/**
 * Recria rotinas diariamente: para cada rotina concluída com completedDay < hoje,
 * cria uma nova rotina com o mesmo título/descrição (marca _recreated para evitar loop).
 */
function recreateRoutinesForToday(){
  const today = new Date().toISOString().slice(0,10);
  const toAdd = [];
  for(const d of demands){
    if(d.type === 'rotina' && d.completedDate){
      const completedDay = d.completedDate.slice(0,10);
      if(completedDay < today){
        const existsToday = demands.some(x => x.type === 'rotina' && x.title === d.title && x.receivedDate.slice(0,10) === today && !x._recreated);
        if(!existsToday){
          toAdd.push({
            id: nextId++,
            title: d.title,
            description: d.description,
            type: 'rotina',
            receivedDate: new Date().toISOString(),
            completedDate: null,
            comment: '',
            _recreated: true
          });
        }
      }
    }
  }
  if(toAdd.length){
    demands = demands.concat(toAdd);
    save();
  }
}

// ---------- Atualizações gerais ----------
function updateAll(){
  renderList();
  updateCharts();
}

// ---------- Inicialização ----------
document.addEventListener('DOMContentLoaded', ()=>{
  // anexa listeners que dependem do DOM
  attachGridListener();
  attachFormHandlers();
  attachFilters();
  attachModalHandlers();

  // recriar rotinas primeiro (chama save se adicionar)
  recreateRoutinesForToday();

  // render inicial
  renderList();

  // init charts (criamos mesmo que o usuário não abra o dashboard para evitar delay)
  try{ initCharts(); }catch(e){ /* Chart.js pode não estar disponível */ }
  updateCharts();

  // Segurança simples: atualize os gráficos quando o localStorage for alterado em outra guia
  window.addEventListener('storage', (ev)=>{
    if(ev.key === STORAGE_KEY){
      demands = JSON.parse(ev.newValue || '[]');
      nextId = demands.length ? Math.max(...demands.map(d=>d.id)) + 1 : 1;
      updateAll();
    }
  });
});
