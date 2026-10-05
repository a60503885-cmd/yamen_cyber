const siteIntro = document.querySelector('#site-intro');
const introSkip = document.querySelector('#intro-skip');
let introDismissed = false;
let introTimer;

function dismissIntro() {
	if (introDismissed) return;
	introDismissed = true;
	window.clearTimeout(introTimer);
	siteIntro.classList.add('is-leaving');
	window.setTimeout(() => {
		siteIntro.hidden = true;
		if (siteIntro.contains(document.activeElement)) document.activeElement.blur();
		document.body.classList.remove('intro-active');
	}, 500);
}

document.body.classList.add('intro-active');
introSkip.focus({ preventScroll: true });
introSkip.addEventListener('click', dismissIntro);
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !siteIntro.hidden) dismissIntro();
});
introTimer = window.setTimeout(dismissIntro, 3500);

const progressBar = document.querySelector('#reading-progress-bar');
const menuToggle = document.querySelector('#menu-toggle');
const mainNav = document.querySelector('#main-nav');

function updateReadingProgress() {
	const scrollable = document.documentElement.scrollHeight - window.innerHeight;
	const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
	progressBar.style.width = `${Math.min(progress, 100)}%`;
}

window.addEventListener('scroll', updateReadingProgress, { passive: true });
updateReadingProgress();

menuToggle.addEventListener('click', () => {
	const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
	menuToggle.setAttribute('aria-expanded', String(!isOpen));
	mainNav.classList.toggle('is-open', !isOpen);
});

mainNav.querySelectorAll('a').forEach((link) => {
	link.addEventListener('click', () => {
		menuToggle.setAttribute('aria-expanded', 'false');
		mainNav.classList.remove('is-open');
	});
});

