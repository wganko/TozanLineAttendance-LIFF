'use strict';

(function () {
  const statusEl = document.getElementById('status');
  const cfg = window.ATTENDANCE_CONFIG || {};

  function say(text, isError) {
    statusEl.textContent = text;
    statusEl.className = isError ? 'error' : '';
  }

  async function start() {
    if (!cfg.LIFF_ID) {
      say('準備中です。しばらくしてから開き直してください。', true);
      return;
    }
    if (typeof liff === 'undefined') {
      say('LINEの読み込みに失敗しました。通信状況を確認してください。', true);
      return;
    }
    try {
      await liff.init({ liffId: cfg.LIFF_ID });
      if (!liff.isLoggedIn()) {
        if (liff.isInClient()) {
          say('LINEから開き直してください。', true);
        } else {
          liff.login();
        }
        return;
      }
      say('本人確認をしています。');
      const idToken = liff.getIDToken();
      if (!idToken) {
        say('LINEの認証情報を取得できませんでした。', true);
        return;
      }
      window.dispatchEvent(new CustomEvent('attendance-ready', { detail: { idToken } }));
      say('準備ができました。');
    } catch (e) {
      say('LINEの初期化に失敗しました。開き直してください。', true);
    }
  }

  start();
})();
