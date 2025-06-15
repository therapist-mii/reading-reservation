const basePrice = 10000;
const selectedList = document.getElementById('selectedList');
const totalEl = document.getElementById('totalAmount');
const nameList = document.getElementById('nameList');
const questionList = document.getElementById('questionList');
const lineBtn = document.getElementById('lineBtn');

function recount() {
  let subtotal = basePrice;
  let finalTotal = 0;
  selectedList.innerHTML = '<li>リーディング基本料金 10,000円</li>';

  // 鑑定対象者
  nameList.querySelectorAll('.name-pair').forEach(pair => {
    const lastName = pair.children[0].value.trim();
    const firstName = pair.children[1].value.trim();
    const qty = lastName || firstName ? 1 : 0;
    const price = parseInt(pair.children[0].dataset.price);
    pair.querySelector('.qty strong').textContent = qty;
    if (qty) {
      selectedList.innerHTML += `<li>鑑定対象者のお名前: ${lastName} ${firstName}（${price}円）</li>`;
      subtotal += price;
    }
  });

  // 質問（段階料金）
  const filledQuestions = Array.from(questionList.querySelectorAll('textarea')).filter(area => area.value.trim());
  
  filledQuestions.forEach((area, index) => {
    const text = area.value.trim();
    const questionNumber = index + 1;
    let price = 0;
    
    if (questionNumber <= 3) {
      price = 2000;
    } else {
      price = 3000;
    }
    
    subtotal += price;
    selectedList.innerHTML += `<li>質問${questionNumber}: ${text}（${price}円）</li>`;
  });
  
  // 質問欄の数量表示を更新
  questionList.querySelectorAll('.controls').forEach(control => {
      const area = control.querySelector('textarea');
      const qty = area.value.trim() ? 1 : 0;
      control.querySelector('.qty strong').textContent = qty;
  });

  // オプション
  document.querySelectorAll('#options input[type="number"]').forEach(input => {
    const qty = parseInt(input.value) || 0;
    const price = parseInt(input.dataset.price);
    const label = input.dataset.label;
    input.closest('.controls').querySelector('.qty strong').textContent = qty;
    if (qty > 0) {
      selectedList.innerHTML += `<li>${label} × ${qty}（${price * qty}円）</li>`;
      subtotal += price * qty;
    }
  });

  finalTotal = subtotal;

  // クーポン割引
  const selectedCoupon = document.querySelector('input[name="coupon"]:checked').value;
  if (selectedCoupon === 'referral') {
    finalTotal -= 500;
    selectedList.innerHTML += `<li>紹介割引（-500円）</li>`;
  } else if (selectedCoupon === 'percent') {
    const percent = parseInt(document.getElementById('percent-off-value').value) || 0;
    if (percent > 0) {
        const discountAmount = Math.round(subtotal * (percent / 100));
        finalTotal -= discountAmount;
        selectedList.innerHTML += `<li>${percent}% OFF クーポン（-${discountAmount}円）</li>`;
    }
  }
  
  // 支払い手数料
  const paymentMethod = document.getElementById('payment').value;
  if (paymentMethod === 'konbini') {
      finalTotal += 220;
      selectedList.innerHTML += `<li>コンビニ払い手数料（+220円）</li>`;
  }


  totalEl.textContent = finalTotal;
}

// すべての入力要素で再計算をトリガー
document.body.addEventListener('input', recount);
document.body.addEventListener('click', (e) => {
    if (e.target.matches('.plus, .minus, input[name="coupon"]')) {
        recount();
    }
});

// 名前入力で自動追加
nameList.addEventListener('input', (e) => {
  if (e.target.tagName !== 'INPUT') return;
  const pairs = Array.from(nameList.querySelectorAll('.name-pair'));
  const allFilled = pairs.every(pair =>
    pair.children[0].value.trim() || pair.children[1].value.trim()
  );
  if (allFilled) {
    const div = document.createElement('div');
    div.className = 'name-pair';
    div.innerHTML = `
      <input type="text" placeholder="苗字" data-price="3000" data-label="鑑定対象者のお名前">
      <input type="text" placeholder="名前" data-price="3000" data-label="鑑定対象者のお名前">
      <span class="qty">数量: <strong>0</strong></span>`;
    nameList.appendChild(div);
  }
});

// 質問入力で自動追加
questionList.addEventListener('input', (e) => {
  if (e.target.tagName !== 'TEXTAREA') return;
  const areas = Array.from(questionList.querySelectorAll('textarea'));
  const allFilled = areas.every(area => area.value.trim());
  if (allFilled) {
    const div = document.createElement('div');
    div.className = 'controls';
    div.innerHTML = `
      <textarea rows="2" data-label="回答してほしい質問" placeholder="質問内容の要点のみご記入ください"></textarea>
      <span class="qty">数量: <strong>0</strong></span>`;
    questionList.appendChild(div);
  }
});

// + - ボタン制御
document.querySelectorAll('.controls.option').forEach(ctrl => {
  const plus = ctrl.querySelector('.plus');
  const minus = ctrl.querySelector('.minus');
  const input = ctrl.querySelector('input');

  plus.addEventListener('click', () => {
    input.value = parseInt(input.value) + 1;
    recount();
  });

  minus.addEventListener('click', () => {
    if (parseInt(input.value) > 0) {
      input.value = parseInt(input.value) - 1;
      recount();
    }
  });
});

// LINE送信
lineBtn.addEventListener('click', () => {
  recount();
  
  // 同意チェック
  const agreement = document.querySelector('input[name="agree_all"]');
  if (!agreement.checked) {
      alert('ご確認事項のすべての内容に同意してください。');
      return;
  }
  
  // 支払い方法チェック
  const paymentMethod = document.getElementById('payment').value;
  if (!paymentMethod) {
      alert('お支払い方法を選択してください。');
      return;
  }
  
  let text = '【お見積り内容】\n';
  text += Array.from(selectedList.children).map(li => li.textContent).join('\n');
  text += `\n----------------\n合計金額：${totalEl.textContent}円\n----------------\n`;

  text += `\n【お支払い方法】\n${document.getElementById('payment').selectedOptions[0].text}\n`;
  
  const remarks = document.getElementById('remarks').value.trim();
  if (remarks) {
    text += `\n【備考】\n${remarks}\n`;
  }
  
  navigator.clipboard.writeText(text).then(() => {
    window.location.href = 'https://line.me/ti/p/Kv76GQK_UI';
  }).catch(err => {
    console.error('クリップボードへのコピーに失敗しました: ', err);
    alert('クリップボードへのコピーに失敗しました。');
  });
});

// 初期表示時に計算
recount();