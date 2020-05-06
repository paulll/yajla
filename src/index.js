import 'chance'
import hiragana from './hiragana.json'
import katakana from './katakana.json'

const u = (x) => document.getElementById(x);

const config = {
	targetTime: 1200, // 1.2s avg
};

const glyphs = [...hiragana, ...katakana]
const state = {
	question: localStorage.getItem('yajla.question') || 'あ' ,
	answer: localStorage.getItem('yajla.answer') || 'a',
	level: localStorage.getItem('yajla.level') || 5,
	tests: localStorage.getItem('yajla.tests') || 0,
	totalTime: localStorage.getItem('yajla.totalTime') || 0,
	statsPerChar: localStorage.getItem('yajla.statsPerChar') ? JSON.parse(localStorage.getItem('yajla.statsPerChar')) : {},
	timeStarted: Date.now(),
	currentTestNotRanked: true
}

const saveState = () => {
	localStorage.setItem('yajla.question', state.question);
	localStorage.setItem('yajla.answer', state.answer);
	localStorage.setItem('yajla.level', state.level);
	localStorage.setItem('yajla.tests', state.tests);
	localStorage.setItem('yajla.totalTime', state.totalTime);
	localStorage.setItem('yajla.statsPerChar', JSON.stringify(state.statsPerChar));
}

const nextQuestion = () => {

	// basic difficulty increasing strategy
	// not very smart, btw
	if (state.tests && state.tests%10 == 0) {
		const avg = state.totalTime / state.tests;
		console.log('avg', avg);
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

const checkAnswer = (answer) => {
	if (answer == state.answer) {
		if (!state.currentTestNotRanked) {
			const timeElapsed = Date.now() - state.timeStarted;
			
			// update global stats
			state.totalTime += timeElapsed;
			state.tests++;

			// update per-character stats
			if (!state.statsPerChar.hasOwnProperty(state.question))
				state.statsPerChar[state.question] = {tests: 0, totalTime: 0}
			state.statsPerChar[state.question].totalTime += timeElapsed
			state.statsPerChar[state.question].tests++;

			saveState()
		}

		return true;
	}
}

// dom

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
}

setTimeout(drawQuestion, 0);
u('input').addEventListener('keydown', () => {
	u('answer').style.opacity = '0';
    setTimeout(() => {
    	if (checkAnswer(u('input').value)) {
    		nextQuestion()
    		drawQuestion()
    	}
    	if (u('input').value == ' ') {
    		state.currentTestNotRanked = true;
    		u('answer').style.opacity = '1';
    		u('input').value = '';
    	}
    }, 0);
});