const revealObserver = new IntersectionObserver((entries, observer) => {
	entries.forEach((entry) => {
		if (entry.isIntersecting) {
			entry.target.classList.add('is-visible');
			observer.unobserve(entry.target);
		}
	});
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const passwordInput = document.querySelector('#password-input');
const strengthMeter = document.querySelector('#strength-meter');
const strengthLabel = document.querySelector('#strength-label');
const strengthCount = document.querySelector('#strength-count');
const passwordRules = [...document.querySelectorAll('#password-feedback [data-rule]')];
const arabicDigits = (value) => String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[digit]);
const commonPasswords = new Set(['password', 'password123', '12345678901234', 'qwerty12345678', 'letmein123456']);
const quizGuidance = {
	phishing: {
		low: ['لا تضغط الروابط المستعجلة؛ افتح الموقع الرسمي بنفسك.', 'لا تشارك كلمة المرور أو رمز التحقق مع أي شخص.', 'افحص عنوان المرسل والنطاق قبل تسجيل الدخول.'],
		mid: ['تحقق من الطلب عبر التطبيق أو رقم تعرفه مسبقاً.', 'تعامل بحذر مع المرفقات والروابط المختصرة والرسائل التي تهددك.'],
		high: ['واصل التحقق من النطاق والمرفقات قبل التفاعل.', 'أبلغ عن الرسائل المشبوهة واحذفها بعد حفظ ما يلزم.'],
	},
	ai: {
		low: ['الصوت أو الفيديو المألوف لا يثبت هوية المتصل.', 'اتصل بالرقم المحفوظ أو استخدم كلمة تحقق عائلية.', 'لا تحوّل المال ولا تشارك الرموز تحت ضغط الاستعجال.'],
		mid: ['أكد الطلب المالي أو الحساس عبر قناة مستقلة.', 'تحقق من مصدر المقاطع قبل تصديقها أو إعادة نشرها.'],
		high: ['أحسنت التحقق؛ استمر في التأكد قبل نشر المقاطع.', 'لا تثبت أدوات تحكم عن بعد بطلب غير متوقع.'],
	},
	shopping: {
		low: ['تحقق من المتجر وسياسة الإرجاع وآراء مستقلة قبل الشراء.', 'ادفع داخل المنصة أو بوسيلة موثوقة توفر حماية للمشتري.', 'لا تشارك صورة البطاقة أو رمز التحقق مع البائع.'],
		mid: ['تحقق من اسم المستفيد والمبلغ قبل اعتماد الدفع أو رمز QR.', 'لا تعتمد على لقطة إيصال؛ تأكد من ظهور المبلغ في حسابك.'],
		high: ['ممتاز؛ حافظ على الدفع داخل القنوات الرسمية.', 'تذكّر أن HTTPS يشفّر الاتصال لكنه لا يثبت موثوقية المتجر.'],
	},
	backup: {
		low: ['فعّل نسخاً تلقائياً للملفات المهمة إلى وجهة منفصلة.', 'احتفظ بنسخة غير متصلة دائماً أو ذات سجل إصدارات.', 'جرّب استعادة ملف صغير ولا تفترض أن المزامنة تكفي.'],
		mid: ['طبّق قاعدة 3-2-1 وراجع جدول النسخ بانتظام.', 'اختبر الاستعادة واحفظ مفاتيح التشفير في مكان آمن منفصل.'],
		high: ['ممتاز؛ استمر باختبارات الاستعادة الدورية.', 'راجع صلاحيات التخزين السحابي وافصل النسخة الخارجية بعد اكتمالها.'],
	},
};

function displayQuizResult({ type, score, mistakes, stage, result, title, summary, scoreElement, meter, tipsList }) {
	const band = score <= 4 ? 'low' : score <= 7 ? 'mid' : 'high';
	const headings = {
		low: 'خلّيها فرصة للتعلّم',
		mid: 'وعي جيد، وفي مجال للتحسن',
		high: 'ممتاز، قراراتك واعية',
	};
	const summaries = {
		low: 'بعض المواقف كانت خادعة. راجع النصائح وخذ وقتك قبل أي نقرة أو دفع أو مشاركة.',
		mid: 'عندك أساس جيد. راجع المواقف التي أخطأت فيها لتثبت عادات الحماية.',
		high: 'أداء قوي. استمر بالتحقق من المصدر واستخدم قنوات موثوقة عند الشك.',
	};

	title.textContent = headings[band];
	summary.textContent = summaries[band];
	scoreElement.textContent = arabicDigits(score);
	meter.style.width = `${score * 10}%`;
	tipsList.replaceChildren();
	const missedTips = mistakes.slice(0, 3).map((mistake) => `راجع هذا الموقف: ${mistake}`);
	[...quizGuidance[type][band], ...missedTips].forEach((tip, index) => {
		const item = document.createElement('li');
		item.textContent = tip;
		if (index >= quizGuidance[type][band].length) item.classList.add('quiz-result-missed');
		tipsList.append(item);
	});
	stage.hidden = true;
	result.hidden = false;
}

function evaluatePassword(value) {
	const variety = [/\p{L}/u.test(value), /\p{Lu}/u.test(value), /\p{N}/u.test(value), /[^\p{L}\p{N}]/u.test(value)].filter(Boolean).length;
	const rules = {
		length: value.length >= 14,
		variety: variety >= 3,
		unique: value.length > 0 && !commonPasswords.has(value.toLowerCase()) && !/(.)\1{3,}/.test(value),
	};
	const score = Object.values(rules).filter(Boolean).length;
	const labels = ['ضعيفة جداً', 'ضعيفة', 'تتحسّن', 'جيدة'];
	strengthMeter.style.width = `${(score / 3) * 100}%`;
	strengthMeter.dataset.score = String(score);
	strengthLabel.textContent = value ? labels[score] : 'بانتظار كلمة تجريبية';
	strengthCount.textContent = `${arabicDigits(score)} / ٣`;
	passwordRules.forEach((rule) => {
		const passed = rules[rule.dataset.rule];
		rule.classList.toggle('is-passed', passed);
		rule.querySelector('span').textContent = passed ? '✓' : '○';
	});
}

passwordInput.addEventListener('input', () => evaluatePassword(passwordInput.value));

document.querySelector('#toggle-password').addEventListener('click', (event) => {
	const button = event.currentTarget;
	const visible = passwordInput.type === 'text';
	passwordInput.type = visible ? 'password' : 'text';
	button.setAttribute('aria-label', visible ? 'إظهار كلمة المرور' : 'إخفاء كلمة المرور');
});

document.querySelector('#generate-password').addEventListener('click', () => {
	const words = ['غيمة', 'نافذة', 'ليمون', 'موجة', 'قمر', 'مفتاح', 'وردة', 'سحابة'];
	const pick = (items) => items[crypto.getRandomValues(new Uint32Array(1))[0] % items.length];
	const sample = `${pick(words)}-${pick(words)}-${pick(words)}-${pick(['47', '83', '26', '91'])}!`;
	passwordInput.value = sample;
	passwordInput.type = 'text';
	document.querySelector('#toggle-password').setAttribute('aria-label', 'إخفاء كلمة المرور');
	evaluatePassword(sample);
	passwordInput.focus();
});

const quizQuestions = [
	{
		sender: 'دعم الحساب', address: 'security-update@help-center.example',
		message: 'تم إيقاف حسابك مؤقتاً. اضغط هنا خلال ١٠ دقائق لتأكيد بياناتك واستعادة الوصول.',
		link: 'http://account-verify.example-login.com', correct: 'safe',
		options: [{ answer: 'safe', text: 'أفتح التطبيق أو الموقع الرسمي بنفسي.' }, { answer: 'unsafe', text: 'أضغط الرابط وأدخل بياناتي بسرعة.' }],
		explanation: 'الاستعجال والرابط غير الرسمي إشارتان للتحقق. ادخل للموقع الرسمي بكتابته بنفسك ولا تستخدم رابط الرسالة.',
	},
	{
		sender: 'متجر إلكتروني', address: 'offers@shop.example',
		message: 'وصلك إشعار متوقع عن طلبك، ويطلب مراجعة حالته داخل التطبيق الرسمي دون رابط مباشر.',
		link: 'بدون رابط مباشر', correct: 'safe',
		options: [{ answer: 'unsafe', text: 'أبحث عن رابط في الرسالة وأدخل منه.' }, { answer: 'safe', text: 'أفتح التطبيق الرسمي بنفسي وأراجع الطلب.' }],
		explanation: 'مراجعة الطلب داخل التطبيق الرسمي تقلل خطر الروابط المزيفة. لا تعتمد على اسم المرسل وحده.',
	},
	{
		sender: 'فريق الدعم الفني', address: 'support@account-security.example.net',
		message: 'أرسل لنا رمز التحقق الذي وصلك الآن لنوقف محاولة الدخول المشبوهة.',
		link: 'طلب عبر الرسالة', correct: 'safe',
		options: [{ answer: 'safe', text: 'أرفض مشاركة الرمز وأراجع أمان الحساب من التطبيق.' }, { answer: 'unsafe', text: 'أرسل الرمز حتى يوقفوا المحاولة.' }],
		explanation: 'رمز التحقق سري ولا تشاركه مع أي شخص. افتح إعدادات الحساب الرسمية إذا شككت بمحاولة دخول.',
	},
	{
		sender: 'شركة توصيل', address: 'delivery@parcel-notice.example',
		message: 'تعذّر تسليم شحنتك. ادفع رسماً بسيطاً فوراً عبر الرابط لتحديد موعد جديد.',
		link: 'https://parcel-pay.example-track.net', correct: 'safe',
		options: [{ answer: 'unsafe', text: 'أدفع الرسوم من الرابط حتى لا ترجع الشحنة.' }, { answer: 'safe', text: 'أراجع الشحنة من تطبيق شركة التوصيل الرسمي.' }],
		explanation: 'رسوم مفاجئة مع استعجال ورابط غير مألوف تستحق التحقق. استخدم تطبيق شركة التوصيل أو رقمها الرسمي.',
	},
	{
		sender: 'سحب جوائز', address: 'winner@bonus-prize.example',
		message: 'مبروك! ربحت جائزة لم تشارك عليها. أدخل بيانات بطاقتك لتأكيد الاستلام.',
		link: 'نموذج يطلب بيانات البطاقة', correct: 'safe',
		options: [{ answer: 'safe', text: 'أتجاهل الطلب ولا أشارك بيانات البطاقة.' }, { answer: 'unsafe', text: 'أدخل البطاقة حتى أستلم جائزتي.' }],
		explanation: 'الجائزة غير المتوقعة التي تطلب بيانات مالية غالباً محاولة احتيال. لا تدخل بياناتك ولا تدفع رسوماً لاستلامها.',
	},
	{
		sender: 'مساحة التخزين', address: 'notice@cloud-storage.example',
		message: 'سيتم حذف ملفاتك خلال ساعة. سجّل الدخول الآن من الرابط المختصر لاستعادة حسابك.',
		link: 'https://bit.ly/storage-alert', correct: 'safe',
		options: [{ answer: 'unsafe', text: 'أفتح الرابط المختصر وأسجّل الدخول.' }, { answer: 'safe', text: 'أدخل إلى خدمة التخزين من التطبيق الرسمي وأتحقق.' }],
		explanation: 'التهديد بالحذف والرابط المختصر يجعلان الرسالة مريبة. افحص حسابك من التطبيق الرسمي مباشرة.',
	},
	{
		sender: 'موارد بشرية', address: 'jobs@career-docs.example',
		message: 'افتح الملف المرفق وفعّل وحدات الماكرو لتشاهد عرض العمل العاجل.',
		link: 'ملف Office غير متوقع', correct: 'safe',
		options: [{ answer: 'safe', text: 'أتحقق من جهة التوظيف قبل فتح المرفق.' }, { answer: 'unsafe', text: 'أفعّل وحدات الماكرو كما يطلب المرسل.' }],
		explanation: 'المرفقات غير المتوقعة وطلب تفعيل الماكرو قد يعرّضان جهازك للخطر. تحقق من الجهة بقناة مستقلة.',
	},
	{
		sender: 'صديقك', address: 'رسالة عبر حساب اجتماعي',
		message: 'هذا رابط صورك! سجّل الدخول بسرعة، ثم يرسل لك صديقك أنه لم يرسل الرسالة.',
		link: 'https://photo-view.example-login.com', correct: 'safe',
		options: [{ answer: 'unsafe', text: 'أسجّل الدخول عبر الرابط لأرى الصور.' }, { answer: 'safe', text: 'أتواصل مع صديقي بطريقة أخرى وأتجنب الرابط.' }],
		explanation: 'قد يكون حساب صديقك مخترقاً. لا تدخل كلمة مرورك من الرابط؛ تحقق معه عبر قناة أخرى.',
	},
	{
		sender: 'فرصة توظيف مضمونة', address: 'recruit@instant-career.example',
		message: 'تم قبولك دون مقابلة. أرسل صورة هويتك وادفع رسوم تسجيل لتبدأ غداً.',
		link: 'طلب عبر البريد', correct: 'safe',
		options: [{ answer: 'safe', text: 'أتحقق من الشركة ولا أرسل الهوية أو المال الآن.' }, { answer: 'unsafe', text: 'أرسل الوثائق والرسوم لتثبيت الوظيفة.' }],
		explanation: 'طلب المال والوثائق الحساسة قبل التحقق من جهة التوظيف علامة خطر. تواصل مع الشركة عبر بياناتها الرسمية.',
	},
	{
		sender: 'مورد معروف', address: 'billing@supplier.example',
		message: 'تم تغيير رقم الحساب البنكي. حوّل الفاتورة اليوم إلى الحساب الجديد، ولا تتصل للتأكيد.',
		link: 'بيانات تحويل مرفقة', correct: 'safe',
		options: [{ answer: 'unsafe', text: 'أحوّل للحساب الجديد لأن البريد يبدو مألوفاً.' }, { answer: 'safe', text: 'أتصل بالمورد على رقم محفوظ وأؤكد التغيير.' }],
		explanation: 'تغييرات الدفع العاجلة قد تأتي من بريد مخترق أو منتحل. أكدها برقم تعرفه مسبقاً قبل التحويل.',
	},
];
let quizIndex = 0;
let quizAnswered = false;
let quizScore = 0;
let quizMistakes = [];
const quizChoices = [...document.querySelectorAll('.quiz-choice')];
const quizFeedback = document.querySelector('#quiz-feedback');
const quizNext = document.querySelector('#quiz-next');
const phishingQuizStage = document.querySelector('#phishing-quiz-stage');
const phishingResult = document.querySelector('#phishing-result');

function showQuestion(index) {
	const question = quizQuestions[index];
	document.querySelector('#quiz-count').textContent = `الموقف ${arabicDigits(index + 1)} من ${arabicDigits(quizQuestions.length)}`;
	document.querySelector('#quiz-question').textContent = question.question || 'شو بتعمل؟';
	document.querySelector('#quiz-sender').textContent = question.sender;
	document.querySelector('#quiz-address').textContent = question.address;
	document.querySelector('#quiz-message').textContent = question.message;
	document.querySelector('#quiz-link').textContent = question.link;
	quizFeedback.textContent = '';
	quizFeedback.className = 'quiz-feedback';
	quizNext.hidden = true;
	quizAnswered = false;
	quizChoices.forEach((choice, choiceIndex) => {
		choice.disabled = false;
		choice.classList.remove('is-correct', 'is-wrong');
		choice.dataset.answer = question.options[choiceIndex].answer;
		choice.querySelector('.choice-letter').textContent = choiceIndex === 0 ? 'أ' : 'ب';
		choice.querySelector('.quiz-choice-text').textContent = question.options[choiceIndex].text;
	});
}

quizChoices.forEach((choice) => {
	choice.addEventListener('click', () => {
		if (quizAnswered) return;
		quizAnswered = true;
		const correct = choice.dataset.answer === quizQuestions[quizIndex].correct;
		if (correct) quizScore += 1;
		else quizMistakes.push(quizQuestions[quizIndex].explanation);
		choice.classList.add(correct ? 'is-correct' : 'is-wrong');
		quizChoices.forEach((item) => { item.disabled = true; });
		quizFeedback.textContent = `${correct ? 'إجابة موفقة. ' : 'مش تمام، انتبه. '}${quizQuestions[quizIndex].explanation}`;
		quizFeedback.classList.add(correct ? 'feedback-correct' : 'feedback-wrong');
		quizNext.hidden = false;
		quizNext.textContent = quizIndex === quizQuestions.length - 1 ? 'اعرض النتيجة' : 'الموقف التالي ←';
	});
});

quizNext.addEventListener('click', () => {
	if (quizIndex === quizQuestions.length - 1) {
		displayQuizResult({
			type: 'phishing', score: quizScore, mistakes: quizMistakes, stage: phishingQuizStage, result: phishingResult,
			title: document.querySelector('#phishing-result-title'), summary: document.querySelector('#phishing-result-summary'),
			scoreElement: document.querySelector('#phishing-result-score'), meter: document.querySelector('#phishing-result-meter'),
			tipsList: document.querySelector('#phishing-result-tips'),
		});
		return;
	}
	quizIndex = (quizIndex + 1) % quizQuestions.length;
	showQuestion(quizIndex);
});
document.querySelector('#phishing-retry').addEventListener('click', () => {
	quizIndex = 0;
	quizScore = 0;
	quizMistakes = [];
	phishingResult.hidden = true;
	phishingQuizStage.hidden = false;
	showQuestion(0);
});
showQuestion(0);

const aiScenarios = [
	{
		type: 'مكالمة صوتية',
		scenario: 'يصلُك اتصال بصوت قريب لك، يطلب تحويل مبلغ بسرعة ويقول إنك لا تستطيع الاتصال به الآن.',
		options: [{ answer: 'unsafe', text: 'أحوّل المبلغ لأن الصوت مألوف.' }, { answer: 'safe', text: 'أنهي المكالمة وأتصل برقمه المحفوظ.' }],
		correct: 'safe',
		explanation: 'الصوت وحده لا يثبت هوية المتصل. عاود الاتصال برقم تعرفه، أو استخدم كلمة تحقق عائلية متفقاً عليها.',
	},
	{
		type: 'مكالمة فيديو',
		scenario: 'شخص يبدو كأنه موظف بنك يطلب رمز التحقق لمساعدتك على إيقاف عملية مشبوهة.',
		options: [{ answer: 'unsafe', text: 'أعطيه الرمز لأن وجهه وشعاره رسميان.' }, { answer: 'safe', text: 'أنهي المكالمة وأتواصل مع البنك من رقمه الرسمي.' }],
		correct: 'safe',
		explanation: 'لا تشارك رمز التحقق مع أي شخص. تواصل مع البنك عبر التطبيق أو رقم البطاقة أو الموقع الرسمي.',
	},
	{
		type: 'مقطع متداول',
		scenario: 'تشاهد مقطعاً صادماً منشوراً من حساب مجهول، ولا تجد رابطاً للمصدر الأصلي أو تأكيداً من جهة موثوقة.',
		options: [{ answer: 'unsafe', text: 'أعيد نشره بسرعة قبل أن يُحذف.' }, { answer: 'safe', text: 'أتحقق من مصدر مستقل وموثوق قبل تصديقه أو نشره.' }],
		correct: 'safe',
		explanation: 'قد تكون المقاطع معدلة أو مولّدة. ابحث عن المصدر الأصلي وتأكيد مستقل، ولا تعتمد على المظهر وحده.',
	},
	{
		type: 'طلب من مدير',
		scenario: 'تسمع صوت مديرك في رسالة صوتية يطلب تحويل دفعة عاجلة إلى حساب جديد، ويمنعك من الاتصال به.',
		options: [{ answer: 'safe', text: 'أتصل به على رقم العمل المعروف وأؤكد الطلب.' }, { answer: 'unsafe', text: 'أنفذ التحويل لأن صوته واضح.' }],
		correct: 'safe',
		explanation: 'تحقق من تغييرات الدفع عبر قناة مستقلة معروفة، حتى لو بدا الصوت مألوفاً.',
	},
	{
		type: 'رسالة عائلية',
		scenario: 'مقطع بصوت أحد أفراد العائلة يقول إنه عالق ويحتاج بطاقات هدايا، ويطلب إبقاء الأمر سراً.',
		options: [{ answer: 'unsafe', text: 'أشتري البطاقات وأرسل رموزها فوراً.' }, { answer: 'safe', text: 'أعاود الاتصال به وأتحقق مع فرد آخر من العائلة.' }],
		correct: 'safe',
		explanation: 'الاستعجال وطلب إبقاء السرية وطريقة الدفع غير المعتادة إشارات خطر. تحقق عبر رقم محفوظ.',
	},
	{
		type: 'خبر عاجل',
		scenario: 'فيديو لشخصية عامة يعلن خبراً كبيراً، لكن المقطع منشور بحساب مجهول ولا يظهر له مصدر أصلي.',
		options: [{ answer: 'safe', text: 'أبحث عن بيان أو تأكيد من مصدر مستقل موثوق.' }, { answer: 'unsafe', text: 'أشاركه لأن الوجه والصوت يبدوان حقيقيين.' }],
		correct: 'safe',
		explanation: 'المظهر المقنع لا يثبت صحة المقطع. انتظر المصدر الأصلي أو تأكيداً مستقلاً قبل النشر.',
	},
	{
		type: 'رابط تسجيل',
		scenario: 'صديق يرسل مقطعاً بصوته يقول إن صورك منشورة، ويرفق رابطاً يطلب تسجيل الدخول لمشاهدتها.',
		options: [{ answer: 'unsafe', text: 'أسجل الدخول بسرعة عبر الرابط.' }, { answer: 'safe', text: 'أتواصل معه بقناة ثانية وأتجنب الرابط.' }],
		correct: 'safe',
		explanation: 'قد يكون الحساب أو الصوت منتحلاً. لا تدخل كلمة مرورك من رابط مفاجئ؛ تحقق من صديقك بطريقة أخرى.',
	},
	{
		type: 'فرصة استثمار',
		scenario: 'إعلان فيديو بصوت مشهور يعد بأرباح مضمونة، ويطلب إيداع المال عبر محادثة خاصة.',
		options: [{ answer: 'safe', text: 'أتحقق من الجهة الرقابية والموقع الرسمي قبل أي إيداع.' }, { answer: 'unsafe', text: 'أودع مبلغاً صغيراً لأن المشهور يوصي بها.' }],
		correct: 'safe',
		explanation: 'قد تُستخدم صورة أو صوت المشاهير دون إذن. الوعود بأرباح مضمونة وطلب الإيداع الخاص إشارات تحذير.',
	},
	{
		type: 'موعد عمل',
		scenario: 'متصل بصوت مسؤول توظيف يطلب تثبيت برنامج تحكم عن بُعد قبل مقابلة العمل.',
		options: [{ answer: 'unsafe', text: 'أثبت البرنامج من الرابط المرسل فوراً.' }, { answer: 'safe', text: 'أتحقق من الشركة عبر موقعها الرسمي ولا أثبت برنامجاً مجهولاً.' }],
		correct: 'safe',
		explanation: 'لا تثبت أدوات تحكم عن بُعد بناءً على اتصال غير متوقع. تحقق من جهة العمل عبر قناة مستقلة.',
	},
	{
		type: 'مساعدة طارئة',
		scenario: 'تتلقى تسجيلاً مؤثراً يطلب إرسال موقعك الحي وبياناتك إلى حساب مجهول لمساعدة شخص في خطر.',
		options: [{ answer: 'unsafe', text: 'أرسل موقعي وبياناتي للحساب فوراً.' }, { answer: 'safe', text: 'أتحقق من الخبر وأتواصل مع جهة موثوقة أو الطوارئ الرسمية.' }],
		correct: 'safe',
		explanation: 'لا تشارك موقعك أو بياناتك مع حساب مجهول. تحقق من الجهة واتصل بالطوارئ الرسمية عند وجود خطر فعلي.',
	},
];
let aiScenarioIndex = 0;
let aiScenarioAnswered = false;
let aiScenarioScore = 0;
let aiScenarioMistakes = [];
const aiQuizChoices = [...document.querySelectorAll('.ai-quiz-choice')];
const aiQuizFeedback = document.querySelector('#ai-quiz-feedback');
const aiQuizNext = document.querySelector('#ai-quiz-next');
const aiQuizStage = document.querySelector('#ai-quiz-stage');
const aiResult = document.querySelector('#ai-result');

function showAiScenario(index) {
	const scenario = aiScenarios[index];
	document.querySelector('#ai-scenario-count').textContent = `الموقف ${arabicDigits(index + 1)} من ${arabicDigits(aiScenarios.length)}`;
	document.querySelector('#ai-scenario-type').textContent = scenario.type;
	document.querySelector('#ai-scenario-text').textContent = scenario.scenario;
	aiQuizFeedback.textContent = '';
	aiQuizFeedback.className = 'ai-quiz-feedback';
	aiQuizNext.hidden = true;
	aiScenarioAnswered = false;
	aiQuizChoices.forEach((choice, choiceIndex) => {
		choice.disabled = false;
		choice.classList.remove('is-correct', 'is-wrong');
		choice.dataset.answer = scenario.options[choiceIndex].answer;
		choice.querySelector('.ai-choice-marker').textContent = choiceIndex === 0 ? 'أ' : 'ب';
		choice.querySelector('.ai-choice-text').textContent = scenario.options[choiceIndex].text;
	});
}

aiQuizChoices.forEach((choice) => {
	choice.addEventListener('click', () => {
		if (aiScenarioAnswered) return;
		aiScenarioAnswered = true;
		const correct = choice.dataset.answer === aiScenarios[aiScenarioIndex].correct;
		if (correct) aiScenarioScore += 1;
		else aiScenarioMistakes.push(aiScenarios[aiScenarioIndex].explanation);
		choice.classList.add(correct ? 'is-correct' : 'is-wrong');
		aiQuizChoices.forEach((item) => { item.disabled = true; });
		aiQuizFeedback.textContent = `${correct ? 'إجابة موفقة. ' : 'تذكير: '}${aiScenarios[aiScenarioIndex].explanation}`;
		aiQuizFeedback.classList.add(correct ? 'feedback-correct' : 'feedback-wrong');
		aiQuizNext.hidden = false;
		aiQuizNext.textContent = aiScenarioIndex === aiScenarios.length - 1 ? 'اعرض النتيجة' : 'الموقف التالي ←';
	});
});

aiQuizNext.addEventListener('click', () => {
	if (aiScenarioIndex === aiScenarios.length - 1) {
		displayQuizResult({
			type: 'ai', score: aiScenarioScore, mistakes: aiScenarioMistakes, stage: aiQuizStage, result: aiResult,
			title: document.querySelector('#ai-result-title'), summary: document.querySelector('#ai-result-summary'),
			scoreElement: document.querySelector('#ai-result-score'), meter: document.querySelector('#ai-result-meter'),
			tipsList: document.querySelector('#ai-result-tips'),
		});
		return;
	}
	aiScenarioIndex = (aiScenarioIndex + 1) % aiScenarios.length;
	showAiScenario(aiScenarioIndex);
});
document.querySelector('#ai-retry').addEventListener('click', () => {
	aiScenarioIndex = 0;
	aiScenarioScore = 0;
	aiScenarioMistakes = [];
	aiResult.hidden = true;
	aiQuizStage.hidden = false;
	showAiScenario(0);
});
showAiScenario(0);

const checklistInputs = [...document.querySelectorAll('.check-item input')];
const checklistStorageKey = 'cyber-guide-checklist-v1';

function updateChecklist() {
	const completed = checklistInputs.filter((input) => input.checked).length;
	const percent = Math.round((completed / checklistInputs.length) * 100);
	document.querySelector('#checklist-percent').textContent = arabicDigits(percent);
	document.querySelector('#checklist-count').textContent = `${arabicDigits(completed)} من ${arabicDigits(checklistInputs.length)}`;
	document.querySelector('#checklist-progress').style.width = `${percent}%`;
	const status = completed === checklistInputs.length ? 'ممتاز! أساسياتك كلها جاهزة.' : completed > 0 ? 'شغل ممتاز، كمّل باقي الخطوات.' : 'كل خطوة بتفرق. ابدأ بأول وحدة.';
	document.querySelector('#checklist-status').textContent = status;
	try {
		localStorage.setItem(checklistStorageKey, JSON.stringify(checklistInputs.filter((input) => input.checked).map((input) => input.dataset.check)));
	} catch {
		// The checklist remains usable for this visit when storage is unavailable.
	}
}

try {
	const savedChecks = JSON.parse(localStorage.getItem(checklistStorageKey) || '[]');
	checklistInputs.forEach((input) => { input.checked = savedChecks.includes(input.dataset.check); });
} catch {
	checklistInputs.forEach((input) => { input.checked = false; });
}

checklistInputs.forEach((input) => input.addEventListener('change', updateChecklist));
document.querySelector('#reset-checklist').addEventListener('click', () => {
	checklistInputs.forEach((input) => { input.checked = false; });
	updateChecklist();
});
updateChecklist();

const urlCheckForm = document.querySelector('#url-check-form');
const urlCheckInput = document.querySelector('#url-check-input');
const urlCheckError = document.querySelector('#url-check-error');
const urlCheckResult = document.querySelector('#url-check-result');
const shortenerDomains = new Set(['bit.ly', 'tinyurl.com', 't.co', 'is.gd', 'rb.gy', 'cutt.ly', 'shorturl.at', 'ow.ly', 'buff.ly']);

function analyzeUrl(rawValue) {
	const value = rawValue.trim();
	const scheme = value.match(/^([a-z][a-z\d+.-]*):/i)?.[1].toLowerCase();
	if (scheme && !['http', 'https'].includes(scheme)) {
		throw new Error('أدخل رابط ويب يبدأ بـ http:// أو https://.');
	}

	let url;
	try {
		url = new URL(scheme ? value : `https://${value}`);
	} catch {
		throw new Error('صيغة الرابط غير مكتملة. تأكد من كتابته بشكل صحيح.');
	}
	if (!url.hostname || !['http:', 'https:'].includes(url.protocol)) {
		throw new Error('أدخل عنوان موقع صالحاً يبدأ بـ http:// أو https://.');
	}

	const findings = [];
	const addFinding = (text, level = 'warning') => findings.push({ text, level });
	const hostname = url.hostname.toLowerCase();
	const normalizedHost = hostname.replace(/^\[|\]$/g, '');
	const labels = hostname.split('.');
	const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) && hostname.split('.').every((part) => Number(part) <= 255);
	const isIpv6 = normalizedHost.includes(':');
	const isShortened = [...shortenerDomains].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
	const isPunycode = labels.some((label) => label.startsWith('xn--'));
	let severeIndicators = 0;

	if (url.username || url.password) {
		addFinding('يحتوي الرابط على بيانات دخول قبل اسم النطاق؛ قد تكون هذه حيلة لإخفاء وجهته.', 'danger');
		severeIndicators += 2;
	}
	if (isIpv4 || isIpv6) {
		addFinding('العنوان يستخدم رقم IP مباشرة بدلاً من اسم نطاق مألوف.');
		severeIndicators += 1;
	}
	if (isPunycode) {
		addFinding('اسم النطاق يحتوي أحرفاً دولية ممثلة بصيغة Punycode؛ افحص تهجئته بعناية.');
		severeIndicators += 1;
	}
	if (url.protocol === 'http:') addFinding('الاتصال يستخدم HTTP غير المشفّر؛ لا تدخل أي بيانات حساسة.');
	if (isShortened) addFinding('الرابط مختصر ويخفي وجهته النهائية؛ تحقق منها عبر مصدر موثوق قبل المتابعة.');
	if (labels.length > 4) addFinding('اسم النطاق طويل ومتعدد المستويات؛ تحقق من النطاق الأساسي حرفاً حرفاً.');
	if (url.port && !['80', '443'].includes(url.port)) addFinding('الرابط يستخدم منفذاً غير معتاد لمواقع الويب.');
	if ([...url.searchParams.keys()].some((key) => /^(redirect|redirect_uri|url|target|next|continue|return|return_to|dest|destination)$/i.test(key))) {
		addFinding('الرابط يتضمن معامل تحويل؛ قد ينقلك إلى وجهة أخرى بعد فتحه.');
	}
	if (/\.(exe|msi|bat|cmd|scr|apk|dmg|iso|zip)$/i.test(url.pathname)) {
		addFinding('الرابط يشير إلى ملف قابل للتنزيل؛ لا تفتحه إلا إذا كنت تتوقعه وتثق بمصدره.');
	}
	if (!hostname.includes('.')) addFinding('اسم المضيف لا يبدو نطاقاً عاماً كاملاً؛ تأكد أنه الموقع المقصود.');

	return { url, findings, severeIndicators };
}

