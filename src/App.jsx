import { useState, useEffect } from 'react';
import { useSpeechSynthesis } from 'react-speech-kit';
import useSound from 'use-sound';
import Letter from './components/Letter';
import './App.scss';
import bgMusic from './sounds/bgmusic.mp3';
import doneSfx from './sounds/done.mp3';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import MusicOffIcon from '@material-ui/icons/MusicOff';

const WORDS = ["cat", "mouse", "horse", "cow", "dog"];
const MUSIC = true;
const IS_CASE_SENSITIVE = false;

function App() {

  const { speak } = useSpeechSynthesis();
  const [playDone] = useSound(doneSfx, { volume: 0.8 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playBgMusic, {pause}] = useSound(bgMusic, {
    volume: 0.2,
    onplay: () => setIsPlaying(true),
    onend: () => setIsPlaying(false)
  });

  const toggleMusic = () => {
    if (isPlaying) pause();
    else playBgMusic();
    setIsPlaying(!isPlaying);
  }

  const [remainingWords, setRemainingWords] = useState(WORDS);
  const [letters, setLetters] = useState([]);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(null);
  const [startPage, setStartPage] = useState(true);

  const displayNewWord = () => {
      const currentWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
      const currentWordLettersArray = currentWord.split("");
      const currentWordLetters = [];
    
      for (let i = 0; i < currentWordLettersArray.length; i++) {
        currentWordLetters.push({
          id: i,
          letter: currentWordLettersArray[i],
          attempts: []
        });
      }  

      setLetters(currentWordLetters);
      setCurrentLetterIndex(0);
      speak({ text: "Spell the word " + currentWord });

      if (remainingWords.length > 1) setRemainingWords(remainingWords.filter(word => word !== currentWord));
      else setRemainingWords(WORDS);
  }

  // Log all input into an array
  const addAttempt = (attempt, index) => {
    index = index || currentLetterIndex;
    const lettersTemp = letters;
    lettersTemp[index].attempts.push(attempt);
    setLetters(lettersTemp);
  }

  const wordDone = () => {
    playDone();
    speak({ text: "Well done!" });
    displayNewWord();
  }
  
  const jumpToNextLetter = () => {
    const isLastLetter = currentLetterIndex === letters.length - 1;
    if (!isLastLetter) setCurrentLetterIndex(currentLetterIndex + 1);
    else {
      console.log("This is the last letter of this word");
      console.log(remainingWords);
      wordDone();
    }
  }

  const focusInput = () => {
    if (startPage) setStartPage(false);
    document.getElementsByTagName("input")[0].focus();
  }

  const [pageBackground, setPageBackground] = useState('');

  const attemptSuccess = (isSuccess) => {
    if (isSuccess) setPageBackground('green');
    else setPageBackground('red');
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPageBackground('');
     }, 150);
 
    return () => clearTimeout(timeout);
   }, [pageBackground]);

  // Start game
  useEffect(() => {
    if (MUSIC) playBgMusic();
    displayNewWord();
  }, [startPage])

  return (
    <div id="app" onClick={focusInput} className={pageBackground}>
      <div id="toggle-music" onClick={toggleMusic}>
        {isPlaying ? <MusicNoteIcon /> : <MusicOffIcon />}
      </div>
      {startPage ? <div id="msg">START</div> :
      <div id="word">
      {letters.map(letter => {
        return (
          <Letter 
            key={letter.id} 
            currentLetterIndex={currentLetterIndex} 
            jumpToNextLetter={jumpToNextLetter}
            index={letter.id}
            letters={letters}
            addAttempt={addAttempt}
            IS_CASE_SENSITIVE={IS_CASE_SENSITIVE}
            attemptSuccess={attemptSuccess}
            speak={speak}
          />
        )
      })}
      </div>}
    </div>
  );
}

export default App;
