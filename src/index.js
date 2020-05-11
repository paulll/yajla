import 'chance'
import hiragana from './hiragana.json'
import katakana from './katakana.json'
import userStats from './stats.json'
import Trianglify from 'trianglify'

const u = (x) => document.getElementById(x);

/* version migrations */
const v = '2'; 
const lastv = localStorage.getItem('yajla.v');
localStorage.setItem('yajla.v', v);

if (lastv != v && !lastv) {
	localStorage.setItem('yajla.old-tests', localStorage.getItem('yajla.tests'));
	localStorage.removeItem('yajla.tests');
	localStorage.removeItem('yajla.window');	
}


const averageStats = {};
for (const id of Object.keys(userStats)) {
	for (const char of Object.keys(userStats[id])) {
		if (!averageStats[char]) { 
			averageStats[char] = {
				tests: 0,
				totalTime: 0
			}
		};

		averageStats[char].tests		+= userStats[id][char].tests;
		averageStats[char].totalTime	+= userStats[id][char].totalTime
	}
}

const config = {
	targetRatio: 1.2, // 1 means 'as fast as english', 1.5 - '1.5 times slower than english'
	window: 50,
	exponent: 200
};

const glyphs = [...hiragana, ...katakana];
const state = {
	question: localStorage.getItem('yajla.question') || 'あ' ,
	answer: localStorage.getItem('yajla.answer') || 'a',
	level: +localStorage.getItem('yajla.level') || 5,
	tests: +localStorage.getItem('yajla.tests') || 0,
	totalRatio: +localStorage.getItem('yajla.totalRatio') || 0,
	rounds: +localStorage.getItem('yajla.rounds') || 0,
	statsPerChar: localStorage.getItem('yajla.statsPerChar') ? JSON.parse(localStorage.getItem('yajla.statsPerChar')) : {},
	window: localStorage.getItem('yajla.window') ? JSON.parse(localStorage.getItem('yajla.window')) : [],
	timeStarted: Date.now(),
	currentTestNotRanked: true,
}

const targetStats = {};
const localCalibrationStats = localStorage.getItem('yajla.c.statsPerChar') ? JSON.parse(localStorage.getItem('yajla.c.statsPerChar')) : {};
for (const char of Object.keys(averageStats)) {
	const localCharStats = localCalibrationStats[char];
	if (localCharStats) {
		targetStats[char] = ((averageStats[char].totalTime/averageStats[char].tests) + (localCharStats.totalTime/localCharStats.tests))/2;
	} else {
		targetStats[char] = (averageStats[char].totalTime/averageStats[char].tests);
	}
}

const saveState = () => {
	localStorage.setItem('yajla.question', state.question);
	localStorage.setItem('yajla.answer', state.answer);
	localStorage.setItem('yajla.level', state.level);
	localStorage.setItem('yajla.rounds', state.rounds);	
	localStorage.setItem('yajla.tests', state.tests);
	localStorage.setItem('yajla.totalRatio', state.totalRatio);
	localStorage.setItem('yajla.statsPerChar', JSON.stringify(state.statsPerChar));
	localStorage.setItem('yajla.window', JSON.stringify(state.window));
}


const nextQuestion = () => {

	// basic difficulty increasing strategy
	// not very smart, btw
	if (state.tests && state.rounds%10 == 0) {
		const avg = state.totalRatio / state.tests;
		if (avg <= config.targetRatio)
			state.level++;
	}

	const select = () => {
		// slice [0:level],
		// then chance.weighted([0:level], [avgTime]) 
		const slice = glyphs.slice(0, state.level);
		const getAveragePerChar = (char) => state.statsPerChar.hasOwnProperty(char) 
			? config.exponent ** ((state.statsPerChar[char].totalTime / state.statsPerChar[char].tests)/(targetStats[char]||1300))
			: 99999999;
		const stats = slice.map( x => getAveragePerChar(x.character));
		const sum = stats.reduce((a,b) => a+b, 0);
		// console.log(Array(slice.length).fill(0).map((_,i) => ([slice[i], stats[i]/sum*100])));
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

const checkAnswer = (answer) => {
	if (answer.toLowerCase() == state.answer) {
		if (!state.currentTestNotRanked) {
			const timeElapsed = Date.now() - state.timeStarted;

			if (timeElapsed > 7500)
				return;

			const roundRatio = timeElapsed / (targetStats[state.answer]||1300)

			// update global stats (window)
			const old = state.window.length + 1 >= config.window ? state.window.shift() : 0;
			state.totalRatio += roundRatio - old;
			state.tests = state.tests + 1 >= config.window ? config.window : state.tests + 1;
			state.window.push(roundRatio);

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
	u('stats').textContent = `ratio ${(Math.floor(state.totalRatio / state.tests*100)||100)/100}\t level ${state.level}`;
}

setTimeout(drawQuestion, 0);

const listener = () => {
	if (checkAnswer(u('input').value)) {
		nextQuestion()
		drawQuestion()
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
	if (e.key && e.key == 'w' && e.ctrlKey) {
		u('input').value = '';
		e.preventDefault();	
	}
	listenerAsync();
});
u('input').addEventListener('keypress', listenerAsync);
u('input').addEventListener('input', listenerAsync);

const seed = Math.random()*10000;
const trianglify = () => {
	const old = u('canvas');

	const pattern = Trianglify({
		width: window.innerWidth,
		height: window.innerHeight,
		x_colors: 'Spectral'
	});
	const canvas = pattern.canvas();
	canvas.id = 'canvas';

	if (localStorage.getItem('yajla.theme') == 'dark') {
		setTimeout(() => {
			if (old)
				return document.body.replaceChild(canvas, old);
			document.body.appendChild(canvas);
			
		}, 200);
	} else {
		if (old)
			return document.body.replaceChild(canvas, old);
		document.body.appendChild(canvas);
	}
}

trianglify();
window.addEventListener('resize', trianglify);

if (localStorage.getItem('yajla.theme') == 'bright')
	document.body.classList.add('bright');

u('bulb').addEventListener('click', () => {
	document.body.classList.toggle('bright');
	localStorage.setItem('yajla.theme', document.body.classList.contains('bright') ? 'bright' : 'dark');
})