urlCheckForm.addEventListener('submit', (event) => {
	event.preventDefault();
	urlCheckError.hidden = true;
	urlCheckResult.hidden = true;

	if (!urlCheckInput.value.trim()) {
		urlCheckError.textContent = 'الصق رابطاً أولاً حتى نحلل عنوانه.';
		urlCheckError.hidden = false;
		urlCheckInput.focus();
		return;
	}

	let analysis;
	try {
		analysis = analyzeUrl(urlCheckInput.value);
	} catch (error) {
		urlCheckError.textContent = error.message;
		urlCheckError.hidden = false;
		urlCheckInput.focus();
		return;
	}

	const { url, findings, severeIndicators } = analysis;
	const level = severeIndicators >= 2 || findings.length >= 3 ? 'danger' : findings.length ? 'warning' : 'clear';
	const titles = {
		danger: ['ظهرت مؤشرات مقلقة', 'حذر مرتفع'],
		warning: ['تحقق من الرابط قبل فتحه', 'يحتاج انتباهاً'],
		clear: ['لم تظهر علامات شائعة في العنوان', 'مؤشرات منخفضة'],
	};
	document.querySelector('#url-result-title').textContent = titles[level][0];
	document.querySelector('#url-result-badge').textContent = titles[level][1];
	document.querySelector('#url-result-host').textContent = url.hostname;
	urlCheckResult.dataset.level = level;

	const findingList = document.querySelector('#url-result-findings');
	findingList.replaceChildren();
	const resultFindings = findings.length ? findings : [{ text: 'لم نرصد العلامات الشائعة التي يبحث عنها هذا الفحص المحدود.', level: 'clear' }];
	resultFindings.forEach(({ text, level: findingLevel }) => {
		const item = document.createElement('li');
		item.textContent = text;
		if (findingLevel !== 'clear') item.classList.add(`finding-${findingLevel}`);
		findingList.append(item);
	});
	urlCheckResult.hidden = false;
});

