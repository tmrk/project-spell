import { useState } from 'react';
import useSound from 'use-sound';
import popSfx from '../sounds/pop.mp3';
import badSfx from '../sounds/bad.mp3';
import EyeStyle from './EyeStyle';
import { Eye } from 'cartoon-eyes';

const Letter = ({ letters, index, currentLetterIndex, jumpToNextLetter, addAttempt, 
    IS_CASE_SENSITIVE, attemptSuccess, speak, cancel, voice }) => {

  const lastAttempt = letters[index].attempts[letters[index].attempts.length - 1];
  const letter = letters[index].letter;
  const isFocused = index === currentLetterIndex;
  const isDone = lastAttempt && ((IS_CASE_SENSITIVE && lastAttempt === letter) || (!IS_CASE_SENSITIVE && lastAttempt.toLowerCase() === letter.toLowerCase()));

  const [playPop] = useSound(popSfx);
  const [playBad] = useSound(badSfx);

  const clearInput = () => {
    document.getElementsByTagName("input")[0].value = "";
  }

  const handleChange = (event) => {
    const input = event.target.value;
    clearInput();
    addAttempt(input);

    if ((IS_CASE_SENSITIVE && input === letter ) || (!IS_CASE_SENSITIVE && input.toLowerCase() === letter.toLowerCase())) {
      console.log("Good job!");
      playPop();
      attemptSuccess(true);
      jumpToNextLetter();

    } else {
      console.log("Try again");
      playBad();
      attemptSuccess(false);
    }
  }

  const [wobble, setWobble] = useState(0);

  return (
    <div 
      className="letter"
      data-done={isDone} 
      data-focused={isFocused}
      onClick={() => {
        cancel();
        speak({ text: JSON.stringify(letter.toLowerCase()), voice: voice });
        setWobble(1);
      }}
      onAnimationEnd={() => setWobble(0)}
      wobble={wobble}
    >
      <div className='eyes'>
        <div className='lefteye' style={EyeStyle(letter).left}><Eye /></div>
        <div className='righteye' style={EyeStyle(letter).right}><Eye /></div>
      </div>
      <div>{letter}</div>
      {isFocused ? 
        <input type="text" autoFocus onChange={handleChange} onFocus={clearInput} 
          autoComplete="off"  autoCorrect="off" autoCapitalize="off" spellCheck="false" />
      : ""}
    </div>
  );

}

export default Letter;