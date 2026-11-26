'use strict';

(function () {
  const cfg = window.ATTENDANCE_CONFIG || {};
  const statusEl = document.getElementById('status');
  const state = {
    caseId: '', questions: [], answers: {}, caseData: null,
    accepting: false, busy: false, view: 'form', interacted: false,
  };

  function say(text, isError) {
    statusEl.textContent = text || '';
    statusEl.hidden = !text;
    statusEl.className = isError ? 'error' : '';
  }

  function el(tag, text) {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function caseIdFromPath() {
    const m = location.search.match(/[?&]case=(\d+)/) || location.pathname.match(/(\d{6,})/);
    return m ? m[1] : '';
  }

  async function api(payload) {
    const res = await fetch(cfg.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error('通信結果を読み取れませんでした。');
    }
    if (!res.ok || data.error) {
      throw new Error(data.error === 'not_target'
        ? 'このLINEアカウントでは回答できません。案内が届いたアカウントで開いてください。'
        : '処理できませんでした。時間をおいて開き直してください。');
    }
    return data;
  }

  function deadlineText(iso) {
    return new Date(iso).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function answerSummary() {
    const box = el('section');
    box.append(el('h2', '回答の内容'));
    const dl = el('dl');
    state.questions.forEach((q) => {
      const v = state.answers[q.question_key];
      if (v === undefined) return;
      dl.append(el('dt', q.prompt), el('dd', v === '' ? '（未記入）' : v));
    });
    box.append(dl);
    return box;
  }

  function changeButton(app, label) {
    const btn = el('button', label);
    btn.type = 'button';
    btn.addEventListener('click', () => {
      state.view = 'form';
      draw();
      const first = document.querySelector('input[type=radio], textarea');
      if (first) first.focus();
    });
    app.append(btn);
  }

  function backToLine(app) {
    const back = el('button', '回答を終了してLINEに戻る');
    back.type = 'button';
    back.className = 'primary';
    back.addEventListener('click', () => {
      try {
        if (liff.isInClient && liff.isInClient()) {
          liff.closeWindow();
          return;
        }
      } catch (e) { /* 外部ブラウザでは閉じられない */ }
      say('LINEアプリに戻ってください。');
    });
    app.append(back);
  }

  function renderPre(caseId) {
    const pre = cfg.PRECASE;
    if (!pre || String(pre.id) !== String(caseId) || !pre.questions) return false;
    state.caseData = { case: pre, questions: pre.questions, answers: {} };
    state.caseId = String(pre.id);
    state.questions = pre.questions;
    state.answers = {};
    state.view = 'form';
    draw();
    say('よみこみちゅうです…');
    return true;
  }

  function render(data) {
    state.caseData = data;
    state.caseId = String(data.case.id);
    state.questions = data.questions || [];
    state.answers = data.answers || {};
    state.view = Object.keys(state.answers).length ? 'summary' : 'form';
    draw();
  }

  function draw() {
    const data = state.caseData;
    state.accepting = data.case.status === 'accepting'
      && new Date(data.case.deadline).getTime() > Date.now();

    document.title = data.case.name;
    const app = document.getElementById('app');
    app.replaceChildren();
    app.append(el('h1', data.case.name));
    if (data.case.description) app.append(el('p', data.case.description));
    app.append(el('p', '回答期限：' + deadlineText(data.case.deadline) + '（日本時間）'));

    if (!state.accepting) {
      if (Object.keys(state.answers).length) app.append(answerSummary());
      app.append(el('p', '回答受付は終了しました。'));
      say('');
      return;
    }

    if (state.view === 'done') {
      const done = el('section');
      done.className = 'done';
      done.append(el('h2', 'ご回答ありがとうございました'));
      done.append(el('p', '下記の内容で受け付けました。'));
      app.append(done);
      app.append(answerSummary());
      app.append(el('p', '回答期限までは、下のボタンから変更できます。'));
      changeButton(app, '回答を変更する');
      backToLine(app);
      say('');
      return;
    }

    if (state.view === 'summary') {
      app.append(answerSummary());
      changeButton(app, '回答を変更する');
      backToLine(app);
      say('');
      return;
    }

    const form = el('form');
    const inputs = [];
    state.questions.forEach((q, i) => {
      const fs = el('fieldset');
      fs.append(el('legend', q.is_required || q.prompt.includes('任意') ? q.prompt : q.prompt + '（任意）'));
      if (q.is_required) {
        const wrap = el('div');
        wrap.className = 'choices';
        ['出席', '欠席'].forEach((choice) => {
          const label = el('label');
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = 'q' + i;
          radio.value = choice;
          radio.required = true;
          radio.checked = state.answers[q.question_key] === choice;
          radio.addEventListener('change', () => { state.interacted = true; });
          label.append(radio, document.createTextNode(' ' + choice));
          wrap.append(label);
        });
        fs.append(wrap);
        inputs.push({ key: q.question_key, get: () => {
          const c = fs.querySelector('input:checked');
          return c ? c.value : undefined;
        } });
      } else {
        const area = document.createElement('textarea');
        area.rows = 3;
        area.value = state.answers[q.question_key] || '';
        area.addEventListener('input', () => { state.interacted = true; });
        fs.append(area);
        inputs.push({ key: q.question_key, get: () => area.value });
      }
      form.append(fs);
    });

    const hadAnswer = Object.keys(state.answers).length > 0;
    const submit = el('button', hadAnswer ? 'この内容で保存する' : '回答する');
    submit.type = 'submit';
    form.append(submit);
    app.append(form);
    say('');

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (state.busy) return;
      const answers = {};
      for (const inp of inputs) {
        const v = inp.get();
        if (v === undefined) {
          say('出席・欠席をすべて選んでください。', true);
          return;
        }
        answers[inp.key] = v;
      }
      state.busy = true;
      submit.disabled = true;
      say('保存しています。');
      try {
        const r = await api({ action: 'save', idToken: window.__idToken, caseId: state.caseId, answers });
        if (r.saved) {
          Object.assign(state.answers, answers);
          state.view = 'done';
          state.busy = false;
          draw();
          window.scrollTo(0, 0);
          return;
        }
        if (r.reason === 'not_accepting') {
          state.accepting = false;
          state.busy = false;
          draw();
          return;
        }
        say('回答を確認してください。出席・欠席をもう一度選んでください。', true);
      } catch (e) {
        say(e.message, true);
      } finally {
        state.busy = false;
        submit.disabled = false;
      }
    });
  }

  async function start() {
    if (!cfg.LIFF_ID || !cfg.API_URL) {
      say('準備中です。しばらくしてから開き直してください。', true);
      return;
    }
    try {
      const earlyCaseId = caseIdFromPath() || cfg.CASE_ID || '';
      if (earlyCaseId) renderPre(earlyCaseId);
      await liff.init({ liffId: cfg.LIFF_ID });
      if (!liff.isLoggedIn()) {
        if (liff.isInClient()) {
          say('LINEアプリから開き直してください。', true);
        } else {
          liff.login();
        }
        return;
      }
      window.__idToken = liff.getIDToken();
      if (!window.__idToken) {
        say('LINEの認証情報を取得できませんでした。開き直してください。', true);
        return;
      }
      const caseId = caseIdFromPath() || cfg.CASE_ID || '';
      if (!caseId) {
        say('案内されたリンクから開いてください。', true);
        return;
      }
      const data = await api({ action: 'read', idToken: window.__idToken, caseId });
      if (state.caseData && state.interacted) {
        state.answers = data.answers || {};
        say('');
        return;
      }
      render(data);
    } catch (e) {
      say(e.message || '開けませんでした。時間をおいて開き直してください。', true);
    }
  }

  start();
})();