const shopScenarios = [
	{
		type: 'عرض مغرٍ',
		title: 'خصم كبير من متجر جديد',
		scenario: 'إعلان يعدك بخصم ٧٠٪، لكن البائع يطلب تحويل المبلغ إلى حساب شخصي خارج الموقع.',
		options: [{ answer: 'unsafe', text: 'أحوّل بسرعة حتى ما يروح العرض.' }, { answer: 'safe', text: 'أتحقق من المتجر وأرفض الدفع خارج المنصة.' }],
		correct: 'safe',
		explanation: 'الخصم الكبير والاستعجال مع طلب تحويل خارج المنصة إشارات خطر. لا تدفع قبل التحقق، واستخدم وسيلة دفع توفر حماية للمشتري.',
	},
	{
		type: 'طلب من بائع',
		title: 'الدفع خارج منصة البيع',
		scenario: 'بائع في سوق إلكتروني يعرض سعراً أقل إذا أكملت المحادثة والدفع عبر رابط أرسله لك خارج المنصة.',
		options: [{ answer: 'unsafe', text: 'أدفع بالرابط الخارجي لتوفير المال.' }, { answer: 'safe', text: 'أبقي المحادثة والدفع داخل المنصة الرسمية.' }],
		correct: 'safe',
		explanation: 'الدفع خارج المنصة قد يلغي حماية المشتري ويصعّب استرجاع المال. لا تستخدم رابط دفع أرسله البائع دون تحقق.',
	},
	{
		type: 'صفحة دفع',
		title: 'ظهرت علامة القفل في المتصفح',
		scenario: 'صفحة الدفع تعرض HTTPS، لكن عنوان الموقع يختلف عن اسم المتجر بحرف واحد.',
		options: [{ answer: 'unsafe', text: 'أثق بها لأن الاتصال مشفّر.' }, { answer: 'safe', text: 'أراجع النطاق وأدخل للمتجر من عنوانه الرسمي بنفسي.' }],
		correct: 'safe',
		explanation: 'HTTPS يشفّر الاتصال فقط ولا يثبت هوية المتجر. اختلاف حرف واحد قد يعني أنك على موقع مقلّد؛ اكتب العنوان الرسمي بنفسك.',
	},
	{
		type: 'متجر غير معروف',
		title: 'سعر أقل بكثير من المعتاد',
		scenario: 'وجدت جهازاً بسعر منخفض جداً في متجر لا يعرض عنواناً أو سياسة استرجاع واضحة.',
		options: [{ answer: 'safe', text: 'أتحقق من وجود المتجر وآراء مستقلة قبل الشراء.' }, { answer: 'unsafe', text: 'أشتري فوراً قبل انتهاء العرض.' }],
		correct: 'safe',
		explanation: 'السعر المغري وحده لا يكفي. ابحث عن بيانات المتجر وسياسة الإرجاع وتقييمات مستقلة قبل الدفع.',
	},
	{
		type: 'رمز QR',
		title: 'رمز دفع على طاولة المقهى',
		scenario: 'رمز QR ملصق فوق الرمز الأصلي ويقود إلى صفحة دفع باسم تاجر مختلف.',
		options: [{ answer: 'safe', text: 'أتأكد من اسم التاجر والمبلغ أو أسأل الموظف قبل الدفع.' }, { answer: 'unsafe', text: 'أدفع لأن الرمز موجود على الطاولة.' }],
		correct: 'safe',
		explanation: 'قد تُستبدل رموز QR. تحقق من اسم المستفيد والمبلغ في تطبيق الدفع قبل الموافقة.',
	},
	{
		type: 'استرداد مبلغ',
		title: 'البائع يطلب رمز البنك',
		scenario: 'متصل يدّعي أنه من المتجر ويطلب رمز التحقق ليعيد لك ثمن منتج ملغي.',
		options: [{ answer: 'unsafe', text: 'أعطيه الرمز لإتمام الاسترداد.' }, { answer: 'safe', text: 'لا أشارك الرمز وأتواصل مع المتجر من قناته الرسمية.' }],
		correct: 'safe',
		explanation: 'لا تشارك رمز البنك أو الدفع مع أي شخص. ابدأ طلب الاسترداد من حسابك أو دعم المتجر الرسمي.',
	},
	{
		type: 'إثبات تحويل',
		title: 'صورة إيصال من المشتري',
		scenario: 'المشتري يرسل لقطة شاشة للتحويل ويطلب منك شحن السلعة فوراً قبل ظهور المبلغ في حسابك.',
		options: [{ answer: 'safe', text: 'أنتظر تأكيد المبلغ داخل حسابي أو منصة الدفع.' }, { answer: 'unsafe', text: 'أشحن السلعة اعتماداً على صورة الإيصال.' }],
		correct: 'safe',
		explanation: 'يمكن تعديل صور الإيصالات. اعتمد على حركة ظاهرة في حسابك أو تأكيد المنصة، لا على لقطة شاشة.',
	},
	{
		type: 'رسوم توصيل',
		title: 'رسوم إضافية عبر رسالة',
		scenario: 'بعد الشراء تصلك رسالة تطلب رسماً صغيراً عبر رابط لتسليم الطلب، لكنك لا تعرف عنوان المرسل.',
		options: [{ answer: 'unsafe', text: 'أدفع من الرابط حتى لا يتأخر الطلب.' }, { answer: 'safe', text: 'أتحقق من حالة الشحنة في موقع شركة التوصيل الرسمي.' }],
		correct: 'safe',
		explanation: 'رسوم مفاجئة عبر رابط رسالة قد تكون احتيالاً. استخدم التطبيق أو الموقع الرسمي لشركة التوصيل.',
	},
	{
		type: 'سياسة الاسترجاع',
		title: 'لا يوجد استرجاع أو تواصل واضح',
		scenario: 'المتجر يذكر أن كل المبيعات نهائية ولا يوضح كيف تتواصل معه عند مشكلة بالطلب.',
		options: [{ answer: 'safe', text: 'أراجع الشروط وأبحث عن متجر يوفر حماية أوضح للمشتري.' }, { answer: 'unsafe', text: 'أشتري وأفترض أن المتجر سيحل المشكلة لاحقاً.' }],
		correct: 'safe',
		explanation: 'راجع سياسة الاسترجاع وبيانات التواصل قبل الدفع، واختر متجراً يوضح حقوق المشتري.',
	},
	{
		type: 'طلب بيانات البطاقة',
		title: 'أرسل صورة البطاقة للبائع',
		scenario: 'بائع يطلب صورة وجهي البطاقة ورمز الأمان في المحادثة ليحجز لك المنتج.',
		options: [{ answer: 'unsafe', text: 'أرسل الصورة بعد إخفاء جزء من الرقم.' }, { answer: 'safe', text: 'أرفض مشاركة بيانات البطاقة وأدفع عبر بوابة موثوقة فقط.' }],
		correct: 'safe',
		explanation: 'لا ترسل صور البطاقة أو رمز الأمان عبر المحادثات. استخدم بوابة دفع موثوقة ولا تشارك رمز التحقق.',
	},
];
let shopScenarioIndex = 0;
let shopScenarioAnswered = false;
let shopScenarioScore = 0;
let shopScenarioMistakes = [];
const shopQuizChoices = [...document.querySelectorAll('.shop-quiz-choice')];
const shopQuizFeedback = document.querySelector('#shop-quiz-feedback');
const shopQuizNext = document.querySelector('#shop-quiz-next');
const shopQuizStage = document.querySelector('#shop-quiz-stage');
const shopResult = document.querySelector('#shop-result');

