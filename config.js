// 設定。LIFF ID と GAS の Web アプリ URL。PRECASE はフォームを即座に表示するための控え。
window.ATTENDANCE_CONFIG = {
  "LIFF_ID": "2008582229-N49D6kUI",
  "API_URL": "https://script.google.com/macros/s/AKfycbxsO6AneERS3MurBDDkFh2FQY7VSId3DiuruzM5KIwhHfE8vlf-5NH7M0AoocR3sA4/exec",
  "PRECASE": {
    "id": "20261213",
    "name": "12月13日 全役員会・忘年会",
    "description": "都山流香川県支部",
    "deadline": "2026-12-08T23:59:59+09:00",
    "status": "accepting",
    "questions": [
      {
        "question_key": "meeting",
        "prompt": "全役員会（15:30〜16:30 サンポートホール高松7階 第3リハーサル室）",
        "is_required": true
      },
      {
        "question_key": "party",
        "prompt": "忘年会（17:00〜19:00 魚民 高松駅前店 会費6,000円）",
        "is_required": true
      },
      {
        "question_key": "notes",
        "prompt": "備考（任意）",
        "is_required": false
      }
    ]
  }
};
