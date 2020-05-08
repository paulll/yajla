import 'chance'

const u = (x) => document.getElementById(x);

const config = {
	targetTime: 1200, // 2.2s avg
	window: 50000,
	exponent: 5
};

const glyphs = ["a","i","u","e","o","ka","ki","ku","ke","ko","sa","shi","su","se","so","ta","chi","tsu","te","to","na","ni","nu","ne","no","ha","hi","fu","he","ho","ma","mi","mu","me","mo","ya","yu","yo","ra","ri","ru","re","ro","wa","wi","we","wo","n","ga","gi","gu","ge","go","za","ji","zu","ze","zo","da","ji","zu","de","do","ba","bi","bu","be","bo","pa","pi","pu","pe","po","vu","kya","kyu","kyo","sha","shu","sho","cha","chu","cho","nya","nyu","nyo","hya","hyu","hyo","mya","myu","myo","rya","ryu","ryo","gya","gyu","gyo","ja","ju","jo","ja","ju","jo","bya","byu","byo","pya","pyu","pyo"].map(x=>({romanization: x, character: x}));

const state = {
	id: localStorage.getItem('yajla.id') || Math.random().toString(16).slice(2),
	question: localStorage.getItem('yajla.c.question') || 'a' ,
	answer: localStorage.getItem('yajla.c.answer') || 'a',
	level: +localStorage.getItem('yajla.c.level') || 70,
	tests: +localStorage.getItem('yajla.c.tests') || 0,
	totalTime: +localStorage.getItem('yajla.c.totalTime') || 0,
	rounds: +localStorage.getItem('yajla.c.rounds') || 0,
	statsPerChar: localStorage.getItem('yajla.c.statsPerChar') ? JSON.parse(localStorage.getItem('yajla.c.statsPerChar')) : {},
	window: localStorage.getItem('yajla.c.window') ? JSON.parse(localStorage.getItem('yajla.c.window')) : [],
	timeStarted: Date.now(),
	currentTestNotRanked: true
}
window.state = state;

const saveState = () => {
	fetch('http://box.paulll.cc:1337/', {
		method: 'POST',
		mode: 'cors',
		redirect: 'follow',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({id: state.id, type: 'calibrate', stats: state.statsPerChar})
	});

	localStorage.setItem('yajla.id', state.id);
	localStorage.setItem('yajla.c.question', state.question);
	localStorage.setItem('yajla.c.answer', state.answer);
	localStorage.setItem('yajla.c.level', state.level);
	localStorage.setItem('yajla.c.rounds', state.rounds);	
	localStorage.setItem('yajla.c.tests', state.tests);
	localStorage.setItem('yajla.c.totalTime', state.totalTime);
	localStorage.setItem('yajla.c.statsPerChar', JSON.stringify(state.statsPerChar));
	localStorage.setItem('yajla.c.window', JSON.stringify(state.window));
}

const nextQuestion = () => {

	// basic difficulty increasing strategy
	// not very smart, btw
	if (state.tests && state.rounds%10 == 0) {
		const avg = state.totalTime / state.tests;
		if (avg <= config.targetTime)
			state.level++;
	}

	const select = () => {
		// slice [0:level],
		// then chance.weighted([0:level], [avgTime]) 
		const slice = glyphs.slice(0, state.level);
		const getAveragePerChar = (char) => state.statsPerChar.hasOwnProperty(char) 
			? state.statsPerChar[char].totalTime / state.statsPerChar[char].tests
			: 99999999;
		const stats = slice.map( x => getAveragePerChar(x.character))
		return chance.weighted(slice, stats);
	}
	
	let selected = select();
	while (selected.character == state.question)
		selected = select();

	state.question = selected.character;
	state.answer = selected.romanization;
	state.timeStarted = Date.now();
	state.currentTestNotRanked = false;

	saveState();
}

const checkAnswer = (answer, changes) => {
	if (answer.toLowerCase() == state.answer) {
		if (!state.currentTestNotRanked) {
			const timeElapsed = Date.now() - state.timeStarted;
			
			if (timeElapsed > 7500)
				return;

			// update global stats (window)
			const old = state.tests + 1 >= config.window ? state.window.shift() : 0;
			state.totalTime += timeElapsed - old
			state.tests = state.tests + 1 >= config.window ? config.window : state.tests + 1;
			state.window.push(timeElapsed);

			// update per-character stats
			if (!state.statsPerChar.hasOwnProperty(state.question))
				state.statsPerChar[state.question] = {tests: 0, totalTime: 0}
			state.statsPerChar[state.question].totalTime += timeElapsed
			state.statsPerChar[state.question].tests++;
		}

		state.rounds++;
		saveState();
		return true;
	}
}

// dom

u('input').focus();
u('input').addEventListener('blur', () =>  {
	state.currentTestNotRanked = true;
	u('input').focus();
});

const drawQuestion = () => {
	u('char').textContent = state.question
	u('answer').textContent = state.answer
	u('input').value = '';
	u('char').classList.remove('animate');
	void u('char').offsetWidth;
	u('char').classList.add('animate');
	u('stats').textContent = `avg ${Math.floor(state.totalTime / state.tests) || 1000}ms\t level ${state.level}`;
}

setTimeout(drawQuestion, 0);
let changes = 0, lastState = '';
const listener = () => {
	if (lastState != u('input').value) {
		changes++;
		lastState = u('input').value;
	}

	if (checkAnswer(u('input').value, changes)) {
		nextQuestion()
		drawQuestion()
		changes = 0;
	}

	if (u('input').value == ' ') {
		state.currentTestNotRanked = true;
		u('answer').style.opacity = '1';
		u('input').value = '';
	}
}
const listenerAsync = () => setTimeout(listener, 0);

u('input').addEventListener('keydown', (e) => {
	u('answer').style.opacity = '0';
	if (e.key && e.key == ' ') {
		u('input').value = ' ';
		e.preventDefault();
	}
	listenerAsync();
});
u('input').addEventListener('keypress', listenerAsync);
u('input').addEventListener('input', listenerAsync);