function showShopScenario(index) {
	const scenario = shopScenarios[index];
	document.querySelector('#shop-scenario-count').textContent = `الموقف ${arabicDigits(index + 1)} من ${arabicDigits(shopScenarios.length)}`;
	document.querySelector('#shop-scenario-type').textContent = scenario.type;
	document.querySelector('#shop-scenario-title').textContent = scenario.title;
	document.querySelector('#shop-scenario-text').textContent = scenario.scenario;
	shopQuizFeedback.textContent = '';
	shopQuizFeedback.className = 'shop-quiz-feedback';
	shopQuizNext.hidden = true;
	shopScenarioAnswered = false;
	shopQuizChoices.forEach((choice, choiceIndex) => {
		choice.disabled = false;
		choice.classList.remove('is-correct', 'is-wrong');
		choice.dataset.answer = scenario.options[choiceIndex].answer;
		choice.querySelector('.shop-choice-marker').textContent = choiceIndex === 0 ? 'أ' : 'ب';
		choice.querySelector('.shop-choice-text').textContent = scenario.options[choiceIndex].text;
	});
}

shopQuizChoices.forEach((choice) => {
	choice.addEventListener('click', () => {
		if (shopScenarioAnswered) return;
		shopScenarioAnswered = true;
		const correct = choice.dataset.answer === shopScenarios[shopScenarioIndex].correct;
		if (correct) shopScenarioScore += 1;
		else shopScenarioMistakes.push(shopScenarios[shopScenarioIndex].explanation);
		choice.classList.add(correct ? 'is-correct' : 'is-wrong');
		shopQuizChoices.forEach((item) => { item.disabled = true; });
		shopQuizFeedback.textContent = `${correct ? 'قرار موفق. ' : 'انتبه قبل الدفع. '}${shopScenarios[shopScenarioIndex].explanation}`;
		shopQuizFeedback.classList.add(correct ? 'feedback-correct' : 'feedback-wrong');
		shopQuizNext.hidden = false;
		shopQuizNext.textContent = shopScenarioIndex === shopScenarios.length - 1 ? 'اعرض النتيجة' : 'الموقف التالي ←';
	});
});

shopQuizNext.addEventListener('click', () => {
	if (shopScenarioIndex === shopScenarios.length - 1) {
		displayQuizResult({
			type: 'shopping', score: shopScenarioScore, mistakes: shopScenarioMistakes, stage: shopQuizStage, result: shopResult,
			title: document.querySelector('#shop-result-title'), summary: document.querySelector('#shop-result-summary'),
			scoreElement: document.querySelector('#shop-result-score'), meter: document.querySelector('#shop-result-meter'),
			tipsList: document.querySelector('#shop-result-tips'),
		});
		return;
	}
	shopScenarioIndex = (shopScenarioIndex + 1) % shopScenarios.length;
	showShopScenario(shopScenarioIndex);
});
document.querySelector('#shop-retry').addEventListener('click', () => {
	shopScenarioIndex = 0;
	shopScenarioScore = 0;
	shopScenarioMistakes = [];
	shopResult.hidden = true;
	shopQuizStage.hidden = false;
	showShopScenario(0);
});
showShopScenario(0);

