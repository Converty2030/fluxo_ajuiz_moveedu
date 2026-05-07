/* =============================================================
   AUTH — Tela de login e controle de tentativas
   ============================================================= */

const Auth = (function () {
  'use strict';

  // ---------- Configurações ----------
  const CONFIG = {
    PASSWORD: 'converty_moveedu',  // Senha de acesso
    MAX_ATTEMPTS: 3,               // Tentativas permitidas
    LOCK_DURATION_MS: 0,           // 0 = bloqueio só nesta sessão (até fechar/recarregar)
    SESSION_KEY: 'moveedu_auth',   // Chave da sessão (sessionStorage)
    ATTEMPTS_KEY: 'moveedu_attempts'
  };

  // ---------- Estado ----------
  const state = {
    attemptsLeft: CONFIG.MAX_ATTEMPTS,
    locked: false
  };

  // ---------- Elementos do DOM ----------
  let els = {};

  // Callback executado após autenticação bem-sucedida
  let _onAuthenticated = null;

  /* =============================================================
     INICIALIZAÇÃO
     ============================================================= */
  function init(onAuthenticated) {
    _onAuthenticated = onAuthenticated;

    els.screen        = document.getElementById('loginScreen');
    els.card          = document.getElementById('loginCard');
    els.form          = document.getElementById('loginForm');
    els.password      = document.getElementById('loginPassword');
    els.btn           = document.getElementById('loginBtn');
    els.feedback      = document.getElementById('loginFeedback');
    els.attempts      = document.getElementById('loginAttempts');
    els.togglePwd     = document.getElementById('loginTogglePwd');
    els.logoutBtn     = document.getElementById('logoutBtn');

    // Já autenticado nesta sessão? -> entra direto
    if (isAuthenticated()) {
      showApp(/* skipAnim */ true);
      return;
    }

    // Estado anterior de tentativas (mantém após reload nesta sessão)
    restoreAttempts();

    if (state.locked) {
      lockUI('Número máximo de tentativas excedido.');
    } else {
      updateAttemptsLabel();
    }

    bindEvents();

    // Foco automático no campo de senha
    setTimeout(() => els.password && els.password.focus(), 350);
  }

  /* =============================================================
     EVENTOS
     ============================================================= */
  function bindEvents() {
    // Submit do formulário
    els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSubmit();
    });

    // Mostrar/ocultar senha
    if (els.togglePwd) {
      els.togglePwd.addEventListener('click', () => {
        const isPwd = els.password.type === 'password';
        els.password.type = isPwd ? 'text' : 'password';
        const icon = els.togglePwd.querySelector('i');
        if (icon) icon.className = isPwd ? 'bi bi-eye-slash' : 'bi bi-eye';
        els.password.focus();
      });
    }

    // Limpar erro ao digitar novamente
    els.password.addEventListener('input', () => {
      if (els.feedback.textContent && !state.locked) {
        clearFeedback();
      }
    });

    // Botão de logout (sidebar)
    if (els.logoutBtn) {
      els.logoutBtn.addEventListener('click', () => logout());
    }
  }

  /* =============================================================
     SUBMIT
     ============================================================= */
  function handleSubmit() {
    if (state.locked) return;

    const value = (els.password.value || '').trim();
    if (!value) {
      showFeedback('error', 'bi-exclamation-circle-fill', 'Informe a senha para continuar.');
      shakeCard();
      return;
    }

    // Loading visual
    setLoading(true);

    // Simula latência leve para feedback visual mais elegante
    setTimeout(() => {
      if (value === CONFIG.PASSWORD) {
        onSuccess();
      } else {
        onFailure();
      }
    }, 400);
  }

  /* =============================================================
     SUCESSO
     ============================================================= */
  function onSuccess() {
    setLoading(false);
    showFeedback('success', 'bi-check-circle-fill', 'Acesso liberado. Carregando painel...');
    markAuthenticated();
    resetAttempts();

    // Animação de saída + revela o painel
    setTimeout(() => {
      els.screen.classList.add('fading-out');
      document.body.classList.remove('locked');
      // Após terminar a animação, remove a tela do DOM (libera recursos)
      setTimeout(() => {
        if (els.screen && els.screen.parentNode) {
          els.screen.parentNode.removeChild(els.screen);
        }
        if (typeof _onAuthenticated === 'function') _onAuthenticated();
      }, 600);
    }, 350);
  }

  /* =============================================================
     FALHA
     ============================================================= */
  function onFailure() {
    setLoading(false);
    state.attemptsLeft--;
    persistAttempts();

    els.password.value = '';

    if (state.attemptsLeft <= 0) {
      lockUI('Número máximo de tentativas excedido.');
      return;
    }

    showFeedback('error', 'bi-x-circle-fill', 'Senha incorreta. Tente novamente.');
    shakeCard();
    updateAttemptsLabel();
    els.password.focus();
  }

  /* =============================================================
     BLOQUEIO
     ============================================================= */
  function lockUI(message) {
    state.locked = true;
    persistAttempts(); // grava estado bloqueado

    if (els.card) els.card.classList.add('locked');
    if (els.password) els.password.disabled = true;
    if (els.btn) els.btn.disabled = true;

    showFeedback('error', 'bi-lock-fill', message);
    if (els.attempts) {
      els.attempts.classList.add('danger');
      els.attempts.innerHTML = '';
    }

    // Banner extra de bloqueio
    if (!document.getElementById('loginLockedBanner')) {
      const banner = document.createElement('div');
      banner.id = 'loginLockedBanner';
      banner.className = 'login-locked-banner';
      banner.innerHTML = `
        <i class="bi bi-shield-exclamation"></i>
        <div>
          <strong>Acesso bloqueado.</strong><br />
          Aguarde a liberação ou recarregue a página em outra sessão.
        </div>
      `;
      if (els.form) els.form.appendChild(banner);
    }
  }

  /* =============================================================
     LOGOUT
     ============================================================= */
  function logout() {
    if (!confirm('Deseja realmente sair do painel?')) return;
    try { sessionStorage.removeItem(CONFIG.SESSION_KEY); } catch(_){}
    // Recarrega para retornar à tela de login
    location.reload();
  }

  /* =============================================================
     PERSISTÊNCIA
     ============================================================= */
  function isAuthenticated() {
    try {
      return sessionStorage.getItem(CONFIG.SESSION_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function markAuthenticated() {
    try {
      sessionStorage.setItem(CONFIG.SESSION_KEY, '1');
    } catch (_) { /* navegação privada pode bloquear */ }
  }

  function persistAttempts() {
    try {
      sessionStorage.setItem(CONFIG.ATTEMPTS_KEY, JSON.stringify({
        left: state.attemptsLeft,
        locked: state.locked
      }));
    } catch (_) {}
  }

  function restoreAttempts() {
    try {
      const raw = sessionStorage.getItem(CONFIG.ATTEMPTS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.left === 'number') state.attemptsLeft = Math.max(0, data.left);
      if (data.locked === true || state.attemptsLeft <= 0) state.locked = true;
    } catch (_) {}
  }

  function resetAttempts() {
    state.attemptsLeft = CONFIG.MAX_ATTEMPTS;
    state.locked = false;
    try { sessionStorage.removeItem(CONFIG.ATTEMPTS_KEY); } catch(_){}
  }

  /* =============================================================
     UI HELPERS
     ============================================================= */
  function showFeedback(type, icon, msg) {
    if (!els.feedback) return;
    els.feedback.className = `login-feedback ${type}`;
    els.feedback.innerHTML = `<i class="bi ${icon}"></i><span>${escapeHtml(msg)}</span>`;
  }

  function clearFeedback() {
    if (els.feedback) {
      els.feedback.className = 'login-feedback';
      els.feedback.innerHTML = '';
    }
  }

  function updateAttemptsLabel() {
    if (!els.attempts) return;
    if (state.attemptsLeft >= CONFIG.MAX_ATTEMPTS) {
      els.attempts.classList.remove('danger');
      els.attempts.innerHTML = '';
      return;
    }
    if (state.attemptsLeft === 1) {
      els.attempts.classList.add('danger');
      els.attempts.innerHTML = `<strong>Última tentativa</strong> antes do bloqueio.`;
    } else {
      els.attempts.classList.remove('danger');
      els.attempts.innerHTML = `Tentativas restantes: <strong>${state.attemptsLeft}</strong>`;
    }
  }

  function shakeCard() {
    if (!els.card) return;
    els.card.classList.remove('shake');
    void els.card.offsetWidth; // força reflow para reiniciar animação
    els.card.classList.add('shake');
  }

  function setLoading(loading) {
    if (!els.btn) return;
    if (loading) {
      els.btn.disabled = true;
      els.btn.dataset.originalHtml = els.btn.innerHTML;
      els.btn.innerHTML = '<span class="spinner"></span><span>Verificando...</span>';
    } else {
      els.btn.disabled = state.locked;
      if (els.btn.dataset.originalHtml) {
        els.btn.innerHTML = els.btn.dataset.originalHtml;
      }
    }
  }

  function showApp(skipAnim) {
    document.body.classList.remove('locked');
    if (els.screen) {
      if (skipAnim) {
        if (els.screen.parentNode) els.screen.parentNode.removeChild(els.screen);
      } else {
        els.screen.classList.add('fading-out');
        setTimeout(() => {
          if (els.screen && els.screen.parentNode) els.screen.parentNode.removeChild(els.screen);
        }, 600);
      }
    }
    if (typeof _onAuthenticated === 'function') _onAuthenticated();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ---------- API pública ----------
  return {
    init,
    isAuthenticated,
    logout
  };
})();
