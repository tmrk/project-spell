import { useState, useEffect } from 'react';
import { useSpeechSynthesis } from 'react-speech-kit';
import Letter from './components/Letter';
import './App.scss';

const WORDS = ["cat", "mouse", "horse", "cow", "dog"];
const IS_CASE_SENSITIVE = false;

function App() {

  const { speak } = useSpeechSynthesis();

  const [remainingWords, setRemainingWords] = useState(WORDS);
  const [letters, setLetters] = useState([]);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(null);

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
      speak({ text: "Now spell the word " + currentWord });

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
    speak({ text: "Well done!" });
    displayNewWord();
  }
  
  const jumpToNextLetter = () => {
    //speak({ text: letters[currentLetterIndex].letter });
    const isLastLetter = currentLetterIndex === letters.length - 1;
    if (!isLastLetter) setCurrentLetterIndex(currentLetterIndex + 1);
    else {
      console.log("This is the last letter of this word");
      console.log(remainingWords);
      wordDone();
    }
  }

  const focusInput = () => {
    document.getElementsByTagName("input")[0].focus();
  }

  // Start game
  useEffect(() => {
    displayNewWord();
  }, [])

  return (
    <div id="app" onClick={focusInput}>
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
          />
        )
      })}
      </div>
    </div>
  );
}

export default App;