const shopCheckInputs = [...document.querySelectorAll('.shop-check-input')];
function updateShopChecklist() {
	const completed = shopCheckInputs.filter((input) => input.checked).length;
	const progress = Math.round((completed / shopCheckInputs.length) * 100);
	document.querySelector('#shop-check-count').textContent = `${arabicDigits(completed)} من ${arabicDigits(shopCheckInputs.length)}`;
	document.querySelector('#shop-check-progress').style.width = `${progress}%`;
	document.querySelector('#shop-check-status').textContent = completed === shopCheckInputs.length
		? 'ممتاز، راجع تفاصيل الطلب قبل تأكيده.'
		: completed > 0 ? 'جيد، أكمل مراجعة باقي النقاط.' : 'علّم على الخطوات التي راجعتها.';
}

shopCheckInputs.forEach((input) => input.addEventListener('change', updateShopChecklist));
updateShopChecklist();

const backupScenarios = [
	{
		type: 'فقدان جهاز', title: 'هل تقدر تستعيد ملفاتك؟',
		scenario: 'تعطل حاسوبك فجأة، وآخر نسخة من صورك وملفاتك موجودة على الحاسوب نفسه فقط.',
		options: [{ answer: 'safe', text: 'أحتفظ بنسخة منفصلة وأختبر استعادة ملف منها.' }, { answer: 'unsafe', text: 'أكتفي بالملفات الموجودة على الحاسوب.' }],
		correct: 'safe', explanation: 'النسخة على الجهاز نفسه قد تضيع معه. احتفظ بنسخة إضافية في وسيط أو خدمة منفصلة، وجرّب استعادتها.',
	},
	{
		type: 'هجوم فدية', title: 'هل المزامنة تكفي؟',
		scenario: 'برنامج فدية شفّر ملفاتك، وهذه الملفات متزامنة تلقائياً مع التخزين السحابي.',
		options: [{ answer: 'unsafe', text: 'أعتمد على المزامنة وأفترض أنها ستعيد الملفات الأصلية.' }, { answer: 'safe', text: 'أستخدم نسخة منفصلة أو إصداراً سابقاً غير متأثر.' }],
		correct: 'safe', explanation: 'قد تنتقل التغييرات أو الملفات المشفرة عبر المزامنة. احتفظ بنسخة منفصلة أو استخدم سجل الإصدارات بعد التأكد من سلامة الجهاز.',
	},
	{
		type: 'قرص خارجي', title: 'متى تفصل قرص النسخ؟',
		scenario: 'تستخدم قرصاً خارجياً للنسخ الاحتياطي وتتركه موصولاً بالحاسوب طوال الوقت.',
		options: [{ answer: 'safe', text: 'أفصله بعد اكتمال النسخ وأحفظه بمكان آمن.' }, { answer: 'unsafe', text: 'أبقيه موصولاً دائماً حتى يتحدث تلقائياً.' }],
		correct: 'safe', explanation: 'القرص المتصل قد يتأثر بالعطل أو البرمجيات الخبيثة نفسها. افصله عند عدم الحاجة إليه أو استخدم نسخة محمية بصلاحيات وإصدارات.',
	},
	{
		type: 'اختبار استعادة', title: 'كيف تتأكد أن النسخة تعمل؟',
		scenario: 'تظهر أداة النسخ أن العملية اكتملت بنجاح، لكنك لم تستعد أي ملف منها من قبل.',
		options: [{ answer: 'unsafe', text: 'أفترض أنها تعمل وأنتظر وقت الحاجة.' }, { answer: 'safe', text: 'أستعيد ملفاً تجريبياً وأتأكد أنه يفتح بشكل سليم.' }],
		correct: 'safe', explanation: 'نجاح النسخ لا يضمن إمكانية الاستعادة. اختبر استعادة ملف بين فترة وأخرى وتحقق من محتواه.',
	},
	{
		type: 'قاعدة 3-2-1', title: 'كم نسخة وأين تحفظها؟',
		scenario: 'تريد ترتيب نسخ صورك وملفاتك المهمة بطريقة تقلل احتمال فقدانها.',
		options: [{ answer: 'safe', text: 'ثلاث نسخ على وسيطين مختلفين، وواحدة خارج الجهاز أو المكان.' }, { answer: 'unsafe', text: 'نسختان على المجلد نفسه في القرص ذاته.' }],
		correct: 'safe', explanation: 'قاعدة 3-2-1 تعني ثلاث نسخ إجمالاً، على نوعين من التخزين، مع نسخة واحدة خارج الموقع أو غير متصلة.',
	},
	{
		type: 'تخزين سحابي', title: 'كيف تؤمن حساب النسخ؟',
		scenario: 'تخزن نسخة ملفاتك في حساب سحابي يحتوي أيضاً على صورك ووثائقك الشخصية.',
		options: [{ answer: 'unsafe', text: 'أستخدم كلمة المرور نفسها التي أستخدمها في كل المواقع.' }, { answer: 'safe', text: 'أستخدم كلمة فريدة وأفعّل التحقق بخطوتين.' }],
		correct: 'safe', explanation: 'حساب التخزين السحابي جزء مهم من خطة الاستعادة. احمه بكلمة مرور فريدة وتحقق بخطوتين وراجع جلسات الدخول.',
	},
	{
		type: 'مفتاح التشفير', title: 'أين تحفظ مفتاح الاستعادة؟',
		scenario: 'شفّرت قرص النسخ الاحتياطي، لكن مفتاح فك التشفير محفوظ على الحاسوب نفسه فقط.',
		options: [{ answer: 'safe', text: 'أحفظ نسخة آمنة من المفتاح في مكان منفصل عن القرص.' }, { answer: 'unsafe', text: 'أترك المفتاح على الجهاز الذي يحتوي الملفات الأصلية.' }],
		correct: 'safe', explanation: 'إذا ضاع الجهاز أو القرص قد تفقد المفتاح معه. خزّن بيانات الاستعادة بطريقة آمنة ومنفصلة واختبر الوصول إليها.',
	},
	{
		type: 'جدول النسخ', title: 'كم مرة تنسخ ملفاتك؟',
		scenario: 'تضيف ملفات عمل وصوراً جديدة كل يوم، لكنك تنسخها يدوياً مرة واحدة في السنة.',
		options: [{ answer: 'unsafe', text: 'أترك الجدول كما هو وأتذكر النسخ عند نهاية السنة.' }, { answer: 'safe', text: 'أفعّل نسخاً تلقائياً دورياً يناسب أهمية الملفات وتغيرها.' }],
		correct: 'safe', explanation: 'اضبط وتيرة النسخ حسب سرعة تغير الملفات وأهميتها. النسخ التلقائي يقلل الاعتماد على التذكر.',
	},
	{
		type: 'تحديث جهاز', title: 'قبل تحديث النظام',
		scenario: 'تستعد لتحديث كبير لنظام جهازك وتوجد ملفات مهمة لم تُنسخ مؤخراً.',
		options: [{ answer: 'safe', text: 'أحدّث النسخة الاحتياطية وأتأكد من وجود مساحة كافية قبل البدء.' }, { answer: 'unsafe', text: 'أبدأ التحديث فوراً من دون مراجعة النسخة.' }],
		correct: 'safe', explanation: 'النسخة الحديثة تساعد إذا حدث خلل أثناء التحديث. تأكد من اكتمالها قبل البدء ولا تفصل الجهاز أثناء النسخ.',
	},
	{
		type: 'استجابة لهجوم', title: 'بعد اكتشاف برمجية فدية',
		scenario: 'لاحظت أن ملفات جهازك تتغير أسماؤها وتظهر رسالة تطلب المال لفك تشفيرها.',
		options: [{ answer: 'unsafe', text: 'أوصل قرص النسخ فوراً وأنسخ الملفات المشفرة إليه.' }, { answer: 'safe', text: 'أفصل الجهاز عن الشبكة وأطلب مساعدة موثوقة قبل الاستعادة.' }],
		correct: 'safe', explanation: 'افصل الجهاز المصاب عن الشبكة ولا توصل نسخة سليمة به. استعِن بجهة موثوقة، ثم استعد من نسخة سليمة بعد معالجة الإصابة.',
	},
];
let backupScenarioIndex = 0;
let backupScenarioAnswered = false;
let backupScenarioScore = 0;
let backupScenarioMistakes = [];
const backupQuizChoices = [...document.querySelectorAll('.backup-quiz-choice')];
const backupQuizFeedback = document.querySelector('#backup-quiz-feedback');
const backupQuizNext = document.querySelector('#backup-quiz-next');
const backupQuizStage = document.querySelector('#backup-quiz-stage');
const backupResult = document.querySelector('#backup-result');

