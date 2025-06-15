const basePrice = 10000;
const selectedList = document.getElementById('selectedList');
const totalEl = document.getElementById('totalAmount');
const nameList = document.getElementById('nameList');
const questionList = document.getElementById('questionList');
const lineBtn = document.getElementById('lineBtn');

function recount() {
  let total = basePrice;
  selectedList.innerHTML = '<li>リーディング基本料金 10,000円</li>';

  nameList.querySelectorAll('.name-pair').forEach(pair => {
    const lastName = pair.children[0].value.trim();
    const firstName = pair.children[1].value.trim();
    const qty = lastName || firstName ? 1 : 0;
    const price = parseInt(pair.children[0].dataset.price);
    pair.querySelector('.qty strong').textContent = qty;
    if (qty) {
      selectedList.innerHTML += `<li>鑑定対象者のお名前: ${lastName} ${firstName}（${price}円）</li>`;
      total += price;
    }
  });

  questionList.querySelectorAll('textarea').forEach(area => {
    const text = area.value.trim();
    const qty = text ? 1 : 0;
    const price = parseInt(area.dataset.price);
    area.parentElement.querySelector('.qty strong').textContent = qty;
    if (qty) {
      selectedList.innerHTML += `<li>質問: ${text}（${price}円）</li>`;
      total += price;
    }
  });

  document.querySelectorAll('#options input[type="number"]').forEach(input => {
    const qty = parseInt(input.value) || 0;
    const price = parseInt(input.dataset.price);
    const label = input.dataset.label;
    input.closest('.controls').querySelector('.qty strong').textContent = qty;
    if (qty > 0) {
      selectedList.innerHTML += `<li>${label} × ${qty}（${price * qty}円）</li>`;
      total += price * qty;
    }
  });

  totalEl.textContent = total;
}

// 名前入力で自動追加
nameList.addEventListener('input', () => {
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
  recount();
});

// 質問入力で自動追加
questionList.addEventListener('input', () => {
  const areas = Array.from(questionList.querySelectorAll('textarea'));
  const allFilled = areas.every(area => area.value.trim());
  if (allFilled) {
    const div = document.createElement('div');
    div.className = 'controls';
    div.innerHTML = `
      <textarea rows="2" data-price="3000" data-label="回答してほしい質問" placeholder="箇条書きでお書きください"></textarea>
      <span class="qty">数量: <strong>0</strong></span>`;
    questionList.appendChild(div);
  }
  recount();
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
  const text = Array.from(selectedList.children).map(li => li.textContent).join('\n') + `\n合計金額：${totalEl.textContent}円`;
  navigator.clipboard.writeText(text).then(() => {
    window.location.href = 'https://line.me/ti/p/Kv76GQK_UI';
  });
});

recount();


