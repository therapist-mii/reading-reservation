/**
 * @file script.js
 * @description Client-side JavaScript for the Reading Reservation Form.
 * Handles dynamic field addition/removal, real-time price calculation,
 * client-side validation, and submission to Google Apps Script.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const reservationForm = document.getElementById('reservationForm');
    const completionMessage = document.getElementById('completion-message');

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

    const submitBtn = document.getElementById('submitBtn');
    const clearBtn = document.getElementById('clearBtn');
    const validationMessageEl = document.getElementById('validation-message');

    // --- Constants ---
    const REQUESTER_FEE = 13000;
    const RELATED_PERSON_FEE = 3000;
    const MAX_RELATED_NAMES = 5;
    const MAX_QUESTIONS = 5;

    // --- Helper Functions ---
    const formatPrice = (amount) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);

    function reindexInputs() {
        // Re-index related names
        relatedNameList.querySelectorAll('.dynamic-item input').forEach((input, index) => {
            input.name = `related_name_${index}`;
            input.placeholder = `関係者 ${index + 1}`;
        });

        // Re-index question blocks
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
            if (qty > 0) {
                const price = parseInt(input.dataset.price);
                subtotal += price * qty;
                selectedList.innerHTML += `<li><span>${input.dataset.label} × ${qty}</span><span>${formatPrice(price * qty)}</span></li>`;
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

        // ★ 関係者名の必須チェック
        const relatedInputs = relatedNameList.querySelectorAll('input[type="text"]');
        const hasRelatedInput = Array.from(relatedInputs).some(input => input.value.trim() !== '');
        if (!noRelatedCheckbox.checked && !hasRelatedInput) {
            addError(relatedNameList.closest('.input-group'), '関係者名を入力するか、「関係者はいません」にチェックしてください。');
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
        reindexInputs();
        recount();
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
        // Prevent recount on every single key press in textareas but do for others
        if (e.target.tagName !== 'TEXTAREA' || e.target.name === 'remarks') {
             recount();
        }
    });
    // Recount when user finishes typing in a textarea
    reservationForm.addEventListener('change', recount);


    // Plus/Minus buttons
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
    
    reservationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        submitBtn.disabled = true;
        submitBtn.textContent = '送信中...';

        fetch(reservationForm.action, { method: 'POST', body: new FormData(reservationForm) })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok.');
            return response.json();
        })
        .then(data => {
            if (data.result === 'success') {
                reservationForm.style.display = 'none';
                completionMessage.style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                throw new Error(data.message || '送信に失敗しました。');
            }
        })
        .catch(error => {
            console.error('Submission error:', error);
            alert(`送信中にエラーが発生しました: ${error.message}`);
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = '送信';
        });
    });
    
    // Initial setup
    resetForm();
});/**
 * @file script.js
 * @description Client-side JavaScript for the Reading Reservation Form.
 * Handles multi-step form navigation, dynamic field addition/removal,
 * price calculation on demand, client-side validation,
 * and submission to Google Apps Script.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const reservationForm = document.getElementById('reservationForm');
    const formSteps = document.querySelectorAll('.form-steps .step');
    const stepSections = document.querySelectorAll('.form-section');

    const requesterNameInput = document.getElementById('requesterNameInput');

    // Dynamic Lists
    const relatedNameList = document.getElementById('relatedNameList');
    const questionList = document.getElementById('questionList');

    // Add Buttons
    const addRelatedNameBtn = document.getElementById('addRelatedNameBtn');
    const addQuestionBtn = document.getElementById('addQuestionBtn');

    // Quantity Displays
    const relatedNameCountEl = document.getElementById('relatedNameCount');

    // Light Discount
    const agreeLightDiscountCheckbox = document.getElementById('agree-light-discount');
    const lightDiscountQtyInput = document.querySelector('input[name="light_discount_qty"]');
    const lightDiscountControls = lightDiscountQtyInput.closest('.controls.option');

    // Coupon
    const percentOffValueInput = document.getElementById('percent-off-value');

    // Estimate & Totals
    const estimateSection = document.querySelector('.estimate');
    const selectedList = document.getElementById('selectedList');
    const totalEl = document.getElementById('totalAmount');
    const totalAmountHidden = document.getElementById('totalAmountHidden');

    // Navigation Buttons
    const nextStepBtn = document.getElementById('nextStepBtn');
    const prevStepBtn = document.getElementById('prevStepBtn');
    const submitToSheetBtn = document.getElementById('submitToSheetBtn');
    const lineBtnStep2 = document.getElementById('lineBtnStep2');
    const lineBtnAfterSubmit = document.getElementById('lineBtnAfterSubmit');

    // Final Confirmation Screen Elements
    const finalSelectedList = document.getElementById('finalSelectedList');
    const finalTotalAmountEl = document.getElementById('finalTotalAmount');
    const finalPaymentMethodEl = document.getElementById('finalPaymentMethod');
    const finalRemarksTitleEl = document.getElementById('finalRemarksTitle');
    const finalRemarksEl = document.getElementById('finalRemarks');
    const finalAgreementEl = document.getElementById('finalAgreement');

    // Validation Message
    const validationMessageEl = document.createElement('p');
    validationMessageEl.id = 'validation-message';
    validationMessageEl.style.display = 'none';
    if (estimateSection) {
       estimateSection.parentNode.insertBefore(validationMessageEl, estimateSection);
    }


    // --- Constants ---
    const REQUESTER_FEE = 13000;
    const RELATED_PERSON_FEE = 3000;
    const MAX_RELATED_NAMES = 5;
    const MAX_QUESTIONS = 5;

    // --- Form State ---
    let currentStep = 1;

    // --- Helper Functions ---

    /**
     * Formats a number as a Japanese Yen currency string.
     */
    function formatPrice(amount) {
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', minimumFractionDigits: 0 }).format(amount);
    }

    /**
     * Enables or disables the light discount controls based on the agreement checkbox.
     */
    function toggleLightDiscountControls() {
        const isAgreed = agreeLightDiscountCheckbox.checked;
        lightDiscountQtyInput.disabled = !isAgreed;
        lightDiscountControls.querySelectorAll('button').forEach(button => {
            button.disabled = !isAgreed;
        });

        if (!isAgreed) {
            lightDiscountQtyInput.value = 0;
            const qtySpan = lightDiscountControls.querySelector('.qty strong');
            if(qtySpan) qtySpan.textContent = '0';
        } else {
             // If agreed, set quantity to 1 automatically
            lightDiscountQtyInput.value = 1;
            const qtySpan = lightDiscountControls.querySelector('.qty strong');
            if(qtySpan) qtySpan.textContent = '1';
        }
    }

    /**
     * Re-indexes name attributes of dynamic fields (related names, questions).
     */
    function reindexInputs() {
        relatedNameList.querySelectorAll('.dynamic-item input').forEach((input, index) => { // .dynamic-item の子要素の input を選択
            input.name = `related_name_${index}`;
            input.placeholder = `関係者 ${index + 1}`; // プレースホルダーも更新
        });

        questionList.querySelectorAll('.question-block').forEach((block, index) => {
            const categorySelect = block.querySelector('.consultation-category');
            categorySelect.name = `category_${index}`;
            categorySelect.id = `consultation-category-${index}`;
            block.querySelector('label').htmlFor = `consultation-category-${index}`;
            block.querySelector('textarea').name = `question_${index}`;
            
            // Show remove button for all but the first question block
            let removeBtn = block.querySelector('.remove-item');
            if (index === 0) {
                if (removeBtn) removeBtn.style.display = 'none';
            } else {
                if (!removeBtn) { // 最初のブロックをクローンした場合、ボタンがないので作成
                    removeBtn = createRemoveButton();
                    block.querySelector('.controls').appendChild(removeBtn); // controls divに追加
                }
                removeBtn.style.display = 'inline-block';
            }
        });
        updateAllQuantityDisplays(); // reindexInputs の後に必ず呼び出す
    }

    /**
     * Updates the count display for various quantity inputs.
     */
    function updateAllQuantityDisplays() {
        // Options quantity
        document.querySelectorAll('.controls.option').forEach(ctrl => {
            const input = ctrl.querySelector('input[type="number"]');
            const qtySpan = ctrl.querySelector('.qty strong');
            if (input && qtySpan) {
                qtySpan.textContent = input.value;
            }
        });
        // Related names count
        // .dynamic-item ではなく、直接 input の数を数える (「関係者はいません」チェックボックスがあるので)
        relatedNameCountEl.textContent = relatedNameList.querySelectorAll('.dynamic-item').length;
    }

    /**
     * Calculates the total amount and updates the estimate display.
     */
    function recount() {
        let subtotal = 0;
        selectedList.innerHTML = '';

        // --- 本人のお名前 (Requester) ---
        const requesterName = requesterNameInput.value.trim();
        if (requesterName) {
            subtotal += REQUESTER_FEE;
            selectedList.innerHTML += `<li><span>お名前: ${requesterName}（霊視接続料）</span><span>${formatPrice(REQUESTER_FEE)}</span></li>`;
        }

        // --- 関係者のお名前 ---
        // 「関係者はいません」チェックボックスがチェックされていない場合のみ計算
        const noRelatedCheckbox = document.getElementById('noRelatedCheckbox');
        if (!noRelatedCheckbox.checked) {
            const relatedNameInputs = relatedNameList.querySelectorAll('input[type="text"]');
            relatedNameInputs.forEach(input => {
                const name = input.value.trim();
                if (name) {
                    subtotal += RELATED_PERSON_FEE;
                    selectedList.innerHTML += `<li><span>関係者のお名前: ${name}</span><span>${formatPrice(RELATED_PERSON_FEE)}</span></li>`;
                }
            });
        }


        // --- ご相談内容 (Questions) ---
        questionList.querySelectorAll('.question-block').forEach((block, index) => {
            const textarea = block.querySelector('textarea');
            const categorySelect = block.querySelector('.consultation-category');
            const text = textarea.value.trim();
            const selectedOption = categorySelect.options[categorySelect.selectedIndex];
            const categoryName = selectedOption ? selectedOption.textContent : ''; // nullチェックを追加
            const categoryPrice = parseInt(selectedOption ? selectedOption.dataset.price : 0) || 0; // nullチェックを追加

            if (text && categorySelect.value) {
                subtotal += categoryPrice;
                selectedList.innerHTML += `<li><span>ご相談内容${index + 1}: ${categoryName.replace(/（.*）/, '')}</span><span>${formatPrice(categoryPrice)}</span></li>`;
            }
        });

        // --- オプション ---
        document.querySelectorAll('#options input[type="number"]').forEach(input => {
            const qty = parseInt(input.value) || 0;
            if (qty > 0) {
                const price = parseInt(input.dataset.price);
                const label = input.dataset.label;
                subtotal += price * qty;
                selectedList.innerHTML += `<li><span>${label} × ${qty}</span><span>${formatPrice(price * qty)}</span></li>`;
            }
        });

        let finalTotal = subtotal;

        // --- クーポン割引 ---
        const selectedCouponEl = document.querySelector('input[name="coupon_type"]:checked');
        if (selectedCouponEl) {
            const selectedCoupon = selectedCouponEl.value;
            if (selectedCoupon === 'referral') {
                finalTotal -= 500;
                selectedList.innerHTML += `<li><span>紹介割引</span><span>${formatPrice(-500)}</span></li>`;
            } else if (selectedCoupon === 'percent') {
                const percent = parseInt(percentOffValueInput.value) || 0;
                if (percent > 0 && percent <= 99) {
                    const discountAmount = Math.round(subtotal * (percent / 100));
                    finalTotal -= discountAmount;
                    selectedList.innerHTML += `<li><span>${percent}% OFF クーポン</span><span>${formatPrice(-discountAmount)}</span></li>`;
                }
            }
        }

        // --- 支払い手数料 ---
        const paymentMethodValue = document.getElementById('payment_method').value;
        if (paymentMethodValue === 'コンビニ払い') {
            finalTotal += 220;
            selectedList.innerHTML += `<li><span>コンビニ払い手数料</span><span>${formatPrice(220)}</span></li>`;
        }

        totalEl.textContent = formatPrice(finalTotal);
        totalAmountHidden.value = finalTotal;
    }

    /**
     * Validates the form inputs in the current step.
     */
    function validateForm() {
        let isValid = true;
        let firstErrorElement = null;

        document.querySelectorAll('.error-highlight').forEach(el => el.classList.remove('error-highlight'));
        validationMessageEl.style.display = 'none';
        validationMessageEl.textContent = '';

        const addError = (element, message) => {
            element.classList.add('error-highlight');
            if (!firstErrorElement) {
                firstErrorElement = element;
            }
            if(message && !validationMessageEl.textContent) { // 最初のメッセージのみ表示
                validationMessageEl.textContent = message;
            }
            isValid = false;
        };
        
        // --- Validate Requester Name (お名前) ---
        if (requesterNameInput.value.trim() === '') {
            addError(requesterNameInput.closest('.input-group'), 'お名前は必須項目です。');
        }

        // --- Validate Question Blocks (at least one must be complete) ---
        const firstQuestionBlock = questionList.querySelector('.question-block');
        const firstCategory = firstQuestionBlock.querySelector('select');
        const firstTextarea = firstQuestionBlock.querySelector('textarea');
        if (firstCategory.value.trim() === '' || firstTextarea.value.trim() === '') {
             addError(firstQuestionBlock, '最初の相談内容は必須です（カテゴリと内容の両方）。');
        }

        // --- 関係者のお名前のバリデーション ---
        const noRelatedCheckbox = document.getElementById('noRelatedCheckbox');
        const relatedError = document.getElementById('relatedError');
        const relatedNameInputs = relatedNameList.querySelectorAll('.dynamic-item input[type="text"]');
        let hasRelatedNames = false;
        relatedNameInputs.forEach(input => {
            if (input.value.trim() !== '') {
                hasRelatedNames = true;
            }
        });

        // 「関係者はいません」がチェックされておらず、かつ関係者入力欄がある場合、少なくとも1つは入力されているかを確認
        // または、「関係者はいません」がチェックされておらず、かつ関係者入力欄が1つもない場合（これはユーザーが追加ボタンを押さなかったケース）
        if (!noRelatedCheckbox.checked && (relatedNameInputs.length > 0 && !hasRelatedNames || relatedNameInputs.length === 0)) {
            addError(relatedNameList, '関係者名が入力されていないか、「関係者はいません」にチェックしてください。');
        }
        
        if (relatedNameList.classList.contains('error-highlight')) {
            relatedError.style.display = 'block';
        } else {
            relatedError.style.display = 'none';
        }


        // --- Validate Payment Method ---
        const paymentMethodSelect = document.getElementById('payment_method');
        if (paymentMethodSelect.value === '') {
            addError(paymentMethodSelect.closest('.input-group'), 'お支払い方法を選択してください。');
        }

        // --- Validate Final Agreement ---
        const finalAgreementCheckbox = document.querySelector('input[name="agree_all"]');
        if (!finalAgreementCheckbox.checked) {
            addError(finalAgreementCheckbox.closest('.agree-final'), 'ご確認事項への同意が必要です。');
        }

        if (!isValid) {
            validationMessageEl.style.display = 'block';
            if (firstErrorElement) {
                firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return isValid;
    }


    // --- Form Navigation and UI Updates ---

    function updateStepIndicators() {
        formSteps.forEach(stepEl => {
            stepEl.classList.toggle('active', parseInt(stepEl.dataset.step) === currentStep);
        });
    }

    function showStep(step) {
        stepSections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });
        const currentSection = document.getElementById(`step${step}Content`);
        if (currentSection) {
            currentSection.style.display = 'block';
            currentSection.classList.add('active');
        }
        currentStep = step;
        updateStepIndicators();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function populateConfirmationScreen() {
        finalSelectedList.innerHTML = selectedList.innerHTML;
        finalTotalAmountEl.textContent = totalEl.textContent;

        const paymentSelect = document.getElementById('payment_method');
        finalPaymentMethodEl.textContent = paymentSelect.selectedIndex > 0 ? paymentSelect.options[paymentSelect.selectedIndex].text : '未選択';
        
        const remarks = document.getElementById('remarks').value.trim();
        finalRemarksTitleEl.style.display = remarks ? 'block' : 'none';
        finalRemarksEl.textContent = remarks;

        finalAgreementEl.textContent = document.querySelector('input[name="agree_all"]').checked ? '同意済み' : '未同意';
        
        estimateSection.style.display = 'none';
    }

    // --- Dynamic Item Addition/Removal ---
    function createRemoveButton() {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'remove-item';
        button.innerHTML = '&times;';
        button.addEventListener('click', (e) => {
            const parentBlock = e.target.closest('.dynamic-item, .question-block');
            if (parentBlock) {
                parentBlock.remove();
                reindexInputs();
                recount(); // 削除後にお見積りを再計算
            }
        });
        return button;
    }

    addRelatedNameBtn.addEventListener('click', () => {
        if (relatedNameList.children.length < MAX_RELATED_NAMES) {
            const newItem = document.createElement('div');
            newItem.className = 'dynamic-item';
            
            const input = document.createElement('input');
            input.type = 'text';
            // placeholder は reindexInputs で更新されるのでここでは初期値は不要
            
            newItem.appendChild(input);
            newItem.appendChild(createRemoveButton());
            relatedNameList.appendChild(newItem);
            reindexInputs(); // 新しい要素追加後に必ず再インデックス
            document.getElementById('noRelatedCheckbox').checked = false; // 関係者を追加したらチェックを外す
            recount(); // 関係者追加後にお見積りを再計算
        }
    });

    addQuestionBtn.addEventListener('click', () => {
        const questionBlocks = questionList.querySelectorAll('.question-block');
        if (questionBlocks.length < MAX_QUESTIONS) {
            const newBlock = questionBlocks[0].cloneNode(true);
            newBlock.querySelector('select').value = '';
            newBlock.querySelector('textarea').value = '';
            
            // クローンしたブロックに削除ボタンを追加（最初のブロックにはないため）
            const removeBtn = createRemoveButton();
            // .controls div の中にボタンを追加
            const controlsDiv = newBlock.querySelector('.controls');
            if (controlsDiv) {
                controlsDiv.appendChild(removeBtn);
            }

            questionList.appendChild(newBlock);
            reindexInputs(); // 新しい要素追加後に必ず再インデックス
            recount(); // 質問追加後にお見積りを再計算
        }
    });


    // --- Event Listeners ---

    // Plus/Minus buttons for quantity controls
    document.querySelectorAll('.controls.option').forEach(ctrl => {
        const plus = ctrl.querySelector('.plus');
        const minus = ctrl.querySelector('.minus');
        const input = ctrl.querySelector('input[type="number"]');

        if (plus) {
            plus.addEventListener('click', () => {
                if(!input.disabled) {
                    const max = input.max ? parseInt(input.max) : 99;
                    if(parseInt(input.value) < max) {
                       input.value = parseInt(input.value) + 1;
                       updateAllQuantityDisplays();
                       recount(); // 数量変更後にお見積りを再計算
                    }
                }
            });
        }
        if (minus) {
            minus.addEventListener('click', () => {
                if (!input.disabled && parseInt(input.value) > 0) {
                    input.value = parseInt(input.value) - 1;
                    updateAllQuantityDisplays();
                    recount(); // 数量変更後にお見積りを再計算
                }
            });
        }
    });

    // Light Discount Checkbox
    agreeLightDiscountCheckbox.addEventListener('change', toggleLightDiscountControls);

    // Coupon radio buttons (変更があったら再計算)
    document.querySelectorAll('input[name="coupon_type"]').forEach(radio => {
        radio.addEventListener('change', recount);
    });
    percentOffValueInput.addEventListener('input', recount); // パーセント値変更時

    // Payment method select (変更があったら再計算)
    document.getElementById('payment_method').addEventListener('change', recount);

    // Requester Name input (変更があったら再計算)
    requesterNameInput.addEventListener('input', recount);

    // Question category select and textarea (変更があったら再計算)
    questionList.addEventListener('input', (e) => {
        if (e.target.classList.contains('consultation-category') || e.target.tagName === 'TEXTAREA') {
            recount();
        }
    });
    // 関係者名入力欄も変更があったら再計算
    relatedNameList.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
            recount();
        }
    });


    // 関係者はいませんチェックボックス
    document.getElementById('noRelatedCheckbox').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        addRelatedNameBtn.disabled = isChecked;
        if (isChecked) {
            // すべての関係者入力欄を削除
            relatedNameList.innerHTML = ''; // これで全ての子要素が削除されます
        }
        reindexInputs(); // 関係者リストが変更されたので再インデックスと表示更新
        recount(); // チェックボックス変更後にお見積りを再計算
    });


    // Step navigation
    nextStepBtn.addEventListener('click', () => {
        recount(); // Calculate total when user proceeds
        if (validateForm()) {
            populateConfirmationScreen();
            showStep(2);
        }
    });

    prevStepBtn.addEventListener('click', () => {
        showStep(1);
        document.querySelectorAll('.error-highlight').forEach(el => el.classList.remove('error-highlight'));
        validationMessageEl.style.display = 'none';
        recount(); // 戻ったときにお見積りを更新
    });

    // LINE buttons
    function copyToClipboardAndOpenLine() {
        let text = '【リーディングご予約内容】\n';
        Array.from(finalSelectedList.children).forEach(li => {
            const itemText = li.querySelector('span:first-child').textContent.trim();
            const itemPrice = li.querySelector('span:last-child').textContent.trim();
            text += `${itemText} ${itemPrice}\n`;
        });
        text += `\n----------------\n合計金額：${finalTotalAmountEl.textContent}\n----------------\n`;
        text += `\n【お支払い方法】\n${finalPaymentMethodEl.textContent}\n`;
        const remarks = finalRemarksEl.textContent.trim();
        text += `\n【備考】\n${remarks || 'なし'}\n`;
        text += `\n【ご確認事項への同意】\n${finalAgreementEl.textContent}\n`;
        text += `\n----------------\nステップ②LINEで画像を送信\n【ご提出いただくもの】\n`;
        text += `・目元の写真\n・手描きのお名前\n・お悩みの一部も手書きされているとなお良いです\n----------------\n`;

        const tempInput = document.createElement('textarea');
        tempInput.value = text;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            document.execCommand('copy');
            window.location.href = 'https://line.me/ti/p/Kv76GQK_UI';
        } catch (err) {
            console.error('クリップボードへのコピーに失敗しました: ', err);
            prompt("コピーに失敗しました。以下を手動でコピーしてください。", text);
        } finally {
            document.body.removeChild(tempInput);
        }
    }

    lineBtnStep2.addEventListener('click', copyToClipboardAndOpenLine);
    lineBtnAfterSubmit.addEventListener('click', copyToClipboardAndOpenLine);

    // Form submission
    reservationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        recount();

        if (!validateForm()) {
            showStep(1); // バリデーションエラーがあればステップ1に戻る
            return;
        }

        submitToSheetBtn.disabled = true;
        submitToSheetBtn.textContent = '送信中...';

        const formData = new FormData(reservationForm);
        const url = reservationForm.action;

        fetch(url, {
            method: 'POST',
            body: formData,
        })
        .then(response => response.ok ? response.json() : response.text().then(text => Promise.reject(new Error(text))))
        .then(data => {
            if (data.result === 'success') {
                showStep(3);
                reservationForm.reset(); // フォームをリセット

                // 動的に追加されたフィールドをクリア
                relatedNameList.innerHTML = ''; // 関係者名を全てクリア

                // 質問リストを最初の1つだけにする
                const firstQuestionBlock = questionList.querySelector('.question-block');
                // 最初の質問ブロックの内容をリセット
                if (firstQuestionBlock) {
                    firstQuestionBlock.querySelector('select').value = '';
                    firstQuestionBlock.querySelector('textarea').value = '';
                    // 最初のブロックから削除ボタンが存在すれば削除
                    const removeBtn = firstQuestionBlock.querySelector('.remove-item');
                    if (removeBtn) {
                        removeBtn.remove();
                    }
                }
                // 2つ目以降の質問ブロックを削除
                while (questionList.children.length > 1) {
                    questionList.removeChild(questionList.lastChild);
                }

                // UIの状態をリセット
                toggleLightDiscountControls(); // ライト割引チェックボックスの状態をリセット
                document.getElementById('noRelatedCheckbox').checked = false; // 関係者はいませんチェックボックスをリセット

                // 必須：リセット後に必ず再インデックスと再計算、数量表示更新
                reindexInputs();
                recount(); 
            } else {
                throw new Error(data.error || '不明なエラーが発生しました。');
            }
        })
        .catch(error => {
            alert('予約の送信中にエラーが発生しました。\n' + error.message);
            console.error('Fetchエラー:', error);
            showStep(1); // エラー時はステップ1に戻る
        })
        .finally(() => {
            submitToSheetBtn.disabled = false;
            submitToSheetBtn.textContent = '申し込む';
        });
    });

    // --- Initial Setup ---
    function initializeForm() {
        showStep(1);
        // フォームリセット後や初回ロード時に常に最初の状態にする
        relatedNameList.innerHTML = ''; // 関係者名をクリア

        const firstQuestionBlock = questionList.querySelector('.question-block');
        if (firstQuestionBlock) {
            firstQuestionBlock.querySelector('select').value = '';
            firstQuestionBlock.querySelector('textarea').value = '';
            const removeBtn = firstQuestionBlock.querySelector('.remove-item');
            if (removeBtn) removeBtn.remove(); // 最初のブロックから削除ボタンを確実に削除
        }
        while (questionList.children.length > 1) { // 最初のブロック以外を削除
            questionList.removeChild(questionList.lastChild);
        }

        document.getElementById('noRelatedCheckbox').checked = false; // 関係者はいませんチェックボックスをリセット
        document.querySelectorAll('input[name="coupon_type"]').forEach(radio => radio.checked = false);
        percentOffValueInput.value = '0';
        document.getElementById('payment_method').value = ''; // 支払い方法もリセット

        reindexInputs(); // 必ず再インデックスしてから数量表示と再計算
        toggleLightDiscountControls(); // ライト割引の表示を調整
        recount(); // 初期ロード時にお見積りを計算
    }

    initializeForm();
});