function showBackupScenario(index) {
	const scenario = backupScenarios[index];
	document.querySelector('#backup-scenario-count').textContent = `الموقف ${arabicDigits(index + 1)} من ${arabicDigits(backupScenarios.length)}`;
	document.querySelector('#backup-scenario-type').textContent = scenario.type;
	document.querySelector('#backup-scenario-title').textContent = scenario.title;
	document.querySelector('#backup-scenario-text').textContent = scenario.scenario;
	backupQuizFeedback.textContent = '';
	backupQuizFeedback.className = 'backup-quiz-feedback';
	backupQuizNext.hidden = true;
	backupScenarioAnswered = false;
	backupQuizChoices.forEach((choice, choiceIndex) => {
		choice.disabled = false;
		choice.classList.remove('is-correct', 'is-wrong');
		choice.dataset.answer = scenario.options[choiceIndex].answer;
		choice.querySelector('.backup-choice-marker').textContent = choiceIndex === 0 ? 'أ' : 'ب';
		choice.querySelector('.backup-choice-text').textContent = scenario.options[choiceIndex].text;
	});
}

backupQuizChoices.forEach((choice) => {
	choice.addEventListener('click', () => {
		if (backupScenarioAnswered) return;
		backupScenarioAnswered = true;
		const correct = choice.dataset.answer === backupScenarios[backupScenarioIndex].correct;
		if (correct) backupScenarioScore += 1;
		else backupScenarioMistakes.push(backupScenarios[backupScenarioIndex].explanation);
		choice.classList.add(correct ? 'is-correct' : 'is-wrong');
		backupQuizChoices.forEach((item) => { item.disabled = true; });
		backupQuizFeedback.textContent = `${correct ? 'إجابة موفقة. ' : 'انتبه. '}${backupScenarios[backupScenarioIndex].explanation}`;
		backupQuizFeedback.classList.add(correct ? 'feedback-correct' : 'feedback-wrong');
		backupQuizNext.hidden = false;
		backupQuizNext.textContent = backupScenarioIndex === backupScenarios.length - 1 ? 'اعرض النتيجة' : 'الموقف التالي ←';
	});
});

backupQuizNext.addEventListener('click', () => {
	if (backupScenarioIndex === backupScenarios.length - 1) {
		displayQuizResult({
			type: 'backup', score: backupScenarioScore, mistakes: backupScenarioMistakes, stage: backupQuizStage, result: backupResult,
			title: document.querySelector('#backup-result-title'), summary: document.querySelector('#backup-result-summary'),
			scoreElement: document.querySelector('#backup-result-score'), meter: document.querySelector('#backup-result-meter'),
			tipsList: document.querySelector('#backup-result-tips'),
		});
		return;
	}
	backupScenarioIndex += 1;
	showBackupScenario(backupScenarioIndex);
});

document.querySelector('#backup-retry').addEventListener('click', () => {
	backupScenarioIndex = 0;
	backupScenarioScore = 0;
	backupScenarioMistakes = [];
	backupResult.hidden = true;
	backupQuizStage.hidden = false;
	showBackupScenario(0);
});
showBackupScenario(0);

const homeCheckInputs = [...document.querySelectorAll('.home-check-input')];
const homeCheckStorageKey = 'cyber-guide-home-network-v1';

function updateHomeChecklist() {
	const completed = homeCheckInputs.filter((input) => input.checked).length;
	const progress = Math.round((completed / homeCheckInputs.length) * 100);
	document.querySelector('#home-check-count').textContent = `${arabicDigits(completed)} من ${arabicDigits(homeCheckInputs.length)}`;
	document.querySelector('#home-check-progress').style.width = `${progress}%`;
	document.querySelector('#home-check-status').textContent = completed === homeCheckInputs.length
		? 'ممتاز، شبكة بيتك مهيأة بشكل أفضل.'
		: completed > 0 ? 'جيد، أكمل مراجعة باقي الإعدادات.' : 'علّم على الإعدادات التي راجعتها.';
	try {
		localStorage.setItem(homeCheckStorageKey, JSON.stringify(homeCheckInputs.filter((input) => input.checked).map((input) => input.dataset.homeCheck)));
	} catch {
		// The checklist remains usable for this visit when storage is unavailable.
	}
}

try {
	const savedHomeChecks = JSON.parse(localStorage.getItem(homeCheckStorageKey) || '[]');
	if (Array.isArray(savedHomeChecks)) {
		homeCheckInputs.forEach((input) => { input.checked = savedHomeChecks.includes(input.dataset.homeCheck); });
	}
} catch {
	homeCheckInputs.forEach((input) => { input.checked = false; });
}

homeCheckInputs.forEach((input) => input.addEventListener('change', updateHomeChecklist));
updateHomeChecklist();

const privacyMapInputs = [...document.querySelectorAll('.privacy-map-input')];
const privacyMapStorageKey = 'cyber-guide-privacy-map-v1';

function updatePrivacyMapChecklist() {
	const completed = privacyMapInputs.filter((input) => input.checked).length;
	const progress = Math.round((completed / privacyMapInputs.length) * 100);
	document.querySelector('#privacy-map-count').textContent = `${arabicDigits(completed)} من ${arabicDigits(privacyMapInputs.length)}`;
	document.querySelector('#privacy-map-progress').style.width = `${progress}%`;
	document.querySelector('#privacy-map-status').textContent = completed === privacyMapInputs.length
		? 'ممتاز، انتهيت من الخريطة الأساسية للخصوصية.'
		: completed > 0 ? 'جيد، أكمل بقية الإعدادات لتقليل التعرّض.' : 'ابدأ من إعدادات الخصوصية الأساسية.';
	try {
		localStorage.setItem(privacyMapStorageKey, JSON.stringify(privacyMapInputs.filter((input) => input.checked).map((input) => input.dataset.privacyMap)));
	} catch {
		// The checklist remains usable when storage is unavailable.
	}
}

try {
	const savedPrivacyMap = JSON.parse(localStorage.getItem(privacyMapStorageKey) || '[]');
	if (Array.isArray(savedPrivacyMap)) {
		privacyMapInputs.forEach((input) => { input.checked = savedPrivacyMap.includes(input.dataset.privacyMap); });
	}
} catch {
	privacyMapInputs.forEach((input) => { input.checked = false; });
}

privacyMapInputs.forEach((input) => input.addEventListener('change', updatePrivacyMapChecklist));
updatePrivacyMapChecklist();

const escapeRoomSteps = [
	{
		prompt: 'وصلت رسالة تقول: “حسابك سيُغلق خلال ١٥ دقيقة، اضغط الآن.” ماذا تفعل؟',
		options: [
			{ label: 'أفتح التطبيق الرسمي وأتأكد من الحساب.', correct: true },
			{ label: 'أضغط الرابط فوراً لتنجو من الإغلاق.', correct: false },
			{ label: 'أرسل الرمز لأنه يبدو عاجلاً.', correct: false },
		],
		feedback: 'الاستعجال والضغط السريع من رسائل غير رسمية هو نمط شائع في التصيّد. اذهب إلى التطبيق الرسمي أو الرقم الموثوق.'
	},
	{
		prompt: 'تتلقى مكالمة من رقم يشبه البنك ويطلب “تأكيد” بطاقتك الآن. ماذا تفعل؟',
		options: [
			{ label: 'أنهي المكالمة وأتصل على الرقم الرسمي للبنك.', correct: true },
			{ label: 'أعطيهم بيانات البطاقتين لأنهم يدّعون المساعدة.', correct: false },
			{ label: 'أرسل لهم رابطاً يفتح الصفحة الرسمية.', correct: false },
		],
		feedback: 'بنكك لا يطلب بيانات البطاقة أو رمز التحقق عبر مكالمة غير مؤكدة. استخدم رقم البنك الرسمي فقط.'
	},
	{
		prompt: 'أحدهم يطلب منك مشاركة موقعك الحالي لتحديد مكان في ورشة العمل، هل تفعله؟',
		options: [
			{ label: 'أستفسر من جهة موثوقة وأتأكد من هوية الشخص.', correct: true },
			{ label: 'أرسل الموقع مباشرة لأن الطلب عاجل.', correct: false },
			{ label: 'أعطي تفاصيل مكاني للاطمئنان.', correct: false },
		],
		feedback: 'الموقع والبيانات الحساسة لا تُشارك إلا بعد التحقق من هوية طالبها. استخدم قناة موثوقة، لا الرسالة نفسها.'
	}
];

let escapeRoomIndex = 0;
let escapeRoomScore = 0;
let escapeRoomAnswered = false;
const escapeRoomPrompt = document.querySelector('#escape-room-prompt');
const escapeRoomStep = document.querySelector('#escape-room-step');
const escapeRoomOptions = [...document.querySelectorAll('.escape-room-option')];
const escapeRoomFeedback = document.querySelector('#escape-room-feedback');
const escapeRoomNext = document.querySelector('#escape-room-next');
const escapeRoomStatus = document.querySelector('#escape-room-status');
const escapeRoomScoreValue = document.querySelector('#escape-room-score');
const escapeRoomMeter = document.querySelector('#escape-room-meter');

function renderEscapeRoom() {
	const step = escapeRoomSteps[escapeRoomIndex];
	escapeRoomStep.textContent = `المرحلة ${arabicDigits(escapeRoomIndex + 1)} من ${arabicDigits(escapeRoomSteps.length)}`;
	escapeRoomPrompt.textContent = step.prompt;
	escapeRoomFeedback.textContent = '';
	escapeRoomFeedback.className = 'escape-room-feedback';
	escapeRoomNext.hidden = true;
	escapeRoomAnswered = false;
	escapeRoomOptions.forEach((button, index) => {
		button.disabled = false;
		button.classList.remove('is-correct', 'is-wrong');
		button.textContent = step.options[index].label;
		button.dataset.correct = String(step.options[index].correct);
	});
}

