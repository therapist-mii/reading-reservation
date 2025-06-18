/**
 * @file script.js
 * @description Client-side JavaScript for the Reading Reservation Form.
 * Handles dynamic field addition/removal, real-time price calculation,
 * client-side validation, and copying content for LINE submission.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const reservationForm = document.getElementById('reservationForm');
    const requesterNameInput = document.getElementById('requesterNameInput');
    const relatedNameList = document.getElementById('relatedNameList');
    const questionList = document.getElementById('questionList');
    const addRelatedNameBtn = document.getElementById('addRelatedNameBtn');
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    const relatedNameCountEl = document.getElementById('relatedNameCount');
    const noRelatedCheckbox = document.getElementById('noRelatedCheckbox');
    
    const agreeLightDiscountCheckbox = document.getElementById('agree-light-discount');
    const lightDiscountQtyInput = document.querySelector('input[name="light_discount_qty"]');
    const lightDiscountControls = lightDiscountQtyInput.closest('.controls.option');

    const percentOffValueInput = document.getElementById('percent-off-value');
    const selectedList = document.getElementById('selectedList');
    const totalEl = document.getElementById('totalAmount');
    const totalAmountHidden = document.getElementById('totalAmountHidden');

    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');
    const lineSubmitBtn = document.getElementById('lineSubmitBtn');
    const validationMessageEl = document.getElementById('validation-message');

    // --- Constants ---
    const REQUESTER_FEE = 13000;
    const RELATED_PERSON_FEE = 3000;
    const MAX_RELATED_NAMES = 5;
    const MAX_QUESTIONS = 10;

    // --- Helper Functions ---
    const formatPrice = (amount) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);

    function reindexInputs() {
        relatedNameList.querySelectorAll('.dynamic-item input').forEach((input, index) => {
            input.name = `related_name_${index}`;
            input.placeholder = `関係者 ${index + 1}`;
        });

        questionList.querySelectorAll('.question-block').forEach((block, index) => {
            const categorySelect = block.querySelector('.consultation-category');
            categorySelect.name = `category_${index}`;
            categorySelect.id = `consultation-category-${index}`;
            block.querySelector('label[for^="consultation-category"]').htmlFor = `consultation-category-${index}`;
            block.querySelector('textarea').name = `question_${index}`;

            let removeBtn = block.querySelector('.remove-item');
            if (index > 0) {
                if (!removeBtn) {
                    removeBtn = createRemoveButton();
                    block.querySelector('.controls').appendChild(removeBtn);
                }
                removeBtn.style.display = 'inline-block';
            } else if (removeBtn) {
                removeBtn.style.display = 'none';
            }
        });
        updateAllQuantityDisplays();
    }

    function updateAllQuantityDisplays() {
        document.querySelectorAll('.controls.option').forEach(ctrl => {
            const input = ctrl.querySelector('input[type="number"]');
            const qtySpan = ctrl.querySelector('.qty strong');
            if (input && qtySpan) qtySpan.textContent = input.value;
        });
        relatedNameCountEl.textContent = relatedNameList.querySelectorAll('.dynamic-item').length;
    }

    function recount() {
        let subtotal = 0;
        selectedList.innerHTML = '';

        if (requesterNameInput.value.trim()) {
            subtotal += REQUESTER_FEE;
            selectedList.innerHTML += `<li><span>お名前（霊視接続料）</span><span>${formatPrice(REQUESTER_FEE)}</span></li>`;
        }

        if (!noRelatedCheckbox.checked) {
            relatedNameList.querySelectorAll('input[type="text"]').forEach(input => {
                if (input.value.trim()) {
                    subtotal += RELATED_PERSON_FEE;
                    selectedList.innerHTML += `<li><span>関係者: ${input.value.trim()}</span><span>${formatPrice(RELATED_PERSON_FEE)}</span></li>`;
                }
            });
        }

        questionList.querySelectorAll('.question-block').forEach((block, index) => {
            const categorySelect = block.querySelector('select');
            const textarea = block.querySelector('textarea');
            const selectedOption = categorySelect.options[categorySelect.selectedIndex];
            if (textarea.value.trim() && selectedOption && selectedOption.value) {
                const price = parseInt(selectedOption.dataset.price) || 0;
                subtotal += price;
                selectedList.innerHTML += `<li><span>相談内容${index + 1}: ${selectedOption.text.replace(/（.*）/, '')}</span><span>${formatPrice(price)}</span></li>`;
            }
        });

        document.querySelectorAll('#options input[type="number"]').forEach(input => {
            const qty = parseInt(input.value) || 0;
            if (qty !== 0) { // ライト割引(-5000)も考慮してqty > 0 から変更
                const price = parseInt(input.dataset.price);
                const effectiveQty = (input.name === 'light_discount_qty' && qty > 0) ? 1 : qty;
                subtotal += price * effectiveQty;
                if (price > 0) {
                     selectedList.innerHTML += `<li><span>${input.dataset.label} × ${effectiveQty}</span><span>${formatPrice(price * effectiveQty)}</span></li>`;
                } else {
                     selectedList.innerHTML += `<li><span>${input.dataset.label}</span><span>${formatPrice(price * effectiveQty)}</span></li>`;
                }
            }
        });
        
        let finalTotal = subtotal;
        const selectedCoupon = document.querySelector('input[name="coupon_type"]:checked')?.value;
        if (selectedCoupon === 'referral') {
            finalTotal -= 500;
            selectedList.innerHTML += `<li><span>紹介割引</span><span>${formatPrice(-500)}</span></li>`;
        } else if (selectedCoupon === 'percent') {
            const percent = parseInt(percentOffValueInput.value) || 0;
            if (percent > 0 && percent < 100) {
                const discount = Math.round(subtotal * (percent / 100));
                finalTotal -= discount;
                selectedList.innerHTML += `<li><span>${percent}% OFF クーポン</span><span>${formatPrice(-discount)}</span></li>`;
            }
        }

        if (document.getElementById('payment_method').value === 'コンビニ払い') {
            finalTotal += 220;
            selectedList.innerHTML += `<li><span>コンビニ払い手数料</span><span>${formatPrice(220)}</span></li>`;
        }

        totalEl.textContent = formatPrice(finalTotal);
        totalAmountHidden.value = finalTotal;
    }

    function validateForm() {
        let isValid = true;
        let firstErrorElement = null;
        validationMessageEl.textContent = '';
        validationMessageEl.style.display = 'none';
        document.querySelectorAll('.error-highlight').forEach(el => el.classList.remove('error-highlight'));

        const addError = (element, message) => {
            isValid = false;
            element.classList.add('error-highlight');
            if (!firstErrorElement) {
                firstErrorElement = element;
                validationMessageEl.textContent = message;
                validationMessageEl.style.display = 'block';
            }
        };

        if (!requesterNameInput.value.trim()) addError(requesterNameInput, 'お名前は必須です。');
        
        const firstQuestionBlock = questionList.querySelector('.question-block');
        if (!firstQuestionBlock.querySelector('select').value || !firstQuestionBlock.querySelector('textarea').value.trim()) {
            addError(firstQuestionBlock, '最初の相談内容はカテゴリ選択と内容記入の両方が必須です。');
        }

        const relatedInputs = relatedNameList.querySelectorAll('input[type="text"]');
        const hasRelatedInput = Array.from(relatedInputs).some(input => input.value.trim() !== '');
        if (!noRelatedCheckbox.checked && !hasRelatedInput) {
            addError(relatedNameList.closest('.input-group'), '関係者名を入力するか、「関係者はいません」にチェックしてください。');
        }

        if (!document.querySelector('input[name="coupon_type"]:checked')) {
            addError(document.getElementById('coupon-group'), 'クーポンの有無を選択してください。');
        }
        
        if (!document.getElementById('payment_method').value) addError(document.getElementById('payment_method'), 'お支払い方法は必須です。');
        if (!document.querySelector('input[name="agree_all"]').checked) addError(document.querySelector('.agree-final'), 'ご確認事項への同意は必須です。');

        if (!isValid && firstErrorElement) {
            firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return isValid;
    }

    function createRemoveButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'remove-item';
        button.innerHTML = '&times;';
        button.addEventListener('click', (e) => {
            e.target.closest('.dynamic-item, .question-block')?.remove();
            reindexInputs();
            recount();
        });
        return button;
    }
    
    function resetForm() {
        reservationForm.reset();
        relatedNameList.innerHTML = '';
        while (questionList.children.length > 1) {
            questionList.removeChild(questionList.lastChild);
        }
        document.querySelectorAll('.error-highlight').forEach(el => el.classList.remove('error-highlight'));
        validationMessageEl.style.display = 'none';
        agreeLightDiscountCheckbox.checked = false;
        lightDiscountQtyInput.value = 0;
        lightDiscountQtyInput.disabled = true;
        lightDiscountControls.querySelectorAll('button').forEach(btn => btn.disabled = true);
        reindexInputs();
        recount();
    }
    
    function generateEstimateText() {
        recount(); // 最新の状態を反映
        let text = '【リーディングお申し込み内容】\n\n';
        
        document.querySelectorAll('#selectedList li').forEach(li => {
            const itemText = li.querySelector('span:first-child').textContent.trim();
            const itemPrice = li.querySelector('span:last-child').textContent.trim();
            text += `${itemText}  ${itemPrice}\n`;
        });

        text += `\n--------------------------------\n`;
        text += `合計金額: ${document.getElementById('totalAmount').textContent.trim()}\n`;
        text += `--------------------------------\n\n`;

        const paymentSelect = document.getElementById('payment_method');
        const paymentMethod = paymentSelect.value ? paymentSelect.options[paymentSelect.selectedIndex].text : '未選択';
        text += `お支払い方法: ${paymentMethod}\n`;

        const remarks = document.getElementById('remarks').value.trim();
        if (remarks) {
            text += `備考:\n${remarks}\n`;
        }
        
        text += '\n上記の内容で申し込みます。';
        return text;
    }

    // --- Event Listeners ---
    addRelatedNameBtn.addEventListener('click', () => {
        if (relatedNameList.querySelectorAll('.dynamic-item').length < MAX_RELATED_NAMES) {
            const newItem = document.createElement('div');
            newItem.className = 'dynamic-item';
            const input = document.createElement('input');
            input.type = 'text';
            newItem.appendChild(input);
            newItem.appendChild(createRemoveButton());
            relatedNameList.appendChild(newItem);
            noRelatedCheckbox.checked = false;
            reindexInputs();
        }
    });

    addQuestionBtn.addEventListener('click', () => {
        if (questionList.querySelectorAll('.question-block').length < MAX_QUESTIONS) {
            const newBlock = questionList.querySelector('.question-block').cloneNode(true);
            newBlock.querySelector('select').value = '';
            newBlock.querySelector('textarea').value = '';
            questionList.appendChild(newBlock);
            reindexInputs();
        }
    });

    noRelatedCheckbox.addEventListener('change', (e) => {
        addRelatedNameBtn.disabled = e.target.checked;
        if (e.target.checked) {
            relatedNameList.innerHTML = '';
        }
        reindexInputs();
        recount();
    });

    reservationForm.addEventListener('input', (e) => {
        if (e.target.tagName !== 'TEXTAREA' || e.target.name === 'remarks') {
             recount();
        }
    });
    reservationForm.addEventListener('change', recount);

    document.querySelectorAll('.controls.option').forEach(ctrl => {
        const input = ctrl.querySelector('input[type="number"]');
        ctrl.addEventListener('click', (e) => {
            if (input.disabled) return;
            const currentVal = parseInt(input.value);
            if (e.target.classList.contains('plus')) {
                input.value = Math.min(currentVal + 1, input.max || 99);
            } else if (e.target.classList.contains('minus')) {
                input.value = Math.max(currentVal - 1, 0);
            }
            updateAllQuantityDisplays();
            recount();
        });
    });

    agreeLightDiscountCheckbox.addEventListener('change', () => {
        const isAgreed = agreeLightDiscountCheckbox.checked;
        lightDiscountQtyInput.disabled = !isAgreed;
        lightDiscountControls.querySelectorAll('button').forEach(btn => btn.disabled = !isAgreed);
        lightDiscountQtyInput.value = isAgreed ? 1 : 0;
        updateAllQuantityDisplays();
        recount();
    });

    clearBtn.addEventListener('click', resetForm);
    
    copyBtn.addEventListener('click', () => {
        if (!validateForm()) return;
        
        const estimateText = generateEstimateText();
        navigator.clipboard.writeText(estimateText).then(() => {
            alert('申込内容をコピーしました！');
        }).catch(err => {
            console.error('コピーに失敗しました: ', err);
            alert('コピーに失敗しました。お手数ですが、手動で内容をコピーしてください。');
        });
    });

    lineSubmitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        const estimateText = generateEstimateText();
        navigator.clipboard.writeText(estimateText).then(() => {
            alert('申込内容をコピーしました。LINEに貼り付けて送信してください。');
            setTimeout(() => {
                window.open('https://line.me/ti/p/Kv76GQK_UI', '_blank');
            }, 300); // アラートを読んでから移動する時間を少し確保
        }).catch(err => {
            console.error('コピーに失敗しました: ', err);
            alert('コピーに失敗しました。お手数ですが、手動で内容をコピーし、LINEで送信してください。');
        });
    });
    
    // Initial setup
    resetForm();
});