escapeRoomOptions.forEach((button) => {
	button.addEventListener('click', () => {
		if (escapeRoomAnswered) return;
		escapeRoomAnswered = true;
		const isCorrect = button.dataset.correct === 'true';
		if (isCorrect) escapeRoomScore += 1;
		button.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
		escapeRoomOptions.forEach((option) => {
			option.disabled = true;
			if (option.dataset.correct === 'true') option.classList.add('is-correct');
		});
		escapeRoomFeedback.textContent = escapeRoomSteps[escapeRoomIndex].feedback;
		escapeRoomFeedback.classList.toggle('is-wrong', !isCorrect);
		escapeRoomNext.hidden = false;
		escapeRoomNext.textContent = escapeRoomIndex === escapeRoomSteps.length - 1 ? 'عرض النتيجة' : 'المرحلة التالية';
		const percent = Math.round((escapeRoomScore / escapeRoomSteps.length) * 100);
		escapeRoomScoreValue.textContent = `${arabicDigits(percent)}٪`;
		escapeRoomMeter.style.width = `${percent}%`;
		escapeRoomStatus.textContent = `الأمان على الحافة: ${arabicDigits(escapeRoomScore)} من ${arabicDigits(escapeRoomSteps.length)}`;
	});
});

escapeRoomNext.addEventListener('click', () => {
	if (escapeRoomNext.dataset.reset === 'true') {
		escapeRoomIndex = 0;
		escapeRoomScore = 0;
		escapeRoomNext.dataset.reset = 'false';
		escapeRoomStatus.textContent = 'الأمان على الحافة: ٠ من ٣';
		escapeRoomScoreValue.textContent = '٠٪';
		escapeRoomMeter.style.width = '0%';
		renderEscapeRoom();
		return;
	}
	if (escapeRoomIndex === escapeRoomSteps.length - 1) {
		const finalPercent = Math.round((escapeRoomScore / escapeRoomSteps.length) * 100);
		escapeRoomFeedback.textContent = finalPercent >= 67
			? 'ممتاز! قراراتك متوازنة، واستمر بالتحقق قبل النقر.'
			: 'حسن متابعة، فكر دائماً في الاستعجال والرسائل المريبة قبل أي إجراء.';
		escapeRoomFeedback.classList.remove('is-wrong');
		escapeRoomNext.textContent = 'إعادة التجربة';
		escapeRoomNext.dataset.reset = 'true';
		return;
	}
	escapeRoomIndex += 1;
	renderEscapeRoom();
});

renderEscapeRoom();

const scamMapData = {
	all: {
		label: 'خطر متوسط',
		title: 'التصيّد الإلكتروني',
		summary: 'رسالة أو موقع مزيّف يحاول يخليك تنقر أو تدخل بياناتك بسرعة.',
		items: ['رسائل عاجلة أو مهدّدة', 'روابط مختصرة أو عناوين مزيفة', 'طلب كلمات المرور أو رموز التحقق']
	},
	phishing: {
		label: 'خطر عالي',
		title: 'التصيّد عبر الرسائل',
		summary: 'المحتال يستغل الخوف أو الاستعجال حتى تفتح الرابط أو تعطيه المعلومات.',
		items: ['هجمات بريد إلكتروني أو رسائل SMS', 'أسماء يبدو أنها رسمية', 'ضغط الزمن والتهديد']
	},
	wallet: {
		label: 'خطر عالي',
		title: 'الاحتيال المالي',
		summary: 'يطلب تحويل أموال أو بيانات بطاقات عبر وسيلة غير موثوقة.',
		items: ['صفقات ميدانية أو تحويلات سريعة', 'رسائل تدّعي دعم البنك', 'طلبات الدفع خارج المنصة']
	},
	social: {
		label: 'خطر متوسط',
		title: 'الهوية والملفات',
		summary: 'يستغل حساباً مألوفاً أو ملفاً مثيراً لسرقة بياناتك أو الوصول إلى حسابك.',
		items: ['رابط يطلب تسجيل دخول', 'مقاطع أو صور مزيفة', 'طلبات مشاركة موقعك أو بياناتك']
	},
	shopping: {
		label: 'خطر متوسط',
		title: 'تسوّق احتيالي',
		summary: 'نعرضات أبدع من متجر غير معروف أو موقع دفع مزيف.',
		items: ['خصومات غير معقولة', 'دفع خارج المنصة', 'آراء أو تقييمات مزيفة']
	}
};

const scamMapPills = [...document.querySelectorAll('.scam-map-pill')];
const scamMapBadge = document.querySelector('#scam-map-badge');
const scamMapTitle = document.querySelector('#scam-map-title-detail');
const scamMapSummary = document.querySelector('#scam-map-summary');
const scamMapList = document.querySelector('#scam-map-list');

function updateScamMap(filter) {
	const data = scamMapData[filter] || scamMapData.all;
	scamMapBadge.textContent = data.label;
	scamMapTitle.textContent = data.title;
	scamMapSummary.textContent = data.summary;
	scamMapList.replaceChildren();
	data.items.forEach((item) => {
		const li = document.createElement('li');
		li.textContent = item;
		scamMapList.append(li);
	});
	scamMapPills.forEach((button) => {
		button.classList.toggle('is-active', button.dataset.filter === filter);
	});
}

scamMapPills.forEach((button) => {
	button.addEventListener('click', () => updateScamMap(button.dataset.filter));
});
updateScamMap('all');

const whatIfToggles = [...document.querySelectorAll('.what-if-toggle')];
whatIfToggles.forEach((button) => {
	button.addEventListener('click', () => {
		const target = document.querySelector(`#${button.dataset.target}`);
		const isHidden = target.hasAttribute('hidden');
		whatIfToggles.forEach((item) => {
			const panel = document.querySelector(`#${item.dataset.target}`);
			if (panel && panel !== target) panel.setAttribute('hidden', 'hidden');
		});
		target.toggleAttribute('hidden', !isHidden);
	});
});

const phoneCheckInputs = [...document.querySelectorAll('.phone-check-input')];
const phoneCheckStorageKey = 'cyber-guide-stolen-phone-v1';

function updatePhoneChecklist() {
	const completed = phoneCheckInputs.filter((input) => input.checked).length;
	const progress = Math.round((completed / phoneCheckInputs.length) * 100);
	document.querySelector('#phone-check-count').textContent = `${arabicDigits(completed)} من ${arabicDigits(phoneCheckInputs.length)}`;
	document.querySelector('#phone-check-progress').style.width = `${progress}%`;
	document.querySelector('#phone-check-status').textContent = completed === phoneCheckInputs.length
		? 'أحسنت، راجع حساباتك خلال اليوم القادم.'
		: completed > 0 ? 'جيد، أكمل الخطوات من جهاز موثوق.' : 'ابدأ بقفل الجهاز، ثم أمّن حساباتك.';
	try {
		localStorage.setItem(phoneCheckStorageKey, JSON.stringify(phoneCheckInputs.filter((input) => input.checked).map((input) => input.dataset.phoneCheck)));
	} catch {
		// The checklist remains usable for this visit when storage is unavailable.
	}
}

try {
	const savedPhoneChecks = JSON.parse(localStorage.getItem(phoneCheckStorageKey) || '[]');
	if (Array.isArray(savedPhoneChecks)) {
		phoneCheckInputs.forEach((input) => { input.checked = savedPhoneChecks.includes(input.dataset.phoneCheck); });
	}
} catch {
	phoneCheckInputs.forEach((input) => { input.checked = false; });
}

phoneCheckInputs.forEach((input) => input.addEventListener('change', updatePhoneChecklist));
updatePhoneChecklist();

const awarenessVideoPlayer = document.querySelector('#awareness-video-player');
const videoFileFallback = document.querySelector('#video-file-fallback');
if (window.location.protocol === 'file:') {
	awarenessVideoPlayer.hidden = true;
	videoFileFallback.hidden = false;
}

const glossarySearch = document.querySelector('#glossary-search');
const glossaryEntries = [...document.querySelectorAll('.glossary-entry')];
const glossaryEmpty = document.querySelector('#glossary-empty');
const glossaryCount = document.querySelector('#glossary-count');
const normalizeGlossaryText = (text) => text.toLocaleLowerCase('ar')
	.replace(/[\u064B-\u065F\u0670]/g, '')
	.replace(/[أإآ]/g, 'ا')
	.replace(/ى/g, 'ي');

glossarySearch.addEventListener('input', () => {
	const query = normalizeGlossaryText(glossarySearch.value.trim());
	let visibleCount = 0;
	glossaryEntries.forEach((entry) => {
		const matches = normalizeGlossaryText(entry.textContent).includes(query);
		entry.hidden = !matches;
		if (matches) visibleCount += 1;
	});
	glossaryEmpty.hidden = visibleCount > 0;
	glossaryCount.textContent = query ? `${arabicDigits(visibleCount)} من ${arabicDigits(glossaryEntries.length)} مصطلحات` : `${arabicDigits(glossaryEntries.length)} مصطلحات`;
});

const printEmergencyCard = document.querySelector('#print-emergency-card');
printEmergencyCard.addEventListener('click', () => {
	document.body.classList.add('print-emergency-card');
	window.print();
});
window.addEventListener('afterprint', () => {
	document.body.classList.remove('print-emergency-card');